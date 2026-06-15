<template>
  <div class="detail-base">
    <t-alert theme="info" :message="t('page.rule.detail.recommend_message')" close>
      <template #operation>
        <span @click="handleJumpAttackLogOperation">{{ t('page.rule.detail.jump_visit_log') }}</span>
        <span @click="handleJumpOnlineUrl">{{ t('page.rule.detail.jump_visit_log') }}</span>
      </template>
    </t-alert>
    <t-form :data="formData" :label-width="180" @submit="onSubmit">
      <!--Base Info Begin-->
      <t-card :title="t('page.rule.detail.base_info')">
        <t-form-item :label="t('page.rule.detail.rule_name')" name="rule_name">
          <t-input v-model="formData.rule_base.rule_name" :placeholder="t('common.placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.rule_domain_code')" name="rule_domain_code">
          <t-select v-model="formData.rule_base.rule_domain_code" clearable filterable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_options" :key="index" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.rule_salience')" name="salience">
          <t-input v-model="formData.rule_base.salience" :placeholder="t('common.placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.rule_manual')" name="is_manual_rule">
          <t-select v-model="formData.is_manual_rule" :style="{ width: '480px' }" @change="changeManualRule">
            <t-option v-for="(item, index) in ruleManualOptions" :key="index" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.rule_status')" name="rule_status">
          <t-select v-model="formData.rule_status" :style="{ width: '480px' }">
            <t-option v-for="(item, index) in ruleStatusOptions" :key="index" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>
      </t-card>
      <!--Base Info End-->

      <!--UI Rule -->
      <div v-if="formData.is_manual_rule == '0'">
        <!--规则编排 开始-->
        <t-card :title="t('page.rule.detail.write_rule')">
          <t-button theme="primary" @click="ruleDynAdd('cond')">
            {{ t('common.new') }}
          </t-button>
          <t-form-item v-if="formData.rule_condition.relation_detail.length > 1" :label="t('page.rule.detail.relation')" name="relation_symbol">
            <t-select v-model="formData.rule_condition.relation_symbol" clearable :style="{ width: '480px' }" @change="onFormChange">
              <t-option v-for="(item, index) in relationSymbolOptions" :key="index" :value="item.value" :label="item.label">
                {{ item.label }}
              </t-option>
            </t-select>
          </t-form-item>
          <t-card
            v-for="(condition_item, condition_index) in formData.rule_condition.relation_detail"
            :key="condition_index"
            :title="t('page.rule.detail.condition')"
          >
            <t-row :gutter="{ xs: 8, sm: 12, md: 16, lg: 16, xl: 16, xxl: 16 }">
              <t-col :span="5">
                <t-form-item :label="t('page.rule.detail.scope')" name="attr" :label-width="80">
                  <t-select v-model="condition_item.attr" clearable :style="{ width: '200px' }" @change="onAttrChange(condition_item)">
                    <t-option
                      v-for="(item, index) in attrOptions.filter((option) => !option.value.toLowerCase().startsWith('get'))"
                      :key="index"
                      :value="item.value"
                      :label="item.label"
                    >
                      {{ item.label }}
                    </t-option>
                  </t-select>
                </t-form-item>
              </t-col>
              <t-col :span="5">
                <t-form-item :label="t('page.rule.detail.judgment')" name="attr_judge" :label-width="80">
                  <t-select v-model="condition_item.attr_judge" clearable :style="{ width: '200px' }" @change="onAttrJudgeChange(condition_item)">
                    <t-option v-for="(item, index) in attrJudgeOptions" :key="index" :value="item.value" :label="item.label">
                      {{ item.label }}
                    </t-option>
                  </t-select>
                </t-form-item>
              </t-col>
              <t-col :span="5">
                <t-form-item :label="t('page.rule.detail.value')" name="att_val" :label-width="80">
                  <t-input v-model="condition_item.attr_val" :style="{ width: '200px' }" placeholder="请输入内容" @change="onFormChange" />
                </t-form-item>
              </t-col>
              <t-col v-if="(condition_item.attr_judge || '').startsWith('system.')" :span="3">
                <t-form-item :label="t('page.rule.detail.function_judgment_result')" name="att_val2" :label-width="80">
                  <t-select v-model="condition_item.attr_val2" clearable :style="{ width: '160px' }" @change="onFormChange">
                    <t-option value="true" label="true" />
                    <t-option value="false" label="false" />
                  </t-select>
                </t-form-item>
              </t-col>
              <t-col :span="1" style="text-align: right">
                <t-button theme="danger" @click="ruleDynDel('cond', condition_index)">{{ t('common.delete') }}</t-button>
              </t-col>
            </t-row>
          </t-card>
        </t-card>
        <!--规则编排 结束-->

        <!-- 规则脚本内容预览（仅 UI 模式显示） -->
        <t-card :title="t('page.rule.detail.rule_script_content')">
          <pre class="rule-example-code">{{ rulePreviewContent || ruleDetail.rule_content }}</pre>
        </t-card>
      </div>
      <!--UI Rule End-->

      <!--Manual Rule-->
      <div v-if="formData.is_manual_rule == '1'">
        <t-card :title="t('page.rule.detail.write_rule')">
          <t-row>
            <!-- 左侧代码编辑区域 -->
            <t-col flex="auto">
              <div class="rule-example-header">
                <code-icon />
                <span class="rule-example-title">{{ t('page.rule.detail.manual_code_rule_edit') }}</span>
              </div>
              <write-rule :valuecontent="formCodemirrorContent" @edtinput="(v: string) => (formCodemirrorContent = v)" />

              <div class="rule-example-container">
                <!-- 使用 Tab 横向展示示例 -->
                <t-tabs default-value="basic" theme="card">
                  <!-- 基础示例 -->
                  <t-tab-panel value="basic" label="📖 基础示例">
                    <t-alert theme="info" :title="t('page.rule.detail.example_code')" style="margin-bottom: 12px">
                      <template #message>
                        <pre>
 rule R80798f795d7947419ba6f593708b40d9 "禁止来自中国以外的访客访问" salience 10 {
              when
                MF.COUNTRY != "中国"
              then
                Retract("R80798f795d7947419ba6f593708b40d9");
            }</pre
                        >
                      </template>
                    </t-alert>

                    <div v-show="showMore.basic">
                      <t-alert theme="info" :title="t('page.rule.detail.example_code')" style="margin-bottom: 12px">
                        <template #message>
                          <pre>
 rule R80798f795d7947419ba6f593708b4012 "禁止满足条件的Header访客访问" salience 10 {
              when
                MF.GetHeaderValue("Accept").Contains("text/plain") == True
              then
                Retract("R80798f795d7947419ba6f593708b4012");
            }</pre
                          >
                        </template>
                      </t-alert>

                      <t-alert theme="info" :title="t('page.rule.detail.example_code')">
                        <template #message>
                          <pre>
 rule R80798f795d7947419ba6f593708b4013 "禁止5分钟内失败10次的IP访问" salience 10 {
              when
                MF.GetIPFailureCount(5) > 10
              then
                Retract("R80798f795d7947419ba6f593708b4013");
            }</pre
                          >
                        </template>
                      </t-alert>
                    </div>

                    <div style="text-align: center; margin-top: 12px">
                      <t-button theme="default" variant="text" @click="toggleShowMore('basic')">
                        <template v-if="!showMore.basic"><chevron-down-icon /> 显示更多 (2)</template>
                        <template v-else><chevron-up-icon /> 收起</template>
                      </t-button>
                    </div>
                  </t-tab-panel>

                  <!-- RF IP相关函数 -->
                  <t-tab-panel value="rf_ip" label="🌐 IP地址判断">
                    <t-alert theme="success" :title="t('page.rule.detail.example_ip_range')" style="margin-bottom: 12px">
                      <template #message>
                        <pre>
 rule R835f9bf09867473dbe873027241db107 "不允许特定内网网段访问" salience 10 {
    when
        RF.IPInRange(MF.SRC_IP, "172.16.0.0", "172.20.255.254") == true ||
        RF.IPInRange(MF.SRC_IP, "192.168.0.0", "192.168.1.254") == true
    then
        Retract("R835f9bf09867473dbe873027241db107");
}</pre
                        >
                      </template>
                    </t-alert>

                    <div v-show="showMore.rf_ip">
                      <t-alert theme="success" :title="t('page.rule.detail.example_ip_ranges')" style="margin-bottom: 12px">
                        <template #message>
                          <pre>
 rule R835f9bf09867473dbe873027241db108 "不允许多个网段访问(类似SQL IN)" salience 10 {
    when
        RF.IPInRanges(MF.SRC_IP, "172.16.0.0-172.20.255.254", "192.168.0.0-192.168.1.254", "10.0.0.0/8") == true
    then
        Retract("R835f9bf09867473dbe873027241db108");
}</pre
                          >
                        </template>
                      </t-alert>

                      <t-alert theme="success" :title="t('page.rule.detail.example_ip_cidr')">
                        <template #message>
                          <pre>
 rule R835f9bf09867473dbe873027241db109 "不允许CIDR网段访问" salience 10 {
    when
        RF.IPInCIDR(MF.SRC_IP, "192.168.1.0/24") == true
    then
        Retract("R835f9bf09867473dbe873027241db109");
}</pre
                          >
                        </template>
                      </t-alert>
                    </div>

                    <div style="text-align: center; margin-top: 12px">
                      <t-button theme="default" variant="text" @click="toggleShowMore('rf_ip')">
                        <template v-if="!showMore.rf_ip"><chevron-down-icon /> 显示更多 (2)</template>
                        <template v-else><chevron-up-icon /> 收起</template>
                      </t-button>
                    </div>
                  </t-tab-panel>

                  <!-- RF 字符串函数 -->
                  <t-tab-panel value="rf_string" label="📝 字符串判断">
                    <t-alert theme="success" :title="t('page.rule.detail.example_method_in')" style="margin-bottom: 12px">
                      <template #message>
                        <pre>
 rule R835f9bf09867473dbe873027241db110 "不允许GET/POST方法" salience 10 {
    when
        RF.In(MF.METHOD, "GET", "POST") == true
    then
        Retract("R835f9bf09867473dbe873027241db110");
}</pre
                        >
                      </template>
                    </t-alert>

                    <div v-show="showMore.rf_string">
                      <t-alert theme="success" :title="t('page.rule.detail.example_contains_any')" style="margin-bottom: 12px">
                        <template #message>
                          <pre>
 rule R835f9bf09867473dbe873027241db111 "检测爬虫UserAgent" salience 10 {
    when
        RF.ContainsAnyIgnoreCase(MF.USER_AGENT, "bot", "spider", "crawler") == true
    then
        Retract("R835f9bf09867473dbe873027241db111");
}</pre
                          >
                        </template>
                      </t-alert>

                      <t-alert theme="success" :title="t('page.rule.detail.example_url_check')">
                        <template #message>
                          <pre>
 rule R835f9bf09867473dbe873027241db112 "检测危险文件扩展名" salience 10 {
    when
        RF.EndsWithAny(MF.URL, ".php", ".asp", ".jsp", ".aspx") == true
    then
        Retract("R835f9bf09867473dbe873027241db112");
}</pre
                          >
                        </template>
                      </t-alert>
                    </div>

                    <div style="text-align: center; margin-top: 12px">
                      <t-button theme="default" variant="text" @click="toggleShowMore('rf_string')">
                        <template v-if="!showMore.rf_string"><chevron-down-icon /> 显示更多 (2)</template>
                        <template v-else><chevron-up-icon /> 收起</template>
                      </t-button>
                    </div>
                  </t-tab-panel>

                  <!-- RF 数值函数 -->
                  <t-tab-panel value="rf_number" label="🔢 数值判断">
                    <t-alert theme="success" :title="t('page.rule.detail.example_status_range')">
                      <template #message>
                        <pre>
 rule R835f9bf09867473dbe873027241db113 "检测4xx错误状态码" salience 10 {
    when
        RF.IntInRange(MF.STATUS_CODE, 400, 499) == true
    then
        Retract("R835f9bf09867473dbe873027241db113");
}</pre
                        >
                      </template>
                    </t-alert>
                  </t-tab-panel>
                </t-tabs>

                <t-link theme="danger" hover="color" href="https://update.samwaf.com/airule/auto_jump_url.html?v20250311" target="_blank">
                  <template #suffix-icon><jump-icon /></template>
                  {{ t('page.rule.detail.tutorial_online') }}
                </t-link>
              </div>
            </t-col>

            <!-- 右侧系统变量参考区域 -->
            <t-col flex="450px">
              <div class="reference-container">
                <t-tabs default-value="variables" theme="card">
                  <!-- 系统变量 -->
                  <t-tab-panel value="variables" :label="t('page.rule.detail.system_variable')">
                    <t-table
                      :data="attrOptions"
                      :columns="referenceColumns"
                      size="small"
                      :pagination="{ pageSize: 10 }"
                      row-key="value"
                      stripe
                      hover
                    />
                  </t-tab-panel>

                  <!-- 判断符号 -->
                  <t-tab-panel value="judge" :label="t('page.rule.detail.system_judge_symbol')">
                    <t-table
                      :data="attrJudgeOptions"
                      :columns="referenceColumns"
                      size="small"
                      :pagination="{ pageSize: 10 }"
                      row-key="value"
                      stripe
                      hover
                    />
                  </t-tab-panel>

                  <!-- 关系符号 -->
                  <t-tab-panel value="relation" :label="t('page.rule.detail.system_relation_symbol')">
                    <t-table
                      :data="relationSymbolOptions"
                      :columns="referenceColumns"
                      size="small"
                      :pagination="{ pageSize: 10 }"
                      row-key="value"
                      stripe
                      hover
                    />
                  </t-tab-panel>
                </t-tabs>
              </div>
            </t-col>
          </t-row>
        </t-card>
      </div>

      <t-form-item style="margin-left: 100px">
        <t-space size="10px">
          <t-button theme="primary" type="submit">{{ t('common.submit') }}</t-button>
          <t-button theme="warning" type="button" @click="handleTestRule">{{ t('page.rule.detail.test_rule') }}</t-button>
          <t-button theme="primary" type="button" @click="backPage">{{ t('common.return') }}</t-button>
        </t-space>
      </t-form-item>
    </t-form>

    <!-- 测试规则弹窗 -->
    <t-dialog
      v-model:visible="testDialogVisible"
      :header="t('page.rule.detail.test_rule_title')"
      width="800px"
      :confirm-btn="t('page.rule.detail.test_start')"
      :cancel-btn="t('page.rule.detail.test_cancel')"
      @confirm="onConfirmTest"
      @cancel="onCancelTest"
    >
      <t-form :data="testFormData" :label-width="120">
        <t-form-item :label="t('page.rule.detail.test_src_ip')" name="test_src_ip">
          <t-input v-model="testFormData.test_src_ip" :placeholder="t('page.rule.detail.test_src_ip_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_host')" name="test_host">
          <t-input v-model="testFormData.test_host" :placeholder="t('page.rule.detail.test_host_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_url')" name="test_url">
          <t-input v-model="testFormData.test_url" :placeholder="t('page.rule.detail.test_url_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_method')" name="test_method">
          <t-select v-model="testFormData.test_method" :placeholder="t('page.rule.detail.test_method_placeholder')">
            <t-option value="GET" label="GET" />
            <t-option value="POST" label="POST" />
            <t-option value="PUT" label="PUT" />
            <t-option value="DELETE" label="DELETE" />
            <t-option value="HEAD" label="HEAD" />
            <t-option value="OPTIONS" label="OPTIONS" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_user_agent')" name="test_user_agent">
          <t-input v-model="testFormData.test_user_agent" :placeholder="t('page.rule.detail.test_user_agent_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_referer')" name="test_referer">
          <t-input v-model="testFormData.test_referer" :placeholder="t('page.rule.detail.test_referer_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_header')" name="test_header">
          <t-textarea v-model="testFormData.test_header" :placeholder="t('page.rule.detail.test_header_placeholder')" :autosize="{ minRows: 3, maxRows: 6 }" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_cookies')" name="test_cookies">
          <t-input v-model="testFormData.test_cookies" :placeholder="t('page.rule.detail.test_cookies_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_body')" name="test_body">
          <t-textarea v-model="testFormData.test_body" :placeholder="t('page.rule.detail.test_body_placeholder')" :autosize="{ minRows: 3, maxRows: 6 }" />
        </t-form-item>

        <!-- 测试结果显示 -->
        <t-form-item v-if="testResult !== null" :label="t('page.rule.detail.test_result')">
          <t-alert v-if="testResult.is_match" theme="warning">
            <template #message>
              <div>{{ t('page.rule.detail.test_matched') }}</div>
              <div v-if="testResult.matched_rules && testResult.matched_rules.length > 0">
                <strong>{{ t('page.rule.detail.test_matched_rules') }}:</strong>
                <ul>
                  <li v-for="(rule, index) in testResult.matched_rules" :key="index">{{ rule }}</li>
                </ul>
              </div>
              <div v-if="testResult.parsed_country || testResult.parsed_province || testResult.parsed_city">
                <strong>{{ t('page.rule.detail.test_parsed_location') }}:</strong>
                {{ testResult.parsed_country }} / {{ testResult.parsed_province }} / {{ testResult.parsed_city }}
              </div>
            </template>
          </t-alert>
          <t-alert v-else theme="success">
            <template #message>
              <div>{{ t('page.rule.detail.test_not_matched') }}</div>
              <div v-if="testResult.parsed_country || testResult.parsed_province || testResult.parsed_city">
                <strong>{{ t('page.rule.detail.test_parsed_location') }}:</strong>
                {{ testResult.parsed_country }} / {{ testResult.parsed_province }} / {{ testResult.parsed_city }}
              </div>
            </template>
          </t-alert>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps } from 'tdesign-vue-next';
