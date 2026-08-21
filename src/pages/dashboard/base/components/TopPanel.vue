<template>
  <div class="top-panel">
    <t-row :gutter="[16, 16]">
      <t-col v-for="(item, index) in panelList" :key="item.title" :xs="6" :xl="3">
        <div
          class="stat-card"
          :class="{ 'stat-card--primary': index === 0 }"
          role="button"
          tabindex="0"
          @click="jumpLog(index)"
          @keyup.enter="jumpLog(index)"
        >
          <div class="stat-card__head">
            <span class="stat-card__chip" :class="`stat-card__chip--${item.theme}`">
              <component :is="item.icon" class="stat-card__chip-icon" />
            </span>
            <!-- QPS 卡片右上角放实时趋势图，其余卡片放"较昨日同期"环比 -->
            <span v-if="item.spark" class="stat-card__spark" :title="qpsSparkTitle">
              <svg class="stat-card__spark-svg" viewBox="0 0 96 32" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="qpsSparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop class="stat-card__spark-stop--top" offset="0%" />
                    <stop class="stat-card__spark-stop--bottom" offset="100%" />
                  </linearGradient>
                </defs>
                <path class="stat-card__spark-area" :d="qpsAreaPath" />
                <polyline class="stat-card__spark-line" :points="qpsLinePoints" />
              </svg>
            </span>
            <span v-else class="stat-card__trend" :title="compareTip(item)">
              <span class="stat-card__trend-label">{{ t('dashboard.counter.compare_same_period') }}</span>
              <trend
                v-if="hasTrendArrow(item)"
                :type="item.compare?.Trend || 'up'"
                :describe="percentText(item.compare)"
                :is-reverse-color="index === 0"
                :is-neutral-color="!!item.neutralTrend"
              />
              <span v-else class="stat-card__trend-flat">{{ flatText(item) }}</span>
            </span>
          </div>
          <div class="stat-card__body">
            <span class="stat-card__number">{{ formatNumber(item.displayNumber) }}</span>
          </div>
          <div class="stat-card__foot">
            <span class="stat-card__title">{{ item.title }}</span>
            <chevron-right-icon class="stat-card__arrow" />
          </div>
        </div>
      </t-col>
    </t-row>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRightIcon,
  RadarIcon,
  ShieldErrorIcon,
  ThunderIcon,
  ViewListIcon,
} from 'tdesign-icons-vue-next';
import { computed, markRaw, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { wafstatqpstrendapi, wafstatsumdayapi } from '@/apis/stats';
import Trend from '@/components/trend/index.vue';

// 后端 /wafstatsumday 返回的同期环比（今天 00:00~当前整点 vs 昨天同一时段）
interface StatCompare {
  HasCompare: boolean;
  Current: number;
  Previous: number;
  Percent: number;
  Trend: string;
}

interface PanelItem {
  title: string;
  number: number;
  theme: string;
  icon: any;
  displayNumber: number;
  compare?: StatCompare;
  neutralTrend?: boolean;
  spark?: boolean;
}

const { t } = useI18n();
const router = useRouter();

const panelList = ref<PanelItem[]>([]);
const animFrames: number[] = [];
const animTimers: number[] = [];
const compareHours = ref(0);
const qpsPoints = ref<number[]>([]);
const qpsMax = ref(0);
let qpsTimer = 0;

onMounted(() => {
  getWafStat();
  loadQpsTrend();
  qpsTimer = window.setInterval(loadQpsTrend, 5000);
});

onBeforeUnmount(() => {
  animFrames.forEach((id) => cancelAnimationFrame(id));
  animTimers.forEach((id) => clearTimeout(id));
  if (qpsTimer) clearInterval(qpsTimer);
});

// 采样点不足两个时补成一条水平线，避免图上什么都画不出来
const sparkCoords = computed(() => {
  const values = qpsPoints.value.length >= 2 ? qpsPoints.value : [0, 0];
  const w = 96;
  const h = 32;
  const pad = 3;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: pad + i * step,
    y: h - pad - (Math.max(Number(v) || 0, 0) / max) * (h - pad * 2),
  }));
});

