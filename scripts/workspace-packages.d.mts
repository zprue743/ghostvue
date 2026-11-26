export interface WorkspacePackage {
  directory: string
  name: string
  responsibility: string
  /**
   * True for packages on the npm release train. False for internal packages
   * that stay private and are never released (`@ghostvue/core`,
   * `@ghostvue/shared`).
   */
  publishable: boolean
  allowedDependencies: string[]
  /**
   * Package names (workspace or external) this package must never declare in
   * any dependency group, including devDependencies.
   */
  forbiddenDependencies?: string[]
}

export const workspacePackages: readonly WorkspacePackage[]

/** Workspace packages with `publishable: true`, in catalog order. */
export const publishableWorkspacePackages: readonly WorkspacePackage[]
