<template>
  <div class="panel-container">
    <t-alert theme="info" :close="false" class="tip-alert">
      <template #message>{{ t('page.hostguard.offender_tip') }}</template>
    </t-alert>

    <t-form layout="inline" :data="searchformData" class="search-form">
      <t-form-item :label="t('page.hostguard.col_ip')">
        <t-input v-model="searchformData.ip" clearable :style="{ width: '160px' }" />
      </t-form-item>
      <t-form-item :label="t('page.hostguard.col_source')">
        <t-select v-model="searchformData.source" clearable :style="{ width: '120px' }">
          <t-option key="ssh" value="ssh" label="SSH" />
          <t-option key="rdp" value="rdp" label="RDP" />
        </t-select>
      </t-form-item>
      <t-form-item>
        <t-button theme="primary" @click="onSearch">{{ t('common.search') }}</t-button>
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
      <template #ban_count="{ row }">
        <span class="ban-count">{{ row.ban_count }}</span>
      </template>
      <template #current_level="{ row }">
        <t-tag v-if="row.current_level > 0" :theme="row.current_level >= 4 ? 'danger' : 'warning'" variant="light">
          {{ t('page.hostguard.level_n', { n: row.current_level }) }}
        </t-tag>
        <span v-else>-</span>
      </template>
      <template #first_ban_time="{ row }">
        <span>{{ fmtUnix(row.first_ban_time) }}</span>
      </template>
      <template #last_ban_time="{ row }">
        <span>{{ fmtUnix(row.last_ban_time) }}</span>
      </template>
      <template #op="{ row }">
        <a class="t-button-link" @click="handleReset(row)">{{ t('page.hostguard.op_reset_level') }}</a>
        <a class="t-button-link" style="margin-left: 8px" @click="handlePermanentBan(row)">
          {{ t('page.hostguard.op_ban_permanent') }}
        </a>
        <a class="t-button-link" style="margin-left: 8px" @click="handleWhitelist(row)">
          {{ t('page.hostguard.op_whitelist') }}
        </a>
        <a class="t-button-link" style="margin-left: 8px" @click="handleDelete(row)">{{ t('common.delete') }}</a>
      </template>
    </t-table>
  </div>
</template>

<script setup lang="ts">
import { DialogPlugin, MessagePlugin, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  wafHostGuardBanManualApi,
  wafHostGuardOffenderDelApi,
  wafHostGuardOffenderListApi,
  wafHostGuardOffenderResetApi,
  wafHostGuardWhitelistAddApi,
} from '@/apis/hostguard';

import { fmtUnix } from '../utils';

const { t } = useI18n();
const emit = defineEmits<{ (e: 'changed'): void }>();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';
const pagination = reactive({ total: 0, current: 1, pageSize: 20 });
const searchformData = reactive({ ip: '', source: '' });

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.hostguard.col_ip'), colKey: 'ip', width: 160, ellipsis: true },
  { title: t('page.hostguard.col_source'), colKey: 'source', width: 80 },
  { title: t('page.hostguard.col_ban_count'), colKey: 'ban_count', width: 110 },
  { title: t('page.hostguard.col_level'), colKey: 'current_level', width: 110 },
  { title: t('page.hostguard.col_total_fail'), colKey: 'total_fail_count', width: 110 },
  { title: t('page.hostguard.col_first_ban'), colKey: 'first_ban_time', width: 170 },
  { title: t('page.hostguard.col_last_ban'), colKey: 'last_ban_time', width: 170 },
  { title: t('page.hostguard.col_location'), colKey: 'location', width: 160, ellipsis: true },
  { title: t('page.hostguard.col_last_reason'), colKey: 'last_reason', width: 280, ellipsis: true },
  { title: t('common.op'), colKey: 'op', width: 280, fixed: 'right' },
]);

function getList() {
  dataLoading.value = true;
  wafHostGuardOffenderListApi({
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

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function confirmThen(header: string, body: string, action: () => Promise<any>) {
  const dia = DialogPlugin.confirm({
    header,
    body,
    confirmBtn: t('common.confirm'),
    cancelBtn: t('common.cancel'),
    onConfirm: () => {
      action()
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

function handleReset(row: Record<string, any>) {
  confirmThen(
    t('page.hostguard.confirm_reset_title'),
    t('page.hostguard.confirm_reset_body', { ip: row.ip }),
    () => wafHostGuardOffenderResetApi({ id: row.id }),
  );
}

function handleDelete(row: Record<string, any>) {
  confirmThen(t('common.confirm_delete'), t('common.data_delete_warning'), () =>
    wafHostGuardOffenderDelApi({ id: row.id }),
  );
}

function handlePermanentBan(row: Record<string, any>) {
  confirmThen(
    t('page.hostguard.confirm_permanent_title'),
    t('page.hostguard.confirm_permanent_body', { ip: row.ip }),
    () =>
      wafHostGuardBanManualApi({
        ip: row.ip,
        source: row.source,
        ban_minutes: 0,
        reason: t('page.hostguard.reason_manual_permanent'),
      }),
  );
}

function handleWhitelist(row: Record<string, any>) {
  confirmThen(
    t('page.hostguard.confirm_whitelist_title'),
    t('page.hostguard.confirm_whitelist_body', { ip: row.ip }),
    () => wafHostGuardWhitelistAddApi({ ip: row.ip }),
  );
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
.tip-alert,
.search-form {
  margin-bottom: 16px;
}
.ban-count {
  font-weight: 600;
  color: #d54941;
}
</style>
