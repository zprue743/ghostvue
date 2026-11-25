<script setup lang="ts">
import { GhostLink } from '@ghostvue/vue'

import { landingSections, type LandingSectionId } from './landing-motion'

/*
 * Section rail for the landing page: a fixed column of markers on the right
 * edge that shows which section the reader is on and how far through the
 * page they are. It is ordinary navigation (a labelled `<nav>` of links), so
 * it works without JavaScript as plain fragment links; the click handler only
 * adds smooth scrolling and focus management on top.
 *
 * Bespoke on purpose: GhostVue has no scroll-spy or section-navigation
 * component yet. The links themselves are headless `GhostLink`s.
 */
const props = defineProps<{
  /** Section the reader is currently on. */
  activeId: LandingSectionId
}>()

function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

function goToSection(event: MouseEvent, id: LandingSectionId): void {
  // Modified clicks keep their browser meaning (open in a new tab, and so on).
  if (!isPlainClick(event)) return
  const target = document.getElementById(id)
  if (!target) return
  event.preventDefault()
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  // Replace rather than push: stepping through sections should not bury the
  // previous page under one history entry per marker.
  history.replaceState(history.state, '', `#${id}`)
  target.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'start',
  })
  // Move focus with the viewport so the next Tab continues inside the
  // section instead of returning to the top of the page.
  target.focus({ preventScroll: true })
}

function markerNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}
</script>

<template>
  <!--
    `vp-raw` opts these links out of VitePress's router, whose capture-phase
    click listener would otherwise jump to the fragment instantly and cancel
    the scroll started in `goToSection`.
  -->
  <nav class="ghost-landing-rail vp-raw" aria-label="Page sections">
    <!-- Decorative thread, progress fill, and the ghost that rides it. -->
    <span class="ghost-landing-rail__thread" aria-hidden="true">
      <span class="ghost-landing-rail__fill"></span>
      <span class="ghost-landing-rail__traveller">
        <!--
          Three nested boxes so each behaviour owns one transform: the lean
          follows scroll direction, the arrival pop replays whenever the
          active section changes (the key remounts it, which restarts the
          CSS animation), and the SVG itself bobs while idle.
        -->
        <span class="ghost-landing-rail__lean">
          <span :key="props.activeId" class="ghost-landing-rail__arrival">
            <svg
              class="ghost-landing-rail__ghost"
              viewBox="0 0 64 64"
              width="22"
              height="22"
              focusable="false"
            >
              <path
                class="ghost-landing-rail__ghost-body"
                d="M32 8C19.85 8 10 17.85 10 30V54L17.33 47.5L24.67 54L32 47.5L39.33 54L46.67 47.5L54 54V30C54 17.85 44.15 8 32 8Z"
              />
              <g class="ghost-landing-rail__ghost-eyes">
                <circle cx="24.5" cy="27" r="3.4" />
                <circle cx="39.5" cy="27" r="3.4" />
              </g>
            </svg>
          </span>
        </span>
      </span>
    </span>
    <ol class="ghost-landing-rail__list">
      <li
        v-for="(section, index) in landingSections"
        :key="section.id"
        class="ghost-landing-rail__item"
      >
        <GhostLink
          :href="`#${section.id}`"
          class="ghost-landing-rail__link"
          :aria-current="props.activeId === section.id ? 'location' : undefined"
          :data-testid="`landing-rail-${section.id}`"
          @click="goToSection($event, section.id)"
        >
          <span class="ghost-landing-rail__label">
            <span class="ghost-landing-rail__number" aria-hidden="true">{{
              markerNumber(index)
            }}</span>
            {{ section.label }}
          </span>
          <span class="ghost-landing-rail__marker" aria-hidden="true"></span>
        </GhostLink>
      </li>
    </ol>
  </nav>
</template>

<style src="./landing-rail.css"></style>
