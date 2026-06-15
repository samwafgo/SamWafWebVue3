<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button theme="success" @click="handleAdd"> {{ t('common.new') }} </t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="300" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.batchtask.label_batch_task_name')" name="batch_task_name">
              <t-input v-model="searchformData.batch_task_name" class="search-input" clearable></t-input>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.batchtask.alert_message')" close>
        <template #operation>
          <span @click="handleJumpOnlineUrl">{{ t('common.online_document') }}</span>
        </template>
      </t-alert>
      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          size="small"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
        >
          <template #batch_host_code="{ row }">
            <span> {{ host_dic[row.batch_host_code] }}</span>
          </template>
          <template #batch_type="{ row }">
            <p>
              {{ batchTaskTypeOptions.find((option) => option.value === row.batch_type)?.label || row.batch_type }}
            </p>
          </template>
          <template #batch_source_type="{ row }">
            <p>
              {{ batchSourceTypeOptions.find((option) => option.value === row.batch_source_type)?.label || row.batch_source_type }}
            </p>
          </template>
          <template #batch_execute_method="{ row }">
            <p>
              {{
                batchExecuteMethodOptions.find((option) => option.value === row.batch_execute_method)?.label ||
                row.batch_execute_method
              }}
            </p>
          </template>
          <template #batch_trigger_type="{ row }">
            <p>
              {{ batchTriggerTypeOptions.find((option) => option.value === row.batch_trigger_type)?.label || row.batch_trigger_type }}
            </p>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickManual(slotProps)">{{ t('page.batchtask.label_btn_manual') }}</a>
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="750" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="220" @submit="onSubmit">
        <t-form-item :label="t('page.batchtask.label_batch_task_name')" name="batch_task_name">
          <t-input v-model="formData.batch_task_name" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_website')" name="batch_host_code">
          <t-select v-model="formData.batch_host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_type')" name="batch_type">
          <t-select v-model="formData.batch_type" :style="{ width: '480px' }" @change="onBatchTypeChange">
            <t-option v-for="item in batchTaskTypeOptions" :key="item.value" :value="item.value" :label="`${item.label}`"></t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_extra_config')" name="batch_extra_config">
          <div>
            <t-textarea
              v-model="formData.batch_extra_config"
              :style="{ width: '480px' }"
              :autosize="{ minRows: 6, maxRows: 6 }"
              :placeholder="t('page.batchtask.batch_extra_config_placeholder')"
            ></t-textarea>
            <div style="margin-top: 8px; font-size: 12px; color: #666; white-space: pre-line">
              {{ getCurrentConfigDescription('add') }}
            </div>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_source_type')" name="batch_source_type">
          <t-select v-model="formData.batch_source_type" :style="{ width: '480px' }">
            <t-option v-for="item in batchSourceTypeOptions" :key="item.value" :value="item.value" :label="`${item.label}`"></t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_source')" name="batch_source">
          <t-input v-model="formData.batch_source" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_execute_method')" name="batch_execute_method">
          <t-select v-model="formData.batch_execute_method" :style="{ width: '480px' }">
            <t-option
              v-for="item in batchExecuteMethodOptions"
              :key="item.value"
              :value="item.value"
              :label="`${item.label}`"
            ></t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_trigger_type')" name="batch_trigger_type">
          <t-select v-model="formData.batch_trigger_type" :style="{ width: '480px' }">
            <t-option
              v-for="item in batchTriggerTypeOptions"
              :key="item.value"
              :value="item.value"
              :label="`${item.label}`"
            ></t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_remark')" name="remark">
          <t-textarea v-model="formData.remark" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }"></t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="750" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="220" @submit="onSubmitEdit">
        <t-form-item :label="t('page.batchtask.label_batch_task_name')" name="batch_task_name">
          <t-input v-model="formEditData.batch_task_name" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_website')" name="batch_host_code">
          <t-select v-model="formEditData.batch_host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_type')" name="batch_type">
          <t-select v-model="formEditData.batch_type" :style="{ width: '480px' }" @change="onBatchTypeChangeEdit">
            <t-option v-for="item in batchTaskTypeOptions" :key="item.value" :value="item.value" :label="`${item.label}`"></t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_extra_config')" name="batch_extra_config">
          <div>
            <t-textarea
              v-model="formEditData.batch_extra_config"
              :style="{ width: '480px' }"
              :autosize="{ minRows: 6, maxRows: 6 }"
              :placeholder="t('page.batchtask.batch_extra_config_placeholder')"
            ></t-textarea>
            <div style="margin-top: 8px; font-size: 12px; color: #666; white-space: pre-line">
              {{ getCurrentConfigDescription('edit') }}
            </div>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_source_type')" name="batch_source_type">
          <t-select v-model="formEditData.batch_source_type" :style="{ width: '480px' }">
            <t-option v-for="item in batchSourceTypeOptions" :key="item.value" :value="item.value" :label="`${item.label}`"></t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_source')" name="batch_source">
          <t-input v-model="formEditData.batch_source" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_execute_method')" name="batch_execute_method">
          <t-select v-model="formEditData.batch_execute_method" :style="{ width: '480px' }">
            <t-option
              v-for="item in batchExecuteMethodOptions"
              :key="item.value"
              :value="item.value"
              :label="`${item.label}`"
            ></t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_batch_trigger_type')" name="batch_trigger_type">
          <t-select v-model="formEditData.batch_trigger_type" :style="{ width: '480px' }">
            <t-option
              v-for="item in batchTriggerTypeOptions"
              :key="item.value"
              :value="item.value"
              :label="`${item.label}`"
            ></t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.batchtask.label_remark')" name="remark">
          <t-textarea v-model="formEditData.remark" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }"></t-textarea>
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
    >
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, PageInfo, TableProps } from 'tdesign-vue-next';

