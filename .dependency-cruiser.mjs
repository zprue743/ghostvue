import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Circular imports obscure dependency direction and can break initialization order.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'shared-no-internal-dependencies',
      severity: 'error',
      comment:
        '@ghostvue/shared has no internal workspace dependencies (docs/architecture/package-boundaries.md).',
      from: {
        path: '^packages/shared/',
      },
      to: {
        path: '^(@ghostvue/(core|vue|themes)(/|$)|packages/(core|vue|themes)/)',
      },
    },
    {
      name: 'core-no-vue-or-themes',
      severity: 'error',
      comment:
        '@ghostvue/core is framework-independent and may only depend on @ghostvue/shared (docs/architecture/package-boundaries.md).',
      from: {
        path: '^packages/core/',
      },
      to: {
        path: '^(@ghostvue/(vue|themes)(/|$)|packages/(vue|themes)/)',
      },
    },
    {
      name: 'vue-no-themes',
      severity: 'error',
      comment:
        '@ghostvue/vue must remain headless and never depend on @ghostvue/themes (docs/architecture/package-boundaries.md).',
      from: {
        path: '^packages/vue/',
      },
      to: {
        path: '^(@ghostvue/themes(/|$)|packages/themes/)',
      },
    },
    {
      name: 'themes-only-depends-on-vue',
      severity: 'error',
      comment:
        '@ghostvue/themes may only depend on @ghostvue/vue among workspace packages (scripts/workspace-packages.mjs).',
      from: {
        path: '^packages/themes/',
      },
      to: {
        path: '^(@ghostvue/(core|shared)(/|$)|packages/(core|shared)/)',
      },
    },
    {
      name: 'no-cross-package-relative-src',
      severity: 'error',
      comment:
        'Workspace packages must import sibling packages via their package name, not relative paths into another package.',
      from: {
        path: '^packages/([^/]+)/',
      },
      to: {
        dependencyTypes: ['local'],
        path: '^packages/(?!$1/)[^/]+/',
      },
    },
    {
      name: 'no-dist-imports',
      severity: 'error',
      comment:
        'Source files must not import directly from build output (dist) directories.',
      from: {},
      to: {
        dependencyTypes: ['local'],
        path: '(^|/)dist(/|$)',
      },
    },
    {
      name: 'no-package-dist-subpath-imports',
      severity: 'error',
      comment: 'Source files must not import package dist subpaths directly.',
      from: {},
      to: {
        path: '^(@[^/]+/[^/]+/dist(/|$)|[^/@][^/]*/dist(/|$))',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: ['(^|/)node_modules/', '(^|/)dist/'],
    },
    exclude: {
      path: [
        '(^|/)generated/',
        '(^|/)fixtures/',
        '(^|/)coverage/',
        '(^|/)\\.vitepress/(dist|cache)/',
      ],
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
}

// The caller's workspace owns its tsconfig, regardless of the process cwd.
export function createDependencyCruiserConfig(root) {
  return {
    ...config,
    options: {
      ...config.options,
      tsConfig: { fileName: resolve(root, 'tsconfig.json') },
    },
  }
}

export default createDependencyCruiserConfig(
  fileURLToPath(new URL('.', import.meta.url)),
)
