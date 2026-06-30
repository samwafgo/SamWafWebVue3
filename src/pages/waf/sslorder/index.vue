<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button theme="success" @click="handleAdd">{{ t('common.new') }}</t-button>
          <t-button theme="primary" style="margin-left: 15px" @click="handleCaServerMaintenance">
            {{ t('page.ca_server_info.title') }}
          </t-button>
          <span v-if="srcHostCode != ''">{{ host_dic[srcHostCode] }}</span>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.sslorder.label_apply_domain')" name="apply_domain">
              <t-input v-model="searchformData.apply_domain" class="search-input" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>
      <t-alert theme="info" :message="t('page.sslorder.alert_message')" close>
        <template #operation>
          <t-space>
            <span class="highlight-link" @click="handleSslHttpCheck">{{ t('page.sslorder.ssl_http_check_setting') }}</span>
            <span @click="handleJumpOnlineUrl">{{ t('common.online_document') }}</span>
          </t-space>
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
          <template #apply_status="{ row }">
            <p>{{ sslorderStatusOptions.find((option) => option.value === row.apply_status)?.label || row.apply_status }}</p>
          </template>
          <template #apply_method="{ row }">
            <p>{{ sslorderApplyMethodOptions.find((option) => option.value === row.apply_method)?.label || row.apply_method }}</p>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.renew') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新增申请 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('common.new')" :width="770" :footer="false">
      <t-form :data="formData" :rules="rules" :label-width="240" @submit="onSubmit">
        <t-form-item :label="t('page.sslorder.label_website')" name="host_code">
          <t-select v-model="formData.host_code" clearable :style="{ width: '480px' }" @change="(v: any) => changeHostCode(String(v ?? ''))">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.sslorder.label_apply_platform')" name="apply_platform">
          <div style="display: flex; align-items: center">
            <t-select v-model="formData.apply_platform" clearable :style="{ width: '250px' }">
              <t-option v-for="item in sslorderPlatformOptions" :key="item.value" :value="item.value" :label="item.label" />
            </t-select>
            <t-button theme="primary" variant="text" style="margin-left: 10px" @click="handleCaServerMaintenance">
              {{ t('page.sslorder.maintenance_platform') }}
            </t-button>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.sslorder.label_apply_method')" name="apply_method">
          <t-select v-model="formData.apply_method" clearable :style="{ width: '480px' }">
            <t-option v-for="item in sslorderApplyMethodOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item v-if="formData.apply_method === 'dns01'" :label="t('page.sslorder.label_apply_dns')" name="apply_dns">
          <t-select v-model="formData.apply_dns" clearable :style="{ width: '480px' }" @change="handleDnsChange">
            <t-option v-for="item in sslorderApplyDnsOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item v-if="formData.apply_method === 'dns01'" :label="t('page.sslorder.label_skip_dns_verify')" name="skip_dns_verify">
          <div>
            <t-radio-group v-model="formData.skip_dns_verify">
              <t-radio :value="0">{{ t('page.sslorder.skip_dns_verify_off') }}</t-radio>
              <t-radio :value="1">{{ t('page.sslorder.skip_dns_verify_on') }}</t-radio>
            </t-radio-group>
            <div class="form-item-tips">{{ t('page.sslorder.skip_dns_verify_tips') }}</div>
          </div>
        </t-form-item>

        <!-- 密钥分组选择 -->
        <t-form-item v-if="formData.apply_method === 'dns01' && formData.apply_dns" :label="t('page.sslorder.label_private_group')" name="private_group_name">
          <div style="display: flex; align-items: center">
            <t-select v-model="formData.private_group_name" :style="{ width: '200px' }">
              <t-option v-for="item in privateGroupList" :key="item.private_group_name" :value="item.private_group_name" :label="item.private_group_name" />
            </t-select>
            <t-button theme="primary" variant="text" style="margin-left: 10px" @click="handleAddPrivateGroup(formData.apply_dns)">
              {{ t('page.sslorder.label_private_group_add') }}
            </t-button>
          </div>
        </t-form-item>

        <!-- DNS服务商密钥配置信息 -->
        <template v-if="formData.apply_method === 'dns01' && formData.apply_dns">
          <t-form-item v-for="(item, index) in dnsEnv[formData.apply_dns]" :key="index" :label="item.label">
            <div style="display: flex; align-items: center">
              <t-tag v-if="hasPrivateKey(item.value, formData.apply_dns, formData.private_group_name)" theme="success">
                {{ t('page.sslorder.key_configured') }}
              </t-tag>
              <t-tag v-else theme="warning">
                {{ t('page.sslorder.key_not_configured') }}
              </t-tag>
              <t-button
                theme="primary"
                variant="text"
                style="margin-left: 10px"
                @click="
                  handlePrivateInfo(
                    item.value,
                    formData.apply_dns,
                    formData.private_group_name,
                    hasPrivateKey(item.value, formData.apply_dns, formData.private_group_name) ? 'edit' : 'add',
                  )
                "
              >
                {{ hasPrivateKey(item.value, formData.apply_dns, formData.private_group_name) ? t('common.edit') : t('common.add') }}
              </t-button>
            </div>
          </t-form-item>
        </template>
        <t-form-item :label="t('page.sslorder.label_apply_email')" name="apply_email">
          <t-input v-model="formData.apply_email" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.sslorder.label_apply_domain')" name="apply_domain">
          <t-textarea v-model="formData.apply_domain" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="addFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 续期 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.renew')" :width="770" :footer="false">
      <t-form :data="formEditData" :rules="rules" :label-width="240" @submit="onSubmitEdit">
        <t-form-item :label="t('page.sslorder.label_website')" name="host_code">
          <t-select v-model="formEditData.host_code" clearable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
              {{ item }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.sslorder.label_apply_platform')" name="apply_platform">
          <div style="display: flex; align-items: center">
            <t-select v-model="formEditData.apply_platform" clearable :style="{ width: '250px' }">
              <t-option v-for="item in sslorderPlatformOptions" :key="item.value" :value="item.value" :label="item.label" />
            </t-select>
            <t-button theme="primary" variant="text" style="margin-left: 10px" @click="handleCaServerMaintenance">
              {{ t('page.sslorder.maintenance_platform') }}
            </t-button>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.sslorder.label_apply_method')" name="apply_method">
          <t-select v-model="formEditData.apply_method" clearable :style="{ width: '480px' }">
            <t-option v-for="item in sslorderApplyMethodOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item v-if="formEditData.apply_method === 'dns01'" :label="t('page.sslorder.label_apply_dns')" name="apply_dns">
          <t-select v-model="formEditData.apply_dns" clearable :style="{ width: '480px' }" @change="handleDnsChange">
            <t-option v-for="item in sslorderApplyDnsOptions" :key="item.value" :value="item.value" :label="item.label" />
          </t-select>
        </t-form-item>
        <t-form-item v-if="formEditData.apply_method === 'dns01'" :label="t('page.sslorder.label_skip_dns_verify')" name="skip_dns_verify">
          <div>
            <t-radio-group v-model="formEditData.skip_dns_verify">
              <t-radio :value="0">{{ t('page.sslorder.skip_dns_verify_off') }}</t-radio>
              <t-radio :value="1">{{ t('page.sslorder.skip_dns_verify_on') }}</t-radio>
            </t-radio-group>
            <div class="form-item-tips">{{ t('page.sslorder.skip_dns_verify_tips') }}</div>
          </div>
        </t-form-item>

        <!-- 密钥分组选择 -->
        <t-form-item
          v-if="formEditData.apply_method === 'dns01' && formEditData.apply_dns"
          :label="t('page.sslorder.label_private_group')"
          name="private_group_name"
        >
          <div style="display: flex; align-items: center">
            <t-select v-model="formEditData.private_group_name" :style="{ width: '200px' }">
              <t-option v-for="item in privateGroupList" :key="item.private_group_name" :value="item.private_group_name" :label="item.private_group_name" />
            </t-select>
            <t-button theme="primary" variant="text" style="margin-left: 10px" @click="handleAddPrivateGroup(formEditData.apply_dns)">
              {{ t('page.sslorder.label_private_group_add') }}
            </t-button>
          </div>
        </t-form-item>
        <!-- DNS服务商密钥配置信息 -->
        <template v-if="formEditData.apply_method === 'dns01' && formEditData.apply_dns">
          <t-form-item v-for="(item, index) in dnsEnv[formEditData.apply_dns]" :key="index" :label="item.label">
            <div style="display: flex; align-items: center">
              <t-tag v-if="hasPrivateKey(item.value, formEditData.apply_dns, formEditData.private_group_name)" theme="success">
                {{ t('page.sslorder.key_configured') }}
              </t-tag>
              <t-tag v-else theme="warning">
                {{ t('page.sslorder.key_not_configured') }}
              </t-tag>
              <t-button
                theme="primary"
                variant="text"
                style="margin-left: 10px"
                @click="
                  handlePrivateInfo(
                    item.value,
                    formEditData.apply_dns,
                    formEditData.private_group_name,
                    hasPrivateKey(item.value, formEditData.apply_dns, formEditData.private_group_name) ? 'edit' : 'add',
                  )
                "
              >
                {{ hasPrivateKey(item.value, formEditData.apply_dns, formEditData.private_group_name) ? t('common.edit') : t('common.add') }}
              </t-button>
            </div>
          </t-form-item>
        </template>
        <t-form-item :label="t('page.sslorder.label_apply_email')" name="apply_email">
          <t-input v-model="formEditData.apply_email" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.sslorder.label_apply_domain')" name="apply_domain">
          <t-textarea v-model="formEditData.apply_domain" :style="{ width: '480px' }" :autosize="{ minRows: 4, maxRows: 4 }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="editFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />

    <!-- 添加/编辑私钥信息对话框 -->
    <t-dialog v-model:visible="privateFormVisible" :header="privateFormMode === 'add' ? t('common.add') : t('common.edit')" :width="680" :footer="false">
      <t-form :data="privateFormData" :rules="privateRules" :label-width="200" @submit="onPrivateSubmit">
        <t-form-item :label="t('page.private_info.private_group_name')" name="private_group_name">
          <t-input v-model="privateFormData.private_group_name" :style="{ width: '480px' }" :disabled="privateFormMode === 'edit'" />
        </t-form-item>
        <t-form-item :label="t('page.private_info.private_group_belong_cloud')" name="private_group_belong_cloud">
          <t-input v-model="privateFormData.private_group_belong_cloud" :style="{ width: '480px' }" :disabled="privateFormMode === 'edit'" />
        </t-form-item>
        <t-form-item :label="t('page.private_info.private_key')" name="private_key">
          <t-input v-model="privateFormData.private_key" :style="{ width: '480px' }" :disabled="privateFormMode === 'edit'" />
        </t-form-item>
        <t-form-item :label="t('page.private_info.private_value')" name="private_value">
          <t-input v-model="privateFormData.private_value" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.private_info.remarks')" name="remarks">
          <t-input v-model="privateFormData.remarks" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="privateFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 证书文件验证方式设置对话框 -->
    <t-dialog v-model:visible="sslHttpCheckDialogVisible" :header="t('page.sslorder.ssl_http_check_setting')" :width="680" :footer="false">
      <p>{{ t('page.sslorder.ssl_http_check_desc') }}</p>
      <t-form :data="sslHttpCheckFormData" :rules="sslHttpCheckRules" :label-width="150" @submit="onSubmitSslHttpCheck">
        <t-form-item :label="t('page.systemconfig.label_configuration_item')" name="item">
          <t-input v-model="sslHttpCheckFormData.item" :style="{ width: '480px' }" disabled />
        </t-form-item>
        <t-form-item :label="t('page.systemconfig.label_configuration_value')" name="value">
          <div>
            <t-select v-model="sslHttpCheckFormData.value" :style="{ width: '480px' }">
              <t-option value="1" :label="t('page.sslorder.ssl_http_check_strict')" />
              <t-option value="0" :label="t('page.sslorder.ssl_http_check_loose')" />
            </t-select>
            <div class="form-item-tips">{{ t('page.sslorder.ssl_http_check_tips') }}</div>
          </div>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="sslHttpCheckDialogVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 添加密钥分组对话框 -->
    <t-dialog v-model:visible="privateGroupFormVisible" :header="t('page.private_group.button_add_private_group')" :width="680" :footer="false">
      <t-form :data="privateGroupFormData" :rules="privateGroupRules" :label-width="200" @submit="onPrivateGroupSubmit">
        <t-form-item :label="t('page.private_group.private_group_name')" name="private_group_name">
          <t-input v-model="privateGroupFormData.private_group_name" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.private_group.private_group_belong_cloud')" name="private_group_belong_cloud">
          <t-input v-model="privateGroupFormData.private_group_belong_cloud" :style="{ width: '480px' }" disabled />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="privateGroupFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- CA服务器维护对话框 -->
    <t-dialog v-model:visible="caServerMaintenanceVisible" :header="t('page.ca_server_info.title')" :width="900" :footer="false">
      <div style="margin-bottom: 16px">
        <t-button theme="success" @click="handleAddCaServer">{{ t('common.new') }}</t-button>
      </div>

      <t-table :columns="caServerColumns" :data="caServerList" row-key="id" :loading="caServerLoading">
        <template #op="{ row }">
          <a class="t-button-link" @click="handleEditCaServer(row)">{{ t('common.edit') }}</a>
          <a class="t-button-link" @click="handleDeleteCaServer(row)">{{ t('common.delete') }}</a>
        </template>
      </t-table>

      <div style="text-align: right; margin-top: 16px">
        <t-button variant="outline" @click="caServerMaintenanceVisible = false">{{ t('common.close') }}</t-button>
      </div>
    </t-dialog>

    <!-- 添加/编辑CA服务器对话框 -->
    <t-dialog v-model:visible="caServerFormVisible" :header="caServerFormMode === 'add' ? t('common.add') : t('common.edit')" :width="680" :footer="false">
      <t-form :data="caServerFormData" :rules="caServerRules" :label-width="200" @submit="onCaServerSubmit">
        <t-form-item :label="t('page.ca_server_info.ca_server_name')" name="ca_server_name">
          <t-input v-model="caServerFormData.ca_server_name" :style="{ width: '480px' }" :disabled="caServerFormMode === 'edit'" />
        </t-form-item>
        <t-form-item :label="t('page.ca_server_info.ca_server_address')" name="ca_server_address">
          <t-input v-model="caServerFormData.ca_server_address" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item :label="t('page.ca_server_info.ca_server_remarks')" name="remarks">
          <t-input v-model="caServerFormData.remarks" :style="{ width: '480px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="caServerFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin, type FormProps, type PageInfo, type TableProps } from 'tdesign-vue-next';
