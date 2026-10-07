import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import postcss from 'postcss'

export default {
  plugins: [
    tailwindcss(),
    autoprefixer(),
    {
      postcssPlugin: 'platform-utilities-layer',
      OnceExit(root, { result }) {
        // Share the utilities layer with Kumo so existing responsive variants
        // retain their precedence over unprefixed display and spacing classes.
        if (!result.opts.from?.replaceAll('\\', '/').split('?')[0].endsWith('/src/style.css')) return
        // TW3 composes transforms in one property; TW4 also sets the individual
        // translate/rotate/scale properties. Reset those on TW3 utilities so
        // shared classes do not apply the same transform twice.
        root.walkDecls('transform', declaration => {
          if (!declaration.value.includes('var(--tw-translate-x)')) return
          for (const prop of ['translate', 'rotate', 'scale']) declaration.cloneAfter({ prop, value: 'none' })
        })
        const layer = postcss.atRule({ name: 'layer', params: 'utilities' })
        for (const node of [...root.nodes]) layer.append(node)
        root.append(layer)
      },
    },
  ],
}
