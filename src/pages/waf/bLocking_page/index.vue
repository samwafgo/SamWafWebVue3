<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.blocking_page.button_add_blocking_page') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.blocking_page.alert_message')" close>
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
          <template #host_code="{ row }">
            <span>{{ host_dic[row.host_code] }}</span>
          </template>
          <template #attack_type="{ row }">
            <span>{{ getAttackTypeLabel(row.attack_type) }}</span>
          </template>
          <template #response_header="{ row }">
            <span v-for="(header, idx) in parseHeaders(row.response_header)" :key="idx">{{ header.name }}={{ header.value }}&nbsp;</span>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="780" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="180" @submit="onSubmit">
        <t-form-item :label="t('page.blocking_page.blocking_page_name')" name="blocking_page_name">
          <t-input v-model="formData.blocking_page_name" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.blocking_page.host_code')" name="host_code">
          <t-select v-model="formData.host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.blocking_page.attack_type')" name="attack_type">
          <t-select v-model="formData.attack_type" clearable :style="{ width: '480px' }">
            <t-option v-for="item in attackTypeOptions" :key="item.value" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.blocking_page.response_code')" name="response_code">
          <t-input v-model="formData.response_code" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.blocking_page.response_content')" name="response_content">
          <t-textarea v-model="formData.response_content" name="response_content" :autosize="{ minRows: 10, maxRows: 11 }" />
        </t-form-item>
        <t-form-item :label="t('page.blocking_page.response_header')" name="response_header">
          <div style="width: 100%">
            <div style="width: 100%; margin-top: 10px; margin-bottom: 10px">
              <t-button variant="outline" style="width: 100%" @click="addResponseHeader">{{ t('common.add') }}</t-button>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 10px">
              <div v-for="(header, index) in response_header_list" :key="index" style="display: flex; gap: 10px">
                <t-input v-model="header.name" :style="{ width: '220px' }" :placeholder="t('common.http_header.name')" />
                <t-input v-model="header.value" :style="{ width: '220px' }" :placeholder="t('common.http_header.value')" />
              </div>
            </div>
          </div>
        </t-form-item>

        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="780" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="180" @submit="onSubmitEdit">
        <t-form-item :label="t('page.blocking_page.blocking_page_name')" name="blocking_page_name">
          <t-input v-model="formEditData.blocking_page_name" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.blocking_page.host_code')" name="host_code">
          <t-select v-model="formEditData.host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.blocking_page.attack_type')" name="attack_type">
          <t-select v-model="formEditData.attack_type" clearable :style="{ width: '480px' }">
            <t-option v-for="item in attackTypeOptions" :key="item.value" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.blocking_page.response_code')" name="response_code">
          <t-input v-model="formEditData.response_code" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.blocking_page.response_content')" name="response_content">
          <t-textarea v-model="formEditData.response_content" name="response_content" :autosize="{ minRows: 10, maxRows: 11 }" />
        </t-form-item>

        <t-form-item :label="t('page.blocking_page.response_header')" name="response_header">
          <div style="width: 100%">
            <div style="width: 100%; margin-top: 10px; margin-bottom: 10px">
              <t-button variant="outline" style="width: 100%" @click="addResponseHeader">{{ t('common.add') }}</t-button>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 10px">
              <div v-for="(header, index) in response_header_list" :key="index" style="display: flex; gap: 10px">
                <t-input v-model="header.name" :style="{ width: '220px' }" :placeholder="t('common.http_header.name')" />
                <t-input v-model="header.value" :style="{ width: '220px' }" :placeholder="t('common.http_header.value')" />
              </div>
            </div>
          </div>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

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
import { allhost } from '@/apis/host';
import {
  wafBlockingPageListApi,
  wafBlockingPageDelApi,
  wafBlockingPageEditApi,
  wafBlockingPageAddApi,
  wafBlockingPageDetailApi,
} from '@/apis/blocking_page';

const INITIAL_DATA = {
  blocking_page_name: '',
  blocking_type: 'other_block',
  attack_type: '',
  host_code: '',
  response_code: '403',
  response_header: '',
  response_content: '',
};

