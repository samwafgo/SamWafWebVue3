<template>
  <div class="sp-page">
    <!-- 查询条件 -->
    <t-card class="sp-card">
      <div class="sp-bar">
        <span class="sp-lb">{{ t('page.source_path.label_day') }}</span>
        <t-date-picker v-model="day" :style="{ width: '150px' }" @change="reload" />
        <span class="sp-lb">{{ t('page.source_path.label_host') }}</span>
        <t-select
          v-model="hostCode"
          clearable
          filterable
          :style="{ width: '200px' }"
          :placeholder="t('page.source_path.all_hosts')"
          @change="reload"
        >
          <t-option v-for="item in hostOptions" :key="item.value" :value="item.value" :label="item.label" />
        </t-select>
        <span class="sp-lb">Top</span>
        <t-select v-model="limit" :style="{ width: '90px' }" @change="reload">
          <t-option v-for="n in [20, 50, 100]" :key="n" :value="n" :label="String(n)" />
        </t-select>
        <t-button theme="primary" :loading="loading" @click="reload">{{ t('common.search') }}</t-button>
        <span class="sp-flex"></span>
        <span class="sp-tip">{{ t('page.source_path.day_level_tip') }}</span>
      </div>
    </t-card>

    <!-- 判定阈值：就地改就地存，与访问日志页的「日志配置」卡同款 -->
    <t-card class="sp-card">
      <div class="sp-bar">
        <span class="sp-lb"
          ><b>{{ t('page.source_path.label_threshold') }}</b></span
        >
        <span class="sp-lb">{{ t('page.source_path.th_scan_prefix') }}</span>
        <t-input-number v-model="thScan" :min="1" :max="100000" theme="column" :style="{ width: '110px' }" />
        <span class="sp-lb">{{ t('page.source_path.th_scan_suffix') }}</span>
        <span class="sp-gap"></span>
        <span class="sp-lb">{{ t('page.source_path.th_ua_prefix') }}</span>
        <t-input-number v-model="thUa" :min="1" :max="10000" theme="column" :style="{ width: '110px' }" />
        <span class="sp-lb">{{ t('page.source_path.th_ua_suffix') }}</span>
        <t-button variant="outline" size="small" :loading="thSaving" @click="saveThreshold">
          {{ t('page.source_path.save_as_default') }}
        </t-button>
        <span class="sp-flex"></span>
        <span class="sp-tip">{{ t('page.source_path.threshold_tip') }}</span>
      </div>
    </t-card>

    <!-- 摘要 -->
    <div class="sp-kpis">
      <t-card class="sp-kpi">
        <div class="k">{{ t('page.source_path.kpi_actor') }}</div>
        <div class="v">{{ actorResp.total_actor || 0 }}</div>
        <div class="d">{{ t('page.source_path.kpi_actor_desc') }}</div>
      </t-card>
      <t-card class="sp-kpi">
        <div class="k">{{ t('page.source_path.kpi_path') }}</div>
        <div class="v">{{ pathResp.total_path || 0 }}</div>
        <div class="d">{{ t('page.source_path.kpi_path_desc') }}</div>
      </t-card>
      <t-card class="sp-kpi sp-clickable" :class="{ on: kpiFilter === 'scan' }" @click="toggleKpi('scan')">
        <div class="k">
          {{ t('page.source_path.kpi_scan') }}
          <t-tag size="small" theme="warning" variant="light">{{ t('page.source_path.click_filter') }}</t-tag>
        </div>
        <div class="v warn">{{ actorResp.scan_actor || 0 }}</div>
        <div class="d">{{ t('page.source_path.kpi_scan_desc', { n: actorResp.scan_threshold || thScan }) }}</div>
      </t-card>
      <t-card class="sp-kpi sp-clickable" :class="{ on: kpiFilter === 'ua' }" @click="toggleKpi('ua')">
        <div class="k">
          {{ t('page.source_path.kpi_ua') }}
          <t-tag size="small" theme="warning" variant="light">{{ t('page.source_path.click_filter') }}</t-tag>
        </div>
        <div class="v warn">{{ actorResp.ua_actor || 0 }}</div>
        <div class="d">{{ t('page.source_path.kpi_ua_desc', { n: actorResp.ua_threshold || thUa }) }}</div>
      </t-card>
    </div>

    <!-- 行为视角 -->
    <t-card class="sp-card" :title="t('page.source_path.actor_title')" :subtitle="t('page.source_path.actor_sub')">
      <t-table
        :data="actorRows"
        :columns="actorColumns"
        row-key="actor_key"
        size="small"
        :loading="loading"
        :sort="actorSort"
        hover
        @sort-change="onActorSort"
      >
        <template #actor_key="{ row }">
          <t-link theme="primary" hover="color" @click="openDrawer('actor', row.actor_key)">{{ row.actor_key }}</t-link>
        </template>
        <template #distinct_path="{ row }">
          <span :class="{ 'sp-danger': row.distinct_path >= (actorResp.scan_threshold || thScan) }">{{
            row.distinct_path
          }}</span>
        </template>
        <template #ua_cnt="{ row }">
          <span :class="{ 'sp-warn': row.ua_cnt >= (actorResp.ua_threshold || thUa) }">{{ row.ua_cnt }}</span>
        </template>
        <template #verdict="{ row }">
          <t-tag v-if="row.distinct_path >= (actorResp.scan_threshold || thScan)" theme="danger" variant="light" size="small">
            {{ t('page.source_path.verdict_scan') }}
          </t-tag>
          <t-tag v-else-if="row.ua_cnt >= (actorResp.ua_threshold || thUa)" theme="warning" variant="light" size="small">
            {{ t('page.source_path.verdict_ua') }}
          </t-tag>
          <t-tag v-else-if="row.deny_cnt > 0" theme="warning" variant="light" size="small">
            {{ t('page.source_path.verdict_denied') }}
          </t-tag>
          <span v-else class="sp-muted">—</span>
        </template>
        <template #op="{ row }">
          <t-space size="small">
            <t-link theme="danger" hover="color" @click="disposal(row.actor_key, 'block')">{{
              t('page.source_path.op_block')
            }}</t-link>
            <t-link theme="primary" hover="color" @click="disposal(row.actor_key, 'allow')">{{
              t('page.source_path.op_allow')
            }}</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 目标视角 -->
    <t-card class="sp-card" :title="t('page.source_path.path_title')" :subtitle="t('page.source_path.path_sub')">
      <t-table
        :data="pathResp.list || []"
        :columns="pathColumns"
        row-key="path_norm"
        size="small"
        :loading="loading"
        :sort="pathSort"
        hover
        @sort-change="onPathSort"
      >
        <template #path_norm="{ row }">
          <t-link theme="primary" hover="color" @click="openDrawer('path', row.path_norm)">{{ row.path_norm }}</t-link>
          <t-tag v-if="row.path_norm === '{overflow}'" theme="warning" variant="light" size="small" style="margin-left: 6px">
            {{ t('page.source_path.overflow_tip') }}
          </t-tag>
        </template>
        <template #top_rule="{ row }">
          <t-tag v-if="row.top_rule" theme="danger" variant="light" size="small">{{ row.top_rule }}</t-tag>
          <span v-else class="sp-muted">—</span>
        </template>
      </t-table>
    </t-card>

    <!-- 下钻抽屉 -->
    <t-drawer v-model:visible="drawerVisible" :header="drawerTitle" size="640px" :footer="false">
      <div v-if="detail">
        <t-descriptions :column="3" size="small" bordered>
          <t-descriptions-item :label="t('page.source_path.d_req')">{{ detail.req_cnt }}</t-descriptions-item>
          <t-descriptions-item :label="t('page.source_path.d_deny')">{{ detail.deny_cnt }}</t-descriptions-item>
          <t-descriptions-item :label="t('page.source_path.d_err4xx')">{{ detail.err4xx_cnt }}</t-descriptions-item>
        </t-descriptions>

        <template v-if="detail.kind === 'actor'">
          <div class="sp-sect">{{ t('page.source_path.d_paths') }}</div>
          <t-table :data="detail.paths || []" :columns="dPathCols" row-key="path_norm" size="small" />
          <div class="sp-sect">{{ t('page.source_path.d_uas') }}</div>
          <t-table :data="detail.uas || []" :columns="dUaCols" row-key="ua_hash" size="small" />
          <div class="sp-sect">
            {{ t('page.source_path.d_hosts') }}
            <span class="sp-tip">{{ t('page.source_path.d_hosts_tip') }}</span>
          </div>
          <t-table :data="detail.hosts || []" :columns="dHostCols" row-key="host_code" size="small">
            <template #host_code="{ row }">{{ hostName(row.host_code) }}</template>
          </t-table>

          <div class="sp-sect">{{ t('page.source_path.d_actions') }}</div>
          <t-space break-line>
            <t-button theme="danger" @click="disposal(detail.key, 'block')">{{ t('page.source_path.op_block') }}</t-button>
            <t-button variant="outline" @click="disposal(detail.key, 'allow')">{{ t('page.source_path.op_allow') }}</t-button>
            <t-button variant="outline" @click="gotoLog(detail.key)">{{ t('page.source_path.op_log') }}</t-button>
          </t-space>
        </template>

        <template v-else>
          <div class="sp-sect">{{ t('page.source_path.d_actors') }}</div>
          <t-table :data="detail.actors || []" :columns="dActorCols" row-key="actor_key" size="small" />
          <div class="sp-sect">{{ t('page.source_path.d_rules') }}</div>
          <t-table :data="detail.rules || []" :columns="dRuleCols" row-key="rule" size="small" />
        </template>
      </div>
    </t-drawer>

    <ip-disposal
      v-model:visible="disposalVisible"
      :ip="disposalIp"
      :mode="disposalMode"
      :host-candidates="disposalHosts"
      :prefer-host-code="hostCode"
      :remarks="disposalRemarks"
      @success="reload"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import type { TableProps } from 'tdesign-vue-next';

