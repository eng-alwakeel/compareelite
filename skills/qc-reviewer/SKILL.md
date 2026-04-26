---
name: qc-reviewer
description: QC reviewer for compareelite.com articles. Runs the full 75-point checklist — field names, word counts, SEO rules, affiliate links (including DEAD-ASIN check against data/broken-amazon-links.json), image URLs, and GEO compliance. Returns APPROVED or REJECTED with a detailed issue list.
---

# qc-reviewer

Review an article JSON before it is published to compareelite.com.
Run every check below in order. Output a structured report. The article must pass ALL checks to be approved.

---

## How to Use

Paste the article JSON and run this skill. The skill will output:

```
STATUS: APPROVED ✅  /  REJECTED ❌
Checks passed: XX / 75

FAILED CHECKS:
- [CHECK NAME]: [what's wrong] → [how to fix it]

PASSED CHECKS:
- [CHECK NAME] ✅
```

If REJECTED, list every failed check with a specific fix. Do not approve an article with even one failed check.

---

## ⚠️ STEP 0 — Fetch Published Articles from GitHub (REQUIRED BEFORE REVIEW)

Before running any checks, fetch the current list of published articles from the GitHub repository:

**Repository:** `eng-alwakeel/compareelite`
**Path:** `articles/` folder (main branch)

Use the GitHub API or MCP tools to list all `.json` files in the `articles/` folder. Extract the slug from each filename (remove `.json` extension). Store this as the **Published Slugs List**.

Example published slugs:
- `best-wireless-earbuds-2026`
- `best-gaming-laptops-2026`
- `best-office-chairs-2026`
- *(and all others found in the folder)*

This list is used in Check 19 and Checks 68–71 to validate `related_articles`.

---

## Check Group 1 — Forbidden Fields (auto-fail)

Run these first. Any forbidden field = immediate REJECTED status regardless of other checks.

| # | Check | Condition |
|---|---|---|
| 1 | No `featured_image` field | Field must NOT exist |
| 2 | No `published_at` field | Field must NOT exist |
| 3 | No `affiliate_link` field | Field must NOT exist |
| 4 | No `tagline` field | Field must NOT exist |
| 5 | No `content` field | Field must NOT exist |

**Fix for any forbidden field:** Delete the field entirely. Use the correct field name from Group 2.

---

## Check Group 2 — Required Fields Present

| # | Check | Condition |
|---|---|---|
| 6 | `slug` exists | Must be present |
| 7 | `title` exists | Must be present |
| 8 | `category` exists | Must be present |
| 9 | `date` exists | Must be present |
| 10 | `excerpt` exists | Must be present |
| 11 | `thumbnail` exists | Must be present |
| 12 | `author` exists | Must be present |
| 13 | `stats` exists | Must be present |
| 14 | `intro` exists | Must be present |
| 15 | `products` exists and non-empty | Must have an even number of items: 4, 6, or 8 |
| 16 | `buying_guide` exists and non-empty | Must have 6 items |
| 17 | `faq` exists and non-empty | Must have 5 items |
| 18 | `verdict` exists | Must be present |
| 19 | `related_articles` — **OPTIONAL** | If present, validate via Checks 68–71. If absent, skip Group 9 entirely — article still passes. `related_articles` is added post-publish; it is NOT required for QC approval. |

---

## Check Group 3 — Field Format Validation

### `slug`
| # | Check | Rule |
|---|---|---|
| 20 | Slug format | Lowercase, hyphens only, no spaces, no uppercase. Ends with `-2026`. Example: `best-wireless-earbuds-2026` |

### `title` (H1)
| # | Check | Rule |
|---|---|---|
| 21 | Title length | Under 60 characters |
| 22 | Title contains main keyword | The primary product keyword must appear in the title (e.g. "wireless earbuds" in "Best Wireless Earbuds of 2026") |
| 23 | Title contains year | Must include "2026" |

