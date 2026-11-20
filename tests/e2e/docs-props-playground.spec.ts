import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  openExampleSource,
  openPreviewWidth,
  scriptClipboardWrites,
} from './docs-example-source'
import { startStaticServer } from './static-server'

/*
 * Typed props playgrounds (`demo-playgrounds.ts`) on the Button and Input
 * pages: controls change the live demo as real props without remounting it,
 * Reset returns to the SFC defaults while source and width state survive,
 * Copy props puts a template binding on the clipboard, and the panel stacks
 * on phones without overflow, typography leakage or focus/hover shifts.
 */
const modes = ['light', 'dark'] as const

async function openDocs(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<void> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(url)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
}

function panelOf(frame: Locator): Locator {
  return frame.getByRole('group', { name: /controls$/ })
}

/**
 * Pick an option once the page has hydrated: before that the server-rendered
 * select changes but nothing listens. Retry until the summary reflects it.
 */
async function choose(
  frame: Locator,
  label: string,
  value: string,
): Promise<void> {
  const select = panelOf(frame).getByLabel(label, { exact: true })
  await expect(async () => {
    await select.selectOption(value)
    await expect(frame.getByTestId('ghost-playground-summary')).toContainText(
      `${label.toLowerCase()}="${value}"`,
      { timeout: 500 },
    )
  }).toPass()
}

