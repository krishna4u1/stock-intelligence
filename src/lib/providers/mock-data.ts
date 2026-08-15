/**
 * MOCK DATA PROVIDER
 * Replace individual providers below with real API integrations:
 *   - MarketDataProvider  → NSE/BSE live feed / Upstox / AngelOne
 *   - FundamentalProvider → Screener.in / Tickertape / Trendlyne API
 *   - ShareholdingProvider → NSE bulk/block/shareholding disclosures
 *   - FnoProvider         → NSE F&O data feed
 *
 * All mock values are illustrative only. DO NOT use as investment advice.
 */

import type {
	StockAnalysis, MarketOverview, SectorData, FundamentalData,
	InstitutionalData, TechnicalData, FnoData, SignalTag,
	TierCheck, ScoreHistory, EventRisk
} from '../types';
import {
	calculateScore, deriveRating, buildSignalConflicts
} from '../engines/scoring';
import { calculateEntryTarget } from '../engines/entry-target';

const TODAY = '2026-08-15T09:30:00+05:30';
const REGIME = 'BULL' as const;

// ─── Raw Stock Definitions ─────────────────────────────────────────────────────

interface RawStock {
	symbol: string;
	name: string;
	sector: string;
	industry: string;
	marketCapType: 'LARGE' | 'MID' | 'SMALL';
	isFno: boolean;
	fund: FundamentalData;
	inst: InstitutionalData;
	tech: TechnicalData;
	fno?: FnoData;
	sectorChange3M: number;
	sectorRS: number;
	daysToEarnings: number | null;
	analystTarget?: number;
	whyBuy: string[];
	whatCanGoWrong: string[];
	whyNow: string[];
	missingData: string[];
	eventRisks: EventRisk[];
	extraTags: SignalTag[];
	scoreHistory: ScoreHistory[];
}

