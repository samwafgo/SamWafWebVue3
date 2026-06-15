import request from '@/utils/request';

/**
 * 授权文件
 */

/** 获取授权详情 */
export function getLicenseDetailApi(params: Record<string, any>) {
  return request({
    url: '/license/detail',
    method: 'get',
    params,
  });
}

/** 确认刚刚输入的文件 */
export function confirmLicenseApi(params: Record<string, any>) {
  return request({
    url: '/license/confirm',
    method: 'get',
    params,
  });
}
