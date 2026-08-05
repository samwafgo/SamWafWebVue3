<template>
  <t-dialog
    v-model:visible="innerVisible"
    :header="`${t('page.notify_subscription.batch_config_title')} - ${channelLabel}`"
    :width="640"
    :footer="false"
    @close="handleClose"
  >
    <t-form :label-width="130">
      <t-form-item :label="t('page.notify_subscription.label_throttle_mode')">
        <t-radio-group v-model="form.throttle_mode">
          <t-radio value="inherit">{{ t('page.notify_subscription.throttle_mode_inherit') }}</t-radio>
          <t-radio value="realtime">{{ t('page.notify_subscription.throttle_mode_realtime') }}</t-radio>
          <t-radio value="aggregate">{{ t('page.notify_subscription.throttle_mode_aggregate') }}</t-radio>
          <t-radio value="cooldown">{{ t('page.notify_subscription.throttle_mode_cooldown') }}</t-radio>
        </t-radio-group>
      </t-form-item>

      <t-form-item v-if="form.throttle_mode === 'aggregate'" :label="t('page.notify_subscription.label_aggregate_window')">
        <t-input-number v-model="form.throttle.aggregate_window_sec" :min="0" :max="3600" theme="normal" :style="{ width: '160px' }" />
      </t-form-item>

      <t-form-item v-if="form.throttle_mode === 'cooldown'" :label="t('page.notify_subscription.label_cooldown_steps')">
        <div>
          <t-input v-model="cooldownStepsText" placeholder="60,300,900" :style="{ width: '260px' }" />
          <div class="form-tip">{{ t('page.notify_subscription.cooldown_steps_tip') }}</div>
        </div>
      </t-form-item>

      <t-form-item v-if="form.throttle_mode !== 'inherit'" :label="t('page.notify_subscription.label_max_per_hour')">
        <div>
          <t-input-number v-model="form.throttle.max_per_hour" :min="0" :max="10000" theme="normal" :style="{ width: '160px' }" />
          <div class="form-tip">{{ t('page.notify_subscription.max_per_hour_tip') }}</div>
        </div>
      </t-form-item>

      <t-form-item v-if="form.throttle_mode !== 'inherit'" :label="t('page.notify_subscription.label_quiet_hours')">
        <div>
          <t-input v-model="form.throttle.quiet_hours" placeholder="23:00-07:00" :style="{ width: '200px' }" />
          <div class="form-tip">{{ t('page.notify_subscription.quiet_hours_tip') }}</div>
        </div>
      </t-form-item>

      <t-form-item>
        <!-- 只套用勾选的部分：批量最怕的就是把别人配好的模板一起覆盖掉 -->
        <t-checkbox v-model="applyThrottle">{{ t('page.notify_subscription.batch_config_apply_throttle') }}</t-checkbox>
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

import { batchNotifySubscriptionConfig } from '@/apis/notify_subscription';

const props = defineProps<{
  visible: boolean;
  channelType: string;
  channelLabel: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'saved'): void;
}>();

const { t } = useI18n();

const innerVisible = ref(false);
const saving = ref(false);
const applyThrottle = ref(true);
const cooldownStepsText = ref('');
const form = ref({
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
});

watch(
  () => props.visible,
  (val) => {
    innerVisible.value = val;
  },
);

async function handleSubmit() {
  if (!applyThrottle.value) {
    MessagePlugin.warning(t('page.notify_subscription.batch_config_apply_throttle'));
    return;
  }
  const steps = (cooldownStepsText.value || '')
    .split(/[\n,]/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);

  saving.value = true;
  try {
    const res = await batchNotifySubscriptionConfig({
      channel_type: props.channelType,
      throttle_mode: form.value.throttle_mode,
      throttle: { ...form.value.throttle, cooldown_steps_sec: steps },
      filter: { domains: [], exclude_ips: [], keywords: [], min_severity: '' },
      title_template: '',
      content_template: '',
      apply_throttle: true,
      apply_template: false,
      apply_filter: false,
    });
    if (res.code === 0) {
      MessagePlugin.success(
        t('page.notify_subscription.batch_config_success', { success: res.data.success, total: res.data.total }),
      );
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
}
</style>
