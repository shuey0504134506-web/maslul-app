/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // פלטת "מסלול": חול חם, דיו כהה-חמים, דבש עדין, ירוק מרווה לצמיחה.
        // נמנעים בכוונה מהצירוף השכיח קרם+טרה-קוטה (#F4F1EA / #D97757).
        sand: {
          50: '#FCFAF6',
          100: '#FAF6EF',
          200: '#F3EBDC',
          300: '#E8DAC2'
        },
        ink: {
          DEFAULT: '#2B2621',
          soft: '#5C5348'
        },
        honey: {
          DEFAULT: '#C99A4B',
          dark: '#A87E38',
          light: '#E8C989'
        },
        sage: {
          DEFAULT: '#8A9B76',
          dark: '#657054'
        },
        clay: {
          DEFAULT: '#B97A5E',
          light: '#E3B8A4'
        }
      },
      fontFamily: {
        display: ['"Frank Ruhl Libre"', 'serif'],
        body: ['"Heebo"', 'sans-serif']
      },
      borderRadius: {
        soft: '1.25rem'
      }
    }
  },
  plugins: []
};
