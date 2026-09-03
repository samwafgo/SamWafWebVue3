<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between" style="margin-bottom: 16px">
        <div class="left-operation-container">
          <t-select
            v-model="searchGroupCode"
            :style="{ width: '180px', marginRight: '8px' }"
            :placeholder="t('page.ccrule.filter_group')"
            @change="onGroupChange"
          >
            <t-option :value="''" :label="t('page.ccrule.filter_group')" />
            <t-option v-for="g in hostGroups" :key="g.group_code" :value="g.group_code" :label="g.group_name" />
            <t-option value="__none__" :label="t('page.ccrule.filter_group_none')" />
          </t-select>
          <t-select
            v-model="searchHostCode"
            :style="{ width: '260px', marginRight: '8px' }"
            filterable
            :placeholder="t('page.ccrule.filter_host')"
            @change="onSearch"
          >
            <t-option :value="''" :label="t('page.ccrule.filter_host_all')" />
            <t-option v-for="h in filteredHosts" :key="h.value" :value="h.value" :label="h.label" />
          </t-select>
          <t-button theme="primary" @click="onClickAdd">{{ t('page.ccrule.add_rule') }}</t-button>
          <t-button variant="outline" @click="banIPListVisible = true">{{ t('page.cc.show_cc_ban_ip') }}</t-button>
          <t-button variant="outline" :loading="dataLoading" @click="loadList">{{ t('common.refresh') }}</t-button>
          <t-button
            :theme="emergencyActive ? 'danger' : 'default'"
            :variant="emergencyActive ? 'base' : 'outline'"
            @click="emergencyVisible = true"
          >
            {{ emergencyActive ? t('page.ccrule.emg_btn_on') : t('page.ccrule.emg_btn') }}
          </t-button>
        </div>
        <div class="cc-order-tip">{{ t('page.ccrule.order_tip') }}</div>
      </t-row>

      <div v-if="emergencyActive" class="cc-emg-banner">
        <span>{{ t('page.ccrule.emg_banner', { n: emergencyList.length }) }}</span>
        <a class="t-button-link" @click="emergencyVisible = true">{{ t('page.ccrule.emg_banner_manage') }} ›</a>
      </div>

      <help-block :summary="t('page.cc.samwaf_cc_protection')" doc="guide/CC" />

      <t-table
        :data="data"
        :columns="columns"
        row-key="id"
        vertical-align="top"
        hover
        :loading="dataLoading"
        :pagination="pagination"
        @page-change="rehandlePageChange"
      >
        <template #priority="{ row }">
          <t-tag variant="light">{{ row.priority }}</t-tag>
        </template>

        <template #host_code="{ row }">
          <span>{{ hostLabel(row.host_code) }}</span>
        </template>

        <template #rule_name="{ row }">
          <span>{{ row.rule_name }}</span>
          <div v-if="row.rule_code" class="cc-rule-code" :title="t('page.ccrule.rule_code_tip')">
            {{ row.rule_code }}
          </div>
          <t-tag v-if="isLegacyRule(row)" theme="default" variant="light" size="small" style="margin-left: 6px">
            {{ t('page.ccrule.tag_legacy') }}
          </t-tag>
        </template>

        <template #match_summary="{ row }">
          <span>{{ matchSummary(row) }}</span>
        </template>

        <template #stat_summary="{ row }">
          <t-tag theme="primary" variant="light">{{ statDimText(row) }}</t-tag>
          <div class="cc-sub-text">{{ countScopeText(row.count_scope) }}</div>
        </template>

        <template #threshold="{ row }">
          <span>{{ t('page.ccrule.threshold_fmt', { sec: row.window_sec, times: row.threshold }) }}</span>
          <t-tag
            v-if="row.algo === 'token_bucket'"
            theme="warning"
            variant="light"
            size="small"
            style="margin-left: 6px"
          >
            {{ t('page.ccrule.algo_token_bucket') }}
          </t-tag>
        </template>

        <template #action="{ row }">
          <t-tag :theme="actionTheme(row.action)" variant="light">{{ actionText(row.action) }}</t-tag>
          <div class="cc-sub-text">{{ actionDurationText(row) }}</div>
          <div v-if="row.bot_exempt === 1 && row.action !== 'observe'" class="cc-sub-text">
            {{ t('page.ccrule.bot_exempt_tag') }}
          </div>
          <t-tag v-if="rowCaptchaConflict(row)" theme="warning" variant="light" size="small" style="margin-top: 4px">
            {{ t('page.ccrule.captcha_conflict_tag') }}
          </t-tag>
        </template>

        <template #hit_count="{ row }">
          <a v-if="row.hit_count > 0" class="t-button-link cc-hit-num" @click="openHits(row)">{{ row.hit_count }}</a>
          <span v-else class="cc-hit-zero">0</span>
        </template>

        <template #is_enable="{ row }">
          <t-switch :value="row.is_enable === 1" @change="(v: any) => onToggle(row, v)" />
        </template>

        <template #op="{ row }">
          <a
            class="t-button-link"
            :class="{ 'is-disabled': !canMove(row, -1) }"
            :title="moveTip(row, -1)"
            @click="onMove(row, -1)"
          >
            {{ t('page.ccrule.move_up') }}
          </a>
          <a
            class="t-button-link"
            :class="{ 'is-disabled': !canMove(row, 1) }"
            :title="moveTip(row, 1)"
            @click="onMove(row, 1)"
          >
            {{ t('page.ccrule.move_down') }}
          </a>
          <a class="t-button-link" @click="onClickEdit(row)">{{ t('common.edit') }}</a>
          <a class="t-button-link" @click="onClickDelete(row)">{{ t('common.delete') }}</a>
        </template>
      </t-table>
    </t-card>

    <!-- 新增/编辑 -->
    <t-dialog v-model:visible="formVisible" :header="dialogTitle" :width="880" :footer="false" destroy-on-close>
      <div style="max-height: 68vh; overflow-y: auto; padding-right: 8px">
        <t-form :data="formData" :rules="formRules" :label-width="130" @submit="onSubmit">
          <t-form-item :label="t('page.ccrule.label_host')" name="host_code">
            <t-select v-model="formData.host_code" :style="{ width: '480px' }" filterable @change="loadFormCaptcha">
              <t-option v-for="h in hosts" :key="h.value" :value="h.value" :label="h.label" />
            </t-select>
          </t-form-item>
          <t-form-item :label="t('page.ccrule.label_rule_name')" name="rule_name">
            <t-input v-model="formData.rule_name" :style="{ width: '480px' }" />
          </t-form-item>
          <t-form-item :label="t('page.ccrule.label_priority')" name="priority">
            <t-input-number v-model="formData.priority" :min="1" :style="{ width: '200px' }" />
            <template #help>{{ t('page.ccrule.priority_hint') }}</template>
          </t-form-item>

          <t-divider align="left">{{ t('page.ccrule.section_match') }}</t-divider>
          <t-form-item :label="t('page.ccrule.label_match_mode')">
            <t-radio-group v-model="formData.match_mode">
              <t-radio-button value="all">{{ t('page.ccrule.match_mode_all') }}</t-radio-button>
              <t-radio-button value="simple">{{ t('page.ccrule.match_mode_simple') }}</t-radio-button>
              <t-radio-button value="expr">{{ t('page.ccrule.match_mode_expr') }}</t-radio-button>
            </t-radio-group>
            <template #help>{{ t('page.ccrule.match_mode_hint') }}</template>
          </t-form-item>
          <t-form-item v-if="formData.match_mode === 'simple'" :label="t('page.ccrule.label_conditions')">
            <cc-condition-editor ref="condEditorRef" v-model="formData.conditions" />
          </t-form-item>
          <t-form-item v-if="formData.match_mode === 'expr'" :label="t('page.ccrule.label_match_expr')">
            <t-textarea
              v-model="formData.match_expr"
              :rows="6"
              :style="{ width: '560px' }"
              :placeholder="t('page.ccrule.match_expr_placeholder')"
            />
            <template #help><span class="cc-warn">{{ t('page.ccrule.match_expr_hint') }}</span></template>
          </t-form-item>

          <t-divider align="left">{{ t('page.ccrule.section_count') }}</t-divider>
          <t-form-item :label="t('page.ccrule.label_count_scope')">
            <t-select v-model="formData.count_scope" :style="{ width: '260px' }">
              <t-option value="dynamic" :label="t('page.ccrule.scope_dynamic')" />
              <t-option value="all" :label="t('page.ccrule.scope_all')" />
              <t-option value="document" :label="t('page.ccrule.scope_document')" />
            </t-select>
            <template #help>{{ t('page.ccrule.scope_hint') }}</template>
          </t-form-item>
          <t-form-item :label="t('page.ccrule.label_stat_dim')">
            <div style="display: flex; gap: 10px">
              <t-select v-model="formData.stat_dim" :style="{ width: '260px' }" @change="onStatDimChange">
                <t-option value="ip" :label="t('page.ccrule.dim_ip')" />
                <t-option value="ip_uri" :label="t('page.ccrule.dim_ip_uri')" />
                <t-option value="cookie" :label="t('page.ccrule.dim_cookie')" />
                <t-option value="header" :label="t('page.ccrule.dim_header')" />
                <t-option value="query" :label="t('page.ccrule.dim_query')" />
                <t-option value="host_total" :label="t('page.ccrule.dim_host_total')" />
              </t-select>
              <t-input
                v-if="dimNeedsField"
                v-model="formData.stat_dim_field"
                :style="{ width: '200px' }"
                :placeholder="t('page.ccrule.dim_field_placeholder')"
              />
            </div>
            <template #help>
              {{ t('page.ccrule.dim_hint') }}
              <div v-if="dimForgeable" class="cc-warn-box">
                <div>{{ t('page.ccrule.dim_forgeable_warn') }}</div>
                <div>{{ t('page.ccrule.dim_fallback_note') }}</div>
              </div>
            </template>
          </t-form-item>

          <t-divider align="left">{{ t('page.ccrule.section_threshold') }}</t-divider>
          <t-form-item :label="t('page.ccrule.label_window')" name="window_sec">
            <t-input-number v-model="formData.window_sec" :min="1" :max="86400" :style="{ width: '200px' }" />
            <span class="cc-unit">{{ t('page.ccrule.unit_second') }}</span>
          </t-form-item>
          <t-form-item :label="t('page.ccrule.label_threshold')" name="threshold">
            <t-input-number v-model="formData.threshold" :min="1" :style="{ width: '200px' }" />
            <span class="cc-unit">{{ t('page.ccrule.unit_times') }}</span>
            <t-button
              variant="outline"
              size="small"
              style="margin-left: 10px"
              :disabled="!formData.host_code"
              @click="openThreshold"
            >
              {{ t('page.ccrule.th_entry') }}
            </t-button>
            <template #help>
              {{ formData.host_code ? t('page.ccrule.th_entry_hint') : t('page.ccrule.th_entry_need_host') }}
            </template>
          </t-form-item>
          <t-form-item :label="t('page.ccrule.label_burst')">
            <t-input-number v-model="formData.burst" :min="0" :style="{ width: '200px' }" />
            <span class="cc-unit">{{ t('page.ccrule.unit_times') }}</span>
            <template #help>{{ t('page.ccrule.burst_hint') }}</template>
          </t-form-item>
          <!-- 限流算法只对存量配置显示：新建一律用滑动窗口，避免又多一个要解释的概念 -->
          <t-form-item v-if="formData.algo === 'token_bucket'" :label="t('page.ccrule.label_algo')">
            <t-select v-model="formData.algo" :style="{ width: '260px' }">
              <t-option value="token_bucket" :label="t('page.ccrule.algo_token_bucket_full')" />
              <t-option value="window" :label="t('page.ccrule.algo_window_full')" />
            </t-select>
            <template #help><span class="cc-warn">{{ t('page.ccrule.algo_switch_warn') }}</span></template>
          </t-form-item>

          <t-divider align="left">{{ t('page.ccrule.section_action') }}</t-divider>
          <t-form-item :label="t('page.ccrule.label_action')">
            <!-- T79：这一栏最容易被误解成「说了算的那个动作」。上面还有防护开关、白名单、
                 自定义规则放行三道闸，下面还有站点「仅记录模式」会把它降级，一次讲清楚 -->
            <template #label>
              <span>{{ t('page.ccrule.label_action') }}</span>
              <t-popup trigger="click" placement="right-start" :overlay-style="{ width: '580px' }" show-arrow>
                <t-icon name="help-circle" class="cc-help-icon" />
                <template #content>
                  <div class="cc-prio">
                    <div class="cc-prio-title">{{ t('page.ccrule.prio_title') }}</div>
                    <div v-for="(txt, i) in prioLines" :key="i" class="cc-prio-line">
                      <span class="n">{{ i + 1 }}</span>
                      <span class="tx">{{ txt }}</span>
                    </div>
                    <div class="cc-prio-note">{{ t('page.ccrule.prio_note_skip') }}</div>
                    <div class="cc-prio-note">{{ t('page.ccrule.prio_note_logonly') }}</div>
                  </div>
                </template>
              </t-popup>
            </template>
            <t-select v-model="formData.action" :style="{ width: '260px' }">
              <t-option value="captcha" :label="t('page.ccrule.action_captcha')" />
              <t-option value="observe" :label="t('page.ccrule.action_observe')" />
              <t-option value="deny" :label="t('page.ccrule.action_deny')" />
              <t-option value="ban" :label="t('page.ccrule.action_ban')" />
            </t-select>
            <template #help>{{ t('page.ccrule.action_hint') }}</template>
          </t-form-item>
          <t-form-item v-if="formData.action !== 'observe'" :label="t('page.ccrule.label_action_seconds')">
            <t-input-number v-model="formData.action_seconds" :min="1" :style="{ width: '200px' }" />
            <span class="cc-unit">{{ t('page.ccrule.unit_second') }}</span>
            <template #help>{{ actionSecondsHint }}</template>
          </t-form-item>
          <t-form-item v-if="formData.action === 'captcha'" :label="t('page.ccrule.label_captcha_setting')">
            <div class="cc-captcha-box">
              <div class="cc-captcha-top">
                <span>{{
                  isGlobalRuleHost ? t('page.ccrule.captcha_box_title_global') : t('page.ccrule.captcha_box_title')
                }}</span>
                <a class="t-button-link" @click="goCaptchaSetting()">
                  {{ isGlobalRuleHost ? t('page.ccrule.captcha_box_goto_hosts') : t('page.ccrule.captcha_box_goto') }} ›
                </a>
              </div>

              <!-- 全局规则没有单一站点可看：人机验证的配置落在各站点上，引擎按被访问的那个站点判定 -->
              <template v-if="isGlobalRuleHost">
                <div class="cc-captcha-note">
                  {{ t('page.ccrule.captcha_global_note', { total: formCaptchaHostTotal }) }}
                </div>
                <div v-if="!formCaptchaSites.length" class="cc-captcha-kv">
                  <span class="v">{{ t('page.ccrule.captcha_global_none') }}</span>
                </div>
                <div v-for="s in formCaptchaSites" :key="s.host_code" class="cc-captcha-site">
                  <span class="n" :title="s.host_name">{{ s.host_name || s.host_code }}</span>
                  <span class="p">{{ sitePathsText(s) }}</span>
                  <a class="t-button-link" @click="goCaptchaSetting(s.host_code)">
                    {{ t('page.ccrule.captcha_box_goto') }} ›
                  </a>
                </div>
                <div v-if="captchaSiteConflicts.length" class="cc-captcha-warn">
                  {{ t('page.ccrule.captcha_conflict_global', { sites: conflictSitesText }) }}
                </div>
              </template>

              <template v-else>
                <div class="cc-captcha-kv">
                  <span class="k">{{ t('page.ccrule.captcha_engine') }}</span>
                  <span class="v">{{ captchaEngineText }}</span>
                </div>
                <div class="cc-captcha-kv">
                  <span class="k">{{ t('page.ccrule.captcha_exclude') }}</span>
                  <span class="v">{{ captchaExcludeText }}</span>
                </div>
                <div v-if="captchaConflicts.length" class="cc-captcha-warn">
                  {{ t('page.ccrule.captcha_conflict', { paths: captchaConflicts.join('、') }) }}
                </div>
              </template>
            </div>
            <template #help>
              {{ isGlobalRuleHost ? t('page.ccrule.captcha_box_readonly_global') : t('page.ccrule.captcha_box_readonly') }}
            </template>
          </t-form-item>
          <t-form-item v-if="formData.action !== 'observe'" :label="t('page.ccrule.label_bot_exempt')">
            <t-switch v-model="formData.bot_exempt" :custom-value="[1, 0]" />
            <template #help>{{ t('page.ccrule.bot_exempt_hint') }}</template>
          </t-form-item>
          <t-form-item v-if="formData.action === 'ban'" :label="t('page.ccrule.label_ban_scope')">
            <t-select v-model="formData.ban_scope" :style="{ width: '260px' }">
              <t-option value="host" :label="t('page.ccrule.ban_scope_host')" />
              <t-option value="global" :label="t('page.ccrule.ban_scope_global')" />
            </t-select>
            <template #help>{{ t('page.ccrule.ban_scope_hint') }}</template>
          </t-form-item>
          <t-form-item :label="t('page.ccrule.label_stop_global')">
            <t-switch v-model="formData.stop_global" :custom-value="[1, 0]" />
            <span class="cc-unit">{{ t('page.ccrule.stop_global_hint') }}</span>
          </t-form-item>
          <t-form-item :label="t('page.ccrule.label_enable')">
            <t-switch v-model="formData.is_enable" :custom-value="[1, 0]" />
          </t-form-item>
          <t-form-item :label="t('page.ccrule.label_remarks')">
            <t-textarea v-model="formData.remarks" :rows="2" :style="{ width: '480px' }" />
          </t-form-item>

          <t-form-item :label="t('page.ccrule.label_preview')">
            <div class="cc-preview">{{ previewText }}</div>
            <template #help>
              <div v-if="formData.action !== 'observe'" class="cc-warn-box">
                {{ t('page.ccrule.observe_advice') }}
              </div>
            </template>
          </t-form-item>

          <t-form-item>
            <t-button variant="outline" @click="formVisible = false">{{ t('common.close') }}</t-button>
            <t-button theme="primary" type="submit" style="margin-left: 10px">{{ t('common.confirm') }}</t-button>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      @confirm="onConfirmDelete"
    />

    <!-- destroy-on-close：封禁是运行时产生的，每次打开都要重新拉取，否则看到的是页面加载那一刻的快照 -->
    <t-dialog
      v-model:visible="banIPListVisible"
      :header="t('page.cc.show_cc_ban_ip')"
      :width="900"
      destroy-on-close
      @confirm="banIPListVisible = false"
    >
      <ban-ip-list />
    </t-dialog>

    <cc-threshold-recommend v-model:visible="thresholdVisible" :params="thresholdParams" @apply="applyThreshold" />

    <cc-hits-board v-model:visible="hitsVisible" :rule-id="hitsRuleId" />

    <cc-emergency
      v-model:visible="emergencyVisible"
      :hosts="hosts"
      :default-host-code="searchHostCode"
      @changed="loadEmergency"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';

