/**
 * Option chain + derived F&O metrics from nseindia.com.
 * Covers the FnoProvider role — feeds a subset of FnoData in src/lib/types
 * (pcr, maxPain, callOIAtResistance, putOIAtSupport). futuresPrice/OI and
 * ivPercentile aren't derivable from the option chain alone: futures data
 * needs a separate futures-quote endpoint, and ivPercentile needs a
 * historical IV time series this endpoint doesn't provide — left as TODOs.
 */
import { nseFetch } from './http';

interface RawOptionLeg {
	strikePrice: number;
	openInterest: number;
	changeinOpenInterest: number;
	impliedVolatility: number;
	lastPrice: number;
}

interface RawOptionRecord {
	strikePrice: number;
	expiryDate: string;
	CE?: RawOptionLeg;
	PE?: RawOptionLeg;
}

interface RawOptionChainResponse {
	records?: {
		underlyingValue?: number;
		data?: RawOptionRecord[];
	};
}

export interface OptionChainSnapshot {
	underlyingValue: number;
	pcr: number; // total put OI / total call OI
	maxPain: number;
	callOIAtResistance: number; // strike with the single highest call OI
	putOIAtSupport: number; // strike with the single highest put OI
	strikes: RawOptionRecord[];
}

/**
 * GET /api/option-chain-v3?symbol=X — NSE's current stock-options endpoint
 * (superseded the older /api/option-chain-equities). Index options
 * (NIFTY/BANKNIFTY) use /api/option-chain-indices instead.
 */
export async function getOptionChain(symbol: string, expiryDate?: string): Promise<OptionChainSnapshot> {
	const raw = await nseFetch<RawOptionChainResponse>('/api/option-chain-v3', {
		params: { symbol: symbol.toUpperCase(), expiry: expiryDate }
	});

	const underlyingValue = raw.records?.underlyingValue ?? 0;
	const allStrikes = raw.records?.data ?? [];
	const strikes = expiryDate ? allStrikes.filter((s) => s.expiryDate === expiryDate) : allStrikes;

	let totalCallOI = 0;
	let totalPutOI = 0;
	let topCallStrike = { strike: 0, oi: -1 };
	let topPutStrike = { strike: 0, oi: -1 };

	for (const row of strikes) {
		const callOI = row.CE?.openInterest ?? 0;
		const putOI = row.PE?.openInterest ?? 0;
		totalCallOI += callOI;
		totalPutOI += putOI;
		if (callOI > topCallStrike.oi) topCallStrike = { strike: row.strikePrice, oi: callOI };
		if (putOI > topPutStrike.oi) topPutStrike = { strike: row.strikePrice, oi: putOI };
	}

	return {
		underlyingValue,
		pcr: totalCallOI > 0 ? totalPutOI / totalCallOI : 0,
		maxPain: computeMaxPain(strikes),
		callOIAtResistance: topCallStrike.strike,
		putOIAtSupport: topPutStrike.strike,
		strikes
	};
}

/**
 * Max pain: the strike at which option WRITERS collectively lose the least
 * (equivalently, option holders gain the least) if the underlying expires
 * there. For each candidate expiry price, sum call-writer + put-writer
 * payout across all strikes and take the price that minimizes it.
 */
function computeMaxPain(strikes: RawOptionRecord[]): number {
	if (strikes.length === 0) return 0;

	let minPain = Infinity;
	let maxPainStrike = strikes[0].strikePrice;

	for (const candidate of strikes) {
		const expiryPrice = candidate.strikePrice;
		let totalPain = 0;

		for (const row of strikes) {
			const callOI = row.CE?.openInterest ?? 0;
			const putOI = row.PE?.openInterest ?? 0;
			// Call writers lose when expiry > strike; put writers lose when expiry < strike.
			if (expiryPrice > row.strikePrice) totalPain += (expiryPrice - row.strikePrice) * callOI;
			if (expiryPrice < row.strikePrice) totalPain += (row.strikePrice - expiryPrice) * putOI;
		}

		if (totalPain < minPain) {
			minPain = totalPain;
			maxPainStrike = expiryPrice;
		}
	}

	return maxPainStrike;
}
