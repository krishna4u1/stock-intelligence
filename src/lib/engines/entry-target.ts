import type { TechnicalData, FundamentalData, EntryTargetData } from '../types';

export function calculateEntryTarget(
	tech: TechnicalData,
	fund: FundamentalData,
	analystTarget?: number
): EntryTargetData {
	const price = tech.price;
	const atr = tech.atr;

	// ─── Entry Zone ────────────────────────────────────────────────────────
	let entryLow: number;
	let entryHigh: number;

	if (tech.breakoutLevel) {
		// Breakout setup: enter at or slightly above breakout
		entryLow = tech.breakoutLevel;
		entryHigh = tech.breakoutLevel * 1.02;
	} else if (price > tech.dma50) {
		// Trend following: enter near current price
		entryLow = price;
		entryHigh = price * 1.015;
	} else {
		// Pullback / value: enter near support
		entryLow = tech.supportLevel;
		entryHigh = tech.supportLevel * 1.02;
	}

	const entryMid = (entryLow + entryHigh) / 2;

	// ─── Stop Loss ─────────────────────────────────────────────────────────
	let stopLoss: number;
	let stopLossMethod: string;

	if (tech.breakoutLevel) {
		// Stop below the breakout candle's support
		const breakoutSupport = tech.breakoutLevel * 0.975;
		const atrStop = entryMid - 1.5 * atr;
		stopLoss = Math.max(breakoutSupport, atrStop);
		stopLossMethod = 'Below breakout level, adjusted with 1.5× ATR';
	} else if (price > tech.dma50) {
		// Stop below 50 DMA
		const dmaStop = tech.dma50 * 0.99;
		const atrStop = entryMid - 1.5 * atr;
		stopLoss = Math.max(dmaStop, atrStop);
		stopLossMethod = 'Below 50 DMA (1% buffer), ATR-adjusted';
	} else {
		// Structural support
		stopLoss = tech.supportLevel * 0.985;
		stopLossMethod = 'Below structural support level';
	}

	// ─── Short-term Targets ────────────────────────────────────────────────
	// T1: nearest resistance or ATR projection
	const atrProjection = entryMid + 2.5 * atr;
	const resistanceTarget = tech.resistanceLevel;
	const target1 = Math.min(atrProjection, resistanceTarget * 1.02);

	// T2: next swing high / larger resistance
	const target2 = target1 * 1.055;

	// ─── Long-term Target ──────────────────────────────────────────────────
	let targetLTLow: number;
	let targetLTHigh: number;
	let targetLTMethod: string;

	if (analystTarget) {
		targetLTLow = analystTarget * 0.95;
		targetLTHigh = analystTarget * 1.05;
		targetLTMethod = 'Based on analyst consensus target (±5% range)';
	} else {
		// EPS growth model: FY28 EPS at current growth rate × sector PE
		const epsGrowthFactor = Math.pow(1 + fund.epsGrowthYoY / 100, 2); // 2-year forward
		const targetPE = fund.sectorPeMedian * 1.05; // slight premium for quality
		const impliedEPS = (price / fund.pe) * epsGrowthFactor;
		const epsDerived = impliedEPS * targetPE;

		// Cross-check with historical range (52w high extended)
		const historicalDerived = tech.high52w * 1.25;

		targetLTLow = Math.min(epsDerived, historicalDerived);
		targetLTHigh = Math.max(epsDerived, historicalDerived);
		targetLTMethod = 'EPS growth × sector PE (2Y forward) vs historical extension';
	}

	// ─── Risk / Reward ─────────────────────────────────────────────────────
	const risk = entryMid - stopLoss;
	const rewardT1 = target1 - entryMid;
	const rewardLT = ((targetLTLow + targetLTHigh) / 2) - entryMid;

	const riskPct = (risk / entryMid) * 100;
	const rewardT1Pct = (rewardT1 / entryMid) * 100;
	const rewardLTPct = (rewardLT / entryMid) * 100;
	const rrRatio = risk > 0 ? rewardT1 / risk : 0;

	return {
		entryLow: round2(entryLow),
		entryHigh: round2(entryHigh),
		stopLoss: round2(stopLoss),
		stopLossMethod,
		target1: round2(target1),
		target2: round2(target2),
		targetLTLow: round2(targetLTLow),
		targetLTHigh: round2(targetLTHigh),
		targetLTMethod,
		riskPct: round2(riskPct),
		rewardT1Pct: round2(rewardT1Pct),
		rewardLTPct: round2(rewardLTPct),
		rrRatio: round2(rrRatio),
		setupInvalidationLevel: round2(stopLoss),
		setupInvalidationNote: `Daily close below ₹${round2(stopLoss)} invalidates the setup`
	};
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}
