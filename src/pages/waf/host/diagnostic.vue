<template>
  <div class="website-diagnostic">
    <header class="diagnostic-heading">
      <div>
        <h2>{{ tr('title') }}</h2>
        <p>{{ tr('description') }}</p>
      </div>
      <t-button variant="text" @click="backToHosts">{{ tr('back') }}</t-button>
    </header>

    <t-card :bordered="false" class="diagnostic-input">
      <div class="site-picker">
        <label for="diagnostic-site">{{ tr('site') }}</label>
        <t-select
          id="diagnostic-site"
          v-model="hostCode"
          filterable
          :loading="sitesLoading"
          :placeholder="tr('select_site')"
          @change="loadSite"
        >
          <t-option v-for="site in sites" :key="site.value" :value="site.value" :label="site.label" />
        </t-select>
        <t-tag v-if="siteTitle" theme="primary" variant="light">{{ tr('saved') }}</t-tag>
        <t-button v-if="hostCode && siteTitle" variant="text" @click="openEditor('basic', '')">{{
          tr('view_config')
        }}</t-button>
      </div>
      <p v-if="siteTitle" class="site-title">{{ siteTitle }}</p>
      <label class="input-caption" for="diagnostic-url">{{ tr('url') }}</label>
      <div class="request-inputs">
        <t-select v-model="method" :aria-label="tr('method')">
          <t-option value="GET" label="GET" /><t-option value="HEAD" label="HEAD" />
        </t-select>
        <t-input
          id="diagnostic-url"
          v-model="visitorUrl"
          :maxlength="4096"
          :placeholder="wildcardSite ? wildcardExample : tr('url_placeholder')"
          :status="urlRequired ? 'error' : undefined"
          autocomplete="off"
          spellcheck="false"
        />
        <t-button
          theme="primary"
          :disabled="!hostCode || !siteTitle || siteLoading || sitesLoading || running"
          @click="start"
          >{{ snapshot ? tr('rerun') : tr('start') }}</t-button
        >
        <t-button :disabled="!running" @click="cancel(true)">{{ tr('cancel') }}</t-button>
      </div>
      <p v-if="wildcardSite" class="scope-note">{{ tr('wildcard_hint', { example: wildcardExample }) }}</p>
      <p v-if="urlRequired" class="url-error" role="alert">{{ tr('actual_domain') }}</p>
      <div class="proxy-option">
        <label for="diagnostic-system-proxy">{{ tr('use_system_proxy') }}</label>
        <t-switch id="diagnostic-system-proxy" v-model="useSystemProxy" :aria-label="tr('use_system_proxy')" />
        <span>{{ tr('system_proxy_note') }}</span>
      </div>
      <details class="custom-headers">
        <summary>{{ tr('headers') }}</summary>
        <div v-for="(header, index) in headers" :key="index" class="header-inputs">
          <t-input
            v-model="header.name"
            :maxlength="128"
            :placeholder="tr('header_name')"
            :aria-label="tr('header_name')"
            autocomplete="off"
          />
          <t-input
            v-model="header.value"
            type="password"
            :maxlength="2048"
            :placeholder="tr('header_value')"
            :aria-label="tr('header_value')"
            autocomplete="off"
          />
          <t-button theme="default" variant="text" @click="headers.splice(index, 1)">{{ tr('remove') }}</t-button>
        </div>
        <t-button
          size="small"
          variant="outline"
          :disabled="headers.length >= 20"
          @click="headers.push({ name: '', value: '' })"
          >{{ tr('add_header') }}</t-button
        >
        <p>{{ tr('headers_note') }}</p>
      </details>
      <t-alert theme="info" :message="tr('notice')" />
      <p class="scope-note">{{ tr('scope') }}</p>
    </t-card>

    <t-alert v-if="error" theme="error" :message="error" class="diagnostic-alert" />
    <t-alert v-if="stale" theme="warning" :message="tr('stale')" class="diagnostic-alert" />
    <template v-if="snapshot">
      <div class="result-heading" aria-live="polite">
        <h3>{{ running ? tr('running') : cancelled ? tr('cancelled') : tr('results') }} · {{ runSiteTitle }}</h3>
        <span>{{ tr('processed', { count: processed }) }} · {{ runTime }}</span>
      </div>
      <div v-if="attention" class="attention-summary" role="status">
        <div class="attention-line">
          <t-tag :theme="attention.status === 'failed' ? 'danger' : 'warning'" variant="light">
            {{ tr('status_' + attention.status) }}
          </t-tag>
          <p>{{ attention.message }}</p>
          <small>{{ tr('phase_' + attention.phase) }}</small>
        </div>
        <t-button size="small" variant="outline" @click="focusAttention">{{ tr('focus_issue') }}</t-button>
      </div>
      <div class="result-layout">
        <nav class="phase-list" :aria-label="tr('phases')">
          <button
            v-for="phase in phaseOrder"
            :key="phase"
            type="button"
            class="phase-button"
            :class="{ selected: selectedPhase === phase }"
            :aria-pressed="selectedPhase === phase"
            @click="selectPhase(phase)"
          >
            <strong>{{ tr('phase_' + phase) }}</strong>
            <span :class="'state-' + phaseStatus(phase)">{{ phaseLabel(phase) }}</span>
            <small>{{ tr('source_' + phase) }}</small>
          </button>
        </nav>
        <section class="phase-detail">
          <header class="detail-heading">
            <h3>{{ tr('phase_' + selectedPhase) }}</h3>
            <p>{{ tr('source_' + selectedPhase) }}</p>
            <p v-if="selectedPhase === 'origin' && originTotal">
              {{ tr('origin_count', { count: phases[selectedPhase].checks.length, total: originTotal }) }}
            </p>
            <t-button
              v-if="selectedPhase === 'origin' && originHasMore"
              size="small"
              variant="outline"
              :disabled="running || stale || stopped || cancelled"
              @click="continueOrigins"
              >{{ tr('continue_origins') }}</t-button
            >
          </header>
          <div v-if="currentChecks.length > 1" class="check-picker">
            <t-select v-model="selectedCheck" filterable :aria-label="tr('check')">
              <t-option
                v-for="(check, index) in currentChecks"
                :key="check.id + index"
                :value="index"
                :label="check.title"
              />
            </t-select>
          </div>
          <t-tabs v-model="activeTab">
            <t-tab-panel v-for="tab in detailTabs" :key="tab" :value="tab" :label="tr('tab_' + tab)" />
          </t-tabs>
          <div class="detail-content">
            <t-alert v-if="currentCheck && phases[selectedPhase].error" theme="error" :message="phases[selectedPhase].error" />
            <div v-if="!currentCheck" class="empty-evidence">
              {{ phases[selectedPhase].error || phaseLabel(selectedPhase) }}
              <p>{{ tr('no_evidence') }}</p>
            </div>
            <template v-else>
              <div v-if="activeTab === 'overview'">
                <div class="check-heading">
                  <h4>{{ currentCheck.title }}</h4>
                  <t-tag :theme="statusTheme(currentCheck.status)" variant="light">{{
                    tr('status_' + currentCheck.status)
                  }}</t-tag>
                </div>
                <p class="check-message">{{ currentCheck.message }}</p>
                <dl v-if="currentCheck.overview && currentCheck.overview.length" class="evidence-fields">
                  <template v-for="(field, index) in currentCheck.overview" :key="index">
                    <dt>{{ field.label }}</dt>
                    <dd>{{ field.value }}</dd>
                  </template>
                </dl>
                <p v-if="currentCheck.status_code" class="http-code">HTTP {{ currentCheck.status_code }}</p>
                <p class="scope-note">{{ tr('independent') }}</p>
              </div>
              <div v-else-if="activeTab === 'request' || activeTab === 'response'">
                <template v-if="packetText">
                  <div class="packet-heading">
                    <span>{{ tr('packet_note') }}</span
                    ><t-button size="small" variant="text" @click="copyPacket">{{ tr('copy') }}</t-button>
                  </div>
                  <pre class="packet-text">{{ packetText }}</pre>
                  <t-alert
                    v-if="activeTab === 'response' && currentCheck.body_truncated"
                    theme="warning"
                    :message="tr('truncated')"
                  />
                </template>
                <div v-else class="empty-evidence">
                  {{ activeTab === 'request' ? tr('no_request') : tr('no_response') }}
                  <p>{{ currentCheck.message }}</p>
                </div>
              </div>
              <dl
                v-else-if="activeTab === 'connection' && currentCheck.connection && currentCheck.connection.length"
                class="evidence-fields"
              >
                <template v-for="(field, index) in currentCheck.connection" :key="index">
                  <dt>{{ field.label }}</dt>
                  <dd>{{ field.value }}</dd>
                </template>
              </dl>
              <div v-else-if="activeTab === 'connection'" class="empty-evidence">{{ tr('no_connection') }}</div>
              <div v-else-if="activeTab === 'advice'" class="advice-list">
                <div v-for="(advice, index) in currentCheck.advice" :key="advice.code + index" class="advice-item">
                  <p>{{ advice.message }}</p>
                  <t-button
                    v-if="canOpenAdvice(advice)"
                    size="small"
                    variant="outline"
                    @click="openEditor(advice.tab, advice.section)"
                    >{{ tr('locate_config') }}</t-button
                  >
                </div>
                <p v-if="!currentCheck.advice || !currentCheck.advice.length" class="empty-evidence">
                  {{ tr('no_advice') }}
                </p>
                <p class="scope-note">{{ tr('advice_note') }}</p>
              </div>
            </template>
          </div>
        </section>
      </div>
    </template>
    <t-card v-else :bordered="false" class="initial-state">{{ tr('initial') }}</t-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import { allhost, getHostDetail } from '@/apis/host';
