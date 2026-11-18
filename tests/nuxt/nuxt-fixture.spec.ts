import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { resolve } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

/**
 * SSR + hydration checks for the `@ghostvue/nuxt` fixture (apps/nuxt-fixture),
 * built by `pnpm test:nuxt` in two variants:
 *
 * - `headless`: module defaults. Components resolve to `@ghostvue/vue` and no
 *   GhostVue CSS reaches the page.
 * - `themed`: `components: 'themed'` plus `css: ['calm']`. Wrappers resolve to
 *   `@ghostvue/themes` and theme CSS is injected.
 *
 * The page imports nothing itself, so every Ghost* tag and the `useGhostId`
 * call exercise auto-imports end to end.
 */

const fixtureRoot = resolve(process.cwd(), 'apps/nuxt-fixture')

async function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const port = typeof address === 'object' && address ? address.port : 0
      probe.close(() => {
        resolvePort(port)
      })
    })
  })
}

/** Starts one built Nitro server owned by a single test. */
async function startFixture(
  variant: 'headless' | 'themed',
): Promise<{ url: string; close: () => Promise<void> }> {
  const entry = resolve(fixtureRoot, `.output/${variant}/server/index.mjs`)
  if (!existsSync(entry)) {
    throw new Error(
      `Missing ${entry}. Build the fixture first with pnpm test:nuxt (or pnpm --filter @ghostvue/nuxt-fixture fixture:build).`,
    )
  }
  const port = await freePort()
  const server: ChildProcess = spawn(process.execPath, [entry], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: 'ignore',
  })
  const url = `http://127.0.0.1:${String(port)}/`

  const deadline = Date.now() + 15_000
  for (;;) {
    try {
      const response = await fetch(url)
      if (response.ok) break
    } catch {
      // Not listening yet.
    }
    if (Date.now() > deadline || server.exitCode !== null) {
      server.kill()
      throw new Error(`Nuxt fixture (${variant}) did not start on ${url}`)
    }
    await new Promise((wait) => setTimeout(wait, 100))
  }

  return {
    url,
    close: () =>
      new Promise((done) => {
        if (server.exitCode !== null) {
          done()
          return
        }
        server.once('exit', () => {
          done()
        })
        server.kill()
      }),
  }
}

/** Console output that signals an SSR/client divergence or a runtime error. */
function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (
      message.type() === 'error' ||
      /hydrat|mismatch/i.test(text) ||
      (message.type() === 'warning' && text.includes('[Vue warn]'))
    ) {
      problems.push(`${message.type()}: ${text}`)
    }
  })
  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`)
  })
  return problems
}

/** Resolves once Vue has hydrated `#__nuxt`, so later clicks hit live handlers. */
async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt')
    return Boolean(root && '__vue_app__' in root)
  })
}

/** Text of every same-origin stylesheet rule on the page. */
async function stylesheetText(page: Page): Promise<string> {
  return page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText)
        } catch {
          return []
        }
      })
      .join('\n'),
  )
}

async function exerciseHydratedPage(page: Page): Promise<void> {
  const counter = page.getByTestId('counter')
  await expect(counter).toHaveText(/Clicked 0 times/)
  await counter.click()
  await expect(counter).toHaveText(/Clicked 1 times/)

  const airplane = page.getByRole('switch', { name: 'Airplane mode' })
  await expect(airplane).toHaveAttribute('aria-checked', 'false')
  await airplane.click()
  await expect(airplane).toHaveAttribute('aria-checked', 'true')

  const input = page.getByRole('textbox', { name: 'Display name' })
  await expect(input).toHaveAccessibleDescription('Visible to teammates.')

  const profile = page.getByRole('tab', { name: 'Profile' })
  await profile.focus()
  await page.keyboard.press('ArrowRight')
  const billing = page.getByRole('tab', { name: 'Billing' })
  await expect(billing).toBeFocused()
  await expect(billing).toHaveAttribute('aria-selected', 'true')

  // The SSR id and the hydrated id must agree, or Vue would also warn.
  const composableId = page.getByTestId('composable-id')
  const id = await composableId.getAttribute('id')
  expect(id).toBeTruthy()
  await expect(composableId).toContainText(id ?? '')
}

test.describe('@ghostvue/nuxt fixture', () => {
  test('headless default: SSR renders auto-imported components, hydrates cleanly, and injects no CSS', async ({
    page,
  }) => {
    const fixture = await startFixture('headless')
    try {
      const problems = collectProblems(page)

      // Server markup alone already contains the auto-imported components.
      const html = await (await fetch(fixture.url)).text()
      expect(html).toContain('data-fixture-variant="headless"')
      expect(html).toMatch(/<button[^>]*class="ghost-button"/)
      expect(html).toContain('role="switch"')
      expect(html).not.toContain('ghost-themed-scope')
      expect(html).not.toMatch(/<link[^>]*rel="stylesheet"/)

      await page.goto(fixture.url)
      await waitForHydration(page)
      await exerciseHydratedPage(page)

      const css = await stylesheetText(page)
      expect(css).not.toMatch(/--ghost-|\.ghost-|ghostvue-theme/)
      expect(problems).toEqual([])
    } finally {
      await fixture.close()
    }
  })

  test('themed opt-in: resolves themed wrappers, injects the chosen theme CSS, and hydrates cleanly', async ({
    page,
  }) => {
    const fixture = await startFixture('themed')
    try {
      const problems = collectProblems(page)

      const html = await (await fetch(fixture.url)).text()
      expect(html).toContain('data-fixture-variant="themed"')
      // Themed GhostButton wraps the primitive in its recipe scope.
      expect(html).toContain('ghost-themed-scope')
      expect(html).toMatch(/<link[^>]*rel="stylesheet"/)

      await page.goto(fixture.url)
      await waitForHydration(page)
      await exerciseHydratedPage(page)

      const css = await stylesheetText(page)
      expect(css).toContain('ghostvue-theme')
      expect(css).toContain('[data-ghost-theme="calm"]')
      expect(problems).toEqual([])
    } finally {
      await fixture.close()
    }
  })
})
