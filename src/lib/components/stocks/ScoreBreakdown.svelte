<script lang="ts">
	import type { ScoreBreakdown, ScoreHistory } from '$lib/types';
	import { ratingConfig } from '$lib/utils';

	export let score: ScoreBreakdown;
	export let history: ScoreHistory[] = [];

	interface Dimension {
		key: keyof ScoreBreakdown;
		label: string;
		max: number;
		color: string;
	}

	const dimensions: Dimension[] = [
		{ key: 'fundamental', label: 'Fundamentals', max: 30, color: 'bg-blue-400' },
		{ key: 'institutional', label: 'Institutional', max: 20, color: 'bg-purple-400' },
		{ key: 'technical', label: 'Technical', max: 25, color: 'bg-emerald-400' },
		{ key: 'fno', label: 'F&O', max: 10, color: 'bg-amber-400' },
		{ key: 'sectorMacro', label: 'Sector/Macro', max: 10, color: 'bg-sky-400' },
		{ key: 'riskEvent', label: 'Risk/Event', max: 5, color: 'bg-orange-400' }
	];

	// Simple SVG sparkline for score history
	function buildSparkline(data: ScoreHistory[]): string {
		if (data.length < 2) return '';
		const w = 180, h = 40;
		const scores = data.map(d => d.score);
		const min = Math.min(...scores) - 5;
		const max = Math.max(...scores) + 5;
		const pts = data.map((d, i) => {
			const x = (i / (data.length - 1)) * w;
			const y = h - ((d.score - min) / (max - min)) * h;
			return `${x},${y}`;
		});
		return pts.join(' L ');
	}

	$: sparkPath = buildSparkline(history);
	$: latestScore = history[history.length - 1]?.score ?? score.total;
	$: prevScore = history[history.length - 2]?.score;
	$: scoreDelta = prevScore ? latestScore - prevScore : 0;

	function dimValue(dim: Dimension): number {
		return score[dim.key] as number;
	}
</script>

<div class="card p-5 space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="section-title mb-0 border-0 pb-0">Score Breakdown</h3>
		<div class="flex items-center gap-2">
			<span class="font-mono text-2xl font-bold {score.total >= 85 ? 'text-emerald-400' : score.total >= 75 ? 'text-blue-400' : score.total >= 60 ? 'text-amber-400' : 'text-red-400'}">{score.total}</span>
			<span class="text-terminal-muted text-xs font-mono">/100</span>
		</div>
	</div>

	<!-- Dimension bars -->
	<div class="space-y-3">
		{#each dimensions as dim}
			{@const val = dimValue(dim)}
			{@const pct = (val / dim.max) * 100}
			<div>
				<div class="flex items-center justify-between text-xs mb-1">
					<span class="text-terminal-secondary">{dim.label}</span>
					<span class="font-mono text-terminal-primary">{val}<span class="text-terminal-muted">/{dim.max}</span></span>
				</div>
				<div class="h-1.5 rounded-full bg-terminal-hover overflow-hidden">
					<div
						class="h-full rounded-full {dim.color} transition-all duration-700"
						style="width: {pct}%"
					></div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Score history sparkline -->
	{#if history.length >= 2}
		<div class="border-t border-terminal-border pt-4">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs text-terminal-muted">Score History</span>
				{#if scoreDelta !== 0}
					<span class="text-xs font-mono {scoreDelta > 0 ? 'text-emerald-400' : 'text-red-400'}">
						{scoreDelta > 0 ? '+' : ''}{scoreDelta} this week
					</span>
				{/if}
			</div>

			<!-- Sparkline SVG -->
			<div class="relative h-10">
				<svg viewBox="0 0 180 40" class="w-full h-full overflow-visible">
					<path d="M {sparkPath}" fill="none" stroke="currentColor" stroke-width="1.5" class="text-emerald-400" />
					<!-- End dot -->
					{#if history.length}
						{@const lastIdx = history.length - 1}
						{@const scores = history.map(d => d.score)}
						{@const min = Math.min(...scores) - 5}
						{@const max = Math.max(...scores) + 5}
						{@const ex = 180}
						{@const ey = 40 - ((history[lastIdx].score - min) / (max - min)) * 40}
						<circle cx={ex} cy={ey} r="2.5" fill="currentColor" class="text-emerald-400" />
					{/if}
				</svg>
			</div>

			<!-- History points -->
			<div class="mt-2 space-y-1">
				{#each history.slice(-4) as h}
					{@const cfg = ratingConfig(h.rating)}
					<div class="flex items-center gap-2 text-[11px]">
						<span class="text-terminal-muted w-16 shrink-0">{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
						<span class="font-mono w-6 text-right {cfg.color}">{h.score}</span>
						<span class="{cfg.color} text-[10px]">{cfg.label}</span>
						{#if h.changes.length}
							<span class="text-terminal-muted ml-auto truncate max-w-[120px]">{h.changes[0].factor}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
