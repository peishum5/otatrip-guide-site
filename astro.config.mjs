// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://otatrip.guide',
  integrations: [mdx()],
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  // Server-only secrets for the Gion photo quest judge (/api/quest/judge).
  // Set them in Vercel → Settings → Environment Variables; never in code.
  env: {
    schema: {
      ANTHROPIC_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      QUEST_PASSCODE: envField.string({ context: 'server', access: 'secret', optional: true }),
      QUEST_MODEL: envField.string({ context: 'server', access: 'secret', default: 'claude-opus-5-5' }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
