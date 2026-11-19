import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import TeamDirectory from '../../examples/table/team-directory.vue'

type Wrapper = ReturnType<typeof mount>

function buttonNamed(wrapper: Wrapper, name: string) {
  const button = wrapper
    .findAll('button')
    .find(
      (candidate) =>
        candidate.text() === name ||
        candidate.attributes('aria-label') === name,
    )
  if (!button) throw new Error(`No button named ${name}`)
  return button
}

function rowHeaders(wrapper: Wrapper): string[] {
  return wrapper
    .findAll('tbody th[scope="row"]')
    .map((cell) => cell.find('.directory__name').text())
}

describe('table/team-directory example', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('renders a named scroll region, row headers, statuses, and per-row actions', () => {
    const wrapper = mount(TeamDirectory, { attachTo: document.body })
    const region = wrapper.get('[data-part="scroll-container"]')
    expect(region.attributes('role')).toBe('region')
    expect(region.attributes('aria-label')).toBe('Team members')
    expect(region.attributes('tabindex')).toBe('0')

    const table = wrapper.get('table')
    expect(table.attributes('aria-label')).toBe('Team members')
    expect(table.classes()).toContain('directory__table')
    // Consumer class merges with the recipe hook instead of replacing it.
    expect(table.classes()).toContain('ghost-table')

    expect(rowHeaders(wrapper)).toEqual([
      'Ada Lovelace',
      'Grace Hopper',
      'Alan Turing',
      'Katherine Johnson',
      'Edsger Dijkstra',
    ])
    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
      'Member',
      'Role',
      'Status',
      'Actions',
    ])
    expect(
      buttonNamed(wrapper, 'Actions for Grace Hopper').attributes(
        'aria-haspopup',
      ),
    ).toBe('menu')
    expect(wrapper.get('[role="status"]').text()).toBe('Showing 5 of 5 members')
  })

  it('filters by name, email, or role and announces the match count', async () => {
    const wrapper = mount(TeamDirectory, { attachTo: document.body })
    const search = wrapper.get('input[type="search"]')

    await search.setValue('engineer')
    expect(rowHeaders(wrapper)).toEqual(['Alan Turing', 'Edsger Dijkstra'])
    expect(wrapper.get('[role="status"]').text()).toBe('Showing 2 of 5 members')

    await search.setValue('GRACE@')
    expect(rowHeaders(wrapper)).toEqual(['Grace Hopper'])
  })

  it('shows an empty state that clears the search and refocuses the input', async () => {
    const wrapper = mount(TeamDirectory, { attachTo: document.body })
    const search = wrapper.get('input[type="search"]')

    await search.setValue('zzz')
    expect(wrapper.findAll('tbody th[scope="row"]')).toHaveLength(0)
    const emptyCell = wrapper.get('tbody td[colspan="4"]')
    expect(emptyCell.text()).toContain('No members match “zzz”')
    // Without rows the table drops its minimum width and fits the card.
    expect(wrapper.get('table').classes()).not.toContain('directory__table')

    await buttonNamed(wrapper, 'Clear search').trigger('click')
    await nextTick()
    expect((search.element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(search.element)
    expect(rowHeaders(wrapper)).toHaveLength(5)
  })

  it('marks the table busy with skeleton rows while refreshing, then reports once', async () => {
    const wrapper = mount(TeamDirectory, { attachTo: document.body })
    const refresh = buttonNamed(wrapper, 'Refresh')

    await refresh.trigger('click')
    expect(wrapper.get('table').attributes('aria-busy')).toBe('true')
    expect(refresh.attributes('aria-busy')).toBe('true')
    expect(wrapper.findAll('tbody tr')).toHaveLength(4)
    expect(wrapper.findAll('tbody .ghost-skeleton').length).toBeGreaterThan(0)
    expect(wrapper.get('[role="status"]').text()).toBe(
      'Refreshing team directory…',
    )

    // A second press while pending does not restart the request.
    await refresh.trigger('click')
    vi.advanceTimersByTime(900)
    await nextTick()

    expect(wrapper.get('table').attributes('aria-busy')).toBeUndefined()
    expect(rowHeaders(wrapper)).toHaveLength(5)
    expect(wrapper.get('[role="status"]').text()).toBe(
      'Directory up to date. 5 members.',
    )
  })

  it('clears the pending refresh timer on unmount', async () => {
    const wrapper = mount(TeamDirectory, { attachTo: document.body })
    await buttonNamed(wrapper, 'Refresh').trigger('click')
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
