import { defineStore } from 'pinia';

export interface NotificationMsg {
  message_id?: string | number;
  message_type: string;
  message_data: string;
  message_datetime?: string;
  message_unread_status?: boolean;
  message_attach?: any;
  [key: string]: any;
}

/** WebSocket 推送的通知消息（头部 Notice 组件消费） */
export const useNotificationStore = defineStore('notification', {
  state: () => ({
    msgData: [] as NotificationMsg[],
  }),
  getters: {
    unreadMsg: (state) => state.msgData.filter((item) => item.message_unread_status !== false),
  },
  actions: {
    addMsgData(msg: NotificationMsg) {
      this.msgData.unshift({
        message_unread_status: true,
        message_datetime: msg.message_datetime || new Date().toLocaleString(),
        ...msg,
      });
      // 最多保留 100 条
      if (this.msgData.length > 100) {
        this.msgData = this.msgData.slice(0, 100);
      }
    },
    setRead(type: 'all' | 'radio', item?: NotificationMsg) {
      if (type === 'all') {
        this.msgData.forEach((m) => {
          m.message_unread_status = false;
        });
      } else if (item) {
        this.msgData.forEach((m) => {
          if (m.message_id === item.message_id) {
            m.message_unread_status = false;
          }
        });
      }
    },
  },
});
