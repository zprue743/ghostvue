# Architecture decision records

Use an ADR for a durable, consequential decision with meaningful alternatives:
package boundaries, public architectural patterns, compatibility policy, or
foundational tooling. Do not create ADRs for routine implementation details.

Copy `0000-template.md`, assign the next four-digit number, write a short
kebab-case title, and set the status. Link superseding ADRs in both directions.
An ADR records why the decision made sense at the time; later changes should add
new context rather than rewriting history.

Number **0001** is reserved by [PR #21](https://github.com/zprue743/slop-ui/pull/21)
(`0001-begin-component-implementation.md`), which records the end of the
component moratorium.

## Decisions

- [0002 — Exit the foundation phase under a component gate](./0002-exit-foundation-phase.md)
- [0003 — Public component API conventions](./0003-public-component-api-conventions.md)
