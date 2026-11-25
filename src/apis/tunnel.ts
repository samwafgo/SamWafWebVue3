import request from '@/utils/request';

/** 隧道 - 列表 */
export function wafTunnelListApi(params: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/list',
    method: 'post',
    data: params,
  });
}

/** 隧道 - 删除 */
export function wafTunnelDelApi(params: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/del',
    method: 'get',
    params,
  });
}

/** 隧道 - 编辑 */
export function wafTunnelEditApi(params: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/edit',
    method: 'post',
    data: params,
  });
}

/** 隧道 - 添加 */
export function wafTunnelAddApi(params: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/add',
    method: 'post',
    data: params,
  });
}

/** 隧道 - 详细 */
export function wafTunnelDetailApi(params: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/detail',
    method: 'get',
    params,
  });
}

/** 隧道 - 连接信息 */
export function wafTunnelConnectionApi(params: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/connections',
    method: 'get',
    params,
  });
}

/** 隧道访问防护 - 详细 */
export function wafTunnelProtectionDetailApi(params: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/protection/detail',
    method: 'get',
    params,
  });
}

/** 隧道访问防护 - 保存地区防御 */
export function wafTunnelProtectionRegionApi(data: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/protection/region',
    method: 'post',
    data,
  });
}

/** 隧道访问防护 - 保存动态域名白名单 */
export function wafTunnelProtectionDDNSApi(data: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/protection/ddns',
    method: 'post',
    data,
  });
}

/** 隧道访问防护 - 手动触发解析 */
export function wafTunnelProtectionRefreshApi(data: Record<string, any>) {
  return request({
    url: '/tunnel/tunnel/protection/refresh',
    method: 'post',
    data,
  });
}
