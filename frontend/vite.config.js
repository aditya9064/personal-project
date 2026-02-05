/**
 * Vite Configuration
 * 
 * CONCEPT: What is Vite?
 * Vite is a build tool that makes development FAST.
 * - Hot Module Replacement (HMR): Changes appear instantly without page reload
 * - ES modules in development: No bundling needed during dev
 * - Optimized production builds: Fast, small bundles for deployment
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Proxy API requests to our backend during development
    // This avoids CORS issues and mimics production setup
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})

