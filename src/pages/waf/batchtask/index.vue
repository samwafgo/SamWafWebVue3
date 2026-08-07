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
            <!-- IP组任务不绑定网站，这一列改显示目标IP组，否则整列空白看不出导到哪 -->
            <t-tag v-if="row.batch_type === 'ipgroup'" theme="primary" variant="light">
              {{ groupLabelOfTask(row) }}
            </t-tag>
            <span v-else> {{ host_dic[row.batch_host_code] }}</span>
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
        <t-form-item
          v-if="formData.batch_type !== 'ipgroup'"
          :label="t('page.batchtask.label_website')"
          name="batch_host_code"
        >
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
        <!-- IP组是租户级资源、不带网站，目标组通过额外配置里的 group_code 指定 -->
        <t-form-item
          v-if="formData.batch_type === 'ipgroup'"
          :label="t('page.batchtask.label_ip_group')"
          name="ip_group_code"
        >
          <div>
            <t-select v-model="formData.ip_group_code" clearable filterable :style="{ width: '480px' }">
              <t-option
                v-for="g in groupOptions"
                :key="g.group_code"
                :value="g.group_code"
                :label="`${g.group_name} (${g.item_count})`"
              ></t-option>
            </t-select>
            <a class="t-button-link" style="margin-left: 8px" @click="handleQuickAddGroup('add')">
              {{ t('page.batchtask.ip_group_quick_add') }}
            </a>
            <a class="t-button-link" style="margin-left: 8px" @click="handleJumpIPGroup">
              {{ t('page.batchtask.ip_group_goto_manage') }}
            </a>
            <div style="margin-top: 8px; font-size: 12px; color: #666">
              {{ groupOptions.length ? t('page.batchtask.ip_group_tips') : t('page.batchtask.ip_group_empty_tips') }}
            </div>
          </div>
        </t-form-item>
        <t-form-item
          v-if="formData.batch_type !== 'ipgroup'"
          :label="t('page.batchtask.label_batch_extra_config')"
          name="batch_extra_config"
        >
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
          <div>
            <t-select v-model="formData.batch_execute_method" :style="{ width: '480px' }">
              <t-option
                v-for="item in batchExecuteMethodOptions"
                :key="item.value"
                :value="item.value"
                :label="`${item.label}`"
              ></t-option>
            </t-select>
            <div
              v-if="formData.batch_type === 'ipgroup' && formData.batch_execute_method === 'overwrite'"
              style="margin-top: 8px; font-size: 12px; color: #666"
            >
              {{ t('page.batchtask.ip_group_overwrite_tips') }}
            </div>
          </div>
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
      <t-form ref="editForm" :data="formEditData" :rules="editRules" :label-width="220" @submit="onSubmitEdit">
        <t-form-item :label="t('page.batchtask.label_batch_task_name')" name="batch_task_name">
          <t-input v-model="formEditData.batch_task_name" :style="{ width: '480px' }"></t-input>
        </t-form-item>
        <t-form-item
          v-if="formEditData.batch_type !== 'ipgroup'"
          :label="t('page.batchtask.label_website')"
          name="batch_host_code"
        >
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
        <t-form-item
          v-if="formEditData.batch_type === 'ipgroup'"
          :label="t('page.batchtask.label_ip_group')"
          name="ip_group_code"
        >
          <div>
            <t-select v-model="formEditData.ip_group_code" clearable filterable :style="{ width: '480px' }">
              <t-option
                v-for="g in groupOptions"
                :key="g.group_code"
                :value="g.group_code"
                :label="`${g.group_name} (${g.item_count})`"
              ></t-option>
            </t-select>
            <a class="t-button-link" style="margin-left: 8px" @click="handleQuickAddGroup('edit')">
              {{ t('page.batchtask.ip_group_quick_add') }}
            </a>
            <a class="t-button-link" style="margin-left: 8px" @click="handleJumpIPGroup">
              {{ t('page.batchtask.ip_group_goto_manage') }}
            </a>
            <div style="margin-top: 8px; font-size: 12px; color: #666">
              {{ groupOptions.length ? t('page.batchtask.ip_group_tips') : t('page.batchtask.ip_group_empty_tips') }}
            </div>
          </div>
        </t-form-item>
        <t-form-item
          v-if="formEditData.batch_type !== 'ipgroup'"
          :label="t('page.batchtask.label_batch_extra_config')"
          name="batch_extra_config"
        >
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
          <div>
            <t-select v-model="formEditData.batch_execute_method" :style="{ width: '480px' }">
              <t-option
                v-for="item in batchExecuteMethodOptions"
                :key="item.value"
                :value="item.value"
                :label="`${item.label}`"
              ></t-option>
            </t-select>
            <div
              v-if="formEditData.batch_type === 'ipgroup' && formEditData.batch_execute_method === 'overwrite'"
              style="margin-top: 8px; font-size: 12px; color: #666"
            >
              {{ t('page.batchtask.ip_group_overwrite_tips') }}
            </div>
          </div>
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

    <!-- 就地新建IP组：不用离开当前表单，建完自动选中 -->
    <t-dialog
      v-model:visible="quickAddVisible"
      :header="t('page.batchtask.ip_group_quick_add')"
      :width="600"
      :footer="false"
    >
      <t-form ref="quickAddForm" :data="quickAddData" :rules="quickAddRules" :label-width="100" @submit="onSubmitQuickAdd">
        <t-form-item :label="t('page.ipgroup.label_name')" name="group_name">
          <t-input v-model="quickAddData.group_name" :style="{ width: '420px' }"></t-input>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="quickAddData.remarks" :style="{ width: '420px' }" :autosize="{ minRows: 3, maxRows: 3 }"></t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="quickAddVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
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
import { wafIPGroupAddApi, wafIPGroupOptionsApi } from '@/apis/ipgroup';
import { getOnlineUrl } from '@/utils/usuallytool';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const INITIAL_DATA = {
  batch_task_name: '',
  batch_host_code: '',
  batch_type: 'ipallow',
  batch_source_type: 'local',
  batch_source: '',
  batch_execute_method: 'append',
  batch_trigger_type: 'cron',
  batch_extra_config: '{}',
  // 仅表单内部使用：IP组任务的目标组，提交时序列化进 batch_extra_config.group_code
  ip_group_code: '',
  remark: '',
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

// 表单校验规则工厂。
// 新增与编辑是两份独立的表单数据，而「网站/目标IP组」的必填与否取决于各自的 batch_type，
// 所以要按表单分别生成一套规则——共用一套会拿新增表单的类型去校验编辑表单。
function buildRules(getForm: () => Record<string, any>): FormProps['rules'] {
  return {
    // IP组是租户级资源、不绑定网站，这类任务不校验网站
    batch_host_code: [
      {
        validator: (val: string) => getForm().batch_type === 'ipgroup' || !!val,
        message: t('common.select_placeholder') + t('page.batchtask.label_website'),
        type: 'error',
      },
    ],
    ip_group_code: [
      {
        validator: (val: string) => getForm().batch_type !== 'ipgroup' || !!val,
        message: t('common.select_placeholder') + t('page.batchtask.label_ip_group'),
        type: 'error',
      },
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
}

const rules = buildRules(() => formData.value);
const editRules = buildRules(() => formEditData.value);

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'id';
const deleteIdx = ref<string | number>(-1);
const host_dic = reactive<Record<string, string>>({});
const default_host_code = ref('');
// IP组下拉选项
const groupOptions = ref<Record<string, any>[]>([]);
// 就地新建IP组
const quickAddVisible = ref(false);
const quickAddTarget = ref<'add' | 'edit'>('add'); // 建完后把新组填回哪个表单
const quickAddData = ref<Record<string, any>>({ group_name: '', remarks: '' });
const quickAddRules: FormProps['rules'] = {
  group_name: [{ required: true, message: t('common.placeholder') + t('page.ipgroup.label_name'), type: 'error' }],
};

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
  // 目标组由上方的「目标IP组」下拉维护，这里不给模板，避免覆盖已选中的组
  ipgroup: { template: {}, description: '无' },
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
  { label: t('page.batchtask.batch_type.add_ipgroup'), value: 'ipgroup' },
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
  loadGroupOptions();
  // 从IP组页面「定时批量导入」跳过来时，直接打开新增弹窗并预选好目标组
  const presetGroup = route.query.ip_group_code as string;
  if (presetGroup) {
    handleAdd();
    formData.value.batch_type = 'ipgroup';
    formData.value.ip_group_code = presetGroup;
  }
});

function loadGroupOptions(onLoaded?: () => void) {
  wafIPGroupOptionsApi()
    .then((res) => {
      if (res.code === 0) {
        groupOptions.value = res.data ?? [];
      }
      onLoaded?.();
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 就地新建IP组：跳去IP组页面再跳回来会丢掉正在填的任务表单，所以直接在这里建
function handleQuickAddGroup(target: 'add' | 'edit') {
  quickAddTarget.value = target;
  quickAddData.value = { group_name: '', remarks: '' };
  quickAddVisible.value = true;
}

const onSubmitQuickAdd: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult !== true) {
    return;
  }
  wafIPGroupAddApi({ ...quickAddData.value }).then((res) => {
    if (res.code !== 0) {
      MessagePlugin.warning(res.msg);
      return;
    }
    MessagePlugin.success('添加成功');
    quickAddVisible.value = false;
    // 刷新下拉后自动选中刚建的组，省掉用户再去下拉里找一遍
    const newCode = res.data?.group_code;
    loadGroupOptions(() => {
      if (!newCode) {
        return;
      }
      if (quickAddTarget.value === 'edit') {
        formEditData.value.ip_group_code = newCode;
      } else {
        formData.value.ip_group_code = newCode;
      }
    });
  });
};

// 从额外配置JSON里取出 group_code，配置非法时当作未配置
function extractGroupCode(extraConfig: string) {
  if (!extraConfig) {
    return '';
  }
  try {
    return JSON.parse(extraConfig).group_code || '';
  } catch (e) {
    return '';
  }
}

// 列表里IP组任务显示「组名(条目数)」；组已被删时退回显示短码
function groupLabelOfTask(row: Record<string, any>) {
  const code = extractGroupCode(row.batch_extra_config);
  if (!code) {
    return '-';
  }
  const g = groupOptions.value.find((x) => x.group_code === code);
  return g ? `${g.group_name} (${g.item_count})` : code;
}

function handleJumpIPGroup() {
  router.push({ name: 'WafIpGroup' });
}

// 把表单内部的 ip_group_code 落成后端认识的 batch_extra_config.group_code，
// 并去掉只在前端存在的字段；IP组任务不绑定网站，顺手把网站清空避免误导。
function buildSubmitData(form: Record<string, any>) {
  const payload = { ...form };
  if (payload.batch_type === 'ipgroup') {
    payload.batch_extra_config = JSON.stringify({ group_code: payload.ip_group_code || '' });
    payload.batch_host_code = '';
  }
  delete payload.ip_group_code;
  return payload;
}

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
    batchTaskAddApi(buildSubmitData(formData.value)).then((res) => {
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
  formEditData.value = {
    ...slotProps.row,
    // 回填目标IP组：库里存的是 batch_extra_config 里的 group_code
    ip_group_code: extractGroupCode(slotProps.row.batch_extra_config),
  };
  editFormVisible.value = true;
}

const onSubmitEdit: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult === true) {
    batchTaskEditApi(buildSubmitData(formEditData.value)).then((res) => {
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