import {
  batchTaskAddApi,
  batchTaskDelApi,
  batchTaskEditApi,
  batchTaskListApi,
  batchTaskManualApi,
} from '@/apis/batchtask';
import { allhost } from '@/apis/host';
import { getOnlineUrl } from '@/utils/usuallytool';

const { t } = useI18n();

const INITIAL_DATA = {
  batch_task_name: '',
  batch_host_code: '',
  batch_type: 'ipallow',
  batch_source_type: 'local',
  batch_source: '',
  batch_execute_method: 'append',
  batch_trigger_type: 'cron',
  batch_extra_config: '{}',
  remark: '',
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  batch_host_code: [
    { required: true, message: t('common.select_placeholder') + t('page.batchtask.label_website'), type: 'error' },
  ],
  batch_task_name: [
    { required: true, message: t('common.select_placeholder') + t('page.batchtask.label_batch_task_name'), type: 'error' },
  ],
  batch_type: [
    { required: true, message: t('common.select_placeholder') + t('page.batchtask.label_batch_type'), type: 'error' },
  ],
  batch_extra_config: [
    {
      validator: (val: string) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: '请输入有效的JSON格式',
      type: 'error',
    },
  ],
  batch_source_type: [
    { required: true, message: t('common.select_placeholder') + t('page.batchtask.label_batch_source_type'), type: 'error' },
  ],
  batch_source: [
    { required: true, message: t('common.select_placeholder') + t('page.batchtask.label_batch_source'), type: 'error' },
  ],
  batch_execute_method: [
    { required: true, message: t('common.select_placeholder') + t('page.batchtask.label_batch_execute_method'), type: 'error' },
  ],
  batch_trigger_type: [
    { required: true, message: t('common.select_placeholder') + t('page.batchtask.label_batch_trigger_type'), type: 'error' },
  ],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'id';
const deleteIdx = ref<string | number>(-1);
const host_dic = reactive<Record<string, string>>({});
const default_host_code = ref('');

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const searchformData = reactive({
  batch_task_name: '',
});

// 任务类型配置模板
const batchTypeConfigs: Record<string, { template: Record<string, any>; description: string }> = {
  ipallow: { template: {}, description: '无' },
  ipdeny: { template: {}, description: '无' },
  sensitive: {
    template: {
      check_direction: 'out',
      action: 'replace',
    },
    description:
      '敏感词检测配置\n- check_direction: 检测方向(in=入站, out=出站, all=双向)\n- action: 检测后动作(deny=拒绝, replace=替换)',
  },
};

// 任务类型
const batchTaskTypeOptions = computed(() => [
  { label: t('page.batchtask.batch_type.add_ipallow'), value: 'ipallow' },
  { label: t('page.batchtask.batch_type.add_ipdeny'), value: 'ipdeny' },
  { label: t('page.batchtask.batch_type.add_sensitive'), value: 'sensitive' },
]);

// 来源类型
const batchSourceTypeOptions = computed(() => [
  { label: t('page.batchtask.batch_source_type.local'), value: 'local' },
  { label: t('page.batchtask.batch_source_type.remote'), value: 'remote' },
]);

// 执行方式
const batchExecuteMethodOptions = computed(() => [
  { label: t('page.batchtask.batch_execute_method.append'), value: 'append' },
  { label: t('page.batchtask.batch_execute_method.overwrite'), value: 'overwrite' },
]);

// 触发类型
const batchTriggerTypeOptions = computed(() => [
  { label: t('page.batchtask.batch_trigger_type.manual'), value: 'manual' },
  { label: t('page.batchtask.batch_trigger_type.cron'), value: 'cron' },
]);

const columns = computed<TableProps['columns']>(() => [
  {
    title: t('page.batchtask.label_website'),
    align: 'left',
    width: 250,
    ellipsis: true,
    colKey: 'batch_host_code',
    fixed: 'left',
  },
  { align: 'left', width: 300, colKey: 'op', fixed: 'left', title: t('common.op') },
  {
    title: t('page.batchtask.label_batch_task_name'),
    align: 'left',
    width: 250,
    ellipsis: true,
    fixed: 'left',
    colKey: 'batch_task_name',
  },
  { title: t('page.batchtask.label_batch_type'), align: 'left', width: 200, ellipsis: true, colKey: 'batch_type' },
  { title: t('page.batchtask.label_batch_source_type'), width: 150, ellipsis: true, colKey: 'batch_source_type' },
  { title: t('page.batchtask.label_batch_source'), width: 200, ellipsis: true, colKey: 'batch_source' },
  { title: t('page.batchtask.label_batch_execute_method'), width: 150, ellipsis: true, colKey: 'batch_execute_method' },
  { title: t('page.batchtask.label_batch_trigger_type'), width: 150, ellipsis: true, colKey: 'batch_trigger_type' },
  { title: t('page.batchtask.label_remark'), width: 200, ellipsis: true, colKey: 'remark' },
]);

const confirmBody = computed(() => {
  if (deleteIdx.value !== -1) {
    return t('common.confirm_delete');
  }
  return '';
});

onMounted(() => {
  loadHostList().then(() => {
    getList();
  });
});

// 当任务类型改变时，自动填充默认配置
function onBatchTypeChange(value: any) {
  const config = batchTypeConfigs[value as string];
  if (config) {
    formData.value.batch_extra_config = JSON.stringify(config.template, null, 2);
  }
}

function onBatchTypeChangeEdit(value: any) {
  const config = batchTypeConfigs[value as string];
  if (config) {
    formEditData.value.batch_extra_config = JSON.stringify(config.template, null, 2);
  }
}

// 获取当前选中类型的配置说明
function getCurrentConfigDescription(formType = 'add') {
  const currentType = formType === 'add' ? formData.value.batch_type : formEditData.value.batch_type;
  const config = batchTypeConfigs[currentType];
  return config ? config.description : '';
}

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          const hostOptions = res.data;
          for (let i = 0; i < hostOptions.length; i++) {
            host_dic[hostOptions[i].value] = hostOptions[i].label;
          }
          if (hostOptions.length > 0) {
            default_host_code.value = hostOptions[0].value;
          }
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        reject(e);
      });
  });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
  getList();
}