const qpsLinePoints = computed(() =>
  sparkCoords.value.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
);

const qpsAreaPath = computed(() => {
  const coords = sparkCoords.value;
  if (!coords.length) return '';
  const bottom = 29; // 32 - pad
  const head = coords
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
  return `${head} L${coords[coords.length - 1].x.toFixed(2)},${bottom} L${coords[0].x.toFixed(2)},${bottom} Z`;
});

const qpsSparkTitle = computed(() => {
  const trend = t('dashboard.counter.qps_trend', { seconds: qpsPoints.value.length });
  const peak = t('dashboard.counter.qps_trend_peak', { max: qpsMax.value });
  return `${trend} · ${peak}`;
});

function hasTrendArrow(item: PanelItem) {
  return !!(item.compare && item.compare.HasCompare && item.compare.Trend !== 'flat');
}

function percentText(compare?: StatCompare) {
  return `${Math.abs(Number(compare?.Percent) || 0)}%`;
}

function flatText(item: PanelItem) {
  return item.compare && item.compare.HasCompare ? '0%' : '\u2014';
}

function compareTip(item: PanelItem) {
  if (!item.compare || !item.compare.HasCompare) {
    return t('dashboard.counter.compare_none_tip');
  }
  return t('dashboard.counter.compare_tip', {
    hour: String(compareHours.value).padStart(2, '0'),
    current: item.compare.Current,
    previous: item.compare.Previous,
  });
}

