<script lang="ts">
	import type { SignalConflict, EventRisk } from '$lib/types';
	import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Clock } from 'lucide-svelte';

	export let whyBuy: string[] = [];
	export let whatCanGoWrong: string[] = [];
	export let whyNow: string[] = [];
	export let missingData: string[] = [];
	export let signals: SignalConflict[] = [];
	export let eventRisks: EventRisk[] = [];

	const signalColors: Record<string, string> = {
		POSITIVE: 'text-emerald-400',
		NEUTRAL: 'text-amber-400',
		NEGATIVE: 'text-red-400'
	};
	const signalBg: Record<string, string> = {
		POSITIVE: 'bg-emerald-400/10',
		NEUTRAL: 'bg-amber-400/10',
		NEGATIVE: 'bg-red-400/10'
	};
	const statusDots: Record<string, string> = {
		CONFIRMED: 'bg-emerald-400',
		PARTIAL: 'bg-amber-400',
		WEAK: 'bg-orange-400',
		CONFLICTING: 'bg-red-400',
		INSUFFICIENT: 'bg-terminal-muted'
	};

	// Check for conflicts
	$: hasConflict = signals.some(s => s.signal === 'NEGATIVE') && signals.some(s => s.signal === 'POSITIVE');
</script>

<div class="space-y-4">
	<!-- Signal conflict matrix -->
	<div class="card p-5">
		<div class="flex items-center justify-between mb-3">
			<h3 class="section-title mb-0 border-0 pb-0">Signal Analysis</h3>
			{#if hasConflict}
				<div class="flex items-center gap-1.5 text-xs text-amber-400">
					<AlertTriangle class="h-3.5 w-3.5" />
					<span>Signal Conflict Detected</span>
				</div>
			{/if}
		</div>
		<div class="space-y-2">
			{#each signals as s}
				<div class="flex items-center gap-3 p-2 rounded {signalBg[s.signal]}">
					<div class="h-1.5 w-1.5 rounded-full {statusDots[s.status]} shrink-0"></div>
					<span class="text-xs font-medium text-terminal-secondary w-28 shrink-0">{s.dimension}</span>
					<span class="text-xs {signalColors[s.signal]} flex-1">{s.note}</span>
					<span class="text-[10px] text-terminal-muted uppercase tracking-widest shrink-0">{s.status}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Why Now -->
	{#if whyNow.length}
		<div class="card p-5">
			<h3 class="section-title">Why Now?</h3>
			<div class="space-y-2">
				{#each whyNow as reason, i}
					<div class="flex items-start gap-2.5">
						<span class="font-mono text-xs text-emerald-400/60 shrink-0 mt-0.5 w-4">{i + 1}.</span>
						<p class="text-sm text-terminal-secondary">{reason}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Why Buy -->
	{#if whyBuy.length}
		<div class="card p-5">
			<h3 class="section-title">Why {whyBuy.length >= 5 ? `${whyBuy.length} High-Conviction Signals` : 'Positive Factors'}</h3>
			<div class="space-y-2">
				{#each whyBuy as reason}
					<div class="flex items-start gap-2.5">
						<CheckCircle2 class="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
						<p class="text-sm text-terminal-secondary">{reason}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- What Can Go Wrong -->
	{#if whatCanGoWrong.length}
		<div class="card p-5">
			<h3 class="section-title text-orange-400/70">What Can Go Wrong?</h3>
			<div class="space-y-2">
				{#each whatCanGoWrong as risk}
					<div class="flex items-start gap-2.5">
						<XCircle class="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
						<p class="text-sm text-terminal-secondary">{risk}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Event Risks -->
	{#if eventRisks.length}
		<div class="card p-5">
			<h3 class="section-title">Upcoming Events</h3>
			<div class="space-y-2">
				{#each eventRisks as ev}
					<div class="flex items-start gap-3 p-2.5 rounded bg-terminal-surface border {ev.severity === 'HIGH' ? 'border-red-400/30' : ev.severity === 'MEDIUM' ? 'border-amber-400/30' : 'border-terminal-border'}">
						<Clock class="h-4 w-4 shrink-0 mt-0.5 {ev.severity === 'HIGH' ? 'text-red-400' : ev.severity === 'MEDIUM' ? 'text-amber-400' : 'text-terminal-muted'}" />
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-0.5">
								<span class="text-xs font-medium text-terminal-primary">{ev.type.replace('_', ' ')}</span>
								<span class="text-[10px] {ev.severity === 'HIGH' ? 'text-red-400' : ev.severity === 'MEDIUM' ? 'text-amber-400' : 'text-terminal-muted'}">{ev.daysAway}d away</span>
							</div>
							<p class="text-xs text-terminal-muted">{ev.note}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Missing Data -->
	{#if missingData.length}
		<div class="card p-5 border-amber-400/20">
			<h3 class="section-title text-amber-400/70">Missing / Incomplete Data</h3>
			<div class="space-y-1.5">
				{#each missingData as item}
					<div class="flex items-start gap-2">
						<HelpCircle class="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
						<p class="text-xs text-terminal-secondary">{item}</p>
					</div>
				{/each}
			</div>
			<p class="mt-2 text-xs text-terminal-muted">Data confidence is reduced proportionally.</p>
		</div>
	{/if}
</div>
