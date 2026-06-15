<template>
  <div class="transport-config">
    <t-form-item :label="t('page.host.transport.max_idle_conns')">
      <t-tooltip :content="t('page.host.transport.max_idle_conns_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-input-number
          v-model="localTransportConfig.max_idle_conns"
          :style="{ width: '150px' }"
          :min="0"
          :placeholder="t('page.host.transport.max_idle_conns_placeholder')"
          @change="updateParent"
        />
      </t-tooltip>
    </t-form-item>

    <t-form-item :label="t('page.host.transport.max_idle_conns_per_host')">
      <t-tooltip :content="t('page.host.transport.max_idle_conns_per_host_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-input-number
          v-model="localTransportConfig.max_idle_conns_per_host"
          :style="{ width: '150px' }"
          :min="0"
          :placeholder="t('page.host.transport.max_idle_conns_per_host_placeholder')"
          @change="updateParent"
        />
      </t-tooltip>
    </t-form-item>

    <t-form-item :label="t('page.host.transport.max_conns_per_host')">
      <t-tooltip :content="t('page.host.transport.max_conns_per_host_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-input-number
          v-model="localTransportConfig.max_conns_per_host"
          :style="{ width: '150px' }"
          :min="0"
          :placeholder="t('page.host.transport.max_conns_per_host_placeholder')"
          @change="updateParent"
        />
      </t-tooltip>
    </t-form-item>

    <t-form-item :label="t('page.host.transport.idle_conn_timeout')">
      <t-tooltip :content="t('page.host.transport.idle_conn_timeout_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-input-number
          v-model="localTransportConfig.idle_conn_timeout"
          :style="{ width: '150px' }"
          :min="0"
          :placeholder="t('page.host.transport.idle_conn_timeout_placeholder')"
          @change="updateParent"
        />
        <span class="unit-text">{{ t('common.seconds') }}</span>
      </t-tooltip>
    </t-form-item>

    <t-form-item :label="t('page.host.transport.tls_handshake_timeout')">
      <t-tooltip :content="t('page.host.transport.tls_handshake_timeout_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-input-number
          v-model="localTransportConfig.tls_handshake_timeout"
          :style="{ width: '150px' }"
          :min="0"
          :placeholder="t('page.host.transport.tls_handshake_timeout_placeholder')"
          @change="updateParent"
        />
        <span class="unit-text">{{ t('common.seconds') }}</span>
      </t-tooltip>
    </t-form-item>

    <t-form-item :label="t('page.host.transport.expect_continue_timeout')">
      <t-tooltip :content="t('page.host.transport.expect_continue_timeout_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-input-number
          v-model="localTransportConfig.expect_continue_timeout"
          :style="{ width: '150px' }"
          :min="0"
          :placeholder="t('page.host.transport.expect_continue_timeout_placeholder')"
          @change="updateParent"
        />
        <span class="unit-text">{{ t('common.seconds') }}</span>
      </t-tooltip>
    </t-form-item>

    <div class="config-note">
      <t-alert theme="info" :message="t('page.host.transport.config_note')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ transportConfig: Record<string, any> }>();
const emit = defineEmits<{ (e: 'update', config: Record<string, any>): void }>();

const { t } = useI18n();

const NUMERIC_FIELDS = [
  'max_idle_conns',
  'max_idle_conns_per_host',
  'max_conns_per_host',
  'idle_conn_timeout',
  'tls_handshake_timeout',
  'expect_continue_timeout',
];

const localTransportConfig = ref<Record<string, any>>({});

watch(
  () => props.transportConfig,
  (newVal) => {
    const copy = JSON.parse(JSON.stringify(newVal));
    // 确保所有字段都有默认值
    NUMERIC_FIELDS.forEach((field) => {
      if (!copy[field]) copy[field] = 0;
    });
    localTransportConfig.value = copy;
  },
  { immediate: true },
);

function updateParent() {
  emit('update', JSON.parse(JSON.stringify(localTransportConfig.value)));
}
</script>

<style scoped>
.transport-config .unit-text {
  margin-left: 8px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.transport-config .config-note {
  margin-top: 16px;
}
</style>
