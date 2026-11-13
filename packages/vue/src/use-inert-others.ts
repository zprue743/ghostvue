import {
  computed,
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

/** Element or nullable target accepted by {@link useInertOthers}. */
export type InertOthersTarget = HTMLElement | null | undefined

/** Single element, ref/getter, or list of elements/refs kept interactive. */
export type InertOthersElements =
  | MaybeRefOrGetter<
      InertOthersTarget | readonly MaybeRefOrGetter<InertOthersTarget>[]
    >
  | readonly MaybeRefOrGetter<InertOthersTarget>[]

/**
 * Per-element count of active `useInertOthers` activations that added `inert`.
 * Elements that already carried `inert` before any activation are absent from
 * this map so cleanup never removes consumer-owned `inert` attributes.
 */
const inertCounts = new WeakMap<Element, number>()

function isElementArray(
  value: InertOthersTarget | readonly MaybeRefOrGetter<InertOthersTarget>[],
): value is readonly MaybeRefOrGetter<InertOthersTarget>[] {
  return Array.isArray(value)
}

function resolveElements(elements: InertOthersElements): HTMLElement[] {
  const outer = toValue(elements)
  if (!outer) {
    return []
  }
  if (isElementArray(outer)) {
    const resolved: HTMLElement[] = []
    for (const item of outer) {
      const element = toValue(item)
      if (element) {
        resolved.push(element)
      }
    }
    return resolved
  }
  return [outer]
}

function applyInertOthers(kept: readonly HTMLElement[]): () => void {
  const body = document.body as HTMLBodyElement | null
  if (!body) {
    return () => undefined
  }

  // Only walk elements currently inside `document.body` so the walk always
  // terminates at `body` without touching `<html>` or `<head>`.
  const validKept = kept.filter(
    (element) => element !== body && body.contains(element),
  )
  if (validKept.length === 0) {
    return () => undefined
  }

  // Kept elements and every ancestor up to `body` must stay interactive.
  const keepSet = new Set<Element>()
  for (const element of validKept) {
    let current: HTMLElement | null = element
    while (current && current !== body) {
      keepSet.add(current)
      current = current.parentElement
    }
  }

  // Deduplicate siblings across multiple kept elements so one activation
  // increments each sibling's ref count at most once.
  const targets = new Set<Element>()
  for (const element of validKept) {
    let current: HTMLElement = element
    while (current !== body) {
      const parent: HTMLElement | null = current.parentElement
      if (!parent) {
        break
      }
      for (const sibling of Array.from(parent.children)) {
        if (keepSet.has(sibling)) {
          continue
        }
        if (sibling.hasAttribute('data-ghost-live')) {
          continue
        }
        targets.add(sibling)
      }
      current = parent
    }
  }

  const acquired: Element[] = []
  for (const target of targets) {
    const count = inertCounts.get(target) ?? 0
    if (count === 0) {
      // Never adopt or later remove an `inert` attribute that was already on
      // the element before the first `useInertOthers` activation.
      if (target.hasAttribute('inert')) {
        continue
      }
      target.setAttribute('inert', '')
      inertCounts.set(target, 1)
      acquired.push(target)
    } else {
      inertCounts.set(target, count + 1)
      acquired.push(target)
    }
  }

  return () => {
    for (const target of acquired) {
      const count = inertCounts.get(target) ?? 0
      if (count <= 1) {
        inertCounts.delete(target)
        target.removeAttribute('inert')
      } else {
        inertCounts.set(target, count - 1)
      }
    }
  }
}

/**
 * Walks from each kept element up to `document.body` and marks every sibling
 * that does not contain a kept element as `inert` while `enabled` is `true`.
 *
 * Skips `[data-ghost-live]` elements, leaves pre-existing `inert` attributes
 * untouched, ref-counts per element across nested activations, ignores DOM
 * nodes added after activation, and defers all DOM access until `onMounted`.
 */
export function useInertOthers(
  elements: InertOthersElements,
  enabled: MaybeRefOrGetter<boolean> = true,
): void {
  let stopWatch: (() => void) | undefined

  onMounted(() => {
    const isEnabled = computed(() => toValue(enabled))
    // Preserve array identity when the resolved element list did not change so
    // unrelated reactive reads cannot re-run activation and touch newly added nodes.
    const resolvedElements = computed<HTMLElement[]>((previous) => {
      const next = resolveElements(elements)
      if (
        previous?.length === next.length &&
        previous.every((item, index) => item === next[index])
      ) {
        return previous
      }
      return next
    })

    stopWatch = watch(
      [isEnabled, resolvedElements],
      ([active, kept], _previous, onCleanup) => {
        if (!active || kept.length === 0) {
          return
        }
        const release = applyInertOthers(kept)
        onCleanup(release)
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    stopWatch?.()
  })
}
