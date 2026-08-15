import type {
	FundamentalData, InstitutionalData, TechnicalData, FnoData,
	ScoreBreakdown, Rating, MarketRegime, SignalConflict, SignalStatus
} from '../types';

// ─── Fundamental Engine (max 30) ──────────────────────────────────────────────

export function scoreFundamental(d: FundamentalData): number {
	let score = 0;

	// Revenue growth (max 6)
	if (d.revenueGrowthYoY >= 25) score += 6;
	else if (d.revenueGrowthYoY >= 20) score += 5;
	else if (d.revenueGrowthYoY >= 15) score += 4;
	else if (d.revenueGrowthYoY >= 10) score += 3;
	else if (d.revenueGrowthYoY >= 5) score += 2;
	else if (d.revenueGrowthYoY >= 0) score += 1;

	// PAT growth (max 6)
	if (d.patGrowthYoY >= 35) score += 6;
	else if (d.patGrowthYoY >= 25) score += 5;
	else if (d.patGrowthYoY >= 20) score += 4;
	else if (d.patGrowthYoY >= 15) score += 3;
	else if (d.patGrowthYoY >= 5) score += 2;
	else if (d.patGrowthYoY >= 0) score += 1;

	// ROE / ROCE quality (max 4)
	const avgReturn = (d.roe + d.roce) / 2;
	if (avgReturn >= 25) score += 4;
	else if (avgReturn >= 20) score += 3;
	else if (avgReturn >= 15) score += 2;
	else if (avgReturn >= 10) score += 1;

	// Valuation vs sector (max 5)
	score += scoreValuation(d);

	// Debt / cash-flow quality (max 4)
	if (d.debtToEquity < 0.3 && d.freeCashFlow > 0 && d.interestCoverage > 8) score += 4;
	else if (d.debtToEquity < 0.5 && d.operatingCashFlow > 0 && d.interestCoverage > 5) score += 3;
	else if (d.debtToEquity < 1.0 && d.interestCoverage > 3) score += 2;
	else if (d.debtToEquity < 2.0) score += 1;

	// Promoter quality (max 3)
	const holdingStable = d.promoterHolding >= d.promoterHoldingPrevQ - 0.5;
	if (d.promoterPledge < 5 && holdingStable) score += 3;
	else if (d.promoterPledge < 10) score += 2;
	else if (d.promoterPledge < 20) score += 1;

	return Math.min(Math.round(score), 30);
}

function scoreValuation(d: FundamentalData): number {
	if (!d.pe || d.pe <= 0) return 2; // no PE data
	const ratio = d.pe / d.sectorPeMedian;
	const growthPremiumJustified = d.patGrowthYoY >= 20;

	if (ratio < 0.6) return 5; // deeply undervalued
	if (ratio < 0.8) return 4;
	if (ratio < 1.0) return 3;
	if (ratio < 1.2 && growthPremiumJustified) return 3; // growth premium ok
	if (ratio < 1.4 && growthPremiumJustified) return 2;
	if (ratio < 1.5) return 1;
	return 0; // very expensive
}

// ─── Institutional Engine (max 20) ────────────────────────────────────────────

