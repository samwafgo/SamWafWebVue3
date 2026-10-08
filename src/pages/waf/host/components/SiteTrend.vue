<template>
  <div class="site-trend">
    <t-tooltip v-if="hasData" :content="tip" placement="top">
      <svg class="st-svg" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
        <polyline class="st-line st-line--atk" :points="atkPoints" />
        <polyline class="st-line st-line--pv" :points="pvPoints" />
      </svg>
    </t-tooltip>
    <span v-else class="st-empty">—</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { wafstatsitedetailapi } from '@/apis/stats';

// 会话级缓存：同一站点短时间内只请求一次，翻页 / 重渲染不重复打后端。
// 必须带过期时间：24h 趋势随时间滚动，会话内永久缓存会和其他「今日」数据对不上。
const TREND_CACHE_TTL = 5 * 60 * 1000;
const trendCache: Record<string, { at: number; data: any[] }> = {};

const props = withDefaults(defineProps<{ hostCode?: string }>(), { hostCode: '' });
const { t } = useI18n();

const series = ref<any[]>([]);

const hasData = computed(() => series.value.length > 1);
const maxVal = computed(() => {
  let m = 1;
  series.value.forEach((p: any) => {
    m = Math.max(m, p.total, p.attack);
  });
  return m;
});

function buildPoints(key: string): string {
  const arr = series.value;
  const n = arr.length;
  if (n < 2) return '';
  const max = maxVal.value;
  const h = 24;
  const pad = 2;
  return arr
    .map((p: any, i: number) => {
      const x = (i / (n - 1)) * 100;
      const y = h - pad - ((p[key] || 0) / max) * (h - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

const pvPoints = computed(() => buildPoints('total'));
const atkPoints = computed(() => buildPoints('attack'));
const tip = computed(() => {
  if (!hasData.value) return '';
  const pv = series.value.reduce((a: number, b: any) => a + b.total, 0);
  const atk = series.value.reduce((a: number, b: any) => a + b.attack, 0);
  return String(t('page.host.site_trend_tip', { pv, atk }));
});

function load() {
  const code = props.hostCode;
  series.value = [];
  if (!code) return;
  const hit = trendCache[code];
  if (hit && Date.now() - hit.at < TREND_CACHE_TTL) {
    series.value = hit.data;
    return;
  }
  wafstatsitedetailapi({ host_code: code, time_range: '24h' })
    .then((res: any) => {
      if (res && res.code === 0 && res.data) {
        const pts = (res.data.hour_trend || []).map((p: any) => ({
          total: Number(p.total_count) || 0,
          attack: Number(p.attack_count) || 0,
        }));
        trendCache[code] = { at: Date.now(), data: pts };
        series.value = pts;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

watch(
  () => props.hostCode,
  () => load(),
);
onMounted(() => load());
</script>

<style scoped>
.site-trend {
  width: 100%;
  height: 26px;
}

.st-svg {
  display: block;
  width: 100%;
  height: 26px;
}

.st-line {
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
  /* viewBox 被横向拉伸，保持描边不跟着变形 */
  vector-effect: non-scaling-stroke;
}

.st-line--pv {
  stroke: var(--td-brand-color);
  stroke-width: 1.4;
}

.st-line--atk {
  stroke: var(--td-error-color);
  stroke-width: 1.2;
  opacity: 0.85;
}

.st-empty {
  display: inline-block;
  color: var(--td-text-color-placeholder);
  font-size: 11px;
  line-height: 26px;
}
</style>
