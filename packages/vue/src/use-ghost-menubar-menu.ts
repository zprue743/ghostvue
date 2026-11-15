import type {
  UseGhostMenubarMenuOptions,
  UseGhostMenubarMenuReturn,
} from './ghost-menubar'
import { useGhostDropdownMenu } from './use-ghost-dropdown-menu'

/** Headless menubar menu open state; IDs use the `ghost-menubar-menu` namespace. */
export function useGhostMenubarMenu(
  options: UseGhostMenubarMenuOptions = {},
): UseGhostMenubarMenuReturn {
  return useGhostDropdownMenu({
    ...options,
    idNamespace: 'ghost-menubar-menu',
  })
}
