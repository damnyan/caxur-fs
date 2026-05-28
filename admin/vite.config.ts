import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Load package.json details
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = env.PORT ? parseInt(env.PORT) : 5173

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port,
    },
    preview: {
      port,
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
  }
})
