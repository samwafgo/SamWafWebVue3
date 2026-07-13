import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { API_HOST } from '@/config/host';
import router from '@/router';
import { AesDecrypt, AesEncrypt } from '@/utils/crypto';
import { clearLocalStorageExceptPreserved, saveCurrentUrl } from '@/constants';
import { getRequestTimeout, DEFAULT_REQUEST_TIMEOUT } from '@/config/requestTimeout';
import { h } from 'vue';
import { NotifyPlugin, DialogPlugin, MessagePlugin, Button as TButton } from 'tdesign-vue-next';

// 连接失败(网络/跨域)提示：每次页面加载最多提示一次，避免刷屏
let netErrNotified = false;
// 请求超时提示的节流时间戳：并发超时时 3 秒内只提示一次，避免刷屏
let lastTimeoutNotifyAt = 0;

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

// 超时后“重试”：重新发起同一请求（请求拦截器会刷新 X-Request-Time/X-Request-Id，不会触发防重放）。
// 仅重发这一条请求，不刷新整页，避免丢失表单等状态。
function retryTimedOutRequest(config: any) {
  if (!config) return;
  instance
    .request(config)
    .then(() => MessagePlugin.success('重试成功'))
    .catch(() => { /* 再次失败会由拦截器再次提示，无需重复处理 */ });
}

// 应急恢复入口：仅在后端配置了应急入口（App.vue 启动时拉取并缓存到 localStorage）时可用。
function getEmergencyPath(): string {
  try {
    return localStorage.getItem('__samwaf_emergency_path__') || '';
  } catch (e) {
    return '';
  }
}
function showEmergencyRecovery() {
  const path = getEmergencyPath();
  if (!path) {
    MessagePlugin.warning('当前未启用应急入口，无法进入应急模式');
    return;
  }
  let dialog: any;
  dialog = DialogPlugin.confirm({
    header: '应急恢复模式',
    body: '[适用于升级异常场景] 若升级后前端/后端异常，可进入应急恢复模式，在不依赖前端的情况下执行版本回退。是否进入？',
    confirmBtn: '进入紧急模式',
    cancelBtn: '取消',
    onConfirm: () => {
      window.location.href = path + '?back=' + encodeURIComponent(window.location.href);
      dialog.hide();
    },
    onCancel: () => dialog.hide(),
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
  // 不在此写死超时：改到请求拦截器里按 localStorage 动态取（getRequestTimeout），
  // 这样"设置抽屉-常规设置"改完立即生效，无需刷新；单条请求也可自带更长超时（如 AI 生成）。
  timeout: 0,
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
  // 未显式指定超时的请求，按当前 localStorage 配置动态套用（0/未设都视为未指定）；
  // 单条请求自带的超时（如 AI 生成的长超时）保持不变。
  if (!config.timeout) {
    config.timeout = getRequestTimeout();
  }
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
    // 超时：后端“可达但响应过慢”（或网络慢），并非连不上/跨域。axios 超时表现为 code=ECONNABORTED 且无 response，
    // 若不单独处理会落入下面的「无法连接后端(CORS)」分支造成误导。这里单独提示（含超时秒数）并提供“重试”。
    const isTimeout =
      err.code === 'ECONNABORTED' ||
      (typeof err.message === 'string' && err.message.indexOf('timeout') !== -1);
    if (isTimeout) {
      try {
        const seconds = Math.round((((err.config && err.config.timeout) || DEFAULT_REQUEST_TIMEOUT)) / 1000);
        const now = Date.now();
        if (now - lastTimeoutNotifyAt > 3000) {
          lastTimeoutNotifyAt = now;
          const cfg = err.config;
          NotifyPlugin.warning({
            title: '请求超时',
            content: `请求已超过 ${seconds} 秒未响应，后端可能繁忙或网络较慢，请重试。`,
            footer: () => {
              const hasEmergency = !!getEmergencyPath();
              return h(
                'div',
                { style: 'display:flex;gap:8px;justify-content:flex-end' },
                [
                  h(
                    TButton,
                    {
                      theme: 'primary',
                      variant: 'base',
                      size: 'small',
                      onClick: () => retryTimedOutRequest(cfg),
                    },
                    () => '重试',
                  ),
                  hasEmergency
                    ? h(
                        TButton,
                        {
                          theme: 'default',
                          variant: 'outline',
                          size: 'small',
                          onClick: () => showEmergencyRecovery(),
                        },
                        () => '应急恢复',
                      )
                    : null,
                ],
              );
            },
            duration: 0,
            closeBtn: true,
          });
        }
      } catch (e) { /* ignore */ }
      return Promise.reject(err);
    }
    // 无响应(网络失败/跨域被拦截)：明确告知改哪个 yml 字段、填什么值。回环/本机应被后端始终放行，
    // 故非回环来源无响应大概率是 CORS 被拦。超时已在上方 return，不会走到这里。
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
