import request from '@/utils/request';

/** 拦截页面 - 列表 */
export function wafBlockingPageListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/blockingpage/list',
    method: 'post',
    data: params,
  });
}

/** 拦截页面 - 删除 */
export function wafBlockingPageDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/blockingpage/del',
    method: 'get',
    params,
  });
}

/** 拦截页面 - 编辑 */
export function wafBlockingPageEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/blockingpage/edit',
    method: 'post',
    data: params,
  });
}

/** 拦截页面 - 添加 */
export function wafBlockingPageAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/blockingpage/add',
    method: 'post',
    data: params,
  });
}

/** 拦截页面 - 详细 */
export function wafBlockingPageDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/blockingpage/detail',
    method: 'get',
    params,
  });
}
