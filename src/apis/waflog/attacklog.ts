import request from '@/utils/request';

/** 访问日志列表 */
export function attacklogVisitListApi(data: Record<string, any>) {
  return request({
    url: '/waflog/attack/list',
    method: 'post',
    data,
  });
}

/** 查询攻击日志列表 */
export function attacklogList(params: Record<string, any>) {
  return request({
    url: '/waflog/attacklog/list',
    method: 'get',
    params,
  });
}

/** 查询存档日志库列表 */
export function allsharedblist() {
  return request({
    url: 'waflog/attack/allsharedb',
    method: 'get',
  });
}

/** 导出 json 数据 */
export function exportlog(_params?: Record<string, any>) {
  return request({
    url: 'waflog/attack/export',
    method: 'get',
  });
}

/** 下载已经生成好的数据 */
export function downloadlog() {
  return request({
    url: 'waflog/attack/download',
    method: 'get',
  });
}

/** 查看日志详情 */
export function geWebLogDetail(params: Record<string, any>) {
  return request({
    url: 'waflog/attack/detail',
    method: 'get',
    params,
  });
}

/** 复制脱敏后数据 */
export function getHeaderCopyDetail(params: Record<string, any>) {
  return request({
    url: 'waflog/attack/httpcopymask',
    method: 'get',
    params,
  });
}

/** 危险 IP 列表 */
export function attackIpListApi(data: Record<string, any>) {
  return request({
    url: 'waflog/attack/attackiplist',
    method: 'post',
    data,
  });
}

/** 查询攻击 iptag 列表 */
export function allattacktaglist(params: Record<string, any>) {
  return request({
    url: 'waflog/attack/alliptag',
    method: 'get',
    params,
  });
}

/** 删除 tag（设置超长超时时间，因为删除大量日志需要较长时间） */
export function deleteTagByNameApi(data: Record<string, any>) {
  return request({
    url: 'waflog/attack/deletetagbyname',
    method: 'post',
    data,
    timeout: 600000, // 10分钟超时，适用于大数据量删除
  });
}
