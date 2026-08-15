<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import type { MarketOverview } from '$lib/types';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let market: MarketOverview | null = null;

	const pageTitles: Record<string, string> = {
		'/dashboard': 'Market Dashboard',
		'/opportunities': 'Top Opportunities',
		'/screener': 'Stock Screener',
		'/sectors': 'Sector Rotation Map',
		'/watchlist': 'My Watchlists',
		'/portfolio': 'Portfolio Tracker',
		'/alerts': 'Smart Alerts'
	};

	$: title = pageTitles[$page.url.pathname] ?? $page.url.pathname.includes('/stocks/') ? 'Stock Analysis' : 'StockIntel';

	onMount(async () => {
		try {
			const res = await fetch('/api/market');
			if (res.ok) market = await res.json();
		} catch {}
	});
</script>

<div class="flex min-h-screen bg-terminal-bg">
	<Sidebar />
	<div class="ml-56 flex flex-1 flex-col min-w-0">
		<TopBar {market} {title} />
		<main class="flex-1 overflow-auto">
			<slot />
		</main>
	</div>
</div>