import { getOnlineUrl } from '@/utils/usuallytool';
import { sslOrderAddApi, sslOrderDelApi, sslOrderEditApi, sslOrderListApi } from '@/apis/sslorder';
import { wafPrivateInfoListApi, wafPrivateInfoEditApi, wafPrivateInfoAddApi } from '@/apis/private_info';
import { allhost, alldomainbyhostcode } from '@/apis/host';
import { get_detail_by_item_api, edit_system_config_api } from '@/apis/systemconfig';
import { wafPrivateGroupListByBelongCloudApi, wafPrivateGroupAddApi } from '@/apis/private_group';
import { wafCaServerInfoListApi, wafCaServerInfoDelApi, wafCaServerInfoEditApi, wafCaServerInfoAddApi } from '@/apis/ca_server_info';

const INITIAL_DATA = {
  host_code: '',
  apply_platform: 'letsencrypt',
  apply_method: 'http01',
  skip_dns_verify: 0,
  apply_dns: '',
  apply_email: '',
  apply_domain: '',
  apply_status: 'submitted',
  private_group_name: 'default',
  private_group_belong_cloud: '',
};

const props = withDefaults(defineProps<{ srcHostCode?: string }>(), { srcHostCode: '' });

const { t } = useI18n();

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const rules: FormProps['rules'] = {
  host_code: [{ required: true, message: t('common.placeholder') + t('page.sslorder.label_website'), type: 'error' }],
  apply_email: [{ required: true, message: t('common.select_placeholder') + t('page.sslorder.label_apply_email'), type: 'error' }],
  apply_domain: [{ required: true, message: t('common.select_placeholder') + t('page.sslorder.label_apply_domain'), type: 'error' }],
};

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const private_data = ref<Record<string, any>[]>([]); // 私有信息
const privateGroupList = ref<Record<string, any>[]>([]); // 密钥分组列表

