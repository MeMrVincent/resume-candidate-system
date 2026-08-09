import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// pinia persist
const store = createPinia();
store.use(piniaPluginPersistedstate);

export default store;
