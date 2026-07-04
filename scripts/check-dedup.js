#!/usr/bin/env node
/**
 * Root-keyword dedup gate for daily-article generation.
 *
 * WHY: the Editor's old dedup read `data/articles-index.md` / `data/articles-slugs.txt`,
 * which are only refreshed by CI on pushes to main. A firing on a working branch reads a
 * STALE list, so a hyphenation variant of a live head term slips through an exact-string
 * check (see COM-636: `best-weightlifting-belts-2026` passed even though
 * `articles/best-weight-lifting-belts-2026.json` is already live on origin/main).
 *
 * THIS SCRIPT checks the candidate slug against ACTUAL `origin/main` file existence,
 * matching by normalized ROOT keyword (hyphens/spaces collapsed) — not an exact slug.
 *
 *   node scripts/check-dedup.js best-weightlifting-belts-2026
 *   node scripts/check-dedup.js best-weightlifting-belts-2026 --no-fetch   # skip network fetch
 *
 * Exit codes:
 *   0  no collision (safe to write)          — prints "OK"
 *   2  hard collision (same root incl. year) — prints the matched live slug; DO NOT write
 *   3  soft warning (same root, diff year)   — prints the matched live slug; Reviewer must audit
 *   1  usage / git error
 *
 * The matched live slug is always surfaced in the log so the Reviewer can audit.
 */

'use strict';

const { execFileSync } = require('child_process');

/**
 * Collapse a slug to its comparable root keyword.
 * Lowercases, drops the "best-"/"top-" lead-in, strips a trailing/embedded 4-digit
 * year, and removes every non-alphanumeric char so hyphenation variants converge:
 *   weight-lifting == weightlifting, smart-watch == smartwatch,
 *   sound-bar == soundbar, wi-fi == wifi.
 * Returns { root, year } where `root` excludes the year.
 */
function normalizeRoot(slug) {
  let s = String(slug).toLowerCase().replace(/\.json$/, '').replace(/^articles\//, '');
  s = s.replace(/^(best|top)-/, '');
  const yearMatch = s.match(/(?:^|[-_])((?:19|20)\d{2})(?=$|[-_])/);
  const year = yearMatch ? yearMatch[1] : null;
  s = s.replace(/(?:^|[-_])((?:19|20)\d{2})(?=$|[-_])/g, '');
  const root = s.replace(/[^a-z0-9]/g, '');
  return { root, year };
}

/**
 * Enumerate real article slugs on origin/main via `git ls-tree` (the source of truth),
 * never a committed list that may be stale on this branch.
 */
function liveSlugsFromOriginMain({ fetch = true, cwd = process.cwd() } = {}) {
  if (fetch) {
    try {
      execFileSync('git', ['fetch', '--quiet', 'origin', 'main'], { cwd, stdio: 'pipe' });
    } catch (err) {
      process.stderr.write(`[check-dedup] warning: could not fetch origin/main (${err.message.trim()}); using local ref\n`);
    }
  }
  const out = execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', 'origin/main', '--', 'articles/'],
    { cwd, encoding: 'utf8' }
  );
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.endsWith('.json') && l !== 'articles/TEMPLATE.json')
    .map((l) => l.replace(/^articles\//, '').replace(/\.json$/, ''));
}

/**
 * Compare a candidate slug against a list of live slugs by normalized root keyword.
 * Returns { verdict: 'ok'|'collision'|'warning', match: <liveSlug>|null }.
 */
function checkCandidate(candidate, liveSlugs) {
  const cand = normalizeRoot(candidate);
  if (!cand.root) return { verdict: 'ok', match: null };

  let softMatch = null;
  for (const live of liveSlugs) {
    const l = normalizeRoot(live);
    if (l.root !== cand.root) continue;
    // Same root AND same (or both-missing) year => hard collision.
    if (l.year === cand.year) return { verdict: 'collision', match: live };
    // Same root, different year => cannibalization warning for the Reviewer to audit.
    if (!softMatch) softMatch = live;
  }
  if (softMatch) return { verdict: 'warning', match: softMatch };
  return { verdict: 'ok', match: null };
}

function main(argv) {
  const args = argv.slice(2);
  const noFetch = args.includes('--no-fetch');
  const candidate = args.find((a) => !a.startsWith('-'));
  if (!candidate) {
    process.stderr.write('usage: node scripts/check-dedup.js <candidate-slug> [--no-fetch]\n');
    return 1;
  }

  let liveSlugs;
  try {
    liveSlugs = liveSlugsFromOriginMain({ fetch: !noFetch });
  } catch (err) {
    process.stderr.write(`[check-dedup] git error: ${err.message.trim()}\n`);
    return 1;
  }

  const { verdict, match } = checkCandidate(candidate, liveSlugs);
  const root = normalizeRoot(candidate).root;

  if (verdict === 'collision') {
    process.stdout.write(
      `DUPLICATE_TOPIC: ${match}\n` +
        `  candidate "${candidate}" collides with LIVE origin/main slug "${match}" (root="${root}").\n` +
        `  Same head term — keyword cannibalization. Do NOT write; pick a different product class/angle.\n`
    );
    return 2;
  }
  if (verdict === 'warning') {
    process.stdout.write(
      `DUPLICATE_TOPIC_WARN: ${match}\n` +
        `  candidate "${candidate}" shares root "${root}" with LIVE slug "${match}" (different year).\n` +
        `  Likely an annual refresh — Reviewer must confirm this is intentional before publish.\n`
    );
    return 3;
  }
  process.stdout.write(`OK: "${candidate}" (root="${root}") — no root-keyword collision on origin/main (${liveSlugs.length} live slugs checked)\n`);
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { normalizeRoot, checkCandidate, liveSlugsFromOriginMain };
