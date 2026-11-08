import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    component: () => import('@/pages/layout/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/dashboard/index.vue'),
      },
      {
        path: 'candidate',
        name: 'CandidateList',
        component: () => import('@/pages/candidate/CandidateList.vue'),
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
