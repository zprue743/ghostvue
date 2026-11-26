import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

import AxeBuilder from '@axe-core/playwright'
import { chromium } from '@playwright/test'
import vuePlugin from '@vitejs/plugin-vue'
import { Linter } from 'eslint'
import vueEslintPlugin from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import { build as viteBuild, runnerImport } from 'vite'

const execFileAsync = promisify(execFile)

const VISUAL_NOTICE =
  'Visual artifacts are captured as review evidence only; unreviewed images have not passed human assessment.'

/** @type {Promise<Linter.Config[]> | undefined} */
let cachedEslintConfigPromise

/**
 * Loads `@ghostvue/eslint-plugin` directly from workspace source via Vite's
 * module runner so linting works without requiring a prior `pnpm build` and
 * without importing from `dist/`.
 *
 * @param {string} repositoryRoot
 * @returns {Promise<Linter.Config[]>}
 */
async function getGhostvueEslintConfig(repositoryRoot) {
  if (!cachedEslintConfigPromise) {
    cachedEslintConfigPromise = (async () => {
      const { module: ghostvuePluginModule } = await runnerImport(
        join(repositoryRoot, 'packages', 'eslint-plugin', 'src', 'index.ts'),
        {
          root: repositoryRoot,
          configFile: false,
          envFile: false,
          logLevel: 'silent',
        },
      )
      const ghostvuePlugin =
        /** @type {{ configs: { recommended: Linter.Config } }} */ (
          ghostvuePluginModule.default ?? ghostvuePluginModule
        )
      return [
        ...vueEslintPlugin.configs['flat/base'],
        {
          files: ['**/*.vue'],
          languageOptions: { parserOptions: { parser: tseslint.parser } },
        },
        ghostvuePlugin.configs.recommended,
      ]
    })()
  }
  return cachedEslintConfigPromise
}

/**
 * @param {readonly { status: import('./types.d.ts').CheckStatus }[]} items
 * @returns {import('./types.d.ts').DimensionCounts}
 */
export function summarizeCounts(items) {
  let passed = 0
  let failed = 0
  let skipped = 0
  let missing = 0
  for (const item of items) {
    if (item.status === 'passed') passed += 1
    else if (item.status === 'failed') failed += 1
    else if (item.status === 'skipped') skipped += 1
    else missing += 1
  }
  return { passed, failed, skipped, missing }
}

/**
 * Evaluates SFC structure, required primitives, and forbidden identifiers
 * (for example, `paginated-table` must compose `GhostTable` + `GhostPagination`
 * and must not use `GhostDataTable`).
 *
 * @param {import('./types.d.ts').EvalTaskDefinition} task
 * @param {string | null} sfcSource
 * @returns {import('./types.d.ts').TrialGradingResult['constraints']}
 */
export function evaluateTaskConstraints(task, sfcSource) {
  /** @type {import('./types.d.ts').CheckRecord[]} */
  const checks = []

  if (!sfcSource || sfcSource.trim() === '') {
    checks.push({
      id: 'sfc-present',
      category: 'constraints',
      description: 'Generated output includes a Vue SFC.',
      status: 'missing',
      detail: 'No Vue SFC was generated.',
    })
    return { status: 'missing', checks }
  }

  const hasScript = /<script\b[^>]*>/i.test(sfcSource)
  const hasTemplate = /<template\b[^>]*>/i.test(sfcSource)
  checks.push({
    id: 'sfc-structure',
    category: 'constraints',
    description: 'SFC declares both <script> and <template> blocks.',
    status: hasScript && hasTemplate ? 'passed' : 'failed',
    ...(hasScript && hasTemplate
      ? {}
      : { detail: 'Missing <script> or <template> block.' }),
  })

  for (const forbidden of task.forbiddenIdentifiers) {
    const pattern = new RegExp(`\\b${forbidden}\\b`)
    const found = pattern.test(sfcSource)
    checks.push({
      id: `forbid-${forbidden}`,
      category: 'constraints',
      description: `Does not use forbidden API ${forbidden}.`,
      status: found ? 'failed' : 'passed',
      ...(found
        ? {
            detail: `Found forbidden identifier "${forbidden}" in generated SFC.`,
          }
        : {}),
    })
  }

  for (const primitive of task.expectedPrimitives) {
    const pattern = new RegExp(`\\b${primitive}\\b`)
    const present = pattern.test(sfcSource)
    checks.push({
      id: `require-${primitive}`,
      category: 'constraints',
      description: `Uses expected GhostVue primitive ${primitive}.`,
      status: present ? 'passed' : 'missing',
      ...(present
        ? {}
        : {
            detail: `Expected primitive "${primitive}" was not found in generated SFC.`,
          }),
    })
  }

  const anyFailed = checks.some(
    (check) => check.status === 'failed' || check.status === 'missing',
  )
  return {
    status: anyFailed ? 'failed' : 'passed',
    checks,
  }
}

/**
 * Runs `@ghostvue/eslint-plugin` rules against the generated SFC.
 *
 * @param {string} repositoryRoot
 * @param {string} sfcSource
 * @returns {Promise<import('./types.d.ts').TrialGradingResult['eslint']>}
 */