import BanIpList from './component/baniplist/index.vue';
import CcThresholdRecommend from './component/threshold/index.vue';
import CcHitsBoard from './component/hits/index.vue';
import CcEmergency from './component/emergency/index.vue';
import CcConditionEditor from '@/components/cc-condition-editor/index.vue';
import { allhost, getHostDetail } from '@/apis/host';
import { allHostGroup } from '@/apis/hostgroup';
import {
  wafAntiCCRuleListApi,
  wafAntiCCRuleAddApi,
  wafAntiCCRuleEditApi,
  wafAntiCCRuleDelApi,
  wafAntiCCRuleToggleApi,
  wafAntiCCRuleSortApi,
  wafAntiCCRuleCaptchaOverviewApi,
  wafAntiCCRuleEmergencyStatusApi,
} from '@/apis/anticcrule';

const { t } = useI18n();
const router = useRouter();

// 新建规则的默认值：滑动窗口、排除静态、人机验证、只封本站点。
// 这些默认值只作用于新建规则；从旧版本迁移过来的配置保持它原有的行为。
const INITIAL_DATA = {
  id: '',
  host_code: '',
  rule_name: '',
  priority: 50,
  is_enable: 1,
  match_mode: 'all',
  conditions: [] as any[],
  match_expr: '',
  count_scope: 'dynamic',
  stat_dim: 'ip',
  stat_dim_field: '',
  algo: 'window',
  window_sec: 60,
  threshold: 600,
  burst: 0,
  action: 'captcha',
  action_seconds: 300,
  // 新建规则默认豁免已验证爬虫；迁移过来的存量规则由后端保持 0，不在这里覆盖
  bot_exempt: 1,
  ban_scope: 'host',
  stop_global: 0,
  remarks: '',
};

