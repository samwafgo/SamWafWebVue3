<template>
  <div class="cc-cond-editor">
    <div v-for="(cond, idx) in localConds" :key="idx" class="cc-cond-row">
      <span v-if="idx > 0" class="cc-cond-and">{{ t('page.ccrule.cond_and') }}</span>
      <div class="cc-cond-body">
        <div class="cc-cond-line">
          <!-- 匹配目标 -->
          <t-select v-model="cond.field" :style="{ width: '170px' }" @change="onFieldChange(cond)">
            <t-option-group :label="t('page.ccrule.field_group_request')">
              <t-option v-for="f in fieldsRequest" :key="f.value" :value="f.value" :label="f.label" />
            </t-option-group>
            <t-option-group :label="t('page.ccrule.field_group_common_header')">
              <t-option v-for="f in fieldsCommonHeader" :key="f.value" :value="f.value" :label="f.label" />
            </t-option-group>
            <t-option-group :label="t('page.ccrule.field_group_need_key')">
              <t-option v-for="f in fieldsNeedKey" :key="f.value" :value="f.value" :label="f.label" />
            </t-option-group>
            <t-option-group :label="t('page.ccrule.field_group_client')">
              <t-option v-for="f in fieldsClient" :key="f.value" :value="f.value" :label="f.label" />
            </t-option-group>
            <t-option-group :label="t('page.ccrule.field_group_response')">
              <t-option v-for="f in fieldsResponse" :key="f.value" :value="f.value" :label="f.label" />
            </t-option-group>
          </t-select>

          <!-- 字段名：只有请求头/Cookie/查询参数/请求体字段才需要 -->
          <t-input
            v-if="needKey(cond.field)"
            v-model="cond.key"
            :style="{ width: '160px' }"
            :placeholder="t('page.ccrule.cond_key_placeholder')"
          />

          <!-- 判断方式 -->
          <t-select v-model="cond.op" :style="{ width: '150px' }" @change="onOpChange(cond)">
            <t-option v-for="o in availableOps(cond.field)" :key="o.value" :value="o.value" :label="o.label" />
          </t-select>

          <!-- 值控件：形态由判断方式决定 -->
          <div class="cc-cond-val">
            <span v-if="opArity(cond.op) === 0" class="cc-cond-novalue">
              {{ t('page.ccrule.cond_no_value') }}
            </span>
            <template v-else-if="opArity(cond.op) === -1">
              <t-select
                v-if="usePreset(cond)"
                multiple
                filterable
                creatable
                :style="{ width: '100%' }"
                :value="cond.value"
                :placeholder="t('page.ccrule.cond_preset_placeholder')"
                @change="(v: any) => setArr(cond, v)"
                @create="(v: any) => onCreatePreset(cond, v)"
              >
                <t-option v-for="o in optionsFor(cond)" :key="o.value" :value="o.value" :label="o.label" />
              </t-select>
              <t-tag-input
                v-else
                :value="cond.value"
                :style="{ width: '100%' }"
                :placeholder="t('page.ccrule.cond_multi_placeholder')"
                clearable
                @change="(v: any) => setArr(cond, v)"
              />
            </template>
            <div v-else-if="opArity(cond.op) === 2" class="cc-cond-between">
              <t-input
                :value="cond.value[0]"
                :style="{ width: '120px' }"
                :placeholder="t('page.ccrule.cond_min')"
                @change="(v: any) => setVal(cond, 0, v)"
              />
              <span class="cc-cond-tilde">~</span>
              <t-input
                :value="cond.value[1]"
                :style="{ width: '120px' }"
                :placeholder="t('page.ccrule.cond_max')"
                @change="(v: any) => setVal(cond, 1, v)"
              />
            </div>
            <t-select
              v-else-if="usePreset(cond)"
              filterable
              creatable
              :style="{ width: '100%' }"
              :value="cond.value[0]"
              :placeholder="t('page.ccrule.cond_preset_placeholder')"
              @change="(v: any) => setVal(cond, 0, v)"
              @create="(v: any) => onCreatePreset(cond, v)"
            >
              <t-option v-for="o in optionsFor(cond)" :key="o.value" :value="o.value" :label="o.label" />
            </t-select>
            <t-input
              v-else
              :value="cond.value[0]"
              :style="{ width: '100%' }"
              :placeholder="cond.op === 'regex' ? t('page.ccrule.cond_regex_placeholder') : t('page.ccrule.cond_value')"
              @change="(v: any) => setVal(cond, 0, v)"
            />
          </div>

          <t-button variant="outline" theme="danger" size="small" @click="removeCond(idx)">
            {{ t('common.delete') }}
          </t-button>
        </div>

        <div v-if="needKey(cond.field)" class="cc-cond-hint">
          {{ t('page.ccrule.cond_key_hint') }}
        </div>
      </div>
    </div>

    <t-button variant="outline" size="small" @click="addCond"> + {{ t('page.ccrule.cond_add') }} </t-button>
    <div class="cc-cond-hint cc-cond-hint-block">{{ t('page.ccrule.cond_op_hint') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 需要指定字段名的匹配目标：光有「目标+判断+值」表达不了「取哪个头」
const NEED_KEY_FIELDS = ['header', 'cookie', 'query', 'body'];

// 判断方式需要几个值：0=不需要 1=一个 2=两个 -1=任意多个。
// 这张表决定右侧值控件的形态，与后端的校验规则一一对应。
const OP_ARITY: Record<string, number> = {
  eq: 1,
  ne: 1,
  contains: 1,
  not_contains: 1,
  prefix: 1,
  suffix: 1,
  regex: 1,
  gt: 1,
  lt: 1,
  in: -1,
  not_in: -1,
  between: 2,
  exists: 0,
  not_exists: 0,
};

// 常用取值预设：可点选，也能直接输入没列出的值（creatable）。
// 取值口径必须与后端 ccrule/matcher.go 的 fieldValues 完全一致，否则点出来的规则永远不命中：
//   ext  取的是 path.Ext()，**带点**且已转小写（.js 不是 js）
//   scheme 只有 http / https 两种
//   is_bot 是数字字符串 "0" / "1"
//   resp_content_type 是响应头原文，常带 "; charset=utf-8"，所以多用「前缀匹配 / 包含」而不是等于
const PRESET_VALUES: Record<string, string[]> = {
  method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  scheme: ['http', 'https'],
  ext: [
    '.html', '.htm', '.php', '.asp', '.aspx', '.jsp', '.do', '.action',
    '.json', '.xml', '.js', '.css', '.png', '.jpg', '.jpeg', '.gif',
    '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.map',
    '.txt', '.pdf', '.zip',
  ],
  status_code: ['200', '204', '301', '302', '304', '400', '401', '403', '404',
    '405', '408', '429', '499', '500', '502', '503', '504'],
  resp_content_type: [
    'text/html', 'application/json', 'text/plain', 'text/css',
    'application/javascript', 'text/javascript', 'image/png', 'image/jpeg',
    'image/gif', 'image/svg+xml', 'application/octet-stream',
    'text/xml', 'application/xml', 'application/pdf',
  ],
  is_bot: ['1', '0'],
};

// 正则的值是用户自己写的表达式，给预设下拉没有意义
const NO_PRESET_OPS = ['regex'];

// 只能用于数值型目标的判断方式
const NUMERIC_ONLY_OPS = ['gt', 'lt', 'between'];
const NUMERIC_FIELDS = ['is_bot', 'body_length', 'status_code', 'resp_length', 'upstream_cost'];

type Cond = { field: string; key: string; op: string; value: string[] };

const props = defineProps<{ modelValue?: any[] }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: Cond[]): void; (e: 'change', v: Cond[]): void }>();

