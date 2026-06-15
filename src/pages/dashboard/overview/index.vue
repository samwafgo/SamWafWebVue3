<template>
  <div class="site-overview">
    <!-- 日期选择器 -->
    <t-card :bordered="false" class="filter-card">
      <t-row align="middle" :gutter="16">
        <t-col flex="none">
          <span class="filter-label">{{ t('page.overview.date_range') }}</span>
        </t-col>
        <t-col flex="none">
          <t-date-range-picker
            v-model="dateRange"
            mode="date"
            :presets="datePresets"
            format="YYYY-MM-DD"
            value-type="YYYYMMDD"
            @change="onDateRangeChange"
          />
        </t-col>
      </t-row>
    </t-card>

    <!-- 顶部汇总卡片 -->
    <t-row :gutter="[16, 16]" class="summary-cards">
      <t-col v-for="card in summaryCards" :key="card.key" :xs="12" :sm="6" :xl="4">
        <t-card :bordered="false" :class="['summary-card', card.colorClass]">
          <div class="card-content">
            <div class="card-info">
              <div class="card-title">{{ card.title }}</div>
              <div class="card-value">{{ card.value }}</div>
            </div>
            <div class="card-icon">
              <component :is="card.icon" size="32px" />
            </div>
          </div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 站点实时安全明细表格 -->
    <t-card :bordered="false" class="site-table-card" :title="t('page.overview.site_detail_title')">
      <template #actions>
        <span class="table-hint">{{ t('page.overview.click_row_hint') }}</span>
      </template>
      <t-table :data="siteList" :columns="columns" row-key="host_code" hover :loading="loading" stripe @row-click="onRowClick">
        <template #host="{ row }">
          <div>
            <div class="site-name" :title="row.host_remark || row.host">{{ row.host_remark || row.host }}</div>
            <div class="site-code" :title="row.host">{{ row.host }}</div>
          </div>
        </template>
        <template #traffic_in_mb="{ row }">
          {{ formatTraffic(row.traffic_in_mb) }}
        </template>
        <template #traffic_out_mb="{ row }">
          {{ formatTraffic(row.traffic_out_mb) }}
        </template>
        <template #attack_count="{ row }">
          <span class="attack-num">{{ row.attack_count.toLocaleString() }}</span>
        </template>
      </t-table>
    </t-card>

    <!-- 站点详情弹窗 -->
    <t-dialog
      v-model:visible="detailVisible"
      :header="detailHost"
      width="900px"
      :footer="false"
      placement="center"
      @close="onDetailClose"
    >
      <div class="detail-content">
        <!-- 时间范围切换 -->
        <div class="detail-header">
          <t-radio-group v-model="timeRange" variant="default-filled" @change="loadDetail">
            <t-radio-button value="24h">{{ t('page.overview.range_24h') }}</t-radio-button>
            <t-radio-button value="7d">{{ t('page.overview.range_7d') }}</t-radio-button>
            <t-radio-button value="30d">{{ t('page.overview.range_30d') }}</t-radio-button>
          </t-radio-group>
        </div>
        <t-row :gutter="16">
          <!-- 折线图 -->
          <t-col :span="9">
            <t-loading :loading="detailLoading" style="width: 100%">
              <div ref="detailChartContainer" class="detail-chart"></div>
            </t-loading>
          </t-col>
          <!-- 右侧统计指标 -->
          <t-col :span="3">
            <div class="detail-metrics">
              <div class="metric-item">
                <div class="metric-label">{{ t('page.overview.avg_response') }}</div>
                <div class="metric-value">{{ detailAvgTime }}<span class="unit">ms</span></div>
              </div>
              <div class="metric-item">
                <div class="metric-label">{{ t('page.overview.normal_rate') }}</div>
                <div class="metric-value metric-green">{{ detailNormalRate }}<span class="unit">%</span></div>
              </div>
            </div>
          </t-col>
        </t-row>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { TableProps } from 'tdesign-vue-next';
import {
  CloudUploadIcon,
  HourglassIcon,
  RootListIcon,
  ShieldErrorIcon,
  UsergroupAddIcon,
  UserIcon,
} from 'tdesign-icons-vue-next';
import dayjs from 'dayjs';

import { wafstatsitedetailapi, wafstatsiteoverviewapi } from '@/apis/stats';

