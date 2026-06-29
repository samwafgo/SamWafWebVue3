<template>
  <div>
    <t-card class="list-card-container">
      <template #header>
        <t-row justify="space-between">
          <div class="card-header-title">
            <t-space>
              <div>{{ t('page.vpconfig.title') }}</div>
              <t-tooltip :content="t('page.vpconfig.description')">
                <help-circle-icon />
              </t-tooltip>
            </t-space>
          </div>
          <t-space>
            <t-button theme="primary" @click="handleRefresh">{{ t('common.refresh') }}</t-button>
            <t-button theme="primary" @click="showConfirmDialog">{{ t('common.save') }}</t-button>
          </t-space>
        </t-row>
      </template>

      <t-loading :loading="dataLoading">
        <t-form ref="ipForm" :data="formData" :rules="rules" :label-width="180">
          <t-form-item :label="t('page.vpconfig.ip_whitelist')" name="ip_whitelist">
            <div style="width: 100%">
              <t-textarea
                v-model="formData.ip_whitelist"
                :placeholder="t('page.vpconfig.ip_whitelist_placeholder')"
                :autosize="{ minRows: 5, maxRows: 10 }"
              />
              <div class="form-item-tips">{{ t('page.vpconfig.ip_whitelist_tips') }}</div>
            </div>
          </t-form-item>
        </t-form>
      </t-loading>
    </t-card>

    <!-- 域名白名单卡片 -->
    <t-card class="list-card-container">
      <template #header>
        <t-row justify="space-between">
          <div class="card-header-title">
            <t-space>
              <div>{{ t('page.vpconfig.domain_whitelist_title') }}</div>
              <t-tooltip :content="t('page.vpconfig.domain_whitelist_description')">
                <help-circle-icon />
              </t-tooltip>
            </t-space>
          </div>
          <t-space>
            <t-button theme="primary" @click="handleDomainRefresh">{{ t('common.refresh') }}</t-button>
            <t-button theme="primary" @click="showDomainConfirmDialog">{{ t('common.save') }}</t-button>
          </t-space>
        </t-row>
      </template>

      <t-loading :loading="domainLoading">
        <t-form :data="domainFormData" :label-width="180">
          <t-form-item :label="t('page.vpconfig.domain_whitelist')">
            <div style="width: 100%">
              <t-textarea
                v-model="domainFormData.domain_whitelist"
                :placeholder="t('page.vpconfig.domain_whitelist_placeholder')"
                :autosize="{ minRows: 3, maxRows: 8 }"
              />
              <div class="form-item-tips">{{ t('page.vpconfig.domain_whitelist_tips') }}</div>
            </div>
          </t-form-item>
        </t-form>
      </t-loading>
    </t-card>

    <t-card class="list-card-container">
      <template #header>
        <t-row justify="space-between">
          <div class="card-header-title">
            <t-space>
              <div>{{ t('page.vpconfig.ssl_title') }}</div>
              <t-tooltip :content="t('page.vpconfig.ssl_description')">
                <help-circle-icon />
              </t-tooltip>
            </t-space>
          </div>
          <t-space>
            <t-button v-if="sslFormData.ssl_enable" theme="warning" @click="showRestartDialog">
              {{ t('page.vpconfig.restart_manager') }}
            </t-button>
          </t-space>
        </t-row>
      </template>

      <t-loading :loading="sslLoading">
        <t-form ref="sslForm" :data="sslFormData" :label-width="180">
          <t-form-item :label="t('page.vpconfig.ssl_enable')">
            <div>
              <t-switch v-model="sslFormData.ssl_enable" @change="handleSslEnableChange" />
              <div class="form-item-tips">{{ t('page.vpconfig.ssl_enable_tips') }}</div>
            </div>
          </t-form-item>

          <t-form-item v-if="sslFormData.ssl_enable" :label="t('page.vpconfig.ssl_force_https')">
            <div>
              <t-switch v-model="sslForceHttpsFormData.force_https" @change="handleSslForceHttpsChange" />
              <div class="form-item-tips">{{ t('page.vpconfig.ssl_force_https_tips') }}</div>
            </div>
          </t-form-item>

          <t-form-item v-if="sslFormData.ssl_enable" :label="t('page.vpconfig.cert_status')">
            <t-space direction="vertical" style="width: 100%">
              <div>
                <t-tag v-if="sslFormData.has_cert" theme="success">{{ t('page.vpconfig.cert_uploaded') }}</t-tag>
                <t-tag v-else theme="warning">{{ t('page.vpconfig.cert_not_uploaded') }}</t-tag>
              </div>
              <div v-if="sslFormData.has_cert && sslFormData.cert_domain" class="cert-info">
                {{ t('page.vpconfig.cert_domain') }}: {{ sslFormData.cert_domain }}
              </div>
              <div v-if="sslFormData.has_cert && sslFormData.cert_expire_at" class="cert-info">
                {{ t('page.vpconfig.cert_expire_at') }}: {{ sslFormData.cert_expire_at }}
              </div>
            </t-space>
          </t-form-item>

          <t-form-item v-if="sslFormData.ssl_enable" :label="t('page.vpconfig.cert_content')">
            <div style="width: 100%">
              <t-textarea
                v-model="certFormData.cert_content"
                :placeholder="t('page.vpconfig.cert_content_placeholder')"
                :autosize="{ minRows: 5, maxRows: 10 }"
              />
              <div class="form-item-tips">{{ t('page.vpconfig.cert_content_tips') }}</div>
            </div>
          </t-form-item>

          <t-form-item v-if="sslFormData.ssl_enable" :label="t('page.vpconfig.key_content')">
            <div style="width: 100%">
              <t-textarea
                v-model="certFormData.key_content"
                :placeholder="t('page.vpconfig.key_content_placeholder')"
                :autosize="{ minRows: 5, maxRows: 10 }"
              />
              <div class="form-item-tips">{{ t('page.vpconfig.key_content_tips') }}</div>
            </div>
          </t-form-item>

          <t-form-item v-if="sslFormData.ssl_enable">
            <t-space>
              <t-button theme="default" @click="showCertListDialog">{{ t('page.vpconfig.select_from_certfolder') }}</t-button>
              <t-button theme="primary" @click="showUploadCertDialog">{{ t('page.vpconfig.upload_cert') }}</t-button>
            </t-space>
          </t-form-item>

          <t-form-item v-if="sslFormData.ssl_enable" :label="t('page.vpconfig.ssl_bind_cert')">
            <t-space direction="vertical" style="width: 100%">
              <div v-if="sslBindCert.ssl_config_id">
                <t-tag theme="success">{{ t('page.vpconfig.ssl_bind_cert_bound') }}</t-tag>
                <span v-if="sslBindCert.domains" class="cert-info" style="margin-left: 8px">{{ sslBindCert.domains }}</span>
                <span v-if="sslBindCert.valid_to" class="cert-info" style="margin-left: 8px">{{ t('page.ssl.label_valid_to') }}: {{ sslBindCert.valid_to }}</span>
              </div>
              <div v-else>
                <t-tag theme="default">{{ t('page.vpconfig.ssl_bind_cert_unbound') }}</t-tag>
              </div>
              <t-space>
                <t-button theme="primary" @click="showBindCertDialog">{{ t('page.vpconfig.ssl_bind_cert_select') }}</t-button>
                <t-button v-if="sslBindCert.ssl_config_id" theme="danger" variant="outline" @click="handleUnbindCert">
                  {{ t('page.vpconfig.ssl_bind_cert_unbind') }}
                </t-button>
              </t-space>
              <div class="form-item-tips">{{ t('page.vpconfig.ssl_bind_cert_tips') }}</div>
            </t-space>
          </t-form-item>
        </t-form>
      </t-loading>
    </t-card>

    <!-- 安全路径入口卡片 -->
    <t-card class="list-card-container">
      <template #header>
        <t-row justify="space-between">
          <div class="card-header-title">
            <t-space>
              <div>{{ t('page.vpconfig.security_entry_title') }}</div>
              <t-tooltip :content="t('page.vpconfig.security_entry_description')">
                <help-circle-icon />
              </t-tooltip>
            </t-space>
          </div>
        </t-row>
      </template>

      <t-loading :loading="securityEntryLoading">
        <!-- 编辑表单：开关 + 自定义路径 + 保存按钮 -->
        <t-form :data="securityEntryFormData" :label-width="180">
          <t-form-item :label="t('page.vpconfig.security_entry_enable')">
            <div>
              <t-switch v-model="securityEntryFormData.entry_enable" />
              <div class="form-item-tips">{{ t('page.vpconfig.security_entry_enable_tips') }}</div>
            </div>
          </t-form-item>

          <!--
            【影响范围说明】
            安全路径 handler 拦截的是整个 HTTP Server 的所有请求：管理界面、WebSocket、
            开放平台 API Key 外部调用、任何直接调用的 /api/v1/... 接口。
            启用后所有调用方的 URL 都需要改为 http(s)://host:port/{安全码}/api/v1/...
          -->
          <t-form-item v-if="securityEntryFormData.entry_enable">
            <t-alert theme="info" :message="t('page.vpconfig.security_entry_oplatform_notice')" />
          </t-form-item>

          <t-form-item v-if="securityEntryFormData.entry_enable" :label="t('page.vpconfig.security_entry_custom_code')">
            <div>
              <t-input
                v-model="securityEntryFormData.entry_path"
                :placeholder="t('page.vpconfig.security_entry_custom_code_placeholder')"
                style="width: 280px; font-family: monospace"
                clearable
              />
              <div class="form-item-tips">{{ t('page.vpconfig.security_entry_custom_code_tips') }}</div>
            </div>
          </t-form-item>

          <t-form-item>
            <t-button theme="primary" @click="handleSaveSecurityEntry">{{ t('page.vpconfig.security_entry_save') }}</t-button>
          </t-form-item>
        </t-form>

        <!-- 已保存的访问信息：仅当服务端已启用时展示 -->
        <template v-if="savedSecurityEntry.entry_enable && savedSecurityEntry.entry_path">
          <t-divider />
          <t-form :label-width="180">
            <t-form-item>
              <t-alert theme="warning" :message="t('page.vpconfig.security_entry_warning')" />
            </t-form-item>

            <t-form-item :label="t('page.vpconfig.security_entry_code')">
              <t-input :value="savedSecurityEntry.entry_path" readonly style="width: 280px; font-family: monospace" />
            </t-form-item>

            <t-form-item :label="t('page.vpconfig.security_entry_url')">
              <t-space direction="vertical" style="width: 100%">
                <t-input :value="securityEntryFullUrl" readonly style="width: 520px; font-family: monospace" />
                <div class="form-item-tips">{{ t('page.vpconfig.security_entry_url_tips') }}</div>
                <t-space>
                  <t-button theme="primary" @click="copySecurityUrl">{{ t('page.vpconfig.security_entry_copy_url') }}</t-button>
                  <t-button theme="default" @click="openSecurityUrl">{{ t('page.vpconfig.security_entry_open_url') }}</t-button>
                  <t-button theme="danger" variant="outline" @click="showRegenerateDialog">{{
                    t('page.vpconfig.security_entry_regenerate')
                  }}</t-button>
                </t-space>
              </t-space>
            </t-form-item>
          </t-form>
        </template>
      </t-loading>
    </t-card>

    <!-- 通知标题前缀卡片 -->
    <t-card class="list-card-container">
      <template #header>
        <t-row justify="space-between">
          <div class="card-header-title">
            <t-space>
              <div>{{ t('page.vpconfig.notice_title_title') }}</div>
              <t-tooltip :content="t('page.vpconfig.notice_title_description')">
                <help-circle-icon />
              </t-tooltip>
            </t-space>
          </div>
        </t-row>
      </template>

      <t-loading :loading="noticeTitleLoading">
        <t-form :data="noticeTitleFormData" :label-width="180">
          <t-form-item :label="t('page.vpconfig.notice_title_label')">
            <div>
              <t-input
                v-model="noticeTitleFormData.notice_title"
                :placeholder="t('page.vpconfig.notice_title_placeholder')"
                style="width: 320px"
                clearable
              />
              <div class="form-item-tips">{{ t('page.vpconfig.notice_title_tips') }}</div>
            </div>
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" @click="handleSaveNoticeTitle">{{ t('page.vpconfig.notice_title_save') }}</t-button>
          </t-form-item>
        </t-form>
      </t-loading>
    </t-card>

    <!-- 域名白名单确认对话框 -->
    <t-dialog
      v-model:visible="domainConfirmDialogVisible"
      :header="t('common.confirm')"
      :body="t('page.vpconfig.domain_whitelist_save_confirm')"
      @confirm="handleDomainSave"
      @cancel="domainConfirmDialogVisible = false"
    />

    <!-- 确认对话框 -->
    <t-dialog
      v-model:visible="confirmDialogVisible"
      :header="t('common.confirm')"
      :body="t('page.vpconfig.save_confirm')"
      @confirm="handleSave"
      @cancel="confirmDialogVisible = false"
    />

    <!-- 证书上传确认对话框 -->
    <t-dialog
      v-model:visible="uploadCertDialogVisible"
      :header="t('common.confirm')"
      :body="t('page.vpconfig.upload_cert_confirm')"
      @confirm="handleUploadCert"
      @cancel="uploadCertDialogVisible = false"
    />

    <!-- 证书列表选择对话框 -->
    <t-dialog v-model:visible="certListDialogVisible" :header="t('page.vpconfig.select_cert_from_folder')" :width="1200" :footer="false">
      <t-loading :loading="certListLoading">
        <t-table
          :columns="certColumns"
          :data="certListData"
          row-key="id"
          hover
          :pagination="certPagination"
          @page-change="handleCertPageChange"
        >
          <template #op="{ row }">
            <t-button theme="primary" size="small" @click="handleCertOp(row)">
              {{ certDialogMode === 'bind' ? t('page.vpconfig.ssl_bind_cert_do_bind') : t('common.select_placeholder') }}
            </t-button>
          </template>
        </t-table>
      </t-loading>
    </t-dialog>

    <!-- 重启管理端确认对话框 -->
    <t-dialog
      v-model:visible="restartDialogVisible"
      :header="t('common.confirm')"
      :body="t('page.vpconfig.restart_confirm')"
      @confirm="handleRestartManager"
      @cancel="restartDialogVisible = false"
    />

    <!-- 重新生成访问码确认对话框 -->
    <t-dialog
      v-model:visible="regenerateDialogVisible"
      :header="t('common.confirm')"
      :body="t('page.vpconfig.security_entry_regenerate_confirm')"
      @confirm="handleRegenerateCode"
      @cancel="regenerateDialogVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormInstanceFunctions, FormProps, PageInfo, TableProps } from 'tdesign-vue-next';