import { JumpIcon, CodeIcon, ChevronDownIcon, ChevronUpIcon } from 'tdesign-icons-vue-next';
import { v4 as uuidv4 } from 'uuid';

import { RULE, RULE_RELATION_DETAIL, RULE_DO_ASSIGNMENT, RULE_DO_METHOD, RULE_DO_METHOD_PARM } from '@/service/service-rule';
import { copyObj, getOnlineUrl } from '@/utils/usuallytool';
import WriteRule from '@/components/write-rule/index.vue';
import { allhost } from '@/apis/host';
import { wafRuleEditApi, wafRuleAddApi, wafRuleDetailApi, wafRuleFormatApi, wafRuleTestApi } from '@/apis/rules';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const op_type = ref('add');
const op_rule_no = ref(''); // 规则识别号

const ruleManualOptions = computed(() => [
  { label: t('page.rule.detail.ui_rule_edit'), value: '0' },
  { label: t('page.rule.detail.manual_code_rule_edit'), value: '1' },
]);
const ruleStatusOptions = computed(() => [
  { label: t('page.rule.rule_on'), value: 1 },
  { label: t('page.rule.rule_off'), value: 0 },
]);

const attrOptions = computed(() => [
  { label: t('page.rule.detail.inner_option_host'), value: 'HOST' },
  { label: t('page.rule.detail.inner_option_url'), value: 'URL' },
  { label: t('page.rule.detail.inner_option_referrer'), value: 'REFERER' },
  { label: t('page.rule.detail.inner_option_user_agent'), value: 'USER_AGENT' },
  { label: t('page.rule.detail.inner_option_method'), value: 'METHOD' },
  { label: t('page.rule.detail.inner_option_cookies'), value: 'COOKIES' },
  { label: t('page.rule.detail.inner_option_body'), value: 'BODY' },
  { label: t('page.rule.detail.inner_option_port'), value: 'PORT' },
  { label: t('page.rule.detail.inner_option_src_ip'), value: 'SRC_IP' },
  { label: t('page.rule.detail.inner_option_country'), value: 'COUNTRY' },
  { label: t('page.rule.detail.inner_option_province'), value: 'PROVINCE' },
  { label: t('page.rule.detail.inner_option_city'), value: 'CITY' },
  { label: t('page.rule.detail.inner_option_getheadervalue'), value: 'GetHeaderValue("HeaderKeyName")' },
  { label: t('page.rule.detail.inner_option_getipfailurecount'), value: 'GetIPFailureCount(5)' },
  { label: t('page.rule.detail.inner_option_issafebot'), value: 'IsSafeBot()' },
]);

