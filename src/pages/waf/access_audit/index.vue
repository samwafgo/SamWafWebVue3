<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container"></div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="70" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.access.audit.label_category')" name="category">
              <t-select
                v-model="searchformData.category"
                :style="{ width: '140px' }"
                clearable
                :placeholder="t('common.select_placeholder')"
              >
                <t-option v-for="c in categoryOptions" :key="c" :value="c" :label="categoryLabel(c)" />
              </t-select>
            </t-form-item>
            <t-form-item :label="t('page.access.audit.label_event')" name="event">
              <t-select
                v-model="searchformData.event"
                :style="{ width: '210px' }"
                clearable
                :placeholder="t('common.select_placeholder')"
              >
                <t-option v-for="e in eventOptions" :key="e" :value="e" :label="eventLabel(e)" />
              </t-select>
            </t-form-item>
            <t-form-item :label="t('page.access.audit.label_account')" name="account_name">
              <t-input v-model="searchformData.account_name" class="search-input" clearable />
            </t-form-item>
            <t-form-item :label="t('page.access.audit.label_ip')" name="client_ip">
              <t-input v-model="searchformData.client_ip" class="search-input" clearable />
            </t-form-item>
            <t-form-item :label="t('page.access.audit.label_object_type')" name="object_type">
              <t-select v-model="searchformData.object_type" class="search-input" clearable>
                <t-option value="tunnel" :label="t('page.access.audit.object_tunnel')" />
              </t-select>
            </t-form-item>
            <t-form-item
              v-if="searchformData.object_type === 'tunnel'"
              :label="t('page.access.audit.label_tunnel_id')"
              name="object_id"
            >
              <t-input v-model="searchformData.object_id" class="search-input" :maxlength="64" clearable />
            </t-form-item>
            <t-form-item v-else :label="t('page.access.audit.label_host')" name="host">
              <t-input v-model="searchformData.host" class="search-input" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="search">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <help-block :summary="t('page.access.audit.alert_message') + ' ' + t('page.access.audit.app_audit_note')" doc="guide/AccessAudit" />
      <t-alert v-if="listError" theme="warning" :message="listError" />
      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
        >
          <template #category="{ row }">
            <t-tag :theme="categoryTheme(row.category)" variant="light">{{ categoryLabel(row.category) }}</t-tag>
          </template>
          <template #event="{ row }">
            <t-tag :theme="eventTheme(row.event)" variant="light">{{ eventLabel(row.event) }}</t-tag>
          </template>
          <template #result="{ row }">
            <t-tag v-if="row.result === 1" theme="success" variant="light">
              {{ t('page.access.audit.result_ok') }}
            </t-tag>
            <t-tag v-else theme="danger" variant="light">{{ t('page.access.audit.result_fail') }}</t-tag>
          </template>
          <template #location="{ row }">
            <span>{{ [row.country, row.city].filter(Boolean).join(' ') || '-' }}</span>
          </template>
          <template #account_name="{ row }">
            {{ actorLabel(row) }}
          </template>
          <template #object="{ row }">
            <span v-if="row.object_type === 'tunnel'">{{ t('page.access.audit.object_tunnel') }} · {{ row.object_id }}</span>
            <span v-else-if="row.object_type === 'host'">{{ t('page.access.audit.object_host') }} · {{ row.host || row.object_id }}</span>
            <span v-else-if="row.object_type === 'path_rule'">{{ t('page.access.audit.object_path_rule') }} · {{ row.host || row.object_id }}</span>
            <span v-else>—</span>
          </template>
          <template #detail="{ row }">
            <t-button
              v-if="row.object_type === 'tunnel' && row.detail"
              variant="text"
              theme="primary"
              size="small"
              @click="selectedDetail = row"
            >
              {{ t('page.access.audit.view_changes') }}
            </t-button>
          </template>
        </t-table>
      </div>
    </t-card>
    <t-dialog
      :visible="!!selectedDetail"
      :header="t('page.access.audit.view_changes')"
      width="min(820px, calc(100vw - 32px))"
      :footer="false"
      @close="selectedDetail = null"
    >
      <div v-if="selectedDetail" class="audit-details">
        <strong>{{ eventLabel(selectedDetail.event) }}</strong>
        <div>{{ t('page.access.audit.label_tunnel_id') }}: {{ selectedDetail.object_id }}</div>
        <div>{{ selectedDetail.create_time }} · {{ actorLabel(selectedDetail) }}</div>
        <div v-if="selectedDetail.detail.reason">
          {{ t('page.access.audit.change_reason') }}: {{ reasonLabel(selectedDetail.detail.reason) }}
        </div>
        <t-alert v-if="selectedDetail.detail.truncated" theme="warning" :message="t('page.access.audit.detail_truncated')" />
        <div class="audit-comparison">
          <div v-for="side in ['before', 'after']" :key="side">
            <strong>{{ t(`page.access.audit.change_${side}`) }}</strong>
            <pre>{{ formatChange(selectedDetail.detail[side]) }}</pre>
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import type { PageInfo, TableProps } from 'tdesign-vue-next';
import { wafAccessAuditListApi } from '@/apis/access';