### `category`
| # | Check | Rule |
|---|---|---|
| 24 | Valid category value | Must be exactly one of: `Tech`, `Home Office`, `Smart Home`, `Home Fitness` — any other value is an auto-fail |

### `date`
| # | Check | Rule |
|---|---|---|
| 25 | Date format | Must be `YYYY-MM-DD` (e.g. `2026-04-24`) — not `published_at`, not a different format |

### `excerpt`
| # | Check | Rule |
|---|---|---|
| 26 | Excerpt length | 150–160 characters exactly. Count them — not 140, not 161. |
| 27 | Excerpt starts with keyword | Must start with the main keyword, not "We" or "Our" |

### `thumbnail`
| # | Check | Rule |
|---|---|---|
| 28 | Thumbnail is Unsplash URL | Must start with `https://images.unsplash.com/photo-` — NEVER `m.media-amazon.com` or any Amazon URL |
| 29 | Thumbnail URL format | Must end with `?w=800&q=80` |

### `author`
| # | Check | Rule |
|---|---|---|
| 30 | Author value | Must be exactly `"CompareElite Team"` |

### `stats`
| # | Check | Rule |
|---|---|---|
| 31 | Stats format | Must be exactly `{ "readers": 0 }` — no extra fields like `clicks` |

---

## Check Group 4 — Products Validation

For each product in `products`:

| # | Check | Rule |
|---|---|---|
| 32 | Product count | Even number only: 4, 6, or 8 products |
| 33 | Each product has `name` | Full product name with model number — not empty |
| 34 | Each product has `price` | Format `"$XX"` or `"$X,XXX"` — not empty, not a number |
| 35 | Products sorted by rating | Highest rating first (e.g. 9.8, 9.4, 8.9, 8.5) |
| 36 | Rating is a string | Must be `"9.X/10"` format — NOT a number like `4.8`. Scale 8.0–9.9. |
| 37 | Unique `best_for` labels | No two products can have the same `best_for` value |
| 38 | `best_for` is descriptive | Must be meaningful: `Best Overall`, `Best Value`, `Best Budget`, `Best Premium`, `Most Portable`, `Best Wireless`, `Best for Beginners`, `Most Durable` — not generic like "Pick 1" |
| 39 | `link` contains affiliate tag | Every `link` must contain `?tag=compareelite-20` |
| 40 | `link` uses correct Amazon format | Must be `https://www.amazon.com/dp/[ASIN]?tag=compareelite-20` |
| 41 | ASIN format | The ASIN in each link must be 10 alphanumeric characters (e.g. `B09ZY3K6TW`) |
| 41a | ASIN not in DEAD list | The ASIN MUST NOT appear in `data/broken-amazon-links.json` with `state: "DEAD"`. If it does → REJECTED. Writer must replace it with a verified ASIN. |
| 41b | ASIN liveness probe (optional) | If running with network access, run `node scripts/validate-amazon-links.js --slug <slug>` and reject on any DEAD result. BLOCKED/ERROR is not a fail (datacenter IP false positives). |
| 42 | `image` is present and correct | Every product MUST have an `image` field — missing = auto-fail. Must be `https://m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg`. Reject `images-na.ssl-images-amazon.com`, Amazon product page URLs, or any other format |
| 43 | `pros` are full sentences | Each pro must be a complete sentence (starts with capital, ends with period, contains a measurable spec or number). Reject fragments like "Long battery life" |
| 44 | `pros` count | Exactly 3 pros per product |
| 45 | `cons` are full sentences | Each con must be a complete sentence with a specific limitation. Reject vague entries like "Expensive" |
| 46 | `cons` count | 1–2 cons per product |
| 47 | Pros contain numbers/specs | At least 1 pro per product must contain a measurable number (hours, grams, Hz, dB, $, %, watts, etc.) |
| 48 | Button label is "Buy on Amazon" | The `link` button must render as **"Buy on Amazon"** — reject any article that uses "Check Price", "View Deal", "See Price", or any other label |

---

## Check Group 5 — Intro Validation

