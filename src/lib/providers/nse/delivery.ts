/**
 * Daily order-flow proxy for NSE equities: delivery quantity / delivery %
 * (the share of a day's traded volume that actually settled into demat
 * accounts rather than being squared off intraday). Higher delivery % on
 * rising price/volume is the standard Indian-market signal for genuine
 * accumulation vs. speculative/intraday churn.
 *
 * Source: NSE's legacy "full bhav data" CSV
 * (nsearchives.nseindia.com/products/content/sec_bhavdata_full_DDMMYYYY.csv)
 * — a different, older report than the UDiFF bhavcopy in bhavcopy.ts, kept
 * alongside it specifically because it's the one that still carries
 * DELIV_QTY/DELIV_PER columns; the newer UDiFF format dropped them.
 * Official, key-free, unaffected by the Akamai block on the live API.
 */
import { nseFetchBinary } from './http';

export interface DailyOrderFlowRow {
	date: string; // YYYY-MM-DD
	open: number;
	high: number;
	low: number;
	close: number;
	prevClose: number;
	changePct: number;
	volume: number;
	turnoverLakhs: number;
	numTrades: number;
	deliveryQty: number;
	/** % of the day's volume that was delivered (not squared off intraday). 0 for series without delivery reporting (e.g. some ETFs). */
	deliveryPct: number;
}

function formatDeliveryDate(date: Date): string {
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const yyyy = date.getFullYear();
	return `${dd}${mm}${yyyy}`;
}

function parseNumber(text: string): number {
	const n = Number(text.trim().replace(/,/g, ''));
	return Number.isFinite(n) ? n : 0;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "14-Aug-2026" -> "2026-08-14". */
function parseDate1(text: string): string {
	const [dd, mon, yyyy] = text.trim().split('-');
	const mm = MONTHS.indexOf(mon.toUpperCase()) + 1;
	return `${yyyy}-${String(mm).padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/**
 * One day's full-market delivery data, keyed by symbol (EQ series only) for
 * O(1) lookup. Unlike bhavcopy.ts's UDiFF endpoint (which cleanly 404s for
 * weekends/holidays), this one was found live to silently serve the most
 * recent trading day's content for a non-trading-day URL instead of 404ing
 * — trusting the requested filename date produced duplicate rows for
 * different (weekend) dates. Cross-checks the CSV's own DATE1 column
 * against the requested date and throws on mismatch, so callers can treat
 * "no data for this date" reliably regardless of which behavior NSE's CDN
 * happens to do for a given URL.
 */
async function downloadDeliveryData(date: Date): Promise<Map<string, DailyOrderFlowRow>> {
	const ds = formatDeliveryDate(date);
	const buf = await nseFetchBinary(`/products/content/sec_bhavdata_full_${ds}.csv`);
	const csv = buf.toString('utf-8');
	const lines = csv.trim().split(/\r?\n/);
	if (lines.length < 2) throw new Error(`Empty delivery-data CSV for ${ds}`);

	const headers = lines[0].split(',').map((h) => h.trim());
	const dateIdxCheck = headers.indexOf('DATE1');
	const firstDataRow = lines[1].split(',').map((c) => c.trim());
	const requestedDate = date.toISOString().slice(0, 10);
	if (dateIdxCheck >= 0 && parseDate1(firstDataRow[dateIdxCheck]) !== requestedDate) {
		throw new Error(`Delivery data for ${ds} is stale (CDN served a different day's file) — no real data for this date`);
	}
	const idx = (name: string) => headers.indexOf(name);
	const symbolIdx = idx('SYMBOL');
	const seriesIdx = idx('SERIES');
	const prevCloseIdx = idx('PREV_CLOSE');
	const openIdx = idx('OPEN_PRICE');
	const highIdx = idx('HIGH_PRICE');
	const lowIdx = idx('LOW_PRICE');
	const closeIdx = idx('CLOSE_PRICE');
	const volumeIdx = idx('TTL_TRD_QNTY');
	const turnoverIdx = idx('TURNOVER_LACS');
	const tradesIdx = idx('NO_OF_TRADES');
	const delivQtyIdx = idx('DELIV_QTY');
	const delivPerIdx = idx('DELIV_PER');

	const map = new Map<string, DailyOrderFlowRow>();
	for (const line of lines.slice(1)) {
		const cells = line.split(',').map((c) => c.trim());
		if (cells[seriesIdx] !== 'EQ') continue; // skip debt/ETF/preference-share series — order flow is meaningful for common equity
		const close = parseNumber(cells[closeIdx]);
		const prevClose = parseNumber(cells[prevCloseIdx]);
		map.set(cells[symbolIdx], {
			date: date.toISOString().slice(0, 10),
			open: parseNumber(cells[openIdx]),
			high: parseNumber(cells[highIdx]),
			low: parseNumber(cells[lowIdx]),
			close,
			prevClose,
			changePct: prevClose ? ((close - prevClose) / prevClose) * 100 : 0,
			volume: parseNumber(cells[volumeIdx]),
			turnoverLakhs: parseNumber(cells[turnoverIdx]),
			numTrades: parseNumber(cells[tradesIdx]),
			deliveryQty: parseNumber(cells[delivQtyIdx]),
			deliveryPct: delivPerIdx >= 0 ? parseNumber(cells[delivPerIdx]) : 0
		});
	}
	return map;
}

/**
 * Last N trading days of order-flow data for one symbol, oldest first.
 * Fetches a window of calendar days in parallel (generous enough to absorb
 * weekends + a few holidays) rather than walking backwards serially, since
 * each day is an independent ~130KB full-market file and most of the
 * lookback window will 404 (weekends) — no reason to pay that latency
 * sequentially.
 */
export async function getOrderFlowHistory(symbol: string, days = 10): Promise<DailyOrderFlowRow[]> {
	const candidateDates: Date[] = [];
	const today = new Date();
	for (let i = 0; i < days + 12; i++) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		candidateDates.push(d);
	}

	const results = await Promise.allSettled(candidateDates.map((d) => downloadDeliveryData(d)));

	const rows: DailyOrderFlowRow[] = [];
	for (const result of results) {
		if (result.status === 'fulfilled') {
			const row = result.value.get(symbol);
			if (row) rows.push(row);
		}
	}

	return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
}
