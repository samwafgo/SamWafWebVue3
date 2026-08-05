<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.threatip.button_add') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="60" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.threatip.label_name')" name="name">
              <t-input v-model="searchformData.name" class="search-input" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.threatip.alert_message')" close />
      <t-alert theme="warning" :message="t('page.threatip.op_help')" close />
      <div class="table-container">
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
          <template #parser_type="{ row }">
            <t-tag theme="primary" variant="light">{{ parserLabel(row.parser_type) }}</t-tag>
          </template>
          <template #land_target="{ row }">
            <span>{{ landTargetLabel(row.land_target) }}</span>
          </template>
          <template #enable="{ row }">
            <t-tag v-if="row.enable === 1" theme="success" variant="light">{{ t('page.threatip.enabled') }}</t-tag>
            <t-tag v-else theme="default" variant="light">{{ t('page.threatip.disabled') }}</t-tag>
          </template>
          <template #last_status="{ row }">
            <t-tag v-if="row.syncing" theme="warning" variant="light">
              {{ t('page.threatip.syncing') }}{{ syncElapsedText(row) }}
            </t-tag>
            <span v-else>{{ row.last_status }}</span>
          </template>
          <template #last_sync_at="{ row }">
            <span>{{ formatTs(row.last_sync_at) }}</span>
          </template>
          <template #op="slotProps">
            <a
              v-if="slotProps.row.syncing"
              class="t-button-link"
              :style="{ color: '#bbb', cursor: 'not-allowed' }"
            >{{ t('page.threatip.sync') }}</a>
            <a v-else class="t-button-link" @click="handleSync(slotProps)">{{ t('page.threatip.sync') }}</a>
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 添加对话框 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="680" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="120" @submit="onSubmit">
        <t-form-item :label="t('page.threatip.quick_fill_label')">
          <div style="width: 100%">
            <t-select
              :style="{ width: '480px', maxWidth: '100%' }"
              :placeholder="t('page.threatip.quick_fill_placeholder')"
              clearable
              filterable
              @change="applyFeedPreset"
            >
              <t-option v-for="p in feedPresets" :key="p.code" :value="p.code" :label="p.optionLabel" />
            </t-select>
            <div class="quick-fill-tips">{{ t('page.threatip.quick_fill_tips') }}</div>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_code')" name="code">
          <t-input v-model="formData.code" :style="{ width: '480px' }" :placeholder="t('page.threatip.code_tips')" />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_name')" name="name">
          <t-input v-model="formData.name" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_url')" name="url">
          <t-input v-model="formData.url" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_parser')" name="parser_type">
          <t-select v-model="formData.parser_type" :style="{ width: '480px' }">
            <t-option v-for="item in parserOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item
          v-if="formData.parser_type === 'ipsum'"
          :label="t('page.threatip.label_threshold')"
          name="threshold"
        >
          <t-input-number v-model="formData.threshold" :min="0" theme="column" />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_land')" name="land_target">
          <t-select v-model="formData.land_target" :style="{ width: '480px' }">
            <t-option v-for="item in landOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_interval')" name="interval_hour">
          <t-input-number v-model="formData.interval_hour" :min="1" theme="column" />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_enable')" name="enable">
          <t-switch v-model="formData.enable" :custom-value="[1, 0]" />
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formData.remarks" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑对话框 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="120" @submit="onSubmitEdit">
        <t-form-item :label="t('page.threatip.label_code')" name="code">
          <t-input v-model="formEditData.code" :style="{ width: '480px' }" disabled />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_name')" name="name">
          <t-input v-model="formEditData.name" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_url')" name="url">
          <t-input v-model="formEditData.url" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_parser')" name="parser_type">
          <t-select v-model="formEditData.parser_type" :style="{ width: '480px' }">
            <t-option v-for="item in parserOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item
          v-if="formEditData.parser_type === 'ipsum'"
          :label="t('page.threatip.label_threshold')"
          name="threshold"
        >
          <t-input-number v-model="formEditData.threshold" :min="0" theme="column" />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_land')" name="land_target">
          <t-select v-model="formEditData.land_target" :style="{ width: '480px' }">
            <t-option v-for="item in landOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_interval')" name="interval_hour">
          <t-input-number v-model="formEditData.interval_hour" :min="1" theme="column" />
        </t-form-item>
        <t-form-item :label="t('page.threatip.label_enable')" name="enable">
          <t-switch v-model="formEditData.enable" :custom-value="[1, 0]" />
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 删除确认对话框 -->
    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="t('common.data_delete_warning')"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import {
  wafThreatIPListApi,
  wafThreatIPAddApi,
  wafThreatIPDetailApi,
  wafThreatIPEditApi,
  wafThreatIPDelApi,
  wafThreatIPSyncApi,
} from '@/apis/threatip';

