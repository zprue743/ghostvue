---
schemaVersion: 1.0.0
component: GhostSubmenu
components:
  - GhostSubmenu
  - GhostSubmenuTrigger
  - GhostSubmenuContent
packages:
  - '@ghostvue/vue'
specStatus: pending-review
manifests: []
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: false
    reason: Consumers compose Vue slots and keep ownership of action data.
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions: []
---

# Component specification for nested menus

This is the proposed contract for [#413](https://github.com/zprue743/ghostvue/issues/413).
Maintainer approval of the public parts and accessibility behavior is required
before implementation. Record the approval link in frontmatter when the
contract is approved.

## Purpose and user problems

An application can group related commands, such as export formats, into a
child menu. The same composition works inside
[DropdownMenu](/specs/dropdown-menu),
[ContextMenu](/specs/context-menu), or [Menubar](/specs/menubar) while
each host retains its own entry point and focus destination.

## Non-goals

This proposal covers vertical action menus inside the three hosts. Navigation
links that also open a child, arbitrary focusable widgets inside menus, and
consumer-configurable hover timing are outside its scope.

## Public API

- `GhostSubmenu` is a renderless wrapper for one trigger and one content in
  the nearest open menu. It accepts `open?: boolean` for `v-model:open` and
  `defaultOpen?: boolean` (default `false`). It emits
  `update:open(next: boolean)` when an interaction requests a state change.
- `GhostSubmenuTrigger` renders a `button[type="button"]` with
  `role="menuitem"`. Its default slot supplies the label. It accepts
  `disabled?: boolean` (default `false`). A trigger opens its child and has
  no separate selection event.
- `GhostSubmenuContent` renders the vertical `role="menu"` and accepts
  `portal?: boolean` (default `false`) and
  `portalTo?: GhostPortalTarget` (default `'body'` when portaled).
  Its default slot contains the host's existing item, checkbox, radio, group,
  label, and separator parts, or another `GhostSubmenu`. These items keep
  their existing payloads and cancellation rules and act in the nearest menu.

DropdownMenu places the wrapper inside `GhostDropdownMenuContent`.
ContextMenu places it inside `GhostContextMenuContent` and uses
`GhostContextMenuItem` for child commands. Menubar places it inside
`GhostMenubarContent` and uses `GhostMenubarItem` for child commands.

```vue
<GhostDropdownMenu>
  <GhostDropdownMenuTrigger>File actions</GhostDropdownMenuTrigger>
  <GhostDropdownMenuContent>
    <GhostDropdownMenuItem @select="rename">Rename</GhostDropdownMenuItem>
    <GhostSubmenu>
      <GhostSubmenuTrigger>Export</GhostSubmenuTrigger>
      <GhostSubmenuContent>
        <GhostDropdownMenuItem @select="exportPdf">PDF</GhostDropdownMenuItem>
        <GhostDropdownMenuItem @select="exportCsv">CSV</GhostDropdownMenuItem>
      </GhostSubmenuContent>
    </GhostSubmenu>
  </GhostDropdownMenuContent>
</GhostDropdownMenu>
```

## State model

At each level, one child can be visible. Opening a sibling first requests the
current child close. If its controlled owner keeps it open, the sibling does
not take focus or become visible. If several children request an initial
open state together, the first enabled child in parent item order is visible.
The effective state drives ARIA and rendering.

A committed ancestor close removes all descendant surfaces, clears pending
pointer and focus work, and requests any open child models close once.
An uncontrolled child starts closed when that ancestor next opens after a
close. A controlled child may reopen when its ancestor reopens if the owner
still supplies `true`. A programmatically opened child does not move focus.
Keyboard and press entry move focus after the open state commits and the
surface is ready. If the owner declines the request, focus stays on the
trigger. Closing while placement is pending discards the pending focus move.

A disabled trigger has `aria-disabled="true"`, cannot open, and is skipped
by roving and typeahead, matching the existing host items. A child with no
enabled items focuses the named menu surface on keyboard or press entry.
It remains dismissible with the same commands.

## Accessibility contract

The trigger gets a stable ID and `aria-haspopup="menu"`. Set
`aria-expanded` to the effective visibility and `aria-controls` to the child
ID while that target is rendered. The child's `aria-labelledby` points to
the trigger even across a portal. Use visible trigger text or supply an
accessible name for icon-only content. The inline menu follows its trigger
in the same parent menu. A portaled menu is separately named, with the same
focus entry and return. Verify traversal with assistive technology before
approving the portal contract for release. The
[WAI-ARIA APG menu and menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)
describes inline ownership and the implications of using `aria-owns` for
reading order. Event ownership comes from Vue registration independently of
ARIA relationships.

Each level roves focus among its own enabled items. Only the active level's
current item is eligible as a menu Tab stop while the branch is open.
Menubar has a single top-level Tab stop. Vertical arrows wrap locally,
Home and End move to the first or last eligible item, and typeahead searches
the current level. An active IME composition owns its keys as in the flat menus.

| Interaction                                                              | Focus and visibility                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enter, Space, or forward arrow on an enabled child trigger               | Open the child and focus its first enabled item, or its menu surface if none.                                                                                                                                                           |
| Back arrow in any nested child                                           | Close only that child and focus its trigger.                                                                                                                                                                                            |
| Escape inside a child                                                    | Close the menu containing focus and its descendants. Focus its trigger and leave the parent open.                                                                                                                                       |
| Escape at the host root menu                                             | Close the whole branch. Focus the DropdownMenu trigger, the ContextMenu invoking element, or the owning Menubar trigger.                                                                                                                |
| Tab or Shift+Tab from a menu at any depth                                | Close the branch. Move to the next or previous sequential stop relative to the host trigger or invoking context. A portal target's DOM position does not determine the destination.                                                     |
| Activate a leaf action or radio item                                     | Preserve the host's selection event. If the event is accepted, close the full branch and return focus to the host unless the action moved it to another live control. A prevented selection or a checkbox toggle keeps the branch open. |
| Pointer interaction within an ancestor but outside its open child branch | Close the departed branch. Leave the ancestor open and let the interacted item receive focus or activate normally.                                                                                                                      |
| Pointer interaction outside the whole branch                             | Close all levels. A focusable outside target keeps focus. Otherwise use the host's existing focus restoration policy.                                                                                                                   |

Forward means Right in LTR and Left in RTL. Back is the opposite.
Direction follows the host's effective direction, including across portals
and after collision flips. In DropdownMenu and ContextMenu, forward on a leaf
and back in the root menu have no menu action. In Menubar, forward on a
trigger with a child opens that child first. Forward on a leaf at any depth
switches to the next top-level menu, closes the old branch, and focuses the
new menu's first enabled item. Back inside a child closes that child.
Back from the root content switches to the previous top-level menu.
Horizontal arrows on the bar retain its existing wrap and open-menu switch
behavior. With the branch closed, top-level triggers keep their existing
key bindings.

## Rendering and customization

Place the child at the trigger's inline end and align the block start.
Use the existing floating positioner for viewport collision and flipping.
Expose `sub-trigger` and `sub-content` part hooks for the new surfaces
and follow the existing class and style merge conventions. The trigger's
visible indicator can be supplied in the default slot with decorative
graphics hidden from assistive technology.

Mouse hover can open a child without transferring keyboard focus. A short
pointer grace period covers the travel from trigger to child, including a
flipped child and a portal gap. Keep the branch open when the pointer reaches
either surface. Leaving the branch or settling on a sibling closes the old
branch, and a delayed hover cannot reopen it after Escape, outside dismissal,
or a later explicit action. Hover must leave a branch open while focus is
inside it. Pressing the trigger or moving keyboard focus to a sibling still
supports an intentional branch switch.

## Environment behavior

SSR emits stable relationships for rendered content without reading the DOM.
Measure placement and register portal surfaces after mount. On hydration,
unmount, retargeting, or rapid open/close, discard stale registrations
and deferred focus work. Touch and pen can open by pressing the trigger.
Opening a child in ContextMenu does not require a second long press.

## Performance

Item discovery and typeahead operate at the current level. Track open
surfaces for the active path and release references and pointer timers when
that path closes. The implementation must support nesting without a
hard-coded depth limit. Approve behavior against a root, child, and grandchild.

## Composition

Reuse `useGhostMenuCollection` for local roving, activation, and typeahead.
Its current descendant query and event listeners assume flat menus. For
inline children, scope item queries and key/focus processing to the nearest
menu so a bubbled command is handled once. Route existing item actions to
that menu while preserving the host's action behavior.

Use the host's menu context and existing floating, portal, dismissal, and
focus primitives. A child registers its parent menu, trigger element, and
open content element through Vue context. On outside pointer dismissal,
the parent checks the event's composed path against the registered
descendant surfaces as well as its own surface. That keeps a portaled child
inside its branch, lets a click back in a parent close only the departing
child, and leaves unrelated overlays to the existing topmost-layer rules.
An Escape handled inside the branch is consumed once. The contract has no
dependency on overlay motion. An exit effect can keep a surface painted
after close, but the closing menu is already out of navigation and dismissal
routing.

## Test plan

- **All hosts:** Press Enter, Space, both horizontal arrows in LTR and RTL,
  Up/Down, Home/End, a typeahead sequence, and Escape from the child and
  grandchild. Use `toBeFocused()` for each destination and assert
  `aria-expanded`, menu roles and accessible names, and visible ancestor
  and sibling state. Exercise an IME-owned key with the branch open.
  Test Tab and Shift+Tab to real neighboring controls in inline and portaled
  fixtures with the portal at a different document position. Verify an
  enabled sibling remains reachable when the child trigger is disabled.
- **DropdownMenu:** Open from its button, enter the child, Escape twice and
  check the two restoration targets. Toggle a child checkbox, select a
  radio or leaf, and repeat with prevented selection. Assert that clicking
  in portaled child content does not dismiss the root.
- **ContextMenu:** Open by right click, the ContextMenu key, Shift+F10,
  and touch long press. Assert child positioning uses its trigger and
  Escape from the root restores the invoking target. Reopen on another
  context target while a child is open and verify the old branch is gone.
- **Menubar:** Tab into the bar once, open a top-level menu, and use the
  forward key to enter a child. Assert leaf-forward switches to the next
  top-level menu, child-back returns to the parent item, and root-back
  switches top-level menus. Repeat with mirrored arrows in RTL and check
  Tab in both directions from a portaled grandchild.
- **Pointer, races, and rendering:** Cross the gap to a flipped child
  and grandchild. Cross back into the parent, move across competing triggers,
  click an outside focusable target, and dismiss while a hover is pending.
  Assert final focus and visibility after a delayed controlled acceptance
  arrives out of order, after trigger reorder/insertion, and after removing
  the focused item or changing a portal target. Cover SSR hydration and
  unmount with an open branch.
- **Accessibility:** Run axe with all menus closed, root only, root and
  child, and root through grandchild for each host. Exercise inline and
  portaled arrangements. Run the portal and RTL keyboard paths in Chromium,
  Firefox, and WebKit. Check menu and trigger announcements, reading order
  and Escape restoration with NVDA and Firefox, and VoiceOver and Safari.
- **Types and Vue behavior:** Assert the three typed exports and
  `v-model:open` payload. Test uncontrolled reset and controlled refusal,
  disabled and empty branches, sibling competition, item event routing,
  and cleanup without relying on DOM implementation details.

## Documentation plan

Lead each participating host's docs with an executable example of its entry
point and a child action. Document the shared parts once and link to them
from each host. Cover direction, Tab, controlled state and portaling using
complete examples. Keep the existing flat-menu examples usable.

## Compatibility and release impact

The proposal requires an additive Vue API and a Changeset when implementation
ships. Flat menus preserve their item behavior, entry keys and focus
restoration. The first implementation is DropdownMenu in
[#418](https://github.com/zprue743/ghostvue/issues/418), followed by the
remaining hosts in [#419](https://github.com/zprue743/ghostvue/issues/419).
This specification leaves the current runtime and published exports intact.

## Open architectural questions

Reviewers should confirm the shared parts and portal contract, including the
inline default and the Menubar boundary between child navigation and
top-level switching. The proposal selects behavior for each case above.
