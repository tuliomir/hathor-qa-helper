import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem' }],
        body: ['0.875rem', { lineHeight: '1.25rem' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem' }],
        'title-sm': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }],
        title: ['1.3125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        page: ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        data: ['0.8125rem', { lineHeight: '1.25rem' }],
        'data-sm': ['0.75rem', { lineHeight: '1rem' }],
        // LEGACY: used by 22 call sites, removed by the stage sweep
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      spacing: {
        // LEGACY: 211 call sites rely on this; removed by the stage sweep
        '7.5': '1.875rem',
      },
      colors: {
        'ink-muted': 'var(--qa-ink-muted)',
        'field-border': 'var(--qa-field-border)',
        'warning-ink': 'var(--qa-warning-ink)',
        net: {
          testnet: 'var(--qa-net-testnet)',
          shielded: 'var(--qa-net-shielded)',
          mainnet: 'var(--qa-net-mainnet)',
        },
        tint: {
          success: 'var(--qa-tint-success)',
          warning: 'var(--qa-tint-warning)',
          error: 'var(--qa-tint-error)',
          info: 'var(--qa-tint-info)',
          shielded: 'var(--qa-tint-shielded)',
          testnet: 'var(--qa-tint-testnet)',
        },
        // LEGACY aliases so existing classes follow the new theme; removed by the stage sweep
        danger: 'var(--color-error)',
        muted: 'var(--qa-ink-muted)',
        light: 'var(--color-base-200)',
        dark: 'var(--color-base-content)',
        border: 'var(--color-base-300)',
        'primary-dark': 'color-mix(in oklab, var(--color-primary) 80%, black)',
      },
      boxShadow: {
        float: 'var(--qa-shadow-float)',
      },
      backgroundImage: {
        veil: 'var(--qa-veil)',
      },
      maxWidth: {
        stage: '70rem',
        prose: '65ch',
      },
    },
  },
  plugins: [daisyui],
} satisfies Config;