const data = ref<Record<string, any>[]>([]);
const hosts = ref<Record<string, any>[]>([]);
const hostGroups = ref<Record<string, any>[]>([]);
// 当前编辑规则所属站点的「永不挑战的路径」。新建/换站点时按需拉取，
// 列表里的行则直接用接口随行返回的 captcha_exclude_urls，避免每个站点各发一次请求
const formCaptcha = ref<{ exclude_urls: string; engine_type: string }>({ exclude_urls: '', engine_type: '' });
// 全局规则用：各站点各自的「永不挑战的路径」，只含配了的站点
const formCaptchaSites = ref<Record<string, any>[]>([]);
const formCaptchaHostTotal = ref(0);
const searchHostCode = ref('');
const searchGroupCode = ref('');
const dataLoading = ref(false);
const formVisible = ref(false);
const confirmVisible = ref(false);
const banIPListVisible = ref(false);
const thresholdVisible = ref(false);
const thresholdParams = ref<Record<string, any>>({});
const hitsVisible = ref(false);
const hitsRuleId = ref('');
const emergencyVisible = ref(false);
const emergencyList = ref<Record<string, any>[]>([]);
const confirmBody = ref('');
const deleteId = ref('');
const isEdit = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const condEditorRef = ref<any>(null);
const pagination = reactive({ total: 0, current: 1, pageSize: 20 });

