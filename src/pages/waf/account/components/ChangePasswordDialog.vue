<template>
  <t-dialog
    v-model:visible="innerVisible"
    :header="t('page.account.change_password')"
    :width="560"
    :footer="false"
    :close-btn="!forced"
    :close-on-overlay-click="!forced"
    :close-on-esc-keydown="!forced"
  >
    <t-alert v-if="forced && reason" theme="warning" :message="reason" :style="{ marginBottom: '12px' }" />
    <t-form :data="formData" :rules="rules" :label-width="120" @submit="onSubmit">
      <t-form-item v-if="!hideOld" :label="t('page.account.old_password')" name="old_password">
        <t-input
          v-model="formData.old_password"
          type="password"
          :style="{ width: '380px' }"
          :placeholder="t('common.placeholder') + t('page.account.old_password')"
        />
      </t-form-item>
      <t-form-item :label="t('page.account.new_password')" name="new_password">
        <t-input
          v-model="formData.new_password"
          type="password"
          :style="{ width: '380px' }"
          :placeholder="t('common.placeholder') + t('page.account.new_password')"
        />
      </t-form-item>
      <t-form-item :label="t('page.account.confirm_password')" name="new_password2">
        <t-input
          v-model="formData.new_password2"
          type="password"
          :style="{ width: '380px' }"
          :placeholder="t('common.placeholder') + t('page.account.confirm_password')"
        />
      </t-form-item>
      <t-form-item style="float: right">
        <t-button v-if="!forced" variant="outline" @click="innerVisible = false">{{ t('common.close') }}</t-button>
        <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps } from 'tdesign-vue-next';

import { account_change_my_password_api } from '@/apis/account';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    // forced=true 用于首次登录/口令到期强制改密：不可关闭
    forced?: boolean;
    reason?: string;
    // 强制改密场景下，用户刚登录用的密码即旧密码，可预置后隐藏旧密码输入
    presetOldPassword?: string;
  }>(),
  {
    forced: false,
    reason: '',
    presetOldPassword: '',
  },
);

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'success'): void;
}>();

const { t } = useI18n();

const formData = ref({ old_password: '', new_password: '', new_password2: '' });

const rules: FormProps['rules'] = {
  old_password: [{ required: true, message: t('common.placeholder') + t('page.account.old_password'), type: 'error' }],
  new_password: [{ required: true, message: t('common.placeholder') + t('page.account.new_password'), type: 'error' }],
  new_password2: [{ required: true, message: t('common.placeholder') + t('page.account.confirm_password'), type: 'error' }],
};

const innerVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit('update:visible', val),
});

const hideOld = computed(() => props.forced && !!props.presetOldPassword);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      // 每次打开清空输入
      formData.value = { old_password: '', new_password: '', new_password2: '' };
    }
  },
);

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  if (formData.value.new_password !== formData.value.new_password2) {
    MessagePlugin.warning(t('page.account.password_mismatch_warning'));
    return;
  }
  const oldPwd = hideOld.value ? props.presetOldPassword : formData.value.old_password;
  account_change_my_password_api({
    old_password: oldPwd,
    new_password: formData.value.new_password,
    new_password2: formData.value.new_password2,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        innerVisible.value = false;
        emit('success');
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
};
</script>
