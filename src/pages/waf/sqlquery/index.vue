<template>
  <div>
    <t-card class="list-card-container">
      <t-tabs v-model="activeTab" @change="handleTabChange">
        <!-- ── SQL 查询 Tab ─────────────────────────────────────────────────── -->
        <t-tab-panel value="query" :label="t('page.sql_query.tab_query')">
          <div style="padding-top: 16px">
            <t-form :label-width="120">
              <t-row :gutter="16">
                <t-col :span="6">
                  <t-form-item :label="t('page.sql_query.db_type')">
                    <t-select v-model="dbType" :style="{ width: '100%' }">
                      <t-option value="local" :label="t('page.sql_query.db_type_local')"></t-option>
                      <t-option value="log" :label="t('page.sql_query.db_type_log')"></t-option>
                      <t-option value="stats" :label="t('page.sql_query.db_type_stats')"></t-option>
                    </t-select>
                  </t-form-item>
                </t-col>
              </t-row>

              <t-row :gutter="16" style="margin-top: 16px">
                <t-col :span="6">
                  <t-form-item :label="t('page.sql_query.sql_input')">
                    <t-textarea
                      v-model="sqlQuery"
                      :placeholder="t('page.sql_query.sql_placeholder')"
                      :autosize="{ minRows: 5, maxRows: 10 }"
                      :style="{ width: '100%' }"
                      class="sql-textarea"
                    />
                  </t-form-item>
                </t-col>
              </t-row>

              <t-row style="margin-top: 16px">
                <t-col>
                  <t-button theme="primary" :loading="queryLoading" @click="executeQuery">
                    {{ t('page.sql_query.execute_query') }}
                  </t-button>
                </t-col>
              </t-row>
            </t-form>

            <t-divider style="margin-top: 24px; margin-bottom: 24px"></t-divider>

            <div v-if="queryResult.columns.length > 0">
              <h3>{{ t('page.sql_query.query_result') }}</h3>
              <p style="margin-bottom: 16px; color: #666">
                {{ t('page.sql_query.total_records', { count: queryResult.total }) }}
              </p>
              <t-table
                :columns="queryColumns"
                :data="queryResult.data"
                row-key="__idx"
                vertical-align="top"
                hover
                :pagination="pagination"
                :loading="queryLoading"
                :max-height="600"
                @page-change="rehandlePageChange"
              />
            </div>
            <div v-else-if="!queryLoading && hasQueried" style="text-align: center; padding: 40px">
              <t-empty :description="t('page.sql_query.no_result')" />
            </div>
          </div>
        </t-tab-panel>

        <!-- ── 数据库结构 Tab ───────────────────────────────────────────────── -->
        <t-tab-panel value="structure" :label="t('page.sql_query.tab_structure')">
          <div style="padding-top: 16px">
            <!-- 工具栏 -->
            <t-row :gutter="12" style="margin-bottom: 16px">
              <t-col :span="6">
                <t-select v-model="structDbType" :style="{ width: '100%' }" @change="loadTableInfo">
                  <t-option value="local" :label="t('page.sql_query.db_type_local')"></t-option>
                  <t-option value="log" :label="t('page.sql_query.db_type_log')"></t-option>
                  <t-option value="stats" :label="t('page.sql_query.db_type_stats')"></t-option>
                </t-select>
              </t-col>
              <t-col :span="3">
                <t-button theme="default" :loading="structLoading" @click="loadTableInfo">
                  {{ t('page.sql_query.structure_refresh') }}
                </t-button>
              </t-col>
            </t-row>

            <!-- 汇总统计 -->
            <t-row v-if="tableInfoList.length > 0" :gutter="16" style="margin-bottom: 16px">
              <t-col :span="6">
                <t-card class="stat-card" :bordered="true">
                  <div class="stat-item">
                    <span class="stat-label">{{ t('page.sql_query.structure_total_tables') }}</span>
                    <span class="stat-value">{{ tableInfoList.length }}</span>
                  </div>
                </t-card>
              </t-col>
              <t-col :span="6">
                <t-card class="stat-card" :bordered="true">
                  <div class="stat-item">
                    <span class="stat-label">{{ t('page.sql_query.structure_total_rows') }}</span>
                    <span class="stat-value">{{ totalRows.toLocaleString() }}</span>
                  </div>
                </t-card>
              </t-col>
            </t-row>

            <!-- 表格列表（默认按行数倒序） -->
            <t-table
              :data="sortedTableInfoList"
              :columns="structTableCols"
              row-key="table_name"
              :sort="structSort"
              :loading="structLoading"
              hover
              bordered
              size="medium"
              :empty="t('page.sql_query.structure_no_tables')"
              @sort-change="handleStructSortChange"
            >
              <template #row_count="{ row }">
                <span>{{ Number(row.row_count).toLocaleString() }}</span>
              </template>
              <template #action="{ row }">
                <t-space size="small">
                  <t-button theme="primary" variant="text" size="small" @click="queryTop100(row)">
                    {{ t('page.sql_query.structure_query_top100') }}
                  </t-button>
                  <t-button theme="default" variant="text" size="small" @click="showDetail(row)">
                    {{ t('page.sql_query.structure_detail') }}
                  </t-button>
                </t-space>
              </template>
            </t-table>
          </div>
        </t-tab-panel>
      </t-tabs>
    </t-card>

    <!-- 详情弹窗 -->
    <t-dialog
      v-model:visible="detailVisible"
      :header="detailTable ? detailTable.table_name : ''"
      :footer="false"
      width="860px"
      :close-on-overlay-click="true"
    >
      <div v-if="detailTable" class="detail-content">
        <!-- 基本信息 -->
        <t-space style="margin-bottom: 16px">
          <t-tag theme="primary" variant="light">
            {{ t('page.sql_query.structure_row_count') }}: {{ detailTable.row_count.toLocaleString() }}
          </t-tag>
          <t-tag theme="default" variant="light">
            {{ t('page.sql_query.structure_col_count') }}: {{ (detailTable.columns || []).length }}
          </t-tag>
          <t-tag theme="default" variant="light">
            {{ t('page.sql_query.structure_idx_count') }}: {{ (detailTable.indexes || []).length }}
          </t-tag>
        </t-space>

        <!-- 字段信息 -->
        <h4 class="detail-subtitle">{{ t('page.sql_query.structure_columns') }}</h4>
        <t-table
          :data="detailTable.columns || []"
          :columns="columnInfoCols"
          row-key="cid"
          size="small"
          bordered
          hover
          style="margin-bottom: 20px"
        >
          <template #not_null="{ row }">
            <t-tag v-if="row.not_null" theme="warning" variant="light" size="small">{{ t('page.sql_query.structure_yes') }}</t-tag>
            <span v-else style="color: #bbb">-</span>
          </template>
          <template #default_val="{ row }">
            <span v-if="row.default_val">{{ row.default_val }}</span>
            <span v-else style="color: #bbb">NULL</span>
          </template>
          <template #primary_key="{ row }">
            <t-tag v-if="row.primary_key" theme="success" variant="light" size="small">PK</t-tag>
            <span v-else style="color: #bbb">-</span>
          </template>
        </t-table>

        <!-- 索引信息 -->
        <template v-if="detailTable.indexes && detailTable.indexes.length > 0">
          <h4 class="detail-subtitle">{{ t('page.sql_query.structure_indexes') }}</h4>
          <t-table :data="flattenIndexes(detailTable.indexes)" :columns="indexInfoCols" row-key="_key" size="small" bordered hover>
            <template #unique="{ row }">
              <t-tag v-if="row.unique" theme="success" variant="light" size="small">{{ t('page.sql_query.structure_yes') }}</t-tag>
              <span v-else style="color: #bbb">-</span>
            </template>
          </t-table>
        </template>
        <t-empty v-else :description="t('page.sql_query.structure_no_indexes')" style="padding: 12px 0" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import { sql_query_execute_api, sql_query_table_info_api } from '@/apis/sqlquery';

