import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  output: 'static',
  integrations: [
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      // Le manifest et le SW ne s'appliquent qu'à la sous-route /aelindra/
      // pour ne pas perturber les autres jeux du site.
      scope: '/aelindra/',
      base: '/aelindra/',
      manifest: {
        name: 'Aelindra · Chroniques des Profondeurs',
        short_name: 'Aelindra',
        description: 'RPG tactique tour par tour médiéval-fantasy. Constituez votre équipe, explorez les profondeurs, affrontez les ténèbres.',
        theme_color: '#07090e',
        background_color: '#07090e',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: '/aelindra/',
        scope: '/aelindra/',
        lang: 'fr',
        categories: ['games'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,css,js,png,jpg,jpeg,svg,webp,woff2,ttf}'],
        globIgnores: ['**/achrogemme/**', '**/stratageme/**', '**/fda/**', '**/orbique/**', '**/ecosim/**', '**/eryndor/**', '**/conway/**', '**/zentel/**', '**/images/strates-v2.webp'],
        navigateFallback: '/aelindra/',
        navigateFallbackDenylist: [/^\/(?!aelindra)/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/feheroes\.fandom\.com\/.*\.webp/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'feh-portraits',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
