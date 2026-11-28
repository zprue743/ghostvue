/**
 * Walk markdown, transforming only the text that sits outside fenced code.
 * Docs processors that rewrite `<GhostExample>` must skip quoted illustrations.
 * `start` is the chunk's offset in `markdown`, for callers that must relate
 * chunks to the whole page (for example an HTML comment that spans a fence).
 *
 * Fences follow CommonMark (https://spec.commonmark.org/0.31.2/#fenced-code-blocks),
 * as markdown-it renders them: an opening or closing marker may be indented by
 * up to three spaces, and a backtick fence's info string may not contain a
 * backtick. Four spaces would make an indented code block, which is out of
 * scope here; without the 0-3 space allowance a quoted `<GhostExample>` in an
 * indented fence would be treated as live.
 */
export function mapOutsideFences(
  markdown: string,
  transform: (chunk: string, start: number) => string,
): string {
  let result = ''
  let index = 0

  while (index < markdown.length) {
    const fence = fenceAt(markdown, index)
    if (!fence) {
      const nextFence = findNextFence(markdown, index + 1)
      const end = nextFence ?? markdown.length
      result += transform(markdown.slice(index, end), index)
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

/** Index after the 0-3 spaces CommonMark allows before a fence marker. */
function skipFenceIndent(markdown: string, lineStart: number): number {
  let cursor = lineStart
  while (cursor - lineStart < 3 && markdown[cursor] === ' ') {
    cursor += 1
  }
  return cursor
}

function fenceAt(
  markdown: string,
  index: number,
): { char: '`' | '~'; length: number; contentStart: number } | undefined {
  if (index !== 0 && markdown[index - 1] !== '\n') {
    return undefined
  }

  const markerStart = skipFenceIndent(markdown, index)
  const char = markdown[markerStart]
  if (char !== '`' && char !== '~') {
    return undefined
  }

  let length = 0
  while (markdown[markerStart + length] === char) {
    length += 1
  }
  if (length < 3) {
    return undefined
  }

  const lineEnd = markdown.indexOf('\n', markerStart)
  // A backtick in the info string makes the line inline code, not a fence.
  const info = markdown.slice(
    markerStart + length,
    lineEnd === -1 ? markdown.length : lineEnd,
  )
  if (char === '`' && info.includes('`')) {
    return undefined
  }

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

    const markerStart = skipFenceIndent(markdown, index)
    let length = 0
    while (markdown[markerStart + length] === char) {
      length += 1
    }
    if (length < minLength) {
      continue
    }

    let cursor = markerStart + length
    while (markdown[cursor] === ' ' || markdown[cursor] === '\t') {
      cursor += 1
    }
    if (markdown[cursor] === undefined || markdown[cursor] === '\n') {
      return markdown[cursor] === '\n' ? cursor + 1 : cursor
    }
  }

  return markdown.length
}
