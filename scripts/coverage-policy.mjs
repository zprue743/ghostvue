import { workspacePackages } from './workspace-packages.mjs'

export const lineCoverageThreshold = 80
export const coverageSourceDirectories = workspacePackages
  .map(({ directory }) => `packages/${directory}/src`)
  .sort()
