import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostField from '../../packages/vue/src/GhostField.vue'
import GhostFieldControl from '../../packages/vue/src/GhostFieldControl.vue'
import GhostFieldError from '../../packages/vue/src/GhostFieldError.vue'
import GhostFieldLabel from '../../packages/vue/src/GhostFieldLabel.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

function buildInvalidFieldTree(order: 'error-before-control' | 'canonical') {
  const label = h(GhostFieldLabel, {}, () => 'Name')
  const error = h(GhostFieldError, {}, () => 'Required')
  const control = h(GhostFieldControl, null, {
    default: (field: Record<string, unknown>) =>
      h('input', { type: 'text', ...field }),
  })
  const children =
    order === 'canonical' ? [label, control, error] : [label, error, control]
  return () => h(GhostField, { invalid: true }, () => children)
}

function expectVisibleErrorSsrMarkup(html: string) {
  const errorTagPattern = /<[^>]+data-part="error"[^>]*>/
  const errorTag = errorTagPattern.exec(html)?.[0] ?? ''
  expect(html).toContain('data-part="error"')
  expect(html).toContain('role="alert"')
  expect(errorTag).not.toContain('hidden')
  expect(html).toContain('Required')
  expect(html).toContain('aria-invalid="true"')
  return errorTag
}

function invalidFieldFixture(order: 'error-before-control' | 'canonical') {
  return defineComponent({
    setup() {
      return buildInvalidFieldTree(order)
    },
  })
}

describe('GhostFieldError SSR', () => {
  it('renders and hydrates when error is before control', async () => {
    await expectSsrHydration(invalidFieldFixture('error-before-control'), {
      assertServerHtml(html) {
        const errorTag = expectVisibleErrorSsrMarkup(html)
        const errorId = /\bid="([^"]+)"/.exec(errorTag)?.[1]
        const controlDescribedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1]

        expect(errorId).toBeDefined()
        expect(controlDescribedBy).toBeUndefined()
      },
    })
  })

  it('renders and hydrates in canonical label, control, error order', async () => {
    await expectSsrHydration(invalidFieldFixture('canonical'), {
      assertServerHtml(html) {
        expectVisibleErrorSsrMarkup(html)
        expect(html).not.toContain('aria-describedby')
      },
    })
  })

  it('keeps an empty error hidden in canonical child order', async () => {
    await expectSsrHydration(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, null, () => [
              h(GhostFieldLabel, {}, () => 'Name'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h('input', { type: 'text', ...field }),
              }),
              h(GhostFieldError),
            ])
        },
      }),
      {
        assertServerHtml(html) {
          expect(html).toMatch(/data-part="error"[^>]*hidden/)
          expect(html).not.toMatch(/data-part="error"[^>]*role="alert"/)
          expect(html).not.toContain('aria-describedby')
        },
      },
    )
  })
})
