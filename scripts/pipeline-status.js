#!/usr/bin/env node
/**
 * CompareElite Pipeline Status Monitor
 * Uses gh CLI to check issue state across the Editor→Reviewer→Publisher pipeline.
 * Run: node scripts/pipeline-status.js
 * Requires: gh auth login (GitHub CLI authenticated)
 */

const { execSync } = require('child_process');

const REPO = 'eng-alwakeel/compareelite';
const STUCK_THRESHOLD_HOURS = 4;

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stdout || '';
  }
}

function hoursSince(dateStr) {
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000;
}

function getIssues(label) {
  const raw = run(
    `gh issue list --repo ${REPO} --label "${label}" --state open --json number,title,createdAt,updatedAt,body --limit 100`
  );
  try { return JSON.parse(raw); } catch { return []; }
}

function main() {
  console.log('='.repeat(60));
  console.log('CompareElite Pipeline Status — ' + new Date().toLocaleString('en-SA', { timeZone: 'Asia/Riyadh' }) + ' KSA');
  console.log('='.repeat(60));

  // Ready for review (Editor done, waiting Reviewer)
  const readyIssues = getIssues('daily-articles').filter(i =>
    i.body && i.body.includes('READY FOR REVIEW')
  );

  // Approved (Reviewer done, waiting Publisher)
  const approvedIssues = getIssues('daily-articles').filter(i =>
    i.body && i.body.includes('APPROVED ✅')
  );

  // All open daily-articles issues
  const allOpen = getIssues('daily-articles');

  // Rejected
  const rejectedIssues = allOpen.filter(i =>
    i.body && i.body.includes('REJECTED ❌')
  );

  // Stuck (updated > 4 hours ago)
  const stuckIssues = allOpen.filter(i =>
    hoursSince(i.updatedAt) > STUCK_THRESHOLD_HOURS
  );

  console.log(`\n📋 PIPELINE SUMMARY`);
  console.log(`   Open issues total : ${allOpen.length}`);
  console.log(`   Ready for Review  : ${readyIssues.length}`);
  console.log(`   Approved (→Publisher): ${approvedIssues.length}`);
  console.log(`   Rejected          : ${rejectedIssues.length}`);
  console.log(`   STUCK (>${STUCK_THRESHOLD_HOURS}h)     : ${stuckIssues.length}`);

  if (readyIssues.length > 0) {
    console.log('\n🟡 READY FOR REVIEW:');
    readyIssues.forEach(i => console.log(`   #${i.number} ${i.title}`));
  }

  if (approvedIssues.length > 0) {
    console.log('\n🟢 APPROVED — AWAITING PUBLISHER:');
    approvedIssues.forEach(i => console.log(`   #${i.number} ${i.title}`));
  }

  if (rejectedIssues.length > 0) {
    console.log('\n🔴 REJECTED — NEEDS EDITOR FIX:');
    rejectedIssues.forEach(i => console.log(`   #${i.number} ${i.title}`));
  }

  if (stuckIssues.length > 0) {
    console.log(`\n⚠️  STUCK ISSUES (no update in >${STUCK_THRESHOLD_HOURS}h):`);
    stuckIssues.forEach(i => {
      const h = hoursSince(i.updatedAt).toFixed(1);
      console.log(`   #${i.number} ${i.title} — ${h}h ago`);
    });
  }

  // Published today
  const today = new Date().toISOString().slice(0, 10);
  const publishedRaw = run(
    `gh issue list --repo ${REPO} --label "daily-articles" --state closed --json number,title,closedAt --limit 50`
  );
  let publishedToday = [];
  try {
    publishedToday = JSON.parse(publishedRaw).filter(i =>
      i.closedAt && i.closedAt.startsWith(today)
    );
  } catch {}

  console.log(`\n✅ PUBLISHED TODAY: ${publishedToday.length}`);
  publishedToday.forEach(i => console.log(`   #${i.number} ${i.title}`));

  console.log('\n' + '='.repeat(60));

  // Exit with error code if stuck issues exist
  if (stuckIssues.length > 0) process.exit(1);
}

main();
