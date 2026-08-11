<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddIpBlock">{{ t('page.ipblock.button_add_ip') }}</t-button>
          <t-button variant="base" theme="default" @click="HandleExportExcel()">{{ t('page.ipblock.export_data') }}</t-button>
          <t-button theme="danger" variant="outline" :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
            {{ t('page.ipblock.button_batch_delete') }}
          </t-button>
          <t-button theme="danger" :disabled="data.length === 0" @click="handleClearAll">
            {{ t('page.ipblock.button_clear_all') }}
          </t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.ipblock.label_website')" name="host_code">
              <t-select v-model="searchformData.host_code" clearable filterable :style="{ width: '150px' }">
                <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                  {{ item }}
                </t-option>
              </t-select>
            </t-form-item>
            <t-form-item label="Ip" name="ip">
              <t-input v-model="searchformData.ip" class="search-input" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <help-block :summary="t('page.ipblock.alert_message')" doc="guide/IPBlack" />
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
          <template #host_code="{ row }">
            <span>{{ host_dic[row.host_code] }}</span>
          </template>
          <template #ip_type="{ row }">
            <t-tag v-if="row.ip_type === 'group'" theme="primary" variant="light">
              {{ t('page.ipblock.entry_type_group') }}
            </t-tag>
            <span v-else>{{ t('page.ipblock.entry_type_ip') }}</span>
          </template>
          <template #ip="{ row }">
            <span v-if="row.ip_type === 'group'">{{ groupLabel(row.group_code) }}</span>
            <span v-else>{{ row.ip }}</span>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="100" @submit="onSubmit">
        <t-form-item :label="t('page.ipblock.label_website')" name="host_code">
          <t-select v-model="formData.host_code" clearable filterable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.ipblock.label_entry_type')" name="ip_type">
          <t-radio-group v-model="formData.ip_type">
            <t-radio-button value="ip">{{ t('page.ipblock.entry_type_ip') }}</t-radio-button>
            <t-radio-button value="group">{{ t('page.ipblock.entry_type_group') }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item v-if="formData.ip_type !== 'group'" :label="t('page.ipblock.label_ip')" name="ip">
          <t-input v-model="formData.ip" :style="{ width: '480px' }" :placeholder="t('page.ipblock.ip_placeholder')" />
          <div class="form-tips">{{ t('page.ipblock.ip_pattern_tips') }}</div>
        </t-form-item>
        <t-form-item v-else :label="t('page.ipblock.label_group')" name="group_code">
          <t-select v-model="formData.group_code" clearable filterable :style="{ width: '480px' }">
            <t-option
              v-for="g in group_options"
              :key="g.group_code"
              :value="g.group_code"
              :label="`${g.group_name} (${g.item_count})`"
            />
          </t-select>
          <a class="t-button-link" style="margin-left: 8px" @click="router.push({ name: 'WafIpGroup' })">
            {{ t('page.ipblock.goto_group_manage') }}
          </a>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formData.remarks" :style="{ width: '480px' }" name="remarks" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form :data="formEditData" :rules="editRules" :label-width="100" @submit="onSubmitEdit">
        <t-form-item :label="t('page.ipblock.label_website')" name="host_code">
          <t-select v-model="formEditData.host_code" clearable filterable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.ipblock.label_entry_type')" name="ip_type">
          <t-radio-group v-model="formEditData.ip_type">
            <t-radio-button value="ip">{{ t('page.ipblock.entry_type_ip') }}</t-radio-button>
            <t-radio-button value="group">{{ t('page.ipblock.entry_type_group') }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item v-if="formEditData.ip_type !== 'group'" :label="t('page.ipblock.label_ip')" name="ip">
          <t-input v-model="formEditData.ip" :style="{ width: '480px' }" :placeholder="t('page.ipblock.ip_placeholder')" />
          <div class="form-tips">{{ t('page.ipblock.ip_pattern_tips') }}</div>
        </t-form-item>
        <t-form-item v-else :label="t('page.ipblock.label_group')" name="group_code">
          <t-select v-model="formEditData.group_code" clearable filterable :style="{ width: '480px' }">
            <t-option
              v-for="g in group_options"
              :key="g.group_code"
              :value="g.group_code"
              :label="`${g.group_name} (${g.item_count})`"
            />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '480px' }" name="remarks" />
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

    <!-- 批量删除确认对话框 -->
    <t-dialog
      v-model:visible="batchDeleteConfirmVisible"
      :header="t('page.ipblock.confirm_batch_delete')"
      :body="t('common.data_delete_warning')"
      @confirm="onConfirmBatchDelete"
      @cancel="batchDeleteConfirmVisible = false"
    />

    <!-- 清空所有确认对话框 -->
    <t-dialog
      v-model:visible="clearAllConfirmVisible"
      :header="t('page.ipblock.confirm_clear_all')"
      :body="t('common.data_delete_warning')"
      @confirm="onConfirmClearAll"
      @cancel="clearAllConfirmVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { getOnlineUrl } from '@/utils/usuallytool';
import { allhost } from '@/apis/host';
import { export_api } from '@/apis/common';
import {
  wafIPBlockListApi,
  wafIPBlockDelApi,
  wafIPBlockEditApi,
  wafIPBlockAddApi,
  wafIPBlockDetailApi,
  wafIPBlockBatchDelApi,
  wafIPBlockDelAllApi,
} from '@/apis/ipblock';
import { wafIPGroupOptionsApi } from '@/apis/ipgroup';

const INITIAL_DATA = {
  host_code: '',
  ip: '',
  remarks: '',
  ip_type: 'ip',
  group_code: '',
};

const { t } = useI18n();
const router = useRouter();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const batchDeleteConfirmVisible = ref(false);
const clearAllConfirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

// 新增与编辑各用一份校验规则：两个弹窗共用同一份时，
// 依赖 ip_type 的条件校验会读到另一个弹窗的表单值而误判
const rules: FormProps['rules'] = {
  host_code: [{ required: true, message: t('common.placeholder') + t('page.ipblock.label_website'), type: 'error' }],
  ip: [
    {
      validator: (val) => formData.value.ip_type === 'group' || !!val,
      message: t('common.placeholder') + t('page.ipblock.label_ip'),
      type: 'error',
    },
  ],
  group_code: [
    {
      validator: (val) => formData.value.ip_type !== 'group' || !!val,
      message: t('common.placeholder') + t('page.ipblock.label_group'),
      type: 'error',
    },
  ],
};

const editRules: FormProps['rules'] = {
  host_code: [{ required: true, message: t('common.placeholder') + t('page.ipblock.label_website'), type: 'error' }],
  ip: [
    {
      validator: (val) => formEditData.value.ip_type === 'group' || !!val,
      message: t('common.placeholder') + t('page.ipblock.label_ip'),
      type: 'error',
    },
  ],
  group_code: [
    {
      validator: (val) => formEditData.value.ip_type !== 'group' || !!val,
      message: t('common.placeholder') + t('page.ipblock.label_group'),
      type: 'error',
    },
  ],
};

// IP组下拉选项
const group_options = ref<Record<string, any>[]>([]);

function loadGroupOptions() {
  wafIPGroupOptionsApi()
    .then((res) => {
      if (res.code === 0) {
        group_options.value = res.data ?? [];
      }
    })
    .catch((e: Error) => console.log(e));
}

// 列表里组引用行显示「组名(条目数)」；组已被删时退回显示短码
function groupLabel(groupCode: string) {
  const g = group_options.value.find((x) => x.group_code === groupCode);
  return g ? `${g.group_name} (${g.item_count})` : groupCode;
}

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 64, fixed: 'left' },
  { title: t('page.ipblock.label_website'), align: 'left', width: 250, ellipsis: true, colKey: 'host_code' },
  { title: t('page.ipblock.col_entry_type'), width: 110, colKey: 'ip_type' },
  { title: t('page.ipblock.label_ip'), width: 200, ellipsis: true, colKey: 'ip' },
  { title: t('common.remarks'), width: 200, ellipsis: true, colKey: 'remarks' },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

