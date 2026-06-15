<template>
  <div>
    <t-form ref="searchFormRef" :data="searchForm" layout="inline" :style="{ marginBottom: '8px' }">
      <t-form-item :label="t('page.owasp.rules.file')">
        <t-input v-model="searchForm.file" :placeholder="t('page.owasp.rules.file_ph')" clearable style="width: 220px" />
      </t-form-item>
      <t-form-item :label="t('page.owasp.rules.severity')">
        <t-select v-model="searchForm.severity" clearable style="width: 140px">
          <t-option value="CRITICAL" label="CRITICAL" />
          <t-option value="ERROR" label="ERROR" />
          <t-option value="WARNING" label="WARNING" />
          <t-option value="NOTICE" label="NOTICE" />
        </t-select>
      </t-form-item>
      <t-form-item :label="t('page.owasp.rules.paranoia')">
        <t-select v-model="searchForm.paranoia" clearable style="width: 100px">
          <t-option :value="1" label="1" />
          <t-option :value="2" label="2" />
          <t-option :value="3" label="3" />
          <t-option :value="4" label="4" />
        </t-select>
      </t-form-item>
      <t-form-item :label="t('page.owasp.rules.status')">
        <t-select v-model="searchForm.status" clearable style="width: 140px">
          <t-option value="default" :label="t('page.owasp.rules.status_default')" />
          <t-option value="disabled" :label="t('page.owasp.rules.status_disabled')" />
          <t-option value="modified" :label="t('page.owasp.rules.status_modified')" />
        </t-select>
      </t-form-item>
      <t-form-item>
        <t-input v-model="searchForm.keyword" :placeholder="t('page.owasp.rules.keyword_ph')" clearable style="width: 220px" />
      </t-form-item>
      <t-form-item>
        <t-button theme="primary" @click="getList">{{ t('common.search') }}</t-button>
        <t-button variant="outline" @click="resetSearch">{{ t('common.reset') }}</t-button>
        <t-button variant="outline" theme="warning" @click="onReload">{{ t('page.owasp.rules.reload') }}</t-button>
      </t-form-item>
    </t-form>

    <!-- 我的改动快速筛选区 -->
    <div class="my-changes-bar">
      <span class="my-changes-label">{{ t('page.owasp.rules.my_changes') }}：</span>
      <t-button
        :variant="searchForm.status === 'disabled' ? 'base' : 'outline'"
        theme="danger"
        size="small"
        @click="quickFilter(searchForm.status === 'disabled' ? '' : 'disabled')"
      >
        {{ t('page.owasp.rules.status_disabled') }}
        <t-badge v-if="disabledCount > 0" :count="disabledCount" size="small" style="margin-left: 4px" />
        <span v-else style="margin-left: 4px; opacity: 0.7">0</span>
      </t-button>
      <t-button
        :variant="searchForm.status === 'modified' ? 'base' : 'outline'"
        theme="warning"
        size="small"
        style="margin-left: 8px"
        @click="quickFilter(searchForm.status === 'modified' ? '' : 'modified')"
      >
        {{ t('page.owasp.rules.status_modified') }}
        <t-badge v-if="modifiedCount > 0" :count="modifiedCount" size="small" style="margin-left: 4px" />
        <span v-else style="margin-left: 4px; opacity: 0.7">0</span>
      </t-button>
      <t-button
        v-if="searchForm.status === 'disabled' || searchForm.status === 'modified'"
        variant="text"
        size="small"
        style="margin-left: 8px"
        @click="quickFilter('')"
        >{{ t('page.owasp.rules.show_all') }}</t-button
      >
    </div>

    <t-table
      :columns="columns"
      :data="data"
      row-key="uid"
      :loading="dataLoading"
      :pagination="pagination"
      vertical-align="top"
      hover
      @page-change="onPageChange"
    >
      <template #status="{ row }">
        <t-tag v-if="row.disabled" theme="danger" variant="light">{{ t('page.owasp.rules.status_disabled') }}</t-tag>
        <t-tag v-else-if="row.modified" theme="warning" variant="light">{{ t('page.owasp.rules.status_modified') }}</t-tag>
        <t-tag v-else theme="success" variant="light">{{ t('page.owasp.rules.status_default') }}</t-tag>
      </template>
      <template #severity="{ row }">
        <t-tag :theme="severityTheme(row.severity)" variant="light">{{ row.severity || '-' }}</t-tag>
      </template>
      <template #op="{ row }">
        <a class="t-button-link" @click="onView(row)">{{ t('page.owasp.rules.view') }}</a>
        <a class="t-button-link" @click="onToggle(row)">{{
          row.disabled ? t('page.owasp.rules.enable') : t('page.owasp.rules.disable')
        }}</a>
        <a class="t-button-link" @click="onEdit(row)">{{ t('page.owasp.rules.override') }}</a>
        <a v-if="row.modified || row.disabled" class="t-button-link" @click="onReset(row)">{{ t('page.owasp.rules.reset') }}</a>
      </template>
    </t-table>

    <!-- 查看 / 改写对话框 -->
    <t-dialog v-model:visible="dialogVisible" :header="dialogTitle" :width="860" :footer="false">
      <!-- 字段含义说明 -->
      <t-collapse expand-icon-placement="right" class="rule-glossary">
        <t-collapse-panel :header="t('page.owasp.rules.glossary_title')" value="glossary">
          <ul class="glossary-list">
            <li><b>id</b> {{ t('page.owasp.rules.glossary_id') }}</li>
            <li><b>phase</b> {{ t('page.owasp.rules.glossary_phase') }}</li>
            <li><b>severity</b> {{ t('page.owasp.rules.glossary_severity') }}</li>
            <li><b>paranoia</b> {{ t('page.owasp.rules.glossary_paranoia') }}</li>
            <li><b>tags</b> {{ t('page.owasp.rules.glossary_tags') }}</li>
            <li><b>msg</b> {{ t('page.owasp.rules.glossary_msg') }}</li>
            <li><b>SecRule / SecAction</b> {{ t('page.owasp.rules.glossary_directive') }}</li>
          </ul>
        </t-collapse-panel>
      </t-collapse>

      <!-- 元数据 -->
      <t-descriptions :column="2" size="small" bordered class="rule-meta">
        <t-descriptions-item>
          <template #label>
            <span>{{ t('page.owasp.rules.rule_id') }}</span>
            <t-tooltip :content="t('page.owasp.rules.glossary_id')" placement="top-left">
              <help-circle-icon class="label-icon" />
            </t-tooltip>
          </template>
          <b>{{ editForm.id }}</b>
        </t-descriptions-item>
        <t-descriptions-item>
          <template #label>
            <span>{{ t('page.owasp.rules.directive') }}</span>
            <t-tooltip :content="t('page.owasp.rules.glossary_directive')" placement="top-left">
              <help-circle-icon class="label-icon" />
            </t-tooltip>
          </template>
          {{ editForm.directive || '-' }}
        </t-descriptions-item>
        <t-descriptions-item>
          <template #label>
            <span>{{ t('page.owasp.rules.phase_label') }}</span>
            <t-tooltip :content="t('page.owasp.rules.glossary_phase')" placement="top-left">
              <help-circle-icon class="label-icon" />
            </t-tooltip>
          </template>
          <t-tag v-if="editForm.phase" theme="primary" variant="light">Phase {{ editForm.phase }} - {{ phaseName(editForm.phase) }}</t-tag>
          <span v-else>-</span>
        </t-descriptions-item>
        <t-descriptions-item>
          <template #label>
            <span>{{ t('page.owasp.rules.severity') }}</span>
            <t-tooltip :content="t('page.owasp.rules.glossary_severity')" placement="top-left">
              <help-circle-icon class="label-icon" />
            </t-tooltip>
          </template>
          <t-tag v-if="editForm.severity" :theme="severityTheme(editForm.severity)" variant="light">
            {{ editForm.severity }} (+{{ severityScore(editForm.severity) }})
          </t-tag>
          <span v-else>-</span>
        </t-descriptions-item>
        <t-descriptions-item>
          <template #label>
            <span>{{ t('page.owasp.rules.paranoia') }}</span>
            <t-tooltip :content="t('page.owasp.rules.glossary_paranoia')" placement="top-left">
              <help-circle-icon class="label-icon" />
            </t-tooltip>
          </template>
          <t-tag v-if="editForm.paranoia" theme="warning" variant="light">PL {{ editForm.paranoia }}</t-tag>
          <span v-else>{{ t('page.owasp.rules.paranoia_none') }}</span>
        </t-descriptions-item>
        <t-descriptions-item :label="t('page.owasp.rules.file')">
          <span>{{ editForm.source_file }}</span>
        </t-descriptions-item>
        <t-descriptions-item :span="2" :label="t('page.owasp.rules.message')">
          {{ editForm.message || '-' }}
        </t-descriptions-item>
        <t-descriptions-item :span="2">
          <template #label>
            <span>{{ t('page.owasp.rules.tags') }}</span>
            <t-tooltip :content="t('page.owasp.rules.glossary_tags')" placement="top-left">
              <help-circle-icon class="label-icon" />
            </t-tooltip>
          </template>
          <template v-if="editForm.tags && editForm.tags.length">
            <t-tag v-for="tag in editForm.tags" :key="tag" variant="light" size="small" style="margin: 2px 4px 2px 0">{{ tag }}</t-tag>
          </template>
          <span v-else>-</span>
        </t-descriptions-item>
      </t-descriptions>

      <t-form :data="editForm" :label-width="100" class="rule-form" @submit="onSubmitOverride">
        <!-- CRS tx.* 变量检测提示 -->
        <div v-if="detectedTxVars.length" class="tx-vars-hint">
          <t-alert theme="warning" style="margin-bottom: 8px">
            <template #message>
              <span
                >该规则引用了以下 <b>CRS 事务变量</b>，建议在「<b>调参 → CRS 变量参数</b>」中修改，而非直接改写规则内容（改写规则升级后会被覆盖，变量配置不会）：</span
              >
              <div class="tx-vars-list">
                <t-tag
                  v-for="v in detectedTxVars"
                  :key="v"
                  theme="warning"
                  variant="light"
                  size="small"
                  style="margin: 2px 4px 2px 0; cursor: pointer; font-family: monospace"
                  @click="goToTuningVar(v)"
                  >tx.{{ v }} ↗</t-tag
                >
              </div>
            </template>
          </t-alert>
        </div>
        <t-form-item>
          <template #label>
            <span>{{ t('page.owasp.rules.content') }}</span>
            <t-tooltip :content="t('page.owasp.rules.content_tip')" placement="top-left">
              <help-circle-icon class="label-icon" />
            </t-tooltip>
          </template>
          <t-textarea v-model="editForm.content" :autosize="{ minRows: 8, maxRows: 20 }" :readonly="editMode === 'view'" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="dialogVisible = false">{{ t('common.close') }}</t-button>
          <t-button variant="outline" theme="default" @click="onAiAnalyze">{{ t('page.owasp.rules.ai_analyze') }}</t-button>
          <t-button v-if="editMode === 'edit'" theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- AI 分析预览确认对话框 -->
    <t-dialog
      v-model:visible="aiDialogVisible"
      :header="t('page.owasp.rules.ai_analyze')"
      width="680px"
      :on-confirm="confirmSendAi"
      :on-close="() => (aiDialogVisible = false)"
    >
      <t-alert theme="info" :message="t('page.owasp.rules.ai_analyze_tip')" style="margin-bottom: 10px" />
      <t-textarea v-model="aiPrompt" :autosize="{ minRows: 8, maxRows: 18 }" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';