import {
  diagnoseWebsite,
  DiagnosticAdvice,
  DiagnosticCheck,
  DiagnosticPhase,
  DiagnosticRequest,
} from '@/apis/websiteDiagnostic';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const tr = (key: string, params: Record<string, any> = {}): string =>
  String(t(`page.host.diagnostic.${key}`, params));

interface PhaseEntry {
  state: string;
  checks: DiagnosticCheck[];
  error: string;
}
const phaseOrder: DiagnosticPhase[] = ['inspect', 'local_ingress', 'origin', 'access_url'];
const emptyPhases = () =>
  phaseOrder.reduce((result, phase) => {
    result[phase] = { state: 'pending', checks: [] as DiagnosticCheck[], error: '' };
    return result;
  }, {} as Record<DiagnosticPhase, PhaseEntry>);

const detailTabs = ['overview', 'request', 'response', 'connection', 'advice'];
const hostCode = ref('');
const sites = ref<{ value: string; label: string }[]>([]);
const sitesLoading = ref(false);
const siteLoading = ref(false);
const siteTitle = ref('');
const wildcardSite = ref(false);
const wildcardExample = ref('');
const urlRequired = ref(false);
const visitorUrl = ref('');
const method = ref<'GET' | 'HEAD'>('GET');
const useSystemProxy = ref(true);
const headers = ref<{ name: string; value: string }[]>([]);
const phases = ref<Record<DiagnosticPhase, PhaseEntry>>(emptyPhases());
const selectedPhase = ref<DiagnosticPhase>('inspect');
const selectedCheck = ref(0);
const activeTab = ref('overview');
const running = ref(false);
const cancelled = ref(false);
const stale = ref(false);
const stopped = ref(false);
const error = ref('');
const snapshot = ref('');
const runTime = ref('');
const runSiteTitle = ref('');
const generation = ref(0);
const siteGeneration = ref(0);
const controller = ref<AbortController | null>(null);
const fingerprint = ref('');
const originCursor = ref(-1);
const originHasMore = ref(false);
const originTotal = ref(0);
const runInput = ref<DiagnosticRequest | null>(null);

