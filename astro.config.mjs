// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import optimizeImgOutput from './integrations/optimize-img-output.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://otatrip.guide',
  integrations: [mdx(), optimizeImgOutput()],
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
