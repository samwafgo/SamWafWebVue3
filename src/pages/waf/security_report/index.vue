<template>
  <div class="security-report">
    <t-alert v-if="denied" theme="warning" :message="tr('denied')" />
    <template v-else>
      <t-alert theme="info" :message="tr('intro')" />
      <t-alert v-if="configError" theme="warning" :message="configError">
        <template #operation><t-button variant="text" @click="initialize">{{ tr('retry') }}</t-button></template>
      </t-alert>
      <t-loading :loading="configLoading">
        <t-tabs v-model="tab">
          <t-tab-panel value="settings" :label="tr('settings')">
            <t-form label-align="top" class="report-form" :disabled="!allowed || saving">
              <t-card :title="tr('title')" :bordered="false">
                <t-form-item :label="tr('enabled')">
                  <div class="field-stack">
                    <t-switch v-model="config.enabled" />
                    <span class="secondary">{{ tr('enabledHint') }}</span>
                  </div>
                </t-form-item>
                <p class="secondary">{{ tr('timezone') }}: {{ timezone || '—' }} · {{ tr('timezoneHint') }}</p>
              </t-card>
              <t-card :title="tr('schedule')" :bordered="false">
                <div class="form-grid">
                  <div v-for="kind in kinds" :key="kind" class="schedule-item">
                    <t-form-item :label="tr(kind)">
                      <t-switch v-model="config[`${kind}_enabled`]" :disabled="!allowed || saving || !config.enabled" />
                    </t-form-item>
                    <t-form-item :label="tr(`${kind}At`)">
                      <div class="field-stack">
                        <t-time-picker v-model="config[`${kind}_at`]" format="HH:mm" allow-input :clearable="false"
                          :disabled="!allowed || saving || !config.enabled || !config[`${kind}_enabled`]" />
                        <span class="secondary">{{ tr(`${kind}Hint`) }}</span>
                      </div>
                    </t-form-item>
                  </div>
                </div>
              </t-card>
              <t-card :title="tr('content')" :bordered="false">
                <div class="form-grid">
                  <t-form-item :label="tr('scope')"><span>{{ tr('allInstance') }}</span></t-form-item>
                  <t-form-item :label="tr('language')">
                    <t-select v-model="config.language" :options="languages" :disabled="!allowed || saving" />
                  </t-form-item>
                  <t-form-item :label="tr('topN')">
                    <t-input-number v-model="config.top_n" :min="5" :max="50" :step="1" :disabled="!allowed || saving" />
                  </t-form-item>
                </div>
                <t-form-item :label="tr('notify')">
                  <div class="field-stack">
                    <span class="secondary">{{ tr('notifyHint') }}</span>
                    <router-link :to="{ name: 'NotifySubscription' }">{{ tr('notifyLink') }}</router-link>
                  </div>
                </t-form-item>
              </t-card>
              <t-card :title="tr('storage')" :bordered="false">
                <div class="form-grid">
                  <t-form-item :label="tr('retainDays')">
                    <t-input-number v-model="config.retain_days" :min="1" :max="365" :step="1" :disabled="!allowed || saving" />
                  </t-form-item>
                  <t-form-item :label="tr('quotaMb')">
                    <t-input-number v-model="config.quota_mb" :min="10" :max="10240" :step="10" :disabled="!allowed || saving" />
                  </t-form-item>
                </div>
                <p class="secondary">{{ tr('storageHint') }}</p>
              </t-card>
              <div class="save-bar">
                <t-button theme="primary" :disabled="!allowed || configLoading" :loading="saving" @click="save">{{ tr('save') }}</t-button>
              </div>
            </t-form>
          </t-tab-panel>
          <t-tab-panel value="tasks" :label="tr('tasks')">
            <t-card :bordered="false" class="task-card">
              <div class="toolbar">
                <t-button theme="primary" :disabled="!allowed" @click="openCreate">{{ tr('generate') }}</t-button>
                <t-button variant="outline" :loading="listLoading" :disabled="!allowed" @click="fetchList">{{ tr('refresh') }}</t-button>
                <span class="secondary">{{ tr('polling') }}</span>
              </div>
              <t-alert theme="info" :message="tr('dataHint')" />
              <t-alert v-if="listError" theme="warning" :message="listError" />
              <t-table row-key="id" :data="tasks" :columns="columns" :loading="listLoading" :pagination="pagination"
                disable-data-page :empty="tr('empty')" :max-height="600" @page-change="pageChange">
                <template #kind="{ row }">
                  <div>{{ label(row.kind) }}</div><div class="secondary task-id">{{ row.id }}</div>
                </template>
                <template #range="{ row }">{{ rangeText(row) }}</template>
                <template #status="{ row }">
                  <t-tag :theme="statusTheme(row.status)" variant="light">{{ label(row.status) }}</t-tag>
                  <div v-if="row.status === 'partial'" class="warning-text">{{ tr('partialHint') }}</div>
                  <div v-if="row.error_message" class="error-text">{{ row.error_message }}</div>
                </template>
                <template #created="{ row }">
                  <div>{{ time(row.created_at) }}</div>
                  <div class="secondary">{{ tr('completedAt') }}: {{ time(row.completed_at) }}</div>
                </template>
                <template #size="{ row }">{{ bytes(row.size_bytes) }}</template>
                <template #source="{ row }">{{ row.source === 'schedule' ? tr('scheduleSource') : label(row.source) }}</template>
                <template #actions="{ row }">
                  <div class="task-actions">
                    <t-button v-if="downloadable(row)" variant="text" size="small" :disabled="!!busy" :loading="busy === row.id" @click="readReport(row, true)">{{ tr('preview') }}</t-button>
                    <t-button v-if="downloadable(row)" variant="text" size="small" :disabled="!!busy" @click="readReport(row, false)">{{ tr('download') }}</t-button>
                    <t-popconfirm v-if="!active(row)" :content="tr('deleteConfirm')" :confirm-btn="tr('confirm')" :cancel-btn="tr('cancel')" @confirm="remove(row)">
                      <t-button theme="danger" variant="text" size="small" :disabled="!!busy">{{ tr('delete') }}</t-button>
                    </t-popconfirm>
                  </div>
                </template>
              </t-table>
            </t-card>
          </t-tab-panel>
        </t-tabs>
      </t-loading>
    </template>
    <t-dialog :visible="createVisible" :header="tr('generate')" width="min(560px, calc(100vw - 32px))" :footer="false" :close-on-overlay-click="false" @close="closeCreate">
      <t-form label-align="top">
        <t-form-item :label="tr('kind')">
          <t-radio-group v-model="createForm.kind" :disabled="creating" @change="previousPeriod">
            <t-radio v-for="kind in kinds" :key="kind" :value="kind">{{ tr(kind) }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="tr('date')">
          <div class="field-stack">
            <div class="toolbar">
              <t-date-picker v-model="createForm.date" value-type="YYYY-MM-DD" :disabled="creating" />
              <t-button variant="text" :disabled="creating" @click="previousPeriod">{{ tr('previous') }}</t-button>
            </div>
            <span class="secondary">{{ tr('dateHint') }} {{ tr('timezoneHint') }} ({{ timezone || '—' }})</span>
            <span>{{ tr('period') }}: {{ selectedPeriod }}</span>
          </div>
        </t-form-item>
        <t-alert v-if="createError" theme="warning" :message="createError" />
        <div class="dialog-footer">
          <t-button theme="default" :disabled="creating" @click="closeCreate">{{ tr('cancel') }}</t-button>
          <t-button theme="primary" :loading="creating" :disabled="!allowed" @click="create">{{ tr('generate') }}</t-button>
        </div>
      </t-form>
    </t-dialog>
    <t-dialog :visible="!!previewUrl" :header="tr('previewTitle')" width="min(1200px, calc(100vw - 32px))" :footer="false" @close="closePreview">
      <p class="secondary">{{ tr('previewHint') }}</p>
      <iframe v-if="previewUrl" :src="previewUrl" sandbox="" referrerpolicy="no-referrer" :title="tr('previewTitle')" class="report-preview" />
      <div class="dialog-footer"><t-button theme="default" @click="closePreview">{{ tr('close') }}</t-button></div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps, TagProps } from 'tdesign-vue-next';
