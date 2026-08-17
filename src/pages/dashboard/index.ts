import * as echarts from 'echarts/core';

import i18n from '@/i18n';

/**
 * 仪表盘图表数据集
 * 相比老项目去掉了 tvision-color/Vuex 主题联动，使用固定的 TDesign 默认图表色板。
 */
const CHART_COLORS = ['#0052d9', '#029cd4', '#2ba471', '#e37318', '#d54941', '#7d46bd', '#0594fa', '#56c08d'];

const t = (key: string) => (i18n.global as unknown as { t: (k: string) => string }).t(key);

/** 千分位格式化数字 */
function formatChartNumber(value: number | string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? '');
  return num.toLocaleString('en-US');
}

/** hex 转 rgba（解析失败时原样返回） */
function hexToRgba(hex: string, alpha: number): string {
  const m = (hex || '').replace('#', '');
  const full =
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * echarts 画在 canvas 上，认不了 var(--td-xxx)，必须先取到真实色值再传进去，
 * 否则整套主题色到了图表里全部失效退回 echarts 默认色。
 */
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function isDarkMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('theme-mode') === 'dark';
}

function tooltipStyle() {
  const dark = isDarkMode();
  return {
    backgroundColor: dark ? 'rgba(36, 36, 36, 0.96)' : 'rgba(255, 255, 255, 0.96)',
    borderColor: dark ? '#5e5e5e' : '#e7e7e7',
    borderWidth: 1,
    padding: [8, 12],
    extraCssText: 'box-shadow: 0 6px 20px rgba(0,0,0,0.08); border-radius: 8px;',
    textStyle: { color: dark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)', fontSize: 12 },
  };
}

/** 周期攻击/正常走势折线图 */
export function getLineChartDataSet({
  dateTime = [],
  inchartarr = [],
  outchartarr = [],
  placeholderColor = '',
  borderColor = '',
  containerColor = '',
}: {
  dateTime?: Array<string>;
  inchartarr?: Array<number | string>;
  outchartarr?: Array<number | string>;
  placeholderColor?: string;
  borderColor?: string;
  containerColor?: string;
}) {
  const placeholder = placeholderColor || cssVar('--td-text-color-placeholder', '#bbbfc4');
  const border = borderColor || cssVar('--td-component-border', '#dcdcdc');
  const container = containerColor || cssVar('--td-bg-color-container', '#ffffff');
  const attackColor = CHART_COLORS[0];
  const normalColor = CHART_COLORS[1];
  const attackName = t('dashboard.cycle_attack_count');
  const normalName = t('dashboard.cycle_normal_count');

  const areaGradient = (color: string) =>
    new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: hexToRgba(color, 0.26) },
      { offset: 1, color: hexToRgba(color, 0.02) },
    ]);

  return {
    color: CHART_COLORS,
    tooltip: {
      trigger: 'axis',
      ...tooltipStyle(),
      axisPointer: {
        type: 'line',
        lineStyle: { color: border, type: 'dashed' },
      },
      formatter: (params: Array<any>) => {
        if (!Array.isArray(params) || !params.length) return '';
        let html = `<div style="font-weight:600;margin-bottom:4px;">${params[0].axisValue || ''}</div>`;
        params.forEach((p) => {
          html += `<div style="display:flex;align-items:center;gap:8px;line-height:1.9;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};flex:none;"></span><span>${p.seriesName}</span><span style="margin-left:auto;font-weight:600;font-variant-numeric:tabular-nums;">${formatChartNumber(
            p.value,
          )}</span></div>`;
        });
        return html;
      },
    },
    grid: {
      left: '8',
      right: '20',
      top: '38',
      bottom: '38',
      containLabel: true,
    },
    legend: {
      left: 'center',
      bottom: '0',
      orient: 'horizontal',
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 5,
      itemGap: 32,
      data: [attackName, normalName],
      textStyle: { fontSize: 12, color: placeholder },
    },
    xAxis: {
      type: 'category',
      data: dateTime,
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: border, width: 1 } },
      axisLabel: { color: placeholder, fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: placeholder,
        fontSize: 12,
        formatter: (value: number) => formatChartNumber(value),
      },
      splitLine: { lineStyle: { color: border, type: 'dashed' } },
    },
    series: [
      {
        name: attackName,
        data: inchartarr,
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: attackColor },
        itemStyle: { color: attackColor, borderColor: container, borderWidth: 2 },
        emphasis: { focus: 'series', scale: true },
        areaStyle: { color: areaGradient(attackColor) },
      },
      {
        name: normalName,
        data: outchartarr,
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: normalColor },
        itemStyle: { color: normalColor, borderColor: container, borderWidth: 2 },
        emphasis: { focus: 'series', scale: true },
        areaStyle: { color: areaGradient(normalColor) },
      },
    ],
  };
}

/** 周期攻击/正常占比环形图 */
export function getPieChartDataSet({
  attackCount = 0,
  normalCount = 0,
  textColor = '',
  placeholderColor = '',
  containerColor = '',
}: {
  attackCount?: number;
  normalCount?: number;
  textColor?: string;
  placeholderColor?: string;
  containerColor?: string;
}) {
  const text = textColor || cssVar('--td-text-color-primary', 'rgba(0, 0, 0, 0.9)');
  const placeholder = placeholderColor || cssVar('--td-text-color-placeholder', '#bbbfc4');
  const container = containerColor || cssVar('--td-bg-color-container', '#ffffff');
  const attackColor = CHART_COLORS[0];
  const normalColor = CHART_COLORS[1];
  const attackName = t('dashboard.cycle_attack_count');
  const normalName = t('dashboard.cycle_normal_count');
  const centerLabel = t('dashboard.cycle_normal_ratio');
  const total = Number(attackCount) + Number(normalCount);
  const normalPercent = total > 0 ? (Number(normalCount) / total) * 100 : 0;

  return {
    color: [normalColor, attackColor],
    tooltip: {
      trigger: 'item',
      ...tooltipStyle(),
      formatter: (p: any) => `${p.marker} ${p.name}<br/>${formatChartNumber(p.value)} · ${p.percent}%`,
    },
    legend: {
      selectedMode: false,
      itemWidth: 14,
      itemHeight: 5,
      icon: 'roundRect',
      textStyle: { fontSize: 12, color: placeholder },
      left: 'center',
      bottom: '0',
      orient: 'horizontal',
      formatter: (name: string) => {
        const value = name === attackName ? Number(attackCount) : Number(normalCount);
        return `${name}  ${formatChartNumber(value)}`;
      },
    },
    series: [
      {
        name: '占比',
        type: 'pie',
        radius: ['58%', '74%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: container,
          borderWidth: 3,
          borderRadius: 6,
        },
        label: {
          show: true,
          position: 'center',
          formatter: [`{value|${normalPercent.toFixed(1)}%}`, `{name|${centerLabel}}`].join('\n'),
          rich: {
            value: {
              color: text,
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 40,
              fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
            },
            name: {
              color: placeholder,
              fontSize: 12,
              lineHeight: 18,
            },
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: normalCount, name: normalName },
          { value: attackCount, name: attackName },
        ],
      },
    ],
  };
}