test.describe('docs typed props playground', () => {
  test('Button controls restyle the live demo in place and Reset keeps source and width', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await openDocs(page, `${docs.url}/components/button.html`)
      const id = 'button/themed'
      const frame = page.locator(`[data-example-id="${id}"]`)
      const demo = frame
        .getByTestId('ghost-example-preview')
        .getByRole('button', { name: 'Delete' })
      const panel = panelOf(frame)

      await expect(panel.getByRole('combobox')).toHaveCount(3)
      await expect(panel.getByLabel('Tone', { exact: true })).toHaveValue(
        'danger',
      )
      await expect(frame.getByTestId('ghost-playground-summary')).toHaveText(
        'Overrides: none, showing the original example',
      )

      await openExampleSource(page, id)
      await openPreviewWidth(page, id)
      await frame.getByRole('radio', { name: '320' }).check()

      // Tag the live node: a remount would replace it and lose the flag.
      await demo.evaluate((element) => {
        element.setAttribute('data-probe', 'kept')
      })
      await choose(frame, 'Tone', 'neutral')
      await choose(frame, 'Size', 'lg')
      await expect(demo).toHaveAttribute('data-tone', 'neutral')
      await expect(demo).toHaveAttribute('data-size', 'lg')
      await expect(demo).toHaveAttribute('data-probe', 'kept')

      const note = frame.getByTestId('ghost-example-source-note')
      await expect(note).toBeVisible()
      await expect(note).toContainText('Original source')
      await expect(
        frame.getByTestId('ghost-example-source').locator('pre'),
      ).toContainText("tone = 'danger'")

      await panel.getByRole('button', { name: 'Reset Themed settings' }).click()
      await expect(demo).toHaveAttribute('data-tone', 'danger')
      await expect(demo).not.toHaveAttribute('data-size')
      await expect(demo).toHaveAttribute('data-probe', 'kept')
      await expect(panel.getByLabel('Size', { exact: true })).toHaveValue('md')
      await expect(frame.getByTestId('ghost-example-source')).toBeVisible()
      await expect(frame.getByRole('radio', { name: '320' })).toBeChecked()
      await expect(frame.getByTestId('ghost-example-viewport')).toHaveAttribute(
        'data-constrained',
        '',
      )
    } finally {
      await docs.close()
    }
  })

  test('Input switches toggle real props from the keyboard and Copy props copies a binding', async ({
    browser,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    const context = await browser.newContext()
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const page = await context.newPage()
    try {
      await openDocs(page, `${docs.url}/components/input.html`)
      const frame = page.locator('[data-example-id="input/search"]')
      const panel = panelOf(frame)
      const field = frame
        .getByTestId('ghost-example-preview')
        .getByRole('searchbox', { name: 'Search reports' })
      const invalid = panel.getByRole('checkbox', { name: 'Invalid' })

      await expect(async () => {
        await invalid.focus()
        await page.keyboard.press('Space')
        await expect(field).toHaveAttribute('aria-invalid', 'true', {
          timeout: 500,
        })
      }).toPass()
      await expect(invalid).toBeChecked()

      await choose(frame, 'Size', 'sm')
      await panel
        .getByRole('button', { name: 'Copy Search props binding' })
        .click()
      await expect(panel.getByRole('status')).toHaveText('Props copied')
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        '<GhostInput size="sm" invalid />\n',
      )

      await panel.getByRole('checkbox', { name: 'Disabled' }).check()
      await expect(field).toBeDisabled()
    } finally {
      await context.close()
      await docs.close()
    }
  })

  test('Copy props reports a denied write and keeps the latest result when an older write settles late', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      // First write denied at once; second denied slowly; third succeeds first.
      await scriptClipboardWrites(page, [
        { delay: 0, ok: false },
        { delay: 400, ok: false },
        { delay: 0, ok: true },
      ])
      await openDocs(page, `${docs.url}/components/input.html`)
      const panel = panelOf(page.locator('[data-example-id="input/search"]'))
      const copy = panel.getByRole('button', {
        name: 'Copy Search props binding',
      })
      const status = panel.getByRole('status')

      await expect(async () => {
        await copy.focus()
        await page.keyboard.press('Enter')
        await expect(status).toContainText('Copy failed', { timeout: 500 })
      }).toPass()
      await expect(status).toContainText('<GhostInput')
      await expect(copy).toBeFocused()

      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      await expect(status).toHaveText('Props copied')
      // Outlast the slow denial: it must not replace the newer success.
      await page.waitForTimeout(600)
      await expect(status).toHaveText('Props copied')
      await expect(copy).toBeFocused()
    } finally {
      await docs.close()
    }
  })

  for (const mode of modes) {
    test(`panel passes axe and keeps prose styles out (${mode})`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await openDocs(page, `${docs.url}/components/button.html`, mode)
        const frame = page.locator('[data-example-id="button/themed"]')
        await choose(frame, 'Variant', 'ghost')

        const summary = frame.getByTestId('ghost-playground-summary')
        const styles = await summary.evaluate((element) => {
          const code = element.querySelector('code')
          const own = getComputedStyle(element)
          const inline = code ? getComputedStyle(code) : undefined
          return {
            margin: own.marginBlockStart,
            codeBackground: inline?.backgroundColor,
            codePadding: inline?.paddingInlineStart,
          }
        })
        expect(styles).toEqual({
          margin: '0px',
          codeBackground: 'rgba(0, 0, 0, 0)',
          codePadding: '0px',
        })

        const axe = await new AxeBuilder({ page })
          .include('[data-example-id="button/themed"]')
          .analyze()
        expect(axe.violations).toEqual([])
      } finally {
        await docs.close()
      }
    })
  }

  test('controls keep their geometry on hover and focus and rings are not clipped', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await openDocs(page, `${docs.url}/components/input.html`)
      const frame = page.locator('[data-example-id="input/search"]')
      const panel = panelOf(frame)
      // Compare sizes, not positions: focusing scrolls the page.
      const sizeOf = async () => {
        const box = await frame.boundingBox()
        return box && { width: box.width, height: box.height }
      }
      const frameBefore = await sizeOf()
      for (const control of [
        panel.getByLabel('Size', { exact: true }),
        panel.getByRole('checkbox', { name: 'Disabled' }),
        panel.getByRole('button', { name: 'Copy Search props binding' }),
        panel.getByRole('button', { name: 'Reset Search settings' }),
      ]) {
        await control.scrollIntoViewIfNeeded()
        const idle = await control.boundingBox()
        await control.hover()
        expect(await control.boundingBox()).toEqual(idle)
        await control.focus()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Tab')
        await expect(control).toBeFocused()
        expect(await control.boundingBox()).toEqual(idle)

        // The frame clips (`overflow: hidden`); the ring must fit inside it.
        const ringFits = await control.evaluate((element) => {
          const clip = element.closest('.ghost-example')
          if (!clip) return false
          const computed = getComputedStyle(element)
          const ring =
            computed.outlineStyle === 'none'
              ? 0
              : Number.parseFloat(computed.outlineWidth) +
                Number.parseFloat(computed.outlineOffset)
          const box = element.getBoundingClientRect()
          const bounds = clip.getBoundingClientRect()
          return (
            box.left - ring >= bounds.left && box.right + ring <= bounds.right
          )
        })
        expect(ringFits).toBe(true)
      }
      expect(await sizeOf()).toEqual(frameBefore)
    } finally {
      await docs.close()
    }
  })

  for (const width of [320, 390] as const) {
    test(`fields stack inside the frame at ${String(width)}px without page overflow`, async ({
      browser,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      const context = await browser.newContext({
        viewport: { width, height: 800 },
      })
      const page = await context.newPage()
      try {
        for (const [slug, id] of [
          ['button', 'button/themed'],
          ['input', 'input/search'],
        ] as const) {
          await openDocs(page, `${docs.url}/components/${slug}.html`)
          const frame = page.locator(`[data-example-id="${id}"]`)
          await frame.scrollIntoViewIfNeeded()
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth - window.innerWidth,
            ),
          ).toBeLessThanOrEqual(0)

          const frameBox = await frame.boundingBox()
          const fields = await frame.locator('.ghost-playground__field').all()
          let previousBottom = -Infinity
          for (const fieldLocator of fields) {
            const box = await fieldLocator.boundingBox()
            if (!box || !frameBox) throw new Error('unmeasured field')
            // One field per row, each inside the frame.
            expect(box.y).toBeGreaterThanOrEqual(previousBottom - 0.5)
            expect(box.x).toBeGreaterThanOrEqual(frameBox.x)
            expect(box.x + box.width).toBeLessThanOrEqual(
              frameBox.x + frameBox.width + 0.5,
            )
            previousBottom = box.y + box.height
          }
        }
      } finally {
        await context.close()
        await docs.close()
      }
    })
  }
})
