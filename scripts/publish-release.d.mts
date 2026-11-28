interface ReleaseTarball {
  name: string
  path: string
  integrity: string
}

export function distributionTag(
  ref: string | undefined,
  version: string | undefined,
): 'latest' | 'maintenance'

export function releaseTarballs(
  evidenceDir: string,
  sha: string | undefined,
  version: string,
): Promise<ReleaseTarball[]>

export function alreadyPublished(
  tarball: Pick<ReleaseTarball, 'name' | 'integrity'>,
  version: string,
  request?: typeof fetch,
): Promise<boolean>
