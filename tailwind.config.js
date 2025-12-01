/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './public/**/*.html',
    './public/js/**/*.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#f7c948',
        'accent-blue': '#0a84ff',
        'accent-green': '#34c759',
        'accent-orange': '#ff9f0a',
        'ink-900': '#0b0b0f',
        'ink-800': '#1c1c1e',
        'ink-700': '#2c2c2e',
        'ink-600': '#3a3a3c',
        'paper-25': '#fdfcf9',
        'paper-50': '#f9f7f2',
        'paper-100': '#f2f2f7',
        'paper-200': '#e5e5ea',
        'paper-300': '#d1d1d6',
        'paper-glass': 'rgba(255, 255, 255, 0.78)',
        'paper-glass-dark': 'rgba(28, 28, 30, 0.75)',
        'background-light': '#f2f2f7',
        'background-dark': '#1c1c1e',
      },
      fontFamily: {
        display: ['"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"New York"', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
      },
      boxShadow: {
        'ios-sm': '0 2px 8px rgba(12, 12, 12, 0.08)',
        'ios-md': '0 10px 40px rgba(12, 12, 12, 0.12)',
        'ios-lg': '0 30px 60px rgba(12, 12, 12, 0.18)',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      transitionTimingFunction: {
        cupertino: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      screens: {
        xs: '360px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
