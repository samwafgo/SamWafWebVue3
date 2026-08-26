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

    <!-- 管理端可信代理网段卡片 -->
    <t-card class="list-card-container">
      <template #header>
        <t-row justify="space-between">
          <div class="card-header-title">
            <t-space>
              <div>{{ t('page.vpconfig.trusted_proxies_title') }}</div>
              <t-tooltip :content="t('page.vpconfig.trusted_proxies_description')">
                <help-circle-icon />
              </t-tooltip>
            </t-space>
          </div>
          <t-space>
            <t-button theme="primary" @click="fetchTrustedProxies">{{ t('common.refresh') }}</t-button>
            <t-button theme="primary" @click="handleTrustedProxiesSave">{{ t('common.save') }}</t-button>
          </t-space>
        </t-row>
      </template>

      <t-loading :loading="trustedProxiesLoading">
        <t-alert theme="info" :message="t('page.vpconfig.trusted_proxies_union_tip')" style="margin-bottom: 12px" />
        <t-form :data="trustedProxiesFormData" :label-width="180">
          <t-form-item :label="t('page.vpconfig.manage_proxy_enable')">
            <div style="width: 100%">
              <t-switch v-model="enableManageProxy" @change="onEnableManageProxyChange" />
              <div class="form-item-tips">{{ t('page.vpconfig.manage_proxy_enable_tips') }}</div>
            </div>
          </t-form-item>
          <t-form-item v-if="enableManageProxy" :label="t('page.vpconfig.manage_proxy_header')">
            <div style="width: 100%">
              <t-input
                v-model="manageProxyHeader"
                :placeholder="t('page.vpconfig.manage_proxy_header_placeholder')"
                clearable
                :style="{ width: '480px', maxWidth: '100%' }"
              />
              <div class="proxy-header-presets">
                <span class="preset-label">{{ t('page.vpconfig.manage_proxy_header_quickfill') }}</span>
                <t-tag
                  v-for="p in proxyHeaderPresets"
                  :key="p.value"
                  size="small"
                  variant="outline"
                  theme="primary"
                  style="cursor: pointer; margin: 2px 6px 2px 0"
                  @click="addProxyHeaderToken(p.value)"
                  >{{ p.label }}</t-tag
                >
                <t-tag
                  size="small"
                  variant="outline"
                  theme="default"
                  style="cursor: pointer; margin: 2px 0"
                  @click="manageProxyHeader = ''"
                  >{{ t('page.vpconfig.manage_proxy_header_clear') }}</t-tag
                >
              </div>
              <div class="form-item-tips">{{ t('page.vpconfig.manage_proxy_header_tips') }}</div>
            </div>
          </t-form-item>
          <t-form-item v-if="enableManageProxy" :label="t('page.vpconfig.manage_cdn_provider')">
            <div style="width: 100%">
              <t-space>
                <t-select
                  v-model="manageCdnProvider"
                  :style="{ width: '240px' }"
                  :placeholder="t('page.vpconfig.manage_cdn_provider_placeholder')"
                  clearable
                  @change="handleManageCdnProviderChange"
                >
                  <t-option value="cloudflare" label="Cloudflare" />
                  <t-option value="fastly" label="Fastly" />
                  <t-option value="cloudfront" label="AWS CloudFront" />
                  <t-option value="edgeone" label="腾讯云 EdgeOne" />
                  <t-option value="aliyun" label="阿里云 CDN" />
                  <t-option value="akamai" label="Akamai" />
                </t-select>
                <span v-if="manageCdnInfo && manageCdnProvider">
                  <span v-if="manageCdnInfo.count > 0" style="color: var(--td-success-color)">
                    {{ t('page.vpconfig.manage_cdn_downloaded', { count: manageCdnInfo.count }) }}
                  </span>
                  <span v-else style="color: var(--td-warning-color)">{{ t('page.vpconfig.manage_cdn_not_fetched') }}</span>
                </span>
                <t-link theme="primary" hover="color" @click="goCdnPage">{{ t('page.vpconfig.manage_cdn_link') }}</t-link>
              </t-space>
              <div class="form-item-tips">{{ t('page.vpconfig.manage_cdn_provider_tips') }}</div>
            </div>
          </t-form-item>
          <t-form-item v-if="enableManageProxy" :label="t('page.vpconfig.trusted_proxies')">
            <div style="width: 100%">
              <t-textarea
                v-model="trustedProxiesFormData.trusted_proxies"
                :placeholder="t('page.vpconfig.trusted_proxies_placeholder')"
                :autosize="{ minRows: 3, maxRows: 8 }"
              />
              <div class="form-item-tips">{{ t('page.vpconfig.trusted_proxies_tips') }}</div>
            </div>
          </t-form-item>
        </t-form>
      </t-loading>
    </t-card>

    <!-- CORS 跨域白名单卡片 -->
    <t-card class="list-card-container">
      <template #header>
        <t-row justify="space-between">
          <div class="card-header-title">
            <t-space>
              <div>{{ t('page.vpconfig.cors_title') }}</div>
              <t-tooltip :content="t('page.vpconfig.cors_description')">
                <help-circle-icon />
              </t-tooltip>
            </t-space>
          </div>
          <t-space>
            <t-button theme="primary" @click="fetchCors">{{ t('common.refresh') }}</t-button>
            <t-button theme="primary" @click="handleCorsSave">{{ t('common.save') }}</t-button>
          </t-space>
        </t-row>
      </template>

      <t-loading :loading="corsLoading">
        <t-form :data="corsFormData" :label-width="180">
          <t-form-item :label="t('page.vpconfig.cors_origins')">
            <div style="width: 100%">
              <t-textarea
                v-model="corsFormData.cors_allow_origins"
                :placeholder="t('page.vpconfig.cors_placeholder')"
                :autosize="{ minRows: 3, maxRows: 8 }"
              />
              <div class="form-item-tips">{{ t('page.vpconfig.cors_tips') }}</div>
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
              <div>{{ t('page.vpconfig.access_title') }}</div>
              <t-tooltip :content="t('page.vpconfig.access_description')">
                <t-icon name="help-circle" />
              </t-tooltip>
            </t-space>
          </div>
        </t-row>
      </template>

      <t-loading :loading="sslLoading">
        <t-form :label-width="180">
          <!-- 本次访问：常驻不可关闭。顶部横幅可按会话收起，这条不行——
               收起横幅不该等于信息消失，这里是它唯一"不消失"的落点。回环访问同样显示。 -->
          <t-form-item :label="t('page.vpconfig.transport_status')">
            <t-space direction="vertical" style="width: 100%">
              <div>
                <t-tag v-if="transportSecure" theme="success">{{ t('page.vpconfig.transport_status_https') }}</t-tag>
                <t-tag v-else-if="transportLoopback" theme="primary">{{ t('page.vpconfig.transport_status_loopback') }}</t-tag>
                <t-tag v-else theme="warning">{{ t('page.vpconfig.transport_status_http') }}</t-tag>
              </div>
              <div class="form-item-tips">{{ transportStatusTips }}</div>
            </t-space>
          </t-form-item>

          <t-form-item :label="t('page.vpconfig.ssl_enable')">
            <t-switch v-model="sslFormData.ssl_enable" @change="handleSslEnableChange" />
            <div class="form-item-tips">{{ t('page.vpconfig.ssl_enable_tips') }}</div>
          </t-form-item>

          <t-form-item :label="t('page.vpconfig.ssl_force_https')" v-if="sslFormData.ssl_enable">
            <t-switch v-model="sslForceHttpsFormData.force_https" @change="handleSslForceHttpsChange" />
            <div class="form-item-tips">{{ t('page.vpconfig.ssl_force_https_tips') }}</div>
          </t-form-item>
        </t-form>
      </t-loading>
    </t-card>

    <!-- ===== 管理端证书：当前状态（只读）与更换（操作）彻底分开 ===== -->
    <t-card class="list-card-container" v-if="sslFormData.ssl_enable">
      <template #header>
        <t-row justify="space-between">
          <div class="card-header-title">
            <t-space>
              <div>{{ t('page.vpconfig.cert_title') }}</div>
              <t-tag v-if="certSource === 'none'" theme="warning">{{ t('page.vpconfig.cert_unconfigured') }}</t-tag>
              <t-tag v-else theme="success">{{ t('page.vpconfig.cert_configured') }}</t-tag>
            </t-space>
          </div>
        </t-row>
      </template>

      <t-loading :loading="sslLoading">
        <!-- 当前证书摘要：把原先散在三处的"证书状态/本地证书/绑定证书夹"合成一条 -->
        <div v-if="certSource === 'none'" class="cert-current cert-current--empty">
          <div>{{ t('page.vpconfig.cert_empty_title') }}</div>
          <div class="form-item-tips" style="margin-top: 6px">{{ t('page.vpconfig.cert_empty_tips') }}</div>
        </div>

        <div v-else class="cert-current">
          <div class="cert-current__top">
            <b>{{ certSummary.name }}</b>
            <t-tag theme="success">{{ t('page.vpconfig.cert_in_use') }}</t-tag>
            <t-tag>{{ t('page.vpconfig.cert_source') }}: {{ certSourceLabel }}</t-tag>
            <t-tag :theme="certAutoRenew ? 'success' : 'warning'">
              {{ certAutoRenew ? t('page.vpconfig.cert_auto_renew') : t('page.vpconfig.cert_manual_renew') }}
            </t-tag>
          </div>
          <div class="cert-current__meta">
            <span v-for="(m, i) in certSummary.meta" :key="i">
              <i>{{ m.k }}</i>{{ m.v }}
            </span>
          </div>
          <div class="cert-current__acts">
            <t-button v-if="certSource === 'local'" theme="default" size="small" @click="handleDownloadLocalCa">
              {{ t('page.vpconfig.local_cert_download_ca') }}
            </t-button>
            <t-button v-if="certSource === 'local'" theme="default" size="small" :loading="localCertLoading" @click="handleGenerateLocalCert">
              {{ t('page.vpconfig.cert_renew_now') }}
            </t-button>
            <t-button theme="default" size="small" @click="openChangeCert(certSource)">
              {{ t('page.vpconfig.cert_change_current') }}
            </t-button>
          </div>
        </div>

        <!-- 未生效提示：替代原先常驻标题栏的重启按钮，只在真有待生效改动时出现 -->
        <t-alert
          v-if="certPending"
          theme="warning"
          class="cert-pending"
          :message="t('page.vpconfig.cert_pending')"
        >
          <template #operation>
            <t-button theme="warning" size="small" @click="showRestartDialog">
              {{ t('page.vpconfig.restart_manager') }}
            </t-button>
          </template>
        </t-alert>

        <div class="cert-divider"></div>

        <!-- 更换证书：默认收起，日常进来只看到上面那条摘要 -->
        <div v-if="!changeCertOpen">
          <t-space align="center">
            <t-button theme="default" @click="openChangeCert()">{{ t('page.vpconfig.cert_change') }}</t-button>
            <span class="form-item-tips">{{ t('page.vpconfig.cert_change_tips') }}</span>
          </t-space>
        </div>

        <div v-else>
          <t-row justify="space-between" align="middle" style="margin-bottom: 12px">
            <b>{{ t('page.vpconfig.cert_pick_source') }}</b>
            <t-button variant="text" theme="primary" @click="changeCertOpen = false">
              {{ t('page.vpconfig.cert_collapse') }}
            </t-button>
          </t-row>

          <!-- 三张选择卡：把"我该走哪条路"的判断依据并排摆出来 -->
          <div class="cert-choices">
            <div
              v-for="c in certChoices"
              :key="c.key"
              :class="['cert-choice', { 'cert-choice--on': pickedSource === c.key }]"
              @click="pickedSource = c.key"
            >
              <div class="cert-choice__title">
                <span>{{ t(c.title) }}</span>
                <t-tag size="small" :theme="c.auto ? 'success' : 'warning'">
                  {{ c.auto ? t('page.vpconfig.cert_auto_renew') : t('page.vpconfig.cert_manual_renew') }}
                </t-tag>
              </div>
              <div class="cert-choice__who">{{ t(c.who) }}</div>
              <ul class="cert-choice__list">
                <li v-for="(li, i) in c.points" :key="i">{{ t(li) }}</li>
              </ul>
              <div class="cert-choice__foot">{{ t(c.foot) }}</div>
            </div>
          </div>

          <!-- 面板一：证书夹绑定（持续同步） -->
          <div v-if="pickedSource === 'folder'" class="cert-panel">
            <div class="cert-panel__title">{{ t('page.vpconfig.cert_folder_title') }}</div>
            <div class="form-item-tips" style="margin-bottom: 12px">{{ t('page.vpconfig.cert_folder_tips') }}</div>

            <div v-if="sslBindCert.ssl_config_id" class="cert-current cert-current--bound">
              <div class="cert-current__top">
                <b>{{ sslBindCert.domains }}</b>
                <t-tag theme="primary">{{ t('page.vpconfig.ssl_bind_cert_bound') }}</t-tag>
              </div>
              <div class="cert-current__meta">
                <span v-if="sslBindCert.valid_to"><i>{{ t('page.ssl.label_valid_to') }}</i>{{ sslBindCert.valid_to }}</span>
              </div>
            </div>
            <div v-else class="cert-current cert-current--empty" style="padding: 18px">
              {{ t('page.vpconfig.cert_folder_unbound') }}
            </div>

            <t-space style="margin-top: 14px">
              <t-button theme="primary" @click="showBindCertDialog">{{ t('page.vpconfig.ssl_bind_cert_select') }}</t-button>
              <t-button theme="danger" variant="outline" v-if="sslBindCert.ssl_config_id" @click="handleUnbindCert">
                {{ t('page.vpconfig.ssl_bind_cert_unbind') }}
              </t-button>
            </t-space>
          </div>

          <!-- 面板二：本机生成 -->
          <div v-if="pickedSource === 'local'" class="cert-panel">
            <div class="cert-panel__title">{{ t('page.vpconfig.local_cert_generate') }}</div>
            <div class="form-item-tips" style="margin-bottom: 10px">{{ t('page.vpconfig.local_cert_sans_intro') }}</div>
            <t-input v-model="localCertSans" :placeholder="t('page.vpconfig.local_cert_sans_placeholder')" />
            <div class="form-item-tips">{{ t('page.vpconfig.local_cert_sans_tips') }}</div>

            <div class="cert-divider"></div>
            <div class="form-item-tips" style="margin-bottom: 6px">{{ t('page.vpconfig.local_cert_next_steps') }}</div>
            <ol class="cert-steps">
              <li>{{ t('page.vpconfig.local_cert_step_import') }}</li>
              <li>{{ t('page.vpconfig.local_cert_step_restart') }}</li>
            </ol>
            <t-space>
              <t-button theme="primary" :loading="localCertLoading" @click="handleGenerateLocalCert">
                {{ t('page.vpconfig.local_cert_do_generate') }}
              </t-button>
              <t-button theme="default" :disabled="!localCert.has_ca" @click="handleDownloadLocalCa">
                {{ t('page.vpconfig.local_cert_download_ca') }}
              </t-button>
            </t-space>


            <!-- 生成后浏览器仍报「不安全」是最高频的疑问，直接把原因与操作写在页面上 -->
            <t-alert v-if="localCert.has_ca" theme="info" class="cert-guide-alert">
              <template #title>{{ t('page.vpconfig.local_ca_notice_title') }}</template>
              <template #message>
                <div>{{ t('page.vpconfig.local_ca_notice_body') }}</div>
                <div v-if="localCert.ca && localCert.ca.fingerprint" class="cert-fp">
                  <div class="cert-fp__label">{{ t('page.vpconfig.local_ca_fingerprint') }}</div>
                  <code class="cert-fp__val">{{ localCert.ca.fingerprint }}</code>
                  <div class="form-item-tips">{{ t('page.vpconfig.local_ca_fingerprint_tips') }}</div>
                </div>
              </template>
            </t-alert>

            <t-collapse v-if="localCert.has_ca" class="cert-guide">
              <t-collapse-panel :header="t('page.vpconfig.local_ca_guide_title')">
                <div class="cert-guide__intro">{{ t('page.vpconfig.local_ca_guide_intro') }}</div>
                <div class="cert-guide__os">{{ t('page.vpconfig.local_ca_guide_win_title') }}</div>
                <ul class="cert-guide__list">
                  <li>{{ t('page.vpconfig.local_ca_guide_win1') }}</li>
                  <li class="cert-guide__key">{{ t('page.vpconfig.local_ca_guide_win2') }}</li>
                  <li class="cert-guide__key">{{ t('page.vpconfig.local_ca_guide_win3') }}</li>
                </ul>
                <ul class="cert-guide__list">
                  <li>{{ t('page.vpconfig.local_ca_guide_mac') }}</li>
                  <li>{{ t('page.vpconfig.local_ca_guide_linux') }}</li>
                  <li>{{ t('page.vpconfig.local_ca_guide_firefox') }}</li>
                </ul>
                <div class="cert-guide__key">{{ t('page.vpconfig.local_ca_guide_restart') }}</div>
              </t-collapse-panel>

              <t-collapse-panel :header="t('page.vpconfig.local_ca_remove_title')">
                <div class="cert-guide__intro">{{ t('page.vpconfig.local_ca_remove_intro') }}</div>
                <ul class="cert-guide__list">
                  <li>{{ t('page.vpconfig.local_ca_remove_win') }}</li>
                  <li>{{ t('page.vpconfig.local_ca_remove_mac') }}</li>
                  <li>{{ t('page.vpconfig.local_ca_remove_linux') }}</li>
                  <li>{{ t('page.vpconfig.local_ca_remove_firefox') }}</li>
                </ul>
              </t-collapse-panel>
              <t-collapse-panel :header="t('page.vpconfig.local_ca_danger_title')">
                <div class="cert-guide__intro">{{ t('page.vpconfig.local_ca_danger_tips') }}</div>
                <t-space>
                  <t-button theme="danger" variant="outline" :loading="localCertLoading" @click="handleRotateLocalCa">
                    {{ t('page.vpconfig.local_ca_rotate') }}
                  </t-button>
                  <t-button theme="danger" variant="outline" @click="handleClearLocalCert">
                    {{ t('page.vpconfig.local_ca_clear') }}
                  </t-button>
                </t-space>
              </t-collapse-panel>
            </t-collapse>

          </div>

          <!-- 面板三：手工粘贴 -->
          <div v-if="pickedSource === 'manual'" class="cert-panel">
            <div class="cert-panel__title">{{ t('page.vpconfig.cert_manual_title') }}</div>
            <div class="form-item-tips" style="margin-bottom: 12px">{{ t('page.vpconfig.cert_manual_tips') }}</div>
            <t-form :label-width="120">
              <t-form-item :label="t('page.vpconfig.cert_content')">
                <t-textarea
                  v-model="certFormData.cert_content"
                  :placeholder="t('page.vpconfig.cert_content_placeholder')"
                  :autosize="{ minRows: 5, maxRows: 10 }"
                />
              </t-form-item>
              <t-form-item :label="t('page.vpconfig.key_content')">
                <t-textarea
                  v-model="certFormData.key_content"
                  :placeholder="t('page.vpconfig.key_content_placeholder')"
                  :autosize="{ minRows: 5, maxRows: 10 }"
                />
              </t-form-item>
            </t-form>
            <t-space>
              <t-button theme="primary" @click="showUploadCertDialog">{{ t('page.vpconfig.upload_cert') }}</t-button>
              <t-button theme="default" @click="showCertListDialog">{{ t('page.vpconfig.select_from_certfolder') }}</t-button>
            </t-space>
            <div class="form-item-tips">{{ t('page.vpconfig.cert_manual_copy_tips') }}</div>
          </div>
        </div>
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
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';
import type { FormInstanceFunctions, FormProps, PageInfo, TableProps } from 'tdesign-vue-next';
import { HelpCircleIcon } from 'tdesign-icons-vue-next';

