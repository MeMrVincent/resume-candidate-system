import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import ElementPlus from 'element-plus';
import store from '@/stores';
import i18n from '@/i18n';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import 'element-plus/theme-chalk/el-loading.css';
import 'element-plus/theme-chalk/el-message.css';
import 'element-plus/theme-chalk/el-notification.css';
import 'element-plus/theme-chalk/el-message-box.css';

import { $info } from '@utils/$info';
import { AppEnv } from '@utils/AppEnv';
import { $API } from '@/http/Api';
import { TonConnectUIPlugin, THEME } from '@townsquarelabs/ui-vue';

const options = {
  manifestUrl: 'https://dns.ton.org/tonconnect-manifest.json',
  uiPreferences: { theme: THEME.DARK },
  walletsListConfiguration: {
    includeWallets: [{
      appName: 'safepalwallet',
      name: 'SafePal',
      imageUrl: 'https://s.pvcliping.com/web/public_image/SafePal_x288.png',
      tondns: '',
      aboutUrl: 'https://www.safepal.com',
      universalLink: 'https://link.safepal.io/ton-connect',
      jsBridgeKey: 'safepalwallet',
      bridgeUrl: 'https://ton-bridge.safepal.com/tonbridge/v1/bridge',
      platforms: ['ios', 'android', 'chrome', 'firefox'],
    },
    {
      appName: 'tonwallet',
      name: 'TON Wallet',
      imageUrl: 'https://wallet.ton.org/assets/ui/qr-logo.png',
      aboutUrl: 'https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd',
      universalLink: 'https://wallet.ton.org/ton-connect',
      jsBridgeKey: 'tonwallet',
      bridgeUrl: 'https://bridge.tonapi.io/bridge',
      platforms: ['chrome', 'android'],
    }],
  },
  actionsConfiguration: {
    twaReturnUrl: 'https://t.me/OpenADProtocolBot/bf20',
  },
};

const app = createApp(App);
for ( const [ key, component ] of Object.entries( ElementPlusIconsVue ) ) {
  app.component( key, component ); // 注册图标
}
// 必须使用 nextTick，不然会有加载顺序问题，导致绑定失败
app.config.globalProperties.$info = $info;
app.config.globalProperties.$AppEnv = AppEnv;
app.config.globalProperties.$API = $API;
app.use(ElementPlus);
app.use(router);
app.use(store);
app.use(i18n)
app.use(TonConnectUIPlugin , options);
app.mount('#app');
