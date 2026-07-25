import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // The default client/.env is a corrupted OneDrive placeholder that breaks
  // vite's env loading, so env files live in client/env/ instead.
  envDir: 'env',
  plugins: [
    react(),
    tailwindcss(),
  ],
})