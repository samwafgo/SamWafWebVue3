<template>
  <div class="custom-headers-config">
    <t-form-item :label="t('page.host.custom_headers.is_enable')">
      <t-tooltip :content="t('page.host.custom_headers.is_enable_tips')" placement="top" :overlay-style="{ width: '300px' }" show-arrow>
        <t-radio-group v-model="localConfig.is_enable_custom_headers" @change="updateParent">
          <t-radio value="0">{{ t('common.off') }}</t-radio>
          <t-radio value="1">{{ t('common.on') }}</t-radio>
        </t-radio-group>
      </t-tooltip>
    </t-form-item>

    <!-- 使用说明 -->
    <t-alert
      v-if="localConfig.is_enable_custom_headers == '1'"
      theme="info"
      :message="t('page.host.custom_headers.usage_guide')"
      style="margin-bottom: 16px"
    >
      <template #operation>
        <span style="cursor: pointer" @click="showVariableHelp = !showVariableHelp">
          {{ showVariableHelp ? t('page.host.custom_headers.hide_help') : t('page.host.custom_headers.show_help') }}
        </span>
      </template>
    </t-alert>

    <!-- 变量帮助面板 -->
    <t-collapse v-if="localConfig.is_enable_custom_headers == '1' && showVariableHelp" style="margin-bottom: 16px">
      <t-collapse-panel :header="t('page.host.custom_headers.variable_help_title')">
        <div class="variable-help">
          <div class="variable-section">
            <h4>{{ t('page.host.custom_headers.builtin_variables') }}</h4>
            <ul>
              <li><code>${'${client_ip}'}</code> - {{ t('page.host.custom_headers.var_client_ip') }}</li>
              <li><code>${'${remote_addr}'}</code> - {{ t('page.host.custom_headers.var_remote_addr') }}</li>
              <li><code>${'${host}'}</code> - {{ t('page.host.custom_headers.var_host') }}</li>
              <li><code>${'${scheme}'}</code> - {{ t('page.host.custom_headers.var_scheme') }}</li>
              <li><code>${'${request_uri}'}</code> - {{ t('page.host.custom_headers.var_request_uri') }}</li>
              <li><code>${'${request_method}'}</code> - {{ t('page.host.custom_headers.var_request_method') }}</li>
              <li><code>${'${header:HeaderName}'}</code> - {{ t('page.host.custom_headers.var_header') }}</li>
            </ul>
          </div>

          <div class="variable-section">
            <h4>{{ t('page.host.custom_headers.usage_examples') }}</h4>
            <ul>
              <li>{{ t('page.host.custom_headers.example_1') }}</li>
              <li>{{ t('page.host.custom_headers.example_2') }}</li>
              <li>{{ t('page.host.custom_headers.example_3') }}</li>
              <li>{{ t('page.host.custom_headers.example_4') }}</li>
            </ul>
          </div>

          <div class="quick-add-section">
            <h4>{{ t('page.host.custom_headers.quick_add') }}</h4>
            <t-space>
              <t-button size="small" variant="outline" @click="addPresetHeader('client_ip')">
                {{ t('page.host.custom_headers.preset_client_ip') }}
              </t-button>
              <t-button size="small" variant="outline" @click="addPresetHeader('forwarded_for')">
                {{ t('page.host.custom_headers.preset_forwarded_for') }}
              </t-button>
              <t-button size="small" variant="outline" @click="addPresetHeader('real_ip')">
                {{ t('page.host.custom_headers.preset_real_ip') }}
              </t-button>
              <t-button size="small" variant="outline" @click="addPresetHeader('custom')">
                {{ t('page.host.custom_headers.preset_custom') }}
              </t-button>
            </t-space>
          </div>
        </div>
      </t-collapse-panel>
    </t-collapse>

    <!-- 头信息列表 -->
    <div v-if="localConfig.is_enable_custom_headers == '1'" class="headers-list">
      <div class="headers-section">
        <div class="section-title">
          {{ t('page.host.custom_headers.headers_list') }}
        </div>

        <!-- 空状态提示 -->
        <div v-if="!localConfig.headers || localConfig.headers.length === 0" class="empty-hint">
          <info-circle-icon style="margin-right: 8px" />
          {{ t('page.host.custom_headers.no_headers') }}
        </div>

        <!-- 头信息列表 -->
        <div v-else class="headers-container">
          <div v-for="(header, index) in localConfig.headers" :key="index" class="header-item">
            <div class="header-item-row">
              <div class="header-field-group">
                <div class="header-field">
                  <label class="field-label">{{ t('page.host.custom_headers.header_name') }}</label>
                  <t-input
                    v-model="header.header_name"
                    :placeholder="t('page.host.custom_headers.header_name_placeholder')"
                    style="width: 220px"
                    @change="updateParent"
                  />
                </div>

                <div class="header-field header-value-field">
                  <label class="field-label">{{ t('page.host.custom_headers.header_value') }}</label>
                  <t-input
                    v-model="header.header_value"
                    :placeholder="t('page.host.custom_headers.header_value_placeholder')"
                    style="width: 320px"
                    @change="updateParent"
                  >
                    <template #suffix>
                      <t-dropdown :options="variableOptions" @click="(data: any) => insertVariable(index, String(data.value))">
                        <t-button size="small" variant="text" style="padding: 0 4px">
                          <add-circle-icon style="margin-right: 4px" />
                          {{ t('page.host.custom_headers.insert_variable') }}
                        </t-button>
                      </t-dropdown>
                    </template>
                  </t-input>
                </div>
              </div>

              <t-button theme="danger" size="small" variant="outline" class="delete-btn" @click="removeHeader(index)">
                <delete-icon style="margin-right: 4px" />
                {{ t('common.delete') }}
              </t-button>
            </div>
          </div>
        </div>

        <!-- 添加按钮 -->
        <div class="add-button-container">
          <t-button theme="primary" variant="outline" size="small" @click="addHeader">
            <add-icon style="margin-right: 4px" />
            {{ t('page.host.custom_headers.add_header') }}
          </t-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import { InfoCircleIcon, AddCircleIcon, AddIcon, DeleteIcon } from 'tdesign-icons-vue-next';

