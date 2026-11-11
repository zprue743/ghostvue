/** Built-in generated themes. Runtime-safe; no color science. */
export const flagshipThemes = ['calm', 'vibrant', 'mono'] as const

export type FlagshipThemeName = (typeof flagshipThemes)[number]

export const themeNames = ['default', ...flagshipThemes] as const

export type ThemeName = (typeof themeNames)[number]
