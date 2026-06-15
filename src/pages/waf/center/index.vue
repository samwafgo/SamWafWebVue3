<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleChangeLocalClear"> {{ t('page.center.switch_local') }} </t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="80" colon :style="{ marginBottom: '8px' }">
            <t-row>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')"> {{ t('common.search') }}</t-button>
            </t-row>
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
            <a
              v-if="pagination.total <= freeClientCount || isVip"
              class="t-button-link"
              @click="handleClickChangeServer(slotProps)"
              >{{ t('page.center.server_switch_button') }}</a
            >
          </template>
        </t-table>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import { getLicenseDetailApi } from '@/apis/license';
import { centerListApi } from '@/apis/center';

const { t } = useI18n();

const INITIAL_REG_DATA = {
  version: '',
  username: '',
  member_type: '',
  machine_id: '',
  expiry_date: '',
  is_expiry: false,
};

const regData = ref<Record<string, any>>({ ...INITIAL_REG_DATA });
const isVip = ref(false);
const freeClientCount = 1;

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'id';
const searchformData = reactive({});

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.center.client_server_name'), align: 'left', width: 250, ellipsis: true, colKey: 'client_server_name' },
  { title: t('page.center.client_system_type'), width: 100, ellipsis: true, colKey: 'client_system_type' },
  { title: t('page.center.client_ip'), width: 150, ellipsis: true, colKey: 'client_ip' },
  { title: t('page.center.client_port'), width: 100, ellipsis: true, colKey: 'client_port' },
  { title: t('page.center.client_new_version'), width: 100, ellipsis: true, colKey: 'client_new_version' },
  { title: t('page.center.client_new_version_desc'), width: 200, ellipsis: true, colKey: 'client_new_version_desc' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
  { title: t('page.center.last_visit_time'), width: 200, ellipsis: true, colKey: 'last_visit_time' },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time' },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

onMounted(() => {
  getList('');
  loadCurrentLicense();
});

function loadCurrentLicense() {
  getLicenseDetailApi({})
    .then((res) => {
      if (res.code === 0) {
        regData.value = res.data.license;
        if (regData.value.username !== '' && regData.value.is_expiry === false) {
          isVip.value = true;
        }
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/**
 * 切换本机不进行数据处理
 */
function handleChangeLocalClear() {
  localStorage.removeItem('current_server');
  window.location.reload();
}

function getList(keyword?: string) {
  if (keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  centerListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list;
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

function handleClickChangeServer(e: { row: Record<string, any> }) {
  localStorage.setItem('current_server', JSON.stringify(e.row));
  window.location.reload();
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
