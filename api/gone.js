// Returns a real HTTP 410 Gone for legacy /product/* URLs that no longer exist.
// vercel.json rewrites every /product/:slug* request to /api/gone so search
// engines (Google in particular) get a "permanently removed" signal and drop
// the URLs from the index — stronger than a 404.

module.exports = (req, res) => {
  res.statusCode = 410;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="noindex">
  <title>Page removed | CompareElite</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 540px; margin: 8rem auto; padding: 0 1.5rem; color: #1a1a1a; text-align: center; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    p { color: #555; line-height: 1.6; }
    a { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #0070f3; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <h1>410 Gone</h1>
  <p>This page has been permanently removed from CompareElite.</p>
  <a href="/">Browse current guides</a>
</body>
</html>`);
};
