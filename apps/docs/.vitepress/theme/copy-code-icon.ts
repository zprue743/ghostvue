/**
 * Shared 16px Copy (overlapping squares) and Checkmark SVG geometry used by
 * both `CopyCodeIcon.vue` (inside `DemoPreview`) and `enhance-code-fences.ts`
 * (for standalone VitePress markdown fences).
 */
export const COPY_ICON_VIEWBOX = '0 0 16 16'

/** Front square + back overlapping L-path for the 16px Copy icon. */
export const COPY_ICON_RECT = {
  x: '5.5',
  y: '5.5',
  width: '8',
  height: '8',
  rx: '1.5',
} as const

export const COPY_ICON_PATH =
  'M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5'

/** 16px Checkmark path. */
export const CHECK_ICON_PATH = 'M3.5 8.5 6.5 11.5 12.5 4.5'

/**
 * Create the `.ghost-copy-icon` DOM node for imperative hydration of
 * VitePress-rendered `button.copy` elements.
 */
export function createCopyCodeIconElement(): HTMLSpanElement {
  const svgNs = 'http://www.w3.org/2000/svg'

  const wrapper = document.createElement('span')
  wrapper.className = 'ghost-copy-icon'
  wrapper.setAttribute('aria-hidden', 'true')

  const copySvg = document.createElementNS(svgNs, 'svg')
  copySvg.setAttribute('class', 'ghost-copy-icon__copy')
  copySvg.setAttribute('viewBox', COPY_ICON_VIEWBOX)
  copySvg.setAttribute('width', '16')
  copySvg.setAttribute('height', '16')
  copySvg.setAttribute('fill', 'none')
  copySvg.setAttribute('stroke', 'currentColor')
  copySvg.setAttribute('stroke-width', '1.5')
  copySvg.setAttribute('stroke-linecap', 'round')
  copySvg.setAttribute('stroke-linejoin', 'round')

  const rect = document.createElementNS(svgNs, 'rect')
  rect.setAttribute('x', COPY_ICON_RECT.x)
  rect.setAttribute('y', COPY_ICON_RECT.y)
  rect.setAttribute('width', COPY_ICON_RECT.width)
  rect.setAttribute('height', COPY_ICON_RECT.height)
  rect.setAttribute('rx', COPY_ICON_RECT.rx)

  const backPath = document.createElementNS(svgNs, 'path')
  backPath.setAttribute('d', COPY_ICON_PATH)
  copySvg.append(rect, backPath)

  const checkSvg = document.createElementNS(svgNs, 'svg')
  checkSvg.setAttribute('class', 'ghost-copy-icon__check')
  checkSvg.setAttribute('viewBox', COPY_ICON_VIEWBOX)
  checkSvg.setAttribute('width', '16')
  checkSvg.setAttribute('height', '16')
  checkSvg.setAttribute('fill', 'none')
  checkSvg.setAttribute('stroke', 'currentColor')
  checkSvg.setAttribute('stroke-width', '1.75')
  checkSvg.setAttribute('stroke-linecap', 'round')
  checkSvg.setAttribute('stroke-linejoin', 'round')

  const checkPath = document.createElementNS(svgNs, 'path')
  checkPath.setAttribute('d', CHECK_ICON_PATH)
  checkSvg.append(checkPath)

  wrapper.append(copySvg, checkSvg)
  return wrapper
}
