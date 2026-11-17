import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import GhostNumberInput from './GhostNumberInput.vue'

describe('useGhostNumberInput formatting', () => {
  it('formats and parses en-US decimal separators', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: 1200.5,
              locale: 'en-US',
              min: 0,
            })
        },
      }),
    )

    const input = wrapper.get('input').element as HTMLInputElement
    expect(input.value).toBe('1,200.5')
    input.value = '2,500.25'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(
      wrapper
        .findComponent(GhostNumberInput)
        .emitted('update:modelValue')
        ?.at(-1),
    ).toEqual([2500.25])
  })

  it('steps from null using the minimum when provided', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { defaultValue: null, min: 5, max: 20, step: 5 },
    })
    await wrapper.get('[data-part="increment"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([10])
  })

  it('preserves fractional precision from value when step is an integer', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { defaultValue: 1.5, min: 1.5, step: 1 },
    })

    expect(
      wrapper.get('[data-part="decrement"]').attributes('disabled'),
    ).toBeDefined()

    await wrapper.get('[data-part="increment"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2.5])
    expect(
      wrapper.get('[data-part="decrement"]').attributes('disabled'),
    ).toBeUndefined()

    await wrapper.get('[data-part="decrement"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([1.5])
    expect(
      wrapper.get('[data-part="decrement"]').attributes('disabled'),
    ).toBeDefined()
  })

  it('preserves fractional precision from bounds and current value', async () => {
    const fromMin = mount(GhostNumberInput, {
      props: { defaultValue: null, min: 1.25, step: 0.5 },
    })
    await fromMin.get('[data-part="increment"]').trigger('click')
    expect(fromMin.emitted('update:modelValue')?.[0]).toEqual([1.75])

    const toMax = mount(GhostNumberInput, {
      props: { defaultValue: 1.9, max: 2.25, step: 1 },
    })
    await toMax.get('[data-part="increment"]').trigger('click')
    expect(toMax.emitted('update:modelValue')?.[0]).toEqual([2.25])

    const fromValue = mount(GhostNumberInput, {
      props: { defaultValue: 1.234, step: 0.1 },
    })
    await fromValue.get('[data-part="increment"]').trigger('click')
    expect(fromValue.emitted('update:modelValue')?.[0]).toEqual([1.334])
    await fromValue.get('[data-part="decrement"]').trigger('click')
    expect(fromValue.emitted('update:modelValue')?.[1]).toEqual([1.234])
  })

  it('cleans up binary floating-point drift and scientific-notation steps', async () => {
    const floatWrapper = mount(GhostNumberInput, {
      props: { defaultValue: 0.1, step: 0.2 },
    })
    await floatWrapper.get('[data-part="increment"]').trigger('click')
    expect(floatWrapper.emitted('update:modelValue')?.[0]).toEqual([0.3])

    const sciWrapper = mount(GhostNumberInput, {
      props: { defaultValue: 0, step: 1e-7 },
    })
    await sciWrapper.get('[data-part="increment"]').trigger('click')
    expect(sciWrapper.emitted('update:modelValue')?.[0]).toEqual([1e-7])
  })
})

