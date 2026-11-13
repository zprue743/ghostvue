import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const contentTypes: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

/** Starts a static server owned by one browser test and returns explicit cleanup. */
export async function startStaticServer(relativeRoot: string): Promise<{
  url: string
  close: () => Promise<void>
}> {
  const root = resolve(process.cwd(), relativeRoot)
  const server = createServer((request, response) => {
    const respond = async (): Promise<void> => {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
      const pathname = decodeURIComponent(requestUrl.pathname)
      const requestedPath = resolve(
        root,
        `.${pathname === '/' ? '/index.html' : pathname}`,
      )

      // Keep the generic fixture from ever serving files outside its declared
      // build root, even when a test accidentally requests traversal segments.
      if (
        requestedPath !== root &&
        !requestedPath.startsWith(`${root}${sep}`)
      ) {
        response.writeHead(403).end('Forbidden')
        return
      }

      try {
        // Mirror Vercel `cleanUrls`: `/components/button` serves `button.html`.
        const servedPath =
          extname(requestedPath) === ''
            ? `${requestedPath}.html`
            : requestedPath
        const body = await readFile(servedPath)
        response
          .writeHead(200, {
            'content-type':
              contentTypes[extname(servedPath)] ?? 'application/octet-stream',
          })
          .end(body)
      } catch {
        response.writeHead(404).end('Not found')
      }
    }

    // Node's request callback does not consume promises, so handle the entire
    // response path internally and deliberately discard the settled promise.
    void respond()
  })

  await new Promise<void>((resolveListening, rejectListening) => {
    server.once('error', rejectListening)
    server.listen(0, '127.0.0.1', resolveListening)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Static test server did not receive a TCP port.')
  }

  return {
    url: `http://127.0.0.1:${String(address.port)}`,
    close: async () => {
      // Browser keep-alive connections can otherwise delay close indefinitely
      // on Windows, which would hide a passing test behind a process timeout.
      server.closeAllConnections()
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) rejectClose(error)
          else resolveClose()
        })
      })
    },
  }
}
