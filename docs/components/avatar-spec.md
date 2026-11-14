# GhostAvatar specification

**Status:** Proposed for [GHO-95](https://linear.app/ghost-vue/issue/GHO-95)
implementation scope. Approval is PR review of this spec together with the
implementation.

## Purpose and user problems

`GhostAvatar` shows a user or entity image in a compact, circular frame. When
`src` is missing or the image fails to load, the component falls back to
derived initials or custom slot content without shifting layout. DataTable row
headers, comment threads, and account menus need predictable sizing hooks and
accessible names whether the photo loads or not.

## Non-goals

- Clickable avatars, profile links, uploaders, or status badges. Consumers wrap
  the avatar in `GhostButton`, `GhostInteractiveSurface`, or a native link.
- Online/presence indicators, notification counts, or group stacks. Those are
  separate compositions.
- Automatic fetching, caching, or image optimization. The component accepts a
  `src` string and loads it with a client-only probe after mount.
- Gravatar or third-party avatar services. Consumers compute `src`.
- `useGhostId` and `useControllableState`. There is no generated id and no model.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostAvatar` / `useGhostAvatar`:

| Prop   | Type              | Default  | Contract                                                                                                                                |
| ------ | ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src`  | `string`          | —        | Image URL. When set, the client probes load after mount. Omit for initials-only use.                                                    |
| `alt`  | `string`          | —        | Accessible name for the `<img>` when loaded. Falls back to `name` when omitted. Use `""` when the surrounding context names the entity. |
| `name` | `string`          | —        | Derives fallback initials (up to two graphemes from the first two words). Also used as `alt` when `alt` is omitted.                     |
| `as`   | `'span' \| 'div'` | `'span'` | Root host. Must stay valid HTML phrasing or flow content for the chosen parent.                                                         |

Native attributes on the root host fall through. Named ESM exports: `GhostAvatar`,
`useGhostAvatar`, `deriveGhostAvatarInitials`, and the types below.

The root carries class `ghost-avatar`, `data-part="root"`, and `data-state` when
the image pipeline is active:

| `data-state` | When set                                                         |
| ------------ | ---------------------------------------------------------------- |
| `loading`    | `src` is set and the client has not confirmed load or error yet. |
| `loaded`     | `src` loaded successfully.                                       |
| `error`      | `src` failed to load.                                            |

When `src` is omitted, `data-state` is omitted and the fallback is shown.

Child parts:

- `data-part="image"` on the `<img>` when `data-state="loaded"`.
- `data-part="fallback"` on the inner fallback host when the image is not shown.

The `<img>` is not in SSR or initial hydration markup until load succeeds, so
server and client both paint the same fallback first.

Themed `@ghostvue/themes` `GhostAvatar` wraps the unstyled component:

| Prop   | Type                   | Default | Contract                                      |
| ------ | ---------------------- | ------- | --------------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  | Square dimensions. Default omits `data-size`. |

The themed wrapper sets `data-size` only for non-default values and scopes CSS
with `.ghost-themed-scope` (`display: contents`).

### v-model contracts

There is no model.

### Events, callbacks, slots, and exposed methods

| Slot       | Contract                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------- |
| `fallback` | Custom fallback when the image is not shown. Default content is derived initials from `name`. |

No component-specific events. Native root listeners receive native events.

Template ref exposes:

- `element: HTMLElement | null` — the root host after mount.

### `deriveGhostAvatarInitials`

Exported pure function: trims `name`, takes the first character of the first
two whitespace-separated words (locale uppercased), or the first two characters
of a single word. Returns `""` for empty input.

## State model

Image status is `idle` (no `src`), `loading`, `loaded`, or `error`. Status
starts as `loading` when `src` is provided (including SSR). Transitions after
mount use `Image()` and `img` `error` handling. Changing `src` resets to
`loading` on the client.

### Loading, empty, disabled, read-only, and error states

- **Loading:** Fallback visible, `data-state="loading"`.
- **Loaded:** `<img>` visible with resolved `alt`, `data-state="loaded"`.
- **Error / missing src:** Fallback visible; `data-state="error"` when `src`
  failed, omitted when there is no `src`.
- **Empty fallback:** Permitted when `name`, slot, and `src` are all absent;
  renders an empty circular frame.

### Async behavior

Load is client-only after mount. No stale callbacks: each `src` change starts a
fresh probe. Failures do not throw; they set `error` and keep the fallback.

## Consumer data

`src`, `alt`, and `name` are strings owned by the consumer. The component does
not mutate them.

## Accessibility contract

### Semantics and relationships

The root is a native `span` (default) or `div`. There is no dedicated APG Avatar
pattern; follow
[Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/).

When the image is shown, the `<img>` `alt` is the accessible name (from `alt`
or `name`). When only initials or slot fallback is shown, the text content is
the name. Do not set `aria-label` on the root when text or `img alt` already
names the entity. Icon-only fallback slots need visible or hidden text.

Decorative avatars inside a labeled control may use `alt=""` and keep the name
on the parent.

### Keyboard interaction

No key handling. The avatar is not a tab stop unless the consumer adds
`tabindex`.

### Focus behavior

No focus management.

### Assistive technology expectations

Screen readers read the image `alt` or fallback text. Loading is not announced;
the fallback text is present during load so the name does not flash empty.

## Rendering and customization

Stable styling hooks (ADR 0004; GHO-38 undecided):

- class `ghost-avatar`
- `data-part`: `root`, `image`, `fallback`
- `data-state`: `loading`, `loaded`, `error` (omitted when idle)
- themed `data-size`: `sm`, `md`, `lg` (default `md` omitted)

Recipe CSS under `.ghost-theme` / `.ghost-themed-scope` uses `--ghost-*` tokens
only.

## Environment behavior

### SSR and hydration

With `src` set, SSR and the first client paint show the fallback with
`data-state="loading"` and no `<img>`. After a successful client load, the `<img>`
appears. This matches `GHOST_KBD_SSR_PLATFORM` / deferred-client patterns and
must pass `expectSsrHydration`.

### Mobile and touch

The avatar is not a touch target unless wrapped. No gestures.

## Performance

Constant-time render. One `Image()` probe per `src` change on the client.

## Composition

`useGhostAvatar` owns class, `data-part`, `data-state`, image probe, and
initials. Unstyled `GhostAvatar` composes the composable; themed `GhostAvatar`
wraps it. No `@ghostvue/core` layer.

Manifests: `packages/vue/manifests/ghost-avatar.manifest.json`,
`packages/themes/manifests/ghost-avatar.manifest.json`.

## Test plan

- Vue tests: defaults, initials derivation, fallback slot, `src` load/error
  (mocked `Image`), `alt` resolution, fallthrough attrs, exposed `element`, SSR
  markup, and `expectSsrHydration`.
- Compile-time tests on props and exposed ref.
- Browser: registered examples, axe smoke, broken `src` fallback, themed
  `data-size`.
- Visual baselines for registered examples via `pnpm test:visual:docker`.

## Documentation plan

`docs/components/avatar.md` with API, headless and themed examples, initials,
custom fallback, image load, accessibility, and SSR notes. Executable examples
under `examples/avatar/`.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None blocking. GHO-38 remains undecided; this component reuses existing
`data-part` / `data-state` conventions.
