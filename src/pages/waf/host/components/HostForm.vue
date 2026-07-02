<template>
  <div>
    <div class="host-form">
      <t-form :data="formData" :rules="rules" :label-width="230" @submit="onSubmit">
        <t-tabs v-model="activeTab">
          <t-tab-panel :value="1" :label="t('page.host.tab_base')">
            <t-form-item :label="t('page.host.website')" name="host">
              <t-tooltip :content="t('page.host.host_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-input v-model="formData.host" :style="{ width: '480px' }" :placeholder="t('common.placeholder')" :disabled="isEdit" />
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.ssl')" name="ssl">
              <t-tooltip :content="t('page.host.ssl_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-radio-group v-model="formData.ssl">
                  <t-radio value="0">{{ t('page.host.ssl_option_no') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.ssl_option_yes') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.port')" name="port">
              <t-tooltip :content="t('page.host.port_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-input-number v-model="formData.port" :style="{ width: '150px' }" :placeholder="t('page.host.port_placeholder')" />
              </t-tooltip>
              <t-tooltip :content="t('page.host.bind_more_port_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                {{ t('page.host.bind_more_port') }}
                <t-input v-model="formData.bind_more_port" :style="{ width: '200px' }" :placeholder="t('page.host.bind_more_port_placeholder')" />
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.unrestricted_port.label_unrestricted_port_is_enable')" name="unrestricted_port">
              <t-tooltip :content="t('page.host.unrestricted_port.unrestricted_port_tip')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-radio-group v-model="formData.unrestricted_port">
                  <t-radio value="0">{{ t('page.host.unrestricted_port.label_unrestricted_port_is_enable_on') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.unrestricted_port.label_unrestricted_port_is_enable_off') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <!-- SSL配置模式选择 (仅在新增模式且选择SSL时显示) -->
            <t-form-item v-if="formData.ssl == '1' && !isEdit" :label="t('page.host.ssl_config_mode')" name="ssl_config_mode">
              <t-radio-group v-model="formData.ssl_config_mode">
                <t-radio value="existing">{{ t('page.host.ssl_config_existing') }}</t-radio>
                <t-radio value="auto_apply">{{ t('page.host.ssl_config_auto_apply') }}</t-radio>
              </t-radio-group>
            </t-form-item>

            <!-- 已有证书选择 -->
            <t-form-item
              v-if="formData.ssl == '1' && (isEdit || formData.ssl_config_mode === 'existing')"
              :label="t('page.host.ssl_folder')"
              name="bind_ssl_id"
            >
              <div style="display: flex; align-items: center; width: 100%">
                <t-select
                  v-model="formData.bind_ssl_id"
                  :filterable="selectCanFilter"
                  :placeholder="t('common.select_placeholder') + t('page.host.ssl_folder')"
                  style="flex-grow: 1"
                  @change="handleSslChange"
                >
                  <t-option key="" value="" :label="t('common.select_placeholder') + t('page.host.ssl_folder')" />
                  <t-option v-for="item in sslConfigList" :key="item.id" :value="item.id" :label="`${item.domains} (${item.valid_to})`" />
                </t-select>

                <t-button style="margin-left: 10px" @click="handleAddNewSsl">{{ t('page.host.add_new_ssl') }}</t-button>
                <t-button style="margin-left: 10px" @click="handleEditSsl">{{ t('page.host.edit_ssl') }}</t-button>
              </div>
            </t-form-item>

            <t-form-item :label="t('page.host.start_status')" name="start_status">
              <t-tooltip :content="t('page.host.start_status_content')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-radio-group v-model="formData.start_status">
                  <t-radio value="0">{{ t('page.host.auto_start_on') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.auto_start_off') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.log_only_mode')" name="log_only_mode">
              <t-tooltip :content="t('page.host.log_only_mode_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-radio-group v-model="formData.log_only_mode">
                  <t-radio value="0">{{ t('page.host.log_only_mode_off') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.log_only_mode_on') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>

            <t-form-item v-if="formData.ssl == '1'" :label="t('page.host.auto_jump_https.label_autu_jump_https')" name="auto_jump_https">
              <div style="width: 100%">
                <t-radio-group v-model="formData.auto_jump_https">
                  <t-radio value="0">{{ t('page.host.auto_jump_https.label_autu_jump_https_off') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.auto_jump_https.label_autu_jump_https_on') }}</t-radio>
                </t-radio-group>

                <!-- 非标准443端口的HTTPS重定向服务器提示 -->
                <div v-if="shouldShowHttpsRedirectTip" style="margin-top: 10px">
                  <t-alert theme="warning" :close="false">
                    <div>
                      <div style="margin-bottom: 8px">
                        {{ t('page.host.auto_jump_https.non_standard_port_tip') }}
                      </div>
                      <div style="display: flex; align-items: center; gap: 10px">
                        <span style="color: #555">
                          {{ t('page.host.auto_jump_https.redirect_server_status') }}:
                          <strong>{{ httpsRedirectStatusText }}</strong>
                        </span>
                        <t-button
                          size="small"
                          theme="primary"
                          :loading="httpsRedirectConfig.loading"
                          :disabled="httpsRedirectConfig.enable_https_redirect === '1'"
                          @click="enableHttpsRedirect"
                        >
                          {{ t('page.host.auto_jump_https.enable_redirect_server') }}
                        </t-button>
                      </div>
                    </div>
                  </t-alert>
                </div>
              </div>
            </t-form-item>
            <t-form-item
              v-if="formData.ssl == '1' && (isEdit || formData.ssl_config_mode === 'existing')"
              :label="t('page.host.certfile')"
              name="certfile"
            >
              <t-tooltip :content="t('page.host.certfile_content')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-textarea v-model="formData.certfile" :style="{ width: '480px' }" :placeholder="t('common.placeholder')" name="certfile" />
              </t-tooltip>
            </t-form-item>
            <t-form-item
              v-if="formData.ssl == '1' && (isEdit || formData.ssl_config_mode === 'existing')"
              :label="t('page.host.keyfile')"
              name="keyfile"
            >
              <t-tooltip :content="t('page.host.keyfile_content')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-textarea v-model="formData.keyfile" :style="{ width: '480px' }" :placeholder="t('common.placeholder')" name="keyfile" />
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.loadbalance.label_loadbalance_is_enable')" name="is_enable_load_balance">
              <t-radio-group v-model="formData.is_enable_load_balance">
                <t-radio value="0">{{ t('page.host.loadbalance.label_is_enable_load_balance_off') }}</t-radio>
                <t-radio value="1">{{ t('page.host.loadbalance.label_is_enable_load_balance_on') }}</t-radio>
              </t-radio-group>
            </t-form-item>

            <t-form-item v-if="formData.is_enable_load_balance == '1'" :label="t('page.host.loadbalance.label_loadbalance_type')" name="load_balance_stage">
              <t-radio-group v-model="formData.load_balance_stage">
                <t-radio value="1">{{ t('page.host.loadbalance.label_loadbalance_type_weight_round_robin') }}</t-radio>
                <t-radio value="2">{{ t('page.host.loadbalance.label_loadbalance_type_ip_hash') }}</t-radio>
              </t-radio-group>
            </t-form-item>

            <t-form-item v-if="formData.is_enable_load_balance == '1'" name="loadbalance">
              <load-balance :prop-host-code="formData.code" />
            </t-form-item>

            <t-form-item :label="t('page.host.remote_host')" name="remote_host">
              <t-tooltip :content="t('page.host.remote_host_content')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-input v-model="formData.remote_host" :style="{ width: '480px' }" :placeholder="t('common.placeholder') + t('page.host.remote_host')" />
              </t-tooltip>
            </t-form-item>

            <t-form-item :label="t('page.host.is_trans_back_domain')" name="is_trans_back_domain">
              <t-tooltip :content="t('page.host.is_trans_back_domain_content')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-radio-group v-model="formData.is_trans_back_domain">
                  <t-radio value="0">{{ t('common.off') }}</t-radio>
                  <t-radio value="1">{{ t('common.on') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>

            <t-form-item v-if="formData.is_enable_load_balance != '1'" :label="t('page.host.remote_ip')" name="remote_ip">
              <t-tooltip :content="t('page.host.remote_ip_content')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-input v-model="formData.remote_ip" :style="{ width: '480px' }" :placeholder="t('common.placeholder') + t('page.host.remote_ip')" />
              </t-tooltip>
            </t-form-item>

            <t-form-item v-if="formData.is_enable_load_balance != '1'" :label="t('page.host.remote_port')" name="remote_port">
              <t-tooltip :content="t('page.host.remote_port_content')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-input-number v-model="formData.remote_port" :style="{ width: '150px' }" :placeholder="t('page.host.port_placeholder')" />
              </t-tooltip>
            </t-form-item>

            <t-form-item :label="t('page.host.nickname')" name="nickname">
              <t-input v-model="formData.nickname" :style="{ width: '480px' }" :placeholder="t('page.host.nickname_placeholder')" />
            </t-form-item>

            <t-form-item :label="t('common.remarks')" name="remarks">
              <t-textarea v-model="formData.remarks" :style="{ width: '480px' }" :placeholder="t('common.placeholder_content')" name="remarks" />
            </t-form-item>
          </t-tab-panel>

          <t-tab-panel :value="2">
            <template #label>{{ t('page.host.tab_more_domain') }}</template>
            <t-form-item :label="t('page.host.more_domain')" name="bind_more_host">
              <t-tooltip :content="t('page.host.more_domain_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-textarea v-model="formData.bind_more_host" :style="{ width: '480px' }" :placeholder="t('common.placeholder')" name="bind_more_host" />
              </t-tooltip>
            </t-form-item>
          </t-tab-panel>

          <t-tab-panel :value="3">
            <template #label>
              <file-safety-icon style="margin-right: 4px; color: red" />
              {{ t('page.host.tab_engine') }}
            </template>

            <t-table :data="defenseRows" :columns="defenseColumns" row-key="key" size="small" :max-height="440" bordered hover>
              <template #detection="{ row }">
                <t-tooltip :content="row.tips" placement="top" :overlay-style="{ width: '300px' }" show-arrow>
                  <span>{{ row.label }}</span>
                </t-tooltip>
              </template>
              <template #status="{ row }">
                <t-radio-group :value="getDefenseValue(row)" style="white-space: nowrap; flex-wrap: nowrap" @change="(val: any) => setDefenseValue(row, val)">
                  <t-radio value="0">{{ t('common.off') }}</t-radio>
                  <t-radio value="1">{{ t('common.on') }}</t-radio>
                </t-radio-group>
              </template>
              <template #op="{ row }">
                <t-link v-if="row.action && row.action.type === 'route'" theme="primary" size="small" @click="router.push(row.action.path)">
                  {{ row.action.text }} <jump-icon />
                </t-link>
                <t-link v-else-if="row.action && row.action.type === 'tab'" theme="primary" size="small" @click="activeTab = row.action.tab">
                  {{ t('page.host.config_detail') }} <jump-icon />
                </t-link>
              </template>
            </t-table>
          </t-tab-panel>

          <t-tab-panel :value="4">
            <template #label>{{ t('page.host.tab_other') }}</template>
            <!-- IP提取模式：不要用 t-tooltip 包裹整组单选，否则会拦截点击导致无法切换 -->
            <t-form-item name="ip_mode">
              <template #label>
                <span>{{ t('page.host.ip_mode') }}</span>
                <t-tooltip :content="t('page.host.ip_mode_tips')" placement="top" :overlay-style="{ width: '300px' }" show-arrow>
                  <help-circle-icon class="host-form-ip-mode-help-icon" />
                </t-tooltip>
              </template>
              <t-radio-group v-model="formData.ip_mode">
                <t-radio value="nic">
                  <div>
                    <div>{{ t('page.host.ip_mode_nic') }}</div>
                    <div class="limit-mode-desc">{{ t('page.host.ip_mode_nic_desc') }}</div>
                  </div>
                </t-radio>
                <t-radio value="proxy">
                  <div>
                    <div>{{ t('page.host.ip_mode_proxy') }}</div>
                    <div class="limit-mode-desc">{{ t('page.host.ip_mode_proxy_desc') }}</div>
                  </div>
                </t-radio>
              </t-radio-group>
            </t-form-item>
            <t-form-item :label="t('page.host.exclude_url_log')" name="exclude_url_log">
              <t-tooltip :content="t('page.host.exclude_url_log_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-textarea
                  v-model="formData.exclude_url_log"
                  :style="{ width: '480px' }"
                  :placeholder="t('page.host.exclude_url_log_tips')"
                  name="exclude_url_log"
                />
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.insecure_skip_verify')" name="insecure_skip_verify">
              <t-tooltip :content="t('page.host.insecure_skip_verify_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-radio-group v-model="formData.insecure_skip_verify">
                  <t-radio value="0">{{ t('common.off') }}</t-radio>
                  <t-radio value="1">{{ t('common.on') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.response_time_out')" name="response_time_out">
              <t-tooltip :content="t('page.host.response_time_out_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-input-number v-model="formData.response_time_out" :style="{ width: '150px' }" />
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.default_encoding')" name="default_encoding">
              <t-select v-model="formData.default_encoding" :style="{ width: '150px' }">
                <t-option value="auto" :label="t('page.host.default_encoding_auto')" />
                <t-option value="utf-8" label="utf-8" />
                <t-option value="gbk" label="gbk" />
              </t-select>
            </t-form-item>
          </t-tab-panel>

          <t-tab-panel :value="5">
            <template #label>{{ t('page.host.tab_password') }}</template>
            <t-form-item :label="t('page.host.is_enable_http_auth_base')" name="is_enable_http_auth_base">
              <t-tooltip :content="t('page.host.is_enable_http_auth_base_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-radio-group v-model="formData.is_enable_http_auth_base">
                  <t-radio value="0">{{ t('common.off') }}</t-radio>
                  <t-radio value="1">{{ t('common.on') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'" :label="t('page.host.http_auth_base_type')" name="http_auth_base_type">
              <t-tooltip :content="t('page.host.http_auth_base_type_tips')" placement="top" :overlay-style="{ width: '400px' }" show-arrow>
                <t-radio-group v-model="formData.http_auth_base_type">
                  <t-radio value="authorization">{{ t('page.host.http_auth_base_type_authorization') }}</t-radio>
                  <t-radio value="custom">{{ t('page.host.http_auth_base_type_custom') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'" :label="t('page.host.http_auth_path_prefix')" name="http_auth_path_prefix">
              <t-tooltip :content="t('page.host.http_auth_path_prefix_tips')" placement="top" :overlay-style="{ width: '500px' }" show-arrow>
                <t-input v-model="formData.http_auth_path_prefix" :placeholder="t('page.host.http_auth_path_prefix_placeholder')" :style="{ width: '300px' }">
                  <template #suffix>
                    <t-button size="small" theme="primary" @click="generateHttpAuthPath">
                      {{ t('page.host.generate_random_path') }}
                    </t-button>
                  </template>
                </t-input>
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'">
              <http-auth-base :prop-host-code="formData.code" />
            </t-form-item>
          </t-tab-panel>

          <t-tab-panel :value="6">
            <template #label>
              <heart-icon style="margin-right: 4px; color: #00a870" />
              {{ t('page.host.tab_health_check') }}
            </template>
            <healthy-config :healthy-config="healthyConfigData" @update="(val: any) => (healthyConfigData = val)" />
          </t-tab-panel>

          <t-tab-panel :value="7">
            <template #label>
              <lock-on-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_captcha') }}
            </template>
            <t-alert v-if="captchaConfigData.is_enable_captcha == '1'" theme="warning">
              <template #message>{{ t('page.host.captcha.alert') }}</template>
            </t-alert>
            <captcha-config :captcha-config="captchaConfigData" @update="(val: any) => (captchaConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="8">
            <template #label>
              <link-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_anti_leech') }}
            </template>
            <anti-leech-config :anti-leech-config="antiLeechConfigData" @update="(val: any) => (antiLeechConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="9">
            <template #label>
              <data-base-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_cache') }}
            </template>
            <cache-config :cache-config="cacheConfigData" :prop-host-code="formData.code || ''" @update="(val: any) => (cacheConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="10">
            <template #label>
              <folder-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_static_site') }}
            </template>
            <static-site-config :static-site-config="staticSiteConfigData" @update="(val: any) => (staticSiteConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="11">
            <template #label>
              <internet-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_transport') }}
            </template>
            <transport-config :transport-config="transportConfigData" @update="(val: any) => (transportConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="12">
            <template #label>
              <filter-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_custom_headers') }}
            </template>
            <custom-headers-config :custom-headers-config="customHeadersConfigData" @update="(val: any) => (customHeadersConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="13">
            <template #label>
              <filter-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_custom_response_headers') }}
            </template>
            <custom-response-headers-config
              :custom-response-headers-config="customResponseHeadersConfigData"
              @update="(val: any) => (customResponseHeadersConfigData = val)"
            />
          </t-tab-panel>
          <t-tab-panel :value="14">
            <template #label>
              <file-paste-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_response_compress') }}
            </template>
            <response-compress-config :response-compress-config="responseCompressConfigData" @update="(val: any) => (responseCompressConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="16">
            <template #label>
              <lock-on-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_cookie_security') }}
            </template>
            <cookie-security-config :cookie-security-config="cookieSecurityConfigData" @update="(val: any) => (cookieSecurityConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="17">
            <template #label>
              <secured-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_csrf') }}
            </template>
            <csrf-config :csrf-config="csrfConfigData" @update="(val: any) => (csrfConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="18">
            <template #label>
              <verify-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_tamper') }}
            </template>
            <tamper-config :tamper-config="tamperConfigData" :prop-host-code="formData.code" :prop-host="formData.host" :prop-bind-more-host="formData.bind_more_host" @update="(val: any) => (tamperConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="19">
            <template #label>
              <file-paste-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_upload_security') }}
            </template>
            <upload-security-config :upload-security-config="uploadSecurityConfigData" @update="(val: any) => (uploadSecurityConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="15">
            <template #label>
              <swap-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_path_rule') }}
            </template>
            <path-rule-config :prop-host-code="formData.code || ''" />
          </t-tab-panel>
        </t-tabs>

        <t-form-item style="float: right; margin-top: 5px">
          <t-button variant="outline" @click="emit('close')">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </div>

    <t-dialog v-model:visible="addSSLFormVisible" :header="t('common.new')" :width="750" :footer="false">
      <ssl-form :value="sslformData" @close="addSSLFormVisible = !addSSLFormVisible" @submit="onSSLSubmit" />
    </t-dialog>
    <t-dialog v-model:visible="editSSLFormVisible" :header="t('common.edit')" :width="750" :footer="false">
      <ssl-form :value="sslformEditData" :is-edit="true" @close="editSSLFormVisible = !editSSLFormVisible" @submit="onSSLSubmitEdit" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps } from 'tdesign-vue-next';
import {
  FileSafetyIcon,
  HeartIcon,
  LockOnIcon,
  LinkIcon,
  DataBaseIcon,
  FolderIcon,
  InternetIcon,
  FilterIcon,
  FilePasteIcon,
  SwapIcon,
  SecuredIcon,
  VerifyIcon,
  HelpCircleIcon,
  JumpIcon,
} from 'tdesign-icons-vue-next';
import LoadBalance from '@/pages/waf/loadbalance/index.vue';
import HttpAuthBase from '@/pages/waf/http_auth_base/index.vue';
import HealthyConfig from './HealthyConfig.vue';
import CaptchaConfig from './CaptchaConfig.vue';
import StaticSiteConfig from './StaticSiteConfig.vue';
import TransportConfig from './TransportConfig.vue';
import AntiLeechConfig from './AntiLeechConfig.vue';
import CacheConfig from './CacheConfig.vue';
import CustomHeadersConfig from './CustomHeadersConfig.vue';
import CustomResponseHeadersConfig from './CustomResponseHeadersConfig.vue';
import ResponseCompressConfig from './ResponseCompressConfig.vue';
import CookieSecurityConfig from './CookieSecurityConfig.vue';
import CsrfConfig from './CsrfConfig.vue';
import TamperConfig from './TamperConfig.vue';
import UploadSecurityConfig from './UploadSecurityConfig.vue';
import PathRuleConfig from './PathRuleConfig.vue';
import SslForm from './SslForm.vue';
import {
  INITIAL_HEALTHY,
  INITIAL_CAPTCHA,
  INITIAL_ANTILEECH,
  INITIAL_SSL_DATA,
  INITIAL_CACHE,
  INITIAL_STATIC_SITE,
  INITIAL_TRANSPORT,
  INITIAL_CUSTOM_HEADERS,
  INITIAL_CUSTOM_RESPONSE_HEADERS,
  INITIAL_RESPONSE_COMPRESS,
  INITIAL_COOKIE_SECURITY,
  INITIAL_CSRF,
  INITIAL_TAMPER,
  INITIAL_UPLOAD_SECURITY,
  DEFAULT_STATIC_SECURITY_HEADERS,
} from '../constants';
import { sslConfigListApi, sslConfigAddApi, sslConfigEditApi } from '@/apis/sslconfig';
import { getOrDefault } from '@/utils/usuallytool';
import { get_detail_by_item_api, edit_system_config_by_item_api } from '@/apis/systemconfig';

const props = withDefaults(
  defineProps<{
    value: Record<string, any>;
    isEdit?: boolean;
    selectCanFilter?: boolean;
    hostAddUrl?: string;
  }>(),
  { isEdit: false, selectCanFilter: true, hostAddUrl: '' },
);
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { result: Record<string, any> }): void;
}>();

const { t } = useI18n();
const router = useRouter();

const formData = ref<Record<string, any>>({
  ...JSON.parse(JSON.stringify(props.value)),
  ssl_config_mode: 'existing',
});

// 主机防御细节
const hostDefenseData = ref<Record<string, string>>({
  bot: '1',
  sqli: '1',
  xss: '1',
  scan: '1',
  rce: '1',
  sensitive: '1',
  traversal: '1',
  owaspset: '0',
  ai: '0',
});

const healthyConfigData = ref<Record<string, any>>({ ...INITIAL_HEALTHY });
const captchaConfigData = ref<Record<string, any>>({ ...INITIAL_CAPTCHA });
const antiLeechConfigData = ref<Record<string, any>>({ ...INITIAL_ANTILEECH });
const cacheConfigData = ref<Record<string, any>>({ ...INITIAL_CACHE });
const staticSiteConfigData = ref<Record<string, any>>({ ...INITIAL_STATIC_SITE });
const transportConfigData = ref<Record<string, any>>({ ...INITIAL_TRANSPORT });
const customHeadersConfigData = ref<Record<string, any>>({ ...INITIAL_CUSTOM_HEADERS });
const customResponseHeadersConfigData = ref<Record<string, any>>({ ...INITIAL_CUSTOM_RESPONSE_HEADERS });
const responseCompressConfigData = ref<Record<string, any>>({ ...INITIAL_RESPONSE_COMPRESS });
const cookieSecurityConfigData = ref<Record<string, any>>({ ...INITIAL_COOKIE_SECURITY });
const csrfConfigData = ref<Record<string, any>>({ ...INITIAL_CSRF, protect_methods: [...INITIAL_CSRF.protect_methods] });
const tamperConfigData = ref<Record<string, any>>({ ...INITIAL_TAMPER });
const uploadSecurityConfigData = ref<Record<string, any>>({ ...INITIAL_UPLOAD_SECURITY });
const activeTab = ref<number>(1); // 当前激活的配置 Tab（受控，供防御总览开关「配置详情」跳转）

// 引擎自带防护表格列
const defenseColumns = computed(() => [
  { colKey: 'detection', title: t('page.host.defense_col_item'), width: 220 },
  { colKey: 'status', title: t('page.host.defense_col_status'), width: 220 },
  { colKey: 'op', title: t('page.host.defense_col_op'), width: 120, align: 'left' as const },
]);

// 引擎自带防护行（src 决定开关绑定到 defense_json 各项 或 各子配置的 is_enable）
const defenseRows = computed(() => [
  { key: 'bot', src: 'defense', label: t('page.host.bot_detection'), tips: t('page.host.bot_detection_tips') },
  { key: 'sqli', src: 'defense', label: t('page.host.sql_injection_detection'), tips: t('page.host.sql_injection_detection_tips') },
  { key: 'xss', src: 'defense', label: t('page.host.xss_detection'), tips: t('page.host.xss_detection_tips') },
  { key: 'scan', src: 'defense', label: t('page.host.scan_detection'), tips: t('page.host.scan_detection_tips') },
  { key: 'rce', src: 'defense', label: t('page.host.rce_detection'), tips: t('page.host.rce_detection_tips') },
  { key: 'sensitive', src: 'defense', label: t('page.host.sensitive_detection'), tips: t('page.host.sensitive_detection_tips') },
  { key: 'traversal', src: 'defense', label: t('page.host.dir_traversal_detection'), tips: t('page.host.dir_traversal_detection_tips') },
  { key: 'owaspset', src: 'defense', label: t('page.host.owaspset_detection'), tips: t('page.host.owaspset_detection_tips'), action: { type: 'route', path: '/sys/OwaspManage', text: t('page.host.owasp_manage_link') } },
  { key: 'ai', src: 'defense', label: t('page.host.ai_detection'), tips: t('page.host.ai_detection_tips'), action: { type: 'route', path: '/sys/AIModelManage', text: t('page.host.ai_manage_link') } },
  { key: 'cookie', src: 'cookie', label: t('page.host.tab_cookie_security'), tips: t('page.host.cookie_security.intro'), action: { type: 'tab', tab: 16 } },
  { key: 'csrf', src: 'csrf', label: t('page.host.tab_csrf'), tips: t('page.host.csrf.intro'), action: { type: 'tab', tab: 17 } },
  { key: 'tamper', src: 'tamper', label: t('page.host.tab_tamper'), tips: t('page.host.tamper.intro'), action: { type: 'tab', tab: 18 } },
  { key: 'upload', src: 'upload', label: t('page.host.tab_upload_security'), tips: t('page.host.upload_security.intro'), action: { type: 'tab', tab: 19 } },
]);

// 引擎自带防护表格：按 row.src 读开关值
const getDefenseValue = (row: any) => {
  switch (row.src) {
    case 'cookie':
      return cookieSecurityConfigData.value.is_enable;
    case 'csrf':
      return csrfConfigData.value.is_enable;
    case 'tamper':
      return tamperConfigData.value.is_enable;
    case 'upload':
      return uploadSecurityConfigData.value.is_enable;
    default:
      return hostDefenseData.value[row.key];
  }
};

// 引擎自带防护表格：按 row.src 写开关值
const setDefenseValue = (row: any, val: any) => {
  switch (row.src) {
    case 'cookie':
      cookieSecurityConfigData.value.is_enable = val;
      break;
    case 'csrf':
      csrfConfigData.value.is_enable = val;
      break;
    case 'tamper':
      tamperConfigData.value.is_enable = val;
      break;
    case 'upload':
      uploadSecurityConfigData.value.is_enable = val;
      // 一键开启时若四个检测维度全关，自动套用推荐策略（否则总开关开了也不检测）
      if (val === '1') {
        const u = uploadSecurityConfigData.value;
        const allOff = ['check_ext', 'check_content', 'check_magic', 'check_size'].every((k) => String(u[k]) !== '1');
        if (allOff) {
          u.check_ext = '1';
          u.check_content = '1';
          u.check_magic = '1';
          u.check_size = '1';
          u.over_limit_action = u.over_limit_action || 'block';
          u.max_size_kb = u.max_size_kb || 10240;
        }
      }
      break;
    default:
      hostDefenseData.value[row.key] = val;
      break;
  }
};

const rules: FormProps['rules'] = {
  host: [
    { required: true, message: t('common.placeholder') + t('page.host.host'), type: 'error' },
    {
      validator: (val: any) => {
        const hostRegex = /^(?!https?:\/\/)[^\s]+$/;
        return !!val && hostRegex.test(val);
      },
      message: t('page.host.host_validation'),
      type: 'error',
    },
  ],
  port: [{ required: true, message: t('common.placeholder') + t('page.host.port'), type: 'error' }],
  remote_host: [
    { required: true, message: t('common.placeholder') + t('page.host.remote_host'), type: 'error' },
    {
      validator: (val: any) => {
        const regex = /^(http:\/\/|https:\/\/)[^\s]+$/;
        return regex.test(val);
      },
      message: t('page.host.remote_host_validation'),
      type: 'error',
    },
  ],
  remote_ip: [{ required: true, message: t('common.placeholder') + t('page.host.remote_ip'), type: 'error' }],
  remote_port: [{ required: true, message: t('common.placeholder') + t('page.host.remote_port'), type: 'error' }],
};

// SSL 证书夹
const addSSLFormVisible = ref(false);
const editSSLFormVisible = ref(false);
const sslConfigList = ref<Record<string, any>[]>([]);
const sslformData = ref<Record<string, any>>({ ...INITIAL_SSL_DATA });
const sslformEditData = ref<Record<string, any>>({ ...INITIAL_SSL_DATA });

// HTTPS重定向服务器配置
const httpsRedirectConfig = ref({
  enable_https_redirect: '0', // 启用状态: 0-关闭 1-开启
  loading: false,
});

// 判断是否需要显示HTTPS重定向提示：开启SSL + 端口非443 + 重定向服务器未启用
const shouldShowHttpsRedirectTip = computed(
  () => formData.value.ssl === '1' && formData.value.port !== 443 && httpsRedirectConfig.value.enable_https_redirect === '0',
);

const httpsRedirectStatusText = computed(() =>
  httpsRedirectConfig.value.enable_https_redirect === '1'
    ? t('page.host.auto_jump_https.https_redirect_server_on')
    : t('page.host.auto_jump_https.https_redirect_server_off'),
);

watch(
  () => props.value,
  (newVal) => {
    const fd: Record<string, any> = {
      ...JSON.parse(JSON.stringify(newVal)),
      ssl_config_mode: newVal.ssl_config_mode || 'existing',
    };
    // 将数字类型转换为字符串类型，确保不为空时才转换
    fd.ssl = fd.ssl != null ? fd.ssl.toString() : '0';
    fd.start_status = fd.start_status != null ? fd.start_status.toString() : '0';
    fd.unrestricted_port = fd.unrestricted_port != null ? fd.unrestricted_port.toString() : '0';
    fd.is_enable_load_balance = fd.is_enable_load_balance != null ? fd.is_enable_load_balance.toString() : '0';
    fd.load_balance_stage = fd.load_balance_stage != null ? fd.load_balance_stage.toString() : '1';
    fd.auto_jump_https = fd.auto_jump_https != null ? fd.auto_jump_https.toString() : '0';
    fd.is_trans_back_domain = fd.is_trans_back_domain != null ? fd.is_trans_back_domain.toString() : '0';
    fd.is_enable_http_auth_base = fd.is_enable_http_auth_base != null ? fd.is_enable_http_auth_base.toString() : '0';
    fd.http_auth_base_type = fd.http_auth_base_type != null ? fd.http_auth_base_type : 'authorization';
    fd.response_time_out = fd.response_time_out != null ? Number(fd.response_time_out) : 60;
    fd.insecure_skip_verify = fd.insecure_skip_verify != null ? fd.insecure_skip_verify.toString() : '0';
    fd.log_only_mode = fd.log_only_mode != null ? fd.log_only_mode.toString() : '0';
    fd.ip_mode = fd.ip_mode === 'proxy' ? 'proxy' : 'nic';
    formData.value = fd;

    // 解析防御配置
    if (fd.defense_json) {
      try {
        const defenseData = JSON.parse(fd.defense_json);
        hostDefenseData.value.bot = getOrDefault(defenseData, 'bot', '1');
        hostDefenseData.value.sqli = getOrDefault(defenseData, 'sqli', '1');
        hostDefenseData.value.xss = getOrDefault(defenseData, 'xss', '1');
        hostDefenseData.value.scan = getOrDefault(defenseData, 'scan', '1');
        hostDefenseData.value.rce = getOrDefault(defenseData, 'rce', '1');
        hostDefenseData.value.sensitive = getOrDefault(defenseData, 'sensitive', '1');
        hostDefenseData.value.traversal = getOrDefault(defenseData, 'traversal', '1');
        hostDefenseData.value.owaspset = getOrDefault(defenseData, 'owaspset', '0');
        hostDefenseData.value.ai = getOrDefault(defenseData, 'ai', '0');
      } catch (e) {
        console.error('解析defense_json失败', e);
      }
    }

    // 解析健康检测配置
    if (fd.healthy_json && fd.healthy_json !== '') {
      try {
        const hc = JSON.parse(fd.healthy_json);
        hc.is_enable_healthy = getOrDefault(hc, 'is_enable_healthy', '1');
        hc.fail_count = getOrDefault(hc, 'fail_count', '3');
        hc.success_count = getOrDefault(hc, 'success_count', '3');
        hc.response_time = getOrDefault(hc, 'response_time', '5');
        hc.check_method = getOrDefault(hc, 'check_method', 'GET');
        hc.check_path = getOrDefault(hc, 'check_path', '/');
        hc.expected_codes = getOrDefault(hc, 'expected_codes', '200,');
        healthyConfigData.value = hc;
      } catch (e) {
        console.error('解析healthy_json失败', e);
        healthyConfigData.value = { ...INITIAL_HEALTHY };
      }
    } else {
      healthyConfigData.value = { ...INITIAL_HEALTHY };
    }

    // 解析验证码配置
    if (fd.captcha_json && fd.captcha_json !== '') {
      try {
        const cc = JSON.parse(fd.captcha_json);
        cc.is_enable_captcha = getOrDefault(cc, 'is_enable_captcha', '0');
        cc.path_prefix = getOrDefault(cc, 'path_prefix', '');
        cc.expire_time = getOrDefault(cc, 'expire_time', 24);
        cc.ip_mode = getOrDefault(cc, 'ip_mode', 'nic');
        cc.engine_type = getOrDefault(cc, 'engine_type', 'default');
        if (cc.cap_js_config == null) {
          cc.cap_js_config = {
            challengeCount: 50,
            challengeSize: 32,
            challengeDifficulty: 4,
            expiresMs: 600000,
            infoTitle: { zh: '验证码验证', en: 'Captcha Verification' },
            infoText: { zh: '请完成以下验证以继续访问', en: 'Please complete the following verification to continue' },
          };
        } else {
          cc.cap_js_config.challengeCount = getOrDefault(cc.cap_js_config, 'challengeCount', 50);
          cc.cap_js_config.challengeSize = getOrDefault(cc.cap_js_config, 'challengeSize', 32);
          cc.cap_js_config.challengeDifficulty = getOrDefault(cc.cap_js_config, 'challengeDifficulty', 4);
          cc.cap_js_config.expiresMs = getOrDefault(cc.cap_js_config, 'expiresMs', 600000);
          if (!cc.cap_js_config.infoTitle) {
            cc.cap_js_config.infoTitle = { zh: '验证码验证', en: 'Captcha Verification' };
          }
          if (!cc.cap_js_config.infoText) {
            cc.cap_js_config.infoText = { zh: '请完成以下验证以继续访问', en: 'Please complete the following verification to continue' };
          }
        }
        captchaConfigData.value = cc;
      } catch (e) {
        console.error('解析captcha_json失败', e);
        captchaConfigData.value = { ...INITIAL_CAPTCHA };
      }
    } else {
      captchaConfigData.value = { ...INITIAL_CAPTCHA };
    }

    // 解析transport配置
    if (fd.transport_json && fd.transport_json !== '') {
      try {
        const tc = JSON.parse(fd.transport_json);
        tc.max_idle_conns = getOrDefault(tc, 'max_idle_conns', INITIAL_TRANSPORT.max_idle_conns);
        tc.max_idle_conns_per_host = getOrDefault(tc, 'max_idle_conns_per_host', INITIAL_TRANSPORT.max_idle_conns_per_host);
        tc.max_conns_per_host = getOrDefault(tc, 'max_conns_per_host', INITIAL_TRANSPORT.max_conns_per_host);
        tc.idle_conn_timeout = getOrDefault(tc, 'idle_conn_timeout', INITIAL_TRANSPORT.idle_conn_timeout);
        tc.tls_handshake_timeout = getOrDefault(tc, 'tls_handshake_timeout', INITIAL_TRANSPORT.tls_handshake_timeout);
        tc.expect_continue_timeout = getOrDefault(tc, 'expect_continue_timeout', INITIAL_TRANSPORT.expect_continue_timeout);
        transportConfigData.value = tc;
      } catch (e) {
        console.error('解析transport_json失败', e);
        transportConfigData.value = { ...INITIAL_TRANSPORT };
      }
    } else {
      transportConfigData.value = { ...INITIAL_TRANSPORT };
    }

    // 解析自定义头信息配置
    if (fd.custom_headers_json && fd.custom_headers_json !== '') {
      try {
        const parsedConfig = JSON.parse(fd.custom_headers_json);
        customHeadersConfigData.value = {
          is_enable_custom_headers: String(parsedConfig.is_enable_custom_headers !== undefined ? parsedConfig.is_enable_custom_headers : 0),
          headers: Array.isArray(parsedConfig.headers) ? parsedConfig.headers : [],
        };
      } catch (e) {
        console.error('解析custom_headers_json失败', e);
        customHeadersConfigData.value = { ...INITIAL_CUSTOM_HEADERS };
      }
    } else {
      customHeadersConfigData.value = { ...INITIAL_CUSTOM_HEADERS };
    }

    // 解析自定义响应头信息配置（兼容旧版扁平 headers 和新版 rules 格式）
    if (fd.custom_response_headers_json && fd.custom_response_headers_json !== '') {
      try {
        const parsedConfig = JSON.parse(fd.custom_response_headers_json);
        const isEnable = String(parsedConfig.is_enable_custom_headers !== undefined ? parsedConfig.is_enable_custom_headers : 0);
        const hasRules = Array.isArray(parsedConfig.rules) && parsedConfig.rules.length > 0;
        const hasHeaders = Array.isArray(parsedConfig.headers) && parsedConfig.headers.length > 0;
        if (hasRules) {
          customResponseHeadersConfigData.value = { is_enable_custom_headers: isEnable, rules: parsedConfig.rules };
        } else if (hasHeaders) {
          customResponseHeadersConfigData.value = {
            is_enable_custom_headers: isEnable,
            rules: [{ rule_name: '全局默认', match_type: 'global', match_value: '', merge_mode: 'merge', headers: parsedConfig.headers }],
          };
        } else {
          customResponseHeadersConfigData.value = { is_enable_custom_headers: isEnable, rules: [] };
        }
      } catch (e) {
        console.error('解析custom_response_headers_json失败', e);
        customResponseHeadersConfigData.value = { ...INITIAL_CUSTOM_RESPONSE_HEADERS };
      }
    } else {
      customResponseHeadersConfigData.value = { ...INITIAL_CUSTOM_RESPONSE_HEADERS };
    }

    // 解析防盗链配置
    if (fd.anti_leech_json && fd.anti_leech_json !== '') {
      try {
        const al = JSON.parse(fd.anti_leech_json);
        al.is_enable_anti_leech = (al.is_enable_anti_leech || 0).toString();
        antiLeechConfigData.value = al;
      } catch {
        antiLeechConfigData.value = { ...INITIAL_ANTILEECH };
      }
    } else {
      antiLeechConfigData.value = { ...INITIAL_ANTILEECH };
    }

    // 解析缓存配置
    if (fd.cache_json && fd.cache_json !== '') {
      try {
        const cd = JSON.parse(fd.cache_json);
        cd.is_enable_cache = (cd.is_enable_cache || 0).toString();
        cd.max_file_size_mb = (cd.max_file_size_mb || 0).toString();
        cd.max_memory_size_mb = (cd.max_memory_size_mb || 0).toString();
        cacheConfigData.value = cd;
      } catch {
        cacheConfigData.value = { ...INITIAL_CACHE };
      }
    } else {
      cacheConfigData.value = { ...INITIAL_CACHE };
    }

    // 解析响应压缩配置
    if (fd.response_compress_json && fd.response_compress_json !== '') {
      try {
        const rc = JSON.parse(fd.response_compress_json);
        responseCompressConfigData.value = {
          is_enable: String(rc.is_enable !== undefined ? rc.is_enable : 0),
          prefer: rc.prefer || INITIAL_RESPONSE_COMPRESS.prefer,
          min_length: String(rc.min_length !== undefined && rc.min_length !== '' ? rc.min_length : INITIAL_RESPONSE_COMPRESS.min_length),
          include_types: rc.include_types != null ? rc.include_types : '',
          include_extensions: rc.include_extensions != null ? rc.include_extensions : '',
          exclude_extensions: rc.exclude_extensions != null ? rc.exclude_extensions : '',
          exclude_paths: rc.exclude_paths != null ? rc.exclude_paths : '',
          compress_when_static_assist: String(rc.compress_when_static_assist !== undefined ? rc.compress_when_static_assist : 0),
        };
      } catch (e) {
        console.error('解析response_compress_json失败', e);
        responseCompressConfigData.value = { ...INITIAL_RESPONSE_COMPRESS };
      }
    } else {
      responseCompressConfigData.value = { ...INITIAL_RESPONSE_COMPRESS };
    }

    // 解析 Cookie 安全保护配置
    if (fd.cookie_security_json && fd.cookie_security_json !== '') {
      try {
        const cs = JSON.parse(fd.cookie_security_json);
        cookieSecurityConfigData.value = {
          is_enable: String(cs.is_enable !== undefined ? cs.is_enable : 0),
          http_only: String(cs.http_only !== undefined ? cs.http_only : 1),
          secure: String(cs.secure !== undefined ? cs.secure : 2),
          same_site: cs.same_site != null ? cs.same_site : 'Lax',
          exclude_cookies: cs.exclude_cookies != null ? cs.exclude_cookies : '',
        };
      } catch (e) {
        console.error('解析cookie_security_json失败', e);
        cookieSecurityConfigData.value = { ...INITIAL_COOKIE_SECURITY };
      }
    } else {
      cookieSecurityConfigData.value = { ...INITIAL_COOKIE_SECURITY };
    }

    // 解析 CSRF 防护配置
    if (fd.csrf_json && fd.csrf_json !== '') {
      try {
        const cf = JSON.parse(fd.csrf_json);
        csrfConfigData.value = {
          is_enable: String(cf.is_enable !== undefined ? cf.is_enable : 0),
          protect_methods:
            cf.protect_methods != null && cf.protect_methods !== ''
              ? String(cf.protect_methods)
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter((s: string) => s)
              : ['POST', 'PUT', 'DELETE', 'PATCH'],
          allowed_origins: cf.allowed_origins != null ? cf.allowed_origins : '',
          allow_empty_ref: String(cf.allow_empty_ref !== undefined ? cf.allow_empty_ref : 1),
          exclude_paths: cf.exclude_paths != null ? cf.exclude_paths : '',
        };
      } catch (e) {
        console.error('解析csrf_json失败', e);
        csrfConfigData.value = { ...INITIAL_CSRF, protect_methods: [...INITIAL_CSRF.protect_methods] };
      }
    } else {
      csrfConfigData.value = { ...INITIAL_CSRF, protect_methods: [...INITIAL_CSRF.protect_methods] };
    }

    // 解析网页防篡改配置
    if (fd.tamper_json && fd.tamper_json !== '') {
      try {
        const tp = JSON.parse(fd.tamper_json);
        tamperConfigData.value = {
          is_enable: String(tp.is_enable !== undefined ? tp.is_enable : 0),
          action: tp.action || 'replace',
          max_size_kb: tp.max_size_kb !== undefined ? tp.max_size_kb : 1024,
        };
      } catch (e) {
        console.error('解析tamper_json失败', e);
        tamperConfigData.value = { ...INITIAL_TAMPER };
      }
    } else {
      tamperConfigData.value = { ...INITIAL_TAMPER };
    }

    // 解析文件上传内容检测配置
    if (fd.upload_security_json && fd.upload_security_json !== '') {
      try {
        const up = JSON.parse(fd.upload_security_json);
        uploadSecurityConfigData.value = {
          is_enable: String(up.is_enable !== undefined ? up.is_enable : 0),
          check_ext: String(up.check_ext !== undefined ? up.check_ext : 0),
          ext_blacklist: up.ext_blacklist || '',
          check_content: String(up.check_content !== undefined ? up.check_content : 0),
          check_magic: String(up.check_magic !== undefined ? up.check_magic : 0),
          check_size: String(up.check_size !== undefined ? up.check_size : 0),
          max_size_kb: up.max_size_kb !== undefined ? up.max_size_kb : 10240,
          over_limit_action: up.over_limit_action || 'block',
          include_paths: up.include_paths || '',
          exclude_paths: up.exclude_paths || '',
        };
      } catch (e) {
        console.error('解析upload_security_json失败', e);
        uploadSecurityConfigData.value = { ...INITIAL_UPLOAD_SECURITY };
      }
    } else {
      uploadSecurityConfigData.value = { ...INITIAL_UPLOAD_SECURITY };
    }

    // 解析静态网站配置
    if (fd.static_site_json && fd.static_site_json !== '') {
      try {
        const ss = JSON.parse(fd.static_site_json);
        ss.is_enable_static_site = (ss.is_enable_static_site || 0).toString();
        ss.sensitive_paths = ss.sensitive_paths || '';
        ss.sensitive_extensions = ss.sensitive_extensions || '';
        ss.allowed_extensions = ss.allowed_extensions || '';
        ss.sensitive_patterns = ss.sensitive_patterns || '';
        ss.security_headers =
          ss.security_headers && ss.security_headers.length > 0 ? ss.security_headers : JSON.parse(JSON.stringify(DEFAULT_STATIC_SECURITY_HEADERS));
        staticSiteConfigData.value = ss;
      } catch {
        staticSiteConfigData.value = { ...INITIAL_STATIC_SITE };
      }
    } else {
      staticSiteConfigData.value = { ...INITIAL_STATIC_SITE };
    }
  },
  { immediate: true, deep: true },
);

// 主机名变化时自动同步 remote_host（仅新增模式）
watch(
  () => formData.value.host,
  (val) => {
    const hostRegex = /^(?!https?:\/\/)[^\s]+$/;
    const isValid = !!val && hostRegex.test(val);
    if (isValid && !props.isEdit) {
      const currentProtocol = formData.value.remote_host && formData.value.remote_host.startsWith('https://') ? 'https://' : 'http://';
      if (val.includes(':') && !val.startsWith('[')) {
        formData.value.remote_host = `${currentProtocol}[${val}]`;
      } else {
        formData.value.remote_host = `${currentProtocol}${val}`;
      }
    }
  },
);

// 监听SSL状态变化，自动设置端口和重置SSL配置模式
watch(
  () => formData.value.ssl,
  (newVal, oldVal) => {
    if (!props.isEdit && oldVal !== undefined && newVal !== oldVal) {
      if (newVal === '1') {
        formData.value.ssl_config_mode = 'existing';
        if (!formData.value.port || formData.value.port === 80) {
          formData.value.port = 443;
        }
        if (!formData.value.bind_more_port || formData.value.bind_more_port === '') {
          formData.value.bind_more_port = '80';
        }
      } else if (newVal === '0') {
        formData.value.ssl_config_mode = 'existing';
        if (formData.value.port === 443) {
          formData.value.port = 80;
        }
        if (formData.value.bind_more_port === '80') {
          formData.value.bind_more_port = '';
        }
      }
    }
  },
);

// 监听HTTP认证开关状态，自动生成路径
watch(
  () => formData.value.is_enable_http_auth_base,
  (newVal, oldVal) => {
    if (newVal === '1' && oldVal === '0' && !formData.value.http_auth_path_prefix) {
      generateHttpAuthPath();
    }
  },
);

// 获取HTTPS重定向服务器配置
async function getHttpsRedirectConfig() {
  try {
    const res = await get_detail_by_item_api({ item: 'enable_https_redirect' });
    if (res.code === 0 && res.data) {
      httpsRedirectConfig.value.enable_https_redirect = res.data.value || '0';
    }
  } catch (e) {
    console.log('获取HTTPS重定向配置失败:', e);
  }
}

// 启用HTTPS重定向服务器
async function enableHttpsRedirect() {
  httpsRedirectConfig.value.loading = true;
  try {
    const res = await edit_system_config_by_item_api({ item: 'enable_https_redirect', value: '1' });
    if (res.code === 0) {
      httpsRedirectConfig.value.enable_https_redirect = '1';
      MessagePlugin.success(t('page.host.auto_jump_https.enable_success'));
    } else {
      MessagePlugin.error(res.msg || t('page.host.auto_jump_https.enable_failed'));
    }
  } catch (e) {
    console.log('启用HTTPS重定向服务器失败:', e);
    MessagePlugin.error(t('page.host.auto_jump_https.enable_failed'));
  } finally {
    httpsRedirectConfig.value.loading = false;
  }
}

function getSslFolderList() {
  sslConfigListApi({ pageSize: 10000, remarks: '', code: '' })
    .then((res) => {
      if (res.code === 0) {
        sslConfigList.value = res.data.list;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 处理SSL选择变更：本地直接填充证书内容
function handleSslChange(value: any) {
  const selectedSsl = sslConfigList.value.find((item) => item.id === value);
  if (selectedSsl) {
    formData.value.certfile = selectedSsl.cert_content;
    formData.value.keyfile = selectedSsl.key_content;
  }
}

function handleAddNewSsl() {
  addSSLFormVisible.value = true;
  sslformData.value = { ...INITIAL_SSL_DATA };
}

function handleEditSsl() {
  if (formData.value.bind_ssl_id === '') {
    MessagePlugin.warning(t('page.host.bind_empty_ssl_tips'));
    return;
  }
  const sslConfigItem = sslConfigList.value.find((item) => item.id === formData.value.bind_ssl_id);
  if (!sslConfigItem) {
    MessagePlugin.warning(t('page.host.ssl_not_found_tips'));
    return;
  }
  sslformEditData.value = { ...sslConfigItem };
  editSSLFormVisible.value = true;
}

function onSSLSubmit(data: { result: Record<string, any> }) {
  sslConfigAddApi({ ...data.result }).then((res) => {
    if (res.code === 0) {
      getSslFolderList();
      MessagePlugin.success(t('common.save') + ' OK');
      addSSLFormVisible.value = false;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function onSSLSubmitEdit(data: { result: Record<string, any> }) {
  sslConfigEditApi({ ...data.result }).then((res) => {
    if (res.code === 0) {
      getSslFolderList();
      MessagePlugin.success(t('common.save') + ' OK');
      editSSLFormVisible.value = false;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

// 生成随机HTTP认证路径前缀，格式: /_waf_{8位随机字符}
function generateHttpAuthPath() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomStr = '';
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  formData.value.http_auth_path_prefix = `/_waf_${randomStr}`;
  MessagePlugin.success(t('page.host.generate_path_success'));
}

// 表单提交
const onSubmit: FormProps['onSubmit'] = ({ validateResult, firstError }) => {
  if (validateResult === true) {
    const postdata: Record<string, any> = { ...formData.value };

    // 处理主机名
    postdata.host = postdata.host.toLowerCase();
    if (postdata.host.indexOf('http://') >= 0 || postdata.host.indexOf('https://') >= 0) {
      MessagePlugin.warning(t('page.host.host_rule_msg'));
      return;
    }
    // 只有当remote_host为空时才自动设置
    if (!postdata.remote_host || postdata.remote_host === '') {
      postdata.remote_host = `http://${postdata.host}`;
    }

    // 转换字符串为数字
    postdata.ssl = Number(postdata.ssl);
    postdata.start_status = Number(postdata.start_status);
    postdata.unrestricted_port = Number(postdata.unrestricted_port);
    postdata.is_enable_load_balance = Number(postdata.is_enable_load_balance);
    postdata.load_balance_stage = Number(postdata.load_balance_stage);
    postdata.auto_jump_https = Number(postdata.auto_jump_https);
    postdata.is_trans_back_domain = Number(postdata.is_trans_back_domain);
    postdata.is_enable_http_auth_base = Number(postdata.is_enable_http_auth_base);
    postdata.response_time_out = Number(postdata.response_time_out);
    postdata.insecure_skip_verify = Number(postdata.insecure_skip_verify);
    postdata.log_only_mode = Number(postdata.log_only_mode);

    if (!postdata.ip_mode) {
      postdata.ip_mode = 'nic';
    }

    if (postdata.ssl === 0) {
      postdata.bind_ssl_id = '';
      postdata.certfile = '';
      postdata.keyfile = '';
    }

    // 处理防御配置
    postdata.defense_json = JSON.stringify({
      bot: parseInt(hostDefenseData.value.bot),
      sqli: parseInt(hostDefenseData.value.sqli),
      xss: parseInt(hostDefenseData.value.xss),
      scan: parseInt(hostDefenseData.value.scan),
      rce: parseInt(hostDefenseData.value.rce),
      sensitive: parseInt(hostDefenseData.value.sensitive),
      traversal: parseInt(hostDefenseData.value.traversal),
      owaspset: parseInt(hostDefenseData.value.owaspset),
      ai: parseInt(hostDefenseData.value.ai),
    });

    // 处理健康检测配置
    postdata.healthy_json = JSON.stringify({
      is_enable_healthy: parseInt(healthyConfigData.value.is_enable_healthy),
      fail_count: parseInt(healthyConfigData.value.fail_count),
      success_count: parseInt(healthyConfigData.value.success_count),
      response_time: parseInt(healthyConfigData.value.response_time),
      check_method: healthyConfigData.value.check_method,
      check_path: healthyConfigData.value.check_path,
      expected_codes: healthyConfigData.value.expected_codes,
    });

    // 处理验证码配置
    postdata.captcha_json = JSON.stringify({
      is_enable_captcha: parseInt(captchaConfigData.value.is_enable_captcha),
      path_prefix: captchaConfigData.value.path_prefix || '',
      exclude_urls: captchaConfigData.value.exclude_urls,
      expire_time: captchaConfigData.value.expire_time,
      ip_mode: captchaConfigData.value.ip_mode,
      engine_type: captchaConfigData.value.engine_type,
      cap_js_config: captchaConfigData.value.cap_js_config,
    });

    // 处理防盗链配置
    postdata.anti_leech_json = JSON.stringify({
      is_enable_anti_leech: parseInt(antiLeechConfigData.value.is_enable_anti_leech),
      file_types: antiLeechConfigData.value.file_types,
      valid_referers: antiLeechConfigData.value.valid_referers,
      action: antiLeechConfigData.value.action,
      redirect_url: antiLeechConfigData.value.redirect_url,
    });

    // 处理缓存配置
    postdata.cache_json = JSON.stringify({
      is_enable_cache: parseInt(cacheConfigData.value.is_enable_cache),
      cache_location: cacheConfigData.value.cache_location,
      cache_dir: cacheConfigData.value.cache_dir,
      max_file_size_mb: parseFloat(cacheConfigData.value.max_file_size_mb),
      max_memory_size_mb: parseFloat(cacheConfigData.value.max_memory_size_mb),
    });

    // 处理响应压缩配置
    postdata.response_compress_json = JSON.stringify({
      is_enable: parseInt(responseCompressConfigData.value.is_enable, 10) || 0,
      prefer: responseCompressConfigData.value.prefer || 'br_first',
      min_length: parseInt(responseCompressConfigData.value.min_length, 10) || 256,
      include_types: responseCompressConfigData.value.include_types || '',
      include_extensions: responseCompressConfigData.value.include_extensions || '',
      exclude_extensions: responseCompressConfigData.value.exclude_extensions || '',
      exclude_paths: responseCompressConfigData.value.exclude_paths || '',
      compress_when_static_assist: parseInt(responseCompressConfigData.value.compress_when_static_assist, 10) || 0,
    });

    // 处理 Cookie 安全保护配置
    postdata.cookie_security_json = JSON.stringify({
      is_enable: parseInt(cookieSecurityConfigData.value.is_enable, 10) || 0,
      http_only: parseInt(cookieSecurityConfigData.value.http_only, 10) || 0,
      secure: parseInt(cookieSecurityConfigData.value.secure, 10) || 0,
      same_site: cookieSecurityConfigData.value.same_site || '',
      exclude_cookies: cookieSecurityConfigData.value.exclude_cookies || '',
    });

    // 处理 CSRF 防护配置
    postdata.csrf_json = JSON.stringify({
      is_enable: parseInt(csrfConfigData.value.is_enable, 10) || 0,
      protect_methods: Array.isArray(csrfConfigData.value.protect_methods)
        ? csrfConfigData.value.protect_methods.join(',')
        : csrfConfigData.value.protect_methods || 'POST,PUT,DELETE,PATCH',
      allowed_origins: csrfConfigData.value.allowed_origins || '',
      allow_empty_ref: parseInt(csrfConfigData.value.allow_empty_ref, 10) || 0,
      exclude_paths: csrfConfigData.value.exclude_paths || '',
    });

    // 处理网页防篡改配置
    postdata.tamper_json = JSON.stringify({
      is_enable: parseInt(tamperConfigData.value.is_enable, 10) || 0,
      action: tamperConfigData.value.action || 'replace',
      max_size_kb: parseInt(tamperConfigData.value.max_size_kb, 10) || 1024,
    });

    // 处理文件上传内容检测配置
    postdata.upload_security_json = JSON.stringify({
      is_enable: parseInt(uploadSecurityConfigData.value.is_enable, 10) || 0,
      check_ext: parseInt(uploadSecurityConfigData.value.check_ext, 10) || 0,
      ext_blacklist: uploadSecurityConfigData.value.ext_blacklist || '',
      check_content: parseInt(uploadSecurityConfigData.value.check_content, 10) || 0,
      check_magic: parseInt(uploadSecurityConfigData.value.check_magic, 10) || 0,
      check_size: parseInt(uploadSecurityConfigData.value.check_size, 10) || 0,
      max_size_kb: parseInt(uploadSecurityConfigData.value.max_size_kb, 10) || 10240,
      over_limit_action: uploadSecurityConfigData.value.over_limit_action || 'block',
      include_paths: uploadSecurityConfigData.value.include_paths || '',
      exclude_paths: uploadSecurityConfigData.value.exclude_paths || '',
    });

    // 处理静态网站配置
    postdata.static_site_json = JSON.stringify({
      is_enable_static_site: parseInt(staticSiteConfigData.value.is_enable_static_site),
      static_site_path: staticSiteConfigData.value.static_site_path,
      static_site_prefix: staticSiteConfigData.value.static_site_prefix,
      sensitive_paths: staticSiteConfigData.value.sensitive_paths,
      sensitive_extensions: staticSiteConfigData.value.sensitive_extensions,
      allowed_extensions: staticSiteConfigData.value.allowed_extensions,
      sensitive_patterns: staticSiteConfigData.value.sensitive_patterns,
      security_headers: staticSiteConfigData.value.security_headers,
    });

    // 处理transport配置
    postdata.transport_json = JSON.stringify({
      max_idle_conns: parseInt(transportConfigData.value.max_idle_conns || INITIAL_TRANSPORT.max_idle_conns),
      max_idle_conns_per_host: parseInt(transportConfigData.value.max_idle_conns_per_host || INITIAL_TRANSPORT.max_idle_conns_per_host),
      idle_conn_timeout: parseInt(transportConfigData.value.idle_conn_timeout || INITIAL_TRANSPORT.idle_conn_timeout),
      tls_handshake_timeout: parseInt(transportConfigData.value.tls_handshake_timeout || INITIAL_TRANSPORT.tls_handshake_timeout),
      expect_continue_timeout: parseInt(transportConfigData.value.expect_continue_timeout || INITIAL_TRANSPORT.expect_continue_timeout),
      max_conns_per_host: parseInt(transportConfigData.value.max_conns_per_host || INITIAL_TRANSPORT.max_conns_per_host),
    });

    // 自定义头信息配置
    postdata.custom_headers_json = JSON.stringify({
      is_enable_custom_headers: parseInt(customHeadersConfigData.value.is_enable_custom_headers || INITIAL_CUSTOM_HEADERS.is_enable_custom_headers),
      headers: customHeadersConfigData.value.headers || [],
    });

    // 自定义响应头信息配置（V2 rules 格式，兼容旧版 headers 字段）
    const crConfig = customResponseHeadersConfigData.value || {};
    let crRules = crConfig.rules || [];
    if (crRules.length === 0 && Array.isArray(crConfig.headers) && crConfig.headers.length > 0) {
      crRules = [{ rule_name: '全局默认', match_type: 'global', match_value: '', merge_mode: 'merge', headers: crConfig.headers }];
    }
    postdata.custom_response_headers_json = JSON.stringify({
      is_enable_custom_headers: parseInt(crConfig.is_enable_custom_headers || INITIAL_CUSTOM_RESPONSE_HEADERS.is_enable_custom_headers),
      rules: crRules,
    });

    emit('submit', { result: postdata });
  } else if (firstError) {
    MessagePlugin.warning(firstError);
  }
};

getSslFolderList();
getHttpsRedirectConfig();
</script>

<style scoped>
.host-form-ip-mode-help-icon {
  margin-left: 6px;
  vertical-align: middle;
  cursor: help;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.55));
}

.limit-mode-desc {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}
</style>
