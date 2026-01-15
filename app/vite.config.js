import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const esperTenant = env.VITE_ESPER_TENANT || 'ricct'
  
  return {
    plugins: [react()],
    base: '/agency-agreement/',
    server: {
      proxy: {
        '/esper-api': {
          target: `https://${esperTenant}-api.esper.cloud`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/esper-api/, '/api'),
          secure: true,
        },
      },
    },
  }
})