const inputKey = computed(() =>
  JSON.stringify([hostCode.value, visitorUrl.value, method.value, headers.value, useSystemProxy.value]),
);
const currentChecks = computed(() => phases.value[selectedPhase.value].checks);
const currentCheck = computed(() => currentChecks.value[selectedCheck.value] || null);
const packetText = computed(() =>
  currentCheck.value ? currentCheck.value[activeTab.value === 'response' ? 'response' : 'request'] : '',
);
const processed = computed(() => phaseOrder.filter((phase) => phases.value[phase].state === 'completed').length);
const attention = computed<{ phase: DiagnosticPhase; index: number; status: string; message: string } | null>(() => {
  let result: { phase: DiagnosticPhase; index: number; status: string; message: string } | null = null;
  phaseOrder.some((phase) => {
    result = phases.value[phase].checks.reduce(
      (hit, check, index) =>
        hit ||
        (['failed', 'warning'].includes(check.status)
          ? { phase, index, status: check.status, message: check.message }
          : null),
      result,
    );
    return result !== null;
  });
  return result;
});

watch(visitorUrl, (value) => {
  if (value.trim()) urlRequired.value = false;
});
watch(inputKey, (value) => {
  if (snapshot.value && value !== snapshot.value) {
    cancel(false);
    stale.value = true;
  }
});
watch(
  () => route.query.code,
  (value) => {
    if (typeof value === 'string' && value !== hostCode.value && sites.value.some((site) => site.value === value)) {
      hostCode.value = value;
      loadSite();
    }
  },
);

