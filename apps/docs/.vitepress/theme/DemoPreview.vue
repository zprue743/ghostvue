<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useTemplateRef,
} from 'vue'

import { GhostButton } from '@ghostvue/themes'

import {
  DEMO_COPY_STATUS_MS,
  DEMO_PREVIEW_MIN_WIDTH,
  DEMO_PREVIEW_PRESETS,
  type DemoPreviewWidth,
  copyToClipboard,
  describePreviewWidth,
  resolvePreviewWidth,
} from './demo-preview-controls'

/**
 * Presentational frame shared by every live docs demo: header (title, layer
 * badge, description, toolbar), optional controls, a preview-width band, a
 * block-layout canvas, and a collapsed source disclosure. It knows nothing
 * about the example registry; `GhostExample` adapts a registered id into
 * these props and slots.
 *
 * The `ghost-example*` class names are the stable hooks for
 * `docs-demo-compat.css` and the docs e2e suites, so they stay unchanged even
 * though the frame now lives in its own component.
 */
const props = defineProps<{
  /** Visible demo title; also names the toolbar and source region. */
  title: string
  /** `headless` shows a badge and opts the canvas into native-control resets. */
  layer?: 'headless' | 'themed' | undefined
  /** One-line summary under the title. */
  description?: string | undefined
  /**
   * Original SFC text for the Copy action. The highlighted `source` slot is
   * display markup; copying always uses this unhighlighted original so
   * clipboard output matches the file on disk. Omit it to hide Copy.
   */
  sourceText?: string | undefined
}>()

const slots = defineSlots<{
  /** The live demo. The example owns its own internal layout. */
  default?: () => unknown
  /** Extra toolbar actions rendered after the built-in actions. */
  actions?: () => unknown
  /** Optional demo controls rendered between the header and the canvas. */
  controls?: () => unknown
  /** Highlighted source, revealed by the toolbar's Code disclosure. */
  source?: () => unknown
}>()

const uid = useId()
const sourceRegionId = `ghost-example-source-${uid}`
const sourceToggleId = `ghost-example-source-toggle-${uid}`
const widthRegionId = `ghost-example-width-${uid}`
const widthToggleId = `ghost-example-width-toggle-${uid}`
const widthLegendId = `ghost-example-width-legend-${uid}`
const widthReportId = `ghost-example-width-report-${uid}`
const widthRadioName = `ghost-example-width-${uid}`

const sourceRegion = useTemplateRef<HTMLElement>('sourceRegion')
const widthRegion = useTemplateRef<HTMLElement>('widthRegion')
const preview = useTemplateRef<HTMLElement>('preview')

/*
 * Collapsed by default so the live demo leads and the code stays secondary.
 * The state lives on the frame, not the demo, and the region uses `v-show`,
 * so toggling never remounts or resets the preview and the highlighted markup
 * stays in the SSR output.
 */
const sourceOpen = ref(false)
const widthOpen = ref(false)

/**
 * Hiding a region that holds focus would drop focus to `<body>`. Keyboard
 * users cannot do that (the toggle sits outside the region), but a pointer
 * click in Safari does not move focus to the button, so focus can still be
 * inside the region. Send it to the toggle that collapsed the region.
 */
function collapseKeepingFocus(
  region: HTMLElement | null,
  toggleId: string,
): void {
  if (region?.contains(document.activeElement)) {
    document.getElementById(toggleId)?.focus()
  }
}

function toggleSource(): void {
  if (sourceOpen.value) collapseKeepingFocus(sourceRegion.value, sourceToggleId)
  sourceOpen.value = !sourceOpen.value
}

function toggleWidth(): void {
  if (widthOpen.value) collapseKeepingFocus(widthRegion.value, widthToggleId)
  widthOpen.value = !widthOpen.value
}

/*
 * Preview width. This narrows the demo canvas only: it is not viewport or
 * device emulation, so media queries still see the real window. Demos that
 * want to react query the `ghost-demo` container instead. The setting
 * persists while the band is collapsed so collapsing never moves the demo.
 */
const requestedWidth = ref<DemoPreviewWidth>('auto')
/** Canvas content width; `undefined` until measured on the client. */
const availableWidth = ref<number>()
const appliedWidth = computed(() =>
  resolvePreviewWidth(requestedWidth.value, availableWidth.value),
)
const widthReport = computed(() =>
  describePreviewWidth(requestedWidth.value, availableWidth.value),
)
/*
 * The range tops out at the measured canvas so every stop is reachable. The
 * 1200 fallback only covers SSR and an unmeasured (hidden) frame; CSS `min()`
 * still caps whatever it requests.
 */
