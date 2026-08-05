<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button theme="danger" variant="outline" @click="kickAllVisible = true">
            {{ t('page.access.session.button_kick_all') }}
          </t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.access.session.label_account')" name="account_name">
              <t-input v-model="searchformData.account_name" class="search-input" clearable />
            </t-form-item>
            <t-form-item :label="t('page.access.session.label_ip')" name="client_ip">
              <t-input v-model="searchformData.client_ip" class="search-input" clearable />
            </t-form-item>
            <t-form-item :label="t('page.access.session.label_status')" name="status">
              <t-select
                v-model="searchformData.status"
                :style="{ width: '120px' }"
                clearable
                :placeholder="t('common.select_placeholder')"
              >
                <t-option :value="1" :label="t('page.access.session.status_valid')" />
                <t-option :value="0" :label="t('page.access.session.status_revoked')" />
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.access.session.alert_message')" close />
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
          <template #scope="{ row }">
            <t-tag v-if="row.scope === 'sso'" theme="primary" variant="light">
              {{ t('page.access.session.scope_sso') }}
            </t-tag>
            <t-tag v-else theme="default" variant="light">{{ t('page.access.session.scope_local') }}</t-tag>
          </template>
          <template #status="{ row }">
            <t-tag v-if="row.status === 1" theme="success" variant="light">
              {{ t('page.access.session.status_valid') }}
            </t-tag>
            <t-tooltip v-else :content="row.revoke_reason">
              <t-tag theme="default" variant="light">{{ t('page.access.session.status_revoked') }}</t-tag>
            </t-tooltip>
          </template>
          <template #token_count="{ row }">
            <span v-if="!row.token_count">-</span>
            <t-tooltip v-else :content="(row.token_hosts || []).join('\n')">
              <t-tag theme="primary" variant="light">{{ hostSummary(row.token_hosts) }}</t-tag>
            </t-tooltip>
          </template>
          <template #location="{ row }">
            <span>{{ [row.country, row.city].filter(Boolean).join(' ') || '-' }}</span>
          </template>
          <template #op="slotProps">
            <a v-if="slotProps.row.status === 1" class="t-button-link" @click="handleKick(slotProps.row)">
              {{ t('page.access.session.button_kick') }}
            </a>
            <span v-else>-</span>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog
      v-model:visible="kickVisible"
      :header="t('page.access.session.button_kick')"
      :body="t('page.access.session.kick_confirm')"
      @confirm="onConfirmKick"
    />

    <t-dialog
      v-model:visible="kickAllVisible"
      :header="t('page.access.session.button_kick_all')"
      :confirm-btn="{ content: t('common.confirm'), theme: 'danger' }"
      :cancel-btn="t('common.close')"
      @confirm="onConfirmKickAll"
    >
      <template #body>
        <t-alert theme="warning" :message="t('page.access.session.kick_all_confirm')" />
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { wafAccessSessionListApi, wafAccessSessionKickApi, wafAccessSessionKickAllApi } from '@/apis/access';

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
// 这个页面叫「在线会话」，默认就该只给在线的。
// 已失效的会话要留到清理任务删掉那天(7天)，默认全列出来的话，
// 用得越久噪音越大，真正在线的人反而要翻页找。想看历史把筛选清空即可。
const searchformData = reactive<Record<string, any>>({ account_name: '', client_ip: '', status: 1 });

// 站点多的时候标签会把列撑爆，超过两个就折叠成「a.com 等 N 个」，完整列表挂在 tooltip 上
function hostSummary(hosts: string[]) {
  const list = (hosts || []).filter(Boolean);
  if (list.length === 0) return '-';
  if (list.length <= 2) return list.join('、');
  return t('page.access.session.host_more').replace('{first}', list[0]).replace('{n}', String(list.length));
}

const kickVisible = ref(false);
const kickAllVisible = ref(false);
const pendingId = ref('');

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.access.session.label_account'), align: 'left', width: 140, ellipsis: true, colKey: 'account_name' },
  { title: t('page.access.session.col_scope'), width: 100, colKey: 'scope' },
  { title: t('page.access.session.col_bind_host'), width: 180, ellipsis: true, colKey: 'bind_host' },
  { title: t('page.access.session.label_ip'), width: 140, ellipsis: true, colKey: 'client_ip' },
  { title: t('page.access.session.col_location'), width: 140, ellipsis: true, colKey: 'location' },
  { title: t('page.access.session.col_token_count'), width: 220, ellipsis: true, colKey: 'token_count' },
  { title: t('page.access.session.col_login_time'), width: 170, ellipsis: true, colKey: 'login_time' },
  { title: t('page.access.session.col_last_active'), width: 170, ellipsis: true, colKey: 'last_active_time' },
  { title: t('page.access.session.col_expire'), width: 170, ellipsis: true, colKey: 'expire_time' },
  { title: t('page.access.session.label_status'), width: 100, colKey: 'status' },
  { title: t('page.access.session.col_ua'), width: 220, ellipsis: true, colKey: 'user_agent' },
  { align: 'left', width: 100, colKey: 'op', title: t('common.op') },
]);

function getList() {
  dataLoading.value = true;
  wafAccessSessionListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    account_name: searchformData.account_name,
    client_ip: searchformData.client_ip,
    // status 用 null 表示"不筛选"：传 0 是有意义的取值(已注销)，不能用假值判断
    status: searchformData.status === undefined || searchformData.status === '' ? null : searchformData.status,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
  getList();
}

function handleKick(row: Record<string, any>) {
  pendingId.value = row.id;
  kickVisible.value = true;
}

function onConfirmKick() {
  wafAccessSessionKickApi({ id: pendingId.value }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
    kickVisible.value = false;
  });
}

function onConfirmKickAll() {
  wafAccessSessionKickAllApi().then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
    kickAllVisible.value = false;
  });
}

onMounted(() => {
  getList();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.search-input {
  width: 160px;
}
</style>
