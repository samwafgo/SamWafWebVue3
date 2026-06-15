<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container"></div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.oplatform.key_name')" name="key_name">
              <t-input v-model="searchformData.key_name" style="width: 160px" clearable />
            </t-form-item>
            <t-form-item :label="t('page.oplatform.log_path')" name="request_path">
              <t-input v-model="searchformData.request_path" style="width: 200px" clearable />
            </t-form-item>
            <t-form-item :label="t('page.oplatform.log_ip')" name="client_ip">
              <t-input v-model="searchformData.client_ip" style="width: 140px" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList">
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
          row-key="id"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
        >
          <template #status_code="slotProps">
            <t-tag :theme="slotProps.row.status_code === 200 ? 'success' : 'warning'">
              {{ slotProps.row.status_code }}
            </t-tag>
          </template>
          <template #duration="slotProps"> {{ slotProps.row.duration }} ms </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleDetail(slotProps)">{{ t('common.details') }}</a>
            <a class="t-button-link" style="color: #e34d59" @click="handleDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 删除确认对话框 -->
    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.delete')"
      :width="400"
      @confirm="onConfirmDelete"
      @cancel="confirmVisible = false"
    >
      <div>{{ t('page.oplatform.delete_confirm') }}</div>
    </t-dialog>

    <!-- 日志详情对话框 -->
    <t-dialog
      v-model:visible="detailDialogVisible"
      :header="t('page.oplatform.log_detail')"
      :width="800"
      :cancel-btn="null"
      @confirm="detailDialogVisible = false"
    >
      <t-form :label-width="120">
        <t-form-item :label="t('page.oplatform.key_name')">
          <span>{{ detailData.key_name }}</span>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.log_path')">
          <span>{{ detailData.request_method }} {{ detailData.request_path }}</span>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.log_ip')">
          <span>{{ detailData.client_ip }}</span>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.log_status')">
          <span>{{ detailData.status_code }}</span>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.log_duration')">
          <span>{{ detailData.duration }} ms</span>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.log_time')">
          <span>{{ detailData.time_str }}</span>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.log_request_body')">
          <t-textarea :value="detailData.request_body" readonly :style="{ width: '580px' }" :autosize="{ minRows: 3, maxRows: 8 }" />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.log_response_body')">
          <t-textarea :value="detailData.response_body" readonly :style="{ width: '580px' }" :autosize="{ minRows: 3, maxRows: 8 }" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import { oplatform_log_del_api, oplatform_log_detail_api, oplatform_log_list_api } from '@/apis/oplatform';

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});
const searchformData = reactive({
  key_name: '',
  request_path: '',
  client_ip: '',
});

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'key_name', title: t('page.oplatform.key_name'), width: 130 },
  { colKey: 'request_method', title: t('page.oplatform.log_method'), width: 80 },
  { colKey: 'request_path', title: t('page.oplatform.log_path'), width: 220, ellipsis: true },
  { colKey: 'client_ip', title: t('page.oplatform.log_ip'), width: 130 },
  { colKey: 'status_code', title: t('page.oplatform.log_status'), width: 90 },
  { colKey: 'duration', title: t('page.oplatform.log_duration'), width: 100 },
  { colKey: 'time_str', title: t('page.oplatform.log_time'), width: 160 },
  { colKey: 'op', title: t('common.operation'), width: 130, fixed: 'right' },
]);

const detailDialogVisible = ref(false);
const detailData = ref<Record<string, any>>({});
const confirmVisible = ref(false);
const confirmDeleteId = ref('');

onMounted(() => {
  getList();
});

function getList() {
  dataLoading.value = true;
  oplatform_log_list_api({
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
    key_name: searchformData.key_name,
    request_path: searchformData.request_path,
    client_ip: searchformData.client_ip,
  })
    .then((res) => {
      dataLoading.value = false;
      if (res && res.code === 0) {
        data.value = res.data.list || [];
        pagination.total = res.data.total;
      }
    })
    .catch(() => {
      dataLoading.value = false;
    });
}

function handleDetail(slotProps: { row: Record<string, any> }) {
  oplatform_log_detail_api({ id: slotProps.row.id }).then((res) => {
    if (res && res.code === 0) {
      detailData.value = res.data;
      detailDialogVisible.value = true;
    }
  });
}

function handleDelete(slotProps: { row: Record<string, any> }) {
  confirmDeleteId.value = slotProps.row.id;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  oplatform_log_del_api({ id: confirmDeleteId.value }).then((res) => {
    if (res && res.code === 0) {
      MessagePlugin.success(t('page.oplatform.delete_success'));
      getList();
    }
  });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
  getList();
}
</script>

<style scoped>
.list-card-container {
  padding: 16px;
}

.left-operation-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.right-operation-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
</style>
