import i18n from '@/i18n';

/**
 * 仪表盘图表数据集
 * 相比老项目去掉了 tvision-color/Vuex 主题联动，使用固定的 TDesign 默认图表色板。
 */
const CHART_COLORS = ['#0052d9', '#029cd4', '#2ba471', '#e37318', '#d54941', '#7d46bd', '#0594fa', '#56c08d'];

const t = (key: string) => (i18n.global as unknown as { t: (k: string) => string }).t(key);

/** 周期攻击/正常走势折线图 */
export function getLineChartDataSet({
  dateTime = [],
  inchartarr = [],
  outchartarr = [],
  placeholderColor = 'var(--td-text-color-placeholder)',
  borderColor = 'var(--td-component-border)',
}: {
  dateTime?: Array<string>;
  inchartarr?: Array<number | string>;
  outchartarr?: Array<number | string>;
  placeholderColor?: string;
  borderColor?: string;
}) {
  return {
    color: CHART_COLORS,
    tooltip: {
      trigger: 'item',
    },
    grid: {
      left: '0',
      right: '40px',
      top: '5px',
      bottom: '36px',
      containLabel: true,
    },
    legend: {
      left: 'center',
      bottom: '0',
      orient: 'horizontal',
      data: [t('dashboard.cycle_attack_count'), t('dashboard.cycle_normal_count')],
      textStyle: {
        fontSize: 12,
        color: placeholderColor,
      },
    },
    xAxis: {
      type: 'category',
      data: dateTime,
      boundaryGap: false,
      axisLabel: {
        color: placeholderColor,
      },
      axisLine: {
        lineStyle: {
          width: 1,
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: placeholderColor,
      },
      splitLine: {
        lineStyle: {
          color: borderColor,
        },
      },
    },
    series: [
      {
        name: t('dashboard.cycle_attack_count'),
        data: inchartarr,
        type: 'line',
        smooth: false,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: {
          opacity: 0.1,
        },
      },
      {
        name: t('dashboard.cycle_normal_count'),
        data: outchartarr,
        type: 'line',
        smooth: false,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  };
}

/** 周期攻击/正常占比环形图 */
export function getPieChartDataSet({
  attackCount = 0,
  normalCount = 0,
  textColor = 'var(--td-text-color-primary)',
  placeholderColor = 'var(--td-text-color-placeholder)',
  containerColor = 'var(--td-bg-color-container)',
}: {
  attackCount?: number;
  normalCount?: number;
  textColor?: string;
  placeholderColor?: string;
  containerColor?: string;
}) {
  return {
    color: CHART_COLORS,
    tooltip: {
      show: false,
      trigger: 'axis',
    },
    grid: {
      top: '0',
      right: '0',
    },
    legend: {
      selectedMode: false,
      itemWidth: 12,
      itemHeight: 4,
      textStyle: {
        fontSize: 12,
        color: placeholderColor,
      },
      left: 'center',
      bottom: '0',
      orient: 'horizontal',
    },
    series: [
      {
        name: 'count',
        type: 'pie',
        radius: ['48%', '60%'],
        avoidLabelOverlap: true,
        selectedMode: true,
        silent: true,
        itemStyle: {
          borderColor: containerColor,
          borderWidth: 1,
        },
        label: {
          show: true,
          position: 'center',
          formatter: ['{value|{d}%}', '{name|{b}}'].join('\n'),
          rich: {
            value: {
              color: textColor,
              fontSize: 28,
              fontWeight: 'normal',
              lineHeight: 46,
            },
            name: {
              color: '#909399',
              fontSize: 12,
              lineHeight: 14,
            },
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: attackCount, name: t('dashboard.cycle_attack_count') },
          { value: normalCount, name: t('dashboard.cycle_normal_count') },
        ],
      },
    ],
  };
}
