<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.application.new_app') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList">
            {{ t('common.search') }}
          </t-button>
        </div>
      </t-row>

      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          row-key="id"
          vertical-align="middle"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
        >
          <template #run_status="{ row }">
            <t-tag v-if="row.run_status === 1" theme="success">{{ t('page.application.status_running') }}</t-tag>
            <t-tag v-else-if="row.run_status === 2" theme="danger">{{ t('page.application.status_crashed') }}</t-tag>
            <t-tag v-else theme="default">{{ t('page.application.status_stopped') }}</t-tag>
          </template>

          <template #start_status="{ row }">
            <t-tag v-if="row.start_status === 1 || row.start_status === '1'" theme="success">
              {{ t('common.on') }}
            </t-tag>
            <t-tag v-else theme="warning">{{ t('common.off') }}</t-tag>
          </template>

          <template #auto_start="{ row }">
            <t-tag v-if="row.auto_start === 1 || row.auto_start === '1'" theme="primary">
              {{ t('common.yes') }}
            </t-tag>
            <t-tag v-else theme="default">{{ t('common.no') }}</t-tag>
          </template>

          <template #op="slotProps">
            <template v-if="actingCode !== slotProps.row.code">
              <a v-if="slotProps.row.run_status !== 1" class="t-button-link" @click="handleStart(slotProps)">{{
                t('page.application.start')
              }}</a>
              <a v-if="slotProps.row.run_status === 1" class="t-button-link" @click="handleStop(slotProps)">{{
                t('page.application.stop')
              }}</a>
              <a class="t-button-link" @click="handleRestart(slotProps)">{{ t('page.application.restart') }}</a>
              <a class="t-button-link" @click="handleShowLogs(slotProps)">{{ t('page.application.view_logs') }}</a>
              <a class="t-button-link" @click="handleShowUpgrade(slotProps)">{{ t('page.application.upgrade') }}</a>
              <a class="t-button-link" @click="handleShowNetwork(slotProps)">{{ t('page.application.network') }}</a>
              <t-badge :count="unreadChangeCount(slotProps.row)" :max-count="99" size="small" style="margin-right: 8px">
                <a class="t-button-link" @click="handleShowChangeLogs(slotProps)">{{ t('page.application.change_logs') }}</a>
              </t-badge>
              <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
              <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
            </template>
            <span v-else class="t-button-link acting-text">{{ t('page.application.acting') }}</span>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新增对话框 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="760" :footer="false">
      <app-form :value="formData" :op-password="currentOpPassword" @close="addFormVisible = false" @submit="onSubmit"></app-form>
    </t-dialog>

    <!-- 编辑对话框 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="760" :footer="false">
      <app-form
        :value="formEditData"
        :is-edit="true"
        :op-password="currentOpPassword"
        @close="editFormVisible = false"
        @submit="onSubmitEdit"
      ></app-form>
    </t-dialog>

    <!-- 删除确认 -->
    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    ></t-dialog>

    <!-- 日志对话框 -->
    <t-dialog
      v-model:visible="logsVisible"
      :header="t('page.application.view_logs')"
      :width="900"
      :on-cancel="() => (logsVisible = false)"
      @confirm="logsVisible = false"
    >
      <app-logs :key="selectedCode + logsKey" :app-code="selectedCode"></app-logs>
    </t-dialog>

    <!-- 升级对话框 -->
    <t-dialog
      v-model:visible="upgradeVisible"
      :header="t('page.application.upgrade')"
      :width="640"
      :footer="false"
      :on-cancel="() => (upgradeVisible = false)"
    >
      <app-upgrade
        :key="selectedCode"
        :app-code="selectedCode"
        :op-password="currentOpPassword"
        @close="upgradeVisible = false"
        @done="onUpgradeDone"
      ></app-upgrade>
    </t-dialog>

    <!-- 网络对话框 -->
    <t-dialog
      v-model:visible="networkVisible"
      :header="t('page.application.network')"
      :width="680"
      :footer="false"
      :on-cancel="() => (networkVisible = false)"
    >
      <app-network :key="selectedCode + '_net'" :app-code="selectedCode"></app-network>
    </t-dialog>

    <!-- 变更记录抽屉 -->
    <t-drawer
      v-model:visible="changeLogsVisible"
      :header="t('page.application.change_logs') + ' — ' + selectedAppName"
      :size="'720px'"
      :footer="false"
      placement="right"
    >
      <app-change-log v-if="changeLogsVisible" :key="selectedCode + '_cl'" :app-code="selectedCode"></app-change-log>
    </t-drawer>

    <!-- 应用操作密码确认弹框 -->
    <t-dialog
      v-model:visible="opPasswordDialogVisible"
      :header="t('page.application.op_password_title')"
      :width="420"
      :confirm-btn="{ loading: opPwdVerifying, content: t('common.confirm') }"
      :on-cancel="onOpPasswordCancel"
      @confirm="onOpPasswordConfirm"
    >
      <div style="padding: 8px 0">
        <p style="margin-bottom: 12px; color: #666; font-size: 13px">{{ t('page.application.op_password_hint') }}</p>
        <t-input
          v-model="opPasswordInput"
          type="password"
          :placeholder="t('page.application.op_password_placeholder')"
          autofocus
          @enter="onOpPasswordConfirm"
        />
        <div style="margin-top: 10px">
          <t-checkbox v-model="opPasswordRemember">{{ t('page.application.op_password_remember') }}</t-checkbox>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';
