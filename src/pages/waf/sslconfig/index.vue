<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button theme="success" @click="handleAddSslConfig">{{ t('common.new') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.ssl.label_domains')" name="domains">
              <t-input v-model="searchformData.domains" class="search-input" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.ssl.alert_message')" close>
        <template #operation>
          <span @click="handleJumpOnlineUrl">{{ t('common.online_document') }}</span>
        </template>
      </t-alert>
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
          <template #bind_hosts="{ row }">
            <span>{{ row.bind_hosts && row.bind_hosts.length > 0 ? row.bind_hosts.join(', ') : '-' }}</span>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="750" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="220" @submit="onSubmit">
        <t-form-item :label="t('page.ssl.label_cert_content')" name="cert_content">
          <div>
            <t-textarea v-model="formData.cert_content" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
            <t-button theme="default" size="small" :style="{ marginTop: '8px' }" @click="importCertFile('add')">
              {{ t('page.ssl.import_cert_file') }}
            </t-button>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.ssl.label_key_content')" name="key_content">
          <div>
            <t-textarea v-model="formData.key_content" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
            <t-button theme="default" size="small" :style="{ marginTop: '8px' }" @click="importKeyFile('add')">
              {{ t('page.ssl.import_key_file') }}
            </t-button>
          </div>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="addFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="750" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="220" @submit="onSubmitEdit">
        <t-form-item :label="t('page.ssl.label_valid_to')" name="valid_to">
          <span>{{ formEditData.valid_to }} ({{ formEditData.expiration_info }})</span>
        </t-form-item>
        <t-form-item v-if="formEditData.bind_hosts && formEditData.bind_hosts.length > 0" :label="t('page.ssl.label_bind_hosts')" name="bind_hosts">
          <div>
            <div v-for="(host, index) in formEditData.bind_hosts" :key="index" style="margin-bottom: 4px">
              {{ host }}
            </div>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.ssl.label_cert_content')" name="cert_content">
          <div>
            <t-textarea v-model="formEditData.cert_content" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
            <t-button theme="default" size="small" :style="{ marginTop: '8px' }" @click="importCertFile('edit')">
              {{ t('page.ssl.import_cert_file') }}
            </t-button>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.ssl.label_key_content')" name="key_content">
          <div>
            <t-textarea v-model="formEditData.key_content" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
            <t-button theme="default" size="small" :style="{ marginTop: '8px' }" @click="importKeyFile('edit')">
              {{ t('page.ssl.import_key_file') }}
            </t-button>
          </div>
        </t-form-item>
        <t-form-item>
          <b>{{ t('page.ssl.label_auto_tip') }}</b>
        </t-form-item>
        <t-form-item :label="t('page.ssl.label_auto_load_path_switch')" name="auto_load_path">
          <div>
            <t-switch v-model="formEditData.auto_load_path" :custom-value="[1, 0]" />
            <div style="color: #909399; font-size: 12px; margin-top: 4px; line-height: 1.5; max-width: 480px">
              {{ t('page.ssl.label_auto_load_path_tip') }}
            </div>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.ssl.label_auto_key_path')" name="key_path">
          <t-textarea v-model="formEditData.key_path" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
        </t-form-item>
        <t-form-item :label="t('page.ssl.label_auto_crt_path')" name="cert_path">
          <t-textarea v-model="formEditData.cert_path" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="editFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 隐藏的文件输入框 -->
    <input ref="certFileInput" type="file" accept=".crt,.pem,.cer" style="display: none" @change="handleCertFileChange" />
    <input ref="keyFileInput" type="file" accept=".key,.pem" style="display: none" @change="handleKeyFileChange" />

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { getOnlineUrl } from '@/utils/usuallytool';
import { sslConfigListApi, sslConfigDelApi, sslConfigEditApi, sslConfigAddApi } from '@/apis/sslconfig';

const INITIAL_DATA = {
  cert_content: '',
  key_content: '',
  cert_path: '',
  key_path: '',
  auto_load_path: 1,
};

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  cert_content: [{ required: true, message: t('common.select_placeholder') + t('page.ssl.label_cert_content'), type: 'error' }],
  key_content: [{ required: true, message: t('common.select_placeholder') + t('page.ssl.label_key_content'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
  { title: t('page.ssl.label_bind_hosts'), align: 'left', width: 300, ellipsis: true, colKey: 'bind_hosts', cell: 'bind_hosts' },
  { title: t('page.ssl.label_valid_from'), width: 200, ellipsis: true, colKey: 'valid_from' },
  { title: t('page.ssl.label_valid_to'), width: 200, ellipsis: true, colKey: 'valid_to' },
  { title: t('page.ssl.label_expire_time'), width: 200, ellipsis: true, colKey: 'expiration_info' },
  { title: t('page.ssl.label_domains'), width: 250, ellipsis: true, colKey: 'domains' },
  { title: t('page.ssl.label_subject'), align: 'left', width: 250, ellipsis: true, colKey: 'subject' },
  { title: t('page.ssl.label_issuer'), align: 'left', width: 250, ellipsis: true, colKey: 'issuer' },
  { title: t('page.ssl.label_serial_no'), align: 'left', width: 250, ellipsis: true, colKey: 'serial_no' },
  { title: 'id', align: 'left', width: 250, ellipsis: true, colKey: 'id' },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({ domains: '' });
const deleteIdx = ref<string | number>(-1);

// 文件导入状态
const currentImportMode = ref<'add' | 'edit'>('add');
const certFileInput = ref<HTMLInputElement | null>(null);
const keyFileInput = ref<HTMLInputElement | null>(null);

const confirmBody = computed(() => {
  if (deleteIdx.value !== -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function getList() {
  dataLoading.value = true;
  sslConfigListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function handleAddSslConfig() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    sslConfigAddApi({ ...formData.value }).then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success(t('common.success'));
        addFormVisible.value = false;
      } else {
        MessagePlugin.warning(res.msg);
      }
    });
  } else {
    MessagePlugin.warning(firstError);
  }
};

function handleClickEdit(slotProps: { row: Record<string, any> }) {
  formEditData.value = { auto_load_path: 1, ...slotProps.row };
  editFormVisible.value = true;
}

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    sslConfigEditApi({ ...formEditData.value }).then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success(t('common.success'));
        editFormVisible.value = false;
      } else {
        MessagePlugin.warning(res.msg);
      }
    });
  } else {
    MessagePlugin.warning(firstError);
  }
};

