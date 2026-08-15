import { json } from '@sveltejs/kit';
import { getMarketOverview, getSectorData } from '$lib/providers/mock-data';

export async function GET({ url }) {
	const type = url.searchParams.get('type') ?? 'overview';
	if (type === 'sectors') return json(getSectorData());
	return json(getMarketOverview());
}
