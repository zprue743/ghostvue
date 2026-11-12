import { access, readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Run after `pnpm docs:build`. Asserts every in-site page href in the
// VitePress output maps to a real file under cleanUrls rules.

const distRoot = fileURLToPath(
  new URL('../apps/docs/.vitepress/dist/', import.meta.url),
)
const SITE_ORIGIN = 'https://docs.local'
const HREF_ATTR = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
const SKIP_HREF = /^(?:https?:|mailto:|tel:|javascript:|data:)/i

const htmlFiles = await collectHtmlFiles(distRoot)
if (htmlFiles.length === 0) {
  throw new Error(
    `No HTML files under ${distRoot}; run \`pnpm docs:build\` first.`,
  )
}

const violations = []

for (const htmlFile of htmlFiles) {
  const source = await readFile(htmlFile, 'utf8')
  const pageLabel = toPosix(relative(distRoot, htmlFile))
  const pageUrl = publishedPageUrl(htmlFile)

  for (const href of collectHrefs(source)) {
    if (SKIP_HREF.test(href)) {
      continue
    }

    const pathname = stripQueryAndHash(href)
    if (!pathname) {
      continue
    }

    let resolved
    try {
      resolved = new URL(pathname, pageUrl)
    } catch {
      violations.push(`${pageLabel}: invalid href ${href}`)
      continue
    }

    if (resolved.origin !== SITE_ORIGIN) {
      continue
    }

    const target = resolved.pathname
    const candidates = pageFileCandidates(target)
    if (!candidates) {
      continue
    }

    if (!(await anyExists(candidates))) {
      violations.push(`${pageLabel}: ${href} -> ${target}`)
    }
  }
}

if (violations.length > 0) {
  console.error('Broken internal docs hrefs:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exitCode = 1
}

function publishedPageUrl(htmlFile) {
  const relativePath = toPosix(relative(distRoot, htmlFile))
  if (relativePath === 'index.html') {
    return `${SITE_ORIGIN}/`
  }
  if (relativePath.endsWith('/index.html')) {
    return `${SITE_ORIGIN}/${relativePath.slice(0, -'index.html'.length)}`
  }
  if (relativePath.endsWith('.html')) {
    return `${SITE_ORIGIN}/${relativePath.slice(0, -'.html'.length)}`
  }
  return `${SITE_ORIGIN}/${relativePath}`
}

function pageFileCandidates(pathname) {
  const relativePath = pathname.replace(/^\/+/, '')
  if (pathname.endsWith('/')) {
    return [join(distRoot, relativePath, 'index.html')]
  }

  const extension = extname(pathname)
  if (extension === '.html') {
    return [join(distRoot, relativePath)]
  }
  if (extension) {
    return undefined
  }

  return [
    join(distRoot, `${relativePath}.html`),
    join(distRoot, relativePath, 'index.html'),
  ]
}

function collectHrefs(source) {
  const hrefs = []
  for (const match of source.matchAll(HREF_ATTR)) {
    const href = match[1] ?? match[2]
    if (href) {
      hrefs.push(href)
    }
  }
  return hrefs
}

function stripQueryAndHash(href) {
  const withoutHash = href.split('#', 1)[0] ?? ''
  return withoutHash.split('?', 1)[0] ?? ''
}

async function anyExists(paths) {
  for (const path of paths) {
    if (!isInsideDist(path)) {
      continue
    }
    if (await exists(path)) {
      return true
    }
  }
  return false
}

function isInsideDist(absolutePath) {
  const relativePath = relative(distRoot, absolutePath)
  return (
    relativePath === '' ||
    (!relativePath.startsWith(`..${sep}`) && relativePath !== '..')
  )
}

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(absolutePath)))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(absolutePath)
    }
  }

  return files
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function toPosix(value) {
  return value.replaceAll('\\', '/')
}