function handleClickDelete(slotProps: { row: Record<string, any> }) {
  deleteIdx.value = slotProps.row.id;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  sslConfigDelApi({ id: deleteIdx.value }).then((res) => {
    if (res.code === 0) {
      getList();
      MessagePlugin.success(t('common.success'));
      confirmVisible.value = false;
      deleteIdx.value = -1;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function onCancel() {
  confirmVisible.value = false;
  deleteIdx.value = -1;
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/SSL.html`);
}

// 导入证书文件
function importCertFile(mode: 'add' | 'edit') {
  currentImportMode.value = mode;
  certFileInput.value?.click();
}

// 导入密钥文件
function importKeyFile(mode: 'add' | 'edit') {
  currentImportMode.value = mode;
  keyFileInput.value?.click();
}

function handleCertFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (currentImportMode.value === 'add') {
        formData.value.cert_content = content;
      } else {
        formEditData.value.cert_content = content;
      }
      MessagePlugin.success(t('page.ssl.import_cert_success'));
    };
    reader.readAsText(file);
  }
  input.value = '';
}

function handleKeyFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (currentImportMode.value === 'add') {
        formData.value.key_content = content;
      } else {
        formEditData.value.key_content = content;
      }
      MessagePlugin.success(t('page.ssl.import_key_success'));
    };
    reader.readAsText(file);
  }
  input.value = '';
}

onMounted(() => {
  getList();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.table-container {
  margin-top: 20px;
}

.search-input {
  width: 200px;
}
</style>