// 私钥信息表单
const privateFormVisible = ref(false);
const privateFormMode = ref<'add' | 'edit'>('add');
const privateFormData = ref<Record<string, any>>({
  private_group_name: '',
  private_group_belong_cloud: '',
  private_key: '',
  private_value: '',
  remarks: '',
});
const privateRules: FormProps['rules'] = {
  private_key: [{ required: true, message: t('common.placeholder') + t('page.private_info.private_key'), type: 'error' }],
  private_value: [{ required: true, message: t('common.placeholder') + t('page.private_info.private_value'), type: 'error' }],
};

// 密钥分组表单
const privateGroupFormVisible = ref(false);
const privateGroupFormData = ref({ private_group_name: '', private_group_belong_cloud: '' });
const privateGroupRules: FormProps['rules'] = {
  private_group_name: [{ required: true, message: t('common.placeholder') + t('page.private_group.private_group_name'), type: 'error' }],
  private_group_belong_cloud: [
    { required: true, message: t('common.placeholder') + t('page.private_group.private_group_belong_cloud'), type: 'error' },
  ],
};

const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
  { title: t('page.sslorder.label_website'), align: 'left', width: 250, ellipsis: true, colKey: 'host_code' },
  { title: t('page.sslorder.label_apply_status'), align: 'left', width: 100, ellipsis: true, colKey: 'apply_status' },
  { title: t('page.sslorder.label_result_error'), align: 'left', width: 100, ellipsis: true, colKey: 'result_error' },
  { title: t('page.sslorder.label_apply_platform'), align: 'left', width: 250, ellipsis: true, colKey: 'apply_platform' },
  { title: t('page.sslorder.label_apply_method'), width: 200, ellipsis: true, colKey: 'apply_method' },
  { title: t('page.sslorder.label_apply_dns'), width: 200, ellipsis: true, colKey: 'apply_dns' },
  { title: t('page.sslorder.label_private_group'), width: 200, ellipsis: true, colKey: 'private_group_name' },
  { title: t('page.sslorder.label_apply_email'), width: 200, ellipsis: true, colKey: 'apply_email' },
  { title: t('page.sslorder.label_apply_domain'), width: 200, ellipsis: true, colKey: 'apply_domain' },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time', sorter: true },
  { title: 'id', align: 'left', width: 250, ellipsis: true, colKey: 'id' },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });
