import {
  Comment,
  Fragment,
  Text,
  nextTick,
  onMounted,
  onUnmounted,
  onUpdated,
  type Ref,
  type VNode,
  type VNodeArrayChildren,
} from 'vue'

function fieldPartVnodeHasRenderableContent(vnode: VNode): boolean {
  if (vnode.type === Comment) {
    return false
  }
  if (vnode.type === Text) {
    const children = vnode.children
    if (typeof children === 'string') {
      return children.trim().length > 0
    }
    if (typeof children === 'number') {
      return String(children).trim().length > 0
    }
    return false
  }
  if (vnode.type === Fragment) {
    if (!Array.isArray(vnode.children)) {
      return false
    }
    return fieldPartSlotHasRenderableContent(vnode.children)
  }
  return true
}

/**
 * Whether default-slot vnodes include renderable content (not comments or empty text).
 * Invoked during component render so SSR markup can expose errors before mount.
 */
export function fieldPartSlotHasRenderableContent(
  vnodes: VNodeArrayChildren,
): boolean {
  for (const child of vnodes) {
    if (child == null || child === false || child === true) {
      continue
    }
    if (typeof child === 'string') {
      if (child.trim().length > 0) {
        return true
      }
      continue
    }
    if (typeof child === 'number') {
      if (String(child).trim().length > 0) {
        return true
      }
      continue
    }
    if (Array.isArray(child)) {
      if (fieldPartSlotHasRenderableContent(child)) {
        return true
      }
      continue
    }
    if (fieldPartVnodeHasRenderableContent(child)) {
      return true
    }
  }
  return false
}

/** Whether a field hint/error host exposes non-empty visible content. */
export function fieldPartHostHasContent(element: HTMLElement | null): boolean {
  if (!element) {
    return false
  }
  if (element.textContent.trim().length > 0) {
    return true
  }
  return element.children.length > 0
}

/**
 * Tracks part visibility from mounted DOM after each render. Never invokes slots
 * outside the render phase; parent reactive slot content updates land in onUpdated.
 */
export function useGhostFieldPartContent(
  hostRef: Ref<HTMLElement | null>,
  onVisibleChange: (visible: boolean) => void,
): void {
  let visible = false

  function syncFromDom(): void {
    const next = fieldPartHostHasContent(hostRef.value)
    if (next === visible) {
      return
    }
    visible = next
    onVisibleChange(next)
  }

  onMounted(() => {
    void nextTick(syncFromDom)
  })
  onUpdated(syncFromDom)
  onUnmounted(() => {
    if (visible) {
      visible = false
      onVisibleChange(false)
    }
  })
}
