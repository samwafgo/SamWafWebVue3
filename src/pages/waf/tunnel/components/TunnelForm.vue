<template>
  <div>
    <t-form ref="form" :data="formData" :rules="rules" :label-width="150" @submit="onSubmit">
      <t-form-item :label="t('page.tunnel.name')" name="name">
        <t-input v-model="formData.name" :style="{ width: '480px' }"></t-input>
      </t-form-item>

      <t-form-item :label="t('page.tunnel.port')" name="port">
        <t-input v-model="formData.port" :style="{ width: '480px' }"></t-input>
      </t-form-item>

      <div class="form-row">
        <t-form-item :label="t('page.tunnel.protocol')" name="protocol" class="half-width">
          <t-select v-model="formData.protocol" clearable :style="{ width: '480px' }" :disabled="isEdit">
            <t-option value="tcp" label="TCP">TCP</t-option>
            <t-option value="udp" label="UDP">UDP</t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.tunnel.start_status')" name="start_status" class="half-width">
          <t-radio-group v-model="formData.start_status">
            <t-radio value="0">{{ t('common.off') }}</t-radio>
            <t-radio value="1">{{ t('common.on') }}</t-radio>
          </t-radio-group>
        </t-form-item>
      </div>
      <t-form-item :label="t('page.tunnel.remote_port')" name="remote_port">
        <t-input-number
          v-model="formData.remote_port"
          :style="{ width: '150px' }"
          :min="1"
          :max="65535"
          :placeholder="t('common.placeholder')"
        >
        </t-input-number>
      </t-form-item>

      <t-form-item :label="t('page.tunnel.remote_ip')" name="remote_ip">
        <t-input v-model="formData.remote_ip" :style="{ width: '480px' }"></t-input>
      </t-form-item>

      <t-form-item :label="t('page.tunnel.ip_version')" name="ip_version">
        <div>
          <t-select v-model="formData.ip_version" :style="{ width: '480px' }">
            <t-option value="ipv4" :label="t('page.tunnel.ip_version_ipv4')">IPv4</t-option>
            <t-option value="ipv6" :label="t('page.tunnel.ip_version_ipv6')">IPv6</t-option>
            <t-option value="both" :label="t('page.tunnel.ip_version_both')">IPv4 & IPv6</t-option>
          </t-select>
          <div style="color: #909399; font-size: 12px; margin-top: 4px">
            {{ t('page.tunnel.ip_version_tips') }}
          </div>
        </div>
      </t-form-item>

      <t-form-item v-if="formData.protocol === 'tcp'" :label="t('page.tunnel.ssl_status')" name="ssl_status">
        <div>
          <t-radio-group v-model="formData.ssl_status">
            <t-radio :value="0">{{ t('common.off') }}</t-radio>
            <t-radio :value="1">{{ t('common.on') }}</t-radio>
          </t-radio-group>
          <div style="color: #909399; font-size: 12px; margin-top: 4px">
            {{ t('page.tunnel.ssl_tips') }}
          </div>
        </div>
      </t-form-item>

      <template v-if="formData.protocol === 'tcp' && formData.ssl_status === 1">
        <t-form-item :label="t('page.tunnel.ssl_certificate')" name="ssl_certificate">
          <t-input v-model="formData.ssl_certificate" :style="{ width: '480px' }" placeholder="/home/nginx/cert/test.com.pem">
          </t-input>
        </t-form-item>

        <t-form-item :label="t('page.tunnel.ssl_certificate_key')" name="ssl_certificate_key">
          <t-input v-model="formData.ssl_certificate_key" :style="{ width: '480px' }" placeholder="/home/nginx/cert/test.com.key">
          </t-input>
        </t-form-item>

        <t-form-item :label="t('page.tunnel.ssl_protocols')" name="ssl_protocols">
          <t-input v-model="formData.ssl_protocols" :style="{ width: '480px' }" :placeholder="t('page.tunnel.ssl_protocols_placeholder')">
          </t-input>
        </t-form-item>
      </template>

      <div class="form-row">
        <t-form-item :label="t('page.tunnel.conn_timeout')" name="conn_timeout" class="half-width">
          <t-input-number v-model="formData.conn_timeout" :style="{ width: '150px' }" :min="0" :placeholder="t('common.placeholder')">
          </t-input-number>
        </t-form-item>

        <t-form-item :label="t('page.tunnel.read_timeout')" name="read_timeout" class="half-width">
          <t-input-number v-model="formData.read_timeout" :style="{ width: '150px' }" :min="0" :placeholder="t('common.placeholder')">
          </t-input-number>
        </t-form-item>
      </div>

      <div class="form-row">
        <t-form-item :label="t('page.tunnel.write_timeout')" name="write_timeout" class="half-width">
          <t-input-number v-model="formData.write_timeout" :style="{ width: '150px' }" :min="0" :placeholder="t('common.placeholder')">
          </t-input-number>
        </t-form-item>

        <t-form-item :label="t('page.tunnel.max_in_connect')" name="max_in_connect" class="half-width">
          <t-input-number v-model="formData.max_in_connect" :style="{ width: '150px' }" :min="0" :placeholder="t('common.placeholder')">
          </t-input-number>
        </t-form-item>
      </div>

      <t-form-item :label="t('page.tunnel.max_out_connect')" name="max_out_connect">
        <t-input-number v-model="formData.max_out_connect" :style="{ width: '150px' }" :min="0" :placeholder="t('common.placeholder')">
        </t-input-number>
      </t-form-item>

      <t-form-item :label="t('page.tunnel.remark')" name="remark">
        <t-input v-model="formData.remark" :style="{ width: '480px' }"></t-input>
      </t-form-item>

      <t-form-item style="float: right">
        <t-button variant="outline" @click="emit('close')">{{ t('common.close') }}</t-button>
        <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
      </t-form-item>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps } from 'tdesign-vue-next';

const props = defineProps({
  value: {
    type: Object,
    default: () => ({}),
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { result: Record<string, any> }): void;
}>();

const { t } = useI18n();

const formData = ref<Record<string, any>>({});

watch(
  () => props.value,
  (val) => {
    formData.value = { ...val };
  },
  { immediate: true, deep: true },
);

const rules: FormProps['rules'] = {
  name: [{ required: true, message: t('common.required'), type: 'error' }],
  port: [{ required: true, message: t('common.required'), type: 'error' }],
  protocol: [{ required: true, message: t('common.required'), type: 'error' }],
  remote_port: [{ required: true, message: t('common.required'), type: 'error' }],
  remote_ip: [{ required: true, message: t('common.required'), type: 'error' }],
};

const onSubmit: FormProps['onSubmit'] = ({ validateResult, firstError }) => {
  if (validateResult === true) {
    const postdata: Record<string, any> = { ...formData.value };
    postdata.remote_port = Number(postdata.remote_port);
    postdata.start_status = Number(postdata.start_status);
    postdata.conn_timeout = Number(postdata.conn_timeout);
    postdata.read_timeout = Number(postdata.read_timeout);
    postdata.write_timeout = Number(postdata.write_timeout);
    postdata.max_in_connect = Number(postdata.max_in_connect);
    postdata.max_out_connect = Number(postdata.max_out_connect);
    postdata.ssl_status = Number(postdata.ssl_status || 0);
    emit('submit', { result: postdata });
  } else {
    MessagePlugin.warning(firstError || '');
  }
};
</script>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -10px;
}

.form-row .half-width {
  flex: 0 0 50%;
  max-width: 50%;
  padding: 0 10px;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .form-row .half-width {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
</style>
