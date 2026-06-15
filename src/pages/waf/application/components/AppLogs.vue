<template>
  <div>
    <t-row justify="space-between" style="margin-bottom: 12px">
      <t-button size="small" @click="loadLogs">{{ t('common.refresh') }}</t-button>
      <t-button size="small" theme="danger" @click="clearLogs">{{ t('page.application.clear_logs') }}</t-button>
    </t-row>
    <div ref="logBox" class="log-box">
      <div v-if="logs.length === 0" class="log-empty">{{ t('page.application.no_logs') }}</div>
      <div v-for="(line, idx) in logs" :key="idx" class="log-line">{{ line }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';

import { wafAppClearLogsApi, wafAppLogsApi } from '@/apis/application';

const props = defineProps({
  appCode: { type: String, default: '' },
});

const { t } = useI18n();

const logs = ref<string[]>([]);
const logBox = ref<HTMLElement>();

onMounted(() => {
  loadLogs();
});

function loadLogs() {
  if (!props.appCode) return;
  wafAppLogsApi({ code: props.appCode }).then((res) => {
    if (res && res.code === 0) {
      logs.value = res.data.logs || [];
      nextTick(() => {
        if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight;
      });
    }
  });
}

function clearLogs() {
  wafAppClearLogsApi({ code: props.appCode }).then((res) => {
    if (res && res.code === 0) {
      logs.value = [];
      MessagePlugin.success(t('page.application.logs_cleared'));
    }
  });
}
</script>

<style scoped>
.log-box {
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  height: 400px;
  overflow-y: auto;
  padding: 12px;
  border-radius: 4px;
}

.log-line {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-empty {
  color: #888;
  text-align: center;
  margin-top: 180px;
}
</style>
