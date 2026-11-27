# Catalogue review for 0.1.0

This is the evidence record for [#311](https://github.com/zprue743/ghostvue/issues/311). Visual and accessibility approval is pending. Zac coordinates review and records who approved each area in the issue.

## Capture sets

The 66 matched Linux screenshot pairs compare the first committed catalogue captures at `ab1bf5f0` with the initial candidate at `fb91bd3e`. The revised Share open captures are in the [#406 diff](https://github.com/zprue743/ghostvue/pull/406/files). The first set already includes the redesigned showcases. It uses Calm, while the candidate loads Default. Review palette, borders, and shadows in that context. [Initial captures](https://github.com/zprue743/ghostvue/tree/ab1bf5f03588f46c47712aefa8eb261291ba78bb/tests/e2e/docs-showcase-visual.spec.ts-snapshots) · [Candidate captures](https://github.com/zprue743/ghostvue/tree/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/tests/e2e/docs-showcase-visual.spec.ts-snapshots) · [Palette history](https://github.com/zprue743/ghostvue/pull/376)

Compare the ten default or closed previews at 390px and 1280px in light and dark. Review the five open overlays at the same widths and appearances, the Button source at 320px, the Tabs source at 768px, and the Table preview resized to 480px. Compare each closed example against its clean Default/comfortable consumer fixture in light and dark. The different host canvas and width can change wrapping. [Consumer captures](https://github.com/zprue743/ghostvue/tree/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/tests/e2e/examples-visual.spec.ts-snapshots)

The candidate also includes the Billing &amp; Invoices composition added in #405. Its light and dark captures are supplemental to the ten-showcase rubric. [Billing &amp; Invoices captures](https://github.com/zprue743/ghostvue/tree/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/tests/e2e/docs-showcases.spec.ts-snapshots)

## Showcase review

Use the seven criteria in the [showcase review rubric](./examples.md#review-a-showcase) for every row. The review prompts identify important states to check alongside each example's complete rubric.

| Showcase                                                       | Canonical example                                                                                                                                                        | Review prompt                                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| [Button](https://ghostvue.dev/components/button)               | [`button/action-bar`](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/examples/button/action-bar.vue)                                 | The publish action leads. The pending state and the destructive action remain distinguishable at phone width.   |
| [Input](https://ghostvue.dev/components/input)                 | [`input/account-details`](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/examples/input/account-details.vue)                         | Error text remains associated with the work email, and readonly and disabled fields look distinct.              |
| [Dialog](https://ghostvue.dev/components/dialog)               | [`dialog/edit-profile`](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/examples/dialog/edit-profile.vue)                             | The editor fits or scrolls at phone width. Initial focus, Escape, and save or cancel return are visible.        |
| [Table](https://ghostvue.dev/components/table)                 | [`table/team-directory`](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/examples/table/team-directory.vue)                           | The filter and status badges stay readable. Keyboard users can reach the scroll region and row actions.         |
| [Dropdown Menu](https://ghostvue.dev/components/dropdown-menu) | [`dropdown-menu/record-actions`](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/examples/dropdown-menu/record-actions.vue)           | The active row action is visible, and Archive reads as destructive. Check the dark opening and settled states.  |
| [Select](https://ghostvue.dev/components/select)               | [`select/billing-preferences`](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/examples/select/billing-preferences.vue)               | The long delivery value truncates in the trigger and wraps in the options. Disabled options remain clear.       |
| [Combobox](https://ghostvue.dev/components/combobox)           | [`combobox/assignee-search`](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/examples/combobox/assignee-search.vue)                   | Suggestions, active option, loading, no results, offline error, and selected assignee are distinguishable.      |
| [Checkbox](https://ghostvue.dev/components/checkbox)           | [`checkbox/notification-preferences`](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/examples/checkbox/notification-preferences.vue) | The mixed parent, locked option, and explanatory text remain legible at narrow and enlarged text sizes.         |
| [Tabs](https://ghostvue.dev/components/tabs)                   | [`tabs/workspace`](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/examples/tabs/workspace.vue)                                       | Focus and selection stay distinct. German labels wrap and Arabic arrow navigation follows direction.            |
| [Popover](https://ghostvue.dev/components/popover)             | [`popover/share-settings`](https://github.com/zprue743/ghostvue/pull/406/files)                                                                                          | The open panel stays readable and reachable. Check dismissal and where focus lands after Done, Escape, and Tab. |

At desktop width, the captures show clearer separation between the docs controls and the preview, with the hierarchy and task content carried through to the consumer examples. At phone width, the action bar wraps, the forms stack, and the table keeps its horizontal scroll region. The open overlays show different surfaces and visible focus in both appearances. The centered Select list is narrower than the trigger in both captured sets. Compare the revised Share panel against the clean consumer fixture and check that the themed panel typography fits the surrounding docs.

## Accessibility and open decisions

The [focused browser coverage](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/tests/e2e/docs-showcase-focus.spec.ts) covers visible focus, its area and contrast, reduced motion, forced colors, and 200% text. The [theme switcher coverage](https://github.com/zprue743/ghostvue/blob/fb91bd3e7ac88fcf4305dc69206f5fcccc6b8507/tests/e2e/docs-theme-switcher.spec.ts) exercises Default, Calm, Editorial, and Playful. The accessibility reviewer should exercise the switcher and Combobox with a screen reader and walk through an overlay with the keyboard in forced colors or an OS high-contrast mode. For Share, Tab from Done continues into the page, Shift+Tab from the first option returns to Share, and Escape closes the panel and restores focus.

| Observation                                                                                                                                                                                                                                                 | Proposed owner                         | Disposition for review                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| In the dark Dropdown Menu, Archive measured 4.13:1 at 60 ms of the 120 ms opening fade, below the 4.5:1 text target. Axe passed at 84 ms and 108 ms, and at rest, on keyboard focus, and on hover. It also passed those settled checks with reduced motion. | Docs UI and the accessibility reviewer | Confirm the severity, owner, and disposition before sign-off. A high-severity finding requires a fix and fresh evidence. |

A Chromium spot check at 200% root text size found no preview overflow or intersecting controls in Tabs and Checkbox at 390px and 768px. The 390px check supplements the committed adaptive coverage.

## Verification

- The pinned Linux visual suite passed all 40 focused tests on `fb91bd3e`, including the ten visual showcases, overlays and source states, and both consumer hosts. It ran with snapshot updates disabled.
- Hosted master CI passed the static, unit, build, integration, and browser jobs on the captured revision. [Master CI](https://github.com/zprue743/ghostvue/actions/runs/46046613785)
- The focused Windows browser suite passed 143 of 147 tests on both the standards branch and clean master at `fb91bd3e`. The same four Chromium assertions failed in both runs, covering Dialog and Dropdown Menu geometry, Dropdown Menu open contrast, and Popover panel placement.
- After the Share change, all 17 focused browser checks and three Share example integration tests passed. The page-order regression ran in Chromium, Firefox, and WebKit. The Share suite also checks dismissal, placement in both reading directions, focus indicators in light, dark, and forced colors, and 200% text.
- #311 records a historical Windows negative-type-test error, `spawnSync pnpm ENOENT`. See the PR for the current `pnpm verify` result and the clean master comparison. [Issue record](https://github.com/zprue743/ghostvue/issues/311)

## Sign-off

- [ ] Design reviewer records a 2 for every applicable criterion on the ten showcases, with evidence and a reason for each inapplicable criterion.
- [ ] Accessibility reviewer records keyboard and screen-reader results and the checks for high contrast, focus order, and open overlays.
- [ ] Confirm the owner and disposition of each remaining defect. Resolve any high-severity defect and review the new evidence before approval.
- [ ] Approve and merge the contribution standards. Record the named reviewers and their approval in #311 so it can close.

The [release-candidate gate in #335](https://github.com/zprue743/ghostvue/issues/335) follows #311 and has its own release dry run, live schema checks, and sign-off.
