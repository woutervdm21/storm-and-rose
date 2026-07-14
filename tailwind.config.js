/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Collection-aware brand colours — driven by CSS variables set per collection.
        // Using <alpha-value> so opacity modifiers (bg-rose-dust/20 etc.) keep working.
        'rose-dust': 'rgb(var(--col-primary-rgb) / <alpha-value>)',
        'rose-deep': 'rgb(var(--col-deep-rgb)    / <alpha-value>)',
        'rose-mid':  'rgb(var(--col-mid-rgb)     / <alpha-value>)',

        // Static structural colours (kept for contrast text and admin UI)
        'navy':  '#1A1A2E',
        'cream': '#F5F3F1',

        // Collection-tinted page and surface backgrounds
        'col-bg':           'var(--col-bg)',
        'col-surface':      'var(--col-surface)',
        'col-bg-dark':      'var(--col-bg-dark)',
        'col-surface-dark': 'var(--col-surface-dark)',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans:  ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
