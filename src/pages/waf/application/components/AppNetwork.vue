<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
      <span style="font-size: 12px; color: #999">
        <span v-if="result && result.cached_at">{{ t('page.application.net_cached_at') }}{{ result.cached_at }}</span>
        <span v-if="result && result.pids && result.pids.length > 1" style="margin-left: 12px">
          PIDs: {{ result.pids.join(', ') }}
        </span>
      </span>
      <t-button size="small" :loading="loading" @click="load">{{ t('common.refresh') }}</t-button>
    </div>

    <t-divider>{{ t('page.application.net_ports') }}</t-divider>
    <t-table :data="ports" :columns="portColumns" row-key="local_addr" size="small" :empty="t('page.application.net_no_ports')">
    </t-table>

    <t-divider>
      {{ t('page.application.net_connections') }}
      <span v-if="connSummaryAll.length > 0" style="font-size: 12px; font-weight: normal; color: #999; margin-left: 8px">
        {{ connSummaryAll.length }} IP
      </span>
    </t-divider>
    <t-alert
      v-if="result && result.connections && result.connections.length >= 1000"
      theme="warning"
      :message="t('page.application.net_conn_limit')"
      style="margin-bottom: 8px"
    />
    <t-table
      :data="connPageData"
      :columns="connColumns"
      row-key="remote_ip"
      size="small"
      :pagination="connPagination"
      :empty="t('page.application.net_no_connections')"
      @page-change="onConnPageChange"
    >
    </t-table>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import { wafAppNetStatsApi } from '@/apis/application';

const props = defineProps({
  appCode: { type: String, default: '' },
});

const { t } = useI18n();

function parsePort(addr: string): number {
  if (!addr) return 0;
  const lastColon = addr.lastIndexOf(':');
  if (lastColon < 0) return 0;
  return parseInt(addr.slice(lastColon + 1), 10) || 0;
}

const loading = ref(false);
const result = ref<Record<string, any> | null>(null);
const connCurrentPage = ref(1);
const connPageSize = ref(20);

const portColumns = computed<TableProps['columns']>(() => [
  { colKey: 'protocol', title: t('page.application.net_protocol'), width: 80 },
  { colKey: 'local_addr', title: t('page.application.net_local_addr'), ellipsis: true },
  { colKey: 'port', title: t('page.application.net_port'), width: 80 },
  { colKey: 'pid', title: 'PID', width: 80 },
]);

const connColumns = computed<TableProps['columns']>(() => [
  { colKey: 'remote_ip', title: t('page.application.net_remote_ip'), ellipsis: true },
  { colKey: 'count', title: t('page.application.net_conn_count'), width: 100 },
  { colKey: 'local_ports', title: t('page.application.net_local_ports'), ellipsis: true },
]);

const ports = computed(() => (result.value && result.value.ports ? result.value.ports : []));

const connSummaryAll = computed(() => {
  const rawConns: Record<string, any>[] = result.value && result.value.connections ? result.value.connections : [];
  const map: Record<string, { remote_ip: string; count: number; portSet: Set<number> }> = {};
  for (const c of rawConns) {
    const ip = c.remote_ip || c.remote_addr || '';
    if (!ip) continue;
    if (!map[ip]) {
      map[ip] = { remote_ip: ip, count: 0, portSet: new Set() };
    }
    map[ip].count++;
    const port = parsePort(c.local_addr);
    if (port) map[ip].portSet.add(port);
  }
  return Object.values(map)
    .map((v) => ({
      remote_ip: v.remote_ip,
      count: v.count,
      local_ports: Array.from(v.portSet).join(', '),
    }))
    .sort((a, b) => b.count - a.count);
});

const connPageData = computed(() => {
  const start = (connCurrentPage.value - 1) * connPageSize.value;
  return connSummaryAll.value.slice(start, start + connPageSize.value);
});

const connPagination = computed(() => ({
  current: connCurrentPage.value,
  pageSize: connPageSize.value,
  total: connSummaryAll.value.length,
}));

onMounted(() => {
  load();
});

function load() {
  if (!props.appCode) return;
  loading.value = true;
  connCurrentPage.value = 1;
  wafAppNetStatsApi({ code: props.appCode })
    .then((res) => {
      if (res && res.code === 0) {
        result.value = res.data;
      }
    })
    .finally(() => {
      loading.value = false;
    });
}

function onConnPageChange(curr: PageInfo) {
  connCurrentPage.value = curr.current;
  connPageSize.value = curr.pageSize;
}
</script>
