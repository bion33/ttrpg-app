import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const inDocker = process.env.DOCKER === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                                      // listen on 0.0.0.0 inside the container
    hmr: inDocker ? { clientPort: 8080 } : undefined, // in-container: browser reaches HMR through the proxy
  },
})
