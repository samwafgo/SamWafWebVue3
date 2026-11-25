<template>
  <t-dialog v-model:visible="dialogVisible" :header="tr('title')" width="min(1100px, calc(100vw - 32px))"
    :footer="false" :close-on-overlay-click="false">
    <div class="protection-body">
      <div class="protection-bar">
        <div class="protection-inline">
          <strong>{{ tunnel.name }}</strong>
          <t-tag variant="light">{{ protocol }}</t-tag>
          <t-tag v-if="detail" :theme="detail.whitelist_active ? 'primary' : 'default'" variant="light">
            {{ tr(detail.whitelist_active ? 'whitelist_on' : 'whitelist_off') }}
          </t-tag>
        </div>
        <t-button v-if="canViewAudit" variant="outline" size="small" :disabled="!!busy"
          @click="openAudit()">{{ tr('audit_all') }}</t-button>
      </div>
      <t-alert v-if="loadError" theme="warning" :message="loadError" />
      <t-loading :loading="busy === 'detail'" :text="tr('loading')" size="small">
        <div v-if="!detail" class="protection-empty">
          <t-button v-if="loadError && !forbidden" variant="outline" :disabled="!!busy"
            @click="reload()">{{ tr('retry') }}</t-button>
        </div>
        <template v-else>
          <p class="protection-note">{{ tr('source_note') }} {{ tr('connection_note') }}</p>
          <t-tabs v-model="tab">
            <t-tab-panel value="ddns" :label="tr('ddns_tab')">
              <div class="protection-section">
                <div class="protection-bar">
                  <strong>{{ tr('fixed_lists') }}</strong>
                </div>
                <p class="protection-note">{{ tr('fixed_note') }}</p>
                <div class="fixed-form">
                  <label class="fixed-row">
                    <span class="fixed-label">{{ tr('fixed_allow') }}</span>
                    <t-input v-model="fixedAllow" :disabled="!!busy" :placeholder="tr('fixed_allow_placeholder')"
                      :aria-label="tr('fixed_allow')" />
                  </label>
                  <label class="fixed-row">
                    <span class="fixed-label">{{ tr('fixed_deny') }}</span>
                    <t-input v-model="fixedDeny" :disabled="!!busy" :placeholder="tr('fixed_deny_placeholder')"
                      :aria-label="tr('fixed_deny')" />
                  </label>
                  <label class="fixed-row">
                    <span class="fixed-label">{{ t('page.tunnel.allowed_time_ranges') }}</span>
                    <t-input v-model="fixedTime" :disabled="!!busy"
                      :placeholder="t('page.tunnel.allowed_time_ranges_placeholder')"
                      :aria-label="t('page.tunnel.allowed_time_ranges')" />
                  </label>
                  <p class="protection-note fixed-time-tips">{{ t('page.tunnel.allowed_time_ranges_tips') }}</p>
                </div>
                <div class="protection-bar">
                  <span class="protection-note">{{ dirtyFixed ? tr('unsaved') : '' }}</span>
                  <div class="protection-inline">
                    <t-button v-if="dirtyFixed || loadError" variant="outline" :disabled="!!busy"
                      @click="requestReset('fixed')">{{ tr('reload_fixed') }}</t-button>
                    <t-button theme="primary" :loading="busy === 'fixed'" :disabled="!!busy || !dirtyFixed || !!loadError"
                      @click="saveFixed">{{ tr('save_fixed') }}</t-button>
                  </div>
                </div>
                <div class="protection-bar">
                  <strong>{{ tr('ddns_title') }}</strong>
                  <div class="protection-inline">
                    <t-button v-if="canViewAudit" variant="text" theme="primary" :disabled="!!busy"
                      @click="openAudit('config_tunnel_ddns_addresses')">{{ tr('audit_ddns') }}</t-button>
                    <t-button variant="outline" size="small" :disabled="!!busy" @click="reload()">{{ tr('refresh_status') }}</t-button>
                    <t-button variant="outline" size="small" :disabled="!!busy || ddns.bindings.length >= MAX_BINDINGS"
                      @click="addBinding">{{ tr('add_binding') }}</t-button>
                  </div>
                </div>
                <p class="protection-note">{{ tr('ddns_note') }}</p>
                <p class="protection-note">{{ tr('ddns_public_note') }}</p>
                <t-alert v-if="willDisableWhitelist" theme="warning" :message="tr('whitelist_warning')" />
                <div class="protection-scroll">
                  <table class="protection-table ddns-table">
                    <thead><tr>
                      <th scope="col">{{ tr('domain') }}</th><th scope="col">{{ tr('family') }}</th>
                      <th scope="col">{{ tr('enabled') }}</th><th scope="col">{{ tr('resolved_ips') }}</th>
                      <th scope="col">{{ tr('state') }}</th><th scope="col">{{ tr('times') }}</th>
                      <th scope="col">{{ t('common.op') }}</th>
                    </tr></thead>
                    <tbody>
                      <tr v-if="!bindingRows.length"><td colspan="7">{{ tr('no_bindings') }}</td></tr>
                      <tr v-for="row in bindingRows" :key="row.binding.key">
                        <td><t-input v-model="row.binding.domain" :disabled="!!busy" :aria-label="tr('domain')"
                          placeholder="access.example.com" /></td>
                        <td><t-select v-model="row.binding.family" :options="families" :disabled="!!busy" :aria-label="tr('family')" /></td>
                        <td><t-switch v-model="row.binding.enabled" size="small" :disabled="!!busy" :aria-label="tr('enabled')" /></td>
                        <td class="binding-ips">
                          <code>{{ row.state.ips.length ? row.state.ips.join(', ') : '—' }}</code>
                        </td>
                        <td>
                          <t-tag :theme="stateTheme(row.state.state)" variant="light">{{ stateLabel(row.state.state) }}</t-tag>
                          <div v-if="row.state.error" class="state-error">{{ row.state.error }}</div>
                          <details v-if="row.state.families && row.state.families.length" class="family-details">
                            <summary>{{ tr('family_details') }}</summary>
                            <div v-for="family in row.state.families" :key="family.family">
                              <strong>{{ family.family.toUpperCase() }} · {{ stateLabel(family.state) }}</strong>
                              <div>{{ tr('last_check') }}: {{ formatTime(family.last_check) }}</div>
                              <div>{{ tr('valid_until') }}: {{ formatTime(family.valid_until) }}</div>
                              <code v-if="family.ips && family.ips.length">{{ family.ips.join(', ') }}</code>
                              <div v-if="family.error" class="state-error">{{ family.error }}</div>
                            </div>
                          </details>
                        </td>
                        <td>
                          <div>{{ tr('last_check') }}: {{ formatTime(row.state.last_check) }}</div>
                          <div>{{ tr('valid_until') }}: {{ formatTime(row.state.valid_until) }}</div>
                        </td>
                        <td class="protection-actions">
                          <t-button size="small" variant="text" theme="primary" :disabled="!!busy || row.changed || !row.binding.enabled || !!loadError"
                            @click="refreshBinding(row.binding)">{{ tr('resolve_now') }}</t-button>
                          <t-button size="small" variant="text" theme="danger" :disabled="!!busy"
                            @click="ddns.bindings.splice(row.index, 1)">{{ t('common.delete') }}</t-button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="protection-bar">
                  <span class="protection-note">{{ dirtyDDNS ? tr('unsaved') : '' }}</span>
                  <div class="protection-inline">
                    <t-button v-if="dirtyDDNS || loadError" variant="outline" :disabled="!!busy"
                      @click="requestReset('ddns')">{{ tr('reload_ddns') }}</t-button>
                    <t-button theme="primary" :loading="busy === 'ddns'" :disabled="!!busy || !dirtyDDNS || !!loadError"
                      @click="requestSaveDDNS">{{ tr('save_ddns') }}</t-button>
                  </div>
                </div>
              </div>
            </t-tab-panel>

            <t-tab-panel value="region" :label="tr('region_tab')">
              <div class="protection-section">
                <div class="protection-bar">
                  <div class="protection-inline">
                    <t-switch v-model="region.enabled" :disabled="!!busy" :label="[tr('enabled'), tr('disabled')]"
                      :aria-label="tr('region_enabled')" />
                    <strong>{{ tr('region_enabled') }}</strong>
                  </div>
                  <t-button v-if="canViewAudit" variant="text" theme="primary" :disabled="!!busy"
                    @click="openAudit('config_tunnel_region')">{{ tr('audit_region') }}</t-button>
                </div>
                <p class="protection-note">{{ tr('region_note') }}</p>
                <div class="protection-inline">
                  <label>{{ tr('fallback') }}
                    <t-select v-model="region.fallback" class="action-control" :options="actions" :disabled="!!busy" />
                  </label>
                  <label>{{ tr('unknown') }}
                    <t-select v-model="region.unknown" class="action-control" :options="actions" :disabled="!!busy" />
                  </label>
                  <t-tag v-for="family in ['ipv4', 'ipv6']" :key="family" variant="light"
                    :theme="detail[`${family}_country_available`] ? 'success' : 'warning'">
                    {{ tr(detail[`${family}_country_available`] ? 'database_ready' : 'database_unavailable', { family: family === 'ipv4' ? 'IPv4' : 'IPv6' }) }}
                  </t-tag>
                </div>
                <t-alert v-if="region.enabled && region.fallback === 'deny'" theme="warning" :message="tr('fallback_warning')" />
                <t-alert v-if="region.enabled && region.unknown === 'deny'" theme="warning" :message="tr('strict_warning')" />
                <div class="protection-bar">
                  <strong>{{ tr('rules') }}</strong>
                  <t-button variant="outline" size="small" :disabled="!!busy || region.rules.length >= MAX_RULES"
                    @click="addRule">{{ tr('add_rule') }}</t-button>
                </div>
                <div class="protection-scroll">
                  <table class="protection-table region-table">
                    <thead><tr>
                      <th scope="col">#</th><th scope="col">{{ tr('rule_name') }}</th>
                      <th scope="col">{{ tr('operator') }}</th><th scope="col">{{ tr('country') }}</th>
                      <th scope="col">{{ tr('action') }}</th><th scope="col">{{ tr('enabled') }}</th>
                      <th scope="col">{{ t('common.op') }}</th>
                    </tr></thead>
                    <tbody>
                      <tr v-if="!region.rules.length"><td colspan="7">{{ tr('no_rules') }}</td></tr>
                      <tr v-for="(rule, index) in region.rules" :key="rule.key">
                        <td>{{ index + 1 }}</td>
                        <td><t-input v-model="rule.name" :disabled="!!busy" :aria-label="tr('rule_name')" /></td>
                        <td><t-select v-model="rule.operator" :disabled="!!busy" :options="operators" :aria-label="tr('operator')" /></td>
                        <td><t-select v-model="rule.country" :disabled="!!busy" :options="countries" filterable :aria-label="tr('country')" /></td>
                        <td><t-select v-model="rule.action" :disabled="!!busy" :options="actions" :aria-label="tr('action')" /></td>
                        <td><t-switch v-model="rule.enabled" size="small" :disabled="!!busy" :aria-label="tr('enabled')" /></td>
                        <td class="protection-actions">
                          <t-button size="small" variant="text" :disabled="!!busy || index === 0"
                            @click="moveRule(index, -1)">{{ tr('move_up') }}</t-button>
                          <t-button size="small" variant="text" :disabled="!!busy || index === region.rules.length - 1"
                            @click="moveRule(index, 1)">{{ tr('move_down') }}</t-button>
                          <t-button size="small" variant="text" theme="danger" :disabled="!!busy"
                            @click="region.rules.splice(index, 1)">{{ t('common.delete') }}</t-button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="protection-inline">
                  <label>{{ tr('preview_country') }}
                    <t-select v-model="previewCountry" class="country-control" :options="previewCountries" filterable />
                  </label>
                  <span class="preview-result" aria-live="polite">{{ previewResult }}</span>
                </div>
                <div class="protection-bar">
                  <span class="protection-note">{{ dirtyRegion ? tr('unsaved') : '' }}</span>
                  <div class="protection-inline">
                    <t-button v-if="dirtyRegion || loadError" variant="outline" :disabled="!!busy"
                      @click="requestReset('region')">{{ tr('reload_region') }}</t-button>
                    <t-button theme="primary" :loading="busy === 'region'" :disabled="!!busy || !dirtyRegion || !!loadError"
                      @click="saveRegion">{{ tr('save_region') }}</t-button>
                  </div>
                </div>
              </div>
            </t-tab-panel>
          </t-tabs>
        </template>
      </t-loading>
    </div>
    <t-dialog v-model:visible="confirmVisible" :header="confirmation ? tr(confirmation.title) : ''"
      :body="confirmation ? tr(confirmation.message) : ''"
      :confirm-btn="t('common.confirm')" :cancel-btn="t('common.cancel')" :close-on-overlay-click="false"
      @confirm="confirmAction" />
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import {
  wafTunnelProtectionDetailApi,
  wafTunnelProtectionRegionApi,
  wafTunnelProtectionDDNSApi,
  wafTunnelProtectionRefreshApi,
  wafTunnelDetailApi,
  wafTunnelEditApi,
} from '@/apis/tunnel';

