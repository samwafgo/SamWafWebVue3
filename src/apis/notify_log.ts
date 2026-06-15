import request from '@/utils/request';

/** 通知日志 - 列表 */
export function getNotifyLogList(params: Record<string, any>) {
  return request({
    url: '/notify/log/list',
    method: 'post',
    data: params,
  });
}

/** 通知日志 - 删除 */
export function deleteNotifyLog(params: Record<string, any>) {
  return request({
    url: '/notify/log/del',
    method: 'get',
    params,
  });
}

/** 通知日志 - 详情 */
export function getNotifyLogDetail(params: Record<string, any>) {
  return request({
    url: '/notify/log/detail',
    method: 'get',
    params,
  });
}
