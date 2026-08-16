/**
 * NSE daily Bhavcopy (end-of-day full-market report). Official, static-file
 * archive — no cookies/session needed, unlike the rest of providers/nse/*.
 * Only covers NSE; NSE switched to the "UDiFF Common Bhavcopy" CSV format
 * across all segments on 2024-07-08, replacing the older per-segment files.
 *
 * BSE has an equivalent daily bhavcopy archive but its current URL scheme
 * isn't verified here — capture it from bseindia.com/markets/MarketInfo/BhavCopy
 * before adding a downloadBseBhavcopy() alongside this.
 */
import AdmZip from 'adm-zip';
import { nseFetchBinary } from './http';

export interface EquityBhavcopyRow {
	symbol: string;
	/** Company/instrument name (UDiFF's FinInstrmNm). Empty on legacy pre-2024-07-08 files, which don't carry this column. */
	name: string;
	series: string;
	open: number;
	high: number;
	low: number;
	close: number;
	prevClose: number;
	volume: number;
	valueInLakhs: number;
	date: string;
}

/** Verified live against nsearchives.nseindia.com: the UDiFF bhavcopy filename uses YYYYMMDD. */
function formatBhavcopyDate(date: Date): string {
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const yyyy = date.getFullYear();
	return `${yyyy}${mm}${dd}`;
}

function extractSingleCsv(zipBuffer: Buffer): string {
	const zip = new AdmZip(zipBuffer);
	const entries = zip.getEntries();
	if (entries.length === 0) throw new Error('Bhavcopy zip contained no files');
	return entries[0].getData().toString('utf-8');
}

/**
 * UDiFF column names are abbreviated (TckrSymb, OpnPric, ...). Older
 * pre-2024-07-08 files use the legacy names (SYMBOL, OPEN, ...) — both are
 * read here via fallback so this keeps working against archived old dates.
 */
function parseEquityBhavcopyCsv(csv: string): EquityBhavcopyRow[] {
	const lines = csv.trim().split(/\r?\n/);
	if (lines.length < 2) return [];
	const headers = lines[0].split(',').map((h) => h.trim());

	const col = (row: Record<string, string>, ...names: string[]): string => {
		for (const name of names) if (row[name] !== undefined) return row[name];
		return '';
	};

	return lines.slice(1).map((line) => {
		const cells = line.split(',');
		const row: Record<string, string> = {};
		headers.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));

		return {
			symbol: col(row, 'TckrSymb', 'SYMBOL'),
			name: col(row, 'FinInstrmNm'),
			series: col(row, 'SctySrs', 'SERIES'),
			open: Number(col(row, 'OpnPric', 'OPEN')) || 0,
			high: Number(col(row, 'HghPric', 'HIGH')) || 0,
			low: Number(col(row, 'LwPric', 'LOW')) || 0,
			close: Number(col(row, 'ClsPric', 'CLOSE')) || 0,
			prevClose: Number(col(row, 'PrvsClsgPric', 'PREVCLOSE')) || 0,
			volume: Number(col(row, 'TtlTradgVol', 'TOTTRDQTY')) || 0,
			valueInLakhs: Number(col(row, 'TtlTrfVal', 'TOTTRDVAL')) || 0,
			date: col(row, 'TradDt', 'TIMESTAMP')
		} satisfies EquityBhavcopyRow;
	}).filter((r) => r.symbol);
}

/**
 * Downloads and parses the full-market equity bhavcopy for one trading day.
 * Throws (rather than returning empty) on weekends/holidays/dates with no
 * file, so callers can distinguish "no data published" from "parsed empty".
 */
export async function downloadEquityBhavcopy(date: Date): Promise<EquityBhavcopyRow[]> {
	const ds = formatBhavcopyDate(date);
	const zipBuffer = await nseFetchBinary(`/content/cm/BhavCopy_NSE_CM_0_0_0_${ds}_F_0000.csv.zip`);
	return parseEquityBhavcopyCsv(extractSingleCsv(zipBuffer));
}

export interface FnoBhavcopyRow {
	symbol: string;
	/** 'STF' = single-stock futures, 'STO' = single-stock options, 'IDF'/'IDO' = index variants. */
	instrumentType: string;
	expiryDate: string;
	/** 0 for futures rows. */
	strikePrice: number;
	/** 'CE' | 'PE' for options, '' for futures. */
	optionType: string;
	close: number;
	prevClose: number;
	/** Cash-market spot price NSE stamped on this contract's row — the equity bhavcopy close for the same symbol/day should roughly match. */
	underlyingPrice: number;
	openInterest: number;
	/** Absolute contract-count delta from previous day (verified live — NOT a percentage), despite FnoData.futuresOIChange downstream being a %. */
	changeInOpenInterest: number;
	volume: number;
}

function parseFnoBhavcopyCsv(csv: string): FnoBhavcopyRow[] {
	const lines = csv.trim().split(/\r?\n/);
	if (lines.length < 2) return [];
	const headers = lines[0].split(',').map((h) => h.trim());

	return lines.slice(1).map((line) => {
		const cells = line.split(',');
		const row: Record<string, string> = {};
		headers.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));

		return {
			symbol: row['TckrSymb'] ?? '',
			instrumentType: row['FinInstrmTp'] ?? '',
			expiryDate: row['XpryDt'] ?? '',
			strikePrice: Number(row['StrkPric']) || 0,
			optionType: row['OptnTp'] ?? '',
			close: Number(row['ClsPric']) || 0,
			prevClose: Number(row['PrvsClsgPric']) || 0,
			underlyingPrice: Number(row['UndrlygPric']) || 0,
			openInterest: Number(row['OpnIntrst']) || 0,
			changeInOpenInterest: Number(row['ChngInOpnIntrst']) || 0,
			volume: Number(row['TtlTradgVol']) || 0
		} satisfies FnoBhavcopyRow;
	}).filter((r) => r.symbol);
}

/** Same UDiFF format, F&O segment (futures + options full-market dump, all symbols/expiries/strikes for one day). */
export async function downloadFnoBhavcopy(date: Date): Promise<FnoBhavcopyRow[]> {
	const ds = formatBhavcopyDate(date);
	const zipBuffer = await nseFetchBinary(`/content/fo/BhavCopy_NSE_FO_0_0_0_${ds}_F_0000.csv.zip`);
	return parseFnoBhavcopyCsv(extractSingleCsv(zipBuffer));
}

/**
 * Bhavcopy is published per trading day and doesn't exist for
 * weekends/holidays/today-before-market-close. Walks backwards from today
 * until `fetchFn` succeeds, rather than assuming "today" has a file.
 */
export async function withLatestTradingDayFallback<T>(
	fetchFn: (date: Date) => Promise<T>,
	maxDaysBack = 7
): Promise<T> {
	const today = new Date();
	for (let i = 0; i < maxDaysBack; i++) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		try {
			return await fetchFn(d);
		} catch {
			// No file for this date — try the previous day.
		}
	}
	throw new Error(`No NSE bhavcopy found in the last ${maxDaysBack} days`);
}
