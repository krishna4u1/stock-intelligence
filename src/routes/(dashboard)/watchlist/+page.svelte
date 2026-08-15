<script lang="ts">
	import { onMount } from 'svelte';
	import type { StockSummary } from '$lib/types';
	import { ratingConfig, formatPct, changePctColor } from '$lib/utils';
	import { Star, Plus, ArrowRight, Trash2 } from 'lucide-svelte';

	// Local storage based watchlist (Phase 1 — no DB)
	let watchlistSymbols: string[] = [];
	let stocks: StockSummary[] = [];
	let allStocks: StockSummary[] = [];
	let loading = true;
	let addSymbol = '';

	const LISTS = ['High Conviction', 'Swing Trades', 'Long Term', 'Watchlist'];
	let activeList = 'Watchlist';

	onMount(async () => {
		const stored = localStorage.getItem('watchlist');
		watchlistSymbols = stored ? JSON.parse(stored) : ['BELRISE', 'MMFL', 'BHARTIARTL'];

		const res = await fetch('/api/stocks');
		if (res.ok) allStocks = await res.json();
		loading = false;
		refreshWatchlist();
	});

	function refreshWatchlist() {
		stocks = allStocks.filter(s => watchlistSymbols.includes(s.symbol));
	}

	function addToWatchlist() {
		const sym = addSymbol.trim().toUpperCase();
		if (sym && !watchlistSymbols.includes(sym)) {
			watchlistSymbols = [...watchlistSymbols, sym];
			localStorage.setItem('watchlist', JSON.stringify(watchlistSymbols));
			addSymbol = '';
			refreshWatchlist();
		}
	}

	function removeFromWatchlist(symbol: string) {
		watchlistSymbols = watchlistSymbols.filter(s => s !== symbol);
		localStorage.setItem('watchlist', JSON.stringify(watchlistSymbols));
		refreshWatchlist();
	}
</script>

<svelte:head><title>Watchlist — StockIntel</title></svelte:head>

<div class="p-6 animate-fade-in space-y-5">
	<!-- List tabs -->
	<div class="flex gap-2 flex-wrap">
		{#each LISTS as list}
			<button on:click={() => activeList = list}
				class="text-xs px-3 py-1.5 rounded border transition-all {activeList === list ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' : 'border-terminal-border text-terminal-muted hover:bg-terminal-hover'}">
				<Star class="inline h-3 w-3 mr-1" />{list}
			</button>
		{/each}
	</div>

	<!-- Add stock -->
	<div class="card p-4 flex items-center gap-3">
		<Plus class="h-4 w-4 text-terminal-muted shrink-0" />
		<input
			type="text"
			placeholder="Add symbol (e.g. RELIANCE)"
			bind:value={addSymbol}
			on:keydown={(e) => e.key === 'Enter' && addToWatchlist()}
			class="flex-1 bg-transparent text-sm text-terminal-primary placeholder:text-terminal-muted outline-none font-mono"
		/>
		<button on:click={addToWatchlist}
			class="px-3 py-1 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-xs hover:bg-emerald-400/20 transition-colors">
			Add
		</button>
	</div>

	<!-- Watchlist -->
	{#if loading}
		<div class="card p-8 text-center text-terminal-muted text-sm">Loading...</div>
	{:else if stocks.length === 0}
		<div class="card p-12 text-center">
			<Star class="h-8 w-8 text-terminal-muted mx-auto mb-3" />
			<div class="text-terminal-secondary text-sm mb-1">Watchlist is empty</div>
			<div class="text-terminal-muted text-xs">Add stocks using the input above</div>
		</div>
	{:else}
		<div class="card overflow-hidden">
			<div class="divide-y divide-terminal-border">
				{#each stocks as stock}
					{@const cfg = ratingConfig(stock.rating)}
					<div class="flex items-center gap-4 px-5 py-4 hover:bg-terminal-hover transition-colors">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-0.5">
								<span class="font-mono font-semibold text-terminal-primary">{stock.symbol}</span>
								<span class="{cfg.bg} {cfg.color} {cfg.border} border inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold">{cfg.emoji} {cfg.label}</span>
							</div>
							<div class="text-xs text-terminal-muted">{stock.sector}</div>
						</div>

						<div class="text-right">
							<div class="font-mono text-sm text-terminal-primary">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
							<div class="font-mono text-xs {changePctColor(stock.changePct)}">{formatPct(stock.changePct)}</div>
						</div>

						<div class="text-center w-12">
							<div class="font-mono font-bold {stock.signalScore >= 85 ? 'text-emerald-400' : stock.signalScore >= 75 ? 'text-blue-400' : 'text-amber-400'}">{stock.signalScore}</div>
							<div class="text-[10px] text-terminal-muted">score</div>
						</div>

						<div class="flex items-center gap-2">
							<a href="/stocks/{stock.symbol}" class="p-1.5 rounded hover:bg-terminal-hover text-terminal-muted hover:text-emerald-400 transition-colors">
								<ArrowRight class="h-4 w-4" />
							</a>
							<button on:click={() => removeFromWatchlist(stock.symbol)} class="p-1.5 rounded hover:bg-red-400/10 text-terminal-muted hover:text-red-400 transition-colors">
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
