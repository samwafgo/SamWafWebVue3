import request from '@/utils/request';

/** 网页防篡改 - 列表 */
export function wafTamperRuleListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/tamperrule/list',
    method: 'post',
    data: params,
  });
}

/** 网页防篡改 - 删除 */
export function wafTamperRuleDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/tamperrule/del',
    method: 'get',
    params,
  });
}

/** 网页防篡改 - 编辑 */
export function wafTamperRuleEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/tamperrule/edit',
    method: 'post',
    data: params,
  });
}

/** 网页防篡改 - 添加 */
export function wafTamperRuleAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/tamperrule/add',
    method: 'post',
    data: params,
  });
}

/** 网页防篡改 - 详情 */
export function wafTamperRuleDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/tamperrule/detail',
    method: 'get',
    params,
  });
}

/** 网页防篡改 - 重新学习基线 */
export function wafTamperRuleRelearnApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/tamperrule/relearn',
    method: 'get',
    params,
  });
}

/** 网页防篡改 - 查看基线正文（按需拉取） */
export function wafTamperRuleBaselineApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/tamperrule/baseline',
    method: 'get',
    params,
  });
}
