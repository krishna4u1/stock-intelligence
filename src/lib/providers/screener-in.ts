/**
 * Real fundamentals from Screener.in (screener.in/company/<symbol>/consolidated/).
 * No official API — confirmed live via a plain `fetch` that a browser-like
 * User-Agent is enough (unlike nseindia.com, no Akamai wall encountered).
 * No cookies/session needed.
 *
 * Row labels differ between non-financial companies and banks/NBFCs (e.g.
 * "Sales" vs "Revenue", "Operating Profit" vs "Financing Profit") — this
 * matches against alias lists per field rather than one hardcoded label, and
 * was verified against both KAYNES (manufacturing) and SBIN (bank) live
 * before shipping.
 *
 * Gaps, disclosed rather than guessed:
 *  - promoterPledge: Screener's shareholding table (scraped here) doesn't
 *    expose pledge % directly — would need the concall/announcements
 *    section, far more scraping effort. Defaults to 0; treat that as
 *    "unknown", not "confirmed no pledge".
 *  - sectorPeMedian: the peers/industry-comparison table is loaded via a
 *    separate lazy AJAX call this doesn't follow. Defaults to the stock's
 *    own PE (i.e. a neutral 1.0x ratio) rather than a wrong/stale number.
 *  - evEbitda, peg: not in the page's top ratio box; left at 0 (renders as
 *    "N/A" in the UI, which already has that fallback).
 */
import * as cheerio from 'cheerio';
import type { FundamentalData } from '../types';

const HEADERS: Record<string, string> = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	Accept: 'text/html'
};

function parseNumber(text: string): number {
	const cleaned = text.replace(/[₹,%\s]/g, '').replace(/^-$/, '0');
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : 0;
}

async function fetchCompanyHtml(symbol: string): Promise<cheerio.CheerioAPI> {
	// Consolidated financials first (most companies with subsidiaries default
	// here); standalone-only companies redirect Screener to a page without
	// "/consolidated/" in some cases, so fall back to the bare company URL.
	for (const path of [`/company/${symbol}/consolidated/`, `/company/${symbol}/`]) {
		const res = await fetch(`https://www.screener.in${path}`, { headers: HEADERS });
		if (res.ok) return cheerio.load(await res.text());
	}
	throw new Error(`Screener.in has no page for ${symbol} (tried consolidated and standalone)`);
}

function getTopRatio($: cheerio.CheerioAPI, ...names: string[]): number {
	let value = 0;
	$('#top-ratios li').each((_, el) => {
		const name = $(el).find('.name').text().trim();
		if (names.some((n) => name.toLowerCase() === n.toLowerCase())) {
			value = parseNumber($(el).find('.number').text());
		}
	});
	return value;
}

/** Numeric series for a quarterly-results row, matched by alias (label text minus its trailing "+" expand marker). */
function getQuarterlySeries($: cheerio.CheerioAPI, tableId: string, ...labelAliases: string[]): number[] {
	let series: number[] = [];
	$(`${tableId} table tbody tr`).each((_, row) => {
		const label = $(row).find('td').first().text().replace(/\+/g, '').trim();
		if (labelAliases.some((alias) => label.toLowerCase() === alias.toLowerCase())) {
			series = $(row)
				.find('td')
				.slice(1)
				.map((_, cell) => parseNumber($(cell).text()))
				.get();
		}
	});
	return series;
}

function pctChange(latest: number, prior: number): number {
	if (!prior) return 0;
	return round2(((latest - prior) / Math.abs(prior)) * 100);
}

/**
 * The UI renders several of these fields as raw `${value}x` with no
 * formatting (e.g. src/routes/(dashboard)/stocks/[symbol]/+page.svelte's PB
 * and D/E Ratio stat tiles) — fine for mock-data.ts's hand-typed 1-2 decimal
 * fixtures, but computed ratios here come out as e.g. 5.169491525423729
 * without this. Rounding at the source rather than touching that shared
 * template (other callers may rely on its current unrounded behavior).
 */
function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

/** "Jun 2026" -> "Q1 FY27" (Apr-Jun=Q1 ... Jan-Mar=Q4 of the Indian fiscal year). */
function toFiscalQuarter(monthYearLabel: string): string {
	const [monthName, yearStr] = monthYearLabel.split(' ');
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const monthIdx = months.indexOf(monthName);
	const year = Number(yearStr);
	if (monthIdx === -1 || !year) return monthYearLabel;
	const quarter = Math.floor(((monthIdx + 9) % 12) / 3) + 1; // Apr(3)->Q1 ... Mar(2)->Q4
	const fyEndYear = monthIdx >= 3 ? year + 1 : year; // Apr-Dec belongs to FY ending next calendar year
	return `Q${quarter} FY${String(fyEndYear).slice(-2)}`;
}