import {
  getDomainWhitelistApi,
  getIpWhitelistApi,
  getManageTrustedProxiesApi,
  getNoticeTitleApi,
  getSecurityEntryApi,
  getSslStatusApi,
  restartManagerApi,
  updateDomainWhitelistApi,
  updateIpWhitelistApi,
  updateManageTrustedProxiesApi,
  getCorsAllowOriginsApi,
  updateCorsAllowOriginsApi,
  updateNoticeTitleApi,
  updateSecurityEntryApi,
  updateSslEnableApi,
  uploadSslCertApi,
  getSslForceHttpsApi,
  updateSslForceHttpsApi,
  getSslBindCertApi,
  updateSslBindCertApi,
  getLocalCertStatusApi,
  generateLocalCertApi,
  rotateLocalCaApi,
  clearLocalCertApi,
  getManageCDNProviderApi,
  updateManageCDNProviderApi,
} from '@/apis/vpconfig';
import { sslConfigDetailApi, sslConfigListApi } from '@/apis/sslconfig';
import { wafCDNProviderInfoApi } from '@/apis/cdnip';
import { get_detail_by_item_api, edit_system_config_by_item_api } from '@/apis/systemconfig';
import { useRouter } from 'vue-router';
import { isLoopbackHost } from '@/utils/insecure';

