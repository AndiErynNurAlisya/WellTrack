/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F5FFF7',
          100: '#E6F9EE',
          200: '#85F8C4',
          300: '#68DBA9',
          400: '#10B981',
          500: '#00855D',
          600: '#006948',
          700: '#005137',
          800: '#003825',
          900: '#002114',
        },
        surface: {
          bg: '#F8F9FF',
          soft: '#EFF4FF',
          muted: '#E5EEFF',
          accent: '#D3E4FE',
          ink: '#0B1C30',
          sub: '#3D4A42',
          hint: '#6D7A72',
        },
      },
      boxShadow: {
        'card': '0 2px 12px -2px rgba(11, 28, 48, 0.05), 0 1px 4px -1px rgba(11, 28, 48, 0.03)',
        'card-hover': '0 10px 25px -4px rgba(0, 105, 72, 0.10), 0 4px 10px -2px rgba(11, 28, 48, 0.04)',
      },
    },
  },
  plugins: [],
}

