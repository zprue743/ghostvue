import { describe, expect, it } from 'vitest'

import {
  matchesGhostFileUploadAccept,
  parseGhostFileUploadAccept,
} from './ghost-file-upload-accept'
import {
  formatGhostFileUploadSize,
  ghostFileUploadDefaultMessages as messages,
} from './ghost-file-upload-messages'

function file(name: string, type = ''): File {
  return new File(['x'], name, { type })
}

function matches(accept: string | undefined, target: File): boolean {
  return matchesGhostFileUploadAccept(
    target,
    parseGhostFileUploadAccept(accept),
  )
}

describe('ghost-file-upload accept matcher', () => {
  it('matches exact MIME types and ignores MIME parameters on file.type', () => {
    expect(matches('application/pdf', file('a.pdf', 'application/pdf'))).toBe(
      true,
    )
    expect(
      matches('text/plain', file('a.txt', 'text/plain;charset=utf-8')),
    ).toBe(true)
    expect(matches('application/pdf', file('a.png', 'image/png'))).toBe(false)
  })

  it('matches type/* wildcards by prefix', () => {
    expect(matches('image/*', file('a.png', 'image/png'))).toBe(true)
    expect(matches('image/*', file('a.mp4', 'video/mp4'))).toBe(false)
  })

  it('matches extensions by suffix, including multi-part extensions', () => {
    expect(matches('.pdf', file('Report.PDF'))).toBe(true)
    expect(matches('.tar.gz', file('backup.tar.gz', 'application/gzip'))).toBe(
      true,
    )
    expect(matches('.gz', file('notes.txt'))).toBe(false)
  })

  it('compares tokens case-insensitively and trims whitespace', () => {
    expect(matches('  IMAGE/PNG , .JPG ', file('a.png', 'image/png'))).toBe(
      true,
    )
    expect(matches('IMAGE/PNG, .JPG', file('b.jpg'))).toBe(true)
  })

  it('matches an empty file.type with extension tokens only, never MIME tokens', () => {
    expect(matches('image/*', file('photo.heic'))).toBe(false)
    expect(matches('application/pdf', file('a.pdf'))).toBe(false)
    expect(matches('image/*,.heic', file('photo.heic'))).toBe(true)
  })

  it('accepts everything when accept is omitted or has no valid token', () => {
    expect(parseGhostFileUploadAccept('pdf, , ., */*, image/png;q=1')).toEqual(
      [],
    )
    expect(matches('pdf', file('a.exe', 'application/x-msdownload'))).toBe(true)
    expect(matches(undefined, file('a.exe'))).toBe(true)
    expect(matches('', file('a.exe'))).toBe(true)
  })

  it('accepts a file when any valid token matches and ignores invalid ones', () => {
    const tokens = parseGhostFileUploadAccept('pdf, image/png, .txt')
    expect(tokens).toEqual([
      { kind: 'mime', value: 'image/png' },
      { kind: 'extension', value: '.txt' },
    ])
    expect(matchesGhostFileUploadAccept(file('a.txt'), tokens)).toBe(true)
    expect(matchesGhostFileUploadAccept(file('a.pdf'), tokens)).toBe(false)
  })
})

describe('ghost-file-upload default messages', () => {
  it('formats sizes with decimal units', () => {
    expect(formatGhostFileUploadSize(5_000_000)).toBe('5 MB')
    expect(formatGhostFileUploadSize(1_500)).toBe('1.5 kB')
    expect(formatGhostFileUploadSize(2_000_000_000)).toBe('2 GB')
  })

  it('pluralizes added, removed, and limit messages', () => {
    const a = file('a.pdf')
    expect(messages.added(1)).toBe('1 file added.')
    expect(messages.added(3)).toBe('3 files added.')
    expect(messages.removed(a, 0)).toBe('a.pdf removed. No files remaining.')
    expect(messages.removed(a, 1)).toBe('a.pdf removed. 1 file remaining.')
    expect(messages.removed(a, 4)).toBe('a.pdf removed. 4 files remaining.')
    expect(messages.cleared()).toBe('All files removed.')
    expect(messages.rejectedSummary(5)).toBe('5 files were not added.')
    expect(messages.removeLabel(a)).toBe('Remove a.pdf')
  })

  it('formats one sentence per rejection reason', () => {
    const a = file('a.pdf')
    expect(
      messages.rejected({ file: a, reason: 'file-type', accept: '.png' }),
    ).toBe('a.pdf was not added: this file type is not accepted.')
    expect(
      messages.rejected({
        file: a,
        reason: 'file-too-large',
        maxFileSize: 5_000_000,
      }),
    ).toBe('a.pdf was not added: it is larger than 5 MB.')
    expect(
      messages.rejected({ file: a, reason: 'too-many-files', maxFiles: 1 }),
    ).toBe('a.pdf was not added: the limit of 1 file has been reached.')
    expect(
      messages.rejected({ file: a, reason: 'too-many-files', maxFiles: 3 }),
    ).toBe('a.pdf was not added: the limit of 3 files has been reached.')
    expect(
      messages.rejected({ file: a, reason: 'custom', code: 'Already added' }),
    ).toBe('a.pdf was not added: Already added.')
    expect(
      messages.rejected({ file: a, reason: 'custom', code: 'Already added!' }),
    ).toBe('a.pdf was not added: Already added!')
    expect(messages.rejected({ file: a, reason: 'custom', code: '' })).toBe(
      'a.pdf was not added.',
    )
  })
})
