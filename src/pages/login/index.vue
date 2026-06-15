<template>
  <div class="login-wrapper">
    <div class="login-container">
      <h1 class="login-title">{{ t('login.login_sub_title') }}</h1>
      <t-form
        :data="formData"
        :rules="rules"
        label-width="0"
        @submit="onSubmit"
      >
        <t-form-item name="account">
          <t-input v-model="formData.account" size="large" clearable :placeholder="t('login.input_account_placeholder')">
            <template #prefix-icon><user-icon /></template>
          </t-input>
        </t-form-item>
        <t-form-item name="password">
          <t-input
            v-model="formData.password"
            size="large"
            :type="showPsw ? 'text' : 'password'"
            clearable
            :placeholder="t('login.input_password_placeholder')"
          >
            <template #prefix-icon><lock-on-icon /></template>
            <template #suffix-icon>
              <browse-icon v-if="showPsw" style="cursor: pointer" @click="showPsw = !showPsw" />
              <browse-off-icon v-else style="cursor: pointer" @click="showPsw = !showPsw" />
            </template>
          </t-input>
        </t-form-item>
        <!-- 安全码：仅在后端返回需要安全码（code=-2）时显示 -->
        <t-form-item v-if="showSecretCode" name="secretCode">
          <t-input
            v-model="formData.secretCode"
            size="large"
            type="password"
            clearable
            :placeholder="t('login.input_secret_code_placeholder')"
          >
            <template #prefix-icon><secured-icon /></template>
          </t-input>
        </t-form-item>
        <t-form-item>
          <t-button block size="large" type="submit" :loading="loading">
            {{ t('login.login_btn_title') }}
          </t-button>
        </t-form-item>
      </t-form>
    </div>

    <footer class="copyright">
      Copyright @ 2022-{{ new Date().getFullYear() }} SamWaf. All Rights Reserved
      <t-link theme="primary" @click="handleJumpOnlineUrl">{{ t('login.login_has_question') }}</t-link>
      <a href="https://doc.samwaf.com" target="_blank">{{ t('login.login_online_document') }}</a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps } from 'tdesign-vue-next';
import { UserIcon, LockOnIcon, SecuredIcon, BrowseIcon, BrowseOffIcon } from 'tdesign-icons-vue-next';
import { useUserStore } from '@/store/modules/user';
import { CODE } from '@/utils/request';
import { getSafeRedirectUrl } from '@/constants';
import { getOnlineUrl } from '@/utils/usuallytool';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const showPsw = ref(false);
const showSecretCode = ref(false);

const formData = reactive({
  account: '',
  password: '',
  secretCode: '',
});

const rules: FormProps['rules'] = {
  account: [{ required: true, message: t('login.rule.account'), type: 'error' }],
  password: [{ required: true, message: t('login.rule.password'), type: 'error' }],
};

const onSubmit: FormProps['onSubmit'] = async ({ validateResult }) => {
  if (validateResult !== true) return;
  loading.value = true;
  try {
    const res = await userStore.login({
      login_account: formData.account,
      login_password: formData.password,
      login_otp_secret_code: formData.secretCode,
    });
    if (res.code === CODE.REQUEST_SUCCESS) {
      MessagePlugin.success(t('login.login_success'));
      const redirect = (route.query.redirect as string) || getSafeRedirectUrl();
      router.replace(redirect);
    } else if (res.code === CODE.NEED_OTP_CODE) {
      // 该账号开启了 2FA，显示安全码输入框让用户补填
      showSecretCode.value = true;
      formData.secretCode = '';
      MessagePlugin.error(res.msg);
    } else {
      MessagePlugin.error(res.msg || 'Login failed');
    }
  } catch (e: any) {
    MessagePlugin.error(e?.message || 'Network error');
  } finally {
    loading.value = false;
  }
};

function handleJumpOnlineUrl() {
  window.open(getOnlineUrl());
}
</script>

<style scoped>
.login-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--td-bg-color-page);
}

.login-container {
  width: 400px;
  padding: 40px 32px;
  border-radius: var(--td-radius-large);
  background: var(--td-bg-color-container);
  box-shadow: var(--td-shadow-1);
}

.login-title {
  margin: 0 0 32px;
  font-size: 24px;
  text-align: center;
}

.copyright {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 24px;
  text-align: center;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}

.copyright a,
.copyright .t-link {
  margin-left: 8px;
  margin-right: 0;
  font-size: 12px;
}
</style>
