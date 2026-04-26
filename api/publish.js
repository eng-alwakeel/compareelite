/**
 * /api/publish — Vercel serverless function.
 *
 * Validates an incoming article against articles/TEMPLATE.json rules
 * BEFORE writing it to the articles/ folder. Validation failures reject
 * the request with the full list of errors so the caller can fix and retry.
 *
 * Body: { article: <JSON object>, slug?: <string> }
 * Returns:
 *   200 { status: "PASS", slug, path } on success
 *   400 { status: "FAIL", errors: [...] } on validation failure
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { validateArticle } = require('../scripts/validate-article');

function log(level, payload) {
  const entry = { ts: new Date().toISOString(), level, ...payload };
  console.log(JSON.stringify(entry));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'FAIL', errors: ['method not allowed'] });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body || typeof body !== 'object' || !body.article) {
    log('warn', { event: 'publish.bad_request' });
    return res.status(400).json({ status: 'FAIL', errors: ['request body must include "article"'] });
  }

  const article = body.article;
  const slug = body.slug || article.slug;
  if (!slug || typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
    log('warn', { event: 'publish.invalid_slug', slug });
    return res.status(400).json({ status: 'FAIL', errors: ['slug must be lowercase letters, digits, and hyphens'] });
  }

  const fileName = `${slug}.json`;
  const targetPath = path.resolve(__dirname, '..', 'articles', fileName);

  // Run the same validator the CLI uses, against the proposed file path
  // so that the slug-vs-filename rule fires correctly.
  const errors = validateArticle(article, targetPath);

  if (errors.length > 0) {
    log('warn', { event: 'publish.validation_failed', slug, errors });
    return res.status(400).json({ status: 'FAIL', slug, errors });
  }

  try {
    fs.writeFileSync(targetPath, JSON.stringify(article, null, 2) + '\n', 'utf8');
  } catch (err) {
    log('error', { event: 'publish.write_failed', slug, message: err.message });
    return res.status(500).json({ status: 'FAIL', errors: [`write failed: ${err.message}`] });
  }

  log('info', { event: 'publish.success', slug, path: `articles/${fileName}` });
  return res.status(200).json({ status: 'PASS', slug, path: `articles/${fileName}` });
};

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
