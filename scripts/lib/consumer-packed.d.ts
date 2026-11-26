export function consumerDependencyPins(
  root: string,
): Promise<Record<string, string>>

export function declaresThemeLayer(css: string): boolean

export const baseRecipeClasses: string[]

export function themedBuildCssProblems(
  css: string,
  options: { flagship: string },
): string[]

export function optInBuildCssProblems(
  css: string,
  options: { flagship: string; recipes: string[]; absentRecipes: string[] },
): string[]

export function cssTransferSize(stylesheets: string[]): {
  files: number
  minifiedBytes: number
  gzipBytes: number
}

export interface MountObservation {
  mounted?: boolean
  input?: { tag?: string | null; value?: string | null; label?: string | null }
  button?: { tag?: string; text?: string } | null
  select?: { role?: string | null; value?: string | null; options?: string[] }
  dialog?: { open?: string[]; afterClose?: string[] }
  drawer?: { open?: string[] }
  toast?: { shown?: boolean }
  errors?: string[]
}

export function viteAppMountProblems(result: MountObservation): string[]

export function viteOptInMountProblems(result: MountObservation): string[]

export function nuxtComponentSources(declarations: string): Map<string, string>

export function nuxtImportSources(declarations: string): Map<string, string>

export function nuxtAutoImportProblems(generated: {
  components: Map<string, string>
  imports: Map<string, string>
  componentPackage: string
}): string[]

export function nuxtPageProblems(html: string): string[]

export function eslintConsumerProblems(
  results: {
    filePath: string
    messages: { ruleId: string | null; message: string }[]
  }[],
): string[]
