<template>
  <t-dialog
    :visible="visible"
    :header="t('page.ccrule.hits_title')"
    :width="820"
    :footer="false"
    destroy-on-close
    @close="emit('update:visible', false)"
  >
    <div v-if="loading" class="hits-loading">{{ t('page.ccrule.hits_loading') }}</div>

    <div v-else-if="data" class="hits-body">
      <div class="hits-rule">
        <b>{{ data.rule_name }}</b>
        <span v-if="data.rule_code" class="hits-code">{{ data.rule_code }}</span>
        <span class="hits-cond">
          {{ t('page.ccrule.hits_rule_cond', { sec: data.window_sec, times: data.threshold }) }}
        </span>
      </div>

      <!-- 统计起点必须写出来：只给一个「触发 3 次」，既可能是刚重启也可能是三个月才 3 次 -->
      <div class="hits-since">{{ t('page.ccrule.hits_since', { time: sinceText }) }}</div>

      <div class="hits-stats">
        <div>
          <div class="k">{{ t('page.ccrule.hits_total') }}</div>
          <div class="v">{{ board.total || 0 }}</div>
        </div>
        <div>
          <div class="k">{{ t('page.ccrule.hits_clients') }}</div>
          <div class="v">{{ (board.clients || []).length }}</div>
        </div>
        <div>
          <div class="k">{{ t('page.ccrule.hits_first') }}</div>
          <div class="v small">{{ board.first_at ? fmtTime(board.first_at) : '-' }}</div>
        </div>
        <div>
          <div class="k">{{ t('page.ccrule.hits_last') }}</div>
          <div class="v small">{{ board.last_at ? fmtTime(board.last_at) : '-' }}</div>
        </div>
      </div>

      <div v-if="actionRows.length" class="hits-actions">
        <span v-for="a in actionRows" :key="a.key" class="hits-action-tag">{{ a.name }} · {{ a.count }}</span>
      </div>

      <div v-if="board.truncated" class="hits-warn">{{ t('page.ccrule.hits_truncated') }}</div>

      <div v-if="!board.total" class="hits-empty">{{ t('page.ccrule.hits_empty') }}</div>

      <template v-else>
        <div class="hits-table-title">{{ t('page.ccrule.hits_top_title', { dim: dimName }) }}</div>
        <t-table
          :data="board.clients"
          :columns="columns"
          row-key="dim_value"
          size="small"
          :max-height="320"
          vertical-align="top"
          hover
        >
          <template #rank="{ rowIndex }">{{ rowIndex + 1 }}</template>
          <template #share="{ row }">
            <div class="hits-bar-wrap">
              <div class="hits-bar-track">
                <div class="hits-bar" :style="{ width: barWidth(row.count) }"></div>
              </div>
              <span class="hits-bar-num">{{ row.count }}</span>
            </div>
          </template>
          <template #last_at="{ row }">{{ fmtTime(row.last_at) }}</template>
        </t-table>
      </template>
    </div>

    <div class="hits-foot">
      <t-button variant="outline" :loading="loading" @click="load">{{ t('common.refresh') }}</t-button>
      <t-button theme="primary" style="margin-left: 10px" @click="emit('update:visible', false)">
        {{ t('common.close') }}
      </t-button>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type TableProps } from 'tdesign-vue-next';

import { wafAntiCCRuleHitsApi } from '@/apis/anticcrule';

const { t } = useI18n();

const props = defineProps<{ visible: boolean; ruleId: string }>();
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>();

const loading = ref(false);
const data = ref<any>(null);

const board = computed<any>(() => (data.value && data.value.board) || {});

