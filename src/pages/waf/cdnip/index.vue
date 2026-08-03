<template>
  <div>
    <t-card class="list-card-container">
      <t-alert theme="info" :message="t('page.cdnip.alert_message')" close style="margin-bottom: 12px" />
      <t-table :columns="columns" :data="data" row-key="provider" vertical-align="top" hover :loading="loading">
        <template #tier="{ row }">
          <t-tag v-if="row.tier === 'A'" theme="success" variant="light">{{ t('page.cdnip.tier_public') }}</t-tag>
          <t-tag v-else-if="row.tier === 'A_auth'" theme="warning" variant="light">{{ t('page.cdnip.tier_auth') }}</t-tag>
          <t-tag v-else theme="default" variant="light">{{ t('page.cdnip.tier_header') }}</t-tag>
        </template>
        <template #auto_fetch="{ row }">
          <t-switch v-if="row.fetch_kind !== 'none'" :value="row.auto_fetch === 1" @change="(v: boolean) => onToggleAutoFetch(row, v)" />
          <span v-else>-</span>
        </template>
        <template #count="{ row }">
          <t-tag v-if="row.count > 0" theme="primary" variant="light">{{ row.count }}</t-tag>
          <span v-else>0</span>
        </template>
        <template #in_use="{ row }">
          <t-tag v-if="row.in_use" theme="success" variant="light">{{ t('page.cdnip.in_use_yes') }}</t-tag>
          <span v-else>-</span>
        </template>
        <template #last_sync_at="{ row }">
          <span>{{ formatTs(row.last_sync_at) }}</span>
        </template>
        <template #op="{ row }">
          <a v-if="row.fetch_kind !== 'none'" class="t-button-link" @click="onRefresh(row)">{{ t('page.cdnip.refresh_now') }}</a>
          <a v-if="row.count > 0" class="t-button-link" @click="onViewIPs(row)">{{ t('page.cdnip.view_ips') }}</a>
          <a v-if="row.need_credential" class="t-button-link" @click="onOpenCredential(row)">
            {{ row.has_credential ? t('page.cdnip.edit_credential') : t('page.cdnip.set_credential') }}
          </a>
        </template>
      </t-table>
    </t-card>

    <!-- 凭证配置弹窗(认证型厂商) -->
    <t-dialog v-model:visible="credVisible" :header="credTitle" :width="620" :footer="false">
      <t-alert theme="warning" :message="t('page.cdnip.credential_tips')" style="margin-bottom: 12px" />
      <t-form :data="credForm" :label-width="130">
        <t-form-item :label="t('page.cdnip.secret_id')" name="secret_id">
          <t-input
            v-model="credForm.secret_id"
            :style="{ width: '420px' }"
            :placeholder="credHasCredential ? t('page.cdnip.secret_keep') : 'SecretId / AccessKeyId'"
          />
        </t-form-item>
        <t-form-item :label="t('page.cdnip.secret_key')" name="secret_key">
          <t-input
            v-model="credForm.secret_key"
            type="password"
            :style="{ width: '420px' }"
            :placeholder="credHasCredential ? t('page.cdnip.secret_keep') : 'SecretKey / AccessKeySecret'"
          />
        </t-form-item>
        <t-form-item :label="t('page.cdnip.extra_param')" name="extra_param">
          <t-input v-model="credForm.extra_param" :style="{ width: '420px' }" :placeholder="credExtraPlaceholder" />
          <div class="form-item-tips">{{ credExtraTips }}</div>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button v-if="credHasCredential" theme="danger" variant="outline" @click="onClearCredential">
            {{ t('page.cdnip.clear_credential') }}
          </t-button>
          <t-button variant="outline" @click="credVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" @click="onSaveCredential">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 回源段只读浏览弹窗 -->
    <t-dialog v-model:visible="ipDialogVisible" :header="ipDialogTitle" :width="600" :footer="false">
      <t-form :data="ipSearch" layout="inline" colon :style="{ marginBottom: '8px' }">
        <t-form-item label="IP" name="keyword">
          <t-input v-model="ipSearch.keyword" clearable :style="{ width: '260px' }" @enter="reloadIPs" />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" @click="reloadIPs">{{ t('common.search') }}</t-button>
        </t-form-item>
      </t-form>
      <t-table
        :columns="ipColumns"
        :data="ipData"
        row-key="ip"
        vertical-align="top"
        hover
        :pagination="ipPagination"
        :loading="ipLoading"
        @page-change="onIPPageChange"
      />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type PageInfo, type TableProps } from 'tdesign-vue-next';
import {
  wafCDNProviderListApi,
  wafCDNProviderAutoFetchApi,
  wafCDNProviderRefreshApi,
  wafCDNProviderCredentialApi,
  wafCDNProviderCredentialClearApi,
  wafCDNProviderRangesApi,
} from '@/apis/cdnip';

const { t } = useI18n();

