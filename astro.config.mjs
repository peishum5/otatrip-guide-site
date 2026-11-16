// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://otatrip.guide',
  integrations: [mdx()],
  output: 'static',
  // Astro 7 changed the default to 'jsx' (React-style whitespace stripping).
  // Keep the Astro 5 behavior so rendered text spacing stays identical.
  compressHTML: true,
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
