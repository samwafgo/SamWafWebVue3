import request from '@/utils/request';

/** IP数据库管理 - 获取状态 */
export function getIPDBStatusApi() {
  return request({
    url: '/iplocation/status',
    method: 'get',
  });
}

/** IP数据库管理 - 获取配置 */
export function getIPDBConfigApi() {
  return request({
    url: '/iplocation/config',
    method: 'get',
  });
}

/** IP数据库管理 - 保存配置 */
export function saveIPDBConfigApi(data: Record<string, any>) {
  return request({
    url: '/iplocation/config/save',
    method: 'post',
    data,
  });
}

/** IP数据库管理 - 上传文件 */
export function uploadIPDBFileApi(data: Record<string, any>) {
  return request({
    url: '/iplocation/upload',
    method: 'post',
    data,
  });
}

/** IP数据库管理 - 重新加载 */
export function reloadIPDBApi() {
  return request({
    url: '/iplocation/reload',
    method: 'post',
  });
}

/** IP数据库管理 - 测试IP查询 */
export function testIPLookupApi(data: Record<string, any>) {
  return request({
    url: '/iplocation/test',
    method: 'post',
    data,
  });
}
