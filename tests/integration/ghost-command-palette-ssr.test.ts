import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostCommandPalette from '../../packages/vue/src/GhostCommandPalette.vue'
import GhostCommandPaletteContent from '../../packages/vue/src/GhostCommandPaletteContent.vue'
import GhostCommandPaletteEmpty from '../../packages/vue/src/GhostCommandPaletteEmpty.vue'
import GhostCommandPaletteGroup from '../../packages/vue/src/GhostCommandPaletteGroup.vue'
import GhostCommandPaletteInput from '../../packages/vue/src/GhostCommandPaletteInput.vue'
import GhostCommandPaletteItem from '../../packages/vue/src/GhostCommandPaletteItem.vue'
import GhostCommandPaletteLabel from '../../packages/vue/src/GhostCommandPaletteLabel.vue'
import GhostCommandPaletteList from '../../packages/vue/src/GhostCommandPaletteList.vue'
import GhostCommandPaletteOverlay from '../../packages/vue/src/GhostCommandPaletteOverlay.vue'
import GhostCommandPaletteSeparator from '../../packages/vue/src/GhostCommandPaletteSeparator.vue'
import GhostCommandPaletteTitle from '../../packages/vue/src/GhostCommandPaletteTitle.vue'
import GhostCommandPaletteTrigger from '../../packages/vue/src/GhostCommandPaletteTrigger.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

function fixture(name: string, open: boolean) {
  return defineComponent({
    name,
    setup() {
      return () =>
        h(
          GhostCommandPalette,
          { defaultOpen: open, defaultSearch: 'go' },
          {
            default: () => [
              h(GhostCommandPaletteTrigger, null, () => 'Commands'),
              // Inline parts keep the open markup inside the hydrated root.
              h(GhostCommandPaletteOverlay, { portal: false }),
              h(GhostCommandPaletteContent, { portal: false }, () => [
                h(GhostCommandPaletteTitle, null, () => 'Commands'),
                h(GhostCommandPaletteInput),
                h(GhostCommandPaletteList, null, () => [
                  h(GhostCommandPaletteGroup, null, () => [
                    h(GhostCommandPaletteLabel, null, () => 'Navigation'),
                    h(
                      GhostCommandPaletteItem,
                      { id: 'go-home' },
                      () => 'Go home',
                    ),
                  ]),
                  h(GhostCommandPaletteSeparator),
                  h(GhostCommandPaletteEmpty, null, () => 'No commands'),
                ]),
              ]),
            ],
          },
        )
    },
  })
}

describe('GhostCommandPalette SSR hydration', () => {
  it('hydrates a closed palette as the trigger only', async () => {
    await expectSsrHydration(fixture('ClosedCommandPaletteFixture', false), {
      assertServerHtml(html) {
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('aria-haspopup="dialog"')
        expect(html).not.toContain('role="dialog"')
        expect(html).not.toContain('role="combobox"')
      },
    })
  })

  it('hydrates a defaultOpen palette with its input and inline list', async () => {
    await expectSsrHydration(fixture('OpenCommandPaletteFixture', true), {
      assertServerHtml(html) {
        expect(html).toContain('role="dialog"')
        expect(html).toContain('role="combobox"')
        expect(html).toContain('value="go"')
        expect(html).toContain('data-part="list"')
        expect(html).toContain('role="option"')
        expect(html).toContain('role="none"')
      },
    })
  })
})
