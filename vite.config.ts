import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow the sandboxed preview proxy (*.e2b.app) to serve the dev build.
    allowedHosts: true,
  },
})
