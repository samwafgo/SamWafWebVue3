<template>
  <div>
    <t-alert theme="info" :message="t('page.attack_log.attack_log')" :close="true">
      <template #operation>
        <span @click="handleJumpOnlineUrl">{{ t('common.online_document') }}</span>
      </template>
    </t-alert>
    <t-card class="list-card-container">
      <t-tabs v-model="attackSearchformData.rule">
        <t-tab-panel v-for="(item, index) in attackTags" :key="index" :value="item.value" :label="item.label"> </t-tab-panel>
      </t-tabs>
      <t-row justify="space-between">
        <t-form ref="searchForm" :data="attackSearchformData" :label-width="150" colon layout="inline" :style="{ marginBottom: '8px' }">
          <t-form-item :label="t('page.attack_log.rule_name')" name="rule">
            <t-select v-model="attackSearchformData.rule" class="form-item-content" :options="attackTags" :style="{ width: '280px' }" />
          </t-form-item>
          <t-form-item :label="t('page.attack_log.source_ip')" name="src_ip">
            <t-input
              v-model="attackSearchformData.src_ip"
              class="form-item-content"
              :placeholder="t('common.placeholder') + t('page.visit_log.source_ip')"
              :style="{ minWidth: '100px' }"
            />
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')"> {{ t('common.search') }} </t-button>
            <t-button type="reset" variant="base" theme="default"> {{ t('common.reset') }} </t-button>
            <t-button
              v-if="attackSearchformData.rule && attackSearchformData.rule !== ''"
              theme="danger"
              variant="outline"
              @click="handleDeleteTag"
            >
              {{ t('common.delete') }}
            </t-button>
            <t-button theme="danger" variant="outline" @click="handleBatchDeleteTag"> {{ t('common.batch_delete.title') }} </t-button>
          </t-form-item>
        </t-form>
      </t-row>

      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          size="small"
          :row-key="rowKey"
          vertical-align="top"
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          :sort="sorts"
          :stripe="true"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
          @sort-change="onSortChange"
        >
          <template #rule="{ row }">
            <t-tag v-if="row.rule !== ''" shape="round" theme="primary" variant="outline">{{ row.rule }}</t-tag>
          </template>
          <template #ip="{ row }">
            <span>{{ row.ip }}</span>
            <t-button theme="primary" shape="round" size="small" style="margin-left: 8px" @click="handleAddipblock(row)">
              {{ t('page.visit_log.detail.add_to_deny_list') }}
            </t-button>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickDetail(slotProps)">{{ t('common.details') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog
      v-model:visible="batchDeleteVisible"
      :header="t('page.attack_log.batch_delete_header')"
      width="520px"
      :confirm-btn="
        batchDeleteLoading
          ? {
              content: t('common.batch_delete.deleting', { progress: batchDeleteProgress, total: batchDeleteTags.length }),
              loading: true,
              disabled: true,
            }
          : { content: t('common.batch_delete.confirm_btn'), theme: 'danger' }
      "
      :cancel-btn="{ content: t('common.cancel'), disabled: batchDeleteLoading }"
      :close-on-esc-keydown="!batchDeleteLoading"
      :close-on-overlay-click="!batchDeleteLoading"
      :on-confirm="confirmBatchDelete"
      :on-close="
        () => {
          if (!batchDeleteLoading) batchDeleteVisible = false;
        }
      "
    >
      <div style="padding: 8px 0">
        <t-alert theme="warning" :message="t('common.batch_delete.warning')" style="margin-bottom: 16px" />
        <div style="margin-bottom: 16px">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px">
            <span style="font-weight: 500">{{ t('page.attack_log.batch_delete_select_label') }}</span>
            <div>
              <t-link theme="primary" hover="color" size="small" style="margin-right: 8px" @click="handleBatchSelectAll">{{
                t('common.batch_delete.select_all')
              }}</t-link>
              <t-link theme="primary" hover="color" size="small" style="margin-right: 8px" @click="handleBatchInvertSelection">{{
                t('common.batch_delete.invert_selection')
              }}</t-link>
              <t-link theme="danger" hover="color" size="small" @click="handleBatchClearSelection">{{
                t('common.batch_delete.clear_selection')
              }}</t-link>
            </div>
          </div>
          <t-select
            v-model="batchDeleteTags"
            :options="attackTagsForBatch"
            multiple
            :style="{ width: '100%' }"
            :placeholder="t('page.attack_log.batch_delete_select_placeholder')"
            clearable
          />
        </div>
        <div>
          <div style="font-weight: 500; margin-bottom: 8px">{{ t('common.batch_delete.delete_mode_label') }}</div>
          <t-radio-group v-model="batchDeleteMode" style="display: flex; flex-direction: column; gap: 8px">
            <t-radio value="tag_only">{{ t('common.batch_delete.mode_tag_only') }}</t-radio>
            <t-radio value="with_logs"
              ><span style="color: #e34d59">{{ t('common.batch_delete.mode_with_logs') }}</span></t-radio
            >
          </t-radio-group>
        </div>
      </div>
    </t-dialog>

    <t-dialog
      v-model:visible="attackIpVisible"
      :header="t('page.attack_log.attack_ip_visit_detail_list_header')"
      width="100%"
      :confirm-on-enter="true"
      :on-confirm="() => resetChildState()"
      :on-close="() => resetChildState()"
    >
      <web-log-list ref="childLog" :attack_ip="trans_to_parent_ip"></web-log-list>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import WebLogList from './index.vue';
