import { enableAutoUnmount, mount } from '@vue/test-utils'
import {
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type PropType,
} from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForFormResetDeferral } from './form-reset'
import GhostField from './GhostField.vue'
import GhostFieldControl from './GhostFieldControl.vue'
import GhostFieldLabel from './GhostFieldLabel.vue'
import GhostFileUpload from './GhostFileUpload.vue'
import GhostFileUploadDropzone from './GhostFileUploadDropzone.vue'
import GhostFileUploadItem from './GhostFileUploadItem.vue'
import GhostFileUploadItemRemove from './GhostFileUploadItemRemove.vue'
import GhostFileUploadList from './GhostFileUploadList.vue'
import GhostFileUploadTrigger from './GhostFileUploadTrigger.vue'
import type {
  GhostFileUploadExposed,
  GhostFileUploadSlotProps,
} from './ghost-file-upload'
import { ghostFileUploadDocumentDropGuardCount } from './use-ghost-file-upload'

// jsdom has no DataTransfer and only accepts real FileList values for
// `input.files`, so the mirror sync is observed through these stubs.
class FakeDataTransfer {
  readonly #files: File[] = []
  readonly items = {
    add: (file: File) => {
      this.#files.push(file)
    },
  }
  get files(): File[] {
    return [...this.#files]
  }
}

enableAutoUnmount(afterEach)

const mirrorFiles = new WeakMap<HTMLInputElement, File[]>()

beforeEach(() => {
  vi.stubGlobal('DataTransfer', FakeDataTransfer)
  vi.spyOn(HTMLInputElement.prototype, 'files', 'set').mockImplementation(
    function (this: HTMLInputElement, value: FileList | null) {
      mirrorFiles.set(this, value ? Array.from(value) : [])
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

function file(name: string, size = 1, type = ''): File {
  const created = new File(['x'], name, { type })
  Object.defineProperty(created, 'size', { value: size })
  return created
}

function renderParts(slot: GhostFileUploadSlotProps) {
  return [
    h(
      GhostFileUploadDropzone,
      { 'data-testid': 'zone' },
      {
        default: ({ dragging }: { dragging: boolean }) => [
          h('span', { 'data-testid': 'dragging' }, String(dragging)),
          h(GhostFileUploadTrigger, null, () => 'Choose files'),
        ],
      },
    ),
    h(GhostFileUploadList, { 'aria-label': 'Files' }, () =>
      slot.entries.map((entry) =>
        h(GhostFileUploadItem, { key: entry.id, file: entry.file }, () => [
          h('span', entry.file.name),
          h(GhostFileUploadItemRemove, null, () => 'Remove'),
        ]),
      ),
    ),
    h(
      'output',
      { 'data-testid': 'rejections' },
      slot.rejections.map((rejection) => rejection.message).join('|'),
    ),
  ]
}

function mountUpload(props: Record<string, unknown> = {}) {
  return mount(GhostFileUpload, {
    props,
    attachTo: document.body,
    slots: { default: renderParts },
  })
}

/** Controlled host; `accept: false` makes the parent ignore updates. */
function mountControlled(
  initial: File[],
  options: { accept?: boolean; props?: Record<string, unknown> } = {},
) {
  const model = shallowRef(initial)
  const Host = defineComponent({
    setup() {
      return () =>
        h(
          GhostFileUpload,
          {
            ...options.props,
            modelValue: model.value,
            'onUpdate:modelValue': (next: File[]) => {
              if (options.accept !== false) model.value = next
            },
          },
          { default: renderParts },
        )
    },
  })
  const wrapper = mount(Host, { attachTo: document.body })
  return { wrapper, model }
}

// Every stateful test attaches to `document.body`, so helpers query the
// document instead of taking a loosely typed wrapper.
function queryInput(selector: string): HTMLInputElement {
  const found = document.querySelector<HTMLInputElement>(selector)
  if (!found) throw new Error(`Missing ${selector}`)
  return found
}

function picker(): HTMLInputElement {
  return queryInput('[data-part="picker"]')
}

function mirror(): HTMLInputElement {
  return queryInput('[data-part="form-input"]')
}

/** Simulates a picker choice: `files` is read once, then `value` is cleared. */
function choose(files: File[]) {
  const input = picker()
  const valueWrites: string[] = []
  Object.defineProperty(input, 'files', {
    configurable: true,
    get: () => files,
  })
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => '',
    set: (value: string) => valueWrites.push(value),
  })
  input.dispatchEvent(new Event('change', { bubbles: true }))
  return valueWrites
}

function dragEvent(
  type: string,
  files: File[] = [],
  init: { types?: string[]; relatedTarget?: EventTarget | null } = {},
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: init.types ?? ['Files'], files, dropEffect: 'none' },
  })
  if ('relatedTarget' in init) {
    Object.defineProperty(event, 'relatedTarget', {
      value: init.relatedTarget,
    })
  }
  return event
}

