import request from '@/utils/request';

/** HTTP 认证账号 - 列表 */
export function wafHttpAuthBaseListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/httpauthbase/list',
    method: 'post',
    data: params,
  });
}

/** HTTP 认证账号 - 删除 */
export function wafHttpAuthBaseDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/httpauthbase/del',
    method: 'get',
    params,
  });
}

/** HTTP 认证账号 - 编辑 */
export function wafHttpAuthBaseEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/httpauthbase/edit',
    method: 'post',
    data: params,
  });
}

/** HTTP 认证账号 - 添加 */
export function wafHttpAuthBaseAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/httpauthbase/add',
    method: 'post',
    data: params,
  });
}

/** HTTP 认证账号 - 详细 */
export function wafHttpAuthBaseDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/httpauthbase/detail',
    method: 'get',
    params,
  });
}
