<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.access.account.button_add') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.access.account.label_name')" name="account_name">
              <t-input v-model="searchformData.account_name" class="search-input" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.access.account.alert_message')" close />
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
          <template #status="{ row }">
            <t-tag v-if="row.status === 1" theme="success" variant="light">
              {{ t('page.access.account.status_enable') }}
            </t-tag>
            <t-tag v-else theme="danger" variant="light">{{ t('page.access.account.status_disable') }}</t-tag>
          </template>
          <template #otp_bound="{ row }">
            <t-tag v-if="row.otp_bound === 1" theme="primary" variant="light">
              {{ t('page.access.account.otp_bound') }}
            </t-tag>
            <span v-else>-</span>
          </template>
          <template #allow_host_codes="{ row }">
            <t-tag v-if="!row.allow_host_codes" theme="primary" variant="light">
              {{ t('page.access.account.all_hosts') }}
            </t-tag>
            <t-tooltip v-else :content="hostNames(row.allow_host_codes)">
              <t-tag theme="warning" variant="light">{{ countLines(row.allow_host_codes) }}</t-tag>
            </t-tooltip>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleEdit(slotProps.row)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleResetPwd(slotProps.row)">
              {{ t('page.access.account.button_resetpwd') }}
            </a>
            <a class="t-button-link" @click="handleOtp(slotProps.row)">{{ t('page.access.account.button_otp') }}</a>
            <a class="t-button-link" @click="handleKick(slotProps.row)">{{ t('page.access.account.button_kick') }}</a>
            <a class="t-button-link" @click="handleDelete(slotProps.row)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新增 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="700" :footer="false">
      <!-- autocomplete 必须显式关掉。
           浏览器看到「文本框 + 紧跟着的密码框」就认定这是登录表单，会把保存的
           **管理端 admin 账号密码**填进来；用户不留神点了确定，就凭空多出一个
           与管理员同名同密码、而且是公网可登录的访客账号。
           Chrome 只认 new-password（off 对密码框无效），所以两个都得给。 -->
      <t-form :data="formData" :rules="addRules" :label-width="120" autocomplete="off" @submit="onSubmitAdd">
        <t-form-item :label="t('page.access.account.label_name')" name="account_name">
          <t-input v-model="formData.account_name" :style="{ width: '460px' }" autocomplete="off" />
          <div class="form-tips">{{ t('page.access.account.name_immutable_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_password')" name="password">
          <t-input v-model="formData.password" type="password" :style="{ width: '460px' }" autocomplete="new-password" />
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_nickname')" name="nick_name">
          <t-input v-model="formData.nick_name" :style="{ width: '460px' }" />
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_status')" name="status">
          <t-radio-group v-model="formData.status">
            <t-radio :value="1">{{ t('page.access.account.status_enable') }}</t-radio>
            <t-radio :value="0">{{ t('page.access.account.status_disable') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_force_otp')" name="force_otp">
          <t-radio-group v-model="formData.force_otp">
            <t-radio :value="0">{{ t('page.access.mode_inherit') }}</t-radio>
            <t-radio :value="1">{{ t('page.access.account.otp_force') }}</t-radio>
            <t-radio :value="2">{{ t('page.access.account.otp_exempt') }}</t-radio>
          </t-radio-group>
          <div class="form-tips">{{ t('page.access.account.force_otp_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_allow_hosts')" name="allow_host_codes">
          <t-select
            v-model="addAllowHosts"
            :style="{ width: '460px' }"
            multiple
            filterable
            clearable
            :placeholder="t('page.access.account.allow_hosts_placeholder')"
          >
            <t-option v-for="h in hostOptions" :key="h.value" :value="h.value" :label="h.label" />
          </t-select>
          <div class="form-tips">{{ t('page.access.account.allow_hosts_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_expire')" name="expire_time">
          <t-date-picker
            v-model="formData.expire_time"
            :style="{ width: '460px' }"
            enable-time-picker
            clearable
            format="YYYY-MM-DD HH:mm:ss"
            value-type="YYYY-MM-DD HH:mm:ss"
            :placeholder="t('page.access.account.expire_placeholder')"
          />
          <div class="form-tips">{{ t('page.access.account.expire_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formData.remarks" :style="{ width: '460px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="addFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑：登录名不可改 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="700" :footer="false">
      <t-form :data="formEditData" :label-width="120" @submit="onSubmitEdit">
        <t-form-item :label="t('page.access.account.label_name')">
          <t-input :value="formEditData.account_name" :style="{ width: '460px' }" disabled />
          <div class="form-tips">{{ t('page.access.account.name_immutable_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_nickname')" name="nick_name">
          <t-input v-model="formEditData.nick_name" :style="{ width: '460px' }" />
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_status')" name="status">
          <t-radio-group v-model="formEditData.status">
            <t-radio :value="1">{{ t('page.access.account.status_enable') }}</t-radio>
            <t-radio :value="0">{{ t('page.access.account.status_disable') }}</t-radio>
          </t-radio-group>
          <div class="form-tips">{{ t('page.access.account.disable_kick_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_force_otp')" name="force_otp">
          <t-radio-group v-model="formEditData.force_otp">
            <t-radio :value="0">{{ t('page.access.mode_inherit') }}</t-radio>
            <t-radio :value="1">{{ t('page.access.account.otp_force') }}</t-radio>
            <t-radio :value="2">{{ t('page.access.account.otp_exempt') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_allow_hosts')" name="allow_host_codes">
          <t-select
            v-model="editAllowHosts"
            :style="{ width: '460px' }"
            multiple
            filterable
            clearable
            :placeholder="t('page.access.account.allow_hosts_placeholder')"
          >
            <t-option v-for="h in hostOptions" :key="h.value" :value="h.value" :label="h.label" />
          </t-select>
          <div class="form-tips">{{ t('page.access.account.allow_hosts_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('page.access.account.label_expire')" name="expire_time">
          <t-date-picker
            v-model="formEditData.expire_time"
            :style="{ width: '460px' }"
            enable-time-picker
            clearable
            format="YYYY-MM-DD HH:mm:ss"
            value-type="YYYY-MM-DD HH:mm:ss"
            :placeholder="t('page.access.account.expire_placeholder')"
          />
          <div class="form-tips">{{ t('page.access.account.expire_tips') }}</div>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '460px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="editFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 重置密码 -->
    <t-dialog
      v-model:visible="resetPwdVisible"
      :header="t('page.access.account.button_resetpwd')"
      :width="600"
      :footer="false"
    >
      <t-alert theme="warning" :message="t('page.access.account.resetpwd_warning')" />
      <t-form :data="resetPwdData" :rules="resetRules" :label-width="120" autocomplete="off" @submit="onSubmitResetPwd">
        <t-form-item :label="t('page.access.account.label_new_password')" name="password">
          <t-input
            v-model="resetPwdData.password"
            type="password"
            :style="{ width: '380px' }"
            autocomplete="new-password"
          />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="resetPwdVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 二次验证绑定 -->
    <t-dialog v-model:visible="otpVisible" :header="t('page.access.account.button_otp')" :width="600" :footer="false">
      <div v-if="currentAccount.otp_bound === 1">
        <t-alert theme="success" :message="t('page.access.account.otp_already_bound')" />
        <div style="text-align: right; margin-top: 16px">
          <t-button variant="outline" @click="otpVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="danger" @click="onOtpUnbind">{{ t('page.access.account.button_otp_unbind') }}</t-button>
        </div>
      </div>
      <div v-else>
        <t-alert theme="info" :message="t('page.access.account.otp_bind_tips')" />
        <div style="text-align: center; margin: 20px 0">
          <qrcode-vue v-if="otpData.url" :value="otpData.url" :size="200" level="H" />
        </div>
        <t-form :data="otpData" :label-width="120" @submit="onOtpBind">
          <t-form-item :label="t('page.access.account.label_otp_secret')">
            <t-input :value="otpData.secret" :style="{ width: '380px' }" readonly />
          </t-form-item>
          <t-form-item :label="t('page.access.account.label_otp_code')" name="code">
            <t-input v-model="otpData.code" :style="{ width: '380px' }" maxlength="6" placeholder="000000" />
          </t-form-item>
          <t-form-item style="float: right">
            <t-button variant="outline" @click="otpVisible = false">{{ t('common.close') }}</t-button>
            <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>

    <t-dialog
      v-model:visible="delConfirmVisible"
      :header="t('common.confirm_delete')"
      :body="t('page.access.account.delete_warning')"
      @confirm="onConfirmDelete"
    />

    <t-dialog
      v-model:visible="kickConfirmVisible"
      :header="t('page.access.account.button_kick')"
      :body="t('page.access.account.kick_confirm')"
      @confirm="onConfirmKick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import QrcodeVue from 'qrcode.vue';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import {
  wafAccessAccountListApi,
  wafAccessAccountAddApi,
  wafAccessAccountEditApi,
  wafAccessAccountDelApi,
  wafAccessAccountResetPwdApi,
  wafAccessAccountOtpInitApi,
  wafAccessAccountOtpBindApi,
  wafAccessAccountOtpUnbindApi,
  wafAccessSessionKickByAccountApi,
} from '@/apis/access';
import { allhost } from '@/apis/host';

// 授权站点在库里是「换行分隔的站点唯一码」，界面上必须是站点名的多选。
// 这两个函数是这层翻译的全部：拆行 → 数组，数组 → 拆行。
const splitHostCodes = (raw: any): string[] =>
  String(raw || '')
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter((x) => x !== '');
const joinHostCodes = (arr: string[]) => (arr || []).join('\n');

const INITIAL_ACCOUNT = {
  account_name: '',
  password: '',
  nick_name: '',
  status: 1,
  force_otp: 0,
  allow_host_codes: '',
  expire_time: '',
  remarks: '',
};

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({ account_name: '' });

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const resetPwdVisible = ref(false);
const otpVisible = ref(false);
const delConfirmVisible = ref(false);
const kickConfirmVisible = ref(false);
const pendingId = ref('');

const formData = ref<Record<string, any>>({ ...INITIAL_ACCOUNT });
const formEditData = ref<Record<string, any>>({ id: '', ...INITIAL_ACCOUNT });
const resetPwdData = ref<Record<string, any>>({ id: '', password: '' });
const otpData = ref<Record<string, any>>({ id: '', secret: '', url: '', code: '' });
const currentAccount = ref<Record<string, any>>({ id: '', account_name: '', otp_bound: 0 });

// 多选框绑数组，提交前再拼回换行串
const addAllowHosts = ref<string[]>([]);
const editAllowHosts = ref<string[]>([]);
const hostOptions = ref<Record<string, any>[]>([]);

const addRules: FormProps['rules'] = {
  account_name: [
    { required: true, message: t('common.placeholder') + t('page.access.account.label_name'), type: 'error' },
  ],
  password: [{ required: true, message: t('common.placeholder') + t('page.access.account.label_password'), type: 'error' }],
};
const resetRules: FormProps['rules'] = {
  password: [
    { required: true, message: t('common.placeholder') + t('page.access.account.label_new_password'), type: 'error' },
  ],
};

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.access.account.label_name'), align: 'left', width: 160, ellipsis: true, colKey: 'account_name' },
  { title: t('page.access.account.label_nickname'), width: 140, ellipsis: true, colKey: 'nick_name' },
  { title: t('page.access.account.label_status'), width: 90, colKey: 'status' },
  { title: t('page.access.account.col_otp'), width: 90, colKey: 'otp_bound' },
  { title: t('page.access.account.label_allow_hosts'), width: 120, colKey: 'allow_host_codes' },
  { title: t('page.access.account.col_last_login'), width: 170, ellipsis: true, colKey: 'last_login_time' },
  { title: t('page.access.account.col_last_login_ip'), width: 140, ellipsis: true, colKey: 'last_login_ip' },
  { title: t('common.remarks'), width: 160, ellipsis: true, colKey: 'remarks' },
  { align: 'left', width: 300, colKey: 'op', title: t('common.op') },
]);

function getHostOptions() {
  allhost()
    .then((res) => {
      if (res.code === 0) {
        hostOptions.value = res.data ?? [];
      }
    })
    .catch(() => {
      /* 取不到站点列表时多选框为空，不影响其它字段 */
    });
}

function countLines(raw: any) {
  if (!raw) return '';
  return t('page.access.account.limited_hosts').replace('{n}', String(splitHostCodes(raw).length));
}

// 把库里的短码翻译成站点名给人看。站点被删时后端会同步摘掉短码，
// 这里的兜底只是为了老数据不至于显示成一片空白。
function hostNames(raw: any) {
  return splitHostCodes(raw)
    .map((code) => {
      const hit = hostOptions.value.find((h) => h.value === code);
      return hit ? hit.label : `${t('page.access.account.host_deleted')}(${code})`;
    })
    .join('\n');
}

function getList() {
  dataLoading.value = true;
  wafAccessAccountListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    account_name: searchformData.account_name,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
  getList();
}

function handleAdd() {
  formData.value = { ...INITIAL_ACCOUNT };
  addAllowHosts.value = [];
  addFormVisible.value = true;
}

function onSubmitAdd({ firstError }: { firstError?: string }) {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  wafAccessAccountAddApi({ ...formData.value, allow_host_codes: joinHostCodes(addAllowHosts.value) }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      addFormVisible.value = false;
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

// 后端返回的零值时间会是 0001-01-01 之类，回填成空串表示"永不过期"
function normalizeTime(v: any) {
  if (!v) return '';
  const s = String(v);
  if (s.startsWith('0001-') || s.startsWith('0000-')) return '';
  return s;
}

function handleEdit(row: Record<string, any>) {
  formEditData.value = {
    id: row.id,
    account_name: row.account_name,
    password: '',
    nick_name: row.nick_name,
    status: row.status,
    force_otp: row.force_otp ?? 0,
    allow_host_codes: row.allow_host_codes ?? '',
    expire_time: normalizeTime(row.expire_time),
    remarks: row.remarks,
  };
  editAllowHosts.value = splitHostCodes(row.allow_host_codes);
  editFormVisible.value = true;
}

function onSubmitEdit({ firstError }: { firstError?: string }) {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  wafAccessAccountEditApi({ ...formEditData.value, allow_host_codes: joinHostCodes(editAllowHosts.value) }).then(
    (res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        editFormVisible.value = false;
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    },
  );
}

function handleResetPwd(row: Record<string, any>) {
  resetPwdData.value = { id: row.id, password: '' };
  resetPwdVisible.value = true;
}

function onSubmitResetPwd({ firstError }: { firstError?: string }) {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  wafAccessAccountResetPwdApi({ ...resetPwdData.value }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      resetPwdVisible.value = false;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function handleOtp(row: Record<string, any>) {
  currentAccount.value = { id: row.id, account_name: row.account_name, otp_bound: row.otp_bound };
  otpData.value = { id: row.id, secret: '', url: '', code: '' };
  if (row.otp_bound === 1) {
    otpVisible.value = true;
    return;
  }
  wafAccessAccountOtpInitApi({ id: row.id }).then((res) => {
    if (res.code === 0) {
      otpData.value = { id: row.id, secret: res.data.secret, url: res.data.url, code: '' };
      otpVisible.value = true;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function onOtpBind() {
  wafAccessAccountOtpBindApi({
    id: otpData.value.id,
    secret: otpData.value.secret,
    code: otpData.value.code,
  }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      otpVisible.value = false;
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function onOtpUnbind() {
  wafAccessAccountOtpUnbindApi({ id: currentAccount.value.id }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      otpVisible.value = false;
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function handleKick(row: Record<string, any>) {
  pendingId.value = row.id;
  kickConfirmVisible.value = true;
}

function onConfirmKick() {
  wafAccessSessionKickByAccountApi({ account_id: pendingId.value }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
    } else {
      MessagePlugin.warning(res.msg);
    }
    kickConfirmVisible.value = false;
  });
}

function handleDelete(row: Record<string, any>) {
  pendingId.value = row.id;
  delConfirmVisible.value = true;
}

function onConfirmDelete() {
  wafAccessAccountDelApi({ id: pendingId.value }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getList();
    } else {
      MessagePlugin.warning(res.msg);
    }
    delConfirmVisible.value = false;
  });
}

onMounted(() => {
  getHostOptions();
  getList();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.search-input {
  width: 200px;
}

.form-tips {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
</style>
