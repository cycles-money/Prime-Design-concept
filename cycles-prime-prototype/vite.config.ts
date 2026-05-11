import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The repo is private, so GitHub Pages serves from a randomized subdomain
// (not /Prime-Design-concept/) for the project page. Using './' keeps asset
// URLs relative, which works whether the build is served from a private
// randomized URL or a public /<repo>/ project page. Locally dev still uses
// the default '/'.
const base = process.env.GITHUB_ACTIONS ? './' : '/';

export default defineConfig({
  plugins: [react()],
  base,
});
