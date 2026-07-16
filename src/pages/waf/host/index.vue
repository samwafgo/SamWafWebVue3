<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddHost">{{ t('page.host.new_protection') }}</t-button>
          <t-button variant="base" theme="default" @click="HandleExportExcel()">{{ t('page.host.export_data') }}</t-button>
          <t-button variant="base" theme="default" @click="HandleImportExcel()">{{ t('page.host.import_data') }}</t-button>
          <t-button variant="base" theme="warning" @click="handleModifyAllGuardStatus()">{{ t('page.host.modify_all_guard_status') }}</t-button>
          <t-button variant="base" theme="primary" @click="handleBatchCopyConfig()">{{ t('page.host.batch_copy_config') }}</t-button>
          <t-button variant="base" theme="success" @click="handleImportNginx()">{{ t('page.host.import_nginx') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="80" colon layout="inline" :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.host.website')" name="code">
              <t-select v-model="searchformData.code" clearable filterable :style="{ width: '200px' }">
                <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                  {{ item }}
                </t-option>
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

      <div class="table-container">
        <t-alert theme="info" :message="t('page.host.core_features')" close>
          <template #operation>
            <span @click="handleJumpOnlineUrl">{{ t('common.online_document') }}</span>
          </template>
        </t-alert>
        <t-table
          :columns="columns"
          size="small"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
          @sort-change="onSortChange"
          @filter-change="onFilterChange"
        >
          <template #host="{ row }">
            <div>
              <div v-if="row.nickname" style="color: #888; font-size: 12px; margin-bottom: 2px">{{ row.nickname }}</div>
              <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px">
                <span :title="row.host" style="font-weight: 500">{{ row.host }}</span>
                <t-tag v-if="row.ssl === SSL_STATUS.SSL" theme="success" variant="light" size="small" :title="t('page.host.ssl_yes')">SSL</t-tag>
              </div>
              <div v-if="row.bind_more_host && row.bind_more_host.trim()" style="display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px">
                <t-tag
                  v-for="(domain, i) in splitDomains(row.bind_more_host)"
                  :key="i"
                  theme="default"
                  variant="light"
                  size="small"
                  :title="domain"
                  style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                >
                  {{ domain }}
                </t-tag>
              </div>
            </div>
          </template>
          <template #port="{ row }">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 3px">
              <span style="font-weight: 500; min-width: 36px">{{ row.port }}</span>
              <template v-if="row.bind_more_port && row.bind_more_port.trim()">
                <t-tag v-for="(p, i) in splitPorts(row.bind_more_port)" :key="i" theme="primary" variant="light" size="small" :title="p">
                  {{ p }}
                </t-tag>
              </template>
            </div>
          </template>
          <template #data_stats="{ row }">
            <div style="line-height: 1.8">
              <div>
                <span>{{ t('page.host.today_pv_short') }}: {{ row.today_pv_count || 0 }}</span>
                <span style="margin-left: 8px">{{ t('page.host.today_uv_short') }}: {{ row.today_uv_count || 0 }}</span>
                <span style="margin-left: 8px">{{ t('page.host.today_attack_short') }}: {{ row.today_attack_count || 0 }}</span>
              </div>
              <div>
                <span>{{ t('page.host.today_traffic_in_short') }}: {{ formatTrafficBytes(row.today_traffic_in || 0) }}</span>
                <span style="margin-left: 8px">{{ t('page.host.today_traffic_out_short') }}: {{ formatTrafficBytes(row.today_traffic_out || 0) }}</span>
              </div>
              <div>
                <span :title="t('page.host.real_qps')">{{ t('page.host.real_qps_short') }}: {{ row.real_time_qps }}</span>
                <span :title="t('page.host.real_active')" style="margin-left: 8px">{{ t('page.host.real_active_short') }}: {{ row.real_time_connect_cnt }}</span>
              </div>
            </div>
          </template>
          <template #status_switches="{ row }">
            <div style="display: flex; flex-direction: column; gap: 8px; justify-content: center">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">{{ t('page.host.healthy_status') }}:</span>
                <health-status
                  v-if="row.global_host !== 1"
                  :healthy-status="row.healthy_status"
                  :is-load-balance="row.is_enable_load_balance === '1' || row.is_enable_load_balance === 1"
                />
                <span v-else style="font-size: 12px; color: var(--td-text-color-secondary)">-</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">{{ t('page.host.guard_status') }}:</span>
                <t-switch
                  size="small"
                  :value="row.guard_status === 1"
                  :label="[t('page.host.guard_status_on'), t('page.host.guard_status_off')]"
                  @change="changeGuardStatusHandle(row)"
                />
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">{{ t('page.host.start_status') }}:</span>
                <t-switch
                  size="small"
                  :value="row.start_status === 0"
                  :label="[t('page.host.auto_start_on'), t('page.host.auto_start_off')]"
                  @change="changeStartStatusHandle(row)"
                />
              </div>
              <div v-if="row.global_host !== 1 && isStaticSiteEnabled(row)" style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">{{ t('page.host.static_service_label') }}:</span>
                <t-tag theme="success" variant="light" size="small">{{ t('page.host.static_service_label_on') }}</t-tag>
              </div>
              <div
                v-if="row.global_host !== 1 && (row.unrestricted_port === 0 || row.unrestricted_port === '0')"
                style="display: flex; justify-content: space-between; align-items: center; width: 100%"
              >
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">
                  {{ t('page.host.unrestricted_port.label_unrestricted_port_is_enable') }}:
                </span>
                <t-tag theme="success" variant="light" size="small">{{ t('page.host.unrestricted_port.label_unrestricted_port_is_enable_on') }}</t-tag>
              </div>
            </div>
          </template>
          <template #op="slotProps">
            <a v-if="slotProps.row.global_host !== 1" class="t-button-link" @click="handleClickCopy(slotProps)">{{ t('common.copy') }}</a>
            <a v-if="slotProps.row.global_host !== 1" class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a v-if="slotProps.row.global_host !== 1" class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
            <a v-if="slotProps.row.global_host !== 1" class="t-button-link" @click="handleClickSSLApply(slotProps)">{{ t('page.host.ssl_auto_apply') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- New WebSite Dialog -->
    <t-dialog v-model:visible="addFormVisible" :width="750" :footer="false">
      <template #header>
        {{ t('common.new') }}
        <t-link theme="primary" :href="hostAddUrl" target="_blank">
          <template #prefix-icon><link-icon /></template>
          {{ t('common.online_document') }}
        </t-link>
      </template>
      <host-form :value="formData" :select-can-filter="selectCanFilter" @close="onClickCloseBtn" @submit="onSubmit" />
    </t-dialog>

    <!-- Edit WebSite Dialog -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="750" :footer="false">
      <host-form :value="formEditData" :select-can-filter="selectCanFilter" :is-edit="true" @close="onClickCloseEditBtn" @submit="onSubmitEdit" />
    </t-dialog>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />

    <t-dialog v-model:visible="ImportXlsxVisible" @confirm="ImportXlsxVisible = false">
      <t-radio-group v-model="uploadParams.import_code_strategy">
        <t-radio value="0">{{ t('page.host.upload.import_auto_create_code') }}</t-radio>
        <t-radio value="1">{{ t('page.host.upload.import_remain_code') }}</t-radio>
      </t-radio-group>
      <t-upload
        v-model="files"
        :action="fileUploadUrl"
        :tips="tips"
        :headers="fileHeader"
        :data="uploadParams"
        :before-upload="beforeUpload"
        theme="file-input"
        :placeholder="t('page.host.upload_tips')"
        @fail="handleFail"
        @success="onUploadSuccess"
      />
    </t-dialog>

    <t-dialog
      v-model:visible="guardConfirmVisible"
      :header="t('page.host.guard_status_confirm')"
      :on-cancel="onGuardStatusCancel"
      @confirm="onGuardStatusConfirm"
    >
      <div>{{ t('page.host.guard_status_confirm_content') }}</div>
    </t-dialog>

    <t-dialog
      v-model:visible="startConfirmVisible"
      :header="t('page.host.start_status_confirm')"
      :on-cancel="onStartStatusCancel"
      @confirm="onStartStatusConfirm"
    >
      <div>{{ t('page.host.start_status_confirm_content') }}</div>
    </t-dialog>

    <t-dialog v-model:visible="sslAutoApplyVisible" :header="t('page.host.ssl_auto_apply')" :width="900" :footer="false">
      <ssl-order-list :src-host-code="currentHostCode" />
    </t-dialog>

    <t-dialog
      v-model:visible="guardAllConfirmVisible"
      :header="t('page.host.modify_all_guard_status')"
      :on-cancel="onGuardAllStatusCancel"
      @confirm="onGuardAllStatusConfirm"
    >
      <div>{{ t('page.host.confirm_modify_all_guard_status') }}</div>
      <t-radio-group v-model="guardAllStatus" style="margin-top: 16px">
        <t-radio value="1">{{ t('page.host.guard_status_on') }}</t-radio>
        <t-radio value="0">{{ t('page.host.guard_status_off') }}</t-radio>
      </t-radio-group>
    </t-dialog>

    <!-- 批量复制配置弹窗 -->
    <t-dialog
      v-model:visible="batchCopyVisible"
      :header="t('page.host.batch_copy.title')"
      :confirm-btn="{ content: t('page.host.batch_copy.execute_copy'), loading: batchCopyLoading }"
      :cancel-btn="{ content: t('common.cancel') }"
      width="600px"
      @confirm="executeBatchCopy"
      @cancel="cancelBatchCopy"
    >
      <!-- 源站点选择 -->
      <div class="batch-copy-section">
        <label class="batch-copy-label">{{ t('page.host.batch_copy.source_host') }}：</label>
        <t-select v-model="batchCopyForm.sourceHost" :placeholder="t('page.host.batch_copy.select_source_host')" style="width: 100%">
          <t-option v-for="item in sourceHostOptions" :key="item.code" :value="item.code" :label="item.host">
            {{ item.host }}
          </t-option>
        </t-select>
      </div>

      <!-- 功能模块选择 -->
      <div class="batch-copy-section">
        <label class="batch-copy-label">{{ t('page.host.batch_copy.copy_modules') }}：</label>
        <div class="module-checkboxes">
          <t-checkbox
            v-for="module in availableModules"
            :key="module.value"
            :checked="batchCopyForm.modules.includes(module.value)"
            class="module-checkbox"
            @change="(checked: boolean) => handleModuleChange(module.value, checked)"
          >
            {{ module.label }}
          </t-checkbox>
        </div>
      </div>

      <!-- 目标站点选择 -->
      <div class="batch-copy-section">
        <label class="batch-copy-label">{{ t('page.host.batch_copy.target_hosts') }}：</label>
        <div class="target-hosts-container">
          <div class="select-all-container">
            <t-checkbox
              :checked="isAllTargetsSelected"
              :indeterminate="batchCopyForm.targetHosts.length > 0 && !isAllTargetsSelected"
              @change="toggleSelectAllTargets"
            >
              {{ t('page.host.batch_copy.select_all') }}
            </t-checkbox>
          </div>
          <div class="target-hosts-list">
            <t-checkbox
              v-for="host in availableTargetHosts"
              :key="host.code"
              :checked="batchCopyForm.targetHosts.includes(host.code)"
              class="target-host-checkbox"
              @change="(checked: boolean) => handleTargetHostChange(host.code, checked)"
            >
              {{ host.host }}
            </t-checkbox>
          </div>
        </div>
      </div>

      <!-- 选择统计 -->
      <div class="batch-copy-summary">
        <t-tag theme="primary" variant="light">
          {{ t('page.host.batch_copy.selected_modules', { count: batchCopyForm.modules.length }) }}
        </t-tag>
        <t-tag theme="success" variant="light" style="margin-left: 8px">
          {{ t('page.host.batch_copy.selected_targets', { count: batchCopyForm.targetHosts.length }) }}
        </t-tag>
      </div>
    </t-dialog>

    <!-- 批量复制进度弹窗 -->
    <t-dialog
      v-model:visible="batchCopyProgress.visible"
      :header="t('page.host.batch_copy.progress_title')"
      :close-on-overlay-click="false"
      :close-btn="false"
      :footer="false"
      width="500px"
    >
      <div class="progress-container">
        <t-progress
          :percentage="batchCopyProgress.total > 0 ? Math.round((batchCopyProgress.current / batchCopyProgress.total) * 100) : 0"
          :status="batchCopyProgress.status === 'error' ? 'warning' : 'active'"
          style="margin-bottom: 16px"
        />

        <div class="progress-info">
          <div class="progress-text">
            <span v-if="batchCopyProgress.status === 'processing'">
              {{ t('page.host.batch_copy.copying_to') }} {{ batchCopyProgress.currentHost }}
            </span>
            <span v-else-if="batchCopyProgress.status === 'success'" class="success-text">
              {{ t('page.host.batch_copy.copy_completed') }}
            </span>
            <span v-else-if="batchCopyProgress.status === 'error'" class="error-text">
              {{ t('page.host.batch_copy.copy_error') }}
            </span>
          </div>
          <div class="progress-count">{{ batchCopyProgress.current }} / {{ batchCopyProgress.total }}</div>
        </div>

        <div v-if="batchCopyProgress.status !== 'processing'" class="progress-actions">
          <t-button theme="primary" @click="closeBatchCopyProgress">
            {{ t('common.close') }}
          </t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, LoadingPlugin, type TableProps, type PageInfo } from 'tdesign-vue-next';
import { LinkIcon } from 'tdesign-icons-vue-next';
import { v4 as uuidv4 } from 'uuid';

import { AesDecrypt } from '@/utils/crypto';
import { getOnlineUrl } from '@/utils/usuallytool';
import { API_HOST } from '@/config/host';
import { SSL_STATUS } from '@/constants';
import { export_api } from '@/apis/common';
import {
  allhost,
  changeGuardStatus,
  changeStartStatus,
  hostlist,
  getHostDetail,
  delHost,
  addHost,
  editHost,
  modifyAllGuardStatus,
  batchCopyConfig,
} from '@/apis/host';

import SslOrderList from '@/pages/waf/sslorder/index.vue';
import HealthStatus from './components/health-status/HealthStatus.vue';
import HostForm from './components/HostForm.vue';
import { INITIAL_DATA } from './constants';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// 批量复制配置相关数据
const batchCopyVisible = ref(false);
const batchCopyLoading = ref(false);
const batchCopyProgress = reactive({
  visible: false,
  current: 0,
  total: 0,
  currentHost: '',
  status: 'processing' as 'processing' | 'success' | 'error',
});
const batchCopyForm = reactive({
  sourceHost: '',
  modules: ['cache'] as string[], // 默认选中缓存模块
  targetHosts: [] as string[],
});
const availableModules = computed(() => [
  { value: 'cache', label: t('page.host.batch_copy.module_cache') },
  { value: 'response_compress', label: t('page.host.batch_copy.module_response_compress') },
]);

const uploadParams = reactive({
  import_code_strategy: '0', // 编码导入策略 0 新增自动生成 1 保留原有
  import_table: 'hosts',
});
const files = ref<any[]>([]);
const tips = ref<string>(t('page.host.upload_file_limit_size'));
const fileUploadUrl = `${API_HOST}/import`;
const fileHeader = reactive<Record<string, string>>({
  'X-Token': localStorage.getItem('access_token') || '',
});

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const sslAutoApplyVisible = ref(false);
const ImportXlsxVisible = ref(false);
const guardConfirmVisible = ref(false);
const startConfirmVisible = ref(false);
const guardAllConfirmVisible = ref(false);
const guardAllStatus = ref('1');

const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const selectCanFilter = ref(true);
const currentHostCode = ref('');

const columns = computed<TableProps['columns']>(() => [
  {
    title: t('page.host.host'),
    align: 'left',
    width: 180,
    ellipsis: true,
    colKey: 'host',
    cell: 'host',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('page.host.host_filter_placeholder') },
      showConfirmAndReset: true,
    },
  },
  {
    title: t('page.host.port'),
    width: 140,
    colKey: 'port',
    cell: 'port',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  { title: t('page.host.stats_info'), colKey: 'data_stats', width: 260, cell: 'data_stats' },
  { title: t('common.status'), colKey: 'status_switches', width: 150, cell: 'status_switches' },
  {
    title: t('page.host.remote_ip'),
    width: 100,
    ellipsis: true,
    colKey: 'remote_ip',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  {
    title: t('page.host.remote_port'),
    width: 100,
    ellipsis: true,
    colKey: 'remote_port',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  {
    title: t('common.remarks'),
    width: 100,
    ellipsis: true,
    colKey: 'remarks',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time', sorter: true },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

// 顶部搜索
const searchformData = reactive({ remarks: '', code: '' });
// 排序字段
const sorts = reactive({ sortBy: 'create_time', descending: true });
// 筛选字段
const filters = reactive({ filter_by: '', filter_value: '' });

// 索引区域
const deleteIdx = ref(-1);
const guardStatusIdx = ref(-1);
const startStatusIdx = ref(-1);

const hostAddUrl = `${getOnlineUrl()}/guide/Host.html#_2-新增可被防火墙保护的网站`;

// 主机字典
const host_dic = ref<Record<string, string>>({});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('page.host.delete_confirm_clear_relation');
  }
  return '';
});

/** 批量复制源站点选项（排除全局网站） */
const sourceHostOptions = computed(() =>
  Object.keys(host_dic.value)
    .map((code) => ({ code, host: host_dic.value[code] }))
    .filter((item) => item.host !== '全局网站:0'),
);

/** 可用的目标主机列表（排除源主机与全局网站） */
const availableTargetHosts = computed(() => {
  const nonGlobalHosts = sourceHostOptions.value;
  if (batchCopyForm.sourceHost) {
    return nonGlobalHosts.filter((host) => host.code !== batchCopyForm.sourceHost);
  }
  return nonGlobalHosts;
});

/** 是否全选了所有目标站点 */
const isAllTargetsSelected = computed(
  () => batchCopyForm.targetHosts.length === availableTargetHosts.value.length && availableTargetHosts.value.length > 0,
);

function splitDomains(bindMoreHost: string): string[] {
  return bindMoreHost
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitPorts(bindMorePort: string): string[] {
  return bindMorePort
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatTrafficBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

// 一键修改所有主机防护状态
function handleModifyAllGuardStatus() {
  guardAllConfirmVisible.value = true;
}

function onGuardAllStatusConfirm() {
  doModifyAllGuardStatus(guardAllStatus.value);
  guardAllConfirmVisible.value = false;
}

function onGuardAllStatusCancel() {
  guardAllConfirmVisible.value = false;
}

function doModifyAllGuardStatus(status: string) {
  const loading = LoadingPlugin({ fullscreen: true, text: t('common.loading') });
  modifyAllGuardStatus({ guard_status: parseInt(status) })
    .then((response) => {
      if (response.code === 0) {
        MessagePlugin.success(t('common.success'));
        getList();
      } else {
        MessagePlugin.error(response.msg || t('common.failed'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.failed'));
    })
    .finally(() => {
      loading.hide();
    });
}

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
  const sort_descending = sorts.descending ? 'desc' : 'asc';
  hostlist({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    sort_by: sorts.sortBy,
    sort_descending,
    filter_by: filters.filter_by,
    filter_value: filters.filter_value,
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

function handleClickCopy(e: { row: Record<string, any> }) {
  const { code, global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site'));
    return;
  }
  addFormVisible.value = true;
  getHostDetail({ CODE: code })
    .then((res) => {
      if (res.code === 0) {
        formData.value = {
          ...res.data,
          code: uuidv4(),
          // 清空SSL证书相关信息和绑定关系
          bind_ssl_id: '',
          auto_jump_https: 0,
          certfile: '',
          keyfile: '',
        };
      }
    })
    .catch((e2: Error) => {
      console.log(e2);
    });
}

function handleClickEdit(e: { row: Record<string, any> }) {
  const { code, global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site_only_change_guard_status'));
    return;
  }
  editFormVisible.value = true;
  getDetail(code);
}

function handleAddHost() {
  formData.value = { ...formData.value, code: uuidv4() };
  addFormVisible.value = true;
}

// 跳转到一键修改页的“批量导入网址”标签
function handleImportNginx() {
  router.push({ name: 'OneKeyMod', query: { tab: 'import' } });
}

function onSubmit(payload: { result: Record<string, any> }) {
  addHost({ ...payload.result })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        if (payload.result.ssl_config_mode === 'auto_apply') {
          loadHostList().then(() => {
            sslAutoApplyVisible.value = true;
            currentHostCode.value = res.data;
          });
        }
        addFormVisible.value = false;
        pagination.current = 1;
        formData.value = { ...INITIAL_DATA };
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onSubmitEdit(payload: { result: Record<string, any> }) {
  editHost({ ...payload.result })
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
}

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_DATA };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function handleClickDelete(e: { row: Record<string, any>; rowIndex: number }) {
  const { global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site_only_change_guard_status'));
  }
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

// SSL申请
function handleClickSSLApply(e: { row: Record<string, any> }) {
  const { code, global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site'));
  }
  loadHostList().then(() => {
    sslAutoApplyVisible.value = true;
    currentHostCode.value = code;
  });
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { code } = data.value[deleteIdx.value];
  delHost({ CODE: code })
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

function getDetail(id: string) {
  getHostDetail({ CODE: id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/** 导出Excel数据 */
function HandleExportExcel() {
  export_api({ table_name: 'hosts' })
    .then((res) => {
      const blob = new Blob([res as any], { type: 'application/force-download' });
      const fileReader = new FileReader();
      fileReader.readAsDataURL(blob);
      fileReader.onload = (e) => {
        const a = document.createElement('a');
        a.download = 'hosts.xlsx';
        a.href = (e.target as FileReader).result as string;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/** 导入Excel数据 */
function HandleImportExcel() {
  ImportXlsxVisible.value = true;
  tips.value = '';
  files.value = [];
}

function changeGuardStatusHandle(row: Record<string, any>) {
  const { code } = row;
  guardStatusIdx.value = data.value.findIndex((value) => value.code === code);
  guardConfirmVisible.value = true;
}

function changeStartStatusHandle(row: Record<string, any>) {
  const { code } = row;
  startStatusIdx.value = data.value.findIndex((value) => value.code === code);
  startConfirmVisible.value = true;
}

function isStaticSiteEnabled(row: Record<string, any>) {
  if (!row || !row.static_site_json) return false;
  try {
    const cfg = typeof row.static_site_json === 'string' ? JSON.parse(row.static_site_json) : row.static_site_json;
    return cfg.is_enable_static_site === 1 || cfg.is_enable_static_site === '1';
  } catch {
    return false;
  }
}

function handleFail({ file }: { file: any }) {
  MessagePlugin.error(`文件 ${file.name} 上传失败`);
}

function beforeUpload() {
  // 防重放校验所需头信息
  fileHeader['X-Request-Time'] = Math.floor(Date.now() / 1000).toString();
  fileHeader['X-Request-Id'] = uuidv4();
  return true;
}

function onUploadSuccess(context: any) {
  const respData = JSON.parse(AesDecrypt(context.response.data));
  let lastMsg = `成功数量 :${respData.SuccessInt}`;
  if (respData.FailInt > 0) {
    lastMsg += `失败数量 :${respData.FailInt} 错误原因:${respData.Msg}`;
  }
  tips.value = lastMsg;
  getList();
}

// 跳转在线文档
function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/Host.html`);
}

// 防护状态弹窗确认
function onGuardStatusConfirm() {
  if (guardStatusIdx.value === -1) {
    return;
  }
  const { code, guard_status } = data.value[guardStatusIdx.value];
  changeGuardStatus({
    CODE: code,
    GUARD_STATUS: guard_status === 1 ? 0 : 1,
  })
    .then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
      guardStatusIdx.value = -1;
      guardConfirmVisible.value = false;
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onGuardStatusCancel() {
  guardConfirmVisible.value = false;
  guardStatusIdx.value = -1;
}

function onStartStatusConfirm() {
  startConfirmVisible.value = false;
  const { code, start_status } = data.value[startStatusIdx.value];
  changeStartStatus({
    CODE: code,
    START_STATUS: start_status === 1 ? 0 : 1,
  })
    .then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
      startStatusIdx.value = -1;
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onStartStatusCancel() {
  startConfirmVisible.value = false;
  startStatusIdx.value = -1;
}

/** 表头筛选 */
const onFilterChange: TableProps['onFilterChange'] = (e: Record<string, any>) => {
  const filterList: { by: string; value: string }[] = [];
  if (e.host) filterList.push({ by: 'host', value: e.host });
  if (e.port) filterList.push({ by: 'port', value: e.port });
  if (e.remote_ip) filterList.push({ by: 'remote_ip', value: e.remote_ip });
  if (e.remote_port) filterList.push({ by: 'remote_port', value: e.remote_port });
  if (e.remarks) filterList.push({ by: 'remarks', value: e.remarks });

  filters.filter_by = filterList.map((f) => f.by).join('|');
  filters.filter_value = filterList.map((f) => f.value).join('|');
  getList();
};

const onSortChange: TableProps['onSortChange'] = (sorter: any) => {
  if (sorter != undefined) {
    sorts.sortBy = sorter.sortBy;
    sorts.descending = sorter.descending;
  } else {
    sorts.sortBy = 'create_time';
    sorts.descending = true;
  }
  getList();
};

/** 处理目标站点选择变化 */
function handleTargetHostChange(hostCode: string, checked: boolean) {
  if (checked) {
    if (!batchCopyForm.targetHosts.includes(hostCode)) {
      batchCopyForm.targetHosts.push(hostCode);
    }
  } else {
    const index = batchCopyForm.targetHosts.indexOf(hostCode);
    if (index > -1) {
      batchCopyForm.targetHosts.splice(index, 1);
    }
  }
}

/** 处理模块选择变化 */
function handleModuleChange(moduleValue: string, checked: boolean) {
  if (checked) {
    if (!batchCopyForm.modules.includes(moduleValue)) {
      batchCopyForm.modules.push(moduleValue);
    }
  } else {
    const index = batchCopyForm.modules.indexOf(moduleValue);
    if (index > -1) {
      batchCopyForm.modules.splice(index, 1);
    }
  }
}

/** 批量复制配置 */
function handleBatchCopyConfig() {
  batchCopyVisible.value = true;
}

/** 执行批量复制配置 */
function executeBatchCopy() {
  if (!batchCopyForm.sourceHost) {
    MessagePlugin.warning(t('page.host.batch_copy.select_source_host'));
    return;
  }
  if (batchCopyForm.modules.length === 0) {
    MessagePlugin.warning(t('page.host.batch_copy.select_modules'));
    return;
  }
  if (batchCopyForm.targetHosts.length === 0) {
    MessagePlugin.warning(t('page.host.batch_copy.select_target_hosts'));
    return;
  }

  batchCopyLoading.value = true;
  batchCopyProgress.visible = true;
  batchCopyProgress.current = 0;
  batchCopyProgress.total = batchCopyForm.targetHosts.length;
  batchCopyProgress.status = 'processing';

  performBatchCopy();
}

async function performBatchCopy() {
  const copyData = {
    sourceHost: batchCopyForm.sourceHost,
    modules: batchCopyForm.modules,
    targetHosts: batchCopyForm.targetHosts,
  };

  try {
    for (let i = 0; i < copyData.targetHosts.length; i++) {
      const targetHost = copyData.targetHosts[i];
      batchCopyProgress.currentHost = getHostDisplayName(targetHost);
      await copyConfigToHost(copyData.sourceHost, targetHost, copyData.modules);
      batchCopyProgress.current = i + 1;
      // 添加短暂延迟以显示进度效果
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    batchCopyProgress.status = 'success';
    MessagePlugin.success(t('page.host.batch_copy.copy_success'));
    setTimeout(() => {
      closeBatchCopyProgress();
    }, 2000);
  } catch (error) {
    batchCopyProgress.status = 'error';
    MessagePlugin.error(t('page.host.batch_copy.copy_failed'));
    console.error('批量复制失败:', error);
  } finally {
    batchCopyLoading.value = false;
  }
}

/** 复制配置到指定主机 */
async function copyConfigToHost(sourceHost: string, targetHost: string, modules: string[]) {
  const response = await batchCopyConfig({
    source_host_code: sourceHost,
    target_host_code: targetHost,
    modules,
  });
  if (response.code !== 0) {
    throw new Error(response.msg || '复制失败');
  }
}

function getHostDisplayName(hostCode: string) {
  return host_dic.value[hostCode] || '无';
}

function closeBatchCopyProgress() {
  batchCopyProgress.visible = false;
  batchCopyVisible.value = false;
  resetBatchCopyForm();
}

function resetBatchCopyForm() {
  batchCopyForm.sourceHost = '';
  batchCopyForm.modules = ['cache'];
  batchCopyForm.targetHosts = [];
}

function cancelBatchCopy() {
  batchCopyVisible.value = false;
  resetBatchCopyForm();
}

/** 全选/取消全选目标站点 */
function toggleSelectAllTargets() {
  if (batchCopyForm.targetHosts.length === availableTargetHosts.value.length) {
    batchCopyForm.targetHosts = [];
  } else {
    batchCopyForm.targetHosts = availableTargetHosts.value.map((host) => host.code);
  }
}

onMounted(() => {
  loadHostList().then(() => {
    getList();
  });
  // 从首页引导跳入时直接打开新增弹窗
  if (route.query && route.query.sourcePage === 'HomeFrist') {
    addFormVisible.value = true;
  }
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

.table-container {
  margin-top: 8px;
}

/* 批量复制配置弹窗样式 */
.batch-copy-section {
  margin-bottom: 20px;
}

.batch-copy-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.module-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.module-checkbox {
  margin: 0;
}

.target-hosts-container {
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 6px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.select-all-container {
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.target-hosts-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.target-host-checkbox {
  margin: 0;
}

.batch-copy-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--td-border-level-1-color);
}

/* 批量复制进度弹窗样式 */
.progress-container {
  text-align: center;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-text {
  font-size: 14px;
  color: var(--td-text-color-primary);
}

.success-text {
  color: var(--td-success-color);
}

.error-text {
  color: var(--td-error-color);
}

.progress-count {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.progress-actions {
  margin-top: 16px;
}
</style>
