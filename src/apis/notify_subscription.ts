import request from '@/utils/request';

/** 通知订阅 - 列表 */
export function getNotifySubscriptionList(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/list',
    method: 'post',
    data: params,
  });
}

/** 通知订阅 - 添加 */
export function addNotifySubscription(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/add',
    method: 'post',
    data: params,
  });
}

/** 通知订阅 - 编辑 */
export function editNotifySubscription(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/edit',
    method: 'post',
    data: params,
  });
}

/** 通知订阅 - 删除 */
export function deleteNotifySubscription(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/del',
    method: 'get',
    params,
  });
}

/** 通知订阅 - 详情 */
export function getNotifySubscriptionDetail(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/detail',
    method: 'get',
    params,
  });
}
