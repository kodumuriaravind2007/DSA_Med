/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          DEFAULT: '#7F011F',
          hover: '#660119',
          dark: '#520114',
          deep: '#36000D',
          light: '#9E1432',
          subtle: '#FAF0F2',
          border: '#E8B6C0',
        },
        sand: {
          DEFAULT: '#F5EBD0',
          light: '#FAF5E8',
          soft: '#FCF9F2',
          border: '#E8DBC0',
          dark: '#D8C59E',
        },
        medtree: {
          primary: '#7F011F',
          'primary-hover': '#660119',
          wine: '#7F011F',
          sand: '#F5EBD0',
          navy: '#2A050E',
          'navy-light': '#3D0815',
          'navy-dark': '#20030A',
          blue: '#7F011F',
          'blue-light': '#9E1432',
          teal: '#7F011F',
          'teal-light': '#9E1432',
          bg: '#FAF6EC',
          card: '#FFFFFF',
          dark: '#FAF5E8',
          text: '#2A161B',
          muted: '#6E5A5E',
          'text-muted': '#6E5A5E',
          border: '#E8DBC0',
          critical: '#B91C1C',
          warning: '#C2410C',
          success: '#15803D',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