import { analysisActorList, analysisDetail, analysisPathList } from '@/apis/analysis_view';
import { allhost } from '@/apis/host';
import { edit_system_config_api, get_detail_by_item_api } from '@/apis/systemconfig';
import IpDisposal from '@/components/ip-disposal/index.vue';

const TH_SCAN = 'analysis_scan_path_threshold';
const TH_UA = 'analysis_ua_threshold';

// 来源与路径分析（M5/G3）。
// 两张表都从 stats_actor_path_days 来，只是 GROUP BY 的维度不同：
// 按 actor_key 出「谁在打」，按 path_norm 出「打哪里」。
// 去重数是服务端 COUNT(DISTINCT) 现算的，库里没这两列。
const { t } = useI18n();
const router = useRouter();

const loading = ref(false);
const day = ref(todayStr());
const hostCode = ref('');
const limit = ref(20);
const hostOptions = ref<Array<{ value: string; label: string }>>([]);
const hostDic = ref<Record<string, string>>({});

const thScan = ref(20);
const thUa = ref(5);
const thItems = reactive<Record<string, any>>({});
const thSaving = ref(false);

const actorResp = ref<Record<string, any>>({});
const pathResp = ref<Record<string, any>>({});
const actorSort = ref({ sortBy: 'distinct_path', descending: true });
const pathSort = ref({ sortBy: 'req_cnt', descending: true });
const kpiFilter = ref('');

