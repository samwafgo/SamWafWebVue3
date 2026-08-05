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
    <t-dialog v-model:visible="credVisible" :header="credTitle" :width="720" :footer="false">
      <!-- 操作指引：告诉用户密钥去哪拿、要什么权限、站点ID在哪看 -->
      <div class="cred-guide">
        <div class="cred-guide-title">{{ t('page.cdnip.guide_title') }}</div>
        <ol class="cred-guide-list">
          <li v-for="(step, idx) in credGuideSteps" :key="idx">
            <span>{{ step.text }}</span>
            <a v-if="step.link" class="cred-guide-link" :href="step.link" target="_blank" rel="noopener noreferrer">{{ step.linkText }}</a>
          </li>
        </ol>
      </div>
      <t-alert theme="warning" :message="t('page.cdnip.credential_tips')" style="margin-bottom: 12px" />
      <t-form :data="credForm" :label-width="150">
        <!-- EdgeOne：中国站 / 国际站 二选一(账号与密钥各自独立、接口域名也不同) -->
        <t-form-item v-if="credProvider === 'edgeone'" :label="t('page.cdnip.eo_edition')" name="edition">
          <div>
            <t-radio-group v-model="eoForm.edition">
              <t-radio value="cn">{{ t('page.cdnip.eo_edition_cn') }}</t-radio>
              <t-radio value="intl">{{ t('page.cdnip.eo_edition_intl') }}</t-radio>
            </t-radio-group>
            <div class="form-item-tips">{{ t('page.cdnip.eo_edition_tips') }}</div>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.cdnip.secret_id')" name="secret_id">
          <div>
            <t-input
              v-model="credForm.secret_id"
              :style="{ width: '420px' }"
              :placeholder="credHasCredential ? t('page.cdnip.secret_keep') : credSecretIdPlaceholder"
            />
            <div class="form-item-tips">{{ credSecretTips }}</div>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.cdnip.secret_key')" name="secret_key">
          <t-input
            v-model="credForm.secret_key"
            type="password"
            :style="{ width: '420px' }"
            :placeholder="credHasCredential ? t('page.cdnip.secret_keep') : credSecretKeyPlaceholder"
          />
        </t-form-item>
        <!-- EdgeOne 站点ID -->
        <t-form-item v-if="credProvider === 'edgeone'" :label="t('page.cdnip.eo_zone_id')" name="zone_id">
          <div>
            <t-input v-model="eoForm.zone_id" :style="{ width: '420px' }" placeholder="zone-xxxxxxxxxxxx" />
            <div class="form-item-tips">{{ t('page.cdnip.eo_zone_id_tips') }}</div>
          </div>
        </t-form-item>
        <!-- 阿里云 加速域名 + 地域 -->
        <template v-else-if="credProvider === 'aliyun'">
          <t-form-item :label="t('page.cdnip.ali_domain')" name="domain">
            <div>
              <t-input v-model="aliForm.domain" :style="{ width: '420px' }" placeholder="cdn.example.com" />
              <div class="form-item-tips">{{ t('page.cdnip.ali_domain_tips') }}</div>
            </div>
          </t-form-item>
          <t-form-item :label="t('page.cdnip.ali_region')" name="region">
            <t-input v-model="aliForm.region" :style="{ width: '420px' }" placeholder="cn-hangzhou" />
          </t-form-item>
        </template>
        <!-- 其它厂商：保留原始 JSON 输入 -->
        <t-form-item v-else :label="t('page.cdnip.extra_param')" name="extra_param">
          <t-input v-model="credForm.extra_param" :style="{ width: '420px' }" />
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
const credForm = reactive({ secret_id: '', secret_key: '', extra_param: '' });
// EdgeOne：站点版本(中国站/国际站) + 站点ID
const eoForm = reactive({ edition: 'cn', zone_id: '', region: '' });
// 阿里云：加速域名 + 地域
const aliForm = reactive({ domain: '', region: 'cn-hangzhou' });

// 是否国际版 EdgeOne(edgeone.ai)：控制台/密钥/接口域名都与中国站不同
const isEdgeOneIntl = computed(() => credProvider.value === 'edgeone' && eoForm.edition === 'intl');
const credSecretIdPlaceholder = computed(() => (credProvider.value === 'aliyun' ? 'AccessKeyId' : 'SecretId'));
const credSecretKeyPlaceholder = computed(() => (credProvider.value === 'aliyun' ? 'AccessKeySecret' : 'SecretKey'));
const credSecretTips = computed(() => {
  if (credProvider.value === 'edgeone') return t('page.cdnip.eo_secret_tips');
  if (credProvider.value === 'aliyun') return t('page.cdnip.ali_secret_tips');
  return '';
});

