import axios from 'axios';
import request from '@/utils/request';
import { decryptIncoming, resetSecSession } from '@/utils/seccrypto';

export type ReportKind = 'daily' | 'weekly' | 'monthly';

export interface ReportConfig {
  enabled: boolean;
  daily_enabled: boolean;
  weekly_enabled: boolean;
  monthly_enabled: boolean;
  daily_at: string;
  weekly_at: string;
  monthly_at: string;
  retain_days: number;
  quota_mb: number;
  top_n: number;
  language: string;
}

export interface ReportConfigView extends ReportConfig {
  timezone: string;
  timezone_offset: number;
  server_time: number;
}

export interface ReportTask {
  id: string;
  kind: ReportKind;
  range_start: number;
  range_end: number;
  created_at: number;
  completed_at: number;
  status: string;
  source: string;
  size_bytes: number;
  error_message: string;
}

export class ReportRequestError extends Error {
  constructor(message: string, public apiCode?: number) {
    super(message);
  }
}

const base = '/samwaf/report';
export const getReportConfig = () => request<ReportConfigView>({ url: `${base}/config`, method: 'get', background: true });
export const saveReportConfig = (data: ReportConfig) => request({ url: `${base}/config`, method: 'post', data });
export const listReports = (params: { pageIndex: number; pageSize: number }) =>
  request<{ list: ReportTask[]; total: number }>({ url: `${base}/list`, method: 'get', params, background: true });
export const createReport = (data: { kind: ReportKind; date: string }) =>
  request<ReportTask>({ url: `${base}/create`, method: 'post', data });
export const deleteReport = (id: string) => request({ url: `${base}/delete`, method: 'post', data: { id } });

export async function downloadReport(id: string, retried = false): Promise<Blob> {
  let body: unknown;
  try {
    body = await request({
      url: `${base}/download`,
      method: 'post',
      data: { id },
      responseType: 'blob',
      headers: { Accept: 'text/html, application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (error) {
    if (!axios.isAxiosError(error) || !(error.response?.data instanceof Blob)) throw error;
    body = error.response.data;
  }
  if (body instanceof Blob && body.type.toLowerCase().includes('text/html')) return body;
  if (body instanceof Blob) {
    try {
      body = JSON.parse(await body.text());
    } catch {
      throw new ReportRequestError('REPORT_DOWNLOAD_FAILED');
    }
  }
  if (!body || typeof body !== 'object') throw new ReportRequestError('REPORT_DOWNLOAD_FAILED');
  const response = body as { code?: number; msg?: string; data?: unknown };
  if (response.code === -5 && !retried) {
    resetSecSession();
    return downloadReport(id, true);
  }
  if (typeof response.data === 'string' && response.data) {
    try {
      response.data = JSON.parse(decryptIncoming(response.data));
    } catch {
      // 保留接口返回的提示。
    }
  }
  throw new ReportRequestError(response.msg || 'REPORT_DOWNLOAD_FAILED', response.code);
}
