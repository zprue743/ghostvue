<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { useFocusScope, useRovingFocus } from '@slop-ui/vue'

const trapOpen = ref(false)
const trap = useTemplateRef<HTMLElement>('trap')
useFocusScope(trap, {
  trapped: true,
  loop: true,
  autoFocus: true,
  restoreFocus: true,
})

const nestedOpen = ref(false)
const nestedInnerOpen = ref(false)
const nestedOuter = useTemplateRef<HTMLElement>('nested-outer')
const nestedInner = useTemplateRef<HTMLElement>('nested-inner')
useFocusScope(nestedOuter, {
  trapped: true,
  loop: true,
  autoFocus: true,
  restoreFocus: true,
})
useFocusScope(nestedInner, {
  trapped: true,
  loop: true,
  autoFocus: true,
  restoreFocus: true,
})

const horizontal = useTemplateRef<HTMLElement>('roving-horizontal')
useRovingFocus(horizontal, { orientation: 'horizontal', loop: true })

const vertical = useTemplateRef<HTMLElement>('roving-vertical')
useRovingFocus(vertical, { orientation: 'vertical', loop: true })

const rtl = useTemplateRef<HTMLElement>('roving-rtl')
useRovingFocus(rtl, { orientation: 'horizontal', dir: 'rtl', loop: true })

function closeNested(): void {
  nestedInnerOpen.value = false
  nestedOpen.value = false
}
</script>

<template>
  <main>
    <h1>slop-ui playground</h1>
    <p>
      Pre-release host for components that have passed the component gate. Focus
      primitives below are fixtures for keyboard tests, not library components.
    </p>

    <section aria-labelledby="trap-heading">
      <h2 id="trap-heading">Focus scope</h2>
      <button type="button" data-testid="open-trap" @click="trapOpen = true">
        Open trap
      </button>
      <div
        v-if="trapOpen"
        ref="trap"
        tabindex="-1"
        role="dialog"
        aria-labelledby="trap-title"
        data-testid="trap"
      >
        <h3 id="trap-title">Trapped dialog</h3>
        <button type="button" data-testid="trap-first">Trap first</button>
        <button type="button" data-testid="trap-last">Trap last</button>
        <button
          type="button"
          data-testid="close-trap"
          @click="trapOpen = false"
        >
          Close trap
        </button>
      </div>

      <button
        type="button"
        data-testid="open-nested"
        @click="nestedOpen = true"
      >
        Open nested outer
      </button>
      <div
        v-if="nestedOpen"
        ref="nested-outer"
        tabindex="-1"
        role="dialog"
        aria-labelledby="nested-outer-title"
        data-testid="nested-outer"
      >
        <h3 id="nested-outer-title">Outer trap</h3>
        <button type="button" data-testid="nested-outer-first">
          Outer first
        </button>
        <button
          type="button"
          data-testid="open-nested-inner"
          @click="nestedInnerOpen = true"
        >
          Open nested inner
        </button>
        <div
          v-if="nestedInnerOpen"
          ref="nested-inner"
          tabindex="-1"
          role="dialog"
          aria-labelledby="nested-inner-title"
          data-testid="nested-inner"
        >
          <h3 id="nested-inner-title">Inner trap</h3>
          <button type="button" data-testid="nested-inner-first">
            Inner first
          </button>
          <button type="button" data-testid="nested-inner-last">
            Inner last
          </button>
          <button
            type="button"
            data-testid="close-nested-inner"
            @click="nestedInnerOpen = false"
          >
            Close nested inner
          </button>
        </div>
        <button type="button" data-testid="nested-outer-last">
          Outer last
        </button>
        <button type="button" data-testid="close-nested" @click="closeNested">
          Close nested outer
        </button>
      </div>
    </section>

    <section aria-labelledby="roving-heading">
      <h2 id="roving-heading">Roving focus</h2>
      <button type="button" data-testid="before-roving">Before roving</button>
      <div
        ref="roving-horizontal"
        role="toolbar"
        aria-label="Horizontal roving demo"
        data-testid="roving-horizontal"
      >
        <button type="button">One</button>
        <button type="button" disabled>Two</button>
        <button type="button">Three</button>
        <button type="button">Four</button>
      </div>
      <div
        ref="roving-vertical"
        role="toolbar"
        aria-label="Vertical roving demo"
        aria-orientation="vertical"
        data-testid="roving-vertical"
      >
        <button type="button">Alpha</button>
        <button type="button">Beta</button>
        <button type="button">Gamma</button>
      </div>
      <div
        ref="roving-rtl"
        role="toolbar"
        aria-label="RTL roving demo"
        dir="rtl"
        data-testid="roving-rtl"
      >
        <button type="button">Rightmost</button>
        <button type="button">Middle</button>
        <button type="button">Leftmost</button>
      </div>
    </section>
  </main>
</template>