const localConds = ref<Cond[]>([]);
// 用户自己输入的、不在预设里的取值。放组件级而不是挂在 cond 上：
// 挂上去会被 v-model 一起 emit 出去，而 normalize 又会把它抹掉，
// 两边内容对不上就会一直重建，正好把刚修好的回环再点着。
const customOpts = reactive<Record<string, string[]>>({});

const blankCond = (): Cond => ({ field: 'uri', key: '', op: 'prefix', value: [''] });

// 后端存的 value 统一是数组；界面按判断方式取用其中的第 0/1 项
function normalize(list: any): Cond[] {
  if (!Array.isArray(list) || list.length === 0) return [blankCond()];
  return list.map((c: any) => ({
    field: c.field || 'uri',
    key: c.key || '',
    op: c.op || 'prefix',
    value: Array.isArray(c.value) ? [...c.value] : c.value ? [c.value] : [''],
  }));
}

// 两边都过一遍 normalize 再比，避免「外部少个 key 字段」这类差异被当成真的变了
function sameAsLocal(val: any) {
  try {
    return JSON.stringify(normalize(val)) === JSON.stringify(localConds.value);
  } catch (e) {
    return false;
  }
}

watch(
  () => props.modelValue,
  (val) => {
    // 只有外部真的换了一份数据才重建本地副本。
    // 少了这道判断就会形成回环：本地一改 → emit 出去 → 父级 v-model 回填 →
    // 这里 normalize 重建出新数组 → deep 监听又触发 emit …… 切换判断方式时
    // onOpChange 会给 cond.value 赋新数组，正好把这个回环点着，页面直接卡死。
    if (sameAsLocal(val)) return;
    localConds.value = normalize(val);
  },
  // 刻意不 deep：只在外部换了一份数据时才重建。deep 会让本地每次改动都回弹一次，
  // 白白多跑一遍比对，也把回环的风险重新拉近
  { immediate: true },
);

