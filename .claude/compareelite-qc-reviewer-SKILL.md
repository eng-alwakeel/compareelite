---
name: compareelite-qc-reviewer
description: Quality control reviewer for compareelite.com articles. Validates article JSON before publishing — checks field names, word counts, SEO rules, affiliate links, image URLs, and GEO compliance. Returns APPROVED or REJECTED with a detailed issue list.
---

# compareelite-qc-reviewer

Review an article JSON before it is published to compareelite.com.
Run every check below in order. Output a structured report. The article must pass ALL checks to be approved.

---

## How to Use

Paste the article JSON and run this skill. The skill will output:

```
STATUS: APPROVED ✅  /  REJECTED ❌
Score: X / 30 checks passed

FAILED CHECKS:
- [CHECK NAME]: [what's wrong] → [how to fix it]

PASSED CHECKS:
- [CHECK NAME] ✅
```

If REJECTED, list every failed check with a specific fix. Do not approve an article with even one failed check.

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
| 15 | `products` exists and non-empty | Must have 4–5 items |
| 16 | `buying_guide` exists and non-empty | Must have 6 items |
| 17 | `faq` exists and non-empty | Must have 5 items |
| 18 | `verdict` exists | Must be present |
| 19 | `related_articles` exists | Must have 2–3 items |

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
| 24 | Valid category value | Must be exactly one of: `Technology`, `Kitchen`, `Fitness`, `Outdoor`, `Health`, `Automotive`, `Home`, `Travel`, `Fashion` |

### `date`
| # | Check | Rule |
|---|---|---|
| 25 | Date format | Must be `YYYY-MM-DD` (e.g. `2026-04-24`) — not `published_at`, not a different format |

### `excerpt`
| # | Check | Rule |
|---|---|---|
| 26 | Excerpt length | 150–160 characters exactly. Count the characters. |
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
| 31 | Stats format | Must be `{ "readers": 0 }` |

---

## Check Group 4 — Products Validation

For each product in `products`:

| # | Check | Rule |
|---|---|---|
| 32 | Product count | Exactly 4–5 products |
| 33 | Products sorted by rating | Highest rating first (e.g. 9.8, 9.4, 8.9, 8.5) |
| 34 | Rating is a string | Must be `"9.X/10"` format — NOT a number like `4.8`. Scale 8.0–9.9. |
| 35 | Unique `best_for` labels | No two products can have the same `best_for` value |
| 36 | `best_for` is descriptive | Must be meaningful: `Best Overall`, `Best Value`, `Best Budget`, `Best Premium`, `Most Portable`, `Best Wireless`, `Best for Beginners`, `Most Durable` — not generic like "Pick 1" |
| 37 | `link` contains affiliate tag | Every `link` must contain `?tag=compareelite-20` |
| 38 | `link` uses correct Amazon format | Must be `https://www.amazon.com/dp/[ASIN]?tag=compareelite-20` |
| 39 | ASIN format | The ASIN in each link must be 10 alphanumeric characters (e.g. `B09ZY3K6TW`) |
| 40 | `image` URL format (if present) | If `image` field exists, must be `https://m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg` |
| 41 | `pros` are full sentences | Each pro must be a complete sentence (starts with capital, ends with period, contains a measurable spec or number). Reject fragments like "Long battery life" |
| 42 | `pros` count | Exactly 3 pros per product |
| 43 | `cons` are full sentences | Each con must be a complete sentence with a specific limitation. Reject vague entries like "Expensive" |
| 44 | `cons` count | 1–2 cons per product |
| 45 | Pros contain numbers/specs | At least 1 pro per product must contain a measurable number (hours, grams, Hz, dB, $, %, watts, etc.) |

---

## Check Group 5 — Intro Validation

| # | Check | Rule |
|---|---|---|
| 46 | Intro has 3 paragraphs | The `intro` string must contain `\n\n` separating 3 distinct paragraphs |
| 47 | Intro word count | 200–250 words total |
| 48 | Main keyword in first 100 words | The primary product keyword must appear in the first paragraph (first ~100 words) |

---

## Check Group 6 — Buying Guide Validation

| # | Check | Rule |
|---|---|---|
| 49 | Buying guide has 6 items | Exactly 6 objects in `buying_guide` array |
| 50 | Each item has `title` and `body` | Both fields required per item |
| 51 | Titles contain secondary keywords | Titles must be specific (e.g. "Active Noise Cancellation Quality") not generic (e.g. "Factor 1") |
| 52 | Body word count per item | Each `body` must be 70–100 words. Count them. |
| 53 | Body contains specifics | Each body must include at least one number, spec, or product name reference |

