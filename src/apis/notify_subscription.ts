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

// ===== 精细化配置与调试（issue #822）=====
// 频控/模板/过滤走独立接口，不混进 edit：
// 开关切换和收件人编辑都会整包提交 edit，混在一起漏传字段就会把配好的模板清空。

/** 通知订阅 - 保存单个订阅的频控/模板/过滤配置 */
export function saveNotifySubscriptionConfig(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/config',
    method: 'post',
    data: params,
  });
}

/** 通知订阅 - 批量套用配置 */
export function batchNotifySubscriptionConfig(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/batchconfig',
    method: 'post',
    data: params,
  });
}

/** 通知订阅 - 模板预览（不发送） */
export function previewNotifySubscription(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/preview',
    method: 'post',
    data: params,
  });
}

/** 通知订阅 - 测试发送（真实发送，绕过频控） */
export function testNotifySubscription(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/test',
    method: 'post',
    data: params,
  });
}

/** 通知订阅 - 干跑：只演算不发送 */
export function dryRunNotifySubscription(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/dryrun',
    method: 'post',
    data: params,
  });
}

/** 通知订阅 - 取某消息类型可用的模板变量 */
export function getNotifyTemplateVars(params: Record<string, any>) {
  return request({
    url: '/notify/subscription/templatevars',
    method: 'get',
    params,
  });
}

/** 通知订阅 - 获取全局默认频控配置 */
export function getNotifyGlobalThrottle() {
  return request({
    url: '/notify/globalthrottle',
    method: 'get',
  });
}

/** 通知订阅 - 更新全局默认频控配置 */
export function updateNotifyGlobalThrottle(params: Record<string, any>) {
  return request({
    url: '/notify/globalthrottle/update',
    method: 'post',
    data: params,
  });
}
