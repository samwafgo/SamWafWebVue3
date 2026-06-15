import request from '@/utils/request';

/** 查询所有系统配置列表 */
export function system_config_list_api(data: Record<string, any>) {
  return request({
    url: 'systemconfig/list',
    method: 'post',
    data,
  });
}

/** 通过 ID 获取系统配置 */
export function get_detail_by_id_api(params: Record<string, any>) {
  return request({
    url: 'systemconfig/detail',
    method: 'get',
    params,
  });
}

/** 通过 Item 获取系统配置 */
export function get_detail_by_item_api(params: Record<string, any>) {
  return request({
    url: 'systemconfig/getdetailByItem',
    method: 'get',
    params,
  });
}

/** 添加系统配置 */
export function add_system_config_api(data: Record<string, any>) {
  return request({
    url: 'systemconfig/add',
    method: 'post',
    data,
  });
}

/** 编辑系统配置 */
export function edit_system_config_api(data: Record<string, any>) {
  return request({
    url: 'systemconfig/edit',
    method: 'post',
    data,
  });
}

/** 通过 item 编辑系统配置的 value */
export function edit_system_config_by_item_api(data: Record<string, any>) {
  return request({
    url: 'systemconfig/editByItem',
    method: 'post',
    data,
  });
}

/** 删除系统配置 */
export function del_detail_api(params: Record<string, any>) {
  return request({
    url: 'systemconfig/del',
    method: 'get',
    params,
  });
}
