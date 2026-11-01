import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le build est écrit dans ../public : Express et Vercel servent ensuite cette interface
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    // En développement, les appels /api sont envoyés à l'API locale
    proxy: { '/api': 'http://localhost:3000' },
  },
});
