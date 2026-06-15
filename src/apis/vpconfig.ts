import request from '@/utils/request';

/** 更新管理端 IP 白名单 */
export function updateIpWhitelistApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateIpWhitelist',
    method: 'post',
    data,
  });
}

/** 获取管理端 IP 白名单 */
export function getIpWhitelistApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getIpWhitelist',
    method: 'get',
    params,
  });
}

/** 更新SSL启用状态 */
export function updateSslEnableApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateSslEnable',
    method: 'post',
    data,
  });
}

/** 获取SSL状态 */
export function getSslStatusApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getSslStatus',
    method: 'get',
    params,
  });
}

/** 上传SSL证书 */
export function uploadSslCertApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/uploadSslCert',
    method: 'post',
    data,
  });
}

/** 重启管理端 */
export function restartManagerApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/restartManager',
    method: 'post',
    data,
  });
}

/** 获取安全路径入口配置 */
export function getSecurityEntryApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getSecurityEntry',
    method: 'get',
    params,
  });
}

/** 更新安全路径入口配置 */
export function updateSecurityEntryApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateSecurityEntry',
    method: 'post',
    data,
  });
}

/** 获取通知标题前缀 */
export function getNoticeTitleApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getNoticeTitle',
    method: 'get',
    params,
  });
}

/** 更新通知标题前缀 */
export function updateNoticeTitleApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateNoticeTitle',
    method: 'post',
    data,
  });
}

/** 获取域名白名单 */
export function getDomainWhitelistApi(params: Record<string, any>) {
  return request({
    url: 'vipconfig/getDomainWhitelist',
    method: 'get',
    params,
  });
}

/** 更新域名白名单 */
export function updateDomainWhitelistApi(data: Record<string, any>) {
  return request({
    url: 'vipconfig/updateDomainWhitelist',
    method: 'post',
    data,
  });
}
