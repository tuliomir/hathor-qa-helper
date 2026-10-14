import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
        'primary-dark': '#0056b3',
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8',
        light: '#f8f9fa',
        dark: '#212529',
        muted: '#6c757d',
        border: '#dee2e6',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ['light'],
    logs: false,
  },
} satisfies Config;