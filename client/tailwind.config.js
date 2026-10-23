import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(here, 'index.html'), path.join(here, 'src/**/*.{js,jsx}')],
  theme: {
    extend: {
      colors: {
        leaf: { DEFAULT: '#0B6B2E', dark: '#085424', soft: '#E6F2EA' },
        chili: { DEFAULT: '#D9381E', dark: '#B52D16', soft: '#FBE9E5' },
        paper: '#FAF8F5',
        ink: '#171717',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 10px 30px -12px rgba(0,0,0,.25)' },
    },
  },
  plugins: [],
};