function itemNames(): string[] {
  return [...document.querySelectorAll('[data-part="item"] > span')].map(
    (node) => node.textContent,
  )
}

describe('GhostFileUpload rendering', () => {
  it('renders the parts, hooks, and internals', () => {
    const wrapper = mountUpload()
    const root = wrapper.get('[data-part="root"]')
    expect(root.classes()).toContain('ghost-file-upload')
    expect(root.attributes('data-state')).toBeUndefined()

    const zone = wrapper.get('[data-part="dropzone"]')
    expect(zone.classes()).toContain('ghost-file-upload-dropzone')
    expect(zone.attributes('role')).toBeUndefined()
    expect(zone.attributes('tabindex')).toBeUndefined()

    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.element.tagName).toBe('BUTTON')
    expect(trigger.attributes('type')).toBe('button')
    expect(trigger.classes()).toContain('ghost-file-upload-trigger')

    // The list renders only while files exist.
    expect(wrapper.find('[data-part="list"]').exists()).toBe(false)

    const input = picker()
    expect(input.hidden).toBe(true)
    expect(input.type).toBe('file')
    expect(input.multiple).toBe(true)
    expect(input.getAttribute('name')).toBeNull()
    expect(wrapper.find('[data-part="form-input"]').exists()).toBe(false)

    const announcer = wrapper.get('[data-part="announcer"]')
    expect(announcer.attributes()).toMatchObject({
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    })
    expect(announcer.attributes('style')).toContain('position: absolute')
    expect(announcer.text()).toBe('')
    wrapper.unmount()
  })

  it('renders items with remove buttons named by messages.removeLabel', async () => {
    const a = file('a.pdf')
    const wrapper = mountUpload({
      defaultValue: [a],
      messages: { removeLabel: (target: File) => `Supprimer ${target.name}` },
    })
    const list = wrapper.get('[data-part="list"]')
    expect(list.element.tagName).toBe('UL')
    expect(list.classes()).toContain('ghost-file-upload-list')
    const item = wrapper.get('[data-part="item"]')
    expect(item.element.tagName).toBe('LI')
    expect(item.classes()).toContain('ghost-file-upload-item')
    const remove = wrapper.get('[data-part="item-remove"]')
    expect(remove.attributes('type')).toBe('button')
    expect(remove.classes()).toContain('ghost-file-upload-item-remove')
    expect(remove.attributes('aria-label')).toBe('Supprimer a.pdf')

    await wrapper.setProps({ messages: undefined })
    expect(remove.attributes('aria-label')).toBe('Remove a.pdf')
    wrapper.unmount()
  })

  it('lets a consumer name the remove button', () => {
    const a = file('a.pdf')
    const wrapper = mount(GhostFileUpload, {
      props: { defaultValue: [a] },
      slots: {
        default: () =>
          h(GhostFileUploadItem, { file: a }, () => [
            h(GhostFileUploadItemRemove, { 'aria-label': 'Delete' }),
            h(GhostFileUploadItemRemove, { 'aria-labelledby': 'x' }),
          ]),
      },
    })
    const [labelled, referenced] = wrapper.findAll('[data-part="item-remove"]')
    expect(labelled?.attributes('aria-label')).toBe('Delete')
    expect(referenced?.attributes('aria-label')).toBeUndefined()
    expect(referenced?.attributes('aria-labelledby')).toBe('x')
  })

  it('merges consumer class and style on every part', () => {
    const a = file('a')
    const wrapper = mount(GhostFileUpload, {
      props: { defaultValue: [a] },
      attrs: { class: 'mine', style: 'color: red;' },
      slots: {
        default: () => [
          h(GhostFileUploadDropzone, { class: 'mine', style: 'color: red;' }),
          h(GhostFileUploadTrigger, { class: 'mine', style: 'color: red;' }),
          h(GhostFileUploadList, { class: 'mine', style: 'color: red;' }, () =>
            h(
              GhostFileUploadItem,
              { file: a, class: 'mine', style: 'color: red;' },
              () =>
                h(GhostFileUploadItemRemove, {
                  class: 'mine',
                  style: 'color: red;',
                }),
            ),
          ),
        ],
      },
    })
    for (const part of [
      'root',
      'dropzone',
      'trigger',
      'list',
      'item',
      'item-remove',
    ]) {
      const node = wrapper.get(`[data-part="${part}"]`)
      expect(node.classes(), part).toContain('mine')
      expect(node.classes(), part).toContain(
        `ghost-file-upload${part === 'root' ? '' : `-${part}`}`,
      )
      expect(node.attributes('style'), part).toContain('color: red')
    }
  })

  it('reflects invalid and disabled with invalid winning', async () => {
    const wrapper = mountUpload({ disabled: true })
    const root = wrapper.get('[data-part="root"]')
    const trigger = wrapper.get('[data-part="trigger"]')
    const zone = wrapper.get('[data-part="dropzone"]')
    expect(root.attributes('data-state')).toBe('disabled')
    expect(trigger.attributes('data-state')).toBe('disabled')
    expect(trigger.attributes('disabled')).toBeDefined()
    expect(zone.attributes('data-state')).toBe('disabled')

    await wrapper.setProps({ invalid: true })
    expect(root.attributes('data-state')).toBe('invalid')
    expect(trigger.attributes('data-state')).toBe('invalid')
    expect(trigger.attributes('aria-invalid')).toBe('true')
    expect(zone.attributes('data-state')).toBe('invalid')
    wrapper.unmount()
  })

  it('combines the trigger disabled prop with the root', () => {
    const wrapper = mount(GhostFileUpload, {
      slots: {
        default: () => h(GhostFileUploadTrigger, { disabled: true }),
      },
    })
    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.attributes('disabled')).toBeDefined()
    expect(trigger.attributes('data-state')).toBe('disabled')
    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      undefined,
    )
  })
})

