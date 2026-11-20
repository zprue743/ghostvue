import type { LlmsSidebarGroup } from './generate-llms-txt'

import { generatedComponentSidebar } from './.registries/docs-nav.components.generated'
import { generatedContributingSpecItems } from './.registries/docs-nav.specs.generated'

export { generatedComponentCatalog } from './.registries/docs-nav.catalog.generated'
export { generatedComponentPageLinks } from './.registries/docs-nav.components.generated'

export const docsTitle = 'GhostVue'

export const docsDescription =
  'Vue-first, headless-first UI primitives in @ghostvue/vue with optional OKLCH themes in @ghostvue/themes.'

const docsMainSidebar: LlmsSidebarGroup['items'] = [
  {
    text: 'Getting started',
    items: [
      { text: 'Getting started', link: '/getting-started' },
      { text: 'Introduction', link: '/philosophy' },
      { text: 'Nuxt & auto-imports', link: '/auto-imports' },
      { text: 'ESLint plugin', link: '/tooling/eslint-plugin' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'API reference', link: '/reference/' },
      { text: 'Dev warnings', link: '/warnings' },
      { text: 'Roadmap', link: '/roadmap' },
    ],
  },
  // GHO-48: add consumer AI & MCP docs additively under Docs without altering top-level nav.
]

const themingSidebar: LlmsSidebarGroup['items'] = [
  { text: 'Default theme', link: '/themes/default' },
  { text: 'Flagships & defineTheme', link: '/themes/define-theme' },
  { text: 'Tokens', link: '/themes/tokens' },
  { text: 'Density, type, roundness', link: '/themes/density' },
  { text: 'Elevation & materials', link: '/themes/elevation' },
  { text: 'Motion', link: '/themes/motion' },
]

const architectureSidebar: LlmsSidebarGroup['items'] = [
  { text: 'Overview', link: '/architecture/overview' },
  { text: 'Package boundaries', link: '/architecture/package-boundaries' },
  {
    text: 'IDs and controllable state',
    link: '/architecture/component-state',
  },
  { text: 'Focus scope and roving focus', link: '/architecture/focus' },
  { text: 'Styling', link: '/architecture/styling' },
  { text: 'Design tokens', link: '/architecture/tokens' },
  { text: 'Component manifests', link: '/architecture/component-manifest' },
]

const standardsSidebar: LlmsSidebarGroup['items'] = [
  { text: 'Code style', link: '/standards/code-style' },
  { text: 'Comments', link: '/standards/commenting' },
  { text: 'TypeScript', link: '/standards/typescript' },
  { text: 'Vue', link: '/standards/vue' },
  { text: 'Testing', link: '/standards/testing' },
  { text: 'Accessibility', link: '/standards/accessibility' },
  {
    text: 'Assistive-technology review',
    link: '/standards/assistive-technology-review',
  },
  { text: 'Public APIs', link: '/standards/public-api' },
  { text: 'Dependencies', link: '/standards/dependencies' },
  { text: 'Documentation', link: '/standards/documentation' },
  { text: 'Performance', link: '/standards/performance' },
]

const agentsSidebar: LlmsSidebarGroup['items'] = [
  { text: 'Agent guide', link: '/agents/AGENT_GUIDE' },
  { text: 'Architecture rules', link: '/agents/ARCHITECTURE_RULES' },
  { text: 'Testing rules', link: '/agents/TESTING_RULES' },
  { text: 'Component workflow', link: '/agents/COMPONENT_WORKFLOW' },
]

const contributeSidebar: LlmsSidebarGroup[] = [
  {
    text: 'Contributing',
    items: [
      { text: 'Workflow', link: '/contributing/workflow' },
      { text: 'Scaffolding components', link: '/contributing/new-component' },
      {
        text: 'Component verification',
        link: '/contributing/verify-component',
      },
      { text: 'Executable examples', link: '/contributing/examples' },
      { text: 'Releases', link: '/contributing/releases' },
      { text: 'CI and dependency updates', link: '/contributing/ci' },
    ],
  },
  {
    text: 'Architecture',
    items: architectureSidebar,
  },
  {
    text: 'Standards',
    collapsed: true,
    items: standardsSidebar,
  },
  {
    text: 'Specifications',
    collapsed: true,
    items: [
      { text: 'Spec template', link: '/components/spec-template' },
      ...generatedContributingSpecItems,
    ],
  },
  {
    text: 'Decisions',
    items: [{ text: 'ADR index', link: '/adr/' }],
  },
  {
    text: 'AI agents',
    collapsed: true,
    items: agentsSidebar,
  },
]

/** Path-keyed VitePress sidebars aligned with top nav sections. */
export const docsSidebars: Record<string, LlmsSidebarGroup[] | undefined> = {
  '/': [{ text: 'Docs', items: docsMainSidebar }],
  '/components/': [{ text: 'Components', items: generatedComponentSidebar }],
  '/themes/': [{ text: 'Theming', items: themingSidebar }],
  '/contributing/': contributeSidebar,
  '/architecture/': contributeSidebar,
  '/standards/': contributeSidebar,
  '/agents/': contributeSidebar,
  '/adr/': contributeSidebar,
  '/specs/': contributeSidebar,
}

/**
 * Flattened sidebar catalog for llms.txt, integration tests, and link crawlers.
 * Top-level groups match published nav order: Docs, Components, Theming, Contribute.
 */
export const docsSidebar: LlmsSidebarGroup[] = [
  { text: 'Docs', items: docsMainSidebar },
  { text: 'Components', items: generatedComponentSidebar },
  { text: 'Theming', items: themingSidebar },
  {
    text: 'Contribute',
    items: contributeSidebar.map((group) => ({
      text: group.text,
      collapsed: group.collapsed,
      items: group.items,
    })),
  },
]
