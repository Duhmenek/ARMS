import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        configure: proxy => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
            proxyReq.setHeader('X-Forwarded-Proto', req.headers['x-forwarded-proto'] || 'http');
          });
        }
      }
    }
  }
})