const columns = computed<TableProps['columns']>(() => [
  // 跨站点查看时必须显示规则属于哪个网站，否则优先级和上移下移都失去参照
  ...(searchHostCode.value
    ? []
    : [{ colKey: 'host_code', title: t('page.ccrule.col_host'), width: 200, ellipsis: true }]),
  { colKey: 'priority', title: t('page.ccrule.col_priority'), width: 90 },
  { colKey: 'rule_name', title: t('page.ccrule.col_rule_name'), width: 180 },
  { colKey: 'match_summary', title: t('page.ccrule.col_match'), minWidth: 200 },
  { colKey: 'stat_summary', title: t('page.ccrule.col_stat'), width: 160 },
  { colKey: 'threshold', title: t('page.ccrule.col_threshold'), width: 190 },
  { colKey: 'action', title: t('page.ccrule.col_action'), width: 170 },
  { colKey: 'hit_count', title: t('page.ccrule.col_hits'), width: 90 },
  { colKey: 'is_enable', title: t('page.ccrule.col_enable'), width: 90 },
  { colKey: 'op', title: t('common.operation'), width: 210, fixed: 'right' },
]);

// 动作优先级 7 级表（§5.4.2）。逐条列出来而不是塞成一段话——
// 用户要回答的是「我这条规则到底会不会生效」，那是个顺着往下找的过程
const prioLines = computed(() => [1, 2, 3, 4, 5, 6, 7].map((n) => t(`page.ccrule.prio_${n}`)));

