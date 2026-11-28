import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { exampleSourceBlock, openExampleSource } from './docs-example-source'
import { startStaticServer } from './static-server'

/*
 * The FileUpload guide leads with the themed asset submission form (#444).
 * These checks walk the documented journey on the built guide and in the
 * standalone playground host: a valid file, rejected and duplicate files with
 * a visible error linked to the trigger, recovery, and the FormData submit.
 */

const LEAD_ID = 'file-upload/asset-submission'

interface FileSpec {
  name: string
  mimeType: string
  size?: number
}

function payload({ name, mimeType, size = 4 }: FileSpec) {
  return { name, mimeType, buffer: Buffer.alloc(size, 'a') }
}

/**
 * Choose files through the real native chooser opened by the trigger. Static
 * docs pages are server-rendered, so a click before hydration opens nothing;
 * retry until the chooser appears rather than sleeping.
 */
async function chooseFiles(page: Page, trigger: Locator, files: FileSpec[]) {
  await expect(async () => {
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 1000 })
    await trigger.click()
    const chooser = await chooserPromise
    await chooser.setFiles(files.map(payload))
  }).toPass()
}

async function openGuide(page: Page, url: string, mode: 'light' | 'dark') {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/file-upload.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
}

/** Walks the journey the guide describes and returns at the empty submit. */
async function walkJourney(page: Page, lead: Locator) {
  const trigger = lead.locator('[data-part="trigger"]')
  const items = lead.getByRole('list', { name: 'Attached assets' })
  const error = lead.locator('[data-part="error"]')
  const result = lead.getByRole('status').filter({ hasText: /submitted/i })
  const submit = lead.getByRole('button', { name: 'Submit packet' })

  await expect(trigger).toHaveAccessibleName('Attachments Choose files')
  await expect(trigger).toHaveAccessibleDescription(
    'Up to 3 PDF, PNG, or SVG files, 5 MB each.',
  )
  await expect(items.getByRole('listitem')).toHaveCount(2)
  await expect(lead.getByText('1 of 3 slots left.')).toBeVisible()
  await expect(result).toHaveText('Not submitted yet.')
  await expect(error).toBeHidden()

  // A valid file joins the list; the wrong type and an oversize file do not.
  await chooseFiles(page, trigger, [
    { name: 'notes.txt', mimeType: 'text/plain' },
    { name: 'big.pdf', mimeType: 'application/pdf', size: 5_000_001 },
    { name: 'review.pdf', mimeType: 'application/pdf' },
  ])
  await expect(items.getByRole('listitem')).toHaveCount(3)
  await expect(items).toContainText('review.pdf')
  await expect(
    lead.getByText('All 3 slots are used. Remove a file to add another.'),
  ).toBeVisible()
  await expect(error).toBeVisible()
  await expect(error).toHaveAttribute('role', 'alert')
  await expect(error.getByRole('paragraph')).toHaveText([
    'notes.txt was not added: this file type is not accepted.',
    'big.pdf was not added: it is larger than 5 MB.',
  ])
  // The visible error is part of the trigger's description, not only shown.
  const errorId = await error.getAttribute('id')
  expect(errorId).toBeTruthy()
  expect(
    (await trigger.getAttribute('aria-describedby'))?.split(' '),
  ).toContain(errorId)
  await expect(trigger).toHaveAttribute('aria-invalid', 'true')
  await expect(trigger).toHaveAccessibleDescription(
    /5 MB each\. notes\.txt was not added: this file type is not accepted\. ?big\.pdf was not added/,
  )

  // A second file with an attached name is a duplicate, checked before capacity.
  await chooseFiles(page, trigger, [
    { name: 'brand-mark.svg', mimeType: 'image/svg+xml' },
  ])
  await expect(error).toHaveText(
    'brand-mark.svg was not added: a file with this name is already attached.',
  )
  await chooseFiles(page, trigger, [
    { name: 'extra.png', mimeType: 'image/png' },
  ])
  await expect(error).toHaveText(
    'extra.png was not added: the limit of 3 files has been reached.',
  )

  // Recovery: removing a file clears the error and frees the slot.
  await lead.getByRole('button', { name: 'Remove brand-mark.svg' }).click()
  await expect(error).toBeHidden()
  await expect(trigger).not.toHaveAttribute('aria-invalid', 'true')
  await chooseFiles(page, trigger, [
    { name: 'brand-mark.svg', mimeType: 'image/svg+xml', size: 12 },
  ])
  await expect(items.getByRole('listitem')).toHaveCount(3)
  await expect(error).toBeHidden()

  // Submit reports exactly what the form's FormData carries.
  await submit.click()
  await expect(result).toHaveText(
    'Submitted 3 files as “assets”: architecture-spec.pdf, review.pdf, brand-mark.svg.',
  )

  // An empty submit shows the Field error and returns focus to the trigger.
  for (const name of [
    'architecture-spec.pdf',
    'review.pdf',
    'brand-mark.svg',
  ]) {
    await lead.getByRole('button', { name: `Remove ${name}` }).click()
  }
  await expect(items).toHaveCount(0)
  await expect(result).toHaveText('Not submitted yet.')
  await submit.click()
  await expect(error).toHaveText('Attach at least one asset before submitting.')
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-invalid', 'true')
  await expect(result).toHaveText('Not submitted yet.')
}

