export interface VisualDockerOptions {
  cwd?: string
  uid?: number | null
  gid?: number | null
}

export function buildVisualDockerArgs(options?: VisualDockerOptions): string[]
