interface ReleaseTarball {
  name: string
  path: string
  integrity: string
}

export function releaseTarballs(
  evidenceDir: string,
  sha: string | undefined,
): Promise<ReleaseTarball[]>

export function alreadyPublished(
  tarball: Pick<ReleaseTarball, 'name' | 'integrity'>,
  request?: typeof fetch,
): Promise<boolean>
