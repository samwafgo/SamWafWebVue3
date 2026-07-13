<template>
  <div class="in-coder-panel">
    <codemirror
      v-model="code"
      :style="{ height: '220px', width: '100%' }"
      :autofocus="false"
      :indent-with-tab="true"
      :tab-size="4"
      :extensions="extensions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Codemirror } from 'vue-codemirror';
import { basicSetup } from 'codemirror';
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';

// ============ SamWaf 规则自动补全词库（中英双语） ============
// 与规则编辑页的字段/函数保持一致，用户写规则时按 . 或 Ctrl+空格即可弹出提示，无需记忆。
// 每一项: text=插入的代码；dispZh/dispEn=下拉显示名(缺省用 text)；zh/en=中英文解释。
type VocabItem = { text: string; dispZh?: string; dispEn?: string; zh?: string; en?: string };

// MF.<字段> —— 当前请求的信息
const MF_FIELDS: VocabItem[] = [
  { text: 'HOST', zh: '请求域名', en: 'Request host' },
  { text: 'URL', zh: '请求地址(含路径)', en: 'Request URL (with path)' },
  { text: 'REFERER', zh: '来源页 Referer', en: 'Referer header' },
  { text: 'USER_AGENT', zh: '浏览器标识 UA', en: 'User-Agent' },
  { text: 'METHOD', zh: '请求方法 GET/POST...', en: 'HTTP method GET/POST...' },
  { text: 'COOKIES', zh: '请求 Cookie', en: 'Request cookies' },
  { text: 'BODY', zh: '请求体内容', en: 'Request body' },
  { text: 'PORT', zh: '访问端口(数值)', en: 'Port (number)' },
  { text: 'SRC_IP', zh: '访客来源IP', en: 'Client source IP' },
  { text: 'COUNTRY', zh: '国家(如 中国)', en: 'Country (e.g. 中国)' },
  { text: 'PROVINCE', zh: '省份', en: 'Province' },
  { text: 'CITY', zh: '城市', en: 'City' },
];
// MF 上的方法
const MF_METHODS: VocabItem[] = [
  { text: 'GetHeaderValue("")', dispZh: 'GetHeaderValue(头名)', dispEn: 'GetHeaderValue(name)', zh: '取指定请求头的值', en: 'Get a request header value' },
  { text: 'GetIPFailureCount(5)', dispZh: 'GetIPFailureCount(分钟)', dispEn: 'GetIPFailureCount(minutes)', zh: '近N分钟内该IP失败次数', en: 'IP failure count in last N minutes' },
  { text: 'IsSafeBot()', zh: '是否搜索引擎等安全爬虫', en: 'Is a known safe bot (search engine)' },
];
// 字符串字段(如 MF.URL)上的方法
const STR_METHODS: VocabItem[] = [
  { text: 'Contains("")', dispZh: 'Contains(子串)', dispEn: 'Contains(substr)', zh: '包含指定子串', en: 'Contains substring' },
  { text: 'HasPrefix("")', dispZh: 'HasPrefix(前缀)', dispEn: 'HasPrefix(prefix)', zh: '以指定前缀开头', en: 'Starts with prefix' },
  { text: 'HasSuffix("")', dispZh: 'HasSuffix(后缀)', dispEn: 'HasSuffix(suffix)', zh: '以指定后缀结尾', en: 'Ends with suffix' },
];
// RF.<函数> —— 规则函数与命中动作（动作用在 then 里，必须以分号结尾，grule 语法要求）
const RF_FUNCS: VocabItem[] = [
  { text: 'Deny();', dispZh: 'Deny()', dispEn: 'Deny()', zh: '动作：命中即拦截(默认)', en: 'Action: block on match (default)' },
  { text: 'Allow();', dispZh: 'Allow()', dispEn: 'Allow()', zh: '动作：放行(后续检测照常)', en: 'Action: allow (later checks still run)' },
  { text: 'Allow("CC");', dispZh: 'Allow(模块...)', dispEn: 'Allow(modules...)', zh: '动作：放行并跳过指定检测(CC/AI/SQLI...)', en: 'Action: allow and skip given checks' },
  { text: 'AllowAll();', dispZh: 'AllowAll()', dispEn: 'AllowAll()', zh: '动作：放行并跳过后续所有检测', en: 'Action: allow and skip all later checks' },
  { text: 'Log();', dispZh: 'Log()', dispEn: 'Log()', zh: '动作：仅记录不拦截', en: 'Action: log only, do not block' },
  { text: 'IPInRange(MF.SRC_IP, "", "")', dispZh: 'IPInRange(ip,起,止)', dispEn: 'IPInRange(ip,start,end)', zh: 'IP是否在起止区间内', en: 'IP within start-end range' },
  { text: 'IPInRanges(MF.SRC_IP, "")', dispZh: 'IPInRanges(ip,区间...)', dispEn: 'IPInRanges(ip,ranges...)', zh: 'IP是否在多个区间/CIDR之一', en: 'IP in any range/CIDR' },
  { text: 'IPInCIDR(MF.SRC_IP, "")', dispZh: 'IPInCIDR(ip,cidr)', dispEn: 'IPInCIDR(ip,cidr)', zh: 'IP是否在CIDR网段内', en: 'IP within CIDR' },
  { text: 'IPEquals(MF.SRC_IP, "")', dispZh: 'IPEquals(ip1,ip2)', dispEn: 'IPEquals(ip1,ip2)', zh: '两个IP是否相等', en: 'Two IPs equal' },
  { text: 'In(MF.METHOD, "")', dispZh: 'In(值,列表...)', dispEn: 'In(value,list...)', zh: '值是否等于列表中任意一个', en: 'Value in list' },
  { text: 'InIgnoreCase(MF.METHOD, "")', dispZh: 'InIgnoreCase(值,列表...)', dispEn: 'InIgnoreCase(value,list...)', zh: '同 In，忽略大小写', en: 'In, case-insensitive' },
  { text: 'ContainsAny(MF.URL, "")', dispZh: 'ContainsAny(串,子串...)', dispEn: 'ContainsAny(str,subs...)', zh: '包含任意一个子串', en: 'Contains any substring' },
  { text: 'ContainsAnyIgnoreCase(MF.USER_AGENT, "")', dispZh: 'ContainsAnyIgnoreCase(串,子串...)', dispEn: 'ContainsAnyIgnoreCase(str,subs...)', zh: '包含任意一个(忽略大小写)', en: 'Contains any, case-insensitive' },
  { text: 'ContainsAll(MF.URL, "")', dispZh: 'ContainsAll(串,子串...)', dispEn: 'ContainsAll(str,subs...)', zh: '同时包含全部子串', en: 'Contains all substrings' },
  { text: 'StartsWithAny(MF.URL, "")', dispZh: 'StartsWithAny(串,前缀...)', dispEn: 'StartsWithAny(str,prefixes...)', zh: '以任意一个前缀开头', en: 'Starts with any prefix' },
  { text: 'EndsWithAny(MF.URL, "")', dispZh: 'EndsWithAny(串,后缀...)', dispEn: 'EndsWithAny(str,suffixes...)', zh: '以任意一个后缀结尾', en: 'Ends with any suffix' },
  { text: 'IntInRange(MF.PORT, 0, 0)', dispZh: 'IntInRange(数,min,max)', dispEn: 'IntInRange(n,min,max)', zh: '整数是否在区间内', en: 'Integer within range' },
  { text: 'IntIn(MF.PORT, 0)', dispZh: 'IntIn(数,列表...)', dispEn: 'IntIn(n,list...)', zh: '整数是否等于列表中任意一个', en: 'Integer in list' },
  { text: 'Not()', zh: '逻辑取反', en: 'Logical NOT' },
  { text: 'IsEmpty()', zh: '字符串是否为空', en: 'String is empty' },
  { text: 'IsNotEmpty()', zh: '字符串是否非空', en: 'String is not empty' },
  { text: 'LengthBetween(MF.URL, 0, 0)', dispZh: 'LengthBetween(串,min,max)', dispEn: 'LengthBetween(str,min,max)', zh: '长度是否在区间内', en: 'Length within range' },
];
// 顶层关键字
const TOPLEVEL: VocabItem[] = [
  { text: 'rule R00000000 "规则描述" salience 10 {\n    when\n        \n    then\n        RF.Deny();\n}', dispZh: 'rule 规则骨架', dispEn: 'rule skeleton', zh: '插入一条完整规则模板', en: 'Insert a full rule template' },
  { text: 'when', zh: '条件开始', en: 'condition block' },
  { text: 'then', zh: '动作开始', en: 'action block' },
  { text: 'salience', zh: '优先级(数值越大越先命中)', en: 'priority (higher wins first)' },
  { text: 'MF.', zh: '当前请求信息(字段/方法)', en: 'current request (fields/methods)' },
  { text: 'RF.', zh: '规则函数与命中动作', en: 'rule functions & actions' },
];

