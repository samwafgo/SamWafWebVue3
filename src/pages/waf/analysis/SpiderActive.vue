<template>
  <div class="spider-active-page">
    <t-card>
      <div style="display: flex; gap: 16px; margin-bottom: 16px">
        <t-date-range-picker v-model="range1" :presets="presets" style="width: 240px" />
        <t-select v-model="selectedHost" clearable style="width: 200px" :placeholder="t('common.select_placeholder')">
          <t-option v-for="item in hostOptions" :key="item.value" :value="item.value" :label="item.label">
            {{ item.label }}
          </t-option>
        </t-select>
        <t-button theme="primary" @click="fetchData"> {{ t('common.search') }}</t-button>
      </div>
      <div style="display: flex; gap: 32px">
        <div style="width: 660px; height: 320px">
          <div id="spiderChart" ref="boxpie" class="echart-box"></div>
        </div>

        <div style="flex: 1">
          <t-table :data="spiderPieData" :columns="columns" row-key="name" size="small" :pagination="{ pageSize: 5 }">
            <template #name="{ row }">
              {{ row.name }}
            </template>
            <template #value="{ row }">
              {{ row.value }}
            </template>
            <template #percent="{ row }">
              {{ totalPV > 0 ? ((row.value / totalPV) * 100).toFixed(2) : 0 }}%
            </template>
          </t-table>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { TableProps } from 'tdesign-vue-next';
import * as echarts from 'echarts/core';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { LineChart, PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

import { wafAnalysisSpider } from '@/apis/analysis';
import { NowDate } from '@/utils/date';
import { allhost } from '@/apis/host';

echarts.use([PieChart, LineChart, TooltipComponent, LegendComponent, GridComponent, TitleComponent, CanvasRenderer]);

const { t } = useI18n();

const hostOptions = ref<{ label: string; value: string; pre_host?: string }[]>([]);
const range1 = ref<string[]>([NowDate, NowDate]);
const presets = {
  最近7天: [new Date(+new Date() - 86400000 * 6), new Date()],
  最近3天: [new Date(+new Date() - 86400000 * 2), new Date()],
  今天: [new Date(), new Date()],
};
let pieContainer: HTMLElement | null = null; // 饼图容器
let pieChart: echarts.ECharts | null = null;
const selectedHost = ref('');
const globalHost = ref('');
const totalPV = ref(260);
const spiderPV = ref(260);
const spiderPercent = ref(100);
const spiderPieData = ref<{ name: string; value: number }[]>([]);

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'name', title: t('page.analysis.analysis_spider.spider_type'), width: '40%' },
  { colKey: 'value', title: t('page.analysis.analysis_spider.visit_count'), width: '30%' },
  { colKey: 'percent', title: t('page.analysis.analysis_spider.percentage'), width: '30%' },
]);

onMounted(() => {
  pieContainer = document.getElementById('spiderChart');
  showEcarts();
  loadHostList().then(() => {
    fetchData();
  });
});

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          hostOptions.value = res.data || [];

          for (let i = 0; i < hostOptions.value.length; i++) {
            // 如果找到"全局网站:0"，则设置为默认选择
            if (hostOptions.value[i].label === '全局网站:0') {
              selectedHost.value = hostOptions.value[i].value;
              globalHost.value = hostOptions.value[i].value;
            }
          }

          // 如果没有找到特定主机，则默认选择第一个
          if (!selectedHost.value && hostOptions.value.length > 0) {
            selectedHost.value = hostOptions.value[0].pre_host || '';
          }
        } else {
          MessagePlugin.error(res.msg || '获取主机列表失败');
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        MessagePlugin.error(`获取主机列表失败：${e.message}`);
        reject(e);
      });
  });
}

function fetchData() {
  const rangeStartDay = range1.value[0].replace(/-/g, '');
  const rangeEndDay = range1.value[1].replace(/-/g, '');
  wafAnalysisSpider({
    start_day: rangeStartDay,
    end_day: rangeEndDay,
    host: selectedHost.value === globalHost.value ? '' : selectedHost.value,
  })
    .then((res) => {
      const resdata = res.data;

      if (Array.isArray(resdata)) {
        spiderPieData.value = resdata;

        // 计算总访问量
        totalPV.value = resdata.reduce((sum, item) => sum + item.value, 0);

        // 计算爬虫访问量（除了"正常访客"外都是爬虫）
        spiderPV.value = resdata.filter((item) => item.name !== '正常访客').reduce((sum, item) => sum + item.value, 0);

        // 计算爬虫占比
        spiderPercent.value = totalPV.value > 0 ? Math.round((spiderPV.value / totalPV.value) * 100) : 0;
        // 数据更新后重新渲染图表
        showEcarts();
      } else {
        MessagePlugin.warning('没有数据');
      }
    })
    .catch((e: Error) => {
      console.log(e);
      MessagePlugin.error('获取数据失败');
    });
}

function showEcarts() {
  if (!pieContainer) return;
  if (!pieChart) {
    pieChart = echarts.init(pieContainer);
  }
  pieChart.setOption({
    title: {
      text: '各爬虫访问占比',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '访问来源',
        type: 'pie',
        radius: '50%',
        data: spiderPieData.value,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  });
}
</script>

<style scoped>
.echart-box {
  width: 100%;
  height: 350px;
  margin: 20px;
}
</style>
