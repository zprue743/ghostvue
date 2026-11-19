import type { AllowedComponentProps, VNodeProps } from 'vue'

import type { GhostButton, GhostInput } from '@ghostvue/themes'

import type ButtonThemedExample from '../../../../examples/button/themed.vue'
import type InputSearchExample from '../../../../examples/input/search.vue'

/**
 * Typed props playgrounds for docs examples.
 *
 * A playground is an opt-in, explicit adapter: it names a few props that an
 * example SFC declares itself and forwards to its component. The docs host
 * binds the chosen values to the example as real props. Nothing is passed by
 * attribute fallthrough, so a control can never claim to change a prop the
 * demo ignores. Examples without an adapter render exactly as before.
 *
 * The adapters below are checked against both the example SFC's declared
 * props and the target component's props (`pnpm typecheck` runs vue-tsc on
 * `apps/docs/tsconfig.demo.json`), so renaming or removing a prop on either
 * side fails the build instead of leaving a dead control.
 */

/** A value a playground control can set: a string union member or a flag. */
export type DemoPlaygroundValue = string | boolean

/**
 * Props a consumer can pass to a component, without the props Vue adds to
 * every vnode (`key`, `ref`, `ref_for`, `ref_key`, `class`, `style`, vnode
 * hooks). Works on `defineComponent` results and on `<script setup>` SFCs
 * as vue-tsc types them.
 */
type PublicProps<C> = C extends abstract new (...args: never) => {
  $props: infer P
}
  ? Omit<P, keyof VNodeProps | keyof AllowedComponentProps>
  : never

/**
 * Props that the example SFC declares and the target component also accepts.
 * Values keep the example's (narrower or equal) types, which the example's
 * own template has already proven assignable to the target.
 */
export type DemoPlaygroundProps<Example, Target> = Pick<
  PublicProps<Example>,
  keyof PublicProps<Example> & keyof PublicProps<Target>
>

/**
 * One control per prop. String unions get a choice list; booleans get a
 * switch. Other prop types (objects, functions, numbers) are not offered:
 * the copied binding could not express them as plain template attributes.
 */
export type DemoPlaygroundControl<P> = {
  [K in keyof P & string]-?: NonNullable<P[K]> extends boolean
    ? {
        readonly kind: 'switch'
        readonly prop: K
        readonly label: string
        /** The value the example SFC declares when the prop is omitted. */
        readonly default: boolean
      }
    : NonNullable<P[K]> extends string
      ? {
          readonly kind: 'choice'
          readonly prop: K
          readonly label: string
          readonly options: readonly NonNullable<P[K]>[]
          /** The value the example SFC declares when the prop is omitted. */
          readonly default: NonNullable<P[K]>
        }
      : never
}[keyof P & string]

/** Adapter for one example, typed against that example and its component. */
export interface DemoPlayground<P> {
  /** Tag written in the copied binding, for example `GhostButton`. */
  readonly component: string
  readonly controls: readonly DemoPlaygroundControl<P>[]
}

/** Type-erased control the docs host renders. */
export type DemoPlaygroundControlSpec =
  | {
      readonly kind: 'switch'
      readonly prop: string
      readonly label: string
      readonly default: boolean
    }
  | {
      readonly kind: 'choice'
      readonly prop: string
      readonly label: string
      readonly options: readonly string[]
      readonly default: string
    }

/** Type-erased adapter the docs host renders. */
export interface DemoPlaygroundSpec {
  readonly component: string
  readonly controls: readonly DemoPlaygroundControlSpec[]
}

/** Values the reader changed, keyed by prop. Absent means "use the default". */
export type DemoPlaygroundOverrides = Readonly<
  Record<string, DemoPlaygroundValue>
>

/*
 * Each adapter is written with `satisfies` against the precise type and only
 * then widened into the erased map, so the precise check cannot be skipped
 * and no assertion is needed. Defaults repeat the SFC's destructure defaults;
 * a unit test mounts each example and compares them.
 */
