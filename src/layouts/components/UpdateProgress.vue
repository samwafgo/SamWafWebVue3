<template>
  <div>
    <t-dialog
      v-model:visible="visible"
      width="680px"
      :header="dialogTitle"
      :close-on-overlay-click="false"
      :confirm-btn="null"
      :cancel-btn="null"
      @close="onDialogClose"
    >
      <!-- 进度头 -->
      <div class="upg-head">
        <span class="upg-pct">{{ percent }}%</span>
        <span class="upg-ver">{{ snap.from_version }} → {{ snap.to_version }}</span>
        <t-tag v-if="snap.channel === 'github'" theme="danger" variant="light" size="small">beta</t-tag>
        <span class="upg-elapsed">{{ t('topNav.update.progress.elapsed', { t: elapsedText }) }}</span>
      </div>

      <t-progress :percentage="percent" theme="line" :status="progressStatus" :label="false" />

      <div class="upg-meta">
        <span>{{ currentText }}</span>
        <span class="upg-meta-r">{{ rateText }}</span>
      </div>

      <!-- 阶段清单 -->
      <ul class="upg-steps">
        <li v-for="s in snap.stages" :key="s.key" :class="`st-${s.state}`">
          <span class="ic"></span>
          <span class="nm">{{ t(`topNav.update.progress.stage.${s.key}`) }}</span>
          <span class="dt">{{ s.detail }}</span>
          <span class="tm">{{ costText(s) }}</span>
        </li>
      </ul>

      <!-- 失败 -->
      <t-alert v-if="phase === 'failed'" theme="error" style="margin-top: 14px">
        <template #message>
          <div>{{ failMessage }}</div>
          <div style="margin-top: 4px">{{ failSafeTip }}</div>
        </template>
      </t-alert>

      <!-- 取消 -->
      <t-alert v-if="phase === 'canceled'" theme="warning" style="margin-top: 14px">
        <template #message>
          {{ t('topNav.update.progress.canceled_msg', { v: snap.from_version }) }}
        </template>
      </t-alert>

      <!-- 重启超时 -->
      <t-alert v-if="phase === 'timeout'" theme="warning" style="margin-top: 14px">
        <template #message>
          {{ t('topNav.update.progress.timeout_tips', { n: restartTimeout, v: snap.from_version }) }}
        </template>
      </t-alert>

      <!-- 成功 -->
      <t-alert v-if="phase === 'success'" theme="success" style="margin-top: 14px">
        <template #message>
          {{ t('topNav.update.progress.success_msg', { v: snap.to_version }) }}
        </template>
      </t-alert>

      <!-- 底部操作 -->
      <div class="upg-foot">
        <span class="upg-foot-hint">{{ footHint }}</span>
        <template v-if="phase === 'progress' || phase === 'restart'">
          <t-button size="small" variant="outline" @click="minimize">
            {{ t('topNav.update.progress.background_run') }}
          </t-button>
          <t-button size="small" variant="outline" :disabled="!canCancel" @click="handleCancel">
            {{ t('topNav.update.progress.cancel') }}
          </t-button>
        </template>
        <template v-else-if="phase === 'success'">
          <t-button size="small" theme="primary" @click="reloadPage">
            {{ t('topNav.update.progress.refresh') }}
          </t-button>
          <t-button size="small" variant="outline" @click="close">
            {{ t('topNav.update.progress.later') }}
          </t-button>
        </template>
        <template v-else-if="phase === 'timeout'">
          <t-button size="small" variant="outline" @click="keepWaiting">
            {{ t('topNav.update.progress.keep_waiting') }}
          </t-button>
          <t-button size="small" variant="outline" @click="emit('open-rollback')">
            {{ t('topNav.update.progress.rollback_entry') }}
          </t-button>
          <t-button size="small" variant="outline" @click="close">
            {{ t('topNav.update.progress.close') }}
          </t-button>
        </template>
        <template v-else>
          <t-button size="small" theme="primary" @click="handleRetry">
            {{ t('topNav.update.progress.retry') }}
          </t-button>
          <t-button size="small" variant="outline" @click="copyError">
            {{ t('topNav.update.progress.copy_error') }}
          </t-button>
          <t-button size="small" variant="outline" @click="close">
            {{ t('topNav.update.progress.close') }}
          </t-button>
        </template>
      </div>
    </t-dialog>

    <!-- 后台运行时的悬浮球：升级不中断，点击还原 -->
    <div v-if="minimized" class="upg-pill" @click="restore">
      <span class="ring" :style="ringStyle"
        ><i>{{ percent }}%</i></span
      >
      <span class="txt">
        {{ t('topNav.update.progress.pill_title', { v: snap.to_version }) }}
        <em>{{ pillStage }}</em>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';

import { CancelUpdateApi, GetUpdateProgressApi, SysVersionApi } from '@/apis/sysinfo';

