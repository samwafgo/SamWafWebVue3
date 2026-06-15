<template>
  <t-popup expand-animation placement="bottom-right" trigger="hover" :visible="isMonitorVisible" @visible-change="onPopupVisibleChange">
    <template #content>
      <div class="system-monitor-panel">
        <div class="monitor-header">
          <p>{{ t('topNav.system_monitor') }}</p>
          <t-button v-if="!loading" class="refresh-btn" variant="text" theme="primary" :loading="loading" @click="refreshData">
            <template #icon><refresh-icon /></template>
            {{ t('common.refresh') }}
          </t-button>
        </div>

        <div class="monitor-content" :class="{ 'loading-state': loading }">
          <!-- 错误状态 -->
          <div v-if="error && !loading" class="monitor-error">
            <span>{{ t('topNav.load_failed') }}</span>
            <t-button size="small" theme="primary" @click="refreshData">
              {{ t('topNav.retry') }}
            </t-button>
          </div>

          <div class="monitor-data" :class="{ 'data-loading': loading }">
            <!-- CPU信息 -->
            <div class="monitor-item">
              <div class="item-header">
                <span class="item-label">CPU</span>
                <span class="item-value" :style="{ color: getUsageColor(cpuUsage) }">{{ cpuUsage }}%</span>
              </div>
              <t-progress :percentage="cpuUsage" :color="getUsageColor(cpuUsage)" size="small" :label="false" />
            </div>

            <!-- 内存信息 -->
            <div class="monitor-item">
              <div class="item-header">
                <span class="item-label">{{ t('topNav.memory') }}</span>
                <span class="item-value" :style="{ color: getUsageColor(memoryUsage) }">{{ memoryUsage }}%</span>
              </div>
              <t-progress :percentage="memoryUsage" :color="getUsageColor(memoryUsage)" size="small" :label="false" />
            </div>

            <!-- 磁盘信息 -->
            <div v-if="diskList.length > 0" class="disk-section">
              <div class="section-title">{{ t('topNav.disk') }}</div>
              <div class="disk-list">
                <div v-for="disk in diskList" :key="disk.mount_point || disk.file_system" class="disk-item">
                  <div class="item-header">
                    <span class="item-label">{{ disk.mount_point || disk.file_system }}</span>
                    <span class="item-value" :style="{ color: getUsageColor(getDiskUsage(disk)) }">{{ getDiskUsage(disk) }}%</span>
                  </div>
                  <t-progress :percentage="getDiskUsage(disk)" :color="getUsageColor(getDiskUsage(disk))" size="small" :label="false" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="monitor-footer">
          <t-button class="detail-btn" variant="text" theme="primary" @click="goToMonitorPage">
            {{ t('topNav.view_details') }}
          </t-button>
        </div>
      </div>
    </template>

    <!-- 触发器 - 直观显示系统状态 -->
    <div class="system-monitor-trigger" @click="isMonitorVisible = true">
      <div class="monitor-display">
        <div class="monitor-item-inline">
          <span class="label">CPU</span>
          <span class="value" :style="{ color: getUsageColor(cpuUsage) }"> {{ cpuUsage }}% </span>
        </div>
        <div class="monitor-item-inline">
          <span class="label">{{ t('topNav.memory') }}</span>
          <span class="value" :style="{ color: getUsageColor(memoryUsage) }"> {{ memoryUsage }}% </span>
        </div>
        <div v-if="averageDiskUsage > 0" class="monitor-item-inline">
          <span class="label">{{ t('topNav.disk') }}</span>
          <span class="value" :style="{ color: getUsageColor(averageDiskUsage) }"> {{ averageDiskUsage }}% </span>
        </div>
      </div>
      <div class="status-indicator" :class="overallStatusClass"></div>
    </div>
  </t-popup>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { RefreshIcon } from 'tdesign-icons-vue-next';

import { getSystemMonitorApi } from '@/apis/monitor';
import { useStatsStore } from '@/store/modules/stats';

const { t } = useI18n();
const router = useRouter();
const statsStore = useStatsStore();

const loading = ref(false);
const error = ref(false);
const isMonitorVisible = ref(false);

const cpuUsage = computed(() => Math.round(statsStore.getCpuUsage));
const memoryUsage = computed(() => Math.round(statsStore.getMemoryUsage));
const diskList = computed(() => statsStore.getDiskList);
const averageDiskUsage = computed(() => Math.round(statsStore.getAverageDiskUsage));

