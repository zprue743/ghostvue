import { fileURLToPath } from 'node:url'

import { scaffoldComponent } from './lib/new-component.js'

const args = process.argv.slice(2)
const names = args.filter((arg) => arg !== '--dry-run')
try {
  if (names.length !== 1)
    throw new Error('Usage: pnpm new:component <Name> [--dry-run]')
  const result = await scaffoldComponent(
    fileURLToPath(new URL('..', import.meta.url)),
    names[0],
    { dryRun: args.includes('--dry-run') },
  )
  console.log(`${result.dryRun ? 'Would create' : 'Created'} ${result.name}:`)
  for (const path of result.created) console.log(`  + ${path}`)
  for (const path of result.updated) console.log(`  update ${path}`)
  console.log(
    'Complete and approve the specification before implementing production behavior. Run pnpm verify and pnpm test:e2e; add a Changeset when publishing the component.',
  )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
