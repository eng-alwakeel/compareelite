'use strict';

/**
 * POST /api/publish-to-main
 * Publisher-only endpoint. Fetches article from draft/articles, re-validates,
 * then commits to main. Requires reviewer_approved: true in body.
 * Also notifies IndexNow after successful publish.
 *
 * Headers:
 *   x-api-key: PUBLISH_API_KEY
 * Body:
 *   { slug: string, reviewer_approved: true }
 * Returns:
 *   200 { success: true, slug, branch: "main", indexnow: "notified"|"failed" }
 *   400 { error, failures: [...] }
 *   401 { error: "Unauthorized" }
 *   403 { error: "Reviewer approval required" }
 *   404 { error: "Article not found in draft/articles" }
 *   405 (method not allowed)
 */

const { validateArticle } = require('../scripts/validate-article');
const path = require('path');

const OWNER = 'eng-alwakeel';
const REPO  = 'compareelite';
const DRAFT_BRANCH = 'draft/articles';
const MAIN_BRANCH  = 'main';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.PUBLISH_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { slug, reviewer_approved } = body;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug — must be lowercase letters, digits, and hyphens' });
  }

  // Hard gate: reviewer approval required
  if (!reviewer_approved) {
    return res.status(403).json({
      error: 'Reviewer approval required',
      message: 'Cannot publish without APPROVED status from Reviewer',
    });
  }

  const token = process.env.CE_AGENTS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server misconfiguration: CE_AGENTS_TOKEN not set' });
  }

  // Fetch article from draft/articles
  const draftUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/articles/${slug}.json?ref=${encodeURIComponent(DRAFT_BRANCH)}`;
  const draftRes = await fetch(draftUrl, { headers: githubHeaders(token) });
  if (!draftRes.ok) {
    return res.status(404).json({
      error: 'Article not found in draft/articles',
      slug,
      branch: DRAFT_BRANCH,
    });
  }
  const draftFile = await draftRes.json();

  // Decode and re-validate
  const rawContent = Buffer.from(draftFile.content, 'base64').toString('utf8');
  let article;
  try {
    article = JSON.parse(rawContent);
  } catch {
    return res.status(400).json({ error: 'Article JSON in draft branch is malformed' });
  }

  const filePath = path.resolve(process.cwd(), 'articles', `${slug}.json`);
  const failures = validateArticle(article, filePath);
  if (failures.length > 0) {
    return res.status(400).json({ error: 'Final validation failed', failures });
  }

  // Get SHA on main if file already exists (required for update)
  const mainSha = await getFileSha(token, slug, MAIN_BRANCH);

  const payload = {
    message: `Publish: ${slug}\n\nAuthor: CompareElite Bot <bot@compareelite.com>`,
    content: draftFile.content, // already base64
    branch: MAIN_BRANCH,
  };
  if (mainSha) payload.sha = mainSha;

  const pushRes = await githubPut(token, `articles/${slug}.json`, payload);
  if (!pushRes.ok) {
    const err = await pushRes.text();
    return res.status(502).json({ error: 'GitHub API error on publish', detail: err });
  }

  // Notify IndexNow
  const indexnowStatus = await notifyIndexNow(slug);

  return res.status(200).json({
    success: true,
    slug,
    branch: MAIN_BRANCH,
    indexnow: indexnowStatus,
    message: 'Published to main successfully',
  });
};

// ── helpers ───────────────────────────────────────────────────────────────────

async function getFileSha(token, slug, branch) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/articles/${slug}.json?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: githubHeaders(token) });
  if (!r.ok) return null;
  const data = await r.json();
  return data.sha || null;
}

async function githubPut(token, filePath, payload) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  return fetch(url, {
    method: 'PUT',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function notifyIndexNow(slug) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return 'skipped (no INDEXNOW_KEY)';
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'compareelite.com',
        key,
        urlList: [`https://compareelite.com/blog/article?slug=${slug}`],
      }),
    });
    return r.ok ? `HTTP ${r.status}` : `failed (HTTP ${r.status})`;
  } catch (e) {
    return `failed (${e.message})`;
  }
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'compareelite-bot/1.0',
  };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
