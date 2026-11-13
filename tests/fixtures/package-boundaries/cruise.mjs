import { fileURLToPath } from 'node:url'

import { cruise } from 'dependency-cruiser'

import config from '../../../.dependency-cruiser.mjs'

const result = await cruise([process.argv[2]], {
  ...config.options,
  // Production excludes fixtures; this scan must actually inspect them.
  exclude: { path: [] },
  // Read the repository's root tsconfig, even though cwd is the temp workspace.
  tsConfig: {
    fileName: fileURLToPath(new URL('../../../tsconfig.json', import.meta.url)),
  },
  validate: true,
  ruleSet: { forbidden: config.forbidden },
})

console.log(JSON.stringify(result.output))