// 弹窗顶部的分步指引(含官方链接)
const credGuideSteps = computed<{ text: string; link: string; linkText: string }[]>(() => {
  if (credProvider.value === 'edgeone') {
    const intl = isEdgeOneIntl.value;
    const consoleUrl = intl ? 'https://console.tencentcloud.com/edgeone' : 'https://console.cloud.tencent.com/edgeone';
    const capiUrl = intl ? 'https://console.tencentcloud.com/cam/capi' : 'https://console.cloud.tencent.com/cam/capi';
    const docUrl = intl ? 'https://edgeone.ai/document/zh/48535' : 'https://cloud.tencent.com/document/product/1552/120406';
    return [
      { text: t('page.cdnip.eo_guide_1'), link: consoleUrl, linkText: t('page.cdnip.link_console') },
      { text: t('page.cdnip.eo_guide_2'), link: consoleUrl, linkText: t('page.cdnip.link_zone') },
      { text: t('page.cdnip.eo_guide_3'), link: capiUrl, linkText: t('page.cdnip.link_capi') },
      { text: t('page.cdnip.eo_guide_4'), link: docUrl, linkText: t('page.cdnip.link_doc') },
    ];
  }
  if (credProvider.value === 'aliyun') {
    return [
      { text: t('page.cdnip.ali_guide_1'), link: 'https://ram.console.aliyun.com/manage/ak', linkText: t('page.cdnip.link_capi') },
      { text: t('page.cdnip.ali_guide_2'), link: 'https://cdn.console.aliyun.com/domain/list', linkText: t('page.cdnip.link_console') },
      {
        text: t('page.cdnip.ali_guide_3'),
        link: 'https://help.aliyun.com/zh/cdn/developer-reference/api-cdn-2018-05-10-describel2vipsbydomain',
        linkText: t('page.cdnip.link_doc'),
      },
    ];
  }
  return [];
});

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
  // 把已存的扩展参数 JSON 回填到结构化表单
  let extra: Record<string, any> = {};
  try {
    extra = JSON.parse(row.extra_param || '{}') || {};
  } catch (e) {
    extra = {};
  }
  eoForm.edition = extra.edition === 'intl' ? 'intl' : 'cn';
  eoForm.zone_id = extra.zone_id || '';
  eoForm.region = extra.region || '';
  aliForm.domain = extra.domain || '';
  aliForm.region = extra.region || 'cn-hangzhou';
  credVisible.value = true;
}

// 结构化表单 → 后端存储用的扩展参数 JSON
function buildExtraParam() {
  if (credProvider.value === 'edgeone') {
    return JSON.stringify({
      zone_id: (eoForm.zone_id || '').trim(),
      edition: eoForm.edition,
      region: (eoForm.region || '').trim(),
    });
  }
  if (credProvider.value === 'aliyun') {
    return JSON.stringify({
      domain: (aliForm.domain || '').trim(),
      region: (aliForm.region || '').trim(),
    });
  }
  return credForm.extra_param;
}

function onSaveCredential() {
  if (credProvider.value === 'edgeone' && !(eoForm.zone_id || '').trim()) {
    MessagePlugin.warning(t('page.cdnip.eo_zone_id_required'));
    return;
  }
  if (credProvider.value === 'aliyun' && !(aliForm.domain || '').trim()) {
    MessagePlugin.warning(t('page.cdnip.ali_domain_required'));
    return;
  }
  wafCDNProviderCredentialApi({
    provider: credProvider.value,
    secret_id: credForm.secret_id,
    secret_key: credForm.secret_key,
    extra_param: buildExtraParam(),
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
.cred-guide {
  background: var(--td-bg-color-container-hover);
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 12px;
}
.cred-guide-title {
  font-weight: 600;
  margin-bottom: 6px;
}
.cred-guide-list {
  margin: 0;
  padding-left: 18px;
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 20px;
}
.cred-guide-link {
  margin-left: 6px;
  color: var(--td-brand-color);
}
.form-item-tips {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  margin-top: 4px;
}
.t-button-link + .t-button-link {
  margin-left: 12px;
}
</style>
