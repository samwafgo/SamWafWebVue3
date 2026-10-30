<template>
  <t-dialog
    class="log-export-dialog"
    attach="body"
    :header="tr('title')"
    :visible="visible"
    width="min(1180px, calc(100vw - 32px))"
    :footer="false"
    :close-on-overlay-click="false"
    @close="close"
  >
    <div class="log-export">
      <t-loading :loading="capLoading">
        <t-alert v-if="capError" theme="warning" :message="tr('unavailable')">
          <template #operation><t-button variant="text" @click="open(focusId)">{{ tr('retry') }}</t-button></template>
        </t-alert>
        <t-alert v-else-if="!capability.allowed" theme="warning" :message="tr('denied')" />
        <template v-else>
          <t-alert v-if="!capability.enabled" theme="warning" :message="tr('disabled')" />
          <t-alert theme="info" :message="tr('scope')" />
          <t-form label-align="top" class="export-form">
            <t-form-item :label="tr('tables')">
              <t-checkbox-group v-model="form.tables" :disabled="!capability.enabled || creating">
                <t-checkbox value="access_log">{{ tr('access') }} (access_log)</t-checkbox>
                <t-checkbox value="security_event">{{ tr('event') }} (security_event)</t-checkbox>
              </t-checkbox-group>
            </t-form-item>
            <t-form-item :label="tr('time')">
              <div class="field-stack">
                <div class="inline-controls">
                  <t-radio-group v-model="form.range_mode" :disabled="!capability.enabled || creating">
                    <t-radio value="custom">{{ tr('custom') }}</t-radio>
                    <t-radio value="days">{{ tr('days') }}</t-radio>
                    <t-radio value="all">{{ tr('all') }}</t-radio>
                  </t-radio-group>
                  <t-button variant="text" :disabled="creating || !capability.enabled" @click="recent">{{ tr('recent') }}</t-button>
                </div>
                <t-date-range-picker
                  v-if="form.range_mode === 'custom'"
                  v-model="form.range"
                  enable-time-picker
                  clearable
                  value-type="YYYY-MM-DD HH:mm:ss"
                  :disabled="!capability.enabled || creating"
                  style="width: 100%"
                />
                <t-date-range-picker
                  v-else-if="form.range_mode === 'days'"
                  v-model="form.days"
                  clearable
                  value-type="YYYY-MM-DD"
                  :disabled="!capability.enabled || creating"
                  style="width: 100%"
                />
                <span class="secondary">{{ tr(form.range_mode === 'days' ? 'daysBoundary' : 'boundary') }}</span>
                <t-alert v-if="form.range_mode === 'all'" theme="warning" :message="tr('allWarning')" />
              </div>
            </t-form-item>
            <t-form-item :label="tr('format')">
              <div class="field-stack">
                <t-select v-model="form.format" :options="formatOptions" :disabled="!capability.enabled || creating" />
                <t-alert v-if="form.format === 'sqlite'" theme="warning" :message="tr('sqliteHint')" />
                <span v-else-if="form.format" class="secondary">{{ tr(form.format + 'Hint') }}</span>
                <span class="secondary">{{ tr('plaintext') }}</span>
              </div>
            </t-form-item>
            <t-button theme="primary" :loading="creating" :disabled="!capability.enabled || !formatOptions.length" @click="create">
              {{ tr('create') }}
            </t-button>
          </t-form>
          <div class="task-heading">
            <h3>{{ tr('tasks') }}</h3>
            <t-button variant="outline" :loading="listLoading" @click="refresh()">{{ tr('refresh') }}</t-button>
          </div>
          <p class="secondary">{{ tr('progressHint') }}</p>
          <t-alert v-if="pollError" theme="warning" :message="tr('pollFailed')" />
          <div class="task-table">
            <t-table
              row-key="id"
              :data="tasks"
              :columns="columns"
              :loading="listLoading"
              :empty="tr('empty')"
              :pagination="pagination"
              :disable-data-page="true"
              :max-height="360"
              @page-change="pageChange"
            >
              <template #created="{ row }">
                <span class="data-text">{{ time(row.created_at) }}</span><br />
                <t-button variant="text" size="small" @click="selectTask(row.id)">{{ row.id }}</t-button>
              </template>
              <template #range="{ row }">
                <div>{{ tableNames(row.tables) }} · {{ row.format }}</div>
                <span class="secondary data-text">{{ rangeText(row) }}</span>
              </template>
              <template #state="{ row }">
                <t-tag :theme="statusTheme(row.status)" variant="light">{{ statusText(row.status) }}</t-tag><br />
                <span class="secondary">{{ statusText(row.phase) }}</span><br />
                <span class="secondary">{{ tr('sources', { done: row.source_done || 0, total: row.source_total || 0 }) }}</span>
                <div v-if="row.status === 'partial'" class="partial-text">{{ tr('partialHint') }}</div>
                <div v-if="row.error_code || row.error_message" class="error-text">{{ row.error_code }} {{ row.error_message }}</div>
              </template>
              <template #written="{ row }">
                <span class="data-text">{{ tr('rows', { count: count(row.rows_written) }) }}</span><br />
                <span class="secondary data-text">{{ bytes(row.bytes_written) }}</span>
              </template>
              <template #expires="{ row }">
                <span class="data-text">{{ row.expires_at ? time(row.expires_at) : tr('pending') }}</span>
              </template>
              <template #actions="{ row }">
                <div class="task-actions">
                  <t-button size="small" variant="text" @click="selectTask(row.id)">{{ tr('detail') }}</t-button>
                  <t-button v-if="isActive(row) && row.status !== 'cancelling'" size="small" variant="text" :loading="busy === row.id" :disabled="!!busy" @click="confirmAction(row, 'cancel')">{{ tr('cancel') }}</t-button>
                  <t-button v-if="downloadable(row)" size="small" variant="text" :loading="busy === row.id" :disabled="!!busy || !capability.enabled" @click="download(row)">{{ tr('download') }}</t-button>
                  <t-button v-if="row.status !== 'deleted'" size="small" theme="danger" variant="text" :loading="busy === row.id" :disabled="!!busy" @click="confirmAction(row, 'delete')">{{ tr('delete') }}</t-button>
                </div>
              </template>
            </t-table>
          </div>
          <div v-if="focused" class="focused-task">
            <strong>{{ tr('taskId') }} <span class="data-text">{{ focused.id }}</span></strong>
            <p>
              <t-tag :theme="statusTheme(focused.status)" variant="light">{{ statusText(focused.status) }}</t-tag>
              {{ statusText(focused.phase) }} · {{ tr('rows', { count: count(focused.rows_written) }) }} · {{ bytes(focused.bytes_written) }} · {{ tr('sources', { done: focused.source_done || 0, total: focused.source_total || 0 }) }}
            </p>
            <p>{{ tableNames(focused.tables) }} · {{ focused.format }} · {{ rangeText(focused) }}</p>
            <p v-if="focused.status === 'partial'" class="partial-text">{{ tr('partialHint') }}</p>
            <p v-if="focused.status === 'failed'" class="error-text">{{ tr('failedHint') }}</p>
            <p v-if="focused.status === 'expired'">{{ tr('expiredHint') }}</p>
            <p v-if="focused.status === 'ready' && Number(focused.rows_written) === 0">{{ tr('emptyHint') }}</p>
            <p v-if="focused.error_code || focused.error_message" class="error-text">{{ focused.error_code }} {{ focused.error_message }}</p>
            <p>{{ tr('expires') }}: {{ focused.expires_at ? time(focused.expires_at) : tr('pending') }}</p>
            <div class="inline-controls">
              <t-button v-if="downloadable(focused)" :disabled="!!busy || !capability.enabled" @click="download(focused)">{{ tr('download') }}</t-button>
              <t-button v-if="isActive(focused) && focused.status !== 'cancelling'" :disabled="!!busy" @click="confirmAction(focused, 'cancel')">{{ tr('cancel') }}</t-button>
              <t-button v-if="focused.status !== 'deleted'" theme="danger" variant="outline" :disabled="!!busy" @click="confirmAction(focused, 'delete')">{{ tr('delete') }}</t-button>
            </div>
          </div>
        </template>
      </t-loading>
      <div class="export-footer"><t-button theme="default" @click="close">{{ tr('close') }}</t-button></div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { DialogPlugin, MessagePlugin, type PageInfo, type TableProps, type TagProps } from 'tdesign-vue-next';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import bus from '@/utils/bus';
