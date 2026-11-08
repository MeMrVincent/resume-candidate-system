<template>
  <el-config-provider :locale="elementLocale">
    <router-view />
  </el-config-provider>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import en from 'element-plus/es/locale/lang/en';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import ja from 'element-plus/es/locale/lang/ja';

const { locale } = useI18n();

const elementLocales = {
  en,
  'zh-cn': zhCn,
  ja,
};

const elementLocale = computed(() => elementLocales[locale.value] || en);
</script>

<style>
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