// 只算「当前真的生效」的：库里写着开但已过自动关闭时间的，按钮不该还亮着红
const emergencyActive = computed(() => emergencyList.value.some((r: any) => r.active));

function loadEmergency() {
  wafAntiCCRuleEmergencyStatusApi({})
    .then((res: any) => {
      if (res.code === 0) emergencyList.value = res.data || [];
    })
    .catch(() => {});
}

function openHits(row: Record<string, any>) {
  hitsRuleId.value = row.id;
  hitsVisible.value = true;
}

// 「持续时间」在不同动作下含义不同，就近说清楚，免得按封禁的直觉去理解人机验证
const actionSecondsHint = computed(() => {
  if (formData.value.action === 'captcha') return t('page.ccrule.action_seconds_hint_captcha');
  if (formData.value.action === 'ban') return t('page.ccrule.action_seconds_hint_ban');
  return t('page.ccrule.action_seconds_hint_deny');
});

const filteredHosts = computed(() => {
  if (!searchGroupCode.value) return hosts.value;
  if (searchGroupCode.value === '__none__') return hosts.value.filter((h: any) => !h.group_code);
  return hosts.value.filter((h: any) => h.group_code === searchGroupCode.value);
});

function splitPaths(text: any) {
  return String(text || '')
    .split('\n')
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x);
}
function isGlobalHostCode(code: string) {
  return !!code && hosts.value.some((h: any) => h.value === code && h.global_host === 1);
}

const captchaExcludePaths = computed(() => splitPaths(formCaptcha.value.exclude_urls));
const captchaExcludeText = computed(() => {
  const list = captchaExcludePaths.value;
  return list.length ? list.join('、') : t('page.ccrule.captcha_exclude_none');
});
const captchaEngineText = computed(() =>
  formCaptcha.value.engine_type === 'capJs'
    ? t('page.ccrule.captcha_engine_capjs')
    : t('page.ccrule.captcha_engine_traditional'),
);
// 当前选的是「全局网站」——它不是真实站点，人机验证的配置落在各个真实站点上
const isGlobalRuleHost = computed(() => isGlobalHostCode(formData.value.host_code));

// 本规则收敛到哪些 uri 上；null = 没有 uri 层面的收敛，等于管到全部路径
const ruleUriTargets = computed<string[] | null>(() => {
  if (formData.value.match_mode !== 'simple') return null;
  const conds = condEditorRef.value ? condEditorRef.value.getConditions() : formData.value.conditions || [];
  const out: string[] = [];
  conds.forEach((c: any) => {
    if (c.field !== 'uri') return;
    if (['eq', 'in', 'prefix'].indexOf(c.op) < 0) return;
    (c.value || []).forEach((raw: any) => {
      const v = String(raw || '').trim().toLowerCase();
      if (v) out.push(v);
    });
  });
  return out.length ? out : null;
});

// 规则管的路径与一份「永不挑战的路径」的交集。没有 uri 收敛的规则等于管到全部路径，
// 那份清单里的每一条都会被跳过，所以整份返回
function conflictPaths(excludes: string[]) {
  if (!excludes.length) return [];
  const targets = ruleUriTargets.value;
  if (targets === null) return excludes.slice();
  const hit: string[] = [];
  targets.forEach((v) => {
    excludes.forEach((ex) => {
      // v 落在 ex 之下：这条规则的目标被整个豁免掉
      // ex 落在 v 之下：部分重叠，同样要提醒
      if ((v.indexOf(ex) === 0 || ex.indexOf(v) === 0) && hit.indexOf(ex) < 0) hit.push(ex);
    });
  });
  return hit;
}

// 本规则管的路径里，有哪些落在「永不挑战的路径」内 —— 落在里面的不会被挑战
const captchaConflicts = computed(() => conflictPaths(captchaExcludePaths.value));
// 全局规则：逐站点比对，只留真有冲突的站点
const captchaSiteConflicts = computed(() => {
  const out: { name: string; paths: string[] }[] = [];
  formCaptchaSites.value.forEach((s: any) => {
    const hit = conflictPaths(splitPaths(s.exclude_urls));
    if (hit.length) out.push({ name: s.host_name || s.host_code, paths: hit });
  });
  return out;
});
const conflictSitesText = computed(() =>
  captchaSiteConflicts.value.map((x) => `${x.name}（${x.paths.join('、')}）`).join('；'),
);
function sitePathsText(site: any) {
  return splitPaths(site.exclude_urls).join('、');
}

const hostDict = computed(() => {
  const dict: Record<string, string> = {};
  (hosts.value || []).forEach((h: any) => {
    dict[h.value] = h.label;
  });
  return dict;
});
function hostLabel(code: string) {
  return hostDict.value[code] || code || '-';
}

