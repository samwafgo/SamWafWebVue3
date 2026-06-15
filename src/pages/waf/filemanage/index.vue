<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container"></div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="300" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item>
              <t-button theme="primary" @click="getList('refresh')"> {{ t('common.refresh') }} </t-button>
              <t-button theme="default" :style="{ marginLeft: '8px' }" @click="handleReset">
                {{ t('common.reset') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

      <t-alert theme="info" :message="t('page.filemanage.alert_message')" close> </t-alert>

      <div class="table-container">
        <t-table
          :columns="columns"
          :data="filteredAndSortedData"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          :sort="sortInfo"
          :pagination="pagination"
          @page-change="rehandlePageChange"
          @sort-change="handleSortChange"
          @filter-change="handleFilterChange"
        >
          <template #name="{ row }">
            <folder-icon v-if="row.is_dir" style="margin-right: 8px" />
            <file-icon v-else style="margin-right: 8px" />
            <span>{{ row.name }}</span>
          </template>

          <template #size="{ row }">
            <span v-if="!row.is_dir">{{ row.size }}</span>
            <span v-else>-</span>
          </template>

          <template #can_delete="{ row }">
            <t-tag v-if="row.can_delete" theme="success">{{ t('page.filemanage.can_delete') }}</t-tag>
            <t-tag v-else theme="danger">{{ t('page.filemanage.cannot_delete') }}</t-tag>
          </template>

          <template #op="slotProps">
            <a v-if="slotProps.row.can_delete" class="t-button-link" @click="handleClickDelete(slotProps)">{{
              t('common.delete')
            }}</a>
            <span v-else class="t-button-link disabled">{{ t('common.delete') }}</span>
          </template>
        </t-table>
      </div>
    </t-card>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    >
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PageInfo, TableProps } from 'tdesign-vue-next';
import { FileIcon, FolderIcon } from 'tdesign-icons-vue-next';

import { fileManageDelApi, fileManageListApi } from '@/apis/filemanage';

const { t } = useI18n();

const confirmVisible = ref(false);
const dataLoading = ref(false);
const originalData = ref<Record<string, any>[]>([]); // 备份原始数据用于搜索和排序
const selectedRowKeys = ref<(string | number)[]>([]);
const searchformData = reactive({
  name: '',
});
// 排序状态 - 默认按文件大小倒序
const sortInfo = ref<{ sortBy: string; descending: boolean }>({
  sortBy: 'size_bytes',
  descending: true,
});
// 过滤状态
const filterValue = ref<Record<string, any>>({});
const rowKey = 'path';
const deleteId = ref('');

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 20,
});

const columns = computed<TableProps['columns']>(() => [
  { align: 'left', width: 100, colKey: 'op', title: t('common.op') },
  {
    title: t('page.filemanage.label_name'),
    align: 'left',
    width: 300,
    ellipsis: true,
    colKey: 'name',
    sorter: true,
    filter: {
      type: 'input',
      resetValue: '',
      props: { placeholder: t('page.filemanage.filter_name_placeholder') },
    },
  },
  {
    title: t('page.filemanage.label_path'),
    align: 'left',
    width: 400,
    ellipsis: true,
    colKey: 'path',
    sorter: true,
    filter: {
      type: 'input',
      resetValue: '',
      props: { placeholder: t('page.filemanage.filter_path_placeholder') },
    },
  },
  { title: t('page.filemanage.label_size'), width: 120, ellipsis: true, colKey: 'size', sorter: true },
  { title: t('page.filemanage.label_size_bytes'), width: 150, ellipsis: true, colKey: 'size_bytes', sorter: true },
  {
    title: t('page.filemanage.label_description'),
    align: 'left',
    width: 300,
    ellipsis: true,
    colKey: 'description',
    sorter: true,
    filter: {
      type: 'input',
      resetValue: '',
      props: { placeholder: t('page.filemanage.filter_description_placeholder') },
    },
  },
  {
    title: t('page.filemanage.label_can_delete'),
    width: 120,
    ellipsis: true,
    colKey: 'can_delete',
    filter: {
      type: 'single',
      list: [
        { label: t('page.filemanage.can_delete'), value: true },
        { label: t('page.filemanage.cannot_delete'), value: false },
      ],
      resetValue: '',
    } as any,
  },
  { title: t('page.filemanage.label_mod_time'), width: 180, ellipsis: true, colKey: 'mod_time', sorter: true },
]);

