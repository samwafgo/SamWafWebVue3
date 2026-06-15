import request from '@/utils/request';

/** CA服务器 - 列表 */
export function wafCaServerInfoListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/caserverinfo/list',
    method: 'post',
    data: params,
  });
}

/** CA服务器 - 删除 */
export function wafCaServerInfoDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/caserverinfo/del',
    method: 'get',
    params,
  });
}

/** CA服务器 - 编辑 */
export function wafCaServerInfoEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/caserverinfo/edit',
    method: 'post',
    data: params,
  });
}

/** CA服务器 - 添加 */
export function wafCaServerInfoAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/caserverinfo/add',
    method: 'post',
    data: params,
  });
}

/** CA服务器 - 详细 */
export function wafCaServerInfoDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/caserverinfo/detail',
    method: 'get',
    params,
  });
}
