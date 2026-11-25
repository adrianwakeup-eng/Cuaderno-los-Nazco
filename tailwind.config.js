import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{ts,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#EEF6F1',
          100: '#D6EBDD',
          200: '#ACD5BA',
          500: '#2A7A4B',
          600: '#1D623C',
          700: '#164D32',
          800: '#103A25',
          900: '#0B2819',
        },
        brazil: {
          50: '#EDF8F0',
          100: '#D2EED9',
          400: '#4FA861',
          500: '#398B4B',
          600: '#2D733D',
          700: '#164D32',
        },
        solar: {
          50: '#FFFBEA',
          100: '#FEF3C7',
          200: '#FCE48B',
          300: '#F8D45E',
          400: '#F2C443',
          500: '#DBA621',
          600: '#BA8516',
        },
        ocean: {
          50: '#EEF5FA',
          100: '#D4E5F2',
          500: '#226294',
          600: '#16466C',
          700: '#0F3350',
        },
        cotton: {
          50: '#FCF9F4',
          100: '#F5EBDD',
          200: '#EAD9C2',
          300: '#DBC3A3',
        },
        artisanal: {
          400: '#CFA96D',
          500: '#BA9254',
          600: '#9A743B',
        },
        linen: {
          50: '#FCF9F4',
          100: '#F5EBDD',
          200: '#EADAC4',
          300: '#D9C3A5',
        },
        terracotta: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#047857',
          700: '#065F46',
        },
        olive: {
          50: '#EDF7F0',
          100: '#D5ECD9',
          600: '#398B4B',
          700: '#164D32',
        },
        espresso: {
          900: '#231A12',
          700: '#4D3D2E',
          500: '#72604F',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        script: ['"Dancing Script"', '"Cormorant Garamond"', 'cursive'],
      },
    },
  },
  plugins: [],
};
