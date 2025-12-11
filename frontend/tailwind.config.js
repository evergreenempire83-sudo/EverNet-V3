/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d3ff',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#0A2463', // Primary
          600: '#071845', // Dark
          700: '#1E3A8A', // Light
          800: '#1e3a8a',
          900: '#0A2463',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#FFD700', // Primary
          600: '#D4AF37', // Dark
          700: '#FFE55C', // Light
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.5s ease-out',
        'slide-in-left': 'slide-in-left 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #071845 0%, #0A2463 25%, #1E3A8A 50%, #0A2463 75%, #071845 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #FFE55C 100%)',
      },
      boxShadow: {
        'gold': '0 4px 14px 0 rgba(255, 215, 0, 0.2)',
        'navy': '0 4px 14px 0 rgba(10, 36, 99, 0.2)',
      },
    },
  },
  plugins: [],
}
