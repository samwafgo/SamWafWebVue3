<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.oplatform.new_key') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.oplatform.key_name')" name="key_name">
              <t-input v-model="searchformData.key_name" style="width: 200px" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          row-key="id"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
        >
          <template #api_key="slotProps">
            <span>{{ slotProps.row.api_key }}</span>
          </template>
          <template #status="slotProps">
            <t-tag :theme="slotProps.row.status === 1 ? 'success' : 'danger'">
              {{ slotProps.row.status === 1 ? t('page.oplatform.status_enabled') : t('page.oplatform.status_disabled') }}
            </t-tag>
          </template>
          <template #rate_limit="slotProps">
            {{
              slotProps.row.rate_limit > 0
                ? slotProps.row.rate_limit + ' ' + t('page.oplatform.per_minute')
                : t('page.oplatform.no_limit')
            }}
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleToggleStatus(slotProps)">
              {{ slotProps.row.status === 1 ? t('page.oplatform.disable') : t('page.oplatform.enable') }}
            </a>
            <a class="t-button-link" @click="handleResetSecret(slotProps)">{{ t('page.oplatform.reset_key') }}</a>
            <a class="t-button-link" style="color: #e34d59" @click="handleDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新增 Key 对话框 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('page.oplatform.new_key')" :width="580" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="120" @submit="onSubmitAdd">
        <t-form-item :label="t('page.oplatform.key_name')" name="key_name">
          <t-input v-model="formData.key_name" :style="{ width: '380px' }" :placeholder="t('page.oplatform.key_name_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.rate_limit')" name="rate_limit">
          <t-input-number
            v-model="formData.rate_limit"
            :style="{ width: '380px' }"
            :min="0"
            :placeholder="t('page.oplatform.rate_limit_tip')"
          />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.ip_whitelist')" name="ip_whitelist">
          <t-input
            v-model="formData.ip_whitelist"
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.ip_whitelist_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.expire_time')" name="expire_time">
          <t-input
            v-model="formData.expire_time"
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.expire_time_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remark">
          <t-textarea v-model="formData.remark" :style="{ width: '380px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="addFormVisible = false">{{ t('common.cancel') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑 Key 对话框 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="580" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="120" @submit="onSubmitEdit">
        <t-form-item :label="t('page.oplatform.key_name')" name="key_name">
          <t-input v-model="formEditData.key_name" :style="{ width: '380px' }" />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.status')" name="status">
          <t-radio-group v-model="formEditData.status">
            <t-radio :value="1">{{ t('page.oplatform.status_enabled') }}</t-radio>
            <t-radio :value="0">{{ t('page.oplatform.status_disabled') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.rate_limit')" name="rate_limit">
          <t-input-number v-model="formEditData.rate_limit" :style="{ width: '380px' }" :min="0" />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.ip_whitelist')" name="ip_whitelist">
          <t-input
            v-model="formEditData.ip_whitelist"
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.ip_whitelist_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.expire_time')" name="expire_time">
          <t-input
            v-model="formEditData.expire_time"
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.expire_time_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remark">
          <t-textarea v-model="formEditData.remark" :style="{ width: '380px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="editFormVisible = false">{{ t('common.cancel') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 新建/重置 Key 结果对话框 -->
    <t-dialog
      v-model:visible="secretDialogVisible"
      :header="secretDialogTitle"
      :width="520"
      :cancel-btn="null"
      @confirm="secretDialogVisible = false"
    >
      <t-alert theme="warning" :message="t('page.oplatform.key_once_warning')" style="margin-bottom: 16px" />
      <t-form :label-width="120">
        <t-form-item label="API Key">
          <t-input v-model="newSecret" readonly :style="{ width: '300px' }">
            <template #suffix>
              <t-button size="small" variant="text" @click="copyText(newSecret)">{{ t('page.oplatform.copy') }}</t-button>
            </template>
          </t-input>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 删除确认对话框 -->
    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.delete')"
      :width="400"
      @confirm="onConfirmDelete"
      @cancel="confirmVisible = false"
    >
      <div>{{ t('page.oplatform.delete_confirm') }}</div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, PageInfo, TableProps } from 'tdesign-vue-next';

import {
  oplatform_key_add_api,
  oplatform_key_del_api,
  oplatform_key_detail_api,
  oplatform_key_edit_api,
  oplatform_key_list_api,
  oplatform_key_reset_secret_api,
} from '@/apis/oplatform';

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});
const searchformData = reactive({
  key_name: '',
});

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'key_name', title: t('page.oplatform.key_name'), width: 150 },
  { colKey: 'api_key', title: 'API Key', width: 240 },
  { colKey: 'status', title: t('page.oplatform.status'), width: 100 },
  { colKey: 'rate_limit', title: t('page.oplatform.rate_limit'), width: 120 },
  { colKey: 'ip_whitelist', title: t('page.oplatform.ip_whitelist'), width: 160, ellipsis: true },
  { colKey: 'call_count', title: t('page.oplatform.call_count'), width: 100 },
  { colKey: 'last_use_time', title: t('page.oplatform.last_use_time'), width: 160 },
  { colKey: 'expire_time', title: t('page.oplatform.expire_time'), width: 150 },
  { colKey: 'op', title: t('common.operation'), width: 260, fixed: 'right' },
]);

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const secretDialogVisible = ref(false);
const confirmVisible = ref(false);
const confirmDeleteId = ref('');
const newSecret = ref('');
const secretDialogTitle = ref('');
const formData = ref<Record<string, any>>({
  key_name: '',
  remark: '',
  rate_limit: 0,
  ip_whitelist: '',
  expire_time: '',
});
const formEditData = ref<Record<string, any>>({
  id: '',
  key_name: '',
  status: 1,
  remark: '',
  rate_limit: 0,
  ip_whitelist: '',
  expire_time: '',
});

