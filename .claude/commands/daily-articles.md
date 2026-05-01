# Daily Articles — CompareElite v3

Run the full daily pipeline. The orchestrator (this slash command) does no writing or pushing of its own. It delegates to the four v3 skills in a strict sequence with one bounded retry loop. The workflow's HARD GATEs run *after* this skill exits and gate the actual `git push`.

```
Director picks 4 NEW topics → Editor writes → Reviewer (R1) → Editor fix → Reviewer (R2) → Publisher → commit → workflow gates → push
```

No agent pushes directly. Reviewer is network-isolated. Editor cannot touch GitHub. Publisher is the only role permitted to write `related_articles` and to commit to `main`.

---

## Step 1 — Director picks 4 NEW topics

Invoke `compareelite-director` with the daily routine:

```
Use the compareelite-director skill to run its 8 AM KSA daily routine.
Output: 4 issues, one per slug, with the canonical evidence block.
```

Director:
1. Reads `data/articles-index.md`.
2. Picks 4 slugs that are NOT in the index (2 Tech, 1 Home Office or Smart Home, 1 Home Fitness or Smart Home).
3. Opens 4 issues with the standard evidence-block body.

The slash command consumes those 4 slugs and runs Steps 2–5 once per slug, in parallel where independent.

---

## Step 2 — Editor writes one article per topic

For each of the 4 slugs:

```
Use the compareelite-editor skill to write the article for
slug=<slug>, category=<category>. Save to articles/<slug>.json.
```

The Editor skill's RULE 6 mandates self-verification before reporting "done": three command outputs (`ls -la`, `validate-article.js`, `validate-amazon-links.js`) must be in the report. The orchestrator REJECTS any "done" message lacking this evidence and re-prompts the Editor with `RESUBMIT — paste the evidence block`.

The Editor leaves `related_articles` empty (Publisher's job) and never invents ASINs (Rule 2: WebFetch + abandon-on-CAPTCHA).

If the Editor reports `CAPTCHA_BLOCK: <slug>` or `INSUFFICIENT_PRODUCTS: <slug>`: drop the slug from this run, post a comment on the Director issue, do not fall through to Reviewer with a half-written file.

---

## Step 3 — Reviewer (Round 1)

For each successfully written article:

```
Use the compareelite-reviewer skill to review articles/<slug>.json.
The Director issue contains the Editor's evidence block.
```

The Reviewer:
- Verifies the Editor's evidence is present and matches a re-run.
- Runs the 80-point checklist.
- Returns `APPROVED ✅ <score>/80` or `REJECTED ❌ <score>/80` with each failed check.

Routing:
- **APPROVED** → Step 5 (Publisher).
- **REJECTED** → Step 4 (Editor fix loop).

---

## Step 4 — Editor fix + Reviewer Round 2 (max 1 retry)

For each REJECTED article:

```
Use the compareelite-editor skill to fix articles/<slug>.json.
The Reviewer rejected for these specific reasons:
<paste the Reviewer's failed-check list verbatim>
Fix ONLY those issues. Do not rewrite the rest of the article.
After fixing, re-run the three self-verification commands and paste
their output as before.
```

After the Editor's fix, re-invoke the Reviewer:

```
Use the compareelite-reviewer skill to review the corrected
articles/<slug>.json.
```

Outcomes:
- **APPROVED in Round 2** → Step 5.
- **REJECTED again** → article is abandoned for this run. Leave the file on disk, comment the Reviewer's R2 failures on the Director issue, skip to the next slug. **Do not loop a third time.**

---

## Step 5 — Publisher (final gate + commit)

For each Reviewer-approved article:

```
Use the compareelite-publisher skill to publish articles/<slug>.json.
The Reviewer commented APPROVED ✅ on the Director issue.
```

The Publisher:
1. Verifies Reviewer approval is real (must be present on the Director issue).
2. Runs all three Hard Gates (`fix-product-images`, `validate-amazon-links`, `validate-article --images`). Any failure → REJECT and stop, regardless of Reviewer.
3. Reads `data/articles-manifest.json`, picks 2–3 same-category siblings by keyword overlap, writes `related_articles` into the JSON.
4. Re-runs `validate-article.js` to confirm post-injection schema is still PASS.
5. Generates the per-article static HTML (`scripts/generate-article-pages.js <slug>`).
6. Commits as `CompareElite Bot <bot@compareelite.com>` with message `Publish: <slug>`.
7. Pushes to `main`.
8. Notifies IndexNow (`scripts/notify-indexnow.js <slug>`).
9. Posts the `PUBLISHED ✅` report block on the Director issue and closes it with the `published` label.

---

## Step 6 — Workflow HARD GATEs (outside this slash command)

After the Publisher's push lands on `main`, `.github/workflows/daily-articles.yml` runs:

- **HARD GATE 1**: `node scripts/validate-article.js --images <new files>` — exits 1 if any new article has a broken image or fails schema. Blocks subsequent push if mid-batch.
- **HARD GATE 2**: `node scripts/validate-amazon-links.js --slug <slug>` per new file. DEAD count > 0 → fail.
- **Push step**: only runs `if: success()`. If either gate fails, the commit stays on the runner and main is not advanced.

This is the layer Claude itself cannot bypass. Even an LLM that ignores Steps 1–5 entirely cannot land a broken article through this gate.

---

## Success criteria

A run is successful when every produced article has:
- ✅ A commit on `origin/main` authored by `CompareElite Bot`
- ✅ `validate-article.js` PASS (post-injection)
- ✅ `validate-amazon-links.js` reports DEAD 0
- ✅ `validate-article.js --images` reports 0 broken images
- ✅ `related_articles` populated with 2–3 verified slugs from the manifest
- ✅ IndexNow returned HTTP 200 or 202
- ✅ The Director issue closed with the `published` label and the report block

A run is allowed to publish fewer than 4 articles (e.g., 3 if one CAPTCHA-blocked, 2 if two failed Reviewer R2). Better to ship 3 honest articles than 4 fraudulent ones.

---

## Output summary at end of run

```
Daily run YYYY-MM-DD
  Topics picked:                4
  Editors completed write:      <N>
  CAPTCHA-blocked:              <C>  (slugs: …)
  Reviewer R1 approvals:        <A1>
  Reviewer R1 rejections:       <R1>
  Reviewer R2 approvals:        <A2>
  Reviewer R2 abandoned:        <X>  (slugs: …)
  Publisher gate failures:      <P>  (slugs: …, gate: …)
  Published to main:            <Final>
```

If `Final == 0`, do NOT make any commit. Print the rejection summary and exit non-zero so the workflow surfaces the failure.