const confirmBody = computed(() => {
  if (deleteId.value) {
    const fileItem = originalData.value.find((item) => item.id === deleteId.value);
    if (fileItem) {
      return `【${fileItem.path}】`;
    }
  }
  return '';
});

// 计算过滤和排序后的数据（前端本地过滤/排序/分页）
const filteredAndSortedData = computed(() => {
  let result = [...originalData.value];

  // 应用表头过滤
  Object.keys(filterValue.value).forEach((key) => {
    const filterVal = filterValue.value[key];
    if (filterVal !== undefined && filterVal !== '' && filterVal !== null) {
      if (key === 'can_delete') {
        result = result.filter((item) => item[key] === filterVal);
      } else if (typeof filterVal === 'string') {
        const filterTerm = filterVal.toLowerCase();
        result = result.filter((item) => item[key] && item[key].toString().toLowerCase().includes(filterTerm));
      }
    }
  });

  // 应用排序
  if (sortInfo.value.sortBy) {
    result.sort((a, b) => {
      const aVal = a[sortInfo.value.sortBy];
      const bVal = b[sortInfo.value.sortBy];

      // 数字类型排序
      if (sortInfo.value.sortBy === 'size_bytes') {
        const aNum = parseInt(aVal, 10) || 0;
        const bNum = parseInt(bVal, 10) || 0;
        return sortInfo.value.descending ? bNum - aNum : aNum - bNum;
      }

      // 日期类型排序
      if (sortInfo.value.sortBy === 'mod_time') {
        const aDate = new Date(aVal).getTime() || 0;
        const bDate = new Date(bVal).getTime() || 0;
        return sortInfo.value.descending ? bDate - aDate : aDate - bDate;
      }

      // 字符串类型排序
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortInfo.value.descending ? -comparison : comparison;
      }

      if (aVal < bVal) return sortInfo.value.descending ? 1 : -1;
      if (aVal > bVal) return sortInfo.value.descending ? -1 : 1;
      return 0;
    });
  }

  // 应用分页
  const start = (pagination.current - 1) * pagination.pageSize;
  const end = start + pagination.pageSize;
  return result.slice(start, end);
});

onMounted(() => {
  getList('all');
});

async function getList(type: string) {
  dataLoading.value = true;
  try {
    const params: Record<string, any> = {
      is_force: false,
    };
    // 如果是刷新操作，添加 is_force 参数
    if (type === 'refresh') {
      params.is_force = true;
    }

    const { data } = await fileManageListApi(params);
    originalData.value = data.files || [];
    pagination.total = data.total;
  } catch (e) {
    console.log(e);
  } finally {
    dataLoading.value = false;
  }
}

// 重置搜索
function handleReset() {
  searchformData.name = '';
  filterValue.value = {};
  sortInfo.value = {
    sortBy: '',
    descending: false,
  };
  pagination.current = 1;
}

// 处理排序变化
function handleSortChange(sorter: any) {
  sortInfo.value = {
    sortBy: sorter?.sortBy || '',
    descending: sorter?.descending ?? false,
  };
  pagination.current = 1;
}

// 处理过滤变化
function handleFilterChange(val: Record<string, any>) {
  filterValue.value = val;
  pagination.current = 1;
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
}

function handleClickDelete({ row }: { row: Record<string, any> }) {
  deleteId.value = row.id;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  if (deleteId.value) {
    deleteFile(deleteId.value);
    confirmVisible.value = false;
  }
}

async function deleteFile(id: string) {
  try {
    await fileManageDelApi({ id });
    MessagePlugin.success(t('page.filemanage.delete_success'));
    getList('all');
  } catch (e) {
    console.log(e);
    MessagePlugin.error(t('page.filemanage.delete_failed'));
  }
}

function onCancel() {
  confirmVisible.value = false;
  deleteId.value = '';
}
</script>

<style scoped>
.list-card-container {
  padding: 20px;
}

.table-container {
  margin-top: 20px;
}

.search-input {
  width: 200px;
}

.disabled {
  color: #ccc;
  cursor: not-allowed;
}
</style>