const drawerVisible = ref(false);
const detail = ref<Record<string, any> | null>(null);

const disposalVisible = ref(false);
const disposalIp = ref('');
const disposalMode = ref('block');
const disposalHosts = ref<any[]>([]);
const disposalRemarks = ref('');

// KPI 点击后只是把当前页的行过滤一下，不再往服务端跑一趟
const actorRows = computed<any[]>(() => {
  const list = (actorResp.value.list || []) as any[];
  if (kpiFilter.value === 'scan') {
    return list.filter((r) => r.distinct_path >= (actorResp.value.scan_threshold || thScan.value));
  }
  if (kpiFilter.value === 'ua') {
    return list.filter((r) => r.ua_cnt >= (actorResp.value.ua_threshold || thUa.value));
  }
  return list;
});

const drawerTitle = computed(() => {
  if (!detail.value) return '';
  const title =
    detail.value.kind === 'actor' ? t('page.source_path.drawer_actor') : t('page.source_path.drawer_path');
  return `${title} · ${detail.value.key}`;
});

const colT = (k: string) => t(`page.source_path.col_${k}`);

const actorColumns = computed<TableProps['columns']>(() => [
  { colKey: 'actor_key', title: colT('actor'), width: 190 },
  { colKey: 'distinct_path', title: colT('distinct_path'), width: 120, sorter: true },
  { colKey: 'req_cnt', title: colT('req'), width: 100, sorter: true },
  { colKey: 'deny_cnt', title: colT('deny'), width: 100, sorter: true },
  { colKey: 'err4xx_cnt', title: colT('err4xx'), width: 110, sorter: true },
  { colKey: 'ua_cnt', title: colT('ua'), width: 90 },
  { colKey: 'verdict', title: colT('verdict'), width: 130 },
  { colKey: 'op', title: colT('op'), width: 130 },
]);

