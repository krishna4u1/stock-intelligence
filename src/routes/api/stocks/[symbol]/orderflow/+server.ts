import { json, error } from '@sveltejs/kit';
import { getOrderFlowHistory } from '$lib/providers/nse/delivery';

/** Order flow (price/volume/delivery-%) for the last N trading days. Works for any NSE symbol — mock or live-only — since it's independent of fundamentals. */
export async function GET({ params, url }) {
	const days = Number(url.searchParams.get('days')) || 10;
	try {
		const rows = await getOrderFlowHistory(params.symbol.toUpperCase(), days);
		return json(rows);
	} catch (err) {
		console.error(`[orderflow/${params.symbol}] fetch failed:`, err);
		throw error(502, `Order flow data unavailable for ${params.symbol} — try again shortly`);
	}
}
