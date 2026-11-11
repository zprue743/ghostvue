import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

import { startStaticServer } from './static-server'

function parseColor(value: string) {
  const channels = value.match(/[\d.]+/g)?.map(Number)
  if (!channels || channels.length < 3) {
    throw new Error(`Unsupported computed color: ${value}`)
  }

  if (value.startsWith('color(')) {
    return channels.slice(-3).map((channel) => channel * 255)
  }

  return channels.slice(0, 3)
}

function luminance(value: string) {
  const [red, green, blue] = parseColor(value).map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(first: string, second: string) {
  const firstLuminance = luminance(first)
  const secondLuminance = luminance(second)
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  )
}

async function textContrast(button: Locator, surface: Locator) {
  const colors = await button.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      color: style.color,
    }
  })
  const surfaceBackground = await surface.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )
  const background =
    colors.background === 'rgba(0, 0, 0, 0)'
      ? surfaceBackground
      : colors.background

  return contrast(colors.color, background)
}

test('playground shell loads without detectable accessibility violations', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    await expect(
      page.getByRole('heading', { name: 'slop-ui playground' }),
    ).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})

test('SlVisuallyHidden names icon-only controls without showing the text', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    const deleteButton = page.getByRole('button', { name: 'Delete Q3 revenue' })
    await expect(deleteButton).toBeVisible()

    const label = deleteButton.locator('[data-state="hidden"]')
    const box = await label.boundingBox()
    expect(box).not.toBeNull()
    expect(box?.width).toBeLessThanOrEqual(1)
    expect(box?.height).toBeLessThanOrEqual(1)

    await expect(
      page.getByRole('columnheader', { name: 'Actions' }),
    ).toBeAttached()

    await deleteButton.click()
    await expect(
      page.getByRole('button', { name: 'Delete Q3 revenue' }),
    ).toHaveCount(0)
    await expect(page.getByRole('status')).toHaveText('Deleted Q3 revenue')
  } finally {
    await playground.close()
  }
})

test('SlVisuallyHidden reveals a focusable skip link to keyboard users', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    const skipLink = page.getByRole('link', { name: 'Skip to content' })
    // Clip is on the wrapper; `overflow: hidden` does not shrink the descendant.
    const wrapper = page.locator('header [data-part="root"]')

    await expect(wrapper).toHaveAttribute('data-state', 'hidden')
    const hiddenBox = await wrapper.boundingBox()
    expect(hiddenBox?.width).toBeLessThanOrEqual(1)
    expect(hiddenBox?.height).toBeLessThanOrEqual(1)

    await page.keyboard.press('Tab')
    await expect(skipLink).toBeFocused()

    await expect(wrapper).not.toHaveAttribute('data-state')
    const revealedBox = await wrapper.boundingBox()
    expect(revealedBox?.width).toBeGreaterThan(1)
    expect(revealedBox?.height).toBeGreaterThan(1)
    await expect(skipLink).toBeVisible()

    await skipLink.press('Enter')
    await expect(page.locator('#main')).toBeFocused()

    await expect(wrapper).toHaveAttribute('data-state', 'hidden')
    const rehiddenBox = await wrapper.boundingBox()
    expect(rehiddenBox?.width).toBeLessThanOrEqual(1)
  } finally {
    await playground.close()
  }
})

test('SlVisuallyHidden does not introduce horizontal overflow at 320px', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.setViewportSize({ width: 320, height: 256 })
    await page.goto(playground.url)

    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  } finally {
    await playground.close()
  }
})

