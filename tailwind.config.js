/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    colors: {
      white: '#FFFFFF',
      cream: '#FAF6EF',        // 温かい白（白い贅沢ソファのトーン）— 背景に
      'yellow-50': '#FEFCE8',
      'gray-50': '#F8F8F8',
      'gray-200': '#E5E5E5',
      'gray-400': '#999999',
      'gray-600': '#666666',
      'gray-800': '#1A1A1A',
      charcoal: '#1A1614',     // 調光された暗い面（サイドバー/ヘッダー）
      'wine-red': '#6B1F2A',   // 深いボルドー（旧 #8B3A3A から深化）
      gold: '#C9A84C',         // シャンデリアの金
      brass: '#A8894C',        // アンティークブラス（罫線・差し色）
      green: '#4caf91',
      orange: '#FFA726',
      red: '#e05555',
      blue: '#42a5f5',
    },
    extend: {},
  },
  plugins: [],
}
