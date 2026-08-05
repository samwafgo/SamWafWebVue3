<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddGroup">{{ t('page.ipgroup.button_add') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.ipgroup.label_name')" name="group_name">
              <t-input v-model="searchformData.group_name" class="search-input" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.ipgroup.alert_message')" close>
        <!-- 手工维护之外还能定时批量导入，这里给个入口，否则用户不知道有这功能 -->
        <template #operation>
          <span class="link-text" @click="handleJumpBatchTask">{{ t('page.ipgroup.goto_batch_task') }}</span>
        </template>
      </t-alert>
      <div class="table-container">
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
          <template #item_count="{ row }">
            <t-tag theme="primary" variant="light">{{ row.item_count }}</t-tag>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleManageItems(slotProps.row)">
              {{ t('page.ipgroup.button_manage_ip') }}
            </a>
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新增：组短码由后端自动生成，表单里不出现 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="100" @submit="onSubmit">
        <t-form-item :label="t('page.ipgroup.label_name')" name="group_name">
          <t-input v-model="formData.group_name" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formData.remarks" :style="{ width: '480px' }" name="remarks" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑：组短码只读展示 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="100" @submit="onSubmitEdit">
        <t-form-item :label="t('page.ipgroup.label_name')" name="group_name">
          <t-input v-model="formEditData.group_name" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.ipgroup.label_code')">
          <t-input :value="formEditData.group_code" :style="{ width: '480px' }" disabled />
          <div class="form-tips">{{ t('page.ipgroup.code_immutable_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '480px' }" name="remarks" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="editFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 组内 IP 维护 -->
    <t-drawer
      v-model:visible="itemDrawerVisible"
      :header="`${t('page.ipgroup.drawer_title')} - ${currentGroup.group_name}`"
      size="860px"
      :footer="false"
      @close="onCloseDrawer"
    >
      <t-alert theme="info" :message="ruleUsageTips" close />
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddItem">{{ t('page.ipgroup.button_add_item') }}</t-button>
          <t-button variant="base" theme="default" @click="handleBatchAdd">
            {{ t('page.ipgroup.button_batch_add') }}
          </t-button>
          <t-button
            theme="danger"
            variant="outline"
            :disabled="selectedItemKeys.length === 0"
            @click="handleBatchDelItems"
          >
            {{ t('page.ipgroup.button_batch_delete') }}
          </t-button>
          <t-button theme="danger" :disabled="itemData.length === 0" @click="clearItemsConfirmVisible = true">
            {{ t('page.ipgroup.button_clear_items') }}
          </t-button>
          <!-- 一次性手工批量添加之外，还能建定时任务从文件/远程源自动同步 -->
          <a class="t-button-link" style="margin-left: 8px" @click="handleJumpBatchTask">
            {{ t('page.ipgroup.goto_batch_task') }}
          </a>
        </div>
        <div class="right-operation-container">
          <t-form :data="itemSearchData" :label-width="40" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item label="IP" name="ip">
              <t-input v-model="itemSearchData.ip" :style="{ width: '160px' }" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" @click="getItemList()">{{ t('common.search') }}</t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-table
        :columns="itemColumns"
        :data="itemData"
        row-key="id"
        vertical-align="top"
        hover
        :pagination="itemPagination"
        :selected-row-keys="selectedItemKeys"
        :loading="itemLoading"
        @page-change="rehandleItemPageChange"
        @select-change="rehandleItemSelectChange"
      >
        <template #op="slotProps">
          <a class="t-button-link" @click="handleEditItem(slotProps.row)">{{ t('common.edit') }}</a>
          <a class="t-button-link" @click="handleDelItem(slotProps.row)">{{ t('common.delete') }}</a>
        </template>
      </t-table>
    </t-drawer>

    <!-- 单条 IP 新增/编辑 -->
    <t-dialog
      v-model:visible="itemFormVisible"
      :header="itemFormData.id ? t('common.edit') : t('common.new')"
      :width="680"
      :footer="false"
    >
      <t-form :data="itemFormData" :rules="itemRules" :label-width="100" @submit="onSubmitItem">
        <t-form-item label="IP" name="ip">
          <t-input
            v-model="itemFormData.ip"
            :style="{ width: '480px' }"
            :placeholder="t('page.ipgroup.ip_placeholder')"
          />
          <div class="form-tips">{{ t('page.ipgroup.ip_pattern_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="itemFormData.remarks" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="itemFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 批量粘贴录入 -->
    <t-dialog
      v-model:visible="batchAddVisible"
      :header="t('page.ipgroup.button_batch_add')"
      :width="720"
      :confirm-btn="t('common.confirm')"
      :cancel-btn="t('common.close')"
      @confirm="onSubmitBatchAdd"
    >
      <t-textarea
        v-model="batchAddContent"
        :autosize="{ minRows: 12, maxRows: 20 }"
        :placeholder="t('page.ipgroup.batch_add_placeholder')"
      />
      <div class="form-tips" style="margin-top: 8px">{{ t('page.ipgroup.ip_pattern_tips') }}</div>
    </t-dialog>

    <!-- 批量录入结果。t-dialog 点确认只触发 @confirm、不会自动关闭，
         这里只有确认一个按钮，必须显式关掉，否则点了没反应 -->
    <t-dialog
      v-model:visible="batchResultVisible"
      :header="t('page.ipgroup.batch_add_result_title')"
      :width="720"
      :cancel-btn="null"
      @confirm="batchResultVisible = false"
    >
      <p>{{ batchResultSummary }}</p>
      <t-table
        v-if="batchResult.fail_lines && batchResult.fail_lines.length"
        :data="batchResult.fail_lines"
        row-key="line"
        size="small"
        :columns="batchFailColumns"
      />
    </t-dialog>

    <!-- 删除组：有引用时必须显式勾选才允许级联 -->
    <t-dialog
      v-model:visible="delGroupVisible"
      :header="t('common.confirm_delete')"
      :width="680"
      :confirm-btn="{ content: t('common.confirm'), theme: 'danger', disabled: hasRefs && !forceDelete }"
      :cancel-btn="t('common.close')"
      @confirm="onConfirmDeleteGroup"
    >
      <p v-if="!hasRefs">{{ t('common.data_delete_warning') }}</p>
      <div v-else>
        <t-alert theme="warning" :message="refsWarning" />
        <ul class="ref-host-list">
          <li v-for="h in refsData.hosts" :key="h.host_code">
            {{ h.host_name }}
            <span v-if="h.block"> — {{ t('page.ipgroup.ref_block') }} {{ h.block }}</span>
            <span v-if="h.allow"> — {{ t('page.ipgroup.ref_allow') }} {{ h.allow }}</span>
          </li>
        </ul>
        <t-checkbox v-model="forceDelete">{{ t('page.ipgroup.delete_force_confirm') }}</t-checkbox>
      </div>
    </t-dialog>

    <t-dialog
      v-model:visible="clearItemsConfirmVisible"
      :header="t('page.ipgroup.button_clear_items')"
      :body="t('page.ipgroup.confirm_clear_items')"
      @confirm="onConfirmClearItems"
    />

    <t-dialog
      v-model:visible="delItemConfirmVisible"
      :header="t('common.confirm_delete')"
      :body="t('common.data_delete_warning')"
      @confirm="onConfirmDelItem"
    />

    <t-dialog
      v-model:visible="batchDelItemsVisible"
      :header="t('page.ipgroup.button_batch_delete')"
      :body="t('common.data_delete_warning')"
      @confirm="onConfirmBatchDelItems"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import {
  wafIPGroupListApi,
  wafIPGroupAddApi,
  wafIPGroupEditApi,
  wafIPGroupDelApi,
  wafIPGroupRefsApi,
  wafIPGroupItemListApi,
  wafIPGroupItemAddApi,
  wafIPGroupItemEditApi,
  wafIPGroupItemDelApi,
  wafIPGroupItemBatchAddApi,
  wafIPGroupItemBatchDelApi,
  wafIPGroupItemDelAllApi,
} from '@/apis/ipgroup';

// 组短码由后端自动生成，新建表单里不出现
const INITIAL_GROUP = {
  group_name: '',
  remarks: '',
};

const { t } = useI18n();
const router = useRouter();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({ group_name: '' });

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_GROUP });
const formEditData = ref<Record<string, any>>({ id: '', group_code: '', ...INITIAL_GROUP });

const rules: FormProps['rules'] = {
  group_name: [{ required: true, message: t('common.placeholder') + t('page.ipgroup.label_name'), type: 'error' }],
};

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.ipgroup.label_name'), align: 'left', width: 200, ellipsis: true, colKey: 'group_name' },
  { title: t('page.ipgroup.label_code'), width: 240, ellipsis: true, colKey: 'group_code' },
  { title: t('page.ipgroup.label_item_count'), width: 100, colKey: 'item_count' },
  { title: t('common.remarks'), width: 200, ellipsis: true, colKey: 'remarks' },
  { title: t('common.create_time'), width: 180, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 220, colKey: 'op', title: t('common.op') },
]);

// 删除确认
const deleteIdx = ref(-1);
const delGroupVisible = ref(false);
const forceDelete = ref(false);
const refsData = ref<Record<string, any>>({ block_count: 0, allow_count: 0, hosts: [] });

const hasRefs = computed(() => (refsData.value.block_count || 0) + (refsData.value.allow_count || 0) > 0);
const refsWarning = computed(() =>
  t('page.ipgroup.delete_has_refs')
    .replace('{block}', String(refsData.value.block_count || 0))
    .replace('{allow}', String(refsData.value.allow_count || 0))
    .replace('{hosts}', String((refsData.value.hosts || []).length)),
);

// 组内条目
const itemDrawerVisible = ref(false);
const currentGroup = ref<Record<string, any>>({ group_name: '', group_code: '' });
const itemData = ref<Record<string, any>[]>([]);
const itemLoading = ref(false);
const selectedItemKeys = ref<(string | number)[]>([]);
const itemPagination = reactive({ total: 0, current: 1, pageSize: 10 });
const itemSearchData = reactive({ ip: '' });

const itemColumns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 64, fixed: 'left' },
  { title: 'IP', align: 'left', width: 240, ellipsis: true, colKey: 'ip' },
  { title: t('common.remarks'), width: 200, ellipsis: true, colKey: 'remarks' },
  { title: t('common.create_time'), width: 180, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 140, colKey: 'op', title: t('common.op') },
]);

