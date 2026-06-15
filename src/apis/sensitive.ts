import request from '@/utils/request';

/** 敏感词列表 */
export function wafSensitiveListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sensitive/list',
    method: 'post',
    data: params,
  });
}

/** 删除敏感词 */
export function wafSensitiveDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sensitive/del',
    method: 'get',
    params,
  });
}

/** 编辑敏感词 */
export function wafSensitiveEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sensitive/edit',
    method: 'post',
    data: params,
  });
}

/** 添加敏感词 */
export function wafSensitiveAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sensitive/add',
    method: 'post',
    data: params,
  });
}

/** 详细敏感词 */
export function wafSensitiveDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sensitive/detail',
    method: 'get',
    params,
  });
}

/** 批量删除敏感词 */
export function wafSensitiveBatchDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sensitive/batch/del',
    method: 'post',
    data: params,
  });
}

/** 清空所有敏感词 */
export function wafSensitiveDelAllApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sensitive/delall',
    method: 'post',
    data: params,
  });
}
