<script lang="ts">
	import { onMount } from 'svelte';
	import type { StockSummary, Rating, MarketCap } from '$lib/types';
	import { ratingConfig, formatPct, changePctColor, pct52wPosition } from '$lib/utils';
	import { ArrowRight, SlidersHorizontal, X, Filter } from 'lucide-svelte';

	let stocks: StockSummary[] = [];
	let loading = true;
	let showFilters = false;

	// Filters
	let selectedRatings: Rating[] = [];
	let selectedMarketCaps: MarketCap[] = [];
	let minRevenueGrowth = 0;
	let minProfitGrowth = 0;
	let fiiIncreasing = false;
	let mfIncreasing = false;
	let breakoutOnly = false;
	let minRrRatio = 0;

	const ratings: Rating[] = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];
	const caps: MarketCap[] = ['LARGE', 'MID', 'SMALL'];

	async function loadScreener() {
		loading = true;
		try {
			const res = await fetch('/api/screener', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ratings: selectedRatings.length ? selectedRatings : undefined,
					marketCaps: selectedMarketCaps.length ? selectedMarketCaps : undefined,
					minRevenueGrowth: minRevenueGrowth || undefined,
					minProfitGrowth: minProfitGrowth || undefined,
					fiiIncreasing: fiiIncreasing || undefined,
					mfIncreasing: mfIncreasing || undefined,
					breakout: breakoutOnly || undefined,
					minRrRatio: minRrRatio || undefined
				})
			});
			if (res.ok) stocks = await res.json();
		} catch {}
		loading = false;
	}

	function clearFilters() {
		selectedRatings = [];
		selectedMarketCaps = [];
		minRevenueGrowth = 0;
		minProfitGrowth = 0;
		fiiIncreasing = false;
		mfIncreasing = false;
		breakoutOnly = false;
		minRrRatio = 0;
		loadScreener();
	}

	function toggleRating(r: Rating) {
		selectedRatings = selectedRatings.includes(r) ? selectedRatings.filter(x => x !== r) : [...selectedRatings, r];
	}
	function toggleCap(c: MarketCap) {
		selectedMarketCaps = selectedMarketCaps.includes(c) ? selectedMarketCaps.filter(x => x !== c) : [...selectedMarketCaps, c];
	}

	onMount(loadScreener);

	$: activeFilterCount = [
		selectedRatings.length,
		selectedMarketCaps.length,
		minRevenueGrowth > 0 ? 1 : 0,
		minProfitGrowth > 0 ? 1 : 0,
		fiiIncreasing ? 1 : 0,
		mfIncreasing ? 1 : 0,
		breakoutOnly ? 1 : 0,
		minRrRatio > 0 ? 1 : 0
	].reduce((a, b) => a + b, 0);

	const sortCols = [
		{ key: 'signalScore', label: 'Score', desc: true },
		{ key: 'changePct', label: 'Change %', desc: true },
		{ key: 'revenueGrowthYoY', label: 'Rev Growth', desc: true },
		{ key: 'rrRatio', label: 'R:R', desc: true }
	];
	let sortKey = 'signalScore';
	let sortDesc = true;

	$: sorted = [...stocks].sort((a, b) => {
		const av = (a as Record<string, unknown>)[sortKey] as number;
		const bv = (b as Record<string, unknown>)[sortKey] as number;
		return sortDesc ? bv - av : av - bv;
	});
</script>

<svelte:head><title>Stock Screener — StockIntel</title></svelte:head>