const attrJudgeOptions = computed(() => [
  { label: t('page.rule.detail.judge_equal'), value: '==' },
  { label: t('page.rule.detail.judge_not_equal'), value: '!=' },
  { label: t('page.rule.detail.judge_greater_than'), value: '>' },
  { label: t('page.rule.detail.judge_less_than'), value: '<' },
  { label: t('page.rule.detail.judge_greater_than_equal'), value: '>=' },
  { label: t('page.rule.detail.judge_less_than_equal'), value: '<=' },
  { label: t('page.rule.detail.judge_contain'), value: 'system.Contains' },
  { label: t('page.rule.detail.judge_has_prefix'), value: 'system.HasPrefix' },
  { label: t('page.rule.detail.judge_has_suffix'), value: 'system.HasSuffix' },
]);

const relationSymbolOptions = computed(() => [
  { label: t('page.rule.detail.judge_logic_and'), value: '&&' },
  { label: t('page.rule.detail.judge_logic_or'), value: '||' },
]);

const referenceColumns = computed(() => [
  { colKey: 'label', title: t('page.rule.detail.variable_name') },
  { colKey: 'value', title: t('page.rule.detail.variable_key') },
]);

const formData = ref<Record<string, any>>({ ...copyObj(RULE) });
const formCodemirrorContent = ref(''); // 代码编辑器内容
const host_options = ref<{ value: string; label: string }[]>([]);
const ruleuuid = ref(uuidv4());
const fromLogContentStr = ref(''); // 来源日志的字符串
const fromSourcePoint = ref(''); // 来源的字段
const ruleDetail = ref<Record<string, any>>({});
const rulePreviewContent = ref(''); // 规则预览内容

