import request from '@/utils/request';

/** 查看URL白名单列表 */
export function wafURLWhiteListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/urlwhite/list',
    method: 'post',
    data: params,
  });
}

/** 删除URL白名单 */
export function wafURLWhiteDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/urlwhite/del',
    method: 'get',
    params,
  });
}

/** 编辑URL白名单 */
export function wafURLWhiteEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/urlwhite/edit',
    method: 'post',
    data: params,
  });
}

/** 添加URL白名单 */
export function wafURLWhiteAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/urlwhite/add',
    method: 'post',
    data: params,
  });
}

/** 详细URL白名单 */
export function wafURLWhiteDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/urlwhite/detail',
    method: 'get',
    params,
  });
}

/** 批量删除URL白名单 */
export function wafURLWhiteBatchDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/urlwhite/batchdel',
    method: 'post',
    data: params,
  });
}

/** 清空所有URL白名单 */
export function wafURLWhiteDelAllApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/urlwhite/delall',
    method: 'post',
    data: params,
  });
}
