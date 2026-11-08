import { createI18n } from 'vue-i18n';
import en from './en.json';
import zhCn from './zh-cn.json';
import ja from './ja.json';

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'zh-cn', name: 'Simplified Chinese (简体中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
];

const savedLocale = localStorage.getItem('language');
const defaultLocale = savedLocale && ['en', 'zh-cn', 'ja'].includes(savedLocale) ? savedLocale : 'en';

const i18n = createI18n({
  globalInjection: true,
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-cn': zhCn,
    ja,
  },
});

export default i18n;
