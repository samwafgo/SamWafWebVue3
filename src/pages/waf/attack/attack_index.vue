<template>
  <div>
    <help-block :summary="t('page.attack_log.attack_log')" doc="guide/AttackLog">
      <template #actions><ip-lookup ref="ipLookupRef" /></template>
    </help-block>
    <t-card class="list-card-container">
      <div class="attack-layout">
        <!-- 左侧规则筛选侧栏：规则标签基数无上限，必须能分组 + 搜索 -->
        <div v-if="tagLayout === 'left'" class="facet-side" :class="{ 'is-collapsed': facetCollapsed }">
          <div class="facet-head">
            <b v-show="!facetCollapsed">{{ t('page.attack_log.filter_title') }}</b>
            <span class="facet-head-op">
              <t-tooltip v-if="!facetCollapsed" :content="t('page.attack_log.layout_to_top')" placement="top" show-arrow>
                <t-button variant="text" shape="square" size="small" @click="toggleTagLayout">
                  <t-icon name="view-column" />
                </t-button>
              </t-tooltip>
              <t-tooltip
                :content="facetCollapsed ? t('page.attack_log.facet_expand') : t('page.attack_log.facet_collapse')"
                placement="top"
                show-arrow
              >
                <t-button variant="text" shape="square" size="small" @click="toggleFacet">
                  <t-icon :name="facetCollapsed ? 'chevron-right' : 'chevron-left'" />
                </t-button>
              </t-tooltip>
            </span>
          </div>

          <template v-if="!facetCollapsed">
            <div class="facet-search">
              <t-input v-model="tagKeyword" size="small" clearable :placeholder="t('page.attack_log.search_placeholder')">
                <template #prefix-icon><search-icon /></template>
              </t-input>
            </div>

            <div class="facet-list">
              <div
                class="facet-item facet-item--all"
                :class="{ 'is-active': attackSearchformData.rule === '' }"
                @click="selectTag('')"
              >
                <span class="nm">{{ t('page.attack_log.all_rules') }}</span>
                <span class="badge">{{ formatCount(totalTagCount) }}</span>
              </div>

              <template v-for="group in groupedTags" :key="group.name">
                <div class="facet-group" :class="{ 'is-closed': isGroupClosed(group.name) }" @click="toggleGroup(group.name)">
                  <t-icon class="caret" name="chevron-down" />
                  <span class="gname">{{ group.name }}</span>
                  <span class="gsum">{{ group.items.length }} · {{ formatCount(group.sum) }}</span>
                </div>
                <div v-if="!isGroupClosed(group.name)">
                  <div
                    v-for="item in group.items"
                    :key="item.value"
                    class="facet-item"
                    :class="{ 'is-active': attackSearchformData.rule === item.value }"
                    :title="item.value"
                    @click="selectTag(item.value)"
                  >
                    <span class="nm">{{ item.short }}</span>
                    <span class="badge">{{ formatCount(item.count) }}</span>
                    <t-icon class="del" name="close" @click.stop="handleDeleteTag(item.value)" />
                  </div>
                </div>
              </template>

              <div v-if="!groupedTags.length" class="facet-empty">{{ t('page.attack_log.no_match') }}</div>
            </div>

            <!-- 标签存放位置：低频的存储层设置，放底部不跟高频筛选抢视线 -->
            <div class="facet-foot">
              <div class="foot-label">
                <span>{{ t('page.attack_log.iptag_db_title') }}</span>
                <t-tooltip
                  :content="t('page.attack_log.iptag_db_tip')"
                  placement="top"
                  :overlay-style="{ width: '280px' }"
                  show-arrow
                >
                  <t-icon name="help-circle" />
                </t-tooltip>
              </div>
              <t-radio-group
                :value="ipTagDb"
                variant="default-filled"
                size="small"
                :disabled="ipTagDbSaving"
                @change="onIpTagDbChange"
              >
                <t-radio-button value="0">{{ t('page.attack_log.iptag_db_main') }}</t-radio-button>
                <t-radio-button value="1">{{ t('page.attack_log.iptag_db_stats') }}</t-radio-button>
              </t-radio-group>
              <div class="foot-hint">
                {{ ipTagDb === '1' ? t('page.attack_log.iptag_db_current_stats') : t('page.attack_log.iptag_db_current_main') }}
              </div>
            </div>
          </template>
        </div>

        <div class="facet-main">
          <!-- 切 tab 直接查，不用再点一次「查询」 -->
          <t-tabs v-if="tagLayout === 'top'" v-model="attackSearchformData.rule" @change="handleTabChange">
            <t-tab-panel v-for="(item, index) in tabTags" :key="index" :value="item.value" :label="item.label"> </t-tab-panel>
          </t-tabs>

          <div class="cur-bar">
            <span class="cur-label">{{ t('page.attack_log.current_filter') }}</span>
            <t-tag shape="round" theme="primary" variant="light">
              {{ attackSearchformData.rule || t('page.attack_log.all_rules') }}
            </t-tag>
            <t-link v-if="attackSearchformData.rule" theme="primary" hover="color" size="small" @click="selectTag('')">
              {{ t('page.attack_log.clear_filter') }}
            </t-link>
            <span class="cur-spacer"></span>
            <t-tooltip v-if="tagLayout === 'top'" :content="t('page.attack_log.layout_to_left')" placement="top" show-arrow>
              <t-button variant="text" shape="square" size="small" @click="toggleTagLayout">
                <t-icon name="view-list" />
              </t-button>
            </t-tooltip>
            <t-button
              v-if="attackSearchformData.rule"
              theme="danger"
              variant="outline"
              size="small"
              @click="handleDeleteTag()"
            >
              {{ t('page.attack_log.delete_current_tag') }}
            </t-button>
            <t-button theme="danger" variant="outline" size="small" @click="handleBatchDeleteTag">
              {{ t('common.batch_delete.title') }}
            </t-button>
          </div>

          <t-form
            ref="searchForm"
            :data="attackSearchformData"
            :label-width="60"
            colon
            layout="inline"
            :style="{ marginBottom: '8px' }"
          >
            <t-form-item :label="t('page.attack_log.source_ip')" name="src_ip">
              <t-input
                v-model="attackSearchformData.src_ip"
                class="form-item-content"
                :placeholder="t('common.placeholder') + t('page.visit_log.source_ip')"
                :style="{ minWidth: '180px' }"
              />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')"> {{ t('common.search') }} </t-button>
              <t-button type="reset" variant="base" theme="default"> {{ t('common.reset') }} </t-button>
            </t-form-item>
          </t-form>

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
                <!-- 点 IP 直接开归属查询：排查时最想知道的就是「这个IP现在被什么拦着」 -->
                <t-tooltip :content="t('common.ip_lookup.click_tip')">
                  <a class="ipl-link" @click="openIpLookup(row.ip)">{{ row.ip }}</a>
                </t-tooltip>
              </template>
              <template #op="slotProps">
                <a class="t-button-link" @click="handleClickDetail(slotProps)">{{ t('common.details') }}</a>
              </template>
            </t-table>
          </div>
        </div>
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
import { SearchIcon } from 'tdesign-icons-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';

