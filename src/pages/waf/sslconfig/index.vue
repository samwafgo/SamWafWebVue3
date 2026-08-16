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
      <help-block :summary="t('page.ssl.alert_message')" doc="guide/SSL" />
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

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="820" :footer="false">
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
        <!-- 「入」：从磁盘读进来 -->
        <div class="cert-path-block cert-path-block--in">
          <div class="cert-path-block__header">
            <span class="cert-path-block__badge cert-path-block__badge--in">
              {{ t('page.ssl.label_path_direction_in') }}
            </span>
            <span class="cert-path-block__desc">{{ t('page.ssl.label_import_tip') }}</span>
          </div>
          <t-form-item :label="t('page.ssl.label_auto_load_path_switch')" name="auto_load_path">
            <!-- 宽度写成内联样式：t-form-item 的内容区是 flex，类选择器会被框架规则盖掉，
                 导致开关被拉伸成整行、说明文字撑出边框 -->
            <div class="cert-path-block__field" :style="{ width: '480px' }">
              <t-switch v-model="formEditData.auto_load_path" :custom-value="[1, 0]" />
              <div class="cert-path-block__tip">{{ t('page.ssl.label_auto_load_path_tip') }}</div>
            </div>
          </t-form-item>
          <t-form-item :label="t('page.ssl.label_auto_key_path')" name="key_path">
            <t-textarea
              v-model="formEditData.key_path"
              :style="{ width: '480px' }"
              :autosize="{ minRows: 3, maxRows: 3 }"
            />
          </t-form-item>
          <t-form-item :label="t('page.ssl.label_auto_crt_path')" name="cert_path">
            <t-textarea
              v-model="formEditData.cert_path"
              :style="{ width: '480px' }"
              :autosize="{ minRows: 3, maxRows: 3 }"
            />
          </t-form-item>
        </div>

        <!-- 「出」：写到磁盘出去 -->
        <div class="cert-path-block cert-path-block--out">
          <div class="cert-path-block__header">
            <span class="cert-path-block__badge cert-path-block__badge--out">
              {{ t('page.ssl.label_path_direction_out') }}
            </span>
            <span class="cert-path-block__desc">{{ t('page.ssl.label_export_tip') }}</span>
          </div>
          <t-form-item :label="t('page.ssl.label_export_crt_path')" name="export_cert_path">
            <t-input v-model="formEditData.export_cert_path" :style="{ width: '480px' }" clearable />
          </t-form-item>
          <t-form-item :label="t('page.ssl.label_export_key_path')" name="export_key_path">
            <div class="cert-path-block__field" :style="{ width: '480px' }">
              <t-input v-model="formEditData.export_key_path" clearable />
              <div class="cert-path-block__tip">{{ t('page.ssl.label_export_path_tip') }}</div>
            </div>
          </t-form-item>
          <t-form-item
            v-if="formEditData.export_status"
            :label="t('page.ssl.label_export_status')"
            name="export_status"
          >
            <span class="cert-path-block__status">{{ formEditData.export_status }}</span>
          </t-form-item>
        </div>
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
  export_cert_path: '',
  export_key_path: '',
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
        // 后端会把证书导出的结果拼在消息里（成功路径/失败原因），原样展示
        MessagePlugin.success(res.msg || t('common.success'));
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
  // 老数据这两列可能是 null，统一成空串，避免 t-input 的 v-model 拿到 null
  formEditData.value.export_cert_path = slotProps.row.export_cert_path || '';
  formEditData.value.export_key_path = slotProps.row.export_key_path || '';
  editFormVisible.value = true;
}

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    sslConfigEditApi({ ...formEditData.value }).then((res) => {
      if (res.code === 0) {
        getList();
        // 后端会把证书导出的结果拼在消息里（成功路径/失败原因），原样展示
        MessagePlugin.success(res.msg || t('common.success'));
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

/* 证书路径的两个方向：入(从磁盘读进来) / 出(写到磁盘出去)，用边框和色条分开，避免混淆 */
.cert-path-block {
  border: 1px solid #dcdcdc;
  border-radius: 6px;
  padding: 16px 16px 0;
  margin-bottom: 16px;
}

.cert-path-block--in {
  border-color: #bcd4ff;
  background-color: #f7faff;
}

.cert-path-block--out {
  border-color: #b5e2c8;
  background-color: #f6fdf9;
}

.cert-path-block__header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 14px;
}

.cert-path-block__badge {
  flex: none;
  margin-right: 10px;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  line-height: 20px;
  color: #fff;
  white-space: nowrap;
}

.cert-path-block__badge--in {
  background-color: #0052d9;
}

.cert-path-block__badge--out {
  background-color: #00a870;
}

.cert-path-block__desc {
  font-size: 13px;
  line-height: 1.6;
  color: #444;
}

/* 输入框和它的说明文字必须竖排：直接并排放在 form-item 里会被 flex 挤窄输入框。
   这里用普通块级容器而不是 flex 列——flex 的 align stretch 会把开关拉成整行。
   宽度写在模板的内联样式里，避免被框架规则覆盖。 */
.cert-path-block__field {
  display: block;
}

.cert-path-block__tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
}

.cert-path-block__status {
  max-width: 480px;
  word-break: break-all;
}
</style>
