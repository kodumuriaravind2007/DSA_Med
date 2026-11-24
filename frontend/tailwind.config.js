/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#EC5E27',
          50: '#FFF7F2',
          100: '#FFECE2',
          200: '#FFD7C5',
          300: '#FFBA9E',
          400: '#F98E64',
          500: '#EC5E27',
          600: '#D54813',
          700: '#B2360B',
          800: '#8E2C0B',
          900: '#75260C',
        },
        milk: {
          DEFAULT: '#FDFDF1',
          50: '#FFFFFF',
          100: '#FDFDF1',
          200: '#FAF8E4',
          300: '#F4F0D0',
          400: '#EAE4B8',
          border: '#E8E4C9',
          dark: '#DCD4A8',
        },
        charcoal: {
          DEFAULT: '#251E1A',
          light: '#3D342E',
          muted: '#736860',
          subtle: '#A89E96',
        },
        // Backward compatibility mappings so existing components automatically look clean
        wine: {
          DEFAULT: '#EC5E27',
          hover: '#D54813',
          dark: '#B2360B',
          deep: '#75260C',
          light: '#F98E64',
          subtle: '#FFF5F0',
          border: '#FFD7C5',
        },
        sand: {
          DEFAULT: '#FDFDF1',
          light: '#FFFFFF',
          soft: '#FBF9EA',
          border: '#E8E4C9',
          dark: '#E0D9B8',
        },
        medtree: {
          primary: '#EC5E27',
          'primary-hover': '#D54813',
          wine: '#EC5E27',
          sand: '#FDFDF1',
          navy: '#251E1A',
          'navy-light': '#3D342E',
          'navy-dark': '#191411',
          blue: '#EC5E27',
          'blue-light': '#F98E64',
          teal: '#EC5E27',
          'teal-light': '#F98E64',
          bg: '#FDFDF1',
          card: '#FFFFFF',
          dark: '#FBF9EA',
          text: '#251E1A',
          muted: '#736860',
          'text-muted': '#736860',
          border: '#E8E4C9',
          critical: '#DC2626',
          warning: '#EA580C',
          success: '#16A34A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'clean': '0 1px 3px rgba(37, 30, 26, 0.04), 0 4px 12px rgba(37, 30, 26, 0.03)',
        'card': '0 2px 8px rgba(236, 94, 39, 0.04), 0 1px 2px rgba(37, 30, 26, 0.04)',
        'orange-sm': '0 2px 8px rgba(236, 94, 39, 0.2)',
        'orange-lg': '0 8px 24px rgba(236, 94, 39, 0.25)',
      }
    },
  },
  plugins: [],
}
