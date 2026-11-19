import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { Locator, Page } from '@playwright/test'

import { axeScan, expectNoAxeViolations } from '../support/axe'
import { expect, playgroundTest as test } from '../support/playground'

interface FileSpec {
  name: string
  mimeType: string
  size?: number
}

function payload({ name, mimeType, size = 4 }: FileSpec) {
  return { name, mimeType, buffer: Buffer.alloc(size, 'a') }
}

async function openExample(page: Page, playgroundUrl: string, id: string) {
  await page.goto(`${playgroundUrl}/examples.html?id=${encodeURIComponent(id)}`)
  const trigger = page.locator('[data-part="trigger"]').first()
  await expect(trigger).toBeVisible()
  return trigger
}

/** Chooses files through the real native chooser opened by `activate`. */
async function chooseFiles(
  page: Page,
  activate: () => Promise<void>,
  files: FileSpec[],
) {
  const chooserPromise = page.waitForEvent('filechooser')
  await activate()
  const chooser = await chooserPromise
  await chooser.setFiles(files.map(payload))
  return chooser
}

/**
 * Dispatches a synthetic drag sequence with a constructed DataTransfer
 * holding real File objects. Returns whether each event was cancelled.
 */
async function dispatchFileDrag(
  target: Locator,
  type: 'dragenter' | 'dragover' | 'dragleave' | 'drop',
  options: { names?: string[]; relatedTarget?: string | null } = {},
) {
  return target.evaluate(
    (element, { type, names, relatedTarget }) => {
      const transfer = new DataTransfer()
      for (const name of names) {
        transfer.items.add(new File(['abc'], name, { type: 'text/plain' }))
      }
      if (names.length === 0) {
        // Drag sessions expose "Files" in types even before the drop.
        transfer.items.add(new File([''], 'placeholder.txt'))
      }
      const related =
        relatedTarget === undefined
          ? undefined
          : relatedTarget === null
            ? null
            : document.querySelector(relatedTarget)
      const event = new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
        relatedTarget: related,
      })
      element.dispatchEvent(event)
      return { prevented: event.defaultPrevented }
    },
    {
      type,
      names: options.names ?? [],
      relatedTarget: options.relatedTarget,
    },
  )
}

