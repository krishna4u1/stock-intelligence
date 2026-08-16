import { json } from '@sveltejs/kit';
import { searchSymbols } from '$lib/providers/nse/symbols';

export async function GET({ url }) {
	const q = url.searchParams.get('q') ?? '';
	if (!q.trim()) return json([]);

	try {
		return json(await searchSymbols(q, 8));
	} catch (err) {
		// Bhavcopy fetch failed (network hiccup, NSE archive hiccup, etc.) —
		// fail soft so a broken search endpoint never breaks the search box.
		console.error('[search] failed:', err);
		return json([]);
	}
}