describe('GhostFileUpload intake', () => {
  it('opens the picker from the trigger and reads, then clears, the picker', async () => {
    const wrapper = mountUpload({ accept: '.txt' })
    const click = vi.spyOn(picker(), 'click')
    await wrapper.get('[data-part="trigger"]').trigger('click')
    expect(click).toHaveBeenCalledTimes(1)
    expect(picker().accept).toBe('.txt')

    const a = file('a.txt')
    const valueWrites = choose([a, file('b.png')])
    await nextTick()

    expect(valueWrites).toEqual([''])
    expect(wrapper.emitted('update:modelValue')).toEqual([[[a]]])
    expect(wrapper.emitted('reject')).toHaveLength(1)
    expect(itemNames()).toEqual(['a.txt'])
    expect(wrapper.get('[data-testid="rejections"]').text()).toBe(
      'b.png was not added: this file type is not accepted.',
    )
    wrapper.unmount()
  })

  it('accepts the same file again after it was removed', async () => {
    const wrapper = mountUpload()
    const a = file('a.txt')
    choose([a])
    await nextTick()
    await wrapper.get('[data-part="item-remove"]').trigger('click')
    await nextTick()
    expect(itemNames()).toEqual([])
    choose([a])
    await nextTick()
    expect(itemNames()).toEqual(['a.txt'])
    wrapper.unmount()
  })

  it('turns multiple off for maxFiles 1 and rejects a second file', async () => {
    const wrapper = mountUpload({ maxFiles: 1, name: 'avatar' })
    expect(picker().multiple).toBe(false)
    expect(mirror().multiple).toBe(false)
    choose([file('a.png')])
    choose([file('b.png')])
    await nextTick()
    expect(itemNames()).toEqual(['a.png'])
    expect(wrapper.get('[data-testid="rejections"]').text()).toBe(
      'b.png was not added: the limit of 1 file has been reached.',
    )
    wrapper.unmount()
  })

  it('announces the batch outcome in a keyed live region child', async () => {
    const wrapper = mountUpload({ accept: '.txt' })
    choose([file('a.txt'), file('b.png')])
    await nextTick()
    await nextTick()
    const announcer = wrapper.get('[data-part="announcer"]')
    expect(announcer.text()).toBe(
      '1 file added. b.png was not added: this file type is not accepted.',
    )
    const firstChild = announcer.element.firstElementChild

    choose([file('c.txt'), file('b.png')])
    await nextTick()
    await nextTick()
    expect(announcer.text()).toBe(
      '1 file added. b.png was not added: this file type is not accepted.',
    )
    // Identical text, new node: screen readers announce it again.
    expect(announcer.element.firstElementChild).not.toBe(firstChild)
    wrapper.unmount()
  })
})

