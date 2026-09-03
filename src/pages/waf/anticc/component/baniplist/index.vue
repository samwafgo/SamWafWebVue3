<template>
  <div>
    <t-card class="list-card-container">
      <div class="ban-toolbar">
        <t-button variant="outline" size="small" :loading="dataLoading" @click="getList">
          {{ t('common.refresh') }}
        </t-button>
        <t-select
          v-model="filterScope"
          size="small"
          :style="{ width: '220px', marginLeft: '8px' }"
          @change="applyFilter"
        >
          <t-option value="" :label="t('page.ccrule.ban_filter_all')" />
          <t-option value="global" :label="t('page.ccrule.ban_scope_global')" />
          <t-option v-for="h in bannedHosts" :key="h.code" :value="h.code" :label="h.name" />
        </t-select>
        <span class="ban-toolbar-tip">{{ t('page.ccrule.ban_refresh_tip') }}</span>
      </div>
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
          <template #scope="{ row }">
            <template v-if="row.scope === 'host'">
              <t-tag theme="primary" variant="light">{{ t('page.ccrule.ban_scope_host') }}</t-tag>
              <span class="ban-host-name">{{ hostName(row) }}</span>
            </template>
            <t-tag v-else theme="warning" variant="light">{{ t('page.ccrule.ban_scope_global') }}</t-tag>
          </template>

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
import { allhost } from '@/apis/host';

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]); // 当前筛选后的视图
const rawData = ref<Record<string, any>[]>([]); // 接口返回的原始数据，筛选都在它之上做
const filterScope = ref(''); // 作用范围：空=全部，global=全局生效，其余为站点码
const ipKeyword = ref(''); // IP 列的筛选关键字
const hosts = ref<Record<string, any>[]>([]);
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
  { title: t('page.ccrule.ban_col_scope'), minWidth: 220, ellipsis: true, colKey: 'scope' },
  { align: 'left', width: 150, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({ host_code: '' });

const hostDict = computed(() => {
  const dict: Record<string, string> = {};
  (hosts.value || []).forEach((h: any) => {
    dict[h.value] = h.pre_host || h.label;
  });
  return dict;
});

function hostName(row: Record<string, any>) {
  if (!row) return '-';
  return row.host_name || hostDict.value[row.host_code] || row.host_code || '-';
}

// 只列出当前确实有封禁的站点，避免下拉里塞一堆选了也没结果的站点
const bannedHosts = computed(() => {
  const seen: Record<string, boolean> = {};
  const list: { code: string; name: string }[] = [];
  (rawData.value || []).forEach((r: any) => {
    if (r.scope !== 'host' || !r.host_code || seen[r.host_code]) return;
    seen[r.host_code] = true;
    list.push({ code: r.host_code, name: hostName(r) });
  });
  return list;
});

function loadHosts() {
  // 后端返回的 host_name 是「域名:端口」形式的显示名（同一域名常有多个端口各成一个站点）；
  // 万一取不到（例如站点已删除），再用站点列表兜一层，最后才退回站点码——
  // 直接显示一串 UUID 对用户没有意义
  allhost({})
    .then((res: any) => {
      if (res.code === 0) hosts.value = res.data || [];
    })
    .catch(() => {
      /* 只是显示用，取不到不影响封禁列表本身 */
    });
}

/**
 * 作用范围与 IP 关键字两个筛选条件叠加生效，都在 rawData 之上做，
 * 免得先筛一次之后 data 变小、第二个条件在残缺数据上过滤
 */
function applyFilter() {
  let list = rawData.value || [];
  if (filterScope.value === 'global') {
    list = list.filter((r: any) => r.scope !== 'host');
  } else if (filterScope.value) {
    list = list.filter((r: any) => r.host_code === filterScope.value);
  }
  if (ipKeyword.value) {
    list = list.filter((r: any) => (r.ip || '').includes(ipKeyword.value));
  }
  data.value = list;
  pagination.total = list.length;
}

function getList() {
  dataLoading.value = true;
  wafAntiCCBanIPListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
  })
    .then((res: any) => {
      if (res.code === 0) {
        rawData.value = res.data.list || [];
        // 选中的站点这一轮可能已经没有封禁了，筛选条件留着会显示空列表，退回全部
        if (
          filterScope.value &&
          filterScope.value !== 'global' &&
          !rawData.value.some((r: any) => r.host_code === filterScope.value)
        ) {
          filterScope.value = '';
        }
        applyFilter();
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
    .then((res: any) => {
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

const onFilterChange: TableProps['onFilterChange'] = (e: Record<string, any>) => {
  ipKeyword.value = e.ip || '';
  applyFilter();
};

// 父组件通过 ref 调用刷新
defineExpose({ getList });

onMounted(() => {
  loadHosts();
  getList();
});
</script>

<style scoped>
.ban-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.ban-toolbar .ban-toolbar-tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.ban-host-name {
  margin-left: 8px;
  color: var(--td-text-color-secondary);
}
</style>
