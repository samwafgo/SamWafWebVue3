<template>
  <div>
    <t-alert theme="info" :message="t('page.notify_channel.webhook_config_tip')" style="margin-bottom: 16px"></t-alert>

    <t-form-item :label="t('page.notify_channel.webhook_preset')" name="webhook_preset">
      <div :style="{ width: '480px' }">
        <t-select :value="preset" :style="{ width: '480px' }" @change="applyPreset">
          <t-option v-for="item in presetOptions" :key="item.value" :value="item.value" :label="item.label"></t-option>
        </t-select>
        <div class="webhook-tip">💡 {{ t('page.notify_channel.webhook_preset_tip') }}</div>
      </div>
    </t-form-item>

    <t-form-item :label="t('page.notify_channel.label_webhook_url')" name="webhook_url">
      <div :style="{ width: '480px' }">
        <t-input v-model="form.webhook_url" :placeholder="urlPlaceholder" autocomplete="off"></t-input>
        <div v-if="presetHint" class="webhook-tip">📝 {{ presetHint }}</div>
      </div>
    </t-form-item>

    <t-form-item :label="t('page.notify_channel.webhook_method')" name="webhook_method">
      <t-select v-model="form.webhook_method" :style="{ width: '480px' }">
        <t-option v-for="m in METHODS" :key="m" :value="m" :label="m"></t-option>
      </t-select>
    </t-form-item>

    <t-form-item :label="t('page.notify_channel.webhook_content_type')" name="webhook_content_type">
      <t-select v-model="form.webhook_content_type" :style="{ width: '480px' }" filterable creatable>
        <t-option v-for="c in CONTENT_TYPES" :key="c" :value="c" :label="c"></t-option>
      </t-select>
    </t-form-item>

    <t-form-item :label="t('page.notify_channel.webhook_headers')" name="webhook_headers">
      <div :style="{ width: '480px' }">
        <div v-for="(header, index) in form.webhook_headers" :key="index" class="webhook-header-row">
          <t-input
            v-model="header.key"
            :placeholder="t('page.notify_channel.webhook_header_key')"
            style="width: 180px"
            autocomplete="off"
          ></t-input>
          <t-input
            v-model="header.value"
            :placeholder="t('page.notify_channel.webhook_header_value')"
            style="width: 240px"
            autocomplete="off"
          ></t-input>
          <t-button variant="text" theme="danger" @click="removeHeader(index)">{{ t('common.delete') }}</t-button>
        </div>
        <t-button variant="dashed" size="small" :disabled="form.webhook_headers.length >= WEBHOOK_MAX_HEADERS" @click="addHeader">
          + {{ t('page.notify_channel.webhook_header_add') }}
        </t-button>
        <div class="webhook-tip">💡 {{ t('page.notify_channel.webhook_header_tip') }}</div>
      </div>
    </t-form-item>

    <t-form-item :label="t('page.notify_channel.webhook_body')" name="webhook_body_template">
      <div :style="{ width: '480px' }">
        <!-- 两层模板最容易被混淆，直接在变量上方讲清楚分工，否则用户会把订阅模板的
             Domain / Ip 之类变量写到这里，保存时才被后端拦下来 -->
        <t-alert theme="info" :message="t('page.notify_channel.webhook_body_layer_tip')" style="margin-bottom: 8px"></t-alert>
        <div class="webhook-vars">
          <t-tag
            v-for="v in WEBHOOK_VARS"
            :key="v.name"
            theme="primary"
            variant="light"
            class="webhook-var-tag"
            @click="insertVar(v.name)"
          >
            {{ v.label }}
          </t-tag>
        </div>
        <t-textarea
          v-model="form.webhook_body_template"
          :autosize="{ minRows: 8, maxRows: 16 }"
          :placeholder="t('page.notify_channel.webhook_body_placeholder')"
        ></t-textarea>
        <div class="webhook-tip">💡 {{ t('page.notify_channel.webhook_body_tip') }}</div>
      </div>
    </t-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { WEBHOOK_MAX_HEADERS, WEBHOOK_PRESETS, WEBHOOK_VARS } from '../webhook_presets';

const props = defineProps<{
  // 直接接收父级表单对象并就地修改属性（不重新赋值 prop 本身），
  // 这样新增/编辑两个弹窗可以共用同一份配置界面，不必把十几个字段来回 emit。
  form: Record<string, any>;
}>();

const { t } = useI18n();

const METHODS = ['POST', 'PUT', 'PATCH', 'GET', 'DELETE'];
const CONTENT_TYPES = ['application/json', 'application/x-www-form-urlencoded', 'text/plain', 'text/xml'];

const preset = computed(() => props.form.webhook_preset || 'custom');
const presetOptions = computed(() => WEBHOOK_PRESETS.map((p) => ({ value: p.value, label: t(p.labelKey) })));
const currentPreset = computed(() => WEBHOOK_PRESETS.find((p) => p.value === preset.value) || WEBHOOK_PRESETS[0]);
const urlPlaceholder = computed(() => currentPreset.value.urlPlaceholder || t('page.notify_channel.webhook_placeholder'));
const presetHint = computed(() => (currentPreset.value.hintKey ? t(currentPreset.value.hintKey) : ''));

function applyPreset(value: any) {
  props.form.webhook_preset = value as string;
  const target = WEBHOOK_PRESETS.find((p) => p.value === value);
  if (!target || value === 'custom') {
    return;
  }
  // 只覆盖报文相关字段，URL 由用户自己填（预设里放的是占位示例，不是真实地址）
  props.form.webhook_method = target.method;
  props.form.webhook_content_type = target.contentType;
  props.form.webhook_headers = (target.headers || []).map((h) => ({ ...h }));
  props.form.webhook_body_template = target.bodyTemplate;
}

function addHeader() {
  if (props.form.webhook_headers.length >= WEBHOOK_MAX_HEADERS) {
    return;
  }
  props.form.webhook_headers.push({ key: '', value: '' });
}

function removeHeader(index: number) {
  props.form.webhook_headers.splice(index, 1);
}

function insertVar(name: string) {
  props.form.webhook_body_template = `${props.form.webhook_body_template || ''}{{.${name}}}`;
}
</script>

<style scoped>
.webhook-tip {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  line-height: 1.5;
}

.webhook-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.webhook-vars {
  margin-bottom: 8px;
}

.webhook-var-tag {
  margin-right: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  font-family: monospace;
}
</style>
