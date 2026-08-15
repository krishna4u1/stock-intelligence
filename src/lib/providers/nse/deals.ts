/**
 * Bulk / block / short-selling deals from nseindia.com.
 * Covers the ShareholdingProvider role's deal-flow piece — feeds
 * InstitutionalData.recentBlockDeals / recentBulkDeals in src/lib/types.
 */
import { nseFetch } from './http';
import type { BlockDeal, BulkDeal } from '../../types';

export type DealType = 'bulk_deals' | 'block_deals' | 'short_deals';

interface RawDealRow {
	BD_SYMBOL?: string;
	BD_SCRIP_NAME?: string;
	BD_CLIENT_NAME?: string;
	BD_BUY_SELL?: string;
	BD_QTY_TRD?: string | number;
	BD_TP_WATP?: string | number; // trade price
	BD_DT_DATE?: string;
	BD_REMARKS?: string;
}

/**
 * GET /api/historicalOR/bulk-block-short-deals
 * Param names on this endpoint are the least stable part of NSE's unofficial
 * API surface — `from`/`to` here is a best guess based on the sibling
 * historical endpoints (indicesHistory, foCPV, vixhistory) which all use
 * `from`/`to`. If this 400s, open nseindia.com/report-detail/display-bulk-and-block-deals,
 * watch the Network tab for the actual request, and adjust the param keys.
 *
 * @param fromDate DD-MM-YYYY
 * @param toDate   DD-MM-YYYY (NSE caps the range at ~1 year)
 */
export async function getLargeDeals(
	type: DealType,
	fromDate: string,
	toDate: string,
	symbol?: string
): Promise<RawDealRow[]> {
	const res = await nseFetch<{ data?: RawDealRow[] } | RawDealRow[]>('/api/historicalOR/bulk-block-short-deals', {
		params: { type, from: fromDate, to: toDate, symbol }
	});
	return Array.isArray(res) ? res : (res.data ?? []);
}

function toValueInCr(qty: number, price: number): number {
	return (qty * price) / 1e7; // qty * price is in ₹, 1 Cr = 1e7 ₹
}

export async function getBulkDeals(fromDate: string, toDate: string, symbol?: string): Promise<BulkDeal[]> {
	const rows = await getLargeDeals('bulk_deals', fromDate, toDate, symbol);
	return rows.map((r) => {
		const shares = Number(r.BD_QTY_TRD ?? 0);
		const price = Number(r.BD_TP_WATP ?? 0);
		return {
			date: r.BD_DT_DATE ?? '',
			client: r.BD_CLIENT_NAME ?? 'Unknown',
			buySell: (r.BD_BUY_SELL ?? 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
			price,
			shares,
			valueInCr: toValueInCr(shares, price)
		} satisfies BulkDeal;
	});
}

export async function getBlockDeals(fromDate: string, toDate: string, symbol?: string): Promise<BlockDeal[]> {
	const rows = await getLargeDeals('block_deals', fromDate, toDate, symbol);
	return rows.map((r) => {
		const shares = Number(r.BD_QTY_TRD ?? 0);
		const price = Number(r.BD_TP_WATP ?? 0);
		const isBuy = (r.BD_BUY_SELL ?? 'BUY').toUpperCase() !== 'SELL';
		return {
			date: r.BD_DT_DATE ?? '',
			buyer: isBuy ? (r.BD_CLIENT_NAME ?? 'Unknown') : 'Unknown',
			seller: isBuy ? 'Unknown' : (r.BD_CLIENT_NAME ?? 'Unknown'),
			price,
			shares,
			valueInCr: toValueInCr(shares, price),
			// NSE's raw feed doesn't classify counterparty type — default to
			// UNKNOWN rather than guess; classify downstream if you can
			// cross-reference the client name against a known institution list.
			buyerType: 'UNKNOWN',
			sentiment: 'NEUTRAL'
		} satisfies BlockDeal;
	});
}
