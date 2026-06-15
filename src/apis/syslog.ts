import request from '@/utils/request';

/** 查询所有系统操作日志列表 */
export function sys_log_list_api(params: Record<string, any>) {
  return request({
    url: 'sys_log/list',
    method: 'get',
    params,
  });
}

/** 系统操作日志详情 */
export function sys_log_detail_api(params: Record<string, any>) {
  return request({
    url: '/sys_log/detail',
    method: 'get',
    params,
  });
}
