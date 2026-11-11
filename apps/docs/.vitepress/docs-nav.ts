import type { LlmsSidebarGroup } from './generate-llms-txt'

export const docsTitle = 'slop-ui'

export const docsDescription =
  'Engineering foundation for a Vue-first, headless-first UI library'

export const docsSidebar: LlmsSidebarGroup[] = [
  {
    text: 'Project',
    items: [
      { text: 'Overview', link: '/' },
      { text: 'Philosophy', link: '/philosophy' },
      { text: 'Component roadmap', link: '/roadmap' },
    ],
  },
  {
    text: 'Components',
    items: [
      { text: 'SlButton', link: '/components/button' },
      { text: 'SlVisuallyHidden', link: '/components/visually-hidden' },
      { text: 'Default theme', link: '/themes/default' },
      {
        text: 'defineTheme and flagships',
        link: '/themes/define-theme',
      },
      { text: 'Token catalog', link: '/themes/tokens' },
      {
        text: 'Elevation, materials, gradients',
        link: '/themes/elevation',
      },
      { text: 'Motion', link: '/themes/motion' },
      {
        text: 'Density, type, roundness',
        link: '/themes/density',
      },
    ],
  },
  {
    text: 'Architecture',
    items: [
      { text: 'Overview', link: '/architecture/overview' },
      {
        text: 'Package boundaries',
        link: '/architecture/package-boundaries',
      },
      {
        text: 'IDs and controllable state',
        link: '/architecture/component-state',
      },
      {
        text: 'Focus scope and roving focus',
        link: '/architecture/focus',
      },
      { text: 'Styling', link: '/architecture/styling' },
      { text: 'Design tokens', link: '/architecture/tokens' },
      {
        text: 'Component manifests',
        link: '/architecture/component-manifest',
      },
      {
        text: 'Development diagnostics',
        link: '/warnings',
      },
    ],
  },
  {
    text: 'Standards',
    items: [
      { text: 'Code style', link: '/standards/code-style' },
      { text: 'Comments', link: '/standards/commenting' },
      { text: 'TypeScript', link: '/standards/typescript' },
      { text: 'Vue', link: '/standards/vue' },
      { text: 'Testing', link: '/standards/testing' },
      { text: 'Accessibility', link: '/standards/accessibility' },
      { text: 'Public APIs', link: '/standards/public-api' },
      { text: 'Dependencies', link: '/standards/dependencies' },
      { text: 'Documentation', link: '/standards/documentation' },
      { text: 'Performance', link: '/standards/performance' },
    ],
  },
  {
    text: 'Contributing',
    items: [
      { text: 'Workflow', link: '/contributing/workflow' },
      { text: 'Releases', link: '/contributing/releases' },
      { text: 'Component specs', link: '/components/spec-template' },
      {
        text: 'SlButton specification',
        link: '/components/button-spec',
      },
      {
        text: 'SlVisuallyHidden specification',
        link: '/components/visually-hidden-spec',
      },
      { text: 'ADRs', link: '/adr/' },
    ],
  },
  {
    text: 'AI agents',
    items: [
      { text: 'Agent guide', link: '/agents/AGENT_GUIDE' },
      { text: 'Architecture rules', link: '/agents/ARCHITECTURE_RULES' },
      { text: 'Testing rules', link: '/agents/TESTING_RULES' },
      { text: 'Component workflow', link: '/agents/COMPONENT_WORKFLOW' },
    ],
  },
]
