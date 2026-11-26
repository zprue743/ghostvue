import { createHash } from 'node:crypto'

/**
 * Five fixed UI-building tasks based on shipped GhostVue primitives
 * (GHO-23 / issue #306). Prompt hashes and versions are pinned in every run's
 * stored report so cross-run comparisons know when a prompt or contract changed.
 */
export const EVAL_TASK_SET_VERSION = '1.0.0'

/**
 * @param {{
 *   id: string
 *   version: string
 *   prompt: string
 *   expectedPrimitives: readonly string[]
 *   forbiddenIdentifiers: readonly string[]
 * }} spec
 * @returns {string}
 */
function computePromptHash(spec) {
  return `sha256:${createHash('sha256')
    .update(
      JSON.stringify({
        id: spec.id,
        version: spec.version,
        prompt: spec.prompt,
        expectedPrimitives: spec.expectedPrimitives,
        forbiddenIdentifiers: spec.forbiddenIdentifiers,
      }),
    )
    .digest('hex')}`
}

/**
 * @param {Omit<import('./types.d.ts').EvalTaskDefinition, 'promptHash'>} definition
 * @returns {import('./types.d.ts').EvalTaskDefinition}
 */
function defineTask(definition) {
  return Object.freeze({
    ...definition,
    promptHash: computePromptHash(definition),
  })
}

