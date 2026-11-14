import { cruise } from 'dependency-cruiser'

import { createDependencyCruiserConfig } from '../../../.dependency-cruiser.mjs'

const config = createDependencyCruiserConfig(process.argv[2])
const result = await cruise([process.argv[3]], {
  ...config.options,
  validate: true,
  ruleSet: { forbidden: config.forbidden },
})

console.log(JSON.stringify(result.output))
