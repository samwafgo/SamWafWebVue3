<template>
  <div class="ssl-form">
    <t-form :data="formData" :rules="rules" :label-width="350" @submit="onSubmit">
      <!-- 编辑模式下显示有效期 -->
      <t-form-item v-if="isEdit" :label="t('page.ssl.label_domains')" name="domains">
        <span>{{ formData.domains }}</span>
      </t-form-item>
      <t-form-item v-if="isEdit && formData.valid_to" :label="t('page.ssl.label_valid_to')" name="valid_to">
        <span>{{ formData.valid_to }} ({{ formData.expiration_info }})</span>
      </t-form-item>
      <t-form-item
        v-if="isEdit && formData.bind_hosts && formData.bind_hosts.length > 0"
        :label="t('page.ssl.label_bind_hosts')"
        name="bind_hosts"
      >
        <div>
          <div v-for="(host, index) in formData.bind_hosts" :key="index" style="margin-bottom: 4px">
            {{ host }}
          </div>
        </div>
      </t-form-item>

      <t-form-item :label="t('page.ssl.label_cert_content')" name="cert_content">
        <t-textarea v-model="formData.cert_content" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
      </t-form-item>

      <t-form-item :label="t('page.ssl.label_key_content')" name="key_content">
        <t-textarea v-model="formData.key_content" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
      </t-form-item>

      <!-- 编辑模式下显示自动更新相关字段 -->
      <template v-if="isEdit">
        <t-form-item>
          <b>{{ t('page.ssl.label_auto_tip') }}</b>
        </t-form-item>
        <t-form-item :label="t('page.ssl.label_auto_crt_path')" name="cert_path">
          <t-textarea v-model="formData.cert_path" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
        </t-form-item>
        <t-form-item :label="t('page.ssl.label_auto_key_path')" name="key_path">
          <t-textarea v-model="formData.key_path" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
        </t-form-item>
      </template>

      <t-form-item style="float: right; margin-top: 5px">
        <t-button variant="outline" @click="emit('close')">{{ t('common.close') }}</t-button>
        <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
      </t-form-item>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps } from 'tdesign-vue-next';

const props = withDefaults(
  defineProps<{
    value: Record<string, any>;
    isEdit?: boolean;
  }>(),
  { isEdit: false },
);
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { result: Record<string, any> }): void;
}>();

const { t } = useI18n();

const formData = ref<Record<string, any>>(JSON.parse(JSON.stringify(props.value)));

const rules: FormProps['rules'] = {
  cert_content: [
    { required: true, message: t('common.select_placeholder') + t('page.ssl.label_cert_content'), type: 'error' },
  ],
  key_content: [
    { required: true, message: t('common.select_placeholder') + t('page.ssl.label_key_content'), type: 'error' },
  ],
};

watch(
  () => props.value,
  (newVal) => {
    formData.value = JSON.parse(JSON.stringify(newVal));
  },
  { deep: true },
);

const onSubmit: FormProps['onSubmit'] = ({ validateResult, firstError }) => {
  if (validateResult === true) {
    emit('submit', { result: formData.value });
  } else if (firstError) {
    MessagePlugin.warning(firstError);
  }
};
</script>
