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
        soft: '1.25rem',
        card: '1.75rem'
      },
      boxShadow: {
        // צל חתום לכל האפליקציה - עדין וחם, לא אפור-סטנדרטי
        warm: '0 2px 14px rgba(122, 92, 44, 0.08)',
        'warm-lg': '0 10px 34px rgba(122, 92, 44, 0.14)',
        'warm-xl': '0 16px 44px rgba(122, 92, 44, 0.18)'
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'drift': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      },
      animation: {
        'rise-in': 'rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        drift: 'drift 6s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
