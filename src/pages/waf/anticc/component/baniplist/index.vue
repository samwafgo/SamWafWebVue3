<template>
  <div>
    <t-card class="list-card-container">
      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
          @filter-change="onFilterChange"
        >
          <template #op="slotProps">
            <a class="t-button-link" @click="handleRemoveBanIp(slotProps)">{{ t('page.cc.remove_ban_ip') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { wafAntiCCBanIPListApi, wafAntiCCRemoveBanIpApi } from '@/apis/anticc';

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'code';

const columns = computed<TableProps['columns']>(() => [
  {
    title: t('page.cc.ban_ip'),
    align: 'left',
    ellipsis: true,
    colKey: 'ip',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  { title: t('page.cc.ban_remain_time'), width: 150, ellipsis: true, colKey: 'remain_time' },
  { title: t('page.cc.ban_ip_belong'), width: 200, ellipsis: true, colKey: 'region' },
  { align: 'left', width: 150, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({ host_code: '' });

function getList() {
  dataLoading.value = true;
  wafAntiCCBanIPListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
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

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function handleRemoveBanIp(e: { row: Record<string, any> }) {
  wafAntiCCRemoveBanIpApi({ ip: e.row.ip })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e2: Error) => {
      console.log(e2);
    });
}

/** 本地筛选封禁 IP */
const onFilterChange: TableProps['onFilterChange'] = (e: Record<string, any>) => {
  if (e.ip) {
    data.value = data.value.filter((item) => item.ip.includes(e.ip));
  } else {
    getList();
  }
};

// 父组件通过 ref 调用刷新
defineExpose({ getList });

onMounted(() => {
  getList();
});
</script>

<style scoped></style>
