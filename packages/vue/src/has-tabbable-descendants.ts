import { getTabbableElements } from './get-tabbable-elements'

/** Whether `root` contains a tab stop other than itself. */
export function hasTabbableDescendants(root: HTMLElement): boolean {
  return getTabbableElements(root).some(
    (element) => element !== root && root.contains(element),
  )
}