const TUNNEL_EVENTS = [
  'config_tunnel_region',
  'config_tunnel_ddns',
  'config_tunnel_ddns_addresses',
  'config_tunnel_ddns_resolution',
];
// 角色权限拒绝、静态目录变更与启动巡检
const STATIC_ROOT_EVENTS = ['config_role_denied', 'config_static_root_change', 'config_static_root_review'];

// 与后端 model/security_audit_log.go 的审计事件常量对应
const EVENTS = [
  'login_ok',
  'login_fail',
  'otp_fail',
  'locked',
  'logout',
  'kick',
  'ticket_issue',
  'ticket_consume',
  'ticket_replay',
  'bad_return_to',
  'denied',
  'bypass_ip',
  'bypass_token',
  'config_ssl_export_write',
  ...TUNNEL_EVENTS,
  ...STATIC_ROOT_EVENTS,
  // 网站密码访问（站点级密码那道门），与统一访问认证是两套独立功能，前缀也分开
  'httpauth_login_ok',
  'httpauth_login_fail',
  'httpauth_locked',
  'httpauth_kick',
  'httpauth_expired',
  'httpauth_denied',
  'app_add',
  'app_edit',
  'app_del',
  'app_start',
  'app_stop',
  'app_restart',
  'app_upload',
  'app_upgrade',
  'app_rollback',
  'app_clear_logs',
  'app_op_denied',
];

// 审计分类，与后端 AuditCategory* 常量对应
const CATEGORIES = ['access', 'httpauth', 'config', 'app'];

// 安全告警级事件用 danger 高亮：票据重放与回跳地址异常在正常流程里不该出现，
// 一旦出现就意味着有人在主动构造请求。
const DANGER_EVENTS = ['ticket_replay', 'bad_return_to', 'locked', 'httpauth_locked'];
const WARNING_EVENTS = [
  'login_fail',
  'otp_fail',
  'denied',
  'httpauth_login_fail',
  'httpauth_denied',
  'app_op_denied',
  'config_role_denied',
  'config_static_root_review',
];

function initialFilters() {
  return { category: '', event: '', account_name: '', client_ip: '', host: '', object_type: '', object_id: '' };
}

const { t, te } = useI18n();
const route = useRoute();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';
const listError = ref('');
const selectedDetail = ref<Record<string, any> | null>(null);
const requestSerial = ref(0);
const categoryOptions = CATEGORIES;
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive(initialFilters());
const appliedFilters = reactive(initialFilters());

const eventOptions = computed(() => (searchformData.object_type === 'tunnel' ? TUNNEL_EVENTS : EVENTS));

function eventLabel(e: string) {
  if (!e) return '-';
  const key = `page.access.audit.event_${e}`;
  const label = t(key);
  // 后端新增事件类型而前端还没补翻译时，直接显示原始事件名而不是键名
  return label === key ? e : label;
}

function categoryLabel(c: string) {
  if (!c) return '-';
  const key = `page.access.audit.category_${c}`;
  const label = t(key);
  return label === key ? c : label;
}

// 三个分类各给一个色，混在一张表里时能一眼分开谁是谁
function categoryTheme(c: string) {
  if (c === 'config') return 'warning';
  if (c === 'httpauth') return 'primary';
  return 'default';
}

function eventTheme(e: string) {
  if (DANGER_EVENTS.includes(e)) return 'danger';
  if (WARNING_EVENTS.includes(e)) return 'warning';
  return 'primary';
}

function actorLabel(row: Record<string, any>) {
  if (
    row.account_name === 'system' &&
    (TUNNEL_EVENTS.slice(2).includes(row.event) || row.event === 'config_static_root_review')
  ) {
    return t('page.access.audit.system_actor');
  }
  return row.account_name || '—';
}

function reasonLabel(reason: string) {
  const key = `page.access.audit.reason_${reason}`;
  return te(key) ? t(key) : reason;
}

