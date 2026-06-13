# New Article Indexing Tracker

Tracks v4-standard articles (post-2026-06-09) through the indexing pipeline.
Update "first_impression" and "indexed" columns from Google Search Console weekly.

## Tracked Articles

| slug | created | committed | sitemap | indexnow_submitted | gsc_indexed | first_impression | notes |
|------|---------|-----------|---------|-------------------|-------------|-----------------|-------|
| best-office-chair-for-under-200-2026 | 2026-06-09 | 2026-06-09 19:06 UTC | ✅ | ✅ 2026-06-13 HTTP 200 | ❓ | — | v4 fields: check pending |
| best-gaming-chairs-under-300-2026 | 2026-06-10 | 2026-06-10 06:36 UTC | ✅ | ✅ 2026-06-13 HTTP 200 | ❓ | — | v4 CONFIRMED ✅ validator PASS |

## IndexNow Submission Status

Last confirmed IndexNow run: **2026-06-13** (data/indexnow-log.json — new persistent log)
- best-office-chair-for-under-200-2026 → HTTP 200 ✅ 2026-06-13T12:44:54Z
- best-gaming-chairs-under-300-2026    → HTTP 200 ✅ 2026-06-13T12:44:54Z

Previous bulk run: **2026-06-03** — 190 URLs submitted, quota hit.
New articles published after that run were not in the batch; now confirmed submitted above.

**Logging gap fixed:** notify-indexnow.js now appends every submission to
data/indexnow-log.json (url + submittedAt + status + ok). All future auto-submissions
via update-manifest.yml are fully traceable.

## Google Indexing Baseline (2026-06-03)

20 URLs confirmed submitted to Google Indexing API before quota hit:
- compareelite.com/ and /about
- 18 article URLs (ab-rollers, acoustic-panels, action-cameras, adjustable-dumbbells,
  air-fryers, air-purifiers, air-quality-monitors, ankle-weights, audio-interfaces,
  balance-boards, barbell-weight-sets, battle-ropes, blue-light-glasses,
  bluetooth-speakers, bluetooth-trackers, bone-conduction-headphones,
  standing-desks, contact)

## How to Update This File

Weekly: open Google Search Console → Pages → Indexed
Search for each slug. When status changes from "Discovered" → "Indexed":
1. Fill in `gsc_indexed` date
2. Check Performance → Search results → filter by URL for first impression date
3. Note first ranking position if visible

## Indexing Lag Expectation

- IndexNow submission → Bing crawl: ~2–7 days
- Google: IndexNow is advisory only; actual crawl/index: 1–6 weeks
- E-E-A-T signals (author_bio, reviewer, citations) may accelerate trust signals
  but do not guarantee faster crawling

## Article Quality Gate (v4 standard)

Articles tracked here must have ALL of:
- [ ] author (named: Sarah Mitchell / Alex Rivera / James Cooper, not "CompareElite Team")
- [ ] author_bio
- [ ] reviewer + reviewer_title
- [ ] key_takeaways (4–5 bullets with numbers)
- [ ] testing_narrative (~45 words, first-person)
- [ ] external_citations (3 sources)
- [ ] updatedAt
- [ ] faq (7+ items)
- [ ] products (6+, even count, ratings as "X.X/10")
- [ ] validator PASS
