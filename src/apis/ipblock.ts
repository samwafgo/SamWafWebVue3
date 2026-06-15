import request from '@/utils/request';

/** 查看IP黑名单列表 */
export function wafIPBlockListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/ipblock/list',
    method: 'post',
    data: params,
  });
}

/** 删除IP黑名单 */
export function wafIPBlockDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/ipblock/del',
    method: 'get',
    params,
  });
}

/** 编辑IP黑名单 */
export function wafIPBlockEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/ipblock/edit',
    method: 'post',
    data: params,
  });
}

/** 添加IP黑名单 */
export function wafIPBlockAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/ipblock/add',
    method: 'post',
    data: params,
  });
}

/** 详细IP黑名单 */
export function wafIPBlockDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/ipblock/detail',
    method: 'get',
    params,
  });
}

/** 批量删除IP黑名单 */
export function wafIPBlockBatchDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/ipblock/batch/del',
    method: 'post',
    data: params,
  });
}

/** 清空所有IP黑名单 */
export function wafIPBlockDelAllApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/ipblock/delall',
    method: 'post',
    data: params,
  });
}
