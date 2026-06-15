<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.firewall_ipblock.button_add_ip') }}</t-button>
          <t-button @click="handleBatchAdd">{{ t('page.firewall_ipblock.button_batch_add') }}</t-button>
          <t-button theme="danger" variant="outline" :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
            {{ t('page.firewall_ipblock.button_batch_delete') }}
          </t-button>
          <t-button theme="success" variant="outline" @click="handleSync">
            {{ t('page.firewall_ipblock.button_sync') }}
          </t-button>
          <t-button theme="warning" variant="outline" @click="handleClearExpired">
            {{ t('page.firewall_ipblock.button_clear_expired') }}
          </t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="80" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.firewall_ipblock.label_website')" name="host_code">
              <t-select v-model="searchformData.host_code" clearable filterable :style="{ width: '150px' }">
                <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                  {{ item }}
                </t-option>
              </t-select>
            </t-form-item>
            <t-form-item label="IP" name="ip">
              <t-input v-model="searchformData.ip" class="search-input" clearable />
            </t-form-item>
            <t-form-item :label="t('page.firewall_ipblock.label_status')" name="status">
              <t-select v-model="searchformData.status" clearable :style="{ width: '120px' }">
                <t-option value="active" :label="t('page.firewall_ipblock.status_active')" />
                <t-option value="inactive" :label="t('page.firewall_ipblock.status_inactive')" />
                <t-option value="pending" :label="t('page.firewall_ipblock.status_pending')" />
              </t-select>
            </t-form-item>
            <t-form-item :label="t('page.firewall_ipblock.label_block_type')" name="block_type">
              <t-select v-model="searchformData.block_type" clearable :style="{ width: '120px' }">
                <t-option value="manual" :label="t('page.firewall_ipblock.block_type_manual')" />
                <t-option value="auto" :label="t('page.firewall_ipblock.block_type_auto')" />
                <t-option value="temp" :label="t('page.firewall_ipblock.block_type_temp')" />
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

      <!-- 统计信息卡片 -->
      <t-row :gutter="16" style="margin-bottom: 16px">
        <t-col :span="3">
          <t-card size="small">
            <div class="stat-card">
              <div class="stat-label">{{ t('page.firewall_ipblock.stat_total') }}</div>
              <div class="stat-value">{{ statistics.total }}</div>
            </div>
          </t-card>
        </t-col>
        <t-col :span="3">
          <t-card size="small">
            <div class="stat-card">
              <div class="stat-label">{{ t('page.firewall_ipblock.stat_active') }}</div>
              <div class="stat-value stat-active">{{ statistics.active }}</div>
            </div>
          </t-card>
        </t-col>
        <t-col :span="3">
          <t-card size="small">
            <div class="stat-card">
              <div class="stat-label">{{ t('page.firewall_ipblock.stat_inactive') }}</div>
              <div class="stat-value stat-inactive">{{ statistics.inactive }}</div>
            </div>
          </t-card>
        </t-col>
        <t-col :span="3">
          <t-card size="small">
            <div class="stat-card">
              <div class="stat-label">{{ t('page.firewall_ipblock.stat_expired') }}</div>
              <div class="stat-value stat-expired">{{ statistics.expired }}</div>
            </div>
          </t-card>
        </t-col>
      </t-row>

      <t-alert theme="info" :message="t('page.firewall_ipblock.alert_message')" close>
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

          <template #status="{ row }">
            <t-tag v-if="row.status === 'active'" theme="success" variant="light">
              {{ t('page.firewall_ipblock.status_active') }}
            </t-tag>
            <t-tag v-else-if="row.status === 'inactive'" theme="default" variant="light">
              {{ t('page.firewall_ipblock.status_inactive') }}
            </t-tag>
            <t-tag v-else-if="row.status === 'pending'" theme="warning" variant="light">
              {{ t('page.firewall_ipblock.status_pending') }}
            </t-tag>
          </template>

          <template #block_type="{ row }">
            <t-tag v-if="row.block_type === 'manual'" theme="primary" variant="light">
              {{ t('page.firewall_ipblock.block_type_manual') }}
            </t-tag>
            <t-tag v-else-if="row.block_type === 'auto'" theme="danger" variant="light">
              {{ t('page.firewall_ipblock.block_type_auto') }}
            </t-tag>
            <t-tag v-else-if="row.block_type === 'temp'" theme="warning" variant="light">
              {{ t('page.firewall_ipblock.block_type_temp') }}
            </t-tag>
          </template>

          <template #expire_time="{ row }">
            <span v-if="row.expire_time === 0">{{ t('page.firewall_ipblock.permanent') }}</span>
            <span v-else>{{ formatExpireTime(row.expire_time) }}</span>
          </template>

          <template #op="slotProps">
            <a v-if="slotProps.row.status === 'inactive'" class="t-button-link" @click="handleClickEnable(slotProps)">
              {{ t('page.firewall_ipblock.enable') }}
            </a>
            <a v-if="slotProps.row.status === 'active'" class="t-button-link" @click="handleClickDisable(slotProps)">
              {{ t('page.firewall_ipblock.disable') }}
            </a>
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 添加对话框 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="120" @submit="onSubmit">
        <t-form-item :label="t('page.firewall_ipblock.label_website')" name="host_code">
          <t-select v-model="formData.host_code" clearable filterable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_ip')" name="ip">
          <t-input v-model="formData.ip" :style="{ width: '480px' }" :placeholder="t('page.firewall_ipblock.ip_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_reason')" name="reason">
          <t-input v-model="formData.reason" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_block_type')" name="block_type">
          <t-select v-model="formData.block_type" :style="{ width: '480px' }">
            <t-option value="manual" :label="t('page.firewall_ipblock.block_type_manual')" />
            <t-option value="auto" :label="t('page.firewall_ipblock.block_type_auto')" />
            <t-option value="temp" :label="t('page.firewall_ipblock.block_type_temp')" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_expire_time')" name="expire_time">
          <t-date-picker
            v-model="formData.expire_time_date"
            enable-time-picker
            clearable
            :style="{ width: '480px' }"
            :placeholder="t('page.firewall_ipblock.expire_time_placeholder')"
          />
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

    <!-- 批量添加对话框 -->
    <t-dialog v-model:visible="batchAddFormVisible" :header="t('page.firewall_ipblock.batch_add_title')" :width="680" :footer="false">
      <t-form :data="batchAddFormData" :rules="batchAddRules" :label-width="120" @submit="onSubmitBatchAdd">
        <t-form-item :label="t('page.firewall_ipblock.label_website')" name="host_code">
          <t-select v-model="batchAddFormData.host_code" clearable filterable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_ips')" name="ips_text">
          <t-textarea
            v-model="batchAddFormData.ips_text"
            :style="{ width: '480px' }"
            :autosize="{ minRows: 8, maxRows: 8 }"
            :placeholder="t('page.firewall_ipblock.ips_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_reason')" name="reason">
          <t-input v-model="batchAddFormData.reason" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_block_type')" name="block_type">
          <t-select v-model="batchAddFormData.block_type" :style="{ width: '480px' }">
            <t-option value="manual" :label="t('page.firewall_ipblock.block_type_manual')" />
            <t-option value="auto" :label="t('page.firewall_ipblock.block_type_auto')" />
            <t-option value="temp" :label="t('page.firewall_ipblock.block_type_temp')" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="batchAddFormData.remarks" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBatchAddBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑对话框 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="120" @submit="onSubmitEdit">
        <t-form-item :label="t('page.firewall_ipblock.label_website')" name="host_code">
          <t-select v-model="formEditData.host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_ip')" name="ip">
          <t-input v-model="formEditData.ip" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_reason')" name="reason">
          <t-input v-model="formEditData.reason" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_block_type')" name="block_type">
          <t-select v-model="formEditData.block_type" :style="{ width: '480px' }">
            <t-option value="manual" :label="t('page.firewall_ipblock.block_type_manual')" />
            <t-option value="auto" :label="t('page.firewall_ipblock.block_type_auto')" />
            <t-option value="temp" :label="t('page.firewall_ipblock.block_type_temp')" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.firewall_ipblock.label_expire_time')" name="expire_time">
          <t-date-picker
            v-model="formEditData.expire_time_date"
            enable-time-picker
            clearable
            :style="{ width: '480px' }"
            :placeholder="t('page.firewall_ipblock.expire_time_placeholder')"
          />
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

    <!-- 删除确认对话框 -->
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
      :header="t('page.firewall_ipblock.confirm_batch_delete')"
      :body="t('common.data_delete_warning')"
      @confirm="onConfirmBatchDelete"
      @cancel="batchDeleteConfirmVisible = false"
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
  wafFirewallIPBlockListApi,
  wafFirewallIPBlockAddApi,
  wafFirewallIPBlockDetailApi,
  wafFirewallIPBlockEditApi,
  wafFirewallIPBlockDelApi,
  wafFirewallIPBlockBatchAddApi,
  wafFirewallIPBlockBatchDelApi,
  wafFirewallIPBlockEnableApi,
  wafFirewallIPBlockDisableApi,
  wafFirewallIPBlockSyncApi,
  wafFirewallIPBlockClearExpiredApi,
  wafFirewallIPBlockStatisticsApi,
} from '@/apis/firewall_ipblock';

