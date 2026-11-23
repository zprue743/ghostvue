#!/usr/bin/env node
/**
 * Builds or checks the `@ghostvue/mcp` offline asset bundle (GHO-17 plan §4).
 *
 *   node scripts/bundle-assets.mjs           # write dist/assets + bundle.json
 *   node scripts/bundle-assets.mjs --check   # rebuild in memory, compare ids
 *
 * Run after `pnpm registries:write`, `pnpm manifests`, and the themes build;
 * the docs corpus is generated here from the shared `generateLlmsDocuments`.
 */
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  generateDocsCorpusPages,
  loadExampleCatalog,
} from '../../../scripts/lib/mcp-asset-sources.js'
import {
  checkAssetBundle,
  collectAssetBundle,
  writeAssetBundle,
} from './lib/asset-bundle.js'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const repositoryRoot = resolve(packageRoot, '../..')
const assetsDir = join(packageRoot, 'dist/assets')
const checkMode = process.argv.includes('--check')

const files = await collectAssetBundle({
  repositoryRoot,
  loadDocsPages: () => generateDocsCorpusPages(repositoryRoot),
  loadExampleCatalog: () => loadExampleCatalog(repositoryRoot),
})

if (checkMode) {
  const result = await checkAssetBundle(files, assetsDir)
  if (!result.fresh) {
    console.error(
      [
        `@ghostvue/mcp asset bundle is stale (expected ${result.expectedId}, found ${result.actualId ?? 'none'}).`,
        ...result.problems.slice(0, 50).map((problem) => `  - ${problem}`),
        result.problems.length > 50
          ? `  … ${result.problems.length - 50} more`
          : '',
        'Rebuild with `pnpm build` (or `pnpm --filter @ghostvue/mcp build` after the themes build).',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    process.exitCode = 1
  } else {
    console.log(
      `@ghostvue/mcp asset bundle is fresh: ${result.expectedId} (${files.size} files).`,
    )
  }
} else {
  const metadata = await writeAssetBundle(assetsDir, files)
  console.log(
    `Wrote @ghostvue/mcp asset bundle ${metadata.assetBundleId} (${metadata.fileCount} files).`,
  )
}
