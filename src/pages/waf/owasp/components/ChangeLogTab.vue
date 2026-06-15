<template>
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px">
      <t-alert theme="info" :message="t('page.owasp.changelog.hint')" style="flex: 1; margin-right: 12px" />
      <t-button variant="outline" @click="loadData">{{ t('page.owasp.changelog.refresh') }}</t-button>
    </div>

    <t-table
      :columns="columns"
      :data="entries"
      row-key="uid"
      :loading="loading"
      :empty="t('page.owasp.changelog.empty')"
      :pagination="pagination"
      vertical-align="top"
      hover
      @page-change="onPageChange"
    >
      <template #time="{ row }">
        <span>{{ formatTime(row.time) }}</span>
      </template>
      <template #action="{ row }">
        <t-tag :theme="actionTheme(row.action)" variant="light" size="small">
          {{ actionLabel(row.action) }}
        </t-tag>
      </template>
      <template #rule_id="{ row }">
        <span v-if="row.rule_id">
          <a class="rule-link" @click="goToRule(row.rule_id)">{{ row.rule_id }}</a>
        </span>
        <span v-else style="color: var(--td-text-color-placeholder)">-</span>
      </template>
      <template #source_file="{ row }">
        <t-tooltip v-if="row.source_file" :content="row.source_file" placement="top">
          <span class="file-cell">{{ shortFile(row.source_file) }}</span>
        </t-tooltip>
        <span v-else style="color: var(--td-text-color-placeholder)">-</span>
      </template>
    </t-table>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import { owaspAuditLogApi } from '@/apis/owasp';

const emit = defineEmits<{
  (e: 'go-rule', ruleId: number): void;
}>();

const { t } = useI18n();

const loading = ref(false);
const allEntries = ref<Record<string, any>[]>([]);
const entries = ref<Record<string, any>[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showJumper: true,
  pageSizeOptions: [20, 50, 100],
});

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.owasp.changelog.col_time'), colKey: 'time', width: 180 },
  { title: t('page.owasp.changelog.col_action'), colKey: 'action', width: 100 },
  { title: t('page.owasp.changelog.col_rule_id'), colKey: 'rule_id', width: 110 },
  { title: t('page.owasp.changelog.col_source_file'), colKey: 'source_file', ellipsis: true },
  { title: t('page.owasp.changelog.col_note'), colKey: 'note', ellipsis: true },
]);

onMounted(() => {
  loadData();
});

function loadData() {
  loading.value = true;
  owaspAuditLogApi()
    .then((res) => {
      if (res.code === 0 && res.data) {
        const list = (res.data.entries || []).map((entry: Record<string, any>, i: number) => ({ ...entry, uid: i }));
        allEntries.value = list;
        pagination.total = list.length;
        pagination.current = 1;
        updatePage();
      } else {
        MessagePlugin.warning(res.msg || '加载失败');
      }
    })
    .catch(() => {
      MessagePlugin.error('请求失败');
    })
    .finally(() => {
      loading.value = false;
    });
}

function updatePage() {
  const { current, pageSize } = pagination;
  const start = (current - 1) * pageSize;
  entries.value = allEntries.value.slice(start, start + pageSize);
}

function onPageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  pagination.pageSize = pageInfo.pageSize;
  updatePage();
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    disabled: t('page.owasp.changelog.action_disabled'),
    enabled: t('page.owasp.changelog.action_enabled'),
    modified: t('page.owasp.changelog.action_modified'),
    reset: t('page.owasp.changelog.action_reset'),
    tuning: t('page.owasp.changelog.action_tuning'),
  };
  return map[action] || action;
}

function actionTheme(action: string) {
  if (action === 'disabled') return 'danger';
  if (action === 'enabled') return 'success';
  if (action === 'modified') return 'warning';
  if (action === 'reset') return 'default';
  if (action === 'tuning') return 'primary';
  return 'default';
}

function formatTime(time: string): string {
  if (!time) return '-';
  try {
    return new Date(time).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return time;
  }
}

function shortFile(f: string): string {
  if (!f) return '-';
  const parts = f.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || f;
}

function goToRule(ruleId: number) {
  emit('go-rule', ruleId);
}
</script>

<style scoped>
.rule-link {
  color: var(--td-brand-color);
  cursor: pointer;
  text-decoration: none;
}

.rule-link:hover {
  text-decoration: underline;
}

.file-cell {
  font-family: monospace;
  font-size: 12px;
  cursor: help;
}
</style>
