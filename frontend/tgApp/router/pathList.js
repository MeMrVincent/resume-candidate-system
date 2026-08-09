/** template files **/

const pathList = [{ path: '/', redirect: '/home/index' },
  /**== menu list =========================================================================================**/
  {
    path: '/layout',
    name: 'LayoutIndex',
    component: () => import(/* webpackChunkName: "LayoutIndex" */ '@/pages/layout/index.vue'),
    redirect: '/home/index',
    children: [{
      path: '/home/index',
      name: 'HomeIndex',
      component: () => import(/* webpackChunkName: "HomeIndex" */ '@/pages/home/index.vue'),
      meta: { title: 'home' },
    },
    {
      path: '/json',
      name: 'json',
      component: () => import(/* webpackChunkName: "json" */ '@/pages/json/index.vue'),
      meta: { title: 'json' },
    },
    {
      path: '/wallet',
      name: 'wallet',
      component: () => import(/* webpackChunkName: "wallet" */ '@/pages/wallet/wallet.tg.vue'),
      meta: { title: 'wallet' },
    },
    {
      path: '/inject/404',
      name: 'Inject404',
      component: () => import(/* webpackChunkName: "Inject404" */ '@/pages/inject/404.vue'),
      meta: { title: '404' },
    }],
  },
  { path: '/:pathMatch(.*)', redirect: '/inject/404' }];

export default pathList;