const PROGRESS_POLL_MS = 1000; // 升级中拉进度
const VERSION_POLL_MS = 2000; // 重启后探测服务是否就绪

interface StageItem {
  key: string;
  state: string;
  cost_ms: number;
  detail: string;
}

interface ProgressSnap {
  state: string;
  stage: string;
  percent: number;
  downloaded: number;
  total: number;
  speed: number;
  from_version: string;
  to_version: string;
  channel: string;
  started_at: number;
  error: string;
  error_stage: string;
  restart_timeout?: number;
  stages: StageItem[];
}

function emptySnap(): ProgressSnap {
  return {
    state: 'idle',
    stage: '',
    percent: 0,
    downloaded: 0,
    total: 0,
    speed: 0,
    from_version: '',
    to_version: '',
    channel: '',
    started_at: 0,
    error: '',
    error_stage: '',
    stages: [],
  };
}

const { t } = useI18n();
const emit = defineEmits<{ (e: 'retry'): void; (e: 'open-rollback'): void }>();

const visible = ref(false);
const minimized = ref(false);
/** progress: 升级中 | restart: 等待重启就绪 | success | failed | canceled | timeout */
const phase = ref('progress');
const snap = ref<ProgressSnap>(emptySnap());
/** 由后端 config.yml 的 update_restart_timeout 下发，前端不写死 */
const restartTimeout = ref(90);
const restartWaited = ref(0);
const restartProbes = ref(0);
const elapsed = ref(0);

let pollTimer: ReturnType<typeof setInterval> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;

const percent = computed(() => (phase.value === 'success' ? 100 : snap.value.percent || 0));

const dialogTitle = computed(() => {
  const map: Record<string, string> = {
    progress: 'title_running',
    restart: 'title_restarting',
    success: 'title_success',
    failed: 'title_failed',
    canceled: 'title_canceled',
    timeout: 'title_restarting',
  };
  return t(`topNav.update.progress.${map[phase.value] || 'title_running'}`);
});

const progressStatus = computed(() => {
  if (phase.value === 'success') return 'success';
  if (phase.value === 'failed' || phase.value === 'timeout') return 'error';
  if (phase.value === 'canceled') return 'warning';
  return 'active';
});

/** 只有下载阶段可取消：进入替换后中断反而危险 */
const canCancel = computed(
  () => phase.value === 'progress' && snap.value.state === 'running' && snap.value.stage === 'download',
);

function mb(n: number): string {
  return `${(n / 1048576).toFixed(1)} MB`;
}

const currentText = computed(() => {
  if (phase.value === 'restart') {
    return t('topNav.update.progress.restarting_probe', { n: restartProbes.value });
  }
  if (phase.value === 'success') {
    return t('topNav.update.progress.success_short', { v: snap.value.to_version });
  }
  if (!snap.value.stage) return '';
  const name = t(`topNav.update.progress.stage.${snap.value.stage}`);
  if (phase.value === 'failed') {
    return `${name} · ${t('topNav.update.progress.interrupted')}`;
  }
  if (snap.value.stage === 'download' && snap.value.total > 0) {
    return `${name} · ${Math.round((snap.value.downloaded / snap.value.total) * 100)}%`;
  }
  return name;
});

const rateText = computed(() => {
  if (phase.value === 'restart') {
    return t('topNav.update.progress.waited', { n: restartWaited.value });
  }
  if (snap.value.stage !== 'download' || !snap.value.downloaded) return '';
  const parts = [
    snap.value.total > 0 ? `${mb(snap.value.downloaded)} / ${mb(snap.value.total)}` : mb(snap.value.downloaded),
  ];
  if (snap.value.speed > 0) {
    parts.push(`${mb(snap.value.speed)}/s`);
    if (snap.value.total > 0) {
      const left = Math.max(0, Math.ceil((snap.value.total - snap.value.downloaded) / snap.value.speed));
      parts.push(t('topNav.update.progress.eta', { n: left }));
    }
  }
  return parts.join(' · ');
});

const elapsedText = computed(() => {
  const s = elapsed.value;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
});

const footHint = computed(() => {
  if (phase.value === 'restart') return t('topNav.update.progress.restart_hint');
  if (phase.value === 'progress') return t('topNav.update.progress.foot_hint');
  return '';
});

const failMessage = computed(() => {
  const stage = snap.value.error_stage || snap.value.stage;
  const tip = t(`topNav.update.progress.fail.${stage}`);
  const desc = tip && !tip.includes('topNav.') ? tip : t('topNav.update.progress.fail.generic');
  return snap.value.error ? `${desc}（${snap.value.error}）` : desc;
});

