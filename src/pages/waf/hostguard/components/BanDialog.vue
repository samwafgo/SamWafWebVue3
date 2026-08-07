<template>
  <t-dialog
    :header="t('page.hostguard.ban_dialog_title')"
    :visible="visible"
    :width="560"
    :footer="false"
    @close="onClose"
  >
    <template #body>
      <t-form :data="formData" :rules="rules" :label-width="110" @submit="onSubmit">
        <t-form-item :label="t('page.hostguard.col_ip')" name="ip">
          <t-input v-model="formData.ip" :style="{ width: '360px' }" />
        </t-form-item>
        <t-form-item :label="t('page.hostguard.ban_minutes')" name="ban_minutes">
          <t-input-number v-model="formData.ban_minutes" :min="0" theme="column" :style="{ width: '360px' }" />
          <div class="desc">{{ t('page.hostguard.ban_minutes_desc') }}</div>
        </t-form-item>
        <t-form-item :label="t('page.hostguard.ban_reason')" name="reason">
          <t-input v-model="formData.reason" :style="{ width: '360px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClose">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit" style="margin-left: 8px">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </template>
  </t-dialog>
</template>

<script setup lang="ts">
import { MessagePlugin, type FormProps } from 'tdesign-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { wafHostGuardBanManualApi } from '@/apis/hostguard';

const { t } = useI18n();

const props = defineProps({
  visible: { type: Boolean, default: false },
  ip: { type: String, default: '' },
  source: { type: String, default: 'ssh' },
});

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'done'): void;
}>();

const formData = ref<Record<string, any>>({ ip: '', ban_minutes: 60, reason: '', source: 'ssh' });

const rules = computed<FormProps['rules']>(() => ({
  ip: [{ required: true, message: t('common.required'), type: 'error' }],
}));

watch(
  () => props.visible,
  (val) => {
    if (val) {
      formData.value = {
        ip: props.ip,
        ban_minutes: 60,
        reason: '',
        source: props.source || 'ssh',
      };
    }
  },
);

function onClose() {
  emit('update:visible', false);
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  wafHostGuardBanManualApi(formData.value)
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        onClose();
        emit('done');
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch(() => {});
};
</script>

<style scoped>
/* 说明文字独占一行，别和控件抢 flex 行内空间，
   否则控件被压窄、radio/按钮组会换行竖排 */
:deep(.t-form__controls-content) {
  flex-wrap: wrap;
}
.desc {
  flex-basis: 100%;
  width: 100%;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}
</style>