const loading = ref(false);
const data = ref<Record<string, any>[]>([]);

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.cdnip.col_name'), align: 'left', width: 150, colKey: 'name' },
  { title: t('page.cdnip.col_header'), width: 170, colKey: 'header' },
  { title: t('page.cdnip.col_tier'), width: 110, colKey: 'tier' },
  { title: t('page.cdnip.col_auto_fetch'), width: 90, colKey: 'auto_fetch' },
  { title: t('page.cdnip.col_count'), width: 100, colKey: 'count' },
  { title: t('page.cdnip.col_in_use'), width: 90, colKey: 'in_use' },
  { title: t('page.cdnip.col_last_sync'), width: 170, colKey: 'last_sync_at' },
  { title: t('page.cdnip.col_status'), align: 'left', ellipsis: true, colKey: 'last_status' },
  { title: t('common.op'), align: 'left', width: 200, colKey: 'op' },
]);

// 凭证弹窗
const credVisible = ref(false);
const credTitle = ref('');
const credProvider = ref('');
const credHasCredential = ref(false);
const credExtraPlaceholder = ref('');
const credExtraTips = ref('');
const credForm = reactive({ secret_id: '', secret_key: '', extra_param: '' });

// IP 浏览
const ipDialogVisible = ref(false);
const ipDialogTitle = ref('');
const ipProvider = ref('');
const ipSearch = reactive({ keyword: '' });
const ipLoading = ref(false);
const ipData = ref<Record<string, any>[]>([]);
const ipPagination = reactive({ total: 0, current: 1, pageSize: 10 });
const ipColumns = computed<TableProps['columns']>(() => [{ title: 'IP / CIDR', align: 'left', colKey: 'ip' }]);

function formatTs(ts: number) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString();
}

function loadList() {
  loading.value = true;
  wafCDNProviderListApi({})
    .then((res) => {
      if (res.code === 0) data.value = res.data ?? [];
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      loading.value = false;
    });
}

function onToggleAutoFetch(row: Record<string, any>, v: boolean) {
  wafCDNProviderAutoFetchApi({ provider: row.provider, auto_fetch: v ? 1 : 0 })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        if (v) MessagePlugin.info(t('page.cdnip.fetch_started'));
        setTimeout(() => loadList(), 1500);
      } else {
        MessagePlugin.warning(res.msg);
        loadList();
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onRefresh(row: Record<string, any>) {
  MessagePlugin.info(t('page.cdnip.fetch_started'));
  wafCDNProviderRefreshApi({ provider: row.provider })
    .then((res) => {
      if (res.code === 0) MessagePlugin.success(res.msg);
      else MessagePlugin.warning(res.msg);
      loadList();
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onOpenCredential(row: Record<string, any>) {
  credProvider.value = row.provider;
  credTitle.value = `${row.name} ${t('page.cdnip.credential')}`;
  credHasCredential.value = row.has_credential;
  credForm.secret_id = '';
  credForm.secret_key = '';
  credForm.extra_param = row.extra_param || '';
  if (row.provider === 'edgeone') {
    credExtraPlaceholder.value = '{"zone_id":"zone-xxxx","region":""}';
    credExtraTips.value = t('page.cdnip.extra_tips_edgeone');
  } else if (row.provider === 'aliyun') {
    credExtraPlaceholder.value = '{"domain":"cdn.example.com","region":"cn-hangzhou"}';
    credExtraTips.value = t('page.cdnip.extra_tips_aliyun');
  } else {
    credExtraPlaceholder.value = '';
    credExtraTips.value = '';
  }
  credVisible.value = true;
}

function onSaveCredential() {
  wafCDNProviderCredentialApi({
    provider: credProvider.value,
    secret_id: credForm.secret_id,
    secret_key: credForm.secret_key,
    extra_param: credForm.extra_param,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        credVisible.value = false;
        loadList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onClearCredential() {
  wafCDNProviderCredentialClearApi({ provider: credProvider.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        credVisible.value = false;
        loadList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function loadIPs() {
  ipLoading.value = true;
  wafCDNProviderRangesApi({
    provider: ipProvider.value,
    keyword: ipSearch.keyword,
    pageIndex: ipPagination.current,
    pageSize: ipPagination.pageSize,
  })
    .then((res) => {
      if (res.code === 0) {
        ipData.value = (res.data.list ?? []).map((ip: string) => ({ ip }));
        ipPagination.total = res.data.total;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      ipLoading.value = false;
    });
}

function onViewIPs(row: Record<string, any>) {
  ipProvider.value = row.provider;
  ipDialogTitle.value = row.name;
  ipSearch.keyword = '';
  ipPagination.current = 1;
  ipDialogVisible.value = true;
  loadIPs();
}

function reloadIPs() {
  ipPagination.current = 1;
  loadIPs();
}

function onIPPageChange(pageInfo: PageInfo) {
  ipPagination.current = pageInfo.current;
  if (ipPagination.pageSize !== pageInfo.pageSize) {
    ipPagination.current = 1;
    ipPagination.pageSize = pageInfo.pageSize;
  }
  loadIPs();
}

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.form-item-tips {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  margin-top: 4px;
}
.t-button-link + .t-button-link {
  margin-left: 12px;
}
</style>
