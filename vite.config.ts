import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// חשוב: ה-Service Worker כאן אחראי אך ורק ל"קליפת" האפליקציה (shell) -
// קבצי ה-JS/CSS/HTML הסטטיים - כדי שהאפליקציה תיפתח גם ללא אינטרנט.
// נתוני המשתמש עצמם (ציוני דרך, תמונות) מנוהלים ב-IndexedDB (ראו src/db),
// ולא תלויים ב-Service Worker בשום שלב. זו הפרדה מכוונת לפי דרישת האמינות.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'מסלול - יומן התפתחות ילדים',
        short_name: 'מסלול',
        description: 'תיעוד מסע ההתפתחות והזיכרונות של הילדים שלך',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#FBF7F1',
        background_color: '#FBF7F1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // רק נכסים סטטיים - לא נתוני משתמש
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  server: {
    port: 5173
  }
});
