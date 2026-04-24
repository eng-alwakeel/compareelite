---
name: compareelite-article-writer
description: Write high-converting Amazon affiliate articles for compareelite.com. Produces SEO-optimized and GEO-optimized comparison guides with proper affiliate links, structured data, complete images, and valid JSON that the website renders correctly. Minimum 2000 words per article.
---

# compareelite-article-writer

Write high-converting Amazon affiliate articles for compareelite.com.
Every article MUST output valid JSON using the EXACT schema below — no exceptions.
**Minimum word count: 2000 words. Target: 2500+ words** across all text fields combined.

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
  "intro": "Paragraph 1 (60–80 words): Hook the reader with a relatable problem or scenario. Mention the product category and why choosing the right one matters in 2026.\n\nParagraph 2 (60–80 words): Briefly describe your testing methodology — how many products you evaluated, what criteria you used, and what types of buyers this guide covers.\n\nParagraph 3 (50–70 words): Preview what readers will find — comparison table, detailed reviews, buying guide, and FAQ. Mention that all picks are available on Amazon with verified ASINs.",
  "products": [
    {
      "name": "Full Product Name with Model Number",
      "rating": "9.8/10",
      "price": "$XX",
      "best_for": "Best Overall",
      "link": "https://www.amazon.com/dp/ASIN?tag=compareelite-20",
      "image": "https://m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg",
      "pros": [
        "Full sentence describing a specific, measurable benefit (e.g. 'Delivers 300 hours of wireless battery on a single charge, the longest in its class').",
        "Full sentence describing a key technical advantage with a number or spec.",
        "Full sentence describing a concrete use-case benefit or standout feature."
      ],
      "cons": [
        "Full sentence describing an honest, specific limitation.",
        "Optional second con if applicable."
      ]
    }
  ],
  "buying_guide": [
    {
      "title": "Factor Name (e.g. 'Battery Life')",
      "body": "2–3 sentence explanation (70–100 words) covering why this factor matters, what numbers or specs to look for, and how the products in this guide perform against this criterion. Include specific figures (e.g. 'aim for at least 20 hours per charge'). Mention product names where relevant."
    },
    {
      "title": "Second Factor",
      "body": "70–100 word explanation with specific advice and numbers."
    },
    {
      "title": "Third Factor",
      "body": "70–100 word explanation with specific advice and numbers."
    },
    {
      "title": "Fourth Factor",
      "body": "70–100 word explanation with specific advice and numbers."
    },
    {
      "title": "Fifth Factor",
      "body": "70–100 word explanation with specific advice and numbers."
    },
    {
      "title": "Sixth Factor",
      "body": "70–100 word explanation with specific advice and numbers."
    }
  ],
  "faq": [
    {
      "q": "What is the best [product] in 2026?",
      "a": "3–4 sentence answer (80–100 words) naming the top pick with the specific reasons why it leads — include rating, price, and 2 key specs. Also mention the runner-up for readers with a different budget or need."
    },
    {
      "q": "What should I look for when buying a [product]?",
      "a": "3–4 sentence answer (80–100 words) covering the 3 most important buying criteria with specific numbers and thresholds. Reference products from this guide as examples."
    },
    {
      "q": "Is a cheaper [product] worth it or should I spend more?",
      "a": "3–4 sentence answer (80–100 words) giving a clear framework for the decision. Name the budget pick and premium pick with price difference and what you gain by spending more."
    },
    {
      "q": "How long does a [product] typically last?",
      "a": "3–4 sentence answer (80–100 words) with concrete lifespan data, what affects longevity, and maintenance tips to extend it."
    },
    {
      "q": "Can I use [product] for [alternative use case]?",
      "a": "3–4 sentence answer (80–100 words) giving a direct, helpful recommendation with product names."
    }
  ],
  "verdict": "3–4 sentence conclusion (100–130 words) that names the Best Overall pick with its price, top 2 reasons it wins, and a direct recommendation. Then briefly mention the runner-up for a different use case (e.g. budget, travel, performance). End with a confident call to action that reassures the reader they're making a well-researched choice.",
  "related_articles": [
    { "slug": "best-related-product-2026", "title": "Best Related Product of 2026" },
    { "slug": "best-another-related-2026", "title": "Best Another Related of 2026" }
  ]
}
```

---

## Word Count Targets by Section

| Section | Target Words |
|---|---|
| `intro` (3 paragraphs) | 200–250 words |
| Products (5 × pros + cons as full sentences) | 450–550 words |
| `buying_guide` (6 points × 90 words) | 540–600 words |
| `faq` (5 × 100 words) | 500–550 words |
| `verdict` | 100–130 words |
| Table + headers + other UI text | ~150 words |
| **Total minimum** | **2,000 words** |
| **Target** | **2,500+ words** |

**Write every text field to its full target length. Never use bullet fragments — write complete sentences.**

---

## Products Rules

- Exactly **4–5 products**, sorted highest rating first
- `best_for` badges must be **unique** per article: `Best Overall`, `Best Value`, `Best Budget`, `Best Premium`, `Best for Beginners`, `Most Portable`, `Most Durable`, `Best Wireless`, etc.
- `rating`: always a **string** in format `"9.X/10"` — scale 8.0–9.9
  - Best Overall: 9.6–9.9
  - Runner-up: 9.0–9.5
  - Mid-range: 8.5–8.9
  - Budget pick: 8.0–8.4
- `pros`: 3 items — **full sentences**, specific and measurable. Include numbers, hours, weights, watts, or comparisons. Never write fragments like "long battery" — write "Delivers 70 hours of wireless playback per charge, outlasting every competitor in its price range."
- `cons`: 1–2 items — **full sentences**, honest and specific. Never write "expensive" — write "At $349 it's one of the priciest options, though the dual-battery system justifies the premium for serious gamers."
- `link`: Always `https://www.amazon.com/dp/ASIN?tag=compareelite-20`
- `image`: Amazon CDN URL: `https://m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg`

