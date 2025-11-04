// Funcionalidad común para new.html y edit.html
const AdminPost = (function () {
  const cfg = window.BLOG_CONFIG;

  function toBase64Utf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function sanitizeFileName(name) {
    return name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-\.]/g, '').toLowerCase();
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Error leyendo fichero'));
      r.readAsDataURL(file);
    });
  }

  async function uploadImageFile(file) {
    if (!file) return null;
    const dataUrl = await readFileAsDataURL(file);
    const base64 = dataUrl.split(',')[1];
    const name = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const path = `${cfg.IMAGES_PATH}/${name}`;
    const message = `chore: añadir imagen ${name}`;
    await GitHubAPI.putFile(path, base64, message);
    return name;
  }

  async function loadCategories(selectEl) {
    try {
      const data = await GitHubAPI.getFile(cfg.CATEGORIES_PATH);
      const content = atob(data.content);
      const cats = JSON.parse(content);
      selectEl.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    } catch (err) {
      selectEl.innerHTML = '<option value="sin-categoria">sin-categoria</option>';
    }
  }

  function getSelectedCategories(selectEl) {
    return Array.from(selectEl.selectedOptions).map(o => o.value);
  }

  function buildFrontMatter(meta) {
    const lines = ['---'];
    if (meta.title) lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
    if (meta.date) lines.push(`date: "${meta.date}"`);
    if (meta.slug) lines.push(`slug: "${meta.slug}"`);
    if (meta.excerpt) lines.push(`excerpt: "${meta.excerpt.replace(/"/g, '\\"')}"`);
    if (Array.isArray(meta.categories)) {
      lines.push('categories:');
      meta.categories.forEach(c => lines.push(`  - ${c}`));
    }
    if (meta.image) lines.push(`image: "${meta.image}"`);
    lines.push('---\n');
    return lines.join('\n');
  }

  function generateMarkdown(meta, content) {
    return buildFrontMatter(meta) + content;
  }

  async function saveLocal(path, md) {
    const base64 = toBase64Utf8(md);
    const res = await fetch('/api/file', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, contentBase64: base64 }) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error('Error guardado local: ' + (j && j.error ? j.error : res.status));
    }
    return res.json();
  }

  async function submitNew(e) {
    e.preventDefault();
    const status = document.getElementById('status');
    status.textContent = 'Creando artículo...';

    try {
      const title = document.getElementById('title').value.trim();
      const slugField = document.getElementById('slug').value.trim() || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
      const date = document.getElementById('date').value || new Date().toISOString();
      const excerpt = document.getElementById('excerpt').value.trim();
      const categories = getSelectedCategories(document.getElementById('categories'));
      const content = document.getElementById('content').value;

      const imgFeaturedFile = document.getElementById('imageFeatured').files[0];
      const imgAFile = document.getElementById('imageA').files[0];
      const imgBFile = document.getElementById('imageB').files[0];

      let imageFeatured = null, imageA = null, imageB = null;
      if (imgFeaturedFile) imageFeatured = await uploadImageFile(imgFeaturedFile);
      if (imgAFile) imageA = await uploadImageFile(imgAFile);
      if (imgBFile) imageB = await uploadImageFile(imgBFile);

      const meta = { title, date, slug: slugField, excerpt, categories, image: imageFeatured || '' };

      let finalContent = content;
      if (imageA && !finalContent.includes(`/images/${imageA}`)) finalContent += `\n\n![Imagen A](/images/${imageA})`;
      if (imageB && !finalContent.includes(`/images/${imageB}`)) finalContent += `\n\n![Imagen B](/images/${imageB})`;

      const md = buildFrontMatter(meta) + finalContent;
      const path = `${cfg.BLOG_PATH}/${meta.slug}.md`;
      const base64 = toBase64Utf8(md);
      await GitHubAPI.putFile(path, base64, `chore: crear artículo ${meta.slug}`);
      status.textContent = 'Artículo creado correctamente. Volviendo al panel...';
      setTimeout(() => location.href = '/admin/dashboard.html', 1200);
    } catch (err) {
      status.textContent = 'Error al crear: ' + err.message;
    }
  }

  function parseFrontMatter(text) {
    if (!text.startsWith('---')) return { meta: {}, content: text };
    const end = text.indexOf('\n---', 3);
    if (end === -1) return { meta: {}, content: text };
    const header = text.slice(3, end).trim();
    const content = text.slice(end + 4).trim();
    const lines = header.split('\n').map(l => l.trim());
    const meta = {};
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('categories:')) {
        i++;
        const cats = [];
        while (i < lines.length && lines[i].startsWith('-')) {
          cats.push(lines[i].replace(/^-/, '').trim());
          i++;
        }
        meta.categories = cats;
        continue;
      }
      const m = line.match(/^([^:]+):\s*(.*)$/);
      if (m) {
        const key = m[1].trim();
        let val = m[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1,-1);
        meta[key] = val;
      }
      i++;
    }
    return { meta, content };
  }

  async function initNew() {
    const form = document.getElementById('postForm');
    await loadCategories(document.getElementById('categories'));
    form.addEventListener('submit', submitNew);
    const previewBtn = document.getElementById('previewBtn');
    const previewArea = document.getElementById('previewMd');
    const saveLocalBtn = document.getElementById('saveLocalBtn');
    if (previewBtn && previewArea) {
      previewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value.trim();
        const slugField = document.getElementById('slug').value.trim() || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
        const date = document.getElementById('date').value || new Date().toISOString();
        const excerpt = document.getElementById('excerpt').value.trim();
        const categories = getSelectedCategories(document.getElementById('categories'));
        const content = document.getElementById('content').value;
        const meta = { title, date, slug: slugField, excerpt, categories, image: '' };
        const md = generateMarkdown(meta, content);
        previewArea.textContent = md;
      });
    }
    if (saveLocalBtn) {
      saveLocalBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const title = document.getElementById('title').value.trim();
          const slugField = document.getElementById('slug').value.trim() || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
          const date = document.getElementById('date').value || new Date().toISOString();
          const excerpt = document.getElementById('excerpt').value.trim();
          const categories = getSelectedCategories(document.getElementById('categories'));
          const content = document.getElementById('content').value;
          const meta = { title, date, slug: slugField, excerpt, categories, image: '' };
          const md = generateMarkdown(meta, content);
          const path = `${cfg.BLOG_PATH}/${meta.slug}.md`;
          await saveLocal(path, md);
          alert('Guardado local realizado correctamente');
          location.href = '/admin/dashboard.html';
        } catch (err) {
          alert('Error guardando local: ' + err.message);
        }
      });
    }
  }

  async function initEdit(filePath) {
    const status = document.getElementById('status');
    status.textContent = 'Cargando artículo...';
    try {
      const data = await GitHubAPI.getFile(filePath);
      if (!data) throw new Error('No se pudo obtener el archivo');
      const sha = data.sha || '';
      const contentRaw = atob(data.content);
      const parsed = parseFrontMatter(contentRaw);
      const meta = parsed.meta || {};
      const content = parsed.content || '';

      document.getElementById('filePath').value = filePath;
      document.getElementById('fileSha').value = sha;
      document.getElementById('title').value = meta.title || '';
      document.getElementById('slug').value = meta.slug || filePath.split('/').pop().replace(/\.md$/, '');
      document.getElementById('date').value = meta.date || '';
      document.getElementById('excerpt').value = meta.excerpt || '';
      document.getElementById('content').value = content;

      await loadCategories(document.getElementById('categories'));
      if (Array.isArray(meta.categories)) {
        const sel = document.getElementById('categories');
        Array.from(sel.options).forEach(o => {
          if (meta.categories.includes(o.value)) o.selected = true;
        });
      }

      const imagesSpan = document.getElementById('currentImages');
      const imgs = [];
      if (meta.image) imgs.push(meta.image);
      const re = /\/images\/([a-z0-9A-Z\-\_\.]+)/g;
      let m;
      while ((m = re.exec(content)) !== null) imgs.push(m[1]);
      imagesSpan.textContent = imgs.length ? imgs.join(', ') : 'Ninguna';

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = 'Guardando...';
        try {
          const title = document.getElementById('title').value.trim();
          const slugField = document.getElementById('slug').value.trim() || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
          const date = document.getElementById('date').value || new Date().toISOString();
          const excerpt = document.getElementById('excerpt').value.trim();
          const categories = getSelectedCategories(document.getElementById('categories'));
          let finalContent = document.getElementById('content').value;

          const imgFeaturedFile = document.getElementById('imageFeatured').files[0];
          const imgAFile = document.getElementById('imageA').files[0];
          const imgBFile = document.getElementById('imageB').files[0];

          const imageFeatured = imgFeaturedFile ? await uploadImageFile(imgFeaturedFile) : meta.image || '';
          const imageA = imgAFile ? await uploadImageFile(imgAFile) : null;
          const imageB = imgBFile ? await uploadImageFile(imgBFile) : null;

          if (imageA && !finalContent.includes(`/images/${imageA}`)) finalContent += `\n\n![Imagen A](/images/${imageA})`;
          if (imageB && !finalContent.includes(`/images/${imageB}`)) finalContent += `\n\n![Imagen B](/images/${imageB})`;

          const newMeta = { title, date, slug: slugField, excerpt, categories, image: imageFeatured || '' };
          const md = buildFrontMatter(newMeta) + finalContent;
          const path = document.getElementById('filePath').value;
          const shaCurrent = document.getElementById('fileSha').value;
          const base64 = toBase64Utf8(md);
          await GitHubAPI.putFile(path, base64, `chore: actualizar artículo ${slugField}`, shaCurrent || null);
          status.textContent = 'Artículo actualizado. Volviendo al panel...';
          setTimeout(() => location.href = '/admin/dashboard.html', 1000);
        } catch (err) {
          status.textContent = 'Error al guardar: ' + err.message;
        }
      });

      // preview / save local handlers for edit
      const previewBtn = document.getElementById('previewBtn');
      const previewArea = document.getElementById('previewMd');
      const saveLocalBtn = document.getElementById('saveLocalBtn');
      if (previewBtn && previewArea) {
        previewBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          const title = document.getElementById('title').value.trim();
          const slugField = document.getElementById('slug').value.trim() || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
          const date = document.getElementById('date').value || new Date().toISOString();
          const excerpt = document.getElementById('excerpt').value.trim();
          const categories = getSelectedCategories(document.getElementById('categories'));
          const content = document.getElementById('content').value;
          const meta = { title, date, slug: slugField, excerpt, categories, image: '' };
          const md = generateMarkdown(meta, content);
          previewArea.textContent = md;
        });
      }
      if (saveLocalBtn) {
        saveLocalBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          try {
            const title = document.getElementById('title').value.trim();
            const slugField = document.getElementById('slug').value.trim() || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
            const date = document.getElementById('date').value || new Date().toISOString();
            const excerpt = document.getElementById('excerpt').value.trim();
            const categories = getSelectedCategories(document.getElementById('categories'));
            const content = document.getElementById('content').value;
            const meta = { title, date, slug: slugField, excerpt, categories, image: '' };
            const md = generateMarkdown(meta, content);
            const path = document.getElementById('filePath').value || `${cfg.BLOG_PATH}/${meta.slug}.md`;
            await saveLocal(path, md);
            alert('Guardado local realizado correctamente');
            location.href = '/admin/dashboard.html';
          } catch (err) {
            alert('Error guardando local: ' + err.message);
          }
        });
      }

      status.textContent = '';
    } catch (err) {
      status.textContent = 'Error al cargar artículo: ' + err.message;
    }
  }

  return { initNew, initEdit };
})();
