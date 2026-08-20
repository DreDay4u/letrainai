import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Keystatic integration deferred to Phase 3 (deps installed, not wired yet).
export default defineConfig({
  site: 'https://letrainai.com',
  output: 'server',
  compressHTML: true, // deviation: 7.2.4 union is boolean | "jsx" — "astro" not accepted
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4321,
  },
  integrations: [react()],
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
});
