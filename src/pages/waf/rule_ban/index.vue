<template>
  <div>
    <component :is="embedded ? 'div' : 't-card'" :class="{ 'list-card-container': !embedded }">
      <t-tabs v-if="!embedded && panel === 'all'" v-model="activeTab">
        <t-tab-panel value="ban_list" :label="t('page.rule_ban.ban_list')" />
        <t-tab-panel value="config" :label="t('page.rule_ban.config')" />
      </t-tabs>
      <div v-if="selectedPanel === 'ban_list'" class="table-container">
        <t-alert theme="info" :message="t('page.ip_ban.rule_list_notice')" :close-btn="false" class="list-notice" />
        <div class="operation-container">
          <t-button theme="primary" @click="getList">{{ t('common.refresh') }}</t-button>
        </div>
        <t-table
          :columns="columns"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
        >
          <template #ip="{ row }">
            <t-tooltip :content="t('common.ip_lookup.click_tip')">
              <a class="ipl-link" @click="openIpLookup(row.ip)">{{ row.ip }}</a>
            </t-tooltip>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickDetail(slotProps)">{{ t('common.details') }}</a>
            <a class="t-button-link" style="margin-left: 8px" @click="handleClickUnban(slotProps)">
              {{ t('page.rule_ban.unban') }}
            </a>
          </template>
        </t-table>
      </div>

      <div v-if="selectedPanel === 'config'" class="config-container">
        <p class="cfg-desc">{{ t('page.rule_ban.config_desc') }}</p>
        <t-form :data="formData" :rules="rules" :label-width="100" @submit="onSubmit">
          <t-form-item :label="t('page.rule_ban.mode')" name="mode">
            <t-radio-group v-model="formData.mode">
              <t-radio :value="0">{{ t('page.rule_ban.mode_page') }}</t-radio>
              <t-radio :value="1">{{ t('page.rule_ban.mode_drop') }}</t-radio>
            </t-radio-group>
            <div class="desc">{{ t('page.rule_ban.mode_desc') }}</div>
          </t-form-item>
          <div class="example">
            <div class="example-head">
              <span class="example-title">{{ t('page.rule_ban.rule_example') }}</span>
              <div class="example-ops">
                <t-button variant="outline" size="small" @click="copyExample">{{ t('common.copy') }}</t-button>
                <t-button variant="outline" size="small" @click="goToRulePage">
                  {{ t('page.rule_ban.goto_rule_page') }}
                </t-button>
              </div>
            </div>
            <pre class="example-code">{{ exampleCode }}</pre>
            <div class="example-foot">{{ t('page.rule_ban.rule_example_desc') }}</div>
          </div>
          <t-form-item class="cfg-foot">
            <t-button theme="primary" type="submit">{{ t('common.save') }}</t-button>
          </t-form-item>
        </t-form>
      </div>
    </component>

    <t-dialog
      v-model:visible="visitDetailVisible"
      :header="t('page.attack_log.attack_ip_visit_detail_list_header')"
      width="100%"
      :confirm-on-enter="true"
      :on-confirm="resetChildState"
      :on-close="resetChildState"
    >
      <web-log-list v-if="visitDetailVisible" ref="childLogRef" :attack_ip="trans_to_parent_ip" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import {
  wafRuleBanGetConfigApi,
  wafRuleBanSetConfigApi,
  wafRuleBanGetBanListApi,
  wafRuleBanRemoveBanIpApi,
} from '@/apis/rule_ban';
import WebLogList from '@/pages/waf/attack/index.vue';

const props = withDefaults(
  defineProps<{
    panel?: 'all' | 'ban_list' | 'config';
    embedded?: boolean;
  }>(),
  {
    panel: 'all',
    embedded: false,
  },
);

// 嵌入统一入口时，点 IP 交给页面级查询弹窗统一处理
const emit = defineEmits<{ (e: 'ip-lookup', ip: string): void }>();

const { t } = useI18n();
const router = useRouter();

const activeTab = ref('ban_list');
const exampleCode =
  'rule Rexample "命中即封禁10分钟" salience 10 {\n  when\n    MF.URL.Contains("/wp-admin") == true\n  then\n    RF.Ban(10);\n}';
const formData = ref<Record<string, any>>({
  mode: 0,
});

