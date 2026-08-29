import { defineStore } from 'pinia';

export interface NotificationMsg {
  message_id?: string | number;
  message_type: string;
  message_data: string;
  message_datetime?: string;
  message_unread_status?: boolean;
  message_attach?: any;
  // 以下字段用于铃铛内的分类与合并
  message_count?: number; // 同一条重复出现的次数
  message_local?: boolean; // 前端本地产生（连接异常等），非后端推送
  message_kind?: string; // 本地消息的细分：net=连接 ops=运维
  [key: string]: any;
}

// 铃铛按「用户心智」分两类，不按技术来源分：
//   guard  外面来的攻击与安全事件
//   system 软件自己的事（连接状态、运维消息）
// 防护类是可枚举的固定集合，运维类才会不断增加，所以未登记的类型一律归 system。
// 新增防护类消息时记得往这里登记，否则会被埋进「系统」页签。
export const GUARD_MESSAGE_TYPES = [
  '命中保护规则',
  '攻击告警',
  'IP封禁通知',
  '主机防爆破封禁',
  '登录来源变化',
  '用户登录',
  '统一访问认证',
];

export const CATEGORY_GUARD = 'guard';
export const CATEGORY_SYSTEM = 'system';

export function categoryOf(item: NotificationMsg): string {
  return GUARD_MESSAGE_TYPES.includes(item?.message_type) ? CATEGORY_GUARD : CATEGORY_SYSTEM;
}

// 本地消息的 message_type，同时也是铃铛里显示的副标题
export const LOCAL_TYPE_NET = '连接异常';

// 本地消息在铃铛里的保留上限，超出丢弃最老的
const LOCAL_MSG_LIMIT = 20;

function nowText(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(
    d.getSeconds(),
  )}`;
}

/** WebSocket 推送的通知消息（头部 Notice 组件消费） */
export const useNotificationStore = defineStore('notification', {
  state: () => ({
    msgData: [] as NotificationMsg[],
  }),
  getters: {
    unreadMsg: (state) => state.msgData.filter((item) => item.message_unread_status !== false),
    guardMsg: (state) =>
      state.msgData.filter((item) => item.message_unread_status !== false && categoryOf(item) === CATEGORY_GUARD),
    systemMsg: (state) =>
      state.msgData.filter((item) => item.message_unread_status !== false && categoryOf(item) === CATEGORY_SYSTEM),
    // 连接类未读的累计次数：铃铛是否变色、默认落哪个页签都看它
    netUnreadCount: (state) =>
      state.msgData
        .filter((item) => item.message_unread_status !== false && item.message_local && item.message_kind === 'net')
        .reduce((sum, item) => sum + (item.message_count || 1), 0),
  },
  actions: {
    // 只在「未读」范围内合并：已读的是历史记录，不该被后来的消息改写
    findMergeable(type: string, data: string) {
      return this.msgData.find(
        (m) => m.message_unread_status !== false && m.message_type === type && m.message_data === data,
      );
    },
    // 同类型 + 同内容的未读消息合并计数 —— 同一个 IP 命中同一条规则会在一两秒内
    // 连推好几条，逐条堆进去铃铛就没法看了
    addMsgData(msg: NotificationMsg) {
      const exist = this.findMergeable(msg.message_type, msg.message_data);
      if (exist) {
        exist.message_count = (exist.message_count || 1) + 1;
        exist.message_datetime = msg.message_datetime || exist.message_datetime;
        return;
      }
      this.msgData.unshift({
        message_unread_status: true,
        message_datetime: msg.message_datetime || nowText(),
        message_count: 1,
        ...msg,
      });
      // 最多保留 100 条
      if (this.msgData.length > 100) {
        this.msgData = this.msgData.slice(0, 100);
      }
    },
    // 前端本地产生的消息（请求超时、连不上后端等）也收进小铃铛，落在「系统」页签。
    // 同内容只累加次数，避免把右上角的刷屏搬进铃铛。
    addLocalMsg(text: string, kind = 'net') {
      const type = LOCAL_TYPE_NET;
      const exist = this.findMergeable(type, text);
      if (exist) {
        exist.message_count = (exist.message_count || 1) + 1;
        exist.message_datetime = nowText();
        return;
      }
      this.msgData.unshift({
        message_id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        message_data: text,
        message_type: type,
        message_unread_status: true,
        message_datetime: nowText(),
        message_count: 1,
        message_local: true,
        message_kind: kind,
      });
      const locals = this.msgData.filter((m) => m.message_local);
      if (locals.length > LOCAL_MSG_LIMIT) {
        const drop = locals.slice(LOCAL_MSG_LIMIT).map((m) => m.message_id);
        this.msgData = this.msgData.filter((m) => !drop.includes(m.message_id));
      }
    },
    // 清空某一个页签：防护告警是安全记录、系统消息是状态回声，
    // 一个按钮把两类一起抹掉，用户不敢点
    markCategoryRead(category: string) {
      this.msgData.forEach((m) => {
        if (categoryOf(m) === category) {
          m.message_unread_status = false;
        }
      });
      // 本地消息读完即弃，没有回看价值，留着只会把列表撑长
      this.msgData = this.msgData.filter((m) => !(m.message_local && m.message_unread_status === false));
    },
    // 跳登录页时清掉本地提示：那些「令牌过期」是上一个会话里并发请求的回声，
    // 人都已经被踢回登录页了，再展示一遍没有任何信息量。
    dropLocalMsg() {
      this.msgData = this.msgData.filter((m) => !m.message_local);
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
