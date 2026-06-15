<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.cache_rule.button_add_cache_rule') }}</t-button>
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
      <t-alert theme="info" :message="t('page.cache_rule.alert_message')" close>
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
          <template #host_code="{ row }">
            <span>{{ host_dic[row.host_code] }}</span>
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
        <t-form-item :label="t('page.cache_rule.host_code')" name="host_code">
          <t-select v-model="formData.host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.rule_name')" name="rule_name">
          <t-input v-model="formData.rule_name" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.rule_type')" name="rule_type">
          <div>
            <t-select v-model="formData.rule_type" clearable :style="{ width: '480px' }">
              <t-option v-for="item in ruleTypeOptions" :key="item.value" :value="item.value" :label="item.label">
                {{ item.label }}
              </t-option>
            </t-select>
            <div class="form-item-tips">{{ t('page.cache_rule.rule_type_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.rule_content')" name="rule_content">
          <div>
            <t-input v-model="formData.rule_content" :style="{ width: '480px' }" :placeholder="t('page.cache_rule.rule_content_placeholder')" />
            <div class="form-item-tips">{{ t('page.cache_rule.rule_content_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.param_type')" name="param_type">
          <div>
            <t-select v-model="formData.param_type" clearable :style="{ width: '480px' }">
              <t-option v-for="item in paramTypeOptions" :key="item.value" :value="item.value" :label="item.label">
                {{ item.label }}
              </t-option>
            </t-select>
            <div class="form-item-tips">{{ t('page.cache_rule.param_type_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.cache_time')" name="cache_time">
          <div>
            <t-input-number v-model="formData.cache_time" :style="{ width: '150px' }" :placeholder="t('common.placeholder')" />
            <div class="form-item-tips">{{ t('page.cache_rule.cache_time_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.priority')" name="priority">
          <div>
            <t-input-number v-model="formData.priority" :style="{ width: '150px' }" :placeholder="t('common.placeholder')" />
            <div class="form-item-tips">{{ t('page.cache_rule.priority_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.request_method')" name="request_method">
          <div>
            <t-input v-model="formData.request_method" :style="{ width: '480px' }" :placeholder="t('page.cache_rule.request_method_placeholder')" />
            <div class="form-item-tips">{{ t('page.cache_rule.request_method_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.remarks')" name="remarks">
          <t-input v-model="formData.remarks" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="100" @submit="onSubmitEdit">
        <t-form-item :label="t('page.cache_rule.host_code')" name="host_code">
          <t-select v-model="formEditData.host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.rule_name')" name="rule_name">
          <t-input v-model="formEditData.rule_name" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.rule_type')" name="rule_type">
          <div>
            <t-select v-model="formEditData.rule_type" clearable :style="{ width: '480px' }">
              <t-option v-for="item in ruleTypeOptions" :key="item.value" :value="item.value" :label="item.label">
                {{ item.label }}
              </t-option>
            </t-select>
            <div class="form-item-tips">{{ t('page.cache_rule.rule_type_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.rule_content')" name="rule_content">
          <div>
            <t-input v-model="formEditData.rule_content" :style="{ width: '480px' }" :placeholder="t('page.cache_rule.rule_content_placeholder')" />
            <div class="form-item-tips">{{ t('page.cache_rule.rule_content_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.param_type')" name="param_type">
          <div>
            <t-select v-model="formEditData.param_type" clearable :style="{ width: '480px' }">
              <t-option v-for="item in paramTypeOptions" :key="item.value" :value="item.value" :label="item.label">
                {{ item.label }}
              </t-option>
            </t-select>
            <div class="form-item-tips">{{ t('page.cache_rule.param_type_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.cache_time')" name="cache_time">
          <div>
            <t-input-number v-model="formEditData.cache_time" :style="{ width: '150px' }" :placeholder="t('common.placeholder')" />
            <div class="form-item-tips">{{ t('page.cache_rule.cache_time_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.priority')" name="priority">
          <div>
            <t-input-number v-model="formEditData.priority" :style="{ width: '150px' }" :placeholder="t('common.placeholder')" />
            <div class="form-item-tips">{{ t('page.cache_rule.priority_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.request_method')" name="request_method">
          <div>
            <t-input v-model="formEditData.request_method" :style="{ width: '480px' }" :placeholder="t('page.cache_rule.request_method_placeholder')" />
            <div class="form-item-tips">{{ t('page.cache_rule.request_method_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cache_rule.remarks')" name="remarks">
          <t-input v-model="formEditData.remarks" :style="{ width: '480px' }" />
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { getOnlineUrl } from '@/utils/usuallytool';
import { allhost } from '@/apis/host';
import {
  wafCacheRuleListApi,
  wafCacheRuleDelApi,
  wafCacheRuleEditApi,
  wafCacheRuleAddApi,
  wafCacheRuleDetailApi,
} from '@/apis/cache_rule';

const INITIAL_DATA = {
  host_code: '',
  rule_name: '',
  rule_type: '',
  rule_content: '',
  param_type: '',
  cache_time: '3600',
  priority: '1',
  request_method: 'GET',
  remarks: '',
};

const props = defineProps<{ propHostCode?: string }>();

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  host_code: [{ required: true, message: t('common.placeholder') + t('page.cache_rule.host_code'), type: 'error' }],
  rule_name: [{ required: true, message: t('common.placeholder') + t('page.cache_rule.rule_name'), type: 'error' }],
  rule_type: [{ required: true, message: t('common.placeholder') + t('page.cache_rule.rule_type'), type: 'error' }],
  param_type: [{ required: true, message: t('common.placeholder') + t('page.cache_rule.param_type'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.cache_rule.rule_name'), width: 200, ellipsis: true, colKey: 'rule_name' },
  { title: t('page.cache_rule.rule_content'), width: 200, ellipsis: true, colKey: 'rule_content' },
  { title: t('page.cache_rule.cache_time'), width: 100, ellipsis: true, colKey: 'cache_time' },
  { align: 'left', fixed: 'right', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

const searchformData = reactive({
  host_code: props.propHostCode || '',
});

const deleteIdx = ref(-1);
const host_dic = ref<Record<string, string>>({});

// 规则类型选项
const ruleTypeOptions = computed(() => [
  { label: t('page.cache_rule.rule_type_options.suffix_match'), value: '1' },
  { label: t('page.cache_rule.rule_type_options.specific_directory'), value: '2' },
  { label: t('page.cache_rule.rule_type_options.specific_file'), value: '3' },
]);

// 参数处理选项
const paramTypeOptions = computed(() => [
  { label: t('page.cache_rule.param_type_options.ignore_params'), value: '1' },
  { label: t('page.cache_rule.param_type_options.full_params'), value: '2' },
]);

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

watch(
  () => props.propHostCode,
  (newVal) => {
    searchformData.host_code = newVal || '';
    getList();
  },
);

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          const host_options = res.data as { value: string; label: string }[];
          for (let i = 0; i < host_options.length; i++) {
            host_dic.value[host_options[i].value] = host_options[i].label;
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

function getList() {
  dataLoading.value = true;
  wafCacheRuleListApi({
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

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA, host_code: props.propHostCode };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    const postdata: Record<string, any> = { ...formData.value };
    postdata.rule_type = Number(postdata.rule_type);
    postdata.param_type = Number(postdata.param_type);
    postdata.cache_time = Number(postdata.cache_time);
    postdata.priority = Number(postdata.priority);

    wafCacheRuleAddApi(postdata)
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
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    const postdata: Record<string, any> = { ...formEditData.value };
    postdata.rule_type = Number(postdata.rule_type);
    postdata.param_type = Number(postdata.param_type);
    postdata.cache_time = Number(postdata.cache_time);
    postdata.priority = Number(postdata.priority);

    wafCacheRuleEditApi(postdata)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          editFormVisible.value = false;
          getList();
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
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
  wafCacheRuleDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
        getList();
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
  wafCacheRuleDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        const detail = res.data;
        detail.rule_type = detail.rule_type.toString();
        detail.param_type = detail.param_type.toString();
        detail.cache_time = detail.cache_time.toString();
        detail.priority = detail.priority.toString();
        formEditData.value = { ...detail };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/CacheRule.html`);
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

.t-button + .t-button {
  margin-left: 8px;
}

.form-item-tips {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}
</style>
