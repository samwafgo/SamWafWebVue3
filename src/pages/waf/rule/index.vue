<template>
  <div>
    <t-card class="list-card-container">
      <!-- 操作区：左侧增删操作 + 右侧编排模式(配置入口) -->
      <div class="rule-toolbar-actions">
        <div class="left-operation-container">
          <t-button @click="handleAddRule">{{ t('page.rule.button_add_rule') }}</t-button>
          <t-button theme="danger" variant="outline" :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
            {{ t('page.rule.button_batch_delete') }}
          </t-button>
          <t-button theme="danger" :disabled="data.length === 0" @click="handleClearAll">
            {{ t('page.rule.button_clear_all') }}
          </t-button>
        </div>
        <t-button theme="primary" variant="outline" class="chain-mode-btn" @click="openChainMode">
          <template #icon><swap-icon /></template>
          {{ t('page.rule.chain_mode.entry') }}
        </t-button>
      </div>

      <!-- 筛选区：单独一行 -->
      <div class="rule-toolbar-search">
        <t-form :data="searchformData" :label-width="70" layout="inline" colon>
          <t-form-item :label="t('page.rule.label_website')" name="host_code">
            <t-select v-model="searchformData.host_code" clearable filterable :style="{ width: '150px' }">
              <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                {{ item }}
              </t-option>
            </t-select>
          </t-form-item>
          <t-form-item :label="t('page.rule.label_rule_name')" name="rule_name">
            <t-input v-model="searchformData.rule_name" class="search-input" clearable />
          </t-form-item>
          <t-form-item :label="t('page.rule.label_rule_code')" name="rule_code">
            <t-input v-model="searchformData.rule_code" class="search-input" clearable />
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" @click="getList()">
              {{ t('common.search') }}
            </t-button>
          </t-form-item>
        </t-form>
      </div>

      <t-alert theme="info" :message="t('page.rule.alert_message')" close>
        <template #operation>
          <span @click="handleJumpOnlineUrl">{{ t('page.rule.rule_online_document') }}</span>
        </template>
      </t-alert>
      <div class="table-container">
        <t-table
          :columns="columns"
          size="small"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
        >
          <template #host_code="{ row }">
            <span>{{ host_dic[row.host_code] }}</span>
          </template>
          <template #rule_status="{ row }">
            <t-switch
              size="small"
              :value="row.rule_status === 1"
              :label="[t('page.rule.rule_on'), t('page.rule.rule_off')]"
              @change="changeRuleStatusHandle(row)"
            />
          </template>

          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />
    <t-dialog
      v-model:visible="batchDeleteVisible"
      :header="t('page.rule.confirm_batch_delete')"
      @confirm="onConfirmBatchDelete"
      @cancel="batchDeleteVisible = false"
    >
      {{ t('page.rule.confirm_batch_delete') }}
    </t-dialog>

    <t-dialog
      v-model:visible="clearAllVisible"
      :header="t('page.rule.confirm_clear_all')"
      @confirm="onConfirmClearAll"
      @cancel="clearAllVisible = false"
    >
      {{ t('page.rule.confirm_clear_all') }}
    </t-dialog>

    <!-- 规则编排模式设置(rule_chain_mode) -->
    <t-dialog v-model:visible="chainModeVisible" :header="t('page.rule.chain_mode.title')" width="640px" :footer="false">
      <t-alert theme="info" :message="t('page.rule.chain_mode.intro')" style="margin-bottom: 12px" />
      <t-radio-group v-model="chainMode" class="chain-mode-group">
        <div v-for="opt in chainModeOptions" :key="opt.value" class="chain-mode-item" @click="chainMode = opt.value">
          <t-radio :value="opt.value">
            <span class="chain-mode-label">{{ opt.label }}</span>
            <t-tag v-if="opt.recommend" theme="success" variant="light" size="small" class="chain-mode-tag">
              {{ t('page.rule.chain_mode.recommend') }}
            </t-tag>
          </t-radio>
          <div class="chain-mode-desc">{{ opt.desc }}</div>
        </div>
      </t-radio-group>
      <div class="chain-mode-ops">
        <t-button theme="primary" :loading="chainModeSaving" @click="saveChainMode">{{ t('common.save') }}</t-button>
        <t-button variant="outline" @click="chainModeVisible = false">{{ t('common.close') }}</t-button>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { SwapIcon } from 'tdesign-icons-vue-next';
import { getOnlineUrl } from '@/utils/usuallytool';
import { wafRuleListApi, wafRuleDelApi, wafRuleBatchDelApi, wafRuleDelAllApi, changeRuleStatus } from '@/apis/rules';
import { get_detail_by_item_api, edit_system_config_by_item_api } from '@/apis/systemconfig';
import { allhost } from '@/apis/host';

const { t } = useI18n();
const router = useRouter();

const batchDeleteVisible = ref(false);
const clearAllVisible = ref(false);
const confirmVisible = ref(false);

// 规则编排模式(rule_chain_mode)：0 默认(CC之后)，1 规则优先(推荐/最新)
const chainModeVisible = ref(false);
const chainModeSaving = ref(false);
const chainMode = ref('0');
const chainModeOptions = computed(() => [
  {
    value: '0',
    label: t('page.rule.chain_mode.mode0_label'),
    desc: t('page.rule.chain_mode.mode0_desc'),
    recommend: false,
  },
  {
    value: '1',
    label: t('page.rule.chain_mode.mode1_label'),
    desc: t('page.rule.chain_mode.mode1_desc'),
    recommend: true,
  },
]);

// 打开"规则编排模式"设置并读取当前值
function openChainMode() {
  chainModeVisible.value = true;
  get_detail_by_item_api({ item: 'rule_chain_mode' })
    .then((res) => {
      if (res.code === 0 && res.data) {
        chainMode.value = res.data.value === '1' ? '1' : '0';
      }
    })
    .catch((e: Error) => console.log(e));
}

