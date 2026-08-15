/**
 * Yahoo Finance (unofficial) — the MarketDataProvider role.
 * No API key, no session/cookies: the `/v8/finance/chart` endpoint serves
 * both live quote (via its `meta` block) and historical OHLC from one call.
 * (Yahoo's separate `/v7/finance/quote` endpoint now requires a `crumb`
 * token and is skipped entirely — chart-only is the common workaround.)
 *
 * Caveats: unofficial, no SLA, and Yahoo has rate-limited/blocked scripted
 * traffic in bursts before. Keep request volume modest and cache results.
 */
import type { TechnicalData } from '../types';

const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const NIFTY50_SYMBOL = '^NSEI';

const HEADERS: Record<string, string> = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	Accept: 'application/json'
};

export type YahooExchange = 'NSE' | 'BSE';

export function toYahooSymbol(symbol: string, exchange: YahooExchange = 'NSE'): string {
	return `${symbol}.${exchange === 'NSE' ? 'NS' : 'BO'}`;
}

export interface OhlcBar {
	date: string; // ISO date
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

interface RawChartResponse {
	chart: {
		result?: Array<{
			meta: {
				regularMarketPrice: number;
				previousClose?: number; // often absent — chartPreviousClose is the reliable one
				chartPreviousClose: number;
				regularMarketDayHigh: number;
				regularMarketDayLow: number;
				regularMarketVolume: number;
				fiftyTwoWeekHigh: number;
				fiftyTwoWeekLow: number;
				regularMarketTime: number; // unix seconds
			};
			timestamp?: number[];
			indicators: {
				quote: Array<{
					open: (number | null)[];
					high: (number | null)[];
					low: (number | null)[];
					close: (number | null)[];
					volume: (number | null)[];
				}>;
			};
		}>;
		error?: { code: string; description: string } | null;
	};
}

type ChartResult = NonNullable<RawChartResponse['chart']['result']>[number];

async function fetchChart(ySymbol: string, range: string, interval: string): Promise<ChartResult> {
	const url = `${CHART_BASE}/${encodeURIComponent(ySymbol)}?interval=${interval}&range=${range}`;
	const res = await fetch(url, { headers: HEADERS });
	if (!res.ok) throw new Error(`Yahoo chart request failed: ${res.status} ${res.statusText} — ${ySymbol}`);
	const body = (await res.json()) as RawChartResponse;
	if (body.chart.error) throw new Error(`Yahoo chart error for ${ySymbol}: ${body.chart.error.description}`);
	const result = body.chart.result?.[0];
	if (!result) throw new Error(`Yahoo chart returned no data for ${ySymbol}`);
	return result;
}

/** Historical daily (or other interval) OHLCV bars. range/interval use Yahoo's own vocabulary, e.g. '1y'/'1d', '5d'/'15m'. */
export async function getHistoricalOHLC(
	symbol: string,
	exchange: YahooExchange = 'NSE',
	range = '1y',
	interval = '1d'
): Promise<OhlcBar[]> {
	const result = await fetchChart(toYahooSymbol(symbol, exchange), range, interval);
	const timestamps = result.timestamp ?? [];
	const q = result.indicators.quote[0];

	const bars: OhlcBar[] = [];
	for (let i = 0; i < timestamps.length; i++) {
		const close = q.close[i];
		if (close === null || close === undefined) continue; // gaps for non-trading intervals
		bars.push({
			date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
			open: q.open[i] ?? close,
			high: q.high[i] ?? close,
			low: q.low[i] ?? close,
			close,
			volume: q.volume[i] ?? 0
		});
	}
	return bars;
}

export interface YahooLiveQuote {
	price: number;
	prevClose: number;
	dayHigh: number;
	dayLow: number;
	volume: number;
	high52w: number;
	low52w: number;
	updatedAt: string;
}

export async function getLiveQuote(symbol: string, exchange: YahooExchange = 'NSE'): Promise<YahooLiveQuote> {
	const result = await fetchChart(toYahooSymbol(symbol, exchange), '1d', '1d');
	const m = result.meta;
	return {
		price: m.regularMarketPrice,
		prevClose: m.previousClose ?? m.chartPreviousClose,
		dayHigh: m.regularMarketDayHigh,
		dayLow: m.regularMarketDayLow,
		volume: m.regularMarketVolume,
		high52w: m.fiftyTwoWeekHigh,
		low52w: m.fiftyTwoWeekLow,
		updatedAt: new Date(m.regularMarketTime * 1000).toISOString()
	};
}

// ─── Indicator math (plain formulas, no external TA library) ──────────────

function sma(values: number[], period: number): number | null {
	if (values.length < period) return null;
	const slice = values.slice(-period);
	return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(values: number[], period: number): number[] {
	const k = 2 / (period + 1);
	const out: number[] = [values[0]];
	for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i - 1] * (1 - k));
	return out;
}

