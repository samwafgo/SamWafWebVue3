import request from '@/utils/request';

export interface LoginParams {
  login_account: string;
  login_password: string;
  login_otp_secret_code?: string;
}

/** 登录来源提醒：本次 IP/归属地，以及与上次是否一致 */
export interface LoginNotice {
  current_ip: string;
  current_area: string;
  current_time: string;
  last_ip: string;
  last_area: string;
  last_time: string;
  is_first: boolean;
  is_changed: boolean;
}

export interface LoginResult {
  access_token: string;
  need_change_password?: boolean;
  change_password_reason?: string;
  login_notice?: LoginNotice;
  [key: string]: any;
}

/** 登录 */
export function loginapi(params: LoginParams) {
  return request<LoginResult>({
    url: 'public/login',
    method: 'post',
    data: params,
  });
}

/** 注销 */
export function logoutapi() {
  return request({
    url: 'logout',
    method: 'post',
    data: {},
  });
}
