import { defineConfig, presetUno, presetIcons } from 'unocss';
import presetDaisy from '@unscatty/unocss-preset-daisy';

export default defineConfig({
  presets: [
    presetUno(),
    presetDaisy(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
    }),
  ],
  theme: {
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
  shortcuts: {
    // Button shortcuts
    'btn': 'px-3 py-2 rounded cursor-pointer font-medium transition-colors duration-200 border-none',
    'btn-primary': 'btn bg-primary text-white hover:bg-primary-dark',
    'btn-success': 'btn bg-success text-white hover:bg-green-600',
    'btn-danger': 'btn bg-danger text-white hover:bg-red-600',
    'btn-warning': 'btn bg-warning text-black hover:bg-yellow-500',
    'btn-secondary': 'btn bg-muted text-white hover:bg-gray-600',

    // Card shortcuts
    'card': 'p-5 rounded-lg border-2 bg-white',
    'card-primary': 'card border-primary bg-light',

    // Input shortcuts
    'input': 'w-full px-3 py-2 text-sm border border-gray-300 rounded',
    'input-error': 'input border-danger border-2',

    // Table shortcuts
    'table-header': 'bg-light border-b-2 border-border',
    'table-row': 'border-b border-border',

    // Status badges
    'status-idle': 'text-muted font-bold text-sm',
    'status-connecting': 'text-warning font-bold text-sm',
    'status-syncing': 'text-warning font-bold text-sm',
    'status-ready': 'text-success font-bold text-sm',
    'status-error': 'text-danger font-bold text-sm',
  },
});
