---
'@ghostvue/themes': minor
---

Recalibrate authored design tokens and flagship theme defaults to Precision SaaS proportions:

- Set `control.size.{sm,md,lg}.min` to `32 / 36 / 40px` (`comfortable`), `28 / 32 / 36px` (`compact`), and `36 / 40 / 44px` (`spacious`), preserving the `44px` (`2.75rem`) coarse-pointer floor.
- Scale `control.size.{sm,md,lg}.font` deterministically across densities (`12 / 13 / 14px` compact, `13 / 14 / 15px` comfortable, `13 / 15 / 16px` spacious) and resolve UI `font.size.{xs,sm,md,lg}` to crisp `rem` values while keeping display headings (`xl`–`3xl`) fluid.
- Add primitive spacing and height steps (`space.0_5`, `space.1_5`, `space.2_5`, `control.height.44`) and calibrate control padding, `action.label.weight` (`500`), `size.focus.width` (`2px`), and corner radii (`6px` `radius.md` / `action.radius`, `8px` `radius.lg` at `roundness: 1`).
- Replace `default` hue-shifting solid action gradients and `elevation.2` rest shadows with single-hue fills, a hairline top bevel, and `elevation.1` rest shadows while keeping `vibrant` aurora/gradient recipes expressive; adjust `calm` `roundness` from `0.3` to `0.5`.
- Harmonize dark-mode `surface.bg`, `surface.subtle.bg`, `surface.muted.bg`, and `elevation.1..5.bg` onto one neutral-tinted OKLCH slate/ink progression (retinted per neutral seed in `defineTheme`).