const rules: FormProps['rules'] = {
  key_name: [{ required: true, message: t('page.oplatform.key_name_required'), type: 'error' }],
};

onMounted(() => {
  getList();
});

function getList() {
  dataLoading.value = true;
  oplatform_key_list_api({
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
    key_name: searchformData.key_name,
  })
    .then((res) => {
      dataLoading.value = false;
      if (res && res.code === 0) {
        data.value = res.data.list || [];
        pagination.total = res.data.total;
      }
    })
    .catch(() => {
      dataLoading.value = false;
    });
}

function handleAdd() {
  formData.value = { key_name: '', remark: '', rate_limit: 0, ip_whitelist: '', expire_time: '' };
  addFormVisible.value = true;
}

const onSubmitAdd: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult !== true) return;
  oplatform_key_add_api(formData.value).then((res) => {
    if (res && res.code === 0) {
      addFormVisible.value = false;
      newSecret.value = res.data.api_key;
      secretDialogTitle.value = t('page.oplatform.new_key_created');
      secretDialogVisible.value = true;
      getList();
    } else {
      MessagePlugin.error(res ? res.msg : t('page.oplatform.add_fail'));
    }
  });
};

function handleEdit(slotProps: { row: Record<string, any> }) {
  const { row } = slotProps;
  oplatform_key_detail_api({ id: row.id }).then((res) => {
    if (res && res.code === 0) {
      const d = res.data;
      formEditData.value = {
        id: d.id,
        key_name: d.key_name,
        status: d.status,
        remark: d.remark,
        rate_limit: d.rate_limit,
        ip_whitelist: d.ip_whitelist,
        expire_time: d.expire_time,
      };
      editFormVisible.value = true;
    }
  });
}

const onSubmitEdit: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult !== true) return;
  oplatform_key_edit_api(formEditData.value).then((res) => {
    if (res && res.code === 0) {
      MessagePlugin.success(t('page.oplatform.edit_success'));
      editFormVisible.value = false;
      getList();
    } else {
      MessagePlugin.error(res ? res.msg : t('page.oplatform.edit_fail'));
    }
  });
};

function handleToggleStatus(slotProps: { row: Record<string, any> }) {
  const { row } = slotProps;
  const newStatus = row.status === 1 ? 0 : 1;
  oplatform_key_edit_api({
    id: row.id,
    key_name: row.key_name,
    status: newStatus,
    remark: row.remark,
    rate_limit: row.rate_limit,
    ip_whitelist: row.ip_whitelist,
    expire_time: row.expire_time,
  }).then((res) => {
    if (res && res.code === 0) {
      MessagePlugin.success(newStatus === 1 ? t('page.oplatform.enable_success') : t('page.oplatform.disable_success'));
      getList();
    }
  });
}

function handleResetSecret(slotProps: { row: Record<string, any> }) {
  oplatform_key_reset_secret_api({ id: slotProps.row.id }).then((res) => {
    if (res && res.code === 0) {
      newSecret.value = res.data.api_key;
      secretDialogTitle.value = t('page.oplatform.reset_key');
      secretDialogVisible.value = true;
      getList();
    }
  });
}

function handleDelete(slotProps: { row: Record<string, any> }) {
  confirmDeleteId.value = slotProps.row.id;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  oplatform_key_del_api({ id: confirmDeleteId.value }).then((res) => {
    if (res && res.code === 0) {
      MessagePlugin.success(t('page.oplatform.delete_success'));
      getList();
    }
  });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
  getList();
}

function copyText(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      MessagePlugin.success(t('page.oplatform.copy_success'));
    })
    .catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      MessagePlugin.success(t('page.oplatform.copy_success'));
    });
}
</script>

<style scoped>
.list-card-container {
  padding: 16px;
}

.left-operation-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.right-operation-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
</style>
