/**
 * Builds a StockAnalysis for real NSE symbols that aren't part of the mock
 * dataset (mock-data.ts's STOCKS array), using ONLY live providers. Price
 * and technicals come from yahoo-finance.ts and are real. Fundamentals,
 * institutional activity, and F&O aren't backed by any live provider yet
 * (see providers/README.md — the NSE live API is blocked by Akamai, and no
 * fundamentals provider has been built) — those fields are zeroed
 * placeholders, NEVER meant to be rendered as real data. `dataMode:
 * 'LIVE_TECHNICAL_ONLY'` is the flag the UI must check before showing them;
 * `missingData` states the gap in plain language for the same reason.
 *
 * Score/rating are not computed for the same reason: scoreFundamental() and
 * scoreInstitutional() (src/lib/engines/scoring.ts) treat 0 as a real value
 * ("no debt", "no PE" fallback, etc.), so feeding them zeroed placeholders
 * would produce a plausible-looking but meaningless score — worse than no
 * score at all.
 */
import type { StockAnalysis, FundamentalData, InstitutionalData, EntryTargetData, MarketCap } from '../types';
import { getTechnicalSnapshot, type YahooExchange } from './yahoo-finance';
import { getSymbolDirectory } from './nse/symbols';

export interface LiveSymbolMeta {
	symbol: string;
	name: string;
	sector: string;
	industry: string;
	exchange: YahooExchange;
	/** Best-effort classification (no live market-cap source yet) — treat as approximate. */
	marketCapType: MarketCap;
	isFno: boolean;
}

/**
 * Ad-hoc registry of real symbols made browsable via /stocks/<symbol>
 * without mock fundamentals. Symbols + NSE tickers below were verified live
 * against NSE's own bhavcopy on 2026-08-15 (LEAPIND in particular is NOT
 * "LEAPINDIA" — worth double-checking any symbol you add here the same way
 * rather than guessing from the company name).
 */
export const LIVE_ONLY_SYMBOLS: Record<string, LiveSymbolMeta> = {
	ASTRAMICRO: {
		symbol: 'ASTRAMICRO', name: 'Astra Microwave Products Ltd',
		sector: 'Capital Goods', industry: 'Aerospace & Defence Electronics',
		exchange: 'NSE', marketCapType: 'MID', isFno: false
	},
	SYRMA: {
		symbol: 'SYRMA', name: 'Syrma SGS Technology Ltd',
		sector: 'Consumer Durables', industry: 'Electronics Manufacturing Services',
		exchange: 'NSE', marketCapType: 'MID', isFno: false
	},
	KAYNES: {
		symbol: 'KAYNES', name: 'Kaynes Technology India Ltd',
		sector: 'Consumer Durables', industry: 'Electronics Manufacturing Services',
		exchange: 'NSE', marketCapType: 'MID', isFno: false
	},
	LEAPIND: {
		symbol: 'LEAPIND', name: 'Leap India Ltd',
		sector: 'Industrials', industry: 'Supply Chain / Asset Pooling',
		exchange: 'NSE', marketCapType: 'SMALL', isFno: false
	},
	DAMCAPITAL: {
		symbol: 'DAMCAPITAL', name: 'DAM Capital Advisors Ltd',
		sector: 'Financial Services', industry: 'Investment Banking',
		exchange: 'NSE', marketCapType: 'SMALL', isFno: false
	}
};

/**
 * Resolves live-only metadata for a symbol: the curated registry above
 * (real sector/industry/marketCap classification) if we have it, otherwise
 * falls back to the NSE symbol directory (nse/symbols.ts, sourced from
 * bhavcopy) for just enough to confirm the symbol is real and get its name.
 * This is what lets the search box (which searches that same directory,
 * i.e. the whole NSE equity universe) not dead-end into a 404 on click for
 * anything outside the curated 5.
 */
export async function resolveLiveOnlyMeta(symbol: string): Promise<LiveSymbolMeta | null> {
	const curated = LIVE_ONLY_SYMBOLS[symbol];
	if (curated) return curated;

	try {
		const dir = await getSymbolDirectory();
		const found = dir.find((e) => e.symbol === symbol);
		if (!found) return null;
		return {
			symbol: found.symbol,
			name: found.name,
			sector: 'Unknown',
			industry: 'Unknown',
			exchange: 'NSE',
			marketCapType: 'MID', // best-effort default — no live market-cap source is wired up yet
			isFno: false
		};
	} catch {
		return null; // directory fetch failed — let the caller 404 rather than hang
	}
}

const EMPTY_FUNDAMENTAL: FundamentalData = {
	revenueGrowthYoY: 0, revenueGrowthQoQ: 0, patGrowthYoY: 0, ebitdaGrowthYoY: 0, epsGrowthYoY: 0,
	roe: 0, roce: 0, pe: 0, pb: 0, evEbitda: 0, peg: 0, debtToEquity: 0, interestCoverage: 0,
	operatingCashFlow: 0, freeCashFlow: 0, promoterHolding: 0, promoterHoldingPrevQ: 0, promoterPledge: 0,
	sectorPeMedian: 0, revenueLatest: 0, patLatest: 0, marketCap: 0, quarterReported: 'N/A', quarterUpdated: 'N/A'
};