loadSites();

onBeforeUnmount(() => {
  cancel(false);
  siteGeneration.value += 1;
  headers.value = [];
  runInput.value = null;
});
onDeactivated(() => {
  cancel(false);
});

async function loadSites() {
  sitesLoading.value = true;
  try {
    const res: any = await allhost({});
    if (res.code !== 0 || !Array.isArray(res.data)) throw new Error(tr('load_failed'));
    sites.value = res.data
      .filter((site: any) => site && site.value && Number(site.global_host) !== 1)
      .map((site: any) => ({ value: String(site.value), label: String(site.label) }));
    const { code } = route.query;
    if (typeof code === 'string' && sites.value.some((site) => site.value === code)) {
      hostCode.value = code;
      await loadSite();
    }
  } catch (e) {
    error.value = tr('load_failed');
  } finally {
    sitesLoading.value = false;
  }
}

async function loadSite() {
  cancel(false);
  siteGeneration.value += 1;
  const token = siteGeneration.value;
  const code = hostCode.value;
  siteTitle.value = '';
  wildcardSite.value = false;
  wildcardExample.value = '';
  urlRequired.value = false;
  visitorUrl.value = '';
  error.value = '';
  if (!code) return;
  siteLoading.value = true;
  try {
    const res: any = await getHostDetail({ code });
    if (token !== siteGeneration.value) return;
    if (res.code !== 0 || !res.data || Number(res.data.global_host) === 1) throw new Error(tr('load_failed'));
    const site = res.data;
    siteTitle.value = site.nickname ? `${site.host} (${site.nickname})` : String(site.host);
    const listens = Array.isArray(site.resolved_listens)
      ? site.resolved_listens.filter((listen: any) => listen && !listen.implied)
      : [];
    const main = listens.find((listen: any) => listen.is_main) || listens[0];
    const proto = (main && main.proto) || (String(site.ssl) === '1' ? 'https' : 'http');
    const port = Number((main && main.port) || site.port);
    let host = String(site.host || '');
    wildcardSite.value = host.includes('*');
    const defaultPort = (proto === 'https' && port === 443) || (proto === 'http' && port === 80);
    const portSuffix = port && !defaultPort ? `:${port}` : '';
    if (wildcardSite.value) {
      const exampleHost = host === '*' ? tr('example_host') : host.replace(/\*/g, 'www');
      wildcardExample.value = `${proto}://${exampleHost}${portSuffix}/`;
    } else if (host && !visitorUrl.value) {
      if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
      visitorUrl.value = `${proto}://${host}${portSuffix}/`;
    }
  } catch (e) {
    if (token === siteGeneration.value) error.value = tr('load_failed');
  } finally {
    if (token === siteGeneration.value) siteLoading.value = false;
  }
}

