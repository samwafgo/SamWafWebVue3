<template>
  <div>
    <!-- 负载均衡模式 -->
    <div v-if="isLoadBalance">
      <load-balance-status v-if="statusList.length > 0" :healthy-status-list="statusList" />
      <t-tag v-else theme="default" variant="light">{{ t('page.host.healthy_status_unknown') }}</t-tag>
    </div>

    <!-- 单服务器模式 -->
    <div v-else>
      <single-server-status v-if="statusList.length > 0" :healthy-status="statusList[0]" />
      <t-tag v-else theme="default" variant="light">{{ t('page.host.healthy_status_unknown') }}</t-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SingleServerStatus from './SingleServerStatus.vue';
import LoadBalanceStatus from './LoadBalanceStatus.vue';

const props = withDefaults(
  defineProps<{
    healthyStatus?: Record<string, any>[] | Record<string, any>;
    isLoadBalance?: boolean;
  }>(),
  { healthyStatus: () => [], isLoadBalance: false },
);

const { t } = useI18n();

const statusList = computed<Record<string, any>[]>(() =>
  Array.isArray(props.healthyStatus) ? props.healthyStatus : props.healthyStatus ? [props.healthyStatus] : [],
);
</script>
