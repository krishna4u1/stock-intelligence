<script lang="ts">
	import { page } from '$app/stores';
	import {
		LayoutDashboard, Search, TrendingUp, Star, Briefcase,
		Bell, PieChart, BarChart2, Settings, ChevronRight,
		Activity, Shield
	} from 'lucide-svelte';

	const nav = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/opportunities', label: 'Top Opportunities', icon: TrendingUp },
		{ href: '/screener', label: 'Screener', icon: Search },
		{ href: '/sectors', label: 'Sector Map', icon: BarChart2 },
		{ href: '/watchlist', label: 'Watchlist', icon: Star },
		{ href: '/portfolio', label: 'Portfolio', icon: Briefcase },
		{ href: '/alerts', label: 'Alerts', icon: Bell }
	];

	$: current = $page.url.pathname;
</script>

<aside class="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-terminal-surface border-r border-terminal-border">
	<!-- Logo -->
	<div class="flex h-14 items-center gap-2.5 px-4 border-b border-terminal-border">
		<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 border border-emerald-400/20">
			<Activity class="h-4 w-4 text-emerald-400" />
		</div>
		<div>
			<div class="text-sm font-bold text-terminal-primary tracking-tight">StockIntel</div>
			<div class="text-[10px] text-terminal-muted uppercase tracking-widest">AI Research Terminal</div>
		</div>
	</div>

	<!-- Nav -->
	<nav class="flex-1 overflow-y-auto py-3 px-2">
		<div class="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-terminal-muted">Navigation</div>
		{#each nav as item}
			{@const active = current.startsWith(item.href)}
			<a
				href={item.href}
				class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all mb-0.5
					{active
						? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
						: 'text-terminal-secondary hover:bg-terminal-hover hover:text-terminal-primary'}"
			>
				<svelte:component this={item.icon} class="h-4 w-4 shrink-0" />
				<span class="font-medium">{item.label}</span>
				{#if active}
					<ChevronRight class="ml-auto h-3.5 w-3.5 opacity-60" />
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Bottom -->
	<div class="border-t border-terminal-border p-3 space-y-1">
		<div class="flex items-center gap-2 px-2 py-1.5">
			<div class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
			<span class="text-xs text-terminal-muted">Mock data — replace with real API</span>
		</div>
		<a href="/admin" class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-terminal-secondary hover:bg-terminal-hover transition-all">
			<Shield class="h-4 w-4" />
			<span>Admin</span>
		</a>
		<a href="/settings" class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-terminal-secondary hover:bg-terminal-hover transition-all">
			<Settings class="h-4 w-4" />
			<span>Settings</span>
		</a>
	</div>
</aside>
