export type Rating = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
export type MarketRegime = 'STRONG_BULL' | 'BULL' | 'NEUTRAL' | 'BEAR' | 'STRONG_BEAR';
export type DataFreshness = 'LIVE' | 'RECENT' | 'DELAYED' | 'STALE';
export type SignalStatus = 'CONFIRMED' | 'PARTIAL' | 'WEAK' | 'CONFLICTING' | 'INSUFFICIENT';
export type MarketCap = 'LARGE' | 'MID' | 'SMALL';
export type FnoClass = 'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'SHORT_COVERING' | 'LONG_UNWINDING' | 'NEUTRAL';
export type SectorTrend = 'HOT' | 'IMPROVING' | 'NEUTRAL' | 'WEAKENING' | 'FALLING';

export interface DataPoint<T> {
	value: T;
	source: string;
	updatedAt: string;
	period?: string;
	freshness: DataFreshness;
}

export interface FundamentalData {
	revenueGrowthYoY: number;       // %
	revenueGrowthQoQ: number;       // %
	patGrowthYoY: number;           // %
	ebitdaGrowthYoY: number;        // %
	epsGrowthYoY: number;           // %
	roe: number;                    // %
	roce: number;                   // %
	pe: number;
	pb: number;
	evEbitda: number;
	peg: number;
	debtToEquity: number;
	interestCoverage: number;
	operatingCashFlow: number;      // Cr
	freeCashFlow: number;           // Cr
	promoterHolding: number;        // %
	promoterHoldingPrevQ: number;   // %
	promoterPledge: number;         // %
	sectorPeMedian: number;
	revenueLatest: number;          // Cr
	patLatest: number;              // Cr
	marketCap: number;              // Cr
	quarterReported: string;
	quarterUpdated: string;
}

export interface InstitutionalData {
	fiiHolding: number;             // %
	fiiHoldingPrevQ: number;        // %
	fiiHolding2QAgo: number;        // %
	mfHolding: number;              // %
	mfHoldingPrevQ: number;         // %
	diiHolding: number;             // %
	diiHoldingPrevQ: number;        // %
	recentBlockDeals: BlockDeal[];
	recentBulkDeals: BulkDeal[];
	brokerageRatings: BrokerageRating[];
	managementGuidance: GuidanceEvent[];
	qipHistory: QIPEvent[];
	updatedAt: string;
}

export interface BlockDeal {
	date: string;
	buyer: string;
	seller: string;
	price: number;
	shares: number;
	valueInCr: number;
	buyerType: 'INSTITUTIONAL' | 'PROMOTER' | 'RETAIL' | 'UNKNOWN';
	sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface BulkDeal {
	date: string;
	client: string;
	buySell: 'BUY' | 'SELL';
	price: number;
	shares: number;
	valueInCr: number;
}

export interface BrokerageRating {
	date: string;
	broker: string;
	rating: 'BUY' | 'OUTPERFORM' | 'NEUTRAL' | 'UNDERPERFORM' | 'SELL';
	target: number;
	prevRating?: string;
	action: 'INITIATED' | 'UPGRADED' | 'MAINTAINED' | 'DOWNGRADED';
}

export interface GuidanceEvent {
	date: string;
	type: 'REVENUE' | 'MARGIN' | 'VOLUME' | 'CAPEX' | 'OTHER';
	direction: 'RAISED' | 'MAINTAINED' | 'LOWERED';
	details: string;
}

export interface QIPEvent {
	date: string;
	size: number;               // Cr
	pricePerShare: number;
	investors: string[];
}

export interface TechnicalData {
	price: number;
	dayHigh: number;
	dayLow: number;
	open: number;
	prevClose: number;
	change: number;             // absolute
	changePct: number;          // %
	volume: number;
	avgVolume20D: number;
	volumeRatio: number;        // volume / avg
	high52w: number;
	low52w: number;
	dma20: number;
	dma50: number;
	dma100: number;
	dma200: number;
	rsi: number;
	macd: number;
	macdSignal: number;
	macdHist: number;
	adx: number;
	atr: number;
	beta: number;
	relativeStrengthVsNifty1M: number;   // %
	relativeStrengthVsNifty3M: number;   // %
	relativeStrengthVsSector3M: number;  // %
	breakoutLevel?: number;
	supportLevel: number;
	resistanceLevel: number;
	trend: 'STRONG_UP' | 'UP' | 'SIDEWAYS' | 'DOWN' | 'STRONG_DOWN';
	updatedAt: string;
}

export interface FnoData {
	futuresPrice: number;
	futuresOI: number;
	futuresOIChange: number;    // %
	futuresBasis: number;       // % premium
	fnoClass: FnoClass;
	pcr: number;                // Put/Call Ratio
	maxPain: number;
	callOIAtResistance: number;
	putOIAtSupport: number;
	ivPercentile: number;       // 0-100
	updatedAt: string;
}

export interface EntryTargetData {
	entryLow: number;
	entryHigh: number;
	stopLoss: number;
	stopLossMethod: string;
	target1: number;
	target2: number;
	targetLTLow: number;
	targetLTHigh: number;
	targetLTMethod: string;
	riskPct: number;
	rewardT1Pct: number;
	rewardLTPct: number;
	rrRatio: number;
	setupInvalidationLevel: number;
	setupInvalidationNote: string;
}

export interface ScoreBreakdown {
	fundamental: number;        // max 30
	institutional: number;      // max 20
	technical: number;          // max 25
	fno: number;                // max 10
	sectorMacro: number;        // max 10
	riskEvent: number;          // max 5 (can reduce)
	total: number;              // max 100
}

export interface SignalTag {
	id: string;
	emoji: string;
	label: string;
	category: 'INSTITUTIONAL' | 'MANAGEMENT' | 'TECHNICAL' | 'FUNDAMENTAL' | 'RISK';
	sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
	evidence: string;
}

export interface TierCheck {
	label: string;
	passed: boolean;
	value?: string;
	critical?: boolean;
}

export interface SignalConflict {
	dimension: string;
	signal: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
	status: SignalStatus;
	note: string;
}

export interface EventRisk {
	type: 'EARNINGS' | 'BOARD_MEETING' | 'DIVIDEND' | 'AGM' | 'QIP' | 'RIGHTS' | 'SPLIT' | 'BONUS' | 'REGULATORY';
	date: string;
	daysAway: number;
	severity: 'HIGH' | 'MEDIUM' | 'LOW';
	note: string;
}

export interface StockAnalysis {
	symbol: string;
	name: string;
	sector: string;
	industry: string;
	marketCapType: MarketCap;
	exchange: 'NSE' | 'BSE';
	isFno: boolean;

