# Assistive-technology review process

Assistive-technology (AT) review is required before promoting any interactive
component to `stable`. Automated browser and axe checks remain a baseline only:
they never mark `accessibility.verification.assistiveTechnology` as `passed`,
and components without recorded AT testing stay `not-reviewed`.

> This document establishes the review process and gate. It does **not** claim
> any screen-reader test has run, appoint an unavailable tester, or promote
> existing `experimental` components.

## Ownership and attribution

- **Coordination and final sign-off:** Zac owns AT review coordination and
  final sign-off before a component is promoted to `stable`.
- **Tester attribution:** Identify and credit the actual person who ran each
  screen-reader session in both the review record and the manifest's
  `reviewer` field. Coordination or sign-off does not count as completed
  testing.

## Screen-reader and browser matrix

Before `stable`, every interactive component requires the **desktop baseline**
pairings. Conditional pairings are required whenever platform-specific
interactions, touch/virtual-cursor behavior, or known issues make them relevant.
For every conditional pairing that is not tested, record the explicit exclusion
reason in the review record.

| Pairing                      | Requirement | Target platform | When required / exclusion rule                                                                                                                            |
| ---------------------------- | ----------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NVDA + Firefox**           | Required    | Windows desktop | Mandatory for every interactive component before `stable`.                                                                                                |
| **VoiceOver + Safari**       | Required    | macOS desktop   | Mandatory for every interactive component before `stable`.                                                                                                |
| **JAWS + Chrome**            | Conditional | Windows desktop | Required when enterprise Windows, virtual-cursor, or forms-mode interactions or known JAWS issues apply; otherwise record why excluded.                   |
| **VoiceOver + Safari (iOS)** | Conditional | iOS / iPadOS    | Required when touch exploration, rotor navigation, mobile virtual keyboard, or mobile overlay/focus-trap behavior applies; otherwise record why excluded. |
| **TalkBack + Chrome**        | Conditional | Android         | Required when Android touch exploration, swipe navigation, mobile input/virtual keyboard, or overlay dismissal applies; otherwise record why excluded.    |

## Required review evidence

Every AT review record must capture:

1. **Component and revision:** component name (`Ghost*`), package
   (`@ghostvue/vue` or `@ghostvue/themes`), and exact git commit SHA or
   published package version reviewed.
2. **Tester:** the person who executed the AT checks (distinct from coordinator
   and sign-off).
3. **Versions:** exact OS/platform, browser, and assistive-technology versions
   for every pairing tested.
4. **Scenarios:** concrete interaction scenarios checked (APG expectations,
   keyboard and focus flow, accessible names/descriptions/states, live-region
   or async announcements, disabled/read-only/error states, and portal/overlay
   entry and focus restoration where applicable).
5. **Results and exclusions:** pass/fail outcomes per pairing, any defects or
   workarounds found, and explicit rationale for any excluded conditional pairing.
6. **Sign-off:** Zac's coordination and final sign-off record before promotion.

## Review record template

Copy this template for each component AT review record (linked from the
component manifest's `reference` field via an `https://` URL or
repository-relative path):

