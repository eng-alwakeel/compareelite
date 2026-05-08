'use strict';

/**
 * POST /api/save-draft
 * Editor-only endpoint. Validates article JSON and commits it to the
 * draft/articles branch via GitHub API. Never touches main.
 *
 * Headers:
 *   x-api-key: PUBLISH_API_KEY
 * Body:
 *   { slug: string, content: object }
 * Returns:
 *   200 { success: true, slug, branch: "draft/articles" }
 *   400 { error, failures: [...] }
 *   401 { error: "Unauthorized" }
 *   405 (method not allowed)
 */

const { validateArticle } = require('../scripts/validate-article');
const path = require('path');

const OWNER = 'eng-alwakeel';
const REPO  = 'compareelite';
const DRAFT_BRANCH = 'draft/articles';

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

  const { slug, content } = body;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug — must be lowercase letters, digits, and hyphens' });
  }

  if (!content || typeof content !== 'object') {
    return res.status(400).json({ error: 'content must be a JSON object' });
  }

  // Validate schema using the same validator as the CLI
  const filePath = path.resolve(process.cwd(), 'articles', `${slug}.json`);
  const failures = validateArticle(content, filePath);
  if (failures.length > 0) {
    return res.status(400).json({ error: 'Validation failed', failures });
  }

  const token = process.env.CE_AGENTS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server misconfiguration: CE_AGENTS_TOKEN not set' });
  }

  const fileSha = await getFileSha(token, slug, DRAFT_BRANCH);

  const payload = {
    message: `draft: ${slug}\n\nAuthor: CompareElite Bot <bot@compareelite.com>`,
    content: Buffer.from(JSON.stringify(content, null, 2) + '\n').toString('base64'),
    branch: DRAFT_BRANCH,
  };
  if (fileSha) payload.sha = fileSha;

  const pushRes = await githubPut(token, `articles/${slug}.json`, payload);
  if (!pushRes.ok) {
    const err = await pushRes.text();
    return res.status(502).json({ error: 'GitHub API error', detail: err });
  }

  return res.status(200).json({
    success: true,
    slug,
    branch: DRAFT_BRANCH,
    message: 'Saved to draft. Awaiting QC.',
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