const searchformData = reactive({ ip: '', host_code: '' });

const deleteIdx = ref(-1);
const host_dic = ref<Record<string, string>>({});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

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
  wafIPBlockListApi({
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

function rehandleSelectChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys;
}

function handleClickEdit(e: { row: Record<string, any> }) {
  editFormVisible.value = true;
  getDetail(e.row.id);
}

function handleAddIpBlock() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
  loadGroupOptions();
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafIPBlockAddApi({ ...formData.value })
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
  } else {
    MessagePlugin.warning(firstError);
  }
};

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafIPBlockEditApi({ ...formEditData.value })
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
  } else {
    MessagePlugin.warning(firstError);
  }
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
  wafIPBlockDelApi({ id })
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
  wafIPBlockDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = {
          ...res.data,
          // 存量记录的 ip_type 是空串，等价于「单条IP」
          ip_type: res.data.ip_type || 'ip',
          group_code: res.data.group_code || '',
        };
      }
    })
    .catch((e: Error) => console.log(e));
}

/** 导出Excel数据 */
function HandleExportExcel() {
  export_api({ table_name: 'ipblock' })
    .then((res) => {
      const blob = new Blob([res as any], { type: 'application/force-download' });
      const fileReader = new FileReader();
      fileReader.readAsDataURL(blob);
      fileReader.onload = (e) => {
        const a = document.createElement('a');
        a.download = 'ipblock.xlsx';
        a.href = (e.target as FileReader).result as string;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    })
    .catch((e: Error) => console.log(e));
}


function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) {
    MessagePlugin.warning(t('page.ipblock.no_data_selected'));
    return;
  }
  batchDeleteConfirmVisible.value = true;
}

function handleClearAll() {
  clearAllConfirmVisible.value = true;
}

function onConfirmBatchDelete() {
  batchDeleteConfirmVisible.value = false;
  const ids = selectedRowKeys.value
    .map((key) => {
      const item = data.value.find((d) => d.id === key);
      return item ? item.id : null;
    })
    .filter((id) => id !== null);

  wafIPBlockBatchDelApi({ ids })
    .then((res) => {
      if (res.code === 0) {
        getList();
        selectedRowKeys.value = [];
        MessagePlugin.success(t('page.ipblock.batch_delete_success'));
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
      MessagePlugin.error('批量删除失败');
    });
}

function onConfirmClearAll() {
  clearAllConfirmVisible.value = false;
  wafIPBlockDelAllApi({ host_code: searchformData.host_code })
    .then((res) => {
      if (res.code === 0) {
        getList();
        selectedRowKeys.value = [];
        MessagePlugin.success(t('page.ipblock.clear_all_success'));
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
      MessagePlugin.error('清空失败');
    });
}

onMounted(() => {
  loadHostList().then(() => {
    getList();
  });
  loadGroupOptions();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
