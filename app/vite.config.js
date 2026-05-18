import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
//
// Note: this app no longer needs a dev proxy for Esper. The frontend talks
// directly to the `worker-esper` Cloudflare Worker in both dev and prod
// (the worker's CORS allow-list includes http://localhost:5173). The worker
// holds the Esper API key as a server-side secret.
//
// `base: '/'` because this app is served from the root of
// agency-agreement.wellboundcarestream.com (not from a GitHub Pages subpath).
export default defineConfig({
  plugins: [react()],
  base: '/',
})