import {
  exportCapabilities,
  createLogExport,
  listLogExports,
  getLogExport,
  cancelLogExport,
  deleteLogExport,
  logExportTicket,
  startLogExportDownload,
} from '@/apis/waflog/exports';

interface Capability {
  allowed: boolean;
  enabled: boolean;
  formats: string[];
}

interface ExportTask {
  [key: string]: unknown;
  id: string;
  status: string;
  phase?: string;
  tables?: string[];
  format?: string;
  range_mode?: string;
  created_at?: string;
  start_time?: string;
  end_time?: string;
  expires_at?: string;
  source_done?: number;
  source_total?: number;
  rows_written?: number | string;
  bytes_written?: number | string;
  error_code?: string;
  error_message?: string;
}

interface ApiResponse {
  code: number;
  msg?: string;
  data?: unknown;
}

interface ExportFailure extends Error {
  apiCode?: number;
  exportCode?: string;
}

type Action = 'cancel' | 'delete';
type DateInput = string | number | Date;

const { t, te } = useI18n();
const route = useRoute();
const tr = (key: string, params: Record<string, string | number> = {}): string => t(`logExport.${key}`, params);
const active = ['queued', 'running', 'packaging', 'cancelling'];
const visible = ref(false);
const capability = ref<Capability>({ allowed: false, enabled: false, formats: [] });
const capLoading = ref(false);
const capError = ref(false);
const form = reactive({
  tables: ['access_log', 'security_event'],
  range_mode: 'custom',
  range: [] as DateInput[],
  days: [] as DateInput[],
  format: 'jsonl',
});
const tasks = ref<ExportTask[]>([]);
const focused = ref<ExportTask | null>(null);
const focusId = ref('');
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const listLoading = ref(false);
const creating = ref(false);
const busy = ref('');
const pollError = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
let pollDelay = 2000;
let generation = 0;
let listSequence = 0;
let detailSequence = 0;
let pendingCreate: { signature: string; request_id: string } | null = null;
let confirmation: ReturnType<typeof DialogPlugin.confirm> | null = null;
let lastCapabilityAt = 0;
let routeActive = true;

