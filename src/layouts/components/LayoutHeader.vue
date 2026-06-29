<template>
  <div class="layout-header">
    <t-button
      class="header-menu-btn"
      shape="square"
      variant="text"
      :aria-label="settingStore.isMobile ? 'menu' : 'collapse'"
      @click="settingStore.toggleSidebar()"
    >
      <view-list-icon />
    </t-button>

    <div class="header-spacer" />

    <!-- 搜索框（移动端隐藏） -->
    <search v-if="!settingStore.isMobile" />

    <!-- 系统监控（移动端隐藏） -->
    <system-monitor-widget v-if="!settingStore.isMobile" @open-wechat="wechatVisible = true" />

    <!-- 全局通知 -->
    <notice />

    <!-- 新版本提示 -->
    <t-tooltip v-if="hasNewVersion" placement="bottom" :content="t('topNav.update.has_new_version')">
      <t-button theme="default" shape="square" variant="text" style="position: relative; overflow: visible" @click="checkVersion('manual')">
        <notification-error-icon />
        <span v-if="updateNewVer && updateNewVer.toLowerCase().includes('beta')" class="version-badge version-badge--beta"> Beta </span>
        <span v-else class="version-badge version-badge--new"> New </span>
      </t-button>
    </t-tooltip>

    <!-- 微信公众号 -->
    <t-tooltip v-if="!settingStore.isMobile" placement="bottom" :content="t('topNav.wechat')">
      <t-button theme="default" shape="square" variant="text" @click="wechatVisible = true">
        <logo-wechat-stroke-icon />
      </t-button>
    </t-tooltip>
    <!-- 联系我们 -->
    <t-tooltip v-if="!settingStore.isMobile" placement="bottom" :content="t('topNav.contract')">
      <t-button theme="default" shape="square" variant="text" @click="sendMail">
        <mail-icon />
      </t-button>
    </t-tooltip>
    <!-- 帮助文档 -->
    <t-tooltip placement="bottom" :content="t('topNav.help_document')">
      <t-button theme="default" shape="square" variant="text" @click="navToHelper">
        <help-circle-icon />
      </t-button>
    </t-tooltip>

    <!-- 页面配置 -->
    <t-tooltip placement="bottom" :content="t('page.right_setting.page_setting')">
      <t-button theme="default" shape="square" variant="text" @click="settingStore.showSettingPanel = true">
        <setting-icon />
      </t-button>
    </t-tooltip>

    <!-- 语言切换 -->
    <t-dropdown :options="langOptions" trigger="click" @click="onLangChange">
      <t-button shape="square" variant="text" aria-label="language">
        <translate-icon />
      </t-button>
    </t-dropdown>

    <!-- 控制中心：当前管理的服务器 -->
    <t-button v-if="hasClientServer" theme="warning" @click="router.push('/center/CenterManager')">
      {{ t('topNav.current_server') }} {{ currentServer.client_server_name }}
    </t-button>

    <!-- 用户菜单 -->
    <t-dropdown :options="userOptions" trigger="click" @click="onUserAction">
      <t-button variant="text" class="header-user-btn">
        <template #icon><user-circle-icon /></template>
        <span v-if="!settingStore.isMobile">{{ userStore.account || 'admin' }}</span>
      </t-button>
    </t-dropdown>

    <!-- 升级对话框 -->
    <t-dialog v-model:visible="updateVisible" width="600px" :header="t('topNav.update.has_new_version')">
      <template #confirmBtn>
        <t-button :theme="updateNewVer && updateNewVer.toLowerCase().includes('beta') ? 'danger' : 'warning'" @click="handleConfirmUpdate">
          {{ t('topNav.update.confirm_update') }}
        </t-button>
      </template>

      <t-alert theme="warning">
        <template #message>
          {{ t('topNav.update.update_danger_tips') }}
        </template>
      </t-alert>
      <div style="margin: 16px 0 0 0; line-height: 1.8">
        <div>
          <strong>{{ t('topNav.update.version_label') }}</strong>
          {{ updateNewVer }}
        </div>
        <span v-if="updateNewVer && updateNewVer.toLowerCase().includes('beta')" style="color: red">
          {{ t('topNav.update.beta_version_warning') }}
        </span>

        <div>
          <strong>{{ t('topNav.update.desc_label') }}</strong>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-html="compiledMarkdown"></div>
        </div>
        <div>
          <t-link theme="primary" underline href="https://doc.samwaf.com/quickstart/Update.html" target="_blank">{{
            t('topNav.update.more_label')
          }}</t-link>
        </div>
      </div>
    </t-dialog>

    <!-- 版本回退对话框 -->
    <t-dialog v-model:visible="rollbackVisible" width="680px" header="版本回退" :confirm-btn="null" :cancel-btn="null">
      <t-alert theme="warning" style="margin-bottom: 16px">
        <template #message>回退后服务将自动重启，请确认操作</template>
      </t-alert>
      <div v-if="rollbackLoading" style="text-align: center; padding: 24px; color: #646a73">加载中...</div>
      <t-table
        v-else
        :data="rollbackList"
        :columns="rollbackColumns"
        row-key="file_name"
        size="small"
        :selected-row-keys="rollbackSelected ? [rollbackSelected.file_name] : []"
        select-on-row-click
        @select-change="onRollbackSelect"
      >
        <template #backup_time="{ row }">
          <span>{{ new Date(row.backup_time).toLocaleString('zh-CN') }}</span>
        </template>
        <template #file_size="{ row }">
          <span>{{ (row.file_size / 1024 / 1024).toFixed(2) }} MB</span>
        </template>
      </t-table>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px">
        <t-button theme="default" @click="rollbackVisible = false">取消</t-button>
        <t-button theme="danger" :disabled="!rollbackSelected || isRollbackLoading" :loading="isRollbackLoading" @click="handleConfirmRollback">
          确认回退到 {{ rollbackSelected ? rollbackSelected.version : '' }}
        </t-button>
      </div>
    </t-dialog>

    <!-- 微信公众号二维码对话框 -->
    <t-dialog v-model:visible="wechatVisible" width="800px" :header="t('topNav.wechat')" :confirm-btn="null" :cancel-btn="null">
      <div class="wechat-qr-container">
        <div class="qr-image-wrapper">
          <img src="@/assets/assets-mp-samwaf.png" class="qr-image" />
        </div>
      </div>
    </t-dialog>

    <!-- 个人自助修改密码 -->
    <change-password-dialog v-model:visible="showChangePwd" :forced="false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import type { DropdownProps, TableProps } from 'tdesign-vue-next';
