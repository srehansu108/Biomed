import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Add this for Tailwind v4
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://biomed-2nq9.onrender.com',
        changeOrigin: true,
      }
    }
  }
})