# Contribution workflow

1. Read `AGENTS.md`, this workflow, and relevant standards.
2. Inspect related code before introducing a pattern.
3. Agree on public behavior; component work begins from an approved spec.
4. Make the smallest coherent change with tests and documentation. Component
   usage samples belong in `examples/` ([executable examples](./examples.md)).
5. Add intent-focused comments for non-obvious reasoning.
6. Add a Changeset when a publishable package's consumer-visible behavior changes.
7. Run focused checks, then `pnpm verify`; run `pnpm test:e2e` for browser behavior.
8. Review the diff for API, accessibility, reactivity, SSR, cleanup, security,
   dependency, and licensing concerns.
9. Open a pull request using the template and report exact validation results.

Commits should be logical and readable. Conventional-style subjects such as
`feat:`, `fix:`, `docs:`, `test:`, and `chore:` are encouraged because they make
history scannable, but automated semantic-release behavior does not depend on
them. Do not split changes into ceremonial commits that cannot be reviewed or
reverted meaningfully.

AI-generated code is allowed and expected. The contributor remains accountable
for correctness, tests, accessibility, security, documentation, comments,
licensing, and the right to contribute the submitted material.