export function scoreInstitutional(d: InstitutionalData): number {
	let score = 0;

	// FII accumulation (max 5)
	const fiiChange2Q = d.fiiHolding - d.fiiHolding2QAgo;
	const fiiChange1Q = d.fiiHolding - d.fiiHoldingPrevQ;
	if (fiiChange2Q > 2 && fiiChange1Q > 0) score += 5;
	else if (fiiChange2Q > 1 && fiiChange1Q > 0) score += 4;
	else if (fiiChange1Q > 0.5) score += 3;
	else if (fiiChange1Q > 0) score += 2;
	else if (fiiChange1Q > -0.5) score += 1;

	// MF + DII accumulation (max 4)
	const mfChange = d.mfHolding - d.mfHoldingPrevQ;
	const diiChange = d.diiHolding - d.diiHoldingPrevQ;
	if (mfChange > 0.5 && diiChange > 0) score += 4;
	else if (mfChange > 0.2) score += 3;
	else if (mfChange > 0) score += 2;
	else if (mfChange > -0.3) score += 1;

	// Block / bulk deals (max 3)
	const institutionalBuys = d.recentBlockDeals.filter(
		(b) => b.buyerType === 'INSTITUTIONAL' && b.sentiment === 'BULLISH'
	).length;
	const institutionalSells = d.recentBlockDeals.filter(
		(b) => b.sentiment === 'BEARISH'
	).length;
	if (institutionalBuys > 0 && institutionalSells === 0) score += 3;
	else if (institutionalBuys > 0) score += 1;
	else if (institutionalSells > 1) score -= 2;

	// Brokerage upgrades (max 3)
	const upgrades = d.brokerageRatings.filter(
		(r) => r.action === 'UPGRADED' || r.action === 'INITIATED'
	).length;
	const downgrades = d.brokerageRatings.filter((r) => r.action === 'DOWNGRADED').length;
	if (upgrades >= 2 && downgrades === 0) score += 3;
	else if (upgrades >= 1 && downgrades === 0) score += 2;
	else if (upgrades >= 1) score += 1;
	else if (downgrades > 0) score -= 1;

	// Management guidance (max 3)
	const raised = d.managementGuidance.filter((g) => g.direction === 'RAISED').length;
	const lowered = d.managementGuidance.filter((g) => g.direction === 'LOWERED').length;
	if (raised > 0 && lowered === 0) score += 3;
	else if (raised > 0) score += 1;
	else if (lowered > 0) score -= 1;

	// QIP / institutional ownership (max 2)
	if (d.qipHistory.length > 0) score += 2;
	else if (d.fiiHolding + d.mfHolding > 30) score += 1;

	return Math.min(Math.max(Math.round(score), 0), 20);
}

// ─── Technical Engine (max 25) ────────────────────────────────────────────────

export function scoreTechnical(d: TechnicalData): number {
	let score = 0;

	// DMA trend structure (max 6)
	const aboveDma50 = d.price > d.dma50;
	const aboveDma200 = d.price > d.dma200;
	const dma50Rising = d.dma50 > d.dma200;
	if (aboveDma50 && aboveDma200 && dma50Rising) score += 6;
	else if (aboveDma50 && dma50Rising) score += 4;
	else if (aboveDma50) score += 3;
	else if (aboveDma200) score += 1;

	// Breakout quality (max 5)
	if (d.breakoutLevel) {
		const breakoutValid = d.price > d.breakoutLevel;
		if (breakoutValid && d.volumeRatio >= 2) score += 5;
		else if (breakoutValid && d.volumeRatio >= 1.5) score += 4;
		else if (breakoutValid) score += 3;
	} else {
		// No active breakout — check proximity to 52w high
		const dist52wHigh = (d.high52w - d.price) / d.high52w;
		if (dist52wHigh < 0.05) score += 3;
		else if (dist52wHigh < 0.10) score += 2;
		else if (dist52wHigh < 0.20) score += 1;
	}

	// Volume confirmation (max 5)
	if (d.volumeRatio >= 2.5) score += 5;
	else if (d.volumeRatio >= 2.0) score += 4;
	else if (d.volumeRatio >= 1.5) score += 3;
	else if (d.volumeRatio >= 1.2) score += 2;
	else if (d.volumeRatio >= 1.0) score += 1;

	// RSI (max 3)
	if (d.rsi >= 50 && d.rsi <= 65) score += 3;
	else if (d.rsi >= 45 && d.rsi < 50) score += 2;
	else if (d.rsi > 65 && d.rsi <= 72) score += 2;
	else if (d.rsi > 72) score += 1; // overbought risk
	else score += 1; // below 45 — weak

	// Relative strength vs NIFTY 3M (max 4)
	const rs = d.relativeStrengthVsNifty3M;
	if (rs >= 20) score += 4;
	else if (rs >= 12) score += 3;
	else if (rs >= 6) score += 2;
	else if (rs >= 0) score += 1;

	// Momentum: MACD + ADX (max 2)
	if (d.macdHist > 0 && d.adx > 25) score += 2;
	else if (d.macdHist > 0 || d.adx > 25) score += 1;

	return Math.min(Math.round(score), 25);
}

// ─── F&O Engine (max 10) ──────────────────────────────────────────────────────

