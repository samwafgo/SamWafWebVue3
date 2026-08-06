<template>
  <t-drawer
    v-model:visible="innerVisible"
    :header="`${t('page.notify_subscription.config_title')} - ${headerSuffix}`"
    size="680px"
    :footer="false"
    @close="handleClose"
  >
    <t-tabs v-model="activeTab">
      <!-- ===== 频率控制 ===== -->
      <t-tab-panel value="throttle" :label="t('page.notify_subscription.config_tab_throttle')">
        <div class="tab-body">
          <t-form :label-width="120">
            <t-form-item :label="t('page.notify_subscription.label_throttle_mode')">
              <div>
                <t-radio-group v-model="form.throttle_mode">
                  <t-radio value="inherit">{{ t('page.notify_subscription.throttle_mode_inherit') }}</t-radio>
                  <t-radio value="realtime">{{ t('page.notify_subscription.throttle_mode_realtime') }}</t-radio>
                  <t-radio value="aggregate">{{ t('page.notify_subscription.throttle_mode_aggregate') }}</t-radio>
                  <t-radio value="cooldown">{{ t('page.notify_subscription.throttle_mode_cooldown') }}</t-radio>
                </t-radio-group>
                <div class="form-tip">{{ modeTip }}</div>
              </div>
            </t-form-item>

            <!-- 聚合模式参数 -->
            <template v-if="form.throttle_mode === 'aggregate'">
              <t-form-item :label="t('page.notify_subscription.label_aggregate_window')">
                <t-input-number v-model="form.throttle.aggregate_window_sec" :min="0" :max="3600" theme="normal" :style="{ width: '160px' }" />
                <span class="form-tip-inline">0 = {{ t('page.notify_subscription.summary_inherit') }}</span>
              </t-form-item>
              <t-form-item :label="t('page.notify_subscription.label_aggregate_max_detail')">
                <t-input-number v-model="form.throttle.aggregate_max_detail" :min="0" :max="50" theme="normal" :style="{ width: '160px' }" />
              </t-form-item>
            </template>

            <!-- 冷却模式参数 -->
            <template v-if="form.throttle_mode === 'cooldown'">
              <t-form-item :label="t('page.notify_subscription.label_cooldown_steps')">
                <div>
                  <t-input v-model="cooldownStepsText" placeholder="60,300,900" :style="{ width: '260px' }" />
                  <div class="form-tip">{{ t('page.notify_subscription.cooldown_steps_tip') }}</div>
                </div>
              </t-form-item>
              <t-form-item :label="t('page.notify_subscription.label_cooldown_reset')">
                <div>
                  <t-input-number v-model="form.throttle.cooldown_reset_sec" :min="0" :max="86400" theme="normal" :style="{ width: '160px' }" />
                  <div class="form-tip">{{ t('page.notify_subscription.cooldown_reset_tip') }}</div>
                </div>
              </t-form-item>
            </template>

            <t-form-item v-if="form.throttle_mode !== 'inherit'" :label="t('page.notify_subscription.label_max_per_hour')">
              <div>
                <t-input-number v-model="form.throttle.max_per_hour" :min="0" :max="10000" theme="normal" :style="{ width: '160px' }" />
                <div class="form-tip">{{ t('page.notify_subscription.max_per_hour_tip') }}</div>
              </div>
            </t-form-item>

            <t-form-item
              v-if="form.throttle_mode === 'aggregate' || form.throttle_mode === 'cooldown'"
              :label="t('page.notify_subscription.label_dedup_keys')"
            >
              <div>
                <t-checkbox-group v-model="form.throttle.dedup_keys">
                  <t-checkbox value="message_type">{{ t('page.notify_subscription.dedup_key_message_type') }}</t-checkbox>
                  <t-checkbox value="domain">{{ t('page.notify_subscription.dedup_key_domain') }}</t-checkbox>
                  <t-checkbox value="ip">{{ t('page.notify_subscription.dedup_key_ip') }}</t-checkbox>
                  <t-checkbox value="attack_type">{{ t('page.notify_subscription.dedup_key_attack_type') }}</t-checkbox>
                  <t-checkbox value="rule">{{ t('page.notify_subscription.dedup_key_rule') }}</t-checkbox>
                </t-checkbox-group>
                <div class="form-tip">{{ t('page.notify_subscription.dedup_keys_tip') }}</div>
              </div>
            </t-form-item>

            <t-form-item :label="t('page.notify_subscription.label_quiet_hours')">
              <div>
                <t-input v-model="form.throttle.quiet_hours" placeholder="23:00-07:00" :style="{ width: '200px' }" />
                <div class="form-tip">{{ t('page.notify_subscription.quiet_hours_tip') }}</div>
              </div>
            </t-form-item>
            <t-form-item v-if="form.throttle.quiet_hours" :label="t('page.notify_subscription.label_quiet_bypass')">
              <div>
                <t-select v-model="form.throttle.quiet_hours_bypass_severity" :style="{ width: '200px' }">
                  <t-option value="" :label="t('page.notify_subscription.severity_none')"></t-option>
                  <t-option value="warn" :label="t('page.notify_subscription.severity_warn')"></t-option>
                  <t-option value="critical" :label="t('page.notify_subscription.severity_critical')"></t-option>
                </t-select>
                <div class="form-tip">{{ t('page.notify_subscription.quiet_bypass_tip') }}</div>
              </div>
            </t-form-item>
          </t-form>
        </div>
      </t-tab-panel>

      <!-- ===== 消息模板 ===== -->
      <t-tab-panel value="template" :label="t('page.notify_subscription.config_tab_template')">
        <div class="tab-body">
          <t-form :label-width="120">
            <t-form-item :label="t('page.notify_subscription.label_title_template')">
              <t-input v-model="form.title_template" :placeholder="defaultTitle" />
            </t-form-item>
            <t-form-item :label="t('page.notify_subscription.label_content_template')">
              <div style="width: 100%">
                <t-textarea v-model="form.content_template" :placeholder="defaultContent" :autosize="{ minRows: 6, maxRows: 14 }" />
                <div class="form-tip">{{ t('page.notify_subscription.template_tip') }}</div>
              </div>
            </t-form-item>
            <t-form-item :label="t('page.notify_subscription.template_vars')">
              <div>
                <div class="var-list">
                  <t-tag v-for="v in templateVars" :key="v.name" theme="primary" variant="light" class="var-tag" @click="insertVar(v.name)">
                    {{ varLabel(v.name) }} <span class="var-desc">{{ v.desc }}</span>
                  </t-tag>
                </div>
                <div class="form-tip">{{ t('page.notify_subscription.template_insert_tip') }}</div>
              </div>
            </t-form-item>
            <t-form-item>
              <t-button variant="outline" size="small" @click="resetTemplate">{{ t('page.notify_subscription.template_reset') }}</t-button>
              <t-button variant="outline" size="small" :style="{ marginLeft: '8px' }" @click="doPreview">
                {{ t('page.notify_subscription.button_preview') }}
              </t-button>
              <t-button variant="outline" size="small" :style="{ marginLeft: '8px' }" @click="applyToAllChannels">
                {{ t('page.notify_subscription.template_apply_all') }}
              </t-button>
            </t-form-item>
          </t-form>

          <div v-if="preview.title" class="preview-box">
            <div class="preview-head">{{ t('page.notify_subscription.preview_title') }}</div>
            <t-alert v-if="preview.is_fallback" theme="error" :message="t('page.notify_subscription.preview_fallback_warn')" />
            <div class="preview-title">{{ preview.title }}</div>
            <pre class="preview-content">{{ preview.content }}</pre>
          </div>
        </div>
      </t-tab-panel>

      <!-- ===== 过滤条件 ===== -->
      <t-tab-panel value="filter" :label="t('page.notify_subscription.config_tab_filter')">
        <div class="tab-body">
          <t-form :label-width="120">
            <t-form-item :label="t('page.notify_subscription.label_filter_domains')">
              <div style="width: 100%">
                <t-textarea v-model="filterText.domains" :placeholder="domainsPlaceholder" :autosize="{ minRows: 3, maxRows: 6 }" />
                <div class="form-tip">{{ t('page.notify_subscription.filter_domains_tip') }}</div>
              </div>
            </t-form-item>
            <t-form-item :label="t('page.notify_subscription.label_filter_exclude_ips')">
              <div style="width: 100%">
                <t-textarea v-model="filterText.exclude_ips" :placeholder="excludeIpsPlaceholder" :autosize="{ minRows: 3, maxRows: 6 }" />
                <div class="form-tip">{{ t('page.notify_subscription.filter_exclude_ips_tip') }}</div>
              </div>
            </t-form-item>
            <t-form-item :label="t('page.notify_subscription.label_filter_keywords')">
              <div style="width: 100%">
                <t-textarea v-model="filterText.keywords" :autosize="{ minRows: 3, maxRows: 6 }" />
                <div class="form-tip">{{ t('page.notify_subscription.filter_keywords_tip') }}</div>
              </div>
            </t-form-item>
            <t-form-item :label="t('page.notify_subscription.label_filter_min_severity')">
              <t-select v-model="form.filter.min_severity" :style="{ width: '200px' }">
                <t-option value="" :label="t('common.all')"></t-option>
                <t-option value="info" :label="t('page.notify_subscription.severity_info')"></t-option>
                <t-option value="warn" :label="t('page.notify_subscription.severity_warn')"></t-option>
                <t-option value="critical" :label="t('page.notify_subscription.severity_critical')"></t-option>
              </t-select>
            </t-form-item>
          </t-form>
        </div>
      </t-tab-panel>

      <!-- ===== 测试与预览 ===== -->
      <t-tab-panel value="debug" :label="t('page.notify_subscription.config_tab_debug')">
        <div class="tab-body">
          <t-form :label-width="120">
            <t-form-item :label="t('page.notify_subscription.button_dryrun')">
              <div>
                <t-button variant="outline" :loading="dryRunLoading" @click="doDryRun">
                  {{ t('page.notify_subscription.button_dryrun') }}
                </t-button>
                <div class="form-tip">{{ t('page.notify_subscription.dryrun_tip') }}</div>
              </div>
            </t-form-item>
            <t-form-item v-if="dryRun.action">
              <div style="width: 100%">
                <t-alert
                  :theme="dryRun.would_send ? 'success' : 'warning'"
                  :message="`${dryRun.would_send ? t('page.notify_subscription.dryrun_would_send') : t('page.notify_subscription.dryrun_would_not_send')} —— ${dryRun.reason_text}`"
                />
                <div class="dryrun-stat">
                  <span v-if="dryRun.cooldown_left > 0">{{ t('page.notify_subscription.dryrun_cooldown_left', { sec: dryRun.cooldown_left }) }}</span>
                  <span>{{ t('page.notify_subscription.dryrun_hour_used', { count: dryRun.hour_used }) }}</span>
                  <span v-if="dryRun.suppressed > 0">{{ t('page.notify_subscription.dryrun_suppressed', { count: dryRun.suppressed }) }}</span>
                </div>
              </div>
            </t-form-item>
            <t-form-item :label="t('page.notify_subscription.button_test_send')">
              <div>
                <t-button theme="primary" variant="outline" :loading="testLoading" @click="doTestSend">
                  {{ t('page.notify_subscription.button_test_send') }}
                </t-button>
                <div class="form-tip">{{ t('page.notify_subscription.test_send_tip') }}</div>
              </div>
            </t-form-item>
          </t-form>
        </div>
      </t-tab-panel>
    </t-tabs>

    <div class="drawer-footer">
      <t-button variant="outline" @click="handleClose">{{ t('common.close') }}</t-button>
      <t-button theme="primary" :loading="saving" @click="handleSave">{{ t('common.confirm') }}</t-button>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';

