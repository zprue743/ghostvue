import type { GhostSlider, GhostSliderProps } from '../src'

const nativeProps = {
  'aria-label': 'Budget',
  class: 'filter',
  id: 'budget',
  onFocus() {
    return undefined
  },
} satisfies GhostSliderProps

const componentProps: InstanceType<typeof GhostSlider>['$props'] = nativeProps

void componentProps
