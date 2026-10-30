import request from '@/utils/request';
import { API_HOST } from '@/config/host';
import { v4 as uuidv4 } from 'uuid';
import { decryptIncoming } from '@/utils/seccrypto';

const base = '/waflog/exports';

async function exportRequest(config: Parameters<typeof request>[0]) {
  const res = await request(config);
  // 成功响应由公共拦截器解密，错误详情按相同传输协议解析。
  if (res && res.code !== 0 && typeof res.data === 'string' && res.data) {
    try {
      res.data = JSON.parse(decryptIncoming(res.data));
    } catch {
      // Preserve the response code and message.
    }
  }
  return res;
}

export const exportCapabilities = () => exportRequest({ url: `${base}/capabilities`, method: 'get' });
export const createLogExport = (data: Record<string, unknown>) => exportRequest({ url: base, method: 'post', data });
export const listLogExports = (params: { page: number; page_size: number }) =>
  exportRequest({ url: base, method: 'get', params, background: true });
export const getLogExport = (id: string) =>
  exportRequest({ url: `${base}/${encodeURIComponent(id)}`, method: 'get', background: true });
export const cancelLogExport = (id: string) =>
  exportRequest({ url: `${base}/${encodeURIComponent(id)}/cancel`, method: 'post' });
export const deleteLogExport = (id: string) =>
  exportRequest({ url: `${base}/${encodeURIComponent(id)}`, method: 'delete' });
export const logExportTicket = (id: string) =>
  exportRequest({ url: `${base}/${encodeURIComponent(id)}/download-ticket`, method: 'post' });

export function startLogExportDownload(id: string, ticket: string) {
  const url = new URL(`${API_HOST}${base}/${encodeURIComponent(id)}/download`, window.location.origin);
  url.searchParams.set('ticket', ticket);
  url.searchParams.set('X-Request-Time', Math.floor(Date.now() / 1000).toString());
  url.searchParams.set('X-Request-Id', uuidv4());
  const link = document.createElement('a');
  link.href = url.toString();
  link.referrerPolicy = 'no-referrer';
  link.rel = 'noreferrer';
  // Browser navigation streams the attachment without buffering it in JavaScript.
  document.body.appendChild(link);
  link.click();
  link.remove();
}
