---
name: compareelite-article-writer
description: Write high-converting Amazon affiliate articles for compareelite.com. Produces SEO-optimized and GEO-optimized comparison guides with proper affiliate links, structured data, complete images, and valid JSON that the website renders correctly.
---

# compareelite-article-writer

Write high-converting Amazon affiliate articles for compareelite.com.
Every article MUST output valid JSON using the EXACT schema below — no exceptions.

---

## ⚠️ FORBIDDEN FIELDS — NEVER USE THESE

| ❌ WRONG (breaks website) | ✅ CORRECT |
|---|---|
| `featured_image` | `thumbnail` |
| `published_at` | `date` |
| `affiliate_link` | `link` |
| `tagline` | `best_for` |
| `rating: 4.8` (number) | `rating: "9.8/10"` (string with /10) |
| `content: "# Markdown..."` | **REMOVE — causes raw text or [object Object]** |
| Amazon URL for `thumbnail` | Unsplash URL only (see Image Rules) |

**If you use any of the ❌ WRONG fields above, the article will break on the website.**

---

## Affiliate Details

- Program: Amazon Associates
- Tag: `compareelite-20`
- Link format: `https://www.amazon.com/dp/[ASIN]?tag=compareelite-20`
- Disclosure: "As an Amazon Associate, CompareElite earns from qualifying purchases."

---

## Required JSON Schema (EXACT — no additions, no changes)

```json
{
  "slug": "best-[product]-2026",
  "title": "Best [Product] of 2026: Top X Picks Tested & Ranked",
  "category": "Technology|Kitchen|Fitness|Outdoor|Health|Automotive|Home|Travel|Fashion",
  "date": "YYYY-MM-DD",
  "excerpt": "140–160 char SEO description. Starts with primary keyword. Clear value proposition. No 'We' or 'Our' at start.",
  "thumbnail": "https://images.unsplash.com/photo-XXXXXXXXXXXXXXXXXX?w=800&q=80",
  "author": "CompareElite Team",
  "stats": { "readers": 0 },
  "products": [
    {
      "name": "Full Product Name with Model Number",
      "rating": "9.8/10",
      "price": "$XX",
      "best_for": "Best Overall",
      "link": "https://www.amazon.com/dp/ASIN?tag=compareelite-20",
      "image": "https://m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg",
      "pros": [
        "Specific measurable benefit (e.g. '20-hour battery life')",
        "Key technical advantage with numbers",
        "Concrete use-case benefit"
      ],
      "cons": [
        "Honest specific limitation"
      ]
    }
  ],
  "faq": [
    {
      "q": "What is the best [product] in 2026?",
      "a": "2–3 sentence answer naming the top pick with key reason why."
    },
    {
      "q": "What should I look for when buying a [product]?",
      "a": "2–3 sentence answer covering 2–3 key buying criteria with specifics."
    },
    {
      "q": "Is a cheaper [product] worth it or should I spend more?",
      "a": "Balanced 2–3 sentence answer based on use case."
    },
    {
      "q": "How long does a [product] typically last?",
      "a": "Concrete answer with years/data if known."
    },
    {
      "q": "Can I use [product] for [alternative use case]?",
      "a": "Direct helpful answer with product recommendation."
    }
  ]
}
```

---

## Products Rules

- Exactly **4–5 products**, sorted highest rating first
- `best_for` badges must be **unique** per article: `Best Overall`, `Best Value`, `Best Budget`, `Best Premium`, `Best for Beginners`, `Most Portable`, `Most Durable`, `Best Wireless`, etc.
- `rating`: always a **string** in format `"9.X/10"` — scale 8.0–9.9
  - Best Overall: 9.6–9.9
  - Runner-up: 9.0–9.5
  - Mid-range: 8.5–8.9
  - Budget pick: 8.0–8.4
