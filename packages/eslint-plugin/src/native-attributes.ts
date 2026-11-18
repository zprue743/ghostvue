/**
 * Attribute names that are valid on some HTML or SVG element. Components fall
 * through attributes they do not declare as props to their root element, so a
 * native name is never evidence of a mistake even when the component does not
 * declare it. The list is the union across elements on purpose: manifests do
 * not record which element a component renders, and a missed typo is cheaper
 * than a false error.
 *
 * Kept local instead of adding a dependency: the set changes rarely, and only
 * membership (not per-element validity) matters here.
 */
const NATIVE_ATTRIBUTES = new Set([
  // HTML (WHATWG attribute index, including global attributes).
  'accept',
  'accept-charset',
  'accesskey',
  'action',
  'allow',
  'allowfullscreen',
  'alpha',
  'alt',
  'as',
  'async',
  'autocapitalize',
  'autocomplete',
  'autocorrect',
  'autofocus',
  'autoplay',
  'blocking',
  'charset',
  'checked',
  'cite',
  'class',
  'closedby',
  'color',
  'colorspace',
  'cols',
  'colspan',
  'command',
  'commandfor',
  'content',
  'contenteditable',
  'controls',
  'coords',
  'crossorigin',
  'data',
  'datetime',
  'decoding',
  'default',
  'defer',
  'dir',
  'dirname',
  'disabled',
  'download',
  'draggable',
  'enctype',
  'enterkeyhint',
  'exportparts',
  'fetchpriority',
  'for',
  'form',
  'formaction',
  'formenctype',
  'formmethod',
  'formnovalidate',
  'formtarget',
  'headers',
  'height',
  'hidden',
  'high',
  'href',
  'hreflang',
  'http-equiv',
  'id',
  'imagesizes',
  'imagesrcset',
  'inert',
  'inputmode',
  'integrity',
  'is',
  'ismap',
  'itemid',
  'itemprop',
  'itemref',
  'itemscope',
  'itemtype',
  'kind',
  'label',
  'lang',
  'list',
  'loading',
  'loop',
  'low',
  'max',
  'maxlength',
  'media',
  'method',
  'min',
  'minlength',
  'multiple',
  'muted',
  'name',
  'nomodule',
  'nonce',
  'novalidate',
  'open',
  'optimum',
  'part',
  'pattern',
  'ping',
  'placeholder',
  'playsinline',
  'popover',
  'popovertarget',
  'popovertargetaction',
  'poster',
  'preload',
  'readonly',
  'referrerpolicy',
  'rel',
  'required',
  'reversed',
  'role',
  'rows',
  'rowspan',
  'sandbox',
  'scope',
  'selected',
  'shadowrootclonable',
  'shadowrootdelegatesfocus',
  'shadowrootmode',
  'shadowrootserializable',
  'shape',
  'size',
  'sizes',
  'slot',
  'span',
  'spellcheck',
  'src',
  'srcdoc',
  'srclang',
  'srcset',
  'start',
  'step',
  'style',
  'switch',
  'tabindex',
  'target',
  'title',
  'translate',
  'type',
  'usemap',
  'value',
  'virtualkeyboardpolicy',
  'width',
  'wrap',
  'writingsuggestions',
  // DOM properties Vue sets directly when bound on an element root.
  'innerhtml',
  'innertext',
  'textcontent',
  // Common SVG attributes for components that render an SVG root or icon.
  'clip-path',
  'clip-rule',
  'cx',
  'cy',
  'd',
  'fill',
  'fill-opacity',
  'fill-rule',
  'focusable',
  'opacity',
  'points',
  'preserveaspectratio',
  'r',
  'rx',
  'ry',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-width',
  'transform',
  'viewbox',
  'x',
  'x1',
  'x2',
  'xmlns',
  'y',
  'y1',
  'y2',
])

/**
 * Names Vue consumes itself or never forwards as a component prop: special
 * attributes and the Vue 2 slot syntax that Vue 3 still parses.
 */
const VUE_RESERVED_ATTRIBUTES = new Set([
  'key',
  'ref',
  'ref_for',
  'ref_key',
  'slot-scope',
])

/** `fooBar` -> `foo-bar`, matching Vue's `hyphenate`. */
export function hyphenate(name: string): string {
  return name.replace(/\B([A-Z])/g, '-$1').toLowerCase()
}

/** `foo-bar` -> `fooBar`, matching Vue's `camelize`. */
export function camelize(name: string): string {
  return name.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())
}

/**
 * True when `name` is an attribute the rules must never report: ARIA and
 * `data-*` attributes, native HTML/SVG attributes in either kebab or camel
 * case, Vue reserved attributes, and listener bindings (`:onClick`,
 * `onclick`), which are events rather than props.
 */
export function isAllowedNonPropAttribute(name: string): boolean {
  if (/^(aria|data)-/i.test(name) || /^aria[A-Z]/.test(name)) return true
  if (/^on[A-Z:]/.test(name) || /^on[a-z]+$/.test(name)) return true
  if (VUE_RESERVED_ATTRIBUTES.has(name)) return true
  return (
    NATIVE_ATTRIBUTES.has(name.toLowerCase()) ||
    NATIVE_ATTRIBUTES.has(hyphenate(name))
  )
}