// 测试规则相关
const testDialogVisible = ref(false);
const testFormData = reactive({
  test_src_ip: '127.0.0.1',
  test_host: 'example.com:80',
  test_url: '/api/test',
  test_method: 'GET',
  test_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  test_referer: '',
  test_header: '',
  test_cookies: '',
  test_body: '',
});
const testResult = ref<Record<string, any> | null>(null);

// 控制每个示例 tab 的展开状态
const showMore = reactive<Record<string, boolean>>({
  basic: false,
  rf_ip: false,
  rf_string: false,
  rf_number: false,
});

watch(
  () => route.query.type,
  (newVal) => {
    if (newVal != undefined) op_type.value = String(newVal);
  },
);

watch(
  () => route.query.code,
  (newVal) => {
    if (newVal != undefined) {
      op_rule_no.value = String(newVal);
      getDetail(op_rule_no.value);
    }
  },
);

function toggleShowMore(tabName: string) {
  showMore[tabName] = !showMore[tabName];
}

// 重置表单数据
function resetFormData() {
  ruleuuid.value = uuidv4();
  formData.value = { ...copyObj(RULE) };
  formCodemirrorContent.value = '';
  fromLogContentStr.value = '';
  fromSourcePoint.value = '';
  op_rule_no.value = '';
}

