import request from '@/utils/request';

/** 【数据分析】查询周期区间国家级别攻击和正常信息 */
export function wafanalysisdaycountryrange(params: Record<string, any>) {
  return request({
    url: 'analysis/wafanalysisdaycountryrange',
    method: 'get',
    params,
  });
}

/** 查询爬虫情况 */
export function wafAnalysisSpider(params: Record<string, any>) {
  return request({
    url: 'analysis/spider',
    method: 'get',
    params,
  });
}
