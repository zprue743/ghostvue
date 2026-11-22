import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/ghost' },
    { path: '/ghost', component: () => import('./views/InvoiceGhost.vue') },
    { path: '/prime', component: () => import('./views/InvoicePrime.vue') },
    { path: '/perf/ghost', component: () => import('./views/PerfGhost.vue') },
    { path: '/perf/prime', component: () => import('./views/PerfPrime.vue') },
    {
      path: '/harness/:mode',
      component: () => import('./views/BehaviorHarness.vue'),
      props: (route) => ({ mode: route.params.mode }),
    },
  ],
})