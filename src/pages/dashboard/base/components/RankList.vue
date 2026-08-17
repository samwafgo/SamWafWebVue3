<template>
  <t-row :gutter="[16, 16]">
    <t-col :xs="12" :xl="6">
      <t-card :title="t('dashboard.ip_rank.attack_title')" class="dashboard-rank-card">
        <template #actions>
          <t-radio-group v-model="rangeType" default-value="day" @change="handelTimeChange">
            <t-radio-button value="day">{{ t('dashboard.ip_rank.day') }}</t-radio-button>
            <t-radio-button value="week">{{ t('dashboard.ip_rank.week') }}</t-radio-button>
          </t-radio-group>
          <!-- 只借它的弹窗，触发按钮不显示；两张榜共用这一个实例 -->
          <ip-lookup ref="ipLookupRef" hide-trigger />
        </template>
        <t-table
          :data="attackNowList"
          :columns="rankColumns"
          row-key="ip"
          stripe
          hover
          :loading="loading"
          :empty="t('dashboard.empty_data')"
        >
          <template #index="{ rowIndex }">
            <span :class="getRankClass(rowIndex)">{{ rowIndex + 1 }}</span>
          </template>
          <template #ip="{ row }">
            <t-tooltip v-if="row.ip" :content="t('common.ip_lookup.click_tip')">
              <a class="ipl-link" @click="openIpLookup(row.ip)">{{ row.ip }}</a>
            </t-tooltip>
          </template>
          <template #iptags="{ row }">
            <ip-tag-cell :ip="row.ip" :tags="row.ip_tags" @view-log="handleIpClick" />
          </template>
          <template #operation="{ row }">
            <t-button
              v-if="row.ip"
              size="small"
              variant="text"
              shape="square"
              class="rank-search-btn"
              :aria-label="t('dashboard.ip_rank.lookup')"
              @click="handleIpClick(row.ip)"
            >
              <search-icon />
            </t-button>
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
        <t-table
          :data="normalNowList"
          :columns="rankColumns"
          row-key="ip"
          stripe
          hover
          :loading="loading"
          :empty="t('dashboard.empty_data')"
        >
          <template #index="{ rowIndex }">
            <span :class="getRankClass(rowIndex)">{{ rowIndex + 1 }}</span>
          </template>
          <template #ip="{ row }">
            <t-tooltip v-if="row.ip" :content="t('common.ip_lookup.click_tip')">
              <a class="ipl-link" @click="openIpLookup(row.ip)">{{ row.ip }}</a>
            </t-tooltip>
          </template>
          <template #iptags="{ row }">
            <ip-tag-cell :ip="row.ip" :tags="row.ip_tags" @view-log="handleIpClick" />
          </template>
          <template #operation="{ row }">
            <t-button
              v-if="row.ip"
              size="small"
              variant="text"
              shape="square"
              class="rank-search-btn"
              :aria-label="t('dashboard.ip_rank.lookup')"
              @click="handleIpClick(row.ip)"
            >
              <search-icon />
            </t-button>
          </template>
        </t-table>
      </t-card>
    </t-col>
  </t-row>
</template>

<script setup lang="ts">
import { SearchIcon } from 'tdesign-icons-vue-next';
import type { TableProps } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { wafstatsumdaytopiprangeapi } from '@/apis/stats';
import { LAST_7_DAYS, NowDate } from '@/utils/date';

import IpTagCell from './IpTagCell.vue';

const { t } = useI18n();
const router = useRouter();

const rankColumns = computed<TableProps['columns']>(() => [
  { align: 'center', colKey: 'index', title: t('dashboard.ip_rank.rank'), width: 80, fixed: 'left' },
  { align: 'left', ellipsis: true, colKey: 'ip', title: t('dashboard.ip_rank.ip'), minWidth: 100 },
  { align: 'left', colKey: 'iptags', title: t('dashboard.ip_rank.tag'), minWidth: 200 },
  { align: 'center', colKey: 'ip_belong', width: 100, title: t('dashboard.ip_rank.ip_belong') },
  { align: 'center', colKey: 'count', title: t('dashboard.ip_rank.counter'), width: 100 },
  { align: 'center', colKey: 'operation', title: '操作', width: 60 },
]);

