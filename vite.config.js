import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// New Taipei City open-data API has no CORS headers.
// Proxy dev requests through Vite so the browser can fetch it.
// For production, run the same rewrite on your own backend.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/ntpc': {
        target: 'https://data.ntpc.gov.tw',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ntpc/, ''),
      },
      '/api/taipei': {
        target: 'https://data.taipei',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/taipei/, ''),
      },
      '/api/geocode': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/geocode/, ''),
        headers: {
          // Nominatim policy requires identifying User-Agent
          'User-Agent': 'tw-truck-map-dev/1.0',
        },
      },
    },
  },
})