| # | Check | Rule |
|---|---|---|
| 48 | Intro has 3 paragraphs | The `intro` string must contain `\n\n` separating 3 distinct paragraphs |
| 49 | Intro word count | 200–250 words total across all 3 paragraphs |
| 50 | Main keyword in first 100 words | The primary product keyword must appear in the first paragraph (first ~100 words) |

---

## Check Group 6 — Buying Guide Validation

| # | Check | Rule |
|---|---|---|
| 51 | Buying guide has 6 items | Exactly 6 objects in `buying_guide` array |
| 52 | Each item has `title` and `body` | Both fields required per item |
| 53 | Titles contain secondary keywords | Titles must be specific (e.g. "Active Noise Cancellation Quality") not generic (e.g. "Factor 1") |
| 54 | Body word count per item | Each `body` must be 70–105 words. Count them. |
| 55 | Body contains specifics | Each body must include at least one number, spec, or product name reference |

---

## Check Group 7 — FAQ Validation

| # | Check | Rule |
|---|---|---|
| 56 | FAQ has exactly 5 items | Not 3, not 4 — must be 5 (minimum for FAQPage rich snippet) |
| 57 | Each item uses `q` and `a` keys | NOT `question`/`answer` — must be `q` and `a` |
| 58 | Questions are real search queries | Each question should read like something a person would type into Google or ask ChatGPT |
| 59 | Answer word count | Each answer must be 80–105 words |
| 60 | Answers name a product | Every answer must mention at least one product by its full name |
| 61 | Answers contain a number | Every answer must contain at least one concrete number (price, hours, rating, year, weight, etc.) |
| 62 | FAQ coverage | The 5 questions must cover: (1) overall best pick, (2) buying criteria, (3) budget vs premium, (4) durability/lifespan, (5) alternative use case |

---

## Check Group 8 — Verdict Validation

| # | Check | Rule |
|---|---|---|
| 63 | Verdict exists | Must be a non-empty string |
| 64 | Verdict word count | 100–130 words |
| 65 | Verdict names the top pick | Must mention the Best Overall product by name |
| 66 | Verdict includes price | Must include the price of the top pick |
| 67 | Verdict mentions runner-up | Must mention a second product for a different use case |

---

## Check Group 9 — Related Articles Validation (ONLY if `related_articles` is present)

> **Skip this entire group if `related_articles` field is absent.** The article still passes without it.
> `related_articles` is added post-publish using the actual list of published articles fetched from GitHub.

If `related_articles` IS present, run all checks below:

| # | Check | Rule |
|---|---|---|
| 68 | 2–3 related articles | Array must have 2–3 items |
| 69 | Each item has `slug` and `title` | Both fields required per item |
| 70 | Slugs exist in GitHub repo | **Each slug must exist in the Published Slugs List fetched in Step 0.** If a slug is NOT in the GitHub `articles/` folder, it FAILS. This prevents broken internal links. |
| 71 | Related articles are relevant | Slugs should be same or adjacent category — not random unrelated topics |

---

## Check Group 10 — SEO & GEO Validation

| # | Check | Rule |
|---|---|---|
| 72 | No vague language in pros | Reject: "long battery", "great sound", "easy to use", "affordable", "high quality". Require: "70-hour battery", "class-leading ANC", "3-minute setup", "under $100", "aircraft-grade aluminum" |
| 73 | Word count across all text fields | Count words in: `intro` + all `pros` + all `cons` + all `buying_guide.body` + all `faq.a` + `verdict`. Must be ≥ 2000 words. Target ≥ 2500 words. |
| 74 | No duplicate product names | All product names in `products` must be unique |
| 75 | JSON is valid | No syntax errors, no trailing commas, all strings properly quoted |

---

## Check Group 11 — UI & Site Rules