const rangeMax = computed(() =>
  Math.max(DEMO_PREVIEW_MIN_WIDTH, availableWidth.value ?? 1200),
)
const rangeValue = computed(() => appliedWidth.value ?? rangeMax.value)

function onRangeInput(event: Event): void {
  if (event.target instanceof HTMLInputElement) {
    requestedWidth.value = Number(event.target.value)
  }
}

let resizeObserver: ResizeObserver | undefined

function measureAvailableWidth(): void {
  const element = preview.value
  if (!element) return
  const style = getComputedStyle(element)
  const width = Math.floor(
    element.clientWidth -
      (Number.parseFloat(style.paddingInlineStart) || 0) -
      (Number.parseFloat(style.paddingInlineEnd) || 0),
  )
  // A frame inside a hidden ancestor (collapsed tab, `display: none`)
  // measures 0; treat that as unknown rather than reporting a 0px cap.
  availableWidth.value = width > 0 ? width : undefined
}

onMounted(() => {
  measureAvailableWidth()
  // Absent in old browsers and jsdom; the CSS cap still applies without it.
  if (typeof ResizeObserver === 'function' && preview.value) {
    resizeObserver = new ResizeObserver(measureAvailableWidth)
    resizeObserver.observe(preview.value)
  }
})

/*
 * Copy. Success and failure go through one polite live region so they are
 * announced without moving focus. The button label stays constant so the
 * toolbar does not reflow under the pointer.
 */
type CopyState = 'idle' | 'copied' | 'failed'
const copyState = ref<CopyState>('idle')
let copyTimer: ReturnType<typeof setTimeout> | undefined

function clearCopyTimer(): void {
  if (copyTimer !== undefined) {
    clearTimeout(copyTimer)
    copyTimer = undefined
  }
}

/**
 * Without a clipboard (insecure origin, denied permission, embedded frame),
 * open the source and select its text so Ctrl/Cmd+C still works.
 */
async function revealSourceForManualCopy(): Promise<void> {
  sourceOpen.value = true
  await nextTick()
  const target =
    sourceRegion.value?.querySelector('pre code') ?? sourceRegion.value
  const selection = window.getSelection()
  if (!target || !selection) return
  const range = document.createRange()
  range.selectNodeContents(target)
  selection.removeAllRanges()
  selection.addRange(range)
}

/*
 * Clipboard writes settle in any order (a permission prompt can hold one
 * back), so only the latest request may set the status; an older write that
 * settles late must not replace a newer "copied" with "failed".
 */
let copyRequest = 0

async function copySource(): Promise<void> {
  const request = ++copyRequest
  clearCopyTimer()
  // Reset first so a repeated identical message is announced again.
  copyState.value = 'idle'
  await nextTick()
  const copied = await copyToClipboard(`${props.sourceText ?? ''}\n`)
  if (request !== copyRequest) return
  if (copied) {
    copyState.value = 'copied'
    copyTimer = setTimeout(() => {
      copyState.value = 'idle'
      copyTimer = undefined
    }, DEMO_COPY_STATUS_MS)
  } else {
    copyState.value = 'failed'
    await revealSourceForManualCopy()
  }
}

onBeforeUnmount(() => {
  clearCopyTimer()
  resizeObserver?.disconnect()
})
</script>