const itemFormVisible = ref(false);
const itemFormData = ref<Record<string, any>>({ id: '', ip: '', remarks: '' });
const itemRules: FormProps['rules'] = {
  ip: [{ required: true, message: `${t('common.placeholder')}IP`, type: 'error' }],
};
const delItemConfirmVisible = ref(false);
const pendingDelItemId = ref('');
const batchDelItemsVisible = ref(false);
const clearItemsConfirmVisible = ref(false);

// 批量录入
const batchAddVisible = ref(false);
const batchAddContent = ref('');
const batchResultVisible = ref(false);
const batchResult = ref<Record<string, any>>({ success: 0, skipped: 0, fail: 0, total: 0, fail_lines: [] });

const batchFailColumns = computed<TableProps['columns']>(() => [
  { title: t('page.ipgroup.col_line'), colKey: 'line', width: 80 },
  { title: t('page.ipgroup.col_text'), colKey: 'text', width: 200, ellipsis: true },
  { title: t('page.ipgroup.col_reason'), colKey: 'reason', ellipsis: true },
]);

const ruleUsageTips = computed(() =>
  t('page.ipgroup.rule_usage_tips').replace('{name}', currentGroup.value.group_name || ''),
);
const batchResultSummary = computed(() =>
  t('page.ipgroup.batch_add_result')
    .replace('{success}', String(batchResult.value.success || 0))
    .replace('{skipped}', String(batchResult.value.skipped || 0))
    .replace('{fail}', String(batchResult.value.fail || 0)),
);

