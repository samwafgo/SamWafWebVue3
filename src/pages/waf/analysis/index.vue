<template>
  <div class="contentarea">
    <div class="left-column">
      <!-- 左边列内容 -->
      {{ t('common.date') }} :
      <t-space direction="horizontal">
        <t-date-range-picker v-model="range1" :presets="presets" />
        <t-select v-model="currentAction" class="form-item-content" :options="action_options" :style="{ width: '100px' }" />
      </t-space>

      <t-button variant="outline" @click="loadCountryData"> {{ t('common.search') }} </t-button>
      <div id="countryMap" style="width: 100%; height: 40.5rem"></div>
    </div>
    <div class="right-column">
      <div class="top-right">
        <!-- 右边上半部分内容 -->
        <div id="wordCloudCountry" style="width: 100%; height: 20.5rem"></div>
      </div>
      <div class="bottom-right">
        <!-- 右边下半部分内容 -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import * as echarts from 'echarts/core';
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { LineChart, MapChart, PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import 'echarts-wordcloud';

import { LAST_7_DAYS } from '@/utils/date';
import worldMap from '@/assets/mapjson/world.json';
import worldchsname from '@/assets/mapjson/worldchsname.json';
import { wafanalysisdaycountryrange } from '@/apis/analysis';

echarts.use([TooltipComponent, LegendComponent, PieChart, GridComponent, LineChart, CanvasRenderer, MapChart, VisualMapComponent]);

const { t } = useI18n();

// 词云的相关配置
const wordCloudChartsInfo: {
  wordCloudEchart: echarts.ECharts | null;
  wordCloudOptions: Record<string, any>;
} = {
  wordCloudEchart: null,
  wordCloudOptions: {
    series: [
      {
        type: 'wordCloud',
        shape: 'circle',
        keepAspect: false,
        left: 'center',
        top: 'center',
        width: '100%',
        height: '90%',
        right: null,
        bottom: null,
        sizeRange: [12, 60],
        rotationRange: [-90, 90],
        rotationStep: 45,
        gridSize: 8,
        drawOutOfBound: false,
        layoutAnimation: true,
        textStyle: {
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color() {
            return `rgb(${[
              Math.round(Math.random() * 160),
              Math.round(Math.random() * 160),
              Math.round(Math.random() * 160),
            ].join(',')})`;
          },
        },
        emphasis: {
          textStyle: {
            textShadowBlur: 3,
            textShadowColor: '#333',
          },
        },
        // data属性中的value值越大，权重就越大，展示字体就越大
        data: [] as { name: string; value: number }[],
      },
    ],
  },
};

const currentAction = ref('');
const action_options = computed(() => [
  { label: t('common.defense_status.all'), value: '' },
  { label: t('common.defense_status.stop'), value: '阻止' },
  { label: t('common.defense_status.pass'), value: '放行' },
  { label: t('common.defense_status.forbid'), value: '禁止' },
]);

const presets = {
  最近7天: [new Date(+new Date() - 86400000 * 6), new Date()],
  最近3天: [new Date(+new Date() - 86400000 * 2), new Date()],
  今天: [new Date(), new Date()],
};
const range1 = ref<string[]>([LAST_7_DAYS[0], LAST_7_DAYS[1]]);

let map: echarts.ECharts | null = null;

const mapOptions: Record<string, any> = {
  visualMap: {
    min: 0,
    max: 1000,
    calculable: true,
    inRange: {
      color: ['#50a3ba', '#eac736', '#d94e5d'], // 指定颜色范围
    },
    textStyle: {
      color: '#fff',
    },
  },
  // 默认的颜色数组（如果不明确设置每个数据项的颜色，则会采用默认的数组）
  color: ['#ac6767', '#1d953f', '#6950a1', '#918597'],
  series: [
    {
      type: 'map',
      map: 'world', // 使用世界地图
      label: {
        show: true,
        position: 'top',
        margin: 8,
        formatter(params: any) {
          if (params.data && params.data.value > 0) {
            return params.data.name; // 显示地区名称
          }
          return '';
        },
      },
      data: [] as { name: string; value: number }[],
      nameMap: worldchsname,
    },
  ],
  // 鼠标悬浮，单击产生的效果
  tooltip: {
    show: true,
    trigger: 'item',
    triggerOn: 'mousemove|click',
    axisPointer: {
      type: 'line',
    },
    textStyle: {
      fontSize: 14,
    },
    borderWidth: 0,
    formatter(params: any) {
      if (params.data && params.data.value > 0) {
        return `${params.name}: ${params.data.value}`;
      }
      return '';
    },
  },
  roam: true,
  zoom: 1,
};

onMounted(() => {
  initEcharts();
  loadCountryData();
});

onBeforeUnmount(() => {
  // 在组件销毁前，销毁echarts实例，防止内存泄漏
  if (map) {
    map.dispose();
  }
  if (wordCloudChartsInfo.wordCloudEchart) {
    wordCloudChartsInfo.wordCloudEchart.dispose();
  }
});

function loadCountryData() {
  const rangeStartDay = range1.value[0].replace(/-/g, '');
  const rangeEndDay = range1.value[1].replace(/-/g, '');
  wafanalysisdaycountryrange({
    start_day: rangeStartDay,
    end_day: rangeEndDay,
    attack_type: currentAction.value,
  })
    .then((res) => {
      const resdata = res.data;
      if (resdata == null) {
        mapOptions.series[0].data = [];
        mapOptions.visualMap.max = 0;
        map?.setOption(mapOptions);
      } else {
        let maxValue = 0;
        resdata.forEach((item: { value: number }) => {
          if (item.value > maxValue) {
            maxValue = item.value;
          }
        });
        mapOptions.series[0].data = resdata;
        mapOptions.visualMap.max = maxValue;
        map?.setOption(mapOptions);

        // 赋值词云部分
        wordCloudChartsInfo.wordCloudOptions.series[0].data = resdata;
        wordCloudChartsInfo.wordCloudEchart?.setOption(wordCloudChartsInfo.wordCloudOptions);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function initEcharts() {
  initWorldMap();
  initWordCloud();
}

// 初始化世界地图
function initWorldMap() {
  echarts.registerMap('world', {
    geoJSON: worldMap as any,
  } as any);
  const myChart = echarts.init(document.getElementById('countryMap'));
  map = myChart;
  myChart.setOption(mapOptions);
  // 随着屏幕大小调节图表
  window.addEventListener('resize', () => {
    myChart.resize();
  });
}

// 初始化词云
function initWordCloud() {
  const echartDom = document.getElementById('wordCloudCountry');
  wordCloudChartsInfo.wordCloudEchart = echarts.init(echartDom);
  wordCloudChartsInfo.wordCloudEchart.setOption(wordCloudChartsInfo.wordCloudOptions);

  window.addEventListener('resize', () => {
    wordCloudChartsInfo.wordCloudEchart?.resize();
  });
}
</script>

<style scoped>
.contentarea {
  display: flex;
  width: 80%;
  height: 100vh;
  /* 让布局占据整个视口高度 */
  height: 50rem;
}

.left-column {
  flex: 2;
  background-color: var(--td-bg-color-page);
  padding: 20px;
}

.right-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.top-right {
  flex: 1;
  background-color: var(--td-bg-color-page);
  padding: 20px;
  margin-bottom: 10px;
}

.bottom-right {
  flex: 1;
  background-color: var(--td-bg-color-page);
  padding: 20px;
}
</style>
