import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { exampleSourceBlock, openExampleSource } from './docs-example-source'
import { startStaticServer } from './static-server'

/*
 * The Select and Combobox guides read themed-first (#445): the ordinary
 * field, form, async, and multiple workflows use `@ghostvue/themes`, and
 * headless samples sit under "Advanced: headless composition". These checks
 * run on the built docs: page order and old anchors, keyboard selection and
 * submitted form values in the themed form examples (light and dark, phone
 * and desktop), axe with the lists closed and open, and the copied SFC.
 */
const modes = ['light', 'dark'] as const
const widths = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
] as const

interface Guide {
  slug: 'select' | 'combobox'
  lead: string
  form: string
  headless: string[]
  anchors: string[]
}

const guides: Guide[] = [
  {
    slug: 'select',
    lead: 'select/billing-preferences',
    form: 'select/alert-routing-form',
    headless: ['select/basic', 'select/form'],
    anchors: [
      'field-integration',
      'forms-and-reset',
      'one-value-per-select',
      'themed-use',
      'advanced-headless-composition',
      'basic-use',
      'headless-form',
    ],
  },
  {
    slug: 'combobox',
    lead: 'combobox/assignee-search',
    form: 'combobox/review-request-form',
    headless: ['combobox/basic', 'combobox/async'],
    anchors: [
      'async-search',
      'forms-and-reset',
      'field-integration',
      'multiple-selection',
      'themed-use',
      'advanced-headless-composition',
      'basic-use',
      'headless-async-search',
    ],
  },
]

async function openGuide(
  page: Page,
  url: string,
  slug: Guide['slug'],
  mode: (typeof modes)[number] = 'light',
) {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/${slug}.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
}

// Retry the first activation until hydration has attached the handlers.
async function openWith(control: Locator, key: string): Promise<void> {
  await control.focus()
  await expect(async () => {
    if ((await control.getAttribute('aria-expanded')) !== 'true') {
      await control.press(key)
    }
    await expect(control).toHaveAttribute('aria-expanded', 'true', {
      timeout: 500,
    })
  }).toPass()
}

async function expectNoAxeViolations(page: Page, id: string, label: string) {
  const results = await new AxeBuilder({ page })
    .include(`[data-example-id="${id}"]`)
    .analyze()
  expect(results.violations, label).toEqual([])
}