const STOCKS: RawStock[] = [
	// ── BELRISE ─────────────────────────────────────────────────────────────
	{
		symbol: 'BELRISE',
		name: 'Belrise Industries Ltd',
		sector: 'Auto Components',
		industry: 'Auto Parts & Equipment',
		marketCapType: 'MID',
		isFno: false,
		fund: {
			revenueGrowthYoY: 21.4, revenueGrowthQoQ: 8.2, patGrowthYoY: 34.8,
			ebitdaGrowthYoY: 22.1, epsGrowthYoY: 27.2,
			roe: 18.6, roce: 21.4, pe: 49, pb: 5.2, evEbitda: 28, peg: 1.8,
			debtToEquity: 0.4, interestCoverage: 7.8,
			operatingCashFlow: 380, freeCashFlow: 210,
			promoterHolding: 55.2, promoterHoldingPrevQ: 55.2, promoterPledge: 0,
			sectorPeMedian: 38, revenueLatest: 2552, patLatest: 148,
			marketCap: 7240, quarterReported: 'Q1 FY27', quarterUpdated: '2026-07-28'
		},
		inst: {
			fiiHolding: 9.4, fiiHoldingPrevQ: 7.8, fiiHolding2QAgo: 6.2,
			mfHolding: 8.1, mfHoldingPrevQ: 7.3, diiHolding: 11.2, diiHoldingPrevQ: 10.1,
			recentBlockDeals: [{
				date: '2026-07-15', buyer: 'Jefferies Group LLC', seller: 'Retail',
				price: 231, shares: 520000, valueInCr: 120,
				buyerType: 'INSTITUTIONAL', sentiment: 'BULLISH'
			}],
			recentBulkDeals: [],
			brokerageRatings: [
				{ date: '2026-05-26', broker: 'Jefferies', rating: 'BUY', target: 250, action: 'UPGRADED', prevRating: 'NEUTRAL' },
				{ date: '2026-06-10', broker: 'HSBC', rating: 'BUY', target: 270, action: 'INITIATED' }
			],
			managementGuidance: [{ date: '2026-07-28', type: 'REVENUE', direction: 'RAISED', details: 'Revenue target raised to ₹1,140 Cr by FY29; PAT CAGR 24%' }],
			qipHistory: [{ date: '2026-07-15', size: 1200, pricePerShare: 230.79, investors: ['Jefferies', 'HSBC AMC', 'Mirae Asset'] }],
			updatedAt: TODAY
		},
		tech: {
			price: 255.35, dayHigh: 258.1, dayLow: 250.8, open: 251.5, prevClose: 249.8,
			change: 5.55, changePct: 2.22,
			volume: 4820000, avgVolume20D: 2010000, volumeRatio: 2.4,
			high52w: 256.8, low52w: 118.5,
			dma20: 238.4, dma50: 221.6, dma100: 192.3, dma200: 165.8,
			rsi: 58, macd: 4.2, macdSignal: 2.8, macdHist: 1.4, adx: 32,
			atr: 7.8, beta: 1.2,
			relativeStrengthVsNifty1M: 14.2, relativeStrengthVsNifty3M: 28.6, relativeStrengthVsSector3M: 12.4,
			breakoutLevel: 248, supportLevel: 232, resistanceLevel: 275,
			trend: 'STRONG_UP', updatedAt: TODAY
		},
		sectorChange3M: 18, sectorRS: 14, daysToEarnings: 72, analystTarget: 265,
		whyBuy: [
			'Revenue growth: +21.4% YoY (manufacturing revenues +21%)',
			'PAT growth: +34.8% YoY — accelerating profitability',
			'FII holding increased 3.2% over last 2 quarters',
			'MF holding increased +0.8% — domestic institutional accumulation',
			'QIP of ₹1,200 Cr at ₹230.79 — near-unanimous 99.8% shareholder vote',
			'Jefferies upgraded target to ₹250, HSBC initiated at ₹270',
			'Price broke 6-month resistance at ₹248 with 2.4× volume',
			'RSI at 58 — strong momentum without overbought condition',
			'Stock outperforming NIFTY by +28.6% over 3 months',
			'Expanding into aerospace, defence, commercial vehicles'
		],
		whatCanGoWrong: [
			'High PE of 49x — expensive if earnings growth disappoints',
			'Auto sector demand slowdown could hurt revenue',
			'Commodity cost pressures (steel, aluminium)',
			'Price close below ₹232 (below QIP floor) = setup invalid',
			'New entrant competition in safety-critical components'
		],
		whyNow: [
			'Price just broke 6-month resistance at ₹248 on 2.4× average volume',
			'QIP floor at ₹230.79 acts as institutional support — downside cushioned',
			'Both FII and MF have been accumulating for 2 consecutive quarters',
			'Earnings estimate revised upward (27% EPS CAGR FY26-28E)',
			'Auto components sector outperforming NIFTY by 18% over 3 months',
			'RSI at 58 — still room to run before overbought territory'
		],
		missingData: ['F&O data not available (not yet in F&O lot)'],
		eventRisks: [{ type: 'EARNINGS', date: '2026-10-28', daysAway: 74, severity: 'LOW', note: 'Q2 FY27 results — ~74 days away' }],
		extraTags: [
			{ id: 't1', emoji: '📈', label: 'QIP', category: 'INSTITUTIONAL', sentiment: 'BULLISH', evidence: '₹1,200 Cr QIP at ₹230.79 — 99.8% shareholder approval' },
			{ id: 't2', emoji: '🚀', label: 'GUIDANCE UPGRADE', category: 'MANAGEMENT', sentiment: 'BULLISH', evidence: 'Management raised FY29 revenue target to ₹1,140 Cr; PAT CAGR 24%' },
			{ id: 't3', emoji: '🏦', label: 'BROKERAGE UPGRADE', category: 'INSTITUTIONAL', sentiment: 'BULLISH', evidence: 'Jefferies upgraded to BUY at ₹250; HSBC initiated at ₹270' }
		],
		scoreHistory: [
			{ date: '2026-07-15', score: 64, rating: 'HOLD', changes: [] },
			{ date: '2026-07-22', score: 72, rating: 'HOLD', changes: [{ factor: 'QIP announcement', delta: 8 }] },
			{ date: '2026-07-29', score: 80, rating: 'BUY', changes: [{ factor: 'Earnings beat + guidance raise', delta: 8 }] },
			{ date: '2026-08-05', score: 86, rating: 'BUY', changes: [{ factor: 'FII accumulation confirmed', delta: 6 }] },
			{ date: TODAY, score: 92, rating: 'STRONG_BUY', changes: [{ factor: 'Resistance breakout 2.4× volume', delta: 6 }] }
		]
	},

	// ── MMFL ────────────────────────────────────────────────────────────────
	{
		symbol: 'MMFL',
		name: 'M M Forgings Ltd',
		sector: 'Capital Goods',
		industry: 'Metal Forgings',
		marketCapType: 'SMALL',
		isFno: false,
		fund: {
			revenueGrowthYoY: 16.66, revenueGrowthQoQ: 5.2, patGrowthYoY: 32.8,
			ebitdaGrowthYoY: 18.4, epsGrowthYoY: 29.6,
			roe: 19.4, roce: 22.8, pe: 25.25, pb: 2.78, evEbitda: 14.2, peg: 0.85,
			debtToEquity: 0.62, interestCoverage: 5.4,
			operatingCashFlow: 220, freeCashFlow: 120,
			promoterHolding: 51.8, promoterHoldingPrevQ: 51.8, promoterPledge: 0,
			sectorPeMedian: 32, revenueLatest: 412.7, patLatest: 48.1,
			marketCap: 2847, quarterReported: 'Q4 FY26', quarterUpdated: '2026-05-28'
		},
		inst: {
			fiiHolding: 4.2, fiiHoldingPrevQ: 3.8, fiiHolding2QAgo: 3.4,
			mfHolding: 12.6, mfHoldingPrevQ: 11.9, diiHolding: 13.8, diiHoldingPrevQ: 12.8,
			recentBlockDeals: [],
			recentBulkDeals: [{ date: '2026-08-08', client: 'Axis Mutual Fund', buySell: 'BUY', price: 572, shares: 85000, valueInCr: 48.6 }],
			brokerageRatings: [
				{ date: '2026-06-15', broker: 'ICICI Securities', rating: 'BUY', target: 680, action: 'UPGRADED' },
				{ date: '2026-07-10', broker: 'Motilal Oswal', rating: 'BUY', target: 660, action: 'MAINTAINED' }
			],
			managementGuidance: [
				{ date: '2026-04-30', type: 'REVENUE', direction: 'RAISED', details: '20% revenue growth target for FY27; new press commissioning' },
				{ date: '2026-04-30', type: 'CAPEX', direction: 'RAISED', details: '₹600 Cr expansion capex announced' }
			],
			qipHistory: [],
			updatedAt: TODAY
		},
		tech: {
			price: 589.75, dayHigh: 598.2, dayLow: 581.4, open: 583, prevClose: 578.3,
			change: 11.45, changePct: 1.98,
			volume: 385000, avgVolume20D: 198000, volumeRatio: 1.94,
			high52w: 664, low52w: 288.1,
			dma20: 561.2, dma50: 498.6, dma100: 440.3, dma200: 388.5,
			rsi: 62, macd: 8.4, macdSignal: 5.6, macdHist: 2.8, adx: 28,
			atr: 18.6, beta: 1.15,
			relativeStrengthVsNifty1M: 9.4, relativeStrengthVsNifty3M: 22.8, relativeStrengthVsSector3M: 8.6,
			supportLevel: 555, resistanceLevel: 640,
			trend: 'STRONG_UP', updatedAt: TODAY
		},
		sectorChange3M: 14, sectorRS: 10, daysToEarnings: 85, analystTarget: 660,
		whyBuy: [
			'PAT growth +32.8% YoY to ₹48.1 Cr (record quarter)',
			'Revenue growth +16.66% YoY to ₹412.7 Cr',
			'PE at 25.25× vs sector 32× — 22% discount to peers',
			'US Class 8 truck order recovery driving 38.5% export revenue',
			'Management guiding 20% revenue growth for FY27',
			'₹600 Cr expansion capex — new press commissioning',
			'MF holding increased +0.7% — Axis MF bulk buy on 8 Aug',
			'RSI at 62 — momentum without overbought',
			'Stock recovered 105% from 52-week low of ₹288'
		],
		whatCanGoWrong: [
			'US tariff changes could disrupt export order book (38.5% of revenue)',
			'Commodity price spikes (steel inputs)',
			'Small cap — thinner liquidity; large positions may have impact cost',
			'₹600 Cr capex increases leverage temporarily',
			'Stop loss close below ₹555'
		],
		whyNow: [
			'Stock is 11% below its 52-week high of ₹664 — room to reclaim',
			'MF bulk buy at ₹572 last week signals institutional confidence',
			'US truck order cycle recovery is accelerating (structural tailwind)',
			'Management raised FY27 growth guidance to 20% on Q4 call',
			'Capital goods sector in uptrend with +14% 3M return',
			'Volume at 1.94× average — healthy institutional accumulation pattern'
		],
		missingData: ['F&O data not available (not in F&O segment)', 'FII data limited — small cap foreign visibility lower'],
		eventRisks: [{ type: 'EARNINGS', date: '2026-10-30', daysAway: 76, severity: 'LOW', note: 'Q1 FY27 results expected late October' }],
		extraTags: [
			{ id: 't1', emoji: '💰', label: 'UNDERVALUED', category: 'FUNDAMENTAL', sentiment: 'BULLISH', evidence: 'PE 25.25x vs sector 32x — trading at 22% discount to peers' },
			{ id: 't2', emoji: '🎯', label: 'ORDER BOOK GROWTH', category: 'MANAGEMENT', sentiment: 'BULLISH', evidence: 'US Class 8 truck recovery; export orders 38.5% of revenue' },
			{ id: 't3', emoji: '🚀', label: 'CAPEX EXPANSION', category: 'MANAGEMENT', sentiment: 'BULLISH', evidence: '₹600 Cr expansion capex; new press commissioning underway' }
		],
		scoreHistory: [
			{ date: '2026-06-17', score: 58, rating: 'SELL', changes: [] },
			{ date: '2026-06-24', score: 65, rating: 'HOLD', changes: [{ factor: 'Q4 earnings beat', delta: 7 }] },
			{ date: '2026-07-08', score: 74, rating: 'HOLD', changes: [{ factor: 'Capex expansion announced', delta: 9 }] },
			{ date: '2026-07-22', score: 81, rating: 'BUY', changes: [{ factor: 'MF accumulation + sector momentum', delta: 7 }] },
			{ date: TODAY, score: 89, rating: 'STRONG_BUY', changes: [{ factor: 'Volume surge + technical breakout above ₹560', delta: 8 }] }
		]
	},

	// ── BHARTIARTL ──────────────────────────────────────────────────────────
	{
		symbol: 'BHARTIARTL',
		name: 'Bharti Airtel Ltd',
		sector: 'Telecom',
		industry: 'Telecom Services',
		marketCapType: 'LARGE',
		isFno: true,
		fund: {
			revenueGrowthYoY: 17.8, revenueGrowthQoQ: 4.2, patGrowthYoY: 28.4,
			ebitdaGrowthYoY: 19.6, epsGrowthYoY: 26.1,
			roe: 22.4, roce: 20.1, pe: 42, pb: 6.8, evEbitda: 18, peg: 1.6,
			debtToEquity: 1.8, interestCoverage: 4.2,
			operatingCashFlow: 8400, freeCashFlow: 4200,
			promoterHolding: 55.7, promoterHoldingPrevQ: 55.7, promoterPledge: 0,
			sectorPeMedian: 38, revenueLatest: 41200, patLatest: 3820,
			marketCap: 672000, quarterReported: 'Q1 FY27', quarterUpdated: '2026-07-25'
		},
		inst: {
			fiiHolding: 22.4, fiiHoldingPrevQ: 21.6, fiiHolding2QAgo: 20.8,
			mfHolding: 14.2, mfHoldingPrevQ: 13.8, diiHolding: 16.8, diiHoldingPrevQ: 16.2,
			recentBlockDeals: [{ date: '2026-08-01', buyer: 'GIC Singapore', seller: 'Promoter Group', price: 1584, shares: 630000, valueInCr: 998, buyerType: 'INSTITUTIONAL', sentiment: 'BULLISH' }],
			recentBulkDeals: [],
			brokerageRatings: [
				{ date: '2026-07-26', broker: 'Goldman Sachs', rating: 'BUY', target: 1850, action: 'UPGRADED' },
				{ date: '2026-07-26', broker: 'Citi', rating: 'BUY', target: 1780, action: 'MAINTAINED' },
				{ date: '2026-07-26', broker: 'Morgan Stanley', rating: 'OUTPERFORM', target: 1820, action: 'MAINTAINED' }
			],
			managementGuidance: [{ date: '2026-07-25', type: 'MARGIN', direction: 'RAISED', details: 'EBITDA margin guidance raised to 52-54% from 50-52%; ARPU targeting ₹280+ by FY27' }],
			qipHistory: [],
			updatedAt: TODAY
		},
		tech: {
			price: 1642.5, dayHigh: 1658, dayLow: 1631, open: 1638, prevClose: 1624.8,
			change: 17.7, changePct: 1.09,
			volume: 3820000, avgVolume20D: 2940000, volumeRatio: 1.3,
			high52w: 1722, low52w: 1128,
			dma20: 1598, dma50: 1524, dma100: 1442, dma200: 1312,
			rsi: 61, macd: 22.4, macdSignal: 16.8, macdHist: 5.6, adx: 26,
			atr: 28.4, beta: 0.92,
			relativeStrengthVsNifty1M: 6.4, relativeStrengthVsNifty3M: 16.8, relativeStrengthVsSector3M: 9.2,
			supportLevel: 1580, resistanceLevel: 1720,
			trend: 'UP', updatedAt: TODAY
		},
		fno: {
			futuresPrice: 1648.6, futuresOI: 42800000, futuresOIChange: 8.4,
			futuresBasis: 0.37, fnoClass: 'LONG_BUILDUP',
			pcr: 0.94, maxPain: 1680, callOIAtResistance: 4200000, putOIAtSupport: 3800000,
			ivPercentile: 38, updatedAt: TODAY
		},
		sectorChange3M: 12, sectorRS: 8, daysToEarnings: 70, analystTarget: 1820,
		whyBuy: [
			'Revenue growth +17.8% YoY driven by ARPU expansion',
			'PAT growth +28.4% — earnings acceleration on track',
			'FII holding increased for 3 consecutive quarters (+1.6%)',
			'Goldman Sachs upgraded to BUY with ₹1,850 target post earnings',
			'ARPU targeting ₹280+ — industry ARPU tailwind from tariff hikes',
			'5G subscriber addition accelerating; market share gains',
			'Futures long buildup — OI up 8.4% with positive basis',
			'Stock outperforming NIFTY +16.8% over 3 months'
		],
		whatCanGoWrong: [
			'High debt (D/E 1.8) — sensitive to interest rate changes',
			'5G capex still elevated; FCF could be pressured',
			'Regulatory risk — TRAI tariff intervention',
			'Jio aggressive pricing response to ARPU target',
			'Stop: close below ₹1,580'
		],
		whyNow: [
			'Goldman Sachs upgrade triggered fresh institutional interest',
			'Q1 FY27 earnings beat — ARPU hit ₹256 (above estimates)',
			'Long buildup in futures — professional traders positioning bullish',
			'Stock is 4.6% from 52-week high — needs breakout above ₹1,722',
			'Telecom sector in improving trend with positive FII flows'
		],
		missingData: [],
		eventRisks: [{ type: 'EARNINGS', date: '2026-10-25', daysAway: 71, severity: 'LOW', note: 'Q2 FY27 expected October 25' }],
		extraTags: [
			{ id: 't1', emoji: '🏦', label: 'FII ACCUMULATION', category: 'INSTITUTIONAL', sentiment: 'BULLISH', evidence: 'FII holding +1.6% over 2 quarters; GIC Singapore block buy ₹998 Cr' },
			{ id: 't2', emoji: '🟢', label: 'LONG BUILDUP', category: 'TECHNICAL', sentiment: 'BULLISH', evidence: 'Futures OI +8.4% with price up — classic long buildup signal' }
		],
		scoreHistory: [
			{ date: '2026-07-15', score: 74, rating: 'HOLD', changes: [] },
			{ date: '2026-07-22', score: 78, rating: 'BUY', changes: [{ factor: 'Pre-results institutional buying', delta: 4 }] },
			{ date: '2026-07-29', score: 84, rating: 'BUY', changes: [{ factor: 'Earnings beat + guidance raise + Goldman upgrade', delta: 6 }] },
			{ date: TODAY, score: 87, rating: 'STRONG_BUY', changes: [{ factor: 'Futures long buildup confirmation', delta: 3 }] }
		]
	},

	// ── ICICIBANK ────────────────────────────────────────────────────────────
	{
		symbol: 'ICICIBANK',
		name: 'ICICI Bank Ltd',
		sector: 'Banking',
		industry: 'Private Sector Banks',
		marketCapType: 'LARGE',
		isFno: true,
		fund: {
			revenueGrowthYoY: 14.2, revenueGrowthQoQ: 3.4, patGrowthYoY: 18.6,
			ebitdaGrowthYoY: 15.8, epsGrowthYoY: 17.4,
			roe: 18.4, roce: 0, pe: 18.2, pb: 3.2, evEbitda: 0, peg: 1.05,
			debtToEquity: 0, interestCoverage: 0,
			operatingCashFlow: 22400, freeCashFlow: 18800,
			promoterHolding: 0, promoterHoldingPrevQ: 0, promoterPledge: 0,
			sectorPeMedian: 20, revenueLatest: 78400, patLatest: 11692,
			marketCap: 1024000, quarterReported: 'Q1 FY27', quarterUpdated: '2026-07-20'
		},
		inst: {
			fiiHolding: 43.2, fiiHoldingPrevQ: 42.8, fiiHolding2QAgo: 42.1,
			mfHolding: 26.4, mfHoldingPrevQ: 26.1, diiHolding: 28.2, diiHoldingPrevQ: 27.8,
			recentBlockDeals: [],
			recentBulkDeals: [],
			brokerageRatings: [
				{ date: '2026-07-21', broker: 'Macquarie', rating: 'OUTPERFORM', target: 1480, action: 'MAINTAINED' },
				{ date: '2026-07-21', broker: 'JP Morgan', rating: 'OUTPERFORM', target: 1520, action: 'MAINTAINED' }
			],
			managementGuidance: [{ date: '2026-07-20', type: 'REVENUE', direction: 'MAINTAINED', details: 'NIMs at 4.5% — expected to remain stable; credit growth 15-16%' }],
			qipHistory: [],
			updatedAt: TODAY
		},
		tech: {
			price: 1312.4, dayHigh: 1324, dayLow: 1304, open: 1308, prevClose: 1298.6,
			change: 13.8, changePct: 1.06,
			volume: 6840000, avgVolume20D: 5280000, volumeRatio: 1.3,
			high52w: 1388, low52w: 988,
			dma20: 1284, dma50: 1228, dma100: 1164, dma200: 1098,
			rsi: 59, macd: 14.2, macdSignal: 10.8, macdHist: 3.4, adx: 24,
			atr: 22.4, beta: 1.08,
			relativeStrengthVsNifty1M: 4.2, relativeStrengthVsNifty3M: 12.4, relativeStrengthVsSector3M: 6.2,
			supportLevel: 1265, resistanceLevel: 1388,
			trend: 'UP', updatedAt: TODAY
		},
		fno: {
			futuresPrice: 1316.8, futuresOI: 88400000, futuresOIChange: 5.2,
			futuresBasis: 0.34, fnoClass: 'LONG_BUILDUP',
			pcr: 1.04, maxPain: 1340, callOIAtResistance: 12400000, putOIAtSupport: 11200000,
			ivPercentile: 32, updatedAt: TODAY
		},
		sectorChange3M: 9, sectorRS: 5, daysToEarnings: 68, analystTarget: 1480,
		whyBuy: ['PAT growth 18.6% YoY', 'ROE 18.4% — best-in-class private bank', 'Stable NIMs at 4.5%', 'FII + MF holdings at all-time high', 'Long buildup in futures'],
		whatCanGoWrong: ['NPA cycle could turn if economy slows', 'Competition from new-age fintechs', 'RBI credit growth moderation'],
		whyNow: ['Q1 FY27 beat expectations on NIM and credit growth', 'Futures long buildup gaining momentum', '52W high retest imminent at ₹1,388'],
		missingData: [],
		eventRisks: [{ type: 'BOARD_MEETING', date: '2026-10-18', daysAway: 64, severity: 'LOW', note: 'Q2 FY27 board meeting' }],
		extraTags: [],
		scoreHistory: [
			{ date: '2026-07-15', score: 70, rating: 'HOLD', changes: [] },
			{ date: '2026-07-22', score: 78, rating: 'BUY', changes: [{ factor: 'Earnings beat', delta: 8 }] },
			{ date: TODAY, score: 82, rating: 'BUY', changes: [{ factor: 'F&O long buildup + sector momentum', delta: 4 }] }
		]
	},

	// ── TCS ─────────────────────────────────────────────────────────────────
	{
		symbol: 'TCS',
		name: 'Tata Consultancy Services Ltd',
		sector: 'IT',
		industry: 'IT Services',
		marketCapType: 'LARGE',
		isFno: true,
		fund: {
			revenueGrowthYoY: 9.4, revenueGrowthQoQ: 2.1, patGrowthYoY: 11.2,
			ebitdaGrowthYoY: 10.4, epsGrowthYoY: 10.8,
			roe: 54.2, roce: 68.4, pe: 26, pb: 14.2, evEbitda: 20, peg: 2.4,
			debtToEquity: 0.0, interestCoverage: 999,
			operatingCashFlow: 48200, freeCashFlow: 44800,
			promoterHolding: 72.3, promoterHoldingPrevQ: 72.3, promoterPledge: 0,
			sectorPeMedian: 28, revenueLatest: 62200, patLatest: 13580,
			marketCap: 1384000, quarterReported: 'Q1 FY27', quarterUpdated: '2026-07-11'
		},
		inst: {
			fiiHolding: 13.4, fiiHoldingPrevQ: 13.2, fiiHolding2QAgo: 13.0,
			mfHolding: 7.8, mfHoldingPrevQ: 7.6, diiHolding: 8.4, diiHoldingPrevQ: 8.2,
			recentBlockDeals: [],
			recentBulkDeals: [],
			brokerageRatings: [{ date: '2026-07-12', broker: 'Nomura', rating: 'BUY', target: 4200, action: 'MAINTAINED' }],
			managementGuidance: [{ date: '2026-07-11', type: 'REVENUE', direction: 'MAINTAINED', details: 'CC revenue growth guided at 8-10% for FY27; deal wins at $10.2B TCV' }],
			qipHistory: [],
			updatedAt: TODAY
		},
		tech: {
			price: 3924, dayHigh: 3948, dayLow: 3908, open: 3912, prevClose: 3904.2,
			change: 19.8, changePct: 0.51,
			volume: 1840000, avgVolume20D: 2180000, volumeRatio: 0.84,
			high52w: 4592, low52w: 3428,
			dma20: 3882, dma50: 3778, dma100: 3648, dma200: 3524,
			rsi: 54, macd: 8.4, macdSignal: 4.2, macdHist: 4.2, adx: 18,
			atr: 48.2, beta: 0.74,
			relativeStrengthVsNifty1M: 2.4, relativeStrengthVsNifty3M: 8.4, relativeStrengthVsSector3M: 3.2,
			supportLevel: 3780, resistanceLevel: 4200,
			trend: 'UP', updatedAt: TODAY
		},
		fno: {
			futuresPrice: 3930, futuresOI: 22400000, futuresOIChange: 2.4,
			futuresBasis: 0.15, fnoClass: 'NEUTRAL',
			pcr: 0.88, maxPain: 3900, callOIAtResistance: 8400000, putOIAtSupport: 7200000,
			ivPercentile: 28, updatedAt: TODAY
		},
		sectorChange3M: 8, sectorRS: 4, daysToEarnings: 59, analystTarget: 4200,
		whyBuy: ['Zero-debt balance sheet; ROE 54%', 'Deal wins at $10.2B TCV — pipeline strong', 'Dividend yield ~1.8%; consistent buybacks', 'AI/GenAI services pipeline building'],
		whatCanGoWrong: ['Revenue growth at 9.4% — below historical 12-15%', 'BFSI vertical still sluggish', 'Strong rupee headwind on USD revenues'],
		whyNow: ['PE at 26x vs historical average 28x — mild value zone', 'Institutional holdings gradually increasing'],
		missingData: [],
		eventRisks: [{ type: 'EARNINGS', date: '2026-10-10', daysAway: 56, severity: 'MEDIUM', note: 'Q2 FY27 — IT sector guidance will be closely watched' }],
		extraTags: [{ id: 't1', emoji: '🏆', label: 'HIGH ROCE', category: 'FUNDAMENTAL', sentiment: 'BULLISH', evidence: 'ROCE 68.4% — among highest in Indian large-cap universe' }],
		scoreHistory: [
			{ date: '2026-07-15', score: 74, rating: 'HOLD', changes: [] },
			{ date: TODAY, score: 80, rating: 'BUY', changes: [{ factor: 'Deal wins beat + sentiment recovery', delta: 6 }] }
		]
	},

	// ── RELIANCE ────────────────────────────────────────────────────────────
	{
		symbol: 'RELIANCE',
		name: 'Reliance Industries Ltd',
		sector: 'Diversified',
		industry: 'Conglomerate',
		marketCapType: 'LARGE',
		isFno: true,
		fund: {
			revenueGrowthYoY: 11.4, revenueGrowthQoQ: 3.2, patGrowthYoY: 16.8,
			ebitdaGrowthYoY: 13.2, epsGrowthYoY: 15.4,
			roe: 11.8, roce: 13.2, pe: 24.4, pb: 2.8, evEbitda: 14, peg: 1.6,
			debtToEquity: 0.48, interestCoverage: 9.2,
			operatingCashFlow: 82400, freeCashFlow: 38600,
			promoterHolding: 50.3, promoterHoldingPrevQ: 50.3, promoterPledge: 0,
			sectorPeMedian: 22, revenueLatest: 294800, patLatest: 18200,
			marketCap: 2128000, quarterReported: 'Q1 FY27', quarterUpdated: '2026-07-18'
		},
		inst: {
			fiiHolding: 24.8, fiiHoldingPrevQ: 24.4, fiiHolding2QAgo: 24.0,
			mfHolding: 8.6, mfHoldingPrevQ: 8.4, diiHolding: 9.2, diiHoldingPrevQ: 9.0,
			recentBlockDeals: [],
			recentBulkDeals: [],
			brokerageRatings: [{ date: '2026-07-19', broker: 'UBS', rating: 'BUY', target: 1680, action: 'MAINTAINED' }],
			managementGuidance: [{ date: '2026-07-18', type: 'REVENUE', direction: 'MAINTAINED', details: 'Jio subscriber growth and ARPU expansion on track; Retail revenues normalising' }],
			qipHistory: [],
			updatedAt: TODAY
		},
		tech: {
			price: 1424, dayHigh: 1438, dayLow: 1416, open: 1420, prevClose: 1412.4,
			change: 11.6, changePct: 0.82,
			volume: 8240000, avgVolume20D: 7180000, volumeRatio: 1.15,
			high52w: 1608, low52w: 1188,
			dma20: 1398, dma50: 1352, dma100: 1296, dma200: 1244,
			rsi: 56, macd: 12.4, macdSignal: 8.8, macdHist: 3.6, adx: 21,
			atr: 22.8, beta: 0.88,
			relativeStrengthVsNifty1M: 2.8, relativeStrengthVsNifty3M: 6.2, relativeStrengthVsSector3M: 4.8,
			supportLevel: 1360, resistanceLevel: 1520,
			trend: 'UP', updatedAt: TODAY
		},
		fno: {
			futuresPrice: 1428.6, futuresOI: 168000000, futuresOIChange: 3.2,
			futuresBasis: 0.32, fnoClass: 'LONG_BUILDUP',
			pcr: 0.92, maxPain: 1440, callOIAtResistance: 24000000, putOIAtSupport: 22000000,
			ivPercentile: 24, updatedAt: TODAY
		},
		sectorChange3M: 6, sectorRS: 3, daysToEarnings: 72, analystTarget: 1680,
		whyBuy: ['Diversified conglomerate — telecom, retail, O2C, green energy', 'Jio ARPU expansion driving earnings', 'Low debt (D/E 0.48)', 'FII consistently accumulating'],
		whatCanGoWrong: ['Retail segment margins under pressure', 'O2C margins sensitive to crude spreads', 'Large market cap — limited short-term upside vs small/mid'],
		whyNow: ['PE at 24.4x — below 5-year average of 27x', 'Futures long buildup signal'],
		missingData: [],
		eventRisks: [{ type: 'EARNINGS', date: '2026-10-18', daysAway: 64, severity: 'MEDIUM', note: 'Q2 FY27 — AGM ahead, possible new business announcement' }],
		extraTags: [],
		scoreHistory: [
			{ date: '2026-07-15', score: 72, rating: 'HOLD', changes: [] },
			{ date: TODAY, score: 78, rating: 'BUY', changes: [{ factor: 'Q1 beat + Jio subscriber momentum', delta: 6 }] }
		]
	},

	// ── HDFCBANK ─────────────────────────────────────────────────────────────
	{
		symbol: 'HDFCBANK',
		name: 'HDFC Bank Ltd',
		sector: 'Banking',
		industry: 'Private Sector Banks',
		marketCapType: 'LARGE',
		isFno: true,
		fund: {
			revenueGrowthYoY: 8.2, revenueGrowthQoQ: 1.8, patGrowthYoY: 12.4,
			ebitdaGrowthYoY: 9.6, epsGrowthYoY: 11.8,
			roe: 15.2, roce: 0, pe: 17.4, pb: 2.4, evEbitda: 0, peg: 1.5,
			debtToEquity: 0, interestCoverage: 0,
			operatingCashFlow: 48200, freeCashFlow: 42800,
			promoterHolding: 0, promoterHoldingPrevQ: 0, promoterPledge: 0,
			sectorPeMedian: 20, revenueLatest: 182400, patLatest: 17200,
			marketCap: 1348000, quarterReported: 'Q1 FY27', quarterUpdated: '2026-07-19'
		},
		inst: {
			fiiHolding: 47.8, fiiHoldingPrevQ: 48.2, fiiHolding2QAgo: 48.6,
			mfHolding: 22.4, mfHoldingPrevQ: 22.2, diiHolding: 24.2, diiHoldingPrevQ: 24.0,
			recentBlockDeals: [],
			recentBulkDeals: [],
			brokerageRatings: [{ date: '2026-07-20', broker: 'Bernstein', rating: 'OUTPERFORM', target: 1950, action: 'MAINTAINED' }],
			managementGuidance: [{ date: '2026-07-19', type: 'REVENUE', direction: 'MAINTAINED', details: 'CD ratio improving; credit growth guided at 14-16%' }],
			qipHistory: [],
			updatedAt: TODAY
		},
		tech: {
			price: 1748.6, dayHigh: 1762, dayLow: 1738, open: 1744, prevClose: 1740.2,
			change: 8.4, changePct: 0.48,
			volume: 4840000, avgVolume20D: 5620000, volumeRatio: 0.86,
			high52w: 1908, low52w: 1428,
			dma20: 1728, dma50: 1682, dma100: 1612, dma200: 1548,
			rsi: 55, macd: 10.2, macdSignal: 7.8, macdHist: 2.4, adx: 19,
			atr: 24.6, beta: 0.94,
			relativeStrengthVsNifty1M: 1.2, relativeStrengthVsNifty3M: 5.8, relativeStrengthVsSector3M: 2.4,
			supportLevel: 1685, resistanceLevel: 1908,
			trend: 'UP', updatedAt: TODAY
		},
		fno: {
			futuresPrice: 1752, futuresOI: 192000000, futuresOIChange: 1.8,
			futuresBasis: 0.19, fnoClass: 'NEUTRAL',
			pcr: 1.12, maxPain: 1760, callOIAtResistance: 28400000, putOIAtSupport: 24000000,
			ivPercentile: 22, updatedAt: TODAY
		},
		sectorChange3M: 9, sectorRS: 5, daysToEarnings: 66, analystTarget: 1950,
		whyBuy: ['Cheapest large-cap private bank on PE basis', 'Post-merger credit cost normalization complete', 'CD ratio improving — loan growth accelerating'],
		whatCanGoWrong: ['FII holding declining marginally (3-quarter trend)', 'Still 8.4% below 52W high — may underperform vs peers short term', 'NIM pressure if RBI cuts rates'],
		whyNow: ['Valuations at post-merger lows — mean reversion play', 'Credit growth guidance maintained at 14-16%'],
		missingData: [],
		eventRisks: [{ type: 'EARNINGS', date: '2026-10-16', daysAway: 62, severity: 'MEDIUM', note: 'Q2 FY27' }],
		extraTags: [{ id: 't1', emoji: '⚠️', label: 'FII SELLING', category: 'RISK', sentiment: 'BEARISH', evidence: 'FII holding declining: 48.6% → 47.8% over 2 quarters' }],
		scoreHistory: [
			{ date: '2026-07-15', score: 68, rating: 'HOLD', changes: [] },
			{ date: TODAY, score: 72, rating: 'HOLD', changes: [{ factor: 'Earnings in line, slight improvement', delta: 4 }] }
		]
	},

	// ── HINDUNILVR ───────────────────────────────────────────────────────────
	{
		symbol: 'HINDUNILVR',
		name: 'Hindustan Unilever Ltd',
		sector: 'FMCG',
		industry: 'Consumer Goods',
		marketCapType: 'LARGE',
		isFno: true,
		fund: {
			revenueGrowthYoY: 3.2, revenueGrowthQoQ: 0.8, patGrowthYoY: 2.4,
			ebitdaGrowthYoY: 1.8, epsGrowthYoY: 2.1,
			roe: 22.4, roce: 26.8, pe: 52, pb: 11.2, evEbitda: 36, peg: 24.8,
			debtToEquity: 0.0, interestCoverage: 999,
			operatingCashFlow: 8400, freeCashFlow: 7200,
			promoterHolding: 61.9, promoterHoldingPrevQ: 61.9, promoterPledge: 0,
			sectorPeMedian: 40, revenueLatest: 62800, patLatest: 2584,
			marketCap: 568000, quarterReported: 'Q1 FY27', quarterUpdated: '2026-07-22'
		},
		inst: {
			fiiHolding: 16.4, fiiHoldingPrevQ: 17.2, fiiHolding2QAgo: 18.0,
			mfHolding: 6.8, mfHoldingPrevQ: 7.2, diiHolding: 7.2, diiHoldingPrevQ: 7.6,
			recentBlockDeals: [],
			recentBulkDeals: [],
			brokerageRatings: [{ date: '2026-07-23', broker: 'Kotak Institutional', rating: 'SELL', target: 2100, action: 'DOWNGRADED' }],
			managementGuidance: [{ date: '2026-07-22', type: 'REVENUE', direction: 'MAINTAINED', details: 'Mid-single digit volume growth; rural recovery gradual' }],
			qipHistory: [],
			updatedAt: TODAY
		},
		tech: {
			price: 2284, dayHigh: 2298, dayLow: 2272, open: 2278, prevClose: 2292.4,
			change: -8.4, changePct: -0.37,
			volume: 2180000, avgVolume20D: 2480000, volumeRatio: 0.88,
			high52w: 2860, low52w: 2168,
			dma20: 2318, dma50: 2384, dma100: 2448, dma200: 2512,
			rsi: 42, macd: -12.4, macdSignal: -6.8, macdHist: -5.6, adx: 24,
			atr: 28.4, beta: 0.58,
			relativeStrengthVsNifty1M: -4.8, relativeStrengthVsNifty3M: -12.4, relativeStrengthVsSector3M: -8.2,
			supportLevel: 2168, resistanceLevel: 2400,
			trend: 'DOWN', updatedAt: TODAY
		},
		fno: {
			futuresPrice: 2288, futuresOI: 44800000, futuresOIChange: 4.2,
			futuresBasis: 0.18, fnoClass: 'SHORT_BUILDUP',
			pcr: 0.68, maxPain: 2200, callOIAtResistance: 8800000, putOIAtSupport: 6000000,
			ivPercentile: 48, updatedAt: TODAY
		},
		sectorChange3M: -4, sectorRS: -8, daysToEarnings: 68, analystTarget: 2100,
		whyBuy: [],
		whatCanGoWrong: ['PE of 52x highly expensive for 2.4% profit growth', 'FII selling for 3 consecutive quarters', 'Price below 50 and 200 DMA — downtrend intact', 'Short buildup in futures — professional shorts positioning', 'FMCG sector underperforming NIFTY by 8.2%', 'Kotak downgraded to SELL at ₹2,100 target'],
		whyNow: [],
		missingData: [],
		eventRisks: [{ type: 'EARNINGS', date: '2026-10-22', daysAway: 68, severity: 'HIGH', note: 'Q2 FY27 — analyst expectations very low; any miss = sharp fall' }],
		extraTags: [
			{ id: 't1', emoji: '⚠️', label: 'HIGH VALUATION', category: 'RISK', sentiment: 'BEARISH', evidence: 'PE 52x for 2.4% profit growth — PEG of 24.8 indicates extreme overvaluation' },
			{ id: 't2', emoji: '🔻', label: 'FII SELLING', category: 'RISK', sentiment: 'BEARISH', evidence: 'FII holding: 18.0% → 16.4% — declining 3 consecutive quarters' }
		],
		scoreHistory: [
			{ date: '2026-07-15', score: 52, rating: 'SELL', changes: [] },
			{ date: TODAY, score: 48, rating: 'SELL', changes: [{ factor: 'Short buildup + Kotak downgrade', delta: -4 }] }
		]
	},

	// ── TATAMOTORS ───────────────────────────────────────────────────────────
	{
		symbol: 'TATAMOTORS',
		name: 'Tata Motors Ltd',
		sector: 'Auto',
		industry: 'Passenger & Commercial Vehicles',
		marketCapType: 'LARGE',
		isFno: true,
		fund: {
			revenueGrowthYoY: 13.8, revenueGrowthQoQ: 3.4, patGrowthYoY: 22.4,
			ebitdaGrowthYoY: 16.2, epsGrowthYoY: 20.8,
			roe: 28.4, roce: 24.6, pe: 8.2, pb: 2.2, evEbitda: 8.4, peg: 0.4,
			debtToEquity: 1.4, interestCoverage: 5.8,
			operatingCashFlow: 42800, freeCashFlow: 18400,
			promoterHolding: 46.4, promoterHoldingPrevQ: 46.4, promoterPledge: 0,
			sectorPeMedian: 18, revenueLatest: 442800, patLatest: 22408,
			marketCap: 628000, quarterReported: 'Q1 FY27', quarterUpdated: '2026-07-30'
		},
		inst: {
			fiiHolding: 18.2, fiiHoldingPrevQ: 17.6, fiiHolding2QAgo: 16.8,
			mfHolding: 16.4, mfHoldingPrevQ: 15.8, diiHolding: 18.2, diiHoldingPrevQ: 17.4,
			recentBlockDeals: [],
			recentBulkDeals: [],
			brokerageRatings: [
				{ date: '2026-07-31', broker: 'Emkay', rating: 'BUY', target: 1080, action: 'MAINTAINED' },
				{ date: '2026-07-31', broker: 'Nuvama', rating: 'BUY', target: 1120, action: 'UPGRADED' }
			],
			managementGuidance: [{ date: '2026-07-30', type: 'REVENUE', direction: 'RAISED', details: 'JLR EBIT margin guidance raised to 9-10%; net debt free target by FY27' }],
			qipHistory: [],
			updatedAt: TODAY
		},
		tech: {
			price: 842.6, dayHigh: 854, dayLow: 836, open: 840, prevClose: 832.4,
			change: 10.2, changePct: 1.23,
			volume: 7840000, avgVolume20D: 5620000, volumeRatio: 1.39,
			high52w: 1028, low52w: 628,
			dma20: 818, dma50: 778, dma100: 736, dma200: 712,
			rsi: 57, macd: 10.8, macdSignal: 7.2, macdHist: 3.6, adx: 22,
			atr: 18.4, beta: 1.48,
			relativeStrengthVsNifty1M: 8.2, relativeStrengthVsNifty3M: 14.6, relativeStrengthVsSector3M: 6.8,
			supportLevel: 800, resistanceLevel: 920,
			trend: 'UP', updatedAt: TODAY
		},
		fno: {
			futuresPrice: 846, futuresOI: 62400000, futuresOIChange: 6.4,
			futuresBasis: 0.40, fnoClass: 'LONG_BUILDUP',
			pcr: 0.98, maxPain: 880, callOIAtResistance: 14400000, putOIAtSupport: 12800000,
			ivPercentile: 42, updatedAt: TODAY
		},
		sectorChange3M: 18, sectorRS: 14, daysToEarnings: 76, analystTarget: 1080,
		whyBuy: ['PE of only 8.2x — deeply undervalued vs sector 18x', 'JLR profitability at record; EBIT margin guidance raised', 'PAT growth +22.4% YoY', 'Net-debt-free target FY27', 'FII + MF accumulating for 2 consecutive quarters'],
		whatCanGoWrong: ['JLR EV transition risk — large capex ahead', 'High beta (1.48) — volatile in market downturns', 'UK economic slowdown could hurt JLR volumes', 'D/E of 1.4 — leverage moderate'],
		whyNow: ['Nuvama upgraded post Q1 results', 'Long buildup in futures accelerating', 'Auto sector in hot trend (+18% 3M)', 'Still 18% below 52W high — room to recover'],
		missingData: [],
		eventRisks: [{ type: 'EARNINGS', date: '2026-11-01', daysAway: 78, severity: 'LOW', note: 'Q2 FY27' }],
		extraTags: [{ id: 't1', emoji: '💰', label: 'UNDERVALUED', category: 'FUNDAMENTAL', sentiment: 'BULLISH', evidence: 'PE 8.2x vs sector 18x — trading at 54% discount to sector median' }],
		scoreHistory: [
			{ date: '2026-07-15', score: 68, rating: 'HOLD', changes: [] },
			{ date: '2026-07-22', score: 74, rating: 'HOLD', changes: [{ factor: 'JLR margin improvement', delta: 6 }] },
			{ date: TODAY, score: 77, rating: 'BUY', changes: [{ factor: 'Q1 beat + guidance raise + Nuvama upgrade', delta: 3 }] }
		]
	},

	// ── ASIANPAINT ───────────────────────────────────────────────────────────
	{
		symbol: 'ASIANPAINT',
		name: 'Asian Paints Ltd',
		sector: 'Chemicals',
		industry: 'Paints & Coatings',
		marketCapType: 'LARGE',
		isFno: true,
		fund: {
			revenueGrowthYoY: -4.2, revenueGrowthQoQ: -1.8, patGrowthYoY: -18.4,
			ebitdaGrowthYoY: -12.6, epsGrowthYoY: -19.2,
			roe: 28.4, roce: 36.8, pe: 48, pb: 12.4, evEbitda: 30, peg: -2.5,
			debtToEquity: 0.0, interestCoverage: 999,
			operatingCashFlow: 3840, freeCashFlow: 2480,
			promoterHolding: 52.7, promoterHoldingPrevQ: 52.7, promoterPledge: 0,
			sectorPeMedian: 40, revenueLatest: 24200, patLatest: 1682,
			marketCap: 248000, quarterReported: 'Q1 FY27', quarterUpdated: '2026-07-22'
		},
		inst: {
			fiiHolding: 18.4, fiiHoldingPrevQ: 19.2, fiiHolding2QAgo: 20.1,
			mfHolding: 12.2, mfHoldingPrevQ: 12.8, diiHolding: 13.4, diiHoldingPrevQ: 14.0,
			recentBlockDeals: [],
			recentBulkDeals: [],
			brokerageRatings: [{ date: '2026-07-23', broker: 'HDFC Securities', rating: 'SELL', target: 2100, action: 'DOWNGRADED' }],
			managementGuidance: [{ date: '2026-07-22', type: 'REVENUE', direction: 'LOWERED', details: 'Volume declined 5% in Q1; competitive intensity from Birla Opus higher than expected' }],
			qipHistory: [],
			updatedAt: TODAY
		},
		tech: {
			price: 2348, dayHigh: 2368, dayLow: 2332, open: 2354, prevClose: 2368.6,
			change: -20.6, changePct: -0.87,
			volume: 1840000, avgVolume20D: 2140000, volumeRatio: 0.86,
			high52w: 3282, low52w: 2148,
			dma20: 2428, dma50: 2524, dma100: 2628, dma200: 2724,
			rsi: 38, macd: -28.4, macdSignal: -18.2, macdHist: -10.2, adx: 28,
			atr: 36.4, beta: 0.64,
			relativeStrengthVsNifty1M: -8.4, relativeStrengthVsNifty3M: -18.6, relativeStrengthVsSector3M: -12.4,
			supportLevel: 2148, resistanceLevel: 2520,
			trend: 'STRONG_DOWN', updatedAt: TODAY
		},
		fno: {
			futuresPrice: 2352, futuresOI: 38400000, futuresOIChange: 8.2,
			futuresBasis: 0.17, fnoClass: 'SHORT_BUILDUP',
			pcr: 0.62, maxPain: 2300, callOIAtResistance: 7200000, putOIAtSupport: 4400000,
			ivPercentile: 56, updatedAt: TODAY
		},
		sectorChange3M: -4, sectorRS: -8, daysToEarnings: 68, analystTarget: 2100,
		whyBuy: [],
		whatCanGoWrong: ['Revenue declining -4.2% YoY — volume market share loss to Birla Opus', 'PAT down -18.4% — earnings deterioration', 'Price below all DMAs — structural downtrend', 'Short buildup in futures accelerating', 'FII + MF both reducing holdings for 2 quarters', 'Management lowered guidance — volume -5% in Q1'],
		whyNow: [],
		missingData: [],
		eventRisks: [{ type: 'EARNINGS', date: '2026-10-22', daysAway: 68, severity: 'HIGH', note: 'Q2 FY27 — volume trends critical to watch' }],
		extraTags: [
			{ id: 't1', emoji: '⚠️', label: 'EARNINGS MISS', category: 'RISK', sentiment: 'BEARISH', evidence: 'PAT -18.4% YoY; volume decline -5% in Q1 FY27' },
			{ id: 't2', emoji: '🔻', label: 'FII SELLING', category: 'RISK', sentiment: 'BEARISH', evidence: 'FII: 20.1% → 18.4% — consistent reduction over 2 quarters' }
		],
		scoreHistory: [
			{ date: '2026-07-15', score: 42, rating: 'SELL', changes: [] },
			{ date: TODAY, score: 35, rating: 'STRONG_SELL', changes: [{ factor: 'Q1 miss + guidance cut + competitive pressure', delta: -7 }] }
		]
	}
];