import {
  HelpCircleIcon,
  LogoWechatStrokeIcon,
  MailIcon,
  NotificationErrorIcon,
  SettingIcon,
  TranslateIcon,
  UserCircleIcon,
  ViewListIcon,
} from 'tdesign-icons-vue-next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import { useUserStore } from '@/store/modules/user';
import { useSettingStore } from '@/store/modules/setting';
import { CheckVersionApi, DoRollbackApi, DoUpdateApi, GetRollbackListApi } from '@/apis/sysinfo';
import { resetWAFApi } from '@/apis/common';
import { getOnlineUrl } from '@/utils/usuallytool';
import Notice from './Notice.vue';
import Search from './Search.vue';
import SystemMonitorWidget from './SystemMonitorWidget.vue';
import ChangePasswordDialog from '@/pages/waf/account/components/ChangePasswordDialog.vue';

const router = useRouter();
const { t, locale } = useI18n();
const userStore = useUserStore();
const settingStore = useSettingStore();

/** 更新内容 */
const hasNewVersion = ref(false);
const isUpdateloading = ref(false);
const updateVisible = ref(false);
const updateNewVer = ref('');
const updateDesc = ref('');
/** 微信二维码对话框 */
const wechatVisible = ref(false);
/** 控制中心相关 */
const hasClientServer = ref(false);
const currentServer = ref<Record<string, any>>({});
/** 版本回退 */
const rollbackVisible = ref(false);
const rollbackLoading = ref(false);
const isRollbackLoading = ref(false);
const rollbackList = ref<Record<string, any>[]>([]);
const rollbackSelected = ref<Record<string, any> | null>(null);
const isResetloading = ref(false);