const INITIAL_DATA = {
  host_code: '',
  ip: '',
  reason: '',
  block_type: 'manual',
  expire_time: 0,
  expire_time_date: null as Date | string | null,
  remarks: '',
};

const BATCH_ADD_INITIAL_DATA = {
  host_code: '',
  ips_text: '',
  reason: '',
  block_type: 'manual',
  remarks: '',
};

const { t } = useI18n();

const addFormVisible = ref(false);
const batchAddFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const batchDeleteConfirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const batchAddFormData = ref<Record<string, any>>({ ...BATCH_ADD_INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  host_code: [{ required: true, message: t('common.placeholder') + t('page.firewall_ipblock.label_website'), type: 'error' }],
  ip: [{ required: true, message: t('common.placeholder') + t('page.firewall_ipblock.label_ip'), type: 'error' }],
  block_type: [{ required: true, message: t('common.placeholder') + t('page.firewall_ipblock.label_block_type'), type: 'error' }],
};

const batchAddRules: FormProps['rules'] = {
  host_code: [{ required: true, message: t('common.placeholder') + t('page.firewall_ipblock.label_website'), type: 'error' }],
  ips_text: [{ required: true, message: t('common.placeholder') + t('page.firewall_ipblock.label_ips'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const statistics = ref({ total: 0, active: 0, inactive: 0, expired: 0 });
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'row-select', type: 'multiple', width: 64, fixed: 'left' },
  { title: t('page.firewall_ipblock.label_website'), align: 'left', width: 200, ellipsis: true, colKey: 'host_code' },
  { title: t('page.firewall_ipblock.label_ip'), width: 150, ellipsis: true, colKey: 'ip' },
  { title: t('page.firewall_ipblock.label_reason'), width: 150, ellipsis: true, colKey: 'reason' },
  { title: t('page.firewall_ipblock.label_block_type'), width: 120, ellipsis: true, colKey: 'block_type' },
  { title: t('page.firewall_ipblock.label_status'), width: 120, ellipsis: true, colKey: 'status' },
  { title: t('page.firewall_ipblock.label_expire_time'), width: 180, ellipsis: true, colKey: 'expire_time' },
  { title: t('common.remarks'), width: 150, ellipsis: true, colKey: 'remarks' },
  { title: t('common.create_time'), width: 180, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 250, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

const searchformData = reactive({
  ip: '',
  host_code: '',
  status: '',
  block_type: '',
});

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
  wafFirewallIPBlockListApi({
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

function getStatistics() {
  wafFirewallIPBlockStatisticsApi({})
    .then((res) => {
      if (res.code === 0) {
        statistics.value = res.data;
      }
    })
    .catch((e: Error) => {
      console.log(e);
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

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
}

function handleBatchAdd() {
  batchAddFormVisible.value = true;
  batchAddFormData.value = { ...BATCH_ADD_INITIAL_DATA };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  const postdata: Record<string, any> = { ...formData.value };
  // 处理过期时间（秒级时间戳，0 为永久）
  if (formData.value.expire_time_date) {
    postdata.expire_time = Math.floor(new Date(formData.value.expire_time_date).getTime() / 1000);
  } else {
    postdata.expire_time = 0;
  }
  delete postdata.expire_time_date;

  wafFirewallIPBlockAddApi(postdata)
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        addFormVisible.value = false;
        pagination.current = 1;
        getList();
        getStatistics();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
};

const onSubmitBatchAdd: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  // 解析IP列表（换行分隔）
  const ips = batchAddFormData.value.ips_text
    .split('\n')
    .map((ip: string) => ip.trim())
    .filter((ip: string) => ip.length > 0);

  if (ips.length === 0) {
    MessagePlugin.warning(t('page.firewall_ipblock.ips_empty_warning'));
    return;
  }

  wafFirewallIPBlockBatchAddApi({
    host_code: batchAddFormData.value.host_code,
    ips,
    reason: batchAddFormData.value.reason,
    block_type: batchAddFormData.value.block_type,
    remarks: batchAddFormData.value.remarks,
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        batchAddFormVisible.value = false;
        pagination.current = 1;
        getList();
        getStatistics();
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
  const postdata: Record<string, any> = { ...formEditData.value };
  if (formEditData.value.expire_time_date) {
    postdata.expire_time = Math.floor(new Date(formEditData.value.expire_time_date).getTime() / 1000);
  } else {
    postdata.expire_time = 0;
  }
  delete postdata.expire_time_date;

  wafFirewallIPBlockEditApi(postdata)
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        editFormVisible.value = false;
        getList();
        getStatistics();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
};

function handleClickEdit(e: { row: Record<string, any> }) {
  editFormVisible.value = true;
  getDetail(e.row.id);
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function handleClickEnable(e: { row: Record<string, any> }) {
  wafFirewallIPBlockEnableApi({ id: e.row.id })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getList();
        getStatistics();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e2: Error) => console.log(e2));
}

function handleClickDisable(e: { row: Record<string, any> }) {
  wafFirewallIPBlockDisableApi({ id: e.row.id })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getList();
        getStatistics();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e2: Error) => console.log(e2));
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  wafFirewallIPBlockDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
        getList();
        getStatistics();
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

function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) {
    MessagePlugin.warning(t('page.firewall_ipblock.no_data_selected'));
    return;
  }
  batchDeleteConfirmVisible.value = true;
}

function onConfirmBatchDelete() {
  batchDeleteConfirmVisible.value = false;
  wafFirewallIPBlockBatchDelApi({ ids: selectedRowKeys.value })
    .then((res) => {
      if (res.code === 0) {
        getList();
        getStatistics();
        MessagePlugin.success(t('page.firewall_ipblock.batch_delete_success'));
        selectedRowKeys.value = [];
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
}

function handleSync() {
  wafFirewallIPBlockSyncApi({ host_code: searchformData.host_code })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getList();
        getStatistics();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
}

function handleClearExpired() {
  wafFirewallIPBlockClearExpiredApi({})
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        getList();
        getStatistics();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
}

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_DATA };
}

function onClickCloseBatchAddBtn() {
  batchAddFormVisible.value = false;
  batchAddFormData.value = { ...BATCH_ADD_INITIAL_DATA };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function getDetail(id: string | number) {
  wafFirewallIPBlockDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        // 处理过期时间显示（保持本地时区）
        let expireTimeDate: Date | null = null;
        if (res.data.expire_time > 0) {
          expireTimeDate = new Date(res.data.expire_time * 1000);
        }
        formEditData.value = {
          ...res.data,
          expire_time_date: expireTimeDate,
        };
      }
    })
    .catch((e: Error) => console.log(e));
}

function formatExpireTime(timestamp: number) {
  if (timestamp === 0) {
    return t('page.firewall_ipblock.permanent');
  }
  const date = new Date(timestamp * 1000);
  if (date < new Date()) {
    return t('page.firewall_ipblock.expired');
  }
  return date.toLocaleString();
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/FirewallIPBlock.html`);
}

onMounted(() => {
  loadHostList().then(() => {
    getList();
    getStatistics();
  });
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

.stat-card {
  text-align: center;
  padding: 8px 0;
}

.stat-label {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.stat-value.stat-active {
  color: #52c41a;
}

.stat-value.stat-inactive {
  color: #8c8c8c;
}

.stat-value.stat-expired {
  color: #faad14;
}
</style>
