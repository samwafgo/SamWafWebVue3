import request from '@/utils/request';

/** SSL 证书到期监测 - 列表 */
export function wafSslExpireListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sslexpire/list',
    method: 'post',
    data: params,
  });
}

/** SSL 证书到期监测 - 删除 */
export function wafSslExpireDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sslexpire/del',
    method: 'get',
    params,
  });
}

/** SSL 证书到期监测 - 编辑 */
export function wafSslExpireEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sslexpire/edit',
    method: 'post',
    data: params,
  });
}

/** SSL 证书到期监测 - 添加 */
export function wafSslExpireAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sslexpire/add',
    method: 'post',
    data: params,
  });
}

/** SSL 证书到期监测 - 详细 */
export function wafSslExpireDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/sslexpire/detail',
    method: 'get',
    params,
  });
}

/** SSL 证书到期监测 - 立即发起检测 */
export function wafSslExpireNowCheckApi() {
  return request({
    url: '/wafhost/sslexpire/nowcheck',
    method: 'get',
  });
}

/** SSL 证书到期监测 - 同步已有域名 */
export function wafSslExpireSyncHostApi() {
  return request({
    url: '/wafhost/sslexpire/sync_host',
    method: 'get',
  });
}
