<script setup lang="ts">
import { SlButton as SlButtonThemed } from '@slop-ui/themes'

const modes = ['light', 'dark'] as const
const tones = ['accent', 'neutral', 'danger'] as const

type DensityName = 'compact' | 'comfortable' | 'spacious'

const props = withDefaults(
  defineProps<{
    theme?: string
    densityFilter?: readonly DensityName[]
  }>(),
  { densityFilter: () => ['compact', 'comfortable', 'spacious'] as const },
)

const states = [
  { id: 'rest', label: 'Rest' },
  { id: 'hover', label: 'Hover' },
  { id: 'focus-visible', label: 'Focus' },
  { id: 'active', label: 'Pressed' },
  { id: 'loading', label: 'Loading' },
  { id: 'disabled', label: 'Disabled' },
] as const

const combined = [
  { id: 'hover-focus', label: 'Hover+focus' },
  { id: 'press-focus', label: 'Press+focus' },
  { id: 'loading-focus', label: 'Loading+focus' },
  { id: 'selected', label: 'Selected' },
] as const

function visualState(stateId: string) {
  if (
    stateId === 'rest' ||
    stateId === 'loading' ||
    stateId === 'disabled' ||
    stateId === 'selected'
  ) {
    return undefined
  }
  return stateId
}

function stateAttrs(
  mode: (typeof modes)[number],
  density: DensityName,
  tone: (typeof tones)[number],
  stateId: string,
) {
  const prefix = props.theme ? `${props.theme}-` : ''
  const attrs: Record<string, string> = {
    'data-testid': `matrix-${prefix}${mode}-${density}-${tone}-${stateId}`,
  }
  const visual = visualState(stateId)
  if (visual) attrs['data-visual-state'] = visual
  if (stateId === 'selected') attrs['aria-pressed'] = 'true'
  return attrs
}
</script>

<template>
  <section
    class="button-state-matrix"
    :aria-labelledby="
      theme
        ? `button-state-matrix-${theme}-heading`
        : 'button-state-matrix-heading'
    "
    :data-testid="
      theme ? `button-state-matrix-${theme}` : 'button-state-matrix'
    "
  >
    <h2
      :id="
        theme
          ? `button-state-matrix-${theme}-heading`
          : 'button-state-matrix-heading'
      "
    >
      SlButton state matrix{{ theme ? ` (${theme})` : '' }}
    </h2>
    <p>
      Frozen interaction states for visual regression. Hover, press, and focus
      use <code>data-visual-state</code>; loading and disabled use the public
      props. Combined states share the same CSS as native <code>:hover</code>,
      <code>:active</code>, and <code>:focus-visible</code>. Selected uses
      <code>aria-pressed</code> (not a headless SlButton model).
    </p>

    <div
      v-for="mode in modes"
      :key="mode"
      class="mode-block slop-theme"
      :data-sl-mode="mode"
      :data-sl-theme="theme"
    >
      <h3>{{ mode }}</h3>
      <div
        v-for="density in densityFilter"
        :key="`${mode}-${density}`"
        class="density-block"
        :data-sl-density="density"
        :data-testid="`button-matrix-${theme ? `${theme}-` : ''}${mode}-${density}`"
      >
        <h4>{{ density }}</h4>
        <div
          class="shot"
          :data-testid="`button-matrix-shot-${theme ? `${theme}-` : ''}${mode}-${density}`"
        >
          <div
            v-for="tone in tones"
            :key="tone"
            class="tone-row"
            :data-testid="`matrix-row-${mode}-${density}-${tone}`"
          >
            <span class="tone-label">{{ tone }}</span>
            <div class="buttons">
              <div v-for="state in states" :key="state.id" class="cell">
                <span class="cell-label">{{ state.label }}</span>
                <SlButtonThemed
                  :tone="tone"
                  :loading="state.id === 'loading'"
                  :disabled="state.id === 'disabled'"
                  v-bind="stateAttrs(mode, density, tone, state.id)"
                >
                  Action
                </SlButtonThemed>
              </div>
              <div v-for="state in combined" :key="state.id" class="cell">
                <span class="cell-label">{{ state.label }}</span>
                <SlButtonThemed
                  :tone="tone"
                  :loading="state.id === 'loading-focus'"
                  v-bind="stateAttrs(mode, density, tone, state.id)"
                >
                  Action
                </SlButtonThemed>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.button-state-matrix {
  display: grid;
  gap: 1rem;
  margin-block: 2rem;
  max-inline-size: 100%;
  min-inline-size: 0;
}

.mode-block,
.density-block,
.shot,
.tone-row,
.buttons,
.cell {
  min-inline-size: 0;
}

.mode-block,
.density-block {
  display: grid;
  gap: 0.75rem;
  max-inline-size: 100%;
  min-inline-size: 0;
}

.mode-block {
  padding: 1rem;
}

.mode-block h3,
.density-block h4 {
  font-size: 16px;
  height: 24px;
  line-height: 24px;
  margin: 0;
}

.shot {
  display: grid;
  gap: 8px;
  max-inline-size: 100%;
  overflow-x: auto;
}

.tone-row {
  align-items: end;
  display: grid;
  gap: 8px 12px;
  grid-template-columns: 72px max-content;
}

.tone-label {
  font-size: 12px;
  font-weight: 600;
  height: 16px;
  line-height: 16px;
  overflow: hidden;
  width: 72px;
}

.buttons {
  display: grid;
  gap: 8px 12px;
  grid-template-columns: repeat(10, 100px);
}

.cell {
  display: grid;
  gap: 4px;
  width: 100px;
}

.cell-label {
  display: block;
  font-size: 12px;
  height: 16px;
  line-height: 16px;
  overflow: hidden;
  width: 100px;
}
</style>
