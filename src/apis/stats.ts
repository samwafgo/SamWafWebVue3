import request from '@/utils/request';

/** 查询顶部的汇总天信息 */
export function wafstatsumdayapi(params?: Record<string, any>) {
  return request({
    url: 'wafstatsumday',
    method: 'get',
    params,
  });
}

/** 查询周期区间的攻击和正常信息 */
export function wafstatsumdayrangeapi(params: Record<string, any>) {
  return request({
    url: 'wafstatsumdayrange',
    method: 'get',
    params,
  });
}

/** 查询周期区间的IP攻击和正常信息 */
export function wafstatsumdaytopiprangeapi(params: Record<string, any>) {
  return request({
    url: 'wafstatsumdaytopiprange',
    method: 'get',
    params,
  });
}

/** 首页获取基本信息 */
export function wafStatSysinfoapi(params?: Record<string, any>) {
  return request({
    url: 'statsysinfo',
    method: 'get',
    params,
  });
}

/** 运行时系统信息 */
export function wafStatRuntimeSysinfoapi() {
  return request({
    url: 'statrumtimesysinfo',
    method: 'get',
  });
}

/** 【站点综合统计】查询站点概览（汇总卡片+站点列表） */
export function wafstatsiteoverviewapi(params?: Record<string, any>) {
  return request({
    url: 'wafstatsiteoverview',
    method: 'get',
    params,
  });
}

/** 【站点综合统计】查询单站点详情趋势（1h/24h/7d/30d） */
export function wafstatsitedetailapi(params: Record<string, any>) {
  return request({
    url: 'wafstatsitedetail',
    method: 'get',
    params,
  });
}
