<template>
  <div>
    <t-card class="list-card-container">
      <t-alert theme="info" :message="t('page.otp.alert_message')" close>
        <template #operation>
          <span @click="handleJumpOnlineUrl">{{ t('common.online_document') }}</span>
        </template>
      </t-alert>
      <div class="table-container">
        <t-form v-if="!isBind" ref="bindForm" :data="formData" :rules="rules" :label-width="200" @submit="onBindSubmit">
          <t-form-item style="text-align: center">
            <qrcode-vue :value="formData.url" :size="qrSize" level="H" />
            <t-popup :content="formData.secret">
              <t-button variant="outline">{{ t('page.otp.cannot_scan') }}</t-button>
            </t-popup>
          </t-form-item>
          <t-form-item :label="t('page.otp.issuer')" name="issuer">
            <t-input v-model="formData.issuer" :style="{ width: '480px' }" :placeholder="t('page.otp.issuer_placeholder')"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.otp.secret_code')" name="secret_code">
            <t-input v-model="formData.secret_code" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item style="float: right">
            <t-button theme="primary" type="submit">{{ t('page.otp.bind') }}</t-button>
          </t-form-item>
        </t-form>

        <t-alert v-if="isBind" theme="success" close :max-line="1">
          <span>{{ t('page.otp.bind_success_tip') }}</span>
          <t-form ref="unBindForm" :data="formBindData" :rules="rules" :label-width="200" @submit="onUnBindSubmit">
            <t-form-item :label="t('page.otp.issuer')" name="issuer">
              <t-input
                v-model="formBindData.issuer"
                :style="{ width: '480px' }"
                :readonly="true"
                :placeholder="t('page.otp.current_issuer')"
              ></t-input>
            </t-form-item>
            <t-form-item :label="t('page.otp.secret_code')" name="secret_code">
              <t-input v-model="formBindData.secret_code" :style="{ width: '480px' }"></t-input>
            </t-form-item>
            <t-form-item style="float: right">
              <t-button theme="primary" type="submit">{{ t('page.otp.unbind') }}</t-button>
            </t-form-item>
          </t-form>
        </t-alert>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps } from 'tdesign-vue-next';
import QrcodeVue from 'qrcode.vue';

import { wafOtpBindApi, wafOtpInitApi, wafOtpUnBindApi } from '@/apis/otp';
import { getOnlineUrl } from '@/utils/usuallytool';

const { t } = useI18n();

const formData = ref<Record<string, any>>({
  user_name: '',
  url: '',
  secret: '',
  issuer: '',
  remarks: '',
  secret_code: '',
});
const formBindData = ref({
  id: '',
  issuer: '',
  secret_code: '',
});

const rules: FormProps['rules'] = {
  secret_code: [{ required: true, message: t('common.placeholder') + t('page.otp.secret_code'), type: 'error' }],
};

// 是否已绑定
const isBind = ref(false);
const qrSize = 300;

onMounted(() => {
  loadInitData();
});

// 当用户修改 Issuer 时，重新生成 OTP URL
watch(
  () => formData.value.issuer,
  (newIssuer) => {
    if (newIssuer && formData.value.secret && formData.value.user_name) {
      const encodedIssuer = encodeURIComponent(newIssuer);
      const encodedAccount = encodeURIComponent(formData.value.user_name);
      const encodedSecret = encodeURIComponent(formData.value.secret);
      formData.value.url = `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${encodedSecret}&issuer=${encodedIssuer}`;
    }
  },
);

function loadInitData() {
  return new Promise<void>((resolve, reject) => {
    wafOtpInitApi()
      .then((res) => {
        if (res.code === 0) {
          if (res.data.id === undefined) {
            isBind.value = false;
            formData.value = { ...res.data, secret_code: '' };
          } else {
            isBind.value = true;
            formBindData.value.secret_code = '';
            formBindData.value.id = res.data.id;
            formBindData.value.issuer = res.data.issuer || '';
          }
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        reject(e);
      });
  });
}

const onBindSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafOtpBindApi({ ...formData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          isBind.value = true;
          loadInitData();
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

const onUnBindSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafOtpUnBindApi({ ...formBindData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          isBind.value = false;
          loadInitData();
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/Otp.html`);
}
</script>

<style scoped>
.search-input {
  width: 360px;
}

.t-button + .t-button {
  margin-left: 8px;
}
</style>