/** Returns null (not throws) when Screener has no page for this symbol — genuinely absent, not a fetch error. */
export async function getFundamentals(symbol: string): Promise<FundamentalData | null> {
	let $: cheerio.CheerioAPI;
	try {
		$ = await fetchCompanyHtml(symbol);
	} catch {
		return null;
	}

	const revenueSeries = getQuarterlySeries($, '#quarters', 'Sales', 'Revenue');
	const profitSeries = getQuarterlySeries($, '#quarters', 'Net Profit');
	const opProfitSeries = getQuarterlySeries($, '#quarters', 'Operating Profit', 'Financing Profit');
	const interestSeries = getQuarterlySeries($, '#quarters', 'Interest');
	const epsSeries = getQuarterlySeries($, '#quarters', 'EPS in Rs', 'EPS');

	// Banks/NBFCs use "Financing Profit" instead of "Operating Profit" and
	// "Revenue" instead of "Sales" — for them, "Interest" is interest PAID
	// to depositors (their core cost of funds, already netted out above the
	// financing-profit line), not discretionary debt service on top of
	// operations. Computing operating-profit-over-interest for a bank
	// produces a meaningless (here, outright negative) ratio. verified live:
	// SBIN -> -0.26x with the naive formula. The UI already has a >= 999
	// sentinel for "not applicable, bank" (used by the original mock
	// HDFCBANK entry) — reuse it here instead of emitting a misleading number.
	const isBankLike = getQuarterlySeries($, '#quarters', 'Financing Profit').length > 0;

	if (revenueSeries.length < 5 || profitSeries.length < 5) return null; // not enough history to compute YoY

	const n = revenueSeries.length;
	const revenueLatest = revenueSeries[n - 1];
	const revenueQoQPrior = revenueSeries[n - 2];
	const revenueYoYPrior = revenueSeries[n - 5]; // same quarter, 4 quarters back
	const patLatest = profitSeries[n - 1];
	const patYoYPrior = profitSeries[n - 5];
	const opLatest = opProfitSeries[n - 1] ?? 0;
	const opYoYPrior = opProfitSeries[n - 5] ?? 0;
	const epsLatest = epsSeries[n - 1] ?? 0;
	const epsYoYPrior = epsSeries[n - 5] ?? 0;

	// Trailing-4-quarter sums for interest coverage — steadier than one quarter.
	const ttmOp = opProfitSeries.slice(-4).reduce((a, b) => a + b, 0);
	const ttmInterest = interestSeries.slice(-4).reduce((a, b) => a + b, 0);

	const promoterSeries = getQuarterlySeries($, '#quarterly-shp', 'Promoters');
	const promoterHolding = promoterSeries[promoterSeries.length - 1] ?? 0;
	const promoterHoldingPrevQ = promoterSeries[promoterSeries.length - 2] ?? promoterHolding;

	const borrowingsSeries = getQuarterlySeries($, '#balance-sheet', 'Borrowings', 'Borrowing');
	const equityCapitalSeries = getQuarterlySeries($, '#balance-sheet', 'Equity Capital');
	const reservesSeries = getQuarterlySeries($, '#balance-sheet', 'Reserves');
	const totalEquity =
		(equityCapitalSeries[equityCapitalSeries.length - 1] ?? 0) + (reservesSeries[reservesSeries.length - 1] ?? 0);
	const latestBorrowings = borrowingsSeries[borrowingsSeries.length - 1] ?? 0;

	const cfoSeries = getQuarterlySeries($, '#cash-flow', 'Cash from Operating Activity');
	const fcfSeries = getQuarterlySeries($, '#cash-flow', 'Free Cash Flow');

	const pe = getTopRatio($, 'Stock P/E');
	const bookValue = getTopRatio($, 'Book Value');
	const currentPrice = getTopRatio($, 'Current Price');

	// Fiscal-quarter label derived from the quarterly table's last column header.
	const lastQuarterHeader = $('#quarters table thead tr').first().find('th').last().text().trim();

	return {
		revenueGrowthYoY: pctChange(revenueLatest, revenueYoYPrior),
		revenueGrowthQoQ: pctChange(revenueLatest, revenueQoQPrior),
		patGrowthYoY: pctChange(patLatest, patYoYPrior),
		ebitdaGrowthYoY: pctChange(opLatest, opYoYPrior),
		epsGrowthYoY: pctChange(epsLatest, epsYoYPrior),
		roe: getTopRatio($, 'ROE'),
		roce: getTopRatio($, 'ROCE'),
		pe,
		pb: bookValue ? round2(currentPrice / bookValue) : 0,
		evEbitda: 0, // not in top-ratios; see file doc comment
		peg: epsLatest && pctChange(epsLatest, epsYoYPrior) > 0 ? round2(pe / pctChange(epsLatest, epsYoYPrior)) : 0,
		debtToEquity: totalEquity ? round2(latestBorrowings / totalEquity) : 0,
		interestCoverage: isBankLike || !ttmInterest ? 999 : round2(ttmOp / ttmInterest), // 999 = "N/A, bank" sentinel the UI already handles
		operatingCashFlow: cfoSeries[cfoSeries.length - 1] ?? 0,
		freeCashFlow: fcfSeries[fcfSeries.length - 1] ?? 0,
		promoterHolding,
		promoterHoldingPrevQ,
		promoterPledge: 0, // not derivable from this scrape — see file doc comment
		sectorPeMedian: pe || 0, // no peer-table data — neutral default, see file doc comment
		revenueLatest,
		patLatest,
		marketCap: getTopRatio($, 'Market Cap'),
		quarterReported: toFiscalQuarter(lastQuarterHeader),
		quarterUpdated: new Date().toISOString().slice(0, 10)
	} satisfies FundamentalData;
}
