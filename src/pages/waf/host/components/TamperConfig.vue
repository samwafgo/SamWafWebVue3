<template>
  <div class="tamper-config">
    <t-alert theme="info" :message="t('page.host.tamper.intro')" style="margin-bottom: 16px" />

    <!-- 站点级开关 -->
    <t-form-item :label="t('page.host.tamper.is_enable')">
      <t-radio-group v-model="local.is_enable" @change="updateParent">
        <t-radio value="0">{{ t('page.host.tamper.disable') }}</t-radio>
        <t-radio value="1">{{ t('page.host.tamper.enable') }}</t-radio>
      </t-radio-group>
      <t-button size="small" variant="outline" style="margin-left: 12px" @click="applyRecommended">
        {{ t('page.host.tamper.recommended') }}
      </t-button>
    </t-form-item>
    <t-form-item :label="t('page.host.tamper.action')">
      <t-tooltip :content="t('page.host.tamper.action_tips')" placement="top" :overlay-style="{ width: '340px' }" show-arrow>
        <t-select v-model="local.action" :style="{ width: '280px' }" @change="updateParent">
          <t-option value="replace" :label="t('page.host.tamper.action_replace')" />
          <t-option value="alert" :label="t('page.host.tamper.action_alert')" />
        </t-select>
      </t-tooltip>
    </t-form-item>
    <t-form-item :label="t('page.host.tamper.max_size_kb')">
      <t-tooltip :content="t('page.host.tamper.max_size_kb_tips')" placement="top" :overlay-style="{ width: '320px' }" show-arrow>
        <t-input-number v-model="local.max_size_kb" :min="1" :style="{ width: '180px' }" @change="updateParent" />
      </t-tooltip>
    </t-form-item>

    <t-divider align="left">{{ t('page.host.tamper.protected_urls') }}</t-divider>

    <template v-if="propHostCode">
      <div style="margin-bottom: 8px">
        <t-button size="small" @click="handleAdd">{{ t('page.host.tamper.add_url') }}</t-button>
        <t-button size="small" theme="primary" variant="outline" style="margin-left: 8px" @click="openExtract">{{ t('page.host.tamper.extract_urls') }}</t-button>
        <t-button size="small" variant="outline" style="margin-left: 8px" :disabled="selectedRowKeys.length === 0" @click="handleRelearnBatch">{{ t('page.host.tamper.relearn_selected') }}</t-button>
        <t-button size="small" variant="outline" style="margin-left: 8px" @click="handleRelearnAll">{{ t('page.host.tamper.relearn_all') }}</t-button>
        <t-button size="small" theme="danger" variant="outline" style="margin-left: 8px" :disabled="selectedRowKeys.length === 0" @click="handleDelBatch">{{ t('page.host.tamper.del_selected') }}</t-button>
        <t-button size="small" variant="outline" style="margin-left: 8px" @click="getList">{{ t('common.refresh') }}</t-button>
      </div>
      <t-table :columns="columns" :data="data" row-key="id" :loading="dataLoading" size="small" :pagination="pagination"
               :max-height="360" :sort="sort" :filter-value="filterValue"
               :selected-row-keys="selectedRowKeys" @select-change="onSelectChange"
               @sort-change="onSortChange" @filter-change="onFilterChange" @page-change="onPageChange">
        <template #is_enable="{ row }">
          <t-tag :theme="row.is_enable === 1 ? 'success' : 'default'" variant="light">
            {{ row.is_enable === 1 ? t('common.on') : t('common.off') }}
          </t-tag>
        </template>
        <template #ignore_query="{ row }">
          <span>{{ row.ignore_query === 1 ? t('common.yes') : t('common.no') }}</span>
        </template>
        <template #baseline_status="{ row }">
          <t-tag :theme="statusTheme(row.baseline_status)" variant="light">{{ statusLabel(row.baseline_status) }}</t-tag>
        </template>
        <template #content_size="{ row }">
          <span>{{ formatSize(row.content_size) }}</span>
        </template>
        <template #op="slotProps">
          <a class="t-button-link" @click="handleViewBaseline(slotProps)">{{ t('page.host.tamper.view_baseline') }}</a>
          <a class="t-button-link" @click="handleRelearn(slotProps)">{{ t('page.host.tamper.relearn') }}</a>
          <a class="t-button-link" @click="handleEdit(slotProps)">{{ t('common.edit') }}</a>
          <a class="t-button-link" @click="handleDelete(slotProps)">{{ t('common.delete') }}</a>
        </template>
      </t-table>
    </template>
    <t-alert v-else theme="warning" :message="t('page.host.tamper.save_host_first')" />

    <!-- 新增/编辑规则弹窗 -->
    <t-dialog v-model:visible="formVisible" :header="editMode ? t('common.edit') : t('common.new')" :width="640" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="120" @submit="onSubmit">
        <t-form-item :label="t('page.host.tamper.url')" name="url">
          <div>
            <t-input v-model="formData.url" :style="{ width: '440px' }" :placeholder="t('page.host.tamper.url_placeholder')" />
            <div class="form-item-tips">{{ t('page.host.tamper.url_tips') }}</div>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.host.tamper.rule_name')" name="rule_name">
          <t-input v-model="formData.rule_name" :style="{ width: '440px' }" />
        </t-form-item>
        <t-form-item :label="t('page.host.tamper.rule_enable')" name="is_enable">
          <t-radio-group v-model="formData.is_enable">
            <t-radio value="1">{{ t('common.on') }}</t-radio>
            <t-radio value="0">{{ t('common.off') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('page.host.tamper.ignore_query')" name="ignore_query">
          <t-tooltip :content="t('page.host.tamper.ignore_query_tips')" placement="top" :overlay-style="{ width: '340px' }" show-arrow>
            <t-radio-group v-model="formData.ignore_query">
              <t-radio value="1">{{ t('common.yes') }}</t-radio>
              <t-radio value="0">{{ t('common.no') }}</t-radio>
            </t-radio-group>
          </t-tooltip>
        </t-form-item>
        <t-form-item :label="t('page.host.tamper.remarks')" name="remarks">
          <t-input v-model="formData.remarks" :style="{ width: '440px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="formVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 删除确认 -->
    <t-dialog v-model:visible="confirmVisible" :header="t('common.confirm_delete')" :body="t('common.data_delete_warning')" @confirm="onConfirmDelete" />

    <!-- 查看基线弹窗 -->
    <t-dialog v-model:visible="baselineVisible" :header="t('page.host.tamper.baseline_detail')" :width="760" :footer="false">
      <div v-if="baselineData">
        <t-descriptions :column="2" size="small" bordered style="margin-bottom: 12px">
          <t-descriptions-item :label="t('page.host.tamper.col_content_type')">{{ baselineData.content_type || '-' }}</t-descriptions-item>
          <t-descriptions-item :label="t('page.host.tamper.col_size')">{{ formatSize(baselineData.content_size) }}</t-descriptions-item>
          <t-descriptions-item :label="t('page.host.tamper.col_hash')"><span style="word-break: break-all">{{ baselineData.baseline_hash || '-' }}</span></t-descriptions-item>
          <t-descriptions-item :label="t('page.host.tamper.col_learn_time')">{{ baselineData.last_learn_time || '-' }}</t-descriptions-item>
        </t-descriptions>
        <div style="margin-bottom: 8px">
          <t-button size="small" variant="outline" @click="downloadBaseline">{{ t('page.host.tamper.download_baseline') }}</t-button>
        </div>
        <template v-if="baselineData.is_text">
          <pre class="baseline-pre">{{ displayBaselineText }}</pre>
          <a v-if="baselineData.content && baselineData.content.length > 300" class="t-button-link" @click="baselineExpanded = !baselineExpanded">
            {{ baselineExpanded ? t('page.host.tamper.collapse') : t('page.host.tamper.expand') }}
          </a>
        </template>
        <template v-else-if="isImage(baselineData.content_type) && baselineData.content_base64">
          <img :src="imageDataUrl" style="max-width: 100%; border: 1px solid #eee" />
        </template>
        <t-alert v-else theme="info" :message="t('page.host.tamper.binary_hint')" />
      </div>
    </t-dialog>

    <!-- 从页面提取URL弹窗 -->
    <t-dialog v-model:visible="extractVisible" :header="t('page.host.tamper.extract_title')" :width="720" :footer="false">
      <div>
        <t-alert theme="info" :message="t('page.host.tamper.extract_hint')" style="margin-bottom: 12px" />
        <div style="display: flex; gap: 8px; margin-bottom: 12px">
          <t-select v-model="extractDomain" :style="{ width: '220px' }" :placeholder="t('page.host.tamper.extract_domain')">
            <t-option v-for="d in domainOptions" :key="d" :value="d" :label="d" />
          </t-select>
          <t-input v-model="extractPageUrl" :placeholder="t('page.host.tamper.extract_placeholder')" style="flex: 1" @enter="doExtract" />
          <t-button theme="primary" :loading="extractLoading" @click="doExtract">{{ t('page.host.tamper.extract_btn') }}</t-button>
        </div>
        <template v-if="extractResult.length > 0">
          <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
            <span>{{ t('page.host.tamper.extract_found', { n: extractResult.length }) }}</span>
            <t-checkbox v-model="extractIgnoreQuery">{{ t('page.host.tamper.ignore_query') }}</t-checkbox>
            <t-button size="small" theme="primary" :disabled="extractSelected.length === 0" @click="doAddBatch">
              {{ t('page.host.tamper.add_selected', { n: extractSelected.length }) }}
            </t-button>
          </div>
          <t-table :columns="extractColumns" :data="extractResult" row-key="url" size="small" max-height="360"
                   :selected-row-keys="extractSelected" @select-change="onExtractSelectChange">
            <template #type="{ row }">
              <t-tag size="small" variant="light" :theme="typeTheme(row.type)">{{ row.type }}</t-tag>
            </template>
          </t-table>
        </template>
        <t-alert v-else-if="extractDone" theme="warning" :message="t('page.host.tamper.extract_empty')" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import {
  wafTamperRuleListApi,
  wafTamperRuleAddApi,
  wafTamperRuleEditApi,
  wafTamperRuleDelApi,
  wafTamperRuleDetailApi,
  wafTamperRuleRelearnApi,
  wafTamperRuleBaselineApi,
  wafTamperRuleRelearnBatchApi,
  wafTamperRuleExtractApi,
  wafTamperRuleAddBatchApi,
  wafTamperRuleDelBatchApi,
} from '@/apis/tamper_rule';

const INITIAL_RULE = {
  id: '',
  host_code: '',
  url: '',
  rule_name: '',
  is_enable: '1',
  ignore_query: '1',
  remarks: '',
};

const props = defineProps<{ tamperConfig: Record<string, any>; propHostCode?: string; propHost?: string; propBindMoreHost?: string }>();
const emit = defineEmits<{ (e: 'update', config: Record<string, any>): void }>();

const { t } = useI18n();

const local = ref<Record<string, any>>(JSON.parse(JSON.stringify(props.tamperConfig)));

const data = ref<Record<string, any>[]>([]);
const dataLoading = ref(false);
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const sort = ref<any>(undefined);
const filterValue = ref<Record<string, any>>({});
const formVisible = ref(false);
const editMode = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_RULE });
const confirmVisible = ref(false);
const deleteIdx = ref(-1);
const baselineVisible = ref(false);
const baselineData = ref<Record<string, any> | null>(null);
const baselineExpanded = ref(false);

