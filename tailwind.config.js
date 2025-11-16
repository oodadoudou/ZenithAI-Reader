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
        primary: '#fbeb5b',
        'background-light': '#fdfaf6',
        'background-dark': '#23210f',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
      borderRadius: {
        xl: '1.5rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
