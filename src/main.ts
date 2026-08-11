import { createApp } from 'vue';
import TDesign from 'tdesign-vue-next';
import 'tdesign-vue-next/es/style/index.css';
import './style/global.css';

import App from './App.vue';
// 页面顶部的功能说明区：说明短了原地折叠、长了自动进右侧抽屉，全站统一入口
import HelpBlock from './components/help-block/index.vue';
// IP 归属查询：封禁源分散在七八个页面，这个组件一次查完
import IpLookup from './components/ip-lookup/index.vue';
import router from './router';
import pinia from './store';
import i18n from './i18n';
import './permission';
import { setupDialogOverlayGuard } from './utils/dialogOverlayGuard';

setupDialogOverlayGuard();

createApp(App)
  .use(TDesign)
  .use(pinia)
  .use(router)
  .use(i18n)
  .component('help-block', HelpBlock)
  .component('ip-lookup', IpLookup)
  .mount('#app');
