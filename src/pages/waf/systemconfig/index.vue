<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="end" align="middle" :style="{ marginBottom: '12px' }">
        <div class="right-operation-container">
          <t-input v-model="keyword" class="config-search-input" :placeholder="t('page.systemconfig.search_placeholder')" clearable>
            <template #prefix-icon>
              <search-icon />
            </template>
          </t-input>
        </div>
      </t-row>

      <t-loading :loading="dataLoading" size="small">
        <div class="config-layout">
          <!-- 左侧：分组导航 -->
          <div class="config-sidebar">
            <div class="config-cate" :class="{ active: selectedGroup === '__all__' }" @click="selectedGroup = '__all__'">
              <span class="config-cate-title">{{ t('common.all') }}</span>
              <t-tag size="small" variant="light" theme="default">{{ filteredData.length }}</t-tag>
            </div>
            <div
              v-for="cate in categories"
              :key="cate.key"
              class="config-cate"
              :class="{ active: selectedGroup === cate.key }"
              @click="selectedGroup = cate.key"
            >
              <span class="config-cate-title" :title="cate.title">{{ cate.title }}</span>
              <t-tag size="small" variant="light" :theme="selectedGroup === cate.key ? 'primary' : 'default'">{{ cate.count }}</t-tag>
            </div>
          </div>

          <!-- 右侧：配置项明细 -->
          <div class="config-detail">
            <div v-if="rightItems.length === 0" class="config-empty">
              {{ t('page.systemconfig.empty_result') }}
            </div>
            <div v-for="row in rightItems" :key="row.id" class="config-row">
              <div class="config-row-main">
                <div class="config-item-title">
                  {{ row.remarks || row.item }}
                  <t-tag v-if="selectedGroup === '__all__' && row.item_class" size="small" variant="outline" class="config-item-cate-tag">
                    {{ cateTitle(row.item_class) }}
                  </t-tag>
                </div>
                <div class="config-item-ops">
                  <a class="t-button-link" @click="handleClickEdit(row)">{{ t('common.edit') }}</a>
                </div>
              </div>
              <div v-if="row.remarks" class="config-item-key" :title="row.item">{{ row.item }}</div>
              <div class="config-item-value">{{ row.value }}</div>
            </div>
          </div>
        </div>
      </t-loading>
    </t-card>

    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="150" @submit="onSubmitEdit">
        <t-form-item :label="t('page.systemconfig.label_configuration_item')" name="item">
          <t-input v-model="formEditData.item" :style="{ width: '480px' }" readonly></t-input>
        </t-form-item>
        <t-form-item :label="t('page.systemconfig.label_configuration_value')" name="value">
          <t-textarea v-model="formEditData.value" :style="{ width: '480px' }" :autosize="{ minRows: 1, maxRows: 12 }"></t-textarea>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '480px' }" name="remarks"> </t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps } from 'tdesign-vue-next';
import { SearchIcon } from 'tdesign-icons-vue-next';

import { edit_system_config_api, get_detail_by_id_api, system_config_list_api } from '@/apis/systemconfig';

const { t, te } = useI18n();

const INITIAL_DATA = {
  item_class: 'system',
  item: '',
  value: '',
  item_type: 'string',
  options: '',
  remarks: '',
};

const editFormVisible = ref(false);
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });
const rules: FormProps['rules'] = {};

const dataLoading = ref(false);
const allData = ref<Record<string, any>[]>([]); // 全量配置数据（一次拉取，前端分组+过滤）
const keyword = ref(''); // 实时搜索关键字
const selectedGroup = ref('__all__'); // 左侧选中的分组，默认全部

// 分组 key 转多语言名称，缺失时回退原始值
function cateTitle(cls: string) {
  if (!cls || cls === '__uncategorized__') {
    return t('page.systemconfig.category_uncategorized');
  }
  const key = `page.systemconfig.category.${cls}`;
  return te(key) ? t(key) : cls;
}

// 关键字过滤后的数据（作用于全量）
const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return allData.value;
  return allData.value.filter(
    (row) =>
      String(row.item || '').toLowerCase().includes(kw) ||
      String(row.value || '').toLowerCase().includes(kw) ||
      String(row.remarks || '').toLowerCase().includes(kw),
  );
});

// 左侧分组列表（含每组数量，随搜索联动）
const categories = computed(() => {
  const map: Record<string, number> = {};
  const order: string[] = [];
  filteredData.value.forEach((row) => {
    const cls = row.item_class || '__uncategorized__';
    if (map[cls] === undefined) {
      map[cls] = 0;
      order.push(cls);
    }
    map[cls] += 1;
  });
  return order.map((cls) => ({ key: cls, title: cateTitle(cls), count: map[cls] }));
});

// 右侧展示的配置项：全部 或 选中分组
const rightItems = computed(() => {
  if (selectedGroup.value === '__all__') return filteredData.value;
  return filteredData.value.filter((row) => (row.item_class || '__uncategorized__') === selectedGroup.value);
});

// 搜索或数据变化后，若选中分组已无数据则回退到“全部”
watch(categories, (list) => {
  if (selectedGroup.value !== '__all__' && !list.some((c) => c.key === selectedGroup.value)) {
    selectedGroup.value = '__all__';
  }
});

onMounted(() => {
  getList();
});

function getList() {
  dataLoading.value = true;
  system_config_list_api({
    pageSize: 1000,
    pageIndex: 1,
  })
    .then((res) => {
      if (res.code === 0) {
        allData.value = res.data.list ?? [];
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function handleClickEdit(row: Record<string, any>) {
  editFormVisible.value = true;
  getDetail(row.id);
}

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    edit_system_config_api({ ...formEditData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          editFormVisible.value = false;
          getList();
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function getDetail(id: string | number) {
  get_detail_by_id_api({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}
</script>

<style scoped>
.right-operation-container {
  display: flex;
  align-items: center;
}

.config-search-input {
  width: 360px;
}

/* 左右布局 */
.config-layout {
  display: flex;
  align-items: stretch;
  gap: 16px;
  min-height: 420px;
}

.config-sidebar {
  flex: 0 0 200px;
  width: 200px;
  padding: 8px;
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}

.config-cate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: var(--td-radius-default);
  cursor: pointer;
  color: var(--td-text-color-primary);
  transition: background 0.2s;
}

.config-cate:hover {
  background: var(--td-bg-color-container-hover);
}

.config-cate.active {
  background: var(--td-brand-color-light);
  color: var(--td-brand-color);
  font-weight: 600;
}

.config-cate-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-detail {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}

.config-empty {
  padding: 48px 0;
  text-align: center;
  color: var(--td-text-color-placeholder);
}

.config-row {
  padding: 10px 4px;
  border-bottom: 1px solid var(--td-component-stroke);
}

.config-row:last-child {
  border-bottom: none;
}

.config-row-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-item-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--td-text-color-primary);
  word-break: break-all;
}

.config-item-key {
  margin-top: 2px;
  font-family: var(--td-font-family-medium, monospace);
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  word-break: break-all;
}

.config-item-cate-tag {
  margin-left: 8px;
  font-weight: 400;
}

.config-item-ops {
  flex-shrink: 0;
  white-space: nowrap;
}

.config-item-value {
  margin-top: 4px;
  padding: 6px 8px;
  background: var(--td-bg-color-container-hover);
  border-radius: var(--td-radius-small);
  font-family: var(--td-font-family-medium, monospace);
  font-size: 13px;
  color: var(--td-text-color-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow: auto;
}
</style>
