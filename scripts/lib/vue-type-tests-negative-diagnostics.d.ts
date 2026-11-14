export interface VueTscDiagnostic {
  file: string
  line: string
  code: string
  message: string
}

export function parseVueTscErrorLines(output: string): VueTscDiagnostic[]
