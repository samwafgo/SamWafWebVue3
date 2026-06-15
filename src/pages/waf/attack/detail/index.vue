<template>
  <div class="detail-base">
    <t-tag
      v-if="detail_data.rule !== '' && detail_data.log_only_mode !== '0'"
      :theme="detail_data.log_only_mode === '1' ? 'danger' : 'success'"
      variant="light-outline"
    >
      {{ t('page.visit_log.log_only_mode') }} :
      {{ detail_data.log_only_mode === '1' ? t('page.visit_log.log_only_mode_on') : t('page.visit_log.log_only_mode_off') }}
    </t-tag>
    <t-row v-if="detail_data.rule !== ''" justify="start">
      <t-col :span="12">
        <t-alert theme="error" :message="detail_data.rule" />
        <t-space size="small" style="margin-top: 6px">
          <t-link @click="loadHttpCopyMask">{{ t('page.visit_log.detail.http_copy_mask') }}</t-link>
          <t-link v-if="isOwaspRule" theme="primary" @click="goToOwaspRule">{{
            t('page.visit_log.detail.owasp_view_rule')
          }}</t-link>
          <t-link v-if="isOwaspRule" theme="primary" @click="goToOwaspSandbox">{{
            t('page.visit_log.detail.owasp_sandbox_test')
          }}</t-link>
        </t-space>
      </t-col>
    </t-row>

    <t-card :title="t('page.visit_log.detail.ai.title')" class="container-base-margin-top">
      <t-space size="24px">
        <t-button theme="primary" @click="beforeSendAi">
          <template #icon><logo-android-icon /></template>
          {{ t('page.visit_log.detail.ai.log_ai_analysis') }}
        </t-button>
      </t-space>
    </t-card>

    <t-card :title="t('page.visit_log.detail.defense_status')" class="container-base-margin-top">
      <t-steps class="detail-base-info-steps" layout="horizontal" theme="dot" :current="3">
        <t-step-item :title="t('page.visit_log.detail.visit_time')" :content="detail_data.create_time" />
        <t-step-item :title="t('page.visit_log.detail.detection_time')" />
        <t-step-item :title="t('page.visit_log.detail.defense_status_step')" :content="detail_data.action" />
        <t-step-item :title="t('page.visit_log.detail.response_status')" :content="detail_data.status" />
      </t-steps>
    </t-card>
    <t-card :title="t('common.details')">
      <div class="info-block">
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.request_identifier') }}</h1>
          <span>{{ detail_data.req_uuid }}</span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.request_time') }}</h1>
          <span>{{ detail_data.create_time }}</span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.request_domain') }}</h1>
          <span>{{ detail_data.host }}</span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.request_method') }}</h1>
          <span>{{ detail_data.method }}</span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.request_content_size') }}</h1>
          <span>{{ detail_data.content_length }}</span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.visitor_ip') }}</h1>
          <span>
            {{ detail_data.src_ip }}
            <t-button theme="primary" variant="text" style="margin-left: 10px" @click="handleIPExtractIssue">
              {{ t('page.visit_log.detail.ip_extract_issue') }}
            </t-button>
            <t-button theme="primary" shape="round" size="small" @click="handleAddipblock(detail_data.src_ip)">{{
              t('page.visit_log.detail.add_to_deny_list')
            }}</t-button>
          </span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.visitor_port') }}</h1>
          <span>{{ detail_data.src_port }}</span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.request_region') }}</h1>
          <span>{{ detail_data.country }} {{ detail_data.province }} {{ detail_data.city }}</span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.response_code') }}</h1>
          <span>{{ detail_data.status_code }} ({{ detail_data.status }} )</span>
        </div>
        <div v-if="detail_data.src_ip !== detail_data.net_src_ip" class="info-item" style="color: red">
          <!-- 实际ip -->
          <h1>{{ t('page.visit_log.detail.visitor_net_ip') }}</h1>
          <span>
            {{ detail_data.net_src_ip }}
            <t-button theme="primary" shape="round" size="small" @click="handleAddipblock(detail_data.net_src_ip)">{{
              t('page.visit_log.detail.add_to_deny_list')
            }}</t-button>
          </span>
        </div>
        <div v-if="detail_data.is_balance === 1" class="info-item">
          <!-- 负载均衡信息 -->
          <h1>{{ t('page.visit_log.detail.balance_info') }}</h1>
          <span>{{ detail_data.balance_info }}</span>
        </div>
      </div>
    </t-card>
    <t-card :title="t('page.visit_log.detail.more_info')" class="container-base-margin-top">
      <template #actions>
        <t-tooltip :content="t('page.visit_log.detail.mouse_select_tooltip')">
          {{ t('page.visit_log.detail.quick_add_rule') }}:
          <t-switch
            v-model="quickAddRuleChecked"
            size="large"
            :label="[t('page.visit_log.detail.open'), t('page.visit_log.detail.close')]"
          ></t-switch>
        </t-tooltip>
      </template>
      <t-list :split="true">
        <t-list-item>
          <t-list-item-meta :title="t('page.visit_log.detail.request_path')"></t-list-item-meta>
        </t-list-item>
        <t-textarea
          v-model="detail_data.url"
          :autosize="{ minRows: 3, maxRows: 5 }"
          readonly
          @blur="handleMouseSelect('url')"
        />
        <t-list-item>
          <t-list-item-meta :title="t('page.visit_log.detail.request_header')"></t-list-item-meta>
        </t-list-item>
        <t-textarea
          v-model="detail_data.header"
          :autosize="{ minRows: 3, maxRows: 5 }"
          readonly
          @blur="handleMouseSelect('header')"
        />
        <t-list-item>
          <t-list-item-meta :title="t('page.visit_log.detail.request_user_browser')"></t-list-item-meta>
        </t-list-item>
        <t-textarea
          v-model="detail_data.user_agent"
          :autosize="{ minRows: 3, maxRows: 5 }"
          readonly
          @blur="handleMouseSelect('user_agent')"
        />
        <t-list-item>
          <t-list-item-meta :title="t('page.visit_log.detail.request_cookies')"></t-list-item-meta>
        </t-list-item>
        <t-textarea
          v-model="detail_data.cookies"
          :autosize="{ minRows: 3, maxRows: 5 }"
          readonly
          @blur="handleMouseSelect('cookies')"
        />
        <t-list-item>
          <t-list-item-meta :title="t('page.visit_log.detail.request_body')"></t-list-item-meta>
          <template #action>
            <span v-if="bodySize > 300" style="font-size: 12px; color: #999; margin-right: 8px">
              {{ t('page.visit_log.detail.body_content_size') }}: {{ bodySize }} bytes
            </span>
            <t-link v-if="bodySize > 300" theme="primary" @click="bodyExpanded = !bodyExpanded">
              {{ bodyExpanded ? t('page.visit_log.detail.body_show_less') : t('page.visit_log.detail.body_show_more') }}
            </t-link>
          </template>
        </t-list-item>
        <t-textarea
          :value="displayBody"
          :autosize="{ minRows: 3, maxRows: bodyExpanded ? 30 : 5 }"
          readonly
          @blur="handleMouseSelect('body')"
        />
        <t-list-item>
          <t-list-item-meta :title="t('page.visit_log.detail.request_form')"></t-list-item-meta>
        </t-list-item>
        <t-textarea v-model="detail_data.post_form" :autosize="{ minRows: 3, maxRows: 5 }" readonly />
      </t-list>
    </t-card>
    <t-card :title="t('page.visit_log.detail.response.response_title')">
      <t-list :split="true">
        <t-list-item>
          <t-list-item-meta :title="t('page.visit_log.detail.response.response_header')"></t-list-item-meta>
        </t-list-item>
        <t-textarea v-model="detail_data.res_header" :autosize="{ minRows: 3, maxRows: 5 }" readonly />
        <t-list-item>
          <t-list-item-meta :title="t('page.visit_log.detail.response.response_body')"></t-list-item-meta>
          <template #action>
            <span v-if="resBodySize > 300" style="font-size: 12px; color: #999; margin-right: 8px">
              {{ t('page.visit_log.detail.body_content_size') }}: {{ resBodySize }} bytes
            </span>
            <t-link v-if="resBodySize > 300" theme="primary" @click="resBodyExpanded = !resBodyExpanded">
              {{ resBodyExpanded ? t('page.visit_log.detail.body_show_less') : t('page.visit_log.detail.body_show_more') }}
            </t-link>
          </template>
        </t-list-item>
        <t-textarea :value="displayResBody" :autosize="{ minRows: 3, maxRows: resBodyExpanded ? 30 : 5 }" readonly />
        <t-list-item>
          <t-list-item-meta :title="t('page.visit_log.detail.response_status')"></t-list-item-meta>
        </t-list-item>
        <span> {{ detail_data.status_code }} ({{ detail_data.status }} ) </span>
      </t-list>
    </t-card>
    <t-card :title="t('page.visit_log.detail.time_cost.title')">
      <div class="info-block">
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.time_cost.pre_check_cost') }}</h1>
          <span>{{ detail_data.pre_check_cost }}ms</span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.time_cost.forward_cost') }}</h1>
          <span>{{ detail_data.forward_cost }}ms</span>
        </div>
        <div class="info-item">
          <h1>{{ t('page.visit_log.detail.time_cost.backend_check_cost') }}</h1>
          <span>{{ detail_data.backend_check_cost }}ms</span>
        </div>
      </div>
    </t-card>

    <t-dialog
      v-model:visible="httpCopyMaskVisible"
      :header="t('page.visit_log.detail.http_copy_mask')"
      :on-cancel="() => (httpCopyMaskVisible = false)"
      @confirm="httpCopyMaskVisible = false"
    >
      <t-alert theme="info" :message="t('page.visit_log.detail.http_copy_mask_tip')" />
      <t-textarea v-model="httpCopyMask" :autosize="{ minRows: 5, maxRows: 10 }" />
    </t-dialog>

    <t-dialog
      v-model:visible="httpAiMaskVisible"
      :header="t('page.visit_log.detail.ai.before_send_ai')"
      width="700px"
      :on-cancel="() => (httpAiMaskVisible = false)"
      @confirm="handelToAi"
    >
      <t-alert theme="info" :message="t('page.visit_log.detail.ai.before_send_ai_tip')" />
      <t-textarea v-model="httpAiMask" :autosize="{ minRows: 5, maxRows: 10 }" />
    </t-dialog>

    <!-- IP提取问题对话框 -->
    <t-dialog v-model:visible="ipExtractDialogVisible" :header="t('page.visit_log.detail.ip_extract_issue')" :width="800" :footer="false">
      <p>{{ t('page.visit_log.detail.ip_extract_issue_desc') }}</p>

      <!-- 视频教程链接 -->
      <t-alert theme="success" style="margin-bottom: 16px">
        <template #icon>
          <span style="font-size: 20px">📺</span>
        </template>
        <div style="display: flex; align-items: center; justify-content: space-between">
          <span>{{ t('page.visit_log.detail.ip_extract_video_tutorial') }}</span>
          <t-button theme="primary" size="small" @click="openVideoTutorial">
            {{ t('page.visit_log.detail.ip_extract_watch_tutorial') }}
          </t-button>
        </div>
      </t-alert>

      <!-- 常用头信息提示区域 -->
      <t-card :title="t('page.visit_log.detail.ip_extract_common_headers')" style="margin-bottom: 20px">
        <p style="margin-bottom: 12px; color: #666">{{ t('page.visit_log.detail.ip_extract_common_headers_desc') }}</p>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px">
          <t-button size="small" variant="outline" @click="selectIPHeader('CF-Connecting-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.cloudflare') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('True-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.cloudflare_enterprise') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Forwarded-For')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_forwarded_for') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Real-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_real_ip') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_client_ip') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('Fastly-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.fastly') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('Incap-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.incapsula') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('CF-Connecting-IP,X-Forwarded-For,X-Real-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.multiple') }}
          </t-button>
        </div>
        <t-alert theme="info" :message="t('page.visit_log.detail.ip_extract_multiple_tips')" style="margin-top: 8px" />
        <div style="margin-top: 8px; color: #999; font-size: 12px">
          {{ t('page.visit_log.detail.ip_extract_example') }}
        </div>
      </t-card>

      <t-form ref="ipExtractForm" :data="ipExtractFormData" :rules="ipExtractRules" :label-width="150" @submit="onSubmitIPExtract">
        <t-form-item :label="t('page.systemconfig.label_configuration_item')" name="item">
          <t-input v-model="ipExtractFormData.item" :style="{ width: '600px' }" disabled></t-input>
        </t-form-item>
        <t-form-item :label="t('page.systemconfig.label_configuration_value')" name="value">
          <t-input
            v-model="ipExtractFormData.value"
            :style="{ width: '600px' }"
            :placeholder="t('page.visit_log.detail.ip_extract_issue_tips')"
          ></t-input>
          <div class="form-item-tips">{{ t('page.visit_log.detail.ip_extract_issue_tips') }}</div>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="ipExtractDialogVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import type { FormProps } from 'tdesign-vue-next';
