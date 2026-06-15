import request from '@/utils/request';

/** 批量任务配置 - 列表 */
export function batchTaskListApi(params: Record<string, any>) {
  return request({
    url: '/batch_task/list',
    method: 'post',
    data: params,
  });
}

/** 批量任务配置 - 删除 */
export function batchTaskDelApi(params: Record<string, any>) {
  return request({
    url: '/batch_task/del',
    method: 'get',
    params,
  });
}

/** 批量任务配置 - 编辑 */
export function batchTaskEditApi(params: Record<string, any>) {
  return request({
    url: '/batch_task/edit',
    method: 'post',
    data: params,
  });
}

/** 批量任务配置 - 添加 */
export function batchTaskAddApi(params: Record<string, any>) {
  return request({
    url: '/batch_task/add',
    method: 'post',
    data: params,
  });
}

/** 批量任务配置 - 详情 */
export function batchTaskDetailApi(params: Record<string, any>) {
  return request({
    url: '/batch_task/detail',
    method: 'get',
    params,
  });
}

/** 批量任务配置 - 手工触发 */
export function batchTaskManualApi(params: Record<string, any>) {
  return request({
    url: '/batch_task/manual',
    method: 'get',
    params,
  });
}