import WebLogList from './index.vue';
import { allattacktaglist, attackIpListApi, deleteTagByNameApi } from '@/apis/waflog/attacklog';
import { edit_system_config_api, get_detail_by_item_api } from '@/apis/systemconfig';
import { getOnlineUrl } from '@/utils/usuallytool';

// 点列表里的 IP 直接开归属查询，省得用户复制粘贴
const ipLookupRef = ref<any>(null);
function openIpLookup(ip: string) {
  if (!ip) return;
  ipLookupRef.value?.open(ip);
}

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
const attackTags = ref<{ label: string; value: string; count?: number }[]>([]);
// 规则筛选排布：left=左侧分组侧栏  top=顶部横向tab
const tagLayout = ref(localStorage.getItem('samwaf_attack_tag_layout') === 'top' ? 'top' : 'left');
// 窄屏默认收起，避免侧栏把本来就多的表格列挤没
const facetCollapsed = ref(
  (() => {
    const v = localStorage.getItem('samwaf_attack_facet_collapsed');
    if (v === '1') return true;
    if (v === '0') return false;
    return window.innerWidth < 1400;
  })(),
);
const tagKeyword = ref('');
const closedGroups = ref<Record<string, boolean>>({});
// 标签数据存放位置 0主库 1统计库（后端 ip_tag_db）
const ipTagDb = ref('0');
const ipTagDbItem = ref<Record<string, any> | null>(null);
const ipTagDbSaving = ref(false);
const attackIpVisible = ref(false); // 访问明细
const trans_to_parent_ip = ref(''); // 传递给子组件
const batchDeleteVisible = ref(false);
const batchDeleteTags = ref<string[]>([]);
const batchDeleteMode = ref('tag_only');
const batchDeleteLoading = ref(false);
const batchDeleteProgress = ref(0);

const attackTagsForBatch = computed(() => attackTags.value.filter((item) => item.value !== ''));