test.describe('docs FileUpload guide', () => {
  test('leads with the themed asset form and keeps old anchors', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/file-upload.html#submit-assets`)
      await expect(
        page.getByRole('heading', { name: 'Submit release assets' }),
      ).toHaveAttribute('id', 'submit-assets')
      const lead = page.locator('.vp-doc [data-example-id]').first()
      await expect(lead).toHaveAttribute('data-example-id', LEAD_ID)
      await expect(lead).toHaveAttribute('data-example-layer', 'themed')

      // Deep links from before the reorder still land on a section.
      for (const anchor of [
        'basic-use',
        'button-only',
        'validation',
        'rejections',
        'duplicates',
        'dropped-folders',
        'ghostfield',
        'controlled-use',
        'forms',
        'messages',
        'dropzone',
        'document-drop-guard',
        'disabled',
        'themed-use',
        'accessibility',
        'styling-hooks',
        'advanced-headless-composition',
      ]) {
        await expect(page.locator(`.vp-doc [id="${anchor}"]`)).toHaveCount(1)
      }

      // Ordinary previews are themed; the one headless preview sits under the
      // Advanced section.
      const ids = await page
        .locator('.vp-doc [data-example-id]')
        .evaluateAll((elements) =>
          elements.map((element) => [
            element.getAttribute('data-example-id'),
            element.getAttribute('data-example-layer'),
          ]),
        )
      expect(ids).toEqual([
        [LEAD_ID, 'themed'],
        ['file-upload/themed', 'themed'],
        ['file-upload/basic', 'headless'],
      ])
      const order = await page.evaluate(() => {
        const advanced = document.getElementById(
          'advanced-headless-composition',
        )
        const example = document.querySelector(
          '[data-example-id="file-upload/basic"]',
        )
        return advanced && example
          ? advanced.compareDocumentPosition(example) &
              Node.DOCUMENT_POSITION_FOLLOWING
          : 0
      })
      expect(order).toBeTruthy()
    } finally {
      await docs.close()
    }
  })

  for (const { mode, width, height } of [
    { mode: 'light', width: 1280, height: 900 },
    { mode: 'dark', width: 390, height: 844 },
  ] as const) {
    test(`choose, reject, recover, and submit in ${mode} mode at ${String(width)}px`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.setViewportSize({ width, height })
        await openGuide(page, docs.url, mode)
        const lead = page.locator(`[data-example-id="${LEAD_ID}"]`)
        await lead.scrollIntoViewIfNeeded()
        // Scope to the live preview: the source disclosure repeats its text.
        await walkJourney(page, lead.getByTestId('ghost-example-preview'))

        // The error state passes axe and still fits the viewport.
        const axe = await new AxeBuilder({ page })
          .include(`[data-example-id="${LEAD_ID}"]`)
          .analyze()
        expect(axe.violations, `${LEAD_ID} (${mode})`).toEqual([])
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        )
        expect(overflow, `${String(width)}px overflow`).toBe(false)
      } finally {
        await docs.close()
      }
    })
  }

  test('the standalone playground host runs the same journey', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=${encodeURIComponent(LEAD_ID)}`,
      )
      const lead = page.getByTestId('ghost-example-preview')
      await expect(lead.locator('[data-part="trigger"]')).toBeVisible()
      await walkJourney(page, lead)
      const axe = await new AxeBuilder({ page }).analyze()
      expect(axe.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('the source disclosure and Copy deliver the themed SFC', async ({
    context,
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: docs.url,
      })
      await page.goto(`${docs.url}/components/file-upload.html`)
      await openExampleSource(page, LEAD_ID)
      const source = exampleSourceBlock(page, LEAD_ID)
      await expect(source).toContainText('@ghostvue/themes')
      await expect(source).toContainText('const rejectSameName')
      await expect(source).toContainText(".getAll('assets')")
      await expect(source).toContainText('<GhostFieldError')
      const copy = page
        .locator(`[data-example-id="${LEAD_ID}"]`)
        .getByRole('button', { name: 'Copy Release packet assets source' })
      await copy.click()
      await expect(copy).toHaveAttribute('data-state', 'copied')
      const expected = readFileSync(
        'examples/file-upload/asset-submission.vue',
        'utf8',
      )
      const clipboard = await page.evaluate(() =>
        navigator.clipboard.readText(),
      )
      expect(clipboard.replaceAll('\r\n', '\n').trim()).toBe(
        expected.replaceAll('\r\n', '\n').trim(),
      )
    } finally {
      await docs.close()
    }
  })
})