echarts.use([LineChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

const { t } = useI18n();

const today = dayjs().format('YYYYMMDD');
const sevenDaysAgo = dayjs().subtract(6, 'day').format('YYYYMMDD');

const loading = ref(false);
const dateRange = ref<string[]>([sevenDaysAgo, today]);
const datePresets = computed(() => ({
  [t('page.overview.preset_today')]: [dayjs().format('YYYYMMDD'), dayjs().format('YYYYMMDD')],
  [t('page.overview.preset_last_7_days')]: [dayjs().subtract(6, 'day').format('YYYYMMDD'), dayjs().format('YYYYMMDD')],
  [t('page.overview.preset_last_30_days')]: [dayjs().subtract(29, 'day').format('YYYYMMDD'), dayjs().format('YYYYMMDD')],
}));

// 汇总卡片
const summaryCards = ref([
  { key: 'total_ip', title: t('page.overview.total_ip'), value: '0', icon: UsergroupAddIcon, colorClass: 'card-blue' },
  { key: 'total_uv', title: t('page.overview.total_uv'), value: '0', icon: UserIcon, colorClass: 'card-cyan' },
  { key: 'total_pv', title: t('page.overview.total_pv'), value: '0', icon: RootListIcon, colorClass: 'card-purple' },
  { key: 'total_attack', title: t('page.overview.total_attack'), value: '0', icon: ShieldErrorIcon, colorClass: 'card-red' },
  { key: 'total_in', title: t('page.overview.traffic_in'), value: '0', icon: CloudUploadIcon, colorClass: 'card-orange' },
  { key: 'total_out', title: t('page.overview.traffic_out'), value: '0', icon: HourglassIcon, colorClass: 'card-green' },
]);

const siteList = ref<Record<string, any>[]>([]);

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'host', title: t('page.overview.col_site'), width: 280 },
  { colKey: 'ip_count', title: t('page.overview.col_ip'), align: 'right' },
  { colKey: 'uv_count', title: 'UV', align: 'right' },
  { colKey: 'total_count', title: 'PV', align: 'right' },
  { colKey: 'traffic_in_mb', title: t('page.overview.col_traffic_in'), align: 'right' },
  { colKey: 'traffic_out_mb', title: t('page.overview.col_traffic_out'), align: 'right' },
  { colKey: 'attack_count', title: t('page.overview.col_attack'), align: 'right' },
]);

// 详情弹窗
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailHost = ref('');
const detailHostCode = ref('');
const timeRange = ref('24h');
const detailAvgTime = ref('0');
const detailNormalRate = ref('0');
const detailChartContainer = ref<HTMLElement>();
let detailChart: echarts.ECharts | null = null;
let isChartInitialed = false;

watch(detailVisible, (val) => {
  if (val) {
    nextTick(() => {
      loadDetail();
    });
  } else {
    // 关闭时重置初始化标记，下次打开重新走首次初始化流程
    isChartInitialed = false;
  }
});

onMounted(() => {
  loadOverview();
});

onBeforeUnmount(() => {
  if (detailChart) {
    detailChart.dispose();
    detailChart = null;
  }
});

function onDateRangeChange(val: any) {
  if (val && val.length === 2) {
    loadOverview();
  }
}

function loadOverview() {
  loading.value = true;
  wafstatsiteoverviewapi({
    start_day: dateRange.value[0],
    end_day: dateRange.value[1],
  })
    .then((res) => {
      if (res.code === 0) {
        const d = res.data;
        summaryCards.value[0].value = (d.total_ip || 0).toLocaleString();
        summaryCards.value[1].value = (d.total_uv || 0).toLocaleString();
        summaryCards.value[2].value = (d.total_pv || 0).toLocaleString();
        summaryCards.value[3].value = (d.total_attack || 0).toLocaleString();
        summaryCards.value[4].value = formatTraffic(d.total_in_mb || 0);
        summaryCards.value[5].value = formatTraffic(d.total_out_mb || 0);
        siteList.value = d.site_list || [];
      }
    })
    .catch((e) => console.error(e))
    .finally(() => {
      loading.value = false;
    });
}

function onRowClick({ row }: { row: Record<string, any> }) {
  detailHostCode.value = row.host_code;
  detailHost.value = row.host_remark || row.host;
  timeRange.value = '24h';
  detailVisible.value = true;
  // watch(detailVisible) 在 nextTick 后触发 loadDetail
}

function loadDetail() {
  if (!detailHostCode.value) return;
  detailLoading.value = true;
  wafstatsitedetailapi({ host_code: detailHostCode.value, time_range: timeRange.value })
    .then((res) => {
      if (res.code === 0) {
        const d = res.data;
        detailAvgTime.value = (d.avg_time_ms || 0).toFixed(1);
        detailNormalRate.value = (d.normal_rate_percent || 0).toFixed(1);
        nextTick(() => {
          renderDetailChart(d);
        });
      }
    })
    .catch((e) => console.error(e))
    .finally(() => {
      detailLoading.value = false;
    });
}

