import type { Config } from 'tailwindcss';

/**
 * Sistema visual «sleeve de vinilo»: papel hueso y tinta cálida en lugar de
 * grises fríos, naranja de etiqueta discográfica como color de acción, verde
 * azulado para lo confirmado y oro para línea y bingo.
 *
 * Las rampas `slate`, `emerald`, `amber` y `rose` se **redefinen** en vez de
 * añadir nombres nuevos: así toda la aplicación adopta la paleta sin tener que
 * reescribir cada clase, y las relaciones de contraste ya pensadas se mantienen.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Neutros: papel hueso (50) a laca negra (950)
        slate: {
          50: '#faf6ec',
          100: '#f1e9d8',
          200: '#e0d5bc',
          300: '#c2b393',
          400: '#8a7a5e',
          500: '#6b5d48',
          600: '#524635',
          700: '#3d3427',
          800: '#29231b',
          900: '#1a1613',
          950: '#100e0c',
        },
        // Acción: naranja de etiqueta
        brand: {
          50: '#fff4ee',
          100: '#ffe3d6',
          200: '#ffcdb6',
          300: '#ffb08d',
          400: '#ff8352',
          500: '#f55a1e',
          600: '#cf3a00',
          700: '#a62e00',
          900: '#5e1a00',
        },
        // Error y descarte. `accent` y `rose` son la misma tinta a propósito:
        // toda la aplicación ya usaba `accent-500` para los mensajes de error.
        accent: {
          100: '#f7ded6',
          400: '#c95a42',
          500: '#b3402a',
          600: '#97331f',
        },
        // Confirmado
        emerald: {
          100: '#dcebd7',
          400: '#5e9e62',
          500: '#3d7a46',
          900: '#1b3a21',
        },
        // Línea y bingo
        amber: {
          200: '#f5e0ac',
          400: '#e0a53b',
          500: '#c98a1e',
          600: '#a66e12',
          700: '#7d5209',
        },
        // Descartado
        rose: {
          100: '#f7ded6',
          300: '#e0a492',
          500: '#b3402a',
          600: '#97331f',
          900: '#4a1409',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'Haettenschweiler', 'sans-serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        // Sombra corta y dura, como una funda apoyada sobre la mesa
        sleeve: '0 2px 0 0 rgb(26 22 19 / 0.9)',
        'sleeve-lg': '0 6px 0 0 rgb(26 22 19 / 0.9)',
        soft: '0 20px 60px -28px rgb(26 22 19 / 0.35)',
      },
      keyframes: {
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'spin-record': 'spin 1.8s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
