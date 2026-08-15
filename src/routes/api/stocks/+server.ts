import { json } from '@sveltejs/kit';
import { getAllStocks } from '$lib/providers/mock-data';
import type { ScreenerFilters, StockSummary } from '$lib/types';

export async function GET({ url }) {
	const stocks = getAllStocks();

	// Parse filters from query params
	const filters: ScreenerFilters = {};
	const rating = url.searchParams.get('rating');
	if (rating) filters.rating = rating.split(',') as ScreenerFilters['rating'];

	const sector = url.searchParams.get('sector');
	if (sector) filters.sector = sector.split(',');

	const marketCap = url.searchParams.get('marketCap');
	if (marketCap) filters.marketCap = marketCap.split(',') as ScreenerFilters['marketCap'];

	const minScore = url.searchParams.get('minScore');
	if (minScore) filters.minScore = Number(minScore);

	const maxPe = url.searchParams.get('maxPe');
	if (maxPe) filters.maxPe = Number(maxPe);

	const fiiIncreasing = url.searchParams.get('fiiIncreasing');
	if (fiiIncreasing === 'true') filters.fiiIncreasing = true;

	const mfIncreasing = url.searchParams.get('mfIncreasing');
	if (mfIncreasing === 'true') filters.mfIncreasing = true;

	// Apply filters
	const filtered = stocks.filter((s) => {
		if (filters.rating && !filters.rating.includes(s.rating)) return false;
		if (filters.sector && !filters.sector.includes(s.sector)) return false;
		if (filters.marketCap && !filters.marketCap.includes(s.marketCapType)) return false;
		if (filters.minScore && s.signalScore < filters.minScore) return false;
		if (filters.maxPe && s.fundamental.pe > filters.maxPe) return false;
		if (filters.fiiIncreasing && s.institutional.fiiHolding <= s.institutional.fiiHoldingPrevQ) return false;
		if (filters.mfIncreasing && s.institutional.mfHolding <= s.institutional.mfHoldingPrevQ) return false;
		return true;
	});

	// Sort by score descending
	const sort = url.searchParams.get('sort') ?? 'score';
	filtered.sort((a, b) => {
		if (sort === 'score') return b.signalScore - a.signalScore;
		if (sort === 'change') return b.technical.changePct - a.technical.changePct;
		if (sort === 'revenue') return b.fundamental.revenueGrowthYoY - a.fundamental.revenueGrowthYoY;
		return b.signalScore - a.signalScore;
	});

	// Return summary view
	const summaries: StockSummary[] = filtered.map((s) => ({
		symbol: s.symbol,
		name: s.name,
		sector: s.sector,
		marketCapType: s.marketCapType,
		rating: s.rating,
		signalScore: s.signalScore,
		dataConfidence: s.dataConfidence,
		price: s.technical.price,
		changePct: s.technical.changePct,
		high52w: s.technical.high52w,
		low52w: s.technical.low52w,
		rsi: s.technical.rsi,
		pe: s.fundamental.pe,
		revenueGrowthYoY: s.fundamental.revenueGrowthYoY,
		patGrowthYoY: s.fundamental.patGrowthYoY,
		fiiHolding: s.institutional.fiiHolding,
		fiiHoldingChange: s.institutional.fiiHolding - s.institutional.fiiHoldingPrevQ,
		mfHolding: s.institutional.mfHolding,
		mfHoldingChange: s.institutional.mfHolding - s.institutional.mfHoldingPrevQ,
		promoterHolding: s.fundamental.promoterHolding,
		volumeRatio: s.technical.volumeRatio,
		fnoClass: s.fno?.fnoClass,
		tags: s.tags.slice(0, 4).map((t) => ({ emoji: t.emoji, label: t.label, sentiment: t.sentiment })),
		rrRatio: s.entry.rrRatio,
		topReason: s.whyBuy[0] ?? s.whatCanGoWrong[0] ?? ''
	}));

	return json(summaries);
}