const searchformData = reactive({ apply_domain: '', host_code: '' });
const deleteIdx = ref<string | number>(-1);
const host_dic = ref<Record<string, string>>({});

// 证书文件验证方式设置
const sslHttpCheckDialogVisible = ref(false);
const sslHttpCheckFormData = ref<Record<string, any>>({
  item: 'sslhttp_check',
  value: '1',
  remarks: '证书文件验证方式是否要严控后端.well-known响应代码',
});
const sslHttpCheckRules: FormProps['rules'] = {
  item: [{ required: true, message: t('page.systemconfig.label_configuration_item'), type: 'error' }],
  value: [{ required: true, message: t('page.systemconfig.label_configuration_value'), type: 'error' }],
};

// 订单状态
const sslorderStatusOptions = computed(() => [
  { label: t('page.sslorder.sslorder_status_type.submitted'), value: 'submitted' },
  { label: t('page.sslorder.sslorder_status_type.applying'), value: 'applying' },
  { label: t('page.sslorder.sslorder_status_type.fail'), value: 'fail' },
  { label: t('page.sslorder.sslorder_status_type.success'), value: 'success' },
  { label: t('page.sslorder.sslorder_status_type.renewed'), value: 'renewed' },
  { label: t('page.sslorder.sslorder_status_type.expired'), value: 'expired' },
]);

