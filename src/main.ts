import { createApp } from 'vue';
import TDesign from 'tdesign-vue-next';
import 'tdesign-vue-next/es/style/index.css';
import './style/global.css';

import App from './App.vue';
import router from './router';
import pinia from './store';
import i18n from './i18n';
import './permission';

createApp(App).use(TDesign).use(pinia).use(router).use(i18n).mount('#app');
