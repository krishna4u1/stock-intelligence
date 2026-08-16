/**
 * Builds a StockAnalysis for real NSE symbols that aren't part of the mock
 * dataset (mock-data.ts's STOCKS array), using ONLY live providers.
 *
 * Two tiers, depending on whether Screener.in has fundamentals for the
 * symbol (most do; falls back gracefully if not):
 *
 *  - dataMode 'LIVE_FUNDAMENTALS': price/technical/fundamentals are real,
 *    and score/rating/signals ARE genuinely computed from them via the same
 *    scoring engine mock-data.ts uses. Institutional activity has no live
 *    provider (NSE's live API is Akamai-blocked) and is scored as a
 *    NEUTRAL default (10/20, half of max) rather than 0 — 0 in
 *    scoreInstitutional() means "confirmed active selling", which "we have
 *    no data" is not the same claim as. sectorMacro is neutral (5/10) the
 *    same way — no live sector-rotation provider yet either.
 *  - dataMode 'LIVE_TECHNICAL_ONLY': Screener.in had nothing for this
 *    symbol either — falls back to price/technical only, fundamentals
 *    zeroed and clearly flagged, no score/rating computed at all (feeding
 *    scoreFundamental() a zeroed FundamentalData would produce a
 *    plausible-looking but meaningless number, worse than none).
 *
 * Neither tier fabricates narrative (whyBuy/tags/tier-checklists) — those
 * are hand-authored-style text in mock-data.ts's fixtures, not formulaic,
 * and aren't generated here.
 */
