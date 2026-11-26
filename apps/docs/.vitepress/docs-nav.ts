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
      // GHO-48: the consumer AI guide sits under Docs; the MCP reference stays
      // under Contribute > Architecture because llms.txt needs unique pages.
      { text: 'AI agents', link: '/tooling/ai-agents' },
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
  {
    text: 'MCP server',
    link: '/tooling/mcp-server',
  },
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
  { text: 'Component stability', link: '/standards/component-stability' },
  { text: 'Dependencies', link: '/standards/dependencies' },
  { text: 'Documentation', link: '/standards/documentation' },
  { text: 'Performance', link: '/standards/performance' },
]

const agentsSidebar: LlmsSidebarGroup['items'] = [
  { text: 'Agent guide', link: '/agents/AGENT_GUIDE' },
  { text: 'Architecture rules', link: '/agents/ARCHITECTURE_RULES' },
  { text: 'Testing rules', link: '/agents/TESTING_RULES' },
  { text: 'Component workflow', link: '/agents/COMPONENT_WORKFLOW' },
  { text: 'Agent eval harness', link: '/agents/EVAL_HARNESS' },
  {
    text: 'MCP contract',
    link: '/plans/gho-17-mcp-first-release',
  },
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
    items: [
      { text: 'ADR index', link: '/adr/' },
      {
        text: '0002 — Exit foundation phase',
        link: '/adr/0002-exit-foundation-phase',
      },
      {
        text: '0003 — Public component API conventions',
        link: '/adr/0003-public-component-api-conventions',
      },
      {
        text: '0004 — Headless and styled layering',
        link: '/adr/0004-headless-styled-layering',
      },
      {
        text: '0005 — Design token taxonomy',
        link: '/adr/0005-design-token-taxonomy',
      },
      {
        text: '0006 — Component manifest JSON Schema',
        link: '/adr/0006-component-manifest-schema',
      },
      {
        text: '0007 — Token compile pipeline',
        link: '/adr/0007-token-pipeline',
      },
      {
        text: '0008 — defineTheme and flagship themes',
        link: '/adr/0008-define-theme',
      },
      {
        text: '0009 — Ambient interactivity',
        link: '/adr/0009-ambient-interactivity',
      },
      {
        text: '0010 — Rebrand to GhostVue',
        link: '/adr/0010-rebrand-to-ghostvue',
      },
      {
        text: '0011 — Overlay primitives',
        link: '/adr/0011-overlay-primitives',
      },
      { text: '0012 — Modal overlays', link: '/adr/0012-modal-overlays' },
      { text: '0013 — Icon strategy', link: '/adr/0013-icon-strategy' },
      {
        text: '0014 — DataTable phase one',
        link: '/adr/0014-datatable-phase-one-architecture',
      },
      {
        text: '0015 — MCP server first release',
        link: '/adr/0015-mcp-server-first-release',
      },
    ],
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
