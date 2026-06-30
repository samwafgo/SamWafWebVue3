<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.ca_server_info.button_add_ca_server') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.ca_server_info.alert_message')" close>
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
      <t-form :data="formData" :rules="rules" :label-width="100" @submit="onSubmit">
        <t-form-item :label="t('page.ca_server_info.ca_server_name')" name="ca_server_name">
          <t-input v-model="formData.ca_server_name" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.ca_server_info.ca_server_address')" name="ca_server_address">
          <t-input v-model="formData.ca_server_address" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.ca_server_info.ca_server_remarks')" name="remarks">
          <t-input v-model="formData.remarks" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="100" @submit="onSubmitEdit">
        <t-form-item :label="t('page.ca_server_info.ca_server_name')" name="ca_server_name">
          <t-input v-model="formEditData.ca_server_name" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.ca_server_info.ca_server_address')" name="ca_server_address">
          <t-input v-model="formEditData.ca_server_address" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.ca_server_info.ca_server_remarks')" name="remarks">
          <t-input v-model="formEditData.remarks" :style="{ width: '480px' }" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { getOnlineUrl } from '@/utils/usuallytool';
import {
  wafCaServerInfoListApi,
  wafCaServerInfoDelApi,
  wafCaServerInfoEditApi,
  wafCaServerInfoAddApi,
  wafCaServerInfoDetailApi,
} from '@/apis/ca_server_info';

const INITIAL_DATA = {
  ca_server_name: '',
  ca_server_address: '',
  remarks: '',
};

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  ca_server_name: [{ required: true, message: t('common.placeholder') + t('page.ca_server_info.ca_server_name'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 64, fixed: 'left' },
  { title: t('page.ca_server_info.ca_server_name'), width: 200, ellipsis: true, colKey: 'ca_server_name' },
  { title: t('page.ca_server_info.ca_server_address'), width: 200, ellipsis: true, colKey: 'ca_server_address' },
  { title: t('page.ca_server_info.ca_server_remarks'), width: 200, ellipsis: true, colKey: 'remarks' },
  { align: 'left', fixed: 'right', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({});
const deleteIdx = ref(-1);

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

function getList() {
  dataLoading.value = true;
  wafCaServerInfoListApi({
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

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafCaServerInfoAddApi({ ...formData.value })
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
    wafCaServerInfoEditApi({ ...formEditData.value })
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
  wafCaServerInfoDelApi({ id })
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
  wafCaServerInfoDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => console.log(e));
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/SSL.html`);
}

onMounted(() => {
  getList();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}
</style>
