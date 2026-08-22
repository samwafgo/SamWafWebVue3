<template>
  <div>
    <t-alert
      v-if="summary.downgrade"
      theme="error"
      class="downgrade-alert"
      :message="summary.downgrade_msg"
      close
      @close="handleDowngradeAck"
    />

    <t-card class="list-card-container">
      <t-alert theme="info" class="range-alert">
        <template #message>
          <span v-if="summary.from_version">
            {{ t('page.upgrade_notice.range_tip', { from: summary.from_version, to: summary.to_version }) }}
          </span>
          <span v-else>
            {{ t('page.upgrade_notice.range_tip_unknown', { current: summary.current_version }) }}
          </span>
        </template>
      </t-alert>

      <t-tabs v-model="status" @change="onSearch">
        <t-tab-panel value="pending" :label="`${t('page.upgrade_notice.tab_pending')} (${summary.pending_count})`" />
        <t-tab-panel value="done" :label="t('page.upgrade_notice.tab_done')" />
        <t-tab-panel value="all" :label="`${t('page.upgrade_notice.tab_all')} (${summary.total_count})`" />
      </t-tabs>

      <div class="filter-bar">
        <t-select v-model="kind" class="filter-select" @change="onSearch">
          <t-option value="" :label="t('page.upgrade_notice.filter_kind_all')" />
          <t-option value="notice" :label="t('page.upgrade_notice.kind_notice')" />
          <t-option value="action" :label="t('page.upgrade_notice.kind_action')" />
          <t-option value="check" :label="t('page.upgrade_notice.kind_check')" />
        </t-select>
        <t-select v-model="version" class="filter-select" @change="onSearch">
          <t-option value="" :label="t('page.upgrade_notice.filter_version_all')" />
          <t-option v-for="v in versionOptions" :key="v" :value="v" :label="v" />
        </t-select>
        <t-button theme="default" @click="loadAll">{{ t('common.refresh') }}</t-button>
      </div>

      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          row-key="notice_id"
          vertical-align="top"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          :expanded-row-keys="expandedRowKeys"
          expand-on-row-click
          @expand-change="onExpandChange"
          @page-change="rehandlePageChange"
        >
          <template #title="slotProps">
            <span class="notice-title" :class="{ 'notice-title--done': slotProps.row.status !== 'pending' }">
              {{ slotProps.row.title }}
            </span>
            <t-tag v-if="slotProps.row.level === 'high'" theme="danger" variant="light" size="small" class="level-tag">
              {{ t('page.upgrade_notice.level_high') }}
            </t-tag>
          </template>

          <template #kind="slotProps">
            <t-tag :theme="kindTheme(slotProps.row.kind)" variant="light">{{ kindLabel(slotProps.row.kind) }}</t-tag>
          </template>

          <template #status="slotProps">
            <t-tag v-if="slotProps.row.status === 'pending'" theme="warning" variant="light">
              {{ t('page.upgrade_notice.status_pending') }}
            </t-tag>
            <t-tag v-else-if="slotProps.row.status === 'done'" theme="success" variant="light">
              {{ t('page.upgrade_notice.status_done') }}
            </t-tag>
            <t-tag v-else theme="default" variant="light">{{ t('page.upgrade_notice.status_ignored') }}</t-tag>
          </template>

          <template #op="slotProps">
            <template v-if="slotProps.row.status === 'pending'">
              <t-button
                v-if="slotProps.row.page"
                size="small"
                variant="outline"
                @click.stop="goSetting(slotProps.row)"
              >
                {{ t('page.upgrade_notice.op_goto') }}
              </t-button>
              <t-link theme="primary" class="op-link" @click.stop="setStatus(slotProps.row, 'ack')">
                {{ t('page.upgrade_notice.op_ack') }}
              </t-link>
              <t-link theme="default" class="op-link" @click.stop="setStatus(slotProps.row, 'ignore')">
                {{ t('page.upgrade_notice.op_ignore') }}
              </t-link>
            </template>
            <template v-else>
              <span class="applied-info">{{ slotProps.row.applied_time }} {{ slotProps.row.applied_user }}</span>
              <t-link theme="primary" class="op-link" @click.stop="setStatus(slotProps.row, 'restore')">
                {{ t('page.upgrade_notice.op_restore') }}
              </t-link>
            </template>
          </template>

          <template #expandedRow="slotProps">
            <div class="notice-detail">
              <div class="detail-block">
                <div class="detail-head">{{ t('page.upgrade_notice.detail_what') }}</div>
                <div class="detail-text">{{ slotProps.row.detail }}</div>
              </div>

              <div v-if="slotProps.row.effect_on || slotProps.row.effect_off" class="detail-block">
                <div class="detail-head">{{ t('page.upgrade_notice.detail_effect') }}</div>
                <div class="detail-diff">
                  <div class="diff-col diff-col--on">
                    <b>{{ t('page.upgrade_notice.detail_effect_on') }}</b>
                    <span>{{ slotProps.row.effect_on || '-' }}</span>
                  </div>
                  <div class="diff-col diff-col--off">
                    <b>{{ t('page.upgrade_notice.detail_effect_off') }}</b>
                    <span>{{ slotProps.row.effect_off || '-' }}</span>
                  </div>
                </div>
              </div>

              <div v-if="slotProps.row.revert" class="detail-block">
                <div class="detail-head">{{ t('page.upgrade_notice.detail_revert') }}</div>
                <div class="detail-revert">{{ slotProps.row.revert }}</div>
              </div>

              <div class="detail-links">
                <a v-if="slotProps.row.page" class="detail-link" @click="goSetting(slotProps.row)">
                  {{ t('page.upgrade_notice.op_goto') }} ({{ slotProps.row.page }})
                </a>
                <a v-if="slotProps.row.doc" class="detail-link" @click="openDoc(slotProps.row.doc)">
                  {{ t('page.upgrade_notice.op_doc') }}
                </a>
                <span class="detail-meta">{{ slotProps.row.notice_id }} · {{ slotProps.row.version }}</span>
              </div>
            </div>
          </template>
        </t-table>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import {
  upgrade_notice_downgrade_ack_api,
  upgrade_notice_list_api,
  upgrade_notice_status_api,
  upgrade_notice_summary_api,
} from '@/apis/upgrade_notice';

