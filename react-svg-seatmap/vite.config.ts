import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Конфигурация для демо-приложения
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  base: './',
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
