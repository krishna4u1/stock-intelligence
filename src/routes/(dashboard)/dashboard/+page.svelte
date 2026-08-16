<script lang="ts">
	import { onMount } from 'svelte';
	import type { MarketOverview, SectorData, StockSummary, StockAnalysis } from '$lib/types';
	import { ratingConfig, formatPct, regimeConfig, changePctColor } from '$lib/utils';
	import { TrendingUp, TrendingDown, Minus, ArrowRight, Activity, Users, Building, Radio } from 'lucide-svelte';

	let market: MarketOverview | null = null;
	let sectors: SectorData[] = [];
	let topStocks: StockSummary[] = [];
	let loading = true;

	// Fixed editorial pick list, not the localStorage-based user watchlist
	// (that's /watchlist). Fetched per-symbol through /api/stocks/<symbol> —
	// the same endpoint the detail page uses — so KAYNES/SYRMA/SBIN/PARAS
	// (outside the mock dataset) come back LIVE_TECHNICAL_ONLY with real
	// price/technicals, and HDFCBANK comes back FULL (mock fundamentals +
	// live technical overlay), same as visiting each stock's page directly.
	const TRACKED_SYMBOLS = ['KAYNES', 'SYRMA', 'HDFCBANK', 'SBIN', 'PARAS'];
	let tracked: StockAnalysis[] = [];
	let trackedLoading = true;

	onMount(async () => {
		const [mRes, sRes, stRes] = await Promise.all([
			fetch('/api/market'),
			fetch('/api/market?type=sectors'),
			fetch('/api/stocks?sort=score')
		]);
		if (mRes.ok) market = await mRes.json();
		if (sRes.ok) sectors = await sRes.json();
		if (stRes.ok) topStocks = await stRes.json();
		loading = false;

		const trackedResults = await Promise.all(
			TRACKED_SYMBOLS.map((sym) => fetch(`/api/stocks/${sym}`).then((r) => (r.ok ? r.json() : null)))
		);
		tracked = trackedResults.filter((s): s is StockAnalysis => s !== null);
		trackedLoading = false;
	});

	$: strongBuys = topStocks.filter(s => s.rating === 'STRONG_BUY');
	$: buys = topStocks.filter(s => s.rating === 'BUY');
	$: sells = topStocks.filter(s => s.rating === 'SELL' || s.rating === 'STRONG_SELL');
	$: regime = market ? regimeConfig(market.regime) : null;
</script>

