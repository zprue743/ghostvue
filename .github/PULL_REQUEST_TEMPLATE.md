## Summary

Explain the user or engineering problem and the chosen approach.

## Tracking

Link the GitHub issue so it can close on merge, for example `Fixes #123`. Branch
names should follow `issue-<n>-<short-slug>` when the work maps to an issue.

## Public API and compatibility

- Public API impact:
- Changeset added or not required because:
- Migration/deprecation impact:

## Accessibility

Describe semantic, keyboard, focus, and assistive-technology impact, or explain
why the change cannot affect accessibility.

## Validation

- [ ] `pnpm verify`
- [ ] `pnpm test:e2e` (required for browser-observable behavior)
- [ ] Relevant manual or assistive-technology checks

List additional focused checks and meaningful cases covered.

## Review checklist

- [ ] Tests assert behavior rather than private implementation.
- [ ] Non-obvious reasoning has intent-focused comments.
- [ ] Public docs and examples match the implementation.
- [ ] No unnecessary abstraction, dependency, or competing pattern was added.
- [ ] Consumer data, reactivity, SSR, cleanup, security, and licensing were reviewed.
