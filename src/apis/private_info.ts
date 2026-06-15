import request from '@/utils/request';

/** 隐私信息 - 列表 */
export function wafPrivateInfoListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privateinfo/list',
    method: 'post',
    data: params,
  });
}

/** 隐私信息 - 删除 */
export function wafPrivateInfoDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privateinfo/del',
    method: 'get',
    params,
  });
}

/** 隐私信息 - 编辑 */
export function wafPrivateInfoEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privateinfo/edit',
    method: 'post',
    data: params,
  });
}

/** 隐私信息 - 添加 */
export function wafPrivateInfoAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privateinfo/add',
    method: 'post',
    data: params,
  });
}

/** 隐私信息 - 详细 */
export function wafPrivateInfoDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privateinfo/detail',
    method: 'get',
    params,
  });
}
