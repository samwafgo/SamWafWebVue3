<template>
  <t-dialog
    :visible="visible"
    :header="isBlock ? t('components.ip_disposal.header_block') : t('components.ip_disposal.header_allow')"
    :confirm-btn="{ content: t('common.confirm'), theme: isBlock ? 'danger' : 'primary', loading: submitting }"
    :cancel-btn="t('common.cancel')"
    width="560px"
    @confirm="handleConfirm"
    @close="close"
  >
    <t-form label-width="90px">
      <t-form-item :label="t('components.ip_disposal.label_ip')">
        <t-input :value="ip" readonly />
      </t-form-item>

      <!-- 站点必选：ipblock/ipwhite 两个接口的 host_code 都是 required，
           而分析页是跨站点聚合的，一个来源可能横跨多站，不能瞎猜一个 -->
      <t-form-item :label="t('components.ip_disposal.label_host')" :status="form.host_code ? '' : 'error'">
        <t-select
          v-model="form.host_code"
          filterable
          :style="{ width: '100%' }"
          :placeholder="t('components.ip_disposal.placeholder_host')"
        >
          <t-option v-for="item in hostOptions" :key="item.value" :value="item.value" :label="item.label">
            {{ item.label
            }}<span v-if="hostHits[item.value]" class="ipd-hit">
              {{ t('components.ip_disposal.host_hits', { n: hostHits[item.value] }) }}</span
            >
          </t-option>
        </t-select>
        <div v-if="hostCandidates.length > 1" class="ipd-tip">{{ t('components.ip_disposal.host_multi_tip') }}</div>
      </t-form-item>

      <t-form-item v-if="isBlock" :label="t('components.ip_disposal.label_layer')">
        <span class="ipd-tip" style="margin-top: 0">{{ t('components.ip_disposal.layer_waf_only_hint') }}</span>
      </t-form-item>

      <t-form-item :label="t('components.ip_disposal.label_remarks')">
        <t-input v-model="form.remarks" :maxlength="200" />
      </t-form-item>
      <div v-if="isBlock" class="ipd-tip" style="margin: 0 0 4px 90px">
        {{ t('components.ip_disposal.system_layer_hint') }}
        <a class="t-button-link" style="display: inline" @click="router.push({ name: 'WafFirewallIPBlock' })">
          {{ t('components.ip_disposal.goto_firewall_ipblock') }}
        </a>
      </div>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';

import { wafIPBlockAddApi } from '@/apis/ipblock';
import { wafIPWhiteAddApi } from '@/apis/ipwhite';
import { allhost } from '@/apis/host';

// IP 处置弹窗：加黑与加白合用一个。
// 抽出来是因为「加入黑名单」此前在 4 个页面各写了一遍 $dialog.confirm，
// 既没有站点选择也没用上 recommend-layer；加白更是任何日志页都没有入口。
const props = withDefaults(
  defineProps<{
    visible?: boolean;
    ip?: string;
    // block=加黑 allow=加白
    mode?: string;
    // 候选站点：[{ host_code, req_cnt }]，按请求数倒序。用来定默认值并在下拉里标注命中次数
    hostCandidates?: Array<{ host_code: string; req_cnt: number }>;
    // 页面上已经筛了站点时优先用它
    preferHostCode?: string;
    remarks?: string;
  }>(),
  { visible: false, ip: '', mode: 'block', hostCandidates: () => [], preferHostCode: '', remarks: '' },
);

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'success', payload: { ip: string; mode: string }): void;
}>();

const { t } = useI18n();
const router = useRouter();

const submitting = ref(false);
const hostOptions = ref<Array<{ value: string; label: string }>>([]);
const form = reactive({ host_code: '', remarks: '' });

const isBlock = computed(() => props.mode !== 'allow');
const hostHits = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {};
  (props.hostCandidates || []).forEach((h) => {
    m[h.host_code] = h.req_cnt;
  });
  return m;
});

// 弹窗内的数据必须每次打开重拉/重置，否则会留着上一次的选择
watch(
  () => props.visible,
  (v) => {
    if (v) init();
  },
);

function init() {
  form.remarks = props.remarks;
  form.host_code = pickDefaultHost();
  loadHosts();
}

// 默认站点：页面筛过就用那个，否则取这个来源打得最多的站点
function pickDefaultHost(): string {
  if (props.preferHostCode) return props.preferHostCode;
  const first = (props.hostCandidates || []).find((h) => h && h.host_code);
  // 兜底成空串：undefined 漏进 t-select 会去匹配选项、最后把 undefined 显示出来
  return first ? String(first.host_code) : '';
}

function loadHosts() {
  allhost()
    .then((res) => {
      if (res.code === 0) {
        // allhost 返回的 json 字段就叫 value / label（见 model/response/all_host.go 的 tag），
        // 不是 code / host——取错的话下拉项全是空白、选中值会显示成 undefined
        hostOptions.value = (res.data || [])
          .filter((h: any) => h && h.value)
          .map((h: any) => ({ value: h.value, label: h.label || h.value }));
      }
    })
    .catch(() => {});
}

function handleConfirm() {
  if (submitting.value) return;
  if (!form.host_code) {
    MessagePlugin.warning(t('components.ip_disposal.host_required'));
    return;
  }
  submitting.value = true;
  const payload: Record<string, any> = {
    host_code: form.host_code,
    ip: props.ip,
    remarks: form.remarks,
  };
  const call = isBlock.value ? wafIPBlockAddApi(payload) : wafIPWhiteAddApi(payload);
  call
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('components.ip_disposal.done'));
        emit('success', { ip: props.ip, mode: props.mode });
        close();
      } else {
        MessagePlugin.error(res.msg);
      }
    })
    .catch(() => {})
    .finally(() => {
      submitting.value = false;
    });
}

function close() {
  emit('update:visible', false);
}
</script>

<style scoped>
.ipd-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  line-height: 1.5;
}

.ipd-hit {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