// 提取URL弹窗
const selectedRowKeys = ref<(string | number)[]>([]);
const extractVisible = ref(false);
const extractDomain = ref('');
const extractPageUrl = ref('/');
const extractLoading = ref(false);
const extractDone = ref(false);
const extractResult = ref<Record<string, any>[]>([]);
const extractSelected = ref<(string | number)[]>([]);
const extractIgnoreQuery = ref(true);

const rules: FormProps['rules'] = {
  url: [{ required: true, message: t('page.host.tamper.url_placeholder'), type: 'error' }],
};

const extractColumns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 40 },
  { title: t('page.host.tamper.url'), colKey: 'url', ellipsis: true },
  { title: t('page.host.tamper.col_type'), colKey: 'type', width: 90 },
]);

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 40 },
  { title: t('page.host.tamper.url'), colKey: 'url', width: 200, ellipsis: true, sorter: true, filter: { type: 'input' } },
  { title: t('page.host.tamper.rule_name'), colKey: 'rule_name', width: 130, ellipsis: true, sorter: true, filter: { type: 'input' } },
  {
    title: t('page.host.tamper.rule_enable'), colKey: 'is_enable', width: 90, sorter: true,
    filter: { type: 'single', list: [{ label: t('common.on'), value: 1 }, { label: t('common.off'), value: 0 }] },
  },
  {
    title: t('page.host.tamper.ignore_query'), colKey: 'ignore_query', width: 100, sorter: true,
    filter: { type: 'single', list: [{ label: t('common.yes'), value: 1 }, { label: t('common.no'), value: 0 }] },
  },
  {
    title: t('page.host.tamper.baseline_status'), colKey: 'baseline_status', width: 110, sorter: true,
    filter: { type: 'single', list: [{ label: t('page.host.tamper.status_unlearned'), value: 0 }, { label: t('page.host.tamper.status_learned'), value: 1 }, { label: t('page.host.tamper.status_failed'), value: 2 }] },
  },
  { title: t('page.host.tamper.col_size'), colKey: 'content_size', width: 90, sorter: true },
  { title: t('page.host.tamper.tamper_count'), colKey: 'tamper_count', width: 90, sorter: true },
  { align: 'left', fixed: 'right', width: 220, colKey: 'op', title: t('common.op') },
]);

