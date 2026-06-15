import request from '@/utils/request';

/** OTP - 初始化 */
export function wafOtpInitApi() {
  return request({
    url: '/wafhost/otp/init',
    method: 'get',
  });
}

/** OTP - 绑定 */
export function wafOtpBindApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/otp/bind',
    method: 'post',
    data: params,
  });
}

/** OTP - 解绑 */
export function wafOtpUnBindApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/otp/unbind',
    method: 'post',
    data: params,
  });
}