function rsi(closes: number[], period = 14): number | null {
	if (closes.length < period + 1) return null;
	let gains = 0;
	let losses = 0;
	for (let i = closes.length - period; i < closes.length; i++) {
		const diff = closes[i] - closes[i - 1];
		if (diff >= 0) gains += diff;
		else losses -= diff;
	}
	const avgGain = gains / period;
	const avgLoss = losses / period;
	if (avgLoss === 0) return 100;
	const rs = avgGain / avgLoss;
	return 100 - 100 / (1 + rs);
}

function macd(closes: number[]): { macd: number; signal: number; hist: number } | null {
	if (closes.length < 35) return null; // need enough bars for EMA26 + signal EMA9 to stabilize
	const ema12 = ema(closes, 12);
	const ema26 = ema(closes, 26);
	const macdLine = ema12.map((v, i) => v - ema26[i]);
	const signalLine = ema(macdLine.slice(-Math.min(macdLine.length, 100)), 9);
	const macdVal = macdLine[macdLine.length - 1];
	const signalVal = signalLine[signalLine.length - 1];
	return { macd: macdVal, signal: signalVal, hist: macdVal - signalVal };
}

function atr(bars: OhlcBar[], period = 14): number | null {
	if (bars.length < period + 1) return null;
	const trueRanges: number[] = [];
	for (let i = 1; i < bars.length; i++) {
		const { high, low } = bars[i];
		const prevClose = bars[i - 1].close;
		trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
	}
	return sma(trueRanges, period);
}

/**
 * Beta and relative strength need the benchmark's own daily closes over the
 * same window. ^NSEI isn't a .NS-suffixed equity symbol, so this bypasses
 * toYahooSymbol() and calls fetchChart() directly.
 */
async function getNiftyCloses(range: string): Promise<number[]> {
	const result = await fetchChart(NIFTY50_SYMBOL, range, '1d');
	const q = result.indicators.quote[0];
	return (result.timestamp ?? [])
		.map((_: number, i: number) => q.close[i])
		.filter((c: number | null): c is number => c != null);
}

function pctReturn(closes: number[], daysBack: number): number | null {
	if (closes.length < daysBack + 1) return null;
	const then = closes[closes.length - 1 - daysBack];
	const now = closes[closes.length - 1];
	return then ? ((now - then) / then) * 100 : null;
}

function beta(stockCloses: number[], benchmarkCloses: number[]): number | null {
	const n = Math.min(stockCloses.length, benchmarkCloses.length);
	if (n < 30) return null;
	const s = stockCloses.slice(-n);
	const b = benchmarkCloses.slice(-n);
	const stockReturns: number[] = [];
	const benchReturns: number[] = [];
	for (let i = 1; i < n; i++) {
		stockReturns.push((s[i] - s[i - 1]) / s[i - 1]);
		benchReturns.push((b[i] - b[i - 1]) / b[i - 1]);
	}
	const meanS = stockReturns.reduce((a, x) => a + x, 0) / stockReturns.length;
	const meanB = benchReturns.reduce((a, x) => a + x, 0) / benchReturns.length;
	let cov = 0;
	let varB = 0;
	for (let i = 0; i < stockReturns.length; i++) {
		cov += (stockReturns[i] - meanS) * (benchReturns[i] - meanB);
		varB += (benchReturns[i] - meanB) ** 2;
	}
	return varB === 0 ? null : cov / varB;
}