watch(
  localConds,
  (val) => {
    emit('update:modelValue', val);
    emit('change', val);
  },
  { deep: true },
);

const fieldsRequest = computed(() => [
  { value: 'uri', label: t('page.ccrule.field_uri') },
  { value: 'query_str', label: t('page.ccrule.field_query_str') },
  { value: 'method', label: t('page.ccrule.field_method') },
  { value: 'host', label: t('page.ccrule.field_host') },
  { value: 'ext', label: t('page.ccrule.field_ext') },
  { value: 'scheme', label: t('page.ccrule.field_scheme') },
  { value: 'body_length', label: t('page.ccrule.field_body_length') },
]);
const fieldsCommonHeader = computed(() => [
  { value: 'user_agent', label: 'User-Agent' },
  { value: 'referer', label: 'Referer' },
]);
const fieldsNeedKey = computed(() => [
  { value: 'header', label: t('page.ccrule.field_header') },
  { value: 'cookie', label: t('page.ccrule.field_cookie') },
  { value: 'query', label: t('page.ccrule.field_query') },
  { value: 'body', label: t('page.ccrule.field_body') },
]);
const fieldsClient = computed(() => [
  { value: 'client_ip', label: t('page.ccrule.field_client_ip') },
  { value: 'country', label: t('page.ccrule.field_country') },
  { value: 'province', label: t('page.ccrule.field_province') },
  { value: 'city', label: t('page.ccrule.field_city') },
  { value: 'is_bot', label: t('page.ccrule.field_is_bot') },
]);
const fieldsResponse = computed(() => [
  { value: 'resp_content_type', label: t('page.ccrule.field_resp_content_type') },
  { value: 'status_code', label: t('page.ccrule.field_status_code') },
  { value: 'resp_length', label: t('page.ccrule.field_resp_length') },
  { value: 'upstream_cost', label: t('page.ccrule.field_upstream_cost') },
]);

