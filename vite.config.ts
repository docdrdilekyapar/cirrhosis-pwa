import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: { 
        name: "HETracker Uygulaması",
        short_name: "HETracker",
        description: "Siroz hastaları için dikkat, reaksiyon ve hafıza testleri",
        theme_color: "#3B82F6",
        background_color: "#F8FAFC",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "tr",
        dir: "ltr",
        categories: ["health", "medical"], 
        prefer_related_applications: false,
        shortcuts: [
          {
            name: "Teste Başla",
            short_name: "Test",
            url: "/test",
            description: "Yeni test oturumu başlat",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Sonuçlar",
            short_name: "Sonuçlar",
            url: "/results",
            description: "Test sonuçlarını görüntüle",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
        icons: [
          {
            src: "/pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "narrow",
            label: "HETracker Ana Ekran",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      devOptions: {
        enabled: true,
        navigateFallback: "index.html",
        suppressWarnings: true,
        type: "module",
      },
    }),
  ],
});
