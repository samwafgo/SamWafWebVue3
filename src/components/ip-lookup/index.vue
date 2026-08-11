<template>
  <span class="ip-lookup">
    <t-button v-if="!hideTrigger" :theme="theme" :variant="variant" :size="size" @click="open()">
      <template #icon><search-icon /></template>
      {{ triggerText || t('common.ip_lookup.title') }}
    </t-button>

    <!-- attach="body" + 更高的 z-index：这个弹窗经常是从别的弹窗里(查看IP列表)点开的，
         不挂到 body 会被父弹窗的层叠上下文困住——表现为弹窗跑到后面、遮罩只盖住半个屏幕 -->
    <t-dialog
      v-model:visible="visible"
      :header="t('common.ip_lookup.title')"
      :width="720"
      :footer="false"
      attach="body"
      :z-index="zIndex"
      destroy-on-close
      @closed="onClosed"
    >
      <div class="ipl-body">
        <div class="ipl-search">
          <t-input
            v-model="ip"
            class="ipl-input"
            clearable
            :placeholder="t('common.ip_lookup.placeholder')"
            @enter="doQuery"
          />
          <t-button theme="primary" :loading="loading" @click="doQuery">
            {{ t('common.search') }}
          </t-button>
        </div>
        <div class="ipl-tip">{{ t('common.ip_lookup.scope_tip') }}</div>

        <!-- 分批查询的进度：慢的那批(威胁情报)不该挡住快的先出结果，
             所以这里显示每一批的状态，而不是整页转圈 -->
        <div v-if="loading || partialDone" class="ipl-progress">
          <div v-for="g in groups" :key="g.key" class="ipl-step" :class="'is-' + (groupState[g.key] || 'wait')">
            <loading-icon v-if="groupState[g.key] === 'doing'" class="ipl-step-ico" />
            <check-circle-filled-icon v-else-if="groupState[g.key] === 'done'" class="ipl-step-ico" />
            <error-circle-filled-icon v-else-if="groupState[g.key] === 'fail'" class="ipl-step-ico" />
            <span v-else class="ipl-step-dot"></span>
            <span>{{ g.label }}</span>
          </div>
        </div>

        <div>
          <!-- 还没查过：给一块空白引导，不要一上来就显示「未命中」误导用户 -->
          <div v-if="!queried" class="ipl-empty">{{ t('common.ip_lookup.idle') }}</div>

          <div v-else class="ipl-result">
            <div class="ipl-head">
              <span class="ipl-ip">{{ result.ip }}</span>
              <t-tag v-if="result.location" theme="default" variant="light" size="small">{{ result.location }}</t-tag>
              <span class="ipl-spacer"></span>
              <t-tag v-if="!result.hits.length" theme="success" variant="light">
                {{ t('common.ip_lookup.no_hit') }}
              </t-tag>
              <t-tag v-else :theme="verdict.theme" variant="light">{{ verdict.text }}</t-tag>
            </div>

            <!-- 输入的是网段/区间时，明说实际查的是哪个IP，不闷声换个东西查 -->
            <div v-if="result.query_note" class="ipl-note">{{ result.query_note }}</div>

            <!-- 有源查失败时必须说出来：否则「没查到」会被当成「不在名单里」 -->
            <t-alert
              v-if="result.degraded && result.degraded.length"
              theme="warning"
              size="small"
              :message="t('common.ip_lookup.degraded') + degradedNames"
              :style="{ marginTop: '8px' }"
            />

            <div v-if="!result.hits.length" class="ipl-none">
              {{ t('common.ip_lookup.no_hit_tip') }}
            </div>

            <div v-else class="ipl-hits">
              <div v-for="(hit, idx) in result.hits" :key="idx" class="ipl-hit" :class="'is-' + hit.effect">
                <div class="ipl-hit-main">
                  <t-tag :theme="effectTheme(hit.effect)" variant="light" size="small">{{ hit.source_name }}</t-tag>
                  <span class="ipl-scope">{{ hit.scope }}</span>
                  <code v-if="hit.matched" class="ipl-matched">{{ hit.matched }}</code>
                  <span class="ipl-spacer"></span>
                  <!-- 威胁情报的误报只能在本地排除：订阅源是全量快照，手工从防火墙删掉下次同步就回来。
                       这里直接带上 hit.matched(实际命中的那条原文，可能是网段)去排除，
                       用户不必自己判断该排单IP还是整段——排错了方向是最常见的"排了没生效" -->
                  <a v-if="hit.source === 'threat_ip'" class="ipl-exclude-link" @click="openExclude(hit)">
                    {{ t('common.ip_lookup.exclude_btn') }}
                  </a>
                  <span class="ipl-effect">{{ effectText(hit.effect) }}</span>
                </div>
                <div v-if="hit.detail" class="ipl-detail">{{ hit.detail }}</div>
              </div>
            </div>

            <!-- 排除表单：就地填，不跳页 -->
            <div v-if="excludeVisible" class="ipl-allow-form">
              <div class="ipl-allow-title">{{ t('common.ip_lookup.exclude_title') }}</div>
              <t-alert theme="warning" size="small" :style="{ marginBottom: '12px' }">
                <template #message>
                  <div>{{ t('common.ip_lookup.exclude_warn') }}</div>
                  <div class="ipl-warn-list">
                    {{ t('common.ip_lookup.exclude_scope_hint', { entry: excludeForm.entry }) }}
                  </div>
                </template>
              </t-alert>
              <t-form :data="excludeForm" label-width="72px" colon>
                <t-form-item :label="t('common.ip_lookup.exclude_entry')">
                  <t-input v-model="excludeForm.entry" :style="{ width: '100%' }" />
                </t-form-item>
                <t-form-item :label="t('common.remarks')">
                  <t-input v-model="excludeForm.remarks" :style="{ width: '100%' }" />
                </t-form-item>
                <t-form-item>
                  <t-button variant="outline" size="small" @click="excludeVisible = false">
                    {{ t('common.close') }}
                  </t-button>
                  <t-button
                    theme="primary"
                    size="small"
                    :loading="excludeSaving"
                    :style="{ marginLeft: '8px' }"
                    @click="submitExclude"
                  >
                    {{ t('common.confirm') }}
                  </t-button>
                </t-form-item>
              </t-form>
            </div>

            <!-- 加白/加黑都收在这儿，不再散在各个列表里 -->
            <div v-if="canAllow || canBlock" class="ipl-allow">
              <div v-if="!actionMode" class="ipl-allow-bar">
                <span class="ipl-allow-hint">{{ actionHint }}</span>
                <span class="ipl-spacer"></span>
                <t-button v-if="canAllow" theme="primary" variant="outline" size="small" @click="openActionForm('allow')">
                  {{ t('common.ip_lookup.allow_btn') }}
                </t-button>
                <t-button v-if="canBlock" theme="danger" variant="outline" size="small" @click="openActionForm('block')">
                  {{ t('common.ip_lookup.block_btn') }}
                </t-button>
              </div>

              <div v-else class="ipl-allow-form">
                <div class="ipl-allow-title">
                  {{ isBlockMode ? t('common.ip_lookup.block_btn') : t('common.ip_lookup.allow_btn') }}
                </div>

                <!-- 系统防火墙层是内核直接丢包，WAF 白名单根本轮不到判定。
                     这时候必须说清楚，否则用户加完白以为通了，实际还是连不上 -->
                <t-alert v-if="!isBlockMode && systemLayerBlocked" theme="warning" size="small" :style="{ marginBottom: '12px' }">
                  <template #message>
                    <div>{{ t('common.ip_lookup.system_layer_warn') }}</div>
                    <div class="ipl-warn-list">{{ systemLayerText }}</div>
                    <div class="ipl-warn-list">{{ t('common.ip_lookup.system_layer_hint') }}</div>
                  </template>
                </t-alert>

                <t-form :data="allowForm" label-width="72px" colon>
                  <t-form-item :label="t('common.ip_lookup.allow_host')">
                    <t-select v-model="allowForm.host_code" :style="{ width: '100%' }" :loading="hostLoading" filterable>
                      <t-option v-for="(name, code) in hostDic" :key="code" :value="code" :label="name" />
                    </t-select>
                  </t-form-item>
                  <t-form-item v-if="isBlockMode" :label="t('common.ip_lookup.block_layer')">
                    <t-select v-model="allowForm.target_layer" :style="{ width: '100%' }">
                      <t-option value="waf" :label="t('common.ip_lookup.layer_waf')" />
                      <t-option value="system" :label="t('common.ip_lookup.layer_system')" />
                      <t-option value="both" :label="t('common.ip_lookup.layer_both')" />
                    </t-select>
                  </t-form-item>
                  <t-form-item :label="isBlockMode ? t('common.ip_lookup.block_reason') : t('common.ip_lookup.allow_reason')">
                    <t-textarea
                      v-model="allowForm.remarks"
                      :autosize="{ minRows: 2, maxRows: 4 }"
                      :placeholder="t('common.ip_lookup.allow_reason_placeholder')"
                    />
                  </t-form-item>
                </t-form>

                <div class="ipl-allow-ops">
                  <t-button variant="outline" size="small" @click="actionMode = ''">
                    {{ t('common.cancel') }}
                  </t-button>
                  <t-button
                    :theme="isBlockMode ? 'danger' : 'primary'"
                    size="small"
                    :loading="allowLoading"
                    @click="doAction"
                  >
                    {{ t('common.confirm') }}
                  </t-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </t-dialog>
  </span>
