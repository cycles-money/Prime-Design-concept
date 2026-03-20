/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Positive (green) — anchored at #60B96D = oklch(0.711 0.139 147.2)
        positive: {
          50:  'oklch(0.970 0.025 147)',
          100: 'oklch(0.940 0.055 147)',
          200: 'oklch(0.880 0.090 147)',
          300: 'oklch(0.800 0.115 147)',
          400: 'oklch(0.750 0.130 147)',
          500: 'oklch(0.711 0.139 147)',  // #60B96D
          600: 'oklch(0.630 0.135 147)',
          700: 'oklch(0.530 0.125 147)',
          800: 'oklch(0.430 0.110 147)',
          900: 'oklch(0.300 0.070 147)',
          950: 'oklch(0.220 0.045 147)',
        },
        // Negative (red) — anchored at #E86D57 = oklch(0.678 0.157 31.8)
        negative: {
          50:  'oklch(0.970 0.025 32)',
          100: 'oklch(0.940 0.050 32)',
          200: 'oklch(0.880 0.090 32)',
          300: 'oklch(0.800 0.120 32)',
          400: 'oklch(0.740 0.145 32)',
          500: 'oklch(0.678 0.157 32)',   // #E86D57
          600: 'oklch(0.600 0.155 32)',
          700: 'oklch(0.520 0.145 32)',
          800: 'oklch(0.420 0.120 32)',
          900: 'oklch(0.300 0.080 32)',
          950: 'oklch(0.220 0.050 32)',
        },
        // Grey scale — OKLCH shades (see src/index.css for CSS variable refs)
        // color-4 (L=0.303) is intentionally between gray-700 and gray-800;
        // use var(--color-4) directly in CSS when a mid-step is needed.
        gray: {
          50:  'oklch(0.932 0.004 256)',  // color-12
          100: 'oklch(0.860 0.008 256)',  // color-11
          200: 'oklch(0.716 0.016 256)',  // color-10
          300: 'oklch(0.645 0.018 256)',  // color-9
          400: 'oklch(0.548 0.020 264)',  // color-8
          500: 'oklch(0.459 0.018 264)',  // color-7
          600: 'oklch(0.396 0.016 264)',  // color-6
          700: 'oklch(0.349 0.014 264)',  // color-5
          800: 'oklch(0.256 0.011 264)',  // color-3
          900: 'oklch(0.197 0.008 264)',  // color-2
          950: 'oklch(0.165 0.007 264)',  // color-1
        },
        // Teal accent — replaces generic blue throughout the app
        blue: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs: ['12px', '18px'],
        sm: ['13px', '20px'],
        base: ['14px', '22px'],
      },
      borderWidth: {
        DEFAULT: '0.5px',
      },
    },
  },
  plugins: [],
};