const { t } = useI18n();
const router = useRouter();

// 传输加密状态：按当前访问方式判定，与后端配置无关——
// 用户可能配了证书却仍从 http 端口进来，这里要如实反映"这一次访问"是不是加密的
const transportSecure = computed(() => window.location.protocol === 'https:');
const transportLoopback = computed(
  () => window.location.protocol !== 'https:' && isLoopbackHost(window.location.hostname),
);
const transportStatusTips = computed(() => {
  if (transportSecure.value) return t('page.vpconfig.transport_status_https_tips');
  if (transportLoopback.value) return t('page.vpconfig.transport_status_loopback_tips');
  return t('page.vpconfig.transport_status_http_tips');
});

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
// 管理端可信代理网段（配置存 config.yml，被白名单挡住时可改文件+重启自救）
const trustedProxiesFormData = reactive({
  trusted_proxies: '',
});
const trustedProxiesLoading = ref(false);
// 管理端代理头(DB参数 gwaf_manage_proxy_header)：从哪些头识别真实客户端IP，留空=直接用网络IP
const manageProxyHeader = ref('');
// 总开关：代理头有值即开启；关闭=按直连网络IP判定，并隐藏下面代理头/①CDN/②网段
const enableManageProxy = ref(false);
// 管理端引用的CDN厂商(管理端也可能挂在CDN后，自动读中心库最新回源段)
const manageCdnProvider = ref('');
const manageCdnInfo = ref<Record<string, any> | null>(null);
// 代理头快捷填写预设(头名与后端 clientip 厂商注册表逐一对齐)
const proxyHeaderPresets = [
  { label: 'X-Forwarded-For', value: 'X-Forwarded-For' },
  { label: 'X-Real-IP', value: 'X-Real-IP' },
  { label: 'Cloudflare · CF-Connecting-IP', value: 'CF-Connecting-IP' },
  { label: 'Fastly · Fastly-Client-IP', value: 'Fastly-Client-IP' },
  { label: 'AWS CloudFront · CloudFront-Viewer-Address', value: 'CloudFront-Viewer-Address' },
  { label: '腾讯云 EdgeOne · EO-Client-IP', value: 'EO-Client-IP' },
  { label: '阿里云 CDN · Ali-Cdn-Real-Ip', value: 'Ali-Cdn-Real-Ip' },
  { label: 'Akamai · True-Client-IP', value: 'True-Client-IP' },
];
// CORS 跨域来源白名单（配置存 config.yml，回环/本机始终放行）
const corsFormData = reactive({
  cors_allow_origins: '',
});
const corsLoading = ref(false);
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
  fetchTrustedProxies();
  fetchManageCdnProvider();
  fetchCors();
  fetchDomainWhitelist();
  fetchSslStatus();
  fetchSslForceHttps();
  fetchSslBindCert();
  fetchLocalCertStatus();
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

