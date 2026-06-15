import 'vue-router';
import type { Component } from 'vue';

declare module 'vue-router' {
  interface RouteMeta {
    /** i18n key，用于菜单/面包屑/document.title */
    title?: string;
    /** 菜单图标组件 */
    icon?: Component;
    /** 不在侧边菜单中展示 */
    hidden?: boolean;
  }
}
