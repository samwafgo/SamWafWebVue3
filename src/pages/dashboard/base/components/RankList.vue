<template>
  <t-row :gutter="[16, 16]">
    <t-col :xs="12" :xl="6">
      <t-card :title="t('dashboard.ip_rank.attack_title')" class="dashboard-rank-card">
        <template #actions>
          <t-radio-group v-model="rangeType" default-value="day" @change="handelTimeChange">
            <t-radio-button value="day">{{ t('dashboard.ip_rank.day') }}</t-radio-button>
            <t-radio-button value="week">{{ t('dashboard.ip_rank.week') }}</t-radio-button>
          </t-radio-group>
        </template>
        <t-table :data="attackNowList" :columns="rankColumns" row-key="ip">
          <template #index="{ rowIndex }">
            <span :class="getRankClass(rowIndex)">
              {{ rowIndex + 1 }}
            </span>
          </template>
          <template #iptags="{ row }">
            <t-tag
              v-for="(item, index) in row.ip_tags"
              :key="index"
              :theme="item.ip_tag === '正常' ? 'success' : 'danger'"
              variant="light"
              style="margin: 3px"
              >{{ item.ip_tag }}</t-tag
            >
          </template>
          <template #operation="{ row }">
            <t-button v-if="row.ip" size="small" variant="text" @click="handleIpClick(row.ip)"> 🔍 </t-button>
          </template>
        </t-table>
      </t-card>
    </t-col>
    <t-col :xs="12" :xl="6">
      <t-card :title="t('dashboard.ip_rank.normal_title')" class="dashboard-rank-card">
        <template #actions>
          <t-radio-group v-model="rangeType" @change="handelTimeChange">
            <t-radio-button value="day">{{ t('dashboard.ip_rank.day') }}</t-radio-button>
            <t-radio-button value="week">{{ t('dashboard.ip_rank.week') }}</t-radio-button>
          </t-radio-group>
        </template>
        <t-table :data="normalNowList" :columns="rankColumns" row-key="ip">
          <template #index="{ rowIndex }">
            <span :class="getRankClass(rowIndex)">
              {{ rowIndex + 1 }}
            </span>
          </template>
          <template #iptags="{ row }">
            <t-tag
              v-for="(item, index) in row.ip_tags"
              :key="index"
              :theme="item.ip_tag === '正常' ? 'success' : 'danger'"
              variant="light"
              style="margin: 3px"
              >{{ item.ip_tag }}</t-tag
            >
          </template>
          <template #operation="{ row }">
            <t-button v-if="row.ip" size="small" variant="text" @click="handleIpClick(row.ip)"> 🔍 </t-button>
          </template>
        </t-table>
      </t-card>
    </t-col>
  </t-row>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { TableProps } from 'tdesign-vue-next';

import { LAST_7_DAYS, NowDate } from '@/utils/date';
import { wafstatsumdaytopiprangeapi } from '@/apis/stats';

const { t } = useI18n();
const router = useRouter();

const rankColumns = computed<TableProps['columns']>(() => [
  { align: 'center', colKey: 'index', title: t('dashboard.ip_rank.rank'), width: 80, fixed: 'left' },
  { align: 'left', ellipsis: true, colKey: 'ip', title: t('dashboard.ip_rank.ip'), minWidth: 100 },
  { align: 'left', ellipsis: true, colKey: 'iptags', title: t('dashboard.ip_rank.tag'), minWidth: 200 },
  { align: 'center', colKey: 'ip_belong', width: 100, title: t('dashboard.ip_rank.ip_belong') },
  { align: 'center', colKey: 'count', title: t('dashboard.ip_rank.counter'), width: 100 },
  { align: 'center', colKey: 'operation', title: '操作', width: 60 },
]);

const rangeType = ref('day'); // 时间类型 日 周
const rangeStartDay = ref('');
const rangeEndDay = ref('');
const attackNowList = ref<Record<string, any>[]>([]);
const normalNowList = ref<Record<string, any>[]>([]);

onMounted(() => {
  setRangeValue();
  loadTopIp();
});

function setRangeValue() {
  if (rangeType.value === 'day') {
    rangeStartDay.value = NowDate.replace(/-/g, '');
    rangeEndDay.value = NowDate.replace(/-/g, '');
  } else if (rangeType.value === 'week') {
    rangeStartDay.value = LAST_7_DAYS[0].replace(/-/g, '');
    rangeEndDay.value = LAST_7_DAYS[1].replace(/-/g, '');
  }
}

function loadTopIp() {
  wafstatsumdaytopiprangeapi({ start_day: rangeStartDay.value, end_day: rangeEndDay.value })
    .then((res) => {
      attackNowList.value = fillEmptyRows(res.data.AttackIPOfRange || []);
      normalNowList.value = fillEmptyRows(res.data.NormalIPOfRange || []);
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 补充空行，确保列表长度至少为 10
function fillEmptyRows(list: Record<string, any>[]) {
  const targetLength = 10;
  const emptyRow = { count: '', ip: '', ip_belong: '', ip_tags: [] };
  while (list.length < targetLength) {
    list.push({ ...emptyRow });
  }
  return list;
}

function getRankClass(index: number) {
  return ['dashboard-rank__cell', { 'dashboard-rank__cell--top': index < 3 }];
}

function handelTimeChange(val: any) {
  rangeType.value = val as string;
  setRangeValue();
  loadTopIp();
}

function handleIpClick(ip: string) {
  if (ip && ip.trim() !== '') {
    router.push({
      name: 'WafvisitLog',
      query: { src_ip: ip },
    });
  }
}
</script>

<style scoped>
.dashboard-rank-card {
  padding: 8px;
}

.dashboard-rank-card :deep(.t-card__header) {
  padding-bottom: 24px;
}

.dashboard-rank-card :deep(.t-card__title) {
  font-size: 20px;
  font-weight: 500;
}

.dashboard-rank__cell {
  display: inline-flex;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
  font-size: 14px;
  background-color: var(--td-gray-color-5);
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.dashboard-rank__cell--top {
  background: var(--td-brand-color);
}
</style>
