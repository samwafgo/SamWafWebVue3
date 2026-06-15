<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { DialogPlugin } from 'tdesign-vue-next';
import { v4 as uuidv4 } from 'uuid';

import websocket from '@/utils/websocket';
import { AesDecrypt } from '@/utils/crypto';
import { clearLocalStorageExceptPreserved, saveCurrentUrl } from '@/constants';
import { useStatsStore } from '@/store/modules/stats';
import { useNotificationStore } from '@/store/modules/notification';
import { useSettingStore } from '@/store/modules/setting';

const env = import.meta.env.MODE || 'development';

const statsStore = useStatsStore();
const notificationStore = useNotificationStore();

let ws: WebSocket | null = null;
let disConnectTimer: ReturnType<typeof setTimeout> | null = null;
let reloadDialog: ReturnType<typeof DialogPlugin> | null = null;

function getSecurityPath(): string {
  if (window.__SAMWAF_SECURITY_PATH__) return window.__SAMWAF_SECURITY_PATH__;
  try {
    return localStorage.getItem('__samwaf_security_path__') || '';
  } catch {
    return '';
  }
}

function initWebSocket() {
  if (ws) return;
  const isHttps = window.location.protocol === 'https:';
  const secPath = getSecurityPath();
  const url =
    env === 'development'
      ? `ws://127.0.0.1:26666${secPath}/api/v1/ws`
      : `${isHttps ? 'wss' : 'ws'}://${window.location.host}${secPath}/api/v1/ws`;
  ws = websocket.useWebSocket(
    url,
    localStorage.getItem('access_token') || '',
    null,
    wsOnMessage,
    wsOnClose,
    wsOnError,
    [],
    30000, // 心跳间隔：30秒
    false, // 关闭工具内部重连，统一由 App.vue 控制
  );
}

function wsOnError(e: Event) {
  console.log(e, '消息通知错误回调，重新连接');
  ws = null;
  initWebSocket();
}

function wsOnMessage(e: MessageEvent) {
  if (e.data === 'pong') {
    return;
  }
  const wsData = JSON.parse(e.data);
  if (wsData.msg_code === '200') {
    const tmpSrcContent = AesDecrypt(wsData.msg_data);
    const msgData = JSON.parse(tmpSrcContent);
    wsData.msg_data = msgData;
    if (wsData.msg_cmd_type === 'RELOAD_PAGE') {
      if (reloadDialog) {
        reloadDialog.hide();
        reloadDialog = null;
      }
      reloadDialog = DialogPlugin({
        header: wsData.msg_data.message_type,
        body: wsData.msg_data.message_data,
        confirmBtn: '确认并刷新',
        onConfirm: () => {
          window.location.reload();
          reloadDialog?.hide();
        },
      });
      return;
    }
    if (wsData.msg_cmd_type === 'DOWNLOAD_LOG') {
      const token = localStorage.getItem('access_token') || '';
      const dlSecPath = getSecurityPath();
      let downloadUrl =
        env === 'development'
          ? `http://127.0.0.1:26666${dlSecPath}/api/v1/waflog/attack/download`
          : `${window.location.protocol}//${window.location.host}${dlSecPath}/api/v1/waflog/attack/download`;
      downloadUrl = `${downloadUrl}?X-Token=${token}&X-Request-Time=${Math.floor(Date.now() / 1000).toString()}&X-Request-Id=${uuidv4()}`;
      window.open(downloadUrl);
      return;
    }
    if (wsData.msg_cmd_type === 'SystemStats') {
      // 将统计信息传递给stats store
      if (wsData.msg_data.message_attach) {
        statsStore.addStatsData(wsData.msg_data.message_attach);
      }
      return;
    }
    notificationStore.addMsgData(wsData.msg_data);
  } else if (wsData.msg_code === '-999') {
    // 保存当前访问的URL
    saveCurrentUrl();
    clearLocalStorageExceptPreserved();
    console.log('鉴权失败');
  }
}

function wsOnClose() {
  // 意外关闭之后重新连接
  if (!disConnectTimer) {
    ws = null;
    disConnectTimer = setTimeout(() => {
      initWebSocket();
      disConnectTimer = null;
    }, 10000);
  }
}

onMounted(() => {
  // 应用本地保存的页面配置（暗黑模式/主题色）
  useSettingStore().initTheme();
  initWebSocket();
});
</script>
