import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/evernet-admin-system/', // ← MUST match your repo name
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true
  }
})
