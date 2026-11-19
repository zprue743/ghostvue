import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'

import {
  GhostFileUpload,
  GhostFileUploadDropzone,
  GhostFileUploadItem,
  GhostFileUploadItemRemove,
  GhostFileUploadList,
  GhostFileUploadTrigger,
  type GhostFileUploadDropzoneExposed,
  type GhostFileUploadExposed,
  type GhostFileUploadItemRemoveExposed,
  type GhostFileUploadListExposed,
  type GhostFileUploadSlotProps,
  type GhostFileUploadTriggerExposed,
} from '../../packages/themes/src/index'
import { GhostFileUploadItem as GhostHeadlessFileUploadItem } from '../../packages/vue/src/index'

function file(name: string, type = 'text/plain'): File {
  return new File([name], name, { type })
}

/** jsdom has no DragEvent with a DataTransfer; mirror the headless test helper. */
function dragEvent(
  type: string,
  files: File[] = [],
  init: { relatedTarget?: EventTarget | null } = {},
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], files, dropEffect: 'none' },
  })
  if ('relatedTarget' in init) {
    Object.defineProperty(event, 'relatedTarget', {
      value: init.relatedTarget,
    })
  }
  return event
}

afterEach(() => {
  document.body.innerHTML = ''
})

interface MountOptions {
  rootProps?: Record<string, unknown>
  modelValue?: File[]
}

function mountUpload(options: MountOptions = {}) {
  const root = ref<GhostFileUploadExposed | null>(null)
  const dropzone = ref<GhostFileUploadDropzoneExposed | null>(null)
  const trigger = ref<GhostFileUploadTriggerExposed | null>(null)
  const list = ref<GhostFileUploadListExposed | null>(null)
  const remove = ref<GhostFileUploadItemRemoveExposed | null>(null)
  const files = shallowRef<File[]>(options.modelValue ?? [])

  const host = defineComponent({
    setup: () => () =>
      h(
        GhostFileUpload,
        {
          ref: root,
          class: 'consumer-root',
          style: { marginTop: '4px' },
          modelValue: files.value,
          'onUpdate:modelValue': (next: File[]) => {
            files.value = next
          },
          ...options.rootProps,
        },
        {
          default: ({ entries }: GhostFileUploadSlotProps) => [
            h(
              GhostFileUploadDropzone,
              {
                ref: dropzone,
                class: 'consumer-dropzone',
                style: { minWidth: '10px' },
              },
              {
                default: ({ dragging }: { dragging: boolean }) => [
                  h(
                    'span',
                    { 'data-testid': 'copy' },
                    dragging ? 'drop' : 'idle',
                  ),
                  h(
                    GhostFileUploadTrigger,
                    { ref: trigger, class: 'consumer-trigger' },
                    () => 'Choose files',
                  ),
                ],
              },
            ),
            h(
              GhostFileUploadList,
              { ref: list, class: 'consumer-list', 'aria-label': 'Files' },
              () =>
                entries.map((entry, index) =>
                  h(
                    GhostFileUploadItem,
                    { key: entry.id, file: entry.file },
                    () => [
                      h('span', entry.file.name),
                      h(
                        GhostFileUploadItemRemove,
                        index === 0
                          ? {
                              ref: remove,
                              class: 'consumer-remove',
                              style: { color: 'red' },
                            }
                          : {},
                        () => 'Remove',
                      ),
                    ],
                  ),
                ),
            ),
          ],
        },
      ),
  })

  const wrapper = mount(host, { attachTo: document.body })
  return { wrapper, root, dropzone, trigger, list, remove, files }
}

