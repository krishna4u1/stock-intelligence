<script lang="ts">
	import type { EntryTargetData, Rating } from '$lib/types';
	import { ratingConfig, formatNumber } from '$lib/utils';
	import { AlertTriangle, Target, TrendingDown, TrendingUp, Info } from 'lucide-svelte';

	export let entry: EntryTargetData;
	export let rating: Rating;
	export let score: number;
	export let confidence: number;

	$: cfg = ratingConfig(rating);
	$: rrColor = entry.rrRatio >= 2.5 ? 'text-emerald-400' : entry.rrRatio >= 2 ? 'text-blue-400' : entry.rrRatio >= 1.5 ? 'text-amber-400' : 'text-red-400';
</script>

<div class="card border {cfg.border} p-5 {rating === 'STRONG_BUY' || rating === 'BUY' ? 'glow-bull' : ''}">
	<!-- Header -->
	<div class="flex items-start justify-between mb-5">
		<div>
			<div class="flex items-center gap-2 mb-1">
				<span class="text-xl">{cfg.emoji}</span>
				<span class="text-lg font-bold {cfg.color}">{cfg.label}</span>
			</div>
			<div class="flex items-center gap-3 text-xs text-terminal-muted">
				<span>Signal: <span class="font-mono text-terminal-secondary">{score}/100</span></span>
				<span class="h-3 w-px bg-terminal-border"></span>
				<span>Confidence: <span class="font-mono text-terminal-secondary">{confidence}%</span></span>
			</div>
		</div>

		<!-- Score ring -->
		<div class="relative h-14 w-14">
			<svg class="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
				<circle cx="28" cy="28" r="23" fill="none" stroke="currentColor" class="text-terminal-hover" stroke-width="4" />
				<circle
					cx="28" cy="28" r="23" fill="none"
					class="{score >= 85 ? 'text-emerald-400' : score >= 75 ? 'text-blue-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}"
					stroke="currentColor" stroke-width="4"
					stroke-dasharray="{144.5}"
					stroke-dashoffset="{144.5 * (1 - score / 100)}"
					stroke-linecap="round"
				/>
			</svg>
			<span class="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold {score >= 85 ? 'text-emerald-400' : score >= 75 ? 'text-blue-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}">{score}</span>
		</div>
	</div>

	<!-- Trade levels -->
	<div class="space-y-1 mb-5">
		<div class="bg-terminal-surface rounded-md overflow-hidden">
			<div class="grid grid-cols-3 text-center">
				<!-- Entry -->
				<div class="p-3 border-r border-terminal-border">
					<div class="stat-label mb-1">Entry Zone</div>
					<div class="font-mono text-sm font-semibold text-terminal-primary">
						₹{formatNumber(entry.entryLow, 0)}–{formatNumber(entry.entryHigh, 0)}
					</div>
				</div>
				<!-- Stop -->
				<div class="p-3 border-r border-terminal-border bg-red-400/5">
					<div class="stat-label mb-1 text-red-400/70">Stop Loss</div>
					<div class="font-mono text-sm font-semibold text-red-400">₹{formatNumber(entry.stopLoss, 0)}</div>
					<div class="text-[10px] text-red-400/70 mt-0.5">Risk {entry.riskPct.toFixed(1)}%</div>
				</div>
				<!-- Target -->
				<div class="p-3 bg-emerald-400/5">
					<div class="stat-label mb-1 text-emerald-400/70">Target 1</div>
					<div class="font-mono text-sm font-semibold text-emerald-400">₹{formatNumber(entry.target1, 0)}</div>
					<div class="text-[10px] text-emerald-400/70 mt-0.5">+{entry.rewardT1Pct.toFixed(1)}%</div>
				</div>
			</div>
		</div>

		<!-- Additional targets -->
		<div class="grid grid-cols-2 gap-1">
			<div class="bg-terminal-surface rounded-md p-3">
				<div class="stat-label mb-1">Target 2</div>
				<div class="font-mono text-sm font-semibold text-emerald-300">₹{formatNumber(entry.target2, 0)}</div>
			</div>
			<div class="bg-terminal-surface rounded-md p-3">
				<div class="stat-label mb-1">LT Target</div>
				<div class="font-mono text-sm font-semibold text-emerald-300">
					₹{formatNumber(entry.targetLTLow, 0)}–{formatNumber(entry.targetLTHigh, 0)}
				</div>
				<div class="text-[10px] text-terminal-muted mt-0.5">+{entry.rewardLTPct.toFixed(0)}%</div>
			</div>
		</div>
	</div>

	<!-- R:R -->
	<div class="flex items-center justify-between p-3 rounded-md bg-terminal-surface border border-terminal-border mb-4">
		<div class="flex items-center gap-2">
			<TrendingUp class="h-4 w-4 text-terminal-muted" />
			<span class="text-xs text-terminal-secondary">Risk / Reward</span>
		</div>
		<span class="font-mono font-bold {rrColor}">1 : {entry.rrRatio.toFixed(2)}</span>
	</div>

	<!-- Stop method -->
	<div class="flex items-start gap-2 text-xs text-terminal-muted">
		<Info class="h-3.5 w-3.5 shrink-0 mt-0.5" />
		<div>
			<span class="text-terminal-secondary font-medium">Stop method:</span> {entry.stopLossMethod}
		</div>
	</div>

	<!-- LT method -->
	<div class="flex items-start gap-2 text-xs text-terminal-muted mt-1.5">
		<Target class="h-3.5 w-3.5 shrink-0 mt-0.5" />
		<div>
			<span class="text-terminal-secondary font-medium">LT target:</span> {entry.targetLTMethod}
		</div>
	</div>

	<!-- Invalidation -->
	<div class="mt-4 p-3 rounded-md bg-red-400/5 border border-red-400/20 flex items-start gap-2">
		<AlertTriangle class="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
		<div class="text-xs text-red-300">{entry.setupInvalidationNote}</div>
	</div>
</div>