import { v4 as uuidv4 } from 'uuid';

import {
  getAppOpPassword,
  saveAppOpPassword,
  wafAppAddApi,
  wafAppDelApi,
  wafAppDetailApi,
  wafAppListApi,
  wafAppRestartApi,
  wafAppStartApi,
  wafAppStatusApi,
  wafAppStopApi,
  wafAppVerifyPwdApi,
} from '@/apis/application';
import AppForm from './components/AppForm.vue';
import AppLogs from './components/AppLogs.vue';
import AppUpgrade from './components/AppUpgrade.vue';
import AppNetwork from './components/AppNetwork.vue';
import AppChangeLog from './components/AppChangeLog.vue';

const { t } = useI18n();

function initFormData() {
  return {
    code: uuidv4(),
    name: '',
    app_dir: '',
    start_cmd: '',
    env: '',
    auto_start: 0,
    start_status: 1,
    stop_mode: 'signal',
    stop_cmd: '',
    stop_timeout: 30,
    restart_policy: 'no',
    restart_delay: 5,
    max_restart_count: 0,
    log_max_lines: 1000,
    remarks: '',
  };
}

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const pagination = reactive({ total: 0, pageSize: 10, current: 1 });
const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const logsVisible = ref(false);
const upgradeVisible = ref(false);
const networkVisible = ref(false);
const changeLogsVisible = ref(false);
const selectedCode = ref('');
const selectedAppName = ref('');
const logsKey = ref(0);
const deleteId = ref('');
const deleteCode = ref('');
const confirmBody = ref('');
const actingCode = ref('');
const formData = ref<Record<string, any>>(initFormData());
const formEditData = ref<Record<string, any>>({});
// 操作密码弹框
const opPasswordDialogVisible = ref(false);
const opPasswordInput = ref('');
const opPasswordRemember = ref(true);
const opPwdVerifying = ref(false);
const currentOpPassword = ref('');
let pendingAction: (() => void) | null = null;
let opPwdTimer: ReturnType<typeof setTimeout> | null = null;

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'name', title: t('page.application.name'), width: 140 },
  { colKey: 'run_status', title: t('page.application.run_status'), width: 100 },
  { colKey: 'pid', title: 'PID', width: 80 },
  { colKey: 'restart_count', title: t('page.application.restart_count'), width: 90 },
  { colKey: 'start_status', title: t('page.application.start_status'), width: 90 },
  { colKey: 'auto_start', title: t('page.application.auto_start'), width: 90 },
  { colKey: 'restart_policy', title: t('page.application.restart_policy'), width: 100 },
  { colKey: 'app_dir', title: t('page.application.app_dir'), ellipsis: true },
  { colKey: 'remarks', title: t('common.remarks'), ellipsis: true },
  { colKey: 'op', title: t('common.op'), width: 420, fixed: 'right' },
]);