```markdown
# Assistive-technology review: <GhostComponent>

- **Component:** `<GhostComponent>` (`<@ghostvue/vue | @ghostvue/themes>`)
- **Revision:** `<git-sha-or-package-version>`
- **Review date:** `<YYYY-MM-DD>`
- **Tester:** `<actual tester name / handle>`
- **Coordinator & final sign-off:** Zac (`<pending | approved YYYY-MM-DD>`)

## Environment matrix

| Pairing                  | Requirement | OS version                 | Browser version           | AT version               | Outcome                    | Exclusion rationale / notes |
| ------------------------ | ----------- | -------------------------- | ------------------------- | ------------------------ | -------------------------- | --------------------------- |
| NVDA + Firefox           | Required    | `<e.g. Windows 11 24H2>`   | `<e.g. Firefox 140>`      | `<e.g. NVDA 2025.1>`     | `<pass / fail>`            | `—`                         |
| VoiceOver + Safari       | Required    | `<e.g. macOS 15.4>`        | `<e.g. Safari 18.4>`      | `<e.g. VoiceOver>`       | `<pass / fail>`            | `—`                         |
| JAWS + Chrome            | Conditional | `<OS or N/A>`              | `<Browser or N/A>`        | `<AT or N/A>`            | `<pass / fail / excluded>` | `<Required if excluded>`    |
| VoiceOver + Safari (iOS) | Conditional | `<iOS version or N/A>`     | `<Safari iOS or N/A>`     | `<VoiceOver iOS or N/A>` | `<pass / fail / excluded>` | `<Required if excluded>`    |
| TalkBack + Chrome        | Conditional | `<Android version or N/A>` | `<Chrome Android or N/A>` | `<TalkBack or N/A>`      | `<pass / fail / excluded>` | `<Required if excluded>`    |

## Scenarios tested

- [ ] Name, role, value, and state announcements match the component specification and APG pattern.
- [ ] Keyboard navigation, focus entry, focus trapping (if modal), and focus restoration work with the virtual cursor / screen reader active.
- [ ] Disabled, read-only, invalid/error, loading, and expanded/selected state changes announce as expected.
- [ ] `<Add component-specific scenarios here>`

## Results and findings

- **Overall outcome:** `<pass / fail>`
- **Summary:** `<Concise summary of what was verified, defects found, and conditional exclusions>`
- **Follow-up issues:** `<None or links to Linear/GitHub issues>`
```

## Manifest integration

Record completed AT review evidence in the component manifest under
`accessibility.verification.assistiveTechnology` using manifest `schemaVersion`
`1.1.0` (see
[accessibility verification](../architecture/component-manifest.md#accessibility-verification)):

- Keep `status: "not-reviewed"` and `evidence: []` until real AT testing has
  been completed.
- When AT testing completes, set `status` to `"passed"` (or `"failed"` if a
  blocking defect was found) and add one `evidence` entry per tested pairing.
- Credit the **actual tester** in `reviewer`, record exact versions in
  `environment` (`platform`, `browser`, `assistiveTechnology`), point
  `reference` to the review record, and summarize the outcome and any
  conditional exclusions in `summary`.
- Keep `automatedKeyboard` and `manual` independent; never copy automated
  results into `assistiveTechnology`.

```json
{
  "schemaVersion": "1.1.0",
  "accessibility": {
    "verification": {
      "assistiveTechnology": {
        "status": "passed",
        "evidence": [
          {
            "component": "GhostButton",
            "package": "@ghostvue/vue",
            "revision": "0.1.0",
            "date": "2026-11-20",
            "reviewer": "Actual Tester",
            "environment": {
              "assistiveTechnology": "NVDA 2025.1",
              "browser": "Firefox 140",
              "platform": "Windows 11 24H2"
            },
            "reference": "https://github.com/zprue743/ghostvue/issues/...",
            "summary": "NVDA+Firefox passed name, role, disabled, and activation checks; conditional mobile/JAWS pairings excluded (native button semantics only)."
          },
          {
            "component": "GhostButton",
            "package": "@ghostvue/vue",
            "revision": "0.1.0",
            "date": "2026-11-20",
            "reviewer": "Actual Tester",
            "environment": {
              "assistiveTechnology": "VoiceOver",
              "browser": "Safari 18.4",
              "platform": "macOS 15.4"
            },
            "reference": "https://github.com/zprue743/ghostvue/issues/...",
            "summary": "VoiceOver+Safari desktop passed focus, activation, and state announcements."
          }
        ]
      }
    }
  }
}
```

## Promoting a component to `stable`

A component manifest may set `"status": "stable"` only when all of the following
hold:

1. The [component gate](../agents/COMPONENT_WORKFLOW.md) is satisfied (approved
   spec, unit/Vue/type/browser tests, public docs, and valid manifest).
2. `accessibility.verification.assistiveTechnology.status` is `"passed"`.
3. `assistiveTechnology.evidence` includes recorded desktop evidence for both
   **NVDA + Firefox** and **VoiceOver + Safari**, plus any relevant conditional
   pairings (with explicit exclusions documented in the review record).
4. Zac has recorded final sign-off on the review record, and the actual tester
   is credited in `reviewer`.

`pnpm manifests` (run by `pnpm verify:static`) enforces items 2 and 3
automatically: any manifest with `"status": "stable"` fails validation if
`assistiveTechnology.status` is not `"passed"` or if either **NVDA + Firefox**
or **VoiceOver + Safari** desktop evidence is missing.
