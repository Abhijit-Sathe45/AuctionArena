/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cricket Theme Core Colors (Authentic Human-Crafted Sports Arena)
        cricket: {
          pitch: '#0F5132',       // Classic Cricket Pitch Emerald Green
          turf: '#15803D',        // Cricket Grass Turf Green
          turfLight: '#DCFCE7',   // Soft turf badge
          turfDark: '#0A3E26',    // Dark stadium turf
          navy: '#0B1E3D',        // Stadium Midnight Navy
          navyDark: '#061022',    // Deep Stadium Night Sky
          navyLight: '#1E3A5F',   // Broadcast Panel Navy
          gold: '#D97706',        // Championship Trophy Gold / IPL Hammer
          goldLight: '#FEF3C7',   // Gold tint
          goldDark: '#92400E',    // Deep brass
          red: '#DC2626',         // Cricket Leather Ball Red / Unsold
          redLight: '#FEE2E2',    // Ball red tint
          redDark: '#991B1B',     // Deep cherry red
          white: '#FFFFFF',       // Clean Cricket Whites
          cream: '#FAF8F5',       // Pitch Canvas Cream
          slate: '#0F172A',       // Sharp Human Readable Text
          muted: '#64748B',       // Subdued secondary text
          border: '#E2E8F0',      // Crisp Border
        },

        // Semantic tokens re-tuned to Crisp Cricket Arena
        turf: {
          DEFAULT: '#0F172A',   // Sharp Deep Charcoal Slate for primary text
          dark: '#020617',      // Contrast headings & dark elements
          light: '#F0FDF4',     // Soft cricket turf tint
          subtle: '#F8FAFC',    // Cricket ground canvas
        },
        mint: {
          DEFAULT: '#15803D',   // Rich Cricket Turf Green
          light: '#DCFCE7',     // Soft Turf Tint
          dark: '#0F5132',      // Deep Turf Green
        },
        gold: {
          DEFAULT: '#D97706',   // Championship Trophy Gold
          light: '#FEF3C7',
          dark: '#92400E',
        },
        rose: {
          DEFAULT: '#DC2626',   // Cricket Leather Ball Red
          light: '#FEE2E2',
          dark: '#991B1B',
        },
        sky: {
          DEFAULT: '#0284C7',   // Cricket Floodlight Blue
          light: '#E0F2FE',
          dark: '#0369A1',
        },
        orchid: {
          DEFAULT: '#D97706',   // Trophy Amber Accent
          light: '#FEF3C7',
          dark: '#B45309',
        },
        mauve: {
          DEFAULT: '#94A3B8',   // Clean Slate Grey
          light: '#F1F5F9',
          dark: '#475569',
        },
        clay: {
          DEFAULT: '#DC2626',
          dark: '#991B1B',
          light: '#FEE2E2',
        },
        ivory: {
          DEFAULT: '#F8FAFC',   // Crisp Stadium Pitch
          card: '#FFFFFF',      // Cricket White Card
          tint: '#F1F5F9',
        },
      },
      fontFamily: {
        display: ['"Oswald"', '"Bebas Neue"', '"Outfit"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '2xs': '0 1px 1px 0 rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};