test('SlButton supports native activation, focus, and unavailable states', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    const action = page.getByRole('button', { name: 'Run action' })
    await action.focus()
    await expect(action).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Activations: 1')).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByText('Activations: 2')).toBeVisible()

    await page.getByRole('button', { name: 'Default form action' }).click()
    await expect(page.getByText('Form submissions: 0')).toBeVisible()
    await page.getByRole('button', { name: 'Submit form' }).click()
    await expect(page.getByText('Form submissions: 1')).toBeVisible()

    const disabled = page.getByRole('button', { name: 'Disabled action' })
    const loading = page.getByRole('button', { name: 'Publishing' })
    await expect(disabled).toBeDisabled()
    await expect(loading).not.toHaveAttribute('disabled', '')
    await expect(loading).toHaveAttribute('aria-disabled', 'true')
    await expect(loading).toHaveAttribute('aria-busy', 'true')
    await expect(loading).toHaveAttribute('data-state', 'loading')

    const themedGroup = page.getByRole('group', { name: 'Default theme' })
    const themedAction = themedGroup.getByRole('button', { name: 'Add item' })
    await expect(themedAction).toHaveCSS('background-color', 'rgb(29, 78, 216)')
    await expect(themedAction.locator('[data-part="icon"]')).toBeVisible()
    const iconSizes = await themedAction
      .locator('[data-part="icon"]')
      .evaluate((wrapper) => {
        const icon = wrapper.querySelector('svg')
        return {
          icon: icon?.getBoundingClientRect().width,
          wrapper: wrapper.getBoundingClientRect().width,
        }
      })
    expect(iconSizes.icon).toBe(iconSizes.wrapper)

    const neutral = themedGroup.getByRole('button', {
      name: 'Neutral action',
    })
    await expect(neutral).toHaveAttribute('data-variant', 'soft')
    await expect(neutral).toHaveAttribute('data-tone', 'neutral')

    const danger = themedGroup.getByRole('button', { name: 'Delete item' })
    await expect(danger).toHaveCSS('min-height', '52px')

    const overridden = themedGroup.getByRole('button', {
      name: 'Product action',
    })
    await expect(overridden).toHaveCSS('background-color', 'rgb(124, 58, 237)')

    const iconOnly = themedGroup.getByRole('button', {
      name: 'Close playground',
    })
    await expect(iconOnly).toHaveAttribute('data-icon-only', '')

    await iconOnly.click()
    await expect(page.getByText('Activations: 3')).toBeVisible()

    const pending = themedGroup.getByRole('button', { name: 'Save changes' })
    const widthBeforeLoading = await pending.evaluate(
      (element) => element.getBoundingClientRect().width,
    )
    await pending.focus()
    await pending.click()
    await expect(pending).toBeFocused()
    await expect(pending).not.toHaveAttribute('disabled', '')
    await expect(pending).toHaveAttribute('aria-disabled', 'true')
    await expect(pending).toHaveAttribute('aria-busy', 'true')
    await expect(pending).toHaveAttribute('data-state', 'loading')
    await pending.evaluate((element) => {
      const button = element as HTMLButtonElement
      button.click()
    })
    await expect(page.getByText('Loading (activations: 1)')).toBeVisible()
    expect(
      await pending.evaluate(
        (element) => element.getBoundingClientRect().width,
      ),
    ).toBe(widthBeforeLoading)
  } finally {
    await playground.close()
  }
})

test('default theme adapts to accessibility and color preferences', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    const themedGroup = page.getByRole('group', { name: 'Default theme' })
    const action = themedGroup.getByRole('button', { name: 'Add item' })
    const loading = themedGroup.getByRole('button', { name: 'Save changes' })
    await loading.click()

    await action.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(action).toBeFocused()
    await expect(action).toHaveCSS('outline-color', 'rgb(15, 23, 42)')
    await expect(action).toHaveCSS('box-shadow', /rgb\(255, 255, 255\)/)

    const animatedLoadingIndicator = await loading.evaluate((element) => {
      const style = getComputedStyle(element, '::before')
      return { animationName: style.animationName, content: style.content }
    })
    expect(animatedLoadingIndicator.content).not.toBe('none')
    expect(animatedLoadingIndicator.animationName).not.toBe('none')

    const customLoading = themedGroup.getByRole('button', {
      name: 'Publishing',
    })
    await expect(
      customLoading.locator('[data-part="loading-indicator"]'),
    ).toBeVisible()
    expect(
      await customLoading.evaluate(
        (element) => getComputedStyle(element, '::before').content,
      ),
    ).toBe('none')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(action).toHaveCSS('transition-duration', '0s')
    expect(
      await loading.evaluate(
        (element) => getComputedStyle(element, '::before').animationName,
      ),
    ).toBe('none')

    await themedGroup.evaluate((element) => {
      element.setAttribute('data-color-scheme', 'dark')
    })
    await expect(themedGroup).toHaveCSS('color-scheme', 'dark')
    await expect(themedGroup).toHaveCSS('background-color', 'rgb(15, 23, 42)')
    await expect(action).toHaveCSS('background-color', 'rgb(96, 165, 250)')

    for (const tone of ['accent', 'neutral', 'danger']) {
      for (const variant of ['solid', 'soft', 'outline', 'ghost']) {
        await action.evaluate(
          (element, options) => {
            element.setAttribute('data-tone', options.tone)
            element.setAttribute('data-variant', options.variant)
          },
          { tone, variant },
        )
        expect(
          await textContrast(action, themedGroup),
          `${tone} ${variant} text contrast`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }

    await page.emulateMedia({ forcedColors: 'active' })
    await action.focus()
    await expect(action).toHaveCSS('outline-style', 'solid')
    await expect(action).toHaveCSS('box-shadow', 'none')
  } finally {
    await playground.close()
  }
})
