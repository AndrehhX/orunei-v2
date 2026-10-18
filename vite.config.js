import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { streamMiddleware } from './src/api/streamServer.js'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  return {
    plugins: [
      react(),
      {
        name: 'stream-middleware-plugin',
        configureServer(server) {
          server.middlewares.use(streamMiddleware)
        },
        configurePreviewServer(server) {
          server.middlewares.use(streamMiddleware)
        }
      }
    ],
    build: {
      sourcemap: false,
      minify: 'esbuild',
      cssMinify: true,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[hash].js',
          chunkFileNames: 'assets/[hash].js',
          assetFileNames: 'assets/[hash].[ext]',
        }
      }
    },
    esbuild: isProd ? {
      drop: ['console', 'debugger'],
      legalComments: 'none',
    } : {}
  }
})
