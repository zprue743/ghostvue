export function workspaceBuildLockPath(root: string): string

export function ensureWorkspaceBuilt(options: {
  root: string
  isBuilt: () => boolean
  build: () => void
  timeoutMs?: number
}): boolean
