import request from '@/utils/request';

/** 获取系统监控信息 */
export function getSystemMonitorApi(params?: Record<string, any>) {
  return request({
    url: '/monitor/system_info',
    method: 'get',
    params,
  });
}