import { HelpCircleIcon } from 'tdesign-icons-vue-next';

import bus from '@/utils/bus';
import {
  owaspReloadApi,
  owaspRuleDetailApi,
  owaspRuleOverrideApi,
  owaspRuleResetApi,
  owaspRulesListApi,
  owaspRuleToggleApi,
} from '@/apis/owasp';

const props = defineProps({
  initKeyword: {
    type: String,
    default: '',
  },
});

const emit = defineEmits<{
  (e: 'ready'): void;
  (e: 'go-tuning', varName: string): void;
}>();

const { t } = useI18n();
const route = useRoute();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const disabledCount = ref(0);
const modifiedCount = ref(0);
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showJumper: true,
  pageSizeOptions: [20, 50, 100, 200],
});
const searchForm = reactive<Record<string, any>>({
  file: '',
  severity: '',
  paranoia: undefined,
  status: '',
  keyword: '',
});

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.owasp.rules.rule_id'), colKey: 'id', width: 100 },
  { title: t('page.owasp.rules.status'), colKey: 'status', width: 110 },
  { title: t('page.owasp.rules.severity'), colKey: 'severity', width: 110 },
  { title: t('page.owasp.rules.paranoia'), colKey: 'paranoia', width: 80 },
  { title: t('page.owasp.rules.message'), colKey: 'message', ellipsis: true },
  { title: t('page.owasp.rules.file'), colKey: 'file', width: 260, ellipsis: true },
  { title: t('common.op'), colKey: 'op', width: 260, fixed: 'right' },
]);