const rules: FormProps['rules'] = {
  mode: [{ required: true, message: t('common.required'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const rowKey = 'key';

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.rule_ban.ip'), colKey: 'ip', cell: 'ip', width: 150 },
  { title: t('page.rule_ban.host'), colKey: 'host', width: 180 },
  { title: t('page.rule_ban.ban_minutes'), colKey: 'ban_minutes', width: 110 },
  { title: t('page.rule_ban.remain_time'), colKey: 'remain_time', width: 120 },
  { title: t('page.rule_ban.region'), colKey: 'region', width: 150 },
  { title: t('common.op'), colKey: 'op', width: 100, fixed: 'right' },
]);

const visitDetailVisible = ref(false);
const trans_to_parent_ip = ref('');
const childLogRef = ref<any>(null);

const selectedPanel = computed(() => (props.panel === 'all' ? activeTab.value : props.panel));

watch(
  selectedPanel,
  (value) => {
    if (value === 'ban_list') getList();
    if (value === 'config') getConfig();
  },
  { immediate: true },
);

function openIpLookup(ip: string) {
  if (!ip) return;
  emit('ip-lookup', ip);
}

function copyExample() {
  const done = () => MessagePlugin.success(t('page.rule_ban.copy_success'));
  const fail = () => MessagePlugin.warning(t('page.rule_ban.copy_failed'));
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(exampleCode).then(done).catch(fail);
  } else {
    fail();
  }
}

function goToRulePage() {
  router.push({ name: 'WafRule' });
}

function getConfig() {
  wafRuleBanGetConfigApi()
    .then((res: any) => {
      if (res && res.code === 0 && res.data) {
        formData.value = res.data;
      } else {
        MessagePlugin.warning((res && res.msg) || t('common.tips.api_error'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.api_error'));
    });
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafRuleBanSetConfigApi(formData.value)
      .then((res: any) => {
        if (res && res.code === 0) {
          MessagePlugin.success(res.msg);
          getConfig();
        } else {
          MessagePlugin.warning((res && res.msg) || t('common.tips.save_failed'));
        }
      })
      .catch(() => {
        MessagePlugin.error(t('common.tips.save_failed'));
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

function getList() {
  dataLoading.value = true;
  wafRuleBanGetBanListApi({
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
  })
    .then((res: any) => {
      if (res && res.code === 0 && res.data) {
        data.value = (Array.isArray(res.data.list) ? res.data.list : [])
          .filter(Boolean)
          .map((item: any) => ({
            ...item,
            key: `${item.host_code || ''}|${item.ip}`,
            host: item.host_name || item.host_code,
          }));
        pagination.total = res.data.total || 0;
      } else {
        MessagePlugin.warning((res && res.msg) || t('common.tips.api_error'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  pagination.pageSize = pageInfo.pageSize;
  getList();
}

function handleClickDetail(e: { row: Record<string, any> }) {
  trans_to_parent_ip.value = e.row.ip;
  visitDetailVisible.value = true;
}

function resetChildState() {
  visitDetailVisible.value = false;
  const childLog = childLogRef.value as any;
  if (childLog && childLog.resetState) {
    childLog.resetState();
  }
}

function handleClickUnban(e: { row: Record<string, any> }) {
  const dialogInstance = DialogPlugin.confirm({
    header: t('common.confirm_unban'),
    body: t('page.ip_ban.rule_unban_confirm', { ip: e.row.ip, host: e.row.host }),
    onConfirm: () => {
      return wafRuleBanRemoveBanIpApi({ host_code: e.row.host_code, ip: e.row.ip })
        .then((res: any) => {
          if (res && res.code === 0) {
            MessagePlugin.success(res.msg);
            getList();
            dialogInstance.destroy();
          } else {
            MessagePlugin.warning((res && res.msg) || t('page.ip_ban.remove_failed'));
          }
        })
        .catch(() => {
          MessagePlugin.error(t('page.ip_ban.remove_failed'));
          dialogInstance.destroy();
        });
    },
  });
}
</script>

<style scoped>
.config-container {
  padding: 20px;
}

.cfg-desc {
  color: var(--td-text-color-secondary);
  font-size: 13px;
  margin: 0 0 20px;
}

.desc {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}

.operation-container {
  margin-bottom: 16px;
}

.list-notice {
  margin-bottom: 16px;
}

.example {
  margin-top: 4px;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 6px;
  overflow: hidden;
}

.example-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--td-bg-color-component);
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.example-title {
  font-size: 13px;
  font-weight: 600;
}

.example-ops {
  display: flex;
  gap: 8px;
}

.example-code {
  padding: 14px 16px;
  margin: 0;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.7;
  color: var(--td-text-color-primary);
  background: #fff;
  overflow-x: auto;
}

.example-foot {
  padding: 8px 16px 12px;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}

.cfg-foot {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--td-border-level-1-color);
  text-align: right;
}

.cfg-foot :deep(.t-form__controls) {
  margin-left: 0 !important;
}

.ipl-link {
  color: var(--td-brand-color);
  cursor: pointer;
}

.ipl-link:hover {
  color: var(--td-brand-color-hover);
  text-decoration: underline;
}
</style>
