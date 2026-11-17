/**
 * Returns `true` when a keydown belongs to an active input method editor (IME)
 * composition, so component keyboard handlers must leave it alone.
 *
 * While a CJK (or other) IME is composing, Arrow keys move through the
 * candidate list, Enter confirms the candidate, Escape cancels the
 * composition, and printable keys extend the composition text. Treating those
 * keystrokes as widget commands would move a combobox/listbox highlight,
 * select an option, dismiss a popup, or run menu/listbox typeahead on keys the
 * user meant for the input method.
 *
 * Two signals are checked because no single one is reliable across engines:
 *
 * - `isComposing` is the standard signal and is `true` for keydowns dispatched
 *   between `compositionstart` and `compositionend` in Chromium and Firefox.
 * - `keyCode === 229` is the legacy "IME is processing this key" value. WebKit
 *   (Safari) dispatches `compositionend` *before* the keydown of the key that
 *   confirmed the composition (typically Enter), so that keydown arrives with
 *   `isComposing === false` but still reports `keyCode === 229`; some engines
 *   also report 229 without `isComposing` on the first composition keydown.
 *
 * `key === 'Process'` is deliberately not used as a substitute: WebKit's
 * IME-owned keydowns carry the physical key (for example `'Enter'` or
 * `'ArrowDown'`), so only `keyCode` identifies them. After composition has
 * ended and the IME no longer owns the key, browsers report the real
 * `keyCode`, so normal keyboard behavior resumes without extra state.
 */
export function isImeComposing(event: KeyboardEvent): boolean {
  return (
    event.isComposing ||
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- WebKit IME compatibility; see above.
    event.keyCode === 229
  )
}
