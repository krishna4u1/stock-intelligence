import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Rating, MarketRegime, FnoClass, SectorTrend, DataFreshness } from './types';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
	if (compact) {
		if (Math.abs(value) >= 10000) return `₹${(value / 10000).toFixed(2)}T`;
		if (Math.abs(value) >= 100) return `₹${(value / 100).toFixed(2)} K Cr`;
		return `₹${value.toFixed(0)} Cr`;
	}
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 2
	}).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
	return new Intl.NumberFormat('en-IN', {
		maximumFractionDigits: decimals,
		minimumFractionDigits: decimals
	}).format(value);
}

export function formatPct(value: number, decimals = 2): string {
	const sign = value > 0 ? '+' : '';
	return `${sign}${value.toFixed(decimals)}%`;
}

export function formatVolume(value: number): string {
	if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(2)}Cr`;
	if (value >= 100_000) return `${(value / 100_000).toFixed(2)}L`;
	if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
	return value.toString();
}

export function ratingConfig(rating: Rating) {
	const configs = {
		STRONG_BUY: {
			label: 'STRONG BUY',
			emoji: '🟢',
			color: 'text-emerald-400',
			bg: 'bg-emerald-400/10',
			border: 'border-emerald-400/30',
			dot: 'bg-emerald-400'
		},
		BUY: {
			label: 'BUY',
			emoji: '🔵',
			color: 'text-blue-400',
			bg: 'bg-blue-400/10',
			border: 'border-blue-400/30',
			dot: 'bg-blue-400'
		},
		HOLD: {
			label: 'HOLD / WATCH',
			emoji: '🟡',
			color: 'text-amber-400',
			bg: 'bg-amber-400/10',
			border: 'border-amber-400/30',
			dot: 'bg-amber-400'
		},
		SELL: {
			label: 'SELL',
			emoji: '🟠',
			color: 'text-orange-400',
			bg: 'bg-orange-400/10',
			border: 'border-orange-400/30',
			dot: 'bg-orange-400'
		},
		STRONG_SELL: {
			label: 'STRONG SELL',
			emoji: '🔴',
			color: 'text-red-400',
			bg: 'bg-red-400/10',
			border: 'border-red-400/30',
			dot: 'bg-red-400'
		}
	};
	return configs[rating];
}

export function regimeConfig(regime: MarketRegime) {
	const configs = {
		STRONG_BULL: { label: 'Strong Bullish', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
		BULL: { label: 'Bullish', color: 'text-emerald-300', bg: 'bg-emerald-300/10' },
		NEUTRAL: { label: 'Neutral', color: 'text-amber-400', bg: 'bg-amber-400/10' },
		BEAR: { label: 'Bearish', color: 'text-orange-400', bg: 'bg-orange-400/10' },
		STRONG_BEAR: { label: 'Strong Bearish', color: 'text-red-400', bg: 'bg-red-400/10' }
	};
	return configs[regime];
}

export function fnoConfig(cls: FnoClass) {
	const configs = {
		LONG_BUILDUP: { label: 'Long Buildup', color: 'text-emerald-400', emoji: '🟢' },
		SHORT_COVERING: { label: 'Short Covering', color: 'text-emerald-300', emoji: '🟢' },
		NEUTRAL: { label: 'Neutral', color: 'text-terminal-secondary', emoji: '⬜' },
		SHORT_BUILDUP: { label: 'Short Buildup', color: 'text-red-400', emoji: '🔴' },
		LONG_UNWINDING: { label: 'Long Unwinding', color: 'text-orange-400', emoji: '🟠' }
	};
	return configs[cls];
}

export function sectorTrendConfig(trend: SectorTrend) {
	const configs = {
		HOT: { label: '🔥 Hot', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
		IMPROVING: { label: '🟢 Improving', color: 'text-emerald-300', bg: 'bg-emerald-300/10' },
		NEUTRAL: { label: '🟡 Neutral', color: 'text-amber-400', bg: 'bg-amber-400/10' },
		WEAKENING: { label: '🟠 Weakening', color: 'text-orange-400', bg: 'bg-orange-400/10' },
		FALLING: { label: '🔴 Falling', color: 'text-red-400', bg: 'bg-red-400/10' }
	};
	return configs[trend];
}

export function freshnessConfig(f: DataFreshness) {
	const configs = {
		LIVE: { label: '🟢 LIVE', color: 'text-emerald-400' },
		RECENT: { label: '🟢 <5 min', color: 'text-emerald-300' },
		DELAYED: { label: '🟠 Delayed', color: 'text-orange-400' },
		STALE: { label: '🔴 Stale', color: 'text-red-400' }
	};
	return configs[f];
}

export function scoreColor(score: number): string {
	if (score >= 85) return 'text-emerald-400';
	if (score >= 75) return 'text-blue-400';
	if (score >= 60) return 'text-amber-400';
	if (score >= 40) return 'text-orange-400';
	return 'text-red-400';
}

export function changePctColor(pct: number): string {
	if (pct > 0) return 'text-emerald-400';
	if (pct < 0) return 'text-red-400';
	return 'text-terminal-secondary';
}

export function daysAway(dateStr: string): number {
	const diff = new Date(dateStr).getTime() - Date.now();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function pct52wPosition(price: number, low52w: number, high52w: number): number {
	if (high52w === low52w) return 50;
	return Math.round(((price - low52w) / (high52w - low52w)) * 100);
}

export function scoreToRating(score: number): Rating {
	if (score >= 90) return 'STRONG_BUY';
	if (score >= 75) return 'BUY';
	if (score >= 60) return 'HOLD';
	if (score >= 40) return 'SELL';
	return 'STRONG_SELL';
}