<template>
  <figure class="ghost-example" :data-example-layer="props.layer">
    <figcaption class="ghost-example__header">
      <div class="ghost-example__intro">
        <div class="ghost-example__heading">
          <span class="ghost-example__title">{{ title }}</span>
          <span v-if="layer === 'headless'" class="ghost-example__badge">
            Headless
          </span>
        </div>
        <p v-if="description" class="ghost-example__description">
          {{ description }}
        </p>
      </div>
      <!--
        A plain group, not role="toolbar": a toolbar promises arrow-key roving,
        and a few buttons read fine as ordinary Tab stops.
      -->
      <div
        class="ghost-example__toolbar"
        role="group"
        :aria-label="`${title} actions`"
      >
        <!--
          Disclosure pattern: native buttons whose aria-expanded mirrors the
          region they control. Labels stay constant ("Code", "Width") so the
          controls do not change width or name when toggled; state is
          announced via aria-expanded and shown by the chevron.
        -->
        <GhostButton
          v-if="slots.source"
          :id="sourceToggleId"
          class="ghost-example__toggle"
          type="button"
          size="sm"
          variant="ghost"
          tone="neutral"
          :aria-expanded="sourceOpen ? 'true' : 'false'"
          :aria-controls="sourceRegionId"
          :aria-label="`${title} source code`"
          @click="toggleSource"
        >
          <svg
            class="ghost-example__chevron"
            aria-hidden="true"
            viewBox="0 0 16 16"
            width="12"
            height="12"
          >
            <path
              d="M6 3.5 10.5 8 6 12.5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
            />
          </svg>
          Code
        </GhostButton>
        <GhostButton
          v-if="sourceText"
          class="ghost-example__copy"
          type="button"
          size="sm"
          variant="ghost"
          tone="neutral"
          :aria-label="`Copy ${title} source`"
          @click="copySource"
        >
          Copy
        </GhostButton>
        <GhostButton
          :id="widthToggleId"
          class="ghost-example__toggle"
          type="button"
          size="sm"
          variant="ghost"
          tone="neutral"
          :aria-expanded="widthOpen ? 'true' : 'false'"
          :aria-controls="widthRegionId"
          :aria-label="`${title} preview width`"
          @click="toggleWidth"
        >
          <svg
            class="ghost-example__chevron"
            aria-hidden="true"
            viewBox="0 0 16 16"
            width="12"
            height="12"
          >
            <path
              d="M6 3.5 10.5 8 6 12.5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
            />
          </svg>
          Width
        </GhostButton>
        <slot name="actions" />
        <!--
          Always rendered (empty when idle) so assistive technology has
          registered the live region before the first message arrives.
        -->
        <span
          v-if="sourceText"
          class="ghost-example__copy-status"
          role="status"
          :data-state="copyState"
        >
          <template v-if="copyState === 'copied'">Copied</template>
          <template v-else-if="copyState === 'failed'">
            Copy failed. The source is selected below; press Ctrl+C or ⌘C.
          </template>
        </span>
      </div>
    </figcaption>

    <div
      v-if="slots.controls"
      class="ghost-example__controls"
      role="group"
      :aria-label="`${title} controls`"
    >
      <slot name="controls" />
    </div>

    <!--
      Native fieldset: the legend names the radio group and the range, and
      radios give arrow-key selection without custom key handling. The report
      is described-by text rather than a live region so dragging the range
      does not double-announce every pixel.
    -->
    <fieldset
      v-show="widthOpen"
      :id="widthRegionId"
      ref="widthRegion"
      class="ghost-example__width"
      data-testid="ghost-example-width"
      :aria-labelledby="widthLegendId"
    >
      <legend :id="widthLegendId" class="ghost-example__width-legend">
        Preview width
      </legend>
      <div class="ghost-example__width-presets">
        <label
          v-for="preset in DEMO_PREVIEW_PRESETS"
          :key="preset"
          class="ghost-example__width-preset"
        >
          <input
            class="ghost-example__width-radio"
            type="radio"
            :name="widthRadioName"
            :value="preset"
            :checked="requestedWidth === preset"
            :aria-describedby="widthReportId"
            @change="requestedWidth = preset"
          />
          <span>{{ preset === 'auto' ? 'Auto' : preset }}</span>
        </label>
      </div>
      <input
        class="ghost-example__width-range"
        type="range"
        :min="DEMO_PREVIEW_MIN_WIDTH"
        :max="rangeMax"
        step="1"
        :value="rangeValue"
        :aria-labelledby="widthLegendId"
        :aria-valuetext="`${String(rangeValue)} pixels`"
        :aria-describedby="widthReportId"
        @input="onRangeInput"
      />
      <span
        :id="widthReportId"
        class="ghost-example__width-report"
        data-testid="ghost-example-width-report"
      >
        {{ widthReport }}
      </span>
    </fieldset>

    <div
      ref="preview"
      class="ghost-example__preview"
      data-testid="ghost-example-preview"
    >
      <!--
        Named inline-size query container. Container queries resolve against
        this box, so demos that use `@container ghost-demo (...)` respond to
        the preview width. It deliberately has no `position`, transform, or
        `contain: layout`: inline popovers (`:portal="false"`) must keep
        `.ghost-example__preview` as their containing block, otherwise the
        stage's horizontal scroll box would start clipping them.
      -->
      <div
        class="ghost-example__viewport"
        data-testid="ghost-example-viewport"
        :data-constrained="appliedWidth === undefined ? undefined : ''"
        :style="
          requestedWidth === 'auto'
            ? undefined
            : { '--_demo-preview-width': `${String(requestedWidth)}px` }
        "
      >
        <div class="ghost-example__stage">
          <slot />
        </div>
      </div>
    </div>

    <div
      v-if="slots.source"
      v-show="sourceOpen"
      :id="sourceRegionId"
      ref="sourceRegion"
      class="ghost-example__source"
      data-testid="ghost-example-source"
      role="region"
      :aria-label="`${title} source`"
    >
      <slot name="source" />
    </div>
  </figure>
</template>