const formatOptions = computed(() =>
  ['jsonl', 'csv', 'sqlite']
    .filter((format) => (capability.value.formats || []).includes(format))
    .map((format) => ({ value: format, label: tr(format) })),
);
const columns = computed<TableProps['columns']>(() => [
  { colKey: 'created', title: tr('created'), width: 210 },
  { colKey: 'range', title: tr('range'), width: 250 },
  { colKey: 'state', title: tr('state'), width: 240 },
  { colKey: 'written', title: tr('written'), width: 140 },
  { colKey: 'expires', title: tr('expires'), width: 170 },
  { colKey: 'actions', title: tr('actions'), width: 160 },
]);

function onLogRoute(): boolean {
  return routeActive && route.name === 'WafvisitLog';
}

function handleOpenEvent(id?: unknown): void {
  if (onLogRoute()) void open(id);
}

function validId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id);
}

function isActive(row: ExportTask): boolean {
  return active.includes(row.status);
}

function downloadable(row: ExportTask): boolean {
  return ['ready', 'partial'].includes(row.status) && (!row.expires_at || Date.parse(row.expires_at) > Date.now());
}

function statusTheme(status: string): TagProps['theme'] {
  const themes: Record<string, TagProps['theme']> = {
    ready: 'success', partial: 'warning', failed: 'danger', expired: 'default', deleted: 'default', cancelled: 'default',
  };
  return themes[status] || 'primary';
}

function statusText(value?: string): string {
  return value && te(`logExport.${value}`) ? tr(value) : (value || '—');
}

function count(value?: number | string): string {
  return Number(value || 0).toLocaleString();
}