const DEFAULT_HEADER_LIST = [{ name: 'Content-Type', value: 'text/html' }];

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  blocking_page_name: [{ required: true, message: t('common.placeholder') + t('page.blocking_page.blocking_page_name'), type: 'error' }],
  blocking_type: [{ required: true, message: t('common.placeholder') + t('page.blocking_page.blocking_type'), type: 'error' }],
  host_code: [{ required: true, message: t('common.placeholder') + t('page.blocking_page.host_code'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'code';

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.blocking_page.blocking_page_name'), width: 200, ellipsis: true, colKey: 'blocking_page_name' },
  { title: t('page.blocking_page.host_code'), width: 200, ellipsis: true, colKey: 'host_code' },
  { title: t('page.blocking_page.attack_type'), width: 150, ellipsis: true, colKey: 'attack_type' },
  { title: t('page.blocking_page.response_code'), width: 200, ellipsis: true, colKey: 'response_code' },
  { title: t('page.blocking_page.response_header'), width: 200, ellipsis: true, colKey: 'response_header' },
  { align: 'left', fixed: 'right', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({});
const deleteIdx = ref(-1);
const host_dic = ref<Record<string, string>>({});

// 攻击类型选项
const attackTypeOptions = computed(() => [
  { label: t('page.blocking_page.attack_type_option.default'), value: '' },
  { label: t('page.blocking_page.attack_type_option.cc_attack'), value: 'cc_attack' },
  { label: t('page.blocking_page.attack_type_option.sql_injection'), value: 'sql_injection' },
  { label: t('page.blocking_page.attack_type_option.xss_attack'), value: 'xss_attack' },
  { label: t('page.blocking_page.attack_type_option.scan_tool'), value: 'scan_tool' },
  { label: t('page.blocking_page.attack_type_option.rce_attack'), value: 'rce_attack' },
  { label: t('page.blocking_page.attack_type_option.dir_traversal'), value: 'dir_traversal' },
  { label: t('page.blocking_page.attack_type_option.bot_attack'), value: 'bot_attack' },
  { label: t('page.blocking_page.attack_type_option.sensitive_word'), value: 'sensitive_word' },
  { label: t('page.blocking_page.attack_type_option.ip_blocked'), value: 'ip_blocked' },
  { label: t('page.blocking_page.attack_type_option.url_blocked'), value: 'url_blocked' },
  { label: t('page.blocking_page.attack_type_option.anti_leech'), value: 'anti_leech' },
  { label: t('page.blocking_page.attack_type_option.custom_rule'), value: 'custom_rule' },
  { label: t('page.blocking_page.attack_type_option.owasp_rule'), value: 'owasp_rule' },
  { label: t('page.blocking_page.attack_type_option.plugin_block'), value: 'plugin_block' },
]);

// 响应 header 编辑列表（新增/编辑共用）
const response_header_list = ref<{ name: string; value: string }[]>([...DEFAULT_HEADER_LIST]);

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

function getAttackTypeLabel(attackType: string) {
  if (!attackType || attackType === '') {
    return t('page.blocking_page.attack_type_option.default');
  }
  const option = attackTypeOptions.value.find((opt) => opt.value === attackType);
  return option ? option.label : attackType;
}

function parseHeaders(headerJson: string): { name: string; value: string }[] {
  try {
    return JSON.parse(headerJson) || [];
  } catch {
    return [];
  }
}

function addResponseHeader() {
  response_header_list.value.push({ name: '', value: '' });
}

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          (res.data as { value: string; label: string }[]).forEach((item) => {
            host_dic.value[item.value] = item.label;
          });
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        reject(e);
      });
  });
}

function getList() {
  dataLoading.value = true;
  wafBlockingPageListApi({
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

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function handleClickEdit(e: { row: Record<string, any> }) {
  editFormVisible.value = true;
  response_header_list.value = parseHeaders(e.row.response_header);
  getDetail(e.row.id);
}

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
  response_header_list.value = [...DEFAULT_HEADER_LIST.map((h) => ({ ...h }))];
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  response_header_list.value = response_header_list.value.filter((header) => header.name.trim() !== '');
  if (response_header_list.value.length <= 0) {
    MessagePlugin.warning('Header没有填写');
    return;
  }
  formData.value.response_header = JSON.stringify(response_header_list.value);
  wafBlockingPageAddApi({ ...formData.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        addFormVisible.value = false;
        pagination.current = 1;
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
};

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  response_header_list.value = response_header_list.value.filter((header) => header.name.trim() !== '');
  if (response_header_list.value.length <= 0) {
    MessagePlugin.warning('Header没有填写');
    return;
  }
  formEditData.value.response_header = JSON.stringify(response_header_list.value);
  wafBlockingPageEditApi({ ...formEditData.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        editFormVisible.value = false;
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
};

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_DATA };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  wafBlockingPageDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
  resetIdx();
}

function onCancel() {
  resetIdx();
}

function resetIdx() {
  deleteIdx.value = -1;
}

function getDetail(id: string | number) {
  wafBlockingPageDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = {
          ...res.data,
          // attack_type 为空值时显示为空字符串，匹配"通用"选项
          attack_type: res.data.attack_type || '',
        };
      }
    })
    .catch((e: Error) => console.log(e));
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/BlockingPage.html`);
}

onMounted(() => {
  loadHostList().then(() => {
    getList();
  });
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}
</style>
