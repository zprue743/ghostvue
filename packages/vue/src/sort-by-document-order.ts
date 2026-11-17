/**
 * Returns a copy of `items` sorted by the document position of each item's
 * element, so keyboard traversal follows the rendered (visual) order rather
 * than the order in which items happened to register.
 *
 * Option registries (Select, Combobox) append on mount, so keyed reordering,
 * insertion before existing options, and filter-then-restore cycles leave the
 * registration order stale. Reading the order from the DOM at traversal time
 * is the same precedent as `getMenuItems` / `useRovingFocus` (query order) and
 * the `compareDocumentPosition` checks in `useFocusScope`; it keeps a single
 * source of truth instead of mirroring Vue's keyed patching into the registry.
 *
 * Items whose element is missing or disconnected (SSR, not yet mounted, or a
 * stale getter during unmount) cannot be placed, so they sort after every
 * connected item and keep their relative input order. `Array.prototype.sort`
 * is stable, which makes that fallback deterministic.
 *
 * Cost is O(n log n) `compareDocumentPosition` calls over the items passed in.
 * Callers should invoke it only for navigation (key presses, open focus), not
 * on every registry change, and with virtualization only the mounted window is
 * registered. Sorting does not make registry bookkeeping itself cheaper.
 */
export function sortByDocumentOrder<T>(
  items: readonly T[],
  getElement: (item: T) => Element | null | undefined,
): T[] {
  const connected = new Map<T, Element>()
  for (const item of items) {
    const element = getElement(item)
    if (element?.isConnected) {
      connected.set(item, element)
    }
  }

  return [...items].sort((a, b) => {
    const elementA = connected.get(a)
    const elementB = connected.get(b)
    if (!elementA || !elementB) {
      if (elementA) {
        return -1
      }
      return elementB ? 1 : 0
    }
    if (elementA === elementB) {
      return 0
    }
    const position = elementA.compareDocumentPosition(elementB)
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1
    }
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1
    }
    return 0
  })
}