describe('GhostFileUpload dropzone', () => {
  it('adds dropped files and tracks dragging across descendants', async () => {
    const wrapper = mountUpload()
    const zone = wrapper.get('[data-part="dropzone"]').element
    const child = wrapper.get('[data-testid="dragging"]').element

    const enter = dragEvent('dragenter')
    zone.dispatchEvent(enter)
    await nextTick()
    expect(enter.defaultPrevented).toBe(true)
    expect(zone.getAttribute('data-state')).toBe('dragging')
    expect(child.textContent).toBe('true')

    const over = dragEvent('dragover')
    child.dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)
    expect(
      (over as Event & { dataTransfer: DataTransfer }).dataTransfer.dropEffect,
    ).toBe('copy')

    // Moving onto a descendant is not leaving.
    zone.dispatchEvent(dragEvent('dragleave', [], { relatedTarget: child }))
    await nextTick()
    expect(zone.getAttribute('data-state')).toBe('dragging')

    zone.dispatchEvent(
      dragEvent('dragleave', [], { relatedTarget: document.body }),
    )
    await nextTick()
    expect(zone.getAttribute('data-state')).toBeNull()

    zone.dispatchEvent(dragEvent('dragenter'))
    const a = file('a.txt')
    const drop = dragEvent('drop', [a])
    child.dispatchEvent(drop)
    await nextTick()
    expect(drop.defaultPrevented).toBe(true)
    expect(zone.getAttribute('data-state')).toBeNull()
    expect(itemNames()).toEqual(['a.txt'])
    wrapper.unmount()
  })

  it('clears dragging when the drag ends elsewhere or leaves the window', async () => {
    const wrapper = mountUpload()
    const zone = wrapper.get('[data-part="dropzone"]').element
    zone.dispatchEvent(dragEvent('dragenter'))
    await nextTick()
    document.dispatchEvent(new Event('dragend'))
    await nextTick()
    expect(zone.getAttribute('data-state')).toBeNull()

    zone.dispatchEvent(dragEvent('dragenter'))
    await nextTick()
    document.body.dispatchEvent(
      dragEvent('dragleave', [], { relatedTarget: null }),
    )
    await nextTick()
    expect(zone.getAttribute('data-state')).toBeNull()
    wrapper.unmount()
  })

  it('ignores text and link drags', async () => {
    const wrapper = mountUpload()
    const zone = wrapper.get('[data-part="dropzone"]').element
    const enter = dragEvent('dragenter', [], { types: ['text/plain'] })
    zone.dispatchEvent(enter)
    const drop = dragEvent('drop', [], { types: ['text/uri-list'] })
    zone.dispatchEvent(drop)
    await nextTick()
    expect(enter.defaultPrevented).toBe(false)
    expect(drop.defaultPrevented).toBe(false)
    expect(zone.getAttribute('data-state')).toBeNull()
    wrapper.unmount()
  })

  it('cancels but ignores drags and drops while disabled', async () => {
    const wrapper = mountUpload({ disabled: true })
    const zone = wrapper.get('[data-part="dropzone"]').element
    const over = dragEvent('dragover')
    zone.dispatchEvent(dragEvent('dragenter'))
    zone.dispatchEvent(over)
    await nextTick()
    expect(over.defaultPrevented).toBe(true)
    expect(
      (over as Event & { dataTransfer: DataTransfer }).dataTransfer.dropEffect,
    ).toBe('none')
    expect(zone.getAttribute('data-state')).toBe('disabled')

    const drop = dragEvent('drop', [file('a')])
    zone.dispatchEvent(drop)
    await nextTick()
    expect(drop.defaultPrevented).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('reject')).toBeUndefined()
    expect(wrapper.get('[data-part="announcer"]').text()).toBe('')
    wrapper.unmount()
  })

  it('opens the picker on non-interactive clicks only', async () => {
    const onClick = vi.fn((event: MouseEvent) => {
      if ((event.target as Element).id === 'veto') event.preventDefault()
    })
    const wrapper = mount(GhostFileUpload, {
      attachTo: document.body,
      slots: {
        default: () =>
          h(GhostFileUploadDropzone, { onClick }, () => [
            h('p', { id: 'plain' }, 'Drop here'),
            h('p', { id: 'veto' }, 'Veto'),
            h('a', { href: '#x', id: 'link' }, 'Help'),
            h(GhostFileUploadTrigger, { id: 'trigger' }, () => 'Choose'),
          ]),
      },
    })
    const click = vi.spyOn(picker(), 'click')

    await wrapper.get('#plain').trigger('click')
    expect(click).toHaveBeenCalledTimes(1)
    await wrapper.get('[data-part="dropzone"]').trigger('click')
    expect(click).toHaveBeenCalledTimes(2)
    await wrapper.get('#link').trigger('click')
    expect(click).toHaveBeenCalledTimes(2)
    await wrapper.get('#veto').trigger('click')
    expect(click).toHaveBeenCalledTimes(2)
    // A trigger inside the dropzone opens the picker exactly once.
    await wrapper.get('#trigger').trigger('click')
    expect(click).toHaveBeenCalledTimes(3)

    await wrapper.setProps({ disabled: true })
    await wrapper.get('#plain').trigger('click')
    expect(click).toHaveBeenCalledTimes(3)
    wrapper.unmount()
  })

  it('installs the document drop guard while a dropzone is mounted and removes it on unmount', async () => {
    const wrapper = mountUpload()
    await nextTick()
    expect(ghostFileUploadDocumentDropGuardCount()).toBe(1)
    const stray = dragEvent('drop', [file('a')])
    document.body.dispatchEvent(stray)
    expect(stray.defaultPrevented).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await wrapper.setProps({ preventDocumentDrop: false })
    expect(ghostFileUploadDocumentDropGuardCount()).toBe(0)
    await wrapper.setProps({ preventDocumentDrop: true })
    expect(ghostFileUploadDocumentDropGuardCount()).toBe(1)

    wrapper.unmount()
    expect(ghostFileUploadDocumentDropGuardCount()).toBe(0)
    const after = dragEvent('drop', [file('a')])
    document.body.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })

  it('does not install the guard without a dropzone', async () => {
    const wrapper = mount(GhostFileUpload, {
      slots: { default: () => h(GhostFileUploadTrigger) },
    })
    await nextTick()
    expect(ghostFileUploadDocumentDropGuardCount()).toBe(0)
    wrapper.unmount()
  })
})

