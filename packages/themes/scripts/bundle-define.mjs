import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as esbuild from 'esbuild'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tokenFiles = [
  'seeds.json',
  'primitives.json',
  'semantic.json',
  'semantic.dark.json',
  'semantic.compact.json',
  'semantic.spacious.json',
]

await esbuild.build({
  entryPoints: [resolve(packageRoot, 'scripts/lib/define-bundle-entry.js')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: resolve(packageRoot, 'dist/define.js'),
  // culori stays a devDependency; bundling inlines it into dist/define.js for packed consumers.
  sourcemap: false,
  logLevel: 'warning',
})

const tokensDir = resolve(packageRoot, 'dist/tokens')
await mkdir(tokensDir, { recursive: true })
for (const name of tokenFiles) {
  await copyFile(resolve(packageRoot, 'tokens', name), resolve(tokensDir, name))
}
