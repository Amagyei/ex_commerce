import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import frappeui from 'frappe-ui/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    frappeui({
      frappeProxy: true,
      jinjaBootData: true,
      lucideIcons: true,
      buildConfig: {
        indexHtmlPath: "../ex_commerce/www/portal.html",
        emptyOutDir: true,
        sourcemap: true,
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../ex_commerce/public/portal',
    emptyOutDir: true,
    target: 'es2015',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 8080,
    allowedHosts: true,
  },
})