describe('GhostFileUpload controlled state and the form mirror', () => {
  it('syncs the mirror with the committed list', async () => {
    const a = file('a.txt')
    const wrapper = mountUpload({
      name: 'docs',
      form: 'external',
      required: true,
      defaultValue: [a],
    })
    await nextTick()
    const input = mirror()
    expect(input.name).toBe('docs')
    expect(input.getAttribute('form')).toBe('external')
    expect(picker().getAttribute('form')).toBe('external')
    expect(input.required).toBe(true)
    expect(input.type).toBe('file')
    expect(input.tabIndex).toBe(-1)
    expect(input.getAttribute('aria-hidden')).toBe('true')
    expect(input.getAttribute('style')).toContain('position: absolute')
    expect(mirrorFiles.get(input)).toEqual([a])

    const b = file('b.txt')
    choose([b])
    await nextTick()
    expect(mirrorFiles.get(input)).toEqual([a, b])

    await wrapper.setProps({ disabled: true })
    expect(input.disabled).toBe(true)
    wrapper.unmount()
  })

  it('omits required on the mirror without name', () => {
    const wrapper = mountUpload({ required: true })
    expect(wrapper.find('[data-part="form-input"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('reconciles the list and the mirror to the prop when the parent vetoes, and still rejects', async () => {
    const a = file('a.txt')
    const { wrapper, model } = mountControlled([a], {
      accept: false,
      props: { name: 'docs', accept: '.txt' },
    })
    await nextTick()
    const upload = wrapper.getComponent(GhostFileUpload)
    choose([file('b.txt'), file('c.png')])
    await nextTick()
    await nextTick()

    expect(upload.emitted('update:modelValue')).toHaveLength(1)
    expect(upload.emitted('reject')).toHaveLength(1)
    expect(model.value).toEqual([a])
    expect(itemNames()).toEqual(['a.txt'])
    expect(mirrorFiles.get(mirror())).toEqual([a])
    expect(wrapper.get('[data-part="announcer"]').text()).toBe(
      'c.png was not added: this file type is not accepted.',
    )
    wrapper.unmount()
  })

  it('applies updates from a synchronous controlled parent', async () => {
    const { wrapper, model } = mountControlled([], {
      props: { name: 'docs' },
    })
    const a = file('a.txt')
    choose([a])
    await nextTick()
    expect(model.value).toEqual([a])
    expect(itemNames()).toEqual(['a.txt'])
    expect(mirrorFiles.get(mirror())).toEqual([a])
    wrapper.unmount()
  })

  it('surfaces native valueMissing on the trigger and clears it when files arrive', async () => {
    const wrapper = mountUpload({ name: 'docs', required: true })
    const trigger = wrapper.get('[data-part="trigger"]')
    const invalid = new Event('invalid', { cancelable: true })
    mirror().dispatchEvent(invalid)
    await nextTick()

    expect(invalid.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(trigger.element)
    expect(trigger.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      'invalid',
    )

    choose([file('a.txt')])
    await nextTick()
    expect(trigger.attributes('aria-invalid')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('GhostFileUpload form reset', () => {
  function mountInForm(props: Record<string, unknown>) {
    const form = document.createElement('form')
    document.body.append(form)
    const wrapper = mount(GhostFileUpload, {
      props,
      attachTo: form,
      slots: { default: renderParts },
    })
    return { form, wrapper }
  }

  it('restores defaultValue silently and resyncs the mirror', async () => {
    const seed = file('seed.txt')
    const { form, wrapper } = mountInForm({
      name: 'docs',
      defaultValue: [seed],
      accept: '.txt',
    })
    choose([file('a.txt'), file('b.png')])
    await nextTick()
    await nextTick()
    const announcement = wrapper.get('[data-part="announcer"]').text()
    mirror().dispatchEvent(new Event('invalid', { cancelable: true }))

    form.reset()
    await waitForFormResetDeferral()
    await nextTick()
    await nextTick()

    expect(itemNames()).toEqual(['seed.txt'])
    expect(wrapper.get('[data-testid="rejections"]').text()).toBe('')
    expect(wrapper.get('[data-part="root"]').attributes('data-state')).toBe(
      undefined,
    )
    expect(mirrorFiles.get(mirror())).toEqual([seed])
    expect(wrapper.get('[data-part="announcer"]').text()).toBe(announcement)
    wrapper.unmount()
  })

  it('resets through the picker when there is no mirror', async () => {
    const { form, wrapper } = mountInForm({})
    choose([file('a.txt')])
    await nextTick()
    form.reset()
    await waitForFormResetDeferral()
    await nextTick()
    expect(itemNames()).toEqual([])
    wrapper.unmount()
  })

  it('resets when associated with an external form', async () => {
    const form = document.createElement('form')
    form.id = 'outside'
    document.body.append(form)
    const wrapper = mountUpload({ name: 'docs', form: 'outside' })
    choose([file('a.txt')])
    await nextTick()
    form.reset()
    await waitForFormResetDeferral()
    await nextTick()
    expect(itemNames()).toEqual([])
    wrapper.unmount()
  })

  it('does nothing for a canceled reset', async () => {
    const { form, wrapper } = mountInForm({ name: 'docs' })
    choose([file('a.txt')])
    await nextTick()
    form.addEventListener('reset', (event) => {
      event.preventDefault()
    })
    form.dispatchEvent(new Event('reset', { cancelable: true, bubbles: true }))
    await waitForFormResetDeferral()
    await nextTick()
    expect(itemNames()).toEqual(['a.txt'])
    wrapper.unmount()
  })

  it('proposes the default to a controlled parent that may ignore it', async () => {
    const form = document.createElement('form')
    document.body.append(form)
    const a = file('a.txt')
    const model = shallowRef<File[]>([a])
    const Host = defineComponent({
      setup() {
        return () =>
          h(
            GhostFileUpload,
            {
              name: 'docs',
              modelValue: model.value,
              'onUpdate:modelValue': () => undefined,
            },
            { default: renderParts },
          )
      },
    })
    const wrapper = mount(Host, { attachTo: form })
    await nextTick()
    form.reset()
    await waitForFormResetDeferral()
    await nextTick()
    await nextTick()
    const upload = wrapper.getComponent(GhostFileUpload)
    expect(upload.emitted('update:modelValue')?.[0]).toEqual([[]])
    expect(itemNames()).toEqual(['a.txt'])
    expect(mirrorFiles.get(mirror())).toEqual([a])
    wrapper.unmount()
  })
})

describe('GhostFileUpload focus after removal', () => {
  async function setupThree(accept = true) {
    const files = [file('a'), file('b'), file('c')]
    const { wrapper, model } = mountControlled(files, { accept })
    await nextTick()
    const removes = () => wrapper.findAll('[data-part="item-remove"]')
    return { wrapper, model, removes }
  }

  it('moves focus to the next item, then the previous, then the trigger', async () => {
    const { wrapper, removes } = await setupThree()

    const middle = removes()[1]?.element as HTMLButtonElement
    middle.focus()
    middle.click()
    await nextTick()
    await nextTick()
    expect(itemNames()).toEqual(['a', 'c'])
    expect(document.activeElement).toBe(removes()[1]?.element)
    expect(wrapper.get('[data-part="announcer"]').text()).toBe(
      'b removed. 2 files remaining.',
    )

    const last = removes()[1]?.element as HTMLButtonElement
    last.click()
    await nextTick()
    await nextTick()
    expect(itemNames()).toEqual(['a'])
    expect(document.activeElement).toBe(removes()[0]?.element)

    ;(removes()[0]?.element as HTMLButtonElement).click()
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(
      wrapper.get('[data-part="trigger"]').element,
    )
    wrapper.unmount()
  })

  it('leaves focus alone when it was elsewhere or the parent vetoed the removal', async () => {
    const { wrapper, removes } = await setupThree(false)
    const middle = removes()[1]?.element as HTMLButtonElement
    middle.focus()
    middle.click()
    await nextTick()
    await nextTick()
    expect(itemNames()).toEqual(['a', 'b', 'c'])
    expect(document.activeElement).toBe(middle)
    wrapper.unmount()

    const other = await setupThree()
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    ;(other.removes()[0]?.element as HTMLButtonElement).click()
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(outside)
    other.wrapper.unmount()
  })

  it('disables remove buttons with the root', () => {
    const wrapper = mountUpload({ defaultValue: [file('a')], disabled: true })
    const remove = wrapper.get('[data-part="item-remove"]')
    expect(remove.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})

describe('GhostFileUpload with GhostField', () => {
  it('routes id and aria-describedby to the trigger and composes its name', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, null, () => [
              h(GhostFieldLabel, null, () => 'Attachments'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(
                    GhostFileUpload,
                    {
                      ...field,
                      'aria-describedby': 'extra',
                      'aria-invalid': true,
                    },
                    () => h(GhostFileUploadTrigger, null, () => 'Choose files'),
                  ),
              }),
            ])
        },
      }),
      { attachTo: document.body },
    )
    await nextTick()
    const label = wrapper.get('label')
    const trigger = wrapper.get('[data-part="trigger"]')
    const root = wrapper.get('[data-part="root"]')
    expect(label.attributes('for')).toBe(trigger.attributes('id'))
    expect(trigger.attributes('aria-labelledby')).toBe(
      `${String(label.attributes('id'))} ${String(trigger.attributes('id'))}`,
    )
    expect(trigger.attributes('aria-describedby')).toContain('extra')
    expect(root.attributes('aria-describedby')).toBeUndefined()
    expect(root.attributes('aria-invalid')).toBeUndefined()
    expect(root.attributes('id')).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps a consumer-named trigger and merges its own aria-describedby', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, null, () => [
              h(GhostFieldLabel, null, () => 'Attachments'),
              h(GhostFileUpload, { 'aria-describedby': 'root-hint' }, () =>
                h(GhostFileUploadTrigger, {
                  'aria-label': 'Upload',
                  'aria-describedby': 'own-hint',
                }),
              ),
            ])
        },
      }),
    )
    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.attributes('aria-labelledby')).toBeUndefined()
    expect(trigger.attributes('aria-describedby')).toBe('root-hint own-hint')
  })

  it('uses the root id for the trigger without a Field', () => {
    const wrapper = mount(GhostFileUpload, {
      props: { id: 'upload' },
      slots: { default: () => h(GhostFileUploadTrigger) },
    })
    expect(wrapper.get('[data-part="trigger"]').attributes('id')).toBe('upload')
    expect(
      wrapper.get('[data-part="trigger"]').attributes('aria-labelledby'),
    ).toBeUndefined()
  })
})

