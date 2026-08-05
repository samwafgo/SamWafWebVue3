<template>
  <t-dialog
    v-model:visible="innerVisible"
    :header="t('page.notify_subscription.global_config_title')"
    :width="660"
    :footer="false"
    @close="handleClose"
  >
    <t-alert theme="info" :message="t('page.notify_subscription.throttle_mode_inherit_tip')" />
    <t-form :label-width="140" :style="{ marginTop: '12px' }">
      <t-form-item :label="t('page.notify_subscription.label_throttle_mode')">
        <t-radio-group v-model="form.mode">
          <t-radio value="realtime">{{ t('page.notify_subscription.throttle_mode_realtime') }}</t-radio>
          <t-radio value="aggregate">{{ t('page.notify_subscription.throttle_mode_aggregate') }}</t-radio>
          <t-radio value="cooldown">{{ t('page.notify_subscription.throttle_mode_cooldown') }}</t-radio>
        </t-radio-group>
      </t-form-item>

      <t-form-item :label="t('page.notify_subscription.label_aggregate_window')">
        <t-input-number v-model="form.throttle.aggregate_window_sec" :min="1" :max="3600" theme="normal" :style="{ width: '160px' }" />
      </t-form-item>
      <t-form-item :label="t('page.notify_subscription.label_aggregate_max_detail')">
        <t-input-number v-model="form.throttle.aggregate_max_detail" :min="1" :max="50" theme="normal" :style="{ width: '160px' }" />
      </t-form-item>
      <t-form-item :label="t('page.notify_subscription.label_cooldown_steps')">
        <div>
          <t-input v-model="cooldownStepsText" placeholder="60,300,900" :style="{ width: '260px' }" />
          <div class="form-tip">{{ t('page.notify_subscription.cooldown_steps_tip') }}</div>
        </div>
      </t-form-item>
      <t-form-item :label="t('page.notify_subscription.label_cooldown_reset')">
        <t-input-number v-model="form.throttle.cooldown_reset_sec" :min="1" :max="86400" theme="normal" :style="{ width: '160px' }" />
      </t-form-item>
      <t-form-item :label="t('page.notify_subscription.label_max_per_hour')">
        <div>
          <t-input-number v-model="form.throttle.max_per_hour" :min="0" :max="10000" theme="normal" :style="{ width: '160px' }" />
          <div class="form-tip">{{ t('page.notify_subscription.max_per_hour_tip') }}</div>
        </div>
      </t-form-item>
      <t-form-item :label="t('page.notify_subscription.label_dedup_keys')">
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
      <t-form-item :label="t('page.notify_subscription.global_debug_mode')">
        <div>
          <t-switch v-model="form.debug_mode" />
          <div class="form-tip">{{ t('page.notify_subscription.global_debug_mode_tip') }}</div>
        </div>
      </t-form-item>

      <t-form-item style="float: right">
        <t-button variant="outline" @click="handleClose">{{ t('common.close') }}</t-button>
        <t-button theme="primary" :loading="saving" :style="{ marginLeft: '8px' }" @click="handleSubmit">
          {{ t('common.confirm') }}
        </t-button>
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';

import { getNotifyGlobalThrottle, updateNotifyGlobalThrottle } from '@/apis/notify_subscription';

const props = defineProps<{ visible: boolean }>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'saved'): void;
}>();

const { t } = useI18n();

const innerVisible = ref(false);
const saving = ref(false);
const cooldownStepsText = ref('60,300,900');
const form = ref({
  mode: 'aggregate',
  debug_mode: false,
  throttle: {
    aggregate_window_sec: 10,
    aggregate_max_detail: 10,
    cooldown_steps_sec: [] as number[],
    cooldown_reset_sec: 1800,
    max_per_hour: 0,
    dedup_keys: ['message_type', 'domain', 'attack_type'] as string[],
    quiet_hours: '',
    quiet_hours_bypass_severity: '',
  },
});

watch(
  () => props.visible,
  (val) => {
    innerVisible.value = val;
    if (val) loadConfig();
  },
);

async function loadConfig() {
  try {
    const res = await getNotifyGlobalThrottle();
    if (res.code === 0) {
      form.value.mode = res.data.mode || 'aggregate';
      form.value.debug_mode = !!res.data.debug_mode;
      Object.assign(form.value.throttle, res.data.throttle || {});
      if (!Array.isArray(form.value.throttle.dedup_keys)) form.value.throttle.dedup_keys = [];
      cooldownStepsText.value = (form.value.throttle.cooldown_steps_sec || []).join(',');
    }
  } catch (e) {
    console.error(e);
  }
}

async function handleSubmit() {
  const steps = (cooldownStepsText.value || '')
    .split(/[\n,]/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);

  saving.value = true;
  try {
    const res = await updateNotifyGlobalThrottle({
      mode: form.value.mode,
      debug_mode: form.value.debug_mode,
      throttle: { ...form.value.throttle, cooldown_steps_sec: steps },
    });
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

function handleClose() {
  innerVisible.value = false;
  emit('update:visible', false);
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  line-height: 1.6;
}
</style>
