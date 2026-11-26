<script setup lang="ts">
import { computed } from 'vue'

import type { LandingMotionMode } from './landing-motion'

/*
 * Hero logo for the landing page. Each time the reader arrives at the hero
 * the ghost twirls from back to front and then winks one eye.
 *
 * The whole animation hangs off one attribute. CSS animations start when
 * `data-landing-mark="playing"` appears, so leaving the hero (attribute
 * removed, resting pose) and coming back (attribute added again) replays it
 * with no timers or animation events to clean up, and it cannot retrigger
 * while the hero stays the active section.
 *
 * The server render has `motionMode: 'static'`, so the attribute is absent
 * there and without JavaScript: the resting logo is what ships in the HTML,
 * and the first twirl starts only once the client has measured.
 */
const props = defineProps<{
  /** Whether the hero is the section the reader is on. */
  active: boolean
  /** `static` (server render, reduced motion) never animates. */
  motionMode: LandingMotionMode
}>()

const playing = computed(() => props.active && props.motionMode !== 'static')

/* The ghost outline; drawn on both faces so the back has the same shape. */
const BODY_PATH =
  'M32 8C19.85 8 10 17.85 10 30V54L17.33 47.5L24.67 54L32 47.5L39.33 54L46.67 47.5L54 54V30C54 17.85 44.15 8 32 8Z'
</script>

<template>
  <div
    class="ghost-landing__hero-mark ghost-landing-mark"
    :data-landing-mark="playing ? 'playing' : undefined"
  >
    <!--
      The tile above keeps the `ghost-landing__hero-mark` box from
      `landing-page.css` and stays still; only this span turns. (Comments
      stay inside the root so the component has a single root element.)

      One labelled image for both faces. The SVGs are presentational so the
      back face never shows up as a second, unnamed graphic.
    -->
    <span
      class="ghost-landing-mark__turn"
      role="img"
      aria-label="GhostVue Phantom V logo"
    >
      <svg
        class="ghost-landing-mark__face ghost-landing-mark__face--front"
        width="44"
        height="44"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          :d="BODY_PATH"
          fill="var(--ghost-action-primary-bg)"
          fill-opacity="0.18"
          stroke="var(--ghost-action-primary-bg)"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          d="M20 24L32 44L44 24H36.5L32 32L27.5 24H20Z"
          fill="var(--ghost-action-primary-bg)"
        />
        <circle cx="24.5" cy="18.5" r="2.2" fill="var(--ghost-surface-fg)" />
        <circle
          class="ghost-landing-mark__wink"
          cx="39.5"
          cy="18.5"
          r="2.2"
          fill="var(--ghost-surface-fg)"
        />
      </svg>
      <!--
        The back of the ghost: the body alone, with no eyes and no V. A flat
        SVG seen from behind is a mirror image of its front, face included,
        so the back is a second face that only shows while the ghost is
        turned away.
      -->
      <svg
        class="ghost-landing-mark__face ghost-landing-mark__face--back"
        width="44"
        height="44"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          :d="BODY_PATH"
          fill="var(--ghost-action-primary-bg)"
          fill-opacity="0.18"
          stroke="var(--ghost-action-primary-bg)"
          stroke-width="3"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  </div>
</template>

<style src="./landing-hero-mark.css"></style>
