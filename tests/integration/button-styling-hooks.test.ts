import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GhostButton as ThemedGhostButton } from '../../packages/themes/src/ghost-button'
import GhostButton from '../../packages/vue/src/GhostButton.vue'

// Styling hooks are public API (docs/architecture/styling.md): every data-part,
// data-state, and extra data-* value the DOM emits must be documented in the
// component manifest, because CSS, Tailwind data-* variants, and agents target
// the manifest rather than the DOM structure.

interface DocumentedHooks {
  parts: string[]
  states: string[]
  attributes: Map<string, string[]>
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
    : []
}

function names(value: unknown): string[] {
  return records(value).flatMap((item) =>
    typeof item['name'] === 'string' ? [item['name']] : [],
  )
}

async function documentedHooks(path: string): Promise<DocumentedHooks> {
  const manifest: unknown = JSON.parse(
    await readFile(resolve(process.cwd(), path), 'utf8'),
  )
  const styling =
    typeof manifest === 'object' && manifest !== null && 'styling' in manifest
      ? manifest.styling
      : undefined
  if (typeof styling !== 'object' || styling === null) {
    throw new Error(`${path} must declare styling`)
  }
  const attributes = new Map<string, string[]>()
  for (const attribute of records(
    'attributes' in styling ? styling.attributes : [],
  )) {
    const values = Array.isArray(attribute['values'])
      ? attribute['values'].filter(
          (item): item is string => typeof item === 'string',
        )
      : []
    if (typeof attribute['name'] === 'string') {
      attributes.set(attribute['name'], values)
    }
  }
  return {
    parts: names('parts' in styling ? styling.parts : []),
    states: names('states' in styling ? styling.states : []),
    attributes,
  }
}

function expectDocumented(element: Element, hooks: DocumentedHooks): void {
  for (const node of [element, ...element.querySelectorAll('[data-part]')]) {
    for (const { name, value } of node.attributes) {
      if (name === 'data-part') {
        expect(hooks.parts, name).toContain(value)
      } else if (name === 'data-state') {
        expect(hooks.states, name).toContain(value)
      } else if (name.startsWith('data-') && node === element) {
        const values = hooks.attributes.get(name)
        expect(values, `${name} must be documented`).toBeDefined()
        // Presence attributes render as an empty string and list no values.
        if (value === '') expect(values, name).toEqual([])
        else expect(values, name).toContain(value)
      }
    }
  }
}

const buttonStates = [
  {},
  { disabled: true },
  { loading: true },
  { disabled: true, loading: true },
] as const

// The spotlight surface reads pointer media queries and observers on mount;
// jsdom has neither.
function stubFinePointer(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    media: query,
  }))
  class IdleObserver {
    observe(target: Element): void {
      void target
    }
    disconnect(): void {
      return undefined
    }
  }
  vi.stubGlobal('IntersectionObserver', IdleObserver)
  vi.stubGlobal('ResizeObserver', IdleObserver)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GhostButton styling hooks', () => {
  it('headless button emits only manifest-documented hooks in every state', async () => {
    const hooks = await documentedHooks(
      'packages/vue/manifests/ghost-button.manifest.json',
    )
    expect(hooks.parts).toContain('root')
    expect(hooks.states).toEqual(['loading', 'disabled'])

    for (const props of buttonStates) {
      const button = mount(GhostButton, {
        props,
        slots: { default: 'Save' },
      }).get('button')
      expect(button.attributes('data-part')).toBe('root')
      expectDocumented(button.element, hooks)
    }
  })

  it('themed button emits only manifest-documented hooks for its visual props', async () => {
    const hooks = await documentedHooks(
      'packages/themes/manifests/ghost-button.manifest.json',
    )
    stubFinePointer()
    const visualProps = [
      {},
      { variant: 'soft', tone: 'danger', size: 'lg', block: true },
      { variant: 'ghost', tone: 'neutral', size: 'sm', iconOnly: true },
      { variant: 'outline', interactive: 'spotlight' },
    ] as const

    for (const visual of visualProps) {
      for (const state of buttonStates) {
        const wrapper = mount(ThemedGhostButton, {
          props: { ...visual, ...state },
          attachTo: document.body,
          slots: { default: 'Save' },
        })
        await nextTick()
        const button = wrapper.get('button')
        expect(button.attributes('data-part')).toBe('root')
        expectDocumented(button.element, hooks)
        wrapper.unmount()
      }
    }
  })
})
