/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arms: {
          dark: '#0A5C1D',
          medium: '#147426',
          light: '#1B8A2F',
          lighter: '#2FA848',
          accent: '#A8E0A8',
          surface: '#FFFFFF',
          bg: '#F4F6F5',
          charcoal: '#222222',
          border: '#E2E8E4',
          muted: '#637381'
        }
      },
      fontFamily: {
        condensed: ['"Barlow Condensed"', '"Oswald"', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
