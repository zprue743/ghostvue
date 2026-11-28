---
name: ghostvue-pick-up-issue
description: Recommend an eligible GhostVue issue, explain what blocks a candidate, or start a named issue under the current release and ownership policy.
---

# Pick up a GhostVue issue

## Find eligible work

Read `.github/release-scope.json` **on the default branch** for the current mode and active release. Use the [contribution workflow](../../../docs/contributing/workflow.md#release-routing-and-branching) for routing. From a current checkout, `node scripts/release-scope.mjs report` gives a read-only queue preview. Its “add” and “remove” entries are proposed label changes. For a named issue, inspect its evidence directly even if it is absent from the report.

Match the open issue to its card on the [execution board](https://github.com/users/zprue743/projects/5/views/3). Check the exact target release and Todo status, triage, holds (`blocked`, `deferred`, `human-required`), assignees, and work in progress. Check open PRs for closing links, `Work item #N` lines, and issue-numbered branches. Resolve native blocking dependencies and each legacy `Blocked by:` reference against the current issue state. A stale `agent:ready` label can survive changes to any of these facts.

Check approval for the **requested deliverable**. An issue to draft a spec can be eligible while implementation awaits the approved contract. For production component work, use the [component gate](../../../docs/agents/COMPONENT_WORKFLOW.md). If the board or policy cannot be read, report eligibility as unknown and identify the missing evidence. An issue body naming a release cannot establish its board assignment.

## Recommend or start

For “what can I work on?” or an eligibility check, keep the entire operation read-only. Recommend the highest-priority eligible candidate within the requested scope. Cite the issue and decisive board, dependency, or PR evidence. For blocked candidates, name the open blocker numbers and what would unblock the work. End with the next available action. Leave claims, ownership, labels, and branches untouched.

For an explicit start request, recheck the selected issue immediately before taking it:

- **Report mode:** Follow the [report-mode pickup rules](../../../docs/contributing/workflow.md#release-routing-and-branching). Legacy automatic pickup uses the readiness signal and rechecks the live facts. For a maintainer-directed start, verify the same release, scope, holds, and ownership. Report mode denies workflow claims.
- **Enforcement mode:** An eligible issue must also carry `agent:ready` for the claim. Run `node scripts/release-scope.mjs claim <issue-number>` and wait for that specific workflow run to succeed before creating a branch or starting a spec. If the claim is denied, cancelled, or times out, inspect the run and issue timeline for the claimant and any partial ownership change. Report the result and resume only with confirmed ownership from a successful claim. An ambiguous dispatch is unsafe to repeat.
- **Branch routing:** Active-release work starts from current `master`. Future-release and unassigned work stays out of pickup. Maintenance work requires a maintainer-selected patch and follows the maintenance branch and tagged base in the [release runbook](../../../docs/contributing/releases.md#release-operation). Give the selected issue, verified ownership or start basis, and branch base.
