/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    colors: {
      white: '#FFFFFF',
      'yellow-50': '#FEFCE8',
      'gray-50': '#F8F8F8',
      'gray-200': '#E5E5E5',
      'gray-400': '#999999',
      'gray-600': '#666666',
      'gray-800': '#1A1A1A',
      'wine-red': '#8B3A3A',
      gold: '#C9A84C',
      green: '#4caf91',
      orange: '#FFA726',
      red: '#e05555',
      blue: '#42a5f5',
    },
    extend: {},
  },
  plugins: [],
}
