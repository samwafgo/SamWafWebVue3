import request from '@/utils/request';

/** 登录历史列表（审计管理员域接口） */
export function login_history_list_api(params: Record<string, any>) {
  return request({
    url: 'login_history/list',
    method: 'get',
    params,
  });
}
