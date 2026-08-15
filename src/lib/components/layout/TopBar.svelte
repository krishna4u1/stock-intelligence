<script lang="ts">
	import { Search, Bell, RefreshCw } from 'lucide-svelte';
	import type { MarketOverview } from '$lib/types';
	import { formatPct, regimeConfig } from '$lib/utils';

	export let market: MarketOverview | null = null;
	export let title: string = '';

	let searchQuery = '';
	let searching = false;

	function handleSearch(e: KeyboardEvent) {
		if (e.key === 'Enter' && searchQuery.trim()) {
			window.location.href = `/stocks/${searchQuery.trim().toUpperCase()}`;
		}
	}

	$: regime = market ? regimeConfig(market.regime) : null;
</script>

<header class="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-terminal-border bg-terminal-surface/90 backdrop-blur-sm px-6">
	<!-- Page title -->
	<div class="flex-1">
		<h1 class="text-sm font-semibold text-terminal-primary">{title}</h1>
	</div>

	<!-- Market ticker strip -->
	{#if market}
		<div class="hidden lg:flex items-center gap-5 text-xs font-mono">
			<div class="flex items-center gap-1.5">
				<span class="text-terminal-muted">NIFTY</span>
				<span class="text-terminal-primary">{market.nifty50.value.toLocaleString('en-IN')}</span>
				<span class={market.nifty50.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
					{formatPct(market.nifty50.changePct)}
				</span>
			</div>
			<div class="h-3 w-px bg-terminal-border"></div>
			<div class="flex items-center gap-1.5">
				<span class="text-terminal-muted">BANK</span>
				<span class="text-terminal-primary">{market.bankNifty.value.toLocaleString('en-IN')}</span>
				<span class={market.bankNifty.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
					{formatPct(market.bankNifty.changePct)}
				</span>
			</div>
			<div class="h-3 w-px bg-terminal-border"></div>
			<div class="flex items-center gap-1.5">
				<span class="text-terminal-muted">VIX</span>
				<span class={market.indiaVix.changePct < 0 ? 'text-emerald-400' : 'text-red-400'}>
					{market.indiaVix.value.toFixed(2)}
				</span>
			</div>
			<div class="h-3 w-px bg-terminal-border"></div>
			{#if regime}
				<div class="flex items-center gap-1.5 px-2 py-0.5 rounded {regime.bg}">
					<div class="h-1.5 w-1.5 rounded-full {market.regime === 'BULL' || market.regime === 'STRONG_BULL' ? 'bg-emerald-400' : 'bg-red-400'}"></div>
					<span class="{regime.color} font-medium">{regime.label}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Search -->
	<div class="relative w-52">
		<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-terminal-muted" />
		<input
			type="text"
			placeholder="Search stocks (e.g. RELIANCE)"
			bind:value={searchQuery}
			on:keydown={handleSearch}
			class="w-full rounded-md border border-terminal-border bg-terminal-card py-1.5 pl-8 pr-3 text-xs text-terminal-primary placeholder:text-terminal-muted focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition-all"
		/>
	</div>

	<!-- Notifications -->
	<button class="relative flex h-8 w-8 items-center justify-center rounded-md border border-terminal-border hover:bg-terminal-hover transition-colors">
		<Bell class="h-4 w-4 text-terminal-secondary" />
		<span class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
	</button>
</header>
