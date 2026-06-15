import request from '@/utils/request';

/** 通知渠道 - 列表 */
export function getNotifyChannelList(params: Record<string, any>) {
  return request({
    url: '/notify/channel/list',
    method: 'post',
    data: params,
  });
}

/** 通知渠道 - 添加 */
export function addNotifyChannel(params: Record<string, any>) {
  return request({
    url: '/notify/channel/add',
    method: 'post',
    data: params,
  });
}

/** 通知渠道 - 编辑 */
export function editNotifyChannel(params: Record<string, any>) {
  return request({
    url: '/notify/channel/edit',
    method: 'post',
    data: params,
  });
}

/** 通知渠道 - 删除 */
export function deleteNotifyChannel(params: Record<string, any>) {
  return request({
    url: '/notify/channel/del',
    method: 'get',
    params,
  });
}

/** 通知渠道 - 详情 */
export function getNotifyChannelDetail(params: Record<string, any>) {
  return request({
    url: '/notify/channel/detail',
    method: 'get',
    params,
  });
}

/** 通知渠道 - 测试连接 */
export function testNotifyChannel(params: Record<string, any>) {
  return request({
    url: '/notify/channel/test',
    method: 'post',
    data: params,
  });
}
