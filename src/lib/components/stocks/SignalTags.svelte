<script lang="ts">
	import type { SignalTag } from '$lib/types';

	export let tags: SignalTag[];

	let selected: SignalTag | null = null;

	function select(tag: SignalTag) {
		selected = selected?.id === tag.id ? null : tag;
	}
</script>

<div class="card p-5">
	<h3 class="section-title">Signal Tags</h3>

	<div class="flex flex-wrap gap-2 mb-4">
		{#each tags as tag (tag.id)}
			<button
				on:click={() => select(tag)}
				class="{tag.sentiment === 'BULLISH' ? 'tag-bullish' : tag.sentiment === 'BEARISH' ? 'tag-bearish' : 'tag-neutral'}
					{selected?.id === tag.id ? 'ring-1 ring-current' : ''}"
			>
				<span>{tag.emoji}</span>
				<span>{tag.label}</span>
			</button>
		{/each}
	</div>

	{#if selected}
		<div class="rounded-md bg-terminal-surface border border-terminal-border p-3 text-xs animate-fade-in">
			<div class="font-semibold text-terminal-primary mb-1">{selected.emoji} {selected.label}</div>
			<div class="text-terminal-secondary">{selected.evidence}</div>
			<div class="mt-1.5 flex items-center gap-2">
				<span class="text-[10px] uppercase tracking-widest text-terminal-muted">{selected.category}</span>
				<span class="h-2.5 w-px bg-terminal-border"></span>
				<span class="text-[10px] uppercase tracking-widest {selected.sentiment === 'BULLISH' ? 'text-emerald-400' : selected.sentiment === 'BEARISH' ? 'text-red-400' : 'text-terminal-muted'}">{selected.sentiment}</span>
			</div>
		</div>
	{:else}
		<p class="text-xs text-terminal-muted">Click any tag to see the evidence behind it.</p>
	{/if}
</div>
