<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd"> {{ t('page.ssl_expire.button_add_ssl_expire') }} </t-button>
          <t-button @click="handleCheck"> {{ t('page.ssl_expire.button_check') }} </t-button>
          <t-button @click="handleSyncHost"> {{ t('page.ssl_expire.button_sync_host') }} </t-button>
          <t-button @click="getList()"> {{ t('common.refresh') }} </t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="300" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
              {{ t('common.search') }}
            </t-button>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.ssl_expire.alert_message')" close>
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
          <template #valid_to="{ row }">
            <span v-if="row.expiration_info !== ''"> {{ row.valid_to }} </span>
            <span v-if="isIpAddress(row.domain)">
              <!-- IP证书：小于3天显示红色警告，大于3天显示绿色 -->
              <span v-if="row.expiration_day > 0 && row.expiration_day < 3" style="color: red"> {{ row.expiration_info }} </span>
              <span v-if="row.expiration_day >= 3" style="color: green"> {{ row.expiration_info }} </span>
            </span>
            <span v-else>
              <!-- 域名证书：小于30天显示红色警告，大于30天显示绿色 -->
              <span v-if="row.expiration_day > 0 && row.expiration_day < 30" style="color: red"> {{ row.expiration_info }} </span>
              <span v-if="row.expiration_day >= 30" style="color: green"> {{ row.expiration_info }} </span>
            </span>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="100" @submit="onSubmit">
        <t-form-item :label="t('page.ssl_expire.domain')" name="domain">
          <t-input v-model="formData.domain" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.ssl_expire.port')" name="port">
          <t-input-number v-model="formData.port" :style="{ width: '150px' }" :placeholder="t('common.placeholder')">
          </t-input-number>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="100" @submit="onSubmitEdit">
        <t-form-item :label="t('page.ssl_expire.domain')" name="domain">
          <t-input v-model="formEditData.domain" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.ssl_expire.port')" name="port">
          <t-input-number v-model="formEditData.port" :style="{ width: '150px' }" :placeholder="t('common.placeholder')">
          </t-input-number>
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
  wafSslExpireAddApi,
  wafSslExpireDelApi,
  wafSslExpireDetailApi,
  wafSslExpireEditApi,
  wafSslExpireListApi,
  wafSslExpireNowCheckApi,
  wafSslExpireSyncHostApi,
} from '@/apis/ssl_expire';
import { getOnlineUrl } from '@/utils/usuallytool';

const { t } = useI18n();

const INITIAL_DATA = {
  domain: '',
  port: '443',
  visit_log: '',
  status: '',
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  domain: [{ required: true, message: t('common.placeholder') + t('page.ssl_expire.domain'), type: 'error' }],
  port: [{ required: true, message: t('common.placeholder') + t('page.ssl_expire.port'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const searchformData = reactive<Record<string, any>>({});
const deleteIdx = ref(-1);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 100,
});

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.ssl_expire.domain'), width: 200, ellipsis: true, colKey: 'domain' },
  { title: t('page.ssl_expire.port'), width: 100, ellipsis: true, colKey: 'port' },
  { title: t('page.ssl_expire.valid_to'), width: 300, ellipsis: true, colKey: 'valid_to' },
  { title: t('page.ssl_expire.visit_log'), width: 200, ellipsis: true, colKey: 'visit_log' },
  { title: t('common.update_time'), width: 200, ellipsis: true, colKey: 'update_time', sorter: true },
  { align: 'left', fixed: 'right', width: 200, colKey: 'op', title: t('common.op') },
]);

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

onMounted(() => {
  getList();
});

// 判断是否是IP地址
function isIpAddress(domain: string) {
  if (!domain) return false;
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(domain) || ipv6Regex.test(domain);
}

function handleSyncHost() {
  wafSslExpireSyncHostApi()
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function handleCheck() {
  wafSslExpireNowCheckApi()
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function getList() {
  dataLoading.value = true;
  wafSslExpireListApi({
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
  getList();
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

const onSubmit: FormProps['onSubmit'] = ({ validateResult, firstError }) => {
  if (validateResult === true) {
    const postdata: Record<string, any> = { ...formData.value };
    postdata.port = Number(postdata.port);
    wafSslExpireAddApi(postdata)
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
    MessagePlugin.warning(firstError || '');
  }
};

const onSubmitEdit: FormProps['onSubmit'] = ({ validateResult, firstError }) => {
  if (validateResult === true) {
    const postdata: Record<string, any> = { ...formEditData.value };
    postdata.port = Number(postdata.port);
    wafSslExpireEditApi(postdata)
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
    MessagePlugin.warning(firstError || '');
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
  wafSslExpireDelApi({ id })
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
  wafSslExpireDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        const detail = res.data;
        detail.port = detail.port.toString();
        formEditData.value = { ...detail };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/SSL.html`);
}
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.left-operation-container .selected-count {
  display: inline-block;
  margin-left: 8px;
  color: var(--td-text-color-secondary);
}

.search-input {
  width: 360px;
}

.t-button + .t-button {
  margin-left: 8px;
}
</style>
