import { defineStore } from 'pinia';
import piniaPersistConfig from './piniaPersist';

export const lineStore = defineStore('Vue-Line-User', {
  state: () => ({
    userInfo: {
      'id': null,
      'username': '',
      'password': null,
      'type': '',
      'contact_name': null,
      'email_address': '',
      'language': null,
      'comments': null,
      'active': null,
      'date_created': '',
      'date_last_login': '',
      'email_updated': null,
      'balance': 0,
      'salt': null,
      'login_ip': null,
      'company_name': '',
      'locked_balance': 0,
      'available_balance': 0,
      'wallet_address': '',
    },
  }),
  getters: {},
  actions: {
    setUserInfo(userInfo) {
      this.userInfo = userInfo;
    },
  },
  persist: piniaPersistConfig('Vue-Line-User'),
});
