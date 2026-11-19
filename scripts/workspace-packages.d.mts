export interface WorkspacePackage {
  directory: string
  name: string
  responsibility: string
  allowedDependencies: string[]
}

export const workspacePackages: readonly WorkspacePackage[]
