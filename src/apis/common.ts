import request from '@/utils/request';

/** 导出 excel 文件（返回 Blob） */
export function export_api(params: Record<string, any>) {
  return request({
    url: 'export',
    method: 'get',
    responseType: 'blob',
    timeout: 20000,
    params,
  });
}

/** 心跳数据 */
export function heartbeat_api() {
  return request({
    url: 'heartbeat',
    method: 'get',
    timeout: 10000,
  });
}

/** 重启 WAF 引擎 */
export function resetWAFApi() {
  return request({
    url: '/resetWAF',
    method: 'get',
  });
}
