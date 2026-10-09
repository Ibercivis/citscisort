import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-joyride'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://citscisort-api.ibercivis.es',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://citscisort-api.ibercivis.es');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
})
