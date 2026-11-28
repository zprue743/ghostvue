<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostScrollSpy,
  GhostScrollSpyItem,
  GhostScrollSpyLink,
  GhostScrollSpyList,
} from '@ghostvue/themes'

interface ArticleSection {
  id: string
  title: string
  paragraphs: string[]
}

const sections: ArticleSection[] = [
  {
    id: 'rollout-plan',
    title: 'Plan the rollout',
    paragraphs: [
      'Write down who gets the feature first, which metric proves it works, and the number that would make you roll back.',
      'Agree on an owner for each stage so nobody waits for a sign-off that was never assigned.',
    ],
  },
  {
    id: 'rollout-flag',
    title: 'Ship behind a flag',
    paragraphs: [
      'Merge the code with the flag off. The release goes out like any other deploy, and nothing changes for customers yet.',
      'Turn the flag on for your own team first and use the feature for a day.',
    ],
  },
  {
    id: 'rollout-ramp',
    title: 'Ramp up traffic',
    paragraphs: [
      'Raise exposure in steps: 1%, 10%, 50%, then everyone. Hold each step long enough to see a full day of traffic.',
      'Pause the ramp, rather than pushing through, when a step looks worse than the one before it.',
    ],
  },
  {
    id: 'rollout-metrics',
    title: 'Watch the metrics',
    paragraphs: [
      'Compare error rates and latency between the flagged and unflagged groups, not against last week.',
      'If the rollback number from your plan is crossed, turn the flag off first and investigate second.',
    ],
  },
  {
    id: 'rollout-cleanup',
    title: 'Clean up the flag',
    paragraphs: [
      'Once everyone has had the feature for a full release cycle, delete the flag and the old code path in one change.',
    ],
  },
]

// The article scrolls inside its own panel, so the rail tracks this element
// instead of the window. Until the ref resolves the spy falls back to the
// window, then follows the panel once it mounts.
const article = ref<HTMLElement | null>(null)
</script>

<template>
  <div class="article-reader">
    <!--
      A pixel probe offset (values above 1) puts the reading line 64px below
      the top of the panel, just under the heading a link jump lands on.
      `vp-raw` keeps the VitePress router from handling the fragment links.
    -->
    <GhostScrollSpy
      label="Article sections"
      :container="article"
      :probe-offset="64"
      class="article-reader__rail vp-raw"
    >
      <GhostScrollSpyList>
        <GhostScrollSpyItem v-for="section in sections" :key="section.id">
          <GhostScrollSpyLink :target="section.id">
            {{ section.title }}
          </GhostScrollSpyLink>
        </GhostScrollSpyItem>
      </GhostScrollSpyList>
    </GhostScrollSpy>

    <!--
      A scrollable region needs a name and a Tab stop so keyboard users can
      scroll it with the arrow keys.
    -->
    <div
      ref="article"
      class="article-reader__scroller"
      role="region"
      aria-label="Roll out a feature flag"
      tabindex="0"
    >
      <article class="article-reader__article">
        <h2 class="article-reader__title">Roll out a feature flag</h2>
        <!-- tabindex="-1" lets link activation move focus into the section. -->
        <section
          v-for="section in sections"
          :id="section.id"
          :key="section.id"
          tabindex="-1"
          class="article-reader__section"
        >
          <h3 class="article-reader__heading">{{ section.title }}</h3>
          <p
            v-for="paragraph in section.paragraphs"
            :key="paragraph"
            class="article-reader__copy"
          >
            {{ paragraph }}
          </p>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* Phones stack the rail above the article, so every link stays on screen. */
.article-reader {
  --article-reader-panel-size: 20rem;

  display: grid;
  gap: var(--ghost-space-stack-md);
}

.article-reader__rail {
  align-self: start;
}

.article-reader__scroller {
  box-sizing: border-box;
  block-size: var(--article-reader-panel-size);
  overflow-y: auto;
  padding: var(--ghost-space-inset-sm);
  border: var(--ghost-border-hairline-width) solid var(--ghost-border-default);
  border-radius: var(--ghost-radius-md);
  /* Land section headings a little below the panel edge after a jump. */
  scroll-padding-block-start: var(--ghost-space-inset-sm);
}

.article-reader__scroller:focus-visible,
.article-reader__section:focus-visible {
  outline: var(--ghost-focus-ring-width) solid var(--ghost-focus-ring-color);
  outline-offset: 2px;
}

.article-reader__article {
  display: grid;
  gap: var(--ghost-space-stack-lg);
}

.article-reader__title {
  margin: 0;
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.article-reader__section {
  display: grid;
  gap: var(--ghost-space-gap-sm);
  border-radius: var(--ghost-radius-sm);
}

/*
 * Give the last section a full panel of height, so a link jump can bring any
 * section to the top of the panel. Without it, the panel stops at its end
 * before the later sections reach the reading line, and the rail would mark
 * the last section instead of the one the reader chose.
 */
.article-reader__section:last-child {
  min-block-size: calc(
    var(--article-reader-panel-size) - 2 * var(--ghost-space-inset-sm) - 2 *
      var(--ghost-border-hairline-width)
  );
  align-content: start;
}

.article-reader__heading {
  margin: 0;
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.article-reader__copy {
  margin: 0;
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

/* Wider previews put the rail beside the article, sized to its longest link. */
@container ghost-demo (min-width: 34rem) {
  .article-reader {
    --article-reader-panel-size: 22rem;

    grid-template-columns: max-content minmax(0, 1fr);
  }
}
</style>
