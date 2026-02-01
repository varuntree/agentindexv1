import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    path.join(configDir, 'app/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(configDir, 'components/**/*.{js,ts,jsx,tsx,mdx}')
  ],
  theme: {
    extend: {}
  },
  plugins: []
};

export default config;