// ─── Analysis Builder ──────────────────────────────────────────────────────────

function buildAnalysis(raw: RawStock): StockAnalysis {
	const scoreBreakdown = calculateScore({
		fundamental: raw.fund,
		institutional: raw.inst,
		technical: raw.tech,
		fno: raw.fno,
		sectorChange3M: raw.sectorChange3M,
		sectorRS: raw.sectorRS,
		regime: REGIME,
		daysToEarnings: raw.daysToEarnings,
		avgDailyVolume: raw.tech.avgVolume20D
	});

	const rating = deriveRating(
		scoreBreakdown,
		raw.fund,
		raw.inst,
		raw.tech,
		REGIME,
		raw.daysToEarnings
	);

	const signals = buildSignalConflicts(raw.fund, raw.inst, raw.tech, raw.fno, REGIME, scoreBreakdown);
	const entry = calculateEntryTarget(raw.tech, raw.fund, raw.analystTarget);

	const tier1Checks: TierCheck[] = [
		{ label: 'Price above key resistance / breakout', passed: raw.tech.price > (raw.tech.breakoutLevel ?? raw.tech.dma50), value: raw.tech.breakoutLevel ? `₹${raw.tech.breakoutLevel}` : 'N/A', critical: true },
		{ label: 'Volume ≥ 2× average on breakout day', passed: raw.tech.volumeRatio >= 2, value: `${raw.tech.volumeRatio.toFixed(1)}× avg`, critical: true },
		{ label: '50 DMA trending upward', passed: raw.tech.dma50 > raw.tech.dma200, value: `₹${raw.tech.dma50.toFixed(0)}`, critical: true },
		{ label: 'RSI between 50–65', passed: raw.tech.rsi >= 50 && raw.tech.rsi <= 65, value: raw.tech.rsi.toFixed(0), critical: true },
		{ label: 'Price above 50 DMA', passed: raw.tech.price > raw.tech.dma50, value: `₹${raw.tech.dma50.toFixed(0)}` },
		{ label: 'Price above 200 DMA', passed: raw.tech.price > raw.tech.dma200, value: `₹${raw.tech.dma200.toFixed(0)}` },
		{ label: 'No earnings within 5 days', passed: raw.daysToEarnings === null || raw.daysToEarnings > 5, value: raw.daysToEarnings ? `${raw.daysToEarnings}d away` : 'N/A' }
	];

	const tier2Checks: TierCheck[] = [
		{ label: 'FII net buying / increasing ownership', passed: raw.inst.fiiHolding > raw.inst.fiiHoldingPrevQ, value: `${(raw.inst.fiiHolding - raw.inst.fiiHoldingPrevQ).toFixed(1)}%` },
		{ label: 'Mutual Fund ownership increasing', passed: raw.inst.mfHolding > raw.inst.mfHoldingPrevQ, value: `${(raw.inst.mfHolding - raw.inst.mfHoldingPrevQ).toFixed(1)}%` },
		{ label: 'Futures long buildup', passed: raw.fno?.fnoClass === 'LONG_BUILDUP', value: raw.fno?.fnoClass ?? 'N/A' },
		{ label: 'PE below sector average', passed: raw.fund.pe < raw.fund.sectorPeMedian, value: `${raw.fund.pe}x vs ${raw.fund.sectorPeMedian}x sector` },
		{ label: 'Brokerage upgrade / positive coverage', passed: raw.inst.brokerageRatings.some(r => r.action === 'UPGRADED' || r.action === 'INITIATED'), value: raw.inst.brokerageRatings[0]?.broker ?? 'N/A' }
	];

	const tier3Checks: TierCheck[] = [
		{ label: 'Promoter stake stable or increasing', passed: raw.fund.promoterHolding >= raw.fund.promoterHoldingPrevQ, value: `${raw.fund.promoterHolding.toFixed(1)}%` },
		{ label: 'Promoter pledge low (< 10%)', passed: raw.fund.promoterPledge < 10, value: `${raw.fund.promoterPledge.toFixed(1)}%` },
		{ label: 'Sector momentum positive', passed: raw.sectorChange3M > 5, value: `+${raw.sectorChange3M}% 3M` },
		{ label: 'NIFTY/Sensex in uptrend', passed: REGIME === 'BULL' || REGIME === 'STRONG_BULL', value: REGIME },
		{ label: 'Stock outperforming NIFTY (3M)', passed: raw.tech.relativeStrengthVsNifty3M > 0, value: `${raw.tech.relativeStrengthVsNifty3M > 0 ? '+' : ''}${raw.tech.relativeStrengthVsNifty3M.toFixed(1)}%` }
	];

	const standardTags: SignalTag[] = buildStandardTags(raw, scoreBreakdown);
	const tags = [...raw.extraTags, ...standardTags];

	// Data confidence: reduce if FII data is delayed, options data missing, etc.
	let confidence = 92;
	if (raw.missingData.length > 0) confidence -= raw.missingData.length * 4;
	if (!raw.fno && raw.isFno) confidence -= 5;
	confidence = Math.max(Math.min(confidence, 99), 55);

	return {
		symbol: raw.symbol,
		name: raw.name,
		sector: raw.sector,
		industry: raw.industry,
		marketCapType: raw.marketCapType,
		exchange: 'NSE',
		isFno: raw.isFno,
		rating,
		score: scoreBreakdown,
		signalScore: scoreBreakdown.total,
		dataConfidence: confidence,
		marketRegime: REGIME,
		fundamental: raw.fund,
		institutional: raw.inst,
		technical: raw.tech,
		fno: raw.fno,
		entry,
		tags,
		tier1Checks,
		tier2Checks,
		tier3Checks,
		signals,
		whyBuy: raw.whyBuy,
		whatCanGoWrong: raw.whatCanGoWrong,
		whyNow: raw.whyNow,
		missingData: raw.missingData,
		eventRisks: raw.eventRisks,
		scoreHistory: raw.scoreHistory,
		analysedAt: TODAY
	};
}

