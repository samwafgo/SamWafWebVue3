<template>
  <div>
    <!-- 环境降级提示：采集不了 / 防火墙不可用时必须让用户一眼看到，
         否则功能"开着但不生效"，用户毫无察觉 -->
    <t-alert v-if="status.unavailable" theme="error" :close="false" class="top-alert">
      <template #message>
        <div class="alert-line">
          <strong>{{ t('page.hostguard.alert_unavailable') }}</strong>{{ status.unavailable }}
        </div>
      </template>
    </t-alert>
    <t-alert
      v-else-if="status.capability && !status.capability.FirewallReady"
      theme="warning"
      :close="false"
      class="top-alert"
    >
      <template #message>
        <div class="alert-line">
          <strong>{{ t('page.hostguard.alert_no_firewall') }}</strong>{{ status.capability.FirewallReason }}
        </div>
      </template>
    </t-alert>
    <t-alert v-else-if="status.running && status.mode !== 'block'" theme="info" :close="false" class="top-alert">
      <template #message>
        <div class="alert-line">{{ t('page.hostguard.alert_observe') }}</div>
      </template>
    </t-alert>

    <t-card class="list-card-container">
      <t-tabs v-model="activeTab" @change="onTabChange">
        <t-tab-panel value="overview" :label="t('page.hostguard.tab_overview')">
          <OverviewPanel ref="overviewPanel" @go-tab="switchTab" />
        </t-tab-panel>

        <t-tab-panel value="event" :label="t('page.hostguard.tab_event')">
          <EventPanel ref="eventPanel" @changed="reloadStatus" />
        </t-tab-panel>

        <t-tab-panel value="ban" :label="t('page.hostguard.tab_ban')">
          <BanPanel ref="banPanel" @changed="reloadStatus" />
        </t-tab-panel>

        <t-tab-panel value="offender" :label="t('page.hostguard.tab_offender')">
          <OffenderPanel ref="offenderPanel" @changed="reloadStatus" />
        </t-tab-panel>

        <t-tab-panel value="conn" :label="t('page.hostguard.tab_conn')">
          <ConnPanel ref="connPanel" />
        </t-tab-panel>

        <t-tab-panel value="setting" :label="t('page.hostguard.tab_setting')">
          <SettingPanel ref="settingPanel" :status="status" @changed="reloadStatus" />
        </t-tab-panel>
      </t-tabs>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { wafHostGuardStatusApi } from '@/apis/hostguard';
import bus from '@/utils/bus';

import BanPanel from './components/BanPanel.vue';
import ConnPanel from './components/ConnPanel.vue';
import EventPanel from './components/EventPanel.vue';
import OffenderPanel from './components/OffenderPanel.vue';
import OverviewPanel from './components/OverviewPanel.vue';
import SettingPanel from './components/SettingPanel.vue';

const { t } = useI18n();

const activeTab = ref('overview');
const status = ref<Record<string, any>>({
  running: false,
  mode: 'observe',
  unavailable: '',
  capability: null,
});

const overviewPanel = ref();
const eventPanel = ref();
const banPanel = ref();
const offenderPanel = ref();
const connPanel = ref();
const settingPanel = ref();

function reloadStatus() {
  wafHostGuardStatusApi({})
    .then((res) => {
      if (res.code === 0 && res.data) {
        status.value = res.data;
      }
    })
    .catch(() => {});
}

// 切到某个 tab 时才刷新它的数据：连接看板采集有开销，
// 用户没看的时候不该在后台白跑
function onTabChange(val: any) {
  nextTick(() => {
    const refMap: Record<string, any> = {
      overview: overviewPanel,
      event: eventPanel,
      ban: banPanel,
      offender: offenderPanel,
      conn: connPanel,
      setting: settingPanel,
    };
    const panel = refMap[val as string];
    if (panel?.value?.refresh) {
      panel.value.refresh();
    }
  });
  reloadStatus();
}

function switchTab(tab: string) {
  activeTab.value = tab;
  onTabChange(tab);
}

// 后端封禁时会通过 WebSocket 广播，页面据此即时刷新，
// 用户不用盯着点刷新按钮
function onRemoteBan() {
  reloadStatus();
  onTabChange(activeTab.value);
}

onMounted(() => {
  reloadStatus();
  bus.on('hostguard-ban', onRemoteBan);
});

onBeforeUnmount(() => {
  bus.off('hostguard-ban', onRemoteBan);
});
</script>

<style scoped>
.top-alert {
  margin-bottom: 16px;
}
.alert-line {
  font-size: 14px;
  line-height: 1.7;
  word-break: break-all;
}
</style>
