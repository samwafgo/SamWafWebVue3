import request from '@/utils/request';

/** 查看抵御CC攻击列表 */
export function wafAntiCCListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/anticc/list',
    method: 'post',
    data: params,
  });
}

/** 删除抵御CC攻击 */
export function wafAntiCCDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/anticc/del',
    method: 'get',
    params,
  });
}

/** 编辑抵御CC攻击 */
export function wafAntiCCEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/anticc/edit',
    method: 'post',
    data: params,
  });
}

/** 添加抵御CC攻击 */
export function wafAntiCCAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/anticc/add',
    method: 'post',
    data: params,
  });
}

/** 详细抵御CC攻击 */
export function wafAntiCCDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/anticc/detail',
    method: 'get',
    params,
  });
}

/** 封禁IP列表 */
export function wafAntiCCBanIPListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/anticc/baniplist',
    method: 'get',
    params,
  });
}

/** 移除封禁IP */
export function wafAntiCCRemoveBanIpApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/anticc/removebanip',
    method: 'post',
    data: params,
  });
}
