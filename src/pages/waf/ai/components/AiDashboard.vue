<template>
  <div>
    <t-space style="margin-bottom: 12px" align="center">
      <span>{{ t('common.date') }}:</span>
      <t-date-range-picker v-model="range" :clearable="false" />
      <t-button theme="primary" :loading="loading" @click="loadData">{{ t('page.ai.dashboard.refresh') }}</t-button>
    </t-space>

    <t-row :gutter="12" style="margin-bottom: 12px">
      <t-col :span="3">
        <t-card :title="t('page.ai.dashboard.total')" :bordered="false">
          <div class="stat-num">{{ data.total }}</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :title="t('page.ai.dashboard.observe')" :bordered="false">
          <div class="stat-num warn">{{ data.observe_cnt }}</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :title="t('page.ai.dashboard.block')" :bordered="false">
          <div class="stat-num danger">{{ data.block_cnt }}</div>
        </t-card>
      </t-col>
      <t-col :span="3">
        <t-card :title="t('page.ai.dashboard.top_category')" :bordered="false">
          <div class="stat-num">{{ topCategory }}</div>
        </t-card>
      </t-col>
    </t-row>

    <t-row :gutter="12">
      <t-col :span="6">
        <t-card :title="t('page.ai.dashboard.by_category')" :bordered="false">
          <div ref="catChart" style="height: 300px"></div>
        </t-card>
      </t-col>
      <t-col :span="6">
        <t-card :title="t('page.ai.dashboard.score_hist')" :bordered="false">
          <div ref="histChart" style="height: 300px"></div>
        </t-card>
      </t-col>
    </t-row>

    <t-row style="margin-top: 12px">
      <t-col :span="12">
        <t-card :title="t('page.ai.dashboard.trend')" :bordered="false">
          <div ref="trendChart" style="height: 300px"></div>
        </t-card>
      </t-col>
    </t-row>

    <t-alert v-if="!loading && data.total === 0" theme="info" :message="t('page.ai.dashboard.empty')" style="margin-top: 12px" />
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { aiDashboardApi } from '@/apis/ai';

echarts.use([PieChart, BarChart, LineChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

const { t } = useI18n();

const loading = ref(false);
const range = ref<string[]>([]);
const data = ref<Record<string, any>>({ total: 0, observe_cnt: 0, block_cnt: 0, categories: [], score_hist: [], trend: [] });

const catChart = ref<HTMLElement | null>(null);
const histChart = ref<HTMLElement | null>(null);
const trendChart = ref<HTMLElement | null>(null);
let catEchart: echarts.ECharts | null = null;
let histEchart: echarts.ECharts | null = null;
let trendEchart: echarts.ECharts | null = null;

const topCategory = computed(() => {
  const cats = data.value.categories;
  return cats && cats.length ? cats[0].name : '-';
});

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDayInt(s: string) {
  return parseInt(String(s).replace(/-/g, ''), 10) || 0;
}

async function loadData() {
  loading.value = true;
  try {
    const s = range.value && range.value.length === 2 ? range.value[0] : '';
    const e = range.value && range.value.length === 2 ? range.value[1] : '';
    const res: any = await aiDashboardApi({ start_day: toDayInt(s), end_day: toDayInt(e), host_code: '' });
    if (res.code === 0) {
      data.value = res.data || data.value;
      setTimeout(renderCharts, 0);
    } else {
      MessagePlugin.error(res.msg || t('page.ai.dashboard.load_failed'));
    }
  } catch {
    MessagePlugin.error(t('page.ai.dashboard.load_failed'));
  } finally {
    loading.value = false;
  }
}

function renderCharts() {
  renderCat();
  renderHist();
  renderTrend();
}

function renderCat() {
  if (!catChart.value) return;
  if (!catEchart) catEchart = echarts.init(catChart.value);
  const d = (data.value.categories || []).map((x: any) => ({ name: x.name, value: x.value }));
  catEchart.setOption(
    {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll' },
      series: [{ type: 'pie', radius: ['40%', '65%'], data: d, label: { formatter: '{b}: {c}' } }],
    },
    true,
  );
}

function renderHist() {
  if (!histChart.value) return;
  if (!histEchart) histEchart = echarts.init(histChart.value);
  const h = data.value.score_hist || [];
  histEchart.setOption(
    {
      tooltip: { trigger: 'axis' },
      grid: { left: '8%', right: '4%', bottom: '14%', top: '10%' },
      xAxis: { type: 'category', data: h.map((x: any) => x.name), axisLabel: { rotate: 45 } },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: h.map((x: any) => x.value), itemStyle: { color: '#0052d9' } }],
    },
    true,
  );
}

function renderTrend() {
  if (!trendChart.value) return;
  if (!trendEchart) trendEchart = echarts.init(trendChart.value);
  const tr = data.value.trend || [];
  const obs = t('page.ai.dashboard.observe');
  const blk = t('page.ai.dashboard.block');
  trendEchart.setOption(
    {
      tooltip: { trigger: 'axis' },
      legend: { data: [obs, blk], top: 0 },
      grid: { left: '6%', right: '4%', bottom: '8%', top: '15%' },
      xAxis: { type: 'category', data: tr.map((x: any) => String(x.day)) },
      yAxis: { type: 'value' },
      series: [
        { name: obs, type: 'line', smooth: true, data: tr.map((x: any) => x.observe), itemStyle: { color: '#e37318' } },
        { name: blk, type: 'line', smooth: true, data: tr.map((x: any) => x.block), itemStyle: { color: '#d54941' } },
      ],
    },
    true,
  );
}

function resizeCharts() {
  catEchart?.resize();
  histEchart?.resize();
  trendEchart?.resize();
}

onMounted(() => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  range.value = [fmtDate(start), fmtDate(end)];
  loadData();
  window.addEventListener('resize', resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  catEchart?.dispose();
  histEchart?.dispose();
  trendEchart?.dispose();
});
</script>

<style scoped>
.stat-num {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.4;
}
.stat-num.warn {
  color: #e37318;
}
.stat-num.danger {
  color: #d54941;
}
</style>