import { allattacktaglist, attackIpListApi, deleteTagByNameApi } from '@/apis/waflog/attacklog';
import { wafIPBlockAddApi } from '@/apis/ipblock';
import { getOnlineUrl } from '@/utils/usuallytool';

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'ip';
const childLog = ref<InstanceType<typeof WebLogList>>();

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.attack_log.source_ip'), width: 200, ellipsis: true, colKey: 'ip', cell: 'ip' },
  { title: t('page.attack_log.deny_num'), width: 60, ellipsis: true, colKey: 'deny_num' },
  { title: t('page.attack_log.pass_num'), width: 60, ellipsis: true, colKey: 'pass_num' },
  { title: t('page.attack_log.first_time'), width: 100, ellipsis: true, colKey: 'first_time' },
  { title: t('page.attack_log.latest_time'), align: 'left', width: 100, ellipsis: true, colKey: 'latest_time' },
  { title: t('page.attack_log.ip_total_tag'), width: 150, ellipsis: true, colKey: 'ip_total_tag' },
  { align: 'left', width: 120, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 30,
});

// 顶部搜索
const attackSearchformData = reactive({
  rule: '',
  src_ip: '',
});

// 排序字段
const sorts = reactive({
  sortBy: 'create_time',
  descending: true,
});

// tag所有
const attackTags = ref<{ label: string; value: string }[]>([]);
const attackIpVisible = ref(false); // 访问明细
const trans_to_parent_ip = ref(''); // 传递给子组件
const batchDeleteVisible = ref(false);
const batchDeleteTags = ref<string[]>([]);
const batchDeleteMode = ref('tag_only');
const batchDeleteLoading = ref(false);
const batchDeleteProgress = ref(0);

const attackTagsForBatch = computed(() => attackTags.value.filter((item) => item.value !== ''));

onMounted(() => {
  getIpTags();
  getList('');
});

function getIpTags() {
  allattacktaglist({}).then((res) => {
    // 后端出错时 data 可能是对象/字符串而非数组，需兜底成数组，避免 unshift 报错触发前端异常弹窗
    attackTags.value = Array.isArray(res.data) ? res.data : [];
    attackTags.value.unshift({ label: '所有规则', value: '' });
  });
}

