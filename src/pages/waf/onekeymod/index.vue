<template>
  <div>
    <t-card class="list-card-container">
      <t-tabs v-model="activeTab">
        <t-tab-panel value="port" :label="t('page.one_key_mod.tab_port_modify')">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-form :label-width="300" colon layout="inline" :style="{ marginBottom: '8px' }">
            <t-form-item>
              {{ t('page.one_key_mod.one_key_placeholder') }}
            </t-form-item>
            <t-form-item :label="t('page.one_key_mod.baota_placeholder')">
              <t-input v-model="defaultFilePath" class="search-input" :placeholder="t('page.one_key_mod.baota_placeholder')" clearable>
              </t-input>
            </t-form-item>
            <t-form-item>
              <t-button theme="danger" @click="handleOneKeyModify"> {{ t('page.one_key_mod.button_one_key_modify') }} </t-button>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')"> {{ t('common.search') }} </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

      <t-alert theme="info" :message="t('page.one_key_mod.modify_logs')" close>
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
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
        >
          <template #is_restore="slotProps">
            <span>{{
              slotProps.row.is_restore === 0 ? t('page.one_key_mod.label_is_restore_0') : t('page.one_key_mod.label_is_restore_1')
            }}</span>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.details') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
            <a v-if="slotProps.row.is_restore === 0" class="t-button-link" @click="handleOneKeyRestore(slotProps.row.id)">{{
              t('common.restore')
            }}</a>
          </template>
        </t-table>
      </div>
        </t-tab-panel>
        <t-tab-panel value="import" :label="t('page.one_key_mod.tab_import_nginx')">
          <import-nginx />
        </t-tab-panel>
      </t-tabs>
    </t-card>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.details')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :label-width="100">
        <t-form-item :label="t('page.one_key_mod.label_op_system')" name="op_system">
          <t-input v-model="formEditData.op_system" :style="{ width: '480px' }" placeholder=""></t-input>
        </t-form-item>
        <t-form-item :label="t('page.one_key_mod.label_file_path')" name="file_path">
          <t-input v-model="formEditData.file_path" :style="{ width: '480px' }" placeholder=""></t-input>
        </t-form-item>
        <t-form-item :label="t('page.one_key_mod.label_before_content')" name="before_content">
          <t-textarea
            v-model="formEditData.before_content"
            :style="{ width: '480px' }"
            :autosize="{ minRows: 5, maxRows: 10 }"
            name="before_content"
          >
          </t-textarea>
        </t-form-item>
        <t-form-item :label="t('page.one_key_mod.label_after_content')" name="after_content">
          <t-textarea
            v-model="formEditData.after_content"
            :style="{ width: '480px' }"
            :autosize="{ minRows: 5, maxRows: 10 }"
            name="after_content"
          >
          </t-textarea>
        </t-form-item>
        <t-form-item :label="t('page.one_key_mod.label_is_restore')" name="is_restore">
          <t-select v-model="formEditData.is_restore" :style="{ width: '480px' }" placeholder="">
            <t-option value="0">{{ t('page.one_key_mod.label_is_restore_0') }}</t-option>
            <t-option value="1">{{ t('page.one_key_mod.label_is_restore_1') }}</t-option>
          </t-select>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

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
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import {
  wafDoOneKeyModApi,
  wafOneKeyModDelApi,
  wafOneKeyModDetailApi,
  wafOneKeyModListApi,
  wafRestoreOneKeyModApi,
} from '@/apis/onekeymod';
import { getOnlineUrl } from '@/utils/usuallytool';
import ImportNginx from './components/ImportNginx.vue';

const { t } = useI18n();
const route = useRoute();

const activeTab = ref('port');
const defaultFilePath = ref('/www/server/panel/vhost/nginx');
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formEditData = ref<Record<string, any>>({});

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const deleteIdx = ref(-1);

const searchformData = reactive({
  url: '',
  host_code: '',
});

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.one_key_mod.label_op_system'), align: 'left', width: 60, ellipsis: true, colKey: 'op_system' },
  { title: t('page.one_key_mod.label_file_path'), width: 450, ellipsis: true, colKey: 'file_path' },
  { title: t('page.one_key_mod.label_is_restore'), width: 60, ellipsis: true, colKey: 'is_restore' },
  { title: t('common.create_time'), width: 130, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.confirm_delete');
  }
  return '';
});

onMounted(() => {
  if (route.query.tab === 'import') {
    activeTab.value = 'import';
  }
  getList('');
});

function getList(keyword?: string) {
  if (keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  wafOneKeyModListApi({
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

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
  getList('');
}

function rehandleSelectChange(val: (string | number)[]) {
  selectedRowKeys.value = val;
}

function handleClickEdit(e: { row: Record<string, any> }) {
  const { id } = e.row;
  editFormVisible.value = true;
  getDetail(id);
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = {};
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  wafOneKeyModDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
        pagination.current = 1;
        getList('');
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
  resetIdx();
}

function onCancel() {
  resetIdx();
}

function resetIdx() {
  deleteIdx.value = -1;
}

function getDetail(id: string | number) {
  wafOneKeyModDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 跳转界面
function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/OneKeyMod.html`);
}

// 一键修改
function handleOneKeyModify() {
  wafDoOneKeyModApi({
    file_path: defaultFilePath.value,
  })
    .then((res) => {
      if (res.code === 0) {
        // 1秒后刷新列表
        setTimeout(() => {
          getList('');
        }, 1000);
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 还原
function handleOneKeyRestore(id: string | number) {
  const confirmDia = DialogPlugin.confirm({
    header: t('page.one_key_mod.restore_confirm_title') || '确认执行还原',
    body: t('page.one_key_mod.restore_confirm_content') || '该操作将回滚修改，是否继续？',
    confirmBtn: {
      theme: 'danger',
      content: t('common.confirm'),
    },
    cancelBtn: {
      theme: 'default',
      content: t('common.cancel'),
    },
    onConfirm: () => {
      doOneKeyRestore(id);
      confirmDia.destroy();
    },
  });
}

// 实际执行还原
function doOneKeyRestore(id: string | number) {
  wafRestoreOneKeyModApi({ id })
    .then((res) => {
      if (res.code === 0) {
        getList('');
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.search-input {
  width: 360px;
}
</style>