function bytes(value?: number | string): string {
  const n = Number(value || 0);
  if (!n) return '0 B';
  const i = Math.min(4, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / (1024 ** i)).toFixed(i ? 1 : 0)} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][i]}`;
}

function time(value?: DateInput): string {
  return value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';
}

function tableNames(tables: unknown): string {
  return (Array.isArray(tables) ? tables : [])
    .map((table) => table === 'access_log' ? tr('access') : table === 'security_event' ? tr('event') : table)
    .join(', ');
}

function rangeText(task: ExportTask): string {
  return task.range_mode === 'all'
    ? `${tr('all')} · t < ${time(task.end_time)}`
    : `${time(task.start_time)} ≤ t < ${time(task.end_time)}`;
}

function recent(): void {
  form.range_mode = 'custom';
  form.range = [dayjs().subtract(4, 'hour').format('YYYY-MM-DD HH:mm:ss'), dayjs().format('YYYY-MM-DD HH:mm:ss')];
}

function result<T>(res: ApiResponse | null | undefined, allowEmpty = false): T {
  if (!res || res.code !== 0 || (!allowEmpty && (!res.data || typeof res.data !== 'object'))) {
    const error: ExportFailure = new Error(res?.msg || tr('requestFailed'));
    error.apiCode = res?.code;
    const data = res?.data;
    if (data && typeof data === 'object' && 'error_code' in data && typeof data.error_code === 'string') {
      error.exportCode = data.error_code;
    }
    throw error;
  }
  return res.data as T;
}

function failure(error: unknown): ExportFailure {
  return error instanceof Error ? error : new Error(tr('requestFailed'));
}

function applyCapability(data: Capability): void {
  capability.value = {
    ...data,
    allowed: data.allowed === true,
    enabled: data.enabled === true,
    formats: Array.isArray(data.formats) ? data.formats : [],
  };
  lastCapabilityAt = Date.now();
  if (!capability.value.allowed) revoke();
}

function clearTimer(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function destroyConfirmation(): void {
  const dialog = confirmation;
  confirmation = null;
  dialog?.destroy();
}

function revoke(): void {
  generation += 1;
  listSequence += 1;
  detailSequence += 1;
  capability.value = { allowed: false, enabled: false, formats: [] };
  tasks.value = [];
  focused.value = null;
  focusId.value = '';
  pagination.total = 0;
  listLoading.value = false;
  capLoading.value = false;
  capError.value = false;
  creating.value = false;
  busy.value = '';
  pollError.value = false;
  clearTimer();
  destroyConfirmation();
}

function handleFailure(error: unknown): void {
  const e = failure(error);
  if ((e.apiCode !== undefined && [-999, -403].includes(e.apiCode)) || e.exportCode === 'EXPORT_FORBIDDEN') revoke();
  else if (e.apiCode === -7 || e.exportCode === 'EXPORT_DISABLED') capability.value.enabled = false;
}

async function probe(): Promise<void> {
  const gen = generation;
  try {
    const data = result<Capability>(await exportCapabilities());
    if (gen === generation) applyCapability(data);
  } catch (e) {
    if (gen === generation) handleFailure(e);
  }
}

async function open(id?: unknown): Promise<void> {
  if (!onLogRoute()) return;
  close();
  const gen = generation;
  visible.value = true;
  capLoading.value = true;
  capError.value = false;
  pollError.value = false;
  tasks.value = [];
  focused.value = null;
  focusId.value = validId(id) ? id : '';
  pendingCreate = null;
  pagination.current = 1;
  pagination.total = 0;
  creating.value = false;
  busy.value = '';
  pollDelay = 2000;
  form.tables = ['access_log', 'security_event'];
  form.format = 'jsonl';
  recent();
  form.days = [dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')];
  try {
    const data = result<Capability>(await exportCapabilities());
    if (gen !== generation) return;
    applyCapability(data);
    if (gen !== generation) return;
    if (!formatOptions.value.some((format) => format.value === form.format)) {
      form.format = formatOptions.value.length ? formatOptions.value[0].value : '';
    }
    if (capability.value.allowed) await refresh();
  } catch (e) {
    if (gen === generation) {
      capError.value = true;
      handleFailure(e);
    }
  } finally {
    if (gen === generation) capLoading.value = false;
  }
}

function close(): void {
  visible.value = false;
  generation += 1;
  listSequence += 1;
  detailSequence += 1;
  clearTimer();
  destroyConfirmation();
}

function schedule(): void {
  clearTimer();
  if (visible.value && onLogRoute() && capability.value.allowed) {
    // Refreshing the current page also discovers tasks created in another tab.
    timer = setTimeout(() => { void refresh(true); }, pollDelay);
  }
}

async function refresh(silent = false): Promise<void> {
  if (!visible.value || !onLogRoute() || !capability.value.allowed) return;
  clearTimer();
  const gen = generation;
  const seq = ++listSequence;
  if (!silent) listLoading.value = true;
  try {
    if (!silent || Date.now() - lastCapabilityAt >= 10000) {
      const data = result<Capability>(await exportCapabilities());
      if (gen !== generation || seq !== listSequence) return;
      applyCapability(data);
      if (gen !== generation) return;
    }
    const data = result<{ list: ExportTask[]; total: number | string }>(await listLogExports({
      page: pagination.current, page_size: pagination.pageSize,
    }));
    if (gen !== generation || seq !== listSequence) return;
    if (!Array.isArray(data.list) || !Number.isFinite(Number(data.total))) throw new Error(tr('requestFailed'));
    tasks.value = data.list;
    pagination.total = Number(data.total);
    const lastPage = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
    if (pagination.current > lastPage) {
      pagination.current = lastPage;
      void refresh();
      return;
    }
    if (focusId.value) await loadFocused(gen);
    if (gen !== generation || seq !== listSequence) return;
    pollError.value = false;
    pollDelay = 2000;
  } catch (e) {
    if (gen === generation && seq === listSequence) {
      handleFailure(e);
      if (gen === generation) {
        pollError.value = true;
        pollDelay = Math.min(pollDelay * 2, 10000);
      }
    }
  } finally {
    if (gen === generation && seq === listSequence) {
      listLoading.value = false;
      schedule();
    }
  }
}

function pageChange(page: PageInfo): void {
  pagination.current = page.pageSize !== pagination.pageSize ? 1 : page.current;
  pagination.pageSize = page.pageSize;
  void refresh();
}

async function loadFocused(gen: number): Promise<void> {
  const id = focusId.value;
  const seq = ++detailSequence;
  try {
    const data = result<ExportTask>(await getLogExport(id));
    if (gen === generation && seq === detailSequence && id === focusId.value) focused.value = data;
  } catch (error) {
    if (gen !== generation || seq !== detailSequence || id !== focusId.value) return;
    const e = failure(error);
    if (e.exportCode === 'EXPORT_NOT_FOUND') {
      focused.value = null;
      focusId.value = '';
      MessagePlugin.warning(e.message);
      return;
    }
    throw error;
  }
}

async function selectTask(id: unknown): Promise<void> {
  if (!validId(id)) return;
  focusId.value = id;
  focused.value = null;
  const gen = generation;
  try {
    await loadFocused(gen);
  } catch (e) {
    if (gen === generation) {
      handleFailure(e);
      MessagePlugin.error(failure(e).message || tr('requestFailed'));
    }
  }
}

async function create(): Promise<void> {
  if (creating.value || !capability.value.allowed || !capability.value.enabled) return;
  const payload: {
    format: string;
    tables: string[];
    range_mode: string;
    start_time?: string;
    end_time?: string;
  } = {
    format: form.format,
    tables: form.tables.slice(),
    range_mode: form.range_mode === 'days' ? 'custom' : form.range_mode,
  };
  if (!payload.tables.length || !formatOptions.value.some((format) => format.value === payload.format)) {
    MessagePlugin.warning(tr('validation'));
    return;
  }
  if (payload.range_mode === 'custom') {
    const wholeDays = form.range_mode === 'days';
    const [start, end] = (wholeDays ? form.days : form.range) || [];
    const from = dayjs(start);
    const to = dayjs(end);
    const invalidDate = wholeDays && (
      typeof start !== 'string' || typeof end !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)
      || from.format('YYYY-MM-DD') !== start || to.format('YYYY-MM-DD') !== end
    );
    if (!start || !end || !from.isValid() || !to.isValid() || invalidDate || (wholeDays ? from.isAfter(to) : !from.isBefore(to))) {
      MessagePlugin.warning(tr(wholeDays ? 'daysValidation' : 'validation'));
      return;
    }
    payload.start_time = (wholeDays ? from.startOf('day') : from).format('YYYY-MM-DDTHH:mm:ssZ');
    payload.end_time = (wholeDays ? to.add(1, 'day').startOf('day') : to).format('YYYY-MM-DDTHH:mm:ssZ');
  }
  const signature = JSON.stringify(payload);
  if (!pendingCreate || pendingCreate.signature !== signature) pendingCreate = { signature, request_id: uuidv4() };
  const gen = generation;
  creating.value = true;
  try {
    const task = result<{ task_id?: string; id: string }>(await createLogExport({ ...payload, request_id: pendingCreate.request_id }));
    if (gen !== generation) return;
    pendingCreate = null;
    MessagePlugin.success(tr('accepted'));
    focusId.value = task.task_id || task.id;
    pagination.current = 1;
    await refresh();
  } catch (e) {
    if (gen === generation) {
      handleFailure(e);
      MessagePlugin.error(failure(e).message || tr('requestFailed'));
    }
  } finally {
    if (gen === generation) creating.value = false;
  }
}

function confirmAction(row: ExportTask, action: Action): void {
  if (confirmation || busy.value) return;
  const gen = generation;
  const dialog = DialogPlugin.confirm({
    header: tr(`${action}Title`),
    body: tr(`${action}Body`),
    confirmBtn: tr('confirm'),
    cancelBtn: tr('keep'),
    onConfirm: () => {
      dialog.destroy();
      confirmation = null;
      if (gen === generation && visible.value) void perform(row, action);
    },
    onClose: () => {
      dialog.destroy();
      confirmation = null;
    },
  });
  confirmation = dialog;
}

async function perform(row: ExportTask, action: Action): Promise<void> {
  if (busy.value || !capability.value.allowed || !validId(row.id)) return;
  const gen = generation;
  busy.value = row.id;
  try {
    result(await (action === 'cancel' ? cancelLogExport(row.id) : deleteLogExport(row.id)), true);
    if (gen === generation) await refresh();
  } catch (e) {
    if (gen === generation) {
      handleFailure(e);
      MessagePlugin.error(failure(e).message || tr('requestFailed'));
    }
  } finally {
    if (gen === generation) busy.value = '';
  }
}

async function download(row: ExportTask): Promise<void> {
  if (busy.value || !capability.value.allowed || !capability.value.enabled || !downloadable(row) || !validId(row.id)) return;
  const gen = generation;
  busy.value = row.id;
  try {
    const data = result<{ ticket: string }>(await logExportTicket(row.id));
    if (gen !== generation || !visible.value) return;
    if (typeof data.ticket !== 'string' || !data.ticket) throw new Error(tr('requestFailed'));
    startLogExportDownload(row.id, data.ticket);
  } catch (e) {
    if (gen === generation) {
      handleFailure(e);
      MessagePlugin.error(failure(e).message || tr('requestFailed'));
    }
  } finally {
    if (gen === generation) busy.value = '';
  }
}

watch(() => route.query.export_task, (id) => {
  if (onLogRoute() && typeof id === 'string' && id) void open(id === 'tasks' ? '' : id);
});
watch(() => route.name, (name) => {
  if (name !== 'WafvisitLog') close();
});
onMounted(() => {
  void probe();
  const id = route.query.export_task;
  if (onLogRoute() && typeof id === 'string' && id) void open(id === 'tasks' ? '' : id);
  bus.on('log-export-open', handleOpenEvent);
});
onActivated(() => {
  routeActive = true;
  void probe();
});
onDeactivated(() => {
  routeActive = false;
  close();
});
onBeforeUnmount(() => {
  routeActive = false;
  close();
  bus.off('log-export-open', handleOpenEvent);
});

defineExpose({ open });
</script>

<style scoped>
.log-export { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-width: 0; max-width: 100%; }
.log-export > *, .log-export :deep(.t-loading), .export-form > *, .export-form :deep(.t-form__controls), .export-form :deep(.t-form__controls-content) { min-width: 0; max-width: 100%; }
.log-export :deep(.t-alert) { margin-bottom: 12px; white-space: normal; overflow-wrap: anywhere; }
.export-form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 24px; margin-block: 16px 24px; }
.export-form :deep(.t-radio-group), .export-form :deep(.t-checkbox-group) { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.export-form :deep(.t-form__label) { white-space: normal; }
.export-form :deep(.t-date-range-picker) { width: 100%; min-width: 0; }
.export-form > :first-child, .export-form > :last-child { grid-column: 1 / -1; }
.export-form > :last-child { justify-self: start; }
.field-stack { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.inline-controls, .task-heading, .task-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.task-heading { justify-content: space-between; }
.task-heading h3 { margin: 0; font-size: 16px; }
.secondary { color: var(--td-text-color-secondary); font-size: 12px; }
.data-text { font-family: Consolas, monospace; font-variant-numeric: tabular-nums; }
.task-table { overflow-x: auto; min-width: 0; max-width: 100%; }
.field-stack { min-width: 0; overflow-wrap: anywhere; }
.log-export :deep(.t-pagination) { flex-wrap: wrap; gap: 8px; }
.log-export :deep(.t-pagination__total) { flex-wrap: wrap; }
.focused-task { background: var(--td-bg-color-secondarycontainer); padding: 16px; margin-top: 16px; overflow-wrap: anywhere; }
.partial-text { color: var(--td-warning-color); }
.error-text { color: var(--td-error-color); overflow-wrap: anywhere; }
.export-footer { display: flex; justify-content: flex-end; margin-top: 16px; }
@media (max-width: 1000px) { .export-form { grid-template-columns: minmax(0, 1fr); gap: 0; } }
</style>

<style>
.log-export-dialog .t-dialog { box-sizing: border-box; max-width: calc(100vw - 32px); }
.log-export-dialog .t-dialog__body { min-width: 0; white-space: normal; }
</style>