const dialogVisible = ref(false);
const dialogTitle = ref('');
const editMode = ref<'view' | 'edit'>('view');
const aiDialogVisible = ref(false);
const aiPrompt = ref('');
const editForm = ref<Record<string, any>>({
  id: 0,
  source_file: '',
  content: '',
  directive: '',
  phase: 0,
  severity: '',
  paranoia: 0,
  message: '',
  tags: [] as string[],
});

// 从当前对话框规则内容中提取 %{tx.VAR} 变量（排除纯评分变量）
const detectedTxVars = computed(() => {
  const content = editForm.value.content || '';
  const scoreVars = new Set([
    'inbound_anomaly_score',
    'detection_inbound_anomaly_score',
    'blocking_inbound_anomaly_score',
    'outbound_anomaly_score',
    'critical_anomaly_score',
    'error_anomaly_score',
    'warning_anomaly_score',
    'notice_anomaly_score',
    'inbound_anomaly_score_pl1',
    'inbound_anomaly_score_pl2',
    'inbound_anomaly_score_pl3',
    'inbound_anomaly_score_pl4',
  ]);
  const matches = content.match(/%\{tx\.([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || [];
  const vars = new Set<string>();
  for (const m of matches) {
    const name = m.replace('%{tx.', '').replace('}', '');
    if (!scoreVars.has(name)) vars.add(name);
  }
  return Array.from(vars);
});

onMounted(() => {
  const ruleId = route.query.rule_id as string;
  if (ruleId) {
    searchForm.keyword = ruleId;
  } else if (props.initKeyword) {
    searchForm.keyword = props.initKeyword;
  }
  getList();
  emit('ready');
});

function severityTheme(sev: string) {
  const s = (sev || '').toUpperCase();
  if (s === 'CRITICAL') return 'danger';
  if (s === 'ERROR') return 'warning';
  if (s === 'WARNING') return 'primary';
  return 'default';
}

function severityScore(sev: string): number {
  // CRS 默认: CRITICAL=5, ERROR=4, WARNING=3, NOTICE=2
  const s = (sev || '').toUpperCase();
  if (s === 'CRITICAL') return 5;
  if (s === 'ERROR') return 4;
  if (s === 'WARNING') return 3;
  if (s === 'NOTICE') return 2;
  return 0;
}

function phaseName(p: number): string {
  switch (p) {
    case 1:
      return t('page.owasp.rules.phase_1');
    case 2:
      return t('page.owasp.rules.phase_2');
    case 3:
      return t('page.owasp.rules.phase_3');
    case 4:
      return t('page.owasp.rules.phase_4');
    case 5:
      return t('page.owasp.rules.phase_5');
    default:
      return '-';
  }
}

function getList() {
  dataLoading.value = true;
  const params: Record<string, any> = {
    page_index: pagination.current,
    page_size: pagination.pageSize,
  };
  if (searchForm.file) params.file = searchForm.file;
  if (searchForm.severity) params.severity = searchForm.severity;
  if (searchForm.paranoia) params.paranoia = searchForm.paranoia;
  if (searchForm.status) params.status = searchForm.status;
  if (searchForm.keyword) params.keyword = searchForm.keyword;
  owaspRulesListApi(params)
    .then((res) => {
      if (res.code === 0) {
        const list = res.data.list || [];
        // 同一 ID 的规则可能来自多个文件（chained 或分散声明），这里给每行加 uid 保证 rowKey 唯一。
        data.value = list.map((row: Record<string, any>, idx: number) => ({
          ...row,
          uid: `${row.id}-${row.file}-${row.line_start}-${idx}`,
        }));
        pagination.total = res.data.total || 0;
        // 仅在无 status 过滤时更新全局计数（保证徽标始终准确）
        if (!searchForm.status) {
          disabledCount.value = res.data.disabled_count || 0;
          modifiedCount.value = res.data.modified_count || 0;
        }
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e) => console.log(e))
    .finally(() => {
      dataLoading.value = false;
    });
}

function resetSearch() {
  searchForm.file = '';
  searchForm.severity = '';
  searchForm.paranoia = undefined;
  searchForm.status = '';
  searchForm.keyword = '';
  pagination.current = 1;
  getList();
}

function quickFilter(status: string) {
  searchForm.status = status;
  pagination.current = 1;
  getList();
}

function onPageChange(p: PageInfo) {
  pagination.current = p.current;
  pagination.pageSize = p.pageSize;
  getList();
}

function onReload() {
  owaspReloadApi().then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function onToggle(row: Record<string, any>) {
  owaspRuleToggleApi({ id: row.id, disabled: !row.disabled, source_file: row.file }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function onReset(row: Record<string, any>) {
  owaspRuleResetApi({ id: row.id }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function fillForm(rule: Record<string, any>, override: Record<string, any> | null, mode: 'view' | 'edit') {
  editMode.value = mode;
  editForm.value = {
    id: rule.id,
    source_file: rule.file,
    content: override && override.custom_content ? override.custom_content : rule.raw,
    directive: rule.directive || '',
    phase: rule.phase || 0,
    severity: rule.severity || '',
    paranoia: rule.paranoia || 0,
    message: rule.message || '',
    tags: rule.tags || [],
  };
  const titleKey = mode === 'edit' ? 'page.owasp.rules.override_title' : 'page.owasp.rules.detail_title';
  dialogTitle.value = `${t(titleKey)} (${rule.id})`;
  dialogVisible.value = true;
}

function onView(row: Record<string, any>) {
  owaspRuleDetailApi({ id: row.id }).then((res) => {
    if (res.code !== 0) {
      MessagePlugin.warning(res.msg);
      return;
    }
    fillForm(res.data.rule, res.data.override, 'view');
  });
}

function onEdit(row: Record<string, any>) {
  owaspRuleDetailApi({ id: row.id }).then((res) => {
    if (res.code !== 0) {
      MessagePlugin.warning(res.msg);
      return;
    }
    fillForm(res.data.rule, res.data.override, 'edit');
  });
}

function onAiAnalyze() {
  const f = editForm.value;
  const phaseText = f.phase ? `Phase ${f.phase} - ${phaseName(f.phase)}` : '-';
  const plText = f.paranoia ? `PL${f.paranoia}` : '未指定（任意 PL 都启用）';
  const tagsText = f.tags && f.tags.length ? f.tags.join(', ') : '-';
  // 构建结构化提示词，告知 AI 这是一条 OWASP CRS 规则
  aiPrompt.value = [
    '以下是一条来自 OWASP 核心规则集（CRS, Core Rule Set）的 WAF 规则，请用中文解释：',
    '1. 该规则的防护意图是什么？',
    '2. 它在什么场景/条件下会被触发？',
    '3. 可能导致哪些误报场景，管理员应如何调优？',
    '',
    `规则 ID：${f.id}`,
    `指令类型：${f.directive || 'SecRule'}`,
    `执行阶段：${phaseText}`,
    `严重级别：${f.severity || '-'}`,
    `偏执级别：${plText}`,
    `描述（msg）：${f.message || '-'}`,
    `标签：${tagsText}`,
    `所属文件：${f.source_file || '-'}`,
    '',
    '规则原文：',
    f.content || '-',
  ].join('\n');
  aiDialogVisible.value = true;
}

function confirmSendAi() {
  bus.emit('sendAi', aiPrompt.value);
  aiDialogVisible.value = false;
}

function goToTuningVar(varName: string) {
  // 关闭当前弹窗，切换到调参 tab
  dialogVisible.value = false;
  emit('go-tuning', varName);
}

function onSubmitOverride() {
  owaspRuleOverrideApi({
    id: editForm.value.id,
    source_file: editForm.value.source_file,
    content: editForm.value.content,
  }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      dialogVisible.value = false;
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}
</script>

<style scoped>
.t-button-link + .t-button-link {
  margin-left: 8px;
}

.my-changes-bar {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: var(--td-bg-color-secondarycontainer);
  border-radius: var(--td-radius-medium);
  border: 1px solid var(--td-component-border);
}

.my-changes-label {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  margin-right: 8px;
  white-space: nowrap;
}

.tx-vars-hint {
  margin-bottom: 4px;
}

.tx-vars-list {
  margin-top: 6px;
}

.label-icon {
  margin-left: 4px;
  color: var(--td-text-color-placeholder);
  cursor: help;
  vertical-align: -2px;
}

.rule-glossary {
  margin-bottom: 12px;
}

.glossary-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.9;
  color: var(--td-text-color-secondary);
  font-size: 13px;
}

.rule-meta {
  margin-bottom: 16px;
}

.rule-form {
  margin-top: 8px;
}
</style>
