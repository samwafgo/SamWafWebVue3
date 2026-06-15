import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { API_HOST } from '@/config/host';
import router from '@/router';
import { AesDecrypt, AesEncrypt } from '@/utils/crypto';
import { clearLocalStorageExceptPreserved, saveCurrentUrl } from '@/constants';

export const CODE = {
  REQUEST_SUCCESS: 0,
  AUTH_FAILURE: -999,
  NEED_OTP_CODE: -2,
  NEED_BIND_2FA: -3,
} as const;

/** 后端统一响应结构（data 在拦截器内已解密并反序列化） */
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

const instance = axios.create({
  baseURL: API_HOST,
  timeout: 5000,
  withCredentials: true,
  transformRequest: [
    (data) => {
      // 请求体统一 AES 加密后传输（与后端 wafsec 约定）
      if (data && typeof data === 'object') {
        return AesEncrypt(JSON.stringify(data));
      }
      return data;
    },
  ],
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || '';
  if (token) {
    config.headers['X-Token'] = token;
  }
  // 防重放校验所需的时间戳与请求唯一标识
  config.headers['X-Request-Time'] = Math.floor(Date.now() / 1000).toString();
  config.headers['X-Request-Id'] = uuidv4();
  return config;
});

instance.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse;
    if (data.code === CODE.REQUEST_SUCCESS) {
      if (typeof data.data === 'string' && data.data !== '') {
        data.data = JSON.parse(AesDecrypt(data.data));
      }
      return data as any;
    }
    if (data.code === CODE.AUTH_FAILURE) {
      // 保存当前页面以便重新登录后回跳，并清理登录态（保留语言等白名单项）
      saveCurrentUrl();
      clearLocalStorageExceptPreserved();
      router.replace({ path: '/login' });
    } else if (data.code === CODE.NEED_BIND_2FA) {
      router.replace({ path: '/account/otp' });
    }
    return data as any;
  },
  (err) => Promise.reject(err),
);

/** 业务请求统一入口：返回值为已解密的 ApiResponse */
export default function request<T = any>(config: Parameters<typeof instance.request>[0]): Promise<ApiResponse<T>> {
  return instance.request(config) as unknown as Promise<ApiResponse<T>>;
}
