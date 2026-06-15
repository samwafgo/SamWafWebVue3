import request from '@/utils/request';

/** 查询所有账号列表 */
export function account_list_api(data: Record<string, any>) {
  return request({
    url: 'account/list',
    method: 'post',
    data,
  });
}

/** 添加账号 */
export function account_add_api(data: Record<string, any>) {
  return request({
    url: '/account/add',
    method: 'post',
    data,
  });
}

/** 编辑账号 */
export function account_edit_api(data: Record<string, any>) {
  return request({
    url: '/account/edit',
    method: 'post',
    data,
  });
}

/** 删除账号 */
export function account_del_api(params: Record<string, any>) {
  return request({
    url: '/account/del',
    method: 'get',
    params,
  });
}

/** 账号详情 */
export function account_detail_api(params: Record<string, any>) {
  return request({
    url: '/account/detail',
    method: 'get',
    params,
  });
}

/** 重置密码 */
export function account_reset_pwd_api(data: Record<string, any>) {
  return request({
    url: '/account/resetpwd',
    method: 'post',
    data,
  });
}

/** 重置2FA */
export function account_reset_2fa_api(data: Record<string, any>) {
  return request({
    url: 'account/resetotp',
    method: 'post',
    data,
  });
}

/** 查询所有账号操作日志列表 */
export function account_log_list_api(params: Record<string, any>) {
  return request({
    url: 'account_log/list',
    method: 'get',
    params,
  });
}

/** 账号操作日志详情 */
export function account_log_detail_api(params: Record<string, any>) {
  return request({
    url: '/account_log/detail',
    method: 'get',
    params,
  });
}
