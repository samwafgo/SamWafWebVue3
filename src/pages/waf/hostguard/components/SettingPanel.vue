<template>
  <div class="panel-container">
    <t-loading :loading="loading" size="small">
      <!-- 总开关单独放在最上面，并且开启前必须二次确认：
           白名单配错会把管理员自己锁在服务器外面，这是这个功能最大的事故来源 -->
      <t-card size="small" class="master-card">
        <div class="master-row">
          <div>
            <div class="master-title">{{ t('page.hostguard.cfg_enabled') }}</div>
            <div class="desc">{{ t('page.hostguard.cfg_enabled_desc') }}</div>
          </div>
          <t-switch v-model="masterEnabled" :loading="masterLoading" size="large" @change="onMasterChange" />
        </div>
      </t-card>

      <t-form :data="form" :label-width="190" class="cfg-form" @submit="onSave">
        <t-divider align="left">{{ t('page.hostguard.group_detect') }}</t-divider>

        <t-form-item :label="t('page.hostguard.cfg_mode')">
          <t-radio-group v-model="form.host_guard_mode">
            <t-radio-button value="observe">{{ t('page.hostguard.mode_observe') }}</t-radio-button>
            <t-radio-button value="block">{{ t('page.hostguard.mode_block') }}</t-radio-button>
          </t-radio-group>
          <div class="desc">{{ t('page.hostguard.cfg_mode_desc') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_find_time')">
          <t-input-number v-model="form.host_guard_find_time" :min="1" theme="column" :style="{ width: '200px' }" />
          <span class="unit">{{ t('common.unit_minute') }}</span>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_max_retry')">
          <t-input-number v-model="form.host_guard_max_retry" :min="1" theme="column" :style="{ width: '200px' }" />
          <div class="desc">{{ t('page.hostguard.cfg_max_retry_desc') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_offender_reset')">
          <t-input-number
            v-model="form.host_guard_offender_reset_day"
            :min="0"
            theme="column"
            :style="{ width: '200px' }"
          />
          <span class="unit">{{ t('page.hostguard.unit_day') }}</span>
          <div class="desc">{{ t('page.hostguard.cfg_offender_reset_desc') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_soft_fail')">
          <t-switch v-model="form.host_guard_count_soft_fail" :custom-value="['1', '0']" />
          <div class="desc">{{ t('page.hostguard.cfg_soft_fail_desc') }}</div>
        </t-form-item>

        <t-divider align="left">{{ t('page.hostguard.group_whitelist') }}</t-divider>

        <t-form-item :label="t('page.hostguard.cfg_whitelist')">
          <t-textarea
            v-model="form.host_guard_whitelist"
            :autosize="{ minRows: 2, maxRows: 5 }"
            :style="{ width: '520px' }"
            :placeholder="t('page.hostguard.cfg_whitelist_ph')"
          />
          <div class="desc">{{ t('page.hostguard.cfg_whitelist_desc') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_auto_lan')">
          <t-switch v-model="form.host_guard_auto_lan" :custom-value="['1', '0']" />
          <div class="desc">{{ t('page.hostguard.cfg_auto_lan_desc') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.whitelist_test')">
          <t-input v-model="testIP" :style="{ width: '260px' }" :placeholder="t('page.hostguard.whitelist_test_ph')" />
          <t-button theme="default" style="margin-left: 8px" @click="onTestWhitelist">
            {{ t('page.hostguard.whitelist_test_btn') }}
          </t-button>
          <div v-if="testResult" class="test-result">
            <t-tag :theme="testResult.whitelisted ? 'success' : 'warning'" variant="light">
              {{ testResult.whitelisted ? t('page.hostguard.test_exempt') : t('page.hostguard.test_not_exempt') }}
            </t-tag>
            <span v-if="testResult.reason" class="test-reason">{{ testResult.reason }}</span>
          </div>
        </t-form-item>

        <t-divider align="left">{{ t('page.hostguard.group_source') }}</t-divider>

        <t-form-item :label="t('page.hostguard.cfg_log_paths')">
          <t-input v-model="form.host_guard_log_paths" :style="{ width: '520px' }" />
          <div class="desc">{{ t('page.hostguard.cfg_log_paths_desc') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_ssh_ports')">
          <t-input v-model="form.host_guard_ssh_ports" :style="{ width: '200px' }" placeholder="22" />
          <span class="unit-text">
            {{ t('page.hostguard.cfg_ports_detected') }}: {{ (status.ssh_ports || []).join(', ') || '-' }}
          </span>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_rdp_ports')">
          <t-input v-model="form.host_guard_rdp_ports" :style="{ width: '200px' }" placeholder="3389" />
          <span class="unit-text">
            {{ t('page.hostguard.cfg_ports_detected') }}: {{ (status.rdp_ports || []).join(', ') || '-' }}
          </span>
          <div class="desc">{{ t('page.hostguard.cfg_ports_desc') }}</div>
        </t-form-item>

        <t-divider align="left">{{ t('page.hostguard.group_exec') }}</t-divider>

        <t-form-item :label="t('page.hostguard.cfg_port_scope')">
          <t-radio-group v-model="form.host_guard_port_scope">
            <t-radio-button value="all">{{ t('page.hostguard.scope_all') }}</t-radio-button>
            <!-- 平台不支持时禁用：选了也只会静默按全端口封，留着就是个假开关 -->
            <t-radio-button value="detected" :disabled="!portScopeSupported">
              {{ t('page.hostguard.scope_detected') }}
            </t-radio-button>
          </t-radio-group>
          <div class="desc">{{ t('page.hostguard.cfg_port_scope_desc') }}</div>
          <div v-if="!portScopeSupported" class="desc warn-desc">
            {{ t('page.hostguard.cfg_port_scope_unsupported') }}
          </div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_exec_mode')">
          <t-select v-model="form.host_guard_exec_mode" :style="{ width: '200px' }">
            <t-option key="auto" value="auto" :label="t('page.hostguard.exec_auto')" />
            <t-option key="ipset" value="ipset" :label="t('page.hostguard.exec_ipset')" />
            <t-option key="rule" value="rule" :label="t('page.hostguard.exec_rule')" />
          </t-select>
          <span class="unit-text">
            {{ t('page.hostguard.cfg_exec_current') }}: {{ status.exec_mode || '-' }}
          </span>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_debounce')">
          <t-input-number v-model="form.host_guard_debounce_sec" :min="1" theme="column" :style="{ width: '200px' }" />
          <span class="unit">{{ t('page.hostguard.unit_second') }}</span>
          <div class="desc">{{ t('page.hostguard.cfg_debounce_desc') }}</div>
        </t-form-item>

        <t-divider align="left">{{ t('page.hostguard.group_flood') }}</t-divider>

        <t-form-item :label="t('page.hostguard.cfg_max_entries')">
          <t-input-number
            v-model="form.host_guard_max_ban_entries"
            :min="0"
            theme="column"
            :style="{ width: '200px' }"
          />
          <div class="desc">{{ t('page.hostguard.cfg_max_entries_desc') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_rate_limit')">
          <t-input-number
            v-model="form.host_guard_ban_rate_limit"
            :min="0"
            theme="column"
            :style="{ width: '200px' }"
          />
          <div class="desc">{{ t('page.hostguard.cfg_rate_limit_desc') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_subnet')">
          <t-switch v-model="form.host_guard_subnet_aggregate" :custom-value="['1', '0']" />
          <t-input-number
            v-model="form.host_guard_subnet_threshold"
            :min="2"
            theme="column"
            :style="{ width: '160px', marginLeft: '12px' }"
          />
          <div class="desc warn-desc">{{ t('page.hostguard.cfg_subnet_desc') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.hostguard.cfg_notify')">
          <t-switch v-model="form.host_guard_notify" :custom-value="['1', '0']" />
        </t-form-item>

        <t-divider align="left">{{ t('page.hostconn.group_conn') }}</t-divider>

        <t-form-item :label="t('page.hostconn.cfg_enabled')">
          <t-switch v-model="form.host_conn_enabled" :custom-value="['1', '0']" />
        </t-form-item>

        <t-form-item :label="t('page.hostconn.cfg_cache_sec')">
          <t-input-number v-model="form.host_conn_cache_sec" :min="1" theme="column" :style="{ width: '200px' }" />
          <span class="unit">{{ t('page.hostguard.unit_second') }}</span>
          <div class="desc">{{ t('page.hostconn.cfg_cache_sec_desc') }}</div>
        </t-form-item>

        <t-form-item>
          <t-button theme="primary" type="submit" :loading="saving">{{ t('common.save') }}</t-button>
        </t-form-item>
      </t-form>

      <!-- 封禁阶梯编辑器 -->
      <t-divider align="left">{{ t('page.hostguard.group_ladder') }}</t-divider>
      <t-alert theme="info" :close="false" class="tip-alert">
        <template #message>{{ t('page.hostguard.ladder_tip') }}</template>
      </t-alert>

      <t-table :columns="ladderColumns" :data="ladders" row-key="level" size="small" hover>
        <template #ban_minutes="{ row, rowIndex }">
          <t-input-number
            :model-value="row.ban_minutes"
            :min="0"
            theme="column"
            :style="{ width: '150px' }"
            @change="(v: any) => onLadderChange(rowIndex, 'ban_minutes', v)"
          />
          <span class="unit">{{ t('common.unit_minute') }}</span>
          <t-tag v-if="row.ban_minutes === 0" theme="danger" variant="light" size="small" style="margin-left: 8px">
            {{ t('page.hostguard.permanent') }}
          </t-tag>
        </template>
        <template #enable="{ row, rowIndex }">
          <t-switch
            :model-value="row.enable"
            :custom-value="[1, 0]"
            @change="(v: any) => onLadderChange(rowIndex, 'enable', v)"
          />
        </template>
        <template #remarks="{ row, rowIndex }">
          <t-input
            :model-value="row.remarks"
            :style="{ width: '100%' }"
            @change="(v: any) => onLadderChange(rowIndex, 'remarks', v)"
          />
        </template>
        <template #op="{ rowIndex }">
          <a class="t-button-link" @click="removeLadder(rowIndex)">{{ t('common.delete') }}</a>
        </template>
      </t-table>

      <div class="ladder-ops">
        <t-button variant="outline" @click="addLadder">{{ t('page.hostguard.ladder_add') }}</t-button>
        <t-button theme="primary" :loading="ladderSaving" style="margin-left: 8px" @click="saveLadders">
          {{ t('page.hostguard.ladder_save') }}
        </t-button>
      </div>

      <!-- 自救说明：真出事的时候用户不会来翻文档，直接写在页面上 -->
      <t-alert theme="warning" :close="false" class="rescue-alert">
        <template #message>
          <div class="rescue-title">{{ t('page.hostguard.rescue_title') }}</div>
          <ol class="rescue-list">
            <li>{{ t('page.hostguard.rescue_1') }}</li>
            <li>{{ t('page.hostguard.rescue_2') }}</li>
            <li>{{ t('page.hostguard.rescue_3') }}</li>
            <li>
              {{ t('page.hostguard.rescue_4') }}
              <pre class="code-block">
ipset del samwaf_hostguard &lt;IP&gt;
ipset flush samwaf_hostguard
netsh advfirewall firewall delete rule name=SamWAF_Set_samwaf_hostguard_0</pre
              >
            </li>
          </ol>
        </template>
      </t-alert>
    </t-loading>

    <t-dialog
      v-model:visible="enableConfirmVisible"
      :header="t('page.hostguard.enable_confirm_title')"
      :width="600"
      @confirm="doEnable"
      @close="cancelEnable"
    >
      <div>
        <p>{{ t('page.hostguard.enable_confirm_body') }}</p>
        <ul class="exempt-list">
          <li>{{ t('page.hostguard.enable_confirm_item1') }}</li>
          <li>{{ t('page.hostguard.enable_confirm_item2') }}</li>
          <li>{{ t('page.hostguard.enable_confirm_item3') }}</li>
        </ul>
        <p class="exempt-tip">{{ t('page.hostguard.enable_confirm_tip') }}</p>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { MessagePlugin, type TableProps } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  wafHostGuardLadderListApi,
  wafHostGuardLadderSaveApi,
  wafHostGuardWhitelistTestApi,
} from '@/apis/hostguard';
import { edit_system_config_by_item_api, get_detail_by_item_api } from '@/apis/systemconfig';

const { t } = useI18n();

const props = defineProps({
  status: { type: Object, default: () => ({}) },
});
const emit = defineEmits<{ (e: 'changed'): void }>();

const MASTER_ITEM = 'host_guard_enabled';

// 逐项读写的配置项清单。分成数字与字符串两类只是为了保存时转换，
// 后端 system_config 的 value 一律按字符串存。
const NUMBER_ITEMS = [
  'host_guard_find_time',
  'host_guard_max_retry',
  'host_guard_offender_reset_day',
  'host_guard_debounce_sec',
  'host_guard_max_ban_entries',
  'host_guard_ban_rate_limit',
  'host_guard_subnet_threshold',
  'host_conn_cache_sec',
];
const STRING_ITEMS = [
  'host_guard_mode',
  'host_guard_count_soft_fail',
  'host_guard_whitelist',
  'host_guard_auto_lan',
  'host_guard_log_paths',
  'host_guard_ssh_ports',
  'host_guard_rdp_ports',
  'host_guard_port_scope',
  'host_guard_exec_mode',
  'host_guard_subnet_aggregate',
  'host_guard_notify',
  'host_conn_enabled',
];

const loading = ref(false);
const saving = ref(false);
const masterEnabled = ref(false);
const masterLoading = ref(false);
const enableConfirmVisible = ref(false);
const form = ref<Record<string, any>>({});
const ladders = ref<Record<string, any>[]>([]);
const ladderSaving = ref(false);
const testIP = ref('');
const testResult = ref<Record<string, any> | null>(null);

// 后端明确回 false 才算不支持；status 还没拉回来时不要先把选项禁掉
const portScopeSupported = computed(() => props.status.port_scope_supported !== false);

const ladderColumns = computed<TableProps['columns']>(() => [
  { title: t('page.hostguard.col_level'), colKey: 'level', width: 90 },
  { title: t('page.hostguard.col_duration'), colKey: 'ban_minutes', width: 320 },
  { title: t('page.hostguard.col_enable'), colKey: 'enable', width: 100 },
  { title: t('common.remarks'), colKey: 'remarks' },
  { title: t('common.op'), colKey: 'op', width: 90 },
]);

function loadConfig() {
  loading.value = true;
  const items = [MASTER_ITEM, ...NUMBER_ITEMS, ...STRING_ITEMS];
  const tasks = items.map((item) =>
    get_detail_by_item_api({ item })
      .then((res) => (res.code === 0 && res.data ? { item, value: res.data.value } : null))
      .catch(() => null),
  );
  Promise.all(tasks)
    .then((results) => {
      const next: Record<string, any> = {};
      results.forEach((r: any) => {
        if (!r) return;
        if (r.item === MASTER_ITEM) {
          masterEnabled.value = String(r.value) === '1';
          return;
        }
        if (NUMBER_ITEMS.indexOf(r.item) >= 0) {
          next[r.item] = Number(r.value) || 0;
        } else {
          next[r.item] = String(r.value ?? '');
        }
      });
      form.value = next;
    })
    .finally(() => {
      loading.value = false;
    });
}

function applyMaster(on: boolean) {
  masterLoading.value = true;
  edit_system_config_by_item_api({ item: MASTER_ITEM, value: on ? '1' : '0' })
    .then((res) => {
      if (res.code === 0) {
        masterEnabled.value = on;
        MessagePlugin.success(res.msg);
        emit('changed');
      } else {
        MessagePlugin.warning(res.msg);
        // 失败要回读，别让界面和库不一致
        loadConfig();
      }
    })
    .catch(() => loadConfig())
    .finally(() => {
      masterLoading.value = false;
    });
}

function onMasterChange(val: any) {
  if (val) {
    // 开启是危险操作，先确认；先把开关拨回去，确认后再真正打开
    masterEnabled.value = false;
    enableConfirmVisible.value = true;
    return;
  }
  applyMaster(false);
}

function doEnable() {
  enableConfirmVisible.value = false;
  applyMaster(true);
}

function cancelEnable() {
  enableConfirmVisible.value = false;
  masterEnabled.value = false;
}

function onSave() {
  saving.value = true;
  const tasks = Object.keys(form.value).map((item) =>
    edit_system_config_by_item_api({ item, value: String(form.value[item]) }).catch(() => null),
  );
  Promise.all(tasks)
    .then(() => {
      MessagePlugin.success(t('page.hostguard.save_success'));
      emit('changed');
    })
    .finally(() => {
      saving.value = false;
    });
}

function loadLadders() {
  wafHostGuardLadderListApi({})
    .then((res) => {
      if (res.code === 0) {
        ladders.value = res.data ?? [];
      }
    })
    .catch(() => {});
}

function onLadderChange(idx: number, field: string, value: any) {
  const list = [...ladders.value];
  list[idx] = { ...list[idx], [field]: value };
  ladders.value = list;
}

function addLadder() {
  const nextLevel = ladders.value.length > 0 ? ladders.value[ladders.value.length - 1].level + 1 : 1;
  ladders.value = [...ladders.value, { level: nextLevel, ban_minutes: 60, enable: 1, remarks: '' }];
}

function removeLadder(idx: number) {
  const list = [...ladders.value];
  list.splice(idx, 1);
  // 删完重新编号，保证级别连续
  ladders.value = list.map((x, i) => ({ ...x, level: i + 1 }));
}

function saveLadders() {
  ladderSaving.value = true;
  wafHostGuardLadderSaveApi({ ladders: ladders.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        loadLadders();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch(() => {})
    .finally(() => {
      ladderSaving.value = false;
    });
}

function onTestWhitelist() {
  if (!testIP.value) {
    MessagePlugin.warning(t('page.hostguard.whitelist_test_ph'));
    return;
  }
  wafHostGuardWhitelistTestApi({ ip: testIP.value })
    .then((res) => {
      if (res.code === 0) {
        testResult.value = res.data;
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch(() => {});
}

function refresh() {
  loadConfig();
  loadLadders();
}

onMounted(refresh);
defineExpose({ refresh });
</script>

<style scoped>
.panel-container {
  padding: 8px 0;
}
.master-card {
  margin-bottom: 20px;
}
.master-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.master-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}
.cfg-form {
  max-width: 900px;
}
/* TDesign 的 .t-form__controls-content 是 flex row，说明文字会和控件抢同一行；
   控件被压窄后，radio-button 组就换行竖排了（"封禁范围"最明显）。
   让内容区允许换行、并把说明独占整行，控件才能拿到完整宽度保持并排。 */
:deep(.t-form__controls-content) {
  flex-wrap: wrap;
  align-items: center;
}
:deep(.t-radio-group) {
  flex-shrink: 0;
}
.desc {
  flex-basis: 100%;
  width: 100%;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
  line-height: 1.6;
}
.desc.warn-desc {
  color: var(--td-warning-color-7);
}
.unit {
  margin-left: 8px;
}
.unit-text {
  margin-left: 12px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
.test-result {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.test-reason {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}
.tip-alert {
  margin-bottom: 16px;
}
.ladder-ops {
  margin-top: 16px;
}
.rescue-alert {
  margin-top: 24px;
}
.rescue-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.rescue-list {
  margin: 0;
  padding-left: 20px;
}
.rescue-list li {
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.7;
}
.code-block {
  background: var(--td-bg-color-component);
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 3px;
  padding: 10px;
  margin: 6px 0 0 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
}
.exempt-list {
  padding-left: 20px;
}
.exempt-list li {
  margin-bottom: 6px;
  font-size: 13px;
}
.exempt-tip {
  color: var(--td-warning-color-7);
  font-size: 13px;
  margin-top: 8px;
}
</style>
