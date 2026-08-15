/**
 * Shareholding pattern (promoter / FII / DII / public split) from
 * nseindia.com. This is the shakiest endpoint in this module: shareholding
 * disclosures are filed quarterly as XBRL/PDF, and NSE's JSON wrapper around
 * them has changed shape more than once. Confirm the response shape against
 * a live request before trusting this in production — treat it as a
 * starting point, not a verified integration.
 */
import { nseFetch } from './http';

interface RawShareholdingRow {
	category?: string; // e.g. "Promoter & Promoter Group", "Foreign Portfolio Investors", "Mutual Funds"
	pct?: number | string;
	date?: string;
}

export interface ShareholdingSnapshot {
	quarterEndDate: string | null;
	promoterHoldingPct: number | null;
	fiiHoldingPct: number | null;
	mfHoldingPct: number | null;
	diiHoldingPct: number | null;
	publicHoldingPct: number | null;
}

function pctFor(rows: RawShareholdingRow[], matcher: RegExp): number | null {
	const row = rows.find((r) => r.category && matcher.test(r.category));
	if (!row || row.pct === undefined) return null;
	const n = Number(row.pct);
	return Number.isFinite(n) ? n : null;
}

/**
 * GET /api/corporate-share-holdings-master?symbol=X
 * Unverified param name for the symbol filter — NSE may expect `index` or a
 * separate `/api/shareholding-pattern` path instead. If this returns a
 * schema you don't recognise, inspect nseindia.com's own "Shareholding
 * Pattern" tab under a stock's corporate-information page in devtools.
 */
export async function getShareholdingPattern(symbol: string): Promise<ShareholdingSnapshot> {
	const res = await nseFetch<{ data?: RawShareholdingRow[] } | RawShareholdingRow[]>(
		'/api/corporate-share-holdings-master',
		{ params: { symbol } }
	);
	const rows = Array.isArray(res) ? res : (res.data ?? []);

	return {
		quarterEndDate: rows[0]?.date ?? null,
		promoterHoldingPct: pctFor(rows, /promoter/i),
		fiiHoldingPct: pctFor(rows, /foreign portfolio|fii/i),
		mfHoldingPct: pctFor(rows, /mutual fund/i),
		diiHoldingPct: pctFor(rows, /domestic institutional|dii/i),
		publicHoldingPct: pctFor(rows, /public/i)
	};
}
