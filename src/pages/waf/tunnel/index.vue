<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd"> {{ t('page.tunnel.new_tunnel') }} </t-button>
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
      <t-alert theme="info" :message="t('page.tunnel.alert_message')" close>
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
          <template #start_status="{ row }">
            <t-tag v-if="row.start_status === '1' || row.start_status === 1" theme="success">
              {{ t('common.status_runtime_option.running') }}
            </t-tag>
            <t-tag v-else theme="warning">
              {{ t('common.status_runtime_option.stopped') }}
            </t-tag>
          </template>
          <template #ip_version="{ row }">
            <t-tag v-if="row.ip_version === 'ipv4'" theme="primary">
              {{ t('page.tunnel.ip_version_ipv4') }}
            </t-tag>
            <t-tag v-else-if="row.ip_version === 'ipv6'" theme="success">
              {{ t('page.tunnel.ip_version_ipv6') }}
            </t-tag>
            <t-tag v-else theme="warning">
              {{ t('page.tunnel.ip_version_both') }}
            </t-tag>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickShowConnections(slotProps)">{{ t('page.tunnel.view_connections') }}</a>
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="720" :footer="false">
      <tunnel-form :value="formData" @close="onClickCloseBtn" @submit="onSubmit"></tunnel-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="720" :footer="false">
      <tunnel-form :value="formEditData" :is-edit="true" @close="onClickCloseEditBtn" @submit="onSubmitEdit"></tunnel-form>
    </t-dialog>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    >
    </t-dialog>

    <!-- 隧道连接数据对话框 -->
    <t-dialog
      v-model:visible="connectionsVisible"
      :header="t('page.tunnel.show_connections')"
      :width="900"
      :on-cancel="() => (connectionsVisible = false)"
      @confirm="connectionsVisible = false"
    >
      <connection-list :key="selectedTunnelCode" :tunnel-code="selectedTunnelCode"></connection-list>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import { wafTunnelAddApi, wafTunnelDelApi, wafTunnelDetailApi, wafTunnelEditApi, wafTunnelListApi } from '@/apis/tunnel';
import { INITIAL_DATA } from './constants';
import TunnelForm from './components/TunnelForm.vue';
import ConnectionList from './components/ConnectionList.vue';
import { getOnlineUrl } from '@/utils/usuallytool';

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const searchformData = reactive({});
const deleteIdx = ref(-1);

// 连接数据对话框
const connectionsVisible = ref(false);
const selectedTunnelCode = ref('');

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.tunnel.name'), width: 200, ellipsis: true, colKey: 'name' },
  { title: t('page.tunnel.protocol'), width: 100, ellipsis: true, colKey: 'protocol' },
  { title: t('page.tunnel.port'), width: 200, ellipsis: true, colKey: 'port' },
  { title: t('page.tunnel.start_status'), width: 100, ellipsis: true, colKey: 'start_status' },
  { title: t('page.tunnel.remote_port'), width: 100, ellipsis: true, colKey: 'remote_port' },
  { title: t('page.tunnel.remote_ip'), width: 100, ellipsis: true, colKey: 'remote_ip' },
  { title: t('page.tunnel.allow_ip'), width: 200, ellipsis: true, colKey: 'allow_ip' },
  { title: t('page.tunnel.deny_ip'), width: 200, ellipsis: true, colKey: 'deny_ip' },
  { title: t('page.tunnel.allowed_time_ranges'), width: 200, ellipsis: true, colKey: 'allowed_time_ranges' },
  { title: t('page.tunnel.ip_version'), width: 120, ellipsis: true, colKey: 'ip_version' },
  { title: t('page.tunnel.conn_timeout'), width: 100, ellipsis: true, colKey: 'conn_timeout' },
  { title: t('page.tunnel.remark'), width: 200, ellipsis: true, colKey: 'remark' },
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

function handleClickShowConnections(slotProps: { row: Record<string, any> }) {
  const { code } = slotProps.row;
  selectedTunnelCode.value = code;
  connectionsVisible.value = true;
}

function getList(keyword?: string) {
  if (keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  wafTunnelListApi({
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

function onSubmit(payload: { result: Record<string, any> }) {
  wafTunnelAddApi({ ...payload.result })
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
}

function onSubmitEdit(payload: { result: Record<string, any> }) {
  wafTunnelEditApi({ ...payload.result })
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
}

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
  wafTunnelDelApi({ id })
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
  wafTunnelDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        const detail = res.data;
        detail.remote_port = detail.remote_port.toString();
        detail.start_status = detail.start_status.toString();
        detail.conn_timeout = detail.conn_timeout.toString();
        detail.read_timeout = detail.read_timeout.toString();
        detail.write_timeout = detail.write_timeout.toString();
        detail.max_in_connect = detail.max_in_connect.toString();
        detail.max_out_connect = detail.max_out_connect.toString();
        // 处理 allowed_time_ranges 字段，确保不是 null 或 undefined
        detail.allowed_time_ranges = detail.allowed_time_ranges || '';
        // 处理 ip_version 字段，确保不是 null 或 undefined，默认为 both
        detail.ip_version = detail.ip_version || 'both';
        // 处理 SSL 相关字段，确保老记录有默认值（平滑升级）
        detail.ssl_status = detail.ssl_status != null && detail.ssl_status !== '' ? Number(detail.ssl_status) : 0;
        detail.ssl_certificate = detail.ssl_certificate || '';
        detail.ssl_certificate_key = detail.ssl_certificate_key || '';
        detail.ssl_protocols = detail.ssl_protocols || 'TLSv1.2 TLSv1.3';

        formEditData.value = { ...detail };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/Tunnel.html`);
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
