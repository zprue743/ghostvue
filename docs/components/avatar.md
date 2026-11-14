# GhostAvatar

`GhostAvatar` shows a user or entity image with initials or slot fallback when
the image is missing or fails to load. Import from `@ghostvue/vue` for headless
use, or from `@ghostvue/themes` for the default circular treatment.

## Initials

<GhostExample id="avatar/basic" />

Provide `name` to derive fallback initials (up to two characters). With no
`src`, the fallback is shown immediately.

## Loaded image

<GhostExample id="avatar/image" />

When `src` is set, the server and the first client paint show the fallback with
`data-state="loading"`. After mount, the component probes the URL and swaps to
the `<img>` when load succeeds.

Set `alt` for the accessible image name, or rely on `name`. Use `alt=""` when a
parent link or heading already names the person.

## Custom fallback

<GhostExample id="avatar/fallback" />

Use the `fallback` slot when initials are not enough. Icon-only fallback content
still needs a real name nearby or in hidden text.

## Composable

<GhostExample id="avatar/composable" />

## API

| Prop   | Type              | Default  | Description                                             |
| ------ | ----------------- | -------- | ------------------------------------------------------- |
| `src`  | `string`          | —        | Image URL. Load is confirmed after mount on the client. |
| `alt`  | `string`          | —        | `img` accessible name; defaults to `name`.              |
| `name` | `string`          | —        | Initials source and default `alt`.                      |
| `as`   | `'span' \| 'div'` | `'span'` | Root host.                                              |

| Slot       | Description                            |
| ---------- | -------------------------------------- |
| `fallback` | Shown when the image is not displayed. |

Template ref: `element` (`HTMLElement | null`).

`deriveGhostAvatarInitials(name)` is exported for tests and custom hosts.

## Themed use

<GhostExample id="avatar/themed" />

| Prop   | Type                   | Default | Description        |
| ------ | ---------------------- | ------- | ------------------ |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  | Square dimensions. |

Default `md` omits `data-size`.

## Styling

- class `ghost-avatar`
- `data-part`: `root`, `image`, `fallback`
- `data-state`: `loading`, `loaded`, `error` (omitted without `src`)
- themed `data-size`: `sm`, `md`, `lg`

## Accessibility

The loaded `<img>` uses `alt`. Fallback initials are ordinary text. Do not add
`aria-label` on the root when text or `alt` already names the entity. Wrap the
avatar in a link or button when it should activate something.

## SSR

SSR and hydration render the fallback first when `src` is set, avoiding
mismatches from client-only load state. See [avatar-spec](./avatar-spec.md).

## When not to use it

- **As a button or link.** Wrap with `GhostButton` or a native `<a>`.
- **For presence or counts.** Compose badges outside the avatar.
