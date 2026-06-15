<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd"> {{ t('page.private_info.button_add_private_info') }} </t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="300" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.private_info.alert_message')" close>
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
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="100" @submit="onSubmit">
        <t-form-item :label="t('page.private_info.private_key')" name="private_key">
          <t-input v-model="formData.private_key" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.private_info.private_value')" name="private_value">
          <t-input v-model="formData.private_value" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.private_info.remarks')" name="remarks">
          <t-input v-model="formData.remarks" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="100" @submit="onSubmitEdit">
        <t-form-item :label="t('page.private_info.private_key')" name="private_key">
          <t-input v-model="formEditData.private_key" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.private_info.private_value')" name="private_value">
          <t-input v-model="formEditData.private_value" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.private_info.remarks')" name="remarks">
          <t-input v-model="formEditData.remarks" :style="{ width: '480px' }"></t-input>
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
  wafPrivateInfoAddApi,
  wafPrivateInfoDelApi,
  wafPrivateInfoDetailApi,
  wafPrivateInfoEditApi,
  wafPrivateInfoListApi,
} from '@/apis/private_info';
import { getOnlineUrl } from '@/utils/usuallytool';

const { t } = useI18n();

const INITIAL_DATA = {
  private_key: '',
  private_value: '',
  remarks: '',
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  private_key: [{ required: true, message: t('common.placeholder') + t('page.private_info.private_key'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const searchformData = reactive({});
const deleteIdx = ref(-1);

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.private_info.private_key'), width: 200, ellipsis: true, colKey: 'private_key' },
  { title: t('page.private_info.private_value'), width: 200, ellipsis: true, colKey: 'private_value' },
  { title: t('page.private_info.remarks'), width: 200, ellipsis: true, colKey: 'remarks' },
  { align: 'left', fixed: 'right', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
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
  wafPrivateInfoListApi({
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

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafPrivateInfoAddApi({ ...formData.value })
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
    wafPrivateInfoEditApi({ ...formEditData.value })
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
  wafPrivateInfoDelApi({ id })
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
  wafPrivateInfoDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/PrivateInfo.html`);
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

.t-button + .t-button {
  margin-left: 8px;
}
</style>
