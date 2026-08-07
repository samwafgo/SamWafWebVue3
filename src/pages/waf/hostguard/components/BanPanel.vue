<template>
  <div class="panel-container">
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
      <t-form-item :label="t('page.hostguard.col_status')">
        <t-select v-model="searchformData.status" :style="{ width: '140px' }">
          <t-option key="active" value="active" :label="t('page.hostguard.status_active')" />
          <t-option key="expired" value="expired" :label="t('page.hostguard.status_expired')" />
          <t-option key="released" value="released" :label="t('page.hostguard.status_released')" />
          <t-option key="all" value="all" :label="t('page.hostguard.status_all')" />
        </t-select>
      </t-form-item>
      <t-form-item>
        <t-button theme="primary" @click="onSearch">{{ t('common.search') }}</t-button>
        <t-button variant="outline" style="margin-left: 8px" @click="banVisible = true">
          {{ t('page.hostguard.op_manual_ban') }}
        </t-button>
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
      <template #ip="{ row }">
        <span>{{ row.ip }}</span>
        <t-tag v-if="row.is_subnet === 1" theme="danger" variant="light" size="small" style="margin-left: 4px">
          {{ t('page.hostguard.tag_subnet') }}
        </t-tag>
      </template>
      <template #level="{ row }">
        <t-tag v-if="row.level > 0" theme="warning" variant="light">
          {{ t('page.hostguard.level_n', { n: row.level }) }}
        </t-tag>
        <t-tag v-else theme="default" variant="light">{{ t('page.hostguard.level_manual') }}</t-tag>
      </template>
      <template #ban_minutes="{ row }">
        <span>{{ fmtBanMinutes(row.ban_minutes, t('page.hostguard.permanent')) }}</span>
      </template>
      <template #remain="{ row }">
        <span :class="row.expire_time === 0 ? 'remain-permanent' : ''">{{ remainText(row) }}</span>
      </template>
      <template #start_time="{ row }">
        <span>{{ fmtUnix(row.start_time) }}</span>
      </template>
      <template #status="{ row }">
        <t-tag v-if="row.status === 'active'" theme="danger" variant="light">
          {{ t('page.hostguard.status_active') }}
        </t-tag>
        <t-tag v-else-if="row.status === 'expired'" theme="default" variant="light">
          {{ t('page.hostguard.status_expired') }}
        </t-tag>
        <t-tag v-else theme="success" variant="light">{{ t('page.hostguard.status_released') }}</t-tag>
      </template>
      <template #op="{ row }">
        <template v-if="row.status === 'active'">
          <a class="t-button-link" @click="handleRelease(row)">{{ t('page.hostguard.op_release') }}</a>
          <a v-if="row.expire_time > 0" class="t-button-link" style="margin-left: 8px" @click="handlePermanent(row)">
            {{ t('page.hostguard.op_permanent') }}
          </a>
          <a class="t-button-link" style="margin-left: 8px" @click="handleWhitelist(row)">
            {{ t('page.hostguard.op_whitelist') }}
          </a>
        </template>
        <span v-else class="op-disabled">-</span>
      </template>
    </t-table>

    <BanDialog v-model:visible="banVisible" ip="" @done="onBanDone" />
  </div>
</template>

<script setup lang="ts">
import { DialogPlugin, MessagePlugin, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  wafHostGuardBanListApi,
  wafHostGuardBanPermanentApi,
  wafHostGuardBanReleaseApi,
  wafHostGuardWhitelistAddApi,
} from '@/apis/hostguard';

import { fmtBanMinutes, fmtRemain, fmtUnix } from '../utils';
import BanDialog from './BanDialog.vue';

const { t } = useI18n();
const emit = defineEmits<{ (e: 'changed'): void }>();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';
const pagination = reactive({ total: 0, current: 1, pageSize: 20 });
const searchformData = reactive({ ip: '', source: '', status: 'active' });
const banVisible = ref(false);

// 剩余时间要走动，否则用户盯着看会以为页面卡住了
const tick = ref(0);
let tickTimer: ReturnType<typeof setInterval> | null = null;

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.hostguard.col_ip'), colKey: 'ip', width: 190, ellipsis: true },
  { title: t('page.hostguard.col_source'), colKey: 'source', width: 80 },
  { title: t('page.hostguard.col_level'), colKey: 'level', width: 100 },
  { title: t('page.hostguard.col_duration'), colKey: 'ban_minutes', width: 90 },
  { title: t('page.hostguard.col_remain'), colKey: 'remain', width: 110 },
  { title: t('page.hostguard.col_start'), colKey: 'start_time', width: 170 },
  { title: t('page.hostguard.col_status'), colKey: 'status', width: 90 },
  { title: t('page.hostguard.col_location'), colKey: 'location', width: 160, ellipsis: true },
  { title: t('page.hostguard.col_reason'), colKey: 'reason', width: 300, ellipsis: true },
  { title: t('common.op'), colKey: 'op', width: 210, fixed: 'right' },
]);

function remainText(row: Record<string, any>) {
  // 读一下 tick 让它随秒刷新
  void tick.value;
  if (row.status !== 'active') {
    return '-';
  }
  return fmtRemain(row.expire_time, t('page.hostguard.permanent'), t('page.hostguard.expiring'));
}

function getList() {
  dataLoading.value = true;
  wafHostGuardBanListApi({
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

function onBanDone() {
  getList();
  emit('changed');
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

function handleRelease(row: Record<string, any>) {
  confirmThen(
    t('page.hostguard.confirm_release_title'),
    t('page.hostguard.confirm_release_body', { ip: row.ip }),
    () => wafHostGuardBanReleaseApi({ id: row.id }),
  );
}

function handlePermanent(row: Record<string, any>) {
  confirmThen(
    t('page.hostguard.confirm_permanent_title'),
    t('page.hostguard.confirm_permanent_body', { ip: row.ip }),
    () => wafHostGuardBanPermanentApi({ id: row.id }),
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

onMounted(() => {
  refresh();
  tickTimer = setInterval(() => {
    tick.value += 1;
  }, 1000);
});

onBeforeUnmount(() => {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
});

defineExpose({ refresh });
</script>

<style scoped>
.panel-container {
  padding: 8px 0;
}
.search-form {
  margin-bottom: 16px;
}
.remain-permanent {
  color: #d54941;
  font-weight: 600;
}
.op-disabled {
  color: var(--td-text-color-placeholder);
}
</style>
