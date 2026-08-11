<template>
  <span>
    <t-button variant="outline" size="small" @click="open()">{{ t('page.threatip.exclude.entry_btn') }}</t-button>

    <t-dialog
      v-model:visible="visible"
      :header="t('page.threatip.exclude.title')"
      :width="900"
      :footer="false"
      @closed="onClosed"
    >
      <t-alert theme="info" size="small" :style="{ marginBottom: '12px' }">
        <template #message>
          <div>{{ t('page.threatip.exclude.intro') }}</div>
          <div class="tie-note">{{ t('page.threatip.exclude.intro_direction') }}</div>
        </template>
      </t-alert>

      <t-tabs v-model="tab">
        <!-- 排除名单 -->
        <t-tab-panel value="list" :label="t('page.threatip.exclude.tab_list')">
          <div class="tie-bar">
            <t-input
              v-model="form.entry"
              :style="{ width: '220px' }"
              :placeholder="t('page.threatip.exclude.entry_placeholder')"
              clearable
              @change="onEntryChange"
            />
            <t-input
              v-model="form.remarks"
              :style="{ width: '280px' }"
              :placeholder="t('page.threatip.exclude.remarks_placeholder')"
              clearable
            />
            <t-button theme="primary" :loading="adding" @click="onAdd">{{ t('common.new') }}</t-button>
            <span class="tie-spacer"></span>
            <t-select
              v-model="query.source"
              :style="{ width: '140px' }"
              clearable
              :placeholder="t('page.threatip.exclude.filter_source')"
              @change="reload"
            >
              <t-option value="manual" :label="t('page.threatip.exclude.source_manual')" />
              <t-option value="auto" :label="t('page.threatip.exclude.source_auto')" />
            </t-select>
          </div>

          <!-- 试算结果：加之前就告诉用户会不会生效。
               最容易踩的坑是排除 1.2.3.4 而快照里其实是 1.2.3.0/24——小的排不掉大的 -->
          <t-alert v-if="preview" :theme="previewTheme" size="small" :style="{ marginBottom: '10px' }">
            <template #message>{{ previewText }}</template>
          </t-alert>

          <t-table
            :columns="columns"
            :data="rows"
            row-key="id"
            size="small"
            vertical-align="top"
            hover
            :loading="loading"
            :pagination="pagination"
            @page-change="onPageChange"
          >
            <template #source="{ row }">
              <t-tag v-if="row.source === 'auto'" theme="warning" variant="light" size="small">
                {{ t('page.threatip.exclude.source_auto') }}
              </t-tag>
              <t-tag v-else theme="primary" variant="light" size="small">
                {{ t('page.threatip.exclude.source_manual') }}
              </t-tag>
              <span v-if="row.reason" class="tie-reason">{{ row.reason }}</span>
            </template>
            <template #hit_count="{ row }">
              <span v-if="row.hit_count > 0">{{ row.hit_count }}</span>
              <!-- hit_count=0 是最有价值的一列：说明这条排除写了但没匹配到任何情报条目 -->
              <t-tooltip v-else :content="t('page.threatip.exclude.no_hit_tip')">
                <t-tag theme="default" variant="light" size="small">{{ t('page.threatip.exclude.no_hit') }}</t-tag>
              </t-tooltip>
            </template>
            <template #enable="{ row }">
              <t-switch
                :value="row.enable"
                :custom-value="[1, 0]"
                size="small"
                @change="(v: number) => onToggle(row, v)"
              />
            </template>
            <template #op="{ row }">
              <a class="t-button-link" @click="onDel(row)">{{ t('common.delete') }}</a>
            </template>
          </t-table>
        </t-tab-panel>

        <!-- 内置排除规则：不落库，但确实在生效。
             不列出来的话，用户会看到"已排除6条"却在排除名单里一条也找不到 -->
        <t-tab-panel value="builtin" :label="t('page.threatip.exclude.tab_builtin')">
          <div class="tie-note" :style="{ margin: '10px 0' }">{{ t('page.threatip.exclude.builtin_note') }}</div>
          <t-table
            :columns="builtinColumns"
            :data="builtinRows"
            row-key="entry"
            size="small"
            vertical-align="top"
            hover
            :loading="builtinLoading"
          >
            <template #entry="{ row }">
              <code class="tie-code">{{ row.entry }}</code>
            </template>
            <template #reason="{ row }">
              <t-tag theme="warning" variant="light" size="small">{{ row.reason }}</t-tag>
            </template>
          </t-table>
        </t-tab-panel>

        <!-- 操作审计 -->
        <t-tab-panel value="audit" :label="t('page.threatip.exclude.tab_audit')">
          <div class="tie-note" :style="{ margin: '10px 0' }">{{ t('page.threatip.exclude.audit_note') }}</div>
          <t-table
            :columns="auditColumns"
            :data="auditRows"
            row-key="id"
            size="small"
            vertical-align="top"
            hover
            :loading="auditLoading"
            :pagination="auditPagination"
            @page-change="onAuditPageChange"
          >
            <template #action="{ row }">
              <t-tag :theme="actionTheme(row.action)" variant="light" size="small">{{ actionText(row.action) }}</t-tag>
            </template>
          </t-table>
        </t-tab-panel>
      </t-tabs>
    </t-dialog>

    <t-dialog
      v-model:visible="delVisible"
      :header="t('common.confirm_delete')"
      :body="delBody"
      @confirm="onConfirmDel"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';