test.describe('docs Select and Combobox themed workflows', () => {
  for (const guide of guides) {
    test(`${guide.slug} leads themed and keeps headless samples under Advanced`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await openGuide(page, docs.url, guide.slug)
        const examples = page.locator('.vp-doc [data-example-id]')
        await expect(examples.first()).toHaveAttribute(
          'data-example-id',
          guide.lead,
        )
        await expect(
          page.locator(`.vp-doc [data-example-id="${guide.form}"]`),
        ).toHaveAttribute('data-example-layer', 'themed')

        for (const anchor of guide.anchors) {
          await expect(page.locator(`.vp-doc [id="${anchor}"]`)).toHaveCount(1)
        }

        // Every headless preview follows the Advanced heading, and every
        // themed preview precedes it.
        const layout = await page.evaluate(() => {
          const advanced = document.getElementById(
            'advanced-headless-composition',
          )
          return [
            ...document.querySelectorAll<HTMLElement>(
              '.vp-doc [data-example-id]',
            ),
          ].map((example) => ({
            id: example.dataset.exampleId,
            layer: example.dataset.exampleLayer,
            afterAdvanced: advanced
              ? Boolean(
                  advanced.compareDocumentPosition(example) &
                  Node.DOCUMENT_POSITION_FOLLOWING,
                )
              : false,
          }))
        })
        for (const example of layout) {
          expect(
            example.afterAdvanced,
            `${String(example.id)} (${String(example.layer)})`,
          ).toBe(example.layer === 'headless')
        }
        expect(
          layout
            .filter((example) => example.layer === 'headless')
            .map((example) => example.id),
        ).toEqual(guide.headless)
      } finally {
        await docs.close()
      }
    })
  }

  for (const mode of modes) {
    for (const viewport of widths) {
      test(`select form: keyboard selection, validation, submit, and reset (${mode}, ${viewport.name})`, async ({
        page,
      }) => {
        const id = 'select/alert-routing-form'
        const docs = await startStaticServer('apps/docs/.vitepress/dist')
        try {
          await page.setViewportSize(viewport)
          await openGuide(page, docs.url, 'select', mode)
          const frame = page.locator(`[data-example-id="${id}"]`)
          await frame.scrollIntoViewIfNeeded()
          const preview = frame.getByTestId('ghost-example-preview')
          const severity = preview.getByRole('combobox', {
            name: 'Minimum severity',
          })
          const owner = preview.getByRole('combobox', {
            name: /Escalation owner/,
          })
          const save = preview.getByRole('button', { name: 'Save routing' })
          const listbox = page.getByRole('listbox')

          await expectNoAxeViolations(page, id, `closed (${mode})`)

          // Saving with no owner fails native validation and focuses it.
          await expect(async () => {
            await save.click()
            await expect(owner).toHaveAttribute('aria-invalid', 'true', {
              timeout: 500,
            })
          }).toPass()
          await expect(owner).toBeFocused()
          await expect(preview.getByRole('alert')).toHaveText(
            'Choose who gets escalations.',
          )

          // Keyboard: open on the selected option, move, commit.
          await openWith(severity, 'ArrowDown')
          await expect(
            listbox.getByRole('option', { name: 'High and above' }),
          ).toBeFocused()
          await expectNoAxeViolations(page, id, `open (${mode})`)
          await page.keyboard.press('ArrowDown')
          await expect(
            listbox.getByRole('option', { name: 'Every alert' }),
          ).toBeFocused()
          await page.keyboard.press('Enter')
          await expect(listbox).toBeHidden()
          await expect(severity).toBeFocused()
          await expect(severity).toHaveText('Every alert')

          await openWith(owner, 'Enter')
          await page.keyboard.press('ArrowDown')
          await page.keyboard.press('Enter')
          await expect(owner).toHaveText('Payments on-call')
          await expect(owner).not.toHaveAttribute('aria-invalid', 'true')

          await save.click()
          await expect(preview.getByRole('status')).toHaveText(
            'Alert routing saved.',
          )
          await expect(preview.locator('.routing__entry dd code')).toHaveText([
            'all',
            'slack',
            'payments',
          ])

          // Layout stays inside the viewport at phone width.
          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
          )
          expect(overflow).toBe(false)

          await preview.getByRole('button', { name: 'Reset' }).click()
          await expect(severity).toHaveText('High and above')
          await expect(owner).toHaveText('Choose an owner')
          await expect(preview.locator('.routing__submitted')).toHaveCount(0)
        } finally {
          await docs.close()
        }
      })

      test(`combobox form: filtering, single and multiple keyboard selection, submit, and reset (${mode}, ${viewport.name})`, async ({
        page,
      }) => {
        const id = 'combobox/review-request-form'
        const docs = await startStaticServer('apps/docs/.vitepress/dist')
        try {
          await page.setViewportSize(viewport)
          await openGuide(page, docs.url, 'combobox', mode)
          const frame = page.locator(`[data-example-id="${id}"]`)
          await frame.scrollIntoViewIfNeeded()
          const preview = frame.getByTestId('ghost-example-preview')
          const reviewer = preview.getByRole('combobox', { name: /Reviewer/ })
          const labels = preview.getByRole('combobox', { name: 'Labels' })
          const submit = preview.getByRole('button', {
            name: 'Request review',
          })
          const list = page.locator('.review-list[data-state="open"]')
          const chips = preview.locator('.review__chips li')

          await expectNoAxeViolations(page, id, `closed (${mode})`)
          await expect(async () => {
            await submit.click()
            await expect(reviewer).toHaveAttribute('aria-invalid', 'true', {
              timeout: 500,
            })
          }).toPass()
          await expect(reviewer).toBeFocused()

          // Single value: filter, highlight with arrows, commit with Enter.
          await openWith(reviewer, 'ArrowDown')
          await reviewer.pressSequentially('zz')
          await expect(list.locator('[data-part="empty"]')).toHaveText(
            'No one matches that name.',
          )
          await reviewer.fill('')
          await reviewer.pressSequentially('jo')
          await expect(list.getByRole('option')).toHaveText(['Jonas Weber'])
          await page.keyboard.press('ArrowDown')
          await expect(reviewer).toHaveAttribute('aria-activedescendant', /.+/)
          await expectNoAxeViolations(page, id, `open (${mode})`)
          await page.keyboard.press('Enter')
          await expect(reviewer).toHaveValue('Jonas Weber')
          await expect(reviewer).toHaveAttribute('aria-expanded', 'false')
          await expect(reviewer).toBeFocused()

          // Multiple: Enter toggles and the list stays open.
          await openWith(labels, 'ArrowDown')
          await labels.pressSequentially('sec')
          await expect(list.getByRole('option')).toHaveText(['Security'])
          await page.keyboard.press('ArrowDown')
          await page.keyboard.press('Enter')
          await expect(labels).toHaveAttribute('aria-expanded', 'true')
          await expect(labels).toBeFocused()
          await expect(chips).toHaveText(['Bug', 'Security'])
          await page.keyboard.press('Escape')
          await expect(labels).toHaveAttribute('aria-expanded', 'false')

          await submit.click()
          await expect(preview.getByRole('status')).toHaveText(
            'Review requested from Jonas Weber.',
          )
          await expect(preview.locator('.review__entry dd')).toHaveText([
            'jonas-weber',
            'bug, security',
          ])

          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
          )
          expect(overflow).toBe(false)

          await preview.getByRole('button', { name: 'Reset' }).click()
          await expect(chips).toHaveText(['Bug'])
          await expect(reviewer).toHaveValue('')
          await expect(preview.locator('.review__submitted')).toHaveCount(0)
        } finally {
          await docs.close()
        }
      })
    }
  }

  for (const [slug, id, file] of [
    [
      'select',
      'select/alert-routing-form',
      'examples/select/alert-routing-form.vue',
    ],
    [
      'combobox',
      'combobox/review-request-form',
      'examples/combobox/review-request-form.vue',
    ],
  ] as const) {
    test(`${id} source disclosure and Copy deliver the themed SFC`, async ({
      context,
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
          origin: docs.url,
        })
        await page.goto(`${docs.url}/components/${slug}.html`)
        await openExampleSource(page, id)
        const source = exampleSourceBlock(page, id)
        await expect(source).toContainText("from '@ghostvue/themes'")
        await expect(source).toContainText('checkValidity()')
        await expect(source).toContainText('new FormData(form)')
        const copy = page
          .locator(`[data-example-id="${id}"]`)
          .getByRole('button', { name: /^Copy .+ source$/ })
        await copy.click()
        await expect(copy).toHaveAttribute('data-state', 'copied')
        const expected = readFileSync(file, 'utf8')
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
  }
})
