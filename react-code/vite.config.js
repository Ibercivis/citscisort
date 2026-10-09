import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const git = (args, fallback = '') => {
  try {
    return execSync(`git ${args}`, { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return fallback
  }
}

// Version shown in About: latest git tag (+N if there are N commits after it),
// plus the short commit and the build date. Computed at build time.
const tag = git('describe --tags --abbrev=0', 'v0.0.0')
const ahead = tag === 'v0.0.0' ? '' : git(`rev-list --count ${tag}..HEAD`, '0')
const dirty = git('status --porcelain -- .') ? '-dirty' : ''
const appVersion = `${tag}${ahead && ahead !== '0' ? `+${ahead}` : ''}${dirty}`
const appCommit = git('rev-parse --short HEAD', 'unknown')
const appBuildDate = new Date().toISOString().slice(0, 10)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
    __APP_BUILD_DATE__: JSON.stringify(appBuildDate),
  },
  optimizeDeps: {
    include: ['react-joyride'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://citscisort-api.ibercivis.es',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://citscisort-api.ibercivis.es');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
})
