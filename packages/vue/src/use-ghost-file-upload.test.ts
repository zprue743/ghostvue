import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, shallowRef, type Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  GhostFileUploadMessages,
  GhostFileUploadRejection,
  UseGhostFileUploadOptions,
  UseGhostFileUploadReturn,
} from './ghost-file-upload'
import {
  ghostFileUploadDocumentDropGuardCount,
  useGhostFileUpload,
} from './use-ghost-file-upload'

function file(name: string, size = 1, type = ''): File {
  const created = new File(['x'], name, { type })
  // Avoid allocating large buffers: `size` is the only property validation reads.
  Object.defineProperty(created, 'size', { value: size })
  return created
}

function setup(options: UseGhostFileUploadOptions = {}) {
  let api: UseGhostFileUploadReturn | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGhostFileUpload(options)
        return () => null
      },
    }),
  )
  if (!api) throw new Error('composable did not run')
  return { api, wrapper }
}

function fileDrag(type: string): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], files: [], dropEffect: 'copy' },
  })
  return event
}

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useGhostFileUpload validation', () => {
  it('reports the first failing step: type before size before validate before capacity', () => {
    const validate = vi.fn((candidate: File) =>
      candidate.name.startsWith('bad') ? 'nope' : null,
    )
    const onReject = vi.fn()
    const { api } = setup({
      accept: '.pdf',
      maxFileSize: 10,
      maxFiles: 1,
      validate,
      onReject,
    })
    const wrongTypeAndLarge = file('a.png', 100)
    const tooLarge = file('b.pdf', 100)
    const custom = file('bad.pdf', 1)
    const ok = file('ok.pdf', 10)
    const overCapacity = file('later.pdf', 1)

    api.addFiles([wrongTypeAndLarge, tooLarge, custom, ok, overCapacity])

    expect(api.files.value).toEqual([ok])
    expect(api.rejections.value.map((r) => [r.file, r.reason])).toEqual([
      [wrongTypeAndLarge, 'file-type'],
      [tooLarge, 'file-too-large'],
      [custom, 'custom'],
      [overCapacity, 'too-many-files'],
    ])
    // validate runs only for files that passed accept and size.
    expect(validate.mock.calls.map(([candidate]) => candidate)).toEqual([
      custom,
      ok,
      overCapacity,
    ])
    expect(onReject).toHaveBeenCalledTimes(1)
  })

  it('fills remaining capacity in input order with only otherwise-valid files', () => {
    const existing = file('existing.txt')
    const { api } = setup({
      defaultValue: [existing],
      maxFiles: 3,
      accept: '.txt',
    })
    const a = file('a.txt')
    const wrong = file('b.png')
    const c = file('c.txt')
    const d = file('d.txt')

    api.addFiles([a, wrong, c, d])

    expect(api.files.value).toEqual([existing, a, c])
    expect(api.remaining.value).toBe(0)
    expect(api.rejections.value.map((r) => r.reason)).toEqual([
      'file-type',
      'too-many-files',
    ])
  })

  it('builds typed rejection payloads with default messages', () => {
    const onReject = vi.fn<(rejections: GhostFileUploadRejection[]) => void>()
    const { api } = setup({
      accept: 'image/*',
      maxFileSize: 5_000_000,
      maxFiles: 1,
      validate: (candidate) =>
        candidate.name === 'dup.png' ? 'Duplicate' : null,
      onReject,
    })
    const typeFile = file('doc.pdf', 1, 'application/pdf')
    const large = file('huge.png', 6_000_000, 'image/png')
    const dup = file('dup.png', 1, 'image/png')
    const first = file('one.png', 1, 'image/png')
    const second = file('two.png', 1, 'image/png')

    api.addFiles([typeFile, large, dup, first, second])

    expect(onReject.mock.calls[0]?.[0]).toEqual([
      {
        file: typeFile,
        reason: 'file-type',
        accept: 'image/*',
        message: 'doc.pdf was not added: this file type is not accepted.',
      },
      {
        file: large,
        reason: 'file-too-large',
        maxFileSize: 5_000_000,
        message: 'huge.png was not added: it is larger than 5 MB.',
      },
      {
        file: dup,
        reason: 'custom',
        code: 'Duplicate',
        message: 'dup.png was not added: Duplicate.',
      },
      {
        file: second,
        reason: 'too-many-files',
        maxFiles: 1,
        message: 'two.png was not added: the limit of 1 file has been reached.',
      },
    ])
  })

  it('accepts a file exactly at maxFileSize and passes validate the accepted files so far', () => {
    const contexts: File[][] = []
    const existing = file('existing')
    const { api } = setup({
      defaultValue: [existing],
      maxFileSize: 10,
      validate: (_candidate, context) => {
        contexts.push([...context.files])
        return undefined
      },
    })
    const a = file('a', 10)
    const b = file('b', 3)

    api.addFiles([a, b])

    expect(api.files.value).toEqual([existing, a, b])
    expect(contexts).toEqual([[existing], [existing, a]])
  })

  it('commits nothing when validate throws (atomic batch)', async () => {
    const onChange = vi.fn()
    const onReject = vi.fn()
    const { api } = setup({
      accept: '.txt',
      validate: (candidate) => {
        if (candidate.name === 'boom.txt') throw new Error('boom')
        return null
      },
      onChange,
      onReject,
    })
    api.addFiles([file('bad.png')])
    await nextTick()
    const rejectionsBefore = api.rejections.value
    const announcementBefore = api.announcement.value
    onReject.mockClear()

    expect(() => {
      api.addFiles([file('ok.txt'), file('wrong.png'), file('boom.txt')])
    }).toThrow('boom')
    await nextTick()

    expect(api.files.value).toEqual([])
    expect(api.rejections.value).toBe(rejectionsBefore)
    expect(api.announcement.value).toBe(announcementBefore)
    expect(onChange).not.toHaveBeenCalled()
    expect(onReject).not.toHaveBeenCalled()
  })

  it('ignores an intake with no files', async () => {
    const onChange = vi.fn()
    const onReject = vi.fn()
    const { api } = setup({ onChange, onReject, accept: '.txt' })
    api.addFiles([file('bad.png')])
    await nextTick()
    const rejections = api.rejections.value
    const announcement = api.announcement.value

    api.addFiles([])
    await nextTick()

    expect(onChange).not.toHaveBeenCalled()
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(api.rejections.value).toBe(rejections)
    expect(api.announcement.value).toBe(announcement)
  })

  it('normalizes numeric limits', () => {
    for (const unset of [0, Number.NaN, -1, Number.POSITIVE_INFINITY, 0.5]) {
      const { api } = setup({ maxFiles: unset })
      expect(api.remaining.value).toBeUndefined()
      api.addFiles([file('a'), file('b'), file('c')])
      expect(api.files.value).toHaveLength(3)
    }

    const floored = setup({ maxFiles: 2.5 }).api
    expect(floored.remaining.value).toBe(2)
    floored.addFiles([file('a'), file('b'), file('c')])
    expect(floored.files.value).toHaveLength(2)

    for (const unset of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { api } = setup({ maxFileSize: unset })
      api.addFiles([file('huge', 10 ** 12)])
      expect(api.files.value).toHaveLength(1)
    }
  })

  it('never evicts or re-validates existing files when limits change', () => {
    const maxFiles = ref<number | undefined>(5)
    const accept = ref<string | undefined>(undefined)
    const maxFileSize = ref<number | undefined>(undefined)
    const { api } = setup({ maxFiles, accept, maxFileSize })
    api.addFiles([file('a.png', 50), file('b.png', 50), file('c.png', 50)])

    maxFiles.value = 1
    accept.value = '.pdf'
    maxFileSize.value = 1

    expect(api.files.value).toHaveLength(3)
    expect(api.remaining.value).toBe(0)
    api.addFiles([file('d.pdf', 1)])
    expect(api.files.value).toHaveLength(3)
    expect(api.rejections.value[0]?.reason).toBe('too-many-files')
  })

  it('does not deduplicate: the same File twice yields two entries with unique, stable ids', () => {
    const { api } = setup()
    const a = file('a')
    const b = file('b')
    api.addFiles([a, a])
    const firstIds = api.entries.value.map((entry) => entry.id)
    expect(api.files.value).toEqual([a, a])
    expect(new Set(firstIds).size).toBe(2)

    api.addFiles([b])
    expect(api.entries.value.slice(0, 2).map((entry) => entry.id)).toEqual(
      firstIds,
    )

    api.remove(a)
    expect(api.files.value).toEqual([a, b])
  })

  it('never mutates the consumer array and emits new arrays with the same File instances', () => {
    const a = file('a')
    const b = file('b')
    const consumer = Object.freeze([a]) as File[]
    const emitted: File[][] = []
    const model = shallowRef<File[]>(consumer)
    const { api } = setup({
      modelValue: model,
      onChange: (next) => {
        emitted.push(next)
        model.value = next
      },
    })

    api.addFiles([b])
    api.remove(a)

    expect(consumer).toEqual([a])
    expect(emitted).toHaveLength(2)
    expect(emitted[0]).not.toBe(consumer)
    expect(emitted[0]?.[0]).toBe(a)
    expect(emitted[0]?.[1]).toBe(b)
    expect(emitted[1]).toEqual([b])
  })
})

