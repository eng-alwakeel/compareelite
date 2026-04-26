#!/usr/bin/env node
/**
 * Amazon link liveness checker for CompareElite articles.
 *
 * For every product link in articles/*.json:
 *   - extract the ASIN from /dp/<ASIN>
 *   - probe the URL (HEAD then GET fallback) with a real browser User-Agent
 *   - classify the result: OK | DEAD | BLOCKED | ERROR
 *
 * "DEAD" means Amazon explicitly returned 404/410 OR the rendered page
 * matches a known "Looking for something? We're sorry" / "Page Not Found"
 * marker. "BLOCKED" means Amazon refused with 503/CAPTCHA — this happens
 * from datacenter IPs (CI, sandboxes); run from a normal IP for clean
 * results. "ERROR" means a network/timeout failure.
 *
 *   node scripts/validate-amazon-links.js                       # check everything, write JSON + MD report
 *   node scripts/validate-amazon-links.js --slug best-foo-2026  # one article
 *   node scripts/validate-amazon-links.js --json out.json --md report.md
 *
 * Exit code: 0 if no DEAD links, 1 if any DEAD links found.
 * BLOCKED and ERROR do NOT fail the run — they are reported but treated
 * as "could not verify" so a flaky CI/IP block does not gate publishing.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const DEFAULT_JSON = path.join(ROOT, 'data', 'broken-amazon-links.json');
const DEFAULT_MD = path.join(ROOT, 'data', 'broken-amazon-links.md');

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0';
const REQUEST_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'identity',
};
const REQUEST_TIMEOUT_MS = 12000;
const CONCURRENCY = 2;
const PER_REQUEST_DELAY_MS = 350;
const MAX_REDIRECTS = 5;

const NOT_FOUND_MARKERS = [
  "Looking for something?",
  "We're sorry. The Web address you entered",
  "Sorry! We couldn't find that page",
  "Page Not Found",
  "doesn't exist anymore",
  "currently unavailable",
];

const ASIN_RE = /\/dp\/([A-Z0-9]{10})/;

function loadProductLinks(slugFilter) {
  const out = [];
  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'TEMPLATE.json');

  for (const file of files) {
    const slug = path.basename(file, '.json');
    if (slugFilter && slug !== slugFilter) continue;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8'));
    } catch (err) {
      console.error(`skip ${file}: invalid JSON (${err.message})`);
      continue;
    }
    const products = Array.isArray(data.products) ? data.products : [];
    products.forEach((p, i) => {
      const link = typeof p.link === 'string' ? p.link : '';
      const match = link.match(ASIN_RE);
      out.push({
        slug,
        index: i,
        name: typeof p.name === 'string' ? p.name : '',
        link,
        asin: match ? match[1] : null,
      });
    });
  }
  return out;
}

function isAsinFormatValid(asin) {
  return typeof asin === 'string' && /^[A-Z0-9]{10}$/.test(asin);
}

function fetchOnce(urlStr, method) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(urlStr);
    } catch {
      return resolve({ kind: 'error', message: 'invalid URL' });
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return resolve({ kind: 'error', message: `unsupported protocol ${url.protocol}` });
    }

    const req = https.request(
      {
        method,
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: REQUEST_HEADERS,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        if (method === 'HEAD' || res.statusCode >= 300) {
          // For redirects we still want headers; for HEAD we never read body.
          res.resume();
          return resolve({
            kind: 'response',
            status: res.statusCode || 0,
            headers: res.headers,
            body: '',
          });
        }
        let body = '';
        let bytes = 0;
        const MAX_BODY = 64 * 1024;
        res.on('data', (chunk) => {
          if (bytes < MAX_BODY) {
            body += chunk.toString('utf8');
            bytes += chunk.length;
          }
        });
        res.on('end', () =>
          resolve({
            kind: 'response',
            status: res.statusCode || 0,
            headers: res.headers,
            body,
          })
        );
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ kind: 'error', message: 'timeout' });
    });
    req.on('error', (err) => resolve({ kind: 'error', message: err.message }));
    req.end();
  });
}

async function probe(urlStr) {
  let current = urlStr;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let r = await fetchOnce(current, 'HEAD');
    if (r.kind === 'response' && (r.status === 405 || r.status === 403)) {
      r = await fetchOnce(current, 'GET');
    }
    if (r.kind === 'error') return { status: 0, error: r.message, finalUrl: current, body: '' };
    if (r.status >= 300 && r.status < 400 && r.headers.location) {
      try {
        current = new URL(r.headers.location, current).toString();
        continue;
      } catch {
        return { status: r.status, error: 'bad redirect target', finalUrl: current, body: '' };
      }
    }
    if (r.status === 200 && !r.body) {
      const body = await fetchOnce(current, 'GET');
      if (body.kind === 'response') {
        return { status: body.status, finalUrl: current, body: body.body, error: null };
      }
    }
    return { status: r.status, finalUrl: current, body: r.body || '', error: null };
  }
  return { status: 0, error: 'too many redirects', finalUrl: current, body: '' };
}

function classify(asin, probeResult) {
  if (!isAsinFormatValid(asin)) {
    return { state: 'DEAD', reason: 'malformed ASIN (must be 10 alphanumeric chars)' };
  }
  if (probeResult.error) {
    return { state: 'ERROR', reason: probeResult.error };
  }
  const { status, body } = probeResult;
  if (status === 404 || status === 410) {
    return { state: 'DEAD', reason: `HTTP ${status}` };
  }
  if (status === 503 || status === 429) {
    return { state: 'BLOCKED', reason: `HTTP ${status} (likely IP rate-limit / CAPTCHA wall)` };
  }
  if (status >= 500) {
    return { state: 'ERROR', reason: `HTTP ${status}` };
  }
  if (status === 200) {
    if (body && NOT_FOUND_MARKERS.some((m) => body.includes(m))) {
      return { state: 'DEAD', reason: 'page rendered with "not found" marker' };
    }
    return { state: 'OK', reason: null };
  }
  return { state: 'ERROR', reason: `HTTP ${status}` };
}

async function checkAll(items, onProgress) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      const item = items[i];
      let probed = { status: 0, error: 'no link', body: '', finalUrl: item.link };
      if (item.link) probed = await probe(item.link);
      const verdict = classify(item.asin, probed);
      results[i] = { ...item, status: probed.status, finalUrl: probed.finalUrl, ...verdict };
      onProgress(i + 1, items.length, results[i]);
      await new Promise((r) => setTimeout(r, PER_REQUEST_DELAY_MS));
    }
  }
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  return results;
}

function summarize(results) {
  const buckets = { OK: 0, DEAD: 0, BLOCKED: 0, ERROR: 0 };
  for (const r of results) buckets[r.state] += 1;
  return buckets;
}

function renderMarkdown(results, summary, generatedAt, blockedNote) {
  const dead = results.filter((r) => r.state === 'DEAD');
  const blocked = results.filter((r) => r.state === 'BLOCKED');
  const errored = results.filter((r) => r.state === 'ERROR');

  const lines = [];
  lines.push('# Broken Amazon Links — Liveness Report');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| State | Count |`);
  lines.push(`|---|---:|`);
  lines.push(`| OK (200, valid product) | ${summary.OK} |`);
  lines.push(`| DEAD (404/410 or "not found" page) | ${summary.DEAD} |`);
  lines.push(`| BLOCKED (503/429 — could not verify) | ${summary.BLOCKED} |`);
  lines.push(`| ERROR (timeout / network failure) | ${summary.ERROR} |`);
  lines.push(`| **Total** | **${results.length}** |`);
  lines.push('');

  if (blockedNote) {
    lines.push('> ⚠️ ' + blockedNote);
    lines.push('');
  }

  function table(title, rows, suggestion) {
    if (rows.length === 0) return;
    lines.push(`## ${title} (${rows.length})`);
    lines.push('');
    lines.push('| Article | Product | ASIN | Status | Reason | Suggested action |');
    lines.push('|---|---|---|---:|---|---|');
    for (const r of rows) {
      lines.push(
        `| \`${r.slug}\` | ${r.name.replace(/\|/g, '\\|')} | \`${r.asin || '∅'}\` | ${r.status || '-'} | ${r.reason} | ${suggestion(r)} |`
      );
    }
    lines.push('');
  }

  table('DEAD links', dead, () =>
    'Replace the product with a verified ASIN from Amazon, or remove it.'
  );
  table('BLOCKED (could not verify)', blocked, () =>
    'Re-run the script from a non-datacenter IP (laptop or GitHub-hosted runner).'
  );
  table('ERROR (network/timeout)', errored, () =>
    'Re-run the script. If it persists, inspect the URL manually.'
  );

  if (dead.length === 0 && blocked.length === 0 && errored.length === 0) {
    lines.push('## All product links returned 200 ✅');
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

function parseArgs(argv) {
  const args = { slug: null, json: DEFAULT_JSON, md: DEFAULT_MD };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--slug') args.slug = argv[++i];
    else if (a === '--json') args.json = path.resolve(argv[++i]);
    else if (a === '--md') args.md = path.resolve(argv[++i]);
    else if (a === '--no-md') args.md = null;
    else if (a === '--no-json') args.json = null;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const items = loadProductLinks(args.slug);
  if (items.length === 0) {
    console.error('no product links found');
    process.exit(1);
  }
  console.log(`Probing ${items.length} Amazon links (concurrency=${CONCURRENCY}, delay=${PER_REQUEST_DELAY_MS}ms)...`);
  const t0 = Date.now();
  const results = await checkAll(items, (done, total, r) => {
    const tag = r.state === 'OK' ? ' ' : r.state === 'DEAD' ? '✗' : r.state === 'BLOCKED' ? '?' : '!';
    process.stdout.write(`[${done}/${total}] ${tag} ${r.state.padEnd(7)} ${r.slug} #${r.index} ${r.asin || '∅'} ${r.reason ? '— ' + r.reason : ''}\n`);
  });
  const summary = summarize(results);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s — OK ${summary.OK}, DEAD ${summary.DEAD}, BLOCKED ${summary.BLOCKED}, ERROR ${summary.ERROR}`);

  const blockedNote =
    summary.BLOCKED > 0 && summary.OK === 0
      ? 'All probes returned 503/429. Amazon blocks most datacenter IPs (Vercel sandboxes, AWS, GitHub-hosted runners can be flaky too). Re-run from a residential IP for an authoritative result. The script itself is fine.'
      : null;

  const generatedAt = new Date().toISOString();
  if (args.json) {
    fs.mkdirSync(path.dirname(args.json), { recursive: true });
    fs.writeFileSync(
      args.json,
      JSON.stringify({ generatedAt, summary, results }, null, 2) + '\n',
      'utf8'
    );
    console.log(`Wrote ${path.relative(ROOT, args.json)}`);
  }
  if (args.md) {
    fs.mkdirSync(path.dirname(args.md), { recursive: true });
    fs.writeFileSync(args.md, renderMarkdown(results, summary, generatedAt, blockedNote), 'utf8');
    console.log(`Wrote ${path.relative(ROOT, args.md)}`);
  }
  process.exit(summary.DEAD > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}

module.exports = { loadProductLinks, classify, probe, isAsinFormatValid };
