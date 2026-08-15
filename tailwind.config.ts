import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				terminal: {
					bg: '#0d0e16',
					surface: '#12131d',
					card: '#181924',
					hover: '#1e1f2e',
					border: '#252636',
					muted: '#666680',
					secondary: '#9a9ab8',
					primary: '#eeeef8'
				},
				signal: {
					'strong-buy': '#10b981',
					buy: '#3b82f6',
					hold: '#f59e0b',
					sell: '#f97316',
					'strong-sell': '#ef4444'
				}
			},
			fontFamily: {
				mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
				sans: ['Inter', 'system-ui', 'sans-serif']
			},
			animation: {
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'fade-in': 'fadeIn 0.2s ease-in-out',
				'slide-up': 'slideUp 0.3s ease-out'
			},
			keyframes: {
				fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
				slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } }
			}
		}
	},
	plugins: [animate]
} satisfies Config;
