/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        turf: { DEFAULT: '#0B3D2E', dark: '#082B20', light: '#155C43' },
        gold: { DEFAULT: '#D9A441', dark: '#B8842E' },
        clay: '#C0532B',
        ivory: '#F7F4EC',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Oswald', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