test.describe('GhostFileUpload @component:GhostFileUpload', () => {
  test('opens the native chooser from the trigger by click, Enter, and Space', async ({
    page,
    playgroundUrl,
  }) => {
    const trigger = await openExample(page, playgroundUrl, 'file-upload/basic')
    await expect(trigger).toHaveAttribute('type', 'button')
    await expect(trigger).not.toHaveAttribute('aria-invalid', 'true')

    const chooser = await chooseFiles(page, () => trigger.click(), [
      { name: 'a.txt', mimeType: 'text/plain' },
      { name: 'b.txt', mimeType: 'text/plain' },
    ])
    expect(chooser.isMultiple()).toBe(true)
    await expect(
      page.getByRole('list', { name: 'Selected files' }),
    ).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(2)
    await expect(page.getByRole('status')).toHaveText('2 files added.')

    await trigger.focus()
    await chooseFiles(page, () => page.keyboard.press('Enter'), [
      { name: 'c.txt', mimeType: 'text/plain' },
    ])
    await expect(trigger).toBeFocused()
    await expect(page.getByRole('listitem')).toHaveCount(3)

    await chooseFiles(page, () => page.keyboard.press('Space'), [
      { name: 'c.txt', mimeType: 'text/plain' },
    ])
    await expect(trigger).toBeFocused()
    // No built-in deduplication.
    await expect(page.getByRole('listitem')).toHaveCount(4)
    await expect(page.getByRole('status')).toHaveText('1 file added.')
    await expectNoAxeViolations(page)
  })

  test('tabs across the trigger and remove buttons and moves focus after removal', async ({
    page,
    playgroundUrl,
  }) => {
    const trigger = await openExample(page, playgroundUrl, 'file-upload/basic')
    await chooseFiles(page, () => trigger.click(), [
      { name: 'a.txt', mimeType: 'text/plain' },
      { name: 'b.txt', mimeType: 'text/plain' },
      { name: 'c.txt', mimeType: 'text/plain' },
    ])
    const removeA = page.getByRole('button', { name: 'Remove a.txt' })
    const removeB = page.getByRole('button', { name: 'Remove b.txt' })
    const removeC = page.getByRole('button', { name: 'Remove c.txt' })

    await trigger.focus()
    await page.keyboard.press('Tab')
    await expect(removeA).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(removeB).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(removeA).toBeFocused()
    await page.keyboard.press('Tab')

    // Remove the middle item: focus moves to the next item's button.
    await page.keyboard.press('Enter')
    await expect(removeB).toHaveCount(0)
    await expect(removeC).toBeFocused()
    await expect(page.getByRole('status')).toHaveText(
      'b.txt removed. 2 files remaining.',
    )

    // Remove the last item: focus moves to the previous item's button.
    await page.keyboard.press('Space')
    await expect(removeA).toBeFocused()

    // Remove the only item: focus moves to the trigger.
    await page.keyboard.press('Enter')
    await expect(trigger).toBeFocused()
    await expect(page.getByRole('list')).toHaveCount(0)
    await expect(page.getByRole('status')).toHaveText(
      'a.txt removed. No files remaining.',
    )
  })

  test('accepts a synthetic drop and tracks dragging across children', async ({
    page,
    playgroundUrl,
  }) => {
    await openExample(page, playgroundUrl, 'file-upload/basic')
    const zone = page.getByTestId('dropzone')
    const copy = zone.locator('p')

    const enter = await dispatchFileDrag(zone, 'dragenter')
    expect(enter.prevented).toBe(true)
    await expect(zone).toHaveAttribute('data-state', 'dragging')
    await expect(copy).toHaveText('Drop to add files')

    // A constructed DataTransfer ignores dropEffect writes outside a real
    // drag session, so only cancellation is observable here (unit tests cover
    // dropEffect).
    const over = await dispatchFileDrag(copy, 'dragover')
    expect(over.prevented).toBe(true)
    await dispatchFileDrag(zone, 'dragleave', {
      relatedTarget: '[data-testid="dropzone"] p',
    })
    await expect(zone).toHaveAttribute('data-state', 'dragging')

    await dispatchFileDrag(zone, 'dragleave', { relatedTarget: 'body' })
    await expect(zone).not.toHaveAttribute('data-state')

    // A drag cancelled elsewhere (dragend on the document) clears the state.
    await dispatchFileDrag(zone, 'dragenter')
    await expect(zone).toHaveAttribute('data-state', 'dragging')
    await page.evaluate(() => {
      document.dispatchEvent(new DragEvent('dragend', { bubbles: true }))
    })
    await expect(zone).not.toHaveAttribute('data-state')

    await dispatchFileDrag(zone, 'dragenter')
    const drop = await dispatchFileDrag(copy, 'drop', {
      names: ['dropped.txt', 'second.txt'],
    })
    expect(drop.prevented).toBe(true)
    await expect(zone).not.toHaveAttribute('data-state')
    await expect(page.getByRole('listitem')).toHaveText([
      /dropped\.txt/,
      /second\.txt/,
    ])
    await expect(page.getByRole('status')).toHaveText('2 files added.')
  })

  test('the document drop guard keeps a missed drop from navigating', async ({
    page,
    playgroundUrl,
  }) => {
    await openExample(page, playgroundUrl, 'file-upload/basic')
    const url = page.url()
    const outside = page.locator('body')
    const over = await dispatchFileDrag(outside, 'dragover')
    expect(over.prevented).toBe(true)
    const drop = await dispatchFileDrag(outside, 'drop', {
      names: ['stray.txt'],
    })
    expect(drop.prevented).toBe(true)
    expect(page.url()).toBe(url)
    await expect(page.getByRole('listitem')).toHaveCount(0)

    // Non-file drags are never touched.
    const textDrag = await page.evaluate(() => {
      const transfer = new DataTransfer()
      transfer.setData('text/plain', 'hello')
      const event = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      })
      document.body.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(textDrag).toBe(false)
  })

  test('a disabled dropzone cancels a drop without adding files', async ({
    page,
    playgroundUrl,
  }) => {
    const trigger = await openExample(
      page,
      playgroundUrl,
      'file-upload/controlled',
    )
    await page.getByRole('checkbox', { name: 'Disabled' }).check()
    await expect(trigger).toBeDisabled()
    const zone = page.getByTestId('dropzone')
    await expect(zone).toHaveAttribute('data-state', 'disabled')

    await dispatchFileDrag(zone, 'dragenter')
    const over = await dispatchFileDrag(zone, 'dragover')
    expect(over.prevented).toBe(true)
    await expect(zone).toHaveAttribute('data-state', 'disabled')
    const drop = await dispatchFileDrag(zone, 'drop', { names: ['x.txt'] })
    expect(drop.prevented).toBe(true)
    await expect(page.getByTestId('count')).toHaveText('0 selected')

    await page.getByRole('checkbox', { name: 'Disabled' }).uncheck()
    await dispatchFileDrag(zone, 'drop', { names: ['x.txt'] })
    await expect(page.getByTestId('count')).toHaveText('1 selected')
    await page.getByRole('button', { name: 'Clear all' }).click()
    await expect(page.getByTestId('count')).toHaveText('0 selected')
    await expect(page.getByRole('status')).toHaveText('All files removed.')
  })

  test('submits real FormData from the mirror, blocks required, and resets', async ({
    page,
    playgroundUrl,
  }) => {
    const trigger = await openExample(page, playgroundUrl, 'file-upload/form')
    const submit = page.getByRole('button', { name: 'Submit' })

    // Native `required` blocks submission and focuses the trigger.
    await submit.click()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-invalid', 'true')
    await expect(trigger).toHaveAccessibleDescription(
      'Choose at least one document.',
    )
    await expect(page.getByTestId('submitted')).toHaveCount(0)
    const valid = await page
      .getByTestId('file-upload-form')
      .evaluate((form: HTMLFormElement) => form.checkValidity())
    expect(valid).toBe(false)
    await expectNoAxeViolations(page)

    await chooseFiles(page, () => trigger.click(), [
      { name: 'one.pdf', mimeType: 'application/pdf' },
      { name: 'two.pdf', mimeType: 'application/pdf' },
    ])
    await expect(trigger).not.toHaveAttribute('aria-invalid')
    const entries = await page
      .getByTestId('file-upload-form')
      .evaluate((form: HTMLFormElement) =>
        new FormData(form)
          .getAll('documents')
          .map((value) =>
            value instanceof File ? `${value.name}:${String(value.size)}` : '',
          ),
      )
    expect(entries).toEqual(['one.pdf:4', 'two.pdf:4'])

    await submit.click()
    await expect(page.getByTestId('submitted')).toHaveText(
      'Submitted: one.pdf, two.pdf',
    )

    // Removing one updates the mirror too.
    await page.getByRole('button', { name: 'Remove one.pdf' }).click()
    await submit.click()
    await expect(page.getByTestId('submitted')).toHaveText('Submitted: two.pdf')

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByRole('listitem')).toHaveCount(0)
    const afterReset = await page
      .getByTestId('file-upload-form')
      .evaluate(
        (form: HTMLFormElement) =>
          new FormData(form).getAll('documents').length,
      )
    // A native file input with no files submits one empty entry.
    expect(afterReset).toBeLessThanOrEqual(1)
    await expect(
      page.locator('input[data-part="form-input"]'),
    ).toHaveJSProperty('files.length', 0)
  })

  test('composes the trigger name inside GhostField and shows rejections', async ({
    page,
    playgroundUrl,
  }) => {
    const trigger = await openExample(page, playgroundUrl, 'file-upload/field')
    await expect(trigger).toHaveAccessibleName('Attachments Choose files')
    await expect(trigger).toHaveAccessibleDescription('PDF files up to 5 MB.')
    await expect(
      page.getByText('Attachments', { exact: true }),
    ).toHaveAttribute('for', (await trigger.getAttribute('id')) ?? '')

    await chooseFiles(page, () => trigger.click(), [
      { name: 'notes.txt', mimeType: 'text/plain' },
      { name: 'brief.pdf', mimeType: 'application/pdf' },
    ])
    await expect(page.getByRole('listitem')).toHaveText([/brief\.pdf/])
    await expect(trigger).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert')).toContainText(
      'notes.txt was not added: this file type is not accepted.',
    )
    await expect(trigger).toHaveAccessibleDescription(
      /notes\.txt was not added/,
    )
    await expect(page.getByRole('status')).toHaveText(
      '1 file added. notes.txt was not added: this file type is not accepted.',
    )
    await expectNoAxeViolations(page)
  })

  test('validation and button-only examples report limits', async ({
    page,
    playgroundUrl,
  }) => {
    const trigger = await openExample(
      page,
      playgroundUrl,
      'file-upload/validation',
    )
    await chooseFiles(page, () => trigger.click(), [
      { name: 'a.png', mimeType: 'image/png' },
      { name: 'big.png', mimeType: 'image/png', size: 1_000_001 },
      { name: 'b.webp', mimeType: 'image/webp' },
      { name: 'c.jpg', mimeType: 'image/jpeg' },
      { name: 'd.png', mimeType: 'image/png' },
    ])
    await expect(page.getByTestId('remaining')).toHaveText('0 of 3 remaining')
    await expect(
      page.getByRole('list', { name: 'Files not added' }).getByRole('listitem'),
    ).toHaveText([
      'big.png was not added: it is larger than 1 MB.',
      'd.png was not added: the limit of 3 files has been reached.',
    ])
    await expectNoAxeViolations(page)

    const single = await openExample(
      page,
      playgroundUrl,
      'file-upload/button-only',
    )
    const chooser = await chooseFiles(page, () => single.click(), [
      { name: 'me.png', mimeType: 'image/png' },
    ])
    expect(chooser.isMultiple()).toBe(false)
    await expect(single).toBeDisabled()
    await page.getByRole('button', { name: 'Remove me.png' }).click()
    await expect(single).toBeEnabled()
    await expect(single).toBeFocused()
  })

  test('duplicates example rejects a file already in the list', async ({
    page,
    playgroundUrl,
  }, testInfo) => {
    // A file on disk keeps the same name, size, and lastModified across
    // choices; in-memory payloads get a fresh lastModified each time.
    const path = testInfo.outputPath('a.txt')
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, 'same file')
    const trigger = await openExample(
      page,
      playgroundUrl,
      'file-upload/duplicates',
    )
    for (let round = 0; round < 2; round += 1) {
      const chooserPromise = page.waitForEvent('filechooser')
      await trigger.click()
      await (await chooserPromise).setFiles(path)
    }
    await expect(page.getByRole('listitem')).toHaveCount(1)
    await expect(
      page
        .getByTestId('ghost-example-preview')
        .getByRole('paragraph')
        .filter({ hasText: 'a.txt was not added: It is already in the list.' }),
    ).toBeVisible()
    await expect(page.getByRole('status')).toHaveText(
      'a.txt was not added: It is already in the list.',
    )
  })
  test('themed example has 44px targets, a focus ring, and drag styling', async ({
    page,
    playgroundUrl,
  }) => {
    // Mode flips are applied instantly by the harness; color transitions
    // (motion allowed) would otherwise be sampled mid-flight by axe.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const mode of ['light', 'dark'] as const) {
      await axeScan(page, playgroundUrl, 'file-upload/themed', { mode })
    }
    const trigger = await openExample(page, playgroundUrl, 'file-upload/themed')
    const remove = page.getByRole('button', { name: 'Remove q3-report.pdf' })
    for (const target of [trigger, remove]) {
      const box = await target.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }

    // Reach the trigger by keyboard so :focus-visible applies.
    await remove.focus()
    await page.keyboard.press('Shift+Tab')
    await expect(trigger).toBeFocused()
    const outline = await trigger.evaluate((element) => {
      const style = getComputedStyle(element)
      return { style: style.outlineStyle, width: style.outlineWidth }
    })
    expect(outline.style).toBe('solid')
    expect(Number.parseFloat(outline.width)).toBeGreaterThan(0)

    await page.keyboard.press('Tab')
    await expect(remove).toBeFocused()
    expect(
      await remove.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
    ).toBe('solid')

    const zone = page.locator('[data-part="dropzone"]')
    const borderStyle = () =>
      zone.evaluate((element) => getComputedStyle(element).borderTopStyle)
    expect(await borderStyle()).toBe('dashed')
    await dispatchFileDrag(zone, 'dragenter')
    await expect(zone).toHaveAttribute('data-state', 'dragging')
    expect(await borderStyle()).toBe('solid')
    await expect(zone.getByText('Drop to add files')).toBeVisible()
    await dispatchFileDrag(zone, 'drop', { names: ['notes.txt'] })
    await expect(zone).not.toHaveAttribute('data-state', 'dragging')
    expect(await borderStyle()).toBe('dashed')
    await expect(page.getByRole('listitem')).toHaveCount(3)
  })

  test('themed parts render forced-colors system colors', async ({
    page,
    playgroundUrl,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const trigger = await openExample(page, playgroundUrl, 'file-upload/themed')
    await expect(trigger).toBeVisible()
    await trigger.focus()
    const zone = page.locator('[data-part="dropzone"]')
    await dispatchFileDrag(zone, 'dragenter')
    await expect(zone).toHaveAttribute('data-state', 'dragging')
    expect(
      await zone.evaluate(
        (element) => getComputedStyle(element).borderTopStyle,
      ),
    ).toBe('solid')
  })
})