</template>

<script setup lang="ts">
import { CheckCircleFilledIcon, ErrorCircleFilledIcon, LoadingIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, nextTick, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { allhost } from '@/apis/host';
import { wafIPBlockAddApi } from '@/apis/ipblock';
import { wafIPLookupApi } from '@/apis/iplookup';
import { wafIPWhiteAddApi } from '@/apis/ipwhite';
import { wafThreatIPExcludeAddApi } from '@/apis/threatip';

// 全局站点在库里就是一条 host="全局网站"、port=0 的普通记录，code 是 uuid。
// 全站其它页面也是按这个字面量认的，保持一致。
const GLOBAL_HOST_NAME = '全局网站:0';

type Hit = {
  source: string;
  source_name: string;
  scope: string;
  matched: string;
  effect: string;
  detail: string;
  system_layer?: boolean;
};

withDefaults(
  defineProps<{
    /** 预填的 IP，比如从日志某一行点进来 */
    value?: string;
    /** 只想用 ref 调 open() 时把按钮藏掉 */
    hideTrigger?: boolean;
    triggerText?: string;
    theme?: string;
    variant?: string;
    size?: string;
    /** TDesign 弹窗默认 2500，这里取更高的值好压住把它调起来的那个弹窗 */
    zIndex?: number;
  }>(),
  {
    value: '',
    hideTrigger: false,
    triggerText: '',
    theme: 'default',
    variant: 'outline',
    size: 'small',
    zIndex: 3500,
  },
);

const { t } = useI18n();

const visible = ref(false);
const loading = ref(false);
const queried = ref(false);
const partialDone = ref(false);
const ip = ref('');
const groupState = reactive<Record<string, string>>({});
const result = reactive({ ip: '', location: '', query_note: '', hits: [] as Hit[], degraded: [] as string[] });

const hostDic = ref<Record<string, string>>({});
const hostLoading = ref(false);
const globalHostCode = ref('');
// '' = 只显示按钮；'allow'/'block' = 展开对应表单
const actionMode = ref('');
const allowLoading = ref(false);
const allowForm = reactive({ host_code: '', remarks: '', target_layer: 'waf' });
// 威胁情报误报排除表单
const excludeVisible = ref(false);
const excludeSaving = ref(false);
const excludeForm = reactive({ entry: '', remarks: '' });

// 分批依据是「快慢」而不是「业务分类」：名单类查库几十毫秒，
// 威胁情报要编译十万条的大集合，放一批里会被拖死
const groups = computed(() => [
  { key: 'list', label: t('common.ip_lookup.step_list'), sources: ['ip_white', 'ip_black', 'ip_group'] },
  { key: 'ban', label: t('common.ip_lookup.step_ban'), sources: ['ip_failure', 'cc_ban', 'firewall'] },
  { key: 'threat', label: t('common.ip_lookup.step_threat'), sources: ['threat_ip'] },
  { key: 'cdn', label: t('common.ip_lookup.step_cdn'), sources: ['cdn'] },
]);

// 落到系统防火墙的拦截：内核层直接丢包，WAF 白名单管不着。
// 用后端给的结构化标记，不解析 detail 文案——文案一改判断就静默失效
const systemLayerHits = computed(() => result.hits.filter((h) => h.system_layer && h.effect === 'block'));
const systemLayerBlocked = computed(() => systemLayerHits.value.length > 0);
const systemLayerText = computed(() => systemLayerHits.value.map((h) => `${h.source_name}｜${h.scope}`).join('；'));

// 一堆命中里用户最想先知道的是「到底放行还是拦截」，白名单优先于黑名单
const verdict = computed(() => {
  const allowed = result.hits.some((h) => h.effect === 'allow');
  // 白名单只在 WAF 层生效。系统防火墙那层还拦着的时候不能报「会被放行」，
  // 否则用户刚加完白看到绿字，实际还是连不上
  if (allowed && systemLayerBlocked.value) {
    return { theme: 'warning', text: t('common.ip_lookup.verdict_partial') };
  }
  if (allowed) return { theme: 'success', text: t('common.ip_lookup.verdict_allow') };
  if (result.hits.some((h) => h.effect === 'block')) {
    return { theme: 'danger', text: t('common.ip_lookup.verdict_block') };
  }
  return { theme: 'warning', text: t('common.ip_lookup.verdict_none') };
});

const isBlockMode = computed(() => actionMode.value === 'block');
// 已经在白名单里就别再让加一条重的
const canAllow = computed(
  () => result.hits.some((h) => h.effect === 'block') && !result.hits.some((h) => h.effect === 'allow'),
);
// 已经在黑名单里就没必要再加；已在白名单里也不给加黑，避免造出自相矛盾的两条
const canBlock = computed(
  () => !result.hits.some((h) => h.source === 'ip_black') && !result.hits.some((h) => h.effect === 'allow'),
);
const actionHint = computed(() =>
  canAllow.value ? t('common.ip_lookup.allow_hint') : t('common.ip_lookup.block_hint'),
);

const sourceName = (code: string) => t(`common.ip_lookup.source.${code}`);
const degradedNames = computed(() => result.degraded.map(sourceName).join('、'));

function effectTheme(effect: string) {
  if (effect === 'allow') return 'success';
  if (effect === 'block') return 'danger';
  return 'warning';
}

function effectText(effect: string) {
  if (effect === 'allow') return t('common.ip_lookup.effect_allow');
  if (effect === 'block') return t('common.ip_lookup.effect_block');
  return t('common.ip_lookup.effect_none');
}

function resetResult(nextIp = '') {
  result.ip = nextIp;
  result.location = '';
  result.query_note = '';
  result.hits = [];
  result.degraded = [];
}

// 按来源分批并发查：名单类和缓存类几十毫秒就回来了，
// 威胁情报/CDN 要编译大集合，慢的那批不该挡住快的先出结果
function doQuery() {
  const target = (ip.value || '').trim();
  if (!target) {
    MessagePlugin.warning(t('common.ip_lookup.placeholder'));
    return;
  }

  loading.value = true;
  partialDone.value = false;
  resetResult(target);
  groups.value.forEach((g) => {
    groupState[g.key] = 'doing';
  });

  const tasks = groups.value.map((g) =>
    wafIPLookupApi({ ip: target, sources: g.sources.join(',') })
      .then((res: any) => {
        if (res.code !== 0) {
          groupState[g.key] = 'fail';
          // 整批失败要计入 degraded，否则「没查到」会被当成「不在名单里」
          result.degraded = result.degraded.concat(g.sources);
          return;
        }
        const d = res.data || {};
        if (d.ip) result.ip = d.ip;
        if (d.query_note && !result.query_note) result.query_note = d.query_note;
        if (d.location && !result.location) result.location = d.location;
        result.hits = result.hits.concat(d.hits || []);
        result.degraded = result.degraded.concat(d.degraded || []);
        groupState[g.key] = 'done';
        // 每批回来就先渲染，用户能立刻看到已完成部分
        queried.value = true;
        partialDone.value = true;
      })
      .catch(() => {
        groupState[g.key] = 'fail';
        result.degraded = result.degraded.concat(g.sources);
      }),
  );

  Promise.all(tasks).finally(() => {
    loading.value = false;
    queried.value = true;
    // 白名单排前面，结论一眼可见
    const order: Record<string, number> = { allow: 0, block: 1, none: 2 };
    result.hits.sort((a, b) => (order[a.effect] ?? 9) - (order[b.effect] ?? 9));
    // 全部完成后进度条收起来，别一直占着地方
    setTimeout(() => {
      if (!loading.value) partialDone.value = false;
    }, 600);
  });
}

function open(prefill?: string) {
  ip.value = prefill || '';
  queried.value = false;
  actionMode.value = '';
  resetResult();
  visible.value = true;
  // 带着 IP 进来的（从日志点过来）直接出结果，不用再点一次查询
  if (ip.value) nextTick(doQuery);
}

function onClosed() {
  loading.value = false;
  excludeVisible.value = false;
}

function loadHostDic() {
  if (Object.keys(hostDic.value).length) {
    if (!allowForm.host_code) allowForm.host_code = globalHostCode.value;
    return;
  }
  hostLoading.value = true;
  allhost({})
    .then((res: any) => {
      if (res.code !== 0) return;
      const dic: Record<string, string> = {};
      let globalCode = '';
      (res.data || []).forEach((item: any) => {
        dic[item.value] = item.label;
        // 全局站点认 pre_host（域名:端口），它就是引擎里的 GWAF_GLOBAL_HOST_NAME。
        // 认 label 不行：label 会被昵称/备注拼进去
        if (item.pre_host === GLOBAL_HOST_NAME) globalCode = item.value;
      });
      hostDic.value = dic;
      globalHostCode.value = globalCode;
      // 默认落在全局站点；万一没找到就留空，让用户自己选，不瞎猜一个
      if (!allowForm.host_code) allowForm.host_code = globalCode;
    })
    .finally(() => {
      hostLoading.value = false;
    });
}

// 原因预填成「为什么这么做」，用户改一下就能存，比留空强——
// 三个月后翻名单时最难受的就是不知道当初为什么加的
function buildReason(mode: string) {
  const date = new Date();
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (mode === 'block') {
    return t('common.ip_lookup.block_reason_tpl', { date: day, ip: result.ip });
  }
  const from = result.hits
    .filter((h) => h.effect === 'block')
    .map((h) => `${h.source_name}${h.scope ? `(${h.scope})` : ''}`)
    .join('、');
  return t('common.ip_lookup.allow_reason_tpl', { date: day, from: from || '-' });
}

// 打开威胁情报误报排除表单。
// entry 默认取 hit.matched(实际命中的那条原文)而不是查询的那个 IP：
// 快照里如果是 1.2.3.0/24，只排 1.2.3.4 是不生效的——小的排不掉大的。
function openExclude(hit: Record<string, any>) {
  const date = new Date();
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  excludeForm.entry = hit.matched || result.ip;
  excludeForm.remarks = t('common.ip_lookup.exclude_reason_tpl', {
    date: day,
    ip: result.ip,
    scope: hit.scope || '-',
  });
  excludeVisible.value = true;
}

function submitExclude() {
  const entry = (excludeForm.entry || '').trim();
  if (!entry) return;
  excludeSaving.value = true;
  wafThreatIPExcludeAddApi({ entry, remarks: excludeForm.remarks || '' })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        excludeVisible.value = false;
        doQuery(); // 重查一遍，让用户当场看到它已不再被威胁情报拦
      } else {
        MessagePlugin.error(res.msg);
      }
    })
    .catch((e: Error) => console.log(e))
    .finally(() => {
      excludeSaving.value = false;
    });
}

