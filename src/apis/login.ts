import request from '@/utils/request';

export interface LoginParams {
  login_account: string;
  login_password: string;
  login_otp_secret_code?: string;
}

export interface LoginResult {
  access_token: string;
  need_change_password?: boolean;
  change_password_reason?: string;
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
