<template>
  <div>
    <t-card class="list-card-container">
      <t-tabs v-model="activeTab">
        <t-tab-panel value="ban_list" :label="t('page.ip_failure.ban_list')">
          <div class="table-container">
            <div class="operation-container">
              <t-button theme="primary" @click="getList">{{ t('common.refresh') }}</t-button>
            </div>
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
              <template #op="slotProps">
                <a class="t-button-link" @click="handleClickDetail(slotProps)">{{ t('common.details') }}</a>
                <a class="t-button-link" style="margin-left: 8px" @click="handleClickUnban(slotProps)">{{ t('page.ip_failure.unban') }}</a>
              </template>
            </t-table>
          </div>
        </t-tab-panel>

        <t-tab-panel value="config" :label="t('page.ip_failure.config')">
          <div class="config-container">
            <t-alert theme="info" :title="t('page.ip_failure.rule_guide_title')" :close="false" class="rule-guide-alert">
              <template #message>
                <div class="rule-guide-content">
                  <div class="rule-important-notice">
                    <info-circle-icon class="notice-icon" />
                    <span>{{ t('page.ip_failure.rule_guide_notice') }}</span>
                    <t-button theme="primary" size="small" class="goto-rule-btn" @click="goToRulePage">
                      {{ t('page.ip_failure.goto_rule_page') }}
                      <arrow-right-icon />
                    </t-button>
                  </div>
                  <div class="rule-section">
                    <h4>{{ t('page.ip_failure.rule_example') }}</h4>
                    <pre class="code-block">
rule R80798f795d7947419ba6f593708b4013 "禁止5分钟内失败10次的IP访问" salience 10 {
  when
    MF.GetIPFailureCount(5) > 10
  then
    Retract("R80798f795d7947419ba6f593708b4013");
}</pre
                    >
                  </div>
                  <div class="rule-section">
                    <h4>{{ t('page.ip_failure.system_params') }}</h4>
                    <ul class="params-list">
                      <li><strong>ip_failure_ban_time_window</strong>: {{ t('page.ip_failure.param_time_window_desc') }}</li>
                      <li><strong>ip_failure_ban_max_count</strong>: {{ t('page.ip_failure.param_max_count_desc') }}</li>
                    </ul>
                  </div>
                </div>
              </template>
            </t-alert>

            <t-form :data="formData" :rules="rules" :label-width="180" @submit="onSubmit">
              <t-form-item :label="t('page.ip_failure.enabled')" name="enabled">
                <t-switch v-model="formData.enabled" :custom-value="[1, 0]" />
              </t-form-item>
              <t-form-item :label="t('page.ip_failure.status_codes')" name="status_codes">
                <div>
                  <t-input v-model="formData.status_codes" :placeholder="t('page.ip_failure.status_codes_placeholder')" :style="{ width: '480px' }" />
                  <div class="desc">{{ t('page.ip_failure.status_codes_desc') }}</div>
                </div>
              </t-form-item>
              <t-form-item :label="t('page.ip_failure.lock_time')" name="lock_time">
                <div>
                  <t-input-number v-model="formData.lock_time" :min="1" :style="{ width: '480px' }" />
                  <span class="unit">{{ t('common.unit_minute') }}</span>
                  <div class="desc">{{ t('page.ip_failure.lock_time_desc') }}</div>
                </div>
              </t-form-item>
              <t-form-item>
                <t-button theme="primary" type="submit">{{ t('common.save') }}</t-button>
              </t-form-item>
            </t-form>
          </div>
        </t-tab-panel>
      </t-tabs>
    </t-card>

    <t-dialog
      v-model:visible="visitDetailVisible"
      :header="t('page.attack_log.attack_ip_visit_detail_list_header')"
      width="100%"
      :confirm-on-enter="true"
      :on-confirm="() => (visitDetailVisible = false)"
      :on-close="() => (visitDetailVisible = false)"
    >
      <web-log-list :attack_ip="trans_to_parent_ip" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { InfoCircleIcon, ArrowRightIcon } from 'tdesign-icons-vue-next';
import WebLogList from '@/pages/waf/attack/index.vue';
import {
  wafIPFailureGetConfigApi,
  wafIPFailureSetConfigApi,
  wafIPFailureGetBanListApi,
  wafIPFailureRemoveBanIpApi,
} from '@/apis/ip_failure';

const { t } = useI18n();
const router = useRouter();

const activeTab = ref('ban_list');
const formData = ref<Record<string, any>>({
  enabled: 0,
  status_codes: '',
  lock_time: 10,
});

const rules: FormProps['rules'] = {
  status_codes: [{ required: true, message: t('common.required'), type: 'error' }],
  lock_time: [{ required: true, message: t('common.required'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const rowKey = 'ip';

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.ip_failure.ip'), colKey: 'ip', width: 150 },
  { title: t('page.ip_failure.fail_count'), colKey: 'fail_count', width: 100 },
  { title: t('page.ip_failure.trigger_minutes'), colKey: 'trigger_minutes', width: 120 },
  { title: t('page.ip_failure.trigger_count'), colKey: 'trigger_count', width: 120 },
  { title: t('page.ip_failure.first_time'), colKey: 'first_time', width: 180 },
  { title: t('page.ip_failure.last_time'), colKey: 'last_time', width: 180 },
  { title: t('page.ip_failure.remain_time'), colKey: 'remain_time', width: 120 },
  { title: t('page.ip_failure.region'), colKey: 'region', width: 150 },
  { title: t('common.op'), colKey: 'op', width: 100, fixed: 'right' },
]);

const visitDetailVisible = ref(false);
const trans_to_parent_ip = ref('');

function goToRulePage() {
  router.push({ name: 'WafRule' });
}

function getConfig() {
  wafIPFailureGetConfigApi().then((res) => {
    if (res.code === 0) {
      formData.value = res.data;
    }
  });
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafIPFailureSetConfigApi(formData.value).then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getConfig();
      } else {
        MessagePlugin.warning(res.msg);
      }
    });
  } else {
    MessagePlugin.warning(firstError);
  }
};

function getList() {
  dataLoading.value = true;
  wafIPFailureGetBanListApi({
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list || [];
        pagination.total = res.data.total;
      }
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  pagination.pageSize = pageInfo.pageSize;
  getList();
}

function handleClickDetail(e: { row: Record<string, any> }) {
  trans_to_parent_ip.value = e.row.ip;
  visitDetailVisible.value = true;
}

function handleClickUnban(e: { row: Record<string, any> }) {
  const dialogInstance = DialogPlugin.confirm({
    header: t('common.confirm_unban'),
    body: t('common.confirm_unban_content', { ip: e.row.ip }),
    onConfirm: () => {
      wafIPFailureRemoveBanIpApi({ ip: e.row.ip })
        .then((res) => {
          if (res.code === 0) {
            MessagePlugin.success(res.msg);
            getList();
            dialogInstance.destroy();
          } else {
            MessagePlugin.warning(res.msg);
          }
        })
        .catch((err: Error) => {
          MessagePlugin.error(err.message || '解封失败');
          dialogInstance.destroy();
        });
    },
  });
}

onMounted(() => {
  getConfig();
  getList();
});
</script>

<style scoped>
.config-container {
  padding: 20px;
}

.desc {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}

.unit {
  margin-left: 8px;
}

.operation-container {
  margin-bottom: 16px;
}

.rule-guide-alert {
  margin-bottom: 24px;
}

.rule-important-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--td-warning-color-1);
  border: 1px solid var(--td-warning-color-3);
  border-radius: 6px;
  margin-bottom: 16px;
}

.notice-icon {
  font-size: 18px;
  color: var(--td-warning-color);
  flex-shrink: 0;
}

.rule-important-notice span {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--td-warning-color-9);
}

.goto-rule-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.rule-section {
  margin-bottom: 16px;
}

.rule-section:last-child {
  margin-bottom: 0;
}

.rule-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.code-block {
  background: var(--td-bg-color-component);
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 3px;
  padding: 12px;
  margin: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--td-text-color-primary);
  overflow-x: auto;
}

.params-list {
  margin: 0;
  padding-left: 20px;
}

.params-list li {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.params-list li:last-child {
  margin-bottom: 0;
}

.params-list strong {
  color: var(--td-brand-color);
  font-family: 'Courier New', Courier, monospace;
}
</style>
