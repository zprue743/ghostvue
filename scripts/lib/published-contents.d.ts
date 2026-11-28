export function packedContentProblems(pack: {
  name: string
  files: readonly string[]
  readText: (path: string) => string
}): string[]
export function expandExportTarget(
  packageDirectory: string,
  target: string,
): Promise<{ star: string | undefined; target: string }[]>
