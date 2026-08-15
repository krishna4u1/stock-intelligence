<script lang="ts">
	import { onMount } from 'svelte';
	import type { StockSummary } from '$lib/types';
	import { ratingConfig, formatPct, changePctColor } from '$lib/utils';
	import { ArrowRight, Zap } from 'lucide-svelte';

	let stocks: StockSummary[] = [];
	let loading = true;
	let timeframe = 'swing';
	function setTimeframe(k: string) { timeframe = k; }

	onMount(async () => {
		const res = await fetch('/api/stocks?sort=score');
		if (res.ok) stocks = await res.json();
		loading = false;
	});

	$: strongBuys = stocks.filter(s => s.rating === 'STRONG_BUY');
	$: buys = stocks.filter(s => s.rating === 'BUY');
</script>

<svelte:head><title>Top Opportunities — StockIntel</title></svelte:head>

<div class="p-6 animate-fade-in space-y-6">
	<!-- Hero -->
	<div class="card border-emerald-400/20 p-6 glow-bull">
		<div class="flex items-center gap-3 mb-4">
			<Zap class="h-5 w-5 text-emerald-400" />
			<h2 class="text-base font-bold text-terminal-primary">🔥 Top Opportunities Today</h2>
			<div class="ml-auto text-xs text-terminal-muted">Updated: 15 Aug 2026, 09:30 IST</div>
		</div>

		<!-- Timeframe toggle -->
		<div class="flex gap-2 mb-5">
			{#each [{ k: 'swing', l: 'Swing (1-4 Weeks)' }, { k: 'medium', l: 'Medium (1-3M)' }, { k: 'long', l: 'Long Term (6M+)' }] as t}
				<button on:click={() => setTimeframe(t.k)}
					class="text-xs px-3 py-1 rounded border transition-all {timeframe === t.k ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' : 'border-terminal-border text-terminal-muted hover:bg-terminal-hover'}">
					{t.l}
				</button>
			{/each}
		</div>

		<!-- Strong buy grid -->
		{#if loading}
			<div class="text-center text-terminal-muted text-sm py-8">Loading opportunities...</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{#each strongBuys as stock, i}
					{@const cfg = ratingConfig(stock.rating)}
					<a href="/stocks/{stock.symbol}"
						class="card-hover p-5 border-emerald-400/20">
						<!-- Rank + symbol -->
						<div class="flex items-start justify-between mb-3">
							<div>
								<div class="flex items-center gap-2">
									<span class="font-mono text-xl font-bold text-terminal-primary">{stock.symbol}</span>
									<span class="text-[10px] px-1.5 py-0.5 rounded bg-terminal-hover text-terminal-muted">{stock.marketCapType}</span>
								</div>
								<div class="text-xs text-terminal-muted mt-0.5">{stock.name.length > 30 ? stock.name.slice(0, 28) + '...' : stock.name}</div>
							</div>
							<div class="text-right">
								<div class="font-mono font-bold text-xl text-emerald-400">{stock.signalScore}</div>
								<div class="text-[10px] text-terminal-muted">score</div>
							</div>
						</div>

						<!-- Rating -->
						<div class="mb-3">
							<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold {cfg.bg} {cfg.color} {cfg.border} border">
								{cfg.emoji} {cfg.label}
							</span>
						</div>

						<!-- Price + change -->
						<div class="flex items-center justify-between mb-3">
							<span class="font-mono text-sm font-semibold text-terminal-primary">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
							<span class="font-mono text-sm {changePctColor(stock.changePct)}">{formatPct(stock.changePct)}</span>
						</div>

						<!-- Key metrics -->
						<div class="grid grid-cols-3 gap-2 mb-3">
							<div class="text-center">
								<div class="text-[10px] text-terminal-muted">Rev %</div>
								<div class="font-mono text-xs text-emerald-400">{formatPct(stock.revenueGrowthYoY, 0)}</div>
							</div>
							<div class="text-center">
								<div class="text-[10px] text-terminal-muted">PAT %</div>
								<div class="font-mono text-xs text-emerald-400">{formatPct(stock.patGrowthYoY, 0)}</div>
							</div>
							<div class="text-center">
								<div class="text-[10px] text-terminal-muted">R:R</div>
								<div class="font-mono text-xs {stock.rrRatio >= 2 ? 'text-emerald-400' : 'text-amber-400'}">1:{stock.rrRatio.toFixed(1)}</div>
							</div>
						</div>

						<!-- Tags -->
						<div class="flex flex-wrap gap-1 mb-3">
							{#each stock.tags.slice(0, 3) as tag}
								<span class="text-[11px] px-1.5 py-0.5 rounded {tag.sentiment === 'BULLISH' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}">
									{tag.emoji} {tag.label}
								</span>
							{/each}
						</div>

						<!-- Top reason -->
						{#if stock.topReason}
							<p class="text-[11px] text-terminal-muted leading-relaxed line-clamp-2">{stock.topReason}</p>
						{/if}

						<div class="flex items-center justify-end mt-3 gap-1 text-xs text-emerald-400">
							Full analysis <ArrowRight class="h-3.5 w-3.5" />
						</div>
					</a>
				{/each}
			</div>

			<!-- Buy section -->
			{#if buys.length}
				<div class="mt-6 pt-6 border-t border-terminal-border">
					<h3 class="text-sm font-semibold text-terminal-secondary mb-4">🔵 BUY Signals</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
						{#each buys as stock}
							{@const cfg = ratingConfig(stock.rating)}
							<a href="/stocks/{stock.symbol}" class="card-hover p-4 border-blue-400/20">
								<div class="flex items-start justify-between mb-2">
									<div>
										<div class="font-mono font-semibold text-terminal-primary">{stock.symbol}</div>
										<div class="text-[11px] text-terminal-muted">{stock.sector}</div>
									</div>
									<span class="font-mono font-bold text-blue-400">{stock.signalScore}</span>
								</div>
								<div class="font-mono text-sm text-terminal-primary mb-1">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
								<div class="flex gap-2 text-[11px]">
									<span class="text-terminal-muted">Rev</span>
									<span class="text-emerald-400">{formatPct(stock.revenueGrowthYoY, 0)}</span>
									<span class="text-terminal-muted">PAT</span>
									<span class="text-emerald-400">{formatPct(stock.patGrowthYoY, 0)}</span>
								</div>
								<div class="flex items-center gap-1 mt-2 text-xs text-terminal-muted">
									View <ArrowRight class="h-3 w-3" />
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Disclaimer -->
	<div class="card border-amber-400/20 p-4">
		<p class="text-[11px] text-terminal-muted">
			<span class="text-amber-400 font-semibold">⚠️ Disclaimer:</span> All signals are algorithmic outputs from mock data for demonstration purposes. Not investment advice. Past performance signals do not guarantee future results.
		</p>
	</div>
</div>