const dimNeedsField = computed(() => ['cookie', 'header', 'query'].indexOf(formData.value.stat_dim) >= 0);
// 这几类维度的取值完全由客户端决定，界面必须把风险说清楚
const dimForgeable = computed(() => ['cookie', 'header', 'query'].indexOf(formData.value.stat_dim) >= 0);
const dialogTitle = computed(() => (isEdit.value ? t('page.ccrule.edit_rule') : t('page.ccrule.add_rule')));

const formRules = computed(() => ({
  host_code: [{ required: true, message: t('page.ccrule.label_host'), type: 'error' as const }],
  rule_name: [{ required: true, message: t('page.ccrule.label_rule_name'), type: 'error' as const }],
  window_sec: [{ required: true, message: t('page.ccrule.label_window'), type: 'error' as const }],
  threshold: [{ required: true, message: t('page.ccrule.label_threshold'), type: 'error' as const }],
}));

function countScopeText(scope: string) {
  const map: Record<string, string> = {
    dynamic: t('page.ccrule.scope_dynamic'),
    all: t('page.ccrule.scope_all'),
    document: t('page.ccrule.scope_document'),
    origin_only: t('page.ccrule.scope_origin_only'),
  };
  return map[scope] || scope;
}
function statDimText(row: any) {
  const map: Record<string, string> = {
    ip: t('page.ccrule.dim_ip'),
    ip_uri: t('page.ccrule.dim_ip_uri'),
    cookie: t('page.ccrule.dim_cookie'),
    header: t('page.ccrule.dim_header'),
    query: t('page.ccrule.dim_query'),
    body: t('page.ccrule.dim_body'),
    host_total: t('page.ccrule.dim_host_total'),
  };
  const base = map[row.stat_dim] || row.stat_dim;
  return row.stat_dim_field ? `${base}(${row.stat_dim_field})` : base;
}
function actionText(action: string) {
  const map: Record<string, string> = {
    observe: t('page.ccrule.action_observe'),
    deny: t('page.ccrule.action_deny'),
    captcha: t('page.ccrule.action_captcha'),
    ban: t('page.ccrule.action_ban'),
  };
  return map[action] || action;
}
function actionTheme(action: string) {
  if (action === 'observe') return 'success';
  if (action === 'captcha') return 'warning';
  return 'danger';
}
function actionDurationText(row: any) {
  if (row.action === 'observe') return '';
  const scope =
    row.action === 'ban'
      ? row.ban_scope === 'global'
        ? t('page.ccrule.ban_scope_global')
        : t('page.ccrule.ban_scope_host')
      : '';
  return `${row.action_seconds}${t('page.ccrule.unit_second')} ${scope}`;
}

const previewText = computed(() => {
  const scope = countScopeText(formData.value.count_scope);
  const dim = statDimText(formData.value);
  const act = actionText(formData.value.action);
  const range =
    formData.value.match_mode === 'all'
      ? t('page.ccrule.preview_all_requests')
      : t('page.ccrule.preview_matched_requests');
  if (formData.value.action === 'observe') {
    return t('page.ccrule.preview_observe', {
      range,
      scope,
      dim,
      sec: formData.value.window_sec,
      times: formData.value.threshold,
    });
  }
  return t('page.ccrule.preview_full', {
    range,
    scope,
    dim,
    sec: formData.value.window_sec,
    times: formData.value.threshold,
    action: act,
    duration: formData.value.action_seconds,
  });
});

function loadHosts() {
  allhost({}).then((res: any) => {
    if (res.code === 0) hosts.value = res.data || [];
  });
}
function loadGroups() {
  allHostGroup({})
    .then((res: any) => {
      // 接口返回 {list, none_count, all_count}，分组本身在 list 里
      if (res.code === 0 && res.data) hostGroups.value = res.data.list || [];
    })
    .catch(() => {
      /* 分组只是筛选辅助，取不到不影响主流程 */
    });
}
// 列表行：动作是人机验证、且该站点配了豁免清单时给个角标，
// 不进编辑弹窗也能发现两处配置在互相矛盾
function rowCaptchaConflict(row: any) {
  return row.action === 'captcha' && !!String(row.captcha_exclude_urls || '').trim();
}

function loadFormCaptcha(hostCode: string) {
  formCaptcha.value = { exclude_urls: '', engine_type: '' };
  formCaptchaSites.value = [];
  formCaptchaHostTotal.value = 0;
  if (!hostCode) return;
  // 全局网站不是真实站点，没有自己的验证码配置可看，要看的是各真实站点的
  if (isGlobalHostCode(hostCode)) {
    wafAntiCCRuleCaptchaOverviewApi({})
      .then((res: any) => {
        if (res.code !== 0 || !res.data) return;
        formCaptchaHostTotal.value = res.data.host_total || 0;
        formCaptchaSites.value = res.data.sites || [];
      })
      .catch(() => {
        /* 取不到只是少一块提示，不影响配置规则 */
      });
    return;
  }
  getHostDetail({ code: hostCode })
    .then((res: any) => {
      if (res.code !== 0 || !res.data) return;
      let cfg: any = {};
      try {
        cfg = JSON.parse(res.data.captcha_json || '{}');
      } catch (e) {
        cfg = {};
      }
      formCaptcha.value = {
        exclude_urls: cfg.exclude_urls || '',
        engine_type: cfg.engine_type || 'traditional',
      };
    })
    .catch(() => {
      /* 取不到只是少一块提示，不影响配置规则 */
    });
}

