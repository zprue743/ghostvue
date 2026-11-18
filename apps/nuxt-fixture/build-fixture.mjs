/**
 * Builds both fixture variants (`headless`, `themed`) with `nuxt build`, then
 * type-checks the page against each variant's generated auto-import
 * declarations (`.nuxt/<variant>/components.d.ts`, `imports.d.ts`).
 * Requires `@ghostvue/vue`, `@ghostvue/themes`, and `@ghostvue/nuxt` dist
 * output (`pnpm build`) because the fixture consumes the packages as an app
 * would, through their published exports.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('.', import.meta.url))

/** @param {string[]} args @param {NodeJS.ProcessEnv} [env] */
function run(args, env = process.env) {
  const result = spawnSync('pnpm', ['exec', ...args], {
    cwd,
    stdio: 'inherit',
    env,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const variants = ['headless', 'themed']

// The fixture's root tsconfig.json references every variant's generated
// `.nuxt/<variant>/tsconfig.*.json`, and Vite's SFC transform loads that root
// tsconfig with its references. Generate all variants' configs first, or a
// clean checkout fails the first build on the not-yet-generated variant.
for (const variant of variants) {
  console.log(`\nPreparing Nuxt fixture: ${variant}`)
  run(['nuxt', 'prepare'], { ...process.env, GHOSTVUE_NUXT_FIXTURE: variant })
}

for (const variant of variants) {
  console.log(`\nBuilding Nuxt fixture: ${variant}`)
  run(['nuxt', 'build'], { ...process.env, GHOSTVUE_NUXT_FIXTURE: variant })
}

console.log('\nType-checking the Nuxt fixture against both variants')
run(['vue-tsc', '-b', '--noEmit'])
