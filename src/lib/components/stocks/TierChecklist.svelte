<script lang="ts">
	import type { TierCheck } from '$lib/types';
	import { CheckCircle2, XCircle } from 'lucide-svelte';

	export let tier1: TierCheck[];
	export let tier2: TierCheck[];
	export let tier3: TierCheck[];

	$: t1Pass = tier1.filter(c => c.passed).length;
	$: t2Pass = tier2.filter(c => c.passed).length;
	$: t3Pass = tier3.filter(c => c.passed).length;
</script>

<div class="card p-5 space-y-5">
	<h3 class="section-title">Tier Checklist</h3>

	<!-- Tier 1 -->
	<div>
		<div class="flex items-center justify-between mb-2">
			<span class="text-xs font-semibold text-terminal-secondary uppercase tracking-widest">Tier 1 — Must Have</span>
			<span class="font-mono text-xs {t1Pass >= 5 ? 'text-emerald-400' : t1Pass >= 3 ? 'text-amber-400' : 'text-red-400'}">{t1Pass}/{tier1.length}</span>
		</div>
		<div class="space-y-1.5">
			{#each tier1 as check}
				<div class="flex items-center gap-2.5 text-xs">
					{#if check.passed}
						<CheckCircle2 class="h-3.5 w-3.5 text-emerald-400 shrink-0" />
						<span class="text-terminal-secondary flex-1">{check.label}</span>
						{#if check.value}
							<span class="font-mono text-emerald-400/70 text-[11px]">{check.value}</span>
						{/if}
					{:else}
						<XCircle class="h-3.5 w-3.5 {check.critical ? 'text-red-400' : 'text-terminal-muted'} shrink-0" />
						<span class="{check.critical ? 'text-red-300/70' : 'text-terminal-muted'} flex-1">{check.label}</span>
						{#if check.value}
							<span class="font-mono text-terminal-muted text-[11px]">{check.value}</span>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Tier 2 -->
	<div>
		<div class="flex items-center justify-between mb-2">
			<span class="text-xs font-semibold text-terminal-secondary uppercase tracking-widest">Tier 2 — Confirmation</span>
			<span class="font-mono text-xs {t2Pass >= 4 ? 'text-emerald-400' : t2Pass >= 2 ? 'text-amber-400' : 'text-red-400'}">{t2Pass}/{tier2.length}</span>
		</div>
		<div class="space-y-1.5">
			{#each tier2 as check}
				<div class="flex items-center gap-2.5 text-xs">
					{#if check.passed}
						<CheckCircle2 class="h-3.5 w-3.5 text-blue-400 shrink-0" />
						<span class="text-terminal-secondary flex-1">{check.label}</span>
						{#if check.value}
							<span class="font-mono text-blue-400/70 text-[11px]">{check.value}</span>
						{/if}
					{:else}
						<XCircle class="h-3.5 w-3.5 text-terminal-muted shrink-0" />
						<span class="text-terminal-muted flex-1">{check.label}</span>
						{#if check.value}
							<span class="font-mono text-terminal-muted text-[11px]">{check.value}</span>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Tier 3 -->
	<div>
		<div class="flex items-center justify-between mb-2">
			<span class="text-xs font-semibold text-terminal-secondary uppercase tracking-widest">Tier 3 — Additional Edge</span>
			<span class="font-mono text-xs text-terminal-secondary">{t3Pass}/{tier3.length}</span>
		</div>
		<div class="space-y-1.5">
			{#each tier3 as check}
				<div class="flex items-center gap-2.5 text-xs">
					{#if check.passed}
						<CheckCircle2 class="h-3.5 w-3.5 text-purple-400 shrink-0" />
						<span class="text-terminal-secondary flex-1">{check.label}</span>
						{#if check.value}
							<span class="font-mono text-purple-400/70 text-[11px]">{check.value}</span>
						{/if}
					{:else}
						<XCircle class="h-3.5 w-3.5 text-terminal-muted shrink-0" />
						<span class="text-terminal-muted flex-1">{check.label}</span>
						{#if check.value}
							<span class="font-mono text-terminal-muted text-[11px]">{check.value}</span>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
