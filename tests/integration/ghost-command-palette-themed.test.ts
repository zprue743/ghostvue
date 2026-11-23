import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import {
  GhostCommandPaletteInput,
  GhostCommandPaletteItem,
  GhostCommandPaletteList,
  GhostCommandPaletteTitle,
  GhostCommandPaletteTrigger,
} from '../../packages/vue/src'
import {
  GhostCommandPalette,
  type GhostCommandPaletteCommandPayload,
  type GhostCommandPaletteExposed,
} from '../../packages/themes/src/ghost-command-palette'
import {
  GhostCommandPaletteContent,
  type GhostCommandPaletteContentExposed,
} from '../../packages/themes/src/ghost-command-palette-content'
import {
  GhostCommandPaletteOverlay,
  type GhostCommandPaletteOverlayExposed,
} from '../../packages/themes/src/ghost-command-palette-overlay'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached.splice(0)) {
    wrapper.unmount()
  }
  document.body.innerHTML = ''
})

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('themed GhostCommandPalette wrappers', () => {
  it('marks portaled overlay and content as themed and forwards props, events, and exposed methods', async () => {
    const paletteRef = ref<GhostCommandPaletteExposed | null>(null)
    const contentRef = ref<GhostCommandPaletteContentExposed | null>(null)
    const overlayRef = ref<GhostCommandPaletteOverlayExposed | null>(null)
    const commands: GhostCommandPaletteCommandPayload[] = []
    const opens: boolean[] = []

    const Fixture = defineComponent({
      setup() {
        return () =>
          h(
            GhostCommandPalette,
            {
              ref: paletteRef,
              closeOnSelect: false,
              onCommand: (payload: GhostCommandPaletteCommandPayload) => {
                commands.push(payload)
              },
              'onUpdate:open': (open: boolean) => {
                opens.push(open)
              },
            },
            () => [
              h(GhostCommandPaletteTrigger, null, () => 'Open'),
              h(GhostCommandPaletteOverlay, { ref: overlayRef }),
              h(
                GhostCommandPaletteContent,
                { ref: contentRef, class: 'custom-content' },
                () => [
                  h(GhostCommandPaletteTitle, null, () => 'Commands'),
                  h(GhostCommandPaletteInput),
                  h(GhostCommandPaletteList, null, () =>
                    h(GhostCommandPaletteItem, { id: 'one' }, () => 'One'),
                  ),
                ],
              ),
            ],
          )
      },
    })
    attached.push(mount(Fixture, { attachTo: document.body }))

    paletteRef.value?.open()
    await flushPromises()
    expect(opens).toEqual([true])

    const content = contentRef.value?.element
    const overlay = overlayRef.value?.element
    expect(content?.hasAttribute('data-themed')).toBe(true)
    expect(content?.classList.contains('ghost-command-palette-content')).toBe(
      true,
    )
    expect(content?.classList.contains('custom-content')).toBe(true)
    expect(overlay?.hasAttribute('data-themed')).toBe(true)
    expect(document.activeElement).toBe(paletteRef.value?.element)

    document.querySelector<HTMLElement>('[data-part="item"]')?.click()
    expect(commands).toEqual([{ id: 'one' }])

    paletteRef.value?.close()
    await flushPromises()
    expect(opens).toEqual([true, false])
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('styles every part with semantic tokens, a list max-size hook, and forced-colors fallbacks', async () => {
    const css = stripComments(
      await readFile(
        resolve(process.cwd(), 'packages/themes/src/ghost-command-palette.css'),
        'utf8',
      ),
    )
    for (const part of [
      'overlay',
      'content',
      'title',
      'input',
      'list',
      'item',
      'label',
      'empty',
      'separator',
    ]) {
      expect(css).toContain(`.ghost-command-palette-${part}`)
    }
    expect(css).toContain('background-color: var(--ghost-scrim);')
    expect(css).toContain('--ghost-elevation-4-bg')
    expect(css).toContain('--ghost-command-palette-list-max-size')
    expect(css).toMatch(/\[data-highlighted\][^{]*\{[^}]*outline:/)
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(css).not.toMatch(/\b(?:rgb|hsl|oklch)a?\(/i)
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('GrayText')
  })
})