- `pros`: 3 items, each 4–8 words, **specific and measurable** (e.g. "300-hour wireless battery life" NOT "long battery")
- `cons`: 1–2 items, honest and specific (e.g. "No companion app", "Loud fan above 50% speed")
- `link`: Always `https://www.amazon.com/dp/ASIN?tag=compareelite-20` — no other format
- `image`: Amazon CDN URL for product card: `https://m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg`
  - Find real image ID from your training data for each ASIN
  - If unsure, omit the `image` field — the site handles it gracefully

---

## Image Rules

### `thumbnail` (article card — Unsplash ONLY)
- **MUST be an Unsplash URL**: `https://images.unsplash.com/photo-XXXXXXXXXXXXXXXXXX?w=800&q=80`
- **NEVER use Amazon, m.media-amazon.com, or any product image** — these are hotlink-blocked and break the card
- Choose a photo that visually represents the product category (not a specific product)
- Example good choices: a clean desk setup for keyboards, gym for fitness, kitchen scene for appliances

### `image` (product card — Amazon CDN)
- Use `https://m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg`
- This shows on the product comparison card inside the article
- Look up the real image ID for the ASIN — do not guess or fabricate

---

## SEO Rules

### `title`
- Under 60 characters
- Format: `Best [Product] of 2026` or `Best [Product] for [Use Case] 2026`
- Must include the year
- No clickbait — clear and descriptive

### `excerpt` (meta description)
- **140–160 characters exactly** — count them
- Start with the primary keyword (e.g. "Best air fryers of 2026...")
- Include a clear benefit or differentiator
- End with a call-to-action hint
- Do NOT start with "We" or "Our"
- Example: "Best mechanical keyboards of 2026 — tested for feel, sound, and value. Top picks for gaming, typing, and every budget. Expert guide inside."

### `category`
- Must be one of: `Technology`, `Kitchen`, `Fitness`, `Outdoor`, `Health`, `Automotive`, `Home`, `Travel`, `Fashion`

---

## GEO Rules (Generative Engine Optimization — for AI search engines)

AI search engines (ChatGPT, Gemini, Perplexity) cite articles that provide structured, factual answers. To qualify:

### FAQ Requirements
- Minimum **5 FAQ items** — this triggers FAQPage rich snippet eligibility AND improves AI citation probability
- Write questions exactly as people type them into Google/ChatGPT
- Every answer must name a **specific product by full name**
- Every answer must include **at least one concrete number** (price, battery hours, weight, rating, year)
- Cover: (1) overall best, (2) buying criteria, (3) budget decision, (4) durability/lifespan, (5) use-case variant

### Product Data Requirements (AI citation triggers)
Each product must have:
- Full model name with year/version if applicable
- Exact price (e.g. `"$149.99"` not `"~$150"`)
- Rating as `"9.X/10"` string
- 3 pros with measurable specs — numbers, hours, weights, watts, etc.
- 1–2 honest cons — builds reader trust and AI citation credibility

### Specificity Rules
- Never say "long battery life" — say "70-hour wireless battery"
- Never say "good for gaming" — say "optimized for low-latency FPS gaming"
- Never say "affordable" — say "under $100" or give the price
- Never say "high quality" — name the material, spec, or certification

---

## Amazon Compliance

- Every link MUST include `?tag=compareelite-20`
- Add disclosure at bottom: *"As an Amazon Associate, CompareElite earns from qualifying purchases."*
- Use real, verified ASINs — do not fabricate product codes
- Prices are approximate and subject to change

---

## ASIN Verification

- Use ASINs from your training data for well-known, highly-reviewed products
- Cross-check: ASIN must match product name
- Format: 10-character alphanumeric (e.g. `B09ZY3K6TW`)
- If you cannot verify an ASIN confidently, pick a different well-known product

---

## Article Structure (7 Sections)

The article body is auto-generated by the website from the JSON fields — do NOT write a `content` field.
The 7 sections rendered automatically are:

1. **Header** — title, date, author, thumbnail, excerpt
2. **Introduction** — built from `excerpt` + product names
3. **Comparison Table** — built from all products (name, rating, price, best_for, link)
4. **Product Reviews** — one card per product: image, pros, cons, rating, link button
5. **Buying Guide** — auto-generated from product specs and pros/cons
6. **FAQ** — rendered from `faq` array as structured FAQPage schema
7. **Final Verdict** — built from top-rated product

**You only need to write the JSON — the website renders all 7 sections.**
**NEVER write a `content` field. NEVER write Markdown. JSON only.**

---

## Quality Checklist — Validate Before Output

Before outputting the JSON, verify each item:

- [ ] `slug` uses hyphens, no spaces, ends with `-2026`
- [ ] `title` under 60 characters, includes year
- [ ] `date` in `YYYY-MM-DD` format (today's date)
- [ ] `excerpt` is 140–160 characters exactly
- [ ] `thumbnail` is an Unsplash URL (`images.unsplash.com`)
- [ ] `author` is `"CompareElite Team"`
- [ ] `stats` is `{ "readers": 0 }`
- [ ] Products: 4–5 items, sorted by rating (highest first)
- [ ] All `best_for` labels are unique
- [ ] All `rating` values are strings like `"9.X/10"`
- [ ] All `link` values include `?tag=compareelite-20`
- [ ] All `pros` items are specific (contain numbers or measurements)
- [ ] `faq` has minimum 5 items with `q` and `a` keys
- [ ] Each FAQ answer names a product and includes a number
- [ ] No `featured_image`, `published_at`, `affiliate_link`, `tagline`, or `content` fields present
- [ ] JSON is valid (no trailing commas, all strings quoted)

---

## Example Output

```json
{
  "slug": "best-wireless-earbuds-2026",
  "title": "Best Wireless Earbuds of 2026",
  "category": "Technology",
  "date": "2026-04-24",
  "excerpt": "Best wireless earbuds of 2026 — tested for sound quality, ANC, and battery life. Top picks from Sony, Apple, and Jabra for every budget.",
  "thumbnail": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
  "author": "CompareElite Team",
  "stats": { "readers": 0 },
  "products": [
    {
      "name": "Sony WF-1000XM5",
      "rating": "9.8/10",
      "price": "$279",
      "best_for": "Best Overall",
      "link": "https://www.amazon.com/dp/B0C33XXS56?tag=compareelite-20",
      "image": "https://m.media-amazon.com/images/I/61pN1SjxstL._SL500_.jpg",
      "pros": [
        "Industry-leading noise cancellation",
        "36-hour total battery with case",
        "LDAC Hi-Res audio support"
      ],
      "cons": [
        "Premium price point",
        "Ear tips require adjustment for best fit"
      ]
    }
  ],
  "faq": [
    {
      "q": "What are the best wireless earbuds in 2026?",
      "a": "The Sony WF-1000XM5 are the best wireless earbuds in 2026, offering class-leading ANC, 36-hour battery, and Hi-Res audio at $279."
    },
    {
      "q": "What should I look for when buying wireless earbuds?",
      "a": "Prioritize ANC quality, battery life (aim for 8+ hours per charge), and fit stability. Codec support (AAC, aptX, LDAC) matters for Android users who want high-quality audio."
    },
    {
      "q": "Are cheap wireless earbuds worth it in 2026?",
      "a": "Yes — budget options like the Jabra Elite 4 (~$80) offer solid ANC and 5.5-hour battery. Spend more only if you need all-day battery or premium sound."
    },
    {
      "q": "How long do wireless earbuds typically last?",
      "a": "Most premium earbuds last 2–3 years with daily use before battery degradation becomes noticeable. Sony and Apple models tend to hold up well over time."
    },
    {
      "q": "Can I use wireless earbuds for working out?",
      "a": "Yes — look for IPX4 or higher water resistance. The Jabra Elite Active series and Beats Fit Pro are designed specifically for sports use with secure ear hooks."
    }
  ]
}
```