onMounted(() => {
  getList();
});

onBeforeUnmount(() => {
  if (opPwdTimer) clearTimeout(opPwdTimer);
});

function getList() {
  dataLoading.value = true;
  wafAppListApi({ pageIndex: pagination.current, pageSize: pagination.pageSize })
    .then((res) => {
      if (res && res.code === 0) {
        data.value = res.data.list || [];
        pagination.total = res.data.total || 0;
      }
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
  getList();
}

// ---- 操作密码确认 ----
function resetOpPwdTimer() {
  if (opPwdTimer) clearTimeout(opPwdTimer);
  opPwdTimer = setTimeout(() => {
    currentOpPassword.value = '';
  }, 5 * 60 * 1000);
}

function ensureOpPassword(action: () => void) {
  const existing = getAppOpPassword();
  if (existing) {
    // sessionStorage 未过期，同步到 prop 并重置 5 分钟计时器
    currentOpPassword.value = existing;
    resetOpPwdTimer();
    action();
    return;
  }
  opPasswordInput.value = '';
  opPasswordRemember.value = true;
  pendingAction = action;
  opPasswordDialogVisible.value = true;
}

function onOpPasswordConfirm() {
  const pwd = opPasswordInput.value.trim();
  if (!pwd) {
    MessagePlugin.warning(t('page.application.op_password_required'));
    return;
  }
  // 先验证，成功才保存，避免错误密码写入 session 导致之后无法重新输入
  opPwdVerifying.value = true;
  wafAppVerifyPwdApi(pwd)
    .then((res) => {
      if (res && res.code === 0) {
        currentOpPassword.value = pwd;
        resetOpPwdTimer();
        if (opPasswordRemember.value) {
          saveAppOpPassword(pwd);
        }
        opPasswordDialogVisible.value = false;
        if (pendingAction) {
          pendingAction();
          pendingAction = null;
        }
      } else {
        MessagePlugin.error(t('page.application.op_password_wrong'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('page.application.op_password_wrong'));
    })
    .finally(() => {
      opPwdVerifying.value = false;
    });
}

function onOpPasswordCancel() {
  opPasswordDialogVisible.value = false;
  pendingAction = null;
}

// ---- 增删改 ----
function handleAdd() {
  formData.value = initFormData();
  ensureOpPassword(() => {
    addFormVisible.value = true;
  });
}

function onSubmit() {
  addFormVisible.value = false;
  getList();
}

function handleClickEdit(slotProps: { row: Record<string, any> }) {
  wafAppDetailApi({ id: slotProps.row.id }).then((res) => {
    if (res && res.code === 0) {
      formEditData.value = res.data;
      ensureOpPassword(() => {
        editFormVisible.value = true;
      });
    }
  });
}

function onSubmitEdit() {
  editFormVisible.value = false;
  getList();
}

function handleClickDelete(slotProps: { row: Record<string, any> }) {
  deleteId.value = slotProps.row.id;
  deleteCode.value = slotProps.row.code;
  confirmBody.value = `${t('common.confirm_delete')} ${slotProps.row.name}?`;
  ensureOpPassword(() => {
    confirmVisible.value = true;
  });
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const code = deleteCode.value;
  actingCode.value = code;
  wafAppDelApi({ id: deleteId.value })
    .then((res) => {
      if (res && res.code === 0) {
        MessagePlugin.success(t('common.tips.delete_success'));
        pollUntilStatus(code, 0, 1000, 60000);
      } else {
        actingCode.value = '';
      }
    })
    .catch(() => {
      actingCode.value = '';
    });
}

function onCancel() {
  confirmVisible.value = false;
}

function pollUntilStatus(code: string, targetStatus: number, initialDelayMs: number, maxWaitMs: number) {
  const deadline = Date.now() + maxWaitMs;
  const poll = () => {
    if (Date.now() >= deadline) {
      actingCode.value = '';
      getList();
      return;
    }
    wafAppStatusApi({ code })
      .then((res) => {
        if (res && res.code === 0 && res.data.run_status === targetStatus) {
          actingCode.value = '';
          getList();
        } else {
          setTimeout(poll, 1000);
        }
      })
      .catch(() => {
        actingCode.value = '';
        getList();
      });
  };
  setTimeout(poll, initialDelayMs);
}

function handleStart(slotProps: { row: Record<string, any> }) {
  const { code } = slotProps.row;
  ensureOpPassword(() => {
    actingCode.value = code;
    wafAppStartApi({ code })
      .then((res) => {
        if (res && res.code === 0) {
          MessagePlugin.success(t('page.application.start_sent'));
          pollUntilStatus(code, 1, 800, 30000);
        } else {
          actingCode.value = '';
        }
      })
      .catch(() => {
        actingCode.value = '';
      });
  });
}

function handleStop(slotProps: { row: Record<string, any> }) {
  const { code } = slotProps.row;
  actingCode.value = code;
  wafAppStopApi({ code })
    .then((res) => {
      if (res && res.code === 0) {
        MessagePlugin.success(t('page.application.stop_sent'));
        pollUntilStatus(code, 0, 800, 45000);
      } else {
        actingCode.value = '';
      }
    })
    .catch(() => {
      actingCode.value = '';
    });
}

function handleRestart(slotProps: { row: Record<string, any> }) {
  const { code } = slotProps.row;
  ensureOpPassword(() => {
    actingCode.value = code;
    wafAppRestartApi({ code })
      .then((res) => {
        if (res && res.code === 0) {
          MessagePlugin.success(t('page.application.restart_sent'));
          pollUntilStatus(code, 1, 3000, 60000);
        } else {
          actingCode.value = '';
        }
      })
      .catch(() => {
        actingCode.value = '';
      });
  });
}

function handleShowLogs(slotProps: { row: Record<string, any> }) {
  selectedCode.value = slotProps.row.code;
  logsKey.value = Date.now();
  logsVisible.value = true;
}

function handleShowUpgrade(slotProps: { row: Record<string, any> }) {
  ensureOpPassword(() => {
    selectedCode.value = slotProps.row.code;
    upgradeVisible.value = true;
  });
}

function handleShowNetwork(slotProps: { row: Record<string, any> }) {
  selectedCode.value = slotProps.row.code;
  networkVisible.value = true;
}

// ---- 变更记录「未读」徽章 ----
function clViewedKey(code: string) {
  return `app_cl_viewed_${code}`;
}

function unreadChangeCount(row: Record<string, any>): number {
  const total = row.change_log_count || 0;
  const viewed = parseInt(localStorage.getItem(clViewedKey(row.code)) || '0', 10);
  return Math.max(0, total - viewed);
}

function markChangeLogViewed(code: string, total: number) {
  localStorage.setItem(clViewedKey(code), String(total));
}

function handleShowChangeLogs(slotProps: { row: Record<string, any> }) {
  selectedCode.value = slotProps.row.code;
  selectedAppName.value = slotProps.row.name;
  changeLogsVisible.value = true;
  // 标记已读：存当前总数，下次渲染徽章变 0
  markChangeLogViewed(slotProps.row.code, slotProps.row.change_log_count || 0);
}

function onUpgradeDone() {
  upgradeVisible.value = false;
  setTimeout(() => getList(), 1500);
}
</script>

<style scoped>
.list-card-container {
  padding: 20px;
}

.left-operation-container,
.right-operation-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.table-container {
  margin-top: 8px;
}

.acting-text {
  color: #999;
  cursor: default;
}
</style>
