<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'

import { GhostButton } from '@ghostvue/themes'

import { DEMO_COPY_STATUS_MS, copyToClipboard } from './demo-preview-controls'
import {
  type DemoPlaygroundControlSpec,
  type DemoPlaygroundOverrides,
  type DemoPlaygroundSpec,
  type DemoPlaygroundValue,
  demoPlaygroundValue,
  formatDemoPlaygroundBinding,
  summarizeDemoPlayground,
  withDemoPlaygroundValue,
} from './demo-playgrounds'

/**
 * Controls for a typed props playground, rendered in the `DemoPreview`
 * controls slot. It owns no demo state: the overrides live in
 * `GhostExample` (v-model), which binds them to the example as props. Reset
 * only clears overrides, so the source disclosure and preview width that
 * `DemoPreview` owns keep their state.
 */
const props = defineProps<{
  /** Example title, used to name the controls for assistive technology. */
  title: string
  playground: DemoPlaygroundSpec
}>()

const overrides = defineModel<DemoPlaygroundOverrides>({ required: true })

const uid = useId()
const fieldId = (prop: string): string => `ghost-playground-${uid}-${prop}`
const summaryId = `ghost-playground-summary-${uid}`
const failedBindingId = `ghost-playground-binding-${uid}`

const summary = computed(() =>
  summarizeDemoPlayground(props.playground, overrides.value),
)
const binding = computed(() =>
  formatDemoPlaygroundBinding(props.playground, overrides.value),
)

function valueOf(control: DemoPlaygroundControlSpec): DemoPlaygroundValue {
  return demoPlaygroundValue(control, overrides.value)
}

function update(
  control: DemoPlaygroundControlSpec,
  value: DemoPlaygroundValue,
): void {
  overrides.value = withDemoPlaygroundValue(overrides.value, control, value)
}

/*
 * Values are read back from the native control rather than trusted from the
 * event: a choice must be one of the adapter's declared options, so anything
 * else (a stale option after hot reload) is ignored instead of reaching the
 * demo as an unsupported prop value.
 */
function onChoice(control: DemoPlaygroundControlSpec, event: Event): void {
  if (control.kind !== 'choice') return
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = event.target.value
  if (control.options.includes(value)) update(control, value)
}

function onSwitch(control: DemoPlaygroundControlSpec, event: Event): void {
  if (control.kind !== 'switch') return
  if (event.target instanceof HTMLInputElement) {
    update(control, event.target.checked)
  }
}

/*
 * Copy props mirrors the frame's Copy action: one polite live region for
 * success and failure, a constant button label, and on failure the binding
 * is shown and selected so Ctrl/Cmd+C still works.
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

function selectFailedBinding(): void {
  const target = document.getElementById(failedBindingId)
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

async function copyBinding(): Promise<void> {
  const request = ++copyRequest
  clearCopyTimer()
  // Reset first so a repeated identical message is announced again.
  copyState.value = 'idle'
  await nextTick()
  const copied = await copyToClipboard(`${binding.value}\n`)
  if (request !== copyRequest) return
  if (copied) {
    copyState.value = 'copied'
    copyTimer = setTimeout(() => {
      copyState.value = 'idle'
      copyTimer = undefined
    }, DEMO_COPY_STATUS_MS)
  } else {
    copyState.value = 'failed'
    await nextTick()
    selectFailedBinding()
  }
}

function reset(): void {
  clearCopyTimer()
  copyState.value = 'idle'
  overrides.value = {}
}

onBeforeUnmount(clearCopyTimer)
</script>

<template>
  <div class="ghost-playground" data-testid="ghost-playground">
    <div class="ghost-playground__fields">
      <template v-for="control in playground.controls" :key="control.prop">
        <div
          v-if="control.kind === 'choice'"
          class="ghost-playground__field"
          :data-prop="control.prop"
        >
          <label class="ghost-playground__label" :for="fieldId(control.prop)">
            {{ control.label }}
          </label>
          <span class="ghost-playground__select-wrap">
            <select
              :id="fieldId(control.prop)"
              class="ghost-playground__select"
              :value="valueOf(control)"
              :aria-describedby="summaryId"
              @change="onChoice(control, $event)"
            >
              <option
                v-for="option in control.options"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <svg
              class="ghost-playground__select-icon"
              aria-hidden="true"
              viewBox="0 0 16 16"
              width="12"
              height="12"
            >
              <path
                d="M3.5 6 8 10.5 12.5 6"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
              />
            </svg>
          </span>
        </div>
        <div
          v-else
          class="ghost-playground__field ghost-playground__field--switch"
          :data-prop="control.prop"
        >
          <!--
            A native checkbox, not role="switch": "checked / not checked"
            matches a boolean prop and needs no custom key handling.
          -->
          <input
            :id="fieldId(control.prop)"
            class="ghost-playground__checkbox"
            type="checkbox"
            :checked="valueOf(control) === true"
            :aria-describedby="summaryId"
            @change="onSwitch(control, $event)"
          />
          <label class="ghost-playground__label" :for="fieldId(control.prop)">
            {{ control.label }}
          </label>
        </div>
      </template>
    </div>

    <div class="ghost-playground__footer">
      <!--
        The summary names only what differs from the original example, so it
        is never mistaken for the source below (which stays the original).
      -->
      <p
        :id="summaryId"
        class="ghost-playground__summary"
        data-testid="ghost-playground-summary"
      >
        Overrides:
        <code v-if="summary" class="ghost-playground__code">{{ summary }}</code>
        <span v-else>none, showing the original example</span>
      </p>
      <div class="ghost-playground__actions">
        <GhostButton
          class="ghost-playground__copy"
          type="button"
          size="sm"
          variant="ghost"
          tone="neutral"
          :aria-label="`Copy ${title} props binding`"
          @click="copyBinding"
        >
          Copy props
        </GhostButton>
        <GhostButton
          class="ghost-playground__reset"
          type="button"
          size="sm"
          variant="ghost"
          tone="neutral"
          :aria-label="`Reset ${title} settings`"
          @click="reset"
        >
          Reset
        </GhostButton>
      </div>
      <!-- Always rendered so the live region exists before it is used. -->
      <span
        class="ghost-playground__status"
        role="status"
        :data-state="copyState"
      >
        <template v-if="copyState === 'copied'">Props copied</template>
        <template v-else-if="copyState === 'failed'">
          Copy failed. Select the binding and press Ctrl+C or ⌘C:
          <code :id="failedBindingId" class="ghost-playground__code">{{
            binding
          }}</code>
        </template>
      </span>
    </div>
  </div>
</template>