// 平台类型（从 CA 服务器列表动态加载）
const sslorderPlatformOptions = ref<{ label: string; value: string }[]>([]);

// 申请方式
const sslorderApplyMethodOptions = computed(() => [
  { label: t('page.sslorder.sslorder_apply_method_type.http01'), value: 'http01' },
  { label: t('page.sslorder.sslorder_apply_method_type.dns01'), value: 'dns01' },
]);

const sslorderApplyDnsOptions = computed(() => [
  { label: t('page.sslorder.sslorder_apply_dns_type.aliyun'), value: 'alidns' },
  { label: t('page.sslorder.sslorder_apply_dns_type.huaweicloud'), value: 'huaweicloud' },
  { label: t('page.sslorder.sslorder_apply_dns_type.tencentcloud'), value: 'tencentcloud' },
  { label: t('page.sslorder.sslorder_apply_dns_type.cloudflare'), value: 'cloudflare' },
  { label: t('page.sslorder.sslorder_apply_dns_type.baiducloud'), value: 'baiducloud' },
]);

const dnsEnv = computed<Record<string, { value: string; label: string }[]>>(() => ({
  alidns: [
    { value: 'ALICLOUD_ACCESS_KEY', label: t('page.sslorder.sslorder_apply_dns_config.alidns.access_key') },
    { value: 'ALICLOUD_SECRET_KEY', label: t('page.sslorder.sslorder_apply_dns_config.alidns.secret_key') },
    { value: 'ALICLOUD_SECURITY_TOKEN', label: t('page.sslorder.sslorder_apply_dns_config.alidns.security_token') },
  ],
  huaweicloud: [
    { value: 'HUAWEICLOUD_ACCESS_KEY_ID', label: t('page.sslorder.sslorder_apply_dns_config.huaweicloud.access_key') },
    { value: 'HUAWEICLOUD_SECRET_ACCESS_KEY', label: t('page.sslorder.sslorder_apply_dns_config.huaweicloud.secret_key') },
    { value: 'HUAWEICLOUD_REGION', label: t('page.sslorder.sslorder_apply_dns_config.huaweicloud.region') },
  ],
  tencentcloud: [
    { value: 'TENCENTCLOUD_SECRET_ID', label: t('page.sslorder.sslorder_apply_dns_config.tencentcloud.secret_id') },
    { value: 'TENCENTCLOUD_SECRET_KEY', label: t('page.sslorder.sslorder_apply_dns_config.tencentcloud.secret_key') },
  ],
  cloudflare: [{ value: 'CF_DNS_API_TOKEN', label: t('page.sslorder.sslorder_apply_dns_config.cloudflare.dns_api_token') }],
  baiducloud: [
    { value: 'BAIDUCLOUD_ACCESS_KEY_ID', label: t('page.sslorder.sslorder_apply_dns_config.baiducloud.access_key') },
    { value: 'BAIDUCLOUD_SECRET_ACCESS_KEY', label: t('page.sslorder.sslorder_apply_dns_config.baiducloud.secret_key') },
  ],
}));