export function scoreFno(d: FnoData | undefined): number {
	if (!d) return 5; // neutral when no data

	let score = 0;

	// Futures buildup (max 4)
	if (d.fnoClass === 'LONG_BUILDUP') score += 4;
	else if (d.fnoClass === 'SHORT_COVERING') score += 3;
	else if (d.fnoClass === 'NEUTRAL') score += 2;
	else if (d.fnoClass === 'LONG_UNWINDING') score += 1;
	else score += 0; // SHORT_BUILDUP

	// OI / price confirmation (max 3)
	if (d.futuresOIChange > 10 && d.futuresBasis > 0) score += 3;
	else if (d.futuresOIChange > 5 && d.futuresBasis > 0) score += 2;
	else if (d.futuresBasis > 0) score += 1;

	// Options positioning (max 3)
	const pcrBullish = d.pcr >= 0.8 && d.pcr <= 1.2; // balanced to slightly bearish = contrarian bullish
	const maxPainAbove = d.maxPain > 0; // price can gravitate up to max pain
	if (pcrBullish && maxPainAbove) score += 3;
	else if (pcrBullish || maxPainAbove) score += 2;
	else score += 1;

	return Math.min(Math.round(score), 10);
}

// ─── Sector / Macro Engine (max 10) ───────────────────────────────────────────

export function scoreSectorMacro(
	sectorChange3M: number,
	sectorRS: number,
	regime: MarketRegime
): number {
	let score = 0;

	// Sector momentum (max 4)
	if (sectorChange3M >= 15) score += 4;
	else if (sectorChange3M >= 8) score += 3;
	else if (sectorChange3M >= 3) score += 2;
	else if (sectorChange3M >= -3) score += 1;

	// Market regime (max 3)
	if (regime === 'STRONG_BULL') score += 3;
	else if (regime === 'BULL') score += 2;
	else if (regime === 'NEUTRAL') score += 1;
	else if (regime === 'BEAR') score += 0;
	else score -= 1; // STRONG_BEAR

	// Macro tailwind / sector RS (max 3)
	if (sectorRS >= 10) score += 3;
	else if (sectorRS >= 5) score += 2;
	else if (sectorRS >= 0) score += 1;

	return Math.min(Math.max(Math.round(score), 0), 10);
}

// ─── Risk / Event Engine (max 5, can reduce) ──────────────────────────────────

export function scoreRiskEvent(
	daysToEarnings: number | null,
	tech: TechnicalData,
	fund: FundamentalData,
	avgDailyVolume: number
): number {
	let score = 5; // start full, deduct for risks

	if (daysToEarnings !== null && daysToEarnings <= 5) score -= 2;
	else if (daysToEarnings !== null && daysToEarnings <= 10) score -= 1;

	if (tech.beta > 1.8) score -= 1;

	if (avgDailyVolume < 500_000) score -= 1; // thin liquidity

	if (fund.debtToEquity > 2 || fund.promoterPledge > 20) score -= 1;

	return Math.max(score, 0);
}

// ─── Master Scoring Engine ─────────────────────────────────────────────────────

export function calculateScore(params: {
	fundamental: FundamentalData;
	institutional: InstitutionalData;
	technical: TechnicalData;
	fno?: FnoData;
	sectorChange3M: number;
	sectorRS: number;
	regime: MarketRegime;
	daysToEarnings: number | null;
	avgDailyVolume: number;
}): ScoreBreakdown {
	const fundamental = scoreFundamental(params.fundamental);
	const institutional = scoreInstitutional(params.institutional);
	const technical = scoreTechnical(params.technical);
	const fno = scoreFno(params.fno);
	const sectorMacro = scoreSectorMacro(params.sectorChange3M, params.sectorRS, params.regime);
	const riskEvent = scoreRiskEvent(
		params.daysToEarnings,
		params.technical,
		params.fundamental,
		params.avgDailyVolume
	);

	const total = Math.min(fundamental + institutional + technical + fno + sectorMacro + riskEvent, 100);

	return { fundamental, institutional, technical, fno, sectorMacro, riskEvent, total };
}

// ─── Rating Gate Logic ────────────────────────────────────────────────────────