<div class="p-6 animate-fade-in">
	<!-- Header -->
	<div class="flex items-center justify-between mb-5 flex-wrap gap-3">
		<div>
			<h2 class="text-sm font-semibold text-terminal-primary">{sorted.length} stocks found</h2>
			{#if activeFilterCount > 0}
				<div class="text-xs text-terminal-muted mt-0.5">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</div>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<button on:click={() => showFilters = !showFilters}
				class="flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition-all
					{activeFilterCount > 0 ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' : 'border-terminal-border text-terminal-secondary hover:bg-terminal-hover'}">
				<SlidersHorizontal class="h-3.5 w-3.5" />
				Filters
				{#if activeFilterCount > 0}<span class="bg-emerald-400 text-terminal-bg px-1 rounded-full font-bold">{activeFilterCount}</span>{/if}
			</button>
			{#if activeFilterCount > 0}
				<button on:click={clearFilters} class="flex items-center gap-1 px-2 py-1.5 rounded-md border border-terminal-border text-xs text-terminal-muted hover:bg-terminal-hover">
					<X class="h-3.5 w-3.5" /> Clear
				</button>
			{/if}
		</div>
	</div>

	<!-- Filter panel -->
	{#if showFilters}
		<div class="card p-5 mb-5 animate-slide-up">
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
				<!-- Rating filter -->
				<div>
					<div class="stat-label mb-2">Rating</div>
					<div class="flex flex-wrap gap-1.5">
						{#each ratings as r}
							{@const cfg = ratingConfig(r)}
							<button on:click={() => toggleRating(r)}
								class="text-xs px-2 py-1 rounded-full border transition-all {selectedRatings.includes(r) ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'border-terminal-border text-terminal-muted hover:border-terminal-secondary'}">
								{cfg.emoji} {cfg.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Market cap -->
				<div>
					<div class="stat-label mb-2">Market Cap</div>
					<div class="flex gap-1.5">
						{#each caps as c}
							<button on:click={() => toggleCap(c)}
								class="text-xs px-2 py-1 rounded-full border transition-all {selectedMarketCaps.includes(c) ? 'border-blue-400/30 bg-blue-400/10 text-blue-400' : 'border-terminal-border text-terminal-muted hover:border-terminal-secondary'}">
								{c}
							</button>
						{/each}
					</div>
				</div>

				<!-- Growth filters -->
				<div class="space-y-3">
					<div>
						<label class="stat-label block mb-1">Min Revenue Growth %</label>
						<input type="range" min="0" max="30" step="5" bind:value={minRevenueGrowth}
							class="w-full accent-emerald-400" />
						<div class="text-xs font-mono text-emerald-400 mt-0.5">≥ {minRevenueGrowth}%</div>
					</div>
					<div>
						<label class="stat-label block mb-1">Min Profit Growth %</label>
						<input type="range" min="0" max="40" step="5" bind:value={minProfitGrowth}
							class="w-full accent-emerald-400" />
						<div class="text-xs font-mono text-emerald-400 mt-0.5">≥ {minProfitGrowth}%</div>
					</div>
				</div>

				<!-- Checkboxes -->
				<div class="space-y-2">
					<div class="stat-label mb-1">Quick Filters</div>
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" bind:checked={fiiIncreasing} class="accent-emerald-400 w-3.5 h-3.5" />
						<span class="text-xs text-terminal-secondary">FII Increasing</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" bind:checked={mfIncreasing} class="accent-emerald-400 w-3.5 h-3.5" />
						<span class="text-xs text-terminal-secondary">MF Increasing</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" bind:checked={breakoutOnly} class="accent-emerald-400 w-3.5 h-3.5" />
						<span class="text-xs text-terminal-secondary">Breakout Only</span>
					</label>
					<div>
						<label class="stat-label block mb-1">Min R:R Ratio</label>
						<input type="range" min="0" max="3" step="0.5" bind:value={minRrRatio}
							class="w-full accent-emerald-400" />
						<div class="text-xs font-mono text-emerald-400">≥ 1:{minRrRatio}</div>
					</div>
				</div>
			</div>
			<div class="flex justify-end mt-4 pt-4 border-t border-terminal-border">
				<button on:click={loadScreener} class="px-4 py-1.5 rounded-md bg-emerald-400 text-terminal-bg text-xs font-semibold hover:bg-emerald-300 transition-colors">
					Apply Filters
				</button>
			</div>
		</div>
	{/if}

	<!-- Sort bar -->
	<div class="flex items-center gap-2 mb-3 text-xs text-terminal-muted">
		<span>Sort by:</span>
		{#each sortCols as col}
			<button on:click={() => { if (sortKey === col.key) sortDesc = !sortDesc; else { sortKey = col.key; sortDesc = col.desc; } }}
				class="px-2 py-1 rounded border transition-all {sortKey === col.key ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' : 'border-terminal-border hover:bg-terminal-hover text-terminal-secondary'}">
				{col.label} {sortKey === col.key ? (sortDesc ? '↓' : '↑') : ''}
			</button>
		{/each}
	</div>

	<!-- Table -->
	{#if loading}
		<div class="card p-12 text-center text-terminal-muted text-sm">Loading stocks...</div>
	{:else if sorted.length === 0}
		<div class="card p-12 text-center">
			<div class="text-terminal-muted text-sm">No stocks match your filters. Try relaxing the criteria.</div>
		</div>
	{:else}
		<div class="card overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-xs">
					<thead>
						<tr class="border-b border-terminal-border text-terminal-muted">
							<th class="text-left px-4 py-3 font-medium">Stock</th>
							<th class="text-center px-3 py-3 font-medium">Rating</th>
							<th class="text-right px-3 py-3 font-medium">Score</th>
							<th class="text-right px-3 py-3 font-medium">Price</th>
							<th class="text-right px-3 py-3 font-medium hidden sm:table-cell">1D</th>
							<th class="text-right px-3 py-3 font-medium hidden lg:table-cell">RSI</th>
							<th class="text-right px-3 py-3 font-medium hidden lg:table-cell">PE</th>
							<th class="text-right px-3 py-3 font-medium hidden xl:table-cell">Rev %</th>
							<th class="text-right px-3 py-3 font-medium hidden xl:table-cell">PAT %</th>
							<th class="text-right px-3 py-3 font-medium hidden xl:table-cell">FII Δ</th>
							<th class="text-right px-3 py-3 font-medium hidden xl:table-cell">MF Δ</th>
							<th class="text-right px-3 py-3 font-medium hidden xl:table-cell">R:R</th>
							<th class="px-3 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-terminal-border">
						{#each sorted as stock}
							{@const cfg = ratingConfig(stock.rating)}
							{@const pos = pct52wPosition(stock.price, stock.low52w, stock.high52w)}
							<tr class="hover:bg-terminal-hover transition-colors group">
								<td class="px-4 py-3">
									<div class="font-mono font-semibold text-terminal-primary">{stock.symbol}</div>
									<div class="text-terminal-muted text-[11px] truncate max-w-[120px]">{stock.sector}</div>
								</td>
								<td class="px-3 py-3 text-center">
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold {cfg.bg} {cfg.color} {cfg.border} border">
										{cfg.emoji} {cfg.label}
									</span>
								</td>
								<td class="px-3 py-3 text-right">
									<span class="font-mono font-bold {stock.signalScore >= 85 ? 'text-emerald-400' : stock.signalScore >= 75 ? 'text-blue-400' : stock.signalScore >= 60 ? 'text-amber-400' : 'text-red-400'}">{stock.signalScore}</span>
								</td>
								<td class="px-3 py-3 text-right">
									<div class="font-mono text-terminal-primary">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
									<!-- 52w position micro bar -->
									<div class="flex items-center gap-1 justify-end mt-0.5">
										<div class="w-12 h-0.5 rounded-full bg-terminal-hover">
											<div class="h-full rounded-full bg-emerald-400/60" style="width:{pos}%"></div>
										</div>
										<span class="text-[10px] text-terminal-muted">{pos}%</span>
									</div>
								</td>
								<td class="px-3 py-3 text-right hidden sm:table-cell">
									<span class="font-mono {changePctColor(stock.changePct)}">{formatPct(stock.changePct)}</span>
								</td>
								<td class="px-3 py-3 text-right hidden lg:table-cell">
									<span class="font-mono {stock.rsi >= 50 && stock.rsi <= 65 ? 'text-emerald-400' : stock.rsi > 70 ? 'text-red-400' : 'text-terminal-secondary'}">{stock.rsi.toFixed(0)}</span>
								</td>
								<td class="px-3 py-3 text-right hidden lg:table-cell">
									<span class="font-mono text-terminal-secondary">{stock.pe}x</span>
								</td>
								<td class="px-3 py-3 text-right hidden xl:table-cell">
									<span class="font-mono {stock.revenueGrowthYoY >= 15 ? 'text-emerald-400' : stock.revenueGrowthYoY >= 0 ? 'text-terminal-secondary' : 'text-red-400'}">{formatPct(stock.revenueGrowthYoY, 1)}</span>
								</td>
								<td class="px-3 py-3 text-right hidden xl:table-cell">
									<span class="font-mono {stock.patGrowthYoY >= 20 ? 'text-emerald-400' : stock.patGrowthYoY >= 0 ? 'text-terminal-secondary' : 'text-red-400'}">{formatPct(stock.patGrowthYoY, 1)}</span>
								</td>
								<td class="px-3 py-3 text-right hidden xl:table-cell">
									<span class="font-mono {stock.fiiHoldingChange > 0 ? 'text-emerald-400' : stock.fiiHoldingChange < 0 ? 'text-red-400' : 'text-terminal-muted'}">{stock.fiiHoldingChange > 0 ? '+' : ''}{stock.fiiHoldingChange.toFixed(1)}%</span>
								</td>
								<td class="px-3 py-3 text-right hidden xl:table-cell">
									<span class="font-mono {stock.mfHoldingChange > 0 ? 'text-emerald-400' : stock.mfHoldingChange < 0 ? 'text-red-400' : 'text-terminal-muted'}">{stock.mfHoldingChange > 0 ? '+' : ''}{stock.mfHoldingChange.toFixed(1)}%</span>
								</td>
								<td class="px-3 py-3 text-right hidden xl:table-cell">
									<span class="font-mono {stock.rrRatio >= 2 ? 'text-emerald-400' : 'text-terminal-secondary'}">1:{stock.rrRatio.toFixed(1)}</span>
								</td>
								<td class="px-3 py-3">
									<a href="/stocks/{stock.symbol}" class="flex items-center gap-1 text-terminal-muted group-hover:text-emerald-400 transition-colors">
										<ArrowRight class="h-4 w-4" />
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