---

## Check Group 7 — FAQ Validation

| # | Check | Rule |
|---|---|---|
| 54 | FAQ has exactly 5 items | Not 3, not 4 — must be 5 (minimum for FAQPage rich snippet) |
| 55 | Each item uses `q` and `a` keys | NOT `question`/`answer` — must be `q` and `a` |
| 56 | Questions are real search queries | Each question should read like something a person would type into Google or ask ChatGPT |
| 57 | Answer word count | Each answer must be 80–100 words |
| 58 | Answers name a product | Every answer must mention at least one product by its full name |
| 59 | Answers contain a number | Every answer must contain at least one concrete number (price, hours, rating, year, weight, etc.) |
| 60 | FAQ coverage | The 5 questions must cover: (1) overall best pick, (2) buying criteria, (3) budget vs premium, (4) durability/lifespan, (5) alternative use case |

---

## Check Group 8 — Verdict Validation

| # | Check | Rule |
|---|---|---|
| 61 | Verdict exists | Must be a non-empty string |
| 62 | Verdict word count | 100–130 words |
| 63 | Verdict names the top pick | Must mention the Best Overall product by name |
| 64 | Verdict includes price | Must include the price of the top pick |
| 65 | Verdict mentions runner-up | Must mention a second product for a different use case |

---

## Check Group 9 — Related Articles Validation

| # | Check | Rule |
|---|---|---|
| 66 | 2–3 related articles | Array must have 2–3 items |
| 67 | Each item has `slug` and `title` | Both fields required |
| 68 | Slugs are valid format | Lowercase, hyphens, ends with `-2026` |
| 69 | Related articles are relevant | Slugs should be same or adjacent category — not random unrelated topics |

---

## Check Group 10 — SEO & GEO Validation

| # | Check | Rule |
|---|---|---|
| 70 | No vague language in pros | Reject: "long battery", "great sound", "easy to use", "affordable", "high quality". Require: "70-hour battery", "class-leading ANC", "3-minute setup", "under $100", "aircraft-grade aluminum" |
| 71 | Word count across all text fields | Count words in: `intro` + all `pros` + all `cons` + all `buying_guide.body` + all `faq.a` + `verdict`. Must be ≥ 2000 words. Target ≥ 2500 words. |
| 72 | No duplicate product names | All product names in `products` must be unique |
| 73 | JSON is valid | No syntax errors, no trailing commas, all strings properly quoted |

---

## Scoring & Decision

- **Total checks: 73**
- **Auto-fail checks (Group 1):** Any forbidden field = REJECTED immediately
- **Pass threshold:** Must pass ALL checks to be APPROVED
- **Partial pass:** Not possible — if any check fails, status is REJECTED

---

## Output Format

```
═══════════════════════════════════════════
  COMPAREELITE QC REVIEW
  Article: [slug]
  Date reviewed: [today's date]
═══════════════════════════════════════════

STATUS: APPROVED ✅  /  REJECTED ❌
Checks passed: XX / 73

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
buying_guide:   XXX words
faq answers:    XXX words
verdict:        XXX words
TOTAL:          XXXX words  [≥2000 ✅ / <2000 ❌]

═══════════════════════════════════════════
```

---

## Common Issues & Fixes Reference

| Issue | Fix |
|---|---|
| `featured_image` present | Rename to `thumbnail` — must be Unsplash URL |
| `published_at` present | Rename to `date` — format `YYYY-MM-DD` |
| `tagline` present | Rename to `best_for` |
| `affiliate_link` present | Rename to `link` |
| `content` field present | Delete entirely — website builds content from other fields |
| `rating: 4.8` (number) | Change to `"9.6/10"` (string) |
| Thumbnail is Amazon URL | Replace with Unsplash URL: `https://images.unsplash.com/photo-XXXXX?w=800&q=80` |
| Pros are fragments | Rewrite as full sentences with measurable specs |
| FAQ uses `question`/`answer` keys | Rename to `q`/`a` |
| FAQ has only 3 items | Add 2 more questions (lifespan + alternative use case) |
| Excerpt is 120 chars | Expand to 150–160 chars |
| `buying_guide` missing | Add 6-item array with `title` + `body` per item |
| `intro` is a single paragraph | Split into 3 paragraphs with `\n\n` |
| `verdict` missing | Add 100–130 word conclusion naming top pick + runner-up |
| `related_articles` missing | Add 2–3 relevant article slugs with titles |
| Word count under 2000 | Expand buying_guide bodies and FAQ answers to full target length |