const rollbackColumns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'single', width: 48 },
  { colKey: 'version', title: '版本', width: 120 },
  { colKey: 'backup_time', title: '备份时间', width: 180 },
  { colKey: 'file_size', title: '大小', width: 90 },
  { colKey: 'file_name', title: '文件名' },
]);

const langOptions: DropdownProps['options'] = [
  { content: '简体中文', value: 'zh_CN' },
  { content: 'English', value: 'en_US' },
];

const userOptions = computed<DropdownProps['options']>(() => [
  { content: t('topNav.dropdown_change_password'), value: 'changepwd' },
  { content: t('topNav.dropdown_update'), value: 'update' },
  { content: '版本回退', value: 'rollback' },
  { content: t('topNav.dropdown_reboot_waf'), value: 'reboot', disabled: isResetloading.value },
  { content: t('topNav.dropdown_logout'), value: 'logout' },
]);

/** 个人自助修改密码 */
const showChangePwd = ref(false);

const compiledMarkdown = computed(() => DOMPurify.sanitize(marked.parse(updateDesc.value || '') as string));

onMounted(() => {
  // 首次提示，每隔24小时进行弹窗，其余实际不弹窗
  checkVersion('auto');
  // 管控初始化
  const currentServerStr = localStorage.getItem('current_server');
  if (currentServerStr) {
    hasClientServer.value = true;
    currentServer.value = JSON.parse(currentServerStr);
  } else {
    hasClientServer.value = false;
  }
});

function onLangChange(data: { value?: string | number }) {
  const lang = String(data.value);
  locale.value = lang;
  localStorage.setItem('lang', lang);
  window.location.reload();
}

async function onUserAction(data: { value?: string | number }) {
  switch (data.value) {
    case 'changepwd':
      showChangePwd.value = true;
      break;
    case 'update':
      checkVersion('manual');
      break;
    case 'rollback':
      openRollbackDialog();
      break;
    case 'reboot':
      resetServer();
      break;
    case 'logout':
      await userStore.logout();
      router.replace({ path: '/login' });
      break;
    default:
      break;
  }
}

function navToHelper() {
  window.open(getOnlineUrl());
}

function sendMail() {
  window.location.href = 'mailto:samwafgo@gmail.com';
}

function resetServer() {
  isResetloading.value = true;
  resetWAFApi()
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        setTimeout(() => {
          isResetloading.value = false;
        }, 3000);
      } else {
        MessagePlugin.warning(res.msg);
        isResetloading.value = false;
      }
    })
    .catch((e: Error) => {
      console.log(e);
      isResetloading.value = false;
    });
}

