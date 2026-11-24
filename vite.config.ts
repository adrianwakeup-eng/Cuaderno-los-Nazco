import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          webrtc: ['peerjs'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 3001,
  },
});
