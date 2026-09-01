/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Direct tokens for the user's 5-color palette
        sky: { DEFAULT: '#C9DDFF', light: '#EAF2FF', dark: '#9BBFF7' },
        orchid: { DEFAULT: '#ECB0E1', light: '#FDF2FB', dark: '#D689C8' },
        rose: { DEFAULT: '#DE6C83', light: '#FCEEF1', dark: '#C44E68' },
        mauve: { DEFAULT: '#C1AAC0', light: '#F4EEF3', dark: '#8C718B' },
        mint: { DEFAULT: '#2CF6B3', light: '#E6FEF5', dark: '#15D695' },

        // Semantic tokens for crisp, elegant Light Theme
        turf: {
          DEFAULT: '#221929',   // Deep Charcoal-Mauve for primary text
          dark: '#120C17',      // Contrast headings & dark elements
          light: '#F0F5FF',     // Soft sky-tinted light background
          subtle: '#F8FAFE',    // Lightest background canvas
        },
        gold: {
          DEFAULT: '#2CF6B3',
          dark: '#15D695',
          light: '#E6FEF5',
        },
        clay: {
          DEFAULT: '#DE6C83',
          dark: '#C44E68',
          light: '#FCEEF1',
        },
        ivory: {
          DEFAULT: '#F7FAFE',
          card: '#FFFFFF',
          tint: '#EDF3FC',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Oswald', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
