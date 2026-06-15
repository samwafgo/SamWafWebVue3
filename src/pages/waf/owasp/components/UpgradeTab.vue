<template>
  <div>
    <t-alert theme="warning" :message="t('page.owasp.upgrade.alert_message')" close />
    <t-descriptions :column="1" bordered>
      <t-descriptions-item :label="t('page.owasp.upgrade.current_version')">
        {{ info.current_version || '-' }}
      </t-descriptions-item>
      <t-descriptions-item :label="t('page.owasp.upgrade.latest_version')">
        {{ info.latest_version || '-' }}
      </t-descriptions-item>
      <t-descriptions-item :label="t('page.owasp.upgrade.need_update')">
        <t-tag v-if="info.need_update" theme="warning" variant="light">{{ t('page.owasp.upgrade.yes') }}</t-tag>
        <t-tag v-else theme="success" variant="light">{{ t('page.owasp.upgrade.no') }}</t-tag>
      </t-descriptions-item>
      <t-descriptions-item :label="t('page.owasp.upgrade.last_check_at')">
        {{ info.last_check_at || '-' }}
      </t-descriptions-item>
      <t-descriptions-item :label="t('page.owasp.upgrade.changelog')">
        <pre class="changelog">{{ info.changelog || '-' }}</pre>
      </t-descriptions-item>
    </t-descriptions>

    <div style="margin-top: 16px">
      <t-button theme="primary" :loading="checking" @click="onCheck">
        {{ t('page.owasp.upgrade.check') }}
      </t-button>
      <t-button theme="warning" :disabled="!info.need_update" :loading="applying" @click="onApply">
        {{ t('page.owasp.upgrade.apply') }}
      </t-button>
    </div>

    <t-alert v-if="applying" style="margin-top: 16px" theme="info" :message="t('page.owasp.upgrade.applying_tip')" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import { owaspUpdateApplyApi, owaspUpdateCheckApi } from '@/apis/owasp';

const { t } = useI18n();

const info = ref<Record<string, any>>({
  current_version: '',
  latest_version: '',
  need_update: false,
  last_check_at: '',
  changelog: '',
});
const checking = ref(false);
const applying = ref(false);

onMounted(() => {
  onCheck();
});

function onCheck() {
  checking.value = true;
  owaspUpdateCheckApi()
    .then((res) => {
      if (res.code === 0) {
        info.value = { ...info.value, ...res.data };
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .finally(() => {
      checking.value = false;
    });
}

function onApply() {
  applying.value = true;
  owaspUpdateApplyApi()
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .finally(() => {
      setTimeout(() => {
        applying.value = false;
        onCheck();
      }, 3000);
    });
}
</script>

<style scoped>
.changelog {
  white-space: pre-wrap;
  margin: 0;
}

.t-button + .t-button {
  margin-left: 8px;
}
</style>
