// index.js

import { createI18n } from 'vue-i18n';
import { AppEnv } from '@utils/AppEnv';
import zhCN from './zh-cn.json'
import enUS from './en-us.json'

const lanKeys = AppEnv.lanKeys;
const messages = {
  'en-us': enUS,
  'zh-cn': zhCN,
};

export const getLocale = () => {

  let item;
  /**
  for(let i=0;i<lanKeys.length;i++){
    messages[lanKeys[i]] = { };
  }**/
  item = lanKeys[0];

  const storeLanguage = localStorage.getItem('language');
  if (storeLanguage) {
    return storeLanguage;
  }

  const browserLan = (navigator.language || navigator.browserLanguage).toLowerCase();
  for (const lan of lanKeys) {
    if (browserLan.includes(lan)) {
      localStorage.setItem('language', lan);
      return lan;
    }
  }

  localStorage.setItem('language', item);
  return item;
}

const i18n = createI18n({
  globalInjection: true,
  legacy: false,
  locale: getLocale(),
  messages: messages,
});

export default i18n;