// CA服务器维护相关
const caServerMaintenanceVisible = ref(false);
const caServerFormVisible = ref(false);
const caServerFormMode = ref<'add' | 'edit'>('add');
const caServerList = ref<Record<string, any>[]>([]);
const caServerLoading = ref(false);
const caServerFormData = ref<Record<string, any>>({ ca_server_name: '', ca_server_address: '', remarks: '' });
const caServerRules: FormProps['rules'] = {
  ca_server_name: [{ required: true, message: t('common.placeholder') + t('page.ca_server_info.ca_server_name'), type: 'error' }],
  ca_server_address: [{ required: true, message: t('common.placeholder') + t('page.ca_server_info.ca_server_address'), type: 'error' }],
  remarks: [{ required: true, message: t('common.placeholder') + t('page.ca_server_info.ca_server_remarks'), type: 'error' }],
};
const caServerColumns = computed<TableProps['columns']>(() => [
  { align: 'left', width: 120, colKey: 'op', title: t('common.op') },
  { title: t('page.ca_server_info.ca_server_name'), align: 'left', width: 200, colKey: 'ca_server_name' },
  { title: t('page.ca_server_info.ca_server_address'), align: 'left', width: 300, colKey: 'ca_server_address' },
  { title: t('page.ca_server_info.ca_server_remarks'), align: 'left', width: 200, colKey: 'remarks' },
]);

const confirmBody = computed(() => {
  if (deleteIdx.value !== -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

// 监听srcHostCode变化，重新加载数据
watch(
  () => props.srcHostCode,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      pagination.current = 1;
      reloadInitData();
    }
  },
);

// 初始化数据
function reloadInitData() {
  loadHostList().then(() => {
    getList();
    getPrivateList();
    loadCaServerList();
  });
}

// 处理CA服务器维护
function handleCaServerMaintenance() {
  loadCaServerListForMaintenance();
  caServerMaintenanceVisible.value = true;
}

// 加载CA服务器列表用于维护
function loadCaServerListForMaintenance() {
  caServerLoading.value = true;
  wafCaServerInfoListApi({ pageSize: 100, pageIndex: 1 })
    .then((res) => {
      if (res.code === 0 && res.data && res.data.list) {
        caServerList.value = res.data.list;
      } else {
        caServerList.value = [];
        MessagePlugin.warning(res.msg || t('common.tips.get_failed'));
      }
    })
    .catch((e) => {
      console.error('获取CA服务器列表失败:', e);
      caServerList.value = [];
      MessagePlugin.error(t('common.tips.api_error'));
    })
    .finally(() => {
      caServerLoading.value = false;
    });
}

function handleAddCaServer() {
  caServerFormMode.value = 'add';
  caServerFormData.value = { ca_server_name: '', ca_server_address: '', remarks: '' };
  caServerFormVisible.value = true;
}

function handleEditCaServer(row: Record<string, any>) {
  caServerFormMode.value = 'edit';
  caServerFormData.value = { ...row };
  caServerFormVisible.value = true;
}

function handleDeleteCaServer(row: Record<string, any>) {
  // letsencrypt 为内置平台，不允许删除
  if (row.ca_server_name === 'letsencrypt') {
    MessagePlugin.warning(t('page.sslorder.ca_server_letsencrypt_cannot_op'));
    return;
  }

  const confirmDialog = DialogPlugin.confirm({
    header: t('common.confirm_delete'),
    body: t('common.data_delete_warning'),
    confirmBtn: { theme: 'danger', content: t('common.confirm') },
    cancelBtn: { theme: 'default', content: t('common.cancel') },
    onConfirm: () => {
      deleteCaServer(row.id);
      confirmDialog.hide();
    },
  });
}

function deleteCaServer(id: string | number) {
  wafCaServerInfoDelApi({ id })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.tips.delete_success'));
        loadCaServerListForMaintenance();
        loadCaServerList(); // 刷新下拉选项
      } else {
        MessagePlugin.warning(res.msg || t('common.tips.delete_failed'));
      }
    })
    .catch((e) => {
      console.error('删除CA服务器失败:', e);
      MessagePlugin.error(t('common.tips.delete_failed'));
    });
}

const onCaServerSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  const api = caServerFormMode.value === 'add' ? wafCaServerInfoAddApi : wafCaServerInfoEditApi;
  api({ ...caServerFormData.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.tips.save_success'));
        caServerFormVisible.value = false;
        loadCaServerListForMaintenance();
        loadCaServerList();
      } else {
        MessagePlugin.warning(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch((e) => {
      console.error('保存CA服务器失败:', e);
      MessagePlugin.error(t('common.tips.save_failed'));
    });
};

// 加载CA服务器列表（作为申请平台下拉选项）
function loadCaServerList() {
  const fallback = [{ label: t('page.sslorder.sslorder_platform_type.letsencrypt'), value: 'letsencrypt' }];
  wafCaServerInfoListApi({ pageSize: 100, pageIndex: 1 })
    .then((res) => {
      if (res.code === 0 && res.data && res.data.list) {
        sslorderPlatformOptions.value = res.data.list.map((item: Record<string, any>) => ({
          value: item.ca_server_name,
          label: item.remarks || item.ca_server_name,
        }));
        if (sslorderPlatformOptions.value.length === 0) {
          sslorderPlatformOptions.value = fallback;
        }
      } else {
        sslorderPlatformOptions.value = fallback;
      }
    })
    .catch((e) => {
      console.error('获取CA服务器列表异常:', e);
      sslorderPlatformOptions.value = fallback;
    });
}

// 处理添加密钥分组
function handleAddPrivateGroup(cloudType: string) {
  privateGroupFormData.value = { private_group_name: '', private_group_belong_cloud: cloudType };
  privateGroupFormVisible.value = true;
}

const onPrivateGroupSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  wafPrivateGroupAddApi({ ...privateGroupFormData.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.tips.save_success'));
        privateGroupFormVisible.value = false;
        getPrivateGroupList(privateGroupFormData.value.private_group_belong_cloud);
      } else {
        MessagePlugin.warning(res.msg || t('common.tips.save_failed'));
      }
    })
    .catch((e) => {
      console.error('添加密钥分组失败:', e);
      MessagePlugin.error(t('common.tips.save_failed'));
    });
};

// 处理DNS服务商变更
function handleDnsChange(value: any) {
  if (value) {
    getPrivateGroupList(String(value));
    getPrivateList();
  } else {
    privateGroupList.value = [];
    if (formData.value.apply_dns === '') {
      formData.value.private_group_name = '';
    }
    if (formEditData.value.apply_dns === '') {
      formEditData.value.private_group_name = '';
    }
  }
}

// 获取密钥分组列表
function getPrivateGroupList(cloudType: string) {
  wafPrivateGroupListByBelongCloudApi({
    private_group_belong_cloud: cloudType,
    pageSize: 100,
    pageIndex: 1,
  })
    .then((res) => {
      if (res.code === 0) {
        privateGroupList.value = res.data.list || [];
        if (privateGroupList.value.length > 0) {
          // 分组列表不为空时默认选择第一个分组
          formData.value.private_group_name = privateGroupList.value[0].private_group_name;
          formEditData.value.private_group_name = privateGroupList.value[0].private_group_name;
        }
      } else {
        MessagePlugin.warning(res.msg || t('common.tips.get_failed'));
      }
    })
    .catch((err) => {
      console.error('获取密钥分组列表失败:', err);
      MessagePlugin.error(t('common.tips.get_failed'));
    });
}

// 处理证书文件验证方式设置
function handleSslHttpCheck() {
  get_detail_by_item_api({ item: 'sslhttp_check' })
    .then((res) => {
      if (res.code === 0 && res.data) {
        sslHttpCheckFormData.value = res.data;
      } else {
        sslHttpCheckFormData.value = {
          item: 'sslhttp_check',
          value: '1',
          remarks: '证书文件验证方式是否要严控后端.well-known响应代码',
        };
      }
      sslHttpCheckDialogVisible.value = true;
    })
    .catch((err) => {
      console.error('获取证书文件验证方式配置失败:', err);
      MessagePlugin.error(t('common.tips.api_error'));
    });
}

const onSubmitSslHttpCheck: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult === true) {
    edit_system_config_api(sslHttpCheckFormData.value)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(t('common.tips.save_success'));
          sslHttpCheckDialogVisible.value = false;
        } else {
          MessagePlugin.error(res.msg || t('common.tips.save_failed'));
        }
      })
      .catch((err) => {
        console.error('保存证书文件验证方式配置失败:', err);
        MessagePlugin.error(t('common.tips.save_failed'));
      });
  }
};

