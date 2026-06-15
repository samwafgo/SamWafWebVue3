import request from '@/utils/request';

/** 路径规则 - 列表 */
export function wafPathRuleListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/pathrule/list',
    method: 'post',
    data: params,
  });
}

/** 路径规则 - 删除 */
export function wafPathRuleDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/pathrule/del',
    method: 'get',
    params,
  });
}

/** 路径规则 - 编辑 */
export function wafPathRuleEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/pathrule/edit',
    method: 'post',
    data: params,
  });
}

/** 路径规则 - 添加 */
export function wafPathRuleAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/pathrule/add',
    method: 'post',
    data: params,
  });
}

/** 路径规则 - 详细 */
export function wafPathRuleDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/pathrule/detail',
    method: 'get',
    params,
  });
}