function formatChange(change: unknown) {
  return change == null ? '—' : JSON.stringify(change, null, 2);
}

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.access.audit.label_category'), width: 100, colKey: 'category' },
  { title: t('page.access.audit.label_event'), align: 'left', width: 190, colKey: 'event' },
  { title: t('page.access.audit.col_result'), width: 90, colKey: 'result' },
  { title: t('page.access.audit.label_account'), width: 130, ellipsis: true, colKey: 'account_name' },
  { title: t('page.access.audit.label_host'), width: 180, ellipsis: true, colKey: 'host' },
  { title: t('page.access.audit.label_object_type'), width: 200, ellipsis: true, colKey: 'object' },
  { title: t('page.access.audit.col_url'), width: 220, ellipsis: true, colKey: 'url' },
  { title: t('page.access.audit.label_ip'), width: 140, ellipsis: true, colKey: 'client_ip' },
  { title: t('page.access.audit.col_location'), width: 140, ellipsis: true, colKey: 'location' },
  { title: t('page.access.audit.col_message'), width: 220, ellipsis: true, colKey: 'message' },
  { title: t('common.create_time'), width: 170, ellipsis: true, colKey: 'create_time' },
  { title: t('common.op'), width: 145, colKey: 'detail' },
]);

function search() {
  const { object_type: objectType, object_id: objectId, event, host, ...other } = searchformData;
  Object.assign(appliedFilters, {
    ...other,
    event: eventOptions.value.includes(event) ? event : '',
    host: objectType === 'tunnel' ? '' : host,
    object_type: objectType === 'tunnel' ? objectType : '',
    object_id: objectType === 'tunnel' ? (objectId || '').trim() : '',
  });
  pagination.current = 1;
  getList();
}

async function getList() {
  const serial = ++requestSerial.value;
  dataLoading.value = true;
  listError.value = '';
  data.value = [];
  try {
    const res = await wafAccessAuditListApi({
      pageSize: pagination.pageSize,
      pageIndex: pagination.current,
      ...appliedFilters,
    });
    if (serial !== requestSerial.value) return;
    if (res && res.code === 0) {
      const rows = res.data.list ?? [];
      const { object_type: objectType, object_id: objectId } = appliedFilters;
      if (
        objectType === 'tunnel' &&
        rows.some((row: Record<string, any>) => row.object_type !== 'tunnel' || (objectId && row.object_id !== objectId))
      ) {
        pagination.total = 0;
        listError.value = t('page.access.audit.scope_unsupported');
        return;
      }
      data.value = rows;
      pagination.total = res.data.total;
    } else {
      pagination.total = 0;
      listError.value =
        res && res.code === -403
          ? t('page.access.audit.forbidden')
          : (res && res.msg) || t('page.access.audit.load_failed');
    }
  } catch {
    if (serial !== requestSerial.value) return;
    pagination.total = 0;
    listError.value = t('page.access.audit.load_failed');
  } finally {
    if (serial === requestSerial.value) dataLoading.value = false;
  }
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
  getList();
}

watch(
  () => route.query,
  (query) => {
    if (route.name !== 'WafAccessAudit') return;
    const filters = initialFilters();
    const { object_type: objectType, object_id: objectId, category, event } = query;
    if (objectType === 'tunnel') {
      filters.object_type = 'tunnel';
      filters.object_id = typeof objectId === 'string' ? objectId.trim().slice(0, 64) : '';
      filters.category = 'config';
    } else if (typeof category === 'string' && CATEGORIES.includes(category)) {
      filters.category = category;
    }
    const events = filters.object_type === 'tunnel' ? TUNNEL_EVENTS : EVENTS;
    if (typeof event === 'string' && events.includes(event)) filters.event = event;
    Object.assign(searchformData, filters);
    selectedDetail.value = null;
    search();
  },
  { immediate: true },
);

// 首次加载由 route.query 的 immediate watch 触发
</script>

<style scoped>
.list-card-container {
  padding: 16px 24px;
}

.list-card-container :deep(.t-card__body) {
  padding: 0;
}

.left-operation-container {
  padding: 0 0 16px 0;
  margin-bottom: 16px;
}

.search-input {
  width: 140px;
}

.audit-comparison {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 12px;
}

.audit-details {
  display: grid;
  gap: 8px;
  max-height: 70vh;
  overflow: auto;
  overflow-wrap: anywhere;
}

.audit-details pre {
  padding: 8px;
  white-space: pre-wrap;
  background: var(--td-bg-color-secondarycontainer);
}
</style>