import {
  wafThreatIPExcludeListApi,
  wafThreatIPExcludeAddApi,
  wafThreatIPExcludeEditApi,
  wafThreatIPExcludeDelApi,
  wafThreatIPExcludePreviewApi,
  wafThreatIPExcludeAuditApi,
  wafThreatIPExcludeBuiltinApi,
} from '@/apis/threatip';

const { t } = useI18n();
const emit = defineEmits<{ (e: 'changed'): void }>();

const visible = ref(false);
const tab = ref('list');
const loading = ref(false);
const adding = ref(false);
const rows = ref<Record<string, any>[]>([]);
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const query = reactive({ source: '' });
const form = reactive({ entry: '', remarks: '' });
const preview = ref<Record<string, any> | null>(null);

const auditLoading = ref(false);
const auditRows = ref<Record<string, any>[]>([]);
const auditPagination = reactive({ total: 0, current: 1, pageSize: 10 });

const builtinLoading = ref(false);
const builtinRows = ref<Record<string, any>[]>([]);
const builtinColumns = computed<TableProps['columns']>(() => [
  { title: t('page.threatip.exclude.col_entry'), colKey: 'entry', width: 220 },
  { title: t('page.threatip.exclude.col_builtin_reason'), colKey: 'reason' },
]);

function loadBuiltin() {
  builtinLoading.value = true;
  wafThreatIPExcludeBuiltinApi()
    .then((res) => {
      if (res.code === 0) builtinRows.value = res.data ?? [];
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      builtinLoading.value = false;
    });
}

const delVisible = ref(false);
const delRow = ref<Record<string, any> | null>(null);
const delBody = computed(() =>
  delRow.value ? t('page.threatip.exclude.del_warning', { entry: delRow.value.entry }) : '',
);

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.threatip.exclude.col_entry'), colKey: 'entry', width: 160, ellipsis: true },
  { title: t('page.threatip.exclude.col_source'), colKey: 'source', width: 170 },
  { title: t('page.threatip.exclude.col_hit'), colKey: 'hit_count', width: 110 },
  { title: t('common.remarks'), colKey: 'remarks', ellipsis: true },
  { title: t('page.threatip.exclude.col_enable'), colKey: 'enable', width: 80 },
  { title: t('common.op'), colKey: 'op', width: 80 },
]);

const auditColumns = computed<TableProps['columns']>(() => [
  { title: t('page.threatip.exclude.col_action'), colKey: 'action', width: 90 },
  { title: t('page.threatip.exclude.col_entry'), colKey: 'entry', width: 150, ellipsis: true },
  { title: t('page.threatip.exclude.col_operator'), colKey: 'operator', width: 110, ellipsis: true },
  { title: t('page.threatip.exclude.col_operator_ip'), colKey: 'operator_ip', width: 130, ellipsis: true },
  { title: t('page.threatip.exclude.col_affected'), colKey: 'affected_items', width: 90 },
  { title: t('page.threatip.exclude.col_time'), colKey: 'create_time', width: 165 },
  { title: t('common.remarks'), colKey: 'remarks', ellipsis: true },
]);

const previewTheme = computed(() => (preview.value && preview.value.affected_items > 0 ? 'success' : 'warning'));
const previewText = computed(() => {
  const p = preview.value;
  if (!p) return '';
  if (p.affected_items > 0) {
    return t('page.threatip.exclude.preview_hit', {
      chans: p.affected_chans,
      items: p.affected_items,
      names: (p.channel_names || []).join('、'),
    });
  }
  // 没匹配到时把「你其实该排哪个段」直接说出来，光说"未匹配"用户不知道下一步怎么办
  if (p.covering_entry) return t('page.threatip.exclude.preview_covering', { seg: p.covering_entry });
  return t('page.threatip.exclude.preview_none');
});

