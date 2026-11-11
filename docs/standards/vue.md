# Vue standard

Write idiomatic Vue 3. Prefer Composition API and `<script setup lang="ts">`
when they make the component contract clear.

- Type public props, emits, slots, and exposed methods explicitly.
- Use computed state before introducing a watcher.
- Public component behavior belongs in a `useSl*` composable with a thin
  unstyled `Sl*` component as the ordinary call site. Do not invent extra
  composables beyond that contract.
- Avoid unnecessary global state, hidden side effects, and provide/inject when a
  direct prop or local composition is simpler.
- Do not mutate consumer-owned objects unless the public contract explicitly
  requires and documents it.
- Respect Vue reactivity; do not clone entire datasets merely to regain control.
- Clean up observers, timers, listeners, and effects deterministically.
- Preserve SSR compatibility where practical. Guard browser globals and reason
  about hydration when initial markup can differ.
- Keep native Vue slots and rendering APIs available as advanced escape hatches.

Do not recreate another framework, dependency-injection container, or proprietary
reactivity layer inside Vue. Put behavior in `core` only when it is genuinely
meaningful without Vue semantics.