/** 只有替换阶段失败才涉及"程序文件动过没有"，其余阶段一律未改动 */
const failSafeTip = computed(() => {
  if (snap.value.error_stage === 'replace') return t('topNav.update.progress.fail_replace_tip');
  return t('topNav.update.progress.fail_safe', { v: snap.value.from_version });
});

const pillStage = computed(() => {
  if (phase.value === 'restart') return t('topNav.update.progress.title_restarting');
  if (phase.value === 'success') return t('topNav.update.progress.title_success');
  if (phase.value === 'failed') return t('topNav.update.progress.title_failed');
  return snap.value.stage ? t(`topNav.update.progress.stage.${snap.value.stage}`) : '';
});

const ringStyle = computed(() => ({
  background: `conic-gradient(var(--td-brand-color, #0052d9) ${percent.value * 3.6}deg, #ebedf0 0deg)`,
}));

function costText(s: StageItem): string {
  return s.cost_ms ? `${(s.cost_ms / 1000).toFixed(1)}s` : '';
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function stopTimers() {
  stopPoll();
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function startTick() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    if (phase.value === 'progress' || phase.value === 'restart') {
      elapsed.value += 1;
      if (phase.value === 'restart') restartWaited.value += 1;
    }
  }, 1000);
}

function applySnap(data: ProgressSnap) {
  snap.value = data;
  if (data.restart_timeout && data.restart_timeout > 0) restartTimeout.value = data.restart_timeout;
  if (data.started_at > 0) {
    const diff = Math.floor(Date.now() / 1000) - data.started_at;
    if (diff >= 0) elapsed.value = diff;
  }
}

function onSettled() {
  stopTimers();
  // 终态时如果还收在悬浮球里，弹回来让用户看到结果
  if (minimized.value) {
    minimized.value = false;
    visible.value = true;
  }
}

function probeVersion() {
  if (restartWaited.value >= restartTimeout.value) {
    phase.value = 'timeout';
    onSettled();
    return;
  }
  restartProbes.value += 1;
  SysVersionApi()
    .then((res: any) => {
      if (res.code !== 0 || !res.data) return;
      // 判据是版本号确实变成了目标版本：旧进程还没退干净时接口也可能是通的
      const target = snap.value.to_version;
      const now = res.data.version;
      if (target && now && now === target) {
        phase.value = 'success';
        onSettled();
      }
    })
    .catch(() => {
      // 重启窗口内请求失败是预期内的，继续等
    });
}

function startVersionPolling() {
  stopPoll();
  startTick();
  pollTimer = setInterval(() => probeVersion(), VERSION_POLL_MS);
}

function fetchProgress() {
  GetUpdateProgressApi()
    .then((res: any) => {
      if (res.code !== 0 || !res.data) return;
      applySnap(res.data);
      switch (res.data.state) {
        case 'restarting':
          // 二进制已替换，接下来服务会重启：进度接口马上就会不可用，转去探测版本号
          phase.value = 'restart';
          startVersionPolling();
          break;
        case 'failed':
          phase.value = 'failed';
          onSettled();
          break;
        case 'canceled':
          phase.value = 'canceled';
          onSettled();
          break;
        default:
          break;
      }
    })
    .catch(() => {
      // 升级中接口不通，多半是已经开始重启了；转为探测版本号，别把用户晾在原地
      if (phase.value === 'progress' && snap.value.state === 'running') {
        phase.value = 'restart';
        startVersionPolling();
      }
    });
}

function startPolling() {
  stopPoll();
  startTick();
  pollTimer = setInterval(() => fetchProgress(), PROGRESS_POLL_MS);
  fetchProgress();
}

/** 用户点了「确认更新」之后由 LayoutHeader 调用 */
function start() {
  snap.value = emptySnap();
  phase.value = 'progress';
  elapsed.value = 0;
  restartWaited.value = 0;
  restartProbes.value = 0;
  minimized.value = false;
  visible.value = true;
  startPolling();
}

/** 刷新页面 / 切换标签后恢复现场：升级中就直接以悬浮球续显 */
function resume() {
  GetUpdateProgressApi()
    .then((res: any) => {
      if (res.code !== 0 || !res.data) return;
      const st = res.data.state;
      if (st !== 'running' && st !== 'restarting') return;
      applySnap(res.data);
      phase.value = st === 'restarting' ? 'restart' : 'progress';
      minimized.value = true;
      visible.value = false;
      if (phase.value === 'restart') startVersionPolling();
      else startPolling();
    })
    .catch(() => {});
}

function minimize() {
  minimized.value = true;
  visible.value = false;
}

function restore() {
  minimized.value = false;
  visible.value = true;
}

function onDialogClose() {
  // 升级还在跑时关闭弹窗 = 后台运行，绝不中断升级
  if (phase.value === 'progress' || phase.value === 'restart') {
    minimized.value = true;
  } else {
    stopTimers();
  }
}

