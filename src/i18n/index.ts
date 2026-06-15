import { createI18n } from 'vue-i18n';
// 语言包整包复用 Vue2 版本（src/i18n/zh_CN.js / en_US.js），保持键名一致以便页面平迁
import zhCn from '@/locales/zh_CN';
import enUs from '@/locales/en_US';

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('lang') || 'zh_CN',
  fallbackLocale: 'zh_CN',
  // 老语言包存在少量占位符格式差异，关闭编译告警噪音
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    zh_CN: zhCn,
    en_US: enUs,
  },
});

export default i18n;