function backPage() {
  history.go(-1);
}

function loadHostList() {
  allhost()
    .then((res) => {
      if (res.code === 0) {
        host_options.value = res.data;
      }
    })
    .catch((e: Error) => console.log(e));
}

function getDetail(id: string) {
  wafRuleDetailApi({ CODE: id })
    .then((res) => {
      if (res.code === 0) {
        formData.value = JSON.parse(res.data.rule_content_json);
        formData.value.rule_status = res.data.rule_status;
        ruleDetail.value = res.data;
        // 同步编辑器内容
        formCodemirrorContent.value = formData.value.rule_content || res.data.rule_content || '';
      }
    })
    .catch((e: Error) => console.log(e));
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  formData.value.rule_base.salience = parseInt(formData.value.rule_base.salience);
  formData.value.rule_content = formCodemirrorContent.value;
  // 使用正则替换 rule_content 中的 salience 值
  formData.value.rule_content = formData.value.rule_content.replace(/salience\s+\d+/g, `salience ${formData.value.rule_base.salience}`);

  if (op_type.value === 'add') {
    const postdata = {
      rule_json: JSON.stringify(formData.value),
      is_manual_rule: parseInt(formData.value.is_manual_rule),
      rule_content: formCodemirrorContent.value,
      rule_code: ruleuuid.value,
      rule_status: formData.value.rule_status,
    };
    wafRuleAddApi(postdata)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          resetFormData();
          router.push({ path: '/waf-host/wafrule' });
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => console.log(e));
  } else {
    const postdata = {
      code: op_rule_no.value,
      rule_json: JSON.stringify(formData.value),
      is_manual_rule: parseInt(formData.value.is_manual_rule),
      rule_content: formCodemirrorContent.value,
      rule_status: formData.value.rule_status,
    };
    wafRuleEditApi(postdata)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          resetFormData();
          router.push({ path: '/waf-host/wafrule' });
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => console.log(e));
  }
};

