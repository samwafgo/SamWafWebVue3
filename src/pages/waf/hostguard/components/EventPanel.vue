<template>
  <div class="panel-container">
    <t-form layout="inline" :data="searchformData" class="search-form">
      <t-form-item :label="t('page.hostguard.col_source')">
        <t-select v-model="searchformData.source" clearable :style="{ width: '120px' }">
          <t-option key="ssh" value="ssh" label="SSH" />
          <t-option key="rdp" value="rdp" label="RDP" />
        </t-select>
      </t-form-item>
      <t-form-item :label="t('page.hostguard.col_ip')">
        <t-input v-model="searchformData.ip" clearable :style="{ width: '160px' }" />
      </t-form-item>
      <t-form-item :label="t('page.hostguard.col_user')">
        <t-input v-model="searchformData.user_name" clearable :style="{ width: '140px' }" />
      </t-form-item>
      <t-form-item :label="t('page.hostguard.col_action')">
        <t-select v-model="searchformData.action" clearable :style="{ width: '140px' }">
          <t-option key="banned" value="banned" :label="t('page.hostguard.action_banned')" />
          <t-option key="counted" value="counted" :label="t('page.hostguard.action_counted')" />
          <t-option key="observe" value="observe" :label="t('page.hostguard.action_observe')" />
          <t-option key="skipped" value="skipped" :label="t('page.hostguard.action_skipped')" />
        </t-select>
      </t-form-item>
      <t-form-item>
        <t-button theme="primary" @click="onSearch">{{ t('common.search') }}</t-button>
        <t-button variant="outline" style="margin-left: 8px" @click="onReset">{{ t('common.reset') }}</t-button>
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
      <template #source="{ row }">
        <t-tag :theme="row.source === 'rdp' ? 'warning' : 'primary'" variant="light">
          {{ row.source === 'rdp' ? 'RDP' : 'SSH' }}
        </t-tag>
      </template>
      <template #fail_kind="{ row }">
        <span>{{ failKindText(row.fail_kind) }}</span>
      </template>
      <template #action="{ row }">
        <t-tag v-if="row.action === 'banned'" theme="danger" variant="light">
          {{ t('page.hostguard.action_banned') }}
        </t-tag>
        <t-tag v-else-if="row.action === 'counted'" theme="warning" variant="light">
          {{ t('page.hostguard.action_counted') }}
        </t-tag>
        <t-tag v-else-if="row.action === 'observe'" theme="primary" variant="light">
          {{ t('page.hostguard.action_observe') }}
        </t-tag>
        <t-tag v-else theme="default" variant="light">{{ t('page.hostguard.action_skipped') }}</t-tag>
      </template>
      <template #event_time="{ row }">
        <span>{{ fmtUnix(row.event_time) }}</span>
      </template>
      <template #raw_line="{ row }">
        <t-tooltip :content="row.raw_line" placement="top">
          <span class="raw-line">{{ row.raw_line }}</span>
        </t-tooltip>
      </template>
      <template #op="{ row }">
        <a class="t-button-link" @click="handleBan(row)">{{ t('page.hostguard.op_ban') }}</a>
        <a class="t-button-link" style="margin-left: 8px" @click="handleWhitelist(row)">
          {{ t('page.hostguard.op_whitelist') }}
        </a>
        <a class="t-button-link" style="margin-left: 8px" @click="handleFilterIP(row)">
          {{ t('page.hostguard.op_same_ip') }}
        </a>
      </template>
    </t-table>

    <BanDialog v-model:visible="banVisible" :ip="banIP" @done="onBanDone" />
  </div>
</template>

<script setup lang="ts">
import { DialogPlugin, MessagePlugin, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { wafHostGuardEventListApi, wafHostGuardWhitelistAddApi } from '@/apis/hostguard';

import { fmtUnix } from '../utils';
import BanDialog from './BanDialog.vue';

const { t } = useI18n();
const emit = defineEmits<{ (e: 'changed'): void }>();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';
const pagination = reactive({ total: 0, current: 1, pageSize: 20 });
const searchformData = reactive({ source: '', ip: '', user_name: '', action: '' });
const banVisible = ref(false);
const banIP = ref('');

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.hostguard.col_time'), colKey: 'event_time', width: 170 },
  { title: t('page.hostguard.col_source'), colKey: 'source', width: 80 },
  { title: t('page.hostguard.col_ip'), colKey: 'ip', width: 150, ellipsis: true },
  { title: t('page.hostguard.col_location'), colKey: 'location', width: 160, ellipsis: true },
  { title: t('page.hostguard.col_user'), colKey: 'user_name', width: 120, ellipsis: true },
  { title: t('page.hostguard.col_fail_kind'), colKey: 'fail_kind', width: 150 },
  { title: t('page.hostguard.col_action'), colKey: 'action', width: 100 },
  { title: t('page.hostguard.col_hit_count'), colKey: 'hit_count', width: 90 },
  { title: t('page.hostguard.col_src_port'), colKey: 'port', width: 90 },
  { title: t('page.hostguard.col_raw'), colKey: 'raw_line', width: 260, ellipsis: true },
  { title: t('common.op'), colKey: 'op', width: 200, fixed: 'right' },
]);

function failKindText(kind: string) {
  const key = `page.hostguard.fail_kind.${kind}`;
  const text = t(key);
  // i18n 配了 missingWarn:false，缺键会原样返回键名，这里兜底显示原值
  return text === key ? kind : text;
}

function getList() {
  dataLoading.value = true;
  wafHostGuardEventListApi({
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
    ...searchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
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

function onReset() {
  searchformData.source = '';
  searchformData.ip = '';
  searchformData.user_name = '';
  searchformData.action = '';
  onSearch();
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function handleFilterIP(row: Record<string, any>) {
  searchformData.ip = row.ip;
  onSearch();
}

function handleBan(row: Record<string, any>) {
  banIP.value = row.ip;
  banVisible.value = true;
}

function onBanDone() {
  getList();
  emit('changed');
}

function handleWhitelist(row: Record<string, any>) {
  const { ip } = row;
  const dia = DialogPlugin.confirm({
    header: t('page.hostguard.confirm_whitelist_title'),
    body: t('page.hostguard.confirm_whitelist_body', { ip }),
    confirmBtn: t('common.confirm'),
    cancelBtn: t('common.cancel'),
    onConfirm: () => {
      wafHostGuardWhitelistAddApi({ ip })
        .then((res) => {
          if (res.code === 0) {
            MessagePlugin.success(res.msg);
            getList();
            emit('changed');
          } else {
            MessagePlugin.warning(res.msg);
          }
        })
        .finally(() => dia.hide());
    },
    onCancel: () => dia.hide(),
  });
}

function refresh() {
  getList();
}

onMounted(refresh);
defineExpose({ refresh });
</script>

<style scoped>
.panel-container {
  padding: 8px 0;
}
.search-form {
  margin-bottom: 16px;
}
.raw-line {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
</style>
