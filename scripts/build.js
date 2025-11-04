const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const IMAGES_DIR = path.join(ROOT, 'images');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = path.join(ROOT, 'docs');
const POSTS_OUT = path.join(OUT_DIR, 'posts');
const OUT_IMAGES = path.join(OUT_DIR, 'images');

async function build() {
  await fs.remove(OUT_DIR);
  await fs.ensureDir(POSTS_OUT);
  await fs.ensureDir(OUT_IMAGES);

  // copy images
  if (await fs.pathExists(IMAGES_DIR)) {
    await fs.copy(IMAGES_DIR, OUT_IMAGES);
  }

  const files = await fs.readdir(BLOG_DIR).catch(() => []);
  const posts = [];

  for (const f of files.filter(f => f.endsWith('.md'))) {
    const full = path.join(BLOG_DIR, f);
    const raw = await fs.readFile(full, 'utf8');
    const parsed = matter(raw);
    const meta = parsed.data || {};
    const content = parsed.content || '';
    const slug = meta.slug || f.replace(/\.md$/, '');
    const html = marked(content);
    const title = meta.title || slug;
    const date = meta.date || new Date().toISOString();
    const excerpt = meta.excerpt || (content.slice(0, 200).replace(/\n/g, ' ') + '...');

    const postHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="icon" href="/assets/favicon.ico">
</head>
<body>
  <main>
    <article>
      <h1>${title}</h1>
      <p><small>${new Date(date).toLocaleString('es-ES')}</small></p>
      <p class="entradilla">${meta.excerpt || ''}</p>
      ${meta.image ? `<img src="/images/${meta.image}" alt="${title}" class="featured">` : ''}
      <section class="content">
        ${html}
      </section>
    </article>
    <p><a href="/index.html">Volver al listado</a></p>
  </main>
</body>
</html>`;

    const outPath = path.join(POSTS_OUT, `${slug}.html`);
    await fs.writeFile(outPath, postHtml, 'utf8');

    posts.push({ title, slug, date, excerpt, categories: meta.categories || [], image: meta.image || '' });
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const listItems = posts.map(p => {
    return `<article class="post-item">
  ${p.image ? `<img src="/images/${p.image}" alt="${p.title}" class="thumb">` : ''}
  <h2><a href="/posts/${p.slug}.html">${p.title}</a></h2>
  <p class="meta">${new Date(p.date).toLocaleDateString('es-ES')}</p>
  <p class="excerpt">${p.excerpt}</p>
</article>`;
  }).join('\n');

  const indexHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Blog</title>
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="icon" href="/assets/favicon.ico">
</head>
<body>
  <main>
    <h1>Blog</h1>
    <section class="posts">${listItems}</section>
  </main>
</body>
</html>`;

  await fs.writeFile(path.join(OUT_DIR, 'index.html'), indexHtml, 'utf8');

  const assetsSrc = path.join(ROOT, 'assets');
  if (await fs.pathExists(assetsSrc)) {
    await fs.copy(assetsSrc, path.join(OUT_DIR, 'assets'));
  }

  const dataSrc = DATA_DIR;
  if (await fs.pathExists(dataSrc)) {
    await fs.copy(dataSrc, path.join(OUT_DIR, 'data'));
  }

  console.log('Build completado. Salida en:', OUT_DIR);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
