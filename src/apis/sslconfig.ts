import request from '@/utils/request';

/** SSL 配置管理 - 获取 SSL 配置列表 */
export function sslConfigListApi(params: Record<string, any>) {
  return request({
    url: '/sslconfig/list',
    method: 'post',
    data: params,
  });
}

/** SSL 配置管理 - 删除 SSL 配置 */
export function sslConfigDelApi(params: Record<string, any>) {
  return request({
    url: '/sslconfig/del',
    method: 'get',
    params,
  });
}

/** SSL 配置管理 - 编辑 SSL 配置 */
export function sslConfigEditApi(params: Record<string, any>) {
  return request({
    url: '/sslconfig/edit',
    method: 'post',
    data: params,
  });
}

/** SSL 配置管理 - 添加 SSL 配置 */
export function sslConfigAddApi(params: Record<string, any>) {
  return request({
    url: '/sslconfig/add',
    method: 'post',
    data: params,
  });
}

/** SSL 配置管理 - 获取 SSL 配置详情 */
export function sslConfigDetailApi(params: Record<string, any>) {
  return request({
    url: '/sslconfig/detail',
    method: 'get',
    params,
  });
}