const domainOptions = computed<string[]>(() => {
  const list: string[] = [];
  if (props.propHost) list.push(props.propHost.trim());
  (props.propBindMoreHost || '').split('\n').forEach((line) => {
    const d = line.trim();
    if (d && !list.includes(d)) list.push(d);
  });
  return list;
});

const displayBaselineText = computed(() => {
  const c = (baselineData.value && baselineData.value.content) || '';
  if (baselineExpanded.value || c.length <= 300) return c;
  return `${c.substring(0, 300)} ...`;
});

const imageDataUrl = computed(() => {
  if (!baselineData.value) return '';
  return `data:${baselineData.value.content_type || 'image/png'};base64,${baselineData.value.content_base64}`;
});

watch(
  () => props.tamperConfig,
  (newVal) => {
    local.value = JSON.parse(JSON.stringify(newVal));
  },
  { deep: true },
);

watch(
  () => props.propHostCode,
  (newVal) => {
    if (newVal) getList();
  },
);

onMounted(() => {
  if (props.propHostCode) getList();
});

function updateParent() {
  emit('update', { ...local.value });
}
function applyRecommended() {
  local.value = { is_enable: '1', action: 'replace', max_size_kb: 1024 };
  updateParent();
}
function statusLabel(s: number) {
  const map: Record<string, string> = {
    0: t('page.host.tamper.status_unlearned'),
    1: t('page.host.tamper.status_learned'),
    2: t('page.host.tamper.status_failed'),
  };
  return map[String(s)] || String(s);
}
function statusTheme(s: number) {
  const map: Record<string, string> = { 0: 'warning', 1: 'success', 2: 'danger' };
  return (map[String(s)] || 'default') as 'warning' | 'success' | 'danger' | 'default';
}
function isImage(ct: string) {
  return typeof ct === 'string' && ct.toLowerCase().indexOf('image/') === 0;
}
function formatSize(n: number) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(2)} MB`;
}
function buildListParams() {
  const params: Record<string, any> = {
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    host_code: props.propHostCode,
  };
  if (sort.value && sort.value.sortBy) {
    params.order_key = sort.value.sortBy;
    params.order_dir = sort.value.descending ? 'desc' : 'asc';
  }
  const f = filterValue.value || {};
  if (f.url) params.url = f.url;
  if (f.rule_name) params.rule_name = f.rule_name;
  if (typeof f.is_enable === 'number') params.is_enable = f.is_enable;
  if (typeof f.ignore_query === 'number') params.ignore_query = f.ignore_query;
  if (typeof f.baseline_status === 'number') params.baseline_status = f.baseline_status;
  return params;
}
function onSortChange(s: any) {
  sort.value = s;
  pagination.current = 1;
  getList();
}
function onFilterChange(filters: Record<string, any>) {
  filterValue.value = filters || {};
  pagination.current = 1;
  getList();
}
function getList() {
  if (!props.propHostCode) return;
  dataLoading.value = true;
  wafTamperRuleListApi(buildListParams())
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      dataLoading.value = false;
    });
}
function onPageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
  getList();
}
function handleAdd() {
  editMode.value = false;
  formData.value = { ...INITIAL_RULE, host_code: props.propHostCode };
  formVisible.value = true;
}
function handleEdit(e: { row: Record<string, any> }) {
  editMode.value = true;
  wafTamperRuleDetailApi({ id: e.row.id }).then((res) => {
    if (res.code === 0) {
      const d = res.data;
      formData.value = {
        id: d.id,
        host_code: d.host_code,
        url: d.url,
        rule_name: d.rule_name,
        is_enable: String(d.is_enable),
        ignore_query: String(d.ignore_query),
        remarks: d.remarks,
      };
      formVisible.value = true;
    }
  });
}
function buildPost(src: Record<string, any>) {
  return { ...src, host_code: props.propHostCode, is_enable: Number(src.is_enable), ignore_query: Number(src.ignore_query) };
}
function onSubmit(ctx: { firstError?: string }) {
  if (ctx.firstError) {
    MessagePlugin.warning(ctx.firstError);
    return;
  }
  const post = buildPost(formData.value);
  const api = editMode.value ? wafTamperRuleEditApi : wafTamperRuleAddApi;
  api(post).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      formVisible.value = false;
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}
function handleRelearn(e: { row: Record<string, any> }) {
  wafTamperRuleRelearnApi({ id: e.row.id }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}
function onSelectChange(value: (string | number)[]) {
  selectedRowKeys.value = value;
}
function handleRelearnBatch() {
  if (selectedRowKeys.value.length === 0) return;
  wafTamperRuleRelearnBatchApi({ host_code: props.propHostCode, ids: selectedRowKeys.value }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      selectedRowKeys.value = [];
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}
function handleRelearnAll() {
  const confirmDia = DialogPlugin.confirm({
    header: t('page.host.tamper.relearn_all'),
    body: t('page.host.tamper.relearn_all_confirm'),
    onConfirm: () => {
      wafTamperRuleRelearnBatchApi({ host_code: props.propHostCode, ids: [] }).then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          selectedRowKeys.value = [];
          getList();
        } else {
          MessagePlugin.warning(res.msg);
        }
      });
      confirmDia.hide();
    },
    onClose: () => confirmDia.hide(),
  });
}
function handleDelBatch() {
  if (selectedRowKeys.value.length === 0) return;
  const confirmDia = DialogPlugin.confirm({
    header: t('page.host.tamper.del_selected'),
    body: t('common.data_delete_warning'),
    theme: 'warning',
    onConfirm: () => {
      wafTamperRuleDelBatchApi({ host_code: props.propHostCode, ids: selectedRowKeys.value }).then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          selectedRowKeys.value = [];
          getList();
        } else {
          MessagePlugin.warning(res.msg);
        }
      });
      confirmDia.hide();
    },
    onClose: () => confirmDia.hide(),
  });
}
function openExtract() {
  extractDomain.value = domainOptions.value[0] || '';
  extractPageUrl.value = '/';
  extractResult.value = [];
  extractSelected.value = [];
  extractDone.value = false;
  extractIgnoreQuery.value = true;
  extractVisible.value = true;
}
function doExtract() {
  extractLoading.value = true;
  extractDone.value = false;
  wafTamperRuleExtractApi({ host_code: props.propHostCode, domain: extractDomain.value, page_url: extractPageUrl.value })
    .then((res) => {
      if (res.code === 0) {
        extractResult.value = res.data.list ?? [];
        extractSelected.value = extractResult.value.map((r) => r.url);
      } else {
        extractResult.value = [];
        extractSelected.value = [];
        MessagePlugin.warning(res.msg);
      }
      extractDone.value = true;
    })
    .catch((e: Error) => {
      console.log(e);
      extractDone.value = true;
    })
    .finally(() => {
      extractLoading.value = false;
    });
}
function onExtractSelectChange(value: (string | number)[]) {
  extractSelected.value = value;
}
function doAddBatch() {
  if (extractSelected.value.length === 0) return;
  wafTamperRuleAddBatchApi({
    host_code: props.propHostCode,
    urls: extractSelected.value,
    is_enable: 1,
    ignore_query: extractIgnoreQuery.value ? 1 : 0,
  }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      extractVisible.value = false;
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}
function typeTheme(type: string) {
  const map: Record<string, string> = { js: 'primary', css: 'success', html: 'warning', img: 'default' };
  return (map[type] || 'default') as 'primary' | 'success' | 'warning' | 'default';
}
function handleDelete(row: { rowIndex: number }) {
  deleteIdx.value = row.rowIndex;
  confirmVisible.value = true;
}
function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  wafTamperRuleDelApi({ id }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
  deleteIdx.value = -1;
}
function handleViewBaseline(e: { row: Record<string, any> }) {
  baselineExpanded.value = false;
  baselineData.value = null;
  wafTamperRuleBaselineApi({ id: e.row.id }).then((res) => {
    if (res.code === 0) {
      baselineData.value = res.data;
      baselineVisible.value = true;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}
function downloadBaseline() {
  if (!baselineData.value) return;
  let blob: Blob;
  if (baselineData.value.is_text) {
    blob = new Blob([baselineData.value.content || ''], { type: baselineData.value.content_type || 'text/plain' });
  } else if (baselineData.value.content_base64) {
    const bin = atob(baselineData.value.content_base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
    blob = new Blob([arr], { type: baselineData.value.content_type || 'application/octet-stream' });
  } else {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'baseline';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.form-item-tips {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}
.baseline-pre {
  max-height: 360px;
  overflow: auto;
  background: #f7f7f7;
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
}
.t-button-link + .t-button-link {
  margin-left: 8px;
}
</style>
