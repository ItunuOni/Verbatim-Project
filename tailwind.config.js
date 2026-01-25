/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'verbatim-navy': '#000f30',
        'verbatim-orange': '#ff4d00',
        'verbatim-light': '#e0e6ed',
      },
    },
  },
  plugins: [],
}