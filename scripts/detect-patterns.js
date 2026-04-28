#!/usr/bin/env node
/**
 * Pattern detector for CompareElite.
 *
 * Reads data/health-history.json (the time series produced by
 * health-metrics.js) and looks for *recurring* problems — issues that
 * appear in 2+ consecutive snapshots. For each pattern found, emits
 * a finding with:
 *   - id            stable identifier the CEO can reference
 *   - severity      info | warning | critical
 *   - skillTarget   which agent skill the rule belongs to
 *   - proposedRule  one-line text the CEO can paste into the skill
 *   - evidence      slugs / numbers that triggered the detection
 *
 *   node scripts/detect-patterns.js                 # human-readable report
 *   node scripts/detect-patterns.js --json          # machine-readable
 *
 * Findings are also written to data/patterns-latest.json so the CEO can
 * read them without re-running the analysis. Week 1 of the rollout the
 * CEO surfaces these to the human and does NOT auto-edit skills — review
 * first, automate later once the signal is trusted.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HISTORY_PATH = path.join(ROOT, 'data', 'health-history.json');
const OUT_PATH = path.join(ROOT, 'data', 'patterns-latest.json');

const MIN_HISTORY_FOR_TREND = 2;
const DEAD_RATE_THRESHOLD = 10; // %
const NEW_ARTICLE_FAIL_THRESHOLD = 3; // brand-new article with full Dead/bad-image set
const STUCK_FAIL_REASON_THRESHOLD = 5; // same reason firing across 5+ articles

function loadHistory() {
  try {
    const arr = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function recent(history, n) {
  return history.slice(-n);
}

function detectDeadAsinSpike(history) {
  const findings = [];
  const last = recent(history, MIN_HISTORY_FOR_TREND);
  if (last.length < MIN_HISTORY_FOR_TREND) return findings;
  const allHigh = last.every((s) => s.asins.deadRate >= DEAD_RATE_THRESHOLD);
  if (!allHigh) return findings;

  // Which categories are worst right now?
  const latest = last[last.length - 1];
  const cats = Object.entries(latest.asins.deadByCategory)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c} (${n})`);

  findings.push({
    id: 'dead-asin-spike',
    severity: 'critical',
    skillTarget: 'cmo-article-writer',
    summary: `${latest.asins.dead.length}/${latest.asins.totalProducts} product links are DEAD (${latest.asins.deadRate}%) — high for ${last.length} consecutive snapshots`,
    proposedRule:
      'Before adding a product, the writer MUST verify the ASIN on amazon.com (or have it in training data with high confidence). For brand-new product categories with weak prior coverage, drop the product entirely rather than guess an ASIN — fewer products is better than fake links.',
    evidence: {
      currentDeadRate: latest.asins.deadRate,
      worstCategories: cats,
      worstArticles: Object.entries(latest.asins.deadByArticle)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([slug, n]) => `${slug} (${n} dead)`),
    },
  });
  return findings;
}

function detectFreshArticleFailure(history) {
  const findings = [];
  const last = recent(history, 1)[0];
  if (!last) return findings;

  // An article counted as "fresh failure" if it was added today AND has dead ASINs
  const todayAdds = last.articles.addedToday;
  const deadInToday = last.asins.dead.filter((d) => last.asins.deadByArticle[d.slug] >= 4);
  if (todayAdds >= NEW_ARTICLE_FAIL_THRESHOLD && deadInToday.length >= 4) {
    findings.push({
      id: 'fresh-article-mostly-dead',
      severity: 'critical',
      skillTarget: 'qc-reviewer',
      summary: `${todayAdds} articles published today have 4+ DEAD ASINs each — QC is approving without verifying the link list`,
      proposedRule:
        'BLOCK any article where 50%+ of products have ASINs that fail validate-amazon-links.js. Run the script (or at minimum check data/broken-amazon-links.json) on every article before approval — never trust the writer\'s claim that ASINs are real.',
      evidence: { addedToday: todayAdds, mostlyDead: [...new Set(deadInToday.map((d) => d.slug))] },
    });
  }
  return findings;
}

function detectStuckFailReason(history) {
  const findings = [];
  const last = recent(history, MIN_HISTORY_FOR_TREND);
  if (last.length < MIN_HISTORY_FOR_TREND) return findings;

  // Count reasons that appear in every snapshot at >= threshold
  const persistent = {};
  for (const reason of Object.keys(last[0].validator.failReasons || {})) {
    if (last.every((s) => (s.validator.failReasons || {})[reason] >= STUCK_FAIL_REASON_THRESHOLD)) {
      persistent[reason] = last[last.length - 1].validator.failReasons[reason];
    }
  }
  for (const [reason, count] of Object.entries(persistent)) {
    findings.push({
      id: 'stuck-fail-reason:' + reason.slice(0, 60),
      severity: 'warning',
      skillTarget: 'cmo-article-writer',
      summary: `"${reason}" has fired on ${count} articles across ${last.length} snapshots — recurring CMO mistake`,
      proposedRule: ruleForReason(reason),
      evidence: { reason, occurrences: count, snapshots: last.length },
    });
  }
  return findings;
}

function ruleForReason(reason) {
  const r = reason.toLowerCase();
  if (r.includes('related_articles')) {
    return 'Always include `related_articles` (2–3 same-category siblings from data/articles-index.md) before submitting to QC.';
  }
  if (r.includes('at least 6 items')) {
    return 'Refuse to submit an article with fewer than 6 products. If you cannot find 6 products with verified ASINs and Amazon CDN images, drop the article topic and pick a different one.';
  }
  if (r.includes('amazon cdn')) {
    return 'Every products[].image MUST start with https://m.media-amazon.com/images/I/. Manufacturer / blog / Unsplash hosts are auto-rejected. If you can\'t find the Amazon CDN image ID for a specific product, swap to a different product whose CDN ID you do know.';
  }
  if (r.includes('dead-link') || r.includes('broken-links report')) {
    return 'Before publishing, cross-check every ASIN against data/broken-amazon-links.json. Any DEAD entry must be replaced — never reused.';
  }
  if (r.includes('thumbnail must equal products[0].image')) {
    return 'Set article.thumbnail = products[0].image (byte-for-byte). After ranking products by rating, copy the Best Overall image into thumbnail. No exceptions.';
  }
  if (r.includes('faq must have exactly 5')) {
    return 'FAQ count is exactly 5 — not 4, not 6. Verify before submitting.';
  }
  return 'Surface this failure pattern to the human reviewer; no canned rule available yet.';
}

function detectImageHostBleedthrough(history) {
  const findings = [];
  const last = recent(history, MIN_HISTORY_FOR_TREND);
  if (last.length < MIN_HISTORY_FOR_TREND) return findings;
  const allBad = last.every((s) => s.images.productsWithBadCdn.length > 0);
  if (!allBad) return findings;

  const latest = last[last.length - 1];
  findings.push({
    id: 'image-host-bleedthrough',
    severity: 'warning',
    skillTarget: 'cmo-article-writer',
    summary: `${latest.images.productsWithBadCdn.length} product images on third-party CDNs across ${last.length} snapshots — CMO not respecting the Amazon-only rule`,
    proposedRule:
      'Reject any product where you cannot supply a valid m.media-amazon.com/images/I/[ID]._SL500_.jpg image. Manufacturer URLs, blog wp-content paths, vendor CDNs, and Unsplash are all forbidden — they are hotlink-blocked and break the live site.',
    evidence: {
      examples: latest.images.productsWithBadCdn.slice(0, 5),
      byCategory: latest.images.productsWithBadCdnByCategory,
    },
  });
  return findings;
}

function detectThumbnailDrift(history) {
  const findings = [];
  const last = recent(history, 1)[0];
  if (!last) return findings;
  if (last.images.thumbnailsNotMatchingProduct0.length === 0) return findings;
  findings.push({
    id: 'thumbnail-drift',
    severity: 'warning',
    skillTarget: 'qc-reviewer',
    summary: `${last.images.thumbnailsNotMatchingProduct0.length} articles have thumbnail ≠ products[0].image`,
    proposedRule:
      'In QC, set thumbnail = products[0].image as the final pre-submit step. The card on the homepage MUST show the Best Overall product, not a stale stock photo.',
    evidence: { affected: last.images.thumbnailsNotMatchingProduct0.slice(0, 8) },
  });
  return findings;
}

function detectAll(history) {
  return [
    ...detectDeadAsinSpike(history),
    ...detectFreshArticleFailure(history),
    ...detectStuckFailReason(history),
    ...detectImageHostBleedthrough(history),
    ...detectThumbnailDrift(history),
  ];
}

function renderText(findings, history) {
  const lines = [];
  lines.push('═══════════════════════════════════════════');
  lines.push('  CompareElite — Pattern Report');
  lines.push('  Generated: ' + new Date().toISOString());
  lines.push('  Snapshots in history: ' + history.length);
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  if (findings.length === 0) {
    lines.push('No recurring patterns detected. Pipeline healthy.');
    return lines.join('\n') + '\n';
  }
  for (const f of findings) {
    lines.push(`[${f.severity.toUpperCase()}] ${f.id}  →  ${f.skillTarget}`);
    lines.push('  ' + f.summary);
    lines.push('  Proposed rule:');
    lines.push('    ' + f.proposedRule);
    if (f.evidence) {
      lines.push('  Evidence: ' + JSON.stringify(f.evidence));
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const history = loadHistory();
  const findings = detectAll(history);
  const out = {
    generatedAt: new Date().toISOString(),
    snapshotCount: history.length,
    findings,
  };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');

  const args = process.argv.slice(2);
  if (args.includes('--json')) console.log(JSON.stringify(out, null, 2));
  else process.stdout.write(renderText(findings, history));

  process.exit(findings.some((f) => f.severity === 'critical') ? 2 : 0);
}

if (require.main === module) main();

module.exports = { detectAll };
