---
name: compareelite-analytics-v2
description: Monitor compareelite.com full performance — pulls weekly metrics from GA4, Vercel Analytics, Amazon Associates, and the GitHub article repo, then compiles a single weekly report for the CEO. Invoked by the CTO every Monday at 10:00 AM KSA. Reads secrets from GitHub Actions / environment variables — never hardcoded.
allowed-tools: Read, WebFetch, Bash(node scripts/*:*), Bash(curl:*), Bash(ls:*), Bash(cat:*)
---

# compareelite-analytics

Aggregates four data sources into one weekly report. The CTO calls this skill, the skill returns a JSON report, the CTO forwards it to the CEO.

## ⚠️ Secret-handling policy (READ FIRST)

This skill MUST NOT contain real credentials. Every secret value below is a placeholder of the form `${ENV_VAR}` and is resolved at runtime from environment variables. The actual values live in **GitHub Secrets** for the workflow runs and in the operator's local environment for ad-hoc runs.

If you find yourself about to paste a real token, secret, or refresh token into this file — **stop**. The repository is public.

Required env vars (configure once in GitHub → Settings → Secrets and variables → Actions):

| Env var | Source | Notes |
|---|---|---|
| `GA4_PROPERTY_ID` | Google Analytics 4 | Numeric ID, not a secret strictly, but kept with the others for symmetry |
| `GA4_CLIENT_ID` | Google Cloud OAuth client | safe-ish, but rotate together with the secret |
| `GA4_CLIENT_SECRET` | Google Cloud OAuth client | **secret** — rotate if exposed |
| `GA4_REFRESH_TOKEN` | OAuth consent flow | **secret** — long-lived; rotate if exposed |
| `VERCEL_TEAM_SLUG` | Vercel | `eng-alwakeel` |
| `VERCEL_PROJECT_SLUG` | Vercel | `compareelite` |
| `AMAZON_AFFILIATE_TAG` | Amazon Associates | `compareelite-20` (public, safe) |

If any required env var is missing at runtime, fail loudly with a message naming the missing variable. Do not fall back to defaults that could cause silent misreporting.

---

## 1️⃣ GA4 — Website Traffic

### Step 1.1 — Refresh access token

Before every GA4 call, exchange the refresh token for a short-lived access token:

```bash
curl -sS -X POST https://oauth2.googleapis.com/token \
  -d "client_id=${GA4_CLIENT_ID}" \
  -d "client_secret=${GA4_CLIENT_SECRET}" \
  -d "refresh_token=${GA4_REFRESH_TOKEN}" \
  -d "grant_type=refresh_token"
```

Parse `access_token` from the JSON response. Treat it as ephemeral — do not log, persist, or echo it. Use it only for the `Authorization: Bearer <access_token>` header on the next request.

### Step 1.2 — Run report

```
POST https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Weekly metrics to pull

- Total sessions and total users
- Top 10 articles by `screenPageViews`, dimensioned by `pagePath`
- Traffic sources by `sessionDefaultChannelGroup` (Organic Search, Direct, Social, Referral, …)
- `bounceRate`
- `averageSessionDuration`

Date range: last completed Monday → Sunday (use UTC).

---

## 2️⃣ Vercel Analytics — Performance

Read-only dashboard at `https://vercel.com/${VERCEL_TEAM_SLUG}/${VERCEL_PROJECT_SLUG}/analytics`.

Pull (manually or via the Vercel API if a project token is later configured):

- Average page-load time (LCP P75)
- Core Web Vitals: LCP, INP, CLS — note any P75 outside the "Good" thresholds
- Top 10 visited pages
- Real-time visitors snapshot

If no Vercel token is configured, leave the `vercel` block in the report with the values fetched manually or marked as `"unavailable": true`. Do not invent numbers.

---

## 3️⃣ Amazon Associates — Revenue

Dashboard: `https://affiliate.amazon.com/home/reports`. Affiliate tag: `${AMAZON_AFFILIATE_TAG}`.

Pull (manually until/unless the Amazon Associates API is configured):

- Total clicks (last 7 days)
- Total orders
- Conversion rate
- Revenue (USD)
- Top 5 earning articles by commission

If no API access exists, mark the `amazon` block with the manual values copied from the dashboard, or `"manual_entry_pending": true`. Never fabricate revenue numbers — flagging missing data is correct; faking it corrupts the goal-tracking signal.

---

## 4️⃣ GitHub — Content progress

Read locally from the workflow checkout (no API call needed):

```bash
cat data/articles-manifest.json
```

Compute:

- Total articles published (`manifest.count`)
- New articles in the last 7 days — derive by comparing each article's `date` field
- Articles per niche (`category` field): Tech, Home Office, Smart Home, Home Fitness

If the manifest file is missing or empty, fall back to:

```bash
ls articles/*.json | wc -l
```

and read each JSON's `category` to bucket. Never fabricate — if data is missing, mark the `github` block with `"unavailable": true` and the reason.

---

## 📊 Weekly report format

```json
{
  "week": "2026-W17",
  "ga4": {
    "visitors": 0,
    "sessions": 0,
    "bounce_rate": "0%",
    "avg_session_duration_sec": 0,
    "top_articles": [],
    "traffic_sources": {}
  },
  "vercel": {
    "avg_load_time_sec": 0,
    "lcp_p75_sec": 0,
    "inp_p75_ms": 0,
    "cls_p75": 0,
    "top_pages": []
  },
  "amazon": {
    "clicks": 0,
    "orders": 0,
    "revenue_usd": 0,
    "conversion_rate": "0%",
    "top_earning_articles": []
  },
  "github": {
    "total_articles": 0,
    "new_this_week": 0,
    "by_niche": {
      "tech": 0,
      "home_office": 0,
      "smart_home": 0,
      "home_fitness": 0
    }
  },
  "goals": {
    "month_target_visitors": 500,
    "month_target_articles": 150,
    "month_target_revenue_usd": 50,
    "on_track": true,
    "flags": []
  }
}
```

`goals.flags` is a list of `"warning"` strings — emit one for each rule below that fires this week. Empty list = green week.

---

## 📋 Operating procedure (for the CTO)

Every Monday at 10:00 AM KSA:

1. Verify all required env vars are set; abort with an explicit error if any is missing.
2. Refresh the GA4 access token (Step 1.1) — never reuse a stale one across runs.
3. Pull GA4 metrics (Step 1.2).
4. Pull Vercel metrics (Section 2).
5. Pull Amazon Associates metrics (Section 3).
6. Read GitHub article counts from the local manifest (Section 4).
7. Compose the weekly report in the exact JSON shape above.
8. Compute `goals.flags`:
   - ⚠️ "articles_below_target" — if `github.new_this_week < 35`
   - ⚠️ "revenue_below_target" — if `amazon.revenue_usd × 4 < goals.month_target_revenue_usd`
   - ⚠️ "traffic_below_target" — if `ga4.visitors × 4 < goals.month_target_visitors`
9. Set `goals.on_track = (flags.length === 0)`.
10. Hand the JSON to the CEO skill.

This skill writes nothing to the repository, posts no GitHub issue, and never touches `git`/`gh`. It only reports.

---

## Local rotation checklist

If a credential leaks (e.g., gets pasted into a public chat by accident):

1. Google Cloud Console → APIs & Services → Credentials → delete the OAuth client.
2. Recreate the OAuth client; download the new `client_id` + `client_secret`.
3. Re-run the OAuth consent flow to mint a new `refresh_token`.
4. Update the three values in GitHub → Settings → Secrets and variables → Actions.
5. Update local `.env` (if any) — do not commit it.
6. Confirm the next workflow run succeeds against the new values.

The old `refresh_token` is invalid the moment the OAuth client is deleted.
