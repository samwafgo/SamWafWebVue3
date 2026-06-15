import { fetchEventSource } from '@microsoft/fetch-event-source';
import { AesDecrypt, AesEncrypt } from './crypto';
import { API_HOST } from '@/config/host';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FetchChatStreamOptions {
  history: ChatMessage[];
  q: string;
  ctrl: AbortController;
  onSuccess: (msg: { role: string; content: string }) => void;
  onError: (errorMsg: string) => void;
  onComplete: (msg?: string) => void;
}

/** AI 助手流式对话（请求体 AES 加密，响应内容 AES 解密） */
export function fetchChatStream({ history, q: _q, ctrl, onSuccess, onError, onComplete }: FetchChatStreamOptions) {
  const requestData = {
    history: history
      .filter((item) => item.role && item.content)
      .slice(-3)
      .map((item) => [item.role, item.content]),
  };
  const encryptedData = AesEncrypt(JSON.stringify(requestData));

  fetchEventSource(`${API_HOST}/gpt/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': localStorage.getItem('access_token') || '',
    },
    body: encryptedData,
    signal: ctrl.signal,
    onopen(e) {
      if (e.ok && e.headers.get('content-type') === 'text/event-stream') {
        return Promise.resolve();
      }
      if (e.headers.get('content-type') === 'application/json') {
        return e
          .json()
          .then(() => {
            onError('出错了,请稍后刷新重试1');
          })
          .catch(() => {
            onError('出错了,请稍后刷新重试2');
          });
      }
      return Promise.resolve();
    },
    onmessage(msg) {
      if (typeof msg.data !== 'string' || msg.data.trim() === '') {
        onSuccess({ content: '远程服务器返回了非JSON数据', role: 'assistant' });
        return;
      }
      try {
        const res = JSON.parse(msg.data);
        if (typeof res.content === 'string') {
          res.content = AesDecrypt(res.content);
        }
        onSuccess(res);
      } catch (error) {
        console.log('JSON 解析失败:', error, '原始数据:', msg.data);
        onSuccess({ content: '远程服务器返回了非JSON数据', role: 'assistant' });
      }
    },
    onclose() {
      onComplete('连接已关闭，请稍后重试');
    },
    onerror() {
      onError('出错了,请稍后刷新重试3');
      // 抛出异常阻止 fetchEventSource 内部自动重试
      throw new Error('chat stream error');
    },
  });
}