const INITIAL_DATA = {
  code: '',
  name: '',
  url: '',
  parser_type: 'plain_mixed',
  threshold: 0,
  land_target: 'waf',
  enable: 1,
  interval_hour: 24,
  remarks: '',
};

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  code: [{ required: true, message: t('common.placeholder') + t('page.threatip.label_code'), type: 'error' }],
  name: [{ required: true, message: t('common.placeholder') + t('page.threatip.label_name'), type: 'error' }],
  url: [{ required: true, message: t('common.placeholder') + t('page.threatip.label_url'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';

const parserOptions = computed(() => [
  { value: 'plain_mixed', label: t('page.threatip.parser_plain') },
  { value: 'cidr_only', label: t('page.threatip.parser_cidr') },
  { value: 'ipsum', label: t('page.threatip.parser_ipsum') },
]);

const landOptions = computed(() => [
  { value: 'waf', label: t('page.threatip.land_waf') },
  { value: 'system', label: t('page.threatip.land_system') },
  { value: 'both', label: t('page.threatip.land_both') },
]);

// 常用威胁情报IP订阅源预设：点选自动填 code/name/url/parser/threshold(仍可改)。
// parser_type 已与各源实际格式对齐(均跳过#注释；plain_mixed 取每行首字段容忍行尾注释)。
const feedPresets = [
  { code: 'ustc', name: '科技大学 USTC', url: 'https://blackip.ustc.edu.cn/list.php?txt', parser_type: 'cidr_only', threshold: 0, optionLabel: '科技大学 USTC · blackip.ustc.edu.cn（国内综合恶意IP）' },
  { code: 'ipsum', name: 'stamparm ipsum', url: 'https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt', parser_type: 'ipsum', threshold: 3, optionLabel: 'stamparm ipsum · github（多源聚合，阈值默认3）' },
  { code: 'firehol1', name: 'FireHOL Level1', url: 'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset', parser_type: 'cidr_only', threshold: 0, optionLabel: 'FireHOL Level1 · github（低误报聚合，含Spamhaus/DShield）' },
  { code: 'blocklistde', name: 'blocklist.de', url: 'https://lists.blocklist.de/lists/all.txt', parser_type: 'cidr_only', threshold: 0, optionLabel: 'blocklist.de · lists.blocklist.de（攻击者IP，全量）' },
  { code: 'ciarmy', name: 'CINS Army', url: 'https://cinsscore.com/list/ci-badguys.txt', parser_type: 'cidr_only', threshold: 0, optionLabel: 'CINS Army · cinsscore.com（活跃恶意IP）' },
  { code: 'greensnow', name: 'GreenSnow', url: 'https://blocklist.greensnow.co/greensnow.txt', parser_type: 'cidr_only', threshold: 0, optionLabel: 'GreenSnow · greensnow.co（暴力破解/扫描）' },
  { code: 'et_comp', name: 'ET Compromised', url: 'https://rules.emergingthreats.net/blockrules/compromised-ips.txt', parser_type: 'cidr_only', threshold: 0, optionLabel: 'ET Compromised · emergingthreats.net（已失陷主机）' },
  { code: 'spamhaus', name: 'Spamhaus DROP', url: 'https://www.spamhaus.org/drop/drop.txt', parser_type: 'plain_mixed', threshold: 0, optionLabel: 'Spamhaus DROP · spamhaus.org（被劫持网段，低误报）' },
  { code: 'feodo', name: 'Feodo Tracker', url: 'https://feodotracker.abuse.ch/downloads/ipblocklist.txt', parser_type: 'cidr_only', threshold: 0, optionLabel: 'Feodo Tracker · abuse.ch（僵尸网络C2）' },
];

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.threatip.label_name'), align: 'left', width: 160, ellipsis: true, colKey: 'name' },
  { title: t('page.threatip.label_code'), width: 120, ellipsis: true, colKey: 'code' },
  { title: t('page.threatip.label_parser'), width: 120, colKey: 'parser_type' },
  { title: t('page.threatip.label_land'), width: 110, colKey: 'land_target' },
  { title: t('page.threatip.label_enable'), width: 90, colKey: 'enable' },
  { title: t('page.threatip.last_count'), width: 100, colKey: 'last_count' },
  { title: t('page.threatip.last_status'), width: 220, ellipsis: true, colKey: 'last_status' },
  { title: t('page.threatip.last_sync_at'), width: 170, colKey: 'last_sync_at' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

const searchformData = reactive({ name: '' });

const deleteIdx = ref(-1);

function landTargetLabel(v: string) {
  const found = landOptions.value.find((o) => o.value === v);
  return found ? found.label : v;
}

function parserLabel(v: string) {
  const found = parserOptions.value.find((o) => o.value === v);
  return found ? found.label : v;
}

function formatTs(ts: number) {
  if (!ts) return '-';
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}

// 同步是后台异步跑的(拉取最长 2 分钟)，点完立刻刷新必然看不到结果，
// 所以这里用定时轮询，直到没有渠道处于 syncing 或达到上限为止。
const syncPollTimer = ref<ReturnType<typeof setInterval> | null>(null);
const syncPollLeft = ref(0);
const syncPollDone = ref(0);
const syncPollSawSyncing = ref(false);

// silent=true 用于轮询刷新：不显示表格 loading，避免每 3 秒闪一次
function getList(silent = false) {
  if (!silent) dataLoading.value = true;
  wafThreatIPListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
        // 收工条件：已经观察到过"同步中"、或连轮几次都没看到，就不用再轮了。
        // (后端是异步起的 goroutine，第一次轮询时可能还没标上 syncing，所以留几次余量)
        if (syncPollTimer.value) {
          const anySyncing = data.value.some((row: Record<string, any>) => row.syncing);
          if (anySyncing) {
            syncPollSawSyncing.value = true;
          } else if (syncPollSawSyncing.value || syncPollDone.value >= 3) {
            stopSyncPolling();
          }
        }
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      if (!silent) dataLoading.value = false;
    });
}

// 同步中已持续时长，例如 "（12s）"
function syncElapsedText(row: Record<string, any>) {
  if (!row.syncing || !row.sync_started_at) return '';
  const sec = Math.max(0, Math.floor(Date.now() / 1000) - row.sync_started_at);
  return `（${sec}s）`;
}

// 启动轮询：每 3 秒刷一次列表，最多 ~2 分钟(覆盖后端 2 分钟的拉取超时)
function startSyncPolling() {
  stopSyncPolling();
  syncPollLeft.value = 40;
  syncPollDone.value = 0;
  syncPollSawSyncing.value = false;
  syncPollTimer.value = setInterval(() => {
    if (syncPollLeft.value <= 0) {
      stopSyncPolling();
      return;
    }
    syncPollLeft.value -= 1;
    syncPollDone.value += 1;
    getList(true);
  }, 3000);
}

function stopSyncPolling() {
  if (syncPollTimer.value) {
    clearInterval(syncPollTimer.value);
    syncPollTimer.value = null;
  }
  syncPollLeft.value = 0;
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
}

// 点选常用订阅源 → 自动填入 code/name/url/解析格式/阈值(仍可修改)
function applyFeedPreset(code: string) {
  if (!code) return;
  const p = feedPresets.find((x) => x.code === code);
  if (!p) return;
  formData.value.code = p.code;
  formData.value.name = p.name;
  formData.value.url = p.url;
  formData.value.parser_type = p.parser_type;
  formData.value.threshold = p.threshold || 0;
}

function handleClickEdit(e: { row: Record<string, any> }) {
  editFormVisible.value = true;
  getDetail(e.row.id);
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafThreatIPAddApi({ ...formData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          addFormVisible.value = false;
          pagination.current = 1;
          getList();
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => console.log(e));
  } else {
    MessagePlugin.warning(firstError);
  }
};

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafThreatIPEditApi({ ...formEditData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          editFormVisible.value = false;
          getList();
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => console.log(e));
  } else {
    MessagePlugin.warning(firstError);
  }
};

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_DATA };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function handleSync(e: { row: Record<string, any> }) {
  MessagePlugin.info(t('page.threatip.sync_started'));
  wafThreatIPSyncApi({ id: e.row.id })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        // 后台已经开始跑了，启动轮询把结果等出来
        startSyncPolling();
      } else {
        MessagePlugin.warning(res.msg);
        getList();
      }
    })
    .catch((err: Error) => console.log(err));
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  wafThreatIPDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
  deleteIdx.value = -1;
}

function onCancel() {
  deleteIdx.value = -1;
}

function getDetail(id: string | number) {
  wafThreatIPDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => console.log(e));
}

onMounted(() => {
  getList();
});

onBeforeUnmount(() => {
  stopSyncPolling();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.search-input {
  width: 200px;
}

.quick-fill-tips {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 6px;
  width: 100%;
  line-height: 1.5;
}
</style>
