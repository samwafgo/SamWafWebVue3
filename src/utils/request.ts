import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { API_HOST } from '@/config/host';
import router from '@/router';
import { AesDecrypt, AesEncrypt } from '@/utils/crypto';
import { clearLocalStorageExceptPreserved, saveCurrentUrl } from '@/constants';
import { h } from 'vue';
import { NotifyPlugin, DialogPlugin, Button as TButton } from 'tdesign-vue-next';

// 连接失败(网络/跨域)提示：每次页面加载最多提示一次，避免刷屏
let netErrNotified = false;

// 弹出"解决办法"详情对话框（内容较长，用对话框保证完整可读，不被通知截断）
function showNetErrDetail(origin: string) {
  let dialog: any;
  dialog = DialogPlugin.alert({
    header: '无法连接后端（可能跨域 CORS 被拦截）',
    body: `请确认后端服务已启动。若前端跨域访问被拦截(CORS)，请把当前来源 ${origin} 填入后端 conf/config.yml 的 security.cors_allow_origins 字段（多个用英文逗号分隔）后重启后端；或登录后在「系统配置」页的「CORS 跨域白名单」卡片填写。`,
    confirmBtn: '知道了',
    onConfirm: () => dialog.hide(),
  });
}

export const CODE = {
  REQUEST_SUCCESS: 0,
  AUTH_FAILURE: -999,
  NEED_OTP_CODE: -2,
  NEED_BIND_2FA: -3,
  NEED_CHANGE_PWD: -4,
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
    } else if (data.code === CODE.NEED_CHANGE_PWD) {
      // 服务端强制改密门：令牌未改密即访问其他接口时触发，引导回登录重新进入强制改密流程
      saveCurrentUrl();
      clearLocalStorageExceptPreserved();
      router.replace({ path: '/login' });
    }
    return data as any;
  },
  (err) => {
    // 无响应(网络失败/跨域被拦截)：明确告知改哪个 yml 字段、填什么值。回环/本机应被后端始终放行，
    // 故非回环来源无响应大概率是 CORS 被拦。
    if (err.code === 'ERR_NETWORK' || !err.response || err.response.status === 0) {
      try {
        if (!netErrNotified) {
          netErrNotified = true;
          const origin = window.location.origin || '';
          NotifyPlugin.error({
            title: '无法连接后端',
            content: '可能后端未启动，或前端跨域(CORS)被拦截。',
            footer: () =>
              h(
                TButton,
                {
                  theme: 'primary',
                  variant: 'base',
                  size: 'small',
                  onClick: () => showNetErrDetail(origin),
                },
                () => '查看解决办法',
              ),
            duration: 0,
            closeBtn: true,
          });
        }
      } catch (e) { /* ignore */ }
    }
    return Promise.reject(err);
  },
);

/** 业务请求统一入口：返回值为已解密的 ApiResponse */
export default function request<T = any>(config: Parameters<typeof instance.request>[0]): Promise<ApiResponse<T>> {
  return instance.request(config) as unknown as Promise<ApiResponse<T>>;
}
