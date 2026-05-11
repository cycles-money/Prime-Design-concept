import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Project page on GitHub Pages is served from /Prime-Design-concept/, so
// asset URLs need that prefix in the production build. Locally (dev / preview)
// the base falls back to '/'.
const base = process.env.GITHUB_ACTIONS ? '/Prime-Design-concept/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
});
