<script lang="ts">
	import { onMount } from 'svelte';
	import type { SectorData } from '$lib/types';
	import { sectorTrendConfig, formatPct } from '$lib/utils';

	let sectors: SectorData[] = [];
	let loading = true;

	onMount(async () => {
		const res = await fetch('/api/market?type=sectors');
		if (res.ok) sectors = await res.json();
		loading = false;
	});

	$: sorted = [...sectors].sort((a, b) => b.change3M - a.change3M);
</script>

<svelte:head><title>Sector Map — StockIntel</title></svelte:head>

<div class="p-6 animate-fade-in space-y-5">
	<!-- Heatmap grid -->
	<div class="card p-5">
		<h2 class="section-title">Sector Rotation Heatmap</h2>
		{#if loading}
			<div class="text-center py-8 text-terminal-muted text-sm">Loading...</div>
		{:else}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
				{#each sorted as sector}
					{@const tCfg = sectorTrendConfig(sector.trend)}
					{@const intensity = Math.min(Math.abs(sector.change3M) / 20, 1)}
					<div class="rounded-lg p-4 border text-center
						{sector.change3M >= 15 ? 'bg-emerald-400/20 border-emerald-400/40' :
						sector.change3M >= 8 ? 'bg-emerald-400/10 border-emerald-400/20' :
						sector.change3M >= 0 ? 'bg-emerald-400/5 border-terminal-border' :
						sector.change3M >= -5 ? 'bg-red-400/5 border-red-400/20' :
						'bg-red-400/15 border-red-400/40'}">
						<div class="text-xs text-terminal-muted mb-2 font-medium">{sector.name}</div>
						<div class="font-mono text-xl font-bold {sector.change3M >= 0 ? 'text-emerald-400' : 'text-red-400'} mb-1">
							{formatPct(sector.change3M, 1)}
						</div>
						<div class="text-[10px] text-terminal-muted mb-2">3M return</div>
						<div class="{tCfg.color} text-[11px] font-medium mb-2">{tCfg.label}</div>

						<!-- 1D / 1W / 1M mini strip -->
						<div class="grid grid-cols-3 gap-1 text-[10px]">
							<div>
								<div class="text-terminal-muted">1D</div>
								<div class="{sector.change1D >= 0 ? 'text-emerald-400' : 'text-red-400'}">{formatPct(sector.change1D, 1)}</div>
							</div>
							<div>
								<div class="text-terminal-muted">1W</div>
								<div class="{sector.change1W >= 0 ? 'text-emerald-400' : 'text-red-400'}">{formatPct(sector.change1W, 1)}</div>
							</div>
							<div>
								<div class="text-terminal-muted">1M</div>
								<div class="{sector.change1M >= 0 ? 'text-emerald-400' : 'text-red-400'}">{formatPct(sector.change1M, 1)}</div>
							</div>
						</div>

						<!-- Strong buy count -->
						{#if sector.strongBuyCount > 0 || sector.buyCount > 0}
							<div class="mt-2 pt-2 border-t border-terminal-border/50 text-[10px] text-terminal-muted">
								{sector.strongBuyCount > 0 ? `${sector.strongBuyCount} 🟢 ` : ''}{sector.buyCount > 0 ? `${sector.buyCount} 🔵` : ''}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Detail table -->
	<div class="card overflow-hidden">
		<div class="px-5 py-4 border-b border-terminal-border">
			<h2 class="text-sm font-semibold text-terminal-primary">Sector Details</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-xs">
				<thead>
					<tr class="border-b border-terminal-border text-terminal-muted">
						<th class="text-left px-4 py-3 font-medium">Sector</th>
						<th class="text-right px-3 py-3 font-medium">3M RS</th>
						<th class="text-right px-3 py-3 font-medium">Avg PE</th>
						<th class="text-right px-3 py-3 font-medium">Earnings Growth</th>
						<th class="text-right px-3 py-3 font-medium">FII Flow</th>
						<th class="text-right px-3 py-3 font-medium">Strong Buy</th>
						<th class="text-center px-3 py-3 font-medium">Trend</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-terminal-border">
					{#each sorted as s}
						{@const tCfg = sectorTrendConfig(s.trend)}
						<tr class="hover:bg-terminal-hover transition-colors">
							<td class="px-4 py-3 font-medium text-terminal-primary">{s.name}</td>
							<td class="px-3 py-3 text-right font-mono {s.relativeStrength >= 0 ? 'text-emerald-400' : 'text-red-400'}">{formatPct(s.relativeStrength, 1)}</td>
							<td class="px-3 py-3 text-right font-mono text-terminal-secondary">{s.avgPe}x</td>
							<td class="px-3 py-3 text-right font-mono {s.avgEarningsGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}">{formatPct(s.avgEarningsGrowth, 1)}</td>
							<td class="px-3 py-3 text-right font-mono {s.fiiFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}">
								{s.fiiFlow >= 0 ? '+' : ''}₹{Math.abs(s.fiiFlow).toLocaleString()} Cr
							</td>
							<td class="px-3 py-3 text-right font-mono text-emerald-400">{s.strongBuyCount}</td>
							<td class="px-3 py-3 text-center">
								<span class="{tCfg.bg} {tCfg.color} px-2 py-0.5 rounded text-[10px] font-medium">{tCfg.label}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
