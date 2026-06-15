import request from '@/utils/request';

/** 查看规则列表 */
export function wafRuleListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/list',
    method: 'post',
    data: params,
  });
}

/** 删除规则 */
export function wafRuleDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/del',
    method: 'get',
    params,
  });
}

/** 编辑规则 */
export function wafRuleEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/edit',
    method: 'post',
    data: params,
  });
}

/** 添加规则 */
export function wafRuleAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/add',
    method: 'post',
    data: params,
  });
}

/** 详细规则 */
export function wafRuleDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/detail',
    method: 'get',
    params,
  });
}

/** 批量删除规则 */
export function wafRuleBatchDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/batchdel',
    method: 'post',
    data: params,
  });
}

/** 清空所有规则 */
export function wafRuleDelAllApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/delall',
    method: 'post',
    data: params,
  });
}

/** 规则格式预览 */
export function wafRuleFormatApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/format',
    method: 'post',
    data: params,
  });
}

/** 更改规则状态 */
export function changeRuleStatus(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/rulestatus',
    method: 'get',
    params,
  });
}

/** 测试规则 */
export function wafRuleTestApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/rule/test',
    method: 'post',
    data: params,
  });
}
