import type {
  ExecFileOptions,
  ExecFileSyncOptions,
  PromiseWithChild,
} from 'node:child_process'

export interface PackageManagerResolutionOptions {
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  execPath?: string
  existsSync?: (path: string) => boolean
  pathDelimiter?: string
}

export interface PackageManagerInvocation {
  file: string
  args: string[]
}

export function resolvePackageManagerInvocation(
  command: string,
  args?: string[],
  options?: PackageManagerResolutionOptions,
): PackageManagerInvocation

export function execPackageManagerSync(
  command: string,
  args?: string[],
  execOptions?: ExecFileSyncOptions,
): string | Buffer

export function execPackageManager(
  command: string,
  args?: string[],
  execOptions?: ExecFileOptions,
): PromiseWithChild<{ stdout: string | Buffer; stderr: string | Buffer }>