describe('themed GhostFileUpload', () => {
  it('marks every wrapped part with data-themed and keeps consumer class and style', () => {
    const { wrapper } = mountUpload({ modelValue: [file('a.txt')] })

    const root = wrapper.get('[data-part="root"]')
    expect(root.attributes()).toHaveProperty('data-themed')
    expect(root.classes()).toEqual(
      expect.arrayContaining(['ghost-file-upload', 'consumer-root']),
    )
    expect(root.attributes('style')).toContain('margin-top: 4px')

    const dropzone = wrapper.get('[data-part="dropzone"]')
    expect(dropzone.attributes()).toHaveProperty('data-themed')
    expect(dropzone.classes()).toEqual(
      expect.arrayContaining([
        'ghost-file-upload-dropzone',
        'consumer-dropzone',
      ]),
    )
    expect(dropzone.attributes('style')).toContain('min-width: 10px')

    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.attributes()).toHaveProperty('data-themed')
    expect(trigger.classes()).toEqual(
      expect.arrayContaining(['ghost-file-upload-trigger', 'consumer-trigger']),
    )

    const list = wrapper.get('[data-part="list"]')
    expect(list.attributes()).toHaveProperty('data-themed')
    expect(list.classes()).toContain('consumer-list')

    const remove = wrapper.get('[data-part="item-remove"]')
    expect(remove.attributes()).toHaveProperty('data-themed')
    expect(remove.classes()).toEqual(
      expect.arrayContaining([
        'ghost-file-upload-item-remove',
        'consumer-remove',
      ]),
    )
    expect(remove.attributes('style')).toContain('color: red')

    // The item is the headless part, styled from the list's child combinator.
    const item = wrapper.get('[data-part="item"]')
    expect(item.attributes()).not.toHaveProperty('data-themed')
    expect(item.element.parentElement).toBe(list.element)
    expect(GhostFileUploadItem).toBe(GhostHeadlessFileUploadItem)

    wrapper.unmount()
  })

  it('omits data-state in the idle state', () => {
    const { wrapper } = mountUpload()

    for (const part of ['root', 'dropzone', 'trigger']) {
      expect(
        wrapper.get(`[data-part="${part}"]`).attributes('data-state'),
      ).toBeUndefined()
    }
    wrapper.unmount()
  })

  it('forwards invalid and disabled to the headless state hooks', () => {
    const invalid = mountUpload({ rootProps: { invalid: true } })
    expect(
      invalid.wrapper.get('[data-part="dropzone"]').attributes('data-state'),
    ).toBe('invalid')
    expect(
      invalid.wrapper.get('[data-part="trigger"]').attributes('aria-invalid'),
    ).toBe('true')
    invalid.wrapper.unmount()

    const disabled = mountUpload({
      rootProps: { disabled: true },
      modelValue: [file('a.txt')],
    })
    expect(
      disabled.wrapper.get('[data-part="dropzone"]').attributes('data-state'),
    ).toBe('disabled')
    expect(
      disabled.wrapper.get('[data-part="trigger"]').attributes(),
    ).toHaveProperty('disabled')
    expect(
      disabled.wrapper.get('[data-part="item-remove"]').attributes(),
    ).toHaveProperty('disabled')
    disabled.wrapper.unmount()
  })

  it('reports the dragging state through data-state and the slot', async () => {
    const { wrapper } = mountUpload()
    const dropzone = wrapper.get('[data-part="dropzone"]')

    dropzone.element.dispatchEvent(dragEvent('dragenter'))
    await nextTick()
    expect(dropzone.attributes('data-state')).toBe('dragging')
    expect(wrapper.get('[data-testid="copy"]').text()).toBe('drop')

    dropzone.element.dispatchEvent(
      dragEvent('dragleave', [], { relatedTarget: document.body }),
    )
    await nextTick()
    expect(dropzone.attributes('data-state')).toBeUndefined()
    wrapper.unmount()
  })

  it('delegates removal and v-model to the headless parts', async () => {
    const first = file('a.txt')
    const second = file('b.txt')
    const { wrapper, files } = mountUpload({ modelValue: [first, second] })
    const themed = wrapper.findComponent(GhostFileUpload)

    await wrapper.get('[data-part="item-remove"]').trigger('click')
    expect(themed.emitted('update:modelValue')?.[0]).toEqual([[second]])
    expect(files.value).toEqual([second])
    await nextTick()
    expect(wrapper.findAll('[data-part="item"]')).toHaveLength(1)
    wrapper.unmount()
  })

  it('forwards drops and reject events from intake', async () => {
    const { wrapper, files } = mountUpload({
      rootProps: { accept: 'image/png' },
    })
    const themed = wrapper.findComponent(GhostFileUpload)
    const image = file('photo.png', 'image/png')

    const zone = wrapper.get('[data-part="dropzone"]').element
    zone.dispatchEvent(dragEvent('dragenter'))
    const drop = dragEvent('drop', [image, file('notes.txt')])
    zone.dispatchEvent(drop)
    await nextTick()

    expect(drop.defaultPrevented).toBe(true)
    expect(files.value).toEqual([image])
    const rejected = themed.emitted('reject')?.[0]?.[0] as
      { reason: string; file: File }[] | undefined
    expect(rejected?.map((entry) => entry.reason)).toEqual(['file-type'])
    wrapper.unmount()
  })

  it('forwards element refs and focus methods through every wrapper', () => {
    const { wrapper, root, dropzone, trigger, list, remove } = mountUpload({
      modelValue: [file('a.txt')],
    })

    expect(root.value?.element).toBe(wrapper.get('[data-part="root"]').element)
    expect(dropzone.value?.element).toBe(
      wrapper.get('[data-part="dropzone"]').element,
    )
    expect(trigger.value?.element).toBe(
      wrapper.get('[data-part="trigger"]').element,
    )
    expect(list.value?.element).toBe(wrapper.get('[data-part="list"]').element)
    expect(remove.value?.element).toBe(
      wrapper.get('[data-part="item-remove"]').element,
    )

    root.value?.focus()
    expect(document.activeElement).toBe(trigger.value?.element)
    root.value?.blur()
    expect(document.activeElement).not.toBe(trigger.value?.element)

    trigger.value?.focus()
    expect(document.activeElement).toBe(trigger.value?.element)
    trigger.value?.blur()

    remove.value?.focus()
    expect(document.activeElement).toBe(remove.value?.element)
    remove.value?.blur()

    const triggerRef = trigger
    wrapper.unmount()
    expect(triggerRef.value).toBeNull()
  })

  it('clears through the exposed root API', async () => {
    const { wrapper, root, files } = mountUpload({
      modelValue: [file('a.txt')],
    })
    root.value?.clear()
    await nextTick()
    expect(files.value).toEqual([])
    expect(wrapper.find('[data-part="list"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