function ruleDynAdd(add_type: string, parent_index?: number) {
  switch (add_type) {
    case 'cond':
      formData.value.rule_condition.relation_detail.push(copyObj(RULE_RELATION_DETAIL));
      break;
    case 'assignment':
      formData.value.rule_do_assignment.push(copyObj(RULE_DO_ASSIGNMENT));
      break;
    case 'method':
      formData.value.rule_do_method.push(copyObj(RULE_DO_METHOD));
      break;
    case 'parms':
      if (parent_index !== undefined) {
        formData.value.rule_do_method[parent_index].parms.push(copyObj(RULE_DO_METHOD_PARM));
      }
      break;
    default:
      break;
  }
}

function ruleDynDel(del_type: string, index: number, parent_index?: number) {
  switch (del_type) {
    case 'cond':
      formData.value.rule_condition.relation_detail.splice(index, 1);
      break;
    case 'assignment':
      formData.value.rule_do_assignment.splice(index, 1);
      break;
    case 'method':
      formData.value.rule_do_method.splice(index, 1);
      break;
    case 'parms':
      if (parent_index !== undefined) {
        formData.value.rule_do_method[parent_index].parms.splice(index, 1);
      }
      break;
    default:
      break;
  }
}

// 切换 UI 编排/手工代码模式
function changeManualRule(e: any) {
  if (e == '1') {
    setRuleContentByMode();
  } else {
    onFormChange();
  }
}

