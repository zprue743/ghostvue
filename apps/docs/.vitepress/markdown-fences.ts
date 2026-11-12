/**
 * Walk markdown, transforming only the text that sits outside fenced code.
 * Docs processors that rewrite `<GhostExample>` must skip quoted illustrations.
 */
export function mapOutsideFences(
  markdown: string,
  transform: (chunk: string) => string,
): string {
  let result = ''
  let index = 0

  while (index < markdown.length) {
    const fence = fenceAt(markdown, index)
    if (!fence) {
      const nextFence = findNextFence(markdown, index + 1)
      const end = nextFence ?? markdown.length
      result += transform(markdown.slice(index, end))
      index = end
      continue
    }

    const closeEnd = closingFenceEnd(
      markdown,
      fence.contentStart,
      fence.char,
      fence.length,
    )
    result += markdown.slice(index, closeEnd)
    index = closeEnd
  }

  return result
}

function fenceAt(
  markdown: string,
  index: number,
): { char: '`' | '~'; length: number; contentStart: number } | undefined {
  if (index !== 0 && markdown[index - 1] !== '\n') {
    return undefined
  }

  const char = markdown[index]
  if (char !== '`' && char !== '~') {
    return undefined
  }

  let length = 0
  while (markdown[index + length] === char) {
    length += 1
  }
  if (length < 3) {
    return undefined
  }

  const lineEnd = markdown.indexOf('\n', index)
  return {
    char,
    length,
    contentStart: lineEnd === -1 ? markdown.length : lineEnd + 1,
  }
}

function findNextFence(markdown: string, from: number): number | undefined {
  for (let index = from; index < markdown.length; index += 1) {
    if (fenceAt(markdown, index)) {
      return index
    }
  }

  return undefined
}

function closingFenceEnd(
  markdown: string,
  from: number,
  char: '`' | '~',
  minLength: number,
): number {
  for (let index = from; index < markdown.length; index += 1) {
    if (index !== 0 && markdown[index - 1] !== '\n') {
      continue
    }

    let length = 0
    while (markdown[index + length] === char) {
      length += 1
    }
    if (length < minLength) {
      continue
    }

    let cursor = index + length
    while (markdown[cursor] === ' ' || markdown[cursor] === '\t') {
      cursor += 1
    }
    if (markdown[cursor] === undefined || markdown[cursor] === '\n') {
      return markdown[cursor] === '\n' ? cursor + 1 : cursor
    }
  }

  return markdown.length
}