export async function lintGeneratedSfc(repositoryRoot, sfcSource) {
  const config = await getGhostvueEslintConfig(repositoryRoot)
  const messages = new Linter().verify(sfcSource, config, 'TaskOutput.vue')
  const errors = messages.filter((msg) => msg.severity === 2)
  const warnings = messages.filter((msg) => msg.severity === 1)
  return {
    status: errors.length === 0 ? 'passed' : 'failed',
    errorCount: errors.length,
    warningCount: warnings.length,
    messages: messages.map(
      (msg) =>
        `L${String(msg.line)}:${String(msg.column)} [${msg.ruleId ?? 'fatal'}] ${msg.message}`,
    ),
  }
}

/**
 * Runs `vue-tsc --noEmit` in an isolated temp directory with workspace source
 * paths mapped for `@ghostvue/themes` and `@ghostvue/vue`.
 *
 * @param {string} repositoryRoot
 * @param {string} sfcSource
 * @returns {Promise<import('./types.d.ts').TrialGradingResult['typecheck']>}
 */
export async function typecheckGeneratedSfc(repositoryRoot, sfcSource) {
  const sandboxDir = await mkdtemp(join(tmpdir(), 'ghostvue-eval-tsc-'))
  try {
    await writeFile(join(sandboxDir, 'TaskOutput.vue'), sfcSource, 'utf8')
    await writeFile(
      join(sandboxDir, 'env.d.ts'),
      '/// <reference types="vite/client" />\n',
      'utf8',
    )
    await writeFile(
      join(sandboxDir, 'main.ts'),
      [
        "import { createApp } from 'vue'",
        "import TaskOutput from './TaskOutput.vue'",
        "createApp(TaskOutput).mount('#app')",
        '',
      ].join('\n'),
      'utf8',
    )

    const toPosix = (/** @type {string} */ p) => p.replaceAll('\\', '/')
    const tsconfig = {
      extends: toPosix(join(repositoryRoot, 'tsconfig.base.json')),
      compilerOptions: {
        noEmit: true,
        jsx: 'preserve',
        types: [],
        paths: {
          vue: [
            toPosix(join(repositoryRoot, 'node_modules/vue/dist/vue.d.mts')),
          ],
          '@ghostvue/themes': [
            toPosix(join(repositoryRoot, 'packages/themes/src/index.ts')),
          ],
          '@ghostvue/themes/*': [
            toPosix(join(repositoryRoot, 'packages/themes/src/*')),
          ],
          '@ghostvue/vue': [
            toPosix(join(repositoryRoot, 'packages/vue/src/index.ts')),
          ],
          '@ghostvue/vue/*': [
            toPosix(join(repositoryRoot, 'packages/vue/src/*')),
          ],
          '@ghostvue/core': [
            toPosix(join(repositoryRoot, 'packages/core/src/index.ts')),
          ],
          '@ghostvue/shared': [
            toPosix(join(repositoryRoot, 'packages/shared/src/index.ts')),
          ],
        },
      },
      include: [
        'env.d.ts',
        'main.ts',
        'TaskOutput.vue',
        toPosix(join(repositoryRoot, 'packages/vue/src/env.d.ts')),
        toPosix(join(repositoryRoot, 'packages/themes/src/**/*.d.ts')),
      ],
    }
    const tsconfigPath = join(sandboxDir, 'tsconfig.json')
    await writeFile(
      tsconfigPath,
      `${JSON.stringify(tsconfig, null, 2)}\n`,
      'utf8',
    )

    const vueTscBin = join(
      repositoryRoot,
      'node_modules',
      'vue-tsc',
      'bin',
      'vue-tsc.js',
    )
    try {
      await execFileAsync(
        process.execPath,
        [vueTscBin, '-p', tsconfigPath, '--noEmit'],
        {
          cwd: repositoryRoot,
          encoding: 'utf8',
          maxBuffer: 4 * 1024 * 1024,
        },
      )
      return {
        status: 'passed',
        errorCount: 0,
        diagnostics: [],
      }
    } catch (error) {
      const execErr =
        /** @type {{ stdout?: string, stderr?: string, message?: string }} */ (
          error
        )
      const combined = `${execErr.stdout ?? ''}\n${execErr.stderr ?? ''}`.trim()
      const lines = combined
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
      return {
        status: 'failed',
        errorCount: Math.max(
          1,
          lines.filter((line) => /error TS\d+/.test(line)).length,
        ),
        diagnostics: lines.slice(0, 40),
      }
    }
  } finally {
    await rm(sandboxDir, { recursive: true, force: true })
  }
}

/**
 * Bundles `TaskOutput.vue` with Vite + `@vitejs/plugin-vue` inside a GhostVue
 * default-theme host page so Playwright can mount and exercise it.
 *
 * @param {string} repositoryRoot
 * @param {string} sfcSource
 * @param {string} outDir
 * @returns {Promise<import('./types.d.ts').TrialGradingResult['build']>}
 */