const props = defineProps({
  tunnel: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t, te, locale } = useI18n();
const router = useRouter();

const MAX_RULES = 32;
const MAX_BINDINGS = 16;
const stateThemes: Record<string, string> = {
  active: 'success',
  pending: 'warning',
  partial: 'warning',
  degraded: 'warning',
  error: 'danger',
  expired: 'danger',
  disabled: 'default',
  nxdomain: 'warning',
  nodata: 'warning',
  unresolved: 'warning',
};

const dialogVisible = ref(true);
const detail = ref<Record<string, any> | null>(null);
const region = ref<any>(null);
const ddns = ref<any>(null);
let nextKey = 0;
const tab = ref('ddns');
const busy = ref('');
const loadError = ref('');
const forbidden = ref(false);
const confirmation = ref<{ title: string; message: string; run: () => void } | null>(null);
const confirmVisible = ref(false);
const previewCountry = ref('unknown');
const fixedAllow = ref('');
const fixedDeny = ref('');
const fixedTime = ref('');
let unmounted = false;

onUnmounted(() => {
  unmounted = true;
});

function tr(key: string, values?: Record<string, unknown>) {
  return t(`page.tunnel.protection.${key}`, values as any);
}

const protocol = computed(() => {
  const tunnel = props.tunnel as Record<string, any>;
  if (tunnel.protocol === 'tcp' && Number(tunnel.ssl_status) === 1) return 'TCP / TLS';
  return String(tunnel.protocol || '').toUpperCase();
});

const canViewAudit = computed(() => detail.value && detail.value.can_view_audit === true);

const actions = computed(() => ['allow', 'deny'].map((value) => ({ value, label: tr(value) })));
const operators = computed(() => ['eq', 'ne'].map((value) => ({ value, label: tr(value) })));
const families = computed(() => ['ipv4', 'ipv6', 'both'].map((value) => ({ value, label: tr(`family_${value}`) })));

const countries = computed(() => {
  const lang = String(locale.value || 'zh_CN').replace('_', '-');
  let names: Intl.DisplayNames | undefined;
  try {
    names = new Intl.DisplayNames([lang], { type: 'region' });
  } catch {
    /* ISO codes work on older browsers. */
  }
  return (((detail.value && detail.value.countries) || []) as string[]).map((value) => ({
    value,
    label: names ? `${names.of(value)} · ${value}` : value,
  })).sort((a, b) => a.label.localeCompare(b.label, lang));
});

const previewCountries = computed(() => [{ value: 'unknown', label: tr('unknown_value') }, ...countries.value]);

function ruleData({ name, operator, country, action, enabled }: Record<string, any>) {
  return { name, operator, country, action, enabled };
}

function bindingData({ id, domain, family, enabled }: Record<string, any>) {
  return { id, domain, family, enabled };
}

const regionPayload = computed(() => {
  if (!region.value) return null;
  return { ...region.value, rules: region.value.rules.map(ruleData) };
});

const ddnsPayload = computed(() => {
  if (!ddns.value) return null;
  return { ...ddns.value, bindings: ddns.value.bindings.map(bindingData) };
});

const dirtyRegion = computed(
  () => detail.value && JSON.stringify(regionPayload.value) !== JSON.stringify(detail.value.region),
);
const dirtyDDNS = computed(
  () => detail.value && JSON.stringify(ddnsPayload.value) !== JSON.stringify(detail.value.ddns),
);
const dirtyFixed = computed(() => {
  if (!detail.value) return false;
  return (
    fixedAllow.value.trim() !== (detail.value.allow_ip || '') ||
    fixedDeny.value.trim() !== (detail.value.deny_ip || '') ||
    fixedTime.value.trim() !== (detail.value.allowed_time_ranges || '')
  );
});

const willDisableWhitelist = computed(
  () =>
    detail.value &&
    !detail.value.allow_ip &&
    detail.value.ddns.bindings.some((binding: Record<string, any>) => binding.enabled) &&
    !ddns.value.bindings.some((binding: Record<string, any>) => binding.enabled),
);

const previewResult = computed(() => {
  if (!region.value.enabled) return tr('preview_off');
  if (previewCountry.value === 'unknown') return tr(`preview_unknown_${region.value.unknown}`);
  const ruleIndex = region.value.rules.findIndex(
    (rule: Record<string, any>) =>
      rule.enabled &&
      rule.country &&
      (rule.operator === 'eq' ? rule.country === previewCountry.value : rule.country !== previewCountry.value),
  );
  if (ruleIndex === -1) return tr(`preview_fallback_${region.value.fallback}`);
  const rule = region.value.rules[ruleIndex];
  return tr(`preview_rule_${rule.action}`, { number: ruleIndex + 1, name: rule.name || '—' });
});

const bindingRows = computed(() => {
  const saved = new Map((detail.value as any).ddns.bindings.map((binding: Record<string, any>) => [binding.id, binding]));
  const states = new Map(
    (((detail.value as any).states || []) as Record<string, any>[]).map((state) => [state.binding_id, state]),
  );
  return ddns.value.bindings.map((binding: Record<string, any>, index: number) => {
    const original = saved.get(binding.id) as Record<string, any> | undefined;
    const changed =
      !original || original.domain !== binding.domain || original.family !== binding.family || original.enabled !== binding.enabled;
    const state = !changed && binding.enabled && states.get(binding.id);
    return {
      binding,
      index,
      changed,
      state: state
        ? { ...state, ips: state.ips || [] }
        : { state: changed ? 'draft' : binding.enabled ? 'pending' : 'disabled', ips: [] },
    };
  });
});

onMounted(() => {
  reload();
});

// 点 X/遮罩/ESC 会先把 visible 置 false；有未保存改动时拦住并弹确认，确认后再由父组件卸载
watch(dialogVisible, (val) => {
  if (!val) requestExit('close');
});

async function reload(reset?: string) {
  if (busy.value) return;
  busy.value = 'detail';
  loadError.value = '';
  forbidden.value = false;
  try {
    const res: Record<string, any> = await wafTunnelProtectionDetailApi({ id: (props.tunnel as Record<string, any>).id });
    if (unmounted) return;
    if (res && res.code === -403) {
      showForbidden();
      return;
    }
    if (
      !res ||
      typeof res.code !== 'number' ||
      (res.code === 0 &&
        (!res.data || !res.data.region || !res.data.ddns ||
          !Number.isSafeInteger(res.data.region.revision) ||
          !Number.isSafeInteger(res.data.ddns.revision) ||
          !Array.isArray(res.data.countries)))
    ) {
      loadError.value = tr('unsupported');
      return;
    }
    if (res.code !== 0) {
      loadError.value = res.msg || tr('load_failed');
      return;
    }
    const preserveRegion = dirtyRegion.value && reset !== 'region';
    const preserveDDNS = dirtyDDNS.value && reset !== 'ddns';
    const preserveFixed = dirtyFixed.value && reset !== 'fixed';
    const { data } = res;
    detail.value = {
      ...data,
      region: {
        revision: data.region.revision,
        enabled: data.region.enabled,
        fallback: data.region.fallback,
        unknown: data.region.unknown,
        rules: (data.region.rules || []).map(ruleData),
      },
      ddns: { revision: data.ddns.revision, bindings: (data.ddns.bindings || []).map(bindingData) },
    };
    // 保留未保存草稿时沿用原修订号，重载不会掩盖写冲突
    if (!preserveRegion) {
      const savedDetail = detail.value as Record<string, any>;
      region.value = { ...savedDetail.region, rules: savedDetail.region.rules.map((rule: Record<string, any>) => ({ ...rule, key: ++nextKey })) };
    }
    if (!preserveDDNS) {
      const savedDetail = detail.value as Record<string, any>;
      ddns.value = {
        ...savedDetail.ddns,
        bindings: savedDetail.ddns.bindings.map((binding: Record<string, any>) => ({ ...binding, key: ++nextKey })),
      };
    }
    if (!preserveFixed) {
      fixedAllow.value = data.allow_ip || '';
      fixedDeny.value = data.deny_ip || '';
      fixedTime.value = data.allowed_time_ranges || '';
    }
  } catch (err: any) {
    if (unmounted) return;
    const status = err.response && err.response.status;
    loadError.value = tr(status === 404 || status === 405 ? 'unsupported' : 'load_failed');
  } finally {
    busy.value = '';
  }
}

function showForbidden() {
  forbidden.value = true;
  detail.value = null;
  loadError.value = tr('forbidden');
}

function addRule() {
  region.value.rules.push({ key: ++nextKey, name: '', operator: 'eq', country: '', action: 'deny', enabled: true });
}

function moveRule(index: number, delta: number) {
  const [rule] = region.value.rules.splice(index, 1);
  region.value.rules.splice(index + delta, 0, rule);
}

function addBinding() {
  ddns.value.bindings.push({ key: ++nextKey, id: '', domain: '', family: 'ipv4', enabled: true });
}

function normalizeDomain(value: string) {
  const name = value.trim();
  if (!name || name.length > 1024 || /[\s/:?#@%\\]/.test(name)) return '';
  try {
    const hostname = new URL(`http://${name}`).hostname.replace(/\.$/, '').toLowerCase();
    const labels = hostname.split('.');
    if (hostname.length > 253 || labels.length < 2 || !/[a-z]/.test(labels[labels.length - 1])) return '';
    return labels.every((part) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part)) ? hostname : '';
  } catch {
    return '';
  }
}

function saveRegion() {
  const rules = region.value.rules.map((rule: Record<string, any>) => ({ ...ruleData(rule), name: rule.name.trim() }));
  const badRule = rules.findIndex(
    (rule: Record<string, any>) =>
      !rule.name || Array.from(rule.name).length > 60 || /[\p{Cc}]/u.test(rule.name) || !detail.value!.countries.includes(rule.country),
  );
  if (badRule !== -1) {
    MessagePlugin.warning(tr('invalid_rule', { number: badRule + 1 }));
    return;
  }
  submit('region', wafTunnelProtectionRegionApi, { ...regionPayload.value, rules }, 'saved');
}

function requestSaveDDNS() {
  const domains = new Set<string>();
  const bindings: Record<string, any>[] = [];
  for (const [index, binding] of (ddns.value.bindings as Record<string, any>[]).entries()) {
    const domain = normalizeDomain(binding.domain);
    if (!domain) {
      MessagePlugin.warning(tr('invalid_domain', { number: index + 1 }));
      return;
    }
    if (domains.has(domain)) {
      MessagePlugin.warning(tr('duplicate_domain', { number: index + 1 }));
      return;
    }
    domains.add(domain);
    bindings.push({ ...bindingData(binding), domain });
  }
  const save = (confirmed: boolean) =>
    submit('ddns', wafTunnelProtectionDDNSApi, {
      revision: ddns.value.revision,
      bindings,
      confirm_disable_whitelist: confirmed,
    }, 'saved');
  if (willDisableWhitelist.value) {
    confirmation.value = { title: 'whitelist_confirm', message: 'whitelist_warning', run: () => save(true) };
    confirmVisible.value = true;
  } else {
    save(false);
  }
}

function validateTimeRanges(value: string) {
  const val = (value || '').trim();
  if (!val) return '';
  if (!/^(\d{2}:\d{2}-\d{2}:\d{2})(;\d{2}:\d{2}-\d{2}:\d{2})*$/.test(val)) {
    return tr('invalid_time_format');
  }
  for (const range of val.split(';')) {
    for (const time of range.split('-')) {
      const parts = time.split(':');
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      if (Number.isNaN(hour) || hour < 0 || hour > 23 || Number.isNaN(minute) || minute < 0 || minute > 59) {
        return tr('invalid_time_value');
      }
    }
  }
  return '';
}

async function saveFixed() {
  if (busy.value || loadError.value) return;
  const timeError = validateTimeRanges(fixedTime.value);
  if (timeError) {
    MessagePlugin.warning(timeError);
    return;
  }
  busy.value = 'fixed';
  let saved = false;
  try {
    const detailRes: Record<string, any> = await wafTunnelDetailApi({ id: (props.tunnel as Record<string, any>).id });
    if (unmounted) return;
    if (!detailRes || detailRes.code !== 0 || !detailRes.data) {
      MessagePlugin.warning(tr('submit_failed'));
      return;
    }
    const postdata: Record<string, any> = {
      ...detailRes.data,
      allow_ip: fixedAllow.value.trim(),
      deny_ip: fixedDeny.value.trim(),
      allowed_time_ranges: fixedTime.value.trim(),
    };
    for (const key of ['remote_port', 'start_status', 'conn_timeout', 'read_timeout', 'write_timeout', 'max_in_connect', 'max_out_connect']) {
      postdata[key] = Number(postdata[key]);
    }
    postdata.ssl_status = Number(postdata.ssl_status || 0);
    const res: Record<string, any> = await wafTunnelEditApi(postdata);
    if (unmounted) return;
    if (res && res.code === -403) {
      showForbidden();
    } else if (res && res.code === 0) {
      saved = true;
      MessagePlugin.success(tr('saved'));
    } else {
      MessagePlugin.warning((res && res.msg) || tr('submit_failed'));
    }
  } catch {
    if (!unmounted) MessagePlugin.error(tr('submit_failed'));
  } finally {
    busy.value = '';
  }
  if (saved) await reload('fixed');
}

function refreshBinding(binding: Record<string, any>) {
  submit('refresh', wafTunnelProtectionRefreshApi, { binding_id: binding.id }, 'refresh_queued');
}

async function submit(kind: string, api: (data: Record<string, any>) => Promise<any>, data: Record<string, any>, success: string) {
  if (busy.value || loadError.value) return;
  busy.value = kind;
  let saved = false;
  try {
    const res: Record<string, any> = await api({ id: (props.tunnel as Record<string, any>).id, ...data });
    if (unmounted) return;
    if (res && res.code === -403) {
      showForbidden();
    } else if (res && res.code === 0) {
      saved = true;
      MessagePlugin.success(tr(success));
    } else {
      MessagePlugin.warning((res && res.msg) || tr('submit_failed'));
    }
  } catch {
    if (!unmounted) MessagePlugin.error(tr('submit_failed'));
  } finally {
    busy.value = '';
  }
  if (saved) await reload(kind);
}

function requestReset(section: string) {
  const run = () => reload(section);
  const dirty = section === 'region' ? dirtyRegion.value : section === 'fixed' ? dirtyFixed.value : dirtyDDNS.value;
  if (dirty) {
    confirmation.value = { title: 'discard_title', message: 'discard_one', run };
    confirmVisible.value = true;
  } else {
    run();
  }
}

function requestExit(action: 'close' | (() => void)) {
  if (busy.value) {
    dialogVisible.value = true;
    return;
  }
  const run = typeof action === 'function' ? action : () => emit('close');
  if (dirtyRegion.value || dirtyDDNS.value || dirtyFixed.value) {
    dialogVisible.value = true;
    confirmation.value = { title: 'discard_title', message: 'discard_all', run };
    confirmVisible.value = true;
  } else {
    run();
  }
}

function openAudit(event?: string) {
  requestExit(() => {
    const query: Record<string, string> = { object_type: 'tunnel', object_id: String((props.tunnel as Record<string, any>).id), category: 'config' };
    if (event) query.event = event;
    emit('close');
    router.push({ name: 'WafAccessAudit', query }).catch(() => { /* 已在目标位置 */ });
  });
}

function confirmAction() {
  if (!confirmation.value) return;
  const { run } = confirmation.value;
  confirmation.value = null;
  confirmVisible.value = false;
  run();
}

function stateTheme(state: string) {
  return stateThemes[state] || 'default';
}

function stateLabel(state: string) {
  const key = `page.tunnel.protection.state_${state}`;
  return (state && (te(key) ? t(key) : state)) || '—';
}

function formatTime(value: string) {
  if (!value || String(value).startsWith('0001-')) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(String(locale.value || 'zh_CN').replace('_', '-'));
}
</script>

<style scoped>
.protection-body,
.protection-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.protection-body {
  max-height: 72vh;
  overflow-y: auto;
}
.protection-section {
  padding: 12px 0 4px;
}
.protection-bar,
.protection-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.protection-bar {
  justify-content: space-between;
}
.protection-inline label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.protection-note {
  color: var(--td-text-color-secondary);
  margin: 0;
}
.protection-empty {
  min-height: 64px;
  padding-top: 8px;
}
.action-control {
  width: 104px;
}
.country-control {
  width: 210px;
  max-width: 100%;
}
.protection-scroll {
  overflow: auto;
}
.protection-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.region-table {
  min-width: 760px;
}
.ddns-table {
  min-width: 920px;
}
.protection-table th,
.protection-table td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid var(--td-component-border);
}
.protection-table th {
  background: var(--td-bg-color-secondarycontainer);
  white-space: nowrap;
}
.protection-actions {
  white-space: nowrap;
}
.protection-actions .t-button {
  padding: 0 5px;
}
.preview-result,
.binding-ips,
.state-error,
.family-details {
  overflow-wrap: anywhere;
}
.fixed-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  max-width: 640px;
}
.fixed-row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  align-items: center;
  gap: 8px 12px;
}
.fixed-label {
  color: var(--td-text-color-primary);
}
.fixed-time-tips {
  margin: -4px 0 0 142px;
}
.binding-ips {
  max-width: 160px;
}
.state-error,
.family-details {
  max-width: 180px;
  color: var(--td-text-color-secondary);
}
.family-details summary {
  cursor: pointer;
}
</style>
