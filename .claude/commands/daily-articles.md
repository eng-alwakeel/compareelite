# Daily Article Generator — CompareElite

Generate **4 new affiliate articles** for compareelite.com. Each article goes through writer → liveness gates → QC review. Only articles that pass every gate get committed and pushed to `main`. Rejected articles are reported and skipped — never silently shipped.

---

## Step 1 — Pick 4 New Topics

1. Read the live articles index:
   ```
   curl -s https://raw.githubusercontent.com/eng-alwakeel/compareelite/main/data/articles-index.md
   ```
   (or `cat data/articles-index.md` if working in a checkout). The index lists every published slug.

2. Pick **4 topics** that are NOT in the index, drawn from the rotation pool below. Choose diverse categories — no two from the same category in one batch.

3. Every topic's `category` field MUST be exactly one of these four values (no others — the validator and renderer reject anything else):
   - `Tech`
   - `Home Office`
   - `Smart Home`
   - `Home Fitness`

### Topic Rotation Pool (category → suggested slugs)

- **Tech**: best-portable-monitors-2026, best-action-cameras-2026, best-smartwatches-2026, best-streaming-sticks-2026, best-wifi-routers-2026, best-vr-headsets-2026, best-portable-power-stations-2026, best-bluetooth-trackers-2026, best-wireless-chargers-2026
- **Home Office**: best-task-lighting-2026, best-cable-management-2026, best-desk-mats-2026, best-document-scanners-2026, best-acoustic-panels-2026, best-monitor-light-bars-2026
- **Smart Home**: best-smart-doorbells-2026, best-smart-curtains-2026, best-leak-detectors-2026, best-smart-bulbs-2026, best-pet-cameras-2026, best-smart-displays-2026, best-robot-mops-2026
- **Home Fitness**: best-jump-ropes-2026, best-pull-up-bars-2026, best-massage-guns-2026, best-kettlebells-2026, best-rowing-machines-2026, best-suspension-trainers-2026, best-yoga-blocks-2026

If the pool runs low, propose new slugs in the same 4 categories — but never use a category outside the 4.

---

## Step 2 — Write Each Article (delegate to writer skill)

For each of the 4 topics, invoke the writer skill — do NOT write the JSON inline in this command. The writer skill is the single source of truth for schema, word counts, pros/cons format, FAQ count, and ASIN/image rules.

```
Use the compareelite-article-writer skill to write the article for
slug=<slug>, category=<category>. Save the output to articles/<slug>.json.
```

The writer skill's `AUTO-IMPROVEMENTS (2026-04-29)` section is binding: the writer must NOT hallucinate Amazon image IDs, must WebFetch each ASIN before writing it, and must drop products it cannot verify.

After writing each article, ALSO invoke the compareelite-cto skill to run pre-publish checks (schema, image liveness, link liveness, related-articles integrity) — its decision feeds into Step 4.

---

## Step 3 — Liveness gates (BLOCKING)

For each newly written `articles/<slug>.json`, run both scripts in order:

### Gate 3a — Image enrichment
```bash
node scripts/fix-product-images.js --slug <slug>
```
This probes every product image. For any image that returns a 43-byte placeholder GIF or HTTP 404, it scrapes Amazon to extract the real image ID and rewrites the JSON. Re-syncs `thumbnail = products[0].image`.

### Gate 3b — ASIN liveness
```bash
node scripts/validate-amazon-links.js --slug <slug>
```
- `OK` for every product → proceed to Step 4.
- Any `DEAD` result → mark this article as REJECTED. Do NOT commit it.
- > 50% `BLOCKED` → IP throttled; wait 60–90s and re-run before deciding.

### Gate 3c — Schema validation
```bash
node scripts/validate-article.js articles/<slug>.json
```
Any FAIL → REJECTED.

---

## Step 4 — QC Review (delegate to QC skill)

For each article that passed Step 3, invoke the QC reviewer skill:

```
Use the compareelite-qc-reviewer skill to review articles/<slug>.json.
The skill returns APPROVED or REJECTED with a checklist.
```

The QC skill's `AUTO-IMPROVEMENTS (2026-04-29)` section is binding (it re-runs Gates 3a/3b as a final sanity check; do not skip just because Step 3 already ran).

- APPROVED → article goes into the commit batch.
- REJECTED → article does NOT get committed. Write the failed-check list into the run summary so the failure is visible. If running inside a GitHub Actions context, leave the `articles/<slug>.json` file in place so the next run can either fix it or delete it deliberately — never silently overwrite.

---

## Step 5 — Commit & Push (only the approved subset)

```bash
APPROVED_FILES=$(... list of articles/<slug>.json that passed every gate ...)
if [ -n "$APPROVED_FILES" ]; then
  git add $APPROVED_FILES
  git commit -m "Add daily articles: <slug1>, <slug2>, ..."
  git push -u origin main
fi
```

If zero articles passed, do NOT make an empty commit. Print the rejection summary and exit non-zero so the workflow surfaces the failure.

---

## Output Summary

Print a structured report at the end of the run:

```
Daily run YYYY-MM-DD
  Topics picked:          4
  Articles written:       N
  Failed liveness gates:  M  (list slugs + reason: DEAD ASIN / image 404 / schema)
  Failed QC review:       K  (list slugs + first 3 failed checks)
  Approved & pushed:      P
```

Articles never go to production unless they pass every gate. Better to ship 0 articles today than ship one with hallucinated ASINs.
