# Providers

Real data integrations to replace [mock-data.ts](./mock-data.ts), scoped to
the three **free, no-broker-account** sources discussed for this project.
Nothing here is wired into the API routes yet — routes still call
`mock-data.ts` directly. See "Wiring it in" below for next steps.

## Status per source (verified live 2026-08-15)

| Module | Source | Status |
|---|---|---|
| [yahoo-finance.ts](./yahoo-finance.ts) | Yahoo Finance chart API | ✅ **Working.** Live quote + historical OHLC + derived technicals (SMA/RSI/MACD/ATR/beta/relative-strength) confirmed against real RELIANCE.NS data. |
| [nse/bhavcopy.ts](./nse/bhavcopy.ts) | NSE UDiFF daily archive (`nsearchives.nseindia.com`) | ✅ **Working.** Confirmed end-to-end (download → unzip → parse) for both equity and F&O bhavcopy; numbers cross-checked exactly against Yahoo Finance for the same day. |
| [nse/quote.ts](./nse/quote.ts), [deals.ts](./nse/deals.ts), [shareholding.ts](./nse/shareholding.ts), [option-chain.ts](./nse/option-chain.ts) | NSE's live `/api/*` (`www.nseindia.com`) | ⚠️ **Blocked, not working.** See below — scaffolded against the right endpoint shapes but currently returns nothing. |

### Why the live NSE `/api/*` endpoints don't work right now

`nseindia.com` sits behind **Akamai Bot Manager**. The cookie-bootstrap step
in [nse/http.ts](./nse/http.ts) succeeds (200, real session cookies), but
every following `/api/*` call still comes back `403` with an **Akamai edge
"Access Denied" page** — the CDN itself is rejecting the request before it
reaches NSE's app. That's a JS-executed bot-fingerprint check, not a missing
header or wrong param, so no amount of header-tweaking in a plain `fetch`
client fixes it. This wasn't obvious until tested live — earlier discussion
in this conversation assumed a simple cookie jar would be enough, matching
what most older scraper tutorials describe; that no longer holds.

**What would actually fix it:** drive a real browser session (Playwright or
Puppeteer) against `nseindia.com` to pass the Akamai challenge, then reuse
its cookies for the `/api/*` calls. That's a materially bigger dependency
(a browser binary) than anything else in this providers layer — worth doing
only if the live JSON endpoints (real-time bulk/block deals, live option
chain, shareholding) are actually needed. If end-of-day is good enough,
**bhavcopy already covers equity EOD prices and F&O EOD data for free with
no such workaround needed** — prefer it over fixing the live API where it's
sufficient.

## Provider-role coverage

Recall the four roles named in [mock-data.ts](./mock-data.ts)'s header comment:

- **MarketDataProvider** → `yahoo-finance.ts` (live) + `nse/bhavcopy.ts` (EOD, official cross-check)
- **FundamentalProvider** → not covered by any of these three sources; still open (Screener.in/Tickertape/Trendlyne, per the original options discussion)
- **ShareholdingProvider** → `nse/shareholding.ts` (blocked — see above) + `nse/deals.ts` for bulk/block deal flow (also blocked live, but the F&O/equity bhavcopy dumps carry adjacent EOD data)
- **FnoProvider** → `nse/option-chain.ts` (blocked live) + `nse/bhavcopy.ts`'s `downloadFnoBhavcopy` (working, EOD futures/options dump with OI, IV inputs, etc. — raw CSV, unparsed per-row since F&O columns don't fit one shared shape)

## Wiring it in

Two integration points, not yet done:

1. **Types**: only `yahoo-finance.ts`'s `getTechnicalSnapshot()` returns
   something shaped close to an existing type (`TechnicalData`, minus `adx`
   which isn't computed — see its doc comment). The NSE modules return their
   own raw/mapped shapes (`NseQuoteSnapshot`, `EquityBhavcopyRow`, etc.) —
   deciding how these fold into `StockAnalysis` / the Prisma schema
   (`prisma/schema.prisma`'s `Price`/`Fundamental`/`Shareholding` tables) is
   a separate design decision.
2. **Routes**: `src/routes/api/**/+server.ts` still import from
   `mock-data.ts`. A reasonable next step is a scheduled sync script that
   calls these providers, writes into the Prisma tables, and have routes
   read from the DB — not call providers live on each request (also sidesteps
   Yahoo/NSE rate limits).

## Setup

- `yahoo-finance.ts` and `nse/bhavcopy.ts`: no config needed, work as-is.
- `nse/http.ts`-based modules: no API key either (that's not the blocker —
  Akamai is). No `.env` changes needed for any of this.
- New dependency: [`adm-zip`](https://www.npmjs.com/package/adm-zip) (bhavcopy
  `.zip` extraction) + `@types/node` (both added to `package.json`).