const { t } = useI18n();

const activeTab = ref('query');

// ── SQL 查询 ──────────────────────────────────────────────────────────
const dbType = ref('local');
const sqlQuery = ref('');
const queryLoading = ref(false);
const hasQueried = ref(false);
const queryResult = ref<{ columns: string[]; data: Record<string, any>[]; total: number }>({
  columns: [],
  data: [],
  total: 0,
});
const queryColumns = ref<any[]>([]);
const pagination = reactive({ total: 0, current: 1, pageSize: 50 });
const allData = ref<Record<string, any>[]>([]);

// ── 数据库结构 ────────────────────────────────────────────────────────
const structDbType = ref('local');
const structLoading = ref(false);
const tableInfoList = ref<Record<string, any>[]>([]);
// 默认按行数倒序
const structSort = ref<{ sortBy: string; descending: boolean }>({ sortBy: 'row_count', descending: true });

// 详情弹窗
const detailVisible = ref(false);
const detailTable = ref<Record<string, any> | null>(null);

const totalRows = computed(() => tableInfoList.value.reduce((s, item) => s + (item.row_count || 0), 0));

// 手动排序（col_count / idx_count 已作为真实字段预计算好）
const sortedTableInfoList = computed(() => {
  const list = [...tableInfoList.value];
  const { sortBy, descending } = structSort.value;
  if (!sortBy) return list;
  return list.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return descending ? bVal - aVal : aVal - bVal;
    }
    const cmp = String(aVal || '').localeCompare(String(bVal || ''));
    return descending ? -cmp : cmp;
  });
});

