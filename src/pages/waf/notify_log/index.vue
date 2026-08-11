<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.notify_log.label_message_type')" name="message_type">
              <t-select v-model="searchformData.message_type" clearable :style="{ width: '150px' }">
                <t-option value="rule_trigger" :label="t('page.notify_log.message_type_rule_trigger')"></t-option>
                <t-option value="operation_notice" :label="t('page.notify_log.message_type_operation_notice')"></t-option>
                <t-option value="user_login" :label="t('page.notify_log.message_type_user_login')"></t-option>
                <t-option value="attack_info" :label="t('page.notify_log.message_type_attack_info')"></t-option>
                <t-option value="weekly_report" :label="t('page.notify_log.message_type_weekly_report')"></t-option>
                <t-option value="ssl_expire" :label="t('page.notify_log.message_type_ssl_expire')"></t-option>
                <t-option value="system_error" :label="t('page.notify_log.message_type_system_error')"></t-option>
                <t-option value="ip_ban" :label="t('page.notify_log.message_type_ip_ban')"></t-option>
                <t-option value="access_login" :label="t('page.notify_log.message_type_access_login')"></t-option>
                <t-option value="access_abnormal" :label="t('page.notify_log.message_type_access_abnormal')"></t-option>
                <t-option value="manage_login_abnormal" :label="t('page.notify_log.message_type_manage_login_abnormal')"></t-option>
              </t-select>
            </t-form-item>
            <t-form-item :label="t('page.notify_log.label_send_status')" name="status">
              <t-select v-model="searchformData.status" clearable :style="{ width: '120px' }">
                <t-option :value="1" :label="t('page.notify_log.status_success')"></t-option>
                <t-option :value="0" :label="t('page.notify_log.status_failed')"></t-option>
                <!-- 被抑制的通知也留痕，这样"为什么没收到"能直接在这里查到 -->
                <t-option :value="2" :label="t('page.notify_log.status_suppressed')"></t-option>
              </t-select>
            </t-form-item>
            <t-form-item :label="t('page.notify_log.label_start_time')" name="start_time">
              <t-date-picker
                v-model="searchformData.start_time"
                enable-time-picker
                format="YYYY-MM-DD HH:mm:ss"
                :style="{ width: '200px' }"
              ></t-date-picker>
            </t-form-item>
            <t-form-item :label="t('page.notify_log.label_end_time')" name="end_time">
              <t-date-picker
                v-model="searchformData.end_time"
                enable-time-picker
                format="YYYY-MM-DD HH:mm:ss"
                :style="{ width: '200px' }"
              ></t-date-picker>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" @click="getList">{{ t('common.search') }}</t-button>
              <t-button variant="base" theme="default" :style="{ marginLeft: '8px' }" @click="handleReset">{{
                t('common.reset')
              }}</t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <help-block :summary="t('page.notify_log.alert_message')" doc="guide/NotifyLog" />
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
          <template #channel_type="{ row }">
            <t-tag v-if="row.channel_type === 'dingtalk'" theme="primary">{{ t('page.notify_channel.type_dingtalk') }}</t-tag>
            <t-tag v-else-if="row.channel_type === 'feishu'" theme="success">{{ t('page.notify_channel.type_feishu') }}</t-tag>
            <t-tag v-else theme="default">{{ row.channel_type }}</t-tag>
          </template>
          <template #message_type="{ row }">
            <t-tag theme="primary">{{ getMessageTypeName(row.message_type) }}</t-tag>
          </template>
          <template #status="{ row }">
            <t-tag v-if="row.status === 1" theme="success">{{ t('page.notify_log.status_success') }}</t-tag>
            <t-tag v-else-if="row.status === 2" theme="warning">{{ t('page.notify_log.status_suppressed') }}</t-tag>
            <t-tag v-else theme="danger">{{ t('page.notify_log.status_failed') }}</t-tag>
          </template>
          <template #suppress_reason="{ row }">
            <span v-if="row.status !== 2">-</span>
            <span v-else>
              {{ getSuppressReasonName(row.suppress_reason) }}
              <t-tag v-if="row.suppress_count > 1" theme="warning" variant="light" size="small">×{{ row.suppress_count }}</t-tag>
            </span>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleViewDetail(slotProps)">{{ t('page.notify_log.view_detail') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 日志详情对话框 -->
    <t-dialog v-model:visible="detailVisible" :header="t('page.notify_log.log_detail')" :width="800" :footer="false">
      <t-form :label-width="150" :style="{ marginTop: '16px' }">
        <t-form-item :label="t('page.notify_log.label_channel_name')">
          <span>{{ detailData.channel_name }}</span>
        </t-form-item>
        <t-form-item :label="t('page.notify_log.label_channel_type')">
          <t-tag v-if="detailData.channel_type === 'dingtalk'" theme="primary">{{ t('page.notify_channel.type_dingtalk') }}</t-tag>
          <t-tag v-else-if="detailData.channel_type === 'feishu'" theme="success">{{ t('page.notify_channel.type_feishu') }}</t-tag>
          <t-tag v-else theme="default">{{ detailData.channel_type }}</t-tag>
        </t-form-item>
        <t-form-item :label="t('page.notify_log.label_message_type')">
          <t-tag theme="primary">{{ getMessageTypeName(detailData.message_type) }}</t-tag>
        </t-form-item>
        <t-form-item :label="t('page.notify_log.label_message_title')">
          <span>{{ detailData.message_title }}</span>
        </t-form-item>
        <t-form-item :label="t('page.notify_log.label_message_content')">
          <t-textarea :value="detailData.message_content" :autosize="{ minRows: 4, maxRows: 10 }" readonly></t-textarea>
        </t-form-item>
        <t-form-item v-if="detailData.channel_type === 'email'" :label="t('page.notify_log.label_recipients')">
          <span>{{ detailData.recipients || '-' }}</span>
        </t-form-item>
        <t-form-item :label="t('page.notify_log.label_send_status')">
          <t-tag v-if="detailData.status === 1" theme="success">{{ t('page.notify_log.status_success') }}</t-tag>
          <t-tag v-else-if="detailData.status === 2" theme="warning">{{ t('page.notify_log.status_suppressed') }}</t-tag>
          <t-tag v-else theme="danger">{{ t('page.notify_log.status_failed') }}</t-tag>
        </t-form-item>
        <t-form-item v-if="detailData.status === 2" :label="t('page.notify_log.label_suppress_reason')">
          <div>
            <span>{{ getSuppressReasonName(detailData.suppress_reason) }}</span>
            <div style="font-size: 12px; color: #666; margin-top: 4px">
              {{ t('page.notify_log.label_suppress_count') }}: {{ detailData.suppress_count || 1 }} ——
              {{ t('page.notify_log.suppress_tips') }}
            </div>
          </div>
        </t-form-item>
        <t-form-item v-if="detailData.template_used" :label="t('page.notify_log.label_template_used')">
          <t-tag :theme="detailData.template_used === 'custom_fallback' ? 'danger' : 'default'">
            {{ getTemplateUsedName(detailData.template_used) }}
          </t-tag>
        </t-form-item>
        <t-form-item v-if="detailData.status === 0 && detailData.error_msg" :label="t('page.notify_log.label_error_msg')">
          <t-textarea :value="detailData.error_msg" :autosize="{ minRows: 2, maxRows: 5 }" readonly></t-textarea>
        </t-form-item>
        <t-form-item :label="t('page.notify_log.label_send_time')">
          <span>{{ detailData.send_time }}</span>
        </t-form-item>
        <t-form-item style="float: right; margin-top: 16px">
          <t-button variant="outline" @click="detailVisible = false">{{ t('common.close') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 删除确认对话框 -->
    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    >
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import { deleteNotifyLog, getNotifyLogList } from '@/apis/notify_log';

const { t } = useI18n();

const data = ref<Record<string, any>[]>([]);
const dataLoading = ref(false);
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 50, fixed: 'left' },
  { title: t('page.notify_log.label_channel_name'), colKey: 'channel_name', width: 150 },
  { title: t('page.notify_log.label_channel_type'), colKey: 'channel_type', width: 120 },
  { title: t('page.notify_log.label_message_type'), colKey: 'message_type', width: 150 },
  { title: t('page.notify_log.label_message_title'), colKey: 'message_title', ellipsis: true, width: 200 },
  { title: t('page.notify_log.label_send_status'), colKey: 'status', width: 100 },
  { title: t('page.notify_log.label_suppress_reason'), colKey: 'suppress_reason', width: 160 },
  { title: t('page.notify_log.label_send_time'), colKey: 'send_time', width: 180 },
  { align: 'left', fixed: 'right', width: 150, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  pageSize: 20,
  total: 0,
  current: 1,
});

