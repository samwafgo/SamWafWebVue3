import request from '@/utils/request';

/** 缓存规则 - 列表 */
export function wafCacheRuleListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/cacherule/list',
    method: 'post',
    data: params,
  });
}

/** 缓存规则 - 删除 */
export function wafCacheRuleDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/cacherule/del',
    method: 'get',
    params,
  });
}

/** 缓存规则 - 编辑 */
export function wafCacheRuleEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/cacherule/edit',
    method: 'post',
    data: params,
  });
}

/** 缓存规则 - 添加 */
export function wafCacheRuleAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/cacherule/add',
    method: 'post',
    data: params,
  });
}

/** 缓存规则 - 详细 */
export function wafCacheRuleDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/cacherule/detail',
    method: 'get',
    params,
  });
}
