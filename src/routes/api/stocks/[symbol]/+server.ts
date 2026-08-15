import { json, error } from '@sveltejs/kit';
import { getStock } from '$lib/providers/mock-data';
import { getTechnicalSnapshot } from '$lib/providers/yahoo-finance';

export async function GET({ params, url }) {
	const analysis = getStock(params.symbol);
	if (!analysis) throw error(404, `Stock ${params.symbol} not found`);

	// Everything except `technical` (fundamentals, institutional, F&O, score,
	// entry/exit) is still mock — see src/lib/providers/README.md. Price and
	// technicals are real when the live fetch succeeds; on failure (rate
	// limit, network hiccup, delisted/renamed symbol) this falls back to the
	// mock technical block rather than breaking the page.
	// Pass ?live=false to force mock data (useful for demoing/comparing).
	if (url.searchParams.get('live') !== 'false') {
		try {
			const live = await getTechnicalSnapshot(analysis.symbol, analysis.exchange);
			analysis.technical = { ...analysis.technical, ...live };
			analysis.dataConfidence = Math.max(analysis.dataConfidence, 95);
		} catch (err) {
			console.warn(`[stocks/${params.symbol}] live Yahoo Finance fetch failed, serving mock technicals:`, err);
		}
	}

	return json(analysis);
}
