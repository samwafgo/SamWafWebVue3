<template>
  <div>
    <t-alert theme="info" :message="t('page.threatip.landed_tip')" close style="margin-bottom: 12px" />
    <t-table :columns="columns" :data="data" row-key="code" vertical-align="top" hover :loading="loading">
      <template #land_target="{ row }">
        <span>{{ landTargetLabel(row.land_target) }}</span>
      </template>
      <template #enable="{ row }">
        <t-tag v-if="row.enable === 1" theme="success" variant="light">{{ t('page.threatip.enabled') }}</t-tag>
        <t-tag v-else theme="default" variant="light">{{ t('page.threatip.disabled') }}</t-tag>
      </template>
      <template #count="{ row }">
        <t-tag :theme="row.enable === 1 ? 'primary' : 'default'" variant="light">{{ row.count }}</t-tag>
        <span v-if="row.enable !== 1 && row.snapshot_count > 0" class="snapshot-hint">
          {{ t('page.threatip.snapshot_hint', { count: row.snapshot_count }) }}
        </span>
      </template>
      <template #last_sync_at="{ row }">
        <span>{{ formatTs(row.last_sync_at) }}</span>
      </template>
      <template #op="{ row }">
        <a class="t-button-link" @click="handleViewIPs(row)">{{ t('page.threatip.view_ips') }}</a>
      </template>
    </t-table>

    <!-- 某渠道落地 IP 只读浏览 -->
    <t-dialog v-model:visible="ipDialogVisible" :header="ipDialogTitle" :width="640" :footer="false">
      <t-form :data="ipSearch" layout="inline" colon :style="{ marginBottom: '8px' }">
        <t-form-item label="IP" name="keyword">
          <t-input
            v-model="ipSearch.keyword"
            clearable
            :style="{ width: '260px' }"
            :placeholder="t('page.threatip.view_ips_search_tip')"
            @enter="reloadIPs"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="reloadIPs">{{ t('common.search') }}</t-button>
        </t-form-item>
      </t-form>
      <t-table
        :columns="ipColumns"
        :data="ipData"
        row-key="ip"
        vertical-align="top"
        hover
        :pagination="ipPagination"
        :loading="ipLoading"
        @page-change="onIPPageChange"
      />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PageInfo, TableProps } from 'tdesign-vue-next';
import { wafThreatIPLandedSummaryApi, wafThreatIPLandedIPsApi } from '@/apis/threatip';

const props = defineProps<{
  // system | waf : 只展示落地到该层的渠道
  land?: string;
}>();

const { t } = useI18n();

const loading = ref(false);
const data = ref<Record<string, any>[]>([]);

const landOptions = computed(() => [
  { value: 'waf', label: t('page.threatip.land_waf') },
  { value: 'system', label: t('page.threatip.land_system') },
  { value: 'both', label: t('page.threatip.land_both') },
]);

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.threatip.label_name'), align: 'left', width: 160, ellipsis: true, colKey: 'name' },
  { title: t('page.threatip.label_code'), width: 120, ellipsis: true, colKey: 'code' },
  { title: t('page.threatip.label_land'), width: 100, colKey: 'land_target' },
  { title: t('page.threatip.label_enable'), width: 90, colKey: 'enable' },
  { title: t('page.threatip.landed_count'), width: 190, colKey: 'count' },
  { title: t('page.threatip.last_status'), align: 'left', ellipsis: true, colKey: 'last_status' },
  { title: t('page.threatip.last_sync_at'), width: 170, colKey: 'last_sync_at' },
  { align: 'left', width: 100, colKey: 'op', title: t('common.op') },
]);

// IP 浏览弹窗
const ipDialogVisible = ref(false);
const ipDialogTitle = ref('');
const ipChannelCode = ref('');
const ipSearch = reactive({ keyword: '' });
const ipLoading = ref(false);
const ipData = ref<Record<string, any>[]>([]);
const ipPagination = reactive({ total: 0, current: 1, pageSize: 10 });
const ipColumns = computed<TableProps['columns']>(() => [{ title: 'IP / CIDR', align: 'left', colKey: 'ip' }]);

function landTargetLabel(v: string) {
  const found = landOptions.value.find((o) => o.value === v);
  return found ? found.label : v;
}

function formatTs(ts: number) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString();
}

function loadSummary() {
  loading.value = true;
  wafThreatIPLandedSummaryApi({ land: props.land ?? '' })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data ?? [];
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      loading.value = false;
    });
}

function handleViewIPs(row: Record<string, any>) {
  ipChannelCode.value = row.code;
  ipDialogTitle.value = `${row.name} (${row.code})`;
  ipSearch.keyword = '';
  ipPagination.current = 1;
  ipDialogVisible.value = true;
  loadIPs();
}

function reloadIPs() {
  ipPagination.current = 1;
  loadIPs();
}

function loadIPs() {
  ipLoading.value = true;
  wafThreatIPLandedIPsApi({
    code: ipChannelCode.value,
    keyword: ipSearch.keyword,
    pageIndex: ipPagination.current,
    pageSize: ipPagination.pageSize,
  })
    .then((res) => {
      if (res.code === 0) {
        const list = res.data.list ?? [];
        ipData.value = list.map((ip: string) => ({ ip }));
        ipPagination.total = res.data.total;
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      ipLoading.value = false;
    });
}

function onIPPageChange(curr: PageInfo) {
  ipPagination.current = curr.current;
  if (ipPagination.pageSize !== curr.pageSize) {
    ipPagination.current = 1;
    ipPagination.pageSize = curr.pageSize;
  }
  loadIPs();
}

// 供父页切换到本 Tab 时主动刷新
function refresh() {
  loadSummary();
}

defineExpose({ refresh });

onMounted(() => {
  loadSummary();
});
</script>

<style scoped>
.snapshot-hint {
  margin-left: 6px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