const overallStatusClass = computed(() => {
  const maxUsage = Math.max(cpuUsage.value, memoryUsage.value, averageDiskUsage.value);
  if (maxUsage >= 90) return 'overall-critical';
  if (maxUsage >= 70) return 'overall-warning';
  if (maxUsage >= 50) return 'overall-caution';
  return 'overall-normal';
});

onMounted(() => {
  fetchSystemInfo();
});

function onPopupVisibleChange(visible: boolean, context: any) {
  if (context?.trigger === 'trigger-element-click') {
    isMonitorVisible.value = true;
    return;
  }
  isMonitorVisible.value = visible;
}

// 获取系统监控数据
function fetchSystemInfo() {
  loading.value = true;
  error.value = false;
  getSystemMonitorApi()
    .then((res) => {
      if (res.code === 0) {
        statsStore.setSystemMonitor(res.data);
      } else {
        error.value = true;
      }
    })
    .catch(() => {
      error.value = true;
    })
    .finally(() => {
      loading.value = false;
    });
}

function getDiskUsage(disk: Record<string, any>) {
  return Math.round(disk.usage_percent || 0);
}

function refreshData() {
  fetchSystemInfo();
}

// 跳转到监控页面
function goToMonitorPage() {
  router.push('/dashboard/stats');
  isMonitorVisible.value = false;
}

// 根据使用率获取颜色
function getUsageColor(percentage: number) {
  if (percentage >= 90) return '#e34d59'; // 红色
  if (percentage >= 70) return '#ed7b2f'; // 橙色
  if (percentage >= 50) return '#f2bd27'; // 黄色
  return '#00a870'; // 绿色
}
</script>

<style scoped>
/* 系统监控面板样式 */
.system-monitor-panel {
  width: 400px;
  height: 450px;
}

.monitor-header {
  position: relative;
  height: 56px;
  font-size: 16px;
  color: var(--td-text-color-primary);
  text-align: center;
  line-height: 56px;
  border-bottom: 1px solid var(--td-component-border);
}

.monitor-header .refresh-btn {
  position: absolute;
  top: 12px;
  right: 16px;
}

.monitor-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--td-text-color-secondary);
  font-size: 14px;
  flex-direction: column;
  z-index: 10;
}

.monitor-content {
  padding: 16px;
  height: calc(100% - 104px);
  overflow-y: auto;
  position: relative;
}

.monitor-content.loading-state .monitor-data {
  opacity: 0.6;
  pointer-events: none;
}

.monitor-data {
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: opacity 0.3s ease;
}

.monitor-data.data-loading {
  opacity: 0.6;
}

.monitor-footer {
  height: 48px;
  align-items: center;
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--td-component-border);
}

.monitor-footer .detail-btn {
  text-decoration: none;
  font-size: 14px;
  color: var(--td-brand-color);
  line-height: 48px;
  cursor: pointer;
}

/* 监控项样式 */
.monitor-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-label {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  font-weight: 500;
}

.item-value {
  font-size: 14px;
  color: var(--td-text-color-primary);
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.disk-section .section-title {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  font-weight: 500;
  margin-bottom: 12px;
}

.disk-section .disk-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disk-section .disk-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 触发器样式 */
.system-monitor-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-border-level-1-color);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 180px;
}

.system-monitor-trigger:hover {
  background: var(--td-bg-color-container-hover);
  border-color: var(--td-border-level-2-color);
}

.monitor-display {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.monitor-item-inline {
  display: flex;
  align-items: center;
  gap: 4px;
}

.monitor-item-inline .label {
  font-size: 11px;
  color: var(--td-text-color-secondary);
  font-weight: 500;
}

.monitor-item-inline .value {
  font-size: 12px;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  min-width: 28px;
  text-align: right;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.overall-normal {
  background: #00a870;
}

.status-indicator.overall-caution {
  background: #f2bd27;
}

.status-indicator.overall-warning {
  background: #ed7b2f;
}

.status-indicator.overall-critical {
  background: #e34d59;
}

@media (max-width: 768px) {
  .system-monitor-trigger {
    min-width: 120px;
  }

  .system-monitor-panel {
    width: 320px;
    height: 400px;
  }
}
</style>
