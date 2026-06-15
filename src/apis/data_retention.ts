import request from '@/utils/request';

/** 数据保留策略 - 列表 */
export function wafDataRetentionListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/dataretention/list',
    method: 'post',
    data: params,
  });
}

/** 数据保留策略 - 详情 */
export function wafDataRetentionDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/dataretention/detail',
    method: 'get',
    params,
  });
}

/** 数据保留策略 - 编辑 */
export function wafDataRetentionEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/dataretention/edit',
    method: 'post',
    data: params,
  });
}