import {
  batchNotifySubscriptionConfig,
  dryRunNotifySubscription,
  getNotifyTemplateVars,
  previewNotifySubscription,
  saveNotifySubscriptionConfig,
  testNotifySubscription,
} from '@/apis/notify_subscription';

const props = defineProps<{
  visible: boolean;
  subscription: Record<string, any>;
  channelName: string;
  channelType: string;
  messageTypeName: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'saved'): void;
}>();

const { t } = useI18n();

// 空表单：所有字段留空 = 继承全局默认，与升级前行为一致
function emptyForm() {
  return {
    id: '',
    throttle_mode: 'inherit',
    throttle: {
      aggregate_window_sec: 0,
      aggregate_max_detail: 0,
      cooldown_steps_sec: [] as number[],
      cooldown_reset_sec: 0,
      max_per_hour: 0,
      dedup_keys: [] as string[],
      quiet_hours: '',
      quiet_hours_bypass_severity: '',
    },
    filter: {
      domains: [] as string[],
      exclude_ips: [] as string[],
      keywords: [] as string[],
      min_severity: '',
    },
    title_template: '',
    content_template: '',
  };
}

const innerVisible = ref(false);
const activeTab = ref('throttle');
const form = ref(emptyForm());
// 多行文本 ↔ 数组：过滤条件用文本框填更顺手，提交前再切成数组
const filterText = ref({ domains: '', exclude_ips: '', keywords: '' });
// 换行只能从 JS 传：写在模板的 placeholder 属性里会被当成字面量 &#10; 显示出来
const domainsPlaceholder = 'www.example.com\n*.example.com';
const excludeIpsPlaceholder = '10.0.0.0/8\n192.168.1.1';
const cooldownStepsText = ref('');
const templateVars = ref<Record<string, any>[]>([]);
const defaultTitle = ref('');
const defaultContent = ref('');
const preview = ref({ title: '', content: '', is_fallback: false });
const dryRun = ref<Record<string, any>>({});
const saving = ref(false);
const testLoading = ref(false);
const dryRunLoading = ref(false);

