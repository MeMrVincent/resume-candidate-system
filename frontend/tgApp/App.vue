<template>
  <el-config-provider :locale="elementLocale">
    <router-view />
  </el-config-provider>
</template>

<script>
import { watch, computed, defineComponent, getCurrentInstance } from 'vue';
import { Theme } from '@/shared/css/theme/tg';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import en from 'element-plus/es/locale/lang/en';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { ElConfigProvider } from 'element-plus';

export default defineComponent({
  name: 'App',
  components: { ElConfigProvider },
  setup() {
    const { locale, setLocaleMessage, getLocaleMessage } = useI18n(); // get current language
    const route = useRoute();
    const { proxy } = getCurrentInstance();

    /** In many scenarios, we don't need to load the entire language pack on the first screen;
     * we only need to load the key parts.
     * By default, the language pack is packaged into the dist file,
     * increasing the size of the package and the client's loading time.
     * So we need to load separately or asynchronously.
     * **/
    (async () => {
      let item, key, current, list = proxy.$AppEnv.lanKeys;
      for (let i = 0; i < list.length; i++) {
        key = list[i];
        item = await proxy.$API.getParamJSON(key);
        item.timeStamp = new Date().valueOf();
        current = { ...getLocaleMessage(key) }; // to get default language package
        setLocaleMessage(key, { ...current, ...item }); // to merge language packages
      }
      item = 'light';
      const theme = Theme[item];
      for (let [key, value] of Object.entries(theme)) {
        document.documentElement.style.setProperty(key, value);
      }
    })();

    const elementLocale = computed( () => {
      let lan = locale.value;
      //setOptions({ language: lan === 'en-us' ? 'en':'zh' });
      return lan === 'zh-cn' ? zhCn : en;
    });

    watch(route, async (newVal) => {
      console.log('route', newVal);
    });

    return { elementLocale };
  },
});
</script>
