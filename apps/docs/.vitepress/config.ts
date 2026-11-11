import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'slop-ui',
  description:
    'Engineering foundation for a Vue-first, headless-first UI library',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Philosophy', link: '/philosophy' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Standards', link: '/standards/code-style' },
      { text: 'Contributing', link: '/contributing/workflow' },
    ],
    sidebar: [
      {
        text: 'Project',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Philosophy', link: '/philosophy' },
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
          { text: 'Styling', link: '/architecture/styling' },
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
          { text: 'ADRs', link: '/adr/' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/zprue743/slop-ui' },
    ],
  },
})