// 维度不一定是 IP：按 ip_uri/header/cookie 统计时，这一列里放的是那个维度的取值
const dimName = computed(() => {
  const map: Record<string, string> = {
    ip: t('page.ccrule.dim_ip'),
    ip_uri: t('page.ccrule.dim_ip_uri'),
    session: t('page.ccrule.dim_session'),
    header: t('page.ccrule.dim_header'),
    cookie: t('page.ccrule.dim_cookie'),
    query: t('page.ccrule.dim_query'),
    body: t('page.ccrule.dim_body'),
    host_total: t('page.ccrule.dim_host_total'),
  };
  return map[data.value && data.value.stat_dim] || t('page.ccrule.hits_col_dim');
});

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'rank', title: '#', width: 50 },
  { colKey: 'dim_value', title: dimName.value, minWidth: 200, ellipsis: true },
  { colKey: 'share', title: t('page.ccrule.hits_col_count'), width: 220 },
  { colKey: 'last_at', title: t('page.ccrule.hits_col_last'), width: 160 },
]);

const actionRows = computed(() => {
  const by = board.value.by_action || {};
  const map: Record<string, string> = {
    observe: t('page.ccrule.action_observe'),
    captcha: t('page.ccrule.action_captcha'),
    deny: t('page.ccrule.action_deny'),
    ban: t('page.ccrule.action_ban'),
  };
  return Object.keys(by).map((k) => ({ key: k, name: map[k] || k, count: by[k] }));
});

const maxCount = computed(() => {
  const list = board.value.clients || [];
  return list.length ? Math.max(1, list[0].count) : 1;
});

function fmtTime(unix: number) {
  if (!unix) return '-';
  const d = new Date(unix * 1000);
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const sinceText = computed(() => (data.value && data.value.since ? fmtTime(data.value.since) : '-'));

function barWidth(count: number) {
  return `${Math.max(2, Math.round((count / maxCount.value) * 100))}%`;
}

function load() {
  if (!props.ruleId) return;
  loading.value = true;
  data.value = null;
  wafAntiCCRuleHitsApi({ rule_id: props.ruleId })
    .then((res: any) => {
      loading.value = false;
      if (res.code === 0) {
        data.value = res.data;
      } else {
        MessagePlugin.warning(res.msg);
        emit('update:visible', false);
      }
    })
    .catch(() => {
      loading.value = false;
    });
}

watch(
  () => props.visible,
  (val) => {
    if (val) load();
  },
);
</script>

<style scoped>
.hits-loading {
  padding: 60px 0;
  text-align: center;
  color: var(--td-text-color-placeholder);
}

.hits-rule {
  font-size: 15px;
  margin-bottom: 4px;
}

.hits-rule .hits-code {
  margin-left: 8px;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 2px;
  background: var(--td-bg-color-secondarycontainer);
  color: var(--td-text-color-secondary);
}

.hits-rule .hits-cond {
  margin-left: 8px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.hits-since {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-bottom: 12px;
}

.hits-stats {
  display: flex;
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-default);
  overflow: hidden;
  margin-bottom: 12px;
}

.hits-stats > div {
  flex: 1;
  padding: 10px 12px;
  border-right: 1px solid var(--td-component-stroke);
}

.hits-stats > div:last-child {
  border-right: 0;
}

.hits-stats .k {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.hits-stats .v {
  font-size: 20px;
  font-weight: 600;
  margin-top: 2px;
}

.hits-stats .v.small {
  font-size: 13px;
  font-weight: 400;
}

.hits-actions {
  margin-bottom: 12px;
}

.hits-action-tag {
  display: inline-block;
  margin-right: 8px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: var(--td-brand-color-1);
  color: var(--td-brand-color-7);
}

.hits-warn {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: var(--td-radius-default);
  background: var(--td-warning-color-1);
  color: var(--td-warning-color-7);
  font-size: 12px;
  line-height: 1.8;
}

.hits-empty {
  padding: 40px 0;
  text-align: center;
  color: var(--td-text-color-placeholder);
}

.hits-table-title {
  font-size: 13px;
  margin-bottom: 8px;
  color: var(--td-text-color-secondary);
}

.hits-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hits-bar-track {
  flex: 1;
  min-width: 0;
  height: 10px;
  border-radius: 2px;
  background: var(--td-bg-color-secondarycontainer);
}

.hits-bar {
  height: 10px;
  border-radius: 2px;
  background: var(--td-error-color-3);
  min-width: 2px;
}

.hits-bar-num {
  flex: none;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.hits-foot {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}
</style>
