<script setup lang="ts">
import { generatedComponentCatalog } from '../.registries/docs-nav.catalog.generated'
</script>

<template>
  <div
    class="ghost-component-catalog"
    role="region"
    aria-label="Component catalog"
  >
    <p class="ghost-component-catalog__lede">
      Browse production components by category. Each page documents headless
      behavior, themed recipes, and executable examples.
    </p>
    <div class="ghost-component-catalog__grid">
      <section
        v-for="group in generatedComponentCatalog"
        :key="group.categoryKey"
        class="ghost-component-catalog__section"
        :aria-labelledby="`catalog-${group.categoryKey}`"
      >
        <h2
          :id="`catalog-${group.categoryKey}`"
          class="ghost-component-catalog__heading"
        >
          {{ group.category }}
        </h2>
        <ul class="ghost-component-catalog__cards">
          <li v-for="item in group.items" :key="item.link">
            <a class="ghost-component-catalog__card" :href="item.link">
              <span class="ghost-component-catalog__card-title">{{
                item.label
              }}</span>
              <span class="ghost-component-catalog__card-description">{{
                item.description
              }}</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