describe('GhostFileUpload exposed API', () => {
  it('exposes element, focus, blur, openPicker, and clear', async () => {
    const wrapper = mountUpload({ defaultValue: [file('a')] })
    const exposed = wrapper.vm as unknown as GhostFileUploadExposed
    expect(exposed.element).toBe(wrapper.get('[data-part="root"]').element)
    exposed.focus()
    expect(document.activeElement).toBe(
      wrapper.get('[data-part="trigger"]').element,
    )
    exposed.blur()
    expect(document.activeElement).toBe(document.body)

    const click = vi.spyOn(picker(), 'click')
    exposed.openPicker()
    expect(click).toHaveBeenCalledTimes(1)

    exposed.clear()
    await nextTick()
    await nextTick()
    expect(itemNames()).toEqual([])
    expect(wrapper.get('[data-part="announcer"]').text()).toBe(
      'All files removed.',
    )
    wrapper.unmount()
  })

  it('exposes element, focus, and blur on the parts', () => {
    const a = file('a')
    const refs: Record<string, unknown> = {}
    const capture = (name: string) => (value: unknown) => {
      refs[name] = value
    }
    mount(GhostFileUpload, {
      props: { defaultValue: [a] },
      attachTo: document.body,
      slots: {
        default: () => [
          h(GhostFileUploadDropzone, { ref: capture('dropzone') }),
          h(GhostFileUploadTrigger, { ref: capture('trigger') }),
          h(GhostFileUploadList, { ref: capture('list') }, () =>
            h(GhostFileUploadItem, { file: a, ref: capture('item') }, () =>
              h(GhostFileUploadItemRemove, { ref: capture('remove') }),
            ),
          ),
        ],
      },
    })
    for (const [name, part] of Object.entries({
      dropzone: 'dropzone',
      trigger: 'trigger',
      list: 'list',
      item: 'item',
      remove: 'item-remove',
    })) {
      const handle = refs[name] as { element: HTMLElement | null }
      expect(handle.element?.getAttribute('data-part'), name).toBe(part)
    }
    const remove = refs['remove'] as {
      element: HTMLElement
      focus(): void
      blur(): void
    }
    remove.focus()
    expect(document.activeElement).toBe(remove.element)
    remove.blur()
    const trigger = refs['trigger'] as { element: HTMLElement; focus(): void }
    trigger.focus()
    expect(document.activeElement).toBe(trigger.element)
  })

  it('throws when a part is used outside its provider', () => {
    const silence = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    for (const part of [
      GhostFileUploadDropzone,
      GhostFileUploadTrigger,
      GhostFileUploadList,
      GhostFileUploadItemRemove,
    ]) {
      expect(() => mount(part)).toThrow(/must be used inside/)
    }
    expect(() =>
      mount(GhostFileUploadItem, { props: { file: file('a') } }),
    ).toThrow(/must be used inside/)
    silence.mockRestore()
  })
})