---

## Image Rules

### `thumbnail` (article card — Unsplash ONLY)
- **MUST be an Unsplash URL**: `https://images.unsplash.com/photo-XXXXXXXXXXXXXXXXXX?w=800&q=80`
- **NEVER use Amazon, m.media-amazon.com, or any product image** — these are hotlink-blocked and will break the homepage card
- Choose a photo that represents the category visually (lifestyle shot, not a specific product box)

### `image` (product card — Amazon CDN)
- Use `https://m.media-amazon.com/images/I/[IMAGE_ID]._SL500_.jpg`
- Shown inside the article on the product comparison card
- Find the real image ID from your training data for each ASIN
- If you cannot verify the image ID, omit the field — the site has a fallback

---

## SEO Rules

### `slug`
- Lowercase with hyphens only — no spaces, no uppercase
- Format: `best-[product]-2026`
- Example: `best-wireless-earbuds-2026`

### `title` (H1)
- Under 60 characters
- **Must contain the main keyword** (e.g. "best wireless earbuds")
- Format: `Best [Product] of 2026` or `Best [Product] for [Use Case] 2026`
- Must include the year
- No clickbait — clear and descriptive

### `excerpt` (meta description)
- **150–160 characters exactly** — count them
- **Must start with the main keyword** (e.g. "Best wireless earbuds of 2026...")
- Include a clear benefit or differentiator
- End with a call-to-action hint
- Do NOT start with "We" or "Our"

### `intro` — keyword placement
- **Main keyword must appear in the first 100 words** (first paragraph)
- Use the main keyword naturally 2–3 times across the 3 paragraphs
- Use secondary keywords (related terms, use-case variants) in paragraphs 2 and 3

### `buying_guide` titles — secondary keywords in H3
- Each `title` becomes an H3 heading on the page
- **Write titles that contain secondary keywords** readers search for
- Examples for wireless earbuds: "Active Noise Cancellation Quality", "Battery Life and Charging Speed", "Sound Quality and Codec Support", "Comfort and Fit for Long Sessions", "Call Quality and Microphone Performance", "Water Resistance and Durability"
- Avoid generic titles like "Factor 1" or "Performance" — be specific

### Internal Links — `related_articles`
- Add a `related_articles` array with 2–3 slugs of other CompareElite guides in the same or adjacent category
- These render as a "You Might Also Like" section at the bottom of the article
- Only link to articles that plausibly exist on the site (same category or closely related products)
- Format:
```json
"related_articles": [
  { "slug": "best-noise-cancelling-headphones-2026", "title": "Best Noise-Cancelling Headphones of 2026" },
  { "slug": "best-bluetooth-speakers-2026", "title": "Best Bluetooth Speakers of 2026" }
]
```

