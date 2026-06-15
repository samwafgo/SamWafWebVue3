<template>
  <t-menu
    :theme="settingStore.displayMode"
    height="100%"
    :collapsed="collapsed"
    :value="activeMenu"
    class="side-nav-menu"
    @change="onMenuChange"
  >
    <template #logo>
      <span class="side-nav-logo-wrapper" @click="router.push('/dashboard/base')">
        <img :src="collapsed ? logoSmall : logoFull" :class="['side-nav-logo', { 'side-nav-logo--dark': settingStore.displayMode === 'dark' }]" alt="SamWaf" />
      </span>
    </template>
    <menu-content :nav-data="menuRoutes" />
    <template #operations>
      <span v-if="versionInfo.version" class="version-container">
        {{ versionInfo.version_name }}({{ versionInfo.version }})
        <span v-if="versionInfo.version_release === 'false'" style="color: red">{{ t('common.debug') }}</span>
      </span>
    </template>
  </t-menu>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { MenuValue } from 'tdesign-vue-next';
import { routes } from '@/router';
import { useSettingStore } from '@/store/modules/setting';
import { SysVersionApi } from '@/apis/sysinfo';
import logoFull from '@/assets/assets-logo-full.svg';
import logoSmall from '@/assets/assets-t-logo.svg';
import MenuContent from './MenuContent.vue';

withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false });

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const settingStore = useSettingStore();

// 侧边菜单数据来源：根布局路由（path: '/'）的 children
const menuRoutes = computed(() => routes.find((r) => r.path === '/')?.children ?? []);

const activeMenu = computed(() => route.path);

/** 左下角版本信息（对应老项目 version store） */
const versionInfo = ref<{ version: string; version_name: string; version_release: string }>({
  version: '',
  version_name: '',
  version_release: '',
});

onMounted(() => {
  SysVersionApi()
    .then((res) => {
      if (res.code === 0) {
        versionInfo.value = res.data;
      }
    })
    .catch(() => {});
});

function onMenuChange(value: MenuValue) {
  router.push(String(value));
}
</script>

<style scoped>
.side-nav-logo-wrapper {
  display: inline-flex;
  align-items: center;
  height: 100%;
  cursor: pointer;
}

.side-nav-logo {
  max-width: 100%;
  height: 26px;
}

/* 黑色字 logo 在暗色菜单下反色显示 */
.side-nav-logo--dark {
  filter: invert(1) hue-rotate(180deg);
}

.version-container {
  display: inline-block;
  width: 100%;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
