import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Silence benign socket disconnects caused by browser page refreshes or dev server restarts
            if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') return;
            console.error('[vite ws proxy error]', err.message);
          });
        },
      },
    },
  },
});
