<template>
  <div>
    <t-table
      :data="list"
      :columns="columns"
      row-key="id"
      size="small"
      :loading="loading"
      :pagination="pagination"
      @page-change="handlePageChange"
    >
      <template #create_time="{ row }">
        <span>{{ (row.create_time || '').toString().slice(0, 19) }}</span>
      </template>
      <template #changes="{ row }">
        <template v-if="parseChanges(row.changes).length > 0">
          <div v-for="(c, i) in parseChanges(row.changes)" :key="i" style="font-size: 12px; line-height: 1.6">
            <span style="color: #666">{{ c.label }}：</span>
            <span v-if="c.old" style="text-decoration: line-through; color: #999; margin-right: 4px">{{ truncate(c.old) }}</span>
            <span style="color: #0052d9">{{ truncate(c.new || c.old) }}</span>
          </div>
        </template>
        <span v-else style="color: #999">—</span>
      </template>
    </t-table>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import { wafAppChangeLogsApi } from '@/apis/application';

const props = defineProps({
  appCode: { type: String, default: '' },
});

const loading = ref(false);
const list = ref<Record<string, any>[]>([]);
const pagination = reactive({ total: 0, pageSize: 10, current: 1 });

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'create_time', title: '时间', width: 160 },
  { colKey: 'op_type', title: '操作', width: 70 },
  { colKey: 'operator', title: '操作者', width: 100 },
  { colKey: 'operator_ip', title: 'IP', width: 130 },
  { colKey: 'changes', title: '变更内容' },
]);

watch(
  () => props.appCode,
  (v) => {
    if (v) loadList();
  },
);

onMounted(() => {
  if (props.appCode) loadList();
});

function loadList() {
  loading.value = true;
  wafAppChangeLogsApi({
    code: props.appCode,
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
  })
    .then((res) => {
      if (res && res.code === 0) {
        list.value = res.data.list || [];
        pagination.total = res.data.total || 0;
      }
    })
    .finally(() => {
      loading.value = false;
    });
}

function handlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
  loadList();
}

function parseChanges(str: string): Record<string, any>[] {
  try {
    return JSON.parse(str) || [];
  } catch {
    return [];
  }
}

function truncate(s: string, len = 40): string {
  if (!s) return '';
  return s.length > len ? `${s.slice(0, len)}…` : s;
}
</script>
