<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { DialogPlugin } from 'tdesign-vue-next';
import { v4 as uuidv4 } from 'uuid';

import websocket from '@/utils/websocket';
import bus from '@/utils/bus';
import { AesDecrypt } from '@/utils/crypto';
import { clearLocalStorageExceptPreserved, saveCurrentUrl } from '@/constants';
import { useStatsStore } from '@/store/modules/stats';
import { useNotificationStore } from '@/store/modules/notification';
import { useSettingStore } from '@/store/modules/setting';
import { GetSystemParamsApi } from '@/apis/sysinfo';

const env = import.meta.env.MODE || 'development';

const statsStore = useStatsStore();
const notificationStore = useNotificationStore();

// WebSocket 断线重连的指数退避参数。
// 后端会主动踢掉写超时(5s)/读超时(90s)的死连接，掉线后固定等 10s 再连的话，
// 这段空窗期内的即时通知(IP封禁、操作结果等)是收不到的——服务端不补发。
// 所以改成 1s 起、每次翻倍、封顶 10s：偶发断开几乎无感，后端真挂了也不会疯狂重试。
const WS_RECONNECT_BASE_DELAY = 1000;
const WS_RECONNECT_MAX_DELAY = 10000;
// 连接活过这个时长才算「连上过」，重连间隔才复位。
// 否则鉴权失败(-999)这类「一连上就被踢」的场景会退化成 1s 一次的死循环。
const WS_STABLE_THRESHOLD = 30000;

let ws: WebSocket | null = null;
let disConnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = WS_RECONNECT_BASE_DELAY;
let wsOpenedAt = 0;
let wsGeneration = 0;
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
  // 代次：本次连接的身份标记。旧连接的事件迟到时靠它识别并丢弃，
  // 否则「已废弃连接的 close 事件」会把 ws（此时已指向新的活连接）置空并再排一次重连，
  // 于是又漏出一条连接——线上就是这样一路裂变出十几条并存连接，
  // 一条广播被同一个页面收 N 次，通知就重复 N 条。
  const gen = ++wsGeneration;
  ws = websocket.useWebSocket(
    url,
    localStorage.getItem('access_token') || '',
    () => wsOnOpen(gen),
    (e) => wsOnMessage(e, gen),
    () => wsOnClose(gen),
    (e) => wsOnError(e, gen),
    [],
    30000, // 心跳间隔：30秒
    false, // 关闭工具内部重连，统一由 App.vue 控制
  );
}

// 是否为当前连接发来的事件；过期连接的一律忽略
function isCurrentWs(gen: number) {
  return gen === wsGeneration;
}

function wsOnOpen(gen: number) {
  if (!isCurrentWs(gen)) return;
  wsOpenedAt = Date.now();
}

// 统一的重连入口：onerror 与 onclose 都走这里。
// 一次断开通常会先后触发 error 和 close 两个事件，靠 disConnectTimer 去重，
// 避免像以前那样 error 里立刻重连、close 里又排一次，连出两条连接。
function scheduleReconnect(gen: number) {
  if (!isCurrentWs(gen)) return; // 旧连接的迟到事件，不能影响当前连接
  if (disConnectTimer) return;

  // 连接稳定活过一段时间再断，视为偶发掉线，退避间隔复位
  if (wsOpenedAt && Date.now() - wsOpenedAt >= WS_STABLE_THRESHOLD) {
    reconnectDelay = WS_RECONNECT_BASE_DELAY;
  }
  wsOpenedAt = 0;
  // 显式关掉被丢弃的连接：不关的话它在服务端一直活着、继续收广播，
  // 页面里它的监听器也还在，就会把同一条通知重复推进 store。
  // 它迟到的 close 事件会被上面的代次校验挡掉，不会再触发一次重连。
  try {
    ws?.close();
  } catch {
    /* ignore */
  }
  ws = null;

  const delay = reconnectDelay;
  console.log(`WebSocket 已断开，${delay}ms 后重连`);
  disConnectTimer = setTimeout(() => {
    disConnectTimer = null;
    initWebSocket();
  }, delay);
  reconnectDelay = Math.min(reconnectDelay * 2, WS_RECONNECT_MAX_DELAY);
}

function wsOnError(e: Event, gen: number) {
  console.log(e, '消息通知错误回调，重新连接');
  scheduleReconnect(gen);
}

function wsOnMessage(e: MessageEvent, gen: number) {
  // 僵尸连接（已被丢弃但服务端还在推）的消息一律丢掉，否则同一条通知会重复入库
  if (!isCurrentWs(gen)) return;
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
    if (wsData.msg_cmd_type === 'HostGuard') {
      // 主机防爆破封禁：只广播事件，由「远程防爆破」页面自行决定要不要刷新。
      // 不在这里弹通知——IP封禁本来就已经走 Info 通道发过一次了，
      // 再弹一次用户会看到两条一样的消息。
      bus.emit('hostguard-ban', wsData.msg_data.message_attach);
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

function wsOnClose(gen: number) {
  // 意外关闭之后重新连接（间隔按指数退避，见 scheduleReconnect）
  scheduleReconnect(gen);
}

onMounted(() => {
  // 应用本地保存的页面配置（暗黑模式/主题色）
  useSettingStore().initTheme();
  initWebSocket();
  // 拉取系统参数并缓存应急入口路径，供 utils/request.ts 的「请求超时」通知里的「应急恢复」使用。
  // 提前缓存（登录后即取），确保后端变慢/超时时也能拿到路径。
  if (localStorage.getItem('access_token')) {
    GetSystemParamsApi()
      .then((res: any) => {
        if (res?.code === 0) {
          try {
            localStorage.setItem('__samwaf_emergency_path__', res.data?.emergency_path || '');
          } catch (e) { /* ignore */ }
        }
      })
      .catch(() => { /* 静默失败，不影响主流程 */ });
  }
});
</script>