function getList() {
  dataLoading.value = true;
  batchTaskListApi({
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

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
  formData.value.batch_host_code = default_host_code.value;
}

const onSubmit: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult === true) {
    batchTaskAddApi({ ...formData.value }).then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success('添加成功');
        addFormVisible.value = false;
      } else {
        MessagePlugin.warning(res.msg);
      }
    });
  }
};

function handleClickEdit(slotProps: { row: Record<string, any> }) {
  formEditData.value = { ...slotProps.row };
  editFormVisible.value = true;
}

const onSubmitEdit: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult === true) {
    batchTaskEditApi({ ...formEditData.value }).then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success('编辑成功');
        editFormVisible.value = false;
      } else {
        MessagePlugin.warning(res.msg);
      }
    });
  }
};

function handleClickDelete(slotProps: { row: Record<string, any> }) {
  deleteIdx.value = slotProps.row.id;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  batchTaskDelApi({ id: deleteIdx.value }).then((res) => {
    if (res.code === 0) {
      getList();
      MessagePlugin.success('删除成功');
      confirmVisible.value = false;
      deleteIdx.value = -1;
    }
  });
}

/** 手工触发 */
function handleClickManual(slotProps: { row: Record<string, any> }) {
  const { id } = slotProps.row;
  const confirmDialog = DialogPlugin.confirm({
    body: t('page.batchtask.label_confirm_message'),
    confirmBtn: t('common.confirm'),
    cancelBtn: t('common.cancel'),
    theme: 'warning',
    onConfirm: () => {
      batchTaskManualApi({ id }).then((res) => {
        if (res.code === 0) {
          MessagePlugin.success('执行成功');
        }
      });
      confirmDialog.destroy();
    },
  });
}

function onCancel() {
  confirmVisible.value = false;
  deleteIdx.value = -1;
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/BatchTask.html`);
}

function onClickCloseBtn() {
  addFormVisible.value = false;
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
}
</script>

<style scoped>
.list-card-container {
  padding: 20px;
}
.table-container {
  margin-top: 20px;
}
.search-input {
  width: 200px;
}
</style>