import {
  createReport, deleteReport, downloadReport, getReportConfig, listReports, ReportRequestError, saveReportConfig,
} from '@/apis/securityReport';
import type { ReportConfig, ReportKind, ReportTask } from '@/apis/securityReport';
import type { ApiResponse } from '@/utils/request';
import { clearLocalStorageExceptPreserved, saveCurrentUrl } from '@/constants';
import { resetLocalNoticeOnLogout } from '@/utils/localnotice';

const { t, te } = useI18n();
const router = useRouter();
const tr = (key: string) => t(`securityReport.${key}`);
const label = (value: string) => value && te(`securityReport.${value}`) ? tr(value) : (value || '—');
const defaults = (): ReportConfig => ({
  enabled: true,
  daily_enabled: true,
  weekly_enabled: true,
  monthly_enabled: true,
  daily_at: '00:30',
  weekly_at: '08:00',
  monthly_at: '09:00',
  retain_days: 30,
  quota_mb: 500,
  top_n: 10,
  language: 'zh-CN',
});
const config = reactive(defaults());
const configKeys = Object.keys(defaults()) as (keyof ReportConfig)[];
const kinds: ReportKind[] = ['daily', 'weekly', 'monthly'];
const languages = [{ value: 'zh-CN', label: '中文' }, { value: 'en-US', label: 'English' }];
const tab = ref('settings');
const allowed = ref(false);
const denied = ref(false);
const configLoading = ref(false);
const configError = ref('');
const saving = ref(false);
const timezone = ref('');
const timezoneOffset = ref<number | null>(null);
let serverTime = 0;
let serverReceivedAt = 0;
const tasks = ref<ReportTask[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const listLoading = ref(false);
const listError = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;
let alive = false;
let generation = 0;
let listSequence = 0;
const createVisible = ref(false);
const createForm = reactive<{ kind: ReportKind; date: string }>({ kind: 'daily', date: '' });
const createError = ref('');
const creating = ref(false);
const busy = ref('');
const previewUrl = ref('');

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'kind', title: tr('kind'), width: 220 },
  { colKey: 'range', title: tr('range'), width: 200 },
  { colKey: 'status', title: tr('status'), width: 240 },
  { colKey: 'created', title: tr('created'), width: 220 },
  { colKey: 'size', title: tr('size'), width: 110 },
  { colKey: 'source', title: tr('source'), width: 100 },
  { colKey: 'actions', title: tr('actions'), width: 220 },
]);
const pad = (n: number) => String(n).padStart(2, '0');
const calendarDate = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
function period(kind: ReportKind, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const start = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || calendarDate(start) !== date) return null;
  if (kind === 'weekly') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (kind === 'monthly') start.setUTCDate(1);
  const end = new Date(start);
  if (kind === 'monthly') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + (kind === 'weekly' ? 7 : 1));
  return { start, end };
}
const selectedPeriod = computed(() => {
  const selected = period(createForm.kind, createForm.date);
  return selected ? `${calendarDate(selected.start)} ~ ${calendarDate(new Date(selected.end.getTime() - 1))}` : '—';
});

