import { access, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import ts from 'typescript'

// Bundler-mode declaration emit omits extensions and retains .vue imports.
// Published ESM declarations need explicit paths, including Foo.vue.js -> Foo.vue.d.ts.
const directory = resolve(process.argv[2])
for (const file of await readdir(directory, { recursive: true })) {
  if (!file.endsWith('.d.ts')) continue
  const path = join(directory, file)
  let source = await readFile(path, 'utf8')
  const imports = ts.preProcessFile(source).importedFiles.toReversed()
  for (const { fileName, end } of imports) {
    if (!fileName.startsWith('.')) continue
    try {
      await access(resolve(dirname(path), `${fileName}.d.ts`))
    } catch {
      continue
    }
    source = `${source.slice(0, end + 1)}.js${source.slice(end + 1)}`
  }
  // CSS side effects belong in the JS entry; they provide no declaration types.
  source = source.replace(/^import ['"][^'"]+\.css['"];?\r?\n/gm, '')
  await writeFile(path, source)
}