function reload() {
  loading.value = true;
  wafThreatIPExcludeListApi({
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
    source: query.source || '',
    entry: '',
  })
    .then((res) => {
      if (res.code === 0) {
        rows.value = res.data.list ?? [];
        pagination.total = res.data.total;
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      loading.value = false;
    });
}

function loadAudit() {
  auditLoading.value = true;
  wafThreatIPExcludeAuditApi({
    pageIndex: auditPagination.current,
    pageSize: auditPagination.pageSize,
    entry: '',
    action: '',
  })
    .then((res) => {
      if (res.code === 0) {
        auditRows.value = res.data.list ?? [];
        auditPagination.total = res.data.total;
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      auditLoading.value = false;
    });
}

// entry 有值时用于从 IP 归属查询「排除此项」跳过来：带着实际命中的那条原文预填
function open(entry?: string, remarks?: string) {
  form.entry = entry ?? '';
  form.remarks = remarks ?? '';
  preview.value = null;
  visible.value = true;
  tab.value = 'list';
  reload();
  loadAudit();
  loadBuiltin();
  if (form.entry) onEntryChange();
}
defineExpose({ open });

function onClosed() {
  preview.value = null;
  form.entry = '';
  form.remarks = '';
  // 排除会改动防火墙落地，关掉面板后让父页刷新一次条数
  emit('changed');
}

function onPageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  pagination.pageSize = pageInfo.pageSize;
  reload();
}

function onAuditPageChange(pageInfo: PageInfo) {
  auditPagination.current = pageInfo.current;
  auditPagination.pageSize = pageInfo.pageSize;
  loadAudit();
}

// 输完就试算，用户在点「新增」之前就知道这条会不会生效
function onEntryChange() {
  const entry = (form.entry || '').trim();
  preview.value = null;
  if (!entry) return;
  wafThreatIPExcludePreviewApi({ entry })
    .then((res) => {
      if (res.code === 0) preview.value = res.data;
    })
    .catch((e: Error) => console.log(e));
}

function onAdd() {
  const entry = (form.entry || '').trim();
  if (!entry) {
    MessagePlugin.warning(t('page.threatip.exclude.entry_required'));
    return;
  }
  adding.value = true;
  wafThreatIPExcludeAddApi({ entry, remarks: form.remarks || '' })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        form.entry = '';
        form.remarks = '';
        preview.value = null;
        reload();
        loadAudit();
        emit('changed');
      } else {
        MessagePlugin.error(res.msg);
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      adding.value = false;
    });
}

function onToggle(row: Record<string, any>, v: number) {
  wafThreatIPExcludeEditApi({ id: row.id, remarks: row.remarks || '', enable: v })
    .then((res) => {
      if (res.code === 0) MessagePlugin.success(res.msg);
      else MessagePlugin.error(res.msg);
      reload();
      loadAudit();
      emit('changed');
    })
    .catch((e: Error) => console.log(e));
}

// 删除等于把这个地址交还给威胁情报，必须让用户明确知道后果
function onDel(row: Record<string, any>) {
  delRow.value = row;
  delVisible.value = true;
}

function onConfirmDel() {
  if (!delRow.value) return;
  wafThreatIPExcludeDelApi({ id: delRow.value.id })
    .then((res) => {
      if (res.code === 0) MessagePlugin.success(res.msg);
      else MessagePlugin.error(res.msg);
      delVisible.value = false;
      delRow.value = null;
      reload();
      loadAudit();
      emit('changed');
    })
    .catch((e: Error) => console.log(e));
}

function actionText(a: string) {
  return t('page.threatip.exclude.action_' + a) || a;
}
function actionTheme(a: string) {
  if (a === 'add' || a === 'enable') return 'success';
  if (a === 'del' || a === 'disable') return 'danger';
  return 'default';
}
</script>

<style scoped>
.tie-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
}
.tie-spacer {
  flex: 1;
}
.tie-note {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  line-height: 1.7;
}
.tie-reason {
  margin-left: 6px;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}
.tie-code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 2px;
  background: var(--td-bg-color-secondarycontainer);
  color: var(--td-text-color-secondary);
}
</style>
