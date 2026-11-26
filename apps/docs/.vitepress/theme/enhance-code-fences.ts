import { createCopyCodeIconElement } from './copy-code-icon'
import { DEMO_COPY_STATUS_MS, copyToClipboard } from './demo-preview-controls'

const FENCE_COPY_SELECTOR = '.vp-doc div[class*="language-"] > button.copy'
const SHELL_LANG_RE = /language-(shellscript|shell|bash|sh|zsh)\b/
const SHELL_PROMPT_RE = /^ *(\$|>) /gm

const copyTimers = new WeakMap<
  HTMLButtonElement,
  ReturnType<typeof setTimeout>
>()
const copyRequests = new WeakMap<HTMLButtonElement, number>()
let listenerInstalled = false

function clearButtonTimer(button: HTMLButtonElement): void {
  const timer = copyTimers.get(button)
  if (timer !== undefined) {
    clearTimeout(timer)
    copyTimers.delete(button)
  }
}

function getFenceStatusRegion(fence: Element): HTMLSpanElement | null {
  return fence.querySelector(':scope > .ghost-code-copy-status')
}

function ensureFenceStatusRegion(fence: Element): HTMLSpanElement {
  const existing = getFenceStatusRegion(fence)
  if (existing) return existing
  const status = document.createElement('span')
  status.className = 'ghost-code-copy-status'
  status.setAttribute('role', 'status')
  fence.append(status)
  return status
}

function extractFenceCodeText(fence: Element): string {
  const pre = fence.querySelector(':scope > pre')
  if (!pre) return ''
  const clone = pre.cloneNode(true)
  if (clone instanceof Element) {
    clone.querySelectorAll('.vp-copy-ignore, .diff.remove').forEach((node) => {
      node.remove()
    })
  }
  let text = clone.textContent ?? ''
  if (SHELL_LANG_RE.test(fence.className)) {
    text = text.replace(SHELL_PROMPT_RE, '').trim()
  }
  return text
}

function selectFenceCodeForManualCopy(fence: Element): void {
  const target =
    fence.querySelector(':scope > pre code') ??
    fence.querySelector(':scope > pre')
  const selection = window.getSelection()
  if (!target || !selection) return
  const range = document.createRange()
  range.selectNodeContents(target)
  selection.removeAllRanges()
  selection.addRange(range)
}

async function handleFenceCopy(button: HTMLButtonElement): Promise<void> {
  const fence = button.closest('div[class*="language-"]')
  if (!fence) return

  const request = (copyRequests.get(button) ?? 0) + 1
  copyRequests.set(button, request)
  clearButtonTimer(button)

  const status = ensureFenceStatusRegion(fence)
  button.classList.remove('copied')
  delete button.dataset.copied
  delete button.dataset.state
  status.textContent = ''
  delete status.dataset.state

  // Yield a microtask so clearing the status region lets AT re-announce
  // repeated identical "Copied" confirmations.
  await Promise.resolve()
  if (copyRequests.get(button) !== request) return

  const copied = await copyToClipboard(extractFenceCodeText(fence))
  if (copyRequests.get(button) !== request) return

  if (copied) {
    button.classList.add('copied')
    button.dataset.copied = ''
    button.dataset.state = 'copied'
    status.dataset.state = 'copied'
    status.textContent = 'Copied'

    const timer = setTimeout(() => {
      button.classList.remove('copied')
      delete button.dataset.copied
      delete button.dataset.state
      delete status.dataset.state
      status.textContent = ''
      copyTimers.delete(button)
    }, DEMO_COPY_STATUS_MS)
    copyTimers.set(button, timer)
  } else {
    button.dataset.state = 'failed'
    status.dataset.state = 'failed'
    status.textContent =
      'Copy failed. The code is selected; press Ctrl+C or ⌘C.'
    selectFenceCodeForManualCopy(fence)
  }
}

function onDocumentClickCapture(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest(FENCE_COPY_SELECTOR)
  if (!(button instanceof HTMLButtonElement)) return
  // DemoPreview hides VP's button.copy and owns its own header Copy button.
  if (button.closest('.ghost-example__source')) return

  // Intercept before VitePress's window-level useCopyCode() listener so we
  // preserve focus, guard out-of-order promises, announce via role="status",
  // and select text on clipboard failure.
  event.stopPropagation()
  void handleFenceCopy(button)
}

/**
 * Hydrate standalone VitePress markdown code fences with the unified 16px
 * Copy/Checkmark SVG control, stable accessible label, and polite status
 * live region, and install the capture-phase copy handler once.
 */
export function enhanceMarkdownCodeFences(): void {
  if (typeof document === 'undefined') return

  if (!listenerInstalled) {
    document.addEventListener('click', onDocumentClickCapture, {
      capture: true,
    })
    listenerInstalled = true
  }

  for (const button of document.querySelectorAll(FENCE_COPY_SELECTOR)) {
    if (!(button instanceof HTMLButtonElement)) continue
    if (button.closest('.ghost-example__source')) continue
    if (button.dataset.ghostEnhanced === 'true') continue

    const fence = button.closest('div[class*="language-"]')
    if (!fence) continue

    button.dataset.ghostEnhanced = 'true'
    button.type = 'button'

    const lang = fence.querySelector(':scope > span.lang')?.textContent.trim()
    if (!button.getAttribute('aria-label')) {
      button.setAttribute(
        'aria-label',
        lang ? `Copy ${lang} code` : 'Copy code',
      )
    }
    button.removeAttribute('title')

    button.replaceChildren(createCopyCodeIconElement())
    ensureFenceStatusRegion(fence)
  }
}