function openActionForm(mode: string) {
  actionMode.value = mode;
  allowForm.host_code = globalHostCode.value;
  allowForm.remarks = buildReason(mode);
  allowForm.target_layer = 'waf';
  loadHostDic();
}

function doAction() {
  const remarks = (allowForm.remarks || '').trim();
  if (!remarks) {
    MessagePlugin.warning(t('common.ip_lookup.allow_reason_required'));
    return;
  }
  if (!allowForm.host_code) {
    MessagePlugin.warning(t('common.ip_lookup.allow_host_required'));
    return;
  }

  const block = isBlockMode.value;
  const payload: Record<string, any> = {
    host_code: allowForm.host_code,
    ip: result.ip,
    remarks,
    ip_type: 'ip',
    group_code: '',
  };
  if (block) payload.target_layer = allowForm.target_layer;

  allowLoading.value = true;
  (block ? wafIPBlockAddApi(payload) : wafIPWhiteAddApi(payload))
    .then((res: any) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        actionMode.value = '';
        // 加完立刻重查一次，让用户自己看到结论变了，
        // 而不是只收到一句"添加成功"然后半信半疑
        doQuery();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .finally(() => {
      allowLoading.value = false;
    });
}

// 页面通过 ref 调 open(ip) 把日志里的 IP 直接带进来查
defineExpose({ open });
</script>

<style scoped>
.ipl-search {
  display: flex;
  gap: 8px;
}

.ipl-input {
  flex: 1;
}

.ipl-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  line-height: 1.6;
}