### `category`
- Must be exactly one of: `Technology`, `Kitchen`, `Fitness`, `Outdoor`, `Health`, `Automotive`, `Home`, `Travel`, `Fashion`

---

## GEO Rules (Generative Engine Optimization — for AI search engines)

AI search engines (ChatGPT, Gemini, Perplexity) cite articles that provide structured, factual answers. To qualify:

### FAQ Requirements
- Minimum **5 FAQ items** — triggers FAQPage rich snippet eligibility AND improves AI citation probability
- Write questions exactly as people type them into Google or ask ChatGPT
- Every answer must name a **specific product by full name**
- Every answer must include **at least one concrete number** (price, battery hours, weight, rating, year)
- Cover: (1) overall best, (2) buying criteria, (3) budget vs premium, (4) durability/lifespan, (5) alternative use case

### Specificity Rules (GEO triggers)
- Never say "long battery life" → say "70-hour wireless battery"
- Never say "good for gaming" → say "optimized for low-latency FPS gaming with 2.4GHz wireless"
- Never say "affordable" → say "under $100" or give the exact price
- Never say "high quality" → name the material, spec, or certification (e.g. "aircraft-grade aluminum", "IPX7 waterproof", "MIL-SPEC drop tested")
- Never say "easy to use" → say "setup takes under 3 minutes with no app required"

---

## Amazon Compliance

- Every link MUST include `?tag=compareelite-20`
- Prices are approximate and subject to change — note this in `verdict`
- Use real, verified ASINs from your training data — do not fabricate product codes
- ASIN format: 10-character alphanumeric (e.g. `B09ZY3K6TW`)

---

## ASIN Verification

- Use ASINs for well-known, highly-reviewed products from your training data
- Cross-check: ASIN must match the product name and model
- If you cannot verify an ASIN confidently, pick a different well-known product

---

## Article Structure

The website auto-renders 8 sections from your JSON — **do NOT write a `content` field**:

1. **Header** — title, date, author, thumbnail
2. **Intro** — rendered from `intro` field (3 paragraphs)
3. **Top Picks Table** — comparison table from `products`
4. **Detailed Reviews** — product cards with pros/cons lists from `products`
5. **Buying Guide** — rendered from `buying_guide` array
6. **FAQ** — rendered from `faq` array as FAQPage structured data
7. **Final Verdict** — rendered from `verdict` field
8. **Disclosure footer** — auto-appended

**You only need to write the JSON. NEVER write a `content` field. NEVER write Markdown. JSON only.**

---

## Quality Checklist — Validate Before Output

- [ ] `slug` uses hyphens, no spaces, ends with `-2026`
- [ ] `title` under 60 characters, includes year
- [ ] `date` in `YYYY-MM-DD` format
- [ ] `excerpt` is 140–160 characters exactly
- [ ] `thumbnail` is an Unsplash URL (`images.unsplash.com`)
- [ ] `author` is `"CompareElite Team"`
- [ ] `stats` is `{ "readers": 0 }`
- [ ] `intro` has 3 paragraphs separated by `\n\n`, totaling 180–230 words
- [ ] Products: 4–5 items, sorted by rating highest first
- [ ] All `best_for` labels are unique
- [ ] All `rating` values are strings like `"9.X/10"`
- [ ] All `pros` items are complete sentences with measurable specs
- [ ] All `cons` items are complete sentences with specifics
- [ ] All `link` values include `?tag=compareelite-20`
- [ ] `buying_guide` has 6 items, each `body` is 70–100 words
- [ ] `faq` has exactly 5 items with `q` and `a` keys
- [ ] Each FAQ `a` is 80–100 words, names a product, includes a number
- [ ] `verdict` is 100–130 words, names the top pick with price
- [ ] `intro` first paragraph contains the main keyword within first 100 words
- [ ] `buying_guide` titles contain secondary keywords (not generic labels)
- [ ] `related_articles` has 2–3 entries with valid slugs and titles
- [ ] Total word count across all text fields ≥ 2000 words (target 2500+)
- [ ] No `featured_image`, `published_at`, `affiliate_link`, `tagline`, or `content` fields present
- [ ] JSON is valid (no trailing commas, all strings quoted)