function getList() {
  dataLoading.value = true;
  wafIPGroupListApi({
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
    .catch((e: Error) => console.log(e))
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

function handleAddGroup() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_GROUP };
}

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_GROUP };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  wafIPGroupAddApi({ ...formData.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        addFormVisible.value = false;
        pagination.current = 1;
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
};

function handleClickEdit(e: { row: Record<string, any> }) {
  formEditData.value = { ...e.row };
  editFormVisible.value = true;
}

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  wafIPGroupEditApi({
    id: formEditData.value.id,
    group_name: formEditData.value.group_name,
    remarks: formEditData.value.remarks,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        editFormVisible.value = false;
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
};

// 删除前先查引用：被黑/白名单引用时级联会连带删掉那些条目，必须让用户看清楚再确认
function handleClickDelete(e: { rowIndex: number; row: Record<string, any> }) {
  deleteIdx.value = e.rowIndex;
  forceDelete.value = false;
  refsData.value = { block_count: 0, allow_count: 0, hosts: [] };
  wafIPGroupRefsApi({ group_code: e.row.group_code })
    .then((res) => {
      if (res.code === 0) {
        refsData.value = res.data;
      }
    })
    .catch((err: Error) => console.log(err))
    .finally(() => {
      delGroupVisible.value = true;
    });
}

function onConfirmDeleteGroup() {
  const row = data.value[deleteIdx.value];
  if (!row) return;
  wafIPGroupDelApi({ id: row.id, force: forceDelete.value ? 1 : 0 })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      delGroupVisible.value = false;
      deleteIdx.value = -1;
      forceDelete.value = false;
    });
}

