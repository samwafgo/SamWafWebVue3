<template>
  <t-dialog
    :visible="visible"
    :header="t('page.ccrule.th_title')"
    :width="900"
    :footer="false"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div v-if="loading" class="th-loading">{{ t('page.ccrule.th_loading') }}</div>

    <!-- 算不出来：说清楚为什么，不给一个看起来很准的错数 -->
    <div v-else-if="data && !data.supported" class="th-blocked">
      <div class="th-reason">{{ data.reason }}</div>
      <div v-if="data.reference" class="th-ref">{{ data.reference }}</div>
      <div class="th-actions">
        <t-button variant="outline" @click="emit('update:visible', false)">{{ t('common.close') }}</t-button>
      </div>
    </div>

    <div v-else-if="data" class="th-body">
      <div class="th-meta">{{ metaText }}</div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="th-summary" v-html="summaryHtml"></div>
      <div v-if="data.scope_note" class="th-note">{{ data.scope_note }}</div>
      <div v-if="data.sampled" class="th-note">{{ t('page.ccrule.th_sampled', { days: data.days }) }}</div>

      <div class="th-stats">
        <div>
          <div class="k">{{ t('page.ccrule.th_p50') }}</div>
          <div class="v">{{ data.p50 }}</div>
        </div>
        <div>
          <div class="k">P95</div>
          <div class="v">{{ data.p95 }}</div>
        </div>
        <div>
          <div class="k">P99</div>
          <div class="v">{{ data.p99 }}</div>
        </div>
        <div>
          <div class="k">{{ t('page.ccrule.th_max') }}</div>
          <div class="v">{{ data.max }}</div>
        </div>
        <div>
          <div class="k">{{ t('page.ccrule.th_total_req') }}</div>
          <div class="v">{{ data.total_req }}</div>
        </div>
      </div>

      <div v-if="data.top && data.top.length" ref="wrapRef" class="th-chart-wrap">
        <div class="th-chart">
          <div
            v-for="(b, i) in data.top"
            :key="i"
            class="th-bar"
            :class="{ hit: b.peak > threshold }"
            :style="{ height: barHeight(b.peak) }"
            :title="`${b.dim_value} · ${t('page.ccrule.th_bar_tip', { peak: b.peak, total: b.total })}`"
          ></div>
        </div>
        <div class="th-line" :style="{ top: lineTop }" :data-v="threshold" @mousedown="startDrag"></div>
        <div class="th-axis">
          <span>{{ t('page.ccrule.th_axis_left') }}</span>
          <span>TOP {{ data.top.length }}</span>
        </div>
      </div>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="th-impact" v-html="impactHtml"></div>

      <div class="th-tiers">
        <div
          v-for="tier in tiers"
          :key="tier.key"
          class="th-tier"
          :class="{ on: threshold === tier.value }"
          @click="threshold = tier.value"
        >
          <div class="n">{{ tier.name }}</div>
          <div class="v">{{ tier.value }}</div>
          <div class="d">{{ tier.desc }}</div>
        </div>
      </div>

      <div class="th-warn">{{ t('page.ccrule.th_force_observe') }}</div>

      <div class="th-actions">
        <t-button variant="outline" @click="emit('update:visible', false)">{{ t('common.close') }}</t-button>
        <t-button theme="primary" style="margin-left: 10px" @click="apply">
          {{ t('page.ccrule.th_apply', { n: threshold }) }}
        </t-button>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { wafAntiCCRuleThresholdRecommendApi } from '@/apis/anticcrule';

const { t } = useI18n();

const CHART_H = 180;
const BAR_MAX = 170;

const props = defineProps<{
  visible: boolean;
  // 与规则表单同一份口径：圈样本必须和这条规则运行时的口径一致
  params: Record<string, any>;
}>();
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void; (e: 'apply', v: number): void }>();

const loading = ref(false);
const data = ref<any>(null);
const threshold = ref(0);
const dragging = ref(false);
const wrapRef = ref<HTMLElement | null>(null);

const maxPeak = computed(() => {
  if (!data.value || !data.value.top || !data.value.top.length) return 1;
  return Math.max(1, data.value.top[0].peak);
});
const lineTop = computed(() => {
  const h = Math.round((threshold.value / maxPeak.value) * BAR_MAX);
  return `${16 + CHART_H - Math.min(BAR_MAX, Math.max(0, h))}px`;
});
const tiers = computed(() => {
  if (!data.value) return [];
  return [
    { key: 'loose', value: data.value.loose, name: t('page.ccrule.th_loose'), desc: t('page.ccrule.th_loose_desc') },
    { key: 'balanced', value: data.value.balanced, name: t('page.ccrule.th_balanced'), desc: t('page.ccrule.th_balanced_desc') },
    { key: 'strict', value: data.value.strict, name: t('page.ccrule.th_strict'), desc: t('page.ccrule.th_strict_desc') },
  ];
});
const metaText = computed(() =>
  data.value ? t('page.ccrule.th_meta', { days: data.value.days, window: data.value.window_sec }) : '',
);
const summaryHtml = computed(() => {
  if (!data.value) return '';
  return t('page.ccrule.th_summary', {
    window: data.value.window_sec,
    p99: `<b>${data.value.p99}</b>`,
    th: `<b>${threshold.value}</b>`,
  });
});
// 影响面只按返回的 TOP N 统计，措辞里写明「TOP N 里」，不把它说成全站精确值
const impactHtml = computed(() => {
  if (!data.value || !data.value.top) return '';
  let hitDim = 0;
  let hitReq = 0;
  data.value.top.forEach((b: any) => {
    if (b.peak > threshold.value) {
      hitDim += 1;
      hitReq += b.total;
    }
  });
  return t('page.ccrule.th_impact', {
    th: `<b>${threshold.value}</b>`,
    window: data.value.window_sec,
    n: data.value.top.length,
    dim: `<b>${hitDim}</b>`,
    req: `<b>${hitReq}</b>`,
  });
});

