# Contributing

Thank you for helping build GhostVue. The project accepts human-authored and
AI-assisted contributions under the same engineering standards.

## Start here

Browse the [open issues](https://github.com/zprue743/ghostvue/issues) or
[report a bug or request a feature](https://github.com/zprue743/ghostvue/issues/new/choose).
If you want to work on an issue, comment with what you would change so a
maintainer can confirm the scope and release.

Read the [first contribution guide](./docs/contributing/workflow.md#first-contribution)
for setup, checks, and what to include in a pull request. Component work requires
an approved specification based on the [component template](./docs/components/spec-template.md).

## Local checks

```bash
pnpm install
pnpm verify
```

Run the relevant Playwright specs when behavior is visible in a browser. In
your pull request, describe the change, link the issue, and report the validation
results and any public API or accessibility impact.

Contributors are responsible for ensuring they have the right to submit their
work. Do not contribute proprietary employer code, confidential material,
internal documentation, restricted designs, or code with incompatible licensing.
AI-generated output must be reviewed for correctness, provenance, licensing,
security, accessibility, and maintainability before submission.

Participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md). Report
security issues using [SECURITY.md](./SECURITY.md), not a public issue.
