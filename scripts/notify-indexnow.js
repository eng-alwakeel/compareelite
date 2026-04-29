#!/usr/bin/env node
/**
 * IndexNow notifier for compareelite.com
 *
 * Usage:
 *   node scripts/notify-indexnow.js                          # notify every slug in data/articles-manifest.json
 *   node scripts/notify-indexnow.js slug1 slug2 ...          # notify only the given slugs
 *   node scripts/notify-indexnow.js --dry-run [slugs...]     # build the request but do not POST
 *
 * Locates the IndexNow key automatically by scanning the repository root for a
 * file named <32-hex>.txt whose contents match the filename (per IndexNow
 * protocol). The file must live at the root because vercel.json sets
 * outputDirectory:"." and search engines verify at https://<host>/<key>.txt.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'articles-manifest.json');

const HOST = 'compareelite.com';
const URL_PREFIX = `https://${HOST}/blog/article?slug=`;
const ENDPOINT = { hostname: 'api.indexnow.org', path: '/indexnow', port: 443 };

function findKey() {
  const candidates = fs.readdirSync(ROOT).filter(f => /^[a-f0-9]{32}\.txt$/i.test(f));
  if (candidates.length === 0) {
    throw new Error(`No IndexNow key file found at repo root (${ROOT}). Expected: <32-hex>.txt`);
  }
  if (candidates.length > 1) {
    throw new Error(`Multiple IndexNow key files at repo root: ${candidates.join(', ')}. Keep exactly one.`);
  }
  const filename = candidates[0];
  const key = path.basename(filename, '.txt');
  const contents = fs.readFileSync(path.join(ROOT, filename), 'utf8').trim();
  if (contents !== key) {
    throw new Error(`Key file contents (${contents}) do not match filename (${key}). IndexNow requires they match.`);
  }
  return key;
}

function buildUrlList(slugs) {
  return slugs.map(slug => `${URL_PREFIX}${slug}`);
}

function post(key, urlList) {
  const body = JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList });
  return new Promise((resolve, reject) => {
    const req = https.request({
      ...ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'compareelite-indexnow/1.0',
      },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('IndexNow request timed out')); });
    req.write(body);
    req.end();
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const slugArgs = argv.filter(a => !a.startsWith('--'));

  let slugs;
  if (slugArgs.length > 0) {
    slugs = slugArgs;
  } else {
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error(`Manifest not found at ${MANIFEST_PATH}. Pass slugs as args, or run after the manifest step.`);
      process.exit(2);
    }
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    slugs = manifest.slugs || [];
  }

  if (slugs.length === 0) {
    console.log('No slugs to notify — nothing to do.');
    return;
  }

  const key = findKey();
  const urlList = buildUrlList(slugs);

  console.log(`IndexNow: notifying ${urlList.length} URL(s) using key ${key.slice(0, 8)}…`);
  for (const u of urlList) console.log(`  ${u}`);

  if (dryRun) {
    console.log('--dry-run set — request not sent.');
    return;
  }

  const { status, body } = await post(key, urlList);
  console.log(`IndexNow response: HTTP ${status}${body ? ` | ${body.trim()}` : ''}`);

  // Per IndexNow protocol: 200 = OK, 202 = Accepted (queued).
  // Any other code is a real failure that should fail the workflow.
  if (status < 200 || status >= 300) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('IndexNow error:', err && err.message ? err.message : err);
  process.exit(2);
});