function load() {
  loading.value = true;
  data.value = null;
  wafAntiCCRuleThresholdRecommendApi(props.params)
    .then((res: any) => {
      loading.value = false;
      if (res.code !== 0 || !res.data) {
        data.value = { supported: false, reason: (res && res.msg) || t('page.ccrule.th_failed') };
        return;
      }
      data.value = res.data;
      threshold.value = res.data.balanced || 1;
    })
    .catch(() => {
      loading.value = false;
      data.value = { supported: false, reason: t('page.ccrule.th_failed') };
    });
}

watch(
  () => props.visible,
  (val) => {
    if (val) load();
  },
);

function barHeight(peak: number) {
  return `${Math.max(2, Math.round((peak / maxPeak.value) * BAR_MAX))}px`;
}
function onDrag(e: MouseEvent) {
  if (!dragging.value || !wrapRef.value) return;
  const r = wrapRef.value.getBoundingClientRect();
  const y = e.clientY - r.top;
  const v = Math.round(((16 + CHART_H - y) / BAR_MAX) * maxPeak.value);
  threshold.value = Math.max(1, Math.min(maxPeak.value, v));
}
function stopDrag() {
  dragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}
function startDrag(e: MouseEvent) {
  dragging.value = true;
  e.preventDefault();
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}
function apply() {
  emit('apply', threshold.value);
  emit('update:visible', false);
}

onBeforeUnmount(stopDrag);
</script>

<style scoped>
.th-loading {
  padding: 60px 0;
  text-align: center;
  color: var(--td-text-color-placeholder);
}

.th-blocked {
  padding: 10px 0;
}

.th-blocked .th-reason {
  padding: 12px 14px;
  border-radius: var(--td-radius-default);
  background: var(--td-warning-color-1);
  color: var(--td-text-color-primary);
  line-height: 1.9;
}

.th-blocked .th-ref {
  margin-top: 12px;
  padding: 12px 14px;
  border-left: 3px solid var(--td-brand-color);
  background: var(--td-brand-color-1);
  line-height: 1.9;
}

.th-meta {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-bottom: 8px;
}

.th-summary {
  font-size: 14px;
  line-height: 1.9;
  margin-bottom: 12px;
}

.th-note {
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: var(--td-radius-default);
  background: var(--td-warning-color-1);
  color: var(--td-warning-color-7);
  font-size: 12px;
  line-height: 1.8;
}

.th-stats {
  display: flex;
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-default);
  margin-bottom: 16px;
  overflow: hidden;
}

.th-stats > div {
  flex: 1;
  padding: 10px 12px;
  border-right: 1px solid var(--td-component-stroke);
}

.th-stats > div:last-child {
  border-right: 0;
}

.th-stats .k {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.th-stats .v {
  font-size: 18px;
  font-weight: 600;
  margin-top: 2px;
}

.th-chart-wrap {
  position: relative;
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-default);
  padding: 16px 16px 30px;
}

.th-chart {
  position: relative;
  height: 180px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
}

.th-bar {
  flex: 1;
  background: var(--td-brand-color-2);
  border-radius: 2px 2px 0 0;
}

.th-bar.hit {
  background: var(--td-error-color-3);
}

.th-line {
  position: absolute;
  left: 16px;
  right: 16px;
  height: 0;
  border-top: 2px dashed var(--td-error-color);
  cursor: ns-resize;
  z-index: 5;
}

.th-line::after {
  content: attr(data-v);
  position: absolute;
  right: 0;
  top: -20px;
  background: var(--td-error-color);
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 2px;
}

.th-axis {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 10px;
  font-size: 11px;
  color: var(--td-text-color-placeholder);
  display: flex;
  justify-content: space-between;
}

.th-impact {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: var(--td-radius-default);
  background: var(--td-warning-color-1);
  font-size: 13px;
  line-height: 1.8;
}

.th-tiers {
  display: flex;
  gap: 10px;
  margin: 16px 0 0;
}

.th-tier {
  flex: 1;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-default);
  padding: 12px;
  cursor: pointer;
  text-align: center;
}

.th-tier .n {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.th-tier .v {
  font-size: 22px;
  font-weight: 600;
  margin: 4px 0 2px;
}

.th-tier .d {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  line-height: 1.6;
}

.th-tier.on {
  border-color: var(--td-brand-color);
  background: var(--td-brand-color-1);
}

.th-warn {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: var(--td-radius-default);
  background: var(--td-warning-color-1);
  color: var(--td-text-color-primary);
  font-size: 13px;
  line-height: 1.8;
}

.th-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}
</style>
