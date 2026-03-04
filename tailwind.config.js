/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/flowbite-react/**/*.js",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: '#0f172a',
        link: '#334155',
        darklink: '#94a3b8',
      },
    },
  },
  plugins: [
    require('flowbite/plugin'),
  ],
}
