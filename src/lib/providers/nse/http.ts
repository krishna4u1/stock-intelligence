/**
 * Shared session/fetch helper for NSE India's unofficial JSON API.
 *
 * nseindia.com does not offer a public API. Every /api/* endpoint below is
 * undocumented, used by the site's own frontend, and can change or start
 * blocking scripted traffic without notice. It requires:
 *   1. A same-origin-looking cookie, obtained by first hitting a normal HTML
 *      page (any page works; we use /option-chain).
 *   2. Browser-like headers (User-Agent, Accept, Referer) on every request —
 *      requests without these are rejected outright.
 *
 * Endpoints referenced across this providers/nse/* module were cross-checked
 * against the actively-maintained community wrapper
 * https://github.com/BennyThadikaran/NseIndiaApi as of writing. Param names
 * on the deals/shareholding endpoints in particular have shifted before
 * (fromDate vs from_date etc.) — if a request 400s, capture the real request
 * from nseindia.com's Network tab and adjust here.
 *
 * ⚠️ VERIFIED LIVE 2026-08-15: nseindia.com now sits behind Akamai Bot
 * Manager. The cookie bootstrap below completes fine (200, real cookies
 * including Akamai's ak_bmsc/bm_mi sensor cookies) but every subsequent
 * /api/* call still comes back 403 with an Akamai edge "Access Denied" page
 * — not even NSE's own app, the CDN itself is rejecting the request. This
 * is a bot-fingerprint check plain fetch can't satisfy (it wants JS-executed
 * sensor data), not a missing-header problem. Getting quote.ts / deals.ts /
 * shareholding.ts / option-chain.ts to actually return data will need a
 * real browser session (Playwright/Puppeteer against nseindia.com) rather
 * than this fetch-only client — treat those four files as endpoint-shape
 * scaffolding, not working integrations, until that's added. bhavcopy.ts is
 * unaffected (nsearchives.nseindia.com is a separate, unprotected static
 * host) and was confirmed working end-to-end against live data.
 */

export const NSE_BASE = 'https://www.nseindia.com';
export const NSE_ARCHIVE_BASE = 'https://nsearchives.nseindia.com';

const BROWSER_HEADERS: Record<string, string> = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	Accept: 'application/json, text/plain, */*',
	'Accept-Language': 'en-US,en;q=0.9',
	Referer: `${NSE_BASE}/`
};

const COOKIE_TTL_MS = 5 * 60 * 1000;

let cookieHeader: string | null = null;
let cookieFetchedAt = 0;
let refreshInFlight: Promise<string> | null = null;

async function refreshSession(): Promise<string> {
	const res = await fetch(`${NSE_BASE}/option-chain`, { headers: BROWSER_HEADERS });
	// Node 20's undici Headers supports getSetCookie() to read all Set-Cookie
	// lines individually — .get('set-cookie') would collapse them into one
	// comma-joined string and break parsing.
	const rawCookies = res.headers.getSetCookie?.() ?? [];
	if (rawCookies.length === 0) {
		throw new Error('NSE session bootstrap returned no cookies — nseindia.com may be blocking this request');
	}
	cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');
	cookieFetchedAt = Date.now();
	return cookieHeader;
}

async function getCookieHeader(): Promise<string> {
	if (cookieHeader && Date.now() - cookieFetchedAt < COOKIE_TTL_MS) return cookieHeader;
	if (!refreshInFlight) {
		refreshInFlight = refreshSession().finally(() => {
			refreshInFlight = null;
		});
	}
	return refreshInFlight;
}

export interface NseFetchOptions {
	/** Query params appended to the request URL. */
	params?: Record<string, string | number | boolean | undefined>;
	/** Internal: set to false to stop after one cookie-refresh retry. */
	_retry?: boolean;
}

/**
 * GET an nseindia.com /api/* JSON endpoint with a valid session + browser
 * headers, retrying once with a fresh cookie on 401/403.
 */
export async function nseFetch<T = unknown>(path: string, options: NseFetchOptions = {}): Promise<T> {
	const url = new URL(path.startsWith('http') ? path : `${NSE_BASE}${path}`);
	if (options.params) {
		for (const [key, value] of Object.entries(options.params)) {
			if (value !== undefined) url.searchParams.set(key, String(value));
		}
	}

	const cookie = await getCookieHeader();
	const res = await fetch(url, { headers: { ...BROWSER_HEADERS, Cookie: cookie } });

	if ((res.status === 401 || res.status === 403) && options._retry !== false) {
		cookieHeader = null; // force a fresh session and try exactly once more
		return nseFetch<T>(path, { ...options, _retry: false });
	}

	if (!res.ok) {
		throw new Error(`NSE request failed: ${res.status} ${res.statusText} — ${url.toString()}`);
	}

	return (await res.json()) as T;
}

/** Fetch a raw binary resource (e.g. bhavcopy .zip) from the archive host. */
export async function nseFetchBinary(path: string): Promise<Buffer> {
	const url = path.startsWith('http') ? path : `${NSE_ARCHIVE_BASE}${path}`;
	const res = await fetch(url, { headers: BROWSER_HEADERS });
	if (!res.ok) {
		throw new Error(`NSE archive request failed: ${res.status} ${res.statusText} — ${url}`);
	}
	return Buffer.from(await res.arrayBuffer());
}