import { LogoAndroidIcon } from 'tdesign-icons-vue-next';

import bus from '@/utils/bus';
import { geWebLogDetail, getHeaderCopyDetail } from '@/apis/waflog/attacklog';
import { wafIPBlockAddApi } from '@/apis/ipblock';
import { edit_system_config_api, get_detail_by_item_api } from '@/apis/systemconfig';

const props = defineProps({
  prop_req_uuid: {
    type: String,
    default: '',
  },
  prop_current_db: {
    type: String,
    default: '',
  },
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const detail_data = ref<Record<string, any>>({});
const quickAddRuleChecked = ref(false);
const bodyExpanded = ref(false);
const resBodyExpanded = ref(false);
const detail_req = reactive({
  req_uuid: '',
  current_db: '',
});
const httpCopyMask = ref('');
const httpCopyMaskVisible = ref(false);
const httpAiMask = ref('');
const httpAiMaskVisible = ref(false);
const ipExtractDialogVisible = ref(false);
const ipExtractFormData = ref<Record<string, any>>({
  item: 'gwaf_proxy_header',
  value: '',
  remarks: '获取访客IP头信息（按照顺序）',
});
const ipExtractRules: FormProps['rules'] = {
  item: [{ required: true, message: t('page.systemconfig.label_configuration_item'), type: 'error' }],
  value: [{ required: false, message: t('page.systemconfig.label_configuration_value'), type: 'error' }],
};

const bodySize = computed(() => (detail_data.value.body || '').length);
const resBodySize = computed(() => (detail_data.value.res_body || '').length);
const displayBody = computed(() => {
  const body = detail_data.value.body || '';
  if (bodyExpanded.value || body.length <= 300) return body;
  return `${body.substring(0, 300)} ...`;
});
const displayResBody = computed(() => {
  const body = detail_data.value.res_body || '';
  if (resBodyExpanded.value || body.length <= 300) return body;
  return `${body.substring(0, 300)} ...`;
});
const isOwaspRule = computed(() => {
  const rule = detail_data.value.rule || '';
  return rule.startsWith('OWASP:');
});
const owaspRuleId = computed(() => {
  const rule = detail_data.value.rule || '';
  const m = rule.match(/^OWASP:(\d+)/);
  return m ? m[1] : '';
});

onMounted(() => {
  if (props.prop_req_uuid) {
    getDetail(buildPropUuid(props.prop_req_uuid));
  } else {
    getDetail(route.query.req_uuid as string);
  }
});

watch(
  () => route.query.req_uuid,
  (newVal) => {
    if (newVal !== undefined && !props.prop_req_uuid) {
      getDetail(newVal as string);
    }
  },
);

watch(
  () => props.prop_req_uuid,
  (newVal) => {
    if (newVal !== undefined && newVal !== '') {
      getDetail(buildPropUuid(newVal));
    }
  },
);

// 内嵌模式下 prop_req_uuid 不带库名，补上 prop_current_db
function buildPropUuid(uuid: string) {
  if (props.prop_current_db) {
    return `${uuid}#${props.prop_current_db}`;
  }
  return uuid;
}

function goToOwaspRule() {
  router.push({
    path: '/sys/OwaspManage',
    query: { tab: 'rules', rule_id: owaspRuleId.value },
  });
}

function goToOwaspSandbox() {
  const d = detail_data.value;
  sessionStorage.setItem(
    'owasp_sandbox_prefill',
    JSON.stringify({
      method: d.method || 'GET',
      url: d.url || '/',
      headers: d.header || '',
    }),
  );
  router.push({
    path: '/sys/OwaspManage',
    query: { tab: 'sandbox' },
  });
}

function handleIPExtractIssue() {
  ipExtractDialogVisible.value = true;
  get_detail_by_item_api({ item: 'gwaf_proxy_header' })
    .then((res) => {
      if (res.code === 0 && res.data) {
        ipExtractFormData.value = res.data;
      }
    })
    .catch(() => {});
}

const onSubmitIPExtract: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult === true) {
    edit_system_config_api(ipExtractFormData.value)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          ipExtractDialogVisible.value = false;
        } else {
          MessagePlugin.error(res.msg);
        }
      })
      .catch((err: Error) => {
        MessagePlugin.error(err.message);
      });
  }
};