const EMPTY_INSTITUTIONAL: InstitutionalData = {
	fiiHolding: 0, fiiHoldingPrevQ: 0, fiiHolding2QAgo: 0, mfHolding: 0, mfHoldingPrevQ: 0,
	diiHolding: 0, diiHoldingPrevQ: 0, recentBlockDeals: [], recentBulkDeals: [], brokerageRatings: [],
	managementGuidance: [], qipHistory: [], updatedAt: new Date().toISOString()
};

/**
 * A technical-only entry/stop/target — no fundamentals-derived long-term
 * target (that needs PE/EPS growth, which we don't have; entry-target.ts's
 * calculateEntryTarget() would divide by a zeroed fund.pe and produce
 * Infinity/NaN if called directly here, so this reimplements just the
 * ATR/support-resistance portion instead of reusing it).
 */
function buildLiveOnlyEntryTarget(tech: StockAnalysis['technical']): EntryTargetData {
	const price = tech.price;
	// Brand-new listings (e.g. LEAPIND, days-old) may not have 14 bars yet for a real ATR.
	const atr = tech.atr > 0 ? tech.atr : price * 0.02;

	const entryLow = price > tech.dma50 ? price : tech.supportLevel;
	const entryHigh = entryLow * 1.015;
	const entryMid = (entryLow + entryHigh) / 2;
	const stopLoss = Math.max(tech.supportLevel * 0.98, entryMid - 2 * atr);
	const target1 = entryMid + 2 * atr;
	const target2 = Math.max(tech.resistanceLevel, entryMid + 3 * atr);
	const riskPct = ((entryMid - stopLoss) / entryMid) * 100;
	const rewardT1Pct = ((target1 - entryMid) / entryMid) * 100;

	return {
		entryLow, entryHigh, stopLoss,
		stopLossMethod: '2x ATR below entry (floored at support) — fundamentals-based methods unavailable',
		target1, target2,
		targetLTLow: target2,
		targetLTHigh: target2 * 1.05,
		targetLTMethod: "Not computed — needs PE/EPS-growth fundamentals, which aren't available for this symbol",
		riskPct,
		rewardT1Pct,
		rewardLTPct: ((target2 - entryMid) / entryMid) * 100,
		rrRatio: riskPct > 0 ? rewardT1Pct / riskPct : 0,
		setupInvalidationLevel: stopLoss,
		setupInvalidationNote: 'Close below stop-loss on the daily chart invalidates this setup'
	};
}

export async function buildLiveOnlyAnalysis(meta: LiveSymbolMeta): Promise<StockAnalysis> {
	const liveTechnical = await getTechnicalSnapshot(meta.symbol, meta.exchange);
	const technical: StockAnalysis['technical'] = { ...liveTechnical, relativeStrengthVsSector3M: 0 };

	return {
		symbol: meta.symbol,
		name: meta.name,
		sector: meta.sector,
		industry: meta.industry,
		marketCapType: meta.marketCapType,
		exchange: meta.exchange,
		isFno: meta.isFno,

		rating: 'HOLD', // neutral placeholder — see missingData; this is NOT a real call
		score: { fundamental: 0, institutional: 0, technical: 0, fno: 0, sectorMacro: 0, riskEvent: 0, total: 0 },
		signalScore: 0,
		dataConfidence: 30,
		marketRegime: 'NEUTRAL',

		fundamental: EMPTY_FUNDAMENTAL,
		institutional: EMPTY_INSTITUTIONAL,
		technical,
		fno: undefined,
		entry: buildLiveOnlyEntryTarget(technical),

		tags: [],
		tier1Checks: [],
		tier2Checks: [],
		tier3Checks: [],
		signals: [],
		whyBuy: [],
		whatCanGoWrong: [],
		whyNow: [],
		missingData: [
			'Fundamentals (revenue/PAT growth, ROE, PE, promoter holding) — no live provider integrated yet',
			'Institutional activity (FII/MF/DII, bulk/block deals) — NSE live API is blocked by Akamai Bot Manager (see providers/README.md)',
			'F&O data — not available for this symbol',
			"Rating/score not computed — the scoring engine needs fundamentals + institutional data this symbol doesn't have; price/technicals above are live",
			...(meta.sector === 'Unknown'
				? ["Sector/industry/market-cap classification — this symbol isn't in the curated registry (LIVE_ONLY_SYMBOLS), only confirmed real via the NSE symbol directory"]
				: [])
		],
		eventRisks: [],

		scoreHistory: [],
		analysedAt: new Date().toISOString(),
		dataMode: 'LIVE_TECHNICAL_ONLY'
	};
}