const structTableCols = computed<TableProps['columns']>(() => [
  { colKey: 'table_name', title: t('page.sql_query.structure_table_name'), ellipsis: true, sorter: true },
  { colKey: 'row_count', title: t('page.sql_query.structure_row_count'), width: 140, sorter: true },
  { colKey: 'col_count', title: t('page.sql_query.structure_col_count'), width: 100, sorter: true },
  { colKey: 'idx_count', title: t('page.sql_query.structure_idx_count'), width: 100, sorter: true },
  { colKey: 'action', title: t('page.sql_query.structure_action'), width: 160 },
]);

const columnInfoCols = computed<TableProps['columns']>(() => [
  { colKey: 'cid', title: t('page.sql_query.structure_col_cid'), width: 60 },
  { colKey: 'name', title: t('page.sql_query.structure_col_name'), width: 180 },
  { colKey: 'type', title: t('page.sql_query.structure_col_type'), width: 140 },
  { colKey: 'not_null', title: t('page.sql_query.structure_col_not_null'), width: 80 },
  { colKey: 'default_val', title: t('page.sql_query.structure_col_default'), width: 140 },
  { colKey: 'primary_key', title: t('page.sql_query.structure_col_pk'), width: 80 },
]);

const indexInfoCols = computed<TableProps['columns']>(() => [
  { colKey: 'name', title: t('page.sql_query.structure_idx_name'), ellipsis: true },
  { colKey: 'unique', title: t('page.sql_query.structure_idx_unique'), width: 80 },
  { colKey: 'origin', title: t('page.sql_query.structure_idx_origin'), width: 80 },
  { colKey: 'columns', title: t('page.sql_query.structure_idx_columns') },
]);

onMounted(() => {
  loadTableInfo();
});

function handleTabChange(val: any) {
  if (val === 'structure' && tableInfoList.value.length === 0) {
    loadTableInfo();
  }
}