| # | Check | Rule |
|---|---|---|
| 76 | Category is one of 4 approved niches | `category` must be exactly one of: `Tech`, `Home Office`, `Smart Home`, `Home Fitness` — this duplicates Check 24 as a final gate |
| 77 | No duplicate CTA buttons | The article must not produce duplicate "Buy on Amazon" buttons for the same product. One button per product only. |
| 78 | Email signup appears once only | If an email signup / newsletter section exists in the article, it must appear exactly once — not repeated per product or per section |
| 79 | Buy on Amazon button label | Every Amazon affiliate link must use the label **"Buy on Amazon"** — never "Check Price", "View Deal", "See Price", "Shop Now", or any other label |

---

## Scoring & Decision

- **Total checks: 79**
- **Auto-fail checks (Group 1):** Any forbidden field = REJECTED immediately
- **Group 9 checks (68–71):** Only count toward total if `related_articles` is present
- **Pass threshold:** Must pass ALL applicable checks to be APPROVED
- **Partial pass:** Not possible — if any applicable check fails, status is REJECTED

---

## Output Format

```
═══════════════════════════════════════════
  COMPAREELITE QC REVIEW
  Article: [slug]
  Date reviewed: [today's date]
═══════════════════════════════════════════

STATUS: APPROVED ✅  /  REJECTED ❌
Checks passed: XX / 75

───────────────────────────────────────────
FAILED CHECKS (must fix before publishing):
───────────────────────────────────────────

❌ [Check #] [Check Name]
   Found: [what the article has]
   Required: [what it should be]
   Fix: [specific instruction to fix it]

───────────────────────────────────────────
PASSED CHECKS:
───────────────────────────────────────────

✅ Check 1 — No forbidden fields
✅ Check 6 — slug present
[...list all passed checks]

───────────────────────────────────────────
WORD COUNT BREAKDOWN:
───────────────────────────────────────────
intro:          XXX words
products pros:  XXX words
products cons:  XXX words
buying_guide:   XXX words  (per-item counts)
faq answers:    XXX words  (per-item counts)
verdict:        XXX words
TOTAL:          XXXX words  [≥2000 ✅ / <2000 ❌]

═══════════════════════════════════════════
```

---

## Common Issues & Fixes Reference

| Issue | Fix |
|---|---|
| ASIN flagged as DEAD by validator | Open `data/broken-amazon-links.md`, find the row, swap that product's ASIN with a verified live one from amazon.com (or remove the product). Then re-run `npm run validate-articles articles/<slug>.json`. |
| `featured_image` present | Rename to `thumbnail` — must be Unsplash URL |
| `published_at` present | Rename to `date` — format `YYYY-MM-DD` |
| `tagline` present | Rename to `best_for` |
| `affiliate_link` present | Rename to `link` |
| `content` field present | Delete entirely — website builds content from other fields |
| `rating: 4.8` (number) | Change to `"9.6/10"` (string) |
| `image` field missing from product | Article must be rewritten — replace the product with one whose image ID is known. Do not add a placeholder |
| `image` uses `images-na.ssl-images-amazon.com` | Wrong CDN — always breaks. Replace with `m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg` or swap the product |
| Thumbnail is Amazon URL | Replace with Unsplash URL: `https://images.unsplash.com/photo-XXXXX?w=800&q=80` |
| `stats` has extra fields | Change to exactly `{ "readers": 0 }` — remove `clicks` or any other keys |
| Pros are fragments | Rewrite as full sentences with measurable specs |
| FAQ uses `question`/`answer` keys | Rename to `q`/`a` |
| FAQ has only 3 items | Add 2 more questions (lifespan + alternative use case) |
| Excerpt is 120 chars | Expand to 150–160 chars |
| `buying_guide` missing | Add 6-item array with `title` + `body` per item |
| `intro` is a single paragraph | Split into 3 paragraphs with `\n\n` |
| `verdict` missing | Add 100–130 word conclusion naming top pick + runner-up |
| `related_articles` has invalid slug | Fetch actual slug list from GitHub `articles/` folder — only use slugs that exist there |
| Word count under 2000 | Expand buying_guide bodies and FAQ answers to full target length |