function validate(): boolean {
  urlRequired.value = wildcardSite.value && !visitorUrl.value.trim();
  if (urlRequired.value) {
    error.value = tr('actual_domain');
    return false;
  }
  if (visitorUrl.value) {
    try {
      const url = new URL(visitorUrl.value);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.hash ||
        url.hostname.includes('*')
      )
        throw new Error();
    } catch (e) {
      error.value = tr('invalid_url');
      return false;
    }
  }
  const forbidden =
    /^(host|content-length|transfer-encoding|connection|proxy-connection|upgrade|keep-alive|te|trailer|accept-encoding|proxy-authorization)$/i;
  const seen = new Set();
  const valid = headers.value.every((header) => {
    if (!header.name && !header.value) return true;
    const name = header.name.trim();
    if (
      !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) ||
      forbidden.test(name) ||
      /[\r\n\0]/.test(header.value) ||
      seen.has(name.toLowerCase())
    )
      return false;
    seen.add(name.toLowerCase());
    return true;
  });
  if (!valid) error.value = tr('invalid_headers');
  const totalBytes = headers.value.reduce((sum, header) => sum + new Blob([header.name, header.value]).size, 0);
  if (valid && totalBytes > 8192) {
    error.value = tr('headers_too_large');
    return false;
  }
  return valid;
}

async function start() {
  error.value = '';
  if (!validate()) return;
  cancel(false);
  generation.value += 1;
  const token = generation.value;
  phases.value = emptyPhases();
  fingerprint.value = '';
  originCursor.value = -1;
  originHasMore.value = false;
  originTotal.value = 0;
  selectedPhase.value = 'inspect';
  selectedCheck.value = 0;
  activeTab.value = 'overview';
  cancelled.value = false;
  stale.value = false;
  stopped.value = false;
  snapshot.value = inputKey.value;
  runTime.value = new Date().toLocaleString();
  runSiteTitle.value = siteTitle.value;
  runInput.value = {
    host_code: hostCode.value,
    phase: 'inspect',
    visitor_url: visitorUrl.value,
    method: method.value,
    headers: headers.value
      .filter((header) => header.name || header.value)
      .map((header) => ({ name: header.name.trim(), value: header.value })),
    use_system_proxy: useSystemProxy.value,
    config_fingerprint: '',
    origin_cursor: 0,
  };
  controller.value = new AbortController();
  running.value = true;
  try {
    if (!(await runPhase('inspect', token))) return;
    if (!runInput.value || !runInput.value.visitor_url) {
      error.value = tr('actual_domain');
      return;
    }
    await runPhase('local_ingress', token);
    if (token !== generation.value || stopped.value) return;
    await runPhase('origin', token);
    if (token !== generation.value || stopped.value) return;
    await runPhase('access_url', token);
  } finally {
    if (token === generation.value) {
      running.value = false;
      controller.value = null;
    }
  }
}