// 站点级设置在另一个页面，这里另开一个标签页：规则表单可能填了一半，跳走就没了。
// 不传 hostCode 时：普通规则跳它自己的站点；全局规则没有单一站点，只能跳到网站列表
function goCaptchaSetting(hostCode?: string) {
  const code = hostCode || (isGlobalRuleHost.value ? '' : formData.value.host_code);
  const query = code ? { editcode: code, tab: 'captcha' } : {};
  const route = router.resolve({ path: '/waf-host/wafhost', query });
  window.open(route.href, '_blank');
}
// 从另一个标签页改完设置切回来时，摘要要跟着变，否则看到的还是旧的豁免清单
function onWindowFocus() {
  if (formVisible.value && formData.value.action === 'captcha' && formData.value.host_code) {
    loadFormCaptcha(formData.value.host_code);
  }
}

function loadList() {
  dataLoading.value = true;
  const params: Record<string, any> = {
    host_code: searchHostCode.value,
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
  };
  // 「全部网站」叠加分组时，把范围收敛到该分组下的站点，
  // 否则分组选了却仍列出全部站点的规则，两个筛选条件自相矛盾
  if (!searchHostCode.value && searchGroupCode.value) {
    const codes = filteredHosts.value.map((h: any) => h.value);
    // 空分组要显示空列表：条件为空数组时后端会退化成不过滤，那样反而列出全部
    if (codes.length === 0) {
      data.value = [];
      pagination.total = 0;
      dataLoading.value = false;
      return;
    }
    params.host_codes = codes;
  }
  wafAntiCCRuleListApi(params)
    .then((res: any) => {
      if (res.code === 0) {
        data.value = res.data.list || [];
        pagination.total = res.data.total;
      } else {
        MessagePlugin.error(res.msg);
      }
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function onSearch() {
  pagination.current = 1;
  loadList();
}
function onGroupChange() {
  // 切换分组后，如果当前选中的网站不在该分组里就落回「全部网站」，避免筛选条件自相矛盾
  if (searchHostCode.value && !filteredHosts.value.some((h: any) => h.value === searchHostCode.value)) {
    searchHostCode.value = '';
  }
  onSearch();
}
function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  pagination.pageSize = pageInfo.pageSize;
  loadList();
}

function isLegacyRule(row: any) {
  // 迁移过来的规则保留了旧行为：整站口径 + 全站封禁，界面上标出来提示可以调整
  return row.count_scope === 'all' && row.ban_scope === 'global';
}
function matchSummary(row: any) {
  if (row.match_mode === 'all') return t('page.ccrule.match_mode_all');
  if (row.match_mode === 'expr') return t('page.ccrule.match_mode_expr');
  try {
    const conds = JSON.parse(row.match_json || '[]');
    if (!conds.length) return t('page.ccrule.match_mode_all');
    return t('page.ccrule.match_cond_count', { n: conds.length });
  } catch (e) {
    return t('page.ccrule.match_mode_simple');
  }
}

function onStatDimChange() {
  if (!dimNeedsField.value) formData.value.stat_dim_field = '';
}

function onClickAdd() {
  isEdit.value = false;
  formData.value = { ...INITIAL_DATA, host_code: searchHostCode.value, conditions: [] };
  loadFormCaptcha(formData.value.host_code);
  formVisible.value = true;
}
function onClickEdit(row: any) {
  let conds: any[] = [];
  try {
    conds = JSON.parse(row.match_json || '[]');
  } catch (e) {
    conds = [];
  }
  isEdit.value = true;
  formData.value = { ...INITIAL_DATA, ...row, conditions: conds };
  loadFormCaptcha(formData.value.host_code);
  formVisible.value = true;
}
function onClickDelete(row: any) {
  deleteId.value = row.id;
  confirmBody.value = t('page.ccrule.delete_confirm', { name: row.rule_name });
  confirmVisible.value = true;
}
function onConfirmDelete() {
  wafAntiCCRuleDelApi({ id: deleteId.value })
    .then((res: any) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        loadList();
      } else {
        MessagePlugin.error(res.msg);
      }
    })
    .finally(() => {
      confirmVisible.value = false;
    });
}
function onToggle(row: any, checked: boolean) {
  wafAntiCCRuleToggleApi({ id: row.id, is_enable: checked ? 1 : 0 }).then((res: any) => {
    if (res.code === 0) loadList();
    else MessagePlugin.error(res.msg);
  });
}

// 优先级是每个站点各自的序列，只在同站点内相邻交换
function sameHostRules(row: any) {
  return data.value.filter((r: any) => r.host_code === row.host_code);
}
function canMove(row: any, delta: number) {
  const list = sameHostRules(row);
  const idx = list.findIndex((r: any) => r.id === row.id);
  return idx >= 0 && idx + delta >= 0 && idx + delta < list.length;
}
// 动不了的时候要说清为什么。只有一条规则时两个链接都点不动，
// 不给说明的话看起来就是「点了没反应」
function moveTip(row: any, delta: number) {
  if (canMove(row, delta)) return '';
  if (sameHostRules(row).length <= 1) return t('page.ccrule.move_only_one');
  return delta < 0 ? t('page.ccrule.move_at_top') : t('page.ccrule.move_at_bottom');
}
function onMove(row: any, delta: number) {
  if (!canMove(row, delta)) return;
  const sameHost = sameHostRules(row);
  const idx = sameHost.findIndex((r: any) => r.id === row.id);
  const target = idx + delta;
  const ids = sameHost.map((r: any) => r.id);
  const tmp = ids[idx];
  ids[idx] = ids[target];
  ids[target] = tmp;
  wafAntiCCRuleSortApi({ host_code: row.host_code, ids }).then((res: any) => {
    if (res.code === 0) loadList();
    else MessagePlugin.error(res.msg);
  });
}

