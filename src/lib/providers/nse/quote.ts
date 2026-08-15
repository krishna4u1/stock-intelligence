/**
 * Live equity quote from nseindia.com's own frontend API.
 * Covers the MarketDataProvider role (as an alternative/cross-check to Yahoo
 * Finance) with NSE as the primary-market source of truth.
 */
import { nseFetch } from './http';

// Loosely typed: NSE's response has many more fields than we use, and the
// exact shape has drifted over past redesigns. Only the fields we read are
// declared; everything else passes through as `unknown`.
interface RawEquityQuote {
	info?: { symbol?: string; companyName?: string };
	priceInfo?: {
		lastPrice?: number;
		change?: number;
		pChange?: number;
		open?: number;
		close?: number; // previous close
		intraDayHighLow?: { min?: number; max?: number };
		weekHighLow?: { min?: number; max?: number };
	};
	securityWiseDP?: {
		quantityTraded?: number;
	};
}

export interface NseQuoteSnapshot {
	symbol: string;
	name: string | null;
	price: number;
	open: number;
	prevClose: number;
	change: number;
	changePct: number;
	dayLow: number;
	dayHigh: number;
	low52w: number;
	high52w: number;
	volume: number;
	updatedAt: string;
}

/**
 * GET /api/quote-equity?symbol=X
 * The long-standing, widely-used quote endpoint. NSE has also rolled out a
 * `/NextApi/apiClient/GetQuoteApi` variant on parts of the site — if this
 * endpoint starts 404ing, that's the one to check as a replacement.
 */
export async function getEquityQuote(symbol: string): Promise<NseQuoteSnapshot> {
	const raw = await nseFetch<RawEquityQuote>('/api/quote-equity', { params: { symbol } });

	const price = raw.priceInfo ?? {};
	const prevClose = price.close ?? 0;
	const lastPrice = price.lastPrice ?? 0;

	return {
		symbol: raw.info?.symbol ?? symbol,
		name: raw.info?.companyName ?? null,
		price: lastPrice,
		open: price.open ?? 0,
		prevClose,
		change: price.change ?? lastPrice - prevClose,
		changePct: price.pChange ?? (prevClose ? ((lastPrice - prevClose) / prevClose) * 100 : 0),
		dayLow: price.intraDayHighLow?.min ?? 0,
		dayHigh: price.intraDayHighLow?.max ?? 0,
		low52w: price.weekHighLow?.min ?? 0,
		high52w: price.weekHighLow?.max ?? 0,
		volume: raw.securityWiseDP?.quantityTraded ?? 0,
		updatedAt: new Date().toISOString()
	};
}

/**
 * GET /api/quote-equity?symbol=X&section=trade_info — adds delivery %,
 * market-lot and total traded value not present on the base quote.
 * Returned as-is (raw, unmapped) since its shape doesn't line up with any
 * single field group in src/lib/types — pull what you need from it directly.
 */
export async function getEquityTradeInfo(symbol: string): Promise<unknown> {
	return nseFetch('/api/quote-equity', { params: { symbol, section: 'trade_info' } });
}
