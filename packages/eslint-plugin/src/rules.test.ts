/** @vitest-environment node */

import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import { describe, it } from 'vitest'

import plugin, { rules } from './index.js'

// RuleTester drives its own describe/it; route them through Vitest.
RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

const ruleTester = new RuleTester({
  languageOptions: {
    parser: vueParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
})

const filename = 'Fixture.vue'

/** A `<script setup>` SFC with the given imports and template body. */
function sfc(imports: string, template: string): string {
  return `<script setup>\n${imports}\n</script>\n<template>\n${template}\n</template>\n`
}

const headlessButton = "import { GhostButton } from '@ghostvue/vue'"
const themedButton = "import { GhostButton } from '@ghostvue/themes'"
// The opt-in theme CSS entry (#386) re-exports the themed wrappers unchanged.
const optInButton = "import { GhostButton } from '@ghostvue/themes/components'"
const BUTTON_DOCS =
  'https://github.com/zprue743/ghostvue/blob/master/docs/components/button.md'

describe('plugin shape', () => {
  it('registers the recommended config under the ghostvue namespace', ({
    expect,
  }) => {
    const recommended = plugin.configs.recommended
    expect(recommended.plugins?.['ghostvue']).toBe(plugin)
    expect(Object.keys(recommended.rules ?? {}).sort()).toEqual(
      Object.keys(rules)
        .map((name) => `ghostvue/${name}`)
        .sort(),
    )
    expect(recommended.files).toEqual(['**/*.vue'])
  })
})

ruleTester.run('no-unknown-props', rules['no-unknown-props'], {
  valid: [
    // Declared props in camel and kebab case, static and bound.
    {
      filename,
      code: sfc(
        headlessButton,
        '<GhostButton type="submit" :loading="busy" disabled>Save</GhostButton>',
      ),
    },
    {
      filename,
      code: sfc(
        "import { GhostCalendar } from '@ghostvue/vue'",
        '<GhostCalendar max-value="x" :week-starts-on="1" />',
      ),
    },
    // Native, ARIA, data, listener, and Vue reserved attributes fall through.
    {
      filename,
      code: sfc(
        headlessButton,
        '<GhostButton id="save" class="a" style="b" title="t" tabindex="0" aria-label="Save" :ariaDescribedby="d" data-test="x" role="link" name="n" key="k" ref="r" :onClick="go" @click="go" :readOnly="true">Save</GhostButton>',
      ),
    },
    // The opt-in entry resolves to the same themed contracts.
    {
      filename,
      code: sfc(
        optInButton,
        '<GhostButton variant="soft" tone="danger" icon-only aria-label="x" />',
      ),
    },
    // Themed-only visual props are valid on the themed import.
    {
      filename,
      code: sfc(
        themedButton,
        '<GhostButton variant="soft" tone="danger" icon-only aria-label="x" />',
      ),
    },
    // Themed contract includes the headless props the wrapper forwards.
    {
      filename,
      code: sfc(
        "import { GhostAccordion } from '@ghostvue/themes'",
        '<GhostAccordion type="multiple" collapsible :heading-level="2" />',
      ),
    },
    // Aliases, kebab-case tags, and namespace imports resolve to the export.
    {
      filename,
      code: sfc(
        "import { GhostButton as Btn } from '@ghostvue/themes'",
        '<Btn variant="ghost" /><btn-x variant="ghost" />',
      ),
    },
    {
      filename,
      code: sfc(themedButton, '<ghost-button variant="outline" />'),
    },
    {
      filename,
      code: sfc(
        "import * as Ghost from '@ghostvue/themes'",
        '<Ghost.GhostButton variant="outline" />',
      ),
    },
    // A bound polymorphic `as` forwards attributes to an unknown component.
    {
      filename,
      code: sfc(
        "import { GhostLink } from '@ghostvue/vue'",
        '<GhostLink :as="RouterLink" to="/home" replace>Home</GhostLink>',
      ),
    },
    // Spreads, dynamic arguments, and .prop/.attr bindings are skipped.
    {
      filename,
      code: sfc(
        headlessButton,
        '<GhostButton v-bind="attrs" :[name]="value" :foo.prop="x" :bar.attr="y" />',
      ),
    },
    // Non-GhostVue components, unresolved tags, and native elements.
    {
      filename,
      code: sfc(
        "import { MyButton } from './MyButton.vue'",
        '<MyButton variant="x" /><GhostButton varient="x" /><button varient="x" />',
      ),
    },
    // An unrelated module that happens to export a GhostButton.
    {
      filename,
      code: sfc(
        "import { GhostButton } from '@acme/ghost'",
        '<GhostButton varient="x" />',
      ),
    },
    // Options API registration is not resolved, so nothing is reported.
    {
      filename,
      code: `<script>
import { GhostButton } from '@ghostvue/vue'
export default { components: { GhostButton } }
</script>
<template><GhostButton varient="x" /></template>
`,
    },
    // Themed sub-parts without their own manifest are unresolved.
    {
      filename,
      code: sfc(
        "import { GhostAccordionItem } from '@ghostvue/themes'",
        '<GhostAccordionItem whatever="x" />',
      ),
    },
    // Exports without a manifest, and dynamic components.
    {
      filename,
      code: sfc(
        "import { useGhostButton } from '@ghostvue/vue'",
        '<component :is="GhostButton" varient="x" />',
      ),
    },
    // Non-Vue files are ignored.
    { filename: 'file.js', code: 'const a = 1' },
  ],
  invalid: [
    {
      filename,
      code: sfc(
        headlessButton,
        '<GhostButton varient="soft">Save</GhostButton>',
      ),
      errors: [
        {
          messageId: 'unknownProp',
          data: {
            name: 'varient',
            component: 'GhostButton',
            packageName: '@ghostvue/vue',
            props: 'disabled, loading, type',
            docs: BUTTON_DOCS,
          },
          line: 5,
        },
      ],
    },
    // Named and namespace imports from the opt-in entry are checked against
    // the themed contracts instead of being skipped.
    {
      filename,
      code: sfc(
        `${optInButton}\nimport * as T from '@ghostvue/themes/components'`,
        '<GhostButton sise="lg" /><T.GhostButton varient="soft" />',
      ),
      errors: [
        {
          message:
            /^'sise' is not a prop of GhostButton from @ghostvue\/themes and/,
        },
        {
          message:
            /^'varient' is not a prop of GhostButton from @ghostvue\/themes and/,
        },
      ],
    },
    // A themed-only prop is unknown on the headless import.
    {
      filename,
      code: sfc(headlessButton, '<GhostButton variant="soft" :tone="t" />'),
      errors: [
        { messageId: 'unknownProp', data: { name: 'variant' } },
        { messageId: 'unknownProp', data: { name: 'tone' } },
      ].map(({ messageId, data }) => ({
        messageId,
        data: {
          ...data,
          component: 'GhostButton',
          packageName: '@ghostvue/vue',
          props: 'disabled, loading, type',
          docs: BUTTON_DOCS,
        },
      })),
    },
    // Aliased, kebab-case, and namespace usages are checked against the export.
    {
      filename,
      code: sfc(
        "import { GhostButton as Btn } from '@ghostvue/themes'\nimport * as G from '@ghostvue/vue'",
        '<Btn sise="lg" /><btn sise="lg" /><G.GhostButton v-bind:icon-only="true" />',
      ),
      errors: [
        {
          message:
            /^'sise' is not a prop of GhostButton from @ghostvue\/themes/,
        },
        {
          message:
            /^'icon-only' is not a prop of GhostButton from @ghostvue\/vue/,
        },
      ],
    },
    // A static native `as` tag keeps the element checkable.
    {
      filename,
      code: sfc(
        "import { GhostLink } from '@ghostvue/vue'",
        '<GhostLink as="a" to="/home">Home</GhostLink>',
      ),
      errors: [{ message: /^'to' is not a prop of GhostLink/ }],
    },
    {
      filename,
      code: sfc(
        "import { GhostDialogContent } from '@ghostvue/vue'",
        '<ghost-dialog-content foo-bar />',
      ),
      errors: [
        {
          message:
            "'foo-bar' is not a prop of GhostDialogContent from @ghostvue/vue and is not a native, ARIA, or data attribute. Declared props: as, closeOnEscape, closeOnOutsideClick, focusReady, initialFocus, portal, portalTo, returnFocus, role. See https://github.com/zprue743/ghostvue/blob/master/docs/components/dialog.md",
        },
      ],
    },
  ],
})

ruleTester.run('no-unknown-slots', rules['no-unknown-slots'], {
  valid: [
    {
      filename,
      code: sfc(
        "import { GhostCard } from '@ghostvue/vue'",
        '<GhostCard><template #header>H</template>Body<template v-slot:footer>F</template></GhostCard>',
      ),
    },
    {
      filename,
      code: sfc(
        "import { GhostEmptyState } from '@ghostvue/themes'",
        '<GhostEmptyState>\n  <!-- comment -->\n  <template #title>T</template>\n</GhostEmptyState>',
      ),
    },
    // Dynamic slot names and default content on default-slot components.
    {
      filename,
      code: sfc(
        "import { GhostCard } from '@ghostvue/vue'",
        '<GhostCard><template #[slotName]>X</template><template v-if="a"><p>x</p></template></GhostCard>',
      ),
    },
    // v-slot on the component itself targets the default slot.
    {
      filename,
      code: sfc(
        "import { GhostCard } from '@ghostvue/vue'",
        '<GhostCard v-slot="scope">{{ scope }}</GhostCard>',
      ),
    },
    // Whitespace-only children of a slotless component are not content.
    {
      filename,
      code: sfc(
        "import { GhostInput } from '@ghostvue/vue'",
        '<GhostInput>\n</GhostInput><GhostInput />',
      ),
    },
    // Data-driven slot names (one per DataTable column id) are not checked.
    {
      filename,
      code: sfc(
        "import { GhostDataTableTable } from '@ghostvue/vue'",
        '<GhostDataTableTable><template #amount="{ value }">{{ value }}</template></GhostDataTableTable>',
      ),
    },
    // Themed contract includes the headless default slot it forwards.
    {
      filename,
      code: sfc(
        "import { GhostHoverCard } from '@ghostvue/themes'",
        '<GhostHoverCard><span>trigger</span></GhostHoverCard>',
      ),
    },
    // Unresolved components are not checked.
    {
      filename,
      code: sfc(
        "import { GhostInput } from './local'",
        '<GhostInput><template #nope>x</template></GhostInput>',
      ),
    },
  ],
  invalid: [
    {
      filename,
      code: sfc(
        "import { GhostCard } from '@ghostvue/vue'",
        '<GhostCard><template #heading>H</template></GhostCard>',
      ),
      errors: [
        {
          messageId: 'unknownSlot',
          data: {
            component: 'GhostCard',
            packageName: '@ghostvue/vue',
            slot: 'heading',
            slots: 'default, footer, header',
            docs: 'https://github.com/zprue743/ghostvue/blob/master/docs/components/card.md',
          },
        },
      ],
    },
    {
      filename,
      code: sfc(
        "import { GhostCard } from '@ghostvue/themes/components'",
        '<GhostCard><template #heading>H</template></GhostCard>',
      ),
      errors: [
        { message: /^GhostCard from @ghostvue\/themes has no 'heading' slot/ },
      ],
    },
    // Implicit default content for a component without a default slot is
    // reported once, at the first content node.
    {
      filename,
      code: sfc(
        "import { GhostInput } from '@ghostvue/vue'",
        '<GhostInput>Label {{ x }}<b>y</b></GhostInput>',
      ),
      errors: [
        {
          message:
            "GhostInput from @ghostvue/vue has no 'default' slot. Declared slots: (none). See https://github.com/zprue743/ghostvue/blob/master/docs/components/input.md",
        },
      ],
    },
    {
      filename,
      code: sfc(
        "import { GhostAvatar as Av } from '@ghostvue/themes'",
        '<Av #default>x</Av><av-x v-slot:fallback>ok</av-x>',
      ),
      errors: [
        {
          message: /^GhostAvatar from @ghostvue\/themes has no 'default' slot/,
        },
      ],
    },
    {
      filename,
      code: sfc(
        "import { GhostCheckbox } from '@ghostvue/vue'",
        '<GhostCheckbox><template v-slot:label>L</template></GhostCheckbox>',
      ),
      errors: [{ messageId: 'unknownSlot' }],
    },
  ],
})

ruleTester.run('no-undeclared-v-model', rules['no-undeclared-v-model'], {
  valid: [
    {
      filename,
      code: sfc(
        "import { GhostCombobox } from '@ghostvue/vue'",
        '<GhostCombobox v-model="value" v-model:open="open" v-model:search.trim="q" />',
      ),
    },
    // Themed wrappers forward the headless models.
    {
      filename,
      code: sfc(
        "import { GhostCalendar } from '@ghostvue/themes'",
        '<GhostCalendar v-model="d" v-model:visible-month="m" />',
      ),
    },
    // Dynamic arguments and unresolved components are skipped.
    {
      filename,
      code: sfc(
        "import { GhostButton } from '@ghostvue/vue'\nimport Other from './Other.vue'",
        '<GhostButton v-model:[arg]="x" /><Other v-model:anything="y" />',
      ),
    },
  ],
  invalid: [
    {
      filename,
      code: sfc(headlessButton, '<GhostButton v-model="pressed" />'),
      errors: [
        {
          messageId: 'undeclaredModel',
          data: {
            component: 'GhostButton',
            packageName: '@ghostvue/vue',
            directive: 'v-model',
            prop: 'modelValue',
            models: '(none)',
            docs: BUTTON_DOCS,
          },
        },
      ],
    },
    {
      filename,
      code: sfc(
        "import { GhostDialog } from '@ghostvue/themes'",
        '<GhostDialog v-model="open" v-model:open="open" />',
      ),
      errors: [
        {
          message:
            "GhostDialog from @ghostvue/themes does not declare v-model (model prop 'modelValue'). Declared models: open. See https://github.com/zprue743/ghostvue/blob/master/docs/components/dialog.md",
        },
      ],
    },
    {
      filename,
      code: sfc(
        "import { GhostDialog } from '@ghostvue/themes/components'",
        '<GhostDialog v-model="open" v-model:open="open" />',
      ),
      errors: [
        {
          message:
            /^GhostDialog from @ghostvue\/themes does not declare v-model \(model prop 'modelValue'\)/,
        },
      ],
    },
    {
      filename,
      code: sfc(
        "import { GhostSelect } from '@ghostvue/vue'",
        '<GhostSelect v-model:search-text="q" />',
      ),
      errors: [
        {
          message:
            /does not declare v-model:search-text \(model prop 'searchText'\)/,
        },
      ],
    },
  ],
})

// Default espree config: a `.vue` file that skipped vue-eslint-parser.
new RuleTester().run('parser requirement', rules['no-unknown-props'], {
  valid: [{ filename: 'plain.js', code: 'const ignored = true' }],
  invalid: [
    {
      filename,
      code: 'const notParsedAsVue = true',
      errors: [{ message: /need vue-eslint-parser for \.vue files/ }],
    },
  ],
})
