import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { workspacePackages } from './workspace-packages.mjs'
import { runThemesDefinePackedSmoke } from './themes-define-packed-smoke.mjs'

// Run after `pnpm build` so the tarballs contain the release artifacts.
const root = fileURLToPath(new URL('..', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'ghostvue-exports-'))

/** @type {Record<string, string>} */
const packedTarballsByName = {}

try {
  for (const { directory, name } of workspacePackages) {
    const destination = join(temporary, directory)
    console.log(`\nChecking packed exports: ${name}`)
    execFileSync('pnpm', ['pack', '--pack-destination', destination], {
      cwd: join(root, 'packages', directory),
      stdio: 'pipe',
    })
    const [archive] = (await readdir(destination)).filter((file) =>
      file.endsWith('.tgz'),
    )
    const tarball = join(destination, archive)
    packedTarballsByName[name] = tarball
    execFileSync('pnpm', ['exec', 'publint', tarball, '--level', 'error'], {
      cwd: root,
      stdio: 'inherit',
    })
    const manifest = JSON.parse(
      await readFile(join(root, 'packages', directory, 'package.json'), 'utf8'),
    )
    // CSS and JSON exports are assets, not JavaScript/TypeScript entrypoints.
    const assets = Object.entries(manifest.exports)
      .filter(
        ([, target]) =>
          typeof target === 'string' && /\.(css|json)$/.test(target),
      )
      .map(([entry]) => entry)
    // ESM-only packages require dynamic import from CommonJS consumers.
    execFileSync(
      'pnpm',
      [
        'exec',
        'attw',
        '--pack',
        tarball,
        '--format',
        'table-flipped',
        '--no-color',
        '--no-emoji',
        '--ignore-rules',
        'cjs-resolves-to-esm',
        ...(assets.length ? ['--exclude-entrypoints', ...assets] : []),
      ],
      {
        cwd: root,
        stdio: 'inherit',
      },
    )
  }
  console.log('\nRunning packed @ghostvue/themes/define smoke test…')
  await runThemesDefinePackedSmoke({ prepackedTarballs: packedTarballsByName })
  console.log('Packed @ghostvue/themes/define smoke passed.')

  console.log(
    '\nAll packed package exports pass publint, attw, and define smoke.',
  )
} finally {
  await rm(temporary, { recursive: true, force: true })
}
