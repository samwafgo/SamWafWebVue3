<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.notify_channel.button_add') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.notify_channel.label_name')" name="name">
              <t-input v-model="searchformData.name" class="search-input" clearable></t-input>
            </t-form-item>
            <t-form-item :label="t('page.notify_channel.label_type')" name="type">
              <t-select v-model="searchformData.type" clearable :style="{ width: '150px' }">
                <t-option value="dingtalk" :label="t('page.notify_channel.type_dingtalk')"></t-option>
                <t-option value="feishu" :label="t('page.notify_channel.type_feishu')"></t-option>
                <t-option value="email" :label="t('page.notify_channel.type_email')"></t-option>
                <t-option value="serverchan" :label="t('page.notify_channel.type_serverchan')"></t-option>
                <t-option value="wechatwork" :label="t('page.notify_channel.type_wechatwork')"></t-option>
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" @click="getList">{{ t('common.search') }}</t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.notify_channel.alert_message')" close> </t-alert>
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
          <template #type="{ row }">
            <t-tag v-if="row.type === 'dingtalk'" theme="primary">{{ t('page.notify_channel.type_dingtalk') }}</t-tag>
            <t-tag v-else-if="row.type === 'feishu'" theme="success">{{ t('page.notify_channel.type_feishu') }}</t-tag>
            <t-tag v-else-if="row.type === 'email'" theme="warning">{{ t('page.notify_channel.type_email') }}</t-tag>
            <t-tag v-else-if="row.type === 'serverchan'" theme="danger">{{ t('page.notify_channel.type_serverchan') }}</t-tag>
            <t-tag v-else-if="row.type === 'wechatwork'" theme="primary">{{ t('page.notify_channel.type_wechatwork') }}</t-tag>
            <t-tag v-else theme="default">{{ row.type }}</t-tag>
          </template>
          <template #status="{ row }">
            <t-switch v-model="row.status" :custom-value="[1, 0]" @change="handleStatusChange(row)"></t-switch>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleTest(slotProps)">{{ t('page.notify_channel.button_test') }}</a>
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 添加对话框 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="120" @submit="onSubmit">
        <t-form-item :label="t('page.notify_channel.label_name')" name="name">
          <t-input v-model="formData.name" :style="{ width: '480px' }" :placeholder="t('page.notify_channel.name_placeholder')"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.notify_channel.label_type')" name="type">
          <t-select v-model="formData.type" :style="{ width: '480px' }" @change="handleTypeChange">
            <t-option value="dingtalk" :label="t('page.notify_channel.type_dingtalk')"></t-option>
            <t-option value="feishu" :label="t('page.notify_channel.type_feishu')"></t-option>
            <t-option value="email" :label="t('page.notify_channel.type_email')"></t-option>
            <t-option value="serverchan" :label="t('page.notify_channel.type_serverchan')"></t-option>
            <t-option value="wechatwork" :label="t('page.notify_channel.type_wechatwork')"></t-option>
          </t-select>
        </t-form-item>

        <!-- 钉钉、飞书和企业微信配置 -->
        <template v-if="formData.type === 'dingtalk' || formData.type === 'feishu' || formData.type === 'wechatwork'">
          <t-form-item :label="t('page.notify_channel.label_webhook_url')" name="webhook_url">
            <t-input
              v-model="formData.webhook_url"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.webhook_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item v-if="formData.type !== 'wechatwork'" :label="t('page.notify_channel.label_secret')" name="secret">
            <t-input
              v-model="formData.secret"
              :style="{ width: '480px' }"
              type="password"
              :placeholder="t('page.notify_channel.secret_placeholder')"
            ></t-input>
          </t-form-item>
          <t-alert v-if="formData.type === 'wechatwork'" theme="info" style="margin-top: 12px">
            <div style="line-height: 1.8">
              <div style="font-weight: bold; margin-bottom: 8px">📝 如何获取企业微信机器人Webhook：</div>
              <div style="font-size: 12px; color: #666">
                <div>1. 在企业微信群聊中，点击右上角「···」→「添加群机器人」</div>
                <div>2. 选择「新创建一个机器人」，设置机器人名称和头像</div>
                <div>3. 复制生成的Webhook地址到上方输入框</div>
                <div style="margin-top: 8px; color: #e37318">💡 提示：企业微信机器人无需配置密钥</div>
              </div>
            </div>
          </t-alert>
        </template>

        <!-- Server酱配置 -->
        <template v-if="formData.type === 'serverchan'">
          <t-alert theme="info" :message="t('page.notify_channel.serverchan_config_tip')" style="margin-bottom: 16px"></t-alert>

          <t-form-item :label="t('page.notify_channel.serverchan_sendkey')" name="access_token">
            <t-input
              v-model="formData.access_token"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.serverchan_sendkey_placeholder')"
            ></t-input>
          </t-form-item>

          <t-alert theme="warning" style="margin-top: 12px">
            <div style="line-height: 1.8">
              <div style="font-weight: bold; margin-bottom: 8px">📝 如何获取SendKey：</div>
              <div style="font-size: 12px; color: #666">
                <div>
                  1. 访问
                  <a href="https://sct.ftqq.com/" target="_blank" style="color: #0052d9">Server酱官网</a> 并使用微信扫码登录
                </div>
                <div>2. 在控制台页面复制您的SendKey</div>
                <div>3. 在"消息通道"页面配置接收通知的平台（微信、企业微信、钉钉等）</div>
                <div style="margin-top: 8px; color: #e37318">💡 提示：支持标准格式(SCT开头)和sctp私有部署格式</div>
              </div>
            </div>
          </t-alert>
        </template>

        <!-- 邮件配置 -->
        <template v-if="formData.type === 'email'">
          <t-alert theme="info" :message="t('page.notify_channel.email_config_tip')" style="margin-bottom: 16px"></t-alert>

          <!-- 常见邮箱配置参考 -->
          <t-collapse :default-value="[]" style="margin-bottom: 16px">
            <t-collapse-panel :header="t('page.notify_channel.email_common_config')" value="common">
              <email-config-reference />
            </t-collapse-panel>
          </t-collapse>

          <t-form-item :label="t('page.notify_channel.email_smtp_host')" name="email_smtp_host">
            <t-input
              v-model="formData.email_smtp_host"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_smtp_host_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_smtp_port')" name="email_smtp_port">
            <t-input
              v-model="formData.email_smtp_port"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_smtp_port_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_username')" name="email_username">
            <t-input
              v-model="formData.email_username"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_username_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_password')" name="email_password">
            <t-input
              v-model="formData.email_password"
              :style="{ width: '480px' }"
              type="password"
              :placeholder="t('page.notify_channel.email_password_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_from')" name="email_from">
            <t-input
              v-model="formData.email_from"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_from_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_from_name')" name="email_from_name">
            <t-input
              v-model="formData.email_from_name"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_from_name_placeholder')"
            ></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_to')" name="email_to">
            <t-input
              v-model="formData.email_to"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.email_to_placeholder')"
            ></t-input>
            <div style="font-size: 12px; color: #666; margin-top: 4px">
              💡 <b>默认收件人</b>，订阅时可针对消息类型单独配置，未配置则使用此默认值
            </div>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_ssl_mode')" name="email_ssl_mode">
            <t-radio-group v-model="formData.email_ssl_mode">
              <t-radio value="none">{{ t('page.notify_channel.email_ssl_none') }}</t-radio>
              <t-radio value="ssl">{{ t('page.notify_channel.email_ssl_ssl') }}</t-radio>
              <t-radio value="starttls">{{ t('page.notify_channel.email_ssl_starttls') }}</t-radio>
            </t-radio-group>
          </t-form-item>
        </template>
        <t-form-item :label="t('page.notify_channel.label_status')" name="status">
          <t-radio-group v-model="formData.status">
            <t-radio :value="1">{{ t('common.on') }}</t-radio>
            <t-radio :value="0">{{ t('common.off') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formData.remarks" :style="{ width: '480px' }" :autosize="{ minRows: 3, maxRows: 3 }"></t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑对话框 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="120" @submit="onSubmitEdit">
        <t-form-item :label="t('page.notify_channel.label_name')" name="name">
          <t-input v-model="formEditData.name" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.notify_channel.label_type')" name="type">
          <t-select v-model="formEditData.type" :style="{ width: '480px' }" @change="handleEditTypeChange">
            <t-option value="dingtalk" :label="t('page.notify_channel.type_dingtalk')"></t-option>
            <t-option value="feishu" :label="t('page.notify_channel.type_feishu')"></t-option>
            <t-option value="email" :label="t('page.notify_channel.type_email')"></t-option>
            <t-option value="serverchan" :label="t('page.notify_channel.type_serverchan')"></t-option>
            <t-option value="wechatwork" :label="t('page.notify_channel.type_wechatwork')"></t-option>
          </t-select>
        </t-form-item>

        <!-- 钉钉、飞书和企业微信配置 -->
        <template v-if="formEditData.type === 'dingtalk' || formEditData.type === 'feishu' || formEditData.type === 'wechatwork'">
          <t-form-item :label="t('page.notify_channel.label_webhook_url')" name="webhook_url">
            <t-input v-model="formEditData.webhook_url" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item v-if="formEditData.type !== 'wechatwork'" :label="t('page.notify_channel.label_secret')" name="secret">
            <t-input v-model="formEditData.secret" :style="{ width: '480px' }" type="password"></t-input>
          </t-form-item>
          <t-alert v-if="formEditData.type === 'wechatwork'" theme="info" style="margin-top: 12px">
            <div style="line-height: 1.8">
              <div style="font-weight: bold; margin-bottom: 8px">📝 如何获取企业微信机器人Webhook：</div>
              <div style="font-size: 12px; color: #666">
                <div>1. 在企业微信群聊中，点击右上角「···」→「添加群机器人」</div>
                <div>2. 选择「新创建一个机器人」，设置机器人名称和头像</div>
                <div>3. 复制生成的Webhook地址到上方输入框</div>
                <div style="margin-top: 8px; color: #e37318">💡 提示：企业微信机器人无需配置密钥</div>
              </div>
            </div>
          </t-alert>
        </template>

        <!-- Server酱配置 -->
        <template v-if="formEditData.type === 'serverchan'">
          <t-alert theme="info" :message="t('page.notify_channel.serverchan_config_tip')" style="margin-bottom: 16px"></t-alert>

          <t-form-item :label="t('page.notify_channel.serverchan_sendkey')" name="access_token">
            <t-input
              v-model="formEditData.access_token"
              :style="{ width: '480px' }"
              :placeholder="t('page.notify_channel.serverchan_sendkey_placeholder')"
            ></t-input>
          </t-form-item>

          <t-alert theme="warning" style="margin-top: 12px">
            <div style="line-height: 1.8">
              <div style="font-weight: bold; margin-bottom: 8px">📝 如何获取SendKey：</div>
              <div style="font-size: 12px; color: #666">
                <div>
                  1. 访问
                  <a href="https://sct.ftqq.com/" target="_blank" style="color: #0052d9">Server酱官网</a> 并使用微信扫码登录
                </div>
                <div>2. 在控制台页面复制您的SendKey</div>
                <div>3. 在"消息通道"页面配置接收通知的平台（微信、企业微信、钉钉等）</div>
                <div style="margin-top: 8px; color: #e37318">💡 提示：支持标准格式(SCT开头)和sctp私有部署格式</div>
              </div>
            </div>
          </t-alert>
        </template>

        <!-- 邮件配置 -->
        <template v-if="formEditData.type === 'email'">
          <t-alert theme="info" :message="t('page.notify_channel.email_config_tip')" style="margin-bottom: 16px"></t-alert>

          <!-- 常见邮箱配置参考 -->
          <t-collapse :default-value="[]" style="margin-bottom: 16px">
            <t-collapse-panel :header="t('page.notify_channel.email_common_config')" value="common">
              <email-config-reference />
            </t-collapse-panel>
          </t-collapse>

          <t-form-item :label="t('page.notify_channel.email_smtp_host')" name="email_smtp_host">
            <t-input v-model="formEditData.email_smtp_host" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_smtp_port')" name="email_smtp_port">
            <t-input v-model="formEditData.email_smtp_port" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_username')" name="email_username">
            <t-input v-model="formEditData.email_username" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_password')" name="email_password">
            <t-input v-model="formEditData.email_password" :style="{ width: '480px' }" type="password"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_from')" name="email_from">
            <t-input v-model="formEditData.email_from" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_from_name')" name="email_from_name">
            <t-input v-model="formEditData.email_from_name" :style="{ width: '480px' }"></t-input>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_to')" name="email_to">
            <t-input v-model="formEditData.email_to" :style="{ width: '480px' }"></t-input>
            <div style="font-size: 12px; color: #666; margin-top: 4px">
              💡 <b>默认收件人</b>，订阅时可针对消息类型单独配置，未配置则使用此默认值
            </div>
          </t-form-item>
          <t-form-item :label="t('page.notify_channel.email_ssl_mode')" name="email_ssl_mode">
            <t-radio-group v-model="formEditData.email_ssl_mode">
              <t-radio value="none">{{ t('page.notify_channel.email_ssl_none') }}</t-radio>
              <t-radio value="ssl">{{ t('page.notify_channel.email_ssl_ssl') }}</t-radio>
              <t-radio value="starttls">{{ t('page.notify_channel.email_ssl_starttls') }}</t-radio>
            </t-radio-group>
          </t-form-item>
        </template>
        <t-form-item :label="t('page.notify_channel.label_status')" name="status">
          <t-radio-group v-model="formEditData.status">
            <t-radio :value="1">{{ t('common.on') }}</t-radio>
            <t-radio :value="0">{{ t('common.off') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '480px' }" :autosize="{ minRows: 3, maxRows: 3 }"></t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
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
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, PageInfo, TableProps } from 'tdesign-vue-next';

import {
  addNotifyChannel,
  deleteNotifyChannel,
  editNotifyChannel,
  getNotifyChannelList,
  testNotifyChannel,
} from '@/apis/notify_channel';

const { t } = useI18n();

// 常见邮箱配置参考块（添加/编辑弹窗共用）
const EmailConfigReference = defineComponent({
  name: 'EmailConfigReference',
  setup() {
    const box = (title: string, lines: string[]) =>
      h('div', { style: 'padding: 10px; background: #f5f5f5; border-radius: 4px;' }, [
        h('div', { style: 'color: #1976d2; font-weight: bold; margin-bottom: 4px;' }, title),
        h(
          'div',
          { style: 'font-size: 12px; color: #666;' },
          lines.map((line) => h('div', { innerHTML: line })),
        ),
      ]);
    return () =>
      h('div', { style: 'line-height: 1.8;' }, [
        h('div', { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' }, [
          box('⭐ QQ邮箱 (推荐)', ['SMTP: <code>smtp.qq.com</code>', '端口: <code>465</code> | 加密: <strong>SSL/TLS</strong>', '密码: 授权码']),
          box('163邮箱', ['SMTP: <code>smtp.163.com</code>', '端口: <code>465</code> | 加密: <strong>SSL/TLS</strong>', '密码: 授权码']),
          box('126邮箱', ['SMTP: <code>smtp.126.com</code>', '端口: <code>465</code> | 加密: <strong>SSL/TLS</strong>', '密码: 授权码']),
          box('⭐ Gmail', ['SMTP: <code>smtp.gmail.com</code>', '端口: <code>587</code> | 加密: <strong>STARTTLS</strong>', '密码: 应用专用密码']),
          box('Outlook/Hotmail', ['SMTP: <code>smtp.office365.com</code>', '端口: <code>587</code> | 加密: <strong>STARTTLS</strong>']),
          box('阿里云邮箱', ['SMTP: <code>smtp.aliyun.com</code>', '端口: <code>465</code> | 加密: <strong>SSL/TLS</strong>']),
        ]),
        h(
          'div',
          { style: 'margin-top: 16px; padding: 10px; background: #fff3e0; border-left: 3px solid #ff9800; border-radius: 4px;' },
          [
            h('div', { style: 'color: #e65100; font-weight: bold; margin-bottom: 8px;' }, '⚠️ 重要提示：'),
            h('div', { style: 'color: #666; font-size: 12px; line-height: 1.8;' }, [
              h('div', {
                innerHTML: '• 大多数邮箱需要先开启SMTP服务并生成<strong style="color: #d32f2f;">授权码</strong>（不是登录密码）',
              }),
              h('div', {
                innerHTML: '• <strong>QQ/163邮箱</strong>：网页版邮箱 → 设置 → 账户 → POP3/SMTP/IMAP → 开启服务 → 生成授权码',
              }),
              h('div', {
                innerHTML: '• <strong>Gmail</strong>：Google账户 → 安全性 → 两步验证（必须开启）→ 应用专用密码',
              }),
              h('div', {
                style: 'margin-top: 6px; color: #2196f3;',
                innerHTML: '💡 推荐配置：<strong>端口465+SSL/TLS</strong> 或 <strong>端口587+STARTTLS</strong>',
              }),
            ]),
          ],
        ),
      ]);
  },
});

const INITIAL_DATA = {
  name: '',
  type: 'dingtalk',
  webhook_url: '',
  secret: '',
  access_token: '',
  config_json: '',
  status: 1,
  remarks: '',
  // 邮件配置字段
  email_smtp_host: '',
  email_smtp_port: '25',
  email_username: '',
  email_password: '',
  email_from: '',
  email_from_name: '',
  email_to: '',
  email_ssl_mode: 'none',
};

const data = ref<Record<string, any>[]>([]);
const dataLoading = ref(false);
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 50, fixed: 'left' },
  { title: t('page.notify_channel.label_name'), colKey: 'name', width: 150 },
  { title: t('page.notify_channel.label_type'), colKey: 'type', width: 120 },
  { title: t('page.notify_channel.label_webhook_url'), colKey: 'webhook_url', ellipsis: true },
  { title: t('page.notify_channel.label_status'), colKey: 'status', width: 100 },
  { title: t('common.remarks'), colKey: 'remarks', ellipsis: true, width: 200 },
  { title: t('common.create_time'), colKey: 'create_time', width: 180 },
  { align: 'left', fixed: 'right', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  pageSize: 20,
  total: 0,
  current: 1,
});

