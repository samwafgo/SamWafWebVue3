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
