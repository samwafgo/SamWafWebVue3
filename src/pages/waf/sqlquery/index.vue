<template>
  <div>
    <t-card class="list-card-container">
      <t-tabs v-model="activeTab" @change="handleTabChange">
        <!-- ── 结构化查询 Tab ───────────────────────────────────────────────── -->
        <t-tab-panel value="query" :label="t('page.sql_query.tab_query')">
          <div style="padding-top: 16px">
            <t-alert theme="info" :message="t('page.sql_query.query_tip')" style="margin-bottom: 16px" />

            <t-form :label-width="90">
              <t-row :gutter="16">
                <t-col :span="4">
                  <t-form-item :label="t('page.sql_query.db_type')">
                    <t-select v-model="dbType" :style="{ width: '100%' }" @change="onDbTypeChange">
                      <t-option value="local" :label="t('page.sql_query.db_type_local')"></t-option>
                      <t-option value="log" :label="t('page.sql_query.db_type_log')"></t-option>
                      <t-option value="stats" :label="t('page.sql_query.db_type_stats')"></t-option>
                    </t-select>
                  </t-form-item>
                </t-col>
                <t-col :span="4">
                  <t-form-item :label="t('page.sql_query.query_mode')">
                    <t-radio-group v-model="mode" variant="default-filled">
                      <t-radio-button value="list">{{ t('page.sql_query.mode_list') }}</t-radio-button>
                      <t-radio-button value="count">{{ t('page.sql_query.mode_count') }}</t-radio-button>
                    </t-radio-group>
                  </t-form-item>
                </t-col>
              </t-row>

              <t-row :gutter="16" style="margin-top: 8px">
                <t-col :span="4">
                  <t-form-item :label="t('page.sql_query.table_label')">
                    <t-select
                      v-model="selectedTable"
                      filterable
                      :loading="schemaLoading"
                      :placeholder="t('page.sql_query.table_placeholder')"
                      :style="{ width: '100%' }"
                      @change="onTableChange"
                    >
                      <t-option v-for="tbl in queryableTables" :key="tbl.table_name" :value="tbl.table_name" :label="tbl.table_name"></t-option>
                    </t-select>
                  </t-form-item>
                </t-col>
                <t-col v-if="mode === 'list'" :span="8">
                  <t-form-item :label="t('page.sql_query.columns_label')">
                    <t-select
                      v-model="selectedColumns"
                      multiple
                      filterable
                      :min-collapsed-num="4"
                      :disabled="!selectedTable"
                      :placeholder="t('page.sql_query.columns_placeholder')"
                      :style="{ width: '100%' }"
                    >
                      <t-option v-for="c in currentTableColumns" :key="c.name" :value="c.name" :label="`${c.name} (${c.type})`"></t-option>
                    </t-select>
                  </t-form-item>
                </t-col>
              </t-row>

              <!-- 条件构造器 -->
              <t-form-item :label="t('page.sql_query.filters_label')">
                <div style="width: 100%">
                  <div v-for="(f, i) in filters" :key="i" class="filter-row">
                    <t-select
                      v-model="f.column"
                      filterable
                      :disabled="!selectedTable"
                      :placeholder="t('page.sql_query.filter_column')"
                      style="width: 220px"
                    >
                      <t-option v-for="c in currentTableColumns" :key="c.name" :value="c.name" :label="c.name"></t-option>
                    </t-select>
                    <t-select v-model="f.op" style="width: 110px">
                      <t-option v-for="op in opOptions" :key="op" :value="op" :label="op"></t-option>
                    </t-select>
                    <t-input
                      v-model="f.value"
                      :placeholder="f.op === 'in' ? t('page.sql_query.filter_in_placeholder') : t('page.sql_query.filter_value_placeholder')"
                      style="width: 260px"
                    />
                    <t-button theme="danger" variant="text" @click="removeFilter(i)">✕</t-button>
                  </div>
                  <t-button theme="default" variant="dashed" :disabled="!selectedTable" @click="addFilter">
                    + {{ t('page.sql_query.filter_add') }}
                  </t-button>
                </div>
              </t-form-item>

              <t-row v-if="mode === 'list'" :gutter="16">
                <t-col :span="4">
                  <t-form-item :label="t('page.sql_query.top_label')">
                    <t-input-number v-model="top" :min="1" :max="1000" theme="normal" :style="{ width: '100%' }" />
                  </t-form-item>
                </t-col>
              </t-row>

              <t-row style="margin-top: 8px">
                <t-col>
                  <t-button theme="primary" :loading="queryLoading" @click="executeQuery">
                    {{ t('page.sql_query.execute_query') }}
                  </t-button>
                </t-col>
              </t-row>
            </t-form>

            <t-divider style="margin-top: 24px; margin-bottom: 24px"></t-divider>

            <!-- 计数结果 -->
            <div v-if="queryResult.mode === 'count' && hasQueried && !queryLoading">
              <h3>{{ t('page.sql_query.count_result') }}</h3>
              <p class="count-value">{{ t('page.sql_query.count_value', { count: queryResult.total }) }}</p>
            </div>

            <!-- 列表结果 -->
            <div v-else-if="queryResult.columns.length > 0">
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