/** @type {readonly import('./types.d.ts').EvalTaskDefinition[]} */
export const EVAL_TASKS = Object.freeze([
  defineTask({
    id: 'login-form',
    version: '1.0.0',
    title: 'Login form',
    description:
      'Accessible email/password sign-in form with GhostField, GhostInput, GhostCheckbox, and GhostButton.',
    prompt: [
      'Build a self-contained Vue 3 `<script setup lang="ts">` Single-File Component using `@ghostvue/themes` primitives for a sign-in form.',
      'Requirements:',
      '- Use `GhostCard`, `GhostField`, `GhostFieldLabel`, `GhostFieldControl`, `GhostFieldError`, `GhostInput`, `GhostCheckbox`, and `GhostButton`.',
      '- Render an email input labeled `"Email"` (`type="email"`, required) and a password input labeled `"Password"` (`type="password"`, required).',
      '- Render a `"Remember me"` `GhostCheckbox` and a `"Sign in"` submit `GhostButton`.',
      '- On invalid submit (empty/malformed email or password shorter than 8 characters), prevent default form submission, mark invalid fields with `invalid` (`aria-invalid="true"`), and show field errors via `GhostFieldError`.',
      '- On valid submit, render a `role="status"` message containing `"Signed in as <email>"`.',
      '- Return only the complete Vue SFC inside a single ```vue code fence.',
    ].join('\n'),
    expectedPrimitives: [
      'GhostCard',
      'GhostField',
      'GhostFieldLabel',
      'GhostFieldControl',
      'GhostFieldError',
      'GhostInput',
      'GhostCheckbox',
      'GhostButton',
    ],
    forbiddenIdentifiers: [],
    checks: [
      {
        id: 'login-empty-submit-invalid',
        category: 'behavior',
        description:
          'Submitting empty fields sets aria-invalid="true" on Email and renders an error alert.',
      },
      {
        id: 'login-valid-submit-status',
        category: 'behavior',
        description:
          'Submitting valid email and password renders a polite status confirmation.',
      },
      {
        id: 'login-keyboard-tab-and-space',
        category: 'keyboard',
        description:
          'Tab moves sequentially across Email, Password, Remember me, and Sign in; Space toggles Remember me; Enter submits.',
      },
    ],
    axeStates: ['initial', 'validation-error', 'submitted'],
    visualStates: ['initial', 'validation-error'],
  }),

  defineTask({
    id: 'settings-dialog',
    version: '1.0.0',
    title: 'Settings dialog',
    description:
      'Modal workspace settings dialog with GhostDialog, GhostSwitch, GhostField, and GhostInput.',
    prompt: [
      'Build a self-contained Vue 3 `<script setup lang="ts">` Single-File Component using `@ghostvue/themes` primitives for a workspace settings modal dialog.',
      'Requirements:',
      '- Use `GhostDialog`, `GhostDialogTrigger`, `GhostDialogOverlay`, `GhostDialogContent`, `GhostDialogTitle`, `GhostDialogDescription`, `GhostDialogClose`, `GhostField`, `GhostFieldLabel`, `GhostFieldControl`, `GhostInput`, `GhostSwitch`, and `GhostButton`.',
      '- Render an `"Open settings"` trigger button and a page summary showing the saved display name (`"Ada Lovelace"` initially) and notification state.',
      '- Inside the dialog (`GhostDialogTitle` `"Settings"`), include a `GhostInput` labeled `"Display name"` and a `GhostSwitch` labeled `"Email notifications"` (using `<label for=...>`).',
      '- Edit a draft copy so `"Cancel"` or `Escape` discards unsaved edits and restores focus to `"Open settings"`; `"Save settings"` commits the draft, closes the dialog, and updates the page summary.',
      '- Return only the complete Vue SFC inside a single ```vue code fence.',
    ].join('\n'),
    expectedPrimitives: [
      'GhostDialog',
      'GhostDialogTrigger',
      'GhostDialogOverlay',
      'GhostDialogContent',
      'GhostDialogTitle',
      'GhostDialogDescription',
      'GhostDialogClose',
      'GhostSwitch',
      'GhostInput',
      'GhostButton',
    ],
    forbiddenIdentifiers: [],
    checks: [
      {
        id: 'dialog-open-and-role',
        category: 'behavior',
        description:
          'Activating "Open settings" renders role="dialog" with aria-modal="true" and Settings heading.',
      },
      {
        id: 'dialog-save-updates-summary',
        category: 'behavior',
        description:
          'Editing Display name, toggling Email notifications, and clicking "Save settings" closes the dialog and updates the summary.',
      },
      {
        id: 'dialog-keyboard-trap-escape-switch',
        category: 'keyboard',
        description:
          'Focus stays trapped inside the open dialog on Tab/Shift+Tab, Space toggles the switch aria-checked, and Escape discards draft changes and restores focus to the trigger.',
      },
    ],
    axeStates: ['closed', 'open'],
    visualStates: ['closed', 'open'],
  }),

  defineTask({
    id: 'async-combobox-search',
    version: '1.0.0',
    title: 'Async Combobox search',
    description:
      'Asynchronous searchable assignee picker using GhostCombobox and useGhostComboboxAsyncSearch with race protection.',
    prompt: [
      'Build a self-contained Vue 3 `<script setup lang="ts">` Single-File Component using `@ghostvue/themes` primitives for an async assignee search combobox.',
      'Requirements:',
      '- Use `GhostCombobox`, `GhostComboboxInput`, `GhostComboboxContent`, `GhostComboboxOption`, `GhostComboboxEmpty`, `GhostField`, `GhostFieldLabel`, `GhostFieldControl`, `GhostSpinner`, and `useGhostComboboxAsyncSearch`.',
      '- Seed a deterministic local directory containing at least `"Maya Chen"`, `"Amara Okafor"`, and `"Tomas Novak"`.',
      '- Simulate async search with query-dependent latency where shorter queries resolve slower than longer queries (e.g. `"a"` ~180ms, `"am"` ~30ms), and guard updates with `useGhostComboboxAsyncSearch` (`begin`, `isLatest`) so stale responses never overwrite newer queries.',
      '- Label the combobox `"Search assignee"`. Show the selected assignee in a `role="status"` element and show an empty state inside `GhostComboboxEmpty` when no records match (e.g. `"zzz"`).',
      '- Return only the complete Vue SFC inside a single ```vue code fence.',
    ].join('\n'),
    expectedPrimitives: [
      'GhostCombobox',
      'GhostComboboxInput',
      'GhostComboboxContent',
      'GhostComboboxOption',
      'GhostComboboxEmpty',
      'useGhostComboboxAsyncSearch',
    ],
    forbiddenIdentifiers: [],
    checks: [
      {
        id: 'combobox-async-race-and-empty',
        category: 'behavior',
        description:
          'Typing "a" then "am" quickly settles on "Amara Okafor" without stale overwrite; typing "zzz" renders the empty state.',
      },
      {
        id: 'combobox-keyboard-arrows-enter-escape',
        category: 'keyboard',
        description:
          'ArrowDown updates aria-activedescendant, Enter selects the active option and updates the status, and Escape closes the listbox while keeping focus on the input.',
      },
    ],
    axeStates: ['closed', 'results-open', 'empty-open'],
    visualStates: ['closed', 'results-open'],
  }),

  defineTask({
    id: 'paginated-table',
    version: '1.0.0',
    title: 'Paginated table',
    description:
      'Paginated data view built from shipped GhostTable and GhostPagination primitives (must NOT use GhostDataTable).',
    prompt: [
      'Build a self-contained Vue 3 `<script setup lang="ts">` Single-File Component using `@ghostvue/themes` and `@ghostvue/vue` primitives for a paginated members/invoices table.',
      'Requirements:',
      '- Use `GhostTable` (and `GhostTableCaption`, `GhostTableHead`, `GhostTableBody`, `GhostTableRow`, `GhostTableHeaderCell`, `GhostTableCell` from `@ghostvue/vue`) together with `GhostPagination`.',
      '- Do NOT import or use `GhostDataTable` or `useGhostDataTable` (this task tests composing shipped `GhostTable` + `GhostPagination`).',
      '- Seed 12 deterministic rows (e.g. `"Row 01"` through `"Row 12"`) with page size 5 (3 pages total).',
      '- Render a `<caption>`, `scope="col"` headers, a `role="status"` range summary (`"Showing 1–5 of 12"`), and `GhostPagination` with `v-model="page"` and `:page-count="3"`.',
      '- Return only the complete Vue SFC inside a single ```vue code fence.',
    ].join('\n'),
    expectedPrimitives: [
      'GhostTable',
      'GhostTableCaption',
      'GhostTableHead',
      'GhostTableBody',
      'GhostTableRow',
      'GhostTableHeaderCell',
      'GhostTableCell',
      'GhostPagination',
    ],
    forbiddenIdentifiers: ['GhostDataTable', 'useGhostDataTable'],
    checks: [
      {
        id: 'table-semantics-and-page-slice',
        category: 'behavior',
        description:
          'Renders semantic role="table" with caption, 5 rows on page 1, and updates rows + range summary when changing to page 2 and page 3.',
      },
      {
        id: 'pagination-keyboard-navigation-and-boundary',
        category: 'keyboard',
        description:
          'Focusing pagination controls and pressing Enter advances pages, updates aria-current="page", preserves focus, and disables Next page on the last page.',
      },
    ],
    axeStates: ['page-1', 'page-2'],
    visualStates: ['page-1', 'page-2'],
  }),

  defineTask({
    id: 'validation-error-form',
    version: '1.0.0',
    title: 'Validation and error form',
    description:
      'Form validation flow with GhostInlineAlert error summary, GhostFieldError, aria-invalid, and focus-first-invalid behavior.',
    prompt: [
      'Build a self-contained Vue 3 `<script setup lang="ts">` Single-File Component using `@ghostvue/themes` primitives for creating a workspace with client-side validation and accessible error reporting.',
      'Requirements:',
      '- Use `GhostField`, `GhostFieldLabel`, `GhostFieldDescription`, `GhostFieldControl`, `GhostFieldError`, `GhostInput`, `GhostInlineAlert`, and `GhostButton`.',
      '- Render a `"Workspace name"` input (required, min 3 characters) and a `"Contact email"` input (required, valid email format), plus a `"Create workspace"` submit `GhostButton`.',
      '- On invalid submit (`novalidate` form), render a `GhostInlineAlert` (`tone="danger"`) error summary with `role="alert"` and per-field `GhostFieldError` messages, set `invalid` on failing `GhostField`s (`aria-invalid="true"`), and move focus to the first invalid control.',
      '- Fixing the inputs and submitting valid values clears errors/summary and renders a `role="status"` confirmation message (`"Created workspace <name>"`).',
      '- Return only the complete Vue SFC inside a single ```vue code fence.',
    ].join('\n'),
    expectedPrimitives: [
      'GhostField',
      'GhostFieldLabel',
      'GhostFieldDescription',
      'GhostFieldControl',
      'GhostFieldError',
      'GhostInput',
      'GhostInlineAlert',
      'GhostButton',
    ],
    forbiddenIdentifiers: [],
    checks: [
      {
        id: 'validation-alert-summary-and-field-errors',
        category: 'behavior',
        description:
          'Invalid submit renders GhostInlineAlert error summary, sets aria-invalid="true", and valid resubmit clears errors and announces creation.',
      },
      {
        id: 'validation-keyboard-focus-first-invalid',
        category: 'keyboard',
        description:
          'Submitting invalid data via keyboard moves real browser focus to the first invalid control.',
      },
    ],
    axeStates: ['initial', 'error-state', 'submitted'],
    visualStates: ['initial', 'error-state'],
  }),
])

/**
 * @param {readonly string[]} [selectedIds]
 * @returns {readonly import('./types.d.ts').EvalTaskDefinition[]}
 */
export function resolveEvalTasks(selectedIds) {
  if (!selectedIds || selectedIds.length === 0) {
    return EVAL_TASKS
  }
  const byId = new Map(EVAL_TASKS.map((task) => [task.id, task]))
  return selectedIds.map((id) => {
    const task = byId.get(
      /** @type {import('./types.d.ts').EvalTaskDefinition['id']} */ (id),
    )
    if (!task) {
      throw new Error(
        `Unknown eval task "${id}". Valid tasks: ${EVAL_TASKS.map((t) => t.id).join(', ')}`,
      )
    }
    return task
  })
}