const searchformData = reactive({
  pageIndex: 1,
  pageSize: 20,
  name: '',
  type: '',
});

const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  name: [{ required: true, message: t('common.required'), type: 'error' }],
  type: [{ required: true, message: t('common.required'), type: 'error' }],
  webhook_url: [{ required: true, message: t('common.required'), type: 'error' }],
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const confirmBody = ref('');

onMounted(() => {
  getList();
});

async function getList() {
  dataLoading.value = true;
  try {
    const res = await getNotifyChannelList(searchformData);
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

function rehandlePageChange(pageInfo: PageInfo) {
  searchformData.pageIndex = pageInfo.current;
  searchformData.pageSize = pageInfo.pageSize;
  getList();
}

function handleAdd() {
  formData.value = { ...INITIAL_DATA };
  addFormVisible.value = true;
}

function handleClickEdit(e: { row: Record<string, any> }) {
  const row = { ...e.row };
  // 如果是邮件类型，解析config_json
  if (row.type === 'email' && row.config_json) {
    try {
      const config = JSON.parse(row.config_json);
      row.email_smtp_host = config.smtp_host || '';
      row.email_smtp_port = config.smtp_port || '25';
      row.email_username = config.username || '';
      row.email_password = config.password || '';
      row.email_from = config.from_email || '';
      row.email_from_name = config.from_name || '';
      row.email_to = (config.to_emails || []).join(',');
      // eslint-disable-next-line no-nested-ternary
      row.email_ssl_mode = config.enable_ssl ? 'ssl' : config.enable_starttls ? 'starttls' : 'none';
    } catch (err) {
      console.error('解析邮件配置失败', err);
    }
  }
  formEditData.value = row;
  editFormVisible.value = true;
}

function handleClickDelete(e: { row: Record<string, any> }) {
  formEditData.value = { ...e.row };
  confirmBody.value = t('page.notify_channel.delete_confirm');
  confirmVisible.value = true;
}

async function handleTest(e: { row: Record<string, any> }) {
  try {
    const res = await testNotifyChannel({ id: e.row.id });
    if (res.code === 0) {
      MessagePlugin.success(t('page.notify_channel.test_success'));
    } else {
      MessagePlugin.error(`${t('page.notify_channel.test_failed')}: ${res.msg}`);
    }
  } catch (error) {
    MessagePlugin.error(t('page.notify_channel.test_failed'));
  }
}

async function handleStatusChange(row: Record<string, any>) {
  try {
    const res = await editNotifyChannel(row);
    if (res.code === 0) {
      MessagePlugin.success(t('common.tips.save_success'));
    } else {
      row.status = row.status === 1 ? 0 : 1;
      MessagePlugin.error(t('common.tips.save_failed'));
    }
  } catch (error) {
    row.status = row.status === 1 ? 0 : 1;
    MessagePlugin.error(t('common.tips.save_failed'));
  }
}

// 邮件/Server酱类型提交前整理 config_json 与互斥字段
function normalizeSubmitData(source: Record<string, any>) {
  const submitData = { ...source };
  if (submitData.type === 'email') {
    const emailConfig = {
      smtp_host: submitData.email_smtp_host,
      smtp_port: submitData.email_smtp_port,
      username: submitData.email_username,
      password: submitData.email_password,
      from_email: submitData.email_from,
      from_name: submitData.email_from_name,
      to_emails: (submitData.email_to || '').split(',').map((email: string) => email.trim()),
      enable_ssl: submitData.email_ssl_mode === 'ssl',
      enable_starttls: submitData.email_ssl_mode === 'starttls',
    };
    submitData.config_json = JSON.stringify(emailConfig);
    submitData.webhook_url = '';
    submitData.secret = '';
  } else if (submitData.type === 'serverchan') {
    // Server酱使用access_token存储SendKey
    submitData.webhook_url = '';
    submitData.secret = '';
    submitData.config_json = '';
  }
  return submitData;
}

const onSubmit: FormProps['onSubmit'] = async ({ validateResult, firstError }) => {
  if (validateResult === true) {
    try {
      const res = await addNotifyChannel(normalizeSubmitData(formData.value));
      if (res.code === 0) {
        MessagePlugin.success(t('page.notify_channel.add_success'));
        addFormVisible.value = false;
        getList();
      } else {
        MessagePlugin.error(res.msg || t('page.notify_channel.add_failed'));
      }
    } catch (error) {
      MessagePlugin.error(t('page.notify_channel.add_failed'));
    }
  } else {
    MessagePlugin.warning(firstError || '');
  }
};

const onSubmitEdit: FormProps['onSubmit'] = async ({ validateResult, firstError }) => {
  if (validateResult === true) {
    try {
      const res = await editNotifyChannel(normalizeSubmitData(formEditData.value));
      if (res.code === 0) {
        MessagePlugin.success(t('page.notify_channel.edit_success'));
        editFormVisible.value = false;
        getList();
      } else {
        MessagePlugin.error(res.msg || t('page.notify_channel.edit_failed'));
      }
    } catch (error) {
      MessagePlugin.error(t('page.notify_channel.edit_failed'));
    }
  } else {
    MessagePlugin.warning(firstError || '');
  }
};

async function onConfirmDelete() {
  try {
    const res = await deleteNotifyChannel({ id: formEditData.value.id });
    if (res.code === 0) {
      MessagePlugin.success(t('page.notify_channel.delete_success'));
      confirmVisible.value = false;
      getList();
    } else {
      MessagePlugin.error(res.msg || t('page.notify_channel.delete_failed'));
    }
  } catch (error) {
    MessagePlugin.error(t('page.notify_channel.delete_failed'));
  }
}

function onCancel() {
  confirmVisible.value = false;
}

function onClickCloseBtn() {
  addFormVisible.value = false;
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
}

// 切换类型时清空相关字段
function resetTypeFields(target: Record<string, any>, value: string) {
  if (value === 'email') {
    target.webhook_url = '';
    target.secret = '';
    target.access_token = '';
  } else if (value === 'serverchan') {
    target.webhook_url = '';
    target.secret = '';
    target.email_smtp_host = '';
    target.email_smtp_port = '25';
    target.email_username = '';
    target.email_password = '';
    target.email_from = '';
    target.email_from_name = '';
    target.email_to = '';
    target.email_ssl_mode = 'none';
  } else {
    target.access_token = '';
    target.email_smtp_host = '';
    target.email_smtp_port = '25';
    target.email_username = '';
    target.email_password = '';
    target.email_from = '';
    target.email_from_name = '';
    target.email_to = '';
    target.email_ssl_mode = 'none';
  }
}

function handleTypeChange(value: any) {
  resetTypeFields(formData.value, value as string);
}

function handleEditTypeChange(value: any) {
  resetTypeFields(formEditData.value, value as string);
}
</script>

<style scoped>
.list-card-container {
  padding: 16px;
}

.table-container {
  margin-top: 16px;
}

.search-input {
  width: 200px;
}

.left-operation-container .t-button {
  margin-right: 8px;
}
</style>