function checkVersion(method: 'auto' | 'manual') {
  CheckVersionApi()
    .then((res) => {
      if (res.code === 0) {
        hasNewVersion.value = true;
        updateNewVer.value = res.data.version_new;
        updateDesc.value = res.data.version_desc;
        if (method === 'manual') {
          updateVisible.value = true;
        } else {
          // 从本地存储获取上次显示弹窗的时间
          const lastUpdatePopupTime = localStorage.getItem('lastUpdatePopupTime');
          // 如果是beta版本，不自动弹出提示
          if (updateNewVer.value && updateNewVer.value.toLowerCase().includes('beta')) {
            hasNewVersion.value = true;
          } else if (!lastUpdatePopupTime || Date.now() - Number(lastUpdatePopupTime) > 24 * 60 * 60 * 1000) {
            // 如果上次显示时间不存在或距离当前时间超过24小时，则显示弹窗
            updateVisible.value = true;
            localStorage.setItem('lastUpdatePopupTime', String(Date.now()));
          }
        }
      } else if (method === 'manual') {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch(() => {
      if (method === 'manual') {
        MessagePlugin.warning('检测版本异常，请检测网络');
      }
    });
}

function handleConfirmUpdate() {
  // 如果是beta版本，需要二次确认
  if (updateNewVer.value && updateNewVer.value.toLowerCase().includes('beta')) {
    const confirmDia = DialogPlugin.confirm({
      header: t('topNav.update.beta_confirm_title') || '确认更新测试版本',
      body: t('topNav.update.beta_confirm_content') || '您正在更新测试版本，该版本可能不稳定，确定要继续吗？',
      confirmBtn: {
        theme: 'danger',
        content: t('topNav.update.beta_confirm_yes') || '确认更新',
      },
      cancelBtn: {
        theme: 'default',
        content: t('topNav.update.beta_confirm_no') || '取消',
      },
      onConfirm: () => {
        handleDoUpdate();
        confirmDia.destroy();
      },
    });
  } else {
    // 非beta版本直接更新
    handleDoUpdate();
  }
}

function handleDoUpdate() {
  isUpdateloading.value = true;
  // 检查是否为beta版本，如果是则添加渠道参数
  const params = updateNewVer.value && updateNewVer.value.toLowerCase().includes('beta') ? { channel: 'github' } : { channel: 'official' };

  DoUpdateApi(params)
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        updateVisible.value = false;
      } else {
        MessagePlugin.warning(res.msg);
        isUpdateloading.value = false;
      }
    })
    .catch((e: Error) => {
      isUpdateloading.value = false;
      console.log(e);
    });
}

function openRollbackDialog() {
  rollbackVisible.value = true;
  rollbackSelected.value = null;
  rollbackLoading.value = true;
  GetRollbackListApi()
    .then((res) => {
      if (res.code === 0) {
        rollbackList.value = res.data || [];
      } else {
        MessagePlugin.warning(res.msg || '获取备份列表失败');
      }
    })
    .catch(() => {
      MessagePlugin.warning('获取备份列表失败');
    })
    .finally(() => {
      rollbackLoading.value = false;
    });
}

function onRollbackSelect(_selectedKeys: any[], context: { selectedRowData: any[] }) {
  rollbackSelected.value = context.selectedRowData[0] || null;
}

function handleConfirmRollback() {
  if (!rollbackSelected.value) return;
  const target = rollbackSelected.value;
  const dia = DialogPlugin.confirm({
    header: '确认回退版本',
    body: `确定将程序回退到版本 ${target.version}？\n回退后服务将自动重启，请耐心等待。`,
    confirmBtn: { theme: 'danger', content: '确认回退' },
    onConfirm: () => {
      isRollbackLoading.value = true;
      DoRollbackApi({ version: target.version })
        .then((res) => {
          if (res.code === 0) {
            MessagePlugin.success(res.msg || '已发起回退，等待重启通知');
            rollbackVisible.value = false;
          } else {
            MessagePlugin.warning(res.msg || '回退失败');
          }
        })
        .catch(() => {
          MessagePlugin.warning('回退请求失败');
        })
        .finally(() => {
          isRollbackLoading.value = false;
        });
      dia.destroy();
    },
  });
}
</script>

<style scoped>
.layout-header {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 0 16px;
}

.header-spacer {
  flex: 1;
}

.header-user-btn {
  max-width: 160px;
}

.version-badge {
  position: absolute;
  top: -6px;
  right: -18px;
  font-size: 10px;
  color: white;
  border-radius: 8px;
  padding: 0 4px;
  line-height: 16px;
  font-weight: bold;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  z-index: 10;
}

.version-badge--beta {
  background: #ff4d4f;
}

.version-badge--new {
  background: #52c41a;
}

/* 微信二维码对话框样式 */
.wechat-qr-container {
  text-align: center;
  padding: 20px;
}

.wechat-qr-container .qr-image-wrapper {
  margin-bottom: 16px;
}

.wechat-qr-container .qr-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