function loadQpsTrend() {
  if (typeof document !== 'undefined' && document.hidden) return;
  wafstatqpstrendapi({ limit: 60 })
    .then((res) => {
      if (res.code !== 0 || !res.data) return;
      qpsPoints.value = (res.data.Points || []).map((p: any) => Number(p.V) || 0);
      qpsMax.value = Number(res.data.Max) || 0;
      const card = panelList.value.find((p) => p.spark);
      if (card) {
        card.number = Number(res.data.Current) || 0;
        card.displayNumber = card.number;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function jumpLog(index: number) {
  // 三张卡片都必须带上显式 query：空 query 与"从菜单点进去"无法区分，
  // 会导致访问日志页沿用上次缓存的筛选条件（issue #893 问题2）
  const queryMap: Record<number, { action: string; src_ip: string }> = {
    0: { action: '阻止', src_ip: '' }, // 今日攻击数量
    1: { action: '', src_ip: '' }, // 今天总访问量
    2: { action: '禁止', src_ip: '' }, // 今天异常IP（个）
  };
  const query = queryMap[index];
  if (!query) return;
  router
    .push({ path: '/waf/wafvisitlog', query })
    // vue-router4 重复导航不再 reject（返回 NavigationFailure），这里只兜真实的导航异常
    .catch((err: any) => {
      console.warn(err);
    });
}

function getWafStat() {
  wafstatsumdayapi()
    .then((res) => {
      if (res.code === 0) {
        const d = res.data;
        const panels = [
          {
            title: t('dashboard.counter.today_of_attack_count'),
            number: d.AttackCountOfToday,
            theme: 'danger',
            icon: markRaw(ShieldErrorIcon),
            compare: d.AttackCompare,
          },
          {
            title: t('dashboard.counter.all_visit_count'),
            number: d.VisitCountOfToday,
            theme: 'primary',
            icon: markRaw(ViewListIcon),
            compare: d.VisitCompare,
            neutralTrend: true, // 访问量涨跌无好坏之分，不用红绿
          },
          {
            title: t('dashboard.counter.not_normal_visit_count'),
            number: d.IllegalIpCountOfToday,
            theme: 'warning',
            icon: markRaw(RadarIcon),
            compare: d.IllegalIpCompare,
          },
          {
            title: t('dashboard.counter.qps'),
            number: d.CurrentQps,
            theme: 'success',
            icon: markRaw(ThunderIcon),
            spark: true,
          },
        ];
        compareHours.value = d.CompareHours || 0;
        panelList.value = panels.map((p) => ({ ...p, displayNumber: 0 }));
        animateAll();
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function animateAll() {
  panelList.value.forEach((item, index) => animateNumber(item, index * 90));
}

// 数字滚动：缓出到目标值，纯观感，不影响取数
function animateNumber(item: PanelItem, delay: number) {
  const end = Number(item.number) || 0;
  const duration = 900;
  let startTime: number | null = null;
  const tick = (now: number) => {
    if (startTime === null) startTime = now;
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    item.displayNumber = Math.round(end * eased);
    if (progress < 1) {
      animFrames.push(requestAnimationFrame(tick));
    } else {
      item.displayNumber = end;
    }
  };
  animTimers.push(
    window.setTimeout(() => {
      animFrames.push(requestAnimationFrame(tick));
    }, delay),
  );
}

function formatNumber(val: number | string) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-US');
}
</script>

<style scoped>
.top-panel :deep(.t-row) {
  row-gap: 16px;
}

.stat-card {
  position: relative;
  height: 168px;
  padding: 20px 20px 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  border-radius: var(--td-radius-large);
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition:
    transform 0.24s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.24s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 卡片角落装饰光斑 */
.stat-card::after {
  content: '';
  position: absolute;
  right: -48px;
  bottom: -48px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--td-brand-color-1) 0%, transparent 72%);
  opacity: 0;
  transition: opacity 0.24s;
  pointer-events: none;
}

.stat-card:hover::after {
  opacity: 1;
}

.stat-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card__chip--danger {
  background: var(--td-error-color-1);
  color: var(--td-error-color);
}

.stat-card__chip--primary {
  background: var(--td-brand-color-1);
  color: var(--td-brand-color);
}

.stat-card__chip--warning {
  background: var(--td-warning-color-1);
  color: var(--td-warning-color);
}

.stat-card__chip--success {
  background: var(--td-success-color-1);
  color: var(--td-success-color);
}

.stat-card__chip-icon {
  font-size: 22px;
}

.stat-card__trend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.stat-card__trend-label {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.stat-card__trend-flat {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.stat-card__spark {
  display: inline-flex;
  align-items: center;
}

.stat-card__spark-svg {
  width: 96px;
  height: 32px;
}

.stat-card__spark-stop--top {
  stop-color: var(--td-success-color);
  stop-opacity: 0.32;
}

.stat-card__spark-stop--bottom {
  stop-color: var(--td-success-color);
  stop-opacity: 0;
}

.stat-card__spark-area {
  fill: url(#qpsSparkFill);
}

.stat-card__spark-line {
  fill: none;
  stroke: var(--td-success-color);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stat-card__number {
  display: inline-block;
  font-size: 30px;
  line-height: 1;
  font-weight: 600;
  font-family: var(--td-font-family-medium);
  color: var(--td-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.stat-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__title {
  font-size: 14px;
  color: var(--td-text-color-secondary);
}

.stat-card__arrow {
  color: var(--td-text-color-placeholder);
  transition:
    transform 0.24s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 首个指标卡片使用品牌色渐变背景 */
.stat-card--primary {
  background: linear-gradient(135deg, var(--td-brand-color) 0%, var(--td-brand-color-7) 100%);
  border: none;
  box-shadow: 0 8px 20px -8px var(--td-brand-color-4);
}

.stat-card--primary::after {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.35) 0%, transparent 72%);
}

.stat-card--primary .stat-card__trend-label,
.stat-card--primary .stat-card__trend-flat,
.stat-card--primary .stat-card__number,
.stat-card--primary .stat-card__title {
  color: var(--td-text-color-anti);
}

.stat-card--primary .stat-card__arrow {
  color: rgba(255, 255, 255, 0.75);
}

.stat-card--primary .stat-card__chip {
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
}
</style>
