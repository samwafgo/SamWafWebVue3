<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container"></div>
        <t-input v-model="searchValue" class="search-input" :placeholder="t('page.syslog.syslog')" clearable>
          <template #suffix-icon>
            <search-icon size="20px" />
          </template>
        </t-input>
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
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.details') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.details')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :label-width="100">
        <t-form-item :label="t('page.syslog.label_op_type')" name="op_type">
          <t-input v-model="formEditData.op_type" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.syslog.label_op_content')" name="op_content">
          <t-textarea v-model="formEditData.op_content" :style="{ width: '480px' }" name="op_content"> </t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PageInfo, TableProps } from 'tdesign-vue-next';
import { SearchIcon } from 'tdesign-icons-vue-next';

import { sys_log_detail_api, sys_log_list_api } from '@/apis/syslog';

const { t } = useI18n();

const INITIAL_DATA = {
  login_account: '',
  op_type: '',
  op_content: '',
};

const editFormVisible = ref(false);
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const searchValue = ref('');

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.syslog.label_op_type'), width: 200, ellipsis: true, colKey: 'op_type' },
  { title: t('page.syslog.label_op_content'), width: 200, ellipsis: true, colKey: 'op_content' },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

onMounted(() => {
  getList();
});

function getList() {
  dataLoading.value = true;
  sys_log_list_api({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    op_type: '',
    op_content: '',
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

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function getDetail(id: string | number) {
  sys_log_detail_api({ id })
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
