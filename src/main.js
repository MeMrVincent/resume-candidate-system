import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import ElementPlus from 'element-plus';
import store from '@/stores';
import i18n from '@/i18n';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/el-loading.css';
import 'element-plus/theme-chalk/el-message.css';
import 'element-plus/theme-chalk/el-notification.css';
import 'element-plus/theme-chalk/el-message-box.css';

import { $info } from '@/utils/$info';
import { AppEnv } from '@/utils/AppEnv';
import { $API } from '@/http/Api';

const app = createApp(App);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.config.globalProperties.$info = $info;
app.config.globalProperties.$AppEnv = AppEnv;
app.config.globalProperties.$API = $API;

app.use(ElementPlus);
app.use(router);
app.use(store);
app.use(i18n);

app.mount('#app');