function buildStandardTags(raw: RawStock, scores: { fundamental: number; institutional: number; technical: number }): SignalTag[] {
	const tags: SignalTag[] = [];

	if (raw.fund.patGrowthYoY >= 25) tags.push({ id: 'std_earning', emoji: '🔥', label: 'EARNINGS GROWTH', category: 'FUNDAMENTAL', sentiment: 'BULLISH', evidence: `PAT growth +${raw.fund.patGrowthYoY}% YoY` });
	if (raw.tech.breakoutLevel && raw.tech.price > raw.tech.breakoutLevel) tags.push({ id: 'std_breakout', emoji: '🚀', label: 'BREAKOUT', category: 'TECHNICAL', sentiment: 'BULLISH', evidence: `Price broke ₹${raw.tech.breakoutLevel} resistance` });
	if (raw.tech.volumeRatio >= 1.5) tags.push({ id: 'std_volume', emoji: '📊', label: 'VOLUME SURGE', category: 'TECHNICAL', sentiment: 'BULLISH', evidence: `Volume ${raw.tech.volumeRatio.toFixed(1)}× 20-day average` });
	if (raw.tech.relativeStrengthVsNifty3M >= 10) tags.push({ id: 'std_rs', emoji: '💪', label: 'RELATIVE STRENGTH', category: 'TECHNICAL', sentiment: 'BULLISH', evidence: `+${raw.tech.relativeStrengthVsNifty3M.toFixed(1)}% vs NIFTY (3M)` });
	if (raw.inst.fiiHolding > raw.inst.fiiHolding2QAgo + 1) tags.push({ id: 'std_fii', emoji: '🏦', label: 'FII ACCUMULATION', category: 'INSTITUTIONAL', sentiment: 'BULLISH', evidence: `FII holding +${(raw.inst.fiiHolding - raw.inst.fiiHolding2QAgo).toFixed(1)}% over 2 quarters` });
	if (raw.inst.mfHolding > raw.inst.mfHoldingPrevQ) tags.push({ id: 'std_mf', emoji: '🏛️', label: 'MF BUY', category: 'INSTITUTIONAL', sentiment: 'BULLISH', evidence: `MF holding +${(raw.inst.mfHolding - raw.inst.mfHoldingPrevQ).toFixed(1)}%` });
	if (raw.fund.freeCashFlow > 0) tags.push({ id: 'std_fcf', emoji: '💵', label: 'FCF POSITIVE', category: 'FUNDAMENTAL', sentiment: 'BULLISH', evidence: `Free cash flow: ₹${raw.fund.freeCashFlow} Cr` });
	if (raw.fund.pe < raw.fund.sectorPeMedian * 0.8) tags.push({ id: 'std_value', emoji: '💰', label: 'UNDERVALUED', category: 'FUNDAMENTAL', sentiment: 'BULLISH', evidence: `PE ${raw.fund.pe}x vs sector ${raw.fund.sectorPeMedian}x` });
	if (raw.fund.promoterPledge > 15) tags.push({ id: 'std_pledge', emoji: '⚠️', label: 'PROMOTER PLEDGE', category: 'RISK', sentiment: 'BEARISH', evidence: `Pledge: ${raw.fund.promoterPledge}%` });
	if (raw.fund.debtToEquity > 2) tags.push({ id: 'std_debt', emoji: '⚠️', label: 'DEBT RISK', category: 'RISK', sentiment: 'BEARISH', evidence: `D/E ratio: ${raw.fund.debtToEquity}` });
	if (raw.tech.rsi > 70) tags.push({ id: 'std_overbought', emoji: '⚠️', label: 'OVERBOUGHT', category: 'RISK', sentiment: 'BEARISH', evidence: `RSI at ${raw.tech.rsi} — overbought territory` });

	return tags;
}

