<template>
  <t-drawer
    v-model:visible="showSettingPanel"
    size="408px"
    :footer="false"
    :header="t('page.right_setting.page_setting')"
    :close-btn="true"
    class="setting-drawer-container"
  >
    <div class="setting-container">
      <div class="setting-group-title">{{ t('page.right_setting.theme_mode') }}</div>
      <t-radio-group :value="settingStore.mode" @change="(v: any) => settingStore.updateConfig({ mode: v })">
        <div v-for="item in modeOptions" :key="item.type" class="setting-layout-drawer">
          <div>
            <t-radio-button :value="item.type">
              <img :src="item.icon" :alt="item.type" />
            </t-radio-button>
            <p style="text-align: center; margin-top: 8px">{{ item.text }}</p>
          </div>
        </div>
      </t-radio-group>

      <div class="setting-group-title">{{ t('page.right_setting.theme_color') }}</div>
      <t-radio-group :value="settingStore.brandTheme" @change="(v: any) => settingStore.updateConfig({ brandTheme: v })">
        <div v-for="item in COLOR_OPTIONS" :key="item.name" class="setting-layout-drawer">
          <t-radio-button :value="item.name" class="setting-layout-color-group">
            <span class="color-block" :style="{ background: item.color }" />
          </t-radio-button>
        </div>
      </t-radio-group>

      <div class="setting-group-title">{{ t('page.right_setting.element_switches') }}</div>
      <t-form label-align="left">
        <t-form-item :label="t('page.right_setting.show_breadcrumb')" name="showBreadcrumb">
          <t-switch :value="settingStore.showBreadcrumb" @change="(v: any) => settingStore.updateConfig({ showBreadcrumb: v })" />
        </t-form-item>
        <t-form-item :label="t('page.right_setting.show_footer')" name="showFooter">
          <t-switch :value="settingStore.showFooter" @change="(v: any) => settingStore.updateConfig({ showFooter: v })" />
        </t-form-item>
      </t-form>

      <div class="setting-footer">
        <t-button theme="default" variant="outline" @click="handleClearSettings">
          {{ t('page.right_setting.clear_settings') }}
        </t-button>
      </div>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import { useSettingStore } from '@/store/modules/setting';
import { COLOR_OPTIONS } from '@/config/color';
import settingLightIcon from '@/assets/assets-setting-light.svg';
import settingDarkIcon from '@/assets/assets-setting-dark.svg';
import settingAutoIcon from '@/assets/assets-setting-auto.svg';

const { t } = useI18n();
const settingStore = useSettingStore();

const modeOptions = computed(() => [
  { type: 'light', text: t('page.right_setting.theme_mode_color_light'), icon: settingLightIcon },
  { type: 'dark', text: t('page.right_setting.theme_mode_color_dark'), icon: settingDarkIcon },
  { type: 'auto', text: t('page.right_setting.theme_mode_color_auto'), icon: settingAutoIcon },
]);

const showSettingPanel = computed({
  get: () => settingStore.showSettingPanel,
  set: (v: boolean) => {
    settingStore.showSettingPanel = v;
  },
});

function handleClearSettings() {
  settingStore.resetConfig();
  MessagePlugin.success(t('page.right_setting.clear_settings_success'));
}
</script>

<!-- drawer 渲染在 body 下，scoped 样式不生效，使用全局选择器（同老项目处理方式） -->
<style>
.setting-drawer-container .setting-container {
  padding-bottom: 24px;
}

.setting-drawer-container .setting-group-title {
  font-size: 14px;
  line-height: 22px;
  margin: 32px 0 24px 0;
  text-align: left;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.setting-drawer-container .setting-group-title:first-child {
  margin-top: 0;
}

.setting-drawer-container .t-radio-group.t-size-m {
  min-height: 32px;
  width: 100%;
  height: auto;
  justify-content: space-between;
  align-items: center;
}

.setting-drawer-container .setting-layout-drawer {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.setting-drawer-container .setting-layout-drawer .t-radio-button {
  display: inline-flex;
  max-height: 78px;
  padding: 8px;
  border-radius: var(--td-radius-default);
  border: 2px solid var(--td-component-border);
  height: auto;
}

.setting-drawer-container .setting-layout-drawer .t-radio-button > .t-radio-button__label {
  display: inline-flex;
}

.setting-drawer-container .setting-layout-drawer .t-is-checked {
  border: 2px solid var(--td-brand-color) !important;
}

.setting-drawer-container .setting-layout-color-group {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 50% !important;
  padding: 6px !important;
  border: 2px solid transparent !important;
}

.setting-drawer-container .color-block {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.setting-drawer-container .t-form__controls-content {
  justify-content: end;
}

.setting-drawer-container .setting-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--td-component-border);
}
</style>