const buttonThemed = {
  component: 'GhostButton',
  controls: [
    {
      kind: 'choice',
      prop: 'size',
      label: 'Size',
      options: ['sm', 'md', 'lg'],
      default: 'md',
    },
    {
      kind: 'choice',
      prop: 'tone',
      label: 'Tone',
      options: ['accent', 'neutral', 'danger'],
      default: 'danger',
    },
    {
      kind: 'choice',
      prop: 'variant',
      label: 'Variant',
      options: ['solid', 'soft', 'outline', 'ghost'],
      default: 'outline',
    },
  ],
} satisfies DemoPlayground<
  DemoPlaygroundProps<typeof ButtonThemedExample, typeof GhostButton>
>

const inputSearch = {
  component: 'GhostInput',
  controls: [
    {
      kind: 'choice',
      prop: 'size',
      label: 'Size',
      options: ['sm', 'md', 'lg'],
      default: 'md',
    },
    { kind: 'switch', prop: 'disabled', label: 'Disabled', default: false },
    { kind: 'switch', prop: 'invalid', label: 'Invalid', default: false },
  ],
} satisfies DemoPlayground<
  DemoPlaygroundProps<typeof InputSearchExample, typeof GhostInput>
>

const demoPlaygrounds: Readonly<Record<string, DemoPlaygroundSpec>> = {
  'button/themed': buttonThemed,
  'input/search': inputSearch,
}

/** The playground registered for an example id, if it opted in. */
export function demoPlaygroundFor(id: string): DemoPlaygroundSpec | undefined {
  return Object.hasOwn(demoPlaygrounds, id) ? demoPlaygrounds[id] : undefined
}

/** Every opted-in example id, for tests and docs tooling. */
export function demoPlaygroundIds(): string[] {
  return Object.keys(demoPlaygrounds)
}

/** Current value of a control: the override if set, else the SFC default. */
export function demoPlaygroundValue(
  control: DemoPlaygroundControlSpec,
  overrides: DemoPlaygroundOverrides,
): DemoPlaygroundValue {
  return overrides[control.prop] ?? control.default
}

/**
 * Record a change. Choosing the declared default drops the override instead
 * of storing it, so the summary lists only real differences from the
 * original example and returning to every default equals a reset.
 */
export function withDemoPlaygroundValue(
  overrides: DemoPlaygroundOverrides,
  control: DemoPlaygroundControlSpec,
  value: DemoPlaygroundValue,
): DemoPlaygroundOverrides {
  const next = Object.fromEntries(
    Object.entries(overrides).filter(([prop]) => prop !== control.prop),
  )
  if (value !== control.default) next[control.prop] = value
  return next
}

function formatAttribute(prop: string, value: DemoPlaygroundValue): string {
  if (value === true) return prop
  if (value === false) return `:${prop}="false"`
  return `${prop}="${value}"`
}

/**
 * Human summary of what differs from the original example, in control
 * order, for example `size="lg", disabled`. Empty when nothing is overridden.
 */
export function summarizeDemoPlayground(
  playground: DemoPlaygroundSpec,
  overrides: DemoPlaygroundOverrides,
): string {
  return playground.controls
    .filter((control) => Object.hasOwn(overrides, control.prop))
    .map((control) =>
      formatAttribute(control.prop, demoPlaygroundValue(control, overrides)),
    )
    .join(', ')
}

/**
 * Template binding for the current settings, for example
 * `<GhostButton size="lg" tone="danger" variant="outline" />`.
 *
 * It names every controlled prop (not only overrides) so the copy is
 * complete on its own. String values become static attributes, which vue-tsc
 * checks against the prop's union type in the consumer's template; `true`
 * becomes a bare boolean attribute; `false` is left out because an absent
 * Boolean prop is `false` in Vue.
 */
export function formatDemoPlaygroundBinding(
  playground: DemoPlaygroundSpec,
  overrides: DemoPlaygroundOverrides,
): string {
  const attributes = playground.controls.flatMap((control) => {
    const value = demoPlaygroundValue(control, overrides)
    return value === false ? [] : [formatAttribute(control.prop, value)]
  })
  return `<${[playground.component, ...attributes].join(' ')} />`
}