function close() {
  visible.value = false;
  minimized.value = false;
  stopTimers();
}

function keepWaiting() {
  restartWaited.value = 0;
  phase.value = 'restart';
  startVersionPolling();
}

function handleCancel() {
  CancelUpdateApi()
    .then((res: any) => {
      if (res.code === 0) MessagePlugin.success(res.msg);
      else MessagePlugin.warning(res.msg);
    })
    .catch(() => {});
}

function handleRetry() {
  close();
  emit('retry');
}

function copyError() {
  const text = [
    `stage: ${snap.value.error_stage || snap.value.stage}`,
    `error: ${snap.value.error}`,
    `version: ${snap.value.from_version} -> ${snap.value.to_version}`,
    `channel: ${snap.value.channel}`,
  ].join('\n');
  const done = () => MessagePlugin.success(t('topNav.update.progress.copied'));
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => {});
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  done();
}

function reloadPage() {
  window.location.reload();
}

onBeforeUnmount(stopTimers);

defineExpose({ start, resume });
</script>

<!-- 不加 scoped：t-dialog 的内容被 teleport 到 body，scoped 属性选择器选不到；类名统一 upg- 前缀避免冲突 -->
<style>
.upg-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}

.upg-head .upg-pct {
  font-size: 22px;
  font-weight: 600;
}

.upg-head .upg-ver {
  font-size: 14px;
}

.upg-head .upg-elapsed {
  margin-left: auto;
  font-size: 12px;
  color: var(--td-text-color-placeholder, rgba(0, 0, 0, 0.4));
}

.upg-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
  margin-top: 7px;
  flex-wrap: wrap;
}

.upg-meta .upg-meta-r {
  color: var(--td-text-color-placeholder, rgba(0, 0, 0, 0.4));
}

.upg-steps {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
}

.upg-steps li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 5px 0;
  font-size: 13px;
  color: var(--td-text-color-placeholder, rgba(0, 0, 0, 0.4));
}

.upg-steps li .ic {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex: none;
  border: 1px solid var(--td-component-border, #dcdcdc);
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  background: var(--td-bg-color-container, #fff);
}

.upg-steps li .nm {
  flex: none;
  min-width: 132px;
}

.upg-steps li .dt {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  word-break: break-all;
}

.upg-steps li .tm {
  flex: none;
  font-size: 12px;
}

.upg-steps li.st-done {
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
}

.upg-steps li.st-done .ic {
  background: var(--td-success-color, #2ba471);
  border-color: var(--td-success-color, #2ba471);
}

.upg-steps li.st-done .ic::after {
  content: '✓';
}

.upg-steps li.st-skipped .ic {
  background: #c5c5c5;
  border-color: #c5c5c5;
}

.upg-steps li.st-skipped .ic::after {
  content: '–';
}

.upg-steps li.st-warn {
  color: var(--td-warning-color, #e37318);
}

.upg-steps li.st-warn .ic {
  background: var(--td-warning-color, #e37318);
  border-color: var(--td-warning-color, #e37318);
}

.upg-steps li.st-warn .ic::after {
  content: '!';
}

.upg-steps li.st-running {
  color: var(--td-text-color-primary, rgba(0, 0, 0, 0.9));
  font-weight: 500;
}

.upg-steps li.st-running .ic {
  border-color: var(--td-brand-color, #0052d9);
  border-top-color: transparent;
  animation: upg-spin 0.7s linear infinite;
}

.upg-steps li.st-failed {
  color: var(--td-error-color, #d54941);
}

.upg-steps li.st-failed .ic {
  background: var(--td-error-color, #d54941);
  border-color: var(--td-error-color, #d54941);
}

.upg-steps li.st-failed .ic::after {
  content: '!';
}

@keyframes upg-spin {
  to {
    transform: rotate(360deg);
  }
}

.upg-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--td-component-stroke, #e7e7e7);
}

.upg-foot .upg-foot-hint {
  margin-right: auto;
  font-size: 12px;
  color: var(--td-text-color-placeholder, rgba(0, 0, 0, 0.4));
  line-height: 1.6;
}

.upg-pill {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 3000;
  background: var(--td-bg-color-container, #fff);
  border: 1px solid var(--td-component-stroke, #e7e7e7);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
  border-radius: 24px;
  padding: 8px 16px 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
}

.upg-pill .ring {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex: none;
}

.upg-pill .ring i {
  display: block;
  width: 20px;
  height: 20px;
  background: var(--td-bg-color-container, #fff);
  border-radius: 50%;
  margin: 3px;
  font-style: normal;
  font-size: 9px;
  line-height: 20px;
  text-align: center;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
}

.upg-pill .txt em {
  display: block;
  font-style: normal;
  font-size: 11px;
  color: var(--td-text-color-placeholder, rgba(0, 0, 0, 0.4));
}
</style>