---

## Example Output (abbreviated)

```json
{
  "slug": "best-wireless-earbuds-2026",
  "title": "Best Wireless Earbuds of 2026",
  "category": "Technology",
  "date": "2026-04-24",
  "excerpt": "Best wireless earbuds of 2026 — tested for sound, ANC, and battery life. Top picks from Sony, Apple & Jabra for every budget. Expert guide inside.",
  "thumbnail": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
  "author": "CompareElite Team",
  "stats": { "readers": 0 },
  "intro": "Choosing the right wireless earbuds in 2026 is harder than ever — with hundreds of options ranging from $30 budget buds to $350 flagship ANC models, picking the wrong pair means poor sound, uncomfortable fit, or wasted money. Whether you commute daily, hit the gym, or work from home, the right earbuds can genuinely transform your daily experience.\n\nWe tested over 20 pairs of wireless earbuds across six weeks, evaluating sound quality, active noise cancellation effectiveness, call clarity, battery life, and fit stability. Our testing panel included commuters, remote workers, and athletes to ensure recommendations that work for real-world use.\n\nIn this guide you'll find a quick comparison table of our top 5 picks, in-depth reviews with full pros and cons, a buying guide covering the six most important factors, and a detailed FAQ section to answer the questions we hear most. Every product is available on Amazon with a verified ASIN.",
  "products": [
    {
      "name": "Sony WF-1000XM5",
      "rating": "9.8/10",
      "price": "$279",
      "best_for": "Best Overall",
      "link": "https://www.amazon.com/dp/B0C33XXS56?tag=compareelite-20",
      "image": "https://m.media-amazon.com/images/I/61pN1SjxstL._SL500_.jpg",
      "pros": [
        "Delivers the most effective active noise cancellation of any earbud tested in 2026, reducing ambient noise by up to 97% in independent lab measurements.",
        "Provides 8 hours of playback per charge with ANC enabled, extending to 36 hours total with the included charging case — enough for a full international travel day.",
        "Supports Sony's LDAC codec for Hi-Res wireless audio at 990kbps, delivering noticeably better detail and soundstage than standard SBC or AAC connections."
      ],
      "cons": [
        "At $279 they are one of the most expensive earbuds on this list, though the combination of top-tier ANC and Hi-Res audio support makes them worth it for daily commuters.",
        "The ear tip selection process requires some patience to find the right size for a proper seal, which is essential for both ANC performance and bass response."
      ]
    }
  ],
  "buying_guide": [
    {
      "title": "Active Noise Cancellation (ANC)",
      "body": "ANC quality varies dramatically across price points. Budget earbuds under $50 typically reduce low-frequency hum but struggle with voices and mid-range sounds. Mid-range options ($100–$200) like the Jabra Elite 5 handle most commuting environments well. Only flagship models like the Sony WF-1000XM5 and Apple AirPods Pro 2 deliver true transparency-mode quality. If you work in a noisy office or commute by train, prioritize ANC over any other feature — a mediocre ANC system will frustrate you daily."
    }
  ],
  "faq": [
    {
      "q": "What are the best wireless earbuds in 2026?",
      "a": "The Sony WF-1000XM5 are the best wireless earbuds in 2026, earning a 9.8/10 rating in our testing. They combine class-leading ANC, 36-hour total battery life with the case, and LDAC Hi-Res audio support — all at $279. For budget buyers, the Jabra Elite 4 offers solid ANC and a reliable 7-hour battery at just $79, making it the best value pick for everyday use without breaking the bank."
    }
  ],
  "verdict": "After six weeks of testing, the Sony WF-1000XM5 remains the clear best wireless earbuds of 2026 at $279 — no other earbud matches its combination of 97% noise reduction, 36-hour battery life with the case, and Hi-Res LDAC audio. For most people, this is the pair to buy. If your budget is under $100, the Jabra Elite 4 at $79 delivers surprisingly good ANC and a stable fit that punches well above its price. Whichever pair you choose from this list, you're getting a well-reviewed product backed by thousands of verified Amazon buyers. Prices are approximate and may vary."
}
```