// 推荐要按这条规则的口径圈样本，所以把表单当前值原样带过去
function openThreshold() {
  if (!formData.value.host_code) return;
  const conds = condEditorRef.value ? condEditorRef.value.getConditions() : formData.value.conditions || [];
  thresholdParams.value = {
    host_code: formData.value.host_code,
    window_sec: formData.value.window_sec || 60,
    count_scope: formData.value.count_scope || 'dynamic',
    stat_dim: formData.value.stat_dim || 'ip',
    stat_dim_field: formData.value.stat_dim_field || '',
    exclude_exts: formData.value.exclude_exts || '',
    match_mode: formData.value.match_mode || 'all',
    conditions: JSON.stringify(conds || []),
    days: 7,
  };
  thresholdVisible.value = true;
}
// 推荐值只是历史统计，直接上封禁等于拿真实访客试错，所以强制回到「观察」
function applyThreshold(value: number) {
  formData.value.threshold = value;
  if (formData.value.action !== 'observe') {
    formData.value.action = 'observe';
    MessagePlugin.info(t('page.ccrule.th_switched_observe'));
  }
}

const onSubmit: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult !== true) return;
  const payload: Record<string, any> = { ...formData.value };
  if (payload.match_mode === 'simple') {
    payload.conditions = condEditorRef.value ? condEditorRef.value.getConditions() : payload.conditions;
    if (!payload.conditions || payload.conditions.length === 0) {
      MessagePlugin.error(t('page.ccrule.cond_required'));
      return;
    }
  } else {
    payload.conditions = [];
  }
  const api = isEdit.value ? wafAntiCCRuleEditApi : wafAntiCCRuleAddApi;
  api(payload).then((res: any) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      formVisible.value = false;
      loadList();
    } else {
      MessagePlugin.error(res.msg);
    }
  });
};

onMounted(() => {
  loadHosts();
  loadGroups();
  // 默认「全部网站」：进来先看得见全部规则，再按需收敛到某个站点
  loadList();
  loadEmergency();
  window.addEventListener('focus', onWindowFocus);
});
onBeforeUnmount(() => {
  window.removeEventListener('focus', onWindowFocus);
});
</script>

<style scoped>
.left-operation-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cc-order-tip {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  line-height: 32px;
}

.cc-sub-text {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-top: 2px;
}

.cc-rule-code {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-top: 2px;
}

/* 说明统一走 t-form-item 的 help 插槽（TDesign 渲染成 .t-input__help，
   在 controls-content 这一行之外，不会被同行控件挤压），这里只补行高 */
:deep(.t-input__help) {
  line-height: 1.6;
}

.cc-unit {
  margin-left: 8px;
  color: var(--td-text-color-secondary);
  font-size: 13px;
}

.cc-warn {
  color: var(--td-warning-color-7);
}

.cc-warn-box {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: var(--td-radius-default);
  background: var(--td-warning-color-1);
  color: var(--td-text-color-primary);
  font-size: 13px;
  line-height: 1.8;
  max-width: 560px;
}

.cc-preview {
  padding: 12px 14px;
  border-left: 3px solid var(--td-brand-color);
  background: var(--td-brand-color-1);
  border-radius: 0 var(--td-radius-default) var(--td-radius-default) 0;
  line-height: 1.8;
  max-width: 560px;
}

.cc-captcha-box {
  width: 560px;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-default);
  background: var(--td-bg-color-container-hover);
  padding: 12px 14px;
}

.cc-captcha-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}

.cc-captcha-kv {
  display: flex;
  font-size: 13px;
  margin-bottom: 6px;
}

.cc-captcha-kv .k {
  width: 120px;
  flex: none;
  color: var(--td-text-color-secondary);
}

.cc-captcha-kv .v {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.cc-captcha-note {
  font-size: 12px;
  line-height: 1.7;
  color: var(--td-text-color-secondary);
  margin-bottom: 10px;
}

.cc-captcha-site {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
  padding: 5px 0;
  border-top: 1px dashed var(--td-component-stroke);
}

.cc-captcha-site .n {
  width: 190px;
  flex: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-captcha-site .p {
  flex: 1;
  min-width: 0;
  color: var(--td-text-color-secondary);
  word-break: break-all;
}

.cc-captcha-site .t-button-link {
  flex: none;
  font-size: 12px;
  margin-right: 0;
}

.cc-captcha-warn {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--td-warning-color-7);
  background: var(--td-warning-color-1);
  border: 1px solid var(--td-warning-color-3);
}

.t-button-link {
  margin-right: 10px;
  cursor: pointer;
  color: var(--td-brand-color);
}

/* 动不了的排序链接要看得出来动不了，否则点上去像是坏了 */
.t-button-link.is-disabled {
  color: var(--td-text-color-disabled);
  cursor: not-allowed;
}
/* 紧急模式：有站点开着就常驻一条提示——开着忘了关是这个功能最现实的风险 */
.cc-emg-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 14px;
  border-radius: var(--td-radius-default);
  background: var(--td-error-color-1);
  color: var(--td-error-color-7);
  font-size: 13px;
}

.cc-help-icon {
  margin-left: 4px;
  color: var(--td-text-color-placeholder);
  cursor: pointer;
  vertical-align: -2px;
}

.cc-prio {
  font-size: 13px;
  line-height: 1.8;
}

.cc-prio-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.cc-prio-line {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

.cc-prio-line .n {
  flex: none;
  width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  border-radius: 50%;
  font-size: 11px;
  background: var(--td-bg-color-secondarycontainer);
  color: var(--td-text-color-secondary);
}

.cc-prio-line .tx {
  flex: 1;
  min-width: 0;
}

.cc-prio-note {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: var(--td-radius-default);
  background: var(--td-warning-color-1);
  color: var(--td-text-color-primary);
  font-size: 12px;
  line-height: 1.8;
}

.cc-hit-num {
  font-weight: 600;
}

.cc-hit-zero {
  color: var(--td-text-color-placeholder);
}
</style>
