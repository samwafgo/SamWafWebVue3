<template>
  <div class="health-status-container">
    <t-tooltip placement="top" theme="light">
      <t-tag
        theme="primary"
        :variant="hasUnhealthyServer ? 'dark' : 'light'"
        :style="{
          backgroundColor: hasUnhealthyServer ? '#fbe9e7' : '#e8f4ff',
          color: hasUnhealthyServer ? '#e34d59' : '#00a870',
        }"
      >
        {{ unhealthyCount === 0 ? t('page.host.healthy_status_normal') : `${healthyStatusList.length}/${unhealthyCount}` }}
      </t-tag>
      <template #content>
        <div class="health-status-tooltip">
          <div class="tooltip-content-wrapper">
            <!-- 每个服务器的详细信息 -->
            <div v-for="(status, index) in healthyStatusList" :key="index" class="server-section">
              <div class="server-title" :class="status.IsHealthy ? 'healthy-text' : 'unhealthy-text'">
                {{ getServerInfo(status) }}: {{ status.IsHealthy ? t('page.host.healthy_status_normal') : t('page.host.healthy_status_abnormal') }}
              </div>
              <table class="status-table">
                <tr>
                  <td class="label">{{ t('page.host.healthy_status_detail.check_time') }}</td>
                  <td class="value">{{ formatTime(status.LastCheckTime) }}</td>
                </tr>
                <tr v-if="!status.IsHealthy">
                  <td class="label">{{ t('page.host.healthy_status_detail.success_cnt') }}</td>
                  <td class="value">{{ status.SuccessCount || 0 }}</td>
                </tr>
                <tr v-if="!status.IsHealthy">
                  <td class="label">{{ t('page.host.healthy_status_detail.failure_cnt') }}</td>
                  <td class="value">{{ status.FailCount }}</td>
                </tr>
                <tr v-if="!status.IsHealthy && status.LastErrorReason">
                  <td class="label error-text">{{ t('page.host.healthy_status_detail.error_reason') }}</td>
                  <td class="value error-text">{{ status.LastErrorReason }}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </template>
    </t-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ healthyStatusList: Record<string, any>[] }>();

const { t } = useI18n();

const hasUnhealthyServer = computed(() => props.healthyStatusList.some((status) => !status.IsHealthy));
const unhealthyCount = computed(() => props.healthyStatusList.filter((status) => !status.IsHealthy).length);

function formatTime(time: string | number) {
  return new Date(time).toLocaleString();
}

function getServerInfo(status: Record<string, any>) {
  return `${status.BackIP}:${status.BackPort}`;
}
</script>

<style scoped>
.health-status-container {
  display: inline-block;
}

.health-status-tooltip {
  min-width: 400px;
}

.tooltip-content-wrapper {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

.tooltip-content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.tooltip-content-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.tooltip-content-wrapper::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.tooltip-content-wrapper::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}

.server-section {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px dashed #ddd;
}

.server-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.server-title {
  font-weight: bold;
  margin-bottom: 8px;
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

.healthy-text {
  color: #00a870;
}

.unhealthy-text {
  color: #e34d59;
}

.error-text {
  color: #e34d59;
}
</style>
