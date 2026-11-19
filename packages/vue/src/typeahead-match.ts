/**
 * Shared APG typeahead matching for roving composites (menus, trees).
 *
 * - A one-character query searches from the item after `active`, so repeated
 *   presses of different letters move forward through the list.
 * - A longer query keeps `active` when it still matches the extended prefix
 *   (typing "ne" then "new" stays on "New file" instead of jumping ahead).
 * - Repeated single-character queries (for example "aa" with no item starting
 *   with "aa") cycle through items starting with that character rather than
 *   stalling.
 *
 * Matching is case-insensitive on trimmed text. `getText` lets callers supply
 * an explicit label (tree `textValue`) instead of DOM text content.
 */
export function findTypeaheadMatch<Item>(
  items: readonly Item[],
  query: string,
  active: Item | undefined,
  getText: (item: Item) => string,
): Item | undefined {
  const normalized = query.trim().toLowerCase()
  if (normalized.length === 0) {
    return undefined
  }
  const activeIndex = active === undefined ? -1 : items.indexOf(active)
  if (normalized.length === 1) {
    return findMatchFromIndex(items, normalized, activeIndex + 1, getText)
  }

  const start = activeIndex >= 0 ? activeIndex : 0
  const directMatch = findMatchFromIndex(items, normalized, start, getText)
  if (directMatch !== undefined) {
    return directMatch
  }

  const firstChar = normalized[0]
  if (firstChar && isRepeatedCharacterQuery(normalized, firstChar)) {
    return findMatchFromIndex(items, firstChar, activeIndex + 1, getText)
  }

  return undefined
}

function findMatchFromIndex<Item>(
  items: readonly Item[],
  normalizedQuery: string,
  startIndex: number,
  getText: (item: Item) => string,
): Item | undefined {
  for (let offset = 0; offset < items.length; offset++) {
    const index = (startIndex + offset) % items.length
    if (index < 0 || index >= items.length) {
      continue
    }
    const item = items[index] as Item
    if (getText(item).trim().toLowerCase().startsWith(normalizedQuery)) {
      return item
    }
  }
  return undefined
}

function isRepeatedCharacterQuery(query: string, char: string): boolean {
  for (let i = 1; i < query.length; i++) {
    if (query[i] !== char) {
      return false
    }
  }
  return true
}
