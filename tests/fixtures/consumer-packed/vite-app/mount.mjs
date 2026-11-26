/**
 * Mounts the production bundle from `dist/` in jsdom, drives each component
 * once, and prints what it observed as JSON for the smoke script to judge.
 * Runs inside the scratch consumer, so it only sees the installed tarballs.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { JSDOM } from 'jsdom'

// jsdom neither runs scripts nor loads subresources by default. Scripts and
// stylesheet links are still removed from the parsed document: the bundle is
// imported directly below, and jsdom does not apply CSS layout anyway.
const { window } = new JSDOM(readFileSync('dist/index.html', 'utf8'), {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
for (const node of window.document.querySelectorAll('script, link')) {
  node.remove()
}
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) continue
  Object.defineProperty(globalThis, key, {
    configurable: true,
    get: () => window[key],
  })
}

const errors = []
window.addEventListener('error', (event) => {
  errors.push(String(event.error ?? event.message))
})
process.on('unhandledRejection', (reason) => errors.push(String(reason)))

const entry = readdirSync('dist/assets').find((file) => file.endsWith('.js'))
await import(pathToFileURL(`dist/assets/${entry}`).href)

// Vue flushes on microtasks; transitions and focus moves may use timers.
const settle = () => new Promise((resolve) => setTimeout(resolve, 50))
const smoke = (name) => document.querySelector(`[data-smoke="${name}"]`)
const dialogs = () =>
  [...document.querySelectorAll('[role="dialog"]')].map((dialog) =>
    dialog.textContent.replace(/\s+/g, ' ').trim(),
  )
await settle()

const input = smoke('input')
const selectTrigger = smoke('select-trigger')
const result = {
  mounted: Boolean(document.querySelector('#app main')),
  input: {
    tag: input?.tagName ?? null,
    value: input?.value ?? null,
    label:
      document.querySelector(`label[for="${input?.id}"]`)?.textContent.trim() ??
      null,
  },
  select: {
    role: selectTrigger?.getAttribute('role') ?? null,
    value: selectTrigger?.textContent.trim() ?? null,
  },
}

selectTrigger?.click()
await settle()
result.select.options = [
  ...document.querySelectorAll('[role="listbox"] [role="option"]'),
].map((option) => option.textContent.trim())

smoke('dialog-trigger')?.click()
await settle()
result.dialog = { open: dialogs() }
smoke('dialog-close')?.click()
await settle()
result.dialog.afterClose = dialogs()

smoke('drawer-trigger')?.click()
await settle()
result.drawer = { open: dialogs() }

smoke('toast-trigger')?.click()
await settle()
result.toast = {
  shown: document.body.textContent.includes('Draft saved'),
}

result.errors = errors
console.log(JSON.stringify(result))
// jsdom timers (focus traps, toast lifetimes) would otherwise keep Node alive.
process.exit(0)