const headerSuffix = computed(() => `${props.messageTypeName} / ${props.channelName}`);
const modeTip = computed(() => t(`page.notify_subscription.throttle_mode_${form.value.throttle_mode}_tip`));

watch(
  () => props.visible,
  (val) => {
    innerVisible.value = val;
    if (val) {
      loadFromSubscription();
      loadTemplateVars();
    }
  },
);

function parseJSON(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// 把订阅记录里的 JSON 字段摊开成表单
function loadFromSubscription() {
  const sub = props.subscription || {};
  const next = emptyForm();
  next.id = sub.id;
  next.throttle_mode = sub.throttle_mode || 'inherit';
  next.title_template = sub.title_template || '';
  next.content_template = sub.content_template || '';

  // 脏数据不能把抽屉打不开，解析失败就按"未配置"处理
  Object.assign(next.throttle, parseJSON(sub.throttle_json) || {});
  Object.assign(next.filter, parseJSON(sub.filter_json) || {});
  if (!Array.isArray(next.throttle.dedup_keys)) next.throttle.dedup_keys = [];
  if (!Array.isArray(next.throttle.cooldown_steps_sec)) next.throttle.cooldown_steps_sec = [];

  form.value = next;
  cooldownStepsText.value = (next.throttle.cooldown_steps_sec || []).join(',');
  filterText.value = {
    domains: (next.filter.domains || []).join('\n'),
    exclude_ips: (next.filter.exclude_ips || []).join('\n'),
    keywords: (next.filter.keywords || []).join('\n'),
  };
  preview.value = { title: '', content: '', is_fallback: false };
  dryRun.value = {};
}

async function loadTemplateVars() {
  try {
    const res = await getNotifyTemplateVars({ message_type: props.subscription.message_type });
    if (res.code === 0) {
      templateVars.value = res.data.vars || [];
      defaultTitle.value = res.data.default_title || '';
      defaultContent.value = res.data.default_content || '';
    }
  } catch (e) {
    console.error(e);
  }
}

// 变量的展示写法。不能直接写在模板里：{{ '{{.x}}' }} 会被插值解析器提前截断
function varLabel(name: string) {
  return `{{.${name}}}`;
}

function insertVar(name: string) {
  form.value.content_template = `${form.value.content_template || ''}${varLabel(name)}`;
}

function resetTemplate() {
  form.value.title_template = '';
  form.value.content_template = '';
  preview.value = { title: '', content: '', is_fallback: false };
}

function splitLines(text: string): string[] {
  return (text || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function buildPayload() {
  const steps = splitLines(cooldownStepsText.value)
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  return {
    id: form.value.id,
    throttle_mode: form.value.throttle_mode,
    throttle: {
      ...form.value.throttle,
      cooldown_steps_sec: steps,
    },
    filter: {
      domains: splitLines(filterText.value.domains),
      exclude_ips: splitLines(filterText.value.exclude_ips),
      keywords: splitLines(filterText.value.keywords),
      min_severity: form.value.filter.min_severity || '',
    },
    title_template: form.value.title_template || '',
    content_template: form.value.content_template || '',
  };
}

async function handleSave() {
  saving.value = true;
  try {
    const res = await saveNotifySubscriptionConfig(buildPayload());
    if (res.code === 0) {
      MessagePlugin.success(t('page.notify_subscription.config_save_success'));
      emit('saved');
      handleClose();
    } else {
      MessagePlugin.error(res.msg || t('page.notify_subscription.config_save_failed'));
    }
  } catch (e) {
    MessagePlugin.error(t('page.notify_subscription.config_save_failed'));
  } finally {
    saving.value = false;
  }
}

// 模板套用到本消息类型的所有渠道：省得一个格子一个格子配
async function applyToAllChannels() {
  try {
    const payload = buildPayload();
    const res = await batchNotifySubscriptionConfig({
      message_type: props.subscription.message_type,
      throttle_mode: payload.throttle_mode,
      throttle: payload.throttle,
      filter: payload.filter,
      title_template: payload.title_template,
      content_template: payload.content_template,
      apply_throttle: false,
      apply_template: true,
      apply_filter: false,
    });
    if (res.code === 0) {
      MessagePlugin.success(
        t('page.notify_subscription.batch_config_success', { success: res.data.success, total: res.data.total }),
      );
      emit('saved');
    } else {
      MessagePlugin.error(res.msg || t('page.notify_subscription.config_save_failed'));
    }
  } catch (e) {
    MessagePlugin.error(t('page.notify_subscription.config_save_failed'));
  }
}

async function doPreview() {
  try {
    const res = await previewNotifySubscription({
      message_type: props.subscription.message_type,
      channel_type: props.channelType,
      title_template: form.value.title_template || '',
      content_template: form.value.content_template || '',
    });
    if (res.code === 0) {
      preview.value = {
        title: res.data.title,
        content: res.data.content,
        is_fallback: res.data.is_fallback,
      };
    } else {
      MessagePlugin.error(res.msg);
    }
  } catch (e) {
    console.error(e);
  }
}

async function doDryRun() {
  dryRunLoading.value = true;
  try {
    const res = await dryRunNotifySubscription({ id: form.value.id });
    if (res.code === 0) {
      dryRun.value = res.data;
    } else {
      MessagePlugin.error(res.msg);
    }
  } catch (e) {
    console.error(e);
  } finally {
    dryRunLoading.value = false;
  }
}

async function doTestSend() {
  testLoading.value = true;
  try {
    const res = await testNotifySubscription({
      id: form.value.id,
      title_template: form.value.title_template || '',
      content_template: form.value.content_template || '',
    });
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
    } else {
      MessagePlugin.error(res.msg);
    }
  } catch (e) {
    MessagePlugin.error('测试发送失败');
  } finally {
    testLoading.value = false;
  }
}

function handleClose() {
  innerVisible.value = false;
  emit('update:visible', false);
}
</script>

<style scoped>
.tab-body {
  padding: 16px 8px 64px;
}

.form-tip {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  line-height: 1.6;
}

.form-tip-inline {
  font-size: 12px;
  color: #888;
  margin-left: 8px;
}

.var-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.var-list .var-tag {
  cursor: pointer;
}

.var-list .var-desc {
  color: #888;
  margin-left: 4px;
}

.preview-box {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--td-component-border, #e7e7e7);
  border-radius: 6px;
  background: var(--td-bg-color-container-hover, #fafafa);
}

.preview-box .preview-head {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.preview-box .preview-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.preview-box .preview-content {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
  margin: 0;
}

.dryrun-stat {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.dryrun-stat span {
  margin-right: 12px;
}

.drawer-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 24px;
  border-top: 1px solid var(--td-component-border, #e7e7e7);
  background: var(--td-bg-color-container, #fff);
  text-align: right;
}

.drawer-footer .t-button + .t-button {
  margin-left: 8px;
}
</style>
