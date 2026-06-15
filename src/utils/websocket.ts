/* WebSocket封装
 * @param url: WebSocket接口地址与携带参数必填
 * @param token: WebSocket接口凭证与携带参数必填
 * @param onOpenFunc: WebSocket的onopen回调函数，如果不需要可传null
 * @param onMessageFunc: WebSocket的onmessage回调函数，如果不需要可传null
 * @param onCloseFunc: WebSocket的onclose回调函数，如果不需要可传null
 * @param onErrorFunc: WebSocket的onerror回调函数，如果不需要可传null
 * @param heartMessage: 发送后台的心跳包参数（保留参数位，向后兼容）
 * @param timer: 给后台传送心跳包的间隔时间，不传时使用默认值30000毫秒
 * @param isReconnect: 是否断掉立即重连，不传true时不重连
 */
function useWebSocket(
  url: string,
  token: string,
  onOpenFunc: ((e: Event, ws: WebSocket) => void) | null,
  onMessageFunc: ((e: MessageEvent) => void) | null,
  onCloseFunc: ((e: CloseEvent) => void) | null,
  onErrorFunc: ((e: Event) => void) | null,
  _heartMessage: unknown,
  timer?: number,
  isReconnect?: boolean,
) {
  let isConnected = false;
  let ws: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // 创建并链接webSocket
  const connect = () => {
    if (!isConnected) {
      ws = new WebSocket(url, [token]);
      isConnected = true;
    }
  };

  // 向后台发送心跳消息（简单 ping）
  const startHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(
      () => {
        if (ws && ws.readyState === 1) {
          try {
            ws.send('ping');
          } catch (_) {
            /* ignore */
          }
        }
      },
      !timer ? 30000 : timer,
    );
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  };

  // 初始化事件回调函数
  const initEventHandle = () => {
    if (!ws) return;
    ws.addEventListener('open', (e) => {
      // 给后台发心跳请求，在onmessage中取得消息则说明链接正常
      startHeartbeat();
      if (onOpenFunc) {
        onOpenFunc(e, ws as WebSocket);
      }
    });
    ws.addEventListener('message', (e) => {
      if (!e) return;
      if (onMessageFunc) {
        onMessageFunc(e);
      }
    });
    ws.addEventListener('close', (e) => {
      isConnected = false;
      stopHeartbeat();
      if (onCloseFunc) {
        onCloseFunc(e);
      }
    });
    ws.addEventListener('error', (e) => {
      isConnected = false;
      stopHeartbeat();
      if (onErrorFunc) {
        onErrorFunc(e);
      }
      if (isReconnect) {
        connect();
        initEventHandle();
      }
    });
  };

  // 初始化webSocket
  connect();
  initEventHandle();
  return ws as unknown as WebSocket;
}

export default {
  useWebSocket,
};
