# GhostVue pickup scenarios

Synthetic snapshot v1 models the public nested-menu work in [#413](https://github.com/zprue743/ghostvue/issues/413), [#418](https://github.com/zprue743/ghostvue/issues/418), and [#419](https://github.com/zprue743/ghostvue/issues/419). Use the supplied evidence as the entire environment. Describe proposed actions in text. Simulate commands and state changes locally. Leave GitHub and Git untouched.

## Shared snapshot

Default-branch policy is in report mode with active release `0.2.0`. All three issues are open, triaged, and unassigned. Each has a Todo card targeting `0.2.0`. No linked PRs, holds, ownership markers, or native blocking dependencies exist. The shared submenu contract is awaiting drafting and human approval.

| Issue | Deliverable                           | Legacy issue-body dependencies | Also labeled `agent:ready` |
| ----- | ------------------------------------- | ------------------------------ | -------------------------- |
| #413  | Draft the shared submenu spec         | None                           | Yes                        |
| #418  | Implement the first DropdownMenu host | Blocked by: #413               | Yes                        |
| #419  | Extend the other approved menu hosts  | Blocked by: #413, #418         | No                         |

## Prompts

Treat each case independently and reset to the shared snapshot before applying its overrides.

1. What nested-menu issue can I work on? Give the reason for each candidate and the next action.
2. Same request, but the project API denied board access. Only issue bodies and labels are readable.
3. Start #413 in the shared snapshot.
4. Start #413 with policy mode changed to enforce. The simulated claim run for this issue completes successfully and records our ownership.
5. Start #413 in enforce mode. Claim dispatch times out. The run is still pending and the issue timeline has no confirmed claimant.
