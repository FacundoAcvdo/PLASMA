/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primario: {
          DEFAULT: '#1447e6',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bedbff',
          300: '#8ec5ff',
          400: '#51a2ff',
          500: '#2b7fff',
          600: '#155dfc',
          700: '#1447e6',
          800: '#193cb8',
          900: '#1c398e',
          950: '#162456',
        },
      },
    },
  },
  plugins: [],
};