async function runPhase(phase: DiagnosticPhase, token: number, append = false): Promise<boolean> {
  if (!runInput.value || !controller.value || token !== generation.value) return false;
  phases.value[phase].state = 'running';
  phases.value[phase].error = '';
  selectedPhase.value = phase;
  selectedCheck.value = 0;
  try {
    const result = await diagnoseWebsite(
      {
        ...runInput.value,
        phase,
        config_fingerprint: fingerprint.value,
        origin_cursor: append ? originCursor.value : 0,
      },
      controller.value.signal,
    );
    if (token !== generation.value) return false;
    const { data } = result;
    if (data && ['CONFIG_CHANGED', 'RUNTIME_CHANGED'].includes(data.error_code || '')) {
      stopped.value = true;
      stale.value = true;
      error.value = result.msg || tr('config_changed');
      phases.value[phase].state = 'error';
      phases.value[phase].error = error.value;
      if (Array.isArray(data.checks)) phases.value[phase].checks = data.checks;
      return false;
    }
    if (result.code !== 0 || !data || data.phase !== phase || !Array.isArray(data.checks))
      throw new Error(result.msg || tr('request_failed'));
    if (phase === 'inspect' && data.checks.some((check) => check.reason === 'URL_REQUIRED')) {
      phases.value.inspect.checks = data.checks;
      phases.value.inspect.state = 'completed';
      stopped.value = true;
      urlRequired.value = true;
      error.value = tr('actual_domain');
      return false;
    }
    if (phase === 'inspect') {
      fingerprint.value = data.config_fingerprint;
      if (!fingerprint.value) throw new Error(tr('request_failed'));
      if (!runInput.value.visitor_url && data.site && data.site.visitor_url) {
        visitorUrl.value = data.site.visitor_url;
        runInput.value.visitor_url = data.site.visitor_url;
        snapshot.value = inputKey.value;
      }
    } else if (data.config_fingerprint !== fingerprint.value) {
      stopped.value = true;
      stale.value = true;
      throw new Error(tr('config_changed'));
    }
    phases.value[phase].checks = append ? phases.value[phase].checks.concat(data.checks) : data.checks;
    phases.value[phase].state = 'completed';
    if (
      phase === 'inspect' &&
      data.checks.some((check) => ['CONFIG_CHANGED', 'RUNTIME_CHANGED'].includes(check.reason))
    ) {
      stopped.value = true;
      stale.value = true;
      error.value = tr('config_changed');
      return false;
    }
    if (phase === 'origin') {
      const previousCursor = append ? originCursor.value : 0;
      originCursor.value = data.next_cursor;
      originHasMore.value = data.has_more && data.next_cursor > previousCursor;
      originTotal.value = data.total;
      if (append && selectedPhase.value === 'origin')
        selectedCheck.value = Math.max(0, phases.value.origin.checks.length - data.checks.length);
    }
    return true;
  } catch (e) {
    if (token !== generation.value) return false;
    const message = e instanceof Error ? e.message : '';
    phases.value[phase].state = 'error';
    phases.value[phase].error =
      message && !['Network Error', 'timeout of 12000ms exceeded'].includes(message)
        ? message
        : tr('request_failed');
    if (phase === 'inspect' || stopped.value) error.value = phases.value[phase].error;
    return false;
  }
}

async function continueOrigins() {
  if (running.value || stale.value || stopped.value || cancelled.value || !originHasMore.value) return;
  const token = generation.value;
  controller.value = new AbortController();
  running.value = true;
  try {
    await runPhase('origin', token, true);
  } finally {
    if (token === generation.value) {
      running.value = false;
      controller.value = null;
    }
  }
}

function cancel(show: boolean) {
  generation.value += 1;
  if (controller.value) controller.value.abort();
  controller.value = null;
  phaseOrder.forEach((phase) => {
    if (phases.value[phase].state === 'running') phases.value[phase].state = 'cancelled';
  });
  if (show) cancelled.value = true;
  running.value = false;
}

function selectPhase(phase: DiagnosticPhase) {
  selectedPhase.value = phase;
  selectedCheck.value = 0;
}

