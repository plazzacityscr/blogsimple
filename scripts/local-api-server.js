// Servidor mínimo para persistencia local en entorno de desarrollo
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.LOCAL_API_PORT || 9000;
const ROOT = path.resolve(__dirname, '..');

app.use(bodyParser.json({ limit: '50mb' }));

function safePath(p) {
  const resolved = path.resolve(ROOT, p);
  if (!resolved.startsWith(ROOT)) throw new Error('Ruta fuera del workspace');
  return resolved;
}

app.get('/api/file', async (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(400).json({ error: 'path requerido' });
  try {
    const full = safePath(p);
    if (!(await fs.pathExists(full))) return res.status(404).json({ error: 'no encontrado' });
    const stat = await fs.stat(full);
    if (stat.isDirectory()) return res.status(400).json({ error: 'es directorio' });
    const raw = await fs.readFile(full, 'utf8');
    return res.json({ content: Buffer.from(raw, 'utf8').toString('base64') });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/list', async (req, res) => {
  const p = req.query.path || '.';
  try {
    const full = safePath(p);
    if (!(await fs.pathExists(full))) return res.json([]);
    const items = await fs.readdir(full);
    const out = [];
    for (const name of items) {
      const itemPath = path.join(full, name);
      const st = await fs.stat(itemPath);
      out.push({ name, path: path.relative(ROOT, itemPath).replaceAll('\\\\', '/'), type: st.isDirectory() ? 'dir' : 'file' });
    }
    return res.json(out);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/file', async (req, res) => {
  const { path: p, contentBase64 } = req.body || {};
  if (!p || typeof contentBase64 !== 'string') return res.status(400).json({ error: 'path y contentBase64 requeridos' });
  try {
    const full = safePath(p);
    await fs.ensureDir(path.dirname(full));
    const buf = Buffer.from(contentBase64, 'base64');
    await fs.writeFile(full, buf);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/file', async (req, res) => {
  const p = req.body && req.body.path;
  if (!p) return res.status(400).json({ error: 'path requerido' });
  try {
    const full = safePath(p);
    if (!(await fs.pathExists(full))) return res.status(404).json({ error: 'no encontrado' });
    await fs.remove(full);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload-image', async (req, res) => {
  const { name, base64 } = req.body || {};
  if (!name || !base64) return res.status(400).json({ error: 'name y base64 requeridos' });
  try {
    const safeName = path.basename(name).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const full = safePath(path.join('images', safeName));
    await fs.ensureDir(path.dirname(full));
    const buf = Buffer.from(base64, 'base64');
    await fs.writeFile(full, buf);
    return res.json({ ok: true, name: safeName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Local API server running on http://0.0.0.0:${PORT}`);
});
