import { docsSidebar } from '../docs-nav'

interface ComponentManifest {
  name: string
  package: string
  description: string
}

const vueManifestModules = import.meta.glob<ComponentManifest>(
  '../../../../packages/vue/manifests/*.manifest.json',
  { eager: true, import: 'default' },
)

const themesManifestModules = import.meta.glob<ComponentManifest>(
  '../../../../packages/themes/manifests/*.manifest.json',
  { eager: true, import: 'default' },
)

const vueManifests = Object.values(vueManifestModules)

const themesComponentNames = new Set(
  Object.values(themesManifestModules).map((manifest) => manifest.name),
)

const manifestByName = new Map(
  vueManifests.map((manifest) => [manifest.name, manifest]),
)

export interface LandingSurfaceRow {
  exportName: string
  pkg: string
  description: string
  link: string
}

/**
 * Rows for the landing ledger: sidebar component docs cross-referenced with
 * generated vue manifests (same contract as /reference), plus themes package
 * membership when a themed manifest exists.
 */
export function landingComponentSurface(): LandingSurfaceRow[] {
  const componentNav =
    docsSidebar.find((group) => group.text === 'Components')?.items ?? []

  return componentNav
    .filter(
      (item): item is { text: string; link: string } =>
        typeof item.text === 'string' &&
        item.text.startsWith('Ghost') &&
        typeof item.link === 'string' &&
        item.link.startsWith('/components/'),
    )
    .map((item) => {
      const manifest = manifestByName.get(item.text)
      const pkg = themesComponentNames.has(item.text)
        ? '@ghostvue/vue · @ghostvue/themes'
        : '@ghostvue/vue'
      return {
        exportName: item.text,
        pkg,
        description: manifest?.description ?? '',
        link: item.link,
      }
    })
}
