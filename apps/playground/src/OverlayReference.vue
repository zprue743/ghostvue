<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { GhostPortal, useDismissableLayer, useFloating } from '@ghostvue/vue'

// 1. Flip & shift positioning fixture
const flipOpen = ref(false)
const flipAnchor = useTemplateRef<HTMLButtonElement>('flip-anchor')
const flipFloating = useTemplateRef<HTMLElement>('flip-floating')
const flipPos = useFloating(flipAnchor, flipFloating, {
  placement: 'bottom',
  offset: 6,
  flip: { padding: 8 },
  shift: { padding: 8 },
})
useDismissableLayer(flipFloating, {
  onDismiss: () => {
    flipOpen.value = false
  },
  ignore: flipAnchor,
})

const shiftOpen = ref(false)
const shiftAnchor = useTemplateRef<HTMLButtonElement>('shift-anchor')
const shiftFloating = useTemplateRef<HTMLElement>('shift-floating')
const shiftPos = useFloating(shiftAnchor, shiftFloating, {
  placement: 'bottom',
  offset: 6,
  flip: { padding: 8 },
  shift: { padding: 8 },
})
useDismissableLayer(shiftFloating, {
  onDismiss: () => {
    shiftOpen.value = false
  },
  ignore: shiftAnchor,
})

// 2. Scroll tracking fixture
const scrollOpen = ref(false)
const scrollAnchor = useTemplateRef<HTMLButtonElement>('scroll-anchor')
const scrollFloating = useTemplateRef<HTMLElement>('scroll-floating')
const scrollPos = useFloating(scrollAnchor, scrollFloating, {
  placement: 'bottom',
  offset: 4,
  flip: false,
  shift: false,
})
useDismissableLayer(scrollFloating, {
  onDismiss: () => {
    scrollOpen.value = false
  },
  ignore: scrollAnchor,
})

// 3. Nested layers & trigger-toggle fixture
const outerOpen = ref(false)
const innerOpen = ref(false)
const outerTrigger = useTemplateRef<HTMLButtonElement>('outer-trigger')
const outerLayer = useTemplateRef<HTMLElement>('outer-layer')
const innerTrigger = useTemplateRef<HTMLButtonElement>('inner-trigger')
const innerLayer = useTemplateRef<HTMLElement>('inner-layer')

const outerPos = useFloating(outerTrigger, outerLayer, {
  placement: 'bottom-start',
  offset: 6,
})
const innerPos = useFloating(innerTrigger, innerLayer, {
  placement: 'bottom-start',
  offset: 6,
})

useDismissableLayer(outerLayer, {
  onDismiss: () => {
    outerOpen.value = false
    innerOpen.value = false
  },
  ignore: outerTrigger,
})

useDismissableLayer(innerLayer, {
  onDismiss: () => {
    innerOpen.value = false
  },
  ignore: innerTrigger,
})

function toggleOuter(): void {
  outerOpen.value = !outerOpen.value
  if (!outerOpen.value) {
    innerOpen.value = false
  }
}
</script>

<template>
  <section aria-labelledby="overlay-primitives-heading" class="overlay-demo">
    <h2 id="overlay-primitives-heading">Overlay primitives</h2>

    <div class="overlay-row">
      <button
        ref="flip-anchor"
        type="button"
        data-testid="flip-anchor"
        :aria-expanded="flipOpen"
        @click="flipOpen = !flipOpen"
      >
        Flip anchor
      </button>

      <button
        ref="outer-trigger"
        type="button"
        data-testid="outer-trigger"
        :aria-expanded="outerOpen"
        @click="toggleOuter"
      >
        Toggle outer layer
      </button>
    </div>

    <div class="overlay-right-edge">
      <button
        ref="shift-anchor"
        type="button"
        data-testid="shift-anchor"
        :aria-expanded="shiftOpen"
        @click="shiftOpen = !shiftOpen"
      >
        Shift anchor
      </button>
    </div>

    <div
      class="overlay-scroll-box"
      data-testid="overlay-scroll-container"
      tabindex="0"
      aria-label="Scrollable anchor container"
    >
      <div class="overlay-scroll-spacer">
        <button
          ref="scroll-anchor"
          type="button"
          data-testid="scroll-anchor"
          :aria-expanded="scrollOpen"
          @click="scrollOpen = !scrollOpen"
        >
          Scroll anchor
        </button>
      </div>
    </div>

    <GhostPortal>
      <div
        v-if="flipOpen"
        ref="flip-floating"
        data-testid="flip-floating"
        class="overlay-surface overlay-flip-box"
        :style="{
          position: flipPos.strategy.value,
          left: `${flipPos.x.value}px`,
          top: `${flipPos.y.value}px`,
        }"
      >
        Flipping floating panel
      </div>
    </GhostPortal>

    <GhostPortal>
      <div
        v-if="shiftOpen"
        ref="shift-floating"
        data-testid="shift-floating"
        class="overlay-surface overlay-shift-box"
        :style="{
          position: shiftPos.strategy.value,
          left: `${shiftPos.x.value}px`,
          top: `${shiftPos.y.value}px`,
        }"
      >
        Wide shifting floating panel
      </div>
    </GhostPortal>

    <GhostPortal>
      <div
        v-if="scrollOpen"
        ref="scroll-floating"
        data-testid="scroll-floating"
        class="overlay-surface"
        :style="{
          position: scrollPos.strategy.value,
          left: `${scrollPos.x.value}px`,
          top: `${scrollPos.y.value}px`,
        }"
      >
        Scroll-tracked panel
      </div>
    </GhostPortal>

    <GhostPortal>
      <div
        v-if="outerOpen"
        ref="outer-layer"
        data-testid="outer-layer"
        class="overlay-surface"
        :style="{
          position: outerPos.strategy.value,
          left: `${outerPos.x.value}px`,
          top: `${outerPos.y.value}px`,
        }"
      >
        <p data-testid="outer-layer-body">Outer layer content</p>
        <button
          ref="inner-trigger"
          type="button"
          data-testid="inner-trigger"
          :aria-expanded="innerOpen"
          @click="innerOpen = !innerOpen"
        >
          Toggle inner layer
        </button>
      </div>
    </GhostPortal>

    <GhostPortal>
      <div
        v-if="innerOpen"
        ref="inner-layer"
        data-testid="inner-layer"
        class="overlay-surface"
        :style="{
          position: innerPos.strategy.value,
          left: `${innerPos.x.value}px`,
          top: `${innerPos.y.value}px`,
        }"
      >
        <p data-testid="inner-layer-body">Inner layer content</p>
      </div>
    </GhostPortal>
  </section>
</template>

<style scoped>
.overlay-demo {
  display: grid;
  gap: 1rem;
  margin-block: 1.5rem;
}

.overlay-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.overlay-right-edge {
  display: flex;
  justify-content: flex-end;
}

.overlay-scroll-box {
  block-size: 9rem;
  border: 1px solid #767676;
  max-inline-size: 20rem;
  overflow-y: auto;
  padding: 0.75rem;
}

.overlay-scroll-spacer {
  block-size: 24rem;
  padding-block-start: 4rem;
}

.overlay-surface {
  background: #ffffff;
  border: 1px solid #111827;
  color: #111827;
  padding: 0.75rem;
  z-index: 1000;
}

.overlay-flip-box {
  block-size: 8rem;
  inline-size: 12rem;
}

.overlay-shift-box {
  inline-size: 15rem;
}
</style>