	rating: Rating;
	score: ScoreBreakdown;
	signalScore: number;        // total
	dataConfidence: number;     // 0-100
	marketRegime: MarketRegime;

	fundamental: FundamentalData;
	institutional: InstitutionalData;
	technical: TechnicalData;
	fno?: FnoData;
	entry: EntryTargetData;

	tags: SignalTag[];
	tier1Checks: TierCheck[];
	tier2Checks: TierCheck[];
	tier3Checks: TierCheck[];
	signals: SignalConflict[];
	whyBuy: string[];
	whatCanGoWrong: string[];
	whyNow: string[];
	missingData: string[];
	eventRisks: EventRisk[];

	scoreHistory: ScoreHistory[];
	analysedAt: string;

	/**
	 * 'LIVE_TECHNICAL_ONLY' = price/technical are real (live provider), but
	 * fundamental/institutional/fno/score/rating are NOT — no live provider
	 * for those exists yet (see src/lib/providers/README.md). The zeroed
	 * placeholder values in those fields must not be rendered as real data;
	 * the UI checks this flag and shows an explicit "not available" state
	 * instead. Omitted/undefined means 'FULL' (the original all-mock shape).
	 */
	dataMode?: 'FULL' | 'LIVE_TECHNICAL_ONLY';
}

export interface ScoreHistory {
	date: string;
	score: number;
	rating: Rating;
	changes: ScoreChange[];
}

export interface ScoreChange {
	factor: string;
	delta: number;
}

export interface MarketOverview {
	nifty50: IndexData;
	sensex: IndexData;
	bankNifty: IndexData;
	niftyMidcap: IndexData;
	indiaVix: IndexData;
	fiiFlow: number;            // Cr (+ = buy, - = sell)
	diiFlow: number;            // Cr
	advanceDeclineRatio: number;
	regime: MarketRegime;
	updatedAt: string;
}

export interface IndexData {
	value: number;
	change: number;
	changePct: number;
}

export interface SectorData {
	name: string;
	index: string;
	change1D: number;
	change1W: number;
	change1M: number;
	change3M: number;
	relativeStrength: number;
	fiiFlow: number;
	avgEarningsGrowth: number;
	avgPe: number;
	trend: SectorTrend;
	stockCount: number;
	strongBuyCount: number;
	buyCount: number;
}

export interface ScreenerFilters {
	rating?: Rating[];
	marketCap?: MarketCap[];
	sector?: string[];
	minScore?: number;
	maxScore?: number;
	minRsi?: number;
	maxRsi?: number;
	minRevenueGrowth?: number;
	minProfitGrowth?: number;
	maxPe?: number;
	minRoe?: number;
	maxDebtEquity?: number;
	fiiIncreasing?: boolean;
	mfIncreasing?: boolean;
	breakout?: boolean;
	longBuildup?: boolean;
	promoterPledgeBelow?: number;
	minRrRatio?: number;
	isFno?: boolean;
}

export interface StockSummary {
	symbol: string;
	name: string;
	sector: string;
	marketCapType: MarketCap;
	rating: Rating;
	signalScore: number;
	dataConfidence: number;
	price: number;
	changePct: number;
	high52w: number;
	low52w: number;
	rsi: number;
	pe: number;
	revenueGrowthYoY: number;
	patGrowthYoY: number;
	fiiHolding: number;
	fiiHoldingChange: number;
	mfHolding: number;
	mfHoldingChange: number;
	promoterHolding: number;
	volumeRatio: number;
	fnoClass?: FnoClass;
	tags: Pick<SignalTag, 'emoji' | 'label' | 'sentiment'>[];
	rrRatio: number;
	topReason: string;
}
