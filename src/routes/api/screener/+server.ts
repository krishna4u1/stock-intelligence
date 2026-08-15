import { json } from '@sveltejs/kit';
import { getAllStocks } from '$lib/providers/mock-data';
import type { Rating, MarketCap } from '$lib/types';

export async function POST({ request }) {
	const filters = await request.json();
	const stocks = getAllStocks();

	const filtered = stocks.filter((s) => {
		if (filters.ratings?.length && !filters.ratings.includes(s.rating)) return false;
		if (filters.sectors?.length && !filters.sectors.includes(s.sector)) return false;
		if (filters.marketCaps?.length && !filters.marketCaps.includes(s.marketCapType)) return false;
		if (filters.minScore != null && s.signalScore < filters.minScore) return false;
		if (filters.minRsi != null && s.technical.rsi < filters.minRsi) return false;
		if (filters.maxRsi != null && s.technical.rsi > filters.maxRsi) return false;
		if (filters.minRevenueGrowth != null && s.fundamental.revenueGrowthYoY < filters.minRevenueGrowth) return false;
		if (filters.minProfitGrowth != null && s.fundamental.patGrowthYoY < filters.minProfitGrowth) return false;
		if (filters.maxPe != null && s.fundamental.pe > filters.maxPe) return false;
		if (filters.minRoe != null && s.fundamental.roe < filters.minRoe) return false;
		if (filters.maxDebtEquity != null && s.fundamental.debtToEquity > filters.maxDebtEquity) return false;
		if (filters.fiiIncreasing && s.institutional.fiiHolding <= s.institutional.fiiHoldingPrevQ) return false;
		if (filters.mfIncreasing && s.institutional.mfHolding <= s.institutional.mfHoldingPrevQ) return false;
		if (filters.breakout && !s.technical.breakoutLevel) return false;
		if (filters.longBuildup && s.fno?.fnoClass !== 'LONG_BUILDUP') return false;
		if (filters.promoterPledgeBelow != null && s.fundamental.promoterPledge >= filters.promoterPledgeBelow) return false;
		if (filters.minRrRatio != null && s.entry.rrRatio < filters.minRrRatio) return false;
		return true;
	});

	filtered.sort((a, b) => b.signalScore - a.signalScore);

	return json(
		filtered.map((s) => ({
			symbol: s.symbol, name: s.name, sector: s.sector,
			marketCapType: s.marketCapType, rating: s.rating,
			signalScore: s.signalScore, dataConfidence: s.dataConfidence,
			price: s.technical.price, changePct: s.technical.changePct,
			high52w: s.technical.high52w, low52w: s.technical.low52w,
			rsi: s.technical.rsi, pe: s.fundamental.pe,
			revenueGrowthYoY: s.fundamental.revenueGrowthYoY,
			patGrowthYoY: s.fundamental.patGrowthYoY,
			fiiHolding: s.institutional.fiiHolding,
			fiiHoldingChange: s.institutional.fiiHolding - s.institutional.fiiHoldingPrevQ,
			mfHolding: s.institutional.mfHolding,
			mfHoldingChange: s.institutional.mfHolding - s.institutional.mfHoldingPrevQ,
			promoterHolding: s.fundamental.promoterHolding,
			volumeRatio: s.technical.volumeRatio,
			fnoClass: s.fno?.fnoClass,
			tags: s.tags.slice(0, 3).map((t) => ({ emoji: t.emoji, label: t.label, sentiment: t.sentiment })),
			rrRatio: s.entry.rrRatio,
			topReason: s.whyBuy[0] ?? s.whatCanGoWrong[0] ?? ''
		}))
	);
}
