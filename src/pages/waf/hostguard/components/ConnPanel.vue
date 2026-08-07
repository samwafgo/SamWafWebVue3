<template>
  <div class="panel-container">
    <t-alert v-if="summary.unavailable" theme="warning" :close="false" class="tip-alert">
      <template #message>{{ summary.unavailable }}</template>
    </t-alert>

    <t-row :gutter="16" class="stat-row">
      <t-col :span="2">
        <t-card size="small">
          <div class="stat-card">
            <div class="stat-label">{{ t('page.hostconn.stat_total') }}</div>
            <div class="stat-value">{{ summary.total || 0 }}</div>
          </div>
        </t-card>
      </t-col>
      <t-col :span="2">
        <t-card size="small">
          <div class="stat-card">
            <div class="stat-label">{{ t('page.hostconn.stat_established') }}</div>
            <div class="stat-value stat-active">{{ summary.established || 0 }}</div>
          </div>
        </t-card>
      </t-col>
      <t-col :span="2">
        <t-card size="small">
          <div class="stat-card">
            <div class="stat-label">{{ t('page.hostconn.stat_listen') }}</div>
            <div class="stat-value">{{ summary.listen || 0 }}</div>
          </div>
        </t-card>
      </t-col>
      <t-col :span="2">
        <t-card size="small">
          <div class="stat-card">
            <div class="stat-label">{{ t('page.hostconn.stat_guard') }}</div>
            <div class="stat-value stat-warn">{{ summary.guard_conns || 0 }}</div>
          </div>
        </t-card>
      </t-col>
      <t-col :span="4">
        <t-card size="small">
          <div class="stat-card">
            <div class="stat-label">{{ t('page.hostconn.stat_collect') }}</div>
            <div class="stat-value stat-small">
              {{ summary.collect_ms || 0 }} ms
              <t-tag v-if="summary.from_cache" theme="default" variant="light" size="small">
                {{ t('page.hostconn.from_cache') }}
              </t-tag>
            </div>
            <div class="stat-hint">
              SSH: {{ (summary.ssh_ports || []).join(', ') || '-' }} / RDP:
              {{ (summary.rdp_ports || []).join(', ') || '-' }}
            </div>
          </div>
        </t-card>
      </t-col>
    </t-row>

    <t-form layout="inline" :data="searchformData" class="search-form">
      <t-form-item :label="t('page.hostconn.local_port')">
        <t-input-number v-model="searchformData.local_port" :min="0" theme="column" :style="{ width: '140px' }" />
      </t-form-item>
      <t-form-item :label="t('page.hostconn.state')">
        <t-select v-model="searchformData.state" clearable :style="{ width: '160px' }">
          <t-option key="ESTABLISHED" value="ESTABLISHED" label="ESTABLISHED" />
          <t-option key="LISTEN" value="LISTEN" label="LISTEN" />
          <t-option key="TIME_WAIT" value="TIME_WAIT" label="TIME_WAIT" />
          <t-option key="CLOSE_WAIT" value="CLOSE_WAIT" label="CLOSE_WAIT" />
        </t-select>
      </t-form-item>
      <t-form-item :label="t('page.hostconn.remote_ip')">
        <t-input v-model="searchformData.remote_ip" clearable :style="{ width: '160px' }" />
      </t-form-item>
      <t-form-item>
        <t-checkbox v-model="onlyGuard">{{ t('page.hostconn.only_guard') }}</t-checkbox>
      </t-form-item>
      <t-form-item>
        <t-button theme="primary" @click="onSearch">{{ t('common.search') }}</t-button>
        <t-button variant="outline" style="margin-left: 8px" @click="forceRefresh">
          {{ t('common.refresh') }}
        </t-button>
      </t-form-item>
      <t-form-item :label="t('page.hostconn.auto_refresh')">
        <t-select v-model="autoRefreshSec" :style="{ width: '120px' }" @change="setupAutoRefresh">
          <t-option :key="0" :value="0" :label="t('page.hostconn.auto_off')" />
          <t-option :key="5" :value="5" label="5s" />
          <t-option :key="10" :value="10" label="10s" />
          <t-option :key="30" :value="30" label="30s" />
        </t-select>
      </t-form-item>
    </t-form>

    <t-table
      :columns="columns"
      :data="data"
      :row-key="rowKey"
      vertical-align="top"
      hover
      :pagination="pagination"
      :loading="dataLoading"
      @page-change="rehandlePageChange"
    >
      <template #local_port="{ row }">
        <span :class="row.is_guard ? 'guard-port' : ''">{{ row.local_port }}</span>
        <t-tag v-if="row.is_guard" theme="warning" variant="light" size="small" style="margin-left: 4px">
          {{ t('page.hostconn.tag_remote_login') }}
        </t-tag>
      </template>
      <template #remote_ip="{ row }">
        <span>{{ row.remote_ip }}</span>
        <t-tag v-if="row.banned" theme="danger" variant="light" size="small" style="margin-left: 4px">
          {{ t('page.hostconn.tag_banned') }}
        </t-tag>
      </template>
      <template #state="{ row }">
        <t-tag v-if="row.state === 'ESTABLISHED'" theme="success" variant="light">{{ row.state }}</t-tag>
        <t-tag v-else theme="default" variant="light">{{ row.state }}</t-tag>
      </template>
      <template #op="{ row }">
        <a v-if="row.remote_ip && !row.banned" class="t-button-link" @click="handleBlock(row)">
          {{ t('page.hostconn.op_block') }}
        </a>
        <span v-else class="op-disabled">-</span>
      </template>
    </t-table>

    <BanDialog v-model:visible="banVisible" :ip="banIP" @done="onBanDone" />
  </div>
