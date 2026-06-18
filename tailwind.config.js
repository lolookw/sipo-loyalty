/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans:  ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Sipo brand palette
        espresso:    '#43352C',
        crema:       '#F6F0E8',
        arena:       '#D9C7B2',
        terracota:   '#B56A4C',
        salvia:      '#66725F',
        carbon:      '#171717',
        'gris-calido': '#6B6B6B',
        'blanco-suave': '#FCFBF8',
        // Legacy cream scale (used in some components)
        cream: {
          50:  '#FDFCF9',
          100: '#FAF7F2',
          200: '#F3EDE0',
          300: '#E8DECE',
          400: '#D6CABB',
        },
      },
      borderRadius: {
        card: '20px',
        btn:  '14px',
      },
      boxShadow: {
        soft: '0 2px 16px rgba(67,53,44,0.07)',
        card: '0 4px 24px rgba(67,53,44,0.08)',
      },
    },
  },
  plugins: [],
}