// ---------- 组内条目 ----------

function handleManageItems(row: Record<string, any>) {
  currentGroup.value = { ...row };
  itemSearchData.ip = '';
  itemPagination.total = 0;
  itemPagination.current = 1;
  itemPagination.pageSize = 10;
  selectedItemKeys.value = [];
  itemDrawerVisible.value = true;
  getItemList();
}

function onCloseDrawer() {
  // 组内条目变了，列表的条目数要刷新
  getList();
}

function getItemList() {
  itemLoading.value = true;
  wafIPGroupItemListApi({
    pageSize: itemPagination.pageSize,
    pageIndex: itemPagination.current,
    group_code: currentGroup.value.group_code,
    ...itemSearchData,
  })
    .then((res) => {
      if (res.code === 0) {
        itemData.value = res.data.list ?? [];
        itemPagination.total = res.data.total;
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      itemLoading.value = false;
    });
}

function rehandleItemPageChange(pageInfo: PageInfo) {
  itemPagination.current = pageInfo.current;
  if (itemPagination.pageSize !== pageInfo.pageSize) {
    itemPagination.current = 1;
    itemPagination.pageSize = pageInfo.pageSize;
  }
  getItemList();
}

function rehandleItemSelectChange(keys: (string | number)[]) {
  selectedItemKeys.value = keys;
}

// 跳到批量任务页；在某个组的抽屉里点的话把组带过去，直接预填成该组的导入任务
function handleJumpBatchTask() {
  const groupCode = itemDrawerVisible.value ? currentGroup.value.group_code : '';
  router.push({
    name: 'WafBatchTaskList',
    query: groupCode ? { ip_group_code: groupCode } : {},
  });
}

function handleAddItem() {
  itemFormData.value = { id: '', ip: '', remarks: '' };
  itemFormVisible.value = true;
}

function handleEditItem(row: Record<string, any>) {
  itemFormData.value = { id: row.id, ip: row.ip, remarks: row.remarks };
  itemFormVisible.value = true;
}

const onSubmitItem: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  const isEdit = !!itemFormData.value.id;
  const api = isEdit ? wafIPGroupItemEditApi : wafIPGroupItemAddApi;
  const payload = isEdit
    ? { id: itemFormData.value.id, ip: itemFormData.value.ip, remarks: itemFormData.value.remarks }
    : {
        group_code: currentGroup.value.group_code,
        ip: itemFormData.value.ip,
        remarks: itemFormData.value.remarks,
      };
  api(payload)
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        itemFormVisible.value = false;
        getItemList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
};

function handleDelItem(row: Record<string, any>) {
  pendingDelItemId.value = row.id;
  delItemConfirmVisible.value = true;
}

function onConfirmDelItem() {
  delItemConfirmVisible.value = false;
  wafIPGroupItemDelApi({ id: pendingDelItemId.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getItemList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      pendingDelItemId.value = '';
    });
}

function handleBatchDelItems() {
  if (selectedItemKeys.value.length === 0) return;
  batchDelItemsVisible.value = true;
}

function onConfirmBatchDelItems() {
  batchDelItemsVisible.value = false;
  wafIPGroupItemBatchDelApi({ ids: selectedItemKeys.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        selectedItemKeys.value = [];
        getItemList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
}

function onConfirmClearItems() {
  clearItemsConfirmVisible.value = false;
  wafIPGroupItemDelAllApi({ group_code: currentGroup.value.group_code })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        selectedItemKeys.value = [];
        getItemList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
}

function handleBatchAdd() {
  batchAddContent.value = '';
  batchAddVisible.value = true;
}

function onSubmitBatchAdd() {
  if (!batchAddContent.value.trim()) {
    MessagePlugin.warning(t('page.ipgroup.batch_add_empty'));
    return;
  }
  wafIPGroupItemBatchAddApi({
    group_code: currentGroup.value.group_code,
    content: batchAddContent.value,
  })
    .then((res) => {
      if (res.code === 0) {
        batchAddVisible.value = false;
        batchResult.value = res.data;
        batchResultVisible.value = true;
        getItemList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
}

onMounted(() => {
  getList();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-input {
  width: 200px;
}

.form-tips {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.ref-host-list {
  margin: 12px 0;
  padding-left: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.ref-host-list li {
  line-height: 22px;
}

.link-text {
  cursor: pointer;
  color: var(--td-brand-color);
}
</style>
