<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-tag theme="warning" variant="light">{{ t('page.data_retention.tip_readonly') }}</t-tag>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" layout="inline" :style="{ marginBottom: '8px' }">
            <t-form-item>
              <t-button theme="primary" @click="getList">{{ t('common.search') }}</t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

      <t-alert theme="info" :message="t('page.data_retention.alert_message')" close />

      <div class="table-container">
        <t-table :columns="columns" :data="data" row-key="id" vertical-align="top" hover :loading="dataLoading">
          <template #clean_enabled="{ row }">
            <t-tag :theme="row.clean_enabled === 1 ? 'success' : 'default'" variant="light">
              {{ row.clean_enabled === 1 ? t('page.data_retention.enabled') : t('page.data_retention.disabled') }}
            </t-tag>
          </template>

          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 编辑对话框 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="580" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="120" @submit="onSubmitEdit">
        <t-form-item :label="t('page.data_retention.table_name')" name="table_name">
          <t-input v-model="formEditData.table_name" :style="{ width: '380px' }" disabled />
        </t-form-item>

        <t-form-item :label="t('page.data_retention.db_type')" name="db_type">
          <t-tag theme="primary" variant="light">{{ formEditData.db_type || 'stats' }}</t-tag>
        </t-form-item>

        <t-form-item :label="t('page.data_retention.retain_days')" name="retain_days">
          <t-input-number v-model="formEditData.retain_days" :style="{ width: '200px' }" :min="0" :step="1" />
          <span style="margin-left: 8px; color: var(--td-text-color-secondary)">{{ t('page.data_retention.days_unit') }}</span>
        </t-form-item>

        <t-form-item :label="t('page.data_retention.retain_rows')" name="retain_rows">
          <t-input-number v-model="formEditData.retain_rows" :style="{ width: '200px' }" :min="0" :step="10000" />
          <span style="margin-left: 8px; color: var(--td-text-color-secondary)">{{ t('page.data_retention.rows_unit') }}</span>
        </t-form-item>

        <t-form-item :label="t('page.data_retention.clean_enabled')" name="clean_enabled">
          <t-switch
            v-model="cleanEnabledBool"
            :label="[t('page.data_retention.enabled'), t('page.data_retention.disabled')]"
            @change="onCleanEnabledChange"
          />
        </t-form-item>

        <t-form-item :label="t('page.data_retention.remarks')" name="remarks">
          <t-input v-model="formEditData.remarks" :style="{ width: '380px' }" />
        </t-form-item>

        <!-- 只读信息 -->
        <t-form-item :label="t('page.data_retention.last_clean_time')">
          <span style="color: var(--td-text-color-secondary)">
            {{ formEditData.last_clean_time || t('page.data_retention.never_cleaned') }}
          </span>
        </t-form-item>

        <t-form-item :label="t('page.data_retention.last_clean_rows')">
          <span style="color: var(--td-text-color-secondary)">{{ formEditData.last_clean_rows }}</span>
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
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, TableProps } from 'tdesign-vue-next';

import { wafDataRetentionDetailApi, wafDataRetentionEditApi, wafDataRetentionListApi } from '@/apis/data_retention';

const { t } = useI18n();

const INITIAL_EDIT_DATA = {
  id: '',
  table_name: '',
  retain_days: 90,
  retain_rows: 100000,
  day_field: '',
  day_field_type: '',
  row_order_field: '',
  row_order_dir: '',
  clean_enabled: 1,
  last_clean_time: '',
  last_clean_rows: 0,
  remarks: '',
};

const editFormVisible = ref(false);
const formEditData = ref<Record<string, any>>({ ...INITIAL_EDIT_DATA });
const cleanEnabledBool = ref(true);

const rules: FormProps['rules'] = {
  retain_days: [{ required: true, type: 'error', message: t('common.placeholder') + t('page.data_retention.retain_days') }],
  retain_rows: [{ required: true, type: 'error', message: t('common.placeholder') + t('page.data_retention.retain_rows') }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const searchformData = reactive({});

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.data_retention.table_name'), colKey: 'table_name', width: 180, ellipsis: true },
  { title: t('page.data_retention.db_type'), colKey: 'db_type', width: 90 },
  { title: t('page.data_retention.retain_days'), colKey: 'retain_days', width: 110 },
  { title: t('page.data_retention.retain_rows'), colKey: 'retain_rows', width: 120 },
  { title: t('page.data_retention.day_field'), colKey: 'day_field', width: 130, ellipsis: true },
  { title: t('page.data_retention.clean_enabled'), colKey: 'clean_enabled', width: 100 },
  { title: t('page.data_retention.last_clean_time'), colKey: 'last_clean_time', width: 180, ellipsis: true },
  { title: t('page.data_retention.last_clean_rows'), colKey: 'last_clean_rows', width: 120 },
  { title: t('page.data_retention.remarks'), colKey: 'remarks', ellipsis: true },
  { align: 'left', fixed: 'right', width: 80, colKey: 'op', title: t('common.op') },
]);

onMounted(() => {
  getList();
});

function getList() {
  dataLoading.value = true;
  wafDataRetentionListApi({ pageSize: 20, pageIndex: 1 })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function handleClickEdit(e: { row: Record<string, any> }) {
  const { id } = e.row;
  editFormVisible.value = true;
  getDetail(id);
}

function getDetail(id: string | number) {
  wafDataRetentionDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
        cleanEnabledBool.value = formEditData.value.clean_enabled === 1;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onCleanEnabledChange(val: any) {
  formEditData.value.clean_enabled = val ? 1 : 0;
}

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafDataRetentionEditApi({ ...formEditData.value })
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
  formEditData.value = { ...INITIAL_EDIT_DATA };
}
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.t-button + .t-button {
  margin-left: 8px;
}
</style>