// 快捷选择IP头信息
function selectIPHeader(headerValue: string) {
  ipExtractFormData.value.value = headerValue;
  MessagePlugin.success(`已选择: ${headerValue}`);
}

// 打开视频教程
function openVideoTutorial() {
  window.open('https://www.bilibili.com/video/BV1pn8Ez2ELQ/', '_blank');
}

function handelToAi() {
  bus.emit('sendAi', httpAiMask.value);
  httpAiMaskVisible.value = false;
}

function beforeSendAi() {
  httpAiMask.value = '';
  getHeaderCopyDetail({
    REQ_UUID: detail_req.req_uuid,
    current_db_name: detail_req.current_db,
    output_format: 'raw',
  })
    .then((res) => {
      if (res.code === 0) {
        httpAiMask.value = res.data;
        httpAiMaskVisible.value = true;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function loadHttpCopyMask() {
  getHeaderCopyDetail({
    REQ_UUID: detail_req.req_uuid,
    current_db_name: detail_req.current_db,
    output_format: 'curl',
  })
    .then((res) => {
      if (res.code === 0) {
        httpCopyMask.value = res.data;
        httpCopyMaskVisible.value = true;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function getDetail(uuidAndName?: string) {
  if (uuidAndName === undefined || uuidAndName === '') {
    return;
  }
  const arr = uuidAndName.split('#');
  const id = arr[0];
  const currentDbName = arr[1];

  detail_req.req_uuid = id;
  detail_req.current_db = currentDbName;
  bodyExpanded.value = false;
  resBodyExpanded.value = false;
  geWebLogDetail({
    REQ_UUID: id,
    current_db_name: currentDbName,
  })
    .then((res) => {
      if (res.code === 0) {
        detail_data.value = res.data;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function handleAddipblock(ip: string) {
  if (detail_data.value.host_code === '') {
    MessagePlugin.warning('当前网站不存在');
    return;
  }

  const confirmDia = DialogPlugin.confirm({
    header: t('page.visit_log.detail.add_to_deny_list_confirm_header'),
    body: t('page.visit_log.detail.add_to_deny_list_confirm_body'),
    confirmBtn: t('common.confirm'),
    cancelBtn: t('common.cancel'),
    onConfirm: () => {
      wafIPBlockAddApi({
        host_code: detail_data.value.host_code,
        ip,
        remarks: '手工增加',
      })
        .then((res) => {
          if (res.code === 0) {
            MessagePlugin.success(res.msg);
          } else {
            MessagePlugin.warning(res.msg);
          }
        })
        .catch((e: Error) => {
          console.log(e);
        });
      confirmDia.destroy();
    },
    onClose: () => {
      confirmDia.hide();
    },
  });
}

function handleMouseSelect(sourcePoint: string) {
  if (quickAddRuleChecked.value === false) {
    return;
  }
  const text = window.getSelection()?.toString() || '';
  if (text.length === 0) {
    return;
  }
  router.push({
    path: '/waf-host/wafruleedit',
    query: {
      type: 'add',
      host_code: detail_data.value.host_code,
      contentstr: text,
      is_manual_rule: 1,
      sourcePoint,
    },
  });
}
</script>

<style scoped>
.detail-base :deep(.t-card) {
  padding: 8px;
}

.detail-base :deep(.t-card__title) {
  font-size: 20px;
  font-weight: 500;
}

.detail-base-info-steps {
  padding-top: 12px;
}

.container-base-margin-top {
  margin-top: 16px;
}

.info-block {
  column-count: 2;
}

.info-block .info-item {
  padding: 12px 0;
  display: flex;
  color: var(--td-text-color-primary);
}

.info-block .info-item h1 {
  width: 200px;
  font-weight: normal;
  font-size: 14px;
  color: var(--td-text-color-secondary);
  text-align: left;
  line-height: 22px;
}

@media (max-width: 768px) {
  .info-block .info-item h1 {
    width: 100px;
  }
}

@media (min-width: 769px) and (max-width: 992px) {
  .info-block .info-item h1 {
    width: 120px;
  }
}

.info-block .info-item span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-left: 24px;
}

.form-item-tips {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}
</style>
