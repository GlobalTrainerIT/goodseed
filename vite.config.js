import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// The site is two entries: index.html (static marketing/landing page, crawlable)
// and app.html (the React SPA shell). In production Netlify rewrites app routes
// to /app.html; this middleware mirrors that behavior in dev/preview.
function appFallback() {
  const rewrite = (req, _res, next) => {
    const url = (req.url || '').split('?')[0]
    if (url !== '/' && url !== '/index.html' && !url.includes('.') && !url.startsWith('/@') && !url.startsWith('/src')) {
      req.url = '/app.html'
    }
    next()
  }
  return {
    name: 'goodseed-app-fallback',
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite)
    },
  }
}

export default defineConfig({
  plugins: [react(), appFallback()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        landing: path.resolve(__dirname, 'index.html'),
        app: path.resolve(__dirname, 'app.html'),
      },
      output: {
        manualChunks: {
          // Split rarely-changing vendor code into its own cacheable chunk.
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
