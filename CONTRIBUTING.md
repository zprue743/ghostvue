# Contributing

Thank you for helping build GhostVue. The project accepts human-authored and
AI-assisted contributions under the same engineering standards.

Start with the [contribution workflow](./docs/contributing/workflow.md), then read
the architecture and standards relevant to your change. Component work requires
an approved specification based on the
[component template](./docs/components/spec-template.md).

## Local checks

```bash
pnpm install
pnpm verify
```

Run `pnpm test:e2e` when behavior is visible in a browser. A pull request should
explain its intent, public API impact, accessibility impact, test coverage, and
validation results.

Contributors are responsible for ensuring they have the right to submit their
work. Do not contribute proprietary employer code, confidential material,
internal documentation, restricted designs, or code with incompatible licensing.
AI-generated output must be reviewed for correctness, provenance, licensing,
security, accessibility, and maintainability before submission.

Participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md). Report
security issues using [SECURITY.md](./SECURITY.md), not a public issue.
