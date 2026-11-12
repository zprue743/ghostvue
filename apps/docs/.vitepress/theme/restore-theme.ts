export const DOCS_THEME_STORAGE_KEY = 'ghost-docs-theme'

export const DOCS_THEME_OPTIONS = [
  'default',
  'calm',
  'vibrant',
  'mono',
] as const

export type DocsThemeName = (typeof DOCS_THEME_OPTIONS)[number]

export const DOCS_DEFAULT_THEME: DocsThemeName = 'calm'

export function isDocsThemeName(value: string): value is DocsThemeName {
  return (DOCS_THEME_OPTIONS as readonly string[]).includes(value)
}

/**
 * First-paint host for the docs chrome. `calm` is the dogfood default;
 * the blocking script may replace `data-ghost-theme` from localStorage.
 */
export function applyDocsThemeHost(html: string): string {
  let next = html
  if (!next.includes('data-ghost-theme=')) {
    next = next.replace(/<html\b/, '<html data-ghost-theme="calm"')
  }
  if (/<html\b[^>]*\bclass=["']/.test(next)) {
    // Match the class token, not `data-ghost-theme`, which contains the same
    // substring after the rebrand.
    if (!/<html\b[^>]*\bclass=["'][^"']*\bghost-theme(?:\s|["'])/.test(next)) {
      next = next.replace(/(<html\b[^>]*\bclass=["'])/, '$1ghost-theme ')
    }
  } else {
    next = next.replace(/<html\b/, '<html class="ghost-theme"')
  }
  return next
}

/**
 * Blocking inline script: restore a persisted theme and align `data-ghost-mode`
 * with VitePress appearance before first paint (ADR 0008).
 */
export const restoreDocsThemeScript = `(function(){try{var r=document.documentElement;r.classList.add("ghost-theme");var k=${JSON.stringify(DOCS_THEME_STORAGE_KEY)};var a={default:1,calm:1,vibrant:1,mono:1};var t=localStorage.getItem(k);r.setAttribute("data-ghost-theme",t&&a[t]?t:"${DOCS_DEFAULT_THEME}");var v=localStorage.getItem("vitepress-theme-appearance");var d=v==="dark"||((v==="auto"||v==null)&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(v==="light")d=false;r.setAttribute("data-ghost-mode",d?"dark":"light")}catch(e){}})();`