export function deriveRating(
	score: ScoreBreakdown,
	fund: FundamentalData,
	inst: InstitutionalData,
	tech: TechnicalData,
	regime: MarketRegime,
	daysToEarnings: number | null
): Rating {
	const total = score.total;

	// Red flags that prevent strong signals
	const accountingRedFlag = fund.freeCashFlow < 0 && fund.patGrowthYoY > 50; // earnings without cash = risk
	const pledgeRisk = fund.promoterPledge > 30;
	const debtRisk = fund.debtToEquity > 3;
	const extremeEarningsRisk = daysToEarnings !== null && daysToEarnings <= 2;

	// Tier 1 checks
	const aboveDma50 = tech.price > tech.dma50;
	const rsiInRange = tech.rsi >= 45 && tech.rsi <= 72;
	const volumeOk = tech.volumeRatio >= 1.5;
	const tier1Pass = aboveDma50 && rsiInRange;

	// Gate checks for STRONG_BUY
	if (total >= 88) {
		if (accountingRedFlag || pledgeRisk || debtRisk || extremeEarningsRisk) return 'BUY';
		if (regime === 'STRONG_BEAR' && tech.relativeStrengthVsNifty3M < 15) return 'BUY';
		if (!tier1Pass) return 'BUY';
		const confirmations = [
			inst.fiiHolding > inst.fiiHoldingPrevQ,
			inst.mfHolding > inst.mfHoldingPrevQ,
			tech.breakoutLevel !== undefined,
			tech.volumeRatio >= 1.5,
			tech.relativeStrengthVsNifty3M > 5
		].filter(Boolean).length;
		if (confirmations < 2) return 'BUY';
		return 'STRONG_BUY';
	}

	if (total >= 75) return 'BUY';
	if (total >= 60) return 'HOLD';
	if (total >= 40) return 'SELL';
	return 'STRONG_SELL';
}

// ─── Signal Conflict Engine ────────────────────────────────────────────────────

export function buildSignalConflicts(
	fund: FundamentalData,
	inst: InstitutionalData,
	tech: TechnicalData,
	fno: FnoData | undefined,
	regime: MarketRegime,
	scores: ScoreBreakdown
): SignalConflict[] {
	const conflicts: SignalConflict[] = [];

	const fundamentalSignal = scores.fundamental >= 20 ? 'POSITIVE' : scores.fundamental >= 12 ? 'NEUTRAL' : 'NEGATIVE';
	const fundamentalStatus: SignalStatus = scores.fundamental >= 18 ? 'CONFIRMED' : scores.fundamental >= 12 ? 'PARTIAL' : 'WEAK';
	conflicts.push({ dimension: 'Fundamentals', signal: fundamentalSignal, status: fundamentalStatus, note: `Score ${scores.fundamental}/30` });

	const techSignal = scores.technical >= 18 ? 'POSITIVE' : scores.technical >= 11 ? 'NEUTRAL' : 'NEGATIVE';
	const techStatus: SignalStatus = scores.technical >= 18 ? 'CONFIRMED' : scores.technical >= 11 ? 'PARTIAL' : 'WEAK';
	conflicts.push({ dimension: 'Technical', signal: techSignal, status: techStatus, note: `Score ${scores.technical}/25` });

	const instSignal = scores.institutional >= 14 ? 'POSITIVE' : scores.institutional >= 8 ? 'NEUTRAL' : 'NEGATIVE';
	const instStatus: SignalStatus = scores.institutional >= 14 ? 'CONFIRMED' : scores.institutional >= 8 ? 'PARTIAL' : 'WEAK';
	conflicts.push({ dimension: 'Institutional', signal: instSignal, status: instStatus, note: `Score ${scores.institutional}/20` });

	if (fno) {
		const fnoSignal = scores.fno >= 7 ? 'POSITIVE' : scores.fno >= 4 ? 'NEUTRAL' : 'NEGATIVE';
		const fnoStatus: SignalStatus = scores.fno >= 7 ? 'CONFIRMED' : scores.fno >= 4 ? 'PARTIAL' : 'WEAK';
		conflicts.push({ dimension: 'F&O', signal: fnoSignal, status: fnoStatus, note: `Score ${scores.fno}/10` });
	} else {
		conflicts.push({ dimension: 'F&O', signal: 'NEUTRAL', status: 'INSUFFICIENT', note: 'Not an F&O stock' });
	}

	const valuationPE = fund.pe / fund.sectorPeMedian;
	const valSignal = valuationPE < 1 ? 'POSITIVE' : valuationPE < 1.3 ? 'NEUTRAL' : 'NEGATIVE';
	conflicts.push({
		dimension: 'Valuation',
		signal: valSignal,
		status: 'CONFIRMED',
		note: `PE ${fund.pe.toFixed(1)}x vs sector ${fund.sectorPeMedian.toFixed(1)}x`
	});

	const sectorSignal = scores.sectorMacro >= 7 ? 'POSITIVE' : scores.sectorMacro >= 4 ? 'NEUTRAL' : 'NEGATIVE';
	conflicts.push({ dimension: 'Sector / Macro', signal: sectorSignal, status: 'CONFIRMED', note: `Score ${scores.sectorMacro}/10` });

	return conflicts;
}