.ipl-progress {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: var(--td-radius-default);
  background: var(--td-bg-color-secondarycontainer);
}

.ipl-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.ipl-step.is-doing {
  color: var(--td-text-color-primary);
}

.ipl-step.is-done {
  color: var(--td-success-color);
}

.ipl-step.is-fail {
  color: var(--td-error-color);
}

.ipl-step-ico {
  font-size: 14px;
}

.ipl-step.is-doing .ipl-step-ico {
  animation: ipl-spin 0.9s linear infinite;
}

.ipl-step-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--td-component-border);
}

@keyframes ipl-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ipl-step.is-doing .ipl-step-ico {
    animation: none;
  }
}

.ipl-empty,
.ipl-none {
  margin-top: 16px;
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--td-text-color-placeholder);
}

.ipl-result {
  margin-top: 12px;
}

.ipl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--td-component-stroke);
}

.ipl-ip {
  font-size: 15px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.ipl-note {
  margin-top: 8px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.ipl-spacer {
  flex: 1;
}

.ipl-hits {
  margin-top: 4px;
  max-height: 380px;
  overflow-y: auto;
}

.ipl-hit {
  padding: 10px 12px;
  border-bottom: 1px solid var(--td-component-stroke);
  border-left: 2px solid transparent;
}

.ipl-hit.is-block {
  border-left-color: var(--td-error-color);
}

.ipl-hit.is-allow {
  border-left-color: var(--td-success-color);
}

.ipl-hit.is-none {
  border-left-color: var(--td-warning-color);
}

.ipl-hit-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
}

.ipl-scope {
  color: var(--td-text-color-primary);
}

.ipl-matched {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 2px;
  background: var(--td-bg-color-secondarycontainer);
  color: var(--td-text-color-secondary);
}
.ipl-exclude-link {
  font-size: 12px;
  margin-right: 10px;
  color: var(--td-brand-color);
  cursor: pointer;
}

.ipl-effect {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.ipl-detail {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
}

.ipl-allow {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--td-component-stroke);
}

.ipl-allow-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ipl-allow-hint {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.ipl-allow-form {
  background: var(--td-bg-color-secondarycontainer);
  border-radius: var(--td-radius-default);
  padding: 14px 16px;
}

.ipl-allow-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-bottom: 12px;
}

.ipl-warn-list {
  margin-top: 4px;
  font-size: 12px;
}

.ipl-allow-ops {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
