<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { StockAnalysis } from '$lib/types';
	import {
		ratingConfig, formatPct, formatNumber, changePctColor,
		fnoConfig, pct52wPosition, regimeConfig
	} from '$lib/utils';
	import TradeSetupCard from '$lib/components/stocks/TradeSetupCard.svelte';
	import ScoreBreakdown from '$lib/components/stocks/ScoreBreakdown.svelte';
	import SignalTags from '$lib/components/stocks/SignalTags.svelte';
	import ReasonsPanel from '$lib/components/stocks/ReasonsPanel.svelte';
	import TierChecklist from '$lib/components/stocks/TierChecklist.svelte';
	import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown } from 'lucide-svelte';

	let stock: StockAnalysis | null = null;
	let loading = true;
	let error = '';

	$: symbol = $page.params.symbol;

	onMount(async () => {
		try {
			const res = await fetch(`/api/stocks/${symbol}`);
			if (!res.ok) { error = `Stock ${symbol} not found`; loading = false; return; }
			stock = await res.json();
		} catch (e) {
			error = 'Failed to load stock data';
		}
		loading = false;
	});

	$: cfg = stock ? ratingConfig(stock.rating) : null;
	$: regimeCfg = stock ? regimeConfig(stock.marketRegime) : null;
	$: pos52w = stock ? pct52wPosition(stock.technical.price, stock.technical.low52w, stock.technical.high52w) : 50;
</script>