/**
 * Best-effort mapping onto TechnicalData. `adx` is NOT computed (Wilder's
 * +DI/-DI smoothing is nontrivial and not implemented here — leave 0 or
 * source it from elsewhere) and is returned as 0 with a clear TODO.
 * `beta` and both relativeStrengthVsNifty fields require a Nifty history
 * fetch and are skipped if that call fails (network hiccup, symbol change).
 */
export async function getTechnicalSnapshot(
	symbol: string,
	exchange: YahooExchange = 'NSE'
): Promise<Omit<TechnicalData, 'relativeStrengthVsSector3M' | 'breakoutLevel'>> {
	const [bars, live] = await Promise.all([
		getHistoricalOHLC(symbol, exchange, '1y', '1d'),
		getLiveQuote(symbol, exchange)
	]);
	const closes = bars.map((b) => b.close);
	const volumes = bars.map((b) => b.volume);

	const avgVolume20D = sma(volumes, 20) ?? live.volume;
	const macdResult = macd(closes);
	const recent20 = bars.slice(-20);

	let niftyCloses: number[] = [];
	try {
		niftyCloses = await getNiftyCloses('1y');
	} catch {
		// Benchmark fetch failed — beta/relative-strength fields fall back to 0 below.
	}

	const rsVsNifty1M = pctReturn(closes, 21);
	const niftyReturn1M = pctReturn(niftyCloses, 21);
	const rsVsNifty3M = pctReturn(closes, 63);
	const niftyReturn3M = pctReturn(niftyCloses, 63);

	return {
		price: live.price,
		dayHigh: live.dayHigh,
		dayLow: live.dayLow,
		open: bars[bars.length - 1]?.open ?? live.price,
		prevClose: live.prevClose,
		change: live.price - live.prevClose,
		changePct: live.prevClose ? ((live.price - live.prevClose) / live.prevClose) * 100 : 0,
		volume: live.volume,
		avgVolume20D,
		volumeRatio: avgVolume20D ? live.volume / avgVolume20D : 1,
		high52w: live.high52w,
		low52w: live.low52w,
		dma20: sma(closes, 20) ?? live.price,
		dma50: sma(closes, 50) ?? live.price,
		dma100: sma(closes, 100) ?? live.price,
		dma200: sma(closes, 200) ?? live.price,
		rsi: rsi(closes) ?? 50,
		macd: macdResult?.macd ?? 0,
		macdSignal: macdResult?.signal ?? 0,
		macdHist: macdResult?.hist ?? 0,
		adx: 0, // TODO: not computed — see doc comment above
		atr: atr(bars) ?? 0,
		beta: (niftyCloses.length ? beta(closes, niftyCloses) : null) ?? 0,
		relativeStrengthVsNifty1M: rsVsNifty1M !== null && niftyReturn1M !== null ? rsVsNifty1M - niftyReturn1M : 0,
		relativeStrengthVsNifty3M: rsVsNifty3M !== null && niftyReturn3M !== null ? rsVsNifty3M - niftyReturn3M : 0,
		supportLevel: Math.min(...recent20.map((b) => b.low)),
		resistanceLevel: Math.max(...recent20.map((b) => b.high)),
		trend: deriveTrend(closes),
		updatedAt: live.updatedAt
	};
}

function deriveTrend(closes: number[]): TechnicalData['trend'] {
	const dma20 = sma(closes, 20);
	const dma50 = sma(closes, 50);
	const last = closes[closes.length - 1];
	if (dma20 === null || dma50 === null) return 'SIDEWAYS';
	if (last > dma20 && dma20 > dma50) return last / dma50 > 1.1 ? 'STRONG_UP' : 'UP';
	if (last < dma20 && dma20 < dma50) return last / dma50 < 0.9 ? 'STRONG_DOWN' : 'DOWN';
	return 'SIDEWAYS';
}
