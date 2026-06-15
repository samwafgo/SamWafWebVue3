<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddSensitive">{{ t('page.sensitive.button_add_sensitive') }}</t-button>
          <t-button theme="danger" variant="outline" :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
            {{ t('page.sensitive.button_batch_delete') }}
          </t-button>
          <t-button theme="danger" :disabled="data.length === 0" @click="handleClearAll">
            {{ t('page.sensitive.button_clear_all') }}
          </t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.sensitive.label_content')" name="content">
              <t-input v-model="searchformData.content" class="search-input" :placeholder="t('common.placeholder')" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.sensitive.alert_message')" close>
        <template #operation>
          <span @click="handleJumpOnlineUrl">{{ t('common.online_document') }}</span>
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
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
        >
          <template #check_direction="{ row }">
            <span>{{ checkDirectionOptions.find((option) => option.value === row.check_direction)?.label || row.check_direction }}</span>
          </template>
          <template #action="{ row }">
            <span>{{ actionOptions.find((option) => option.value === row.action)?.label || row.action }}</span>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="100" @submit="onSubmit">
        <t-form-item :label="t('page.sensitive.label_content')" name="content">
          <t-input v-model="formData.content" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.sensitive.label_check_direction')" name="check_direction">
          <t-select v-model="formData.check_direction" clearable :style="{ width: '480px' }">
            <t-option v-for="item in checkDirectionOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.sensitive.label_action')" name="action">
          <t-select v-model="formData.action" clearable :style="{ width: '480px' }">
            <t-option v-for="item in actionOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
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

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="100" @submit="onSubmitEdit">
        <t-form-item :label="t('page.sensitive.label_content')" name="content">
          <t-input v-model="formEditData.content" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.sensitive.label_check_direction')" name="check_direction">
          <t-select v-model="formEditData.check_direction" clearable :style="{ width: '480px' }">
            <t-option v-for="item in checkDirectionOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.sensitive.label_action')" name="action">
          <t-select v-model="formEditData.action" clearable :style="{ width: '480px' }">
            <t-option v-for="item in actionOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '480px' }" name="remarks" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />

    <t-dialog
      v-model:visible="batchDeleteVisible"
      :header="t('page.sensitive.button_batch_delete')"
      :body="t('page.sensitive.confirm_batch_delete')"
      @confirm="onConfirmBatchDelete"
      @cancel="batchDeleteVisible = false"
    />

    <t-dialog
      v-model:visible="clearAllVisible"
      :header="t('page.sensitive.button_clear_all')"
      :body="t('page.sensitive.confirm_clear_all')"
      @confirm="onConfirmClearAll"
      @cancel="clearAllVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { getOnlineUrl } from '@/utils/usuallytool';
import {
  wafSensitiveListApi,
  wafSensitiveDelApi,
  wafSensitiveEditApi,
  wafSensitiveAddApi,
  wafSensitiveDetailApi,
  wafSensitiveBatchDelApi,
  wafSensitiveDelAllApi,
} from '@/apis/sensitive';

const INITIAL_DATA = {
  content: '',
  check_direction: 'in',
  action: 'deny',
  remarks: '',
};

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const batchDeleteVisible = ref(false);
const clearAllVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  content: [{ required: true, message: t('common.select_placeholder') + t('page.sensitive.label_content'), type: 'error' }],
};

const checkDirectionOptions = computed(() => [
  { label: t('page.sensitive.check_direction_type.in'), value: 'in' },
  { label: t('page.sensitive.check_direction_type.out'), value: 'out' },
  { label: t('page.sensitive.check_direction_type.all'), value: 'all' },
]);

const actionOptions = computed(() => [
  { label: t('page.sensitive.action_type.deny'), value: 'deny' },
  { label: t('page.sensitive.action_type.replace'), value: 'replace' },
]);

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 64, fixed: 'left' },
  { title: t('page.sensitive.label_content'), align: 'left', width: 250, ellipsis: true, colKey: 'content' },
  { title: t('page.sensitive.label_check_direction'), width: 150, ellipsis: true, colKey: 'check_direction' },
  { title: t('page.sensitive.label_action'), width: 150, ellipsis: true, colKey: 'action' },
  { title: t('common.remarks'), width: 200, ellipsis: true, colKey: 'remarks' },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({ content: '' });
const deleteIdx = ref(-1);

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

function getList() {
  dataLoading.value = true;
  wafSensitiveListApi({
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
  editFormVisible.value = true;
  getDetail(e.row.id);
}

function handleAddSensitive() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafSensitiveAddApi({ ...formData.value })
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
  } else {
    MessagePlugin.warning(firstError);
  }
};

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafSensitiveEditApi({ ...formEditData.value })
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
  } else {
    MessagePlugin.warning(firstError);
  }
};

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_DATA };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  wafSensitiveDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
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

function getDetail(id: string | number) {
  wafSensitiveDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => console.log(e));
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/Sensitive.html`);
}

function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) {
    MessagePlugin.warning(t('page.sensitive.no_data_selected'));
    return;
  }
  batchDeleteVisible.value = true;
}

function handleClearAll() {
  clearAllVisible.value = true;
}

function onConfirmBatchDelete() {
  batchDeleteVisible.value = false;
  const ids = selectedRowKeys.value
    .map((key) => {
      const item = data.value.find((d) => d.id === key);
      return item ? item.id : null;
    })
    .filter((id) => id !== null);

  if (ids.length === 0) {
    MessagePlugin.warning(t('page.sensitive.no_data_selected'));
    return;
  }

  wafSensitiveBatchDelApi({ ids })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(t('page.sensitive.batch_delete_success'));
        selectedRowKeys.value = [];
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
      MessagePlugin.error(t('common.operation_failed'));
    });
}

function onConfirmClearAll() {
  clearAllVisible.value = false;
  wafSensitiveDelAllApi({})
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(t('page.sensitive.clear_all_success'));
        selectedRowKeys.value = [];
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
      MessagePlugin.error(t('common.operation_failed'));
    });
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
</style>
