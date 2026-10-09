// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  // One self-hosted heading font, no network at build or run time (spec 0002).
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Fraunces',
      cssVariable: '--font-fraunces',
      fallbacks: ['serif'],
      display: 'swap',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/fraunces-latin-600-normal.woff2'],
            weight: 600,
            style: 'normal'
          }
        ]
      }
    }
  ]
});
