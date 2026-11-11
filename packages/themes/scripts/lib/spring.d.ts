export interface SpringParams {
  stiffness: number
  damping: number
  mass: number
}

export interface CompiledSpring {
  easing: string
  durationMs: number
  pointCount: number
  samples: { t: number; value: number }[]
}

export function isSpringValue(value: unknown): value is SpringParams
export function compileSpring(value: unknown): CompiledSpring
export function serializeSpringEasing(value: unknown): string
export function serializeSpringDuration(value: unknown): string
