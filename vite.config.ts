import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const inDocker = process.env.DOCKER === 'true'

const resolveSrc = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ui': resolveSrc('./src/components/ui'),
      '@features': resolveSrc('./src/components/features'),
      '@pages': resolveSrc('./src/components/features/pages'),
      '@hooks': resolveSrc('./src/hooks'),
      '@lib': resolveSrc('./src/lib'),
      '@type': resolveSrc('./src/type'),
      // Stub out @tiptap/extension-drag-handle's Yjs collaboration imports (unused here) to keep Yjs out of the bundle.
      '@tiptap/extension-collaboration': resolveSrc('./src/shims/tiptapCollaboration.ts'),
      '@tiptap/y-tiptap': resolveSrc('./src/shims/tiptapYtiptap.ts'),
    },
  },
  server: {
    host: true,                                      // listen on 0.0.0.0 inside the container
    hmr: inDocker ? { clientPort: 8080 } : undefined, // in-container: browser reaches HMR through the proxy
  },
})
