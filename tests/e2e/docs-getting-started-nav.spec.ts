import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const navLabels = [
  'Docs',
  'Components',
  'Theming',
  'Examples',
  'Contribute',
] as const

/**
 * Section anchors other pages and readers link to, in reading order. The
 * themed path (install, theme, first component) comes before the headless
 * "bring your own styles" path (#451).
 */
const sectionAnchors = [
  'install',
  'add-a-theme',
  'your-first-themed-component',
  'choose-headless-or-themed',
  'bring-your-own-styles',
  'your-first-headless-component',
  'ssr',
  'tooling-nuxt-auto-imports-and-eslint',
  'try-it-from-a-checkout',
  'next-steps',
] as const

const layouts = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

test.describe('getting started and docs navigation', () => {
  test('getting-started page renders its title', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/getting-started.html`)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Getting started' }),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })

  test('homepage Get started CTA links to getting-started', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/index.html`)
      await expect(page.getByText('Pre-1.0 · on npm')).toBeVisible()
      await expect(
        page.getByText(
          'GhostVue is published on npm. Minor releases may include breaking API changes.',
        ),
      ).toBeAttached()
      const cta = page
        .locator('.ghost-landing__actions')
        .getByRole('link', { name: 'Get started' })
      await expect(cta).toHaveAttribute('href', '/getting-started')
      await cta.click()
      await expect(page).toHaveURL(/getting-started/)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Getting started' }),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })

  test('top nav shows the primary items at 1440px', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${docs.url}/getting-started.html`)
      const mainNav = page.getByRole('navigation', { name: 'Main Navigation' })
      for (const label of navLabels) {
        await expect(
          mainNav.getByRole('link', { name: label, exact: true }),
        ).toBeVisible()
      }
    } finally {
      await docs.close()
    }
  })

  test('mobile menu lists the primary items at 390px', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 390, height: 800 })
      await page.goto(`${docs.url}/getting-started.html`)
      await page.locator('.VPNavBarHamburger').click()
      const screen = page.locator('.VPNavScreen')
      await expect(screen).toBeVisible()
      for (const label of navLabels) {
        await expect(
          screen.getByRole('link', { name: label, exact: true }),
        ).toBeVisible()
      }
    } finally {
      await docs.close()
    }
  })

  test('first preview is the copyable themed field, before the headless path', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/getting-started.html`)
      const examples = page.locator('.vp-doc [data-example-id]')
      await expect(examples.first()).toHaveAttribute(
        'data-example-id',
        'field/themed',
      )
      await expect(examples.first()).toHaveAttribute(
        'data-example-layer',
        'themed',
      )
      await expect(examples).toHaveCount(2)
      await expect(examples.nth(1)).toHaveAttribute(
        'data-example-id',
        'field/basic',
      )

      // The themed preview sits under its own heading, after the install and
      // theme steps a reader copies first.
      const headings = await page
        .locator('.vp-doc h2, .vp-doc h3')
        .evaluateAll((nodes) => nodes.map((node) => node.id))
      const known = new Set<string>(sectionAnchors)
      expect(headings.filter((id) => known.has(id))).toEqual([
        ...sectionAnchors,
      ])
      const order = await page.evaluate(() => {
        const at = (selector: string) => {
          const node = document.querySelector(selector)
          if (!node) return -1
          return [...document.querySelectorAll('.vp-doc *')].indexOf(node)
        }
        return {
          heading: at('#your-first-themed-component'),
          themed: at('[data-example-id="field/themed"]'),
          headlessHeading: at('#bring-your-own-styles'),
          headless: at('[data-example-id="field/basic"]'),
        }
      })
      expect(order.heading).toBeGreaterThan(-1)
      expect(order.themed).toBeGreaterThan(order.heading)
      expect(order.headlessHeading).toBeGreaterThan(order.themed)
      expect(order.headless).toBeGreaterThan(order.headlessHeading)

      // The copied SFC is the themed import with no `.ghost-theme` wrapper,
      // which would host the default palette over the reader's flagship.
      const preview = examples.first()
      const source = preview.getByTestId('ghost-example-source')
      await expect(source).toContainText("from '@ghostvue/themes'")
      await expect(source).not.toContainText('class="ghost-theme"')
      await expect(preview.getByText('Headless', { exact: true })).toHaveCount(
        0,
      )
    } finally {
      await docs.close()
    }
  })

  test('section anchors resolve and the intro links to the headless path', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const anchor of sectionAnchors) {
        await page.goto(`${docs.url}/getting-started.html#${anchor}`)
        await expect(page.locator(`.vp-doc #${anchor}`)).toBeInViewport()
      }
      await page.goto(`${docs.url}/getting-started.html`)
      await page
        .locator('.vp-doc')
        .getByRole('link', { name: 'Bring your own styles' })
        .first()
        .click()
      await expect(page).toHaveURL(/#bring-your-own-styles$/)
      await expect(
        page.getByRole('heading', { level: 2, name: /Bring your own styles/ }),
      ).toBeInViewport()
    } finally {
      await docs.close()
    }
  })

  for (const layout of layouts) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`themed first preview renders and types at ${layout.name} in ${scheme}`, async ({
        page,
      }) => {
        const docs = await startStaticServer('apps/docs/.vitepress/dist')
        try {
          await page.setViewportSize(layout)
          await page.emulateMedia({ colorScheme: scheme })
          await page.goto(`${docs.url}/getting-started.html`)
          await expect(page.locator('html')).toHaveAttribute(
            'data-ghost-mode',
            scheme,
          )
          const preview = page.locator('[data-example-id="field/themed"]')
          const input = preview.getByRole('textbox', { name: 'Data region' })
          await input.scrollIntoViewIfNeeded()
          await expect(input).toBeVisible()
          await expect(input).toHaveAccessibleDescription(
            'Stored replicas stay in this region.',
          )
          await input.fill('eu-west')
          await expect(input).toHaveValue('eu-west')

          // Styled by the themed recipe, with tokens from the page's theme
          // host rather than a nested default-palette host.
          const styles = await input.evaluate((element) => {
            const read = (node: Element, name: string) =>
              getComputedStyle(node).getPropertyValue(name).trim()
            return {
              scoped: element.closest('.ghost-themed-scope') !== null,
              surface: read(element, '--ghost-surface-bg'),
              hostSurface: read(document.documentElement, '--ghost-surface-bg'),
              borderStyle: getComputedStyle(element).borderTopStyle,
            }
          })
          expect(styles.scoped).toBe(true)
          expect(styles.surface).not.toBe('')
          expect(styles.surface).toBe(styles.hostSurface)
          expect(styles.borderStyle).toBe('solid')

          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          )
          expect(overflow).toBeLessThanOrEqual(0)
        } finally {
          await docs.close()
        }
      })
    }
  }
})
