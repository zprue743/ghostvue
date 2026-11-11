# Versioning and releases

Changesets records consumer-visible package changes and drives semantic versions
and changelogs. Add a Changeset with `pnpm changeset`, select affected publishable
packages, choose patch/minor/major impact, and write a consumer-focused summary.

Internal refactors, tests, and documentation that do not affect a package release
usually need no Changeset. Pre-1.0 versions still require explicit compatibility
judgment; zero-major status is not permission for surprise breakage.

Release automation is intentionally not enabled while the library is
pre-release.
Packages remain private and nothing in CI publishes artifacts. Before the first
release, maintainers must review package names/ownership, provenance, registry
access, changelog policy, support matrix, and a least-privilege publication
workflow. No agent may publish packages or create releases without explicit
authorization.
