<template>
  <div class="health-status-container">
    <t-tooltip placement="top" theme="light">
      <t-tag
        theme="primary"
        :variant="healthyStatus.IsHealthy ? 'light' : 'dark'"
        :style="{
          backgroundColor: healthyStatus.IsHealthy ? '#e8f4ff' : '#fbe9e7',
          color: healthyStatus.IsHealthy ? '#00a870' : '#e34d59',
        }"
      >
        {{ healthyStatus.IsHealthy ? t('page.host.healthy_status_normal') : t('page.host.healthy_status_abnormal') }}
      </t-tag>
      <template #content>
        <div class="health-status-tooltip">
          <table class="status-table">
            <tr>
              <td class="label">{{ t('page.host.healthy_status_detail.check_time') }}</td>
              <td class="value">{{ formatTime(healthyStatus.LastCheckTime) }}</td>
            </tr>
            <tr v-if="!healthyStatus.IsHealthy">
              <td class="label">{{ t('page.host.healthy_status_detail.success_cnt') }}</td>
              <td class="value">{{ healthyStatus.SuccessCount || 0 }}</td>
            </tr>
            <tr v-if="!healthyStatus.IsHealthy">
              <td class="label">{{ t('page.host.healthy_status_detail.failure_cnt') }}</td>
              <td class="value">{{ healthyStatus.FailCount }}</td>
            </tr>
            <tr v-if="!healthyStatus.IsHealthy && healthyStatus.LastErrorReason">
              <td class="label error-text">{{ t('page.host.healthy_status_detail.error_reason') }}</td>
              <td class="value error-text">{{ healthyStatus.LastErrorReason }}</td>
            </tr>
          </table>
        </div>
      </template>
    </t-tooltip>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{ healthyStatus: Record<string, any> }>();

const { t } = useI18n();

function formatTime(time: string | number) {
  return new Date(time).toLocaleString();
}
</script>

<style scoped>
.health-status-container {
  display: inline-block;
}

.health-status-tooltip {
  min-width: 300px;
}

.status-table {
  width: 100%;
  border-collapse: collapse;
}

.status-table tr {
  border-bottom: 1px solid #eee;
}

.status-table tr:last-child {
  border-bottom: none;
}

.status-table .label {
  padding: 6px;
  font-weight: 500;
  width: 40%;
}

.status-table .value {
  padding: 6px;
  text-align: right;
  width: 60%;
}

.status-table .error-text,
.error-text {
  color: #e34d59;
}
</style>