import { HelpCircleIcon } from 'tdesign-icons-vue-next';

import {
  getDomainWhitelistApi,
  getIpWhitelistApi,
  getNoticeTitleApi,
  getSecurityEntryApi,
  getSslStatusApi,
  restartManagerApi,
  updateDomainWhitelistApi,
  updateIpWhitelistApi,
  updateNoticeTitleApi,
  updateSecurityEntryApi,
  updateSslEnableApi,
  uploadSslCertApi,
  getSslForceHttpsApi,
  updateSslForceHttpsApi,
  getSslBindCertApi,
  updateSslBindCertApi,
} from '@/apis/vpconfig';
import { sslConfigDetailApi, sslConfigListApi } from '@/apis/sslconfig';

const { t } = useI18n();

const ipForm = ref<FormInstanceFunctions>();

const dataLoading = ref(false);
const confirmDialogVisible = ref(false);
const domainLoading = ref(false);
const domainConfirmDialogVisible = ref(false);
const domainFormData = reactive({
  domain_whitelist: '',
});
const sslLoading = ref(false);
const uploadCertDialogVisible = ref(false);
const certListDialogVisible = ref(false);
const certListLoading = ref(false);
const restartDialogVisible = ref(false);
const securityEntryLoading = ref(false);
const regenerateDialogVisible = ref(false);
const noticeTitleLoading = ref(false);
const noticeTitleFormData = reactive({
  notice_title: '',
});
// 编辑中的表单值（开关+自定义路径，点保存才提交）
const securityEntryFormData = reactive({
  entry_enable: false,
  entry_path: '',
});
// 服务端已保存的配置（fetch 或 save 成功后更新）
const savedSecurityEntry = reactive({
  entry_enable: false,
  entry_path: '',
});
const formData = reactive({
  ip_whitelist: '',
});
const sslFormData = reactive({
  ssl_enable: false,
  has_cert: false,
  cert_expire_at: '',
  cert_domain: '',
});
const certFormData = reactive({
  cert_content: '',
  key_content: '',
});
// 管理端仅允许HTTPS开关
const sslForceHttpsFormData = reactive({
  force_https: false,
});
// 管理端证书绑定的证书夹（自动同步）
const sslBindCert = reactive({
  ssl_config_id: '',
  domains: '',
  valid_to: '',
});
// 证书夹弹窗模式：copy=一次性复制内容到上传框, bind=绑定自动同步
const certDialogMode = ref<'copy' | 'bind'>('copy');
const certListData = ref<Record<string, any>[]>([]);
const certPagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const certColumns = computed<TableProps['columns']>(() => [
  { align: 'left', width: 120, colKey: 'op', title: t('common.op') },
  { title: t('page.ssl.label_subject'), align: 'left', width: 200, ellipsis: true, colKey: 'subject' },
  { title: t('page.ssl.label_domains'), width: 200, ellipsis: true, colKey: 'domains' },
  { title: t('page.ssl.label_valid_to'), width: 180, ellipsis: true, colKey: 'valid_to' },
  { title: t('page.ssl.label_expire_time'), width: 150, ellipsis: true, colKey: 'expiration_info' },
]);