const pathColumns = computed<TableProps['columns']>(() => [
  { colKey: 'path_norm', title: colT('path'), minWidth: 260 },
  { colKey: 'req_cnt', title: colT('req'), width: 110, sorter: true },
  { colKey: 'deny_cnt', title: colT('deny'), width: 110, sorter: true },
  { colKey: 'err4xx_cnt', title: colT('err4xx'), width: 120, sorter: true },
  { colKey: 'distinct_actor', title: colT('distinct_actor'), width: 120, sorter: true },
  { colKey: 'top_rule', title: colT('top_rule'), width: 170 },
]);

const dPathCols = computed<TableProps['columns']>(() => [
  { colKey: 'path_norm', title: colT('path'), minWidth: 220 },
  { colKey: 'req_cnt', title: colT('req'), width: 80 },
  { colKey: 'deny_cnt', title: colT('deny'), width: 80 },
  { colKey: 'err4xx_cnt', title: colT('err4xx'), width: 90 },
]);

const dActorCols = computed<TableProps['columns']>(() => [
  { colKey: 'actor_key', title: colT('actor'), minWidth: 200 },
  { colKey: 'req_cnt', title: colT('req'), width: 80 },
  { colKey: 'deny_cnt', title: colT('deny'), width: 80 },
  { colKey: 'err4xx_cnt', title: colT('err4xx'), width: 90 },
]);

const dUaCols = computed<TableProps['columns']>(() => [
  { colKey: 'ua_hash', title: t('page.source_path.col_ua_hash'), minWidth: 200 },
  { colKey: 'cnt', title: t('page.source_path.col_req'), width: 90 },
]);

const dHostCols = computed<TableProps['columns']>(() => [
  { colKey: 'host_code', title: colT('host'), minWidth: 200 },
  { colKey: 'req_cnt', title: colT('req'), width: 90 },
  { colKey: 'deny_cnt', title: colT('deny'), width: 90 },
]);

const dRuleCols = computed<TableProps['columns']>(() => [
  { colKey: 'rule', title: t('page.source_path.col_rule'), minWidth: 200 },
  { colKey: 'cnt', title: t('page.source_path.col_req'), width: 90 },
]);

onMounted(() => {
  loadHosts();
  loadThreshold();
  reload();
});

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 后端按 int 的 yyyymmdd 存 day，界面用日期控件，这里做一次换算
function dayInt(): number {
  return parseInt(String(day.value).replace(/-/g, ''), 10) || 0;
}

function hostName(code: string): string {
  return hostDic.value[code] || code;
}

function baseParams(): Record<string, any> {
  return { day: dayInt(), host_code: hostCode.value || '', limit: limit.value };
}

function reload() {
  loading.value = true;
  const actorReq = analysisActorList({
    ...baseParams(),
    sort_by: actorSort.value.sortBy,
  }).then((res) => {
    if (res.code === 0) actorResp.value = res.data || {};
  });
  const pathReq = analysisPathList({
    ...baseParams(),
    sort_by: pathSort.value.sortBy,
  }).then((res) => {
    if (res.code === 0) pathResp.value = res.data || {};
  });
  Promise.all([actorReq, pathReq])
    .catch(() => {})
    .finally(() => {
      loading.value = false;
    });
}

// 排序走服务端：客户端排只能排当前这一页，Top N 就没意义了
function onActorSort(val: any) {
  if (!val) return;
  actorSort.value = { sortBy: val.sortBy, descending: true };
  reload();
}

function onPathSort(val: any) {
  if (!val) return;
  pathSort.value = { sortBy: val.sortBy, descending: true };
  reload();
}

function toggleKpi(k: string) {
  kpiFilter.value = kpiFilter.value === k ? '' : k;
}

