import request from '@/utils/request';

/** 分页查询网站分组 */
export function hostGroupList(data: Record<string, any>) {
  return request({
    url: 'wafhost/hostgroup/list',
    method: 'post',
    data,
  });
}

/** 全部网站分组（不分页），带各组网站数与「未分组」「全部」计数 */
export function allHostGroup(params?: Record<string, any>) {
  return request({
    url: 'wafhost/hostgroup/all',
    method: 'get',
    params,
  });
}

/** 新增网站分组 */
export function addHostGroup(data: Record<string, any>) {
  return request({
    url: 'wafhost/hostgroup/add',
    method: 'post',
    data,
  });
}

/** 编辑网站分组（只能改名称/颜色/备注） */
export function editHostGroup(data: Record<string, any>) {
  return request({
    url: 'wafhost/hostgroup/edit',
    method: 'post',
    data,
  });
}

/** 删除网站分组（组内网站不删，回落到未分组） */
export function delHostGroup(params: Record<string, any>) {
  return request({
    url: 'wafhost/hostgroup/del',
    method: 'get',
    params,
  });
}

/** 分组排序（提交完整的 id 顺序） */
export function sortHostGroup(data: Record<string, any>) {
  return request({
    url: 'wafhost/hostgroup/sort',
    method: 'post',
    data,
  });
}

/** 批量移动网站到分组（group_code 为空表示移出分组） */
export function assignHostGroup(data: Record<string, any>) {
  return request({
    url: 'wafhost/hostgroup/assign',
    method: 'post',
    data,
  });
}