const { t } = useI18n();
const router = useRouter();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const status = ref('pending');
const kind = ref('');
const version = ref('');
const versionOptions = ref<string[]>([]);
const expandedRowKeys = ref<Array<string | number>>([]);

const summary = reactive({
  current_version: '',
  from_version: '',
  to_version: '',
  pending_count: 0,
  total_count: 0,
  high_pending_count: 0,
  downgrade: false,
  downgrade_msg: '',
});

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.upgrade_notice.col_title'), colKey: 'title', align: 'left', minWidth: 320 },
  { title: t('page.upgrade_notice.col_kind'), colKey: 'kind', width: 110 },
  { title: t('page.upgrade_notice.col_version'), colKey: 'version', width: 130 },
  { title: t('page.upgrade_notice.col_status'), colKey: 'status', width: 100 },
  { title: t('page.upgrade_notice.col_op'), colKey: 'op', width: 250 },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

function lang() {
  return localStorage.getItem('lang') || 'zh_CN';
}

onMounted(() => {
  loadAll();
});

function loadAll() {
  loadSummary();
  getList();
}

function loadSummary() {
  upgrade_notice_summary_api({ lang: lang() })
    .then((res) => {
      if (res.code === 0 && res.data) {
        Object.assign(summary, res.data);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 确认降级告警：同一个"历史最高版本"此后不再提示，最高版本再变高会重新出现
function handleDowngradeAck() {
  summary.downgrade = false;
  upgrade_notice_downgrade_ack_api().catch((e: Error) => {
    console.log(e);
  });
}

function getList() {
  dataLoading.value = true;
  upgrade_notice_list_api({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    status: status.value === 'all' ? '' : status.value,
    kind: kind.value,
    version: version.value,
    lang: lang(),
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
        collectVersions();
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

// 版本下拉只从当前结果里收集，不额外开接口；已选中的版本始终保留在选项里
function collectVersions() {
  const set = new Set(versionOptions.value);
  data.value.forEach((row) => set.add(row.version));
  if (version.value) set.add(version.value);
  versionOptions.value = Array.from(set).sort().reverse();
}

function onSearch() {
  pagination.current = 1;
  expandedRowKeys.value = [];
  getList();
}

function onExpandChange(value: Array<string | number>) {
  expandedRowKeys.value = value;
}

function kindLabel(k: string) {
  return t(`page.upgrade_notice.kind_${k}`);
}

function kindTheme(k: string) {
  if (k === 'action') return 'primary';
  if (k === 'check') return 'warning';
  return 'default';
}

function goSetting(row: Record<string, any>) {
  // 只允许站内相对路径，清单侧也做了同样的校验
  if (!row.page || !String(row.page).startsWith('/')) return;
  router.push(row.page);
}

function openDoc(doc: string) {
  window.open(doc, '_blank');
}

function setStatus(row: Record<string, any>, action: 'ack' | 'ignore' | 'restore') {
  upgrade_notice_status_api(action, row.notice_id)
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        loadAll();
      } else {
        MessagePlugin.error(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
  getList();
}
</script>

<style scoped>
.downgrade-alert {
  margin-bottom: 16px;
}

.range-alert {
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin: 16px 0;
}

.filter-select {
  width: 160px;
}

.notice-title {
  font-weight: 500;
}

.notice-title--done {
  color: var(--td-text-color-placeholder);
  text-decoration: line-through;
}

.level-tag {
  margin-left: 6px;
}

.op-link {
  margin-left: 10px;
}

.applied-info {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}

.notice-detail {
  padding: 4px 8px 12px;
}

.detail-block {
  margin-bottom: 12px;
}

.detail-head {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-bottom: 4px;
}

.detail-text {
  line-height: 1.7;
}

.detail-diff {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.diff-col {
  flex: 1;
  min-width: 260px;
  padding: 10px 12px;
  border-radius: 3px;
  line-height: 1.7;
}

.diff-col b {
  display: block;
  margin-bottom: 2px;
}

.diff-col--on {
  background: var(--td-success-color-1);
  border-left: 3px solid var(--td-success-color);
}

.diff-col--on b {
  color: var(--td-success-color);
}

.diff-col--off {
  background: var(--td-bg-color-secondarycontainer);
  border-left: 3px solid var(--td-component-border);
}

.detail-revert {
  background: var(--td-warning-color-1);
  border-left: 3px solid var(--td-warning-color);
  border-radius: 3px;
  padding: 10px 12px;
  line-height: 1.7;
}

.detail-links {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.detail-link {
  color: var(--td-brand-color);
  cursor: pointer;
}

.detail-meta {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}
</style>
