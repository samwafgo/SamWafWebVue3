import { defineStore } from 'pinia';
import { COLOR_TOKEN } from '@/config/color';

/** 移动端断点（px），与 TDesign 响应式栅格 md 一致 */
export const MOBILE_BREAKPOINT = 768;

/** 与老项目一致的本地持久化键 */
const SETTING_STORAGE_KEY = 'samwaf_page_setting';

export type ThemeMode = 'light' | 'dark' | 'auto';

/** 页面配置默认值（对应老项目 src/config/style.ts 中本项目支持的部分） */
export const STYLE_CONFIG = {
  mode: 'light' as ThemeMode,
  brandTheme: 'DEFAULT',
  showBreadcrumb: true,
  showFooter: true,
};

function loadSavedSetting(): Partial<typeof STYLE_CONFIG> {
  try {
    const raw = localStorage.getItem(SETTING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const useSettingStore = defineStore('setting', {
  state: () => ({
    /** PC 端侧边栏是否折叠为窄条 */
    isSidebarCompact: false,
    /** 当前是否为移动端视口 */
    isMobile: false,
    /** 移动端侧边菜单抽屉是否打开 */
    sidebarDrawerVisible: false,
    /** 页面配置抽屉是否打开 */
    showSettingPanel: false,
    ...STYLE_CONFIG,
    ...loadSavedSetting(),
  }),
  getters: {
    /** 实际生效的明暗模式（auto 跟随系统） */
    displayMode(state): 'light' | 'dark' {
      if (state.mode === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return state.mode;
    },
  },
  actions: {
    /** 头部菜单按钮：移动端开关抽屉，PC 端折叠/展开侧边栏 */
    toggleSidebar() {
      if (this.isMobile) {
        this.sidebarDrawerVisible = !this.sidebarDrawerVisible;
      } else {
        this.isSidebarCompact = !this.isSidebarCompact;
      }
    },
    /** 根据窗口宽度刷新移动端标记（layouts/index.vue 监听 resize 时调用） */
    updateIsMobile() {
      this.isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      if (!this.isMobile) {
        this.sidebarDrawerVisible = false;
      }
    },
    /** 应用并保存页面配置（页面配置面板调用） */
    updateConfig(payload: Partial<typeof STYLE_CONFIG>) {
      Object.assign(this, payload);
      if (payload.mode !== undefined) this.applyMode();
      if (payload.brandTheme !== undefined) this.applyBrandTheme();
      this.saveToStorage();
    },
    /** 恢复默认配置并清空本地保存 */
    resetConfig() {
      Object.assign(this, STYLE_CONFIG);
      try {
        localStorage.removeItem(SETTING_STORAGE_KEY);
      } catch {
        // ignore
      }
      this.applyMode();
      this.applyBrandTheme();
    },
    /** 启动时调用：把已保存的配置应用到文档 */
    initTheme() {
      this.applyMode();
      this.applyBrandTheme();
    },
    applyMode() {
      document.documentElement.setAttribute('theme-mode', this.displayMode === 'dark' ? 'dark' : '');
    },
    applyBrandTheme() {
      const tokens = COLOR_TOKEN[this.brandTheme] || COLOR_TOKEN.DEFAULT;
      for (const [key, value] of Object.entries(tokens)) {
        document.documentElement.style.setProperty(key, value);
      }
    },
    saveToStorage() {
      try {
        const toSave: Record<string, unknown> = {};
        for (const key of Object.keys(STYLE_CONFIG)) {
          toSave[key] = this[key as keyof typeof STYLE_CONFIG];
        }
        localStorage.setItem(SETTING_STORAGE_KEY, JSON.stringify(toSave));
      } catch {
        // ignore
      }
    },
  },
});