const loading = ref(false);
const rangeType = ref('day'); // 时间类型 日 周
const rangeStartDay = ref('');
const rangeEndDay = ref('');
const attackNowList = ref<Record<string, any>[]>([]);
const normalNowList = ref<Record<string, any>[]>([]);

// 点列表里的 IP 直接开归属查询，和访问日志页一致
const ipLookupRef = ref<any>(null);
function openIpLookup(ip: string) {
  if (!ip) return;
  ipLookupRef.value?.open(ip);
}

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
  loading.value = true;
  wafstatsumdaytopiprangeapi({ start_day: rangeStartDay.value, end_day: rangeEndDay.value })
    .then((res) => {
      attackNowList.value = fillEmptyRows(res.data.AttackIPOfRange || []);
      normalNowList.value = fillEmptyRows(res.data.NormalIPOfRange || []);
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      loading.value = false;
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
  return ['dashboard-rank__cell', index < 3 ? `dashboard-rank__cell--${index + 1}` : ''];
}

function handelTimeChange(val: any) {
  rangeType.value = val as string;
  setRangeValue();
  loadTopIp();
}

function handleIpClick(ip: string) {
  if (ip && ip.trim() !== '') {
    // 带上当前榜单的时间口径（今日/近7天），否则点"近7天"榜里的 IP 落地页只查当天会是空列表
    const beginDay = rangeType.value === 'week' ? LAST_7_DAYS[0] : NowDate;
    router
      .push({
        name: 'WafvisitLog',
        query: {
          src_ip: ip,
          action: '', // 显式清空状态筛选，避免沿用上次的"阻止/禁止"
          date_begin: `${beginDay} 00:00:00`,
          date_end: `${NowDate} 23:59:59`,
        },
      })
      // vue-router4 重复导航不再 reject（返回 NavigationFailure），这里只兜真实的导航异常
      .catch((err: any) => {
        console.warn(err);
      });
  }
}
</script>

<style scoped>
.dashboard-rank-card {
  padding: 8px;
}

.dashboard-rank-card :deep(.t-card__header) {
  padding-bottom: 20px;
}

.dashboard-rank-card :deep(.t-card__title) {
  font-size: 16px;
  font-weight: 600;
}

.dashboard-rank-card :deep(.t-table__header th) {
  background: var(--td-bg-color-component);
  color: var(--td-text-color-secondary);
  font-weight: 600;
}

.ipl-link {
  color: var(--td-brand-color);
  cursor: pointer;
}

.ipl-link:hover {
  color: var(--td-brand-color-hover);
  text-decoration: underline;
}

.rank-search-btn {
  color: var(--td-text-color-placeholder);
}

.rank-search-btn:hover {
  color: var(--td-brand-color);
}

.dashboard-rank__cell {
  display: inline-flex;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: var(--td-bg-color-component);
  color: var(--td-text-color-secondary);
}

/* 前三名奖牌色 */
.dashboard-rank__cell--1 {
  background: linear-gradient(135deg, #f7c94f, #e3a62d);
  color: #fff;
  box-shadow: 0 2px 6px -2px rgba(227, 166, 45, 0.5);
}

.dashboard-rank__cell--2 {
  background: linear-gradient(135deg, #d3dbe6, #94a3b8);
  color: #fff;
  box-shadow: 0 2px 6px -2px rgba(148, 163, 184, 0.5);
}

.dashboard-rank__cell--3 {
  background: linear-gradient(135deg, #e9a16b, #c67a3f);
  color: #fff;
  box-shadow: 0 2px 6px -2px rgba(198, 122, 63, 0.5);
}
</style>
