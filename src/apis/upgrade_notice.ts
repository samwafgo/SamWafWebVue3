import request from '@/utils/request';

/** 升级须知：升级后告知本次变更与建议操作 */

/** 汇总：from/to 版本、待处理数、是否需要弹窗、是否降级运行 */
export function upgrade_notice_summary_api(params: Record<string, any>) {
  return request({
    url: 'upgradenotice/summary',
    method: 'get',
    params,
  });
}

/** 分页列表 */
export function upgrade_notice_list_api(data: Record<string, any>) {
  return request({
    url: 'upgradenotice/list',
    method: 'post',
    data,
  });
}

/**
 * 状态流转：ack 我知道了 / ignore 忽略 / restore 恢复待处理。
 * 请求体只带 notice_id —— 服务端会先在内置清单里查一遍，清单外的 id 一律拒绝。
 */
export function upgrade_notice_status_api(action: 'ack' | 'ignore' | 'restore', noticeId: string) {
  return request({
    url: `upgradenotice/${action}`,
    method: 'post',
    data: { notice_id: noticeId },
  });
}

/** 弹窗已展示回写：此后不再弹 */
export function upgrade_notice_popup_shown_api() {
  return request({
    url: 'upgradenotice/popupshown',
    method: 'post',
    data: {},
  });
}

/** 确认降级告警：同一个"历史最高版本"此后不再提示，最高版本再变高会重新出现 */
export function upgrade_notice_downgrade_ack_api() {
  return request({
    url: 'upgradenotice/downgradeack',
    method: 'post',
    data: {},
  });
}