function loadHosts() {
  allhost()
    .then((res) => {
      if (res.code === 0) {
        // allhost 的 json 字段就叫 value / label（model/response/all_host.go 的 tag），
        // 不是 code / host——取错的话下拉全是空白项
        const list = (res.data || []).filter((h: any) => h && h.value);
        hostOptions.value = list.map((h: any) => ({ value: h.value, label: h.label || h.value }));
        const dic: Record<string, string> = {};
        list.forEach((h: any) => {
          dic[h.value] = h.label || h.value;
        });
        hostDic.value = dic;
      }
    })
    .catch(() => {});
}

function loadThreshold() {
  [TH_SCAN, TH_UA].forEach((key) => {
    get_detail_by_item_api({ item: key })
      .then((res) => {
        if (res.code === 0 && res.data) {
          thItems[key] = res.data;
          const v = parseInt(res.data.value, 10);
          if (!Number.isNaN(v)) {
            if (key === TH_SCAN) thScan.value = v;
            else thUa.value = v;
          }
        }
      })
      .catch(() => {});
  });
}

function saveThreshold() {
  thSaving.value = true;
  const save = (key: string, value: number) => {
    const item = thItems[key];
    if (!item) return Promise.resolve();
    return edit_system_config_api({
      id: item.id,
      category: item.category,
      item: item.item,
      value: String(value),
      type: item.type,
      title: item.title,
      options: item.options || '',
    });
  };
  Promise.all([save(TH_SCAN, thScan.value), save(TH_UA, thUa.value)])
    .then(() => {
      MessagePlugin.success(t('common.tips.save_success'));
      reload();
    })
    .catch(() => {
      MessagePlugin.error(t('page.source_path.save_failed'));
    })
    .finally(() => {
      thSaving.value = false;
    });
}

function openDrawer(kind: string, key: string) {
  analysisDetail({ ...baseParams(), kind, key })
    .then((res) => {
      if (res.code === 0) {
        detail.value = res.data;
        drawerVisible.value = true;
      } else {
        MessagePlugin.error(res.msg);
      }
    })
    .catch(() => {});
}

// actor_key 形如 ip:1.2.3.4，处置接口要的是裸 IP
function toIp(actorKey: string): string {
  return String(actorKey || '').replace(/^ip:/, '');
}

function disposal(actorKey: string, mode: string) {
  disposalIp.value = toIp(actorKey);
  disposalMode.value = mode;
  // 站点候选优先用抽屉里查到的；直接从表格点的话回落到当前筛选
  const fromDetail =
    detail.value && detail.value.kind === 'actor' && detail.value.key === actorKey ? detail.value.hosts || [] : [];
  disposalHosts.value = fromDetail;
  const row = (actorResp.value.list || []).find((r: any) => r.actor_key === actorKey);
  const why = row
    ? t('page.source_path.remark_tpl', { day: day.value, path: row.distinct_path, req: row.req_cnt })
    : t('page.source_path.remark_plain', { day: day.value });
  disposalRemarks.value = String(why);
  disposalVisible.value = true;
}

function gotoLog(actorKey: string) {
  router.push({ path: '/waf/wafattacklog', query: { src_ip: toIp(actorKey) } });
}
</script>

<style scoped>
.sp-card {
  margin-bottom: 14px;
}

.sp-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sp-lb {
  color: var(--td-text-color-secondary);
  font-size: 13px;
}

.sp-tip {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}

.sp-flex {
  flex: 1;
}

.sp-gap {
  width: 16px;
}

.sp-kpis {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
}

.sp-kpi {
  flex: 1;
}

.sp-kpi .k {
  color: var(--td-text-color-secondary);
  font-size: 13px;
}

.sp-kpi .v {
  font-size: 26px;
  font-weight: 600;
  margin-top: 6px;
  line-height: 1.2;
}

.sp-kpi .v.warn {
  color: var(--td-warning-color);
}

.sp-kpi .d {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  margin-top: 2px;
}

.sp-clickable {
  cursor: pointer;
}

.sp-clickable.on {
  outline: 1px solid var(--td-brand-color);
}

.sp-sect {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  margin: 16px 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--td-component-stroke);
}

.sp-danger {
  color: var(--td-error-color);
  font-weight: 600;
}

.sp-warn {
  color: var(--td-warning-color);
  font-weight: 600;
}

.sp-muted {
  color: var(--td-text-color-placeholder);
}
</style>
