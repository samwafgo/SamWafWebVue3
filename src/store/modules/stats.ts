import { defineStore } from 'pinia';

export interface StatsDataItem {
  server: string;
  operatype: string;
  qps: number;
  log_qps: number;
  main_queue: number;
  log_queue: number;
  stats_queue: number;
  message_queue: number;
  cpu_percent: number;
  memory_percent: number;
  /** 网络接收速率(字节/秒) */
  network_recv_rate: number;
  /** 网络发送速率(字节/秒) */
  network_sent_rate: number;
  timestamp: number;
  system_monitor?: SystemMonitorData;
}

export interface SystemMonitorData {
  cpu: {
    model_name: string;
    cores: number;
    usage_percent: number;
    physical_cnt: number;
    logical_cnt: number;
  };
  memory: {
    total: string;
    available: string;
    used: string;
    usage_percent: number;
    jvm_used: string;
    jvm_percent: number;
  };
  disk: Array<{
    file_system: string;
    mount_point: string;
    total: string;
    available: string;
    used: string;
    usage_percent: number;
  }>;
}

export interface ResponseTimeItem {
  timestamp: number;
  /** 响应时间，单位毫秒 */
  responseTime: number;
  status: 'success' | 'error';
}

export const useStatsStore = defineStore('stats', {
  state: () => ({
    currentStats: null as StatsDataItem | null,
    statsHistory: [] as StatsDataItem[],
    responseTimeHistory: [] as ResponseTimeItem[],
    currentSystemMonitor: null as SystemMonitorData | null,
  }),
  getters: {
    getLatestStats: (state) => (state.statsHistory.length > 0 ? state.statsHistory[state.statsHistory.length - 1] : null),
    getAverageResponseTime: (state) => {
      if (state.responseTimeHistory.length === 0) return 0;
      const total = state.responseTimeHistory.reduce((sum, item) => sum + item.responseTime, 0);
      return Math.round(total / state.responseTimeHistory.length);
    },
    getCpuUsage: (state) => state.currentSystemMonitor?.cpu?.usage_percent || 0,
    getMemoryUsage: (state) => state.currentSystemMonitor?.memory?.usage_percent || 0,
    getDiskList: (state) => state.currentSystemMonitor?.disk || [],
    getAverageDiskUsage: (state) => {
      const diskList = state.currentSystemMonitor?.disk || [];
      if (diskList.length === 0) return 0;
      const totalUsage = diskList.reduce((sum, disk) => sum + (disk.usage_percent || 0), 0);
      return Math.round(totalUsage / diskList.length);
    },
  },
  actions: {
    addStatsData(data: StatsDataItem) {
      this.statsHistory.push(data);
      // 限制历史记录数量，最多保留1000条
      if (this.statsHistory.length > 1000) {
        this.statsHistory = this.statsHistory.slice(-1000);
      }
      this.currentStats = data;
      // 如果数据中包含系统监控信息，更新系统监控状态
      if (data.system_monitor) {
        this.currentSystemMonitor = data.system_monitor;
      }
    },
    setSystemMonitor(data: SystemMonitorData) {
      this.currentSystemMonitor = data;
    },
    addResponseTimeData(data: ResponseTimeItem) {
      this.responseTimeHistory.push(data);
      // 限制历史记录数量，最多保留500条
      if (this.responseTimeHistory.length > 500) {
        this.responseTimeHistory = this.responseTimeHistory.slice(-500);
      }
    },
    clearStatsHistory() {
      this.statsHistory = [];
      this.currentStats = null;
    },
  },
});