function focusAttention() {
  if (!attention.value) return;
  selectedPhase.value = attention.value.phase;
  selectedCheck.value = attention.value.index;
  activeTab.value = 'overview';
}

function phaseStatus(phase: DiagnosticPhase): string {
  const entry = phases.value[phase];
  if (entry.state !== 'completed') return entry.state;
  const statuses = entry.checks.map((check) => check.status);
  return (
    ['failed', 'warning', 'unknown', 'skipped'].find((status) => statuses.includes(status as any)) ||
    (statuses.length ? 'passed' : 'unknown')
  );
}

function phaseLabel(phase: DiagnosticPhase): string {
  const state = phaseStatus(phase);
  if (state === 'pending' && !running.value) return tr('not_run');
  return tr(['pending', 'running', 'error', 'cancelled'].includes(state) ? state : `status_${state}`);
}

function statusTheme(status: string): string {
  const themes: Record<string, string> = {
    passed: 'success',
    failed: 'danger',
    warning: 'warning',
    unknown: 'warning',
    skipped: 'default',
  };
  return themes[status] || 'default';
}

function canOpenAdvice(advice: DiagnosticAdvice): boolean {
  return (
    !stale.value &&
    ['basic', 'other'].includes(advice.tab) &&
    (!advice.section || ['listen', 'backend', 'tls'].includes(advice.section))
  );
}

function openEditor(tab: string, section: string) {
  if (
    !hostCode.value ||
    !['basic', 'other'].includes(tab) ||
    (section && !['listen', 'backend', 'tls'].includes(section))
  )
    return;
  cancel(false);
  router.push({ name: 'WafHost', query: { editcode: hostCode.value, tab, ...(section ? { section } : {}) } });
}

function backToHosts() {
  cancel(false);
  router.push({ name: 'WafHost' });
}

// 管理端可能跑在 http 下，navigator.clipboard 不可用，退回 execCommand
function copyPacket() {
  const text = packetText.value;
  const done = () => MessagePlugin.success(tr('copied'));
  const fail = () => MessagePlugin.warning(tr('copy_failed'));
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(done)
      .catch(() => fallbackCopy(text, done, fail));
  } else {
    fallbackCopy(text, done, fail);
  }
}

function fallbackCopy(text: string, done: () => void, failed: () => void) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (document.execCommand('copy')) done();
    else failed();
  } catch (e) {
    failed();
  }
  document.body.removeChild(textarea);
}
</script>

