import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostBreadcrumb from './GhostBreadcrumb.vue'
import GhostBreadcrumbEllipsis from './GhostBreadcrumbEllipsis.vue'
import GhostBreadcrumbItem from './GhostBreadcrumbItem.vue'
import GhostBreadcrumbLink from './GhostBreadcrumbLink.vue'
import GhostBreadcrumbList from './GhostBreadcrumbList.vue'
import GhostBreadcrumbPage from './GhostBreadcrumbPage.vue'
import GhostBreadcrumbSeparator from './GhostBreadcrumbSeparator.vue'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  vi.restoreAllMocks()
})

function mountBasicTrail(ariaLabel = 'Breadcrumb') {
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(GhostBreadcrumb, { ariaLabel }, () =>
            h(GhostBreadcrumbList, null, () => [
              h(GhostBreadcrumbItem, null, () => [
                h(GhostBreadcrumbLink, { href: '/' }, () => 'Home'),
                h(GhostBreadcrumbSeparator, null, () => '/'),
              ]),
              h(GhostBreadcrumbItem, null, () => [
                h(GhostBreadcrumbLink, { href: '/docs' }, () => 'Docs'),
                h(GhostBreadcrumbSeparator, null, () => '/'),
              ]),
              h(GhostBreadcrumbItem, null, () =>
                h(GhostBreadcrumbPage, null, () => 'Breadcrumb'),
              ),
            ]),
          )
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return wrapper
}

describe('GhostBreadcrumb', () => {
  it('renders landmark navigation with custom aria-label', () => {
    const wrapper = mountBasicTrail('Project trail')
    const nav = wrapper.find('nav')
    expect(nav.attributes('aria-label')).toBe('Project trail')
    expect(nav.attributes('data-ghost-breadcrumb')).toBe('')
    expect(nav.attributes('data-part')).toBe('root')
  })

  it('uses ol > li structure with aria-current on the last segment', () => {
    const wrapper = mountBasicTrail()
    expect(wrapper.find('ol[data-part="list"]').exists()).toBe(true)
    const items = wrapper.findAll('li[data-part="item"]')
    expect(items).toHaveLength(3)
    expect(wrapper.find('[data-part="page"][aria-current="page"]').text()).toBe(
      'Breadcrumb',
    )
    const separators = wrapper.findAll('[data-part="separator"]')
    expect(separators).toHaveLength(2)
    for (const separator of separators) {
      expect(separator.attributes('aria-hidden')).toBe('true')
    }
  })

  it('throws when list is used outside the root', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      mount(GhostBreadcrumbList, { attachTo: document.body }),
    ).toThrow('GhostBreadcrumbList must be used inside GhostBreadcrumb')
  })

  it('opens ellipsis popover so collapsed links are tabbable', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostBreadcrumb, null, () =>
              h(GhostBreadcrumbList, null, () =>
                h(GhostBreadcrumbItem, null, () =>
                  h(GhostBreadcrumbEllipsis, { label: 'More crumbs' }, () =>
                    h(GhostBreadcrumbLink, { href: '/hidden' }, () => 'Hidden'),
                  ),
                ),
              ),
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    const trigger = wrapper.get('button[aria-label="More crumbs"]')
    await trigger.trigger('click')
    await nextTick()

    const hiddenLink = document.body.querySelector('a[href="/hidden"]')
    expect(hiddenLink).not.toBeNull()
    expect(hiddenLink?.getAttribute('data-part')).toBe('link')
  })
})
