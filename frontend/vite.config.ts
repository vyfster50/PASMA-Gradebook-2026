import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://discoverpasma.mynetgear.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/pasmoodle/local/gradebookapi'),
      },
    },
  },
})