const searchformData = reactive<Record<string, any>>({
  pageIndex: 1,
  pageSize: 20,
  message_type: '',
  status: undefined,
  start_time: '',
  end_time: '',
});

const detailVisible = ref(false);
const detailData = ref<Record<string, any>>({});
const confirmVisible = ref(false);
const confirmBody = ref('');
const deleteId = ref<string | number>('');

onMounted(() => {
  getList();
});

async function getList() {
  dataLoading.value = true;
  try {
    const res = await getNotifyLogList(searchformData);
    if (res.code === 0) {
      data.value = res.data.list || [];
      pagination.total = res.data.total;
      pagination.current = searchformData.pageIndex;
      pagination.pageSize = searchformData.pageSize;
    }
  } catch (e) {
    console.error(e);
  } finally {
    dataLoading.value = false;
  }
}

function handleReset() {
  searchformData.pageIndex = 1;
  searchformData.pageSize = 20;
  searchformData.message_type = '';
  searchformData.status = undefined;
  searchformData.start_time = '';
  searchformData.end_time = '';
  getList();
}

function getMessageTypeName(type: string) {
  const typeMap: Record<string, string> = {
    rule_trigger: t('page.notify_log.message_type_rule_trigger'),
    operation_notice: t('page.notify_log.message_type_operation_notice'),
    user_login: t('page.notify_log.message_type_user_login'),
    attack_info: t('page.notify_log.message_type_attack_info'),
    weekly_report: t('page.notify_log.message_type_weekly_report'),
    ssl_expire: t('page.notify_log.message_type_ssl_expire'),
    system_error: t('page.notify_log.message_type_system_error'),
    ip_ban: t('page.notify_log.message_type_ip_ban'),
    access_login: t('page.notify_log.message_type_access_login'),
    access_abnormal: t('page.notify_log.message_type_access_abnormal'),
    manage_login_abnormal: t('page.notify_log.message_type_manage_login_abnormal'),
  };
  return typeMap[type] || type;
}

// 抑制原因中文化：直接回答"为什么这条没发出去"
function getSuppressReasonName(reason: string) {
  const reasonMap: Record<string, string> = {
    cooldown: t('page.notify_log.suppress_reason_cooldown'),
    rate_limit: t('page.notify_log.suppress_reason_rate_limit'),
    quiet_hours: t('page.notify_log.suppress_reason_quiet_hours'),
    filter_miss: t('page.notify_log.suppress_reason_filter_miss'),
  };
  return reasonMap[reason] || reason || '-';
}

function getTemplateUsedName(used: string) {
  const usedMap: Record<string, string> = {
    default: t('page.notify_log.template_used_default'),
    custom: t('page.notify_log.template_used_custom'),
    custom_fallback: t('page.notify_log.template_used_fallback'),
  };
  return usedMap[used] || used;
}

function rehandlePageChange(pageInfo: PageInfo) {
  searchformData.pageIndex = pageInfo.current;
  searchformData.pageSize = pageInfo.pageSize;
  getList();
}

function handleViewDetail(e: { row: Record<string, any> }) {
  detailData.value = { ...e.row };
  detailVisible.value = true;
}

function handleClickDelete(e: { row: Record<string, any> }) {
  deleteId.value = e.row.id;
  confirmBody.value = t('page.notify_log.delete_confirm');
  confirmVisible.value = true;
}

async function onConfirmDelete() {
  try {
    const res = await deleteNotifyLog({ id: deleteId.value });
    if (res.code === 0) {
      MessagePlugin.success(t('page.notify_log.delete_success'));
      confirmVisible.value = false;
      getList();
    } else {
      MessagePlugin.error(res.msg || t('page.notify_log.delete_failed'));
    }
  } catch (error) {
    MessagePlugin.error(t('page.notify_log.delete_failed'));
  }
}

function onCancel() {
  confirmVisible.value = false;
}
</script>

<style scoped>
.list-card-container {
  padding: 16px;
}

.table-container {
  margin-top: 16px;
}
</style>
