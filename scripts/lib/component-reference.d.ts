import type { ComponentManifest } from './component-manifests.js'
import type {
  KeyboardTestReference,
  ReviewEvidence,
  VerificationStatus,
} from './accessibility-verification.js'

export type ReferenceManifest = Omit<
  ComponentManifest,
  'source' | 'styling' | 'accessibility' | 'examples'
> & {
  source: 'generated' | 'handwritten'
  styling: {
    parts: { name: string; description: string }[]
    states: { name: string; description: string }[]
    cssProperties: { name: string; description: string }[]
    attributes?: { name: string; values: string[]; description: string }[]
  }
  accessibility: {
    role: string
    apgPattern: string
    keyboard: Record<string, string>
    requiredAriaAttributes: string[]
    verification?: {
      automatedKeyboard: {
        status: VerificationStatus
        keys: Record<string, KeyboardTestReference[]>
      }
      manual: { status: VerificationStatus; evidence: ReviewEvidence[] }
      assistiveTechnology: {
        status: VerificationStatus
        evidence: ReviewEvidence[]
      }
    }
  }
  examples: string[]
}

export function stabilityBadge(status: string): string
export function manifestToMarkdown(manifest: ReferenceManifest): string
export function writeComponentReferences(repositoryRoot: string): Promise<void>
