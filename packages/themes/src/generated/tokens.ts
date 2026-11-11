/**
 * Compiled design tokens from DTCG JSON. Do not edit.
 * Semantic entries include `cssVar`; primitives are catalog-only.
 */

export const tokenModes = ['light', 'dark'] as const

export type TokenMode = (typeof tokenModes)[number]

export const tokens = {
  "action.danger.bg": {
    name: "action.danger.bg",
    cssVar: "--sl-action-danger-bg",
    type: "color",
    tier: "semantic",
    description: "Solid danger action background.",
    value: {
      light: "#b91c1c",
      dark: "#f87171",
    },
  },
  "action.danger.bg.active": {
    name: "action.danger.bg.active",
    cssVar: "--sl-action-danger-bg-active",
    type: "color",
    tier: "semantic",
    description: "Solid danger action background on press.",
    value: {
      light: "#7f1d1d",
      dark: "#fecaca",
    },
  },
  "action.danger.bg.hover": {
    name: "action.danger.bg.hover",
    cssVar: "--sl-action-danger-bg-hover",
    type: "color",
    tier: "semantic",
    description: "Solid danger action background on hover.",
    value: {
      light: "#991b1b",
      dark: "#fca5a5",
    },
  },
  "action.danger.fg": {
    name: "action.danger.fg",
    cssVar: "--sl-action-danger-fg",
    type: "color",
    tier: "semantic",
    description: "Content color on a solid danger action.",
    value: {
      light: "#ffffff",
      dark: "#0f172a",
    },
  },
  "action.disabled.opacity": {
    name: "action.disabled.opacity",
    cssVar: "--sl-action-disabled-opacity",
    type: "number",
    tier: "semantic",
    description: "Shared unavailable-state opacity.",
    value: {
      light: "0.55",
      dark: "0.55",
    },
  },
  "action.duration": {
    name: "action.duration",
    cssVar: "--sl-action-duration",
    type: "duration",
    tier: "semantic",
    description: "Action color and opacity transition duration.",
    value: {
      light: "120ms",
      dark: "120ms",
    },
  },
  "action.gap": {
    name: "action.gap",
    cssVar: "--sl-action-gap",
    type: "dimension",
    tier: "semantic",
    description: "Space between action label and icon content.",
    value: {
      light: "0.5rem",
      dark: "0.5rem",
    },
  },
  "action.icon.size": {
    name: "action.icon.size",
    cssVar: "--sl-action-icon-size",
    type: "dimension",
    tier: "semantic",
    description: "Action icon size.",
    value: {
      light: "1.1em",
      dark: "1.1em",
    },
  },
  "action.label.weight": {
    name: "action.label.weight",
    cssVar: "--sl-action-label-weight",
    type: "fontWeight",
    tier: "semantic",
    description: "Action label font weight.",
    value: {
      light: "600",
      dark: "600",
    },
  },
  "action.neutral.bg": {
    name: "action.neutral.bg",
    cssVar: "--sl-action-neutral-bg",
    type: "color",
    tier: "semantic",
    description: "Solid neutral action background.",
    value: {
      light: "#334155",
      dark: "#cbd5e1",
    },
  },
  "action.neutral.bg.active": {
    name: "action.neutral.bg.active",
    cssVar: "--sl-action-neutral-bg-active",
    type: "color",
    tier: "semantic",
    description: "Solid neutral action background on press.",
    value: {
      light: "#0f172a",
      dark: "#f1f5f9",
    },
  },
  "action.neutral.bg.hover": {
    name: "action.neutral.bg.hover",
    cssVar: "--sl-action-neutral-bg-hover",
    type: "color",
    tier: "semantic",
    description: "Solid neutral action background on hover.",
    value: {
      light: "#1e293b",
      dark: "#e2e8f0",
    },
  },
  "action.neutral.fg": {
    name: "action.neutral.fg",
    cssVar: "--sl-action-neutral-fg",
    type: "color",
    tier: "semantic",
    description: "Content color on a solid neutral action.",
    value: {
      light: "#ffffff",
      dark: "#0f172a",
    },
  },
  "action.primary.bg": {
    name: "action.primary.bg",
    cssVar: "--sl-action-primary-bg",
    type: "color",
    tier: "semantic",
    description: "Solid primary action background. Maps to SlButton tone accent.",
    value: {
      light: "#1d4ed8",
      dark: "#60a5fa",
    },
  },
  "action.primary.bg.active": {
    name: "action.primary.bg.active",
    cssVar: "--sl-action-primary-bg-active",
    type: "color",
    tier: "semantic",
    description: "Solid primary action background on press.",
    value: {
      light: "#1e3a8a",
      dark: "#bfdbfe",
    },
  },
  "action.primary.bg.hover": {
    name: "action.primary.bg.hover",
    cssVar: "--sl-action-primary-bg-hover",
    type: "color",
    tier: "semantic",
    description: "Solid primary action background on hover.",
    value: {
      light: "#1e40af",
      dark: "#93c5fd",
    },
  },
  "action.primary.fg": {
    name: "action.primary.fg",
    cssVar: "--sl-action-primary-fg",
    type: "color",
    tier: "semantic",
    description: "Content color on a solid primary action.",
    value: {
      light: "#ffffff",
      dark: "#0f172a",
    },
  },
  "action.radius": {
    name: "action.radius",
    cssVar: "--sl-action-radius",
    type: "dimension",
    tier: "semantic",
    description: "Action corner radius.",
    value: {
      light: "0.5rem",
      dark: "0.5rem",
    },
  },
  "action.spinner.size": {
    name: "action.spinner.size",
    cssVar: "--sl-action-spinner-size",
    type: "dimension",
    tier: "semantic",
    description: "Action loading-indicator size.",
    value: {
      light: "1.1em",
      dark: "1.1em",
    },
  },
  "action.spinner.width": {
    name: "action.spinner.width",
    cssVar: "--sl-action-spinner-width",
    type: "dimension",
    tier: "semantic",
    description: "Default action spinner stroke width.",
    value: {
      light: "2px",
      dark: "2px",
    },
  },
  "color.blue.200": {
    name: "color.blue.200",
    type: "color",
    tier: "primitive",
    description: "Blue 200.",
    value: {
      light: "#bfdbfe",
      dark: "#bfdbfe",
    },
  },
  "color.blue.300": {
    name: "color.blue.300",
    type: "color",
    tier: "primitive",
    description: "Blue 300.",
    value: {
      light: "#93c5fd",
      dark: "#93c5fd",
    },
  },
  "color.blue.400": {
    name: "color.blue.400",
    type: "color",
    tier: "primitive",
    description: "Blue 400.",
    value: {
      light: "#60a5fa",
      dark: "#60a5fa",
    },
  },
  "color.blue.700": {
    name: "color.blue.700",
    type: "color",
    tier: "primitive",
    description: "Blue 700.",
    value: {
      light: "#1d4ed8",
      dark: "#1d4ed8",
    },
  },
  "color.blue.800": {
    name: "color.blue.800",
    type: "color",
    tier: "primitive",
    description: "Blue 800.",
    value: {
      light: "#1e40af",
      dark: "#1e40af",
    },
  },
  "color.blue.900": {
    name: "color.blue.900",
    type: "color",
    tier: "primitive",
    description: "Blue 900.",
    value: {
      light: "#1e3a8a",
      dark: "#1e3a8a",
    },
  },
  "color.red.200": {
    name: "color.red.200",
    type: "color",
    tier: "primitive",
    description: "Red 200.",
    value: {
      light: "#fecaca",
      dark: "#fecaca",
    },
  },
  "color.red.300": {
    name: "color.red.300",
    type: "color",
    tier: "primitive",
    description: "Red 300.",
    value: {
      light: "#fca5a5",
      dark: "#fca5a5",
    },
  },
  "color.red.400": {
    name: "color.red.400",
    type: "color",
    tier: "primitive",
    description: "Red 400.",
    value: {
      light: "#f87171",
      dark: "#f87171",
    },
  },
  "color.red.700": {
    name: "color.red.700",
    type: "color",
    tier: "primitive",
    description: "Red 700.",
    value: {
      light: "#b91c1c",
      dark: "#b91c1c",
    },
  },
  "color.red.800": {
    name: "color.red.800",
    type: "color",
    tier: "primitive",
    description: "Red 800.",
    value: {
      light: "#991b1b",
      dark: "#991b1b",
    },
  },
  "color.red.900": {
    name: "color.red.900",
    type: "color",
    tier: "primitive",
    description: "Red 900.",
    value: {
      light: "#7f1d1d",
      dark: "#7f1d1d",
    },
  },
  "color.slate.100": {
    name: "color.slate.100",
    type: "color",
    tier: "primitive",
    description: "Slate 100.",
    value: {
      light: "#f1f5f9",
      dark: "#f1f5f9",
    },
  },
  "color.slate.200": {
    name: "color.slate.200",
    type: "color",
    tier: "primitive",
    description: "Slate 200.",
    value: {
      light: "#e2e8f0",
      dark: "#e2e8f0",
    },
  },
  "color.slate.300": {
    name: "color.slate.300",
    type: "color",
    tier: "primitive",
    description: "Slate 300.",
    value: {
      light: "#cbd5e1",
      dark: "#cbd5e1",
    },
  },
  "color.slate.50": {
    name: "color.slate.50",
    type: "color",
    tier: "primitive",
    description: "Slate 50.",
    value: {
      light: "#f8fafc",
      dark: "#f8fafc",
    },
  },
  "color.slate.700": {
    name: "color.slate.700",
    type: "color",
    tier: "primitive",
    description: "Slate 700.",
    value: {
      light: "#334155",
      dark: "#334155",
    },
  },
  "color.slate.800": {
    name: "color.slate.800",
    type: "color",
    tier: "primitive",
    description: "Slate 800.",
    value: {
      light: "#1e293b",
      dark: "#1e293b",
    },
  },
  "color.slate.900": {
    name: "color.slate.900",
    type: "color",
    tier: "primitive",
    description: "Slate 900.",
    value: {
      light: "#0f172a",
      dark: "#0f172a",
    },
  },
  "color.white": {
    name: "color.white",
    type: "color",
    tier: "primitive",
    description: "White.",
    value: {
      light: "#ffffff",
      dark: "#ffffff",
    },
  },
  "control.min.lg": {
    name: "control.min.lg",
    type: "dimension",
    tier: "primitive",
    description: "Large control minimum size.",
    value: {
      light: "3.25rem",
      dark: "3.25rem",
    },
  },
  "control.min.md": {
    name: "control.min.md",
    type: "dimension",
    tier: "primitive",
    description: "Medium control minimum size.",
    value: {
      light: "2.75rem",
      dark: "2.75rem",
    },
  },
  "control.min.sm": {
    name: "control.min.sm",
    type: "dimension",
    tier: "primitive",
    description: "Small control minimum size.",
    value: {
      light: "2.25rem",
      dark: "2.25rem",
    },
  },
  "control.size.lg.min": {
    name: "control.size.lg.min",
    cssVar: "--sl-control-size-lg-min",
    type: "dimension",
    tier: "semantic",
    description: "Large control minimum block size.",
    value: {
      light: "3.25rem",
      dark: "3.25rem",
    },
  },
  "control.size.lg.padding.block": {
    name: "control.size.lg.padding.block",
    cssVar: "--sl-control-size-lg-padding-block",
    type: "dimension",
    tier: "semantic",
    description: "Large control block padding.",
    value: {
      light: "0.875rem",
      dark: "0.875rem",
    },
  },
  "control.size.lg.padding.inline": {
    name: "control.size.lg.padding.inline",
    cssVar: "--sl-control-size-lg-padding-inline",
    type: "dimension",
    tier: "semantic",
    description: "Large control inline padding.",
    value: {
      light: "1.25rem",
      dark: "1.25rem",
    },
  },
  "control.size.md.min": {
    name: "control.size.md.min",
    cssVar: "--sl-control-size-md-min",
    type: "dimension",
    tier: "semantic",
    description: "Medium control minimum block size.",
    value: {
      light: "2.75rem",
      dark: "2.75rem",
    },
  },
  "control.size.md.padding.block": {
    name: "control.size.md.padding.block",
    cssVar: "--sl-control-size-md-padding-block",
    type: "dimension",
    tier: "semantic",
    description: "Medium control block padding.",
    value: {
      light: "0.75rem",
      dark: "0.75rem",
    },
  },
  "control.size.md.padding.inline": {
    name: "control.size.md.padding.inline",
    cssVar: "--sl-control-size-md-padding-inline",
    type: "dimension",
    tier: "semantic",
    description: "Medium control inline padding.",
    value: {
      light: "1rem",
      dark: "1rem",
    },
  },
  "control.size.sm.min": {
    name: "control.size.sm.min",
    cssVar: "--sl-control-size-sm-min",
    type: "dimension",
    tier: "semantic",
    description: "Small control minimum block size.",
    value: {
      light: "2.25rem",
      dark: "2.25rem",
    },
  },
  "control.size.sm.padding.block": {
    name: "control.size.sm.padding.block",
    cssVar: "--sl-control-size-sm-padding-block",
    type: "dimension",
    tier: "semantic",
    description: "Small control block padding.",
    value: {
      light: "0.5rem",
      dark: "0.5rem",
    },
  },
  "control.size.sm.padding.inline": {
    name: "control.size.sm.padding.inline",
    cssVar: "--sl-control-size-sm-padding-inline",
    type: "dimension",
    tier: "semantic",
    description: "Small control inline padding.",
    value: {
      light: "0.75rem",
      dark: "0.75rem",
    },
  },
  "duration.fast": {
    name: "duration.fast",
    type: "duration",
    tier: "primitive",
    description: "Fast interaction duration.",
    value: {
      light: "120ms",
      dark: "120ms",
    },
  },
  "focus.ring.color": {
    name: "focus.ring.color",
    cssVar: "--sl-focus-ring-color",
    type: "color",
    tier: "semantic",
    description: "Outer color of the two-color keyboard focus indicator.",
    value: {
      light: "#0f172a",
      dark: "#ffffff",
    },
  },
  "focus.ring.contrast": {
    name: "focus.ring.contrast",
    cssVar: "--sl-focus-ring-contrast",
    type: "color",
    tier: "semantic",
    description: "Inner color of the two-color keyboard focus indicator.",
    value: {
      light: "#ffffff",
      dark: "#0f172a",
    },
  },
  "focus.ring.offset": {
    name: "focus.ring.offset",
    cssVar: "--sl-focus-ring-offset",
    type: "dimension",
    tier: "semantic",
    description: "Gap between a control and its focus ring.",
    value: {
      light: "2px",
      dark: "2px",
    },
  },
  "focus.ring.width": {
    name: "focus.ring.width",
    cssVar: "--sl-focus-ring-width",
    type: "dimension",
    tier: "semantic",
    description: "Focus outline thickness.",
    value: {
      light: "3px",
      dark: "3px",
    },
  },
  "font.weight.semibold": {
    name: "font.weight.semibold",
    type: "fontWeight",
    tier: "primitive",
    description: "Semibold font weight.",
    value: {
      light: "600",
      dark: "600",
    },
  },
  "opacity.disabled": {
    name: "opacity.disabled",
    type: "number",
    tier: "primitive",
    description: "Unavailable-state opacity.",
    value: {
      light: "0.55",
      dark: "0.55",
    },
  },
  "radius.md": {
    name: "radius.md",
    type: "dimension",
    tier: "primitive",
    description: "Medium corner radius.",
    value: {
      light: "0.5rem",
      dark: "0.5rem",
    },
  },
  "size.focus.offset": {
    name: "size.focus.offset",
    type: "dimension",
    tier: "primitive",
    description: "Gap between a control and its focus ring.",
    value: {
      light: "2px",
      dark: "2px",
    },
  },
  "size.focus.width": {
    name: "size.focus.width",
    type: "dimension",
    tier: "primitive",
    description: "Focus outline thickness.",
    value: {
      light: "3px",
      dark: "3px",
    },
  },
  "size.icon": {
    name: "size.icon",
    type: "dimension",
    tier: "primitive",
    description: "Icon size relative to the label.",
    value: {
      light: "1.1em",
      dark: "1.1em",
    },
  },
  "size.spinner.width": {
    name: "size.spinner.width",
    type: "dimension",
    tier: "primitive",
    description: "Default spinner stroke width.",
    value: {
      light: "2px",
      dark: "2px",
    },
  },
  "space.2": {
    name: "space.2",
    type: "dimension",
    tier: "primitive",
    description: "Space 2.",
    value: {
      light: "0.5rem",
      dark: "0.5rem",
    },
  },
  "space.3": {
    name: "space.3",
    type: "dimension",
    tier: "primitive",
    description: "Space 3.",
    value: {
      light: "0.75rem",
      dark: "0.75rem",
    },
  },
  "space.3-5": {
    name: "space.3-5",
    type: "dimension",
    tier: "primitive",
    description: "Space 3.5.",
    value: {
      light: "0.875rem",
      dark: "0.875rem",
    },
  },
  "space.4": {
    name: "space.4",
    type: "dimension",
    tier: "primitive",
    description: "Space 4.",
    value: {
      light: "1rem",
      dark: "1rem",
    },
  },
  "space.5": {
    name: "space.5",
    type: "dimension",
    tier: "primitive",
    description: "Space 5.",
    value: {
      light: "1.25rem",
      dark: "1.25rem",
    },
  },
  "surface.bg": {
    name: "surface.bg",
    cssVar: "--sl-surface-bg",
    type: "color",
    tier: "semantic",
    description: "Theme canvas background.",
    value: {
      light: "#ffffff",
      dark: "#0f172a",
    },
  },
  "surface.fg": {
    name: "surface.fg",
    cssVar: "--sl-surface-fg",
    type: "color",
    tier: "semantic",
    description: "Theme canvas foreground.",
    value: {
      light: "#0f172a",
      dark: "#f8fafc",
    },
  },
} as const

export type TokenName = keyof typeof tokens

export type DesignToken = (typeof tokens)[TokenName]
