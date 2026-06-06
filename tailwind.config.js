/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF0F6',
          100: '#FFD6E8',
          200: '#FFB3D1',
          300: '#FF8FB9',
          400: '#FF7DAD',
          500: '#FF6B9D',
          600: '#E8508A',
          700: '#C93D74',
          900: '#7B1D45',
        },
        surface: '#FAF8F6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