describe('GhostFileUpload SSR', () => {
  const App = defineComponent({
    props: { files: { type: Array as PropType<File[]>, required: true } },
    setup(props) {
      return () =>
        h(
          GhostFileUpload,
          { defaultValue: props.files, name: 'docs', id: 'upload' },
          { default: renderParts },
        )
    },
  })

  it('renders deterministic markup with items, an empty live region, and the mirror', async () => {
    const html = await renderToString(
      createSSRApp(App, { files: [file('a.pdf')] }),
    )
    expect(html).toContain('data-part="root"')
    expect(html).toContain('data-part="dropzone"')
    expect(html).toContain('id="upload"')
    expect(html).toContain('a.pdf')
    expect(html).toContain('aria-label="Remove a.pdf"')
    expect(html).toContain('data-part="picker"')
    expect(html).toContain('data-part="form-input"')
    // Empty on the server (only Vue's v-if placeholder comment).
    expect(html).toMatch(/data-part="announcer"[^>]*>(<!--v-if-->)?<\/div>/)
  })

  it('hydrates without mismatches', async () => {
    const files = [file('a.pdf')]
    const html = await renderToString(createSSRApp(App, { files }))
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const app = createSSRApp(App, { files })
    app.mount(container)
    await nextTick()
    const messages = [...warn.mock.calls, ...error.mock.calls]
      .flat()
      .map(String)
      .filter((text) => text.toLowerCase().includes('hydration'))
    expect(messages).toEqual([])
    const hydratedMirror =
      container.querySelector<HTMLInputElement>('input[name="docs"]')
    expect(hydratedMirror && mirrorFiles.get(hydratedMirror)).toEqual(files)
    app.unmount()
  })
})
