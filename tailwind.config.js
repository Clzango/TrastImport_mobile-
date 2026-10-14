/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("nativewind/tailwind")],
};
