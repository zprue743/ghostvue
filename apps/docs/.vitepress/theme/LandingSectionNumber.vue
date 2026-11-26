<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import {
  landingSectionNumber,
  landingSections,
  type LandingMotionMode,
  type LandingSectionId,
} from './landing-motion'

/*
 * Background section number for the landing page: a large, faint copy of the
 * active section's rail number (`01`..`07`) that stays fixed while the page
 * scrolls and flips like a split-flap clock when the section changes.
 *
 * Purely decorative. The rail already exposes the current section through
 * `aria-current`, so the whole layer is hidden from assistive technology,
 * holds nothing focusable, and never takes the pointer.
 *
 * Bespoke on purpose, like the rail: GhostVue has no component for this.
 */
const props = defineProps<{
  /** Section the reader is currently on. */
  activeId: LandingSectionId
  /**
   * `static` (server render, reduced motion) swaps the number with no flip.
   * Any other mode animates the change.
   */
  motionMode: LandingMotionMode
}>()

const targetIndex = computed(() =>
  Math.max(
    0,
    landingSections.findIndex((section) => section.id === props.activeId),
  ),
)

/*
 * One flip at a time, tracked for the whole number rather than per digit.
 * `shownIndex` is the section the number shows (or is flipping to) and
 * `previousIndex` the one it is flipping away from; they are equal at rest.
 *
 * A running flip is never restarted. Fast scrolling or a rail jump changes
 * the active section several times within one flip, and restarting on each
 * change would stutter. Instead the flip finishes, and `settle` starts at
 * most one more flip straight to wherever the reader is by then. So a jump
 * from 01 to 06 does not queue one flip per section, and the number always
 * ends on the active one.
 */
const shownIndex = ref(targetIndex.value)
const previousIndex = ref(targetIndex.value)
const flipping = ref(false)
/** Keys the flaps so each flip mounts fresh elements and restarts the CSS. */
const flipId = ref(0)

const direction = computed(() =>
  shownIndex.value >= previousIndex.value ? 'forward' : 'backward',
)

function start(): void {
  const target = targetIndex.value
  if (target === shownIndex.value) return
  if (props.motionMode === 'static') {
    shownIndex.value = target
    previousIndex.value = target
    return
  }
  previousIndex.value = shownIndex.value
  shownIndex.value = target
  flipping.value = true
  flipId.value += 1
}

function settle(): void {
  // Every flipping digit reports its own `animationend`; only the first one
  // of a flip settles it.
  if (!flipping.value) return
  flipping.value = false
  previousIndex.value = shownIndex.value
  start()
}

function onFlapEnd(event: AnimationEvent, id: number): void {
  // A flap from an earlier flip can still report after the next one began.
  if (id !== flipId.value || event.target !== event.currentTarget) return
  settle()
}

watch(targetIndex, () => {
  if (!flipping.value) start()
})

watch(
  () => props.motionMode,
  (mode) => {
    // Reduced motion turned on mid-flip removes the flaps, so their
    // `animationend` never arrives; finish the flip by hand.
    if (mode === 'static' && flipping.value) settle()
  },
)

interface Digit {
  /** Character each fixed half shows. They differ only during a flip. */
  top: string
  bottom: string
  /** Flap that folds away (old character) and the half it covers. */
  out?: { half: 'top' | 'bottom'; char: string }
  /** Flap that lands (new character) and the half it covers. */
  in?: { half: 'top' | 'bottom'; char: string }
}

/*
 * Split-flap layout for one digit. Going forward the flap falls: the fixed
 * top half already shows the new character, the fixed bottom still shows the
 * old one, the old top folds down out of sight, then the new bottom lands.
 * Going backward is the mirror image, with the flaps travelling upward.
 * A digit whose character does not change gets no flaps at all.
 */
const digits = computed<Digit[]>(() => {
  const shown = landingSectionNumber(shownIndex.value)
  const previous = landingSectionNumber(previousIndex.value)
  const forward = direction.value === 'forward'
  // ASCII digits only, so iterating by code point is exact.
  return Array.from(shown, (char, index): Digit => {
    const old = previous[index] ?? char
    if (!flipping.value || old === char) return { top: char, bottom: char }
    return forward
      ? {
          top: char,
          bottom: old,
          out: { half: 'top', char: old },
          in: { half: 'bottom', char },
        }
      : {
          top: old,
          bottom: char,
          out: { half: 'bottom', char: old },
          in: { half: 'top', char },
        }
  })
})
</script>

<template>
  <div class="ghost-landing-number-layer" aria-hidden="true">
    <!--
      The layer covers the landing page and clips the fixed number to it (see
      the stylesheet), so the number never shows over the site footer. This
      note sits inside the root so the component keeps a single root element.
    -->
    <div
      class="ghost-landing-number"
      data-testid="landing-section-number"
      :data-value="landingSectionNumber(shownIndex)"
      :data-flip="flipping ? direction : undefined"
    >
      <span
        v-for="(digit, index) in digits"
        :key="index"
        class="ghost-landing-number__digit"
        :data-flipping="digit.out ? '' : undefined"
      >
        <span
          class="ghost-landing-number__half ghost-landing-number__half--top"
        >
          <span class="ghost-landing-number__glyph">{{ digit.top }}</span>
        </span>
        <span
          class="ghost-landing-number__half ghost-landing-number__half--bottom"
        >
          <span class="ghost-landing-number__glyph">{{ digit.bottom }}</span>
        </span>
        <template v-if="digit.out && digit.in">
          <span
            :key="`out-${flipId}`"
            class="ghost-landing-number__half ghost-landing-number__flap ghost-landing-number__flap--out"
            :class="`ghost-landing-number__half--${digit.out.half}`"
          >
            <span class="ghost-landing-number__glyph">{{
              digit.out.char
            }}</span>
          </span>
          <span
            :key="`in-${flipId}`"
            class="ghost-landing-number__half ghost-landing-number__flap ghost-landing-number__flap--in"
            :class="`ghost-landing-number__half--${digit.in.half}`"
            @animationend="onFlapEnd($event, flipId)"
          >
            <span class="ghost-landing-number__glyph">{{ digit.in.char }}</span>
          </span>
        </template>
      </span>
    </div>
  </div>
</template>

<style src="./landing-section-number.css"></style>