const rules: FormProps['rules'] = {
  ip_whitelist: [{ required: true, message: t('common.required'), type: 'error' }],
};

const securityEntryFullUrl = computed(() => {
  const { protocol, host } = window.location;
  return `${protocol}//${host}/${savedSecurityEntry.entry_path}/`;
});

onMounted(() => {
  fetchData();
  fetchDomainWhitelist();
  fetchSslStatus();
  fetchSslForceHttps();
  fetchSslBindCert();
  fetchSecurityEntry();
  fetchNoticeTitle();
});

function fetchData() {
  dataLoading.value = true;
  getIpWhitelistApi({})
    .then((res) => {
      if (res.code === 0) {
        formData.ip_whitelist = res.data.ip_whitelist || '';
      } else {
        MessagePlugin.error(res.msg || t('common.tips.api_error'));
      }
    })
    .catch((error) => {
      console.error('获取IP白名单失败:', error);
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function handleRefresh() {
  fetchData();
}

function fetchDomainWhitelist() {
  domainLoading.value = true;
  getDomainWhitelistApi({})
    .then((res) => {
      if (res.code === 0) {
        domainFormData.domain_whitelist = res.data.domain_whitelist || '';
      } else {
        MessagePlugin.error(res.msg || t('common.tips.api_error'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      domainLoading.value = false;
    });
}

function handleDomainRefresh() {
  fetchDomainWhitelist();
}

function showDomainConfirmDialog() {
  domainConfirmDialogVisible.value = true;
}

function handleDomainSave() {
  domainLoading.value = true;
  updateDomainWhitelistApi({
    domain_whitelist: domainFormData.domain_whitelist,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(t('common.tips.save_success'));
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      domainLoading.value = false;
      domainConfirmDialogVisible.value = false;
    });
}

function showConfirmDialog() {
  ipForm.value?.validate().then((result) => {
    if (result === true) {
      confirmDialogVisible.value = true;
    }
  });
}

function handleSave() {
  dataLoading.value = true;
  updateIpWhitelistApi({
    ip_whitelist: formData.ip_whitelist,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(t('common.tips.save_success'));
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch((error) => {
      console.error('保存IP白名单失败:', error);
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      dataLoading.value = false;
      confirmDialogVisible.value = false;
    });
}

function fetchSslStatus() {
  sslLoading.value = true;
  getSslStatusApi({})
    .then((res) => {
      if (res.code === 0) {
        sslFormData.ssl_enable = res.data.ssl_enable || false;
        sslFormData.has_cert = res.data.has_cert || false;
        sslFormData.cert_expire_at = res.data.cert_expire_at || '';
        sslFormData.cert_domain = res.data.cert_domain || '';

        // 加载证书和私钥内容到输入框
        certFormData.cert_content = res.data.cert_content || '';
        certFormData.key_content = res.data.key_content || '';
      } else {
        MessagePlugin.error(res.msg || t('common.tips.api_error'));
      }
    })
    .catch((error) => {
      console.error('获取SSL状态失败:', error);
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      sslLoading.value = false;
    });
}

function handleSslEnableChange(value: any) {
  sslLoading.value = true;
  updateSslEnableApi({
    ssl_enable: value,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.tips.save_success'));
        fetchSslStatus();
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
        // 恢复原值
        sslFormData.ssl_enable = !value;
      }
    })
    .catch((error) => {
      console.error('更新SSL启用状态失败:', error);
      MessagePlugin.error(t('common.tips.save_failed'));
      sslFormData.ssl_enable = !value;
    })
    .finally(() => {
      sslLoading.value = false;
    });
}

function showUploadCertDialog() {
  if (!certFormData.cert_content || !certFormData.key_content) {
    MessagePlugin.warning(t('page.vpconfig.cert_required'));
    return;
  }
  uploadCertDialogVisible.value = true;
}

function handleUploadCert() {
  sslLoading.value = true;
  uploadSslCertApi({
    cert_content: certFormData.cert_content,
    key_content: certFormData.key_content,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.tips.save_success'));
        certFormData.cert_content = '';
        certFormData.key_content = '';
        fetchSslStatus();
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch((error) => {
      console.error('上传SSL证书失败:', error);
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      sslLoading.value = false;
      uploadCertDialogVisible.value = false;
    });
}

function showCertListDialog() {
  certDialogMode.value = 'copy';
  certListDialogVisible.value = true;
  fetchCertList();
}

function showBindCertDialog() {
  certDialogMode.value = 'bind';
  certListDialogVisible.value = true;
  fetchCertList();
}

function handleCertOp(row: Record<string, any>) {
  if (certDialogMode.value === 'bind') {
    handleBindCert(row);
  } else {
    handleSelectCert(row);
  }
}

function fetchCertList() {
  certListLoading.value = true;
  sslConfigListApi({
    pageSize: certPagination.pageSize,
    pageIndex: certPagination.current,
    domains: '',
  })
    .then((res) => {
      if (res.code === 0) {
        certListData.value = res.data.list || [];
        certPagination.total = res.data.total || 0;
      } else {
        MessagePlugin.error(res.msg || t('common.tips.api_error'));
      }
    })
    .catch((error) => {
      console.error('获取证书列表失败:', error);
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      certListLoading.value = false;
    });
}

function handleCertPageChange(pageInfo: PageInfo) {
  certPagination.current = pageInfo.current;
  if (certPagination.pageSize !== pageInfo.pageSize) {
    certPagination.current = 1;
    certPagination.pageSize = pageInfo.pageSize;
  }
  fetchCertList();
}

function handleSelectCert(row: Record<string, any>) {
  // 获取证书详情
  certListLoading.value = true;
  sslConfigDetailApi({
    id: row.id,
  })
    .then((res) => {
      if (res.code === 0) {
        // 填充证书内容到表单
        certFormData.cert_content = res.data.cert_content || '';
        certFormData.key_content = res.data.key_content || '';

        MessagePlugin.success(t('page.vpconfig.cert_selected_success'));
        certListDialogVisible.value = false;
      } else {
        MessagePlugin.error(res.msg || t('common.tips.api_error'));
      }
    })
    .catch((error) => {
      console.error('获取证书详情失败:', error);
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      certListLoading.value = false;
    });
}

function handleBindCert(row: Record<string, any>) {
  certListLoading.value = true;
  updateSslBindCertApi({
    ssl_config_id: row.id,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.tips.save_success'));
        certListDialogVisible.value = false;
        fetchSslBindCert();
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch((error) => {
      console.error('绑定管理端证书失败:', error);
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      certListLoading.value = false;
    });
}

function handleUnbindCert() {
  sslLoading.value = true;
  updateSslBindCertApi({
    ssl_config_id: '',
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.tips.save_success'));
        fetchSslBindCert();
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch((error) => {
      console.error('解绑管理端证书失败:', error);
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      sslLoading.value = false;
    });
}

function fetchSslBindCert() {
  getSslBindCertApi({})
    .then((res) => {
      if (res.code === 0) {
        sslBindCert.ssl_config_id = res.data.ssl_config_id || '';
        sslBindCert.domains = res.data.domains || '';
        sslBindCert.valid_to = res.data.valid_to || '';
      }
    })
    .catch((error) => {
      console.error('获取管理端证书绑定信息失败:', error);
    });
}

function fetchSslForceHttps() {
  getSslForceHttpsApi({})
    .then((res) => {
      if (res.code === 0) {
        sslForceHttpsFormData.force_https = res.data.force_https || false;
      }
    })
    .catch((error) => {
      console.error('获取仅HTTPS开关失败:', error);
    });
}

function handleSslForceHttpsChange(value: boolean) {
  sslLoading.value = true;
  updateSslForceHttpsApi({
    force_https: value,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.tips.save_success'));
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
        sslForceHttpsFormData.force_https = !value;
      }
    })
    .catch((error) => {
      console.error('更新仅HTTPS开关失败:', error);
      MessagePlugin.error(t('common.tips.save_failed'));
      sslForceHttpsFormData.force_https = !value;
    })
    .finally(() => {
      sslLoading.value = false;
    });
}

function showRestartDialog() {
  restartDialogVisible.value = true;
}

function fetchSecurityEntry() {
  securityEntryLoading.value = true;
  getSecurityEntryApi({})
    .then((res) => {
      if (res.code === 0) {
        const enable = res.data.entry_enable || false;
        const path = res.data.entry_path || '';
        // 同步到已保存状态和表单编辑状态
        savedSecurityEntry.entry_enable = enable;
        savedSecurityEntry.entry_path = path;
        securityEntryFormData.entry_enable = enable;
        securityEntryFormData.entry_path = path;
        // 同步到 localStorage（供开发环境使用）
        syncSecurityPathToStorage(enable, path);
      } else {
        MessagePlugin.error(res.msg || t('common.tips.api_error'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      securityEntryLoading.value = false;
    });
}

// 保存安全路径到 localStorage，供开发模式的 host.ts / App.vue 使用
function syncSecurityPathToStorage(enable: boolean, path: string) {
  try {
    if (enable && path) {
      localStorage.setItem('__samwaf_security_path__', `/${path}`);
    } else {
      localStorage.removeItem('__samwaf_security_path__');
    }
  } catch (e) {
    // localStorage 不可用时忽略
  }
}

// 点击保存按钮时才调用 API
function handleSaveSecurityEntry() {
  securityEntryLoading.value = true;
  updateSecurityEntryApi({
    entry_enable: securityEntryFormData.entry_enable,
    entry_path: securityEntryFormData.entry_path,
  })
    .then((res) => {
      if (res.code === 0) {
        const enable = res.data.entry_enable;
        const path = res.data.entry_path || '';
        savedSecurityEntry.entry_enable = enable;
        savedSecurityEntry.entry_path = path;
        // 将新路径同步到表单（后端可能自动生成了路径）
        securityEntryFormData.entry_path = path;
        // 保存到 localStorage
        syncSecurityPathToStorage(enable, path);
        if (enable) {
          MessagePlugin.success(t('page.vpconfig.security_entry_save_success'));
          setTimeout(() => {
            window.location.href = securityEntryFullUrl.value;
          }, 2000);
        } else {
          MessagePlugin.success(t('page.vpconfig.security_entry_disable_success'));
          setTimeout(() => {
            window.location.href = `${window.location.protocol}//${window.location.host}/`;
          }, 2000);
        }
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      securityEntryLoading.value = false;
    });
}

function copySecurityUrl() {
  const url = securityEntryFullUrl.value;
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        MessagePlugin.success(t('page.vpconfig.security_entry_copy_success'));
      })
      .catch(() => {
        fallbackCopy(url);
      });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text: string) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  MessagePlugin.success(t('page.vpconfig.security_entry_copy_success'));
}

function openSecurityUrl() {
  window.open(securityEntryFullUrl.value, '_blank');
}

function showRegenerateDialog() {
  regenerateDialogVisible.value = true;
}

function handleRegenerateCode() {
  regenerateDialogVisible.value = false;
  securityEntryLoading.value = true;
  updateSecurityEntryApi({
    entry_enable: true,
    entry_path: '', // 传空触发后端重新生成18位随机码
  })
    .then((res) => {
      if (res.code === 0) {
        const path = res.data.entry_path || '';
        savedSecurityEntry.entry_enable = true;
        savedSecurityEntry.entry_path = path;
        securityEntryFormData.entry_path = path;
        syncSecurityPathToStorage(true, path);
        MessagePlugin.success(t('page.vpconfig.security_entry_save_success'));
        setTimeout(() => {
          window.location.href = securityEntryFullUrl.value;
        }, 2000);
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      securityEntryLoading.value = false;
    });
}

function fetchNoticeTitle() {
  noticeTitleLoading.value = true;
  getNoticeTitleApi({})
    .then((res) => {
      if (res.code === 0) {
        noticeTitleFormData.notice_title = res.data.notice_title || '';
      } else {
        MessagePlugin.error(res.msg || t('common.tips.api_error'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      noticeTitleLoading.value = false;
    });
}

function handleSaveNoticeTitle() {
  noticeTitleLoading.value = true;
  updateNoticeTitleApi({
    notice_title: noticeTitleFormData.notice_title,
  })
    .then((res) => {
      if (res.code === 0) {
        noticeTitleFormData.notice_title = res.data.notice_title || '';
        MessagePlugin.success(t('common.tips.save_success'));
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      noticeTitleLoading.value = false;
    });
}

function handleRestartManager() {
  restartDialogVisible.value = false;
  MessagePlugin.loading({
    content: t('page.vpconfig.restarting'),
    duration: 0,
  });

  restartManagerApi({})
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('page.vpconfig.restart_success'));

        // 提示用户等待
        setTimeout(() => {
          MessagePlugin.info(t('page.vpconfig.restart_wait_tip'));
        }, 1500);

        // 5秒后尝试刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } else {
        MessagePlugin.error(res.msg || t('page.vpconfig.restart_failed'));
      }
    })
    .catch((error) => {
      console.error('重启管理端失败:', error);
      MessagePlugin.error(t('page.vpconfig.restart_failed'));
    });
}
</script>

<style scoped>
.list-card-container {
  padding: 16px;
  margin-bottom: 16px;
}

.card-header-title {
  font-size: 16px;
  font-weight: 500;
}

.form-item-tips {
  color: rgba(0, 0, 0, 0.4);
  font-size: 12px;
  margin-top: 8px;
}

.cert-info {
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
  line-height: 24px;
}
</style>
