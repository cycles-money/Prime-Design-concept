import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production builds use a relative base (`./`) so assets resolve under any
// served path — works whether GitHub Pages serves the project from a public
// `/<repo>/` URL or, for a private repo, a randomized `*.pages.github.io`
// subdomain. Dev keeps the default `/` for HMR module URLs.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? './' : '/',
}));