export async function buildGeneratedSfc(repositoryRoot, sfcSource, outDir) {
  const stageDir = await mkdtemp(join(tmpdir(), 'ghostvue-eval-vite-'))
  try {
    await mkdir(outDir, { recursive: true })
    await writeFile(join(stageDir, 'TaskOutput.vue'), sfcSource, 'utf8')
    await writeFile(
      join(stageDir, 'index.html'),
      [
        '<!doctype html>',
        '<html lang="en">',
        '  <head>',
        '    <meta charset="UTF-8" />',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        '    <title>GhostVue Eval Host</title>',
        '  </head>',
        '  <body>',
        '    <div id="app"></div>',
        '    <script type="module" src="/main.ts"></script>',
        '  </body>',
        '</html>',
        '',
      ].join('\n'),
      'utf8',
    )
    await writeFile(
      join(stageDir, 'main.ts'),
      [
        "import { createApp, defineComponent, h } from 'vue'",
        "import '@ghostvue/themes/default.css'",
        "import TaskOutput from './TaskOutput.vue'",
        '',
        'const Host = defineComponent({',
        '  setup() {',
        '    return () =>',
        "      h('main', { class: 'ghost-theme', 'data-ghost-theme': 'default', style: 'padding: 2rem; min-height: 100vh;' }, [",
        "        h('h1', { style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;margin:0;' }, 'GhostVue Eval Host'),",
        '        h(TaskOutput),',
        '      ])',
        '  },',
        '})',
        '',
        "createApp(Host).mount('#app')",
        '',
      ].join('\n'),
      'utf8',
    )

    await viteBuild({
      root: stageDir,
      configFile: false,
      envFile: false,
      logLevel: 'silent',
      plugins: [vuePlugin()],
      resolve: {
        alias: [
          {
            find: /^vue$/,
            replacement: join(
              repositoryRoot,
              'node_modules/vue/dist/vue.runtime.esm-bundler.js',
            ),
          },
          {
            find: '@ghostvue/themes/default.css',
            replacement: join(
              repositoryRoot,
              'packages/themes/src/default.css',
            ),
          },
          {
            find: /^@ghostvue\/themes$/,
            replacement: join(repositoryRoot, 'packages/themes/src/index.ts'),
          },
          {
            find: /^@ghostvue\/vue$/,
            replacement: join(repositoryRoot, 'packages/vue/src/index.ts'),
          },
        ],
      },
      build: {
        outDir,
        emptyOutDir: true,
      },
    })

    return { status: 'passed' }
  } catch (error) {
    return {
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    }
  } finally {
    await rm(stageDir, { recursive: true, force: true })
  }
}

const STATIC_CONTENT_TYPES = /** @type {Record<string, string>} */ ({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
})

/**
 * @param {string} distRoot
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
async function startTempStaticServer(distRoot) {
  const root = resolve(distRoot)
  const server = createServer((req, res) => {
    const respond = async () => {
      const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
      const pathname = decodeURIComponent(requestUrl.pathname)
      const requestedPath = resolve(
        root,
        `.${pathname === '/' ? '/index.html' : pathname}`,
      )
      if (
        requestedPath !== root &&
        !requestedPath.startsWith(`${root}${sep}`)
      ) {
        res.writeHead(403).end('Forbidden')
        return
      }
      try {
        const body = await readFile(requestedPath)
        const contentType =
          STATIC_CONTENT_TYPES[extname(requestedPath)] ??
          'application/octet-stream'
        res.writeHead(200, { 'content-type': contentType }).end(body)
      } catch {
        res.writeHead(404).end('Not found')
      }
    }
    void respond()
  })

  await new Promise((resolveListening, rejectListening) => {
    server.once('error', rejectListening)
    server.listen(0, '127.0.0.1', resolveListening)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Failed to bind temporary static server port.')
  }

  return {
    url: `http://127.0.0.1:${String(address.port)}`,
    close: async () => {
      server.closeAllConnections()
      await new Promise((resolveClose, rejectClose) => {
        server.close((err) => {
          if (err) rejectClose(err)
          else resolveClose(undefined)
        })
      })
    },
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} state
 * @returns {Promise<import('./types.d.ts').AxeStateResult>}
 */
