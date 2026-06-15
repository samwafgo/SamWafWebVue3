<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddAccount"> {{ t('page.systemconfig.new_system_configuration') }} </t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="140" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.systemconfig.label_configuration_item')" name="item">
              <t-input v-model="searchformData.item" class="search-input" style="width: 200px" clearable> </t-input>
            </t-form-item>
            <t-form-item :label="t('common.remarks')" name="remarks">
              <t-input v-model="searchformData.remarks" class="search-input" style="width: 200px" clearable> </t-input>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

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
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="150" @submit="onSubmit">
        <t-form-item :label="t('page.systemconfig.label_configuration_item')" name="item">
          <t-input v-model="formData.item" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.systemconfig.label_configuration_value')" name="value">
          <t-input v-model="formData.value" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formData.remarks" :style="{ width: '480px' }" name="remarks"> </t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="150" @submit="onSubmitEdit">
        <t-form-item :label="t('page.systemconfig.label_configuration_item')" name="item">
          <t-input v-model="formEditData.item" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.systemconfig.label_configuration_value')" name="value">
          <t-input v-model="formEditData.value" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '480px' }" name="remarks"> </t-textarea>
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
    >
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, PageInfo, TableProps } from 'tdesign-vue-next';

import {
  add_system_config_api,
  del_detail_api,
  edit_system_config_api,
  get_detail_by_id_api,
  system_config_list_api,
} from '@/apis/systemconfig';

const { t } = useI18n();

const INITIAL_DATA = {
  item_class: 'system',
  item: '',
  value: '',
  item_type: 'string',
  options: '',
  remarks: '',
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  item: [{ required: true, message: t('common.placeholder') + t('page.systemconfig.label_configuration_item'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const deleteIdx = ref(-1);

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.systemconfig.label_configuration_item'), align: 'left', width: 250, ellipsis: true, colKey: 'item' },
  { title: t('page.systemconfig.label_configuration_value'), width: 200, ellipsis: true, colKey: 'value' },
  { title: t('common.remarks'), width: 200, ellipsis: true, colKey: 'remarks' },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const searchformData = reactive({
  item: '',
  remarks: '',
});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

onMounted(() => {
  getList('');
});

function getList(keyword?: string) {
  if (keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  system_config_list_api({
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

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
  getList('');
}

function rehandleSelectChange(val: (string | number)[]) {
  selectedRowKeys.value = val;
}

function handleClickEdit(e: { row: Record<string, any> }) {
  const { id } = e.row;
  editFormVisible.value = true;
  getDetail(id);
}

function handleAddAccount() {
  addFormVisible.value = true;
  formData.value = { item: '', value: '' };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    add_system_config_api({ ...formData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          addFormVisible.value = false;
          pagination.current = 1;
          getList('');
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    edit_system_config_api({ ...formEditData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          editFormVisible.value = false;
          getList('');
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
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
  del_detail_api({ id })
    .then((res) => {
      if (res.code === 0) {
        getList('');
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
  resetIdx();
}

function onCancel() {
  resetIdx();
}

function resetIdx() {
  deleteIdx.value = -1;
}

function getDetail(id: string | number) {
  get_detail_by_id_api({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.search-input {
  width: 360px;
}
</style>
