import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/pages/home/index.vue'),
  },
  {
    path: '/json',
    name: 'Json',
    component: () => import('@/pages/json/index.vue'),
  },
  {
    path: '/layout',
    name: 'Layout',
    component: () => import('@/pages/layout/index.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
