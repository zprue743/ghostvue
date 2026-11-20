# Accessibility standard

Accessibility is architecture, not final QA. A component specification must
define semantics before implementation:

- native element choice and ARIA roles;
- accessible names, descriptions, states, and relationships;
- complete keyboard interaction and key conflict behavior;
- focus entry, movement, trapping, restoration, and visible indication;
- disabled and read-only semantics;
- loading, empty, validation, and async announcements;
- expected assistive-technology behavior; and
- touch, zoom, reduced-motion, contrast, and target-size considerations where
  applicable.

Prefer native HTML semantics. ARIA supplements missing native meaning; it does
not repair arbitrary markup automatically. Components must remain operable
without a pointer and should not encode meaning through color alone.

Decorative icons, whether default or consumer-supplied, are hidden with
`aria-hidden="true"`. An icon is never the only accessible name: icon-only
controls are named with `aria-label`, `aria-labelledby`, or visually hidden
text. See [ADR 0013](../adr/0013-icon-strategy.md).

Specs should cite established WAI-ARIA Authoring Practices patterns when a
matching composite widget exists, while still validating the chosen behavior in
the product context. Tests should cover keyboard and focus behavior explicitly.
Automated axe scans are a baseline, not evidence that a component is accessible.
Meaningful components require manual reasoning and, before stable release,
assistive-technology review proportionate to their complexity.

## Recording verification

Component manifests record APG conformance evidence in three separate
categories: automated keyboard tests, manual interaction review, and
assistive-technology review. See
[accessibility verification](../architecture/component-manifest.md#accessibility-verification).
Automated results never mark a manual or assistive-technology category as
passed. Unreviewed categories stay `not-reviewed`; do not record a review that
did not happen.