<div class="p-6 space-y-6 animate-fade-in">
	<!-- Market overview -->
	{#if market}
		<div class="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
			<!-- Regime -->
			<div class="card p-4 flex flex-col gap-2 xl:col-span-2 {market.regime === 'BULL' || market.regime === 'STRONG_BULL' ? 'border-emerald-400/30 glow-bull' : 'border-red-400/30'}">
				<div class="stat-label">Market Regime</div>
				{#if regime}
					<div class="flex items-center gap-2">
						<div class="h-2.5 w-2.5 rounded-full {market.regime === 'BULL' || market.regime === 'STRONG_BULL' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}"></div>
						<span class="text-lg font-bold {regime.color}">{regime.label}</span>
					</div>
				{/if}
				<div class="flex gap-3 text-xs font-mono">
					<div>
						<div class="text-terminal-muted">FII</div>
						<div class="{market.fiiFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}">
							{market.fiiFlow >= 0 ? '+' : ''}₹{Math.abs(market.fiiFlow).toLocaleString()} Cr
						</div>
					</div>
					<div>
						<div class="text-terminal-muted">DII</div>
						<div class="{market.diiFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}">
							{market.diiFlow >= 0 ? '+' : ''}₹{Math.abs(market.diiFlow).toLocaleString()} Cr
						</div>
					</div>
					<div>
						<div class="text-terminal-muted">A/D</div>
						<div class="text-terminal-primary">{market.advanceDeclineRatio.toFixed(2)}</div>
					</div>
				</div>
			</div>

			{#each [
				{ label: 'NIFTY 50', data: market.nifty50 },
				{ label: 'SENSEX', data: market.sensex },
				{ label: 'BANK NIFTY', data: market.bankNifty },
				{ label: 'MIDCAP', data: market.niftyMidcap }
			] as idx}
				<div class="card p-4">
					<div class="stat-label mb-1">{idx.label}</div>
					<div class="font-mono text-sm font-semibold text-terminal-primary">
						{idx.data.value.toLocaleString('en-IN')}
					</div>
					<div class="font-mono text-xs {idx.data.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'} mt-0.5">
						{formatPct(idx.data.changePct)}
					</div>
				</div>
			{/each}

			<!-- VIX -->
			<div class="card p-4">
				<div class="stat-label mb-1">INDIA VIX</div>
				<div class="font-mono text-sm font-semibold text-terminal-primary">{market.indiaVix.value.toFixed(2)}</div>
				<div class="font-mono text-xs {market.indiaVix.changePct < 0 ? 'text-emerald-400' : 'text-red-400'} mt-0.5">
					{formatPct(market.indiaVix.changePct)}
				</div>
			</div>
		</div>
	{/if}

	<!-- Signal summary row -->
	<div class="grid grid-cols-3 gap-3">
		<div class="card p-4 border-emerald-400/20">
			<div class="flex items-center justify-between mb-2">
				<span class="stat-label">Strong Buy</span>
				<span class="text-2xl font-bold font-mono text-emerald-400">{strongBuys.length}</span>
			</div>
			<div class="h-1 rounded-full bg-emerald-400/20">
				<div class="h-1 rounded-full bg-emerald-400" style="width: {strongBuys.length / Math.max(topStocks.length, 1) * 100}%"></div>
			</div>
		</div>
		<div class="card p-4 border-blue-400/20">
			<div class="flex items-center justify-between mb-2">
				<span class="stat-label">Buy</span>
				<span class="text-2xl font-bold font-mono text-blue-400">{buys.length}</span>
			</div>
			<div class="h-1 rounded-full bg-blue-400/20">
				<div class="h-1 rounded-full bg-blue-400" style="width: {buys.length / Math.max(topStocks.length, 1) * 100}%"></div>
			</div>
		</div>
		<div class="card p-4 border-red-400/20">
			<div class="flex items-center justify-between mb-2">
				<span class="stat-label">Sell / Strong Sell</span>
				<span class="text-2xl font-bold font-mono text-red-400">{sells.length}</span>
			</div>
			<div class="h-1 rounded-full bg-red-400/20">
				<div class="h-1 rounded-full bg-red-400" style="width: {sells.length / Math.max(topStocks.length, 1) * 100}%"></div>
			</div>
		</div>
	</div>

	<!-- Top opportunities -->
	<div class="card">
		<div class="flex items-center justify-between px-5 py-4 border-b border-terminal-border">
			<h2 class="text-sm font-semibold text-terminal-primary flex items-center gap-2">
				🔥 Top Opportunities
			</h2>
			<a href="/opportunities" class="flex items-center gap-1 text-xs text-terminal-muted hover:text-emerald-400 transition-colors">
				View all <ArrowRight class="h-3.5 w-3.5" />
			</a>
		</div>
		{#if loading}
			<div class="p-8 text-center text-terminal-muted text-sm">Loading...</div>
		{:else}
			<div class="divide-y divide-terminal-border">
				{#each topStocks.slice(0, 6) as stock}
					{@const cfg = ratingConfig(stock.rating)}
					<a href="/stocks/{stock.symbol}" class="flex items-center gap-4 px-5 py-3.5 hover:bg-terminal-hover transition-colors">
						<!-- Symbol -->
						<div class="w-24 shrink-0">
							<div class="font-mono text-sm font-semibold text-terminal-primary">{stock.symbol}</div>
							<div class="text-[11px] text-terminal-muted truncate">{stock.sector}</div>
						</div>

						<!-- Rating badge -->
						<div class="w-28 shrink-0">
							<span class="{cfg.bg} {cfg.color} {cfg.border} inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border">
								{cfg.emoji} {cfg.label}
							</span>
						</div>

						<!-- Score -->
						<div class="w-16 shrink-0 text-center">
							<div class="font-mono text-sm font-bold {stock.signalScore >= 85 ? 'text-emerald-400' : stock.signalScore >= 75 ? 'text-blue-400' : stock.signalScore >= 60 ? 'text-amber-400' : 'text-red-400'}">{stock.signalScore}</div>
							<div class="text-[10px] text-terminal-muted">score</div>
						</div>

						<!-- Price -->
						<div class="w-24 shrink-0">
							<div class="font-mono text-sm text-terminal-primary">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
							<div class="font-mono text-[11px] {changePctColor(stock.changePct)}">{formatPct(stock.changePct)}</div>
						</div>

						<!-- Tags -->
						<div class="flex-1 hidden lg:flex flex-wrap gap-1.5">
							{#each stock.tags.slice(0, 3) as tag}
								<span class="text-[11px] px-1.5 py-0.5 rounded {tag.sentiment === 'BULLISH' ? 'bg-emerald-400/10 text-emerald-400' : tag.sentiment === 'BEARISH' ? 'bg-red-400/10 text-red-400' : 'bg-terminal-hover text-terminal-secondary'}">
									{tag.emoji} {tag.label}
								</span>
							{/each}
						</div>

						<!-- R:R -->
						<div class="w-16 shrink-0 text-right hidden xl:block">
							<div class="font-mono text-xs text-terminal-secondary">R:R</div>
							<div class="font-mono text-sm {stock.rrRatio >= 2 ? 'text-emerald-400' : stock.rrRatio >= 1.5 ? 'text-amber-400' : 'text-red-400'}">1:{stock.rrRatio.toFixed(1)}</div>
						</div>

						<ArrowRight class="h-4 w-4 text-terminal-muted shrink-0" />
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Live Watch: fixed pick list, real price/technicals (see TRACKED_SYMBOLS above) -->
	<div class="card">
		<div class="flex items-center justify-between px-5 py-4 border-b border-terminal-border">
			<h2 class="text-sm font-semibold text-terminal-primary flex items-center gap-2">
				<Radio class="h-3.5 w-3.5 text-blue-400" /> Live Watch
			</h2>
			<span class="text-[11px] text-terminal-muted">Real-time price &amp; technicals</span>
		</div>
		{#if trackedLoading}
			<div class="p-8 text-center text-terminal-muted text-sm">Loading...</div>
		{:else}
			<div class="divide-y divide-terminal-border">
				{#each tracked as stock}
					<a href="/stocks/{stock.symbol}" class="flex items-center gap-4 px-5 py-3.5 hover:bg-terminal-hover transition-colors">
						<!-- Symbol -->
						<div class="w-28 shrink-0">
							<div class="font-mono text-sm font-semibold text-terminal-primary">{stock.symbol}</div>
							<div class="text-[11px] text-terminal-muted truncate">{stock.sector}</div>
						</div>

						<!-- Rating badge, or an honest LIVE tag where there's no real rating to show -->
						<div class="w-28 shrink-0">
							{#if stock.dataMode === 'LIVE_TECHNICAL_ONLY'}
								<span class="bg-blue-400/10 text-blue-400 border-blue-400/20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border">
									🔵 LIVE
								</span>
							{:else}
								{@const cfg = ratingConfig(stock.rating)}
								<span class="{cfg.bg} {cfg.color} {cfg.border} inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border">
									{cfg.emoji} {cfg.label}
								</span>
							{/if}
						</div>

						<!-- RSI (real for all rows here, unlike score) -->
						<div class="w-16 shrink-0 text-center">
							<div class="font-mono text-sm font-bold text-terminal-secondary">{stock.technical.rsi.toFixed(0)}</div>
							<div class="text-[10px] text-terminal-muted">RSI</div>
						</div>

						<!-- Price -->
						<div class="w-24 shrink-0">
							<div class="font-mono text-sm text-terminal-primary">₹{stock.technical.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
							<div class="font-mono text-[11px] {changePctColor(stock.technical.changePct)}">{formatPct(stock.technical.changePct)}</div>
						</div>

						<!-- Name -->
						<div class="flex-1 hidden lg:block text-[11px] text-terminal-muted truncate">{stock.name}</div>

						<ArrowRight class="h-4 w-4 text-terminal-muted shrink-0" />
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Sector heatmap -->
	<div class="card">
		<div class="flex items-center justify-between px-5 py-4 border-b border-terminal-border">
			<h2 class="text-sm font-semibold text-terminal-primary">Sector Rotation</h2>
			<a href="/sectors" class="flex items-center gap-1 text-xs text-terminal-muted hover:text-emerald-400 transition-colors">
				Full map <ArrowRight class="h-3.5 w-3.5" />
			</a>
		</div>
		<div class="p-5 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
			{#each sectors as sector}
				{@const hot = sector.trend === 'HOT'}
				{@const imp = sector.trend === 'IMPROVING'}
				{@const weak = sector.trend === 'WEAKENING' || sector.trend === 'FALLING'}
				<div class="rounded-md p-3 border text-center transition-colors
					{hot ? 'bg-emerald-400/10 border-emerald-400/30' :
					imp ? 'bg-emerald-400/5 border-emerald-400/20' :
					weak ? 'bg-red-400/5 border-red-400/20' :
					'bg-terminal-surface border-terminal-border'}">
					<div class="text-[11px] text-terminal-muted truncate mb-1.5">{sector.name.split(' & ')[0]}</div>
					<div class="font-mono text-sm font-semibold {sector.change3M >= 0 ? 'text-emerald-400' : 'text-red-400'}">
						{formatPct(sector.change3M, 1)} <span class="text-[10px] text-terminal-muted">3M</span>
					</div>
					{#if sector.trend === 'HOT'}
						<div class="text-[10px] text-emerald-400 mt-1">🔥 HOT</div>
					{:else if sector.trend === 'FALLING'}
						<div class="text-[10px] text-red-400 mt-1">🔴 FALLING</div>
					{/if}
					<div class="text-[10px] text-terminal-muted mt-1">{sector.strongBuyCount}🟢 {sector.buyCount}🔵</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Disclaimer -->
	<div class="card border-amber-400/20 p-4">
		<p class="text-[11px] text-terminal-muted leading-relaxed">
			<span class="text-amber-400 font-semibold">⚠️ Disclaimer:</span> Market signals are algorithmic research outputs and are not guaranteed returns or personalized investment advice. Stop losses and targets are model-derived levels and can fail during gaps, volatility, illiquidity, corporate actions, or unexpected news. Users should independently evaluate risk and suitability before making any investment decisions. All data shown is simulated for demonstration purposes.
		</p>
	</div>
</div>
