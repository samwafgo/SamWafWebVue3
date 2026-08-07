/**
 * 轻量事件总线（替代 Vue2 的 $bus），用于跨组件通信：
 * - 'sendAi'：各页面把分析内容发送给布局层的 AI 助手抽屉
 * - 'hostguard-ban'：后端主机防爆破封禁时经 WebSocket 广播，「远程防爆破」页据此即时刷新
 */
type Handler = (payload?: any) => void;

const handlers = new Map<string, Set<Handler>>();

export default {
  on(event: string, handler: Handler) {
    if (!handlers.has(event)) {
      handlers.set(event, new Set());
    }
    handlers.get(event)!.add(handler);
  },
  off(event: string, handler: Handler) {
    handlers.get(event)?.delete(handler);
  },
  emit(event: string, payload?: any) {
    handlers.get(event)?.forEach((handler) => handler(payload));
  },
};
