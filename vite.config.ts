import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: GitHub Pages serves project sites at /repo-name/ subpath.
// Remove or set to '/' if local dev is needed again (npm run dev).
export default defineConfig({
  plugins: [react()],
  base: '/Bayes-Exploration-mode/',
})
