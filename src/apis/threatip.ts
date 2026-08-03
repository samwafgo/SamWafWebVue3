import request from '@/utils/request';

// 威胁情报 IP 订阅渠道
export function wafThreatIPListApi(params: Record<string, any>) {
  return request({ url: '/threatip/channel/list', method: 'post', data: params });
}
export function wafThreatIPAddApi(params: Record<string, any>) {
  return request({ url: '/threatip/channel/add', method: 'post', data: params });
}
export function wafThreatIPDetailApi(params: Record<string, any>) {
  return request({ url: '/threatip/channel/detail', method: 'get', params });
}
export function wafThreatIPEditApi(params: Record<string, any>) {
  return request({ url: '/threatip/channel/edit', method: 'post', data: params });
}
export function wafThreatIPDelApi(params: Record<string, any>) {
  return request({ url: '/threatip/channel/del', method: 'get', params });
}
export function wafThreatIPSyncApi(params: Record<string, any>) {
  return request({ url: '/threatip/channel/sync', method: 'post', data: params });
}

// 订阅落地汇总(方案三"订阅来源"Tab)。params.land = system | waf
export function wafThreatIPLandedSummaryApi(params: Record<string, any>) {
  return request({ url: '/threatip/landed/summary', method: 'get', params });
}
// 某渠道落地 IP 分页浏览(只读)。params: { code, keyword, pageIndex, pageSize }
export function wafThreatIPLandedIPsApi(params: Record<string, any>) {
  return request({ url: '/threatip/landed/ips', method: 'post', data: params });
}
