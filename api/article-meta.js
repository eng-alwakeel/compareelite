const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  const slug = req.query.slug;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.redirect(301, '/');
  }

  // Per-article static HTML already has pre-baked OG tags from generate-article-pages.js
  const htmlPath = path.join(process.cwd(), 'blog', 'article', `${slug}.html`);

  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  }

  // Fallback: build OG tags on the fly from article JSON
  const jsonPath = path.join(process.cwd(), 'articles', `${slug}.json`);

  if (fs.existsSync(jsonPath)) {
    try {
      const article = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const title = article.title || 'CompareElite';
      const desc = article.excerpt || 'Expert buying guides and product comparisons.';
      const image = article.thumbnail || 'https://compareelite.com/og-image.jpg';
      const url = `https://compareelite.com/blog/article/${slug}`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)} | CompareElite</title>
<meta name="description" content="${escHtml(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escHtml(title)}">
<meta property="og:description" content="${escHtml(desc)}">
<meta property="og:image" content="${escHtml(image)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="CompareElite">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(title)}">
<meta name="twitter:description" content="${escHtml(desc)}">
<meta name="twitter:image" content="${escHtml(image)}">
<script>window.location.replace("${url}");</script>
</head>
<body><p>Redirecting...</p></body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (e) {
      // fall through
    }
  }

  // Article not found
  return res.redirect(302, '/');
};

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