import type { StockAnalysis, FundamentalData, InstitutionalData, EntryTargetData, MarketCap, ScoreBreakdown } from '../types';
import { getTechnicalSnapshot, type YahooExchange } from './yahoo-finance';
import { getSymbolDirectory } from './nse/symbols';
import { getFnoSnapshot } from './nse/fno-snapshot';
import { getFundamentals } from './screener-in';
import { scoreFundamental, scoreTechnical, scoreFno, scoreRiskEvent, deriveRating, buildSignalConflicts } from '../engines/scoring';
import { calculateEntryTarget } from '../engines/entry-target';

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
		// isFno corrected 2026-08-16: verified live against F&O bhavcopy —
		// KAYNES has 151 active futures+options contracts. Originally set to
		// false without checking when this entry was first added. While
		// fixing this, also verified every other isFno flag below against
		// the same bhavcopy: ASTRAMICRO/SYRMA/LEAPIND/DAMCAPITAL all have 0
		// F&O contracts, so false was already correct for those. (BELRISE,
		// in mock-data.ts, was checked too — also correctly 0.)
		symbol: 'KAYNES', name: 'Kaynes Technology India Ltd',
		sector: 'Consumer Durables', industry: 'Electronics Manufacturing Services',
		exchange: 'NSE', marketCapType: 'MID', isFno: true
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
	},
	SBIN: {
		symbol: 'SBIN', name: 'State Bank of India',
		sector: 'Financial Services', industry: 'Public Sector Bank',
		exchange: 'NSE', marketCapType: 'LARGE', isFno: true
	},
	PARAS: {
		symbol: 'PARAS', name: 'Paras Defence and Space Technologies Ltd',
		sector: 'Capital Goods', industry: 'Aerospace & Defence Electronics',
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

const NEUTRAL_INSTITUTIONAL_SCORE = 10; // half of max 20 — "no data" modeled as neutral, not 0 ("confirmed selling")
const NEUTRAL_SECTOR_MACRO_SCORE = 5; // half of max 10 — no live sector-rotation provider yet

function classificationMissingNote(meta: LiveSymbolMeta): string[] {
	return meta.sector === 'Unknown'
		? ["Sector/industry/market-cap classification — this symbol isn't in the curated registry (LIVE_ONLY_SYMBOLS), only confirmed real via the NSE symbol directory"]
		: [];
}

export async function buildLiveOnlyAnalysis(meta: LiveSymbolMeta): Promise<StockAnalysis> {
	const liveTechnical = await getTechnicalSnapshot(meta.symbol, meta.exchange);
	const technical: StockAnalysis['technical'] = { ...liveTechnical, relativeStrengthVsSector3M: 0 };

	// F&O bhavcopy is unaffected by the Akamai block (separate, unprotected
	// host) — real for any symbol that actually has contracts. Failure here
	// (network hiccup, bhavcopy not yet published) degrades to the "not
	// available" message below rather than failing the whole page.
	let fno: StockAnalysis['fno'];
	let fnoMissingDataNote = 'F&O data — not available for this symbol';
	if (meta.isFno) {
		try {
			const snapshot = await getFnoSnapshot(meta.symbol);
			if (snapshot) {
				fno = snapshot;
				fnoMissingDataNote = 'F&O implied-volatility percentile — needs a historical IV time series a single day\'s bhavcopy can\'t provide (rest of F&O data above is live)';
			}
		} catch (err) {
			console.warn(`[live-stock] F&O bhavcopy fetch failed for ${meta.symbol}, showing without F&O data:`, err);
		}
	}

	let fundamentals: FundamentalData | null = null;
	try {
		fundamentals = await getFundamentals(meta.symbol);
	} catch (err) {
		console.warn(`[live-stock] Screener.in fetch failed for ${meta.symbol}, falling back to technical-only:`, err);
	}

	if (fundamentals) {
		return buildLiveFundamentalsAnalysis(meta, technical, fundamentals, fno, fnoMissingDataNote);
	}
	return buildTechnicalOnlyAnalysis(meta, technical, fno, fnoMissingDataNote);
}

/** Real fundamentals available — genuinely scored, not a placeholder. */
function buildLiveFundamentalsAnalysis(
	meta: LiveSymbolMeta,
	technical: StockAnalysis['technical'],
	fundamentals: FundamentalData,
	fno: StockAnalysis['fno'],
	fnoMissingDataNote: string
): StockAnalysis {
	const fundamentalScore = scoreFundamental(fundamentals);
	const technicalScore = scoreTechnical(technical);
	const fnoScore = scoreFno(fno);
	const riskEventScore = scoreRiskEvent(null, technical, fundamentals, technical.avgVolume20D);

	const score: ScoreBreakdown = {
		fundamental: fundamentalScore,
		institutional: NEUTRAL_INSTITUTIONAL_SCORE,
		technical: technicalScore,
		fno: fnoScore,
		sectorMacro: NEUTRAL_SECTOR_MACRO_SCORE,
		riskEvent: riskEventScore,
		total: Math.min(
			fundamentalScore + NEUTRAL_INSTITUTIONAL_SCORE + technicalScore + fnoScore + NEUTRAL_SECTOR_MACRO_SCORE + riskEventScore,
			100
		)
	};

	const rating = deriveRating(score, fundamentals, EMPTY_INSTITUTIONAL, technical, 'NEUTRAL', null);
	// buildSignalConflicts' generic note text ("Score 10/20") doesn't explain
	// *why* institutional/sectorMacro landed at exactly their neutral
	// midpoint — override those two notes so it reads as "no data" rather
	// than a real, if middling, signal.
	const signals = buildSignalConflicts(fundamentals, EMPTY_INSTITUTIONAL, technical, fno, 'NEUTRAL', score).map((s) => {
		if (s.dimension === 'Institutional') return { ...s, note: 'No live institutional data — scored neutral, not a real signal' };
		if (s.dimension === 'Sector / Macro') return { ...s, note: 'No live sector-rotation data — scored neutral, not a real signal' };
		return s;
	});

	return {
		symbol: meta.symbol,
		name: meta.name,
		sector: meta.sector,
		industry: meta.industry,
		marketCapType: meta.marketCapType,
		exchange: meta.exchange,
		isFno: meta.isFno,

		rating,
		score,
		signalScore: score.total,
		dataConfidence: 65,
		marketRegime: 'NEUTRAL',

		fundamental: fundamentals,
		institutional: EMPTY_INSTITUTIONAL,
		technical,
		fno,
		entry: calculateEntryTarget(technical, fundamentals, undefined),

		tags: [],
		tier1Checks: [],
		tier2Checks: [],
		tier3Checks: [],
		signals,
		whyBuy: [],
		whatCanGoWrong: [],
		whyNow: [],
		missingData: [
			'Institutional activity (FII/MF/DII, bulk/block deals) — NSE live API is blocked by Akamai Bot Manager; scored neutral rather than 0 (see providers/README.md)',
			'Sector/macro context — no live sector-rotation provider yet; scored neutral',
			fnoMissingDataNote,
			'Promoter pledge % — not exposed by the Screener.in scrape used here; assumed 0, which means "unconfirmed," not "verified no pledge"',
			'Sector-relative valuation — no peer/industry PE data (Screener.in loads it via a separate call this scrape doesn\'t follow), so the valuation sub-score defaults to "in line with sector" regardless of how cheap or expensive the stock actually is vs. peers — a genuinely low or high PE won\'t move this sub-score the way it would for a mock stock with real sector data',
			'Narrative signal tags and tier checklists — not generated for this path yet (Signal Analysis above is real; the tags/checklist sections mock stocks show are not)',
			...classificationMissingNote(meta)
		],
		eventRisks: [],

		scoreHistory: [],
		analysedAt: new Date().toISOString(),
		dataMode: 'LIVE_FUNDAMENTALS'
	};
}

/** No fundamentals available anywhere (Screener.in has nothing for this symbol either) — the original all-placeholder fallback. */
function buildTechnicalOnlyAnalysis(
	meta: LiveSymbolMeta,
	technical: StockAnalysis['technical'],
	fno: StockAnalysis['fno'],
	fnoMissingDataNote: string
): StockAnalysis {
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
		fno,
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
			'Fundamentals (revenue/PAT growth, ROE, PE, promoter holding) — Screener.in has no page for this symbol either',
			'Institutional activity (FII/MF/DII, bulk/block deals) — NSE live API is blocked by Akamai Bot Manager (see providers/README.md)',
			fnoMissingDataNote,
			"Rating/score not computed — the scoring engine needs fundamentals + institutional data this symbol doesn't have; price/technicals above are live",
			...classificationMissingNote(meta)
		],
		eventRisks: [],

		scoreHistory: [],
		analysedAt: new Date().toISOString(),
		dataMode: 'LIVE_TECHNICAL_ONLY'
	};
}
