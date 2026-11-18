const RULE_DOCS_BASE_URL =
  'https://github.com/zprue743/ghostvue/blob/master/docs/tooling/eslint-plugin.md'

/** Rule documentation anchor on the public ESLint plugin page. */
export function ruleDocsUrl(ruleName: string): string {
  return `${RULE_DOCS_BASE_URL}#${ruleName}`
}
