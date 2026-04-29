# Daily Article Generator — CompareElite

Generate **4 new affiliate articles** for compareelite.com. Each article moves through a strict assembly line:

```
Writer writes → liveness gates → QC review
                                    ↓ REJECTED
                              Writer fixes (max 1 retry)
                                    ↓
                                  QC re-review
                                    ↓ APPROVED
                              CTO final gate → commit
```

No agent pushes directly. The CTO is the only gate that can let an article into the commit batch, and the workflow runs the validators *again* after the skill exits — broken articles are blocked at three independent layers.

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

Do NOT invoke the CTO skill yet — the CTO is the final gate (Step 6), not a pre-flight check. The writer's only handoff is to Step 3.

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

## Step 4 — QC Review, Round 1 (delegate to QC skill)

For each article that passed Step 3, invoke the QC reviewer skill:

```
Use the compareelite-qc-reviewer skill to review articles/<slug>.json.
The skill returns APPROVED or REJECTED with a per-check verdict.
```

The QC skill's `AUTO-IMPROVEMENTS (2026-04-29)` section is binding (it re-runs Gates 3a/3b as a final sanity check; do not skip just because Step 3 already ran).

**Outcome routing:**
- **APPROVED** → proceed to Step 6 (CTO).
- **REJECTED** → proceed to Step 5 (writer fix loop). Do NOT skip the article yet — the writer gets one chance to fix the specific failed checks.

Capture the QC report in a variable so the writer can see *exactly* which checks failed.

---

## Step 5 — Writer Fix + QC Round 2 (max 1 retry)

For each REJECTED article from Step 4:

1. **Hand the QC report back to the writer skill** with an explicit fix instruction:
   ```
   Use the compareelite-article-writer skill to fix articles/<slug>.json.
   The QC reviewer rejected it for these specific reasons:
   <paste the failed-check list verbatim from Step 4>
   Fix ONLY those issues. Do not rewrite the rest of the article.
   ```
2. After the writer returns the corrected JSON, **re-run Step 3 liveness gates** (image enrichment + ASIN probe + schema). A fix that re-introduces a dead ASIN or breaks schema is automatic failure — there is no Round 3.
3. **Re-invoke QC** on the corrected article:
   ```
   Use the compareelite-qc-reviewer skill to review the corrected articles/<slug>.json.
   ```
4. **Outcome:**
   - APPROVED in Round 2 → proceed to Step 6.
   - REJECTED again → article is abandoned for this run. Leave the file on disk, write the second-round failures into the run summary, and skip to the next article. **Do not loop a third time** — endless retries waste budget and rarely produce a clean article when two rounds fail.

---

## Step 6 — CTO Final Gate (delegate to CTO skill)

For each article that QC approved (Round 1 or Round 2), invoke the CTO skill as the **final pre-publish authority**:

```
Use the compareelite-cto skill to run the publish gate on articles/<slug>.json.
Return PUBLISH or REJECT with the reason.
```

The CTO skill is the ONLY role authorised to:
- inject `related_articles` (reads `data/articles-manifest.json`, picks 2–3 same-category siblings, writes them into the JSON)
- approve the article for commit

The CTO independently re-runs `fix-product-images.js`, `validate-amazon-links.js`, and `validate-article.js`, plus checks slug/filename match and `related_articles` integrity. The CTO is intentionally redundant with Step 3 + Step 4 — three layers of defence catch what any single layer missed. CMO and QC have no GitHub access (`allowed-tools` enforces this) and never populate `related_articles`; that is solely the CTO's job.

**Outcome:**
- **PUBLISH** → article goes into the commit batch.
- **REJECT** → article does NOT get committed, even if QC approved it. The CTO can override QC. Write the CTO's reason into the run summary.

---

## Step 7 — Commit only (workflow handles push after hard gates)

```bash
APPROVED_FILES=$(... list of articles/<slug>.json that passed every gate ...)
if [ -n "$APPROVED_FILES" ]; then
  git add $APPROVED_FILES
  git commit -m "Add daily articles: <slug1>, <slug2>, ..."
fi
```

**DO NOT push.** The workflow runs `validate-article.js` and `validate-amazon-links.js` against the new files after this skill exits. If either validator finds a problem, the workflow fails and the commit is never pushed to `main`. This is intentional: the gates outside the LLM prevent broken articles from reaching production even if the writer or QC missed something.

If zero articles passed, do NOT make an empty commit. Print the rejection summary and exit non-zero so the workflow surfaces the failure.

---

## Output Summary

Print a structured report at the end of the run:

```
Daily run YYYY-MM-DD
  Topics picked:                4
  Articles written:             N
  Failed liveness gates (S3):   M  (list slugs + reason: DEAD ASIN / image 404 / schema)
  QC Round 1 rejections:        R1 (list slugs + first 3 failed checks)
  QC Round 2 rejections:        R2 (list slugs — these are abandoned)
  CTO final-gate rejections:    C  (list slugs + reason — overrides QC)
  Approved & committed:         P  (the workflow then runs its own hard gates before pushing)
```

Articles never go to production unless they pass every gate. Better to ship 0 articles today than ship one with hallucinated ASINs.
