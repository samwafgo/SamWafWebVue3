<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddAntiCC">{{ t('page.cc.new_cc_protection') }}</t-button>
          <t-button theme="success" @click="handleShowCCBanIPList">{{ t('page.cc.show_cc_ban_ip') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="150" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.cc.website')" name="host_code">
              <t-select v-model="searchformData.host_code" clearable filterable :style="{ width: '250px' }">
                <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                  {{ item }}
                </t-option>
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">{{ t('common.search') }}</t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.cc.samwaf_cc_protection')" close>
        <template #operation>
          <span @click="handleJumpOnlineUrl">{{ t('common.online_document') }}</span>
        </template>
      </t-alert>
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
          <template #host_code="{ row }">
            <span>{{ host_dic[row.host_code] }}</span>
          </template>

          <template #limit_mode="{ row }">
            <t-tag v-if="row.limit_mode === 'rate'" theme="primary">{{ t('page.cc.limit_mode_rate') }}</t-tag>
            <t-tag v-else-if="row.limit_mode === 'window'" theme="warning">{{ t('page.cc.limit_mode_window') }}</t-tag>
            <t-tag v-else>{{ t('page.cc.limit_mode_unknown') }}</t-tag>
          </template>
          <template #skip_global_cc="{ row }">
            <t-tag v-if="row.skip_global_cc" theme="danger">{{ t('common.yes') }}</t-tag>
            <t-tag v-else theme="default">{{ t('common.no') }}</t-tag>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- New CC Protect Dialog -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="700" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="150" @submit="onSubmit">
        <t-form-item :label="t('page.cc.website')" name="host_code">
          <t-select v-model="formData.host_code" clearable filterable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.cc.rate')" name="rate">
          <t-input-number v-model="formData.rate" :style="{ width: '480px' }" :placeholder="t('common.placeholder') + t('page.cc.rate')" />
        </t-form-item>
        <t-form-item :label="t('page.cc.limit')" name="limit">
          <t-input-number v-model="formData.limit" :style="{ width: '480px' }" :placeholder="t('common.placeholder') + t('page.cc.limit')" />
        </t-form-item>

        <t-form-item :label="t('page.cc.limit_mode')" name="limit_mode">
          <t-radio-group v-model="formData.limit_mode">
            <t-radio value="rate">
              <div>
                <div>{{ t('page.cc.limit_mode_rate') }}</div>
                <div class="limit-mode-desc">{{ t('page.cc.limit_mode_rate_desc') }}</div>
              </div>
            </t-radio>
            <t-radio value="window">
              <div>
                <div>{{ t('page.cc.limit_mode_window') }}</div>
                <div class="limit-mode-desc">{{ t('page.cc.limit_mode_window_desc') }}</div>
              </div>
            </t-radio>
          </t-radio-group>
        </t-form-item>

        <!-- 效果提示 -->
        <t-form-item>
          <t-alert theme="info" :message="getLimitModeEffectTips(formData)" />
        </t-form-item>

        <!-- 启用前置规则 -->
        <t-form-item :label="t('page.cc.enable_rule')" name="is_enable_rule">
          <t-switch v-model="formData.is_enable_rule" />
        </t-form-item>

        <!-- 规则内容（启用时显示） -->
        <t-form-item v-if="formData.is_enable_rule" :label="t('page.cc.rule_content')" name="rule_content">
          <div>
            <t-textarea
              v-model="formData.rule_content"
              :style="{ width: '480px' }"
              :autosize="{ minRows: 10, maxRows: 10 }"
              :placeholder="t('page.cc.rule_content_placeholder')"
            />
            <div class="limit-mode-desc">{{ t('page.cc.rule_content_desc') }}</div>
            <t-button size="small" theme="warning" @click="openRuleGenerator">{{ t('common.generate_rule') }}</t-button>
          </div>
        </t-form-item>

        <t-form-item v-if="!isGlobalHost(formData.host_code)" :label="t('page.cc.skip_global_cc')" name="skip_global_cc">
          <div>
            <t-switch v-model="formData.skip_global_cc" />
            <div class="limit-mode-desc">{{ t('page.cc.skip_global_cc_desc') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cc.lock_minutes')" name="lock_ip_minutes">
          <t-input-number
            v-model="formData.lock_ip_minutes"
            :style="{ width: '480px' }"
            :min="1"
            :placeholder="t('common.placeholder') + t('page.cc.lock_minutes')"
          />
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formData.remarks" :style="{ width: '480px' }" :placeholder="t('common.placeholder_content')" name="remarks" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- Edit CC Protect Dialog -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="700" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="150" @submit="onSubmitEdit">
        <t-form-item :label="t('page.cc.website')" name="host_code">
          <t-select v-model="formEditData.host_code" clearable filterable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.cc.rate')" name="rate">
          <t-input-number v-model="formEditData.rate" :style="{ width: '480px' }" :placeholder="t('common.placeholder') + t('page.cc.rate')" />
        </t-form-item>
        <t-form-item :label="t('page.cc.limit')" name="limit">
          <t-input-number v-model="formEditData.limit" :style="{ width: '480px' }" :placeholder="t('common.placeholder') + t('page.cc.limit')" />
        </t-form-item>

        <t-form-item :label="t('page.cc.limit_mode')" name="limit_mode">
          <t-radio-group v-model="formEditData.limit_mode">
            <t-radio value="rate">
              <div>
                <div>{{ t('page.cc.limit_mode_rate') }}</div>
                <div class="limit-mode-desc">{{ t('page.cc.limit_mode_rate_desc') }}</div>
              </div>
            </t-radio>
            <t-radio value="window">
              <div>
                <div>{{ t('page.cc.limit_mode_window') }}</div>
                <div class="limit-mode-desc">{{ t('page.cc.limit_mode_window_desc') }}</div>
              </div>
            </t-radio>
          </t-radio-group>
        </t-form-item>

        <t-form-item>
          <t-alert theme="info" :message="getLimitModeEffectTips(formEditData)" />
        </t-form-item>

        <t-form-item :label="t('page.cc.enable_rule')" name="is_enable_rule">
          <t-switch v-model="formEditData.is_enable_rule" />
        </t-form-item>

        <t-form-item v-if="formEditData.is_enable_rule" :label="t('page.cc.rule_content')" name="rule_content">
          <div>
            <t-textarea
              v-model="formEditData.rule_content"
              :style="{ width: '480px' }"
              :autosize="{ minRows: 10, maxRows: 10 }"
              :placeholder="t('page.cc.rule_content_placeholder')"
            />
            <div class="limit-mode-desc">{{ t('page.cc.rule_content_desc') }}</div>
            <t-button size="small" theme="warning" @click="openRuleGenerator">{{ t('common.generate_rule') }}</t-button>
          </div>
        </t-form-item>

        <t-form-item v-if="!isGlobalHost(formEditData.host_code)" :label="t('page.cc.skip_global_cc')" name="skip_global_cc">
          <div>
            <t-switch v-model="formEditData.skip_global_cc" />
            <div class="limit-mode-desc">{{ t('page.cc.skip_global_cc_desc') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.cc.lock_minutes')" name="lock_ip_minutes">
          <t-input-number
            v-model="formEditData.lock_ip_minutes"
            :style="{ width: '480px' }"
            :min="1"
            :placeholder="t('common.placeholder') + t('page.cc.lock_minutes')"
          />
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea v-model="formEditData.remarks" :style="{ width: '480px' }" :placeholder="t('common.placeholder_content')" name="remarks" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 规则生成器（新增/编辑共用） -->
    <t-dialog v-model:visible="showRuleBuilderDialog" :header="t('common.generate_rule')" width="900px" :destroy-on-close="true" :footer="false">
      <rule-builder
        :host-code="addFormVisible ? formData.host_code : formEditData.host_code"
        @confirm="onRuleBuilderConfirm"
        @cancel="showRuleBuilderDialog = false"
      />
    </t-dialog>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />
    <t-dialog
      v-model:visible="banIPListVisible"
      :header="t('page.cc.show_cc_ban_ip')"
      :width="800"
      @confirm="banIPListVisible = false"
      :on-cancel="() => (banIPListVisible = false)"
    >
      <ban-ip-list ref="banIpListRef" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { getOnlineUrl } from '@/utils/usuallytool';
import BanIpList from './component/baniplist/index.vue';
import RuleBuilder from '@/components/rule-builder/index.vue';
import { allhost } from '@/apis/host';
import { wafAntiCCListApi, wafAntiCCDelApi, wafAntiCCEditApi, wafAntiCCAddApi, wafAntiCCDetailApi } from '@/apis/anticc';

const INITIAL_DATA = {
  host_code: '',
  url: '',
  rate: 10,
  limit: 250,
  limit_mode: 'window',
  lock_ip_minutes: 10,
  remarks: '',
  is_enable_rule: false,
  rule_content: '',
  skip_global_cc: false,
};

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const banIPListVisible = ref(false);
const showRuleBuilderDialog = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });
const banIpListRef = ref<InstanceType<typeof BanIpList> | null>(null);

const rules: FormProps['rules'] = {
  host_code: [{ required: true, message: t('page.cc.website'), type: 'error' }],
  rate: [{ required: true, message: t('page.cc.rate'), type: 'error' }],
  limit: [{ required: true, message: t('page.cc.limit'), type: 'error' }],
  lock_ip_minutes: [{ required: true, message: t('page.cc.lock_minutes'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const rowKey = 'code';

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.cc.website'), align: 'left', width: 250, ellipsis: true, colKey: 'host_code' },
  { title: t('page.cc.rate'), width: 200, ellipsis: true, colKey: 'rate' },
  { title: t('page.cc.limit'), width: 200, ellipsis: true, colKey: 'limit' },
  { title: t('page.cc.limit_mode'), width: 200, ellipsis: true, colKey: 'limit_mode' },
  { title: t('page.cc.skip_global_cc'), width: 160, ellipsis: true, colKey: 'skip_global_cc' },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({ host_code: '' });

const deleteIdx = ref(-1);
const host_dic = ref<Record<string, string>>({});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

// 判断是否选择了全局网站（全局网站无需也无法跳过全局CC）
function isGlobalHost(host_code: string) {
  return host_dic.value[host_code] === '全局网站:0';
}

// 根据限流模式和参数计算效果提示
function getLimitModeEffectTips(fd: Record<string, any>) {
  if (!fd.rate || !fd.limit) {
    return t('page.cc.limit_mode_effect_incomplete');
  }
  if (fd.limit_mode === 'window') {
    return t('page.cc.limit_mode_window_effect', { rate: fd.rate, limit: fd.limit });
  }
  const ratePerSecond = (fd.limit / fd.rate).toFixed(2);
  return t('page.cc.limit_mode_rate_effect', { rate: fd.rate, limit: fd.limit, ratePerSecond });
}

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          (res.data as { value: string; label: string }[]).forEach((item) => {
            host_dic.value[item.value] = item.label;
          });
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        reject(e);
      });
  });
}

function getList() {
  dataLoading.value = true;
  wafAntiCCListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
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

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function handleClickEdit(e: { row: Record<string, any> }) {
  editFormVisible.value = true;
  getDetail(e.row.id);
}

function handleAddAntiCC() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    wafAntiCCAddApi({ ...formData.value })
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
    wafAntiCCEditApi({ ...formEditData.value })
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

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  wafAntiCCDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => console.log(e));
  resetIdx();
}

function onCancel() {
  resetIdx();
}

function resetIdx() {
  deleteIdx.value = -1;
}

function getDetail(id: string | number) {
  wafAntiCCDetailApi({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => console.log(e));
}

function handleShowCCBanIPList() {
  banIPListVisible.value = true;
  nextTick(() => {
    banIpListRef.value?.getList();
  });
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/CC.html`);
}

function openRuleGenerator() {
  showRuleBuilderDialog.value = true;
}

function onRuleBuilderConfirm(content: string) {
  if (addFormVisible.value) {
    formData.value.rule_content = content;
  } else if (editFormVisible.value) {
    formEditData.value.rule_content = content;
  } else {
    formData.value.rule_content = content;
  }
  showRuleBuilderDialog.value = false;
}

onMounted(() => {
  loadHostList().then(() => {
    getList();
  });
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.limit-mode-desc {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}
</style>