function setRuleContentByMode() {
  const rulename = ruleuuid.value.replace(/-/g, '');
  const ruleremark = formData.value.rule_base.rule_name;
  const rule_salience = parseInt(formData.value.rule_base.salience);
  let bean = 'USER_AGENT';
  switch (fromSourcePoint.value) {
    case 'url':
      bean = 'URL';
      break;
    case 'header':
      bean = 'HEADER';
      break;
    case 'user_agent':
      bean = 'USER_AGENT';
      break;
    case 'cookies':
      bean = 'COOKIES';
      break;
    case 'body':
      bean = 'BODY';
      break;
  }
  const rule_condition = `MF.${bean}.Contains("${fromLogContentStr.value}")==true`;
  const rule_action = '';
  const str = `rule R${rulename} "${ruleremark}" salience ${rule_salience} {
            when
                ${rule_condition}
            then
                ${rule_action}
        		Retract("R${rulename}");
        } `;
  nextTick(() => {
    formCodemirrorContent.value = str;
  });
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/Rule.html#_1-脚本编辑`);
}

// 跳转到攻击日志（用于从日志创建规则）
function handleJumpAttackLogOperation() {
  router.push({
    path: '/waf/wafattacklog',
    query: { sourcePage: 'AddRule' },
  });
}

function onAttrChange(item: Record<string, any>) {
  // 依据选择的范围，自动调整值类型
  if ((item.attr || '').toUpperCase() === 'PORT') {
    item.attr_type = 'int';
  } else {
    item.attr_type = 'string';
  }
  onFormChange();
}

function onFormChange() {
  // 编排模式下任意字段变更后，刷新预览
  fetchRulePreview();
}

function buildPreviewPayload() {
  // 统一构造 RuleJson（与后端 RuleInfo JSON 结构一致）
  const ruleJsonObj = {
    is_manual_rule: formData.value.is_manual_rule,
    rule_content: formData.value.rule_content,
    rule_base: formData.value.rule_base,
    rule_condition: formData.value.rule_condition,
    rule_do_assignment: formData.value.rule_do_assignment,
    rule_do_method: formData.value.rule_do_method,
  };
  let ruleCode: string;
  // 编辑情况下需要把 code 也传进去
  if (ruleDetail.value && ruleDetail.value.rule_code) {
    ruleCode = ruleDetail.value.rule_code;
  } else {
    ruleCode = ruleuuid.value.replace(/-/g, '');
  }
  return {
    rule_code: ruleCode,
    rule_json: JSON.stringify(ruleJsonObj),
    is_manual_rule: Number(formData.value.is_manual_rule),
    rule_content: formData.value.rule_content || '',
  };
}

