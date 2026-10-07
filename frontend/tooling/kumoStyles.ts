import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Plugin } from 'vite'

/** Serve Kumo's precompiled Tailwind 4 CSS without the Tailwind 3 compiler. */
export function kumoStyles(): Plugin {
  const require = createRequire(import.meta.url)
  const css = readFileSync(require.resolve('@cloudflare/kumo/styles/standalone'), 'utf8')
  const url = '/assets/kumo.css'
  return {
    name: 'kumo-standalone-styles',
    configureServer(server) {
      server.middlewares.use(url, (_request, response) => {
        response.setHeader('Content-Type', 'text/css')
        response.end(css)
      })
    },
    transformIndexHtml() { return [
      { tag: 'style', children: '@layer theme, base, components, utilities;', injectTo: 'head-prepend' },
      { tag: 'link', attrs: { rel: 'stylesheet', href: url }, injectTo: 'head-prepend' },
    ] },
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'assets/kumo.css', source: css }) },
  }
}
