import request from '@/utils/request';

/** 查询所有主机列表（下拉等场景） */
export function allhost(params?: Record<string, any>) {
  return request({
    url: 'wafhost/host/allhost',
    method: 'get',
    params,
  });
}

/** 通过主机 Code 查询所有主机域名信息 */
export function alldomainbyhostcode(params: Record<string, any>) {
  return request({
    url: 'wafhost/host/alldomainbyhostcode',
    method: 'get',
    params,
  });
}

/** 查询主机列表（分页） */
export function hostlist(data: Record<string, any>) {
  return request({
    url: 'wafhost/host/list',
    method: 'post',
    data,
  });
}

/** 更改防护状态 */
export function changeGuardStatus(params: Record<string, any>) {
  return request({
    url: 'wafhost/host/guardstatus',
    method: 'get',
    params,
  });
}

/** 更改启动状态 */
export function changeStartStatus(params: Record<string, any>) {
  return request({
    url: 'wafhost/host/startstatus',
    method: 'get',
    params,
  });
}

/** 加载主机详情 */
export function getHostDetail(params: Record<string, any>) {
  return request({
    url: 'wafhost/host/detail',
    method: 'get',
    params,
  });
}

/** 删除主机 */
export function delHost(params: Record<string, any>) {
  return request({
    url: 'wafhost/host/del',
    method: 'get',
    params,
  });
}

/** 添加主机 */
export function addHost(data: Record<string, any>) {
  return request({
    url: 'wafhost/host/add',
    method: 'post',
    data,
  });
}

/** 编辑主机 */
export function editHost(data: Record<string, any>) {
  return request({
    url: 'wafhost/host/edit',
    method: 'post',
    data,
  });
}

/** 修改所有主机的防护状态 */
export function modifyAllGuardStatus(data: Record<string, any>) {
  return request({
    url: 'wafhost/host/modfiyallstatus',
    method: 'post',
    data,
  });
}

/** 批量复制配置 */
export function batchCopyConfig(data: Record<string, any>) {
  return request({
    url: 'wafhost/host/batchcopyconfig',
    method: 'post',
    data,
  });
}

/** 查看最近到达的真实请求头(排查"真实IP来源"配置) */
export function getIpSourceProbe(params: Record<string, any>) {
  return request({
    url: 'wafhost/host/ipsource/probe',
    method: 'get',
    params,
  });
}

/** 清空真实IP来源诊断采样 */
export function clearIpSourceProbe(params: Record<string, any>) {
  return request({
    url: 'wafhost/host/ipsource/probe/clear',
    method: 'get',
    params,
  });
}

/** 端口监听表冲突预检（保存前提示，issue #955） */
export function checkHostPorts(data: Record<string, any>) {
  return request({
    url: 'wafhost/host/checkports',
    method: 'post',
    data,
  });
}

/** 端口占用总览：全机端口→协议→占用站点 */
export function getPortOverview(params?: Record<string, any>) {
  return request({
    url: 'wafhost/port/overview',
    method: 'get',
    params,
  });
}
