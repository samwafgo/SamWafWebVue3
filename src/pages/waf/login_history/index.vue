<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="filter-bar">
          <t-input
            v-model="searchAccount"
            class="search-input"
            :placeholder="t('page.login_history.login_account')"
            clearable
            @enter="onSearch"
            @clear="onSearch"
          >
            <template #suffix-icon>
              <search-icon size="20px" />
            </template>
          </t-input>
          <t-input
            v-model="searchIp"
            class="search-input"
            :placeholder="t('page.login_history.login_ip')"
            clearable
            @enter="onSearch"
            @clear="onSearch"
          />
          <t-select v-model="searchChanged" class="search-select" @change="onSearch">
            <t-option value="" :label="t('page.login_history.filter_all')"></t-option>
            <t-option value="1" :label="t('page.login_history.changed_yes')"></t-option>
            <t-option value="0" :label="t('page.login_history.changed_no')"></t-option>
          </t-select>
          <t-button @click="onSearch">{{ t('common.search') }}</t-button>
        </div>
      </t-row>

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
          <template #is_changed="slotProps">
            <t-tag v-if="slotProps.row.is_first === 1" theme="default" variant="light">
              {{ t('page.login_history.first_login') }}
            </t-tag>
            <t-tag v-else-if="slotProps.row.is_changed === 1" theme="warning" variant="light">
              {{ t('page.login_history.changed_yes') }}
            </t-tag>
            <t-tag v-else theme="success" variant="light">
              {{ t('page.login_history.changed_no') }}
            </t-tag>
          </template>

          <template #prev="slotProps">
            <span v-if="slotProps.row.is_changed === 1">
              {{ slotProps.row.prev_ip || '-' }}
              <span class="prev-area">{{ slotProps.row.prev_area }}</span>
            </span>
            <span v-else>-</span>
          </template>
        </t-table>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PageInfo, TableProps } from 'tdesign-vue-next';
import { SearchIcon } from 'tdesign-icons-vue-next';

import { login_history_list_api } from '@/apis/login_history';

const { t } = useI18n();

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'id';

const searchAccount = ref('');
const searchIp = ref('');
// "" 表示不过滤；后端按字符串判断，避免 0 被当成"没传"
const searchChanged = ref('');

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.login_history.login_account'), align: 'left', width: 140, ellipsis: true, colKey: 'login_account' },
  { title: t('page.login_history.login_ip'), width: 150, ellipsis: true, colKey: 'login_ip' },
  { title: t('page.login_history.login_area'), width: 200, ellipsis: true, colKey: 'login_area' },
  { title: t('page.login_history.is_changed'), width: 110, colKey: 'is_changed' },
  { title: t('page.login_history.prev_ip'), width: 220, ellipsis: true, colKey: 'prev' },
  { title: t('page.login_history.login_type'), width: 90, colKey: 'login_type' },
  { title: t('page.login_history.user_agent'), width: 260, ellipsis: true, colKey: 'user_agent' },
  { title: t('page.login_history.login_time'), width: 180, ellipsis: true, colKey: 'create_time' },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

onMounted(() => {
  getList();
});

function getList() {
  dataLoading.value = true;
  login_history_list_api({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    login_account: searchAccount.value,
    login_ip: searchIp.value,
    is_changed: searchChanged.value,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function onSearch() {
  // 换了过滤条件必须回到第 1 页，否则会停在一个新结果集里不存在的页码上，看着像"没数据"
  pagination.current = 1;
  getList();
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
  getList();
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  width: 220px;
}

.search-select {
  width: 140px;
}

.prev-area {
  color: var(--td-text-color-secondary);
  margin-left: 4px;
}
</style>