// ── SQL 查询 ──────────────────────────────────────────────────────────────
async function executeQuery() {
  if (!sqlQuery.value.trim()) {
    MessagePlugin.warning('请输入SQL查询语句');
    return;
  }
  queryLoading.value = true;
  hasQueried.value = true;
  try {
    const res = await sql_query_execute_api({ db_type: dbType.value, sql: sqlQuery.value, limit: 1000 });
    if (res.code === 0) {
      const result = res.data;
      const rows = (result.data || []).map((r: Record<string, any>, i: number) => ({ ...r, __idx: i }));
      allData.value = rows;
      queryResult.value = { columns: result.columns || [], data: rows.slice(0, pagination.pageSize), total: result.total || 0 };
      pagination.total = result.total || 0;
      pagination.current = 1;
      buildQueryColumns(result.columns || []);
      MessagePlugin.success(t('page.sql_query.query_success'));
    } else {
      MessagePlugin.error(res.msg || t('page.sql_query.query_failed'));
      queryResult.value = { columns: [], data: [], total: 0 };
    }
  } catch (error) {
    MessagePlugin.error(t('page.sql_query.query_failed'));
    queryResult.value = { columns: [], data: [], total: 0 };
  } finally {
    queryLoading.value = false;
  }
}

function buildQueryColumns(columnNames: string[]) {
  queryColumns.value = columnNames.map((col) => ({
    title: col,
    colKey: col,
    ellipsis: true,
    width: 200,
    cell: (_h: any, { row }: { row: Record<string, any> }) => {
      const v = row[col];
      return v === null || v === undefined ? h('span', { style: { color: '#ccc' } }, 'NULL') : h('span', String(v));
    },
  }));
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  const start = (pagination.current - 1) * pagination.pageSize;
  queryResult.value.data = allData.value.slice(start, start + pagination.pageSize);
}

// ── 数据库结构 ────────────────────────────────────────────────────────────
async function loadTableInfo() {
  structLoading.value = true;
  try {
    const res = await sql_query_table_info_api({ db_type: structDbType.value });
    if (res.code === 0) {
      // 把虚拟字段预计算为真实字段，让排序能正确识别
      tableInfoList.value = (res.data.tables || []).map((item: Record<string, any>) => ({
        ...item,
        col_count: (item.columns || []).length,
        idx_count: (item.indexes || []).length,
      }));
    } else {
      MessagePlugin.error(res.msg || t('page.sql_query.structure_load_failed'));
    }
  } catch {
    MessagePlugin.error(t('page.sql_query.structure_load_failed'));
  } finally {
    structLoading.value = false;
  }
}

function handleStructSortChange(sortInfo: any) {
  if (sortInfo) {
    structSort.value = { sortBy: sortInfo.sortBy, descending: sortInfo.descending };
  }
}

function showDetail(row: Record<string, any>) {
  detailTable.value = row;
  detailVisible.value = true;
}

async function queryTop100(row: Record<string, any>) {
  // 同步 db 类型到查询 Tab，填入 SQL，切换到查询 Tab 后执行
  dbType.value = structDbType.value;
  sqlQuery.value = `SELECT * FROM ${row.table_name} LIMIT 100`;
  activeTab.value = 'query';
  // 等待 DOM 更新后再执行，避免 Tab 切换动画干扰
  await nextTick();
  executeQuery();
}

function flattenIndexes(indexes: Record<string, any>[]) {
  return (indexes || []).map((idx, i) => ({
    _key: i,
    name: idx.name,
    unique: idx.unique,
    origin: idx.origin || '-',
    columns:
      (idx.columns || [])
        .map((c: Record<string, any>) => c.name)
        .filter(Boolean)
        .join(', ') || '-',
  }));
}
</script>

<style scoped>
.list-card-container {
  padding: 24px;
}

.stat-card :deep(.t-card__body) {
  padding: 12px 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item .stat-label {
  font-size: 12px;
  color: var(--td-text-color-secondary, #888);
}

.stat-item .stat-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--td-text-color-primary, #333);
}

.detail-content .detail-subtitle {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary, #333);
  padding-left: 8px;
  border-left: 3px solid var(--td-brand-color, #0052d9);
}

.sql-textarea :deep(.t-textarea__inner) {
  font-family: 'Courier New', monospace;
}
</style>
