/** @type {import('tailwindcss').Config} */
import tailwindScrollbar from "tailwind-scrollbar";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#23411f',
          light: '#3d5c33',
          dark: '#1a2f16',
        },
        accent: {
          DEFAULT: '#8fa31e',
          hover: '#78871c',
        },
        surface: {
          DEFAULT: '#fbfcf7',
          container: '#f5faeb',
        },
        border: '#dce6c1',
        'category-badge': '#7e9128',
      },
    },
  },
  plugins: [tailwindScrollbar],
};
