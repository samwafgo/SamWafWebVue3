<template>
  <div>
    <t-card class="list-card-container">
      <div class="right-operation-container">
        <t-form :label-width="300" layout="inline" colon :style="{ marginBottom: '8px' }">
          <t-form-item>
            <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getConnectionData()">
              {{ t('common.refresh') }}
            </t-button>
          </t-form-item>
        </t-form>
      </div>
      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
          @filter-change="onFilterChange"
        >
        </t-table>
      </div>
    </t-card>

    <t-tabs v-model="activeTab">
      <t-tab-panel
        v-for="(portInfo, index) in portInfoList"
        :key="index"
        :value="portInfo.port.toString()"
        :label="`${t('page.tunnel.port')} ${portInfo.port}`"
      >
        <t-card>
          <template #header>
            <div class="port-info-header">
              <span>{{ t('page.tunnel.tcp_source_count') }}: {{ portInfo.tcp_source_count }}</span>
              <span>{{ t('page.tunnel.tcp_target_count') }}: {{ portInfo.tcp_target_count }}</span>
              <span v-if="portInfo.udp_source_count > 0">{{ t('page.tunnel.udp_source_count') }}: {{ portInfo.udp_source_count }}</span>
              <span v-if="portInfo.udp_target_count > 0">{{ t('page.tunnel.udp_target_count') }}: {{ portInfo.udp_target_count }}</span>
            </div>
          </template>

          <t-table :data="portInfo.tcp_source_ips" :columns="ipColumns" :pagination="{ pageSize: 10 }" :loading="dataLoading">
            <template #ip="{ row }">
              <span>{{ row.ip }}</span>
            </template>
            <template #region="{ row }">
              <span>{{ row.region }}</span>
            </template>
          </t-table>
        </t-card>
      </t-tab-panel>
    </t-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import { wafTunnelConnectionApi } from '@/apis/tunnel';

const props = defineProps({
  tunnelCode: {
    type: String,
    default: '',
  },
});

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const tunnelInfo = ref<Record<string, any>>({});
const portInfoList = ref<Record<string, any>[]>([]);
const activeTab = ref('');
const rowKey = 'port';

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.tunnel.port'), align: 'left', width: 100, ellipsis: true, colKey: 'port' },
  { title: t('page.tunnel.tcp_source_count'), width: 150, ellipsis: true, colKey: 'tcp_source_count' },
  { title: t('page.tunnel.tcp_target_count'), width: 150, ellipsis: true, colKey: 'tcp_target_count' },
  { title: t('page.tunnel.udp_source_count'), width: 150, ellipsis: true, colKey: 'udp_source_count' },
  { title: t('page.tunnel.udp_target_count'), width: 150, ellipsis: true, colKey: 'udp_target_count' },
]);

const ipColumns = computed<TableProps['columns']>(() => [
  {
    title: t('page.tunnel.ip_address'),
    align: 'left',
    width: 200,
    ellipsis: true,
    colKey: 'ip',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: {
        placeholder: t('common.placeholder'),
      },
      showConfirmAndReset: true,
    },
  },
  { title: t('page.tunnel.region'), width: 200, ellipsis: true, colKey: 'region' },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

watch(
  () => props.tunnelCode,
  (val) => {
    if (val) {
      getConnectionData();
    }
  },
);

onMounted(() => {
  if (props.tunnelCode) {
    getConnectionData();
  }
});

function getConnectionData() {
  dataLoading.value = true;
  wafTunnelConnectionApi({
    id: props.tunnelCode,
  })
    .then((res) => {
      if (res.code === 0) {
        tunnelInfo.value = res.data.tunnel_info || {};
        portInfoList.value = res.data.port_info || [];

        // 设置默认激活的标签页
        if (portInfoList.value.length > 0 && !activeTab.value) {
          activeTab.value = portInfoList.value[0].port.toString();
        }

        // 转换数据格式用于表格显示
        data.value = portInfoList.value.map((item) => ({
          port: item.port,
          tcp_source_count: item.tcp_source_count,
          tcp_target_count: item.tcp_target_count,
          udp_source_count: item.udp_source_count,
          udp_target_count: item.udp_target_count,
        }));
      } else {
        MessagePlugin.error(res.msg || '获取连接数据失败');
      }
    })
    .catch((e) => {
      console.error(e);
      MessagePlugin.error('获取连接数据失败');
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
}

function onFilterChange(e: Record<string, any>) {
  if (e.ip && activeTab.value) {
    const activePortInfo = portInfoList.value.find((item) => item.port.toString() === activeTab.value);
    if (activePortInfo) {
      activePortInfo.tcp_source_ips = activePortInfo.tcp_source_ips.filter((item: Record<string, any>) => item.ip.includes(e.ip));
    }
  } else {
    getConnectionData();
  }
}

defineExpose({ refresh: getConnectionData });
</script>

<style scoped>
.port-info-header {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.port-info-header span {
  font-weight: bold;
}

.t-tabs {
  margin-top: 20px;
}
</style>
