import { json, error } from '@sveltejs/kit';
import { getStock } from '$lib/providers/mock-data';
import { getTechnicalSnapshot } from '$lib/providers/yahoo-finance';
import { resolveLiveOnlyMeta, buildLiveOnlyAnalysis } from '$lib/providers/live-stock';

export async function GET({ params, url }) {
	const symbol = params.symbol.toUpperCase();
	const analysis = getStock(symbol);

	// Not in the mock dataset — resolve against the live-only registry, then
	// (dynamically) the whole NSE symbol directory, before 404ing.
	if (!analysis) {
		const liveMeta = await resolveLiveOnlyMeta(symbol);
		if (!liveMeta) throw error(404, `Stock ${symbol} not found`);
		try {
			return json(await buildLiveOnlyAnalysis(liveMeta));
		} catch (err) {
			console.error(`[stocks/${symbol}] live-only fetch failed:`, err);
			throw error(502, `Live data fetch failed for ${symbol} — try again shortly`);
		}
	}

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