function getList(keyword?: string) {
  if (keyword !== undefined && keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  attackIpListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...attackSearchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
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
  const { ip } = e.row;
  attackIpVisible.value = true;
  trans_to_parent_ip.value = ip;
}

function handleAddipblock(row: Record<string, any>) {
  const { ip } = row;

  const confirmDia = DialogPlugin.confirm({
    header: t('page.visit_log.detail.add_to_deny_list_confirm_header'),
    body: t('page.visit_log.detail.add_to_deny_list_confirm_body'),
    confirmBtn: t('common.confirm'),
    cancelBtn: t('common.cancel'),
    onConfirm: () => {
      // 攻击统计页面没有 host_code，使用空字符串（全局）
      wafIPBlockAddApi({
        host_code: '',
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
    sorts.sortBy = 'create_time';
    sorts.descending = true;
  }
  getList('');
}

function resetChildState() {
  attackIpVisible.value = false;
  childLog.value?.resetState();
}

// 删除tag
function handleDeleteTag() {
  const currentTag = attackSearchformData.rule;
  if (!currentTag) {
    MessagePlugin.warning(t('page.attack_log.select_tag_warning'));
    return;
  }

  const dialog1 = DialogPlugin.confirm({
    header: t('page.attack_log.delete_tag_header'),
    body: t('page.attack_log.delete_tag_confirm', { tag: currentTag }),
    confirmBtn: t('common.next_step'),
    cancelBtn: t('common.cancel'),
    onConfirm: () => {
      dialog1.destroy();
      askDeleteLogsMode(currentTag);
    },
    onClose: () => {
      dialog1.hide();
    },
  });
}

// 询问是否连带删除日志
function askDeleteLogsMode(tagName: string) {
  const dialog2 = DialogPlugin.confirm({
    header: t('page.attack_log.delete_mode_dialog_header'),
    body: t('page.attack_log.delete_mode_dialog_body'),
    confirmBtn: {
      content: t('common.batch_delete.mode_with_logs_btn'),
      theme: 'danger',
      variant: 'base',
    },
    cancelBtn: {
      content: t('common.batch_delete.mode_tag_only_btn'),
      theme: 'default',
      variant: 'outline',
    },
    theme: 'warning',
    onConfirm: () => {
      dialog2.destroy();
      confirmDeleteTag(tagName, 'with_logs');
    },
    onCancel: () => {
      dialog2.destroy();
      confirmDeleteTag(tagName, 'tag_only');
    },
    onClose: (context: any) => {
      if (context?.trigger === 'cancel') {
        confirmDeleteTag(tagName, 'tag_only');
      }
      dialog2.hide();
    },
  });
}

// 确认删除tag
function confirmDeleteTag(tagName: string, deleteMode: string) {
  MessagePlugin.loading(t('common.deleting'), 0);

  deleteTagByNameApi({
    tag_name: tagName,
    delete_logs: deleteMode === 'with_logs',
  })
    .then((res) => {
      MessagePlugin.closeAll();
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.tips.delete_success'));
        attackSearchformData.rule = '';
        getIpTags();
        getList('');
      } else {
        MessagePlugin.warning(res.msg || t('common.tips.delete_failed'));
      }
    })
    .catch((e: Error) => {
      MessagePlugin.closeAll();
      console.log(e);
      MessagePlugin.error(t('common.tips.delete_failed_msg', { msg: e.message }));
    });
}

function handleBatchSelectAll() {
  batchDeleteTags.value = attackTagsForBatch.value.map((item) => item.value);
}

function handleBatchInvertSelection() {
  batchDeleteTags.value = attackTagsForBatch.value
    .filter((item) => !batchDeleteTags.value.includes(item.value))
    .map((item) => item.value);
}

function handleBatchClearSelection() {
  batchDeleteTags.value = [];
}

function handleBatchDeleteTag() {
  batchDeleteTags.value = [];
  batchDeleteMode.value = 'tag_only';
  batchDeleteProgress.value = 0;
  batchDeleteLoading.value = false;
  batchDeleteVisible.value = true;
}

async function confirmBatchDelete() {
  if (batchDeleteTags.value.length === 0) {
    MessagePlugin.warning(t('common.batch_delete.select_warning'));
    return;
  }
  batchDeleteLoading.value = true;
  batchDeleteProgress.value = 0;
  let successCount = 0;
  let failCount = 0;
  for (const tagName of batchDeleteTags.value) {
    try {
      const res = await deleteTagByNameApi({
        tag_name: tagName,
        delete_logs: batchDeleteMode.value === 'with_logs',
      });
      if (res.code === 0) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (e) {
      failCount++;
    }
    batchDeleteProgress.value++;
  }
  batchDeleteLoading.value = false;
  batchDeleteVisible.value = false;
  if (failCount === 0) {
    MessagePlugin.success(t('common.batch_delete.success', { count: successCount }));
  } else {
    MessagePlugin.warning(t('common.batch_delete.partial_success', { success: successCount, fail: failCount }));
  }
  attackSearchformData.rule = '';
  getIpTags();
  getList('');
}
</script>

<style scoped>
.t-button + .t-button {
  margin-left: 8px;
}
</style>
