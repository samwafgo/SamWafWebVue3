<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.path_rule.button_add') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.path_rule.alert_message')" close />
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
          <template #match_type="{ row }">
            <span>{{ matchTypeLabel(row.match_type) }}</span>
          </template>
          <template #target_type="{ row }">
            <t-tag :theme="targetTypeTheme(row.target_type)" variant="light">
              {{ targetTypeLabel(row.target_type) }}
            </t-tag>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- Add Dialog -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="720" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="120" @submit="onSubmit">
        <t-form-item :label="t('page.path_rule.host_code')" name="host_code">
          <t-select v-model="formData.host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">{{ item }}</t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.path_rule.rule_name')" name="rule_name">
          <t-input v-model="formData.rule_name" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.path_rule.path')" name="path">
          <div>
            <t-input v-model="formData.path" :style="{ width: '480px' }" :placeholder="t('page.path_rule.path_placeholder')" />
            <div class="form-item-tips">{{ t('page.path_rule.path_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.path_rule.match_type')" name="match_type">
          <t-select v-model="formData.match_type" clearable :style="{ width: '480px' }">
            <t-option v-for="item in matchTypeOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.path_rule.priority')" name="priority">
          <div>
            <t-input-number v-model="formData.priority" :style="{ width: '150px' }" />
            <div class="form-item-tips">{{ t('page.path_rule.priority_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.path_rule.target_type')" name="target_type">
          <t-select v-model="formData.target_type" clearable :style="{ width: '480px' }">
            <t-option v-for="item in targetTypeOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>

        <!-- strip_prefix: 代理 or 静态文件时显示 -->
        <t-form-item v-if="formData.target_type === '1' || formData.target_type === '2'" :label="t('page.path_rule.strip_prefix')" name="strip_prefix">
          <div>
            <t-radio-group v-model="formData.strip_prefix">
              <t-radio value="0">{{ t('common.no') }}</t-radio>
              <t-radio value="1">{{ t('common.yes') }}</t-radio>
            </t-radio-group>
            <div class="form-item-tips">{{ t('page.path_rule.strip_prefix_tips') }}</div>
          </div>
        </t-form-item>

        <!-- target_type=1: 后端代理 -->
        <template v-if="formData.target_type === '1'">
          <t-form-item :label="t('page.path_rule.remote_host')" name="remote_host">
            <t-input v-model="formData.remote_host" :style="{ width: '480px' }" :placeholder="t('page.path_rule.remote_host_placeholder')" />
          </t-form-item>
          <t-form-item :label="t('page.path_rule.remote_port')" name="remote_port">
            <t-input-number v-model="formData.remote_port" :style="{ width: '150px' }" />
          </t-form-item>
          <t-form-item :label="t('page.path_rule.remote_ip')" name="remote_ip">
            <div>
              <t-input v-model="formData.remote_ip" :style="{ width: '480px' }" :placeholder="t('page.path_rule.remote_ip_placeholder')" />
              <div class="form-item-tips">{{ t('page.path_rule.remote_ip_tips') }}</div>
            </div>
          </t-form-item>
        </template>

        <!-- target_type=2: 静态文件 -->
        <template v-if="formData.target_type === '2'">
          <t-form-item :label="t('page.path_rule.static_root')" name="static_root">
            <div>
              <t-input v-model="formData.static_root" :style="{ width: '480px' }" :placeholder="t('page.path_rule.static_root_placeholder')" />
              <div class="form-item-tips">{{ t('page.path_rule.static_root_tips') }}</div>
            </div>
          </t-form-item>
          <t-form-item :label="t('page.path_rule.spa_fallback')" name="spa_fallback">
            <div>
              <t-radio-group v-model="formData.spa_fallback">
                <t-radio value="0">{{ t('common.off') }}</t-radio>
                <t-radio value="1">{{ t('common.on') }}</t-radio>
              </t-radio-group>
              <div class="form-item-tips">{{ t('page.path_rule.spa_fallback_tips') }}</div>
            </div>
          </t-form-item>
        </template>

        <!-- target_type=3: 重定向 -->
        <template v-if="formData.target_type === '3'">
          <t-form-item :label="t('page.path_rule.redirect_url')" name="redirect_url">
            <t-input v-model="formData.redirect_url" :style="{ width: '480px' }" :placeholder="t('page.path_rule.redirect_url_placeholder')" />
          </t-form-item>
          <t-form-item :label="t('page.path_rule.redirect_code')" name="redirect_code">
            <t-select v-model="formData.redirect_code" :style="{ width: '200px' }">
              <t-option value="302" label="302 Found" />
              <t-option value="301" label="301 Moved Permanently" />
            </t-select>
          </t-form-item>
        </template>

        <t-form-item :label="t('page.path_rule.remarks')" name="remarks">
          <t-input v-model="formData.remarks" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item style="float: right">
          <t-button variant="outline" @click="addFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- Edit Dialog -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="720" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="120" @submit="onSubmitEdit">
        <t-form-item :label="t('page.path_rule.host_code')" name="host_code">
          <t-select v-model="formEditData.host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">{{ item }}</t-option>
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.path_rule.rule_name')" name="rule_name">
          <t-input v-model="formEditData.rule_name" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item :label="t('page.path_rule.path')" name="path">
          <div>
            <t-input v-model="formEditData.path" :style="{ width: '480px' }" :placeholder="t('page.path_rule.path_placeholder')" />
            <div class="form-item-tips">{{ t('page.path_rule.path_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.path_rule.match_type')" name="match_type">
          <t-select v-model="formEditData.match_type" clearable :style="{ width: '480px' }">
            <t-option v-for="item in matchTypeOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>

        <t-form-item :label="t('page.path_rule.priority')" name="priority">
          <div>
            <t-input-number v-model="formEditData.priority" :style="{ width: '150px' }" />
            <div class="form-item-tips">{{ t('page.path_rule.priority_tips') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.path_rule.target_type')" name="target_type">
          <t-select v-model="formEditData.target_type" clearable :style="{ width: '480px' }">
            <t-option v-for="item in targetTypeOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>

        <t-form-item
          v-if="formEditData.target_type === '1' || formEditData.target_type === '2'"
          :label="t('page.path_rule.strip_prefix')"
          name="strip_prefix"
        >
          <div>
            <t-radio-group v-model="formEditData.strip_prefix">
              <t-radio value="0">{{ t('common.no') }}</t-radio>
              <t-radio value="1">{{ t('common.yes') }}</t-radio>
            </t-radio-group>
            <div class="form-item-tips">{{ t('page.path_rule.strip_prefix_tips') }}</div>
          </div>
        </t-form-item>

        <template v-if="formEditData.target_type === '1'">
          <t-form-item :label="t('page.path_rule.remote_host')" name="remote_host">
            <t-input v-model="formEditData.remote_host" :style="{ width: '480px' }" :placeholder="t('page.path_rule.remote_host_placeholder')" />
          </t-form-item>
          <t-form-item :label="t('page.path_rule.remote_port')" name="remote_port">
            <t-input-number v-model="formEditData.remote_port" :style="{ width: '150px' }" />
          </t-form-item>
          <t-form-item :label="t('page.path_rule.remote_ip')" name="remote_ip">
            <div>
              <t-input v-model="formEditData.remote_ip" :style="{ width: '480px' }" :placeholder="t('page.path_rule.remote_ip_placeholder')" />
              <div class="form-item-tips">{{ t('page.path_rule.remote_ip_tips') }}</div>
            </div>
          </t-form-item>
        </template>

        <template v-if="formEditData.target_type === '2'">
          <t-form-item :label="t('page.path_rule.static_root')" name="static_root">
            <div>
              <t-input v-model="formEditData.static_root" :style="{ width: '480px' }" :placeholder="t('page.path_rule.static_root_placeholder')" />
              <div class="form-item-tips">{{ t('page.path_rule.static_root_tips') }}</div>
            </div>
          </t-form-item>
          <t-form-item :label="t('page.path_rule.spa_fallback')" name="spa_fallback">
            <div>
              <t-radio-group v-model="formEditData.spa_fallback">
                <t-radio value="0">{{ t('common.off') }}</t-radio>
                <t-radio value="1">{{ t('common.on') }}</t-radio>
              </t-radio-group>
              <div class="form-item-tips">{{ t('page.path_rule.spa_fallback_tips') }}</div>
            </div>
          </t-form-item>
        </template>

        <template v-if="formEditData.target_type === '3'">
          <t-form-item :label="t('page.path_rule.redirect_url')" name="redirect_url">
            <t-input v-model="formEditData.redirect_url" :style="{ width: '480px' }" :placeholder="t('page.path_rule.redirect_url_placeholder')" />
          </t-form-item>
          <t-form-item :label="t('page.path_rule.redirect_code')" name="redirect_code">
            <t-select v-model="formEditData.redirect_code" :style="{ width: '200px' }">
              <t-option value="302" label="302 Found" />
              <t-option value="301" label="301 Moved Permanently" />
            </t-select>
          </t-form-item>
        </template>

        <t-form-item :label="t('page.path_rule.remarks')" name="remarks">
          <t-input v-model="formEditData.remarks" :style="{ width: '480px' }" />
        </t-form-item>

        <t-form-item style="float: right">
          <t-button variant="outline" @click="editFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- Delete Confirm -->
    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="t('common.data_delete_warning')"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { allhost } from '@/apis/host';
import {
  wafPathRuleListApi,
  wafPathRuleDelApi,
  wafPathRuleEditApi,
  wafPathRuleAddApi,
  wafPathRuleDetailApi,
} from '@/apis/path_rule';

const INITIAL_DATA = {
  host_code: '',
  rule_name: '',
  path: '',
  match_type: '1',
  priority: '100',
  target_type: '1',
  strip_prefix: '0',
  remote_host: '',
  remote_port: '80',
  remote_ip: '',
  static_root: '',
  spa_fallback: '0',
  redirect_url: '',
  redirect_code: '302',
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
  host_code: [{ required: true, message: t('common.placeholder') + t('page.path_rule.host_code'), type: 'error' }],
  rule_name: [{ required: true, message: t('common.placeholder') + t('page.path_rule.rule_name'), type: 'error' }],
  path: [{ required: true, message: t('common.placeholder') + t('page.path_rule.path'), type: 'error' }],
  match_type: [{ required: true, message: t('common.placeholder') + t('page.path_rule.match_type'), type: 'error' }],
  target_type: [{ required: true, message: t('common.placeholder') + t('page.path_rule.target_type'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const deleteIdx = ref(-1);
const host_dic = ref<Record<string, string>>({});
const searchformData = reactive({ host_code: props.propHostCode || '' });
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.path_rule.rule_name'), colKey: 'rule_name', width: 160, ellipsis: true },
  { title: t('page.path_rule.path'), colKey: 'path', width: 200, ellipsis: true },
  { title: t('page.path_rule.match_type'), colKey: 'match_type', width: 110 },
  { title: t('page.path_rule.target_type'), colKey: 'target_type', width: 110 },
  { title: t('page.path_rule.priority'), colKey: 'priority', width: 80 },
  { align: 'left', fixed: 'right', width: 160, colKey: 'op', title: t('common.op') },
]);

const matchTypeOptions = computed(() => [
  { label: t('page.path_rule.match_type_prefix'), value: '1' },
  { label: t('page.path_rule.match_type_exact'), value: '2' },
  { label: t('page.path_rule.match_type_regex'), value: '3' },
]);

const targetTypeOptions = computed(() => [
  { label: t('page.path_rule.target_type_proxy'), value: '1' },
  { label: t('page.path_rule.target_type_static'), value: '2' },
  { label: t('page.path_rule.target_type_redirect'), value: '3' },
]);

watch(
  () => props.propHostCode,
  (newVal) => {
    searchformData.host_code = newVal || '';
    getList();
  },
);

function matchTypeLabel(val: number | string) {
  const map: Record<string, string> = {
    1: t('page.path_rule.match_type_prefix'),
    2: t('page.path_rule.match_type_exact'),
    3: t('page.path_rule.match_type_regex'),
  };
  return map[String(val)] || String(val);
}

function targetTypeLabel(val: number | string) {
  const map: Record<string, string> = {
    1: t('page.path_rule.target_type_proxy'),
    2: t('page.path_rule.target_type_static'),
    3: t('page.path_rule.target_type_redirect'),
  };
  return map[String(val)] || String(val);
}

function targetTypeTheme(val: number | string) {
  const map: Record<string, string> = { 1: 'primary', 2: 'success', 3: 'warning' };
  return (map[String(val)] || 'default') as 'primary' | 'success' | 'warning' | 'default';
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
  wafPathRuleListApi({
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

function handleAdd() {
  formData.value = { ...INITIAL_DATA, host_code: props.propHostCode || '' };
  addFormVisible.value = true;
}

function handleClickEdit(e: { row: Record<string, any> }) {
  editFormVisible.value = true;
  getDetail(e.row.id);
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function buildPostData(src: Record<string, any>) {
  const d = { ...src };
  d.match_type = Number(d.match_type);
  d.priority = Number(d.priority);
  d.target_type = Number(d.target_type);
  d.strip_prefix = Number(d.strip_prefix);
  d.spa_fallback = Number(d.spa_fallback);
  d.remote_port = Number(d.remote_port);
  d.redirect_code = Number(d.redirect_code);
  return d;
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  wafPathRuleAddApi(buildPostData(formData.value))
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
  wafPathRuleEditApi(buildPostData(formEditData.value))
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

function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  wafPathRuleDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
  deleteIdx.value = -1;
}

function onCancel() {
  deleteIdx.value = -1;
}

function getDetail(id: string | number) {
  wafPathRuleDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        const d = res.data;
        // 数字字段转字符串以匹配表单 select/radio 取值
        ['match_type', 'priority', 'target_type', 'strip_prefix', 'spa_fallback', 'remote_port', 'redirect_code'].forEach((k) => {
          if (d[k] !== undefined && d[k] !== null) d[k] = d[k].toString();
        });
        formEditData.value = { ...INITIAL_DATA, ...d };
      }
    })
    .catch((e: Error) => console.log(e));
}

onMounted(() => {
  loadHostList().then(() => getList());
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