async function fetchRulePreview() {
  try {
    const payload = buildPreviewPayload();
    const res = await wafRuleFormatApi(payload);
    if (res.code === 0) {
      rulePreviewContent.value = res.data && res.data.rule_content ? res.data.rule_content : '';
    } else {
      MessagePlugin.warning(res.msg || '预览格式化失败');
    }
  } catch (e) {
    console.log(e);
    MessagePlugin.error('预览请求异常');
  }
}

function onAttrJudgeChange(item: Record<string, any>) {
  const isFunc = (item.attr_judge || '').startsWith('system.');
  if (!isFunc) {
    item.attr_val2 = '';
  } else if (item.attr_val2 !== 'true' && item.attr_val2 !== 'false') {
    // 切换为函数时，默认置为 true
    item.attr_val2 = 'true';
  }
  onFormChange();
}

// 测试规则相关方法
function handleTestRule() {
  testResult.value = null;
  testDialogVisible.value = true;
}

async function onConfirmTest() {
  const testData = {
    rule_json: JSON.stringify(formData.value),
    rule_content: formCodemirrorContent.value,
    is_manual_rule: parseInt(formData.value.is_manual_rule),
    rule_code: ruleuuid.value,
    ...testFormData,
  };

  try {
    const res = await wafRuleTestApi(testData);
    if (res.code === 0) {
      testResult.value = {
        is_match: res.data.is_match,
        matched_rules: res.data.matched_rules || [],
        parsed_country: res.data.parsed_country || '',
        parsed_province: res.data.parsed_province || '',
        parsed_city: res.data.parsed_city || '',
      };
      MessagePlugin.success('测试完成');
    } else {
      MessagePlugin.warning(res.msg || '测试失败');
    }
  } catch (e) {
    console.log(e);
    MessagePlugin.error('测试请求异常');
  }
}

function onCancelTest() {
  testDialogVisible.value = false;
  testResult.value = null;
}

onMounted(() => {
  loadHostList();

  if (route.query.code != undefined) {
    op_rule_no.value = String(route.query.code);
    getDetail(op_rule_no.value);
  }
  if (route.query.type != undefined) {
    op_type.value = String(route.query.type);

    if (op_type.value === 'add' && route.query.sourcePoint != undefined) {
      formData.value.is_manual_rule = String(route.query.is_manual_rule ?? '1');
      fromLogContentStr.value = String(route.query.contentstr ?? '');
      formData.value.rule_base.rule_domain_code = String(route.query.host_code ?? '');
      fromSourcePoint.value = String(route.query.sourcePoint);
      setRuleContentByMode();
    } else if (op_type.value === 'add' && route.query.sourcePoint == undefined) {
      fromSourcePoint.value = 'url';
      setRuleContentByMode();
    }
  }
});
</script>

<style scoped>
.detail-base :deep(.t-card) {
  padding: 8px;
  margin-bottom: 16px;
}

.detail-base :deep(.t-card__title) {
  font-size: 20px;
  font-weight: 500;
}

.rule-example-container {
  margin-top: 16px;
  border: 1px solid var(--td-component-stroke);
  border-radius: 6px;
  overflow: hidden;
}

.rule-example-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--td-bg-color-container-hover);
  border-bottom: 1px solid var(--td-component-stroke);
}

.rule-example-header .t-icon {
  margin-right: 8px;
  color: var(--td-brand-color);
}

.rule-example-title {
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.rule-example-code {
  margin: 0;
  padding: 12px;
  background-color: var(--td-bg-color-container-hover);
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre;
  overflow-x: auto;
}

/* 左右两侧容器高度一致 */
.rule-example-container,
.reference-container {
  min-height: 500px;
  max-height: 700px;
}

.rule-example-container :deep(.t-tabs__content),
.reference-container :deep(.t-tabs__content) {
  overflow-y: auto;
  max-height: 600px;
}
</style>
