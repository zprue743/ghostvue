---
'@ghostvue/core': minor
'@ghostvue/vue': patch
---

Add an optional `spec` reference (`{ path, status: 'approved', evidence? }`) to the component manifest schema. Generated `@ghostvue/vue` manifests now carry it only for components whose specification frontmatter is `specStatus: approved` with `approval.evidence`; spec approval is separate from the manifest's stability `status`.