async function runAxeScan(page, state) {
  try {
    // Portaled overlays (e.g. GhostComboboxContent listbox) mount to <body>
    // outside landmarks by design; skip only axe's `region` best-practice rule.
    const results = await new AxeBuilder({ page })
      .disableRules(['region'])
      .analyze()
    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      description: v.description,
      helpUrl: v.helpUrl,
      nodeCount: v.nodes.length,
    }))
    return {
      state,
      status: violations.length === 0 ? 'passed' : 'failed',
      passCount: results.passes.length,
      incompleteCount: results.incomplete.length,
      violationCount: violations.length,
      violations,
    }
  } catch (error) {
    return {
      state,
      status: 'failed',
      passCount: 0,
      incompleteCount: 0,
      violationCount: 1,
      violations: [],
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} state
 * @param {string} artifactDir
 * @param {string} artifactRelativeBase
 * @returns {Promise<import('./types.d.ts').VisualEvidenceRecord>}
 */
async function captureVisualEvidence(
  page,
  state,
  artifactDir,
  artifactRelativeBase,
) {
  try {
    await mkdir(artifactDir, { recursive: true })
    const fileName = `${state}.png`
    const targetPath = join(artifactDir, fileName)
    await page.screenshot({
      path: targetPath,
      fullPage: true,
      animations: 'disabled',
    })
    return {
      state,
      status: 'captured-pending-human-review',
      artifactPath: `${artifactRelativeBase}/${fileName}`.replaceAll('\\', '/'),
      reviewed: false,
      humanAssessment: 'unreviewed',
    }
  } catch (error) {
    return {
      state,
      status: 'failed',
      artifactPath: null,
      reviewed: false,
      humanAssessment: 'unreviewed',
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Helper to record a single check attempt cleanly without aborting remaining checks.
 *
 * @param {import('./types.d.ts').EvalTaskCheckSpec} spec
 * @param {() => Promise<void>} fn
 * @returns {Promise<import('./types.d.ts').CheckRecord>}
 */
async function runCheck(spec, fn) {
  try {
    await fn()
    return {
      id: spec.id,
      category: spec.category,
      description: spec.description,
      status: 'passed',
    }
  } catch (error) {
    return {
      id: spec.id,
      category: spec.category,
      description: spec.description,
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * @param {boolean} condition
 * @param {string} message
 */
function assertTrue(condition, message) {
  if (!condition) throw new Error(message)
}

/**
 * Executes task-specific behavior, keyboard, axe, and visual evidence checks
 * inside Chromium.
 *
 * @param {{
 *   task: import('./types.d.ts').EvalTaskDefinition
 *   page: import('@playwright/test').Page
 *   url: string
 *   artifactDir: string
 *   artifactRelativeBase: string
 * }} options
 * @returns {Promise<{
 *   behaviorChecks: import('./types.d.ts').CheckRecord[]
 *   keyboardChecks: import('./types.d.ts').CheckRecord[]
 *   axeStates: import('./types.d.ts').AxeStateResult[]
 *   visualArtifacts: import('./types.d.ts').VisualEvidenceRecord[]
 * }>}
 */
async function executeTaskBrowserSuite({
  task,
  page,
  url,
  artifactDir,
  artifactRelativeBase,
}) {
  /** @type {Map<string, import('./types.d.ts').CheckRecord>} */
  const completedChecks = new Map()
  /** @type {Map<string, import('./types.d.ts').AxeStateResult>} */
  const completedAxe = new Map()
  /** @type {Map<string, import('./types.d.ts').VisualEvidenceRecord>} */
  const completedVisual = new Map()

  /** @param {string} id */
  const specOf = (id) => {
    const found = task.checks.find((check) => check.id === id)
    if (!found) {
      throw new Error(`Missing check spec ${id} on task ${task.id}`)
    }
    return found
  }

  /** @param {string} state */
  const recordAxe = async (state) => {
    completedAxe.set(state, await runAxeScan(page, state))
  }
  /** @param {string} state */
  const recordVisual = async (state) => {
    completedVisual.set(
      state,
      await captureVisualEvidence(
        page,
        state,
        artifactDir,
        artifactRelativeBase,
      ),
    )
  }

  await page.goto(url, { waitUntil: 'networkidle' })

  if (task.id === 'login-form') {
    await recordAxe('initial')
    await recordVisual('initial')

    completedChecks.set(
      'login-empty-submit-invalid',
      await runCheck(specOf('login-empty-submit-invalid'), async () => {
        await page.getByRole('button', { name: /sign in/i }).click()
        const email = page.getByLabel(/email/i)
        assertTrue(
          (await email.getAttribute('aria-invalid')) === 'true',
          'Email input did not receive aria-invalid="true" on empty submit',
        )
        const alerts = page.locator('[role="alert"]')
        assertTrue(
          (await alerts.count()) > 0,
          'Expected at least one role="alert" validation error',
        )
      }),
    )
    await recordAxe('validation-error')
    await recordVisual('validation-error')

    await page.goto(url, { waitUntil: 'networkidle' })
    completedChecks.set(
      'login-keyboard-tab-and-space',
      await runCheck(specOf('login-keyboard-tab-and-space'), async () => {
        const email = page.getByLabel(/email/i)
        const password = page.getByLabel(/password/i)
        const remember = page.getByRole('checkbox', { name: /remember me/i })
        const submit = page.getByRole('button', { name: /sign in/i })

        await email.focus()
        assertTrue(
          await email.evaluate((el) => el === el.ownerDocument.activeElement),
          'Email input did not receive initial focus',
        )
        await page.keyboard.type('ada@example.com')
        await page.keyboard.press('Tab')
        assertTrue(
          await password.evaluate(
            (el) => el === el.ownerDocument.activeElement,
          ),
          'Tab from Email did not focus Password',
        )
        await page.keyboard.type('correct-horse')
        await page.keyboard.press('Tab')
        assertTrue(
          await remember.evaluate(
            (el) => el === el.ownerDocument.activeElement,
          ),
          'Tab from Password did not focus Remember me checkbox',
        )
        await page.keyboard.press('Space')
        assertTrue(
          await remember.isChecked(),
          'Space did not toggle Remember me checkbox',
        )
        await page.keyboard.press('Tab')
        assertTrue(
          await submit.evaluate((el) => el === el.ownerDocument.activeElement),
          'Tab from Remember me did not focus Sign in button',
        )
        await page.keyboard.press('Enter')
        const statusText = await page.getByRole('status').textContent()
        assertTrue(
          Boolean(statusText && statusText.includes('ada@example.com')),
          `Expected status containing "ada@example.com", got ${JSON.stringify(statusText)}`,
        )
      }),
    )
    completedChecks.set(
      'login-valid-submit-status',
      await runCheck(specOf('login-valid-submit-status'), async () => {
        const statusText = await page.getByRole('status').textContent()
        assertTrue(
          Boolean(
            statusText && /signed in as ada@example\.com/i.test(statusText),
          ),
          `Expected "Signed in as ada@example.com", got ${JSON.stringify(statusText)}`,
        )
      }),
    )
    await recordAxe('submitted')
  } else if (task.id === 'settings-dialog') {
    await recordAxe('closed')
    await recordVisual('closed')

    const trigger = page.getByRole('button', { name: /open settings/i })
    completedChecks.set(
      'dialog-open-and-role',
      await runCheck(specOf('dialog-open-and-role'), async () => {
        await trigger.click()
        const dialog = page.getByRole('dialog')
        await dialog.waitFor({ state: 'visible', timeout: 5000 })
        assertTrue(
          (await dialog.getAttribute('aria-modal')) === 'true',
          'Dialog missing aria-modal="true"',
        )
      }),
    )
    await recordAxe('open')
    await recordVisual('open')

    completedChecks.set(
      'dialog-keyboard-trap-escape-switch',
      await runCheck(specOf('dialog-keyboard-trap-escape-switch'), async () => {
        const dialog = page.getByRole('dialog')
        const nameInput = dialog.getByLabel(/display name/i)
        const notifSwitch = dialog.getByRole('switch', {
          name: /email notifications/i,
        })

        const beforeChecked = await notifSwitch.getAttribute('aria-checked')
        await notifSwitch.focus()
        await page.keyboard.press('Space')
        const afterChecked = await notifSwitch.getAttribute('aria-checked')
        assertTrue(
          beforeChecked !== afterChecked,
          'Space did not toggle switch aria-checked inside dialog',
        )

        // Tab forward several times and verify focus stays inside the modal dialog.
        for (let i = 0; i < 6; i++) {
          await page.keyboard.press('Tab')
          const inside = await dialog.evaluate((el) =>
            el.contains(el.ownerDocument.activeElement),
          )
          assertTrue(inside, 'Tab escaped the modal dialog focus trap')
        }

        await nameInput.fill('Unsaved Name')
        await page.keyboard.press('Escape')
        await dialog.waitFor({ state: 'detached', timeout: 5000 })
        assertTrue(
          await trigger.evaluate((el) => el === el.ownerDocument.activeElement),
          'Escape did not restore focus to Open settings trigger',
        )
        const bodyText = (await page.locator('main').textContent()) ?? ''
        assertTrue(
          !bodyText.includes('Unsaved Name'),
          'Escape did not discard unsaved draft Display name',
        )
      }),
    )

    completedChecks.set(
      'dialog-save-updates-summary',
      await runCheck(specOf('dialog-save-updates-summary'), async () => {
        await trigger.click()
        const dialog = page.getByRole('dialog')
        await dialog.waitFor({ state: 'visible', timeout: 5000 })
        await dialog.getByLabel(/display name/i).fill('Grace Hopper')
        await dialog.getByRole('button', { name: /save settings/i }).click()
        await dialog.waitFor({ state: 'detached', timeout: 5000 })
        const bodyText = (await page.locator('main').textContent()) ?? ''
        assertTrue(
          bodyText.includes('Grace Hopper'),
          'Saving dialog did not update page summary with "Grace Hopper"',
        )
      }),
    )
  } else if (task.id === 'async-combobox-search') {
    await recordAxe('closed')
    await recordVisual('closed')

    const input = page.getByRole('combobox', { name: /search assignee/i })
    completedChecks.set(
      'combobox-async-race-and-empty',
      await runCheck(specOf('combobox-async-race-and-empty'), async () => {
        await input.click()
        await input.fill('a')
        await page.waitForTimeout(10)
        await input.fill('am')
        // Wait long enough for both the slower "a" response (~180ms) and faster "am" (~30ms).
        await page.waitForTimeout(320)
        const options = page.getByRole('option')
        const optionCount = await options.count()
        const optionTexts = []
        for (let i = 0; i < optionCount; i++) {
          optionTexts.push((await options.nth(i).textContent()) ?? '')
        }
        assertTrue(
          optionTexts.some((t) => t.includes('Amara Okafor')),
          `Expected "Amara Okafor" in combobox results, got ${JSON.stringify(optionTexts)}`,
        )
        assertTrue(
          !optionTexts.some((t) => t.includes('Tomas Novak')),
          `Stale "a" response overwrote "am" results: ${JSON.stringify(optionTexts)}`,
        )
      }),
    )
    await recordAxe('results-open')
    await recordVisual('results-open')

    completedChecks.set(
      'combobox-keyboard-arrows-enter-escape',
      await runCheck(
        specOf('combobox-keyboard-arrows-enter-escape'),
        async () => {
          await input.focus()
          await page.keyboard.press('ArrowDown')
          const activeId = await input.getAttribute('aria-activedescendant')
          assertTrue(
            Boolean(activeId),
            'ArrowDown did not set aria-activedescendant on combobox input',
          )
          await page.keyboard.press('Enter')
          const statusText =
            (await page.getByRole('status').textContent()) ?? ''
          assertTrue(
            statusText.includes('Amara Okafor'),
            `Expected status to include selected "Amara Okafor", got ${JSON.stringify(statusText)}`,
          )

          await input.fill('zzz')
          await page.waitForTimeout(260)
          await recordAxe('empty-open')

          await input.focus()
          await page.keyboard.press('Escape')
          assertTrue(
            (await input.getAttribute('aria-expanded')) === 'false',
            'Escape did not collapse combobox aria-expanded to false',
          )
          assertTrue(
            await input.evaluate((el) => el === el.ownerDocument.activeElement),
            'Escape did not keep focus on combobox input',
          )
        },
      ),
    )
    if (!completedAxe.has('empty-open')) {
      await recordAxe('empty-open')
    }
  } else if (task.id === 'paginated-table') {
    await recordAxe('page-1')
    await recordVisual('page-1')

    const table = page.getByRole('table')
    const nav = page.getByRole('navigation')
    completedChecks.set(
      'table-semantics-and-page-slice',
      await runCheck(specOf('table-semantics-and-page-slice'), async () => {
        await table.waitFor({ state: 'visible', timeout: 5000 })
        assertTrue(
          (await table.locator('caption').count()) > 0,
          'Table missing <caption> element',
        )
        assertTrue(
          (await table.locator('tbody tr').count()) === 5,
          `Expected 5 rows on page 1, found ${String(await table.locator('tbody tr').count())}`,
        )
        const pageOneCurrent = nav.locator('button[aria-current="page"]')
        assertTrue(
          ((await pageOneCurrent.textContent()) ?? '').trim() === '1',
          'Initial aria-current="page" is not 1',
        )
      }),
    )

    completedChecks.set(
      'pagination-keyboard-navigation-and-boundary',
      await runCheck(
        specOf('pagination-keyboard-navigation-and-boundary'),
        async () => {
          const nextButton = nav.getByRole('button', { name: /next/i })
          await nextButton.focus()
          await page.keyboard.press('Enter')
          assertTrue(
            (
              (await nav
                .locator('button[aria-current="page"]')
                .textContent()) ?? ''
            ).trim() === '2',
            'Pressing Enter on Next did not advance to page 2',
          )
          assertTrue(
            await nextButton.evaluate(
              (el) => el === el.ownerDocument.activeElement,
            ),
            'Focus left Next button after activating page 2',
          )
          const page2Body = (await table.locator('tbody').textContent()) ?? ''
          assertTrue(
            page2Body.includes('Row 06'),
            'Page 2 did not render Row 06',
          )
          await recordAxe('page-2')
          await recordVisual('page-2')

          await page.keyboard.press('Enter')
          assertTrue(
            (
              (await nav
                .locator('button[aria-current="page"]')
                .textContent()) ?? ''
            ).trim() === '3',
            'Second Enter did not advance to page 3',
          )
          const isDisabled =
            (await nextButton.isDisabled()) ||
            (await nextButton.getAttribute('aria-disabled')) === 'true'
          assertTrue(isDisabled, 'Next button was not disabled on last page 3')
        },
      ),
    )
    if (!completedAxe.has('page-2')) {
      await recordAxe('page-2')
    }
    if (!completedVisual.has('page-2')) {
      await recordVisual('page-2')
    }
  } else if (task.id === 'validation-error-form') {
    await recordAxe('initial')
    await recordVisual('initial')

    const workspaceInput = page.getByLabel(/workspace name/i)
    const emailInput = page.getByLabel(/contact email/i)
    const submitButton = page.getByRole('button', { name: /create workspace/i })

    completedChecks.set(
      'validation-keyboard-focus-first-invalid',
      await runCheck(
        specOf('validation-keyboard-focus-first-invalid'),
        async () => {
          await submitButton.focus()
          await page.keyboard.press('Enter')
          await page.waitForTimeout(50)
          assertTrue(
            (await workspaceInput.getAttribute('aria-invalid')) === 'true',
            'Workspace name input did not receive aria-invalid="true"',
          )
          assertTrue(
            await workspaceInput.evaluate(
              (el) => el === el.ownerDocument.activeElement,
            ),
            'Invalid keyboard submit did not move focus to first invalid field (Workspace name)',
          )
        },
      ),
    )
    await recordAxe('error-state')
    await recordVisual('error-state')

    completedChecks.set(
      'validation-alert-summary-and-field-errors',
      await runCheck(
        specOf('validation-alert-summary-and-field-errors'),
        async () => {
          const alerts = page.locator('[role="alert"]')
          assertTrue(
            (await alerts.count()) >= 2,
            'Expected summary alert plus field error alerts on invalid submit',
          )
          await workspaceInput.fill('Acme Studio')
          await emailInput.fill('ops@acme.example')
          await submitButton.click()
          assertTrue(
            (await workspaceInput.getAttribute('aria-invalid')) !== 'true',
            'Workspace name kept aria-invalid="true" after valid submit',
          )
          const statusText =
            (await page.getByRole('status').textContent()) ?? ''
          assertTrue(
            statusText.includes('Acme Studio'),
            `Expected creation confirmation for "Acme Studio", got ${JSON.stringify(statusText)}`,
          )
        },
      ),
    )
    await recordAxe('submitted')
  }

  const behaviorChecks = task.checks
    .filter((spec) => spec.category === 'behavior')
    .map(
      (spec) =>
        completedChecks.get(spec.id) ?? {
          id: spec.id,
          category: spec.category,
          description: spec.description,
          status: /** @type {const} */ ('missing'),
          detail: 'Check did not execute.',
        },
    )

  const keyboardChecks = task.checks
    .filter((spec) => spec.category === 'keyboard')
    .map(
      (spec) =>
        completedChecks.get(spec.id) ?? {
          id: spec.id,
          category: spec.category,
          description: spec.description,
          status: /** @type {const} */ ('missing'),
          detail: 'Check did not execute.',
        },
    )

  const axeStates = task.axeStates.map(
    (state) =>
      completedAxe.get(state) ?? {
        state,
        status: /** @type {const} */ ('skipped'),
        passCount: 0,
        incompleteCount: 0,
        violationCount: 0,
        violations: [],
        detail: 'State was not reached during browser grading.',
      },
  )

  const visualArtifacts = task.visualStates.map(
    (state) =>
      completedVisual.get(state) ?? {
        state,
        status: /** @type {const} */ ('skipped'),
        artifactPath: null,
        reviewed: /** @type {const} */ (false),
        humanAssessment: /** @type {const} */ ('unreviewed'),
        detail: 'State was not reached for visual capture.',
      },
  )

  return { behaviorChecks, keyboardChecks, axeStates, visualArtifacts }
}

/**
 * Builds skipped behavior/keyboard/axe/visual results when browser grading is
 * disabled or blocked by an earlier build/SFC failure.
 *
 * @param {import('./types.d.ts').EvalTaskDefinition} task
 * @param {string} reason
 */
function buildSkippedBrowserResults(task, reason) {
  const behaviorChecks = task.checks
    .filter((spec) => spec.category === 'behavior')
    .map((spec) => ({
      id: spec.id,
      category: spec.category,
      description: spec.description,
      status: /** @type {const} */ ('skipped'),
      detail: reason,
    }))
  const keyboardChecks = task.checks
    .filter((spec) => spec.category === 'keyboard')
    .map((spec) => ({
      id: spec.id,
      category: spec.category,
      description: spec.description,
      status: /** @type {const} */ ('skipped'),
      detail: reason,
    }))
  const axeStates = task.axeStates.map((state) => ({
    state,
    status: /** @type {const} */ ('skipped'),
    passCount: 0,
    incompleteCount: 0,
    violationCount: 0,
    violations: [],
    detail: reason,
  }))
  const visualArtifacts = task.visualStates.map((state) => ({
    state,
    status: /** @type {const} */ ('skipped'),
    artifactPath: null,
    reviewed: /** @type {const} */ (false),
    humanAssessment: /** @type {const} */ ('unreviewed'),
    detail: reason,
  }))
  return { behaviorChecks, keyboardChecks, axeStates, visualArtifacts }
}

/**
 * Grades one `(task, condition)` output across separate dimensions:
 * constraints, ESLint (`@ghostvue/eslint-plugin`), `vue-tsc` typecheck, Vite
 * build, Playwright behavior, Playwright keyboard, per-state axe, and visual
 * screenshot capture (never collapsing them into one score).
 *
 * @param {import('./grader.d.ts').GradeTrialOptions} options
 * @returns {Promise<import('./types.d.ts').TrialGradingResult>}
 */
export async function gradeTrialOutput(options) {
  const {
    repositoryRoot,
    task,
    sfcSource,
    artifactDir,
    artifactRelativeBase,
    skipTypecheck = false,
    skipBrowser = false,
    browser: externalBrowser,
  } = options

  const constraints = evaluateTaskConstraints(task, sfcSource)

  if (!sfcSource || sfcSource.trim() === '') {
    const skipped = buildSkippedBrowserResults(
      task,
      'Skipped because no Vue SFC output was produced.',
    )
    return {
      constraints,
      eslint: {
        status: 'missing',
        errorCount: 0,
        warningCount: 0,
        messages: ['No Vue SFC output to lint.'],
      },
      typecheck: {
        status: 'missing',
        errorCount: 0,
        diagnostics: ['No Vue SFC output to typecheck.'],
      },
      build: {
        status: 'skipped',
        detail: 'Skipped because no Vue SFC output was produced.',
      },
      behavior: {
        counts: summarizeCounts(skipped.behaviorChecks),
        checks: skipped.behaviorChecks,
      },
      keyboard: {
        counts: summarizeCounts(skipped.keyboardChecks),
        checks: skipped.keyboardChecks,
      },
      axe: {
        counts: summarizeCounts(skipped.axeStates),
        states: skipped.axeStates,
      },
      visual: {
        capturedCount: 0,
        skippedCount: skipped.visualArtifacts.length,
        failedCount: 0,
        artifacts: skipped.visualArtifacts,
        notice: VISUAL_NOTICE,
      },
    }
  }

  const eslint = await lintGeneratedSfc(repositoryRoot, sfcSource)
  const typecheck = skipTypecheck
    ? {
        status: /** @type {const} */ ('skipped'),
        errorCount: 0,
        diagnostics: ['Typecheck skipped via --skip-typecheck.'],
      }
    : await typecheckGeneratedSfc(repositoryRoot, sfcSource)

  const distDir = await mkdtemp(join(tmpdir(), 'ghostvue-eval-dist-'))
  try {
    const buildResult = await buildGeneratedSfc(
      repositoryRoot,
      sfcSource,
      distDir,
    )
    const forbidFailure = constraints.checks.find(
      (check) => check.id.startsWith('forbid-') && check.status === 'failed',
    )

    if (buildResult.status !== 'passed') {
      const skipped = buildSkippedBrowserResults(
        task,
        `Skipped because Vite build failed: ${buildResult.detail ?? 'unknown error'}`,
      )
      return {
        constraints,
        eslint,
        typecheck,
        build: buildResult,
        behavior: {
          counts: summarizeCounts(skipped.behaviorChecks),
          checks: skipped.behaviorChecks,
        },
        keyboard: {
          counts: summarizeCounts(skipped.keyboardChecks),
          checks: skipped.keyboardChecks,
        },
        axe: {
          counts: summarizeCounts(skipped.axeStates),
          states: skipped.axeStates,
        },
        visual: {
          capturedCount: 0,
          skippedCount: skipped.visualArtifacts.length,
          failedCount: 0,
          artifacts: skipped.visualArtifacts,
          notice: VISUAL_NOTICE,
        },
      }
    }

    if (forbidFailure) {
      const skipped = buildSkippedBrowserResults(
        task,
        `Skipped because forbidden API constraint failed: ${forbidFailure.detail ?? forbidFailure.id}`,
      )
      return {
        constraints,
        eslint,
        typecheck,
        build: buildResult,
        behavior: {
          counts: summarizeCounts(skipped.behaviorChecks),
          checks: skipped.behaviorChecks,
        },
        keyboard: {
          counts: summarizeCounts(skipped.keyboardChecks),
          checks: skipped.keyboardChecks,
        },
        axe: {
          counts: summarizeCounts(skipped.axeStates),
          states: skipped.axeStates,
        },
        visual: {
          capturedCount: 0,
          skippedCount: skipped.visualArtifacts.length,
          failedCount: 0,
          artifacts: skipped.visualArtifacts,
          notice: VISUAL_NOTICE,
        },
      }
    }

    if (skipBrowser) {
      const skipped = buildSkippedBrowserResults(
        task,
        'Skipped because --skip-browser was requested.',
      )
      return {
        constraints,
        eslint,
        typecheck,
        build: buildResult,
        behavior: {
          counts: summarizeCounts(skipped.behaviorChecks),
          checks: skipped.behaviorChecks,
        },
        keyboard: {
          counts: summarizeCounts(skipped.keyboardChecks),
          checks: skipped.keyboardChecks,
        },
        axe: {
          counts: summarizeCounts(skipped.axeStates),
          states: skipped.axeStates,
        },
        visual: {
          capturedCount: 0,
          skippedCount: skipped.visualArtifacts.length,
          failedCount: 0,
          artifacts: skipped.visualArtifacts,
          notice: VISUAL_NOTICE,
        },
      }
    }

    const server = await startTempStaticServer(distDir)
    let ownedBrowser =
      /** @type {import('@playwright/test').Browser | undefined} */ (undefined)
    try {
      const browser =
        externalBrowser ?? (ownedBrowser = await chromium.launch())
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      })
      const page = await context.newPage()
      try {
        const browserResult = await executeTaskBrowserSuite({
          task,
          page,
          url: server.url,
          artifactDir,
          artifactRelativeBase,
        })
        const capturedCount = browserResult.visualArtifacts.filter(
          (a) => a.status === 'captured-pending-human-review',
        ).length
        const skippedCount = browserResult.visualArtifacts.filter(
          (a) => a.status === 'skipped',
        ).length
        const failedCount = browserResult.visualArtifacts.filter(
          (a) => a.status === 'failed',
        ).length
        return {
          constraints,
          eslint,
          typecheck,
          build: buildResult,
          behavior: {
            counts: summarizeCounts(browserResult.behaviorChecks),
            checks: browserResult.behaviorChecks,
          },
          keyboard: {
            counts: summarizeCounts(browserResult.keyboardChecks),
            checks: browserResult.keyboardChecks,
          },
          axe: {
            counts: summarizeCounts(browserResult.axeStates),
            states: browserResult.axeStates,
          },
          visual: {
            capturedCount,
            skippedCount,
            failedCount,
            artifacts: browserResult.visualArtifacts,
            notice: VISUAL_NOTICE,
          },
        }
      } finally {
        await context.close()
      }
    } finally {
      if (ownedBrowser) {
        await ownedBrowser.close()
      }
      await server.close()
    }
  } finally {
    await rm(distDir, { recursive: true, force: true })
  }
}