<style scoped>
.website-diagnostic {
  color: var(--td-text-color-primary);
}
.diagnostic-heading,
.result-heading,
.check-heading,
.packet-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.diagnostic-heading {
  margin-bottom: 16px;
  align-items: flex-start;
}
h2,
h3,
h4,
p {
  margin: 0;
}
h2 {
  font-size: 22px;
}
h3 {
  font-size: 16px;
}
h4 {
  font-size: 14px;
}
.diagnostic-heading p,
.detail-heading p,
.scope-note,
.site-title {
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 1.8;
  margin-top: 6px;
}
.site-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.site-picker :deep(.t-select__wrap) {
  width: 340px;
  max-width: 100%;
}
.site-title {
  margin-bottom: 16px;
}
.input-caption {
  display: block;
  margin: 16px 0 8px;
}
.request-inputs {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto auto;
  gap: 8px;
}
.url-error {
  color: var(--td-error-color);
  font-size: 12px;
  margin-top: 6px;
}
.proxy-option {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 16px;
}
.proxy-option span {
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 1.8;
}
.custom-headers {
  margin: 16px 0;
  padding-top: 12px;
  border-top: 1px solid var(--td-component-border);
}
.custom-headers summary {
  cursor: pointer;
  margin-bottom: 12px;
}
.custom-headers p {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 8px;
}
.header-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto;
  gap: 8px;
  margin-bottom: 8px;
}
.attention-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin: 0 0 12px;
  padding: 12px 16px;
  background: var(--td-warning-color-light);
  border: 1px solid var(--td-warning-color-focus);
  border-radius: 6px;
}
.attention-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.attention-line p {
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.attention-line small {
  color: var(--td-text-color-secondary);
}
.diagnostic-alert {
  margin-top: 16px;
}
.result-heading {
  margin: 20px 0 12px;
}
.result-heading span {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
.result-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-border);
  border-radius: 6px;
  overflow: hidden;
}
.phase-list {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 12px;
  border-right: 1px solid var(--td-component-border);
}
.phase-button {
  display: grid;
  gap: 7px;
  text-align: left;
  padding: 14px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.phase-button.selected {
  background: var(--td-brand-color-light);
  border-color: var(--td-brand-color);
}
.phase-button strong {
  font-size: 13px;
  font-weight: 500;
}
.phase-button span,
.phase-button small {
  font-size: 12px;
}
.phase-button small {
  color: var(--td-text-color-secondary);
  line-height: 1.6;
}
.phase-button:focus-visible {
  outline: 2px solid var(--td-brand-color);
  outline-offset: -2px;
}
.state-passed {
  color: var(--td-success-color);
}
.state-failed,
.state-error {
  color: var(--td-error-color);
}
.state-warning,
.state-unknown {
  color: var(--td-warning-color);
}
.state-running {
  color: var(--td-brand-color);
}
.phase-detail {
  min-width: 0;
}
.detail-heading {
  padding: 20px;
}
.detail-heading :deep(.t-button) {
  margin-top: 10px;
}
.check-picker {
  padding: 0 20px 16px;
}
.detail-content {
  padding: 20px;
  min-height: 320px;
}
.check-message {
  margin: 10px 0 18px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.evidence-fields {
  display: grid;
  grid-template-columns: minmax(90px, 150px) minmax(0, 1fr);
  gap: 12px 16px;
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
}
.evidence-fields dt {
  color: var(--td-text-color-secondary);
}
.evidence-fields dd {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.http-code {
  margin-top: 16px;
  font-family: Consolas, monospace;
}
.empty-evidence {
  padding: 20px;
  background: var(--td-bg-color-secondarycontainer);
  border: 1px dashed var(--td-component-border);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.8;
}
.empty-evidence p {
  margin-top: 8px;
  color: var(--td-text-color-secondary);
}
.packet-heading {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
.packet-text {
  margin: 8px 0 12px;
  padding: 16px;
  background: var(--td-bg-color-secondarycontainer);
  border: 1px solid var(--td-component-border);
  border-radius: 4px;
  font: 12px/1.8 Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 520px;
  overflow: auto;
}
.advice-item {
  margin-bottom: 16px;
}
.advice-item p {
  line-height: 1.8;
  margin-bottom: 8px;
}
.initial-state {
  margin-top: 16px;
  color: var(--td-text-color-secondary);
}
@media (max-width: 900px) {
  .request-inputs {
    grid-template-columns: 90px minmax(0, 1fr);
  }
  .result-layout {
    grid-template-columns: 180px minmax(0, 1fr);
  }
  .evidence-fields {
    grid-template-columns: 100px minmax(0, 1fr);
  }
}
@media (max-width: 640px) {
  .result-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .phase-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-right: 0;
    border-bottom: 1px solid var(--td-component-border);
  }
  .phase-button {
    padding: 10px;
  }
  .header-inputs {
    grid-template-columns: minmax(0, 1fr);
  }
  .header-inputs :deep(.t-button) {
    justify-self: start;
  }
  .detail-content,
  .detail-heading {
    padding: 16px;
  }
  .site-picker {
    align-items: flex-start;
  }
  .site-picker label {
    width: 100%;
  }
  .evidence-fields {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
  .evidence-fields dd {
    margin-bottom: 10px;
  }
}
</style>