// 保存"规则编排模式"（走系统配置 editByItem，后端会热同步到 global）
function saveChainMode() {
  chainModeSaving.value = true;
  edit_system_config_by_item_api({ item: 'rule_chain_mode', value: chainMode.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(t('page.rule.chain_mode.saved'));
        chainModeVisible.value = false;
      } else {
        MessagePlugin.warning(res.msg || t('page.rule.chain_mode.save_fail'));
      }
    })
    .catch((e: Error) => {
      console.log(e);
      MessagePlugin.error(t('page.rule.chain_mode.save_fail'));
    })
    .finally(() => {
      chainModeSaving.value = false;
    });
}

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'rule_code';

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 64, fixed: 'left' },
  { title: t('page.rule.label_website'), align: 'left', width: 200, ellipsis: true, colKey: 'host_code' },
  { title: t('page.rule.label_rule_name'), align: 'left', width: 200, ellipsis: true, colKey: 'rule_name' },
  { title: t('page.rule.label_rule_code'), align: 'left', width: 200, ellipsis: true, colKey: 'rule_code' },
  { title: t('page.rule.label_rule_version'), colKey: 'rule_version', width: 70 },
  { title: t('page.rule.label_rule_status'), colKey: 'rule_status', width: 70 },
  { title: t('common.update_time'), width: 200, ellipsis: true, colKey: 'update_time' },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

const searchformData = reactive({
  rule_name: '',
  host_code: '',
  rule_code: '',
});

const deleteIdx = ref(-1);
const host_dic = ref<Record<string, string>>({});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          (res.data as { value: string; label: string }[]).forEach((item) => {
            host_dic.value[item.value] = item.label;
          });
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        reject(e);
      });
  });
}

function getList() {
  dataLoading.value = true;
  wafRuleListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function rehandleSelectChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys;
}

function handleClickEdit(e: { row: Record<string, any> }) {
  router.push({
    path: '/waf-host/wafruleedit',
    query: { type: 'edit', code: e.row.rule_code },
  });
}

function handleAddRule() {
  router.push({
    path: '/waf-host/wafruleedit',
    query: { type: 'add' },
  });
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { rule_code } = data.value[deleteIdx.value];
  wafRuleDelApi({ CODE: rule_code })
    .then((res) => {
      if (res.code === 0) {
        pagination.current = 1;
        getList();
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
  resetIdx();
}

function onCancel() {
  resetIdx();
}

function resetIdx() {
  deleteIdx.value = -1;
}

// 批量删除处理
function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) {
    MessagePlugin.warning(t('page.rule.no_data_selected'));
    return;
  }
  batchDeleteVisible.value = true;
}

function handleClearAll() {
  clearAllVisible.value = true;
}

function onConfirmBatchDelete() {
  batchDeleteVisible.value = false;
  const codes = selectedRowKeys.value
    .map((key) => {
      const item = data.value.find((d) => d.rule_code === key);
      return item ? item.rule_code : null;
    })
    .filter((code) => code !== null);

  wafRuleBatchDelApi({ codes })
    .then((res) => {
      if (res.code === 0) {
        getList();
        selectedRowKeys.value = [];
        MessagePlugin.success(t('page.rule.batch_delete_success'));
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
      MessagePlugin.error('批量删除失败');
    });
}

function onConfirmClearAll() {
  clearAllVisible.value = false;
  wafRuleDelAllApi({ host_code: searchformData.host_code })
    .then((res) => {
      if (res.code === 0) {
        getList();
        selectedRowKeys.value = [];
        MessagePlugin.success(t('page.rule.clear_all_success'));
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
      MessagePlugin.error('清空失败');
    });
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/Rule.html`);
}

// 修改规则状态（点击开关切换为相反状态）
function changeRuleStatusHandle(row: Record<string, any>) {
  const currentStatus = row.rule_status === 1 ? 1 : 0;
  const newStatus = currentStatus === 1 ? 0 : 1;

  changeRuleStatus({ CODE: row.rule_code, rule_status: newStatus })
    .then((res) => {
      if (res.code === 0) {
        row.rule_status = newStatus;
        MessagePlugin.success(res.msg);
      } else {
        row.rule_status = currentStatus;
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
      row.rule_status = currentStatus;
      MessagePlugin.error(t('common.operation_failed'));
    });
}

onMounted(() => {
  loadHostList().then(() => {
    getList();
  });
});
</script>

<style scoped>
/* 操作区：增删操作(左) + 编排模式(右) 一行分列 */
.rule-toolbar-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

/* 筛选区：单独一行，与操作区用分隔线区隔 */
.rule-toolbar-search {
  padding-top: 12px;
  border-top: 1px solid var(--td-component-stroke);
  margin-bottom: 8px;
}

.rule-toolbar-search :deep(.t-form__item) {
  margin-bottom: 8px;
}

.chain-mode-btn :deep(.t-icon) {
  margin-right: 4px;
}

.left-operation-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.search-input {
  width: 200px;
}

.chain-mode-group {
  display: block;
  width: 100%;
}

.chain-mode-item {
  border: 1px solid var(--td-component-border);
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 10px;
  cursor: pointer;
}

.chain-mode-item:hover {
  border-color: var(--td-brand-color);
}

.chain-mode-label {
  font-weight: 500;
}

.chain-mode-tag {
  margin-left: 8px;
}

.chain-mode-desc {
  color: var(--td-text-color-secondary);
  font-size: 12px;
  margin-top: 6px;
  padding-left: 24px;
  line-height: 1.6;
}

.chain-mode-ops {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
