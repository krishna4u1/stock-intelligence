/**
 * F&O snapshot computed from NSE's daily F&O bhavcopy (EOD futures +
 * options dump — official, key-free, unaffected by the Akamai block on
 * NSE's live option-chain API). Covers the FnoProvider role for any symbol
 * that actually has F&O contracts.
 *
 * One gap vs. a live option-chain feed: `ivPercentile` needs a *historical*
 * distribution of implied volatility, which a single day's bhavcopy can't
 * supply on its own — left at 0 with that documented rather than guessed.
 */
import { downloadFnoBhavcopy, withLatestTradingDayFallback, type FnoBhavcopyRow } from './bhavcopy';
import type { FnoData, FnoClass } from '../../types';

/**
 * Max pain: the strike at which option WRITERS collectively lose the least
 * if the underlying expires there. Same formula as nse/option-chain.ts
 * (the live-API version, currently unreachable behind Akamai) — duplicated
 * rather than shared because the input shapes differ enough (raw bhavcopy
 * rows vs. the live API's nested CE/PE-per-strike shape) that a shared
 * helper would need its own translation layer for little benefit.
 */
function computeMaxPain(strikes: { strike: number; callOI: number; putOI: number }[]): number {
	if (strikes.length === 0) return 0;

	let minPain = Infinity;
	let maxPainStrike = strikes[0].strike;

	for (const candidate of strikes) {
		const expiryPrice = candidate.strike;
		let totalPain = 0;
		for (const row of strikes) {
			if (expiryPrice > row.strike) totalPain += (expiryPrice - row.strike) * row.callOI;
			if (expiryPrice < row.strike) totalPain += (row.strike - expiryPrice) * row.putOI;
		}
		if (totalPain < minPain) {
			minPain = totalPain;
			maxPainStrike = expiryPrice;
		}
	}

	return maxPainStrike;
}

function classifyFno(priceUp: boolean, oiUp: boolean): FnoClass {
	if (priceUp && oiUp) return 'LONG_BUILDUP';
	if (priceUp && !oiUp) return 'SHORT_COVERING';
	if (!priceUp && oiUp) return 'SHORT_BUILDUP';
	return 'LONG_UNWINDING';
}

/**
 * Returns null (not throws) when the symbol has no F&O contracts on the
 * fetched day — callers should treat that as "genuinely not in F&O" rather
 * than a fetch failure, and fall back accordingly.
 */
export async function getFnoSnapshot(symbol: string): Promise<FnoData | null> {
	const allRows = await withLatestTradingDayFallback(downloadFnoBhavcopy);
	const rows = allRows.filter((r) => r.symbol === symbol);
	if (rows.length === 0) return null;

	const futures = rows
		.filter((r) => r.instrumentType === 'STF')
		.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
	const nearMonth = futures[0];
	if (!nearMonth) return null; // options-only listing with no futures leg — treat as unusable for this shape

	const options = rows.filter((r) => r.instrumentType === 'STO' && r.expiryDate === nearMonth.expiryDate);
	const byStrike = new Map<number, { callOI: number; putOI: number }>();
	let totalCallOI = 0;
	let totalPutOI = 0;
	let topCall = { strike: 0, oi: -1 };
	let topPut = { strike: 0, oi: -1 };

	for (const o of options) {
		const entry = byStrike.get(o.strikePrice) ?? { callOI: 0, putOI: 0 };
		if (o.optionType === 'CE') {
			entry.callOI += o.openInterest;
			totalCallOI += o.openInterest;
			if (entry.callOI > topCall.oi) topCall = { strike: o.strikePrice, oi: entry.callOI };
		} else if (o.optionType === 'PE') {
			entry.putOI += o.openInterest;
			totalPutOI += o.openInterest;
			if (entry.putOI > topPut.oi) topPut = { strike: o.strikePrice, oi: entry.putOI };
		}
		byStrike.set(o.strikePrice, entry);
	}

	const priceUp = nearMonth.close >= nearMonth.prevClose;
	const prevOI = nearMonth.openInterest - nearMonth.changeInOpenInterest;
	const oiUp = nearMonth.changeInOpenInterest >= 0;

	return {
		futuresPrice: nearMonth.close,
		futuresOI: nearMonth.openInterest,
		futuresOIChange: prevOI > 0 ? (nearMonth.changeInOpenInterest / prevOI) * 100 : 0,
		futuresBasis: nearMonth.underlyingPrice ? ((nearMonth.close - nearMonth.underlyingPrice) / nearMonth.underlyingPrice) * 100 : 0,
		fnoClass: classifyFno(priceUp, oiUp),
		pcr: totalCallOI > 0 ? totalPutOI / totalCallOI : 0,
		maxPain: computeMaxPain([...byStrike.entries()].map(([strike, v]) => ({ strike, ...v }))),
		callOIAtResistance: topCall.strike,
		putOIAtSupport: topPut.strike,
		ivPercentile: 0, // not derivable from one day's bhavcopy — see file doc comment
		updatedAt: new Date().toISOString()
	};
}
