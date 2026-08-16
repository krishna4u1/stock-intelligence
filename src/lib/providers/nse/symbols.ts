/**
 * Symbol/company-name directory for search — sourced from NSE's own daily
 * equity bhavcopy rather than a separate master-list endpoint. (NSE's
 * commonly-referenced EQUITY_L.csv master list 404s at every URL pattern
 * tried live — nseindia.com's static-file layout has apparently moved on
 * from it. The bhavcopy's FinInstrmNm column already carries a company name
 * per symbol, covers the whole NSE equity universe, and is already proven
 * working — so this reuses it instead of chasing another unverified path.)
 */
import { downloadEquityBhavcopy, type EquityBhavcopyRow } from './bhavcopy';

export interface SymbolEntry {
	symbol: string;
	name: string;
}

let cache: { entries: SymbolEntry[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // the listed-company set barely changes intraday

/**
 * Bhavcopy is published per trading day and doesn't exist for
 * weekends/holidays/today-before-market-close. Walk backwards until one is
 * found rather than hardcoding "today".
 */
async function fetchLatestBhavcopyWithFallback(maxDaysBack = 7): Promise<EquityBhavcopyRow[]> {
	const today = new Date();
	for (let i = 0; i < maxDaysBack; i++) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		try {
			return await downloadEquityBhavcopy(d);
		} catch {
			// No file for this date — try the previous day.
		}
	}
	throw new Error(`No NSE bhavcopy found in the last ${maxDaysBack} days`);
}

export async function getSymbolDirectory(): Promise<SymbolEntry[]> {
	if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.entries;

	const rows = await fetchLatestBhavcopyWithFallback();
	const entries = rows
		.filter((r) => r.series === 'EQ') // common equity only — skips SGBs/ETFs/preference shares etc.
		.map((r) => ({ symbol: r.symbol, name: r.name || r.symbol }));

	cache = { entries, fetchedAt: Date.now() };
	return entries;
}

/** Ranked search over symbol + company name. Exact symbol match ranks highest, then prefix, then substring. */
export async function searchSymbols(query: string, limit = 8): Promise<SymbolEntry[]> {
	const q = query.trim().toUpperCase();
	if (!q) return [];

	const dir = await getSymbolDirectory();

	const scored = dir
		.map((entry) => {
			const sym = entry.symbol.toUpperCase();
			const name = entry.name.toUpperCase();
			let score = 0;
			if (sym === q) score = 100;
			else if (sym.startsWith(q)) score = 80;
			else if (name.startsWith(q)) score = 60;
			else if (name.includes(q)) score = 40;
			else if (sym.includes(q)) score = 30;
			return { entry, score };
		})
		.filter((s) => s.score > 0)
		.sort((a, b) =>
			b.score - a.score ||
			// Within the same score tier (e.g. "SBI" prefix-matching SBIN,
			// SBICARD, SBILIFE, and a dozen SBI-AMC ETF tickers), a shorter
			// symbol is a tighter match — SBIN (4 chars) is what "SBI" almost
			// certainly means, not SBIETFQLTY (10 chars). Without this,
			// alphabetical order alone pushed SBIN past the result limit
			// entirely, since it sorts after every other SBI*-prefixed ticker.
			a.entry.symbol.length - b.entry.symbol.length ||
			a.entry.symbol.localeCompare(b.entry.symbol)
		);

	return scored.slice(0, limit).map((s) => s.entry);
}
