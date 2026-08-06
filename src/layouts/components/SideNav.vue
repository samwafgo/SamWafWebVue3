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
      <!-- 版本号即“系统信息”入口：做成带图标的可点击块，避免用户看不出来能点 -->
      <t-tooltip placement="top" :content="t('common.system_info.tooltip')">
        <div v-if="versionInfo.version" class="version-entry" @click="sysinfoVisible = true">
          <device-icon class="version-entry-icon" />
          <span v-if="!collapsed" class="version-entry-text">
            {{ versionInfo.version_name }}({{ versionInfo.version }})
            <span v-if="versionInfo.version_release === 'false'" style="color: red">{{ t('common.debug') }}</span>
          </span>
        </div>
      </t-tooltip>
      <!-- 点击版本号查看系统信息与在线交流渠道 -->
      <system-info-dialog v-model:visible="sysinfoVisible" />
    </template>
  </t-menu>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { MenuValue } from 'tdesign-vue-next';
import { DeviceIcon } from 'tdesign-icons-vue-next';
import { routes } from '@/router';
import { useSettingStore } from '@/store/modules/setting';
import { SysVersionApi } from '@/apis/sysinfo';
import logoFull from '@/assets/assets-logo-full.svg';
import logoSmall from '@/assets/assets-t-logo.svg';
import MenuContent from './MenuContent.vue';
import SystemInfoDialog from './SystemInfoDialog.vue';

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

/** 系统信息弹窗 */
const sysinfoVisible = ref(false);

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

/* 左下角版本号 = 系统信息入口，需要看起来可点 */
.version-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 8px;
  border-radius: var(--td-radius-default);
  color: var(--td-brand-color);
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.version-entry:hover {
  background-color: var(--td-brand-color-light);
}

.version-entry-icon {
  flex: 0 0 auto;
  font-size: 16px;
}

.version-entry-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