<svelte:head>
	<title>{symbol} — StockIntel</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-64">
		<div class="text-terminal-muted text-sm">Loading analysis for {symbol}...</div>
	</div>
{:else if error}
	<div class="p-6">
		<div class="card p-8 text-center border-red-400/20">
			<div class="text-red-400 text-4xl mb-3">⚠️</div>
			<div class="text-terminal-primary font-semibold mb-1">{error}</div>
			<a href="/screener" class="text-xs text-emerald-400 hover:underline">Search for a stock in the screener</a>
		</div>
	</div>
{:else if stock}
	<div class="p-6 space-y-6 animate-fade-in">
		<!-- Header -->
		<div>
			<a href="/dashboard" class="flex items-center gap-1.5 text-xs text-terminal-muted hover:text-terminal-primary mb-4 transition-colors">
				<ArrowLeft class="h-3.5 w-3.5" /> Back to Dashboard
			</a>

			<div class="card p-5">
				<div class="flex items-start justify-between gap-4 flex-wrap">
					<div class="flex-1 min-w-0">
						<!-- Name & symbol -->
						<div class="flex items-center gap-3 mb-1 flex-wrap">
							<h1 class="font-mono text-2xl font-bold text-terminal-primary">{stock.symbol}</h1>
							<span class="text-sm text-terminal-muted">{stock.exchange}</span>
							<span class="text-xs px-2 py-0.5 rounded bg-terminal-hover text-terminal-secondary">{stock.marketCapType} CAP</span>
							{#if stock.isFno}
								<span class="text-xs px-2 py-0.5 rounded bg-purple-400/10 text-purple-400 border border-purple-400/20">F&O</span>
							{/if}
						</div>
						<div class="text-sm text-terminal-secondary mb-3">{stock.name}</div>
						<div class="text-xs text-terminal-muted">{stock.sector} · {stock.industry}</div>
					</div>

					<!-- Price block -->
					<div class="text-right shrink-0">
						<div class="font-mono text-3xl font-bold text-terminal-primary">₹{formatNumber(stock.technical.price, 2)}</div>
						<div class="flex items-center gap-2 justify-end mt-1">
							{#if stock.technical.changePct >= 0}
								<TrendingUp class="h-4 w-4 text-emerald-400" />
							{:else}
								<TrendingDown class="h-4 w-4 text-red-400" />
							{/if}
							<span class="font-mono text-sm {changePctColor(stock.technical.changePct)}">
								{stock.technical.change >= 0 ? '+' : ''}{formatNumber(stock.technical.change, 2)} ({formatPct(stock.technical.changePct)})
							</span>
						</div>
					</div>
				</div>

				<!-- Tags row -->
				<div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-terminal-border">
					{#if cfg}
						<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold {cfg.bg} {cfg.color} {cfg.border} border">
							{cfg.emoji} {cfg.label}
						</span>
					{/if}
					{#each stock.tags.slice(0, 5) as tag}
						<span class="text-xs px-2 py-1 rounded {tag.sentiment === 'BULLISH' ? 'bg-emerald-400/10 text-emerald-400' : tag.sentiment === 'BEARISH' ? 'bg-red-400/10 text-red-400' : 'bg-terminal-hover text-terminal-secondary'}">
							{tag.emoji} {tag.label}
						</span>
					{/each}
				</div>

				<!-- Key stats strip -->
				<div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-4 pt-4 border-t border-terminal-border">
					{#each [
						{ label: 'Market Cap', value: `₹${(stock.fundamental.marketCap / 100).toFixed(0)} K Cr` },
						{ label: 'Sector', value: stock.sector },
						{ label: '52W High', value: `₹${formatNumber(stock.technical.high52w, 0)}` },
						{ label: '52W Low', value: `₹${formatNumber(stock.technical.low52w, 0)}` },
						{ label: 'Volume', value: `${(stock.technical.volume / 100000).toFixed(1)}L` },
						{ label: 'Avg Vol', value: `${(stock.technical.avgVolume20D / 100000).toFixed(1)}L` },
						{ label: 'Beta', value: formatNumber(stock.technical.beta, 2) },
						{ label: 'ATR', value: `₹${formatNumber(stock.technical.atr, 1)}` }
					] as stat}
						<div>
							<div class="stat-label">{stat.label}</div>
							<div class="stat-value truncate">{stat.value}</div>
						</div>
					{/each}
				</div>

				<!-- 52W position bar -->
				<div class="mt-4">
					<div class="flex justify-between text-[11px] text-terminal-muted mb-1">
						<span>₹{formatNumber(stock.technical.low52w, 0)} (52W Low)</span>
						<span class="text-terminal-secondary font-semibold">{pos52w}% of range</span>
						<span>₹{formatNumber(stock.technical.high52w, 0)} (52W High)</span>
					</div>
					<div class="relative h-2 rounded-full bg-terminal-hover">
						<div class="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400" style="width: 100%"></div>
						<div class="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-terminal-bg bg-terminal-primary shadow-md transition-all"
							style="left: calc({pos52w}% - 8px)"></div>
					</div>
				</div>
			</div>
		</div>

		<!-- Main layout: 3 col -->
		<div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
			<!-- Left column -->
			<div class="xl:col-span-2 space-y-5">
				<!-- Reasons / Signals -->
				<ReasonsPanel
					whyBuy={stock.whyBuy}
					whatCanGoWrong={stock.whatCanGoWrong}
					whyNow={stock.whyNow}
					missingData={stock.missingData}
					signals={stock.signals}
					eventRisks={stock.eventRisks}
				/>

				<!-- Fundamental data -->
				<div class="card p-5">
					<h3 class="section-title">Fundamentals</h3>
					<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
						{#each [
							{ label: 'Revenue Growth', value: formatPct(stock.fundamental.revenueGrowthYoY), up: stock.fundamental.revenueGrowthYoY > 0 },
							{ label: 'PAT Growth', value: formatPct(stock.fundamental.patGrowthYoY), up: stock.fundamental.patGrowthYoY > 0 },
							{ label: 'EPS Growth', value: formatPct(stock.fundamental.epsGrowthYoY), up: stock.fundamental.epsGrowthYoY > 0 },
							{ label: 'EBITDA Growth', value: formatPct(stock.fundamental.ebitdaGrowthYoY), up: stock.fundamental.ebitdaGrowthYoY > 0 },
							{ label: 'ROE', value: formatPct(stock.fundamental.roe), up: stock.fundamental.roe >= 15 },
							{ label: 'ROCE', value: stock.fundamental.roce > 0 ? formatPct(stock.fundamental.roce) : 'N/A (Bank)', up: stock.fundamental.roce >= 15 },
							{ label: 'PE', value: `${stock.fundamental.pe}x`, up: stock.fundamental.pe < stock.fundamental.sectorPeMedian },
							{ label: 'PB', value: `${stock.fundamental.pb}x`, up: stock.fundamental.pb < 3 },
							{ label: 'EV/EBITDA', value: stock.fundamental.evEbitda > 0 ? `${stock.fundamental.evEbitda}x` : 'N/A', up: true },
							{ label: 'D/E Ratio', value: stock.fundamental.debtToEquity > 0 ? `${stock.fundamental.debtToEquity}x` : '0 (Net Cash)', up: stock.fundamental.debtToEquity < 1 },
							{ label: 'Int Coverage', value: stock.fundamental.interestCoverage < 999 ? `${stock.fundamental.interestCoverage}x` : 'NA (Bank)', up: stock.fundamental.interestCoverage > 3 },
							{ label: 'Free Cash Flow', value: `₹${stock.fundamental.freeCashFlow} Cr`, up: stock.fundamental.freeCashFlow > 0 }
						] as f}
							<div class="bg-terminal-surface rounded-md p-3">
								<div class="stat-label mb-1">{f.label}</div>
								<div class="font-mono text-sm font-semibold {f.up ? 'text-emerald-400' : 'text-red-400'}">{f.value}</div>
							</div>
						{/each}
					</div>

					<!-- Sector PE comparison -->
					<div class="mt-4 pt-4 border-t border-terminal-border">
						<div class="flex items-center justify-between text-xs mb-2">
							<span class="text-terminal-muted">PE vs Sector Median</span>
							<span class="font-mono {stock.fundamental.pe < stock.fundamental.sectorPeMedian ? 'text-emerald-400' : 'text-orange-400'}">
								{stock.fundamental.pe}x vs {stock.fundamental.sectorPeMedian}x sector
							</span>
						</div>
						<div class="stat-label mb-0.5">Data Source</div>
						<div class="text-xs text-terminal-muted">
							{stock.fundamental.quarterReported} · Last updated {stock.fundamental.quarterUpdated}
						</div>
					</div>
				</div>

				<!-- Institutional data -->
				<div class="card p-5">
					<h3 class="section-title">Institutional Activity</h3>

					<!-- Holdings grid -->
					<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
						{#each [
							{ label: 'FII Holding', curr: stock.institutional.fiiHolding, prev: stock.institutional.fiiHoldingPrevQ },
							{ label: 'MF Holding', curr: stock.institutional.mfHolding, prev: stock.institutional.mfHoldingPrevQ },
							{ label: 'DII Holding', curr: stock.institutional.diiHolding, prev: stock.institutional.diiHoldingPrevQ },
							{ label: 'Promoter', curr: stock.fundamental.promoterHolding, prev: stock.fundamental.promoterHoldingPrevQ, pledge: stock.fundamental.promoterPledge }
						] as h}
							{@const delta = h.curr - h.prev}
							<div class="bg-terminal-surface rounded-md p-3">
								<div class="stat-label mb-1">{h.label}</div>
								<div class="font-mono text-sm font-semibold text-terminal-primary">{h.curr.toFixed(1)}%</div>
								<div class="font-mono text-xs {delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-terminal-muted'}">
									{delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {Math.abs(delta).toFixed(1)}% QoQ
								</div>
								{#if h.pledge !== undefined && h.pledge > 0}
									<div class="text-[11px] text-orange-400 mt-0.5">Pledge: {h.pledge}%</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Brokerage ratings -->
					{#if stock.institutional.brokerageRatings.length}
						<div class="mb-4">
							<div class="stat-label mb-2">Recent Brokerage Coverage</div>
							<div class="space-y-2">
								{#each stock.institutional.brokerageRatings as br}
									<div class="flex items-center gap-3 p-2.5 rounded bg-terminal-surface border border-terminal-border text-xs">
										<div class="font-semibold text-terminal-primary w-24 shrink-0">{br.broker}</div>
										<span class="px-1.5 py-0.5 rounded {br.rating === 'BUY' || br.rating === 'OUTPERFORM' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'} font-mono">{br.rating}</span>
										<span class="text-emerald-400 font-mono">₹{formatNumber(br.target, 0)}</span>
										<span class="px-1.5 py-0.5 rounded {br.action === 'UPGRADED' || br.action === 'INITIATED' ? 'bg-blue-400/10 text-blue-400' : 'bg-terminal-hover text-terminal-muted'} font-mono text-[10px]">{br.action}</span>
										<span class="text-terminal-muted ml-auto">{br.date}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- QIP -->
					{#if stock.institutional.qipHistory.length}
						<div>
							<div class="stat-label mb-2">QIP History</div>
							{#each stock.institutional.qipHistory as qip}
								<div class="p-3 rounded bg-blue-400/5 border border-blue-400/20 text-xs">
									<div class="flex items-center gap-3 mb-1">
										<span class="text-blue-400 font-semibold">📈 QIP</span>
										<span class="font-mono text-terminal-primary">₹{qip.size.toLocaleString()} Cr</span>
										<span class="font-mono text-terminal-secondary">@ ₹{formatNumber(qip.pricePerShare, 2)}/share</span>
										<span class="text-terminal-muted ml-auto">{qip.date}</span>
									</div>
									<div class="text-terminal-muted">Investors: {qip.investors.join(', ')}</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Technical data -->
				<div class="card p-5">
					<h3 class="section-title">Technical Indicators</h3>
					<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
						{#each [
							{ label: 'RSI (14)', value: stock.technical.rsi.toFixed(1), good: stock.technical.rsi >= 50 && stock.technical.rsi <= 65 },
							{ label: 'Volume Ratio', value: `${stock.technical.volumeRatio.toFixed(2)}×`, good: stock.technical.volumeRatio >= 1.5 },
							{ label: 'ADX', value: stock.technical.adx.toFixed(1), good: stock.technical.adx > 25 },
							{ label: 'ATR', value: `₹${stock.technical.atr.toFixed(1)}`, good: true },
							{ label: '20 DMA', value: `₹${formatNumber(stock.technical.dma20, 0)}`, good: stock.technical.price > stock.technical.dma20 },
							{ label: '50 DMA', value: `₹${formatNumber(stock.technical.dma50, 0)}`, good: stock.technical.price > stock.technical.dma50 },
							{ label: '100 DMA', value: `₹${formatNumber(stock.technical.dma100, 0)}`, good: stock.technical.price > stock.technical.dma100 },
							{ label: '200 DMA', value: `₹${formatNumber(stock.technical.dma200, 0)}`, good: stock.technical.price > stock.technical.dma200 }
						] as t}
							<div class="bg-terminal-surface rounded-md p-3">
								<div class="stat-label mb-1">{t.label}</div>
								<div class="font-mono text-sm font-semibold {t.good ? 'text-emerald-400' : 'text-red-400'}">{t.value}</div>
							</div>
						{/each}
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div class="bg-terminal-surface rounded-md p-3">
							<div class="stat-label mb-1">RS vs NIFTY (3M)</div>
							<div class="font-mono text-sm {stock.technical.relativeStrengthVsNifty3M > 0 ? 'text-emerald-400' : 'text-red-400'}">
								{formatPct(stock.technical.relativeStrengthVsNifty3M)}
							</div>
						</div>
						<div class="bg-terminal-surface rounded-md p-3">
							<div class="stat-label mb-1">MACD Histogram</div>
							<div class="font-mono text-sm {stock.technical.macdHist > 0 ? 'text-emerald-400' : 'text-red-400'}">
								{stock.technical.macdHist > 0 ? '+' : ''}{stock.technical.macdHist.toFixed(2)}
							</div>
						</div>
					</div>

					{#if stock.technical.breakoutLevel}
						<div class="mt-3 p-3 rounded bg-emerald-400/5 border border-emerald-400/20 flex items-center gap-2 text-xs">
							<span class="text-emerald-400">🚀</span>
							<span class="text-emerald-300">Active breakout above ₹{formatNumber(stock.technical.breakoutLevel, 0)}</span>
						</div>
					{/if}
				</div>

				<!-- F&O data -->
				{#if stock.fno}
					<div class="card p-5">
						<h3 class="section-title">F&O Intelligence</h3>
						<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
							{#each [
								{ label: 'F&O Class', value: fnoConfig(stock.fno.fnoClass).label, color: fnoConfig(stock.fno.fnoClass).color },
								{ label: 'Futures OI Chg', value: formatPct(stock.fno.futuresOIChange), color: stock.fno.futuresOIChange > 0 ? 'text-emerald-400' : 'text-red-400' },
								{ label: 'Basis', value: formatPct(stock.fno.futuresBasis), color: stock.fno.futuresBasis > 0 ? 'text-emerald-400' : 'text-red-400' },
								{ label: 'PCR', value: stock.fno.pcr.toFixed(2), color: 'text-terminal-primary' },
								{ label: 'Max Pain', value: `₹${formatNumber(stock.fno.maxPain, 0)}`, color: 'text-amber-400' },
								{ label: 'IV Percentile', value: `${stock.fno.ivPercentile}%`, color: stock.fno.ivPercentile > 60 ? 'text-red-400' : 'text-terminal-secondary' }
							] as f}
								<div class="bg-terminal-surface rounded-md p-3">
									<div class="stat-label mb-1">{f.label}</div>
									<div class="font-mono text-sm font-semibold {f.color}">{f.value}</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Right column -->
			<div class="space-y-5">
				<!-- Trade setup -->
				<TradeSetupCard
					entry={stock.entry}
					rating={stock.rating}
					score={stock.signalScore}
					confidence={stock.dataConfidence}
				/>

				<!-- Score breakdown -->
				<ScoreBreakdown score={stock.score} history={stock.scoreHistory} />

				<!-- Signal tags -->
				<SignalTags tags={stock.tags} />

				<!-- Tier checklist -->
				<TierChecklist
					tier1={stock.tier1Checks}
					tier2={stock.tier2Checks}
					tier3={stock.tier3Checks}
				/>

				<!-- Data info -->
				<div class="card p-4 text-xs text-terminal-muted space-y-1">
					<div class="font-semibold text-terminal-secondary mb-2">Data Metadata</div>
					<div class="data-row text-xs">
						<span>Analysed At</span>
						<span class="font-mono">{new Date(stock.analysedAt).toLocaleString('en-IN')}</span>
					</div>
					<div class="data-row text-xs">
						<span>Market Regime</span>
						<span class="{regimeCfg?.color}">{regimeCfg?.label}</span>
					</div>
					<div class="data-row text-xs">
						<span>Quarterly Data</span>
						<span class="font-mono">{stock.fundamental.quarterReported}</span>
					</div>
					<div class="data-row text-xs">
						<span>Shareholding</span>
						<span class="font-mono">Latest quarterly</span>
					</div>
					<div class="data-row text-xs border-0">
						<span>Price Data</span>
						<span class="text-amber-400">🟠 Delayed (mock)</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Disclaimer -->
		<div class="card border-amber-400/20 p-4">
			<p class="text-[11px] text-terminal-muted leading-relaxed">
				<span class="text-amber-400 font-semibold">⚠️ Important:</span> This analysis is an algorithmic research output. Stop losses and targets are model-derived levels and may fail during gap openings, illiquid conditions, corporate actions, or unexpected events. This is not personalized investment advice. Always verify data with authoritative sources (NSE/BSE filings, SEBI disclosures) before trading.
			</p>
		</div>
	</div>
{/if}
