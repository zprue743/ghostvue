/**
 * `@ghostvue/nuxt`: Nuxt module that registers GhostVue auto-imports.
 *
 * Dependency direction: this package points toward `@ghostvue/vue` (required
 * peer) and, only when a consumer opts in, `@ghostvue/themes` (optional peer).
 * Neither of those packages knows about Nuxt. The module references both by
 * package name only, so the consumer's own installation (and its single Vue
 * runtime) is what Nuxt bundles.
 *
 * Named imports from `@ghostvue/vue` / `@ghostvue/themes` stay the primary
 * library API; this module only spares Nuxt apps from writing them.
 */
import { pathToFileURL } from 'node:url'

import {
  addComponent,
  addImports,
  defineNuxtModule,
  tryResolveModule,
  useLogger,
} from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'

import {
  planGhostVueNuxt,
  THEMES_PACKAGE,
  type GhostVueNuxtOptions,
} from './plan.js'

export {
  ghostVueNuxtStylesheets,
  type GhostVueNuxtComponents,
  type GhostVueNuxtOptions,
  type GhostVueNuxtStylesheet,
} from './plan.js'

/** `nuxt.config` key that holds {@link GhostVueNuxtOptions}. */
const CONFIG_KEY = 'ghostvue'

/**
 * Nuxt module. Add `'@ghostvue/nuxt'` to `modules` and configure it under the
 * `ghostvue` key. Defaults auto-import headless components and `useGhost*`
 * composables from `@ghostvue/vue` and inject no CSS.
 */
const ghostVueNuxtModule: NuxtModule<GhostVueNuxtOptions> =
  defineNuxtModule<GhostVueNuxtOptions>({
    meta: {
      name: '@ghostvue/nuxt',
      configKey: CONFIG_KEY,
      compatibility: { nuxt: '>=4.6.0' },
    },
    defaults: {
      components: 'headless',
      composables: true,
      css: [],
    },
    async setup(options, nuxt) {
      const logger = useLogger('@ghostvue/nuxt')
      const plan = planGhostVueNuxt(options)

      if (plan.requiresThemes) {
        // Fail at build time with the fix instead of emitting imports that only
        // break once Vite tries to resolve them.
        const searchFrom = [
          nuxt.options.rootDir,
          ...nuxt.options.modulesDir,
        ].map((directory) => pathToFileURL(`${directory}/`))
        if (!(await tryResolveModule(THEMES_PACKAGE, searchFrom))) {
          throw new Error(
            `[@ghostvue/nuxt] ghostvue.components: 'themed' and ghostvue.css need ${THEMES_PACKAGE}. Install it, or keep the headless default.`,
          )
        }
        // The themes entry imports its stylesheet. Transpiling keeps that CSS
        // import inside Vite during SSR instead of handing a `.css` import to
        // Node, which cannot load it.
        if (!nuxt.options.build.transpile.includes(THEMES_PACKAGE)) {
          nuxt.options.build.transpile.push(THEMES_PACKAGE)
        }
      }

      for (const specifier of plan.css) {
        if (!nuxt.options.css.includes(specifier)) {
          nuxt.options.css.push(specifier)
        }
      }

      for (const { name, from } of plan.components) {
        addComponent({ name, export: name, filePath: from })
      }

      if (plan.components.length > 0) {
        // App and layer component directories register with a higher priority
        // than module components, so Nuxt would otherwise drop ours silently
        // when an app also defines e.g. `components/GhostButton.vue`. This hook
        // runs after the registrations above and reports each tag that now
        // resolves somewhere else.
        const ours = new Map(
          plan.components.map((entry) => [entry.name, entry]),
        )
        nuxt.hook('components:extend', (components) => {
          for (const component of components) {
            const expected = ours.get(component.pascalName)
            if (expected && component.filePath !== expected.from) {
              logger.warn(
                `<${expected.name}> resolves to ${component.filePath}, not ${expected.from}. Rename one of them, or import the GhostVue component explicitly.`,
              )
            }
          }
        })
      }

      if (plan.composables.length > 0) {
        addImports(
          plan.composables.map(({ name, from }) => ({ name, as: name, from })),
        )
      }
    },
  })

export default ghostVueNuxtModule

declare module '@nuxt/schema' {
  interface NuxtConfig {
    /** GhostVue auto-import options for `@ghostvue/nuxt`. */
    ghostvue?: GhostVueNuxtOptions
  }
  interface NuxtOptions {
    ghostvue?: GhostVueNuxtOptions
  }
}
