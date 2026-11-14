import type { Component } from 'vue'
import { createSSRApp, h, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { expect, vi } from 'vitest'

export interface ExpectSsrHydrationOptions {
  /**
   * Assertions on the server HTML string before hydration (for example
   * required attributes or absence of client-only markup).
   */
  assertServerHtml?: (html: string) => void
}

/**
 * Collect `id` values in document order from a subtree. Used to compare SSR
 * markup with the hydrated client DOM without relying on selector-specific
 * queries in each test.
 */
export function collectElementIds(root: ParentNode): string[] {
  const ids: string[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let node = walker.currentNode as Element | null
  while (node) {
    const id = node.getAttribute('id')
    if (id) {
      ids.push(id)
    }
    node = walker.nextNode() as Element | null
  }
  return ids
}

function collectVueRenderOutput(args: unknown[], bucket: string[]): void {
  bucket.push(args.map(String).join(' '))
}

/**
 * Renders with `renderToString`, mounts the HTML in the current document,
 * hydrates with `createSSRApp`, and fails when Vue reports a hydration problem
 * or when `id` values differ between server HTML and the hydrated DOM.
 */
export async function expectSsrHydration(
  root: Component,
  options: ExpectSsrHydrationOptions = {},
): Promise<{ html: string; container: HTMLElement }> {
  const app = createSSRApp(root)

  const renderOutput: string[] = []
  const renderWarn = vi.spyOn(console, 'warn').mockImplementation((...args) => {
    collectVueRenderOutput(args, renderOutput)
  })
  const renderError = vi
    .spyOn(console, 'error')
    .mockImplementation((...args) => {
      collectVueRenderOutput(args, renderOutput)
    })

  let html: string
  try {
    html = await renderToString(app)
  } finally {
    renderWarn.mockRestore()
    renderError.mockRestore()
  }

  expect(
    renderOutput.join('\n'),
    'SSR renderToString must not log warnings or errors',
  ).toBe('')

  options.assertServerHtml?.(html)

  const serverIds = collectElementIds(
    (() => {
      const probe = document.createElement('div')
      probe.innerHTML = html
      return probe
    })(),
  )

  const container = document.createElement('div')
  container.innerHTML = html
  document.body.append(container)

  const hydrationOutput: string[] = []
  const hydrationWarn = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args) => {
      collectVueRenderOutput(args, hydrationOutput)
    })
  const hydrationError = vi
    .spyOn(console, 'error')
    .mockImplementation((...args) => {
      collectVueRenderOutput(args, hydrationOutput)
    })

  try {
    createSSRApp(root).mount(container)

    const clientIds = collectElementIds(container)
    expect(clientIds, 'Hydrated DOM must preserve SSR id values').toEqual(
      serverIds,
    )

    const hydrationMessages = hydrationOutput.join('\n')
    expect(hydrationMessages).not.toMatch(/hydrat/i)
  } finally {
    hydrationWarn.mockRestore()
    hydrationError.mockRestore()
    container.remove()
  }

  return { html, container }
}

/** Fixture root that renders a single child via `h(Component, props, children)`. */
export function ssrHydrationRoot(
  component: Component,
  props?: Record<string, unknown> | null,
  children?: Parameters<typeof h>[2],
): Component {
  return {
    name: 'SsrHydrationRoot',
    setup: () => {
      if (children === undefined) {
        return (): VNode => h(component, props ?? null)
      }
      return (): VNode => h(component, props ?? null, children)
    },
  }
}
