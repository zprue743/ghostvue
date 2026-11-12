<script setup>
import '@ghostvue/themes/default.css'
</script>

# Elevation, materials, and gradients

SLO-64 recipes on top of the [token catalog](./tokens.md). Components consume
semantic `--ghost-*` variables; these `data-elevation`, `data-material`, and
`data-gradient` attributes are documented utilities in `@ghostvue/themes`
default CSS. They are not per-component tokens and they are not passthrough
props.

Light and dark are nested `data-ghost-mode` scopes. Unset mode still follows
`prefers-color-scheme`.

## Elevation

Six levels, `0` through `5`. Each level is a surface fill, a layered box-shadow
(ambient plus key light, tinted with the neutral hue in `oklch` with alpha),
and a hairline border. Dark mode lifts the fill, de-emphasizes the shadow, and
adds an inset top highlight.

```html
<article data-elevation="2">Raised card</article>
```

<div class="visual-page">
  <div class="ghost-theme visual-column" data-ghost-mode="light">
    <p>Light</p>
    <div class="visual-grid">
      <article class="sample" data-elevation="0"><strong>0</strong><span>Flush</span></article>
      <article class="sample" data-elevation="1"><strong>1</strong><span>Rest</span></article>
      <article class="sample" data-elevation="2"><strong>2</strong><span>Raised</span></article>
      <article class="sample" data-elevation="3"><strong>3</strong><span>Popover</span></article>
      <article class="sample" data-elevation="4"><strong>4</strong><span>Dialog</span></article>
      <article class="sample" data-elevation="5"><strong>5</strong><span>Highest</span></article>
    </div>
  </div>
  <div class="ghost-theme visual-column" data-ghost-mode="dark">
    <p>Dark</p>
    <div class="visual-grid">
      <article class="sample" data-elevation="0"><strong>0</strong><span>Flush</span></article>
      <article class="sample" data-elevation="1"><strong>1</strong><span>Rest</span></article>
      <article class="sample" data-elevation="2"><strong>2</strong><span>Raised</span></article>
      <article class="sample" data-elevation="3"><strong>3</strong><span>Popover</span></article>
      <article class="sample" data-elevation="4"><strong>4</strong><span>Dialog</span></article>
      <article class="sample" data-elevation="5"><strong>5</strong><span>Highest</span></article>
    </div>
  </div>
</div>

## Hairline borders

`border.hairline` is an alpha color. `border.hairline.width` is `1px` at 1x and
`0.5px` under `min-resolution: 2dppx`, so high-DPR screens paint one device
pixel.

## Materials

`solid` is an opaque fill. `glass` uses `backdrop-filter` blur and a saturation
boost, a translucent surface, and an inline SVG `feTurbulence` noise overlay
(no network image). `@supports` swaps glass to `material.glass.fallback.bg`
when backdrop-filter is missing. `grain` is a stronger noise overlay on an
opaque fill. Forced colors drop blur, noise, and translucency.

```html
<div data-gradient="aurora">
  <article data-material="glass">Glass on aurora</article>
</div>
```

<div class="visual-page">
  <div class="ghost-theme visual-column" data-ghost-mode="light">
    <p>Light</p>
    <div class="material-stage" data-gradient="aurora">
      <article class="sample" data-material="solid"><strong>Solid</strong></article>
      <article class="sample" data-material="glass"><strong>Glass</strong></article>
      <article class="sample" data-material="grain"><strong>Grain</strong></article>
    </div>
  </div>
  <div class="ghost-theme visual-column" data-ghost-mode="dark">
    <p>Dark</p>
    <div class="material-stage" data-gradient="aurora">
      <article class="sample" data-material="solid"><strong>Solid</strong></article>
      <article class="sample" data-material="glass"><strong>Glass</strong></article>
      <article class="sample" data-material="grain"><strong>Grain</strong></article>
    </div>
  </div>
</div>

## Gradients

Accent and aurora tokens interpolate `in oklch`. The gradient-border recipe
uses `mask-composite: exclude` (with `-webkit-mask-composite: xor`) on
`::before`. Where mask-composite is unavailable, the padding-box / border-box
double-background fallback is used.

```html
<article data-gradient="accent">Accent</article>
<article data-gradient="aurora">Aurora</article>
<article data-gradient="border">Gradient border</article>
```

<div class="visual-page">
  <div class="ghost-theme visual-column" data-ghost-mode="light">
    <p>Light</p>
    <div class="visual-grid">
      <article class="sample" data-gradient="accent"><strong>Accent</strong></article>
      <article class="sample" data-gradient="aurora"><strong>Aurora</strong></article>
      <article class="sample" data-gradient="border"><strong>Border</strong></article>
    </div>
  </div>
  <div class="ghost-theme visual-column" data-ghost-mode="dark">
    <p>Dark</p>
    <div class="visual-grid">
      <article class="sample" data-gradient="accent"><strong>Accent</strong></article>
      <article class="sample" data-gradient="aurora"><strong>Aurora</strong></article>
      <article class="sample" data-gradient="border"><strong>Border</strong></article>
    </div>
  </div>
</div>

Override the semantic variables rather than restyling the recipe internals:

```css
.product-theme {
  --ghost-elevation-2-shadow: 0 8px 24px oklch(0.25 0.03 258 / 0.18);
  --ghost-gradient-accent: linear-gradient(in oklch, #7c3aed, #06b6d4);
}
```

<style>
.visual-page {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  margin: 1rem 0 1.5rem;
}
@media (min-width: 52rem) {
  .visual-page {
    grid-template-columns: 1fr 1fr;
  }
}
.visual-column {
  border-radius: 1rem;
  padding: 0.85rem;
}
.visual-grid,
.material-stage {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.material-stage {
  border-radius: 0.85rem;
  padding: 0.85rem;
}
.sample {
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-block-size: 5.5rem;
  padding: 0.75rem;
}
.sample span {
  color: var(--ghost-text-muted);
  font-size: 0.85rem;
}
</style>