// ─── Public API ────────────────────────────────────────────────────────────────

const ANALYSES: Map<string, StockAnalysis> = new Map();
let built = false;

function ensureBuilt() {
	if (built) return;
	for (const raw of STOCKS) {
		ANALYSES.set(raw.symbol, buildAnalysis(raw));
	}
	built = true;
}

export function getAllStocks(): StockAnalysis[] {
	ensureBuilt();
	return [...ANALYSES.values()];
}

export function getStock(symbol: string): StockAnalysis | undefined {
	ensureBuilt();
	return ANALYSES.get(symbol.toUpperCase());
}

export function getMarketOverview(): MarketOverview {
	return {
		nifty50: { value: 24862.4, change: 178.6, changePct: 0.72 },
		sensex: { value: 81428.8, change: 472.4, changePct: 0.58 },
		bankNifty: { value: 53284.6, change: 484.2, changePct: 0.91 },
		niftyMidcap: { value: 58242.8, change: 542.8, changePct: 0.94 },
		indiaVix: { value: 13.42, change: -0.44, changePct: -3.17 },
		fiiFlow: 1842,
		diiFlow: 923,
		advanceDeclineRatio: 1.72,
		regime: REGIME,
		updatedAt: TODAY
	};
}

export function getSectorData(): SectorData[] {
	return [
		{ name: 'Auto & Auto Components', index: 'NIFTY AUTO', change1D: 1.24, change1W: 3.82, change1M: 6.48, change3M: 18.4, relativeStrength: 14.2, fiiFlow: 842, avgEarningsGrowth: 22.4, avgPe: 24, trend: 'HOT', stockCount: 48, strongBuyCount: 8, buyCount: 14 },
		{ name: 'Capital Goods', index: 'NIFTY CAP GOODS', change1D: 0.88, change1W: 2.64, change1M: 5.24, change3M: 14.2, relativeStrength: 10.4, fiiFlow: 384, avgEarningsGrowth: 18.6, avgPe: 32, trend: 'IMPROVING', stockCount: 42, strongBuyCount: 5, buyCount: 12 },
		{ name: 'Telecom', index: 'NIFTY TELCO', change1D: 0.64, change1W: 2.14, change1M: 4.82, change3M: 12.4, relativeStrength: 8.2, fiiFlow: 642, avgEarningsGrowth: 24.8, avgPe: 38, trend: 'IMPROVING', stockCount: 12, strongBuyCount: 3, buyCount: 5 },
		{ name: 'Banking & Finance', index: 'NIFTY BANK', change1D: 0.91, change1W: 2.28, change1M: 4.14, change3M: 9.2, relativeStrength: 5.4, fiiFlow: 1284, avgEarningsGrowth: 16.2, avgPe: 18, trend: 'IMPROVING', stockCount: 62, strongBuyCount: 4, buyCount: 16 },
		{ name: 'IT & Technology', index: 'NIFTY IT', change1D: 0.42, change1W: 1.84, change1M: 3.24, change3M: 8.4, relativeStrength: 4.2, fiiFlow: 284, avgEarningsGrowth: 10.8, avgPe: 28, trend: 'NEUTRAL', stockCount: 44, strongBuyCount: 2, buyCount: 8 },
		{ name: 'Pharma & Healthcare', index: 'NIFTY PHARMA', change1D: 0.28, change1W: 1.24, change1M: 2.84, change3M: 6.8, relativeStrength: 2.8, fiiFlow: 142, avgEarningsGrowth: 14.4, avgPe: 32, trend: 'NEUTRAL', stockCount: 38, strongBuyCount: 2, buyCount: 7 },
		{ name: 'Energy & Oil', index: 'NIFTY ENERGY', change1D: -0.14, change1W: 0.48, change1M: -0.84, change3M: 2.4, relativeStrength: -1.4, fiiFlow: -84, avgEarningsGrowth: 8.4, avgPe: 14, trend: 'NEUTRAL', stockCount: 28, strongBuyCount: 1, buyCount: 4 },
		{ name: 'FMCG', index: 'NIFTY FMCG', change1D: -0.42, change1W: -0.84, change1M: -2.48, change3M: -4.2, relativeStrength: -8.2, fiiFlow: -384, avgEarningsGrowth: 4.2, avgPe: 44, trend: 'WEAKENING', stockCount: 34, strongBuyCount: 0, buyCount: 2 },
		{ name: 'Metals & Mining', index: 'NIFTY METAL', change1D: -0.64, change1W: -1.24, change1M: -3.84, change3M: -8.4, relativeStrength: -12.4, fiiFlow: -242, avgEarningsGrowth: -4.2, avgPe: 12, trend: 'WEAKENING', stockCount: 24, strongBuyCount: 0, buyCount: 1 },
		{ name: 'Realty', index: 'NIFTY REALTY', change1D: -1.24, change1W: -2.84, change1M: -5.24, change3M: -12.4, relativeStrength: -16.4, fiiFlow: -184, avgEarningsGrowth: 12.4, avgPe: 28, trend: 'FALLING', stockCount: 18, strongBuyCount: 0, buyCount: 1 }
	];
}
