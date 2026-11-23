export interface WorkspacePackage {
  directory: string
  name: string
  responsibility: string
  allowedDependencies: string[]
  /**
   * Package names (workspace or external) this package must never declare in
   * any dependency group, including devDependencies.
   */
  forbiddenDependencies?: string[]
}

export const workspacePackages: readonly WorkspacePackage[]
