import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import i18n, { setupI18n } from "@/i18n";
import { $API } from "@/http/Api";

import "element-plus/theme-chalk/el-loading.css";
import "element-plus/theme-chalk/el-message.css";
import "element-plus/theme-chalk/el-notification.css";
import "element-plus/theme-chalk/el-message-box.css";

/**
 * 启动流程：先加载当前语言的系统必需包，再挂载应用（模块包随路由按需加载）
 * Startup flow: load the required system pack of the current language first, then mount the app (module packs are loaded on demand with the routes)
 * 起動の流れ：まず現在の言語のシステム必須パックを読み込み、その後アプリをマウントする（モジュールパックはルートに応じてオンデマンドで読み込む）
 */
async function bootstrapApplication() {
  await setupI18n();

  const app = createApp(App);
  for (const [iconName, iconComponent] of Object.entries(ElementPlusIconsVue)) {
    app.component(iconName, iconComponent);
  }
  // 页面里用 proxy.$API.xxx()
  // Pages call proxy.$API.xxx()
  // ページでは proxy.$API.xxx() を使う
  app.config.globalProperties.$API = $API;
  app.use(ElementPlus);
  app.use(router);
  app.use(i18n);
  app.mount("#app");
}

bootstrapApplication();