describe('useGhostFileUpload state', () => {
  it('keeps uncontrolled state locally and still reports changes', () => {
    const onChange = vi.fn()
    const seed = [file('seed')]
    const { api } = setup({ defaultValue: seed, onChange })
    const a = file('a')
    api.addFiles([a])
    expect(api.files.value).toEqual([seed[0], a])
    expect(onChange).toHaveBeenCalledWith([seed[0], a])
  })

  it('reconciles to the prop when a controlled parent ignores an update, and still rejects', async () => {
    const model: Ref<File[]> = shallowRef([])
    const onChange = vi.fn()
    const onReject = vi.fn()
    const { api } = setup({
      modelValue: model,
      onChange,
      onReject,
      accept: '.txt',
    })

    api.addFiles([file('a.txt'), file('b.png')])
    await nextTick()

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(api.files.value).toEqual([])
    // Vetoed addition is not announced; the rejection still is.
    expect(api.announcement.value.text).toBe(
      'b.png was not added: this file type is not accepted.',
    )
  })

  it('emits update before reject within one batch', () => {
    const order: string[] = []
    const { api } = setup({
      accept: '.txt',
      onChange: () => order.push('update'),
      onReject: () => order.push('reject'),
    })
    api.addFiles([file('a.txt'), file('b.png')])
    expect(order).toEqual(['update', 'reject'])
  })

  it('removes, clears, and manages the rejections lifetime', async () => {
    const { api } = setup({ accept: '.txt' })
    const a = file('a.txt')
    const b = file('b.txt')
    api.addFiles([a, b, file('c.png')])
    expect(api.rejections.value).toHaveLength(1)

    api.remove(a)
    expect(api.files.value).toEqual([b])
    expect(api.rejections.value).toHaveLength(1)

    api.remove(file('unknown.txt'))
    expect(api.files.value).toEqual([b])

    api.clearRejections()
    expect(api.rejections.value).toEqual([])

    api.addFiles([file('d.png')])
    expect(api.rejections.value).toHaveLength(1)
    api.addFiles([file('e.txt')])
    expect(api.rejections.value).toEqual([])

    api.addFiles([file('f.png')])
    api.clear()
    expect(api.files.value).toEqual([])
    expect(api.rejections.value).toEqual([])
    await nextTick()
    expect(api.announcement.value.text).toBe('All files removed.')
  })

  it('blocks intake, removal, clearing, and the picker while disabled', async () => {
    const disabled = ref(true)
    const onChange = vi.fn()
    const onReject = vi.fn()
    const picker = document.createElement('input')
    const click = vi.spyOn(picker, 'click')
    const a = file('a')
    const { api } = setup({
      disabled,
      defaultValue: [a],
      onChange,
      onReject,
      picker,
      accept: '.txt',
    })

    api.addFiles([file('b.txt'), file('c.png')])
    api.remove(a)
    api.clear()
    api.openPicker()
    await nextTick()

    expect(api.files.value).toEqual([a])
    expect(onChange).not.toHaveBeenCalled()
    expect(onReject).not.toHaveBeenCalled()
    expect(api.announcement.value.text).toBe('')
    expect(click).not.toHaveBeenCalled()
    expect(api.isDisabled.value).toBe(true)

    disabled.value = false
    api.openPicker()
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('restores the captured defaultValue on form reset, uncontrolled and controlled', () => {
    const seed = [file('seed')]
    const defaultValue = shallowRef(seed)
    const { api } = setup({ defaultValue, accept: '.txt' })
    // Later defaultValue changes never retarget reset.
    defaultValue.value = []
    api.addFiles([file('a.txt'), file('b.png')])
    api.applyFormReset()
    expect(api.files.value).toEqual(seed)
    expect(api.rejections.value).toEqual([])

    const model = shallowRef<File[]>([file('current')])
    const onChange = vi.fn()
    const controlled = setup({
      modelValue: model,
      defaultValue: seed,
      onChange,
    }).api
    controlled.applyFormReset()
    expect(onChange).toHaveBeenCalledWith(seed)
    expect(onChange.mock.calls[0]?.[0]).not.toBe(seed)
    // Parent ignored the proposal: the prop wins.
    expect(controlled.files.value).toEqual(model.value)
  })
})

describe('useGhostFileUpload announcements', () => {
  it('announces additions and up to three rejections in one message', async () => {
    const { api } = setup({ accept: '.txt' })
    api.addFiles([file('a.txt'), file('b.txt'), file('c.png'), file('d.png')])
    await nextTick()
    expect(api.announcement.value.text).toBe(
      '2 files added. c.png was not added: this file type is not accepted. d.png was not added: this file type is not accepted.',
    )

    api.addFiles([file('e.png'), file('f.png'), file('g.png')])
    await nextTick()
    expect(api.announcement.value.text.split('was not added')).toHaveLength(4)
  })

  it('summarizes more than three rejections', async () => {
    const { api } = setup({ accept: '.txt' })
    api.addFiles([
      file('ok.txt'),
      file('a.png'),
      file('b.png'),
      file('c.png'),
      file('d.png'),
    ])
    await nextTick()
    expect(api.announcement.value.text).toBe(
      '1 file added. 4 files were not added.',
    )
  })

  it('re-announces identical messages with a new key', async () => {
    const { api } = setup()
    api.addFiles([file('a')])
    await nextTick()
    const first = api.announcement.value
    api.addFiles([file('b')])
    await nextTick()
    expect(api.announcement.value.text).toBe(first.text)
    expect(api.announcement.value.key).not.toBe(first.key)
  })

  it('reads reactive messages overrides and omits empty parts', async () => {
    const messages = ref<Partial<GhostFileUploadMessages>>({
      added: (count) => `${String(count)} ajouté(s).`,
    })
    const { api } = setup({ messages, accept: '.txt' })
    api.addFiles([file('a.txt')])
    await nextTick()
    expect(api.announcement.value.text).toBe('1 ajouté(s).')

    messages.value = {
      added: () => '',
      rejected: ({ file: rejected }) => `${rejected.name} refusé.`,
    }
    api.addFiles([file('b.txt'), file('c.png')])
    expect(api.rejections.value[0]?.message).toBe('c.png refusé.')
    await nextTick()
    expect(api.announcement.value.text).toBe('c.png refusé.')
  })

  it('announces removal only when it is applied', async () => {
    const a = file('a')
    const b = file('b')
    const model = shallowRef<File[]>([a, b])
    let accept = false
    const { api } = setup({
      modelValue: model,
      onChange: (next) => {
        if (accept) model.value = next
      },
    })

    api.remove(a)
    await nextTick()
    expect(api.announcement.value.text).toBe('')

    accept = true
    api.remove(a)
    await nextTick()
    expect(api.announcement.value.text).toBe('a removed. 1 file remaining.')
  })
})

describe('useGhostFileUpload document drop guard', () => {
  it('reference-counts one shared guard and cleans up on unmount', () => {
    const first = setup()
    const second = setup()
    const releaseFirst = first.api.registerDropzone()
    const releaseSecond = second.api.registerDropzone()
    return nextTick().then(() => {
      expect(ghostFileUploadDocumentDropGuardCount()).toBe(2)

      const outside = document.createElement('div')
      document.body.append(outside)
      const drop = fileDrag('drop')
      outside.dispatchEvent(drop)
      expect(drop.defaultPrevented).toBe(true)

      releaseFirst()
      releaseFirst()
      return nextTick().then(() => {
        expect(ghostFileUploadDocumentDropGuardCount()).toBe(1)
        second.wrapper.unmount()
        void releaseSecond
        expect(ghostFileUploadDocumentDropGuardCount()).toBe(0)
        const after = fileDrag('drop')
        outside.dispatchEvent(after)
        expect(after.defaultPrevented).toBe(false)
        first.wrapper.unmount()
      })
    })
  })

  it('ignores non-file drags and events another handler already canceled', async () => {
    const { api, wrapper } = setup()
    api.registerDropzone()
    await nextTick()

    const textDrag = new Event('dragover', { bubbles: true, cancelable: true })
    Object.defineProperty(textDrag, 'dataTransfer', {
      value: { types: ['text/plain'], files: [], dropEffect: 'copy' },
    })
    document.body.dispatchEvent(textDrag)
    expect(textDrag.defaultPrevented).toBe(false)

    const handled = fileDrag('dragover')
    const owner = (event: Event) => {
      event.preventDefault()
    }
    document.body.addEventListener('dragover', owner)
    document.body.dispatchEvent(handled)
    document.body.removeEventListener('dragover', owner)
    expect(
      (handled as Event & { dataTransfer: DataTransfer }).dataTransfer
        .dropEffect,
    ).toBe('copy')

    const stray = fileDrag('dragover')
    document.body.dispatchEvent(stray)
    expect(stray.defaultPrevented).toBe(true)
    expect(
      (stray as Event & { dataTransfer: DataTransfer }).dataTransfer.dropEffect,
    ).toBe('none')
    wrapper.unmount()
  })

  it('does not install the guard when disabled or opted out', async () => {
    const disabled = setup({ disabled: true })
    disabled.api.registerDropzone()
    const optedOut = setup({ preventDocumentDrop: false })
    optedOut.api.registerDropzone()
    await nextTick()
    expect(ghostFileUploadDocumentDropGuardCount()).toBe(0)
    disabled.wrapper.unmount()
    optedOut.wrapper.unmount()
  })
})
