// GitHub API wrapper con modo local de lectura para pruebas sin token
const GitHubAPI = (function () {
  const cfg = window.BLOG_CONFIG;

  function contentsUrl(path) {
    return `https://api.github.com/repos/${cfg.OWNER}/${cfg.REPO}/contents/${path}`;
  }

  async function apiRequest(url, options = {}, expectRaw = false) {
    const token = localStorage.getItem('gh_token') || '';
    const headers = Object.assign({ Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers.Authorization = `token ${token}`;

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Autenticación/Permiso denegado (${res.status}). ${txt}`);
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`GitHub API error ${res.status}: ${txt}`);
    }
    if (expectRaw) return res.text();
    return res.json();
  }

  async function getFileRaw(path) {
    const token = localStorage.getItem('gh_token') || '';
    if (!token) {
      // intentar leer desde la API local
      try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
        if (!res.ok) return null;
        const j = await res.json();
        return j && j.content ? decodeURIComponent(escape(atob(j.content))) : null;
      } catch (err) {
        // fallback a petición directa al servidor estático
        const localUrl = `/${path}`;
        const r = await fetch(localUrl);
        if (!r.ok) return null;
        return r.text();
      }
    }
    const headers = { Accept: 'application/vnd.github.v3.raw' };
    if (token) headers.Authorization = `token ${token}`;
    const res = await fetch(contentsUrl(path), { headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Error al obtener ${path}: ${res.status} ${txt}`);
    }
    return res.text();
  }

  async function getFile(path) {
    const token = localStorage.getItem('gh_token') || '';
    if (!token) {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      if (!res.ok) return null;
      return await res.json();
    }
    return apiRequest(contentsUrl(path), { method: 'GET' });
  }

  async function listDir(path) {
    const token = localStorage.getItem('gh_token') || '';
    if (!token) {
      const res = await fetch(`/api/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) return [];
      return await res.json();
    }
    return apiRequest(contentsUrl(path));
  }

  async function putFile(path, contentBase64, message, sha = null) {
    const token = localStorage.getItem('gh_token') || '';
    if (!token) {
      // persistencia local usando API interna
      const res = await fetch('/api/file', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, contentBase64 }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error('Error local PUT: ' + (j && j.error ? j.error : res.status));
      }
      return res.json();
    }
    const body = { message, content: contentBase64, branch: cfg.BRANCH };
    if (sha) body.sha = sha;
    const headers = { Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `token ${token}`;
    const res = await fetch(`https://api.github.com/repos/${cfg.OWNER}/${cfg.REPO}/contents/${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Error PUT ${res.status} ${txt}`);
    }
    return res.json();
  }

  async function deleteFile(path, sha, message) {
    const token = localStorage.getItem('gh_token') || '';
    if (!token) {
      // eliminar localmente
      const res = await fetch('/api/file', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error('Error local DELETE: ' + (j && j.error ? j.error : res.status));
      }
      return res.json();
    }
    if (!sha) throw new Error('SHA requerido para eliminar el fichero');
    const headers = { Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `token ${token}`;
    const body = { message: message || `chore: delete ${path}`, sha, branch: cfg.BRANCH };
    const res = await fetch(contentsUrl(path), { method: 'DELETE', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Error DELETE ${res.status} ${txt}`);
    }
    return res.json();
  }

  return { getFile, getFileRaw, putFile, deleteFile, listDir };
})();
