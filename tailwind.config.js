/** @type {import('tailwindcss').Config} */
export default {
  // toggle dark mode via a class on <html>
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // brand palette
        'rose-dust':  '#C4788A',
        'rose-deep':  '#8B2E4A',
        'rose-mid':   '#B5607A',
        'navy':       '#1A1A2E',
        'cream':      '#F5F3F1',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans:  ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
