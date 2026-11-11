export function isShadowLayer(value: unknown): boolean
export function isShadowValue(value: unknown): boolean
export function isGradientStop(value: unknown): boolean
export function isGradientLayer(value: unknown): boolean
export function isGradientValue(value: unknown): boolean
export function isCubicBezierValue(value: unknown): boolean
export function isCompositeValue(value: unknown): boolean
export function serializeShadow(value: unknown): string
export function serializeGradientLayer(layer: unknown): string
export function serializeGradient(value: unknown): string
export function serializeCubicBezier(value: unknown): string
export function serializeComposite(type: string, value: unknown): string