const props = withDefaults(defineProps<{ valuecontent?: string }>(), { valuecontent: '' });
const emit = defineEmits<{ (e: 'edtinput', content: string): void }>();

const { locale } = useI18n();
const code = ref(props.valuecontent || '');

function isEn() {
  return String(locale.value || '').toLowerCase().indexOf('en') === 0;
}
function wafDisp(it: VocabItem) {
  return (isEn() ? it.dispEn : it.dispZh) || it.text;
}
function wafDesc(it: VocabItem) {
  return (isEn() ? it.en : it.zh) || '';
}

// 上下文感知的补全：按 . 之前的上下文给出字段/方法/函数
function wafCompletions(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const textBefore = line.text.slice(0, context.pos - line.from);
  const m = /[\w.]*$/.exec(textBefore);
  const token = m ? m[0] : '';
  const tokenStart = context.pos - token.length;

  let items: VocabItem[];
  let fromPos: number;
  if (/MF\.\w+\.\w*$/.test(token)) {
    items = STR_METHODS;
    fromPos = tokenStart + token.lastIndexOf('.') + 1;
  } else if (/MF\.\w*$/.test(token)) {
    items = MF_FIELDS.concat(MF_METHODS);
    fromPos = tokenStart + token.lastIndexOf('.') + 1;
  } else if (/RF\.\w*$/.test(token)) {
    items = RF_FUNCS;
    fromPos = tokenStart + token.lastIndexOf('.') + 1;
  } else {
    items = TOPLEVEL;
    fromPos = tokenStart;
  }

  // 非显式触发且无前缀时不弹（顶层场景避免噪音）
  if (!context.explicit && token === '') return null;

  const options = items.map((it) => ({
    label: wafDisp(it),
    detail: wafDesc(it),
    apply: it.text,
    type: 'keyword',
  }));
  return { from: fromPos, options, filter: true };
}

const extensions = [basicSetup, autocompletion({ override: [wafCompletions], activateOnTyping: true })];

// 父组件内容变化时同步到编辑器
watch(
  () => props.valuecontent,
  (newVal) => {
    if (newVal !== code.value) {
      code.value = newVal ?? '';
    }
  },
);

// 编辑器内容变化时通知父组件
watch(code, (newVal) => {
  emit('edtinput', newVal);
});
</script>

<style scoped>
.in-coder-panel {
  border-radius: 5px;
  flex-grow: 1;
  display: flex;
  position: relative;
  border: 1px solid var(--td-component-stroke);
}

.in-coder-panel :deep(.cm-editor) {
  flex-grow: 1;
  font-size: 13px;
}
</style>

<!-- 补全下拉浮层渲染在 body 上，scoped 不生效，用全局选择器让解释文字更清晰 -->
<style>
.cm-tooltip-autocomplete ul li[aria-selected] {
  background: var(--td-brand-color);
}

.cm-completionDetail {
  color: var(--td-text-color-placeholder);
  font-style: normal;
  margin-left: 12px;
  font-size: 12px;
}
</style>
