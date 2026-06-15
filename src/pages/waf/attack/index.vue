<template>
  <div>
    <t-alert theme="info" :message="t('page.visit_log.visit_log')" :close="true">
      <template #operation>
        <span @click="handleJumpOnlineUrl">{{ t('common.online_document') }}</span>
      </template>
    </t-alert>

    <!-- 日志配置区域 -->
    <t-card class="log-config-card" style="margin-bottom: 16px">
      <div
        style="cursor: pointer; display: flex; justify-content: space-between; align-items: center"
        @click="toggleLogConfig"
      >
        <div style="display: flex; align-items: center">
          <chevron-down-icon v-if="logConfigVisible" style="margin-right: 8px" />
          <chevron-right-icon v-else style="margin-right: 8px" />
          <span style="font-weight: 500; font-size: 14px">日志配置</span>
        </div>
        <t-button theme="primary" size="small" :loading="logConfigSaving" @click.stop="saveLogConfig"> 保存配置 </t-button>
      </div>

      <div v-show="logConfigVisible" style="margin-top: 16px">
        <t-form :data="logConfig" :label-width="200" layout="inline">
          <t-row :gutter="16">
            <t-col :span="6">
              <t-form-item label="是否记录响应报文" name="record_resp">
                <t-select v-model="logConfig.record_resp" style="width: 100%">
                  <t-option value="1" label="是" />
                  <t-option value="0" label="否" />
                </t-select>
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="记录原始请求BODY报文" name="record_all_src_byte_info">
                <t-select v-model="logConfig.record_all_src_byte_info" style="width: 100%">
                  <t-option value="1" label="启动" />
                  <t-option value="0" label="关闭" />
                </t-select>
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="日志记录类型" name="record_log_type">
                <t-select v-model="logConfig.record_log_type" style="width: 100%">
                  <t-option value="all" label="全部" />
                  <t-option value="abnormal" label="非正常" />
                </t-select>
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="记录请求最大报文(字节)" name="record_max_req_body_length">
                <t-input-number v-model="logConfig.record_max_req_body_length" style="width: 100%" :min="0" />
              </t-form-item>
            </t-col>
          </t-row>

          <t-row :gutter="16">
            <t-col :span="6">
              <t-form-item label="记录响应最大报文(字节)" name="record_max_res_body_length">
                <t-input-number v-model="logConfig.record_max_res_body_length" style="width: 100%" :min="0" />
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="删除历史日志(天)" name="delete_history_log_day">
                <t-input-number v-model="logConfig.delete_history_log_day" style="width: 100%" :min="1" />
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="日志归档最大记录数" name="log_db_size">
                <t-input-number v-model="logConfig.log_db_size" style="width: 100%" :min="0" />
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="日志归档最大文件(MB)" name="db_file_size">
                <t-input-number v-model="logConfig.db_file_size" style="width: 100%" :min="0" />
              </t-form-item>
            </t-col>
          </t-row>

          <t-row :gutter="16">
            <t-col :span="6">
              <t-form-item label="是否开启日志持久化" name="log_persist_enable">
                <t-select v-model="logConfig.log_persist_enable" style="width: 100%">
                  <t-option value="1" label="开启" />
                  <t-option value="0" label="关闭" />
                </t-select>
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="数据库批量插入数量" name="batch_insert">
                <t-input-number v-model="logConfig.batch_insert" style="width: 100%" :min="1" />
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="IP Tag 存放位置" name="ip_tag_db">
                <t-select v-model="logConfig.ip_tag_db" style="width: 100%">
                  <t-option value="0" label="主库" />
                  <t-option value="1" label="读取 stat库" />
                </t-select>
              </t-form-item>
            </t-col>
          </t-row>
        </t-form>
      </div>
    </t-card>

    <t-card class="list-card-container">
      <t-row justify="space-between">
        <t-form ref="searchForm" :data="searchformData" :label-width="150" colon layout="inline" :style="{ marginBottom: '8px' }">
          <t-form-item :label="t('page.visit_log.website')" name="website">
            <t-select v-model="searchformData.host_code" clearable filterable :style="{ width: '150px' }">
              <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                {{ item }}
              </t-option>
            </t-select>
          </t-form-item>
          <t-form-item :label="t('page.visit_log.rule_name')" name="rule">
            <t-input
              v-model="searchformData.rule"
              class="form-item-content"
              type="search"
              :placeholder="t('common.placeholder') + t('page.visit_log.rule_name')"
              :style="{ minWidth: '134px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.req_uuid')" name="req_uuid">
            <t-input
              v-model="searchformData.req_uuid"
              class="form-item-content"
              type="search"
              :placeholder="t('common.placeholder') + t('page.visit_log.req_uuid')"
              :style="{ minWidth: '200px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.access_status')" name="action">
            <t-select
              v-model="searchformData.action"
              class="form-item-content"
              :options="action_options"
              :placeholder="t('common.select_placeholder') + t('page.visit_log.access_status')"
              :style="{ width: '100px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.status_code')" name="status_code">
            <t-input
              v-model="searchformData.status_code"
              class="form-item-content"
              :placeholder="t('common.placeholder') + t('page.visit_log.status_code')"
              :style="{ minWidth: '100px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.source_ip')" name="src_ip">
            <t-input
              v-model="searchformData.src_ip"
              class="form-item-content"
              :placeholder="t('common.placeholder') + t('page.visit_log.source_ip')"
              :style="{ minWidth: '100px' }"
            />
          </t-form-item>
          <t-form-item v-if="attack_ip === ''" :label="t('page.visit_log.access_date')" name="unix_add_time">
            <t-date-range-picker
              v-model="dateControl.range1"
              :presets="dateControl.presets"
              enable-time-picker
              value-type="YYYY-MM-DD HH:mm:ss"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.access_method')" name="method">
            <t-select
              v-model="searchformData.method"
              class="form-item-content"
              :options="method_options"
              :placeholder="t('common.placeholder') + t('page.visit_log.access_method')"
              :style="{ width: '100px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.log_archive_db')" name="sharedb">
            <t-select v-model="searchformData.current_db_name" clearable :style="{ width: '150px' }">
              <t-option v-for="(item, index) in share_db_dic" :key="index" :value="index" :label="item">
                {{ item }}
              </t-option>
            </t-select>
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')"> {{ t('common.search') }} </t-button>
            <t-button v-if="attack_ip === ''" theme="primary" :style="{ marginLeft: '8px' }" @click="exportDbVisible = true">
              {{ t('common.export') }}
            </t-button>
            <t-button type="reset" variant="base" theme="default"> {{ t('common.reset') }} </t-button>
            <t-button theme="primary" variant="outline" :style="{ marginLeft: '8px' }" @click="handleIPExtractIssue">
              {{ t('page.visit_log.detail.ip_extract_issue') }}
            </t-button>
          </t-form-item>
        </t-form>
      </t-row>

      <div class="table-container">
        <!-- 自定义工具栏，将所有按钮放在一起 -->
        <div
          class="table-toolbar"
          style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px"
        >
          <div class="left-actions"></div>
          <div class="right-actions">
            <t-space>
              <t-button theme="default" variant="outline" size="small" @click="toggleColumnController">
                <template #icon>
                  <setting-icon />
                </template>
                {{ t('common.column_config') }}
              </t-button>
              <t-button theme="default" variant="outline" size="small" @click="resetColumnConfig">
                {{ t('common.reset_column_config') }}
              </t-button>
            </t-space>
          </div>
        </div>
        <t-table
          :columns="columns"
          :data="data"
          size="small"
          :row-key="rowKey"
          vertical-align="top"
          :display-columns="displayColumns"
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          :sort="sorts"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
          @sort-change="onSortChange"
          @filter-change="onFilterChange"
        >
          <template #action="{ row }">
            <t-tag v-if="row.action === '放行'" shape="round" theme="success">{{ row.action }}</t-tag>
            <t-tag v-if="row.action === '阻止'" shape="round" theme="danger">{{ row.action }}</t-tag>
            <t-tag v-if="row.action === '禁止'" shape="round" theme="warning">{{ row.action }}</t-tag>
          </template>
          <template #rule="{ row }">
            <t-tag v-if="row.rule !== ''" shape="round" theme="primary" variant="outline">{{ row.rule }}</t-tag>
          </template>
          <template #log_only_mode="{ row }">
            <t-tag :theme="row.log_only_mode == '1' ? 'danger' : 'success'" variant="light-outline">
              {{ row.log_only_mode == '1' ? t('page.visit_log.log_only_mode_on') : t('page.visit_log.log_only_mode_off') }}
            </t-tag>
          </template>
          <template #ai_score="{ row }">
            <t-tag
              v-if="row.ai_score > 0"
              :theme="row.ai_score >= 0.9 ? 'danger' : row.ai_score >= 0.6 ? 'warning' : 'primary'"
              variant="light"
            >
              {{ Number(row.ai_score).toFixed(2) }}
            </t-tag>
            <span v-else>-</span>
          </template>
          <template #src_ip="{ row }">
            <span>{{ row.src_ip }}</span>
            <t-button theme="primary" shape="round" size="small" style="margin-left: 8px" @click="handleAddipblock(row)">
              {{ t('page.visit_log.detail.add_to_deny_list') }}
            </t-button>
          </template>
          <template #op="slotProps">
            <a v-if="attack_ip === ''" class="t-button-link" @click="handleClickIPDetail(slotProps)">{{
              t('common.search') + t('page.visit_log.source_ip')
            }}</a>
            <a class="t-button-link" @click="handleClickDetail(slotProps)">{{ t('common.details') }}</a>
            <a class="t-button-link" style="margin-left: 8px" @click="openAiMarkDialog(slotProps.row)">
              <t-tag
                v-if="aiMarkMap[slotProps.row.req_uuid] && aiMarkMap[slotProps.row.req_uuid].mark"
                :theme="
                  aiMarkMap[slotProps.row.req_uuid].mark === 'attack'
                    ? 'danger'
                    : aiMarkMap[slotProps.row.req_uuid].mark === 'normal'
                    ? 'success'
                    : 'default'
                "
                variant="light"
                size="small"
              >
                {{ aiMarkText(aiMarkMap[slotProps.row.req_uuid]) }}
              </t-tag>
              <span v-else>{{ t('page.visit_log.ai_mark') }}</span>
            </a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog
      v-model:visible="exportDbVisible"
      :header="t('page.visit_log.export_db_file_header')"
      :body="t('page.visit_log.export_db_file_content')"
      width="40%"
      :confirm-on-enter="true"
      :on-close="() => (exportDbVisible = false)"
      @confirm="handelExport"
    >
    </t-dialog>

    <t-dialog
      v-model:visible="visitDetailVisible"
      :header="t('page.visit_log.pop_detail_header')"
      width="80%"
      :confirm-on-enter="true"
      :on-confirm="() => (visitDetailVisible = false)"
      :on-close="() => (visitDetailVisible = false)"
    >
      <visit-detail-page :prop_current_db="searchformData.current_db_name" :prop_req_uuid="visitDetailUid"></visit-detail-page>
    </t-dialog>

    <!-- AI 训练标记弹窗 -->
    <t-dialog
      v-model:visible="aiMarkDialogVisible"
      :header="t('page.visit_log.ai_mark_dialog_title')"
      width="460px"
      :on-close="() => (aiMarkDialogVisible = false)"
    >
      <t-form label-align="top">
        <t-form-item :label="t('page.visit_log.ai_mark_verdict')">
          <t-radio-group v-model="aiMarkForm.verdict">
            <t-radio-button value="normal">{{ t('page.visit_log.ai_mark_normal') }}</t-radio-button>
            <t-radio-button value="attack">{{ t('page.visit_log.ai_mark_attack') }}</t-radio-button>
            <t-radio-button value="ignore">{{ t('page.visit_log.ai_mark_ignore') }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item v-if="aiMarkForm.verdict === 'attack'" :label="t('page.visit_log.ai_mark_category')">
          <t-select v-model="aiMarkForm.attackType" :options="aiCatSelectOptions" style="width: 240px" />
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button
          v-if="aiMarkDialogRow && aiMarkMap[aiMarkDialogRow.req_uuid]"
          theme="danger"
          variant="outline"
          @click="confirmAiUnmark"
          >{{ t('page.visit_log.ai_mark_unmark') }}</t-button
        >
        <t-button theme="default" @click="aiMarkDialogVisible = false">{{ t('common.cancel') }}</t-button>
        <t-button theme="primary" @click="confirmAiMark">{{ t('common.confirm') }}</t-button>
      </template>
    </t-dialog>

    <!-- 列配置弹窗 -->
    <t-dialog
      v-model:visible="columnControllerVisible"
      :header="t('common.column_config')"
      width="500px"
      @confirm="handleColumnControllerConfirm"
      @cancel="handleColumnControllerCancel"
    >
      <div class="column-controller-content">
        <t-checkbox-group v-model="tempDisplayColumns" style="display: flex; flex-direction: column">
          <t-checkbox v-for="field in availableFields" :key="field.value" :value="field.value" :label="field.label" />
        </t-checkbox-group>
      </div>
    </t-dialog>

    <!-- IP提取问题对话框 -->
    <t-dialog v-model:visible="ipExtractDialogVisible" :header="t('page.visit_log.detail.ip_extract_issue')" :width="800" :footer="false">
      <p>{{ t('page.visit_log.detail.ip_extract_issue_desc') }}</p>

      <!-- 视频教程链接 -->
      <t-alert theme="success" style="margin-bottom: 16px">
        <template #icon>
          <span style="font-size: 20px">📺</span>
        </template>
        <div style="display: flex; align-items: center; justify-content: space-between">
          <span>{{ t('page.visit_log.detail.ip_extract_video_tutorial') }}</span>
          <t-button theme="primary" size="small" @click="openVideoTutorial">
            {{ t('page.visit_log.detail.ip_extract_watch_tutorial') }}
          </t-button>
        </div>
      </t-alert>

      <!-- 常用头信息提示区域 -->
      <t-card :title="t('page.visit_log.detail.ip_extract_common_headers')" style="margin-bottom: 20px">
        <p style="margin-bottom: 12px; color: #666">{{ t('page.visit_log.detail.ip_extract_common_headers_desc') }}</p>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px">
          <t-button size="small" variant="outline" @click="selectIPHeader('CF-Connecting-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.cloudflare') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('True-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.cloudflare_enterprise') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Forwarded-For')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_forwarded_for') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Real-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_real_ip') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_client_ip') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('Fastly-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.fastly') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('Incap-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.incapsula') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('CF-Connecting-IP,X-Forwarded-For,X-Real-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.multiple') }}
          </t-button>
        </div>
        <t-alert theme="info" :message="t('page.visit_log.detail.ip_extract_multiple_tips')" style="margin-top: 8px" />
        <div style="margin-top: 8px; color: #999; font-size: 12px">
          {{ t('page.visit_log.detail.ip_extract_example') }}
        </div>
      </t-card>

      <t-form ref="ipExtractForm" :data="ipExtractFormData" :rules="ipExtractRules" :label-width="150" @submit="onSubmitIPExtract">
        <t-form-item :label="t('page.systemconfig.label_configuration_item')" name="item">
          <t-input v-model="ipExtractFormData.item" :style="{ width: '600px' }" disabled></t-input>
        </t-form-item>
        <t-form-item :label="t('page.systemconfig.label_configuration_value')" name="value">
          <t-input
            v-model="ipExtractFormData.value"
            :style="{ width: '600px' }"
            :placeholder="t('page.visit_log.detail.ip_extract_issue_tips')"
          ></t-input>
          <div class="form-item-tips">{{ t('page.visit_log.detail.ip_extract_issue_tips') }}</div>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="ipExtractDialogVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import type { FormInstanceFunctions, FormProps, PageInfo, TableProps } from 'tdesign-vue-next';
import { ChevronDownIcon, ChevronRightIcon, SettingIcon } from 'tdesign-icons-vue-next';

import VisitDetailPage from './detail/index.vue';
import { allsharedblist, attacklogVisitListApi, exportlog } from '@/apis/waflog/attacklog';
import { aiLabelByUuidsApi, aiMarkLabelApi, aiUnmarkLabelApi } from '@/apis/ai';
import { allhost } from '@/apis/host';
import { wafIPBlockAddApi } from '@/apis/ipblock';
import { edit_system_config_api, get_detail_by_item_api } from '@/apis/systemconfig';
import { ConvertStringToUnix, ConvertUnixToDate, NowDate } from '@/utils/date';
import { getOnlineUrl } from '@/utils/usuallytool';
import { useAttackLogStore } from '@/store/modules/attacklog';

const props = defineProps({
  attack_ip: {
    type: String,
    default: '',
  },
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const attackLogStore = useAttackLogStore();

const staticColumn = ['action', 'op'];

const searchForm = ref<FormInstanceFunctions>();

const dateControl = reactive({
  presets: {
    最近300天: [`${ConvertUnixToDate(Date.now() - 86400000 * 299).slice(0, 10)} 00:00:00`, `${NowDate} 23:59:59`],
    最近7天: [`${ConvertUnixToDate(Date.now() - 86400000 * 6).slice(0, 10)} 00:00:00`, `${NowDate} 23:59:59`],
    最近3天: [`${ConvertUnixToDate(Date.now() - 86400000 * 2).slice(0, 10)} 00:00:00`, `${NowDate} 23:59:59`],
    今天: [`${NowDate} 00:00:00`, `${NowDate} 23:59:59`],
  },
  range1: [`${NowDate} 00:00:00`, `${NowDate} 23:59:59`],
});

const action_options = computed(() => [
  { label: t('common.defense_status.all'), value: '' },
  { label: t('common.defense_status.stop'), value: '阻止' },
  { label: t('common.defense_status.pass'), value: '放行' },
  { label: t('common.defense_status.forbid'), value: '禁止' },
]);

const method_options = computed(() => [
  { label: t('common.all'), value: '' },
  { label: 'POST', value: 'POST' },
  { label: 'GET', value: 'GET' },
  { label: 'CONNECT', value: 'CONNECT' },
  { label: 'HEAD', value: 'HEAD' },
  { label: 'OPTIONS', value: 'OPTIONS' },
  { label: 'PRI', value: 'PRI' },
]);

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);

// AI 训练标签人工修正状态：req_uuid -> { mark, attack_type }
const aiMarkMap = ref<Record<string, { mark: string; attack_type: string }>>({});
const aiMarkDialogVisible = ref(false);
const aiMarkDialogRow = ref<Record<string, any> | null>(null);
const aiMarkForm = reactive<{ verdict: string; attackType: string }>({ verdict: 'attack', attackType: '' });

const aiCatSelectOptions = computed(() => [
  { label: t('page.visit_log.ai_cat_auto'), value: '' },
  { label: t('page.visit_log.ai_cat_sqli'), value: 'sqli' },
  { label: t('page.visit_log.ai_cat_xss'), value: 'xss' },
  { label: t('page.visit_log.ai_cat_rce'), value: 'rce' },
  { label: t('page.visit_log.ai_cat_traversal'), value: 'traversal' },
  { label: t('page.visit_log.ai_cat_inject'), value: 'inject' },
  { label: t('page.visit_log.ai_cat_scan'), value: 'scan' },
  { label: t('page.visit_log.ai_cat_other'), value: 'other' },
]);
const aiCatLabels = computed<Record<string, string>>(() => ({
  sqli: t('page.visit_log.ai_cat_sqli'),
  xss: t('page.visit_log.ai_cat_xss'),
  rce: t('page.visit_log.ai_cat_rce'),
  traversal: t('page.visit_log.ai_cat_traversal'),
  inject: t('page.visit_log.ai_cat_inject'),
  scan: t('page.visit_log.ai_cat_scan'),
  owasp: 'OWASP',
  other: t('page.visit_log.ai_cat_other'),
}));

// 加载当前页日志的 AI 训练标签修正状态
function loadAiMarks() {
  const uuids = (data.value || []).map((r) => r.req_uuid).filter((u) => !!u);
  if (uuids.length === 0) {
    aiMarkMap.value = {};
    return;
  }
  aiLabelByUuidsApi({ req_uuids: uuids })
    .then((res: any) => {
      if (res.code === 0) {
        aiMarkMap.value = res.data || {};
      }
    })
    .catch(() => {});
}

// info: { mark, attack_type }
function aiMarkText(info: { mark: string; attack_type: string }) {
  if (!info || !info.mark) return '';
  if (info.mark === 'normal') return t('page.visit_log.ai_mark_normal');
  if (info.mark === 'ignore') return t('page.visit_log.ai_mark_ignore');
  if (info.mark === 'attack') {
    const cat = info.attack_type ? aiCatLabels.value[info.attack_type] || info.attack_type : '';
    return cat ? `${t('page.visit_log.ai_mark_attack')}:${cat}` : t('page.visit_log.ai_mark_attack');
  }
  return '';
}

// 打开标记弹窗，预填已有标记
function openAiMarkDialog(row: Record<string, any>) {
  aiMarkDialogRow.value = row;
  const existing = aiMarkMap.value[row.req_uuid];
  aiMarkForm.verdict = existing && existing.mark ? existing.mark : 'attack';
  aiMarkForm.attackType = existing && existing.attack_type ? existing.attack_type : '';
  aiMarkDialogVisible.value = true;
}

function confirmAiMark() {
  if (!aiMarkDialogRow.value) return;
  const v = aiMarkForm.verdict;
  const value = v === 'attack' ? `attack|${aiMarkForm.attackType || ''}` : v;
  handleAiMark(aiMarkDialogRow.value, value);
  aiMarkDialogVisible.value = false;
}

function confirmAiUnmark() {
  if (!aiMarkDialogRow.value) return;
  handleAiMark(aiMarkDialogRow.value, 'unmark');
  aiMarkDialogVisible.value = false;
}

// 标记/取消标记某条日志的训练标签；value 形如 normal/ignore/unmark 或 attack|<type>
function handleAiMark(row: Record<string, any>, value: string) {
  if (value === 'unmark') {
    aiUnmarkLabelApi({ req_uuid: row.req_uuid })
      .then((res: any) => {
        if (res.code === 0) {
          const m = { ...aiMarkMap.value };
          delete m[row.req_uuid];
          aiMarkMap.value = m;
          MessagePlugin.success(t('page.visit_log.ai_mark_unmarked'));
        } else {
          MessagePlugin.error(res.msg);
        }
      })
      .catch(() => {});
    return;
  }
  let mark = value;
  let attackType = '';
  if (value.indexOf('attack') === 0) {
    mark = 'attack';
    attackType = value.split('|')[1] || '';
  }
  aiMarkLabelApi({
    req_uuid: row.req_uuid,
    host_code: row.host_code,
    mark,
    attack_type: attackType,
    rule: row.rule,
    src_ip: row.src_ip,
    url: row.url,
  })
    .then((res: any) => {
      if (res.code === 0) {
        aiMarkMap.value = { ...aiMarkMap.value, [row.req_uuid]: { mark, attack_type: attackType } };
        MessagePlugin.success(t('page.visit_log.ai_mark_success'));
      } else {
        MessagePlugin.error(res.msg);
      }
    })
    .catch(() => {});
}
const rowKey = 'REQ_UUID';
const columnControllerVisible = ref(false);
const tempDisplayColumns = ref<string[]>([]);
const defaultDisplayColumns = staticColumn.concat([
  'guest_identification',
  'time_spent',
  'create_time',
  'host',
  'method',
  'url',
  'src_ip',
  'country',
  'log_only_mode',
  'req_uuid',
]);
const displayColumns = ref<string[]>(
  staticColumn.concat([
    'guest_identification',
    'time_spent',
    'create_time',
    'host',
    'method',
    'url',
    'src_ip',
    'country',
    'log_only_mode',
  ]),
);

const inputFilter = {
  type: 'input' as const,
  resetValue: '',
  confirmEvents: ['onEnter'],
  props: { placeholder: '' },
  showConfirmAndReset: true,
};

const columns = computed<TableProps['columns']>(() => [
  {
    title: t('page.visit_log.guest_identity'),
    width: 100,
    ellipsis: true,
    colKey: 'guest_identification',
    filter: { ...inputFilter, props: { placeholder: t('common.placeholder') } },
  },
  { title: t('page.visit_log.time_spent'), width: 100, ellipsis: true, colKey: 'time_spent', sorter: true },
  { title: t('page.visit_log.risk_level'), width: 60, ellipsis: true, colKey: 'risk_level' },
  { title: t('common.status'), width: 60, ellipsis: true, colKey: 'action' },
  { title: t('page.visit_log.log_only_mode'), width: 120, ellipsis: true, colKey: 'log_only_mode' },
  { title: t('page.visit_log.ai_score'), width: 90, ellipsis: true, colKey: 'ai_score', sorter: true },
  { title: t('page.visit_log.trigger_rule'), align: 'left', width: 150, ellipsis: true, colKey: 'rule' },
  { title: t('page.visit_log.time'), width: 170, ellipsis: true, colKey: 'create_time', sorter: true },
  { title: t('page.visit_log.domain'), align: 'left', width: 150, ellipsis: true, colKey: 'host' },
  { title: t('page.visit_log.request'), width: 70, ellipsis: true, colKey: 'method' },
  { title: t('page.visit_log.source_ip'), width: 200, ellipsis: true, colKey: 'src_ip', cell: 'src_ip' },
  { title: t('page.visit_log.country'), width: 100, ellipsis: true, colKey: 'country' },
  { title: t('page.visit_log.province'), width: 100, ellipsis: true, colKey: 'province' },
  { title: t('page.visit_log.city'), width: 100, ellipsis: true, colKey: 'city' },
  {
    title: t('page.visit_log.req_uuid'),
    width: 160,
    ellipsis: true,
    colKey: 'req_uuid',
    filter: { ...inputFilter, props: { placeholder: t('common.placeholder') } },
  },
  { title: t('page.visit_log.access_url'), width: 160, ellipsis: true, colKey: 'url' },
  {
    title: 'Header',
    width: 300,
    ellipsis: true,
    colKey: 'header',
    filter: { ...inputFilter, props: { placeholder: t('common.placeholder') } },
  },
  { title: 'status', width: 100, ellipsis: true, colKey: 'status' },
  { align: 'left', width: 120, colKey: 'op', title: t('common.op') },
]);

// 可用字段列表
const availableFields = computed(() => [
  { value: 'action', label: t('common.status') },
  { value: 'rule', label: t('page.visit_log.trigger_rule') },
  { value: 'create_time', label: t('common.create_time') },
  { value: 'host', label: t('page.visit_log.domain') },
  { value: 'method', label: t('page.visit_log.access_method') },
  { value: 'url', label: t('page.visit_log.access_url') },
  { value: 'header', label: t('page.visit_log.request') },
  { value: 'country', label: t('page.visit_log.country') },
  { value: 'province', label: t('page.visit_log.province') },
  { value: 'city', label: t('page.visit_log.city') },
  { value: 'status', label: t('page.visit_log.response_code') },
  { value: 'risk_level', label: t('page.visit_log.risk_level') },
  { value: 'guest_identification', label: t('page.visit_log.guest_identity') },
  { value: 'time_spent', label: t('page.visit_log.time_spent') },
  { value: 'log_only_mode', label: t('page.visit_log.log_only_mode') },
  { value: 'req_uuid', label: t('page.visit_log.req_uuid') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const searchformData = ref<Record<string, any>>({
  rule: '',
  req_uuid: '',
  action: '',
  src_ip: '',
  host_code: '',
  status_code: '',
  method: '',
  unix_add_time_begin: '',
  unix_add_time_end: '',
  current_db_name: 'local_log.db',
  log_only_mode: '',
});

// 排序字段
const sorts = reactive({
  sortBy: 'unix_add_time',
  descending: true,
});

// 筛选字段
const filters = reactive({
  filter_by: '',
  filter_value: '',
});

const host_dic = reactive<Record<string, string>>({});
const share_db_dic = reactive<Record<string, string>>({});
const exportDbVisible = ref(false);
const visitDetailVisible = ref(false); // 访问详情弹窗
const visitDetailUid = ref(''); // 访问详情id

// 日志配置相关
const logConfigVisible = ref(false);
const logConfigSaving = ref(false);
const logConfig = ref<Record<string, any>>({
  record_log_type: 'all',
  record_max_req_body_length: '0',
  record_max_res_body_length: '0',
  record_resp: '0',
  record_all_src_byte_info: '0',
  delete_history_log_day: '7',
  log_db_size: '0',
  db_file_size: '0',
  log_persist_enable: '0',
  batch_insert: '0',
  ip_tag_db: '0',
});
const logConfigItems = ref<Record<string, any>>({});

// IP提取配置相关
const ipExtractDialogVisible = ref(false);
const ipExtractFormData = ref<Record<string, any>>({
  item: 'gwaf_proxy_header',
  value: '',
  remarks: '获取访客IP头信息（按照顺序）',
});
const ipExtractRules: FormProps['rules'] = {
  item: [{ required: true, message: '', type: 'error' }],
  value: [{ required: false, message: '', type: 'error' }],
};

searchformData.value.unix_add_time_begin = ConvertStringToUnix(dateControl.range1[0]).toString();
searchformData.value.unix_add_time_end = ConvertStringToUnix(dateControl.range1[1]).toString();

onMounted(() => {
  // 加载保存的列配置
  loadColumnConfig();
  // 加载日志配置
  loadLogConfig();

  if (route.query.action != null) {
    searchformData.value.action = route.query.action as string;
  }
  // 处理从其他页面传来的IP参数
  if (route.query.src_ip != null) {
    searchformData.value.src_ip = route.query.src_ip as string;
  }
  // 判断 store 中是否有保存的搜索参数
  if (attackLogStore.msgData) {
    const { msgData } = attackLogStore;
    pagination.current = msgData.currentpage;
    pagination.pageSize = msgData.pagesize;
    searchformData.value = { ...msgData.searchData };
    dateControl.range1 = [
      ConvertUnixToDate(parseInt(msgData.searchData.unix_add_time_begin, 10)),
      ConvertUnixToDate(parseInt(msgData.searchData.unix_add_time_end, 10)),
    ];
  }

  loadShareDbList();
  loadHostList().then(() => {
    getList('');
  });
});

watch(
  () => route.query.action,
  (newVal) => {
    searchformData.value.action = (newVal as string) || '';
    getList('');
  },
);

watch(
  () => route.query.src_ip,
  (newVal) => {
    if (newVal) {
      searchformData.value.src_ip = newVal as string;
      getList('');
    }
  },
);

watch(
  () => props.attack_ip,
  (newVal) => {
    if (newVal !== '') {
      updateSearchFormAttackPage();
    }
  },
);

onBeforeRouteLeave((to, from, next) => {
  // 保存搜索状态，返回时恢复
  attackLogStore.setAttackMsgData({
    pagesize: pagination.pageSize,
    currentpage: pagination.current,
    searchData: searchformData.value,
  });
  next();
});

// 切换列配置弹窗
function toggleColumnController() {
  tempDisplayColumns.value = [...displayColumns.value];
  columnControllerVisible.value = true;
}

// 确认列配置
function handleColumnControllerConfirm() {
  displayColumns.value = [...tempDisplayColumns.value];
  columnControllerVisible.value = false;
  saveColumnConfig();
}

// 取消列配置
function handleColumnControllerCancel() {
  columnControllerVisible.value = false;
  tempDisplayColumns.value = [];
}

// 加载保存的列配置
function loadColumnConfig() {
  try {
    const savedConfig = localStorage.getItem('attack_table_display_columns');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      if (Array.isArray(parsedConfig) && parsedConfig.length > 0) {
        // 合并新增的默认列：保留用户已选列，同时让新功能列（如 ai_score）自动出现
        const merged = [...parsedConfig];
        defaultDisplayColumns.forEach((col) => {
          if (!merged.includes(col)) merged.push(col);
        });
        displayColumns.value = merged;
      }
    }
  } catch (error) {
    console.error(t('common.column_config_load_failed'), error);
    displayColumns.value = [...defaultDisplayColumns];
  }
}

// 保存列配置到localStorage
function saveColumnConfig() {
  try {
    localStorage.setItem('attack_table_display_columns', JSON.stringify(displayColumns.value));
    MessagePlugin.success(t('common.column_config_saved'));
  } catch (error) {
    console.error(t('common.column_config_save_failed'), error);
    MessagePlugin.error(t('common.column_config_save_failed'));
  }
}

// 重置列配置为默认值
function resetColumnConfig() {
  // eslint-disable-next-line no-alert
  if (window.confirm(t('common.column_config_reset_confirm'))) {
    displayColumns.value = [...defaultDisplayColumns];
    saveColumnConfig();
    MessagePlugin.success(t('common.column_config_reset_success'));
  }
}

function updateSearchFormAttackPage() {
  if (props.attack_ip !== '') {
    searchformData.value.src_ip = props.attack_ip;
    dateControl.range1 = ['2022-01-01 00:00:00', `${NowDate} 23:59:59`];
    searchformData.value.unix_add_time_begin = ConvertStringToUnix(dateControl.range1[0]).toString();
    searchformData.value.unix_add_time_end = ConvertStringToUnix(dateControl.range1[1]).toString();
    pagination.current = 1;
    getList('');
  }
}

function loadShareDbList() {
  allsharedblist()
    .then((res) => {
      if (res.code === 0) {
        const shareOptions = res.data;
        for (let i = 0; i < shareOptions.length; i++) {
          share_db_dic[shareOptions[i].file_name] = `${shareOptions[i].file_name}(${shareOptions[i].cnt})`;
        }
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
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
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        reject(e);
      });
  });
}

// 获取过滤后的搜索数据
function getFilteredSearchData() {
  const filteredData: Record<string, any> = {};
  Object.keys(searchformData.value).forEach((key) => {
    const value = searchformData.value[key];
    if (typeof value === 'string') {
      filteredData[key] = value.trim();
    } else {
      filteredData[key] = value;
    }
  });
  return filteredData;
}

function getList(keyword?: string) {
  if (keyword !== undefined && keyword === 'all') {
    pagination.current = 1;
  }
  searchformData.value.unix_add_time_begin = ConvertStringToUnix(dateControl.range1[0]).toString();
  searchformData.value.unix_add_time_end = ConvertStringToUnix(dateControl.range1[1]).toString();

  const sortDescending = sorts.descending ? 'desc' : 'asc';

  dataLoading.value = true;
  attacklogVisitListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    sort_by: sorts.sortBy,
    sort_descending: sortDescending,
    filter_by: filters.filter_by,
    filter_value: filters.filter_value,
    unix_add_time_begin: ConvertStringToUnix(dateControl.range1[0]).toString(),
    unix_add_time_end: ConvertStringToUnix(dateControl.range1[1]).toString(),
    ...getFilteredSearchData(),
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
        loadAiMarks();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function handelExport() {
  searchformData.value.unix_add_time_begin = ConvertStringToUnix(dateControl.range1[0]).toString();
  searchformData.value.unix_add_time_end = ConvertStringToUnix(dateControl.range1[1]).toString();
  const sortDescending = sorts.descending ? 'desc' : 'asc';

  exportlog({
    batch_size: 1000,
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    sort_by: sorts.sortBy,
    sort_descending: sortDescending,
    filter_by: filters.filter_by,
    filter_value: filters.filter_value,
    unix_add_time_begin: ConvertStringToUnix(dateControl.range1[0]).toString(),
    unix_add_time_end: ConvertStringToUnix(dateControl.range1[1]).toString(),
    ...searchformData.value,
  })
    .then((res) => {
      console.log(res);
    })
    .catch((e: Error) => {
      console.log(e);
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

function handleClickDetail(e: { row: Record<string, any> }) {
  const { req_uuid } = e.row;
  if (props.attack_ip === '') {
    router.push({
      path: '/waf/wafattacklogdetail',
      query: {
        req_uuid: `${req_uuid}#${searchformData.value.current_db_name}`,
      },
    });
  } else {
    visitDetailUid.value = req_uuid;
    visitDetailVisible.value = true;
  }
}

function handleClickIPDetail(e: { row: Record<string, any> }) {
  const { src_ip } = e.row;
  searchformData.value.src_ip = src_ip;
  getList('');
}

// Jump Url
function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/attacklog.html`);
}

/**
 * table 排序
 */
function onSortChange(sorter: any) {
  if (sorter !== undefined && sorter !== null) {
    sorts.sortBy = sorter.sortBy;
    sorts.descending = sorter.descending;
  } else {
    sorts.sortBy = 'unix_add_time';
    sorts.descending = true;
  }
  getList('');
}

/**
 * 筛选结果
 */
function onFilterChange(e: Record<string, any>) {
  filters.filter_by = '';
  filters.filter_value = '';
  // 访客身份
  if (e.guest_identification !== undefined && e.guest_identification !== '') {
    filters.filter_by = 'guest_identification';
    filters.filter_value = e.guest_identification;
  }
  // 请求ID
  if (e.req_uuid !== undefined && e.req_uuid !== '') {
    if (filters.filter_by === '') {
      filters.filter_by = 'req_uuid';
      filters.filter_value = e.req_uuid;
    } else {
      filters.filter_by = `${filters.filter_by}|req_uuid`;
      filters.filter_value = `${filters.filter_value}|${e.req_uuid}`;
    }
  }
  // header
  if (e.header !== undefined && e.header !== '') {
    if (filters.filter_by === '') {
      filters.filter_by = 'header';
      filters.filter_value = e.header;
    } else {
      filters.filter_by = `${filters.filter_by}|header`;
      filters.filter_value = `${filters.filter_value}|${e.header}`;
    }
  }
  getList('');
}

function resetState() {
  searchForm.value?.reset();
  dateControl.range1 = [`${NowDate} 00:00:00`, `${NowDate} 23:59:59`];
  searchformData.value.unix_add_time_begin = ConvertStringToUnix(dateControl.range1[0]).toString();
  searchformData.value.unix_add_time_end = ConvertStringToUnix(dateControl.range1[1]).toString();
}

function handleAddipblock(row: Record<string, any>) {
  const ip = row.src_ip;
  const hostCode = row.host_code;

  if (!hostCode) {
    MessagePlugin.warning('当前网站不存在');
    return;
  }

  const confirmDia = DialogPlugin.confirm({
    header: t('page.visit_log.detail.add_to_deny_list_confirm_header'),
    body: t('page.visit_log.detail.add_to_deny_list_confirm_body'),
    confirmBtn: t('common.confirm'),
    cancelBtn: t('common.cancel'),
    onConfirm: () => {
      wafIPBlockAddApi({
        host_code: hostCode,
        ip,
        remarks: '手工增加',
      })
        .then((res) => {
          if (res.code === 0) {
            MessagePlugin.success(res.msg);
          } else {
            MessagePlugin.warning(res.msg);
          }
        })
        .catch((e: Error) => {
          console.log(e);
        });
      confirmDia.destroy();
    },
    onClose: () => {
      confirmDia.hide();
    },
  });
}

// 切换日志配置区域显示/隐藏
function toggleLogConfig() {
  logConfigVisible.value = !logConfigVisible.value;
}

const LOG_CONFIG_KEYS = [
  'record_log_type',
  'record_max_req_body_length',
  'record_max_res_body_length',
  'record_resp',
  'record_all_src_byte_info',
  'delete_history_log_day',
  'log_db_size',
  'db_file_size',
  'log_persist_enable',
  'batch_insert',
  'ip_tag_db',
];

// 加载日志配置
function loadLogConfig() {
  const promises = LOG_CONFIG_KEYS.map((key) => {
    return get_detail_by_item_api({ item: key })
      .then((res) => {
        if (res.code === 0 && res.data) {
          logConfigItems.value[key] = res.data;
          // 直接使用原始值，不做类型转换
          logConfig.value[key] = res.data.value;
        }
        return { key, success: true };
      })
      .catch((err) => {
        console.error(`加载配置项 ${key} 失败:`, err);
        return { key, success: false };
      });
  });

  Promise.all(promises).then((results) => {
    const failedItems = results.filter((r) => !r.success);
    if (failedItems.length > 0) {
      console.warn('部分配置项加载失败:', failedItems);
    }
  });
}

// 保存日志配置
function saveLogConfig() {
  logConfigSaving.value = true;

  const savePromises = LOG_CONFIG_KEYS.map((key) => {
    const item = logConfigItems.value[key];
    if (item) {
      return edit_system_config_api({
        id: item.id,
        category: item.category,
        item: item.item,
        value: String(logConfig.value[key]),
        type: item.type,
        title: item.title,
        options: item.options || '',
      }).catch((err) => {
        console.error(`保存配置项 ${key} 失败:`, err);
        throw err;
      });
    }
    return Promise.resolve();
  });

  Promise.all(savePromises)
    .then(() => {
      MessagePlugin.success(t('common.tips.save_success'));
      getList('');
    })
    .catch((e) => {
      console.error('保存日志配置失败', e);
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      logConfigSaving.value = false;
    });
}

// 处理IP提取问题
function handleIPExtractIssue() {
  ipExtractDialogVisible.value = true;
  get_detail_by_item_api({ item: 'gwaf_proxy_header' })
    .then((res) => {
      if (res.code === 0 && res.data) {
        ipExtractFormData.value = res.data;
      }
    })
    .catch((err) => {
      console.error('获取IP提取配置失败:', err);
    });
}

// 快捷选择IP头信息
function selectIPHeader(headerValue: string) {
  ipExtractFormData.value.value = headerValue;
  MessagePlugin.success(`已选择: ${headerValue}`);
}

// 打开视频教程
function openVideoTutorial() {
  window.open('https://www.bilibili.com/video/BV1pn8Ez2ELQ/', '_blank');
}

// 提交IP提取配置
const onSubmitIPExtract: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult === true) {
    edit_system_config_api(ipExtractFormData.value)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          ipExtractDialogVisible.value = false;
        } else {
          MessagePlugin.error(res.msg);
        }
      })
      .catch((err: Error) => {
        MessagePlugin.error(err.message);
      });
  }
};

defineExpose({ resetState });
</script>

<style scoped>
.t-button + .t-button {
  margin-left: 8px;
}

.form-item-tips {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}
</style>