// 处理私钥信息
function handlePrivateInfo(keyName: string, cloudType: string, groupName: string, action: 'add' | 'edit') {
  if (action === 'edit') {
    const privateInfo = private_data.value.find(
      (item) => item.private_key === keyName && item.private_group_belong_cloud === cloudType && item.private_group_name === groupName,
    );
    if (privateInfo) {
      privateFormMode.value = 'edit';
      privateFormData.value = { ...privateInfo };
      privateFormVisible.value = true;
    } else {
      MessagePlugin.warning(t('common.data_not_found'));
    }
  } else {
    privateFormMode.value = 'add';
    privateFormData.value = {
      private_group_belong_cloud: cloudType,
      private_group_name: groupName,
      private_key: keyName,
      private_value: '',
      remarks: '',
    };
    privateFormVisible.value = true;
  }
}

const onPrivateSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  const api = privateFormMode.value === 'add' ? wafPrivateInfoAddApi : wafPrivateInfoEditApi;
  api({ ...privateFormData.value })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        privateFormVisible.value = false;
        getPrivateList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e) => {
      console.log(e);
    });
};

// 检查是否已配置特定的私有密钥
function hasPrivateKey(keyName: string, cloudType: string, groupName: string) {
  return private_data.value.some(
    (item) => item.private_key === keyName && item.private_group_belong_cloud === cloudType && item.private_group_name === groupName,
  );
}

function getPrivateList() {
  wafPrivateInfoListApi({ pageSize: 100, pageIndex: 1 })
    .then((res) => {
      if (res.code === 0) {
        private_data.value = res.data.list ?? [];
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function changeHostCode(hostCode: string) {
  if (hostCode !== '') {
    alldomainbyhostcode({ code: hostCode })
      .then((res) => {
        if (res.code === 0) {
          // 提取所有非空 label 用逗号连接
          const labels = (res.data as { label: string }[]).map((item) => item.label).filter((label) => label);
          formData.value.apply_domain = labels.join(',');
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }
}

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          (res.data as { value: string; label: string }[]).forEach((item) => {
            // SSL 申请不针对全局网站
            if (item.label === '全局网站:0') return;
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

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function getList() {
  dataLoading.value = true;
  searchformData.host_code = props.srcHostCode;
  sslOrderListApi({
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

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA };
  if (props.srcHostCode !== '') {
    formData.value.host_code = props.srcHostCode;
    changeHostCode(props.srcHostCode);
  }
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  // http01 方式域名不能包含通配符
  if (formData.value.apply_method === 'http01') {
    if (formData.value.apply_domain.indexOf('*') !== -1) {
      MessagePlugin.warning(t('page.sslorder.error_domain_not_match_method'));
      return;
    }
  }
  // dns01 方式 apply_dns 不能为空
  if (formData.value.apply_method === 'dns01') {
    if (!formData.value.apply_dns) {
      MessagePlugin.warning(t('common.select_placeholder') + t('page.sslorder.label_apply_dns'));
      return;
    }
  }
  sslOrderAddApi({ ...formData.value }).then((res) => {
    if (res.code === 0) {
      getList();
      MessagePlugin.success(t('common.success'));
      addFormVisible.value = false;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
};

function handleClickEdit(slotProps: { row: Record<string, any> }) {
  const { row } = slotProps;
  formEditData.value = {
    ...row,
    skip_dns_verify: row.skip_dns_verify ?? 0,
  };
  if (row.apply_method === 'dns01' && row.apply_dns) {
    getPrivateGroupList(row.apply_dns);
  }
  editFormVisible.value = true;
}

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  formEditData.value.apply_status = 'renewed';
  sslOrderEditApi({ ...formEditData.value }).then((res) => {
    if (res.code === 0) {
      getList();
      MessagePlugin.success(t('common.success'));
      editFormVisible.value = false;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
};

function handleClickDelete(slotProps: { row: Record<string, any> }) {
  deleteIdx.value = slotProps.row.id;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  sslOrderDelApi({ id: deleteIdx.value }).then((res) => {
    if (res.code === 0) {
      getList();
      MessagePlugin.success(t('common.success'));
      confirmVisible.value = false;
      deleteIdx.value = -1;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function onCancel() {
  confirmVisible.value = false;
  deleteIdx.value = -1;
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/SSL.html`);
}

onMounted(() => {
  reloadInitData();
});
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.table-container {
  margin-top: 20px;
}

.search-input {
  width: 200px;
}

.highlight-link {
  color: #e34d59;
  cursor: pointer;
  font-weight: bold;
}

.highlight-link:hover {
  text-decoration: underline;
}

.form-item-tips {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}
</style>