function requireSuccess<T>(res: ApiResponse<T>): T {
  if (!res || res.code !== 0) throw new ReportRequestError(res?.msg || tr('requestFailed'), res?.code);
  return res.data;
}
function result<T extends object>(res: ApiResponse<T>): T {
  const data = requireSuccess(res);
  if (!data || typeof data !== 'object') throw new ReportRequestError(tr('requestFailed'));
  return data;
}
function clearTimer() {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
}
function closePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
}
function handleError(error: unknown): string {
  const code = error instanceof ReportRequestError ? error.apiCode : undefined;
  if (code !== undefined && [-403, -999, -3, -4].includes(code)) {
    allowed.value = false;
    denied.value = true;
    tasks.value = [];
    pagination.total = 0;
    generation += 1;
    listSequence += 1;
    configLoading.value = false;
    listLoading.value = false;
    saving.value = false;
    creating.value = false;
    busy.value = '';
    clearTimer();
    createVisible.value = false;
    closePreview();
    if (code === -999 || code === -4) {
      saveCurrentUrl();
      clearLocalStorageExceptPreserved();
      resetLocalNoticeOnLogout(code === -999 ? 'auth' : undefined);
      void router.replace({ path: '/login' });
    }
    if (code === -3) void router.replace({ name: 'OTP' });
  }
  const message = error instanceof Error ? error.message : '';
  return message && message !== 'REPORT_DOWNLOAD_FAILED' ? message : tr('requestFailed');
}
function stop() {
  alive = false;
  generation += 1;
  listSequence += 1;
  clearTimer();
  configLoading.value = false;
  listLoading.value = false;
  saving.value = false;
  creating.value = false;
  busy.value = '';
  createVisible.value = false;
  closePreview();
}
async function initialize() {
  clearTimer();
  alive = true;
  const gen = ++generation;
  allowed.value = false;
  denied.value = false;
  configLoading.value = true;
  configError.value = '';
  try {
    const data = result(await getReportConfig());
    if (!alive || gen !== generation) return;
    // 只拷贝设置字段，避免将服务器元信息提交回严格校验接口。
    const value = defaults();
    for (const key of configKeys) {
      if (data[key] !== undefined) Object.assign(value, { [key]: data[key] });
    }
    Object.assign(config, value);
    timezone.value = typeof data.timezone === 'string' ? data.timezone : '';
    timezoneOffset.value = Number.isFinite(data.timezone_offset) ? data.timezone_offset : null;
    serverTime = Number(data.server_time) || 0;
    serverReceivedAt = Date.now();
    allowed.value = true;
    void fetchList();
  } catch (error) {
    if (alive && gen === generation) configError.value = handleError(error) || tr('loadFailed');
  } finally {
    if (gen === generation) configLoading.value = false;
  }
}
async function save() {
  if (!allowed.value || saving.value) return;
  const integer = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
  if (!kinds.every(kind => /^([01]\d|2[0-3]):[0-5]\d$/.test(config[`${kind}_at`])) ||
      !integer(config.retain_days, 1, 365) || !integer(config.quota_mb, 10, 10240) ||
      !integer(config.top_n, 5, 50) || !['zh-CN', 'en-US'].includes(config.language)) {
    void MessagePlugin.warning(tr('configInvalid'));
    return;
  }
  saving.value = true;
  const gen = generation;
  try {
    const body = Object.fromEntries(configKeys.map(key => [key, config[key]])) as unknown as ReportConfig;
    const res = await saveReportConfig(body);
    if (!alive || gen !== generation) return;
    requireSuccess(res);
    void MessagePlugin.success(tr('saved'));
  } catch (error) {
    if (alive && gen === generation) void MessagePlugin.error(handleError(error));
  } finally {
    if (gen === generation) saving.value = false;
  }
}
async function fetchList() {
  if (!alive || !allowed.value) return;
  clearTimer();
  const gen = generation;
  const seq = ++listSequence;
  listLoading.value = true;
  try {
    const data = result(await listReports({ pageIndex: pagination.current, pageSize: pagination.pageSize }));
    if (!alive || gen !== generation || seq !== listSequence) return;
    if (!Array.isArray(data.list) || !Number.isFinite(data.total)) throw new Error(tr('listFailed'));
    tasks.value = data.list;
    pagination.total = data.total;
    listError.value = '';
    const lastPage = Math.max(1, Math.ceil(data.total / pagination.pageSize));
    if (pagination.current > lastPage) {
      pagination.current = lastPage;
      void fetchList();
    }
  } catch (error) {
    if (alive && gen === generation && seq === listSequence) listError.value = `${tr('listFailed')} ${handleError(error)}`;
  } finally {
    if (alive && gen === generation && seq === listSequence) {
      listLoading.value = false;
      if (allowed.value) timer = setTimeout(() => void fetchList(), 5000);
    }
  }
}
function pageChange(page: PageInfo) {
  pagination.current = page.current;
  pagination.pageSize = page.pageSize;
  void fetchList();
}
const active = (row: ReportTask) => ['queued', 'running'].includes(row.status);
const downloadable = (row: ReportTask) => ['completed', 'partial'].includes(row.status);
function statusTheme(status: string): TagProps['theme'] {
  const themes: Record<string, TagProps['theme']> = { completed: 'success', partial: 'warning', failed: 'danger', expired: 'default' };
  return themes[status] || 'primary';
}
function time(value: number, dateOnly = false): string {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const date = new Date((seconds + (timezoneOffset.value || 0)) * 1000);
  if (!Number.isFinite(date.getTime())) return '—';
  if (timezoneOffset.value === null) return dateOnly ? date.toLocaleDateString() : date.toLocaleString();
  return dateOnly ? calendarDate(date) : `${calendarDate(date)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
function rangeText(row: ReportTask) {
  return row.range_start && row.range_end ? `${time(row.range_start, true)} ~ ${time(Number(row.range_end) - 1, true)}` : '—';
}
function bytes(value: number) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0 || value === null || value === undefined) return '—';
  if (!size) return '0 B';
  const unit = Math.min(3, Math.floor(Math.log(size) / Math.log(1024)));
  return `${(size / (1024 ** unit)).toFixed(unit ? 1 : 0)} ${['B', 'KiB', 'MiB', 'GiB'][unit]}`;
}
function previousPeriod() {
  const seconds = serverTime ? serverTime + (Date.now() - serverReceivedAt) / 1000 : Date.now() / 1000;
  let today: string;
  if (timezoneOffset.value !== null) today = calendarDate(new Date((seconds + timezoneOffset.value) * 1000));
  else {
    const date = new Date();
    today = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  const current = period(createForm.kind, today);
  if (current) createForm.date = calendarDate(new Date(current.start.getTime() - 86400000));
  createError.value = '';
}
function openCreate() {
  if (!allowed.value) return;
  createError.value = '';
  createVisible.value = true;
  previousPeriod();
}
function closeCreate() {
  if (!creating.value) createVisible.value = false;
}
async function create() {
  if (!allowed.value || creating.value) return;
  if (!period(createForm.kind, createForm.date)) {
    createError.value = tr('invalidDate');
    return;
  }
  creating.value = true;
  createError.value = '';
  const gen = generation;
  try {
    result(await createReport({ kind: createForm.kind, date: createForm.date }));
    if (!alive || gen !== generation) return;
    createVisible.value = false;
    tab.value = 'tasks';
    pagination.current = 1;
    void MessagePlugin.success(tr('accepted'));
    void fetchList();
  } catch (error) {
    if (alive && gen === generation) createError.value = handleError(error);
  } finally {
    if (gen === generation) creating.value = false;
  }
}
const validId = (id: string) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
async function remove(row: ReportTask) {
  if (!allowed.value || busy.value || !validId(row.id) || active(row)) return;
  busy.value = row.id;
  const gen = generation;
  try {
    const res = await deleteReport(row.id);
    if (!alive || gen !== generation) return;
    requireSuccess(res);
    void MessagePlugin.success(tr('deleted'));
    void fetchList();
  } catch (error) {
    if (alive && gen === generation) void MessagePlugin.error(handleError(error));
  } finally {
    if (gen === generation) busy.value = '';
  }
}
async function readReport(row: ReportTask, preview: boolean) {
  if (!allowed.value || busy.value || !validId(row.id) || !downloadable(row)) return;
  busy.value = row.id;
  const gen = generation;
  try {
    let blob = await downloadReport(row.id);
    if (!alive || !allowed.value || gen !== generation) return;
    if (preview) {
      const html = await blob.text();
      if (!alive || !allowed.value || gen !== generation) return;
      const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">`;
      blob = new Blob(['<!doctype html>', policy, html], { type: 'text/html;charset=utf-8' });
    }
    const url = URL.createObjectURL(blob);
    if (preview) {
      closePreview();
      previewUrl.value = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = `samwaf-report-${row.id}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (error) {
    if (alive && gen === generation) void MessagePlugin.error(handleError(error));
  } finally {
    if (gen === generation) busy.value = '';
  }
}

onMounted(initialize);
onActivated(() => { if (!alive) void initialize(); });
onDeactivated(stop);
onUnmounted(stop);
</script>

<style scoped>
.security-report > .t-alert { margin-bottom: 16px; }
.security-report .t-card { margin: 16px 0; }
.report-form { max-width: 1200px; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px 28px; }
.field-stack { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; width: 100%; }
.secondary { color: var(--td-text-color-secondary); font-size: 12px; line-height: 1.7; }
.toolbar, .task-actions, .dialog-footer { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.toolbar { margin-bottom: 12px; }
.dialog-footer, .save-bar { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.task-card .t-alert { margin-bottom: 12px; }
.task-id, .error-text, .warning-text { overflow-wrap: anywhere; margin-top: 6px; }
.warning-text { color: var(--td-warning-color); font-size: 12px; }
.error-text { color: var(--td-error-color); font-size: 12px; white-space: pre-wrap; }
.report-preview { width: 100%; height: 68vh; border: 1px solid var(--td-component-border); background: white; }
@media (max-width: 960px) {
  .form-grid { grid-template-columns: 1fr; gap: 0; }
}
</style>
