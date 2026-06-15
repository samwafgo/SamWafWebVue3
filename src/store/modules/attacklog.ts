import { defineStore } from 'pinia';

/**
 * 访问日志列表页搜索状态（离开路由时保存，返回时恢复）
 * 对应老项目 Vuex attacklog 模块
 */
interface AttackMsgData {
  pagesize: number;
  currentpage: number;
  searchData: Record<string, any>;
}

export const useAttackLogStore = defineStore('attacklog', {
  state: () => ({
    msgData: null as AttackMsgData | null,
  }),
  actions: {
    setAttackMsgData(data: AttackMsgData) {
      this.msgData = data;
    },
  },
});
