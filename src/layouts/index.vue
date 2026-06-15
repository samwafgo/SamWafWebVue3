<template>
  <t-layout class="app-layout">
    <!-- PC：固定侧边栏（可折叠） -->
    <t-aside v-if="!settingStore.isMobile" :width="asideWidth" class="app-aside">
      <side-nav :collapsed="settingStore.isSidebarCompact" />
    </t-aside>

    <!-- 移动端：抽屉式侧边菜单 -->
    <t-drawer
      v-else
      v-model:visible="settingStore.sidebarDrawerVisible"
      placement="left"
      size="232px"
      :close-btn="false"
      :footer="false"
      :header="false"
      class="app-sidebar-drawer"
    >
      <side-nav :collapsed="false" />
    </t-drawer>

    <t-layout class="app-main">
      <t-header class="app-header" height="56px">
        <layout-header />
      </t-header>
      <t-content class="app-content">
        <breadcrumb v-if="settingStore.showBreadcrumb" />
        <router-view />
        <layout-footer v-if="settingStore.showFooter" />
      </t-content>
    </t-layout>

    <!-- AI 助手抽屉 + 悬浮入口 -->
    <ai-assistant />

    <!-- 页面配置抽屉 -->
    <setting-panel />
  </t-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSettingStore } from '@/store/modules/setting';
import SideNav from './components/SideNav.vue';
import LayoutHeader from './components/LayoutHeader.vue';
import Breadcrumb from './components/Breadcrumb.vue';
import AiAssistant from './components/AiAssistant.vue';
import LayoutFooter from './components/Footer.vue';
import SettingPanel from './setting.vue';

const route = useRoute();
const settingStore = useSettingStore();

const asideWidth = computed(() => (settingStore.isSidebarCompact ? '64px' : '232px'));

// 移动端点击菜单跳转后自动收起抽屉
watch(
  () => route.path,
  () => {
    if (settingStore.isMobile) {
      settingStore.sidebarDrawerVisible = false;
    }
  },
);

function onResize() {
  settingStore.updateIsMobile();
}

onMounted(() => {
  settingStore.updateIsMobile();
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-aside {
  transition: width 0.2s;
  border-right: 1px solid var(--td-component-stroke);
}

.app-main {
  height: 100vh;
  overflow: hidden;
}

.app-header {
  border-bottom: 1px solid var(--td-component-stroke);
  background: var(--td-bg-color-container);
}

.app-content {
  padding: 24px;
  overflow: auto;
  background: var(--td-bg-color-page);
}

@media (max-width: 768px) {
  .app-content {
    padding: 16px;
  }
}
</style>

<style>
/* 抽屉内菜单铺满，去掉默认内边距（drawer 渲染在 body 下，不能用 scoped） */
.app-sidebar-drawer .t-drawer__body {
  padding: 0;
  background: var(--td-bg-color-container);
}
</style>