function needKey(field: string) {
  return NEED_KEY_FIELDS.indexOf(field) >= 0;
}
function opArity(op: string) {
  return OP_ARITY[op] === undefined ? 1 : OP_ARITY[op];
}
function setVal(cond: Cond, idx: number, v: any) {
  const next = Array.isArray(cond.value) ? [...cond.value] : [];
  while (next.length <= idx) next.push('');
  next[idx] = v;
  cond.value = next;
}
function setArr(cond: Cond, v: any) {
  cond.value = Array.isArray(v) ? v : [];
}
// 有预设可点选：正则除外（那是用户自己写的表达式），无值/区间两类也用不上
function usePreset(cond: Cond) {
  if (!PRESET_VALUES[cond.field]) return false;
  if (NO_PRESET_OPS.indexOf(cond.op) >= 0) return false;
  const arity = opArity(cond.op);
  return arity === 1 || arity === -1;
}
// 预设 + 用户自建 + 当前已选中的值（编辑旧规则时值可能不在预设里，也要能显示出来）
function optionsFor(cond: Cond) {
  const seen: Record<string, boolean> = {};
  const out: { value: string; label: string }[] = [];
  const push = (v: any) => {
    const val = String(v);
    if (val === '' || seen[val]) return;
    seen[val] = true;
    out.push({ value: val, label: val });
  };
  (PRESET_VALUES[cond.field] || []).forEach(push);
  (customOpts[cond.field] || []).forEach(push);
  (Array.isArray(cond.value) ? cond.value : []).forEach(push);
  if (cond.field === 'is_bot') {
    return out.map((o) => ({
      value: o.value,
      label: o.value === '1' ? t('page.ccrule.cond_yes') : t('page.ccrule.cond_no'),
    }));
  }
  return out;
}
// 用户输入了预设之外的值：记下来，让它在下拉里也能显示与再次选中
function onCreatePreset(cond: Cond, v: any) {
  const val = String(v || '').trim();
  if (!val) return;
  const cur = customOpts[cond.field] || [];
  if (cur.indexOf(val) < 0) customOpts[cond.field] = [...cur, val];
  if (opArity(cond.op) === -1) {
    const vals = Array.isArray(cond.value) ? cond.value : [];
    if (vals.indexOf(val) < 0) cond.value = [...vals, val];
  } else {
    setVal(cond, 0, val);
  }
}
function availableOps(field: string) {
  const numeric = NUMERIC_FIELDS.indexOf(field) >= 0;
  const all = [
    { value: 'eq', label: t('page.ccrule.op_eq') },
    { value: 'ne', label: t('page.ccrule.op_ne') },
    { value: 'contains', label: t('page.ccrule.op_contains') },
    { value: 'not_contains', label: t('page.ccrule.op_not_contains') },
    { value: 'prefix', label: t('page.ccrule.op_prefix') },
    { value: 'suffix', label: t('page.ccrule.op_suffix') },
    { value: 'regex', label: t('page.ccrule.op_regex') },
    { value: 'in', label: t('page.ccrule.op_in') },
    { value: 'not_in', label: t('page.ccrule.op_not_in') },
    { value: 'gt', label: t('page.ccrule.op_gt') },
    { value: 'lt', label: t('page.ccrule.op_lt') },
    { value: 'between', label: t('page.ccrule.op_between') },
    { value: 'exists', label: t('page.ccrule.op_exists') },
    { value: 'not_exists', label: t('page.ccrule.op_not_exists') },
  ];
  // 非数值目标不给大小比较，避免配出永远不成立的条件
  return numeric ? all : all.filter((o) => NUMERIC_ONLY_OPS.indexOf(o.value) < 0);
}
// 切换判断方式时保留能保留的值，其余丢弃：
// 从多选切到单值只留第一个，切到无值类则清空，避免把界面残留值提交到后端
function onOpChange(cond: Cond) {
  const arity = opArity(cond.op);
  const cur = Array.isArray(cond.value) ? cond.value.filter((v) => v !== '' && v !== null) : [];
  if (arity === 0) {
    cond.value = [];
  } else if (arity === -1) {
    cond.value = cur;
  } else if (arity === 2) {
    cond.value = [cur[0] || '', cur[1] || ''];
  } else {
    cond.value = [cur[0] || ''];
  }
}
function onFieldChange(cond: Cond) {
  if (!needKey(cond.field)) cond.key = '';
  // 目标换成非数值型后，原来的大小比较不再适用
  if (NUMERIC_ONLY_OPS.indexOf(cond.op) >= 0 && NUMERIC_FIELDS.indexOf(cond.field) < 0) {
    cond.op = 'eq';
    onOpChange(cond);
    return;
  }
  // 换到取值可枚举的目标时，把默认的「前缀匹配」调成「等于」——只在还是默认值时调整，
  // 用户显式选过的判断方式不动。响应 Content-Type 例外：它的值常带 "; charset=utf-8"，
  // 等于几乎不会成立，仍保持前缀匹配。
  if (cond.op === 'prefix' && PRESET_VALUES[cond.field] && cond.field !== 'resp_content_type') {
    cond.op = 'eq';
    onOpChange(cond);
  }
}
function addCond() {
  localConds.value.push(blankCond());
}
function removeCond(idx: number) {
  localConds.value.splice(idx, 1);
  if (localConds.value.length === 0) localConds.value.push(blankCond());
}
// 供父组件在提交前取规范化结果
function getConditions() {
  return localConds.value.map((c) => {
    const arity = opArity(c.op);
    const item: Record<string, any> = { field: c.field, op: c.op, value: [] };
    if (needKey(c.field)) item.key = (c.key || '').trim();
    if (arity !== 0) {
      item.value = (c.value || []).filter((v) => v !== '' && v !== null && v !== undefined);
    }
    return item;
  });
}

defineExpose({ getConditions });
</script>

<style scoped>
/* 编辑器整体是表单行里的一个 flex 项，不撑满就会被同行元素挤窄 */
.cc-cond-editor {
  width: 100%;
}

.cc-cond-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
}

.cc-cond-and {
  position: absolute;
  left: -46px;
  top: 8px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  border: 1px solid var(--td-component-border);
  border-radius: 2px;
  padding: 0 6px;
  background: var(--td-bg-color-container);
}

.cc-cond-body {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-default);
  padding: 12px;
  background: var(--td-bg-color-container-hover);
}

.cc-cond-line {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.cc-cond-val {
  flex: 1;
  min-width: 0;
}

.cc-cond-between {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cc-cond-tilde {
  color: var(--td-text-color-placeholder);
}

.cc-cond-novalue {
  display: inline-block;
  line-height: 32px;
  font-size: 13px;
  color: var(--td-text-color-placeholder);
}

.cc-cond-hint {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-top: 6px;
}

.cc-cond-hint-block {
  margin-top: 8px;
}
</style>