const props = defineProps<{ customHeadersConfig: Record<string, any> }>();
const emit = defineEmits<{ (e: 'update', config: Record<string, any>): void }>();

const { t } = useI18n();

const showVariableHelp = ref(false);

const variableOptions = [
  { content: '${client_ip}', value: '${client_ip}' },
  { content: '${remote_addr}', value: '${remote_addr}' },
  { content: '${host}', value: '${host}' },
  { content: '${scheme}', value: '${scheme}' },
  { content: '${request_uri}', value: '${request_uri}' },
  { content: '${request_method}', value: '${request_method}' },
  { content: '${header:X-Forwarded-For}', value: '${header:X-Forwarded-For}' },
  { content: '${header:User-Agent}', value: '${header:User-Agent}' },
  { content: '${header:Referer}', value: '${header:Referer}' },
];

function normalize(src: Record<string, any>) {
  const config = JSON.parse(JSON.stringify(src));
  // 确保 is_enable_custom_headers 是字符串类型
  if (typeof config.is_enable_custom_headers !== 'string') {
    config.is_enable_custom_headers = String(config.is_enable_custom_headers || 0);
  }
  // 确保 headers 字段存在且是数组
  if (!config.headers || !Array.isArray(config.headers)) {
    config.headers = [];
  }
  return config;
}

const localConfig = ref<Record<string, any>>(normalize(props.customHeadersConfig));

watch(
  () => props.customHeadersConfig,
  (newVal) => {
    localConfig.value = normalize(newVal);
  },
  { deep: true },
);

function updateParent() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}

function addHeader() {
  if (!localConfig.value.headers) {
    localConfig.value.headers = [];
  }
  localConfig.value.headers.push({ header_name: '', header_value: '' });
  updateParent();
}

function removeHeader(index: number) {
  localConfig.value.headers.splice(index, 1);
  updateParent();
}

function insertVariable(headerIndex: number, variable: string) {
  const header = localConfig.value.headers[headerIndex];
  if (header) {
    // 追加到值末尾
    header.header_value = (header.header_value || '') + variable;
    updateParent();
  }
}

function addPresetHeader(type: 'client_ip' | 'forwarded_for' | 'real_ip' | 'custom') {
  if (!localConfig.value.headers) {
    localConfig.value.headers = [];
  }

  let headerName = '';
  let headerValue = '';

  switch (type) {
    case 'client_ip':
      headerName = 'X-Real-IP';
      headerValue = '${client_ip}';
      break;
    case 'forwarded_for':
      headerName = 'X-Forwarded-For';
      headerValue = '${header:X-Forwarded-For}';
      break;
    case 'real_ip':
      headerName = 'X-Client-IP';
      headerValue = '${client_ip}';
      break;
    case 'custom':
      headerName = 'X-Custom-Header';
      headerValue = 'custom-value';
      break;
  }

  localConfig.value.headers.push({ header_name: headerName, header_value: headerValue });
  updateParent();
  MessagePlugin.success(t('page.host.custom_headers.add_success'));
}
</script>

<style scoped>
.variable-help {
  padding: 16px;
  background: var(--td-bg-color-container);
  border-radius: 6px;
}

.variable-section {
  margin-bottom: 16px;
}

.variable-section h4,
.quick-add-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.variable-section ul {
  margin: 0;
  padding-left: 20px;
}

.variable-section li {
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--td-text-color-secondary);
}

.variable-section code {
  padding: 2px 6px;
  background: var(--td-bg-color-component);
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--td-brand-color);
}

.headers-list {
  margin-top: 16px;
}

.headers-section {
  width: 100%;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-bottom: 12px;
  border-left: 3px solid var(--td-brand-color);
  padding-left: 8px;
}

.empty-hint {
  padding: 24px;
  text-align: center;
  color: var(--td-text-color-placeholder);
  background: var(--td-bg-color-container);
  border-radius: 6px;
  border: 1px dashed var(--td-border-level-2-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.headers-container {
  margin-bottom: 12px;
}

.header-item {
  margin-bottom: 12px;
  padding: 16px;
  background: var(--td-bg-color-container);
  border-radius: 6px;
  border: 1px solid var(--td-border-level-1-color);
  transition: all 0.2s ease;
}

.header-item:hover {
  border-color: var(--td-brand-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-item:last-child {
  margin-bottom: 0;
}

.header-item-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.header-field-group {
  flex: 1;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.header-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  font-weight: 500;
  line-height: 1.5;
}

.header-value-field {
  flex: 1;
}

.delete-btn {
  flex-shrink: 0;
  height: 32px;
}

.add-button-container {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--td-border-level-2-color);
}
</style>
