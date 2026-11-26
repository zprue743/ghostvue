import { generatedComponentCatalog } from '../.registries/docs-nav.catalog.generated'

interface ManifestProp {
  name: string
  type: string
  default?: unknown
}

interface ComponentManifest {
  name: string
  package: string
  status: string
  description: string
  props: ManifestProp[]
}

const vueManifestModules = import.meta.glob<ComponentManifest>(
  '../../../../packages/vue/manifests/*.manifest.json',
  { eager: true, import: 'default' },
)

export interface LandingCatalogItem {
  label: string
  link: string
  /** First sentence of the catalog description; tiles have room for one. */
  summary: string
}

export interface LandingCatalogGroup {
  key: string
  label: string
  /** Example id (`button/action-bar`) shown live beside the group's tiles. */
  featuredExample: string
  items: LandingCatalogItem[]
}

/*
 * One live example per catalog category. Keyed by the generated
 * `categoryKey`, so a renamed or new category fails the docs build here
 * instead of silently rendering a group with no showcase.
 */
const featuredExamples = {
  actions: 'button/action-bar',
  forms: 'switch/workspace-security',
  'navigation-disclosure': 'accordion/deployment-faq',
  overlays: 'popover/share-settings',
  feedback: 'inline-alert/billing-notices',
  utilities: 'scroll-area/activity-feed',
} as const satisfies Record<string, `${string}/${string}`>

function isFeaturedKey(key: string): key is keyof typeof featuredExamples {
  return key in featuredExamples
}

function firstSentence(text: string): string {
  const end = text.indexOf('. ')
  return end === -1 ? text : text.slice(0, end + 1)
}

/**
 * Component catalog for the landing showcase. Reads the same generated
 * catalog as `/components/`, so the home page cannot list a component the
 * docs do not publish.
 */
export function landingCatalog(): LandingCatalogGroup[] {
  return generatedComponentCatalog.map((group) => {
    if (!isFeaturedKey(group.categoryKey)) {
      throw new Error(
        `Landing page has no featured example for the "${group.categoryKey}" catalog category. Add one in landing-surface.ts.`,
      )
    }
    return {
      key: group.categoryKey,
      label: group.category,
      featuredExample: featuredExamples[group.categoryKey],
      items: group.items.map((item) => ({
        label: item.label,
        link: item.link,
        summary: firstSentence(item.description),
      })),
    }
  })
}

/** Number of component pages in the published catalog. */
export function landingComponentCount(): number {
  return generatedComponentCatalog.reduce(
    (total, group) => total + group.items.length,
    0,
  )
}

/**
 * A short, real excerpt of the GhostButton manifest for the tooling section.
 * Built from the generated JSON so the sample cannot drift from the contract
 * that the MCP server, ESLint plugin, and API reference read.
 */
export function landingManifestExcerpt(): string {
  const manifest = Object.values(vueManifestModules).find(
    (candidate) => candidate.name === 'GhostButton',
  )
  if (!manifest) {
    throw new Error('GhostButton manifest is missing from packages/vue.')
  }
  return JSON.stringify(
    {
      name: manifest.name,
      package: manifest.package,
      status: manifest.status,
      props: manifest.props.slice(0, 2).map((prop) => ({
        name: prop.name,
        type: prop.type,
        default: prop.default,
      })),
    },
    null,
    2,
  )
}