import { sql_query_execute_api, sql_query_queryable_api, sql_query_table_info_api } from '@/apis/sqlquery';

const { t } = useI18n();

const activeTab = ref('query');

// ── 结构化查询 ────────────────────────────────────────────────────────
const dbType = ref('local');
const mode = ref('list'); // list | count
const queryableTables = ref<Record<string, any>[]>([]); // [{ table_name, columns:[{name,type}] }]
const schemaLoading = ref(false);
const selectedTable = ref('');
const selectedColumns = ref<string[]>([]);
const filters = ref<Record<string, any>[]>([]); // [{ column, op, value }]
const top = ref(100);
const opOptions = ['=', '!=', '>', '>=', '<', '<=', 'like', 'in'];

const queryLoading = ref(false);
const hasQueried = ref(false);
const queryResult = ref<{ mode: string; columns: string[]; data: Record<string, any>[]; total: number }>({
  mode: 'list',
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

// 当前所选表的可见列
const currentTableColumns = computed<Record<string, any>[]>(() => {
  const tbl = queryableTables.value.find((x) => x.table_name === selectedTable.value);
  return tbl ? tbl.columns || [] : [];
});

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
  loadQueryableSchema();
  loadTableInfo();
});

function handleTabChange(val: any) {
  if (val === 'structure' && tableInfoList.value.length === 0) {
    loadTableInfo();
  }
}

// ── 结构化查询 ────────────────────────────────────────────────────────────
async function loadQueryableSchema() {
  schemaLoading.value = true;
  try {
    const res = await sql_query_queryable_api({ db_type: dbType.value });
    if (res.code === 0) {
      queryableTables.value = res.data.tables || [];
      // 当前所选表已不在可查列表则清空
      if (selectedTable.value && !queryableTables.value.find((tbl) => tbl.table_name === selectedTable.value)) {
        selectedTable.value = '';
        selectedColumns.value = [];
        filters.value = [];
      }
    } else {
      MessagePlugin.error(res.msg || t('page.sql_query.structure_load_failed'));
    }
  } catch {
    MessagePlugin.error(t('page.sql_query.structure_load_failed'));
  } finally {
    schemaLoading.value = false;
  }
}

function onDbTypeChange() {
  selectedTable.value = '';
  selectedColumns.value = [];
  filters.value = [];
  loadQueryableSchema();
}

function onTableChange() {
  // 换表后列/条件失效，清空重来
  selectedColumns.value = [];
  filters.value = [];
}

function addFilter() {
  filters.value.push({ column: '', op: '=', value: '' });
}

function removeFilter(i: number) {
  filters.value.splice(i, 1);
}

// 组装结构化条件：跳过未选列；in 运算符按英文逗号拆成数组
function buildFilters() {
  return filters.value
    .filter((f) => f.column)
    .map((f) => {
      if (f.op === 'in') {
        const arr = String(f.value ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s !== '');
        return { column: f.column, op: f.op, value: arr };
      }
      return { column: f.column, op: f.op, value: f.value };
    });
}

async function executeQuery() {
  if (!selectedTable.value) {
    MessagePlugin.warning(t('page.sql_query.select_table_first'));
    return;
  }
  queryLoading.value = true;
  hasQueried.value = true;
  try {
    const payload: Record<string, any> = {
      db_type: dbType.value,
      table: selectedTable.value,
      mode: mode.value,
      filters: buildFilters(),
    };
    if (mode.value === 'list') {
      payload.columns = selectedColumns.value;
      payload.top = top.value;
    }
    const res = await sql_query_execute_api(payload);
    if (res.code === 0) {
      const result = res.data;
      if (result.mode === 'count') {
        queryResult.value = { mode: 'count', columns: [], data: [], total: result.total || 0 };
        queryColumns.value = [];
      } else {
        const rows = (result.data || []).map((r: Record<string, any>, i: number) => ({ ...r, __idx: i }));
        allData.value = rows;
        queryResult.value = { mode: 'list', columns: result.columns || [], data: rows.slice(0, pagination.pageSize), total: result.total || 0 };
        pagination.total = result.total || 0;
        pagination.current = 1;
        buildQueryColumns(result.columns || []);
      }
      MessagePlugin.success(t('page.sql_query.query_success'));
    } else {
      MessagePlugin.error(res.msg || t('page.sql_query.query_failed'));
      queryResult.value = { mode: mode.value, columns: [], data: [], total: 0 };
    }
  } catch (error) {
    MessagePlugin.error(t('page.sql_query.query_failed'));
    queryResult.value = { mode: mode.value, columns: [], data: [], total: 0 };
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

// 结构页「查询Top100」：同步库类型 → 载入可查结构 → 结构化 list 查询该表前 100 行
async function queryTop100(row: Record<string, any>) {
  dbType.value = structDbType.value;
  await loadQueryableSchema();
  mode.value = 'list';
  selectedTable.value = row.table_name;
  selectedColumns.value = [];
  filters.value = [];
  top.value = 100;
  activeTab.value = 'query';
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

.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.count-value {
  margin: 12px 0 8px;
  font-size: 26px;
  line-height: 1.6;
  font-weight: 600;
  color: var(--td-brand-color, #0052d9);
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
</style>