// 大数字用万/亿，否则计数比规则名还长
function formatCount(n: number) {
  const v = Number(n || 0);
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}亿`;
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  return String(v);
}

// 冒号前缀优先，无冒号的按关键词兜底，保证新规则名也能自动落位
function groupOf(name: string) {
  const m = String(name).match(/^(.+?)[:：]/);
  if (m) return m[1];
  if (/黑名单|白名单|威胁情报|IP组/.test(name)) return t('page.attack_log.group_list');
  if (/频次访问限制/.test(name)) return t('page.attack_log.group_cc');
  if (/静态文件/.test(name)) return t('page.attack_log.group_static');
  return t('page.attack_log.group_other');
}

// 归一化标签：优先用后端新增的 count 字段，老后端没有则从 label 的「(数字)」反解
const tagList = computed(() =>
  attackTags.value
    .filter((item) => item && item.value)
    .map((item) => {
      let count = Number(item.count || 0);
      if (!count) {
        const m = String(item.label || '').match(/^(.*)\s*\((\d+)\)\s*$/);
        if (m) count = Number(m[2]);
      }
      const name = String(item.value);
      const idx = name.search(/[:：]/);
      return {
        value: name,
        label: item.label,
        name,
        short: idx > -1 ? name.slice(idx + 1).trim() : name,
        count,
      };
    }),
);

const totalTagCount = computed(() => tagList.value.reduce((a, b) => a + b.count, 0));

// 冒号前缀天然是规则族（静态文件安全检查: / AI检测: / OWASP: ...），组内沿用后端的量级倒序
const groupedTags = computed(() => {
  const kw = tagKeyword.value.trim().toLowerCase();
  const list = kw ? tagList.value.filter((item) => item.name.toLowerCase().indexOf(kw) >= 0) : tagList.value;
  const map: Record<string, typeof list> = {};
  const order: string[] = [];
  list.forEach((item) => {
    const g = groupOf(item.name);
    if (!map[g]) {
      map[g] = [];
      order.push(g);
    }
    map[g].push(item);
  });
  return order
    .map((g) => ({ name: g, items: map[g], sum: map[g].reduce((a, b) => a + b.count, 0) }))
    .sort((a, b) => b.sum - a.sum);
});

const tabTags = computed(() => [
  { value: '', label: t('page.attack_log.all_rules') },
  ...tagList.value.map((item) => ({ value: item.value, label: `${item.name} ${formatCount(item.count)}` })),
]);

function isGroupClosed(name: string) {
  // 搜索中一律展开，否则命中项藏在折叠组里等于没搜
  if (tagKeyword.value.trim()) return false;
  return !!closedGroups.value[name];
}

function toggleGroup(name: string) {
  closedGroups.value = { ...closedGroups.value, [name]: !closedGroups.value[name] };
}

function toggleFacet() {
  facetCollapsed.value = !facetCollapsed.value;
  localStorage.setItem('samwaf_attack_facet_collapsed', facetCollapsed.value ? '1' : '0');
}

function toggleTagLayout() {
  tagLayout.value = tagLayout.value === 'left' ? 'top' : 'left';
  localStorage.setItem('samwaf_attack_tag_layout', tagLayout.value);
}

onMounted(() => {
  getIpTags();
  getList('');
  loadIpTagDb();
});

// 读当前的 IP Tag 存放位置（与访问日志页的日志配置是同一个配置项）
function loadIpTagDb() {
  get_detail_by_item_api({ item: 'ip_tag_db' })
    .then((res) => {
      if (res.code === 0 && res.data) {
        ipTagDbItem.value = res.data;
        ipTagDb.value = String(res.data.value) === '1' ? '1' : '0';
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function getIpTags() {
  allattacktaglist({}).then((res) => {
    // 后端出错时 data 可能是对象/字符串而非数组，需兜底成数组，避免 unshift 报错触发前端异常弹窗
    attackTags.value = Array.isArray(res.data) ? res.data : [];
    attackTags.value.unshift({ label: '所有规则', value: '' });
  });
}

function selectTag(value: string) {
  attackSearchformData.rule = value;
  pagination.current = 1;
  getList();
}

function onIpTagDbChange(val: string | number | boolean) {
  const next = String(val);
  if (next === ipTagDb.value) return;
  const nameOf = (v: string) =>
    v === '1' ? t('page.attack_log.iptag_db_stats_full') : t('page.attack_log.iptag_db_main_full');
  const dialog = DialogPlugin.confirm({
    header: t('page.attack_log.iptag_db_switch_header'),
    body: t('page.attack_log.iptag_db_switch_body', { from: nameOf(ipTagDb.value), to: nameOf(next) }),
    theme: 'warning',
    confirmBtn: t('common.confirm'),
    cancelBtn: t('common.cancel'),
    onConfirm: () => {
      dialog.destroy();
      doSaveIpTagDb(next);
    },
    onClose: () => {
      dialog.hide();
    },
  });
}

function doSaveIpTagDb(next: string) {
  const item = ipTagDbItem.value;
  if (!item) {
    MessagePlugin.warning(t('page.attack_log.iptag_db_load_failed'));
    return;
  }
  ipTagDbSaving.value = true;
  edit_system_config_api({
    id: item.id,
    category: item.category,
    item: item.item,
    value: next,
    type: item.type,
    title: item.title,
    options: item.options || '',
  })
    .then((res) => {
      if (res.code === 0) {
        ipTagDb.value = next;
        ipTagDbItem.value = { ...item, value: next };
        MessagePlugin.success(t('page.attack_log.iptag_db_saved'));
        // 换库了，标签和列表都得按新库重新拉
        attackSearchformData.rule = '';
        pagination.current = 1;
        getIpTags();
        getList('');
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      MessagePlugin.error(e.message);
    })
    .finally(() => {
      ipTagDbSaving.value = false;
    });
}

// 切 tab 等于换了查询条件，回第一页再拉；否则停在上一次的页码上容易看到空列表
function handleTabChange() {
  pagination.current = 1;
  getList();
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

// Jump Url

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
function handleDeleteTag(tagName?: string) {
  // 侧栏条目传标签名进来；不传则删当前筛选的标签
  const currentTag = typeof tagName === 'string' && tagName ? tagName : attackSearchformData.rule;
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
        if (attackSearchformData.rule === tagName) {
          attackSearchformData.rule = '';
        }
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

/* ===== 规则筛选侧栏 ===== */
.attack-layout {
  display: flex;
  align-items: stretch;
}

.facet-side {
  width: 250px;
  flex: none;
  display: flex;
  flex-direction: column;
  padding-right: 8px;
  border-right: 1px solid var(--td-component-stroke);
}

.facet-side.is-collapsed {
  width: 40px;
  padding-right: 0;
}

.facet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--td-component-stroke);
}

.facet-head b {
  font-size: 14px;
  font-weight: 500;
}

.facet-search {
  padding: 8px 0;
}

.facet-list {
  flex: 1;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}

.facet-list::-webkit-scrollbar {
  width: 6px;
}

.facet-list::-webkit-scrollbar-thumb {
  background: var(--td-component-border);
  border-radius: 3px;
}

.facet-group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  padding: 7px 6px 7px 2px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  cursor: pointer;
  user-select: none;
}

.facet-group:hover {
  color: var(--td-brand-color);
}

.facet-group .caret {
  font-size: 14px;
  transition: transform 0.15s;
}

.facet-group.is-closed .caret {
  transform: rotate(-90deg);
}

.facet-group .gname {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.facet-group .gsum {
  margin-left: auto;
  flex: none;
  font-size: 11px;
  color: var(--td-text-color-placeholder);
}

.facet-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 6px 6px 20px;
  font-size: 13px;
  border-radius: var(--td-radius-default);
  cursor: pointer;
}

.facet-item.facet-item--all {
  padding-left: 6px;
  font-weight: 500;
}

.facet-item:hover {
  background: var(--td-bg-color-container-hover);
}

.facet-item.is-active {
  color: var(--td-brand-color);
  background: var(--td-brand-color-light);
  font-weight: 500;
}

.facet-item.is-active .badge {
  color: var(--td-brand-color);
  background: var(--td-brand-color-light-active);
}

.facet-item .nm {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.facet-item .badge {
  flex: none;
  min-width: 20px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  color: var(--td-text-color-secondary);
  background: var(--td-bg-color-component);
  border-radius: 9px;
}

.facet-item .del {
  flex: none;
  visibility: hidden;
  font-size: 14px;
  color: var(--td-text-color-placeholder);
}

.facet-item .del:hover {
  color: var(--td-error-color);
}

.facet-item:hover .del {
  visibility: visible;
}

.facet-empty {
  padding: 16px 8px;
  font-size: 12px;
  text-align: center;
  color: var(--td-text-color-placeholder);
}

.facet-foot {
  margin-top: 6px;
  padding: 10px 4px 2px;
  border-top: 1px solid var(--td-component-stroke);
}

.facet-foot .foot-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.facet-foot .foot-hint {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--td-text-color-placeholder);
}

.facet-main {
  flex: 1;
  min-width: 0;
  padding-left: 16px;
}

.attack-layout > .facet-main:first-child {
  padding-left: 0;
}

.cur-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 12px 0 8px;
}

.cur-bar .cur-label {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.cur-bar .cur-spacer {
  flex: 1;
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
