import { createRouter, createWebHashHistory } from "vue-router";
import { ensureModulePacksLoaded } from "@/i18n";

/**
 * 路由。meta.i18nPacks 声明该页面用到的“模块语言包”，进入页面前按当前语言异步加载（core 包启动时已加载）。
 * Routes. meta.i18nPacks declares the "module language packs" a page uses; they are loaded asynchronously in the current language before entering the page (the core pack is already loaded at startup).
 * ルート。meta.i18nPacks はページが使う「モジュール言語パック」を宣言し、ページに入る前に現在の言語で非同期に読み込む（core パックは起動時に読み込み済み）。
 */
const routes = [
  {
    path: "/",
    component: () => import("@/pages/layout/index.vue"),
    redirect: "/company",
    children: [
      {
        path: "company",
        name: "CompanyList",
        component: () => import("@/pages/company/list.vue"),
        meta: { i18nPacks: ["company"] }
      },
      {
        path: "company/:companyId",
        name: "CompanyDetail",
        component: () => import("@/pages/company/detail.vue"),
        meta: { i18nPacks: ["company"] }
      },
      {
        path: "candidate/import",
        name: "CandidateImport",
        component: () => import("@/pages/candidate/import.vue"),
        meta: { i18nPacks: ["candidateImport"] }
      }
    ]
  },
  { path: "/:pathMatch(.*)*", redirect: "/company" }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach(async to => {
  await ensureModulePacksLoaded(to.meta.i18nPacks || []);
});

export default router;
