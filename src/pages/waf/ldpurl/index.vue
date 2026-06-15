<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddLdpUrl">{{ t('page.ldpurl.button_add_url') }}</t-button>
          <t-button theme="danger" variant="outline" :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
            {{ t('page.ldpurl.button_batch_delete') }}
          </t-button>
          <t-button theme="danger" :disabled="data.length === 0" @click="handleClearAll">
            {{ t('page.ldpurl.button_clear_all') }}
          </t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.ldpurl.label_website')" name="host_code">
              <t-select v-model="searchformData.host_code" clearable filterable :style="{ width: '150px' }">
                <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                  {{ item }}
                </t-option>
              </t-select>
            </t-form-item>
            <t-form-item :label="t('page.ldpurl.label_url')" name="url">
              <t-input v-model="searchformData.url" class="search-input" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.ldpurl.alert_message')" close>
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
          <template #host_code="{ row }">
            <span>{{ host_dic[row.host_code] }}</span>
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
        <t-form-item :label="t('page.ldpurl.label_website')" name="host_code">
          <t-select v-model="formData.host_code" clearable filterable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.ldpurl.label_compare_type')" name="compare_type">
          <t-select v-model="formData.compare_type" clearable :style="{ width: '480px' }">
            <t-option v-for="item in compareTypeOptions" :key="item.value" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.ldpurl.label_url')" name="url">
          <t-input v-model="formData.url" :style="{ width: '480px' }" />
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
        <t-form-item :label="t('page.ldpurl.label_website')" name="host_code">
          <t-select v-model="formEditData.host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.ldpurl.label_compare_type')" name="compare_type">
          <t-select v-model="formEditData.compare_type" clearable :style="{ width: '480px' }">
            <t-option v-for="item in compareTypeOptions" :key="item.value" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.ldpurl.label_url')" name="url">
          <t-input v-model="formEditData.url" :style="{ width: '480px' }" />
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
      :header="t('page.ldpurl.confirm_batch_delete')"
      @confirm="onConfirmBatchDelete"
      @cancel="batchDeleteVisible = false"
    >
      <p>{{ t('page.ldpurl.confirm_batch_delete') }}</p>
    </t-dialog>

    <t-dialog
      v-model:visible="clearAllVisible"
      :header="t('page.ldpurl.confirm_clear_all')"
      @confirm="onConfirmClearAll"
      @cancel="clearAllVisible = false"
    >
      <p>{{ t('page.ldpurl.confirm_clear_all') }}</p>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { getOnlineUrl } from '@/utils/usuallytool';
import { allhost } from '@/apis/host';
import {
  wafLdpURLListApi,
  wafLdpURLDelApi,
  wafLdpURLEditApi,
  wafLdpURLAddApi,
  wafLdpURLDetailApi,
  wafLdpURLBatchDelApi,
  wafLdpURLDelAllApi,
} from '@/apis/ldpurl';

// compare_type 取值与后端约定为中文字符串
const INITIAL_DATA = {
  host_code: '',
  url: '',
  remarks: '',
  compare_type: '等于',
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
  host_code: [{ required: true, message: t('common.placeholder') + t('page.ldpurl.label_website'), type: 'error' }],
  compare_type: [{ required: true, message: t('common.select_placeholder'), type: 'error' }],
  url: [{ required: true, message: t('common.placeholder') + t('page.ldpurl.label_url'), type: 'error' }],
};

const compareTypeOptions = computed(() => [
  { label: t('page.ldpurl.compare_type_option_equal'), value: '等于' },
  { label: t('page.ldpurl.compare_type_option_pre'), value: '前缀匹配' },
  { label: t('page.ldpurl.compare_type_option_end'), value: '后缀匹配' },
  { label: t('page.ldpurl.compare_type_option_contain'), value: '包含匹配' },
]);

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 64, fixed: 'left' },
  { title: t('page.ldpurl.label_website'), align: 'left', width: 250, ellipsis: true, colKey: 'host_code' },
  { title: t('page.ldpurl.label_compare_type'), align: 'left', width: 250, ellipsis: true, colKey: 'compare_type' },
  { title: t('page.ldpurl.label_url'), width: 200, ellipsis: true, colKey: 'url' },
  { title: t('common.remarks'), width: 200, ellipsis: true, colKey: 'remarks' },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

const searchformData = reactive({ url: '', host_code: '' });

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
  wafLdpURLListApi({
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

function handleAddLdpUrl() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafLdpURLAddApi({ ...formData.value })
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
    wafLdpURLEditApi({ ...formEditData.value })
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
  wafLdpURLDelApi({ id })
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
  wafLdpURLDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => console.log(e));
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/ldp.html`);
}

function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) {
    MessagePlugin.warning(t('page.ldpurl.no_data_selected'));
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

  wafLdpURLBatchDelApi({ ids })
    .then((res) => {
      if (res.code === 0) {
        getList();
        selectedRowKeys.value = [];
        MessagePlugin.success(t('page.ldpurl.batch_delete_success'));
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
  wafLdpURLDelAllApi({ host_code: searchformData.host_code })
    .then((res) => {
      if (res.code === 0) {
        getList();
        selectedRowKeys.value = [];
        MessagePlugin.success(t('page.ldpurl.clear_all_success'));
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
      MessagePlugin.error('清空失败');
    });
}

onMounted(() => {
  loadHostList().then(() => {
    getList();
  });
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