function fetchTrustedProxies() {
  trustedProxiesLoading.value = true;
  getManageTrustedProxiesApi({})
    .then((res) => {
      if (res.code === 0) {
        trustedProxiesFormData.trusted_proxies = res.data.trusted_proxies || '';
      } else {
        MessagePlugin.error(res.msg || t('common.tips.api_error'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      trustedProxiesLoading.value = false;
    });
  // 加载管理端代理头(DB参数)
  fetchManageProxyHeader();
}

// 读取管理端代理头 DB 参数 gwaf_manage_proxy_header
function fetchManageProxyHeader() {
  get_detail_by_item_api({ item: 'gwaf_manage_proxy_header' })
    .then((res) => {
      if (res.code === 0 && res.data) {
        manageProxyHeader.value = res.data.value || '';
      }
      // 开关状态跟随代理头是否有值：有值即开启
      enableManageProxy.value = (manageProxyHeader.value || '').trim() !== '';
    })
    .catch(() => {});
}

// 总开关切换：关闭=清空代理头(按网络层IP判定)并隐藏下方项；开启=展开供填写
function onEnableManageProxyChange(val: boolean) {
  if (!val) {
    manageProxyHeader.value = '';
  }
}

// 快捷追加一个代理头(逗号优先级列表，已存在则忽略、大小写不敏感去重)
function addProxyHeaderToken(token: string) {
  const tokens = (manageProxyHeader.value || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '');
  if (tokens.some((x) => x.toLowerCase() === token.toLowerCase())) {
    return;
  }
  tokens.push(token);
  manageProxyHeader.value = tokens.join(',');
}

// 加载管理端引用的CDN厂商 + 其中心库状态
function fetchManageCdnProvider() {
  getManageCDNProviderApi({})
    .then((res) => {
      if (res.code === 0) {
        manageCdnProvider.value = res.data.provider || '';
        if (manageCdnProvider.value) loadManageCdnInfo(manageCdnProvider.value);
      }
    })
    .catch(() => {});
}

function loadManageCdnInfo(provider: string) {
  wafCDNProviderInfoApi({ provider })
    .then((res) => {
      if (res.code === 0) manageCdnInfo.value = res.data;
    })
    .catch(() => {});
}

// 切换/清除管理端引用CDN厂商(立即保存到 config.yml)
function handleManageCdnProviderChange(v: string) {
  updateManageCDNProviderApi({ provider: v || '' })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(t('common.tips.save_success'));
        manageCdnInfo.value = null;
        if (v) loadManageCdnInfo(v);
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.api_error'));
    });
}

function goCdnPage() {
  const route = router.resolve({ name: 'WafCDNIP' });
  window.open(route.href, '_blank');
}

function handleTrustedProxiesSave() {
  trustedProxiesLoading.value = true;
  // 一并保存：代理头(DB参数 gwaf_manage_proxy_header) + 手填可信代理网段(config.yml)
  Promise.all([
    edit_system_config_by_item_api({
      item: 'gwaf_manage_proxy_header',
      value: (manageProxyHeader.value || '').trim(),
    }),
    updateManageTrustedProxiesApi({
      trusted_proxies: trustedProxiesFormData.trusted_proxies,
    }),
  ])
    .then(([headerRes, proxiesRes]) => {
      if (headerRes.code === 0 && proxiesRes.code === 0) {
        MessagePlugin.success(t('common.tips.save_success'));
      } else {
        MessagePlugin.error((headerRes.code !== 0 ? headerRes.msg : proxiesRes.msg) || t('common.tips.save_failed'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      trustedProxiesLoading.value = false;
    });
}

function fetchCors() {
  corsLoading.value = true;
  getCorsAllowOriginsApi({})
    .then((res) => {
      if (res.code === 0) {
        corsFormData.cors_allow_origins = res.data.cors_allow_origins || '';
      } else {
        MessagePlugin.error(res.msg || t('common.tips.api_error'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      corsLoading.value = false;
    });
}

function handleCorsSave() {
  corsLoading.value = true;
  updateCorsAllowOriginsApi({
    cors_allow_origins: corsFormData.cors_allow_origins,
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
      corsLoading.value = false;
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
        markCertPending();
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
        markCertPending();
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
        markCertPending();
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


// ===== 管理端本地证书（T24a/T25）=====
// 与"上传证书""绑定证书夹"并列的第三条路：本机 CA 签一张给管理端用。
// 续期就是拿同一批访问地址重签一次——CA 不变，用户导入过的根证书继续有效。
const localCert = ref<Record<string, any>>({});
const localCertSans = ref('');
const localCertLoading = ref(false);

// 本地证书剩余天数（当前证书为本地签发时显示）
const localCertDaysLeft = computed(() => {
  const cert = localCert.value?.cert;
  if (!localCert.value?.is_local || !cert?.not_after) return null;
  const ms = new Date(cert.not_after).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 86400000));
});

// ===== 证书来源判定与「更换证书」区（界面重构，见 原型设计/2026-08-25-管理端证书界面重构-原型.html）=====
// 「更换证书」区默认收起：日常进来只看摘要，要换才展开
const changeCertOpen = ref(false);
const pickedSource = ref('folder');
// 有待生效的证书改动。后端没有这个状态，也不必新增字段——
// 它只在本次会话内有意义：做过写入即置位，点过重启即清除。
const certPending = ref(false);

// 三张选择卡的文案表；顺序即界面顺序
const certChoices = [
  {
    key: 'folder',
    auto: true,
    title: 'page.vpconfig.choice_folder_title',
    who: 'page.vpconfig.choice_folder_who',
    foot: 'page.vpconfig.choice_folder_foot',
    points: [
      'page.vpconfig.choice_folder_p1',
      'page.vpconfig.choice_folder_p2',
      'page.vpconfig.choice_folder_p3',
      'page.vpconfig.choice_folder_p4',
    ],
  },
  {
    key: 'local',
    auto: true,
    title: 'page.vpconfig.choice_local_title',
    who: 'page.vpconfig.choice_local_who',
    foot: 'page.vpconfig.choice_local_foot',
    points: [
      'page.vpconfig.choice_local_p1',
      'page.vpconfig.choice_local_p2',
      'page.vpconfig.choice_local_p3',
      'page.vpconfig.choice_local_p4',
    ],
  },
  {
    key: 'manual',
    auto: false,
    title: 'page.vpconfig.choice_manual_title',
    who: 'page.vpconfig.choice_manual_who',
    foot: 'page.vpconfig.choice_manual_foot',
    points: [
      'page.vpconfig.choice_manual_p1',
      'page.vpconfig.choice_manual_p2',
      'page.vpconfig.choice_manual_p3',
      'page.vpconfig.choice_manual_p4',
    ],
  },
];

// 优先级：绑定证书夹 > 本地CA签发 > 有证书文件即手工上传 > 未配置。
// 绑定优先是因为它是"持续同步"关系，即便当前落盘的证书恰好也是本地签的，
// 真正决定后续走向的仍是绑定关系。
const certSource = computed(() => {
  if (sslBindCert.ssl_config_id) return 'folder';
  if (localCert.value?.is_local) return 'local';
  if (sslFormData.has_cert) return 'manual';
  return 'none';
});

const certSourceLabel = computed(() => {
  const map: Record<string, string> = {
    folder: 'page.vpconfig.cert_source_folder',
    local: 'page.vpconfig.cert_source_local',
    manual: 'page.vpconfig.cert_source_manual',
  };
  return map[certSource.value] ? t(map[certSource.value]) : '';
});

// 只有证书夹绑定与本地签发能自动续期；手工上传只能提醒
const certAutoRenew = computed(() => certSource.value === 'folder' || certSource.value === 'local');

// 摘要条内容：名字 + 若干「键:值」，按来源给不同的组合
const certSummary = computed(() => {
  const src = certSource.value;
  const meta: Array<{ k: string; v: string }> = [];
  let name = '';

  if (src === 'folder') {
    name = sslBindCert.domains || sslFormData.cert_domain || '-';
    if (sslBindCert.valid_to) meta.push({ k: t('page.vpconfig.cert_expire_at'), v: sslBindCert.valid_to });
    meta.push({ k: t('page.vpconfig.cert_renew_way'), v: t('page.vpconfig.cert_renew_folder') });
  } else if (src === 'local') {
    const sans = (localCert.value.sans || []).join('、');
    name = localCert.value.cert?.subject || sans || '-';
    if (sans) meta.push({ k: t('page.vpconfig.cert_covered'), v: sans });
    if (localCertDaysLeft.value !== null) {
      meta.push({
        k: t('page.vpconfig.cert_days_left'),
        v: t('page.vpconfig.cert_days_unit', { days: localCertDaysLeft.value }),
      });
    }
    meta.push({ k: t('page.vpconfig.cert_renew_way'), v: t('page.vpconfig.cert_renew_local') });
  } else if (src === 'manual') {
    name = sslFormData.cert_domain || '-';
    if (sslFormData.cert_expire_at) meta.push({ k: t('page.vpconfig.cert_expire_at'), v: sslFormData.cert_expire_at });
    meta.push({ k: t('page.vpconfig.cert_renew_way'), v: t('page.vpconfig.cert_renew_manual') });
  }
  return { name, meta };
});

// 打开「更换证书」区；带 src 时直接定位到那一张卡
function openChangeCert(src?: string) {
  changeCertOpen.value = true;
  pickedSource.value = src || (certSource.value === 'none' ? 'folder' : certSource.value);
}

// 任何会改动落盘证书的操作都要置位——重启前那张证书还没真正生效
function markCertPending() {
  certPending.value = true;
}

// 建议的访问地址：当前访问用的 host 一定要有，否则签出来的证书对自己都不生效
function suggestLocalCertSans(): string {
  const host = window.location.hostname;
  const items: string[] = [];
  if (host) items.push(host);
  ['localhost', '127.0.0.1'].forEach((extra) => {
    if (!items.includes(extra)) items.push(extra);
  });
  return items.join(',');
}

async function fetchLocalCertStatus() {
  try {
    const res: any = await getLocalCertStatusApi({});
    if (res.code === 0) {
      localCert.value = res.data || {};
      // 输入框预填：优先沿用证书里已有的访问地址，其次给一个基于当前访问方式的建议
      const sans = (localCert.value.sans || []).join(',');
      localCertSans.value = sans || suggestLocalCertSans();
    }
  } catch (e) {
    // 状态查询失败不阻塞整页，其它卡片照常用
  }
}

async function handleGenerateLocalCert() {
  if (!localCertSans.value.trim()) {
    MessagePlugin.warning(t('page.vpconfig.local_cert_sans_required'));
    return;
  }
  localCertLoading.value = true;
  try {
    const res: any = await generateLocalCertApi({ sans: localCertSans.value });
    if (res.code === 0) {
      MessagePlugin.success(t('page.vpconfig.local_cert_generated'));
      markCertPending();
      await fetchLocalCertStatus();
      await fetchSslStatus();
    } else {
      MessagePlugin.error(res.msg || t('common.operation_failed'));
    }
  } catch (e) {
    MessagePlugin.error(t('common.operation_failed'));
  } finally {
    localCertLoading.value = false;
  }
}


// 重建根证书：破坏性操作，旧根证书立刻失效，必须二次确认
function handleRotateLocalCa() {
  const dia = DialogPlugin.confirm({
    header: t('page.vpconfig.local_ca_rotate'),
    body: t('page.vpconfig.local_ca_rotate_confirm'),
    confirmBtn: { content: t('common.confirm'), theme: 'danger' },
    onConfirm: async () => {
      dia.hide();
      localCertLoading.value = true;
      try {
        const res: any = await rotateLocalCaApi({ sans: localCertSans.value });
        if (res.code === 0) {
          MessagePlugin.success(t('page.vpconfig.local_ca_rotated'));
          markCertPending();
          await fetchLocalCertStatus();
          await fetchSslStatus();
        } else {
          MessagePlugin.error(res.msg || t('common.operation_failed'));
        }
      } catch (e) {
        MessagePlugin.error(t('common.operation_failed'));
      } finally {
        localCertLoading.value = false;
      }
    },
  });
}

// 清除本地CA与本地证书；后端在 SSL 仍启用时会拒绝，避免把管理端锁死
function handleClearLocalCert() {
  const dia = DialogPlugin.confirm({
    header: t('page.vpconfig.local_ca_clear'),
    body: t('page.vpconfig.local_ca_clear_confirm'),
    confirmBtn: { content: t('common.confirm'), theme: 'danger' },
    onConfirm: async () => {
      dia.hide();
      try {
        const res: any = await clearLocalCertApi({});
        if (res.code === 0) {
          MessagePlugin.success(res.msg || t('page.vpconfig.local_ca_cleared'));
          await fetchLocalCertStatus();
          await fetchSslStatus();
        } else {
          MessagePlugin.error(res.msg || t('common.operation_failed'));
        }
      } catch (e) {
        MessagePlugin.error(t('common.operation_failed'));
      }
    },
  });
}

// 根证书在浏览器本地存成 .crt：内容随状态接口一起取回，
// 不另开下载路由——window.open 带不了鉴权头，而查询串取令牌只对下载日志那条路径生效。
function handleDownloadLocalCa() {
  const pem = localCert.value?.ca_pem;
  if (!pem) {
    MessagePlugin.warning(t('page.vpconfig.local_cert_no_ca'));
    return;
  }
  const blob = new Blob([pem], { type: 'application/x-x509-ca-cert' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'samwaf-local-ca.crt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
        certPending.value = false;
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

.proxy-header-presets {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.proxy-header-presets .preset-label {
  color: rgba(0, 0, 0, 0.6);
  font-size: 12px;
  margin-right: 4px;
}

.cert-info {
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
  line-height: 24px;
}

/* ===== 管理端证书：当前状态摘要 + 三选一更换区 ===== */
.cert-current {
  border: 1px solid var(--td-component-stroke, #e7e7e7);
  border-radius: 3px;
  padding: 14px 16px;
  background: var(--td-bg-color-container-hover, #fafafa);
}

.cert-current--empty {
  border-style: dashed;
  text-align: center;
  padding: 26px 16px;
  color: var(--td-text-color-placeholder, rgba(0, 0, 0, 0.4));
}

.cert-current--bound {
  background: var(--td-brand-color-light, #f2f3ff);
  border-color: var(--td-brand-color-light-active, #d9e1ff);
}

.cert-current__top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.cert-current__top b {
  font-size: 15px;
}

.cert-current__meta {
  display: flex;
  gap: 26px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
  line-height: 2;
}

.cert-current__meta i {
  font-style: normal;
  color: var(--td-text-color-placeholder, rgba(0, 0, 0, 0.4));
  margin-right: 6px;
}

.cert-current__acts {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.cert-pending {
  margin-top: 12px;
}

.cert-divider {
  height: 1px;
  background: var(--td-component-stroke, #e7e7e7);
  margin: 20px 0;
}

/* 三张选择卡：把"该走哪条路"的判断依据并排摆出来 */
.cert-choices {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (max-width: 900px) {
  .cert-choices {
    grid-template-columns: 1fr;
  }
}

.cert-choice {
  border: 1px solid var(--td-component-border, #dcdcdc);
  border-radius: 3px;
  padding: 16px;
  cursor: pointer;
  background: var(--td-bg-color-container, #fff);
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.cert-choice:hover {
  border-color: var(--td-brand-color, #0052d9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.cert-choice--on {
  border-color: var(--td-brand-color, #0052d9);
  border-width: 2px;
  padding: 15px;
}

.cert-choice__title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.cert-choice__who {
  font-size: 12px;
  color: var(--td-brand-color, #0052d9);
  margin-bottom: 10px;
  min-height: 32px;
}

.cert-choice__list {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
  line-height: 1.9;
  flex: 1;
}

.cert-choice__foot {
  margin-top: 12px;
  font-size: 12px;
  color: var(--td-text-color-placeholder, rgba(0, 0, 0, 0.4));
  border-top: 1px dashed var(--td-component-stroke, #e7e7e7);
  padding-top: 8px;
}

/* 选中卡片下方的展开面板，视觉上与卡片连成一体 */


.cert-guide-alert {
  margin-top: 14px;
}

.cert-fp {
  margin-top: 10px;
}

.cert-fp__label {
  font-size: 12px;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
  margin-bottom: 2px;
}

.cert-fp__val {
  display: block;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  line-height: 1.7;
  word-break: break-all;
  color: var(--td-text-color-primary, rgba(0, 0, 0, 0.9));
}

.cert-guide {
  margin-top: 12px;
}

.cert-guide__intro {
  font-size: 13px;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
  margin-bottom: 8px;
}

.cert-guide__os {
  font-size: 13px;
  font-weight: 500;
  margin: 10px 0 4px;
}

.cert-guide__list {
  margin: 0 0 10px;
  padding-left: 18px;
  font-size: 13px;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
  line-height: 2;
}

/* 最容易点错/最容易漏的那几步，视觉上拎出来 */
.cert-guide__key {
  color: var(--td-warning-color, #e37318);
}

.cert-panel {
  border: 2px solid var(--td-brand-color, #0052d9);
  border-top: none;
  background: var(--td-bg-color-container, #fff);
  padding: 18px;
  border-radius: 0 0 3px 3px;
}

.cert-panel__title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.cert-steps {
  margin: 0 0 14px;
  padding-left: 20px;
  font-size: 13px;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
  line-height: 2;
}
</style>
