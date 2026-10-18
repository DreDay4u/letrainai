import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://letrainai.com',
  output: 'server',
  // No sessions/cookies anywhere on this site — skip the session machinery
  // for a smaller SSR cold start (Astro 7.2+).
  session: false,
  compressHTML: true, // deviation: 7.2.4 union is boolean | "jsx" — "astro" not accepted
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4321,
  },
  integrations: [react(), mdx(), keystatic()],
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
});
