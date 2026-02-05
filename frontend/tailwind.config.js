/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        copper: {
          50: '#fdf8f6',
          100: '#f9ebe5',
          200: '#f4d7cb',
          300: '#e9b89f',
          400: '#db9069',
          500: '#c97849',
          600: '#b56239',
          700: '#964f2f',
          800: '#7c422a',
          900: '#673a28',
        },
        sage: {
          50: '#f6f7f4',
          100: '#e5e9de',
          200: '#ccd4bf',
          300: '#a8b694',
          400: '#879970',
          500: '#6a7d55',
          600: '#536342',
          700: '#424e36',
          800: '#37402e',
          900: '#2f3628',
        },
        cream: '#fffcf7',
        charcoal: '#2d2926',
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(0.8)', opacity: '0.8' },
          '50%': { transform: 'scale(1.2)', opacity: '0.4' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
