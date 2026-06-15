import request from '@/utils/request';

/** 任务 - 列表 */
export function wafTaskListApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/task/list',
    method: 'post',
    data: params,
  });
}

/** 任务 - 删除 */
export function wafTaskDelApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/task/del',
    method: 'get',
    params,
  });
}

/** 任务 - 编辑 */
export function wafTaskEditApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/task/edit',
    method: 'post',
    data: params,
  });
}

/** 任务 - 添加 */
export function wafTaskAddApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/task/add',
    method: 'post',
    data: params,
  });
}

/** 任务 - 详细 */
export function wafTaskDetailApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/task/detail',
    method: 'get',
    params,
  });
}

/** 任务 - 手工执行 */
export function wafTaskManualExecApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/task/manual_exec',
    method: 'get',
    params,
  });
}

/** 任务 - 获取任务日志 */
export function wafTaskLogApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/task/log',
    method: 'get',
    params,
  });
}

/** 任务 - 清空任务日志 */
export function wafTaskLogClearApi(params: Record<string, any>) {
  return request({
    url: '/wafhost/task/log/clear',
    method: 'get',
    params,
  });
}
