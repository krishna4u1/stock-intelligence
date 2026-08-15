<script lang="ts">
	import { onMount } from 'svelte';
	import type { StockSummary } from '$lib/types';
	import { ratingConfig, formatPct, changePctColor } from '$lib/utils';
	import { Plus, Briefcase, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-svelte';

	interface Holding { symbol: string; qty: number; avgPrice: number; }

	let holdings: Holding[] = [];
	let stockData: Map<string, StockSummary> = new Map();
	let allStocks: StockSummary[] = [];
	let adding = false;
	let newSymbol = '';
	let newQty = 0;
	let newAvg = 0;

	onMount(async () => {
		const stored = localStorage.getItem('portfolio');
		holdings = stored ? JSON.parse(stored) : [
			{ symbol: 'BELRISE', qty: 100, avgPrice: 232 },
			{ symbol: 'MMFL', qty: 50, avgPrice: 540 }
		];
		const res = await fetch('/api/stocks');
		if (res.ok) {
			allStocks = await res.json();
			allStocks.forEach(s => stockData.set(s.symbol, s));
		}
	});

	function save() { localStorage.setItem('portfolio', JSON.stringify(holdings)); }
	function addHolding() {
		if (!newSymbol || !newQty || !newAvg) return;
		holdings = [...holdings, { symbol: newSymbol.toUpperCase(), qty: newQty, avgPrice: newAvg }];
		save();
		adding = false; newSymbol = ''; newQty = 0; newAvg = 0;
	}
	function remove(sym: string) { holdings = holdings.filter(h => h.symbol !== sym); save(); }

	$: enriched = holdings.map(h => {
		const stock = stockData.get(h.symbol);
		const cmp = stock?.price ?? h.avgPrice;
		const value = cmp * h.qty;
		const cost = h.avgPrice * h.qty;
		const pnl = value - cost;
		const pnlPct = ((cmp - h.avgPrice) / h.avgPrice) * 100;
		return { ...h, stock, cmp, value, cost, pnl, pnlPct };
	});

	$: totalValue = enriched.reduce((a, h) => a + h.value, 0);
	$: totalCost = enriched.reduce((a, h) => a + h.cost, 0);
	$: totalPnl = totalValue - totalCost;
	$: totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
	$: deteriorating = enriched.filter(h => h.stock?.rating === 'SELL' || h.stock?.rating === 'STRONG_SELL');
</script>

<svelte:head><title>Portfolio — StockIntel</title></svelte:head>

<div class="p-6 animate-fade-in space-y-5">
	<!-- Summary cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		<div class="card p-4">
			<div class="stat-label mb-1">Total Value</div>
			<div class="font-mono text-lg font-bold text-terminal-primary">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
		</div>
		<div class="card p-4">
			<div class="stat-label mb-1">Total Cost</div>
			<div class="font-mono text-lg text-terminal-secondary">₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
		</div>
		<div class="card p-4">
			<div class="stat-label mb-1">Total P&L</div>
			<div class="font-mono text-lg font-bold {totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}">
				{totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
			</div>
		</div>
		<div class="card p-4">
			<div class="stat-label mb-1">Return %</div>
			<div class="font-mono text-lg font-bold {totalPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}">
				{formatPct(totalPnlPct)}
			</div>
		</div>
	</div>

	<!-- Alerts -->
	{#if deteriorating.length > 0}
		<div class="card p-4 border-orange-400/30">
			<div class="flex items-start gap-3">
				<AlertTriangle class="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
				<div>
					<div class="text-sm font-semibold text-orange-400 mb-1">⚠️ {deteriorating.length} holding{deteriorating.length > 1 ? 's' : ''} with deteriorating fundamentals</div>
					<div class="text-xs text-terminal-muted">{deteriorating.map(h => h.symbol).join(', ')} — review recommended</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Holdings table -->
	<div class="card overflow-hidden">
		<div class="flex items-center justify-between px-5 py-4 border-b border-terminal-border">
			<h2 class="text-sm font-semibold text-terminal-primary flex items-center gap-2">
				<Briefcase class="h-4 w-4" /> Holdings
			</h2>
			<button on:click={() => adding = !adding}
				class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-terminal-border hover:bg-terminal-hover text-terminal-secondary transition-colors">
				<Plus class="h-3.5 w-3.5" /> Add
			</button>
		</div>

		{#if adding}
			<div class="p-4 border-b border-terminal-border bg-terminal-surface flex items-center gap-3 flex-wrap">
				<input bind:value={newSymbol} placeholder="Symbol" class="w-24 bg-terminal-card border border-terminal-border rounded px-2 py-1 text-xs font-mono text-terminal-primary outline-none focus:border-emerald-400/50" />
				<input bind:value={newQty} type="number" placeholder="Qty" class="w-20 bg-terminal-card border border-terminal-border rounded px-2 py-1 text-xs font-mono text-terminal-primary outline-none" />
				<input bind:value={newAvg} type="number" placeholder="Avg Price" class="w-28 bg-terminal-card border border-terminal-border rounded px-2 py-1 text-xs font-mono text-terminal-primary outline-none" />
				<button on:click={addHolding} class="px-3 py-1 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-xs hover:bg-emerald-400/20">Save</button>
				<button on:click={() => adding = false} class="px-3 py-1 rounded border border-terminal-border text-terminal-muted text-xs hover:bg-terminal-hover">Cancel</button>
			</div>
		{/if}

		<div class="overflow-x-auto">
			<table class="w-full text-xs">
				<thead>
					<tr class="border-b border-terminal-border text-terminal-muted">
						<th class="text-left px-4 py-3 font-medium">Stock</th>
						<th class="text-right px-3 py-3 font-medium">Qty</th>
						<th class="text-right px-3 py-3 font-medium">Avg</th>
						<th class="text-right px-3 py-3 font-medium">CMP</th>
						<th class="text-right px-3 py-3 font-medium">Value</th>
						<th class="text-right px-3 py-3 font-medium">P&L</th>
						<th class="text-right px-3 py-3 font-medium">P&L %</th>
						<th class="text-center px-3 py-3 font-medium">Rating</th>
						<th class="px-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-terminal-border">
					{#each enriched as h}
						{@const cfg = h.stock ? ratingConfig(h.stock.rating) : null}
						<tr class="hover:bg-terminal-hover transition-colors">
							<td class="px-4 py-3">
								<div class="font-mono font-semibold text-terminal-primary">{h.symbol}</div>
								<div class="text-terminal-muted text-[11px]">{h.stock?.sector ?? 'Unknown'}</div>
							</td>
							<td class="px-3 py-3 text-right font-mono text-terminal-secondary">{h.qty.toLocaleString()}</td>
							<td class="px-3 py-3 text-right font-mono text-terminal-secondary">₹{h.avgPrice.toFixed(0)}</td>
							<td class="px-3 py-3 text-right font-mono text-terminal-primary">₹{h.cmp.toFixed(0)}</td>
							<td class="px-3 py-3 text-right font-mono text-terminal-primary">₹{h.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
							<td class="px-3 py-3 text-right font-mono {h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}">
								{h.pnl >= 0 ? '+' : ''}₹{Math.abs(h.pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
							</td>
							<td class="px-3 py-3 text-right font-mono {h.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}">
								{formatPct(h.pnlPct)}
							</td>
							<td class="px-3 py-3 text-center">
								{#if cfg}
									<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] {cfg.bg} {cfg.color}">{cfg.emoji} {cfg.label}</span>
								{:else}
									<span class="text-terminal-muted">—</span>
								{/if}
							</td>
							<td class="px-3 py-3">
								<button on:click={() => remove(h.symbol)} class="text-terminal-muted hover:text-red-400 transition-colors p-1">✕</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
