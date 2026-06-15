<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container"></div>
        <div>
          <t-form :data="searchformData" :label-width="90" layout="inline" colon>
            <t-form-item :label="t('page.host.loadbalance.remote_ip')" name="remote_ip">
              <t-input v-model="searchformData.remote_ip" :placeholder="t('common.placeholder')" clearable />
            </t-form-item>
            <t-form-item :label="t('page.host.loadbalance.remote_port')" name="remote_port">
              <t-input v-model="searchformData.remote_port" :placeholder="t('common.placeholder')" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="default" @click="handleAdd">
                <template #icon><add-icon /></template>
                {{ t('page.host.loadbalance.label_add_loadbalance') }}
              </t-button>
              <t-button theme="default" @click="getList()">
                <template #icon><search-icon /></template>
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
        <t-form-item :label="t('page.host.loadbalance.remote_ip')" name="remote_ip">
          <t-input v-model="formData.remote_ip" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.host.loadbalance.remote_port')" name="remote_port">
          <t-input-number v-model="formData.remote_port" :style="{ width: '480px' }" :min="1" :max="65535" />
        </t-form-item>
        <t-form-item :label="t('page.host.loadbalance.weight')" name="weight">
          <t-input-number v-model="formData.weight" :style="{ width: '480px' }" :min="1" :max="10" />
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
        <t-form-item :label="t('page.host.loadbalance.remote_ip')" name="remote_ip">
          <t-input v-model="formEditData.remote_ip" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.host.loadbalance.remote_port')" name="remote_port">
          <t-input-number v-model="formEditData.remote_port" :style="{ width: '480px' }" :min="1" :max="65535" />
        </t-form-item>
        <t-form-item :label="t('page.host.loadbalance.weight')" name="weight">
          <t-input-number v-model="formEditData.weight" :style="{ width: '480px' }" :min="1" :max="10" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { SearchIcon, AddIcon } from 'tdesign-icons-vue-next';
import { allhost } from '@/apis/host';
import {
  wafLoadBalanceDetailApi,
  wafLoadBalanceListApi,
  wafLoadBalanceEditApi,
  wafLoadBalanceDelApi,
  wafLoadBalanceAddApi,
} from '@/apis/loadbalance';

const INITIAL_DATA = {
  remote_ip: '',
  remote_port: 0,
  weight: 5,
  remarks: '',
};

const props = defineProps<{ propHostCode?: string }>();

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  remote_ip: [
    { required: true, message: t('common.placeholder') + t('page.host.loadbalance.remote_ip'), type: 'error' },
  ],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.host.loadbalance.remote_ip'), width: 150, ellipsis: true, colKey: 'remote_ip' },
  { title: t('page.host.loadbalance.remote_port'), width: 100, ellipsis: true, colKey: 'remote_port' },
  { title: t('page.host.loadbalance.weight'), width: 50, ellipsis: true, colKey: 'weight' },
  { title: t('common.remarks'), width: 50, ellipsis: true, colKey: 'remarks' },
  { align: 'left', fixed: 'right', width: 100, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

const searchformData = reactive({
  host_code: props.propHostCode || '',
  remote_ip: '',
  remote_port: '',
});

const deleteIdx = ref(-1);
const host_dic = ref<Record<string, string>>({});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

watch(
  () => props.propHostCode,
  (newVal) => {
    searchformData.host_code = newVal || '';
    getList();
  },
);

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          const host_options = res.data as { value: string; label: string }[];
          for (let i = 0; i < host_options.length; i++) {
            host_dic.value[host_options[i].value] = host_options[i].label;
          }
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
  const postdata: Record<string, any> = {
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
  };
  postdata.remote_port = Number(postdata.remote_port);
  wafLoadBalanceListApi(postdata)
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
  formData.value = { ...INITIAL_DATA, host_code: props.propHostCode };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    const postdata: Record<string, any> = { ...formData.value };
    postdata.remote_port = Number(postdata.remote_port);
    postdata.weight = Number(postdata.weight);
    wafLoadBalanceAddApi(postdata)
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
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    const postdata: Record<string, any> = { ...formEditData.value };
    postdata.remote_port = Number(postdata.remote_port);
    postdata.weight = Number(postdata.weight);
    wafLoadBalanceEditApi(postdata)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          editFormVisible.value = false;
          getList();
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
  wafLoadBalanceDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
        getList();
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
  wafLoadBalanceDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => {
      console.log(e);
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
}

.t-button + .t-button {
  margin-left: 8px;
}
</style>
