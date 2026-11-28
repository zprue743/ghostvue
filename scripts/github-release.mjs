import { execFileSync, spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { distributionTag } from './publish-release.mjs'
import { publishableWorkspacePackages } from './workspace-packages.mjs'

function changelogSection(markdown, version) {
  const lines = markdown.split(/\r?\n/)
  const start = lines.indexOf(`## ${version}`)
  if (start === -1) throw new Error(`Missing changelog entry for ${version}.`)
  const end = lines.findIndex(
    (line, index) => index > start && line.startsWith('## '),
  )
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim()
}

export async function createRelease({
  GITHUB_REF,
  GITHUB_REPOSITORY,
  GITHUB_SHA,
  GITHUB_RUN_ID,
  EXPECTED_VERSION,
}) {
  const channel = distributionTag(GITHUB_REF, EXPECTED_VERSION)
  const tag = `v${EXPECTED_VERSION}`
  const tagRef = `refs/tags/${tag}`
  const remote = execFileSync(
    'git',
    ['ls-remote', '--tags', 'origin', tagRef, `${tagRef}^{}`],
    {
      encoding: 'utf8',
    },
  ).trim()
  const refs = new Map(
    remote
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, ref] = line.split('\t')
        return [ref, sha]
      }),
  )
  const target = refs.get(`${tagRef}^{}`) ?? refs.get(tagRef)
  if (target && target !== GITHUB_SHA)
    throw new Error(`${tag} points to a different commit.`)

  if (target) {
    const existing = spawnSync(
      'gh',
      [
        'release',
        'view',
        tag,
        '--repo',
        GITHUB_REPOSITORY,
        '--json',
        'isDraft,url',
      ],
      { encoding: 'utf8' },
    )
    if (existing.status === 0) {
      const release = JSON.parse(existing.stdout)
      if (release.isDraft)
        throw new Error(
          `${tag} has a draft release. Review it before continuing.`,
        )
      console.log(release.url)
      return
    }
  }

  const notes = [
    `[Verified npm publication](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})`,
  ]
  for (const { name, directory } of publishableWorkspacePackages) {
    const changelog = await readFile(
      `packages/${directory}/CHANGELOG.md`,
      'utf8',
    )
    const changes = changelogSection(changelog, EXPECTED_VERSION)
    notes.push(
      `## ${name}\n\n[Install from npm](https://www.npmjs.com/package/${name}/v/${EXPECTED_VERSION})\n\n${changes}`,
    )
  }
  execFileSync(
    'gh',
    [
      'release',
      'create',
      tag,
      '--repo',
      GITHUB_REPOSITORY,
      '--target',
      GITHUB_SHA,
      '--title',
      `GhostVue ${EXPECTED_VERSION}`,
      '--notes-file',
      '-',
      channel === 'latest' ? '--latest' : '--latest=false',
    ],
    { input: notes.join('\n\n') + '\n', stdio: ['pipe', 'inherit', 'inherit'] },
  )
}

if (import.meta.main) {
  await createRelease(process.env)
}
