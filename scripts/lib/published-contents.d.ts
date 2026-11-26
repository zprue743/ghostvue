export function packedContentProblems(pack: {
  name: string
  files: readonly string[]
  readText: (path: string) => string
}): string[]
