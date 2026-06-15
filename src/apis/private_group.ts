import request from '@/utils/request';

/** 隐私信息分组 - 列表 */
export function wafPrivateGroupListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privategroup/list',
    method: 'post',
    data: params,
  });
}

/** 隐私信息分组 - 按所属云列表 */
export function wafPrivateGroupListByBelongCloudApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privategroup/listbybelongcloud',
    method: 'post',
    data: params,
  });
}

/** 隐私信息分组 - 删除 */
export function wafPrivateGroupDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privategroup/del',
    method: 'get',
    params,
  });
}

/** 隐私信息分组 - 编辑 */
export function wafPrivateGroupEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privategroup/edit',
    method: 'post',
    data: params,
  });
}

/** 隐私信息分组 - 添加 */
export function wafPrivateGroupAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privategroup/add',
    method: 'post',
    data: params,
  });
}

/** 隐私信息分组 - 详细 */
export function wafPrivateGroupDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/privategroup/detail',
    method: 'get',
    params,
  });
}