describe('useGhostNumberInput round-trip parsing contract', () => {
  async function commitValue(
    wrapper: ReturnType<typeof mount>,
    text: string,
    via: 'blur' | 'enter' = 'blur',
  ): Promise<void> {
    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement
    input.focus()
    input.value = text
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    if (via === 'enter') {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      )
    } else {
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    }
    await nextTick()
  }

  it('parses currency drafts with and without currency symbols on blur and Enter', async () => {
    const model = ref<number | null>(7)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: model.value,
              locale: 'en-US',
              name: 'price',
              formatOptions: { style: 'currency', currency: 'USD' },
              'onUpdate:modelValue': (next: number | null) => {
                model.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )

    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement
    const hidden = wrapper.get('input[type="hidden"]')
      .element as HTMLInputElement
    expect(input.value).toBe('$7.00')
    expect(hidden.value).toBe('7')

    await commitValue(wrapper, '$12.50', 'blur')
    expect(model.value).toBe(12.5)
    expect(input.value).toBe('$12.50')
    expect(hidden.value).toBe('12.5')

    await commitValue(wrapper, '18.25', 'enter')
    expect(model.value).toBe(18.25)
    expect(input.value).toBe('$18.25')
    expect(hidden.value).toBe('18.25')

    await commitValue(wrapper, '-$7.00', 'blur')
    expect(model.value).toBe(-7)
    expect(input.value).toBe('-$7.00')
    expect(hidden.value).toBe('-7')

    wrapper.unmount()
  })

  it('parses accounting currency parentheses and rejects mixed signs', async () => {
    const model = ref<number | null>(10)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: model.value,
              locale: 'en-US',
              formatOptions: {
                style: 'currency',
                currency: 'USD',
                currencySign: 'accounting',
              },
              'onUpdate:modelValue': (next: number | null) => {
                model.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )

    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement
    await commitValue(wrapper, '($7.00)', 'blur')
    expect(model.value).toBe(-7)
    expect(input.value).toBe('($7.00)')

    await commitValue(wrapper, '(-$7.00)', 'blur')
    expect(model.value).toBe(-7)
    expect(input.value).toBe('($7.00)')

    wrapper.unmount()
  })

  it('parses de-DE EUR currency and ja-JP JPY currency round-trips', async () => {
    const eur = ref<number | null>(10)
    const eurWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: eur.value,
              locale: 'de-DE',
              name: 'eur',
              formatOptions: { style: 'currency', currency: 'EUR' },
              'onUpdate:modelValue': (next: number | null) => {
                eur.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )

    const eurInput = eurWrapper.get('[role="spinbutton"]')
      .element as HTMLInputElement
    const formattedNeg = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(-1234.56)
    await commitValue(eurWrapper, formattedNeg, 'blur')
    expect(eur.value).toBe(-1234.56)
    expect(eurInput.value).toBe(formattedNeg)
    eurWrapper.unmount()

    const jpy = ref<number | null>(100)
    const jpyWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: jpy.value,
              locale: 'ja-JP',
              formatOptions: { style: 'currency', currency: 'JPY' },
              'onUpdate:modelValue': (next: number | null) => {
                jpy.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )
    const formattedJpy = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(1234)
    await commitValue(jpyWrapper, formattedJpy, 'blur')
    expect(jpy.value).toBe(1234)
    jpyWrapper.unmount()
  })

  it('scales percent values on blur and Enter for both suffixed and plain drafts', async () => {
    const model = ref<number | null>(0.6)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: model.value,
              locale: 'en-US',
              name: 'rate',
              formatOptions: { style: 'percent', maximumFractionDigits: 2 },
              'onUpdate:modelValue': (next: number | null) => {
                model.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )

    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement
    const hidden = wrapper.get('input[type="hidden"]')
      .element as HTMLInputElement
    expect(input.value).toBe('60%')
    expect(hidden.value).toBe('0.6')

    await commitValue(wrapper, '75%', 'blur')
    expect(model.value).toBe(0.75)
    expect(input.value).toBe('75%')
    expect(hidden.value).toBe('0.75')

    await commitValue(wrapper, '60', 'enter')
    expect(model.value).toBe(0.6)
    expect(input.value).toBe('60%')
    expect(hidden.value).toBe('0.6')

    await commitValue(wrapper, '19.9%', 'blur')
    expect(model.value).toBe(0.199)
    expect(hidden.value).toBe('0.199')

    await commitValue(wrapper, '-12.5', 'blur')
    expect(model.value).toBe(-0.125)
    expect(input.value).toBe('-12.5%')

    wrapper.unmount()
  })

  it('parses unit formatting including singular and plural unit labels', async () => {
    const model = ref<number | null>(1)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: model.value,
              locale: 'en-US',
              formatOptions: {
                style: 'unit',
                unit: 'meter',
                unitDisplay: 'long',
              },
              'onUpdate:modelValue': (next: number | null) => {
                model.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )

    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement
    expect(input.value).toBe('1 meter')

    await commitValue(wrapper, '2 meters', 'blur')
    expect(model.value).toBe(2)
    expect(input.value).toBe('2 meters')

    await commitValue(wrapper, '1 meter', 'enter')
    expect(model.value).toBe(1)
    expect(input.value).toBe('1 meter')

    wrapper.unmount()
  })

  it('parses non-Latin digits, bidi marks, and sign literals across locales', async () => {
    const ar = ref<number | null>(5)
    const arWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: ar.value,
              locale: 'ar-EG',
              name: 'ar',
              'onUpdate:modelValue': (next: number | null) => {
                ar.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )

    const arInput = arWrapper.get('[role="spinbutton"]')
      .element as HTMLInputElement
    const arHidden = arWrapper.get('input[type="hidden"]')
      .element as HTMLInputElement

    await commitValue(arWrapper, '٧', 'blur')
    expect(ar.value).toBe(7)
    expect(arHidden.value).toBe('7')

    const formattedArNeg = new Intl.NumberFormat('ar-EG').format(-12345.67)
    await commitValue(arWrapper, formattedArNeg, 'enter')
    expect(ar.value).toBe(-12345.67)
    expect(arInput.value).toBe(formattedArNeg)
    expect(arHidden.value).toBe('-12345.67')

    await commitValue(arWrapper, '42', 'blur')
    expect(ar.value).toBe(42)
    arWrapper.unmount()

    const arPercent = ref<number | null>(0.5)
    const arPercentWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: arPercent.value,
              locale: 'ar-EG',
              formatOptions: { style: 'percent' },
              'onUpdate:modelValue': (next: number | null) => {
                arPercent.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )
    const formattedArPercent = new Intl.NumberFormat('ar-EG', {
      style: 'percent',
    }).format(-0.6)
    await commitValue(arPercentWrapper, formattedArPercent, 'blur')
    expect(arPercent.value).toBe(-0.6)
    arPercentWrapper.unmount()

    const sar = ref<number | null>(10)
    const sarWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: sar.value,
              locale: 'ar-SA',
              formatOptions: { style: 'currency', currency: 'SAR' },
              'onUpdate:modelValue': (next: number | null) => {
                sar.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )
    const formattedSar = new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(-1234.56)
    await commitValue(sarWrapper, formattedSar, 'blur')
    expect(sar.value).toBe(-1234.56)
    sarWrapper.unmount()

    const fa = ref<number | null>(0)
    const faWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: fa.value,
              locale: 'fa-IR',
              'onUpdate:modelValue': (next: number | null) => {
                fa.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )
    const formattedFa = new Intl.NumberFormat('fa-IR').format(-12345.67)
    await commitValue(faWrapper, formattedFa, 'blur')
    expect(fa.value).toBe(-12345.67)
    faWrapper.unmount()

    const signed = ref<number | null>(0)
    const signedWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: signed.value,
              locale: 'en-US',
              formatOptions: { signDisplay: 'always' },
              'onUpdate:modelValue': (next: number | null) => {
                signed.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )
    await commitValue(signedWrapper, '+42', 'blur')
    expect(signed.value).toBe(42)
    signedWrapper.unmount()
  })

  it('validates locale grouping and rejects malformed grouping or garbage', async () => {
    const de = ref<number | null>(12)
    const deWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: de.value,
              locale: 'de-DE',
              'onUpdate:modelValue': (next: number | null) => {
                de.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )
    const deInput = deWrapper.get('[role="spinbutton"]')
      .element as HTMLInputElement

    await commitValue(deWrapper, '1.234,5', 'blur')
    expect(de.value).toBe(1234.5)

    // Malformed grouping (1.5 has only 1 digit after de-DE group separator '.')
    await commitValue(deWrapper, '1.5', 'blur')
    expect(de.value).toBe(1234.5)
    expect(deInput.value).toBe('1.234,5')

    await commitValue(deWrapper, '$$7', 'blur')
    expect(de.value).toBe(1234.5)
    deWrapper.unmount()

    const fr = ref<number | null>(0)
    const frWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: fr.value,
              locale: 'fr-FR',
              'onUpdate:modelValue': (next: number | null) => {
                fr.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )
    await commitValue(frWrapper, '12 345,67', 'blur')
    expect(fr.value).toBe(12345.67)
    frWrapper.unmount()

    const inr = ref<number | null>(0)
    const inrWrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: inr.value,
              locale: 'en-IN',
              'onUpdate:modelValue': (next: number | null) => {
                inr.value = next
              },
            })
        },
      }),
      { attachTo: document.body },
    )
    await commitValue(inrWrapper, '12,34,567.89', 'blur')
    expect(inr.value).toBe(1234567.89)
    await commitValue(inrWrapper, '12,34,56', 'blur')
    expect(inr.value).toBe(1234567.89)
    inrWrapper.unmount()
  })
})