</template>

<script setup lang="ts">
import type { PageInfo, TableProps } from 'tdesign-vue-next';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { wafHostConnListApi, wafHostConnRefreshApi } from '@/apis/hostconn';

import BanDialog from './BanDialog.vue';

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const summary = ref<Record<string, any>>({});
const rowKey = 'conn_key';
const pagination = reactive({ total: 0, current: 1, pageSize: 20 });
const searchformData = reactive({ local_port: 0, state: '', remote_ip: '' });
const onlyGuard = ref(false);
const banVisible = ref(false);
const banIP = ref('');

// 默认不自动刷新：Linux 下采集要遍历 /proc，无人看的时候不该白跑
const autoRefreshSec = ref(0);
let autoTimer: ReturnType<typeof setInterval> | null = null;

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.hostconn.remote_ip'), colKey: 'remote_ip', width: 200, ellipsis: true },
  { title: t('page.hostconn.remote_port'), colKey: 'remote_port', width: 100 },
  { title: t('page.hostconn.local_port'), colKey: 'local_port', width: 160 },
  { title: t('page.hostconn.state'), colKey: 'state', width: 140 },
  { title: 'PID', colKey: 'pid', width: 90 },
  { title: t('page.hostconn.proc_name'), colKey: 'proc_name', width: 140, ellipsis: true },
  { title: t('page.hostguard.col_location'), colKey: 'location', width: 180, ellipsis: true },
  { title: t('common.op'), colKey: 'op', width: 100, fixed: 'right' },
]);

function getList() {
  dataLoading.value = true;
  wafHostConnListApi({
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
    local_port: searchformData.local_port || 0,
    state: searchformData.state,
    remote_ip: searchformData.remote_ip,
    only_guard: onlyGuard.value ? 1 : 0,
  })
    .then((res) => {
      if (res.code === 0 && res.data) {
        // 连接没有天然主键，用五元组拼一个稳定的 rowKey
        data.value = (res.data.list ?? []).map((x: Record<string, any>, idx: number) => ({
          ...x,
          conn_key: `${x.remote_ip}:${x.remote_port}-${x.local_ip}:${x.local_port}-${idx}`,
        }));
        pagination.total = res.data.total;
        summary.value = res.data.summary || {};
      }
    })
    .catch(() => {})
    .finally(() => {
      dataLoading.value = false;
    });
}

function onSearch() {
  pagination.current = 1;
  getList();
}

function forceRefresh() {
  wafHostConnRefreshApi({})
    .then(() => getList())
    .catch(() => getList());
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function clearAutoRefresh() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

function setupAutoRefresh() {
  clearAutoRefresh();
  if (autoRefreshSec.value > 0) {
    autoTimer = setInterval(() => {
      // 页面被切到后台就不刷，省掉无人看时的采集开销
      if (document.visibilityState === 'visible') {
        getList();
      }
    }, autoRefreshSec.value * 1000);
  }
}

function handleBlock(row: Record<string, any>) {
  banIP.value = row.remote_ip;
  banVisible.value = true;
}

function onBanDone() {
  forceRefresh();
}

function refresh() {
  getList();
}

onMounted(refresh);
onBeforeUnmount(clearAutoRefresh);
defineExpose({ refresh });
</script>

<style scoped>
.panel-container {
  padding: 8px 0;
}
.tip-alert,
.search-form {
  margin-bottom: 16px;
}
.stat-row {
  margin-bottom: 16px;
}
.stat-card .stat-label {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  margin-bottom: 6px;
}
.stat-card .stat-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}
.stat-card .stat-value.stat-active {
  color: #52c41a;
}
.stat-card .stat-value.stat-warn {
  color: #e37318;
}
.stat-card .stat-value.stat-small {
  font-size: 16px;
}
.stat-card .stat-hint {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-top: 4px;
}
.guard-port {
  font-weight: 600;
  color: #e37318;
}
.op-disabled {
  color: var(--td-text-color-placeholder);
}
</style>