function renderDetailChart(data: Record<string, any>, retries = 0) {
  if (!detailVisible.value || retries > 50) return;
  if (!detailChartContainer.value) return;

  if (detailChartContainer.value.clientWidth === 0) {
    setTimeout(() => {
      renderDetailChart(data, retries + 1);
    }, 100);
    return;
  }

  const isHourMode = timeRange.value === '24h';
  const trend = isHourMode ? data.hour_trend || [] : data.day_trend || [];

  let xAxisData: string[];
  let pvData: number[];
  let attackData: number[];
  let uvData: number[];
  if (isHourMode) {
    xAxisData = trend.map((p: Record<string, any>) => dayjs.unix(p.hour_time).format('HH:mm'));
    pvData = trend.map((p: Record<string, any>) => p.total_count);
    attackData = trend.map((p: Record<string, any>) => p.attack_count);
    uvData = [];
  } else {
    xAxisData = trend.map((p: Record<string, any>) => {
      const s = String(p.day);
      return `${s.slice(4, 6)}-${s.slice(6, 8)}`;
    });
    pvData = trend.map((p: Record<string, any>) => p.total_count);
    attackData = trend.map((p: Record<string, any>) => p.attack_count);
    uvData = trend.map((p: Record<string, any>) => p.uv_count);
  }

  const series: Record<string, any>[] = [
    { name: 'PV', type: 'line', smooth: true, data: pvData, itemStyle: { color: '#0052D9' }, areaStyle: { opacity: 0.08 } },
    { name: t('page.overview.legend_attack'), type: 'line', smooth: true, data: attackData, itemStyle: { color: '#E34D59' } },
  ];
  if (!isHourMode) {
    series.push({
      name: 'UV',
      type: 'line',
      smooth: true,
      data: uvData,
      lineStyle: { type: 'dashed' },
      itemStyle: { color: '#00A870' },
    });
  }

  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: isHourMode ? ['PV', t('page.overview.legend_attack')] : ['PV', t('page.overview.legend_attack'), 'UV'],
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: xAxisData },
    yAxis: { type: 'value' },
    series,
  };

  if (isChartInitialed === false) {
    // 首次：初始化实例并渲染
    detailChart = echarts.init(detailChartContainer.value);
    detailChart.setOption(option);
    isChartInitialed = true;
  } else {
    // 切换时间范围：直接 setOption 更新数据
    detailChart?.setOption(option);
  }
}

function onDetailClose() {
  if (detailChart) {
    detailChart.dispose();
    detailChart = null;
  }
  isChartInitialed = false;
}

function formatTraffic(mb: number) {
  if (mb === undefined || mb === null) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${(mb * 1024).toFixed(0)} KB`;
}
</script>

<style scoped>
.site-overview {
  padding: 0;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-card .filter-label {
  font-weight: 500;
  color: var(--td-text-color-secondary);
}

.summary-cards {
  margin-bottom: 16px;
}

.summary-card {
  border-radius: 8px;
  overflow: hidden;
}

.summary-card .card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.summary-card .card-title {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  margin-bottom: 8px;
}

.summary-card .card-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.summary-card .card-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
}

.summary-card.card-blue .card-icon {
  background: rgba(0, 82, 217, 0.12);
  color: #0052d9;
}

.summary-card.card-cyan .card-icon {
  background: rgba(0, 168, 112, 0.12);
  color: #00a870;
}

.summary-card.card-purple .card-icon {
  background: rgba(122, 75, 212, 0.12);
  color: #7a4bd4;
}

.summary-card.card-red .card-icon {
  background: rgba(227, 77, 89, 0.12);
  color: #e34d59;
}

.summary-card.card-orange .card-icon {
  background: rgba(232, 133, 34, 0.12);
  color: #e88522;
}

.summary-card.card-green .card-icon {
  background: rgba(0, 168, 112, 0.12);
  color: #00a870;
}

.site-table-card {
  margin-bottom: 16px;
}

.site-table-card .table-hint {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.site-table-card .site-name {
  font-weight: 500;
  color: var(--td-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-table-card .site-code {
  font-size: 11px;
  color: var(--td-text-color-placeholder);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-table-card .attack-num {
  color: #e34d59;
  font-weight: 600;
}

.site-table-card :deep(tr) {
  cursor: pointer;
}

.detail-content {
  overflow-x: hidden;
}

.detail-content .detail-header {
  margin-bottom: 16px;
}

.detail-content .detail-chart {
  width: 100%;
  height: 320px;
}

.detail-content .detail-metrics {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px 0;
}

.detail-metrics .metric-item {
  text-align: center;
}

.detail-metrics .metric-label {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  margin-bottom: 8px;
}

.detail-metrics .metric-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.detail-metrics .metric-value .unit {
  font-size: 14px;
  font-weight: 400;
  margin-left: 4px;
  color: var(--td-text-color-secondary);
}

.detail-metrics .metric-value.metric-green {
  color: #00a870;
}
</style>
