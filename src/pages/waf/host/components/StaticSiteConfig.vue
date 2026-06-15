<template>
  <div class="static-site-config">
    <t-form-item :label="t('page.host.static_site.is_enable')">
      <t-radio-group v-model="localConfig.is_enable_static_site" @change="updateParent">
        <t-radio value="0">{{ t('common.off') }}</t-radio>
        <t-radio value="1">{{ t('common.on') }}</t-radio>
      </t-radio-group>
    </t-form-item>

    <!-- 仅主机全局静态站点需要的路径字段 -->
    <t-form-item v-if="localConfig.is_enable_static_site == '1'" :label="t('page.host.static_site.static_site_path')">
      <t-tooltip :content="t('page.host.static_site.static_site_path_tips')" placement="top" :overlay-style="{ width: '300px' }" show-arrow>
        <t-input v-model="localConfig.static_site_path" :placeholder="t('page.host.static_site.static_site_path_placeholder')" @change="updateParent" />
      </t-tooltip>
    </t-form-item>

    <t-form-item v-if="localConfig.is_enable_static_site == '1'" :label="t('page.host.static_site.static_site_prefix')">
      <t-tooltip :content="t('page.host.static_site.static_site_prefix_tips')" placement="top" :overlay-style="{ width: '300px' }" show-arrow>
        <t-input v-model="localConfig.static_site_prefix" :placeholder="t('page.host.static_site.static_site_prefix_placeholder')" @change="updateParent" />
      </t-tooltip>
    </t-form-item>

    <!-- 安全配置区域：始终显示，同时作用于主机全局静态和路径规则静态文件服务 -->
    <t-divider align="left" style="margin: 16px 0 8px">{{ t('page.host.static_site.security_section_title') }}</t-divider>
    <t-form-item>
      <t-alert theme="info" :message="t('page.host.static_site_security_shared_tips')" style="margin-bottom: 12px" />
    </t-form-item>

    <t-form-item :label="t('page.host.static_site.sensitive_paths')">
      <t-tooltip :content="t('page.host.static_site.sensitive_paths_tips')" placement="top" :overlay-style="{ width: '400px' }" show-arrow>
        <t-textarea
          v-model="localConfig.sensitive_paths"
          :placeholder="t('page.host.static_site.sensitive_paths_placeholder')"
          :autosize="{ minRows: 3, maxRows: 3 }"
          @change="updateParent"
        />
      </t-tooltip>
    </t-form-item>

    <t-form-item :label="t('page.host.static_site.sensitive_extensions')">
      <t-tooltip :content="t('page.host.static_site.sensitive_extensions_tips')" placement="top" :overlay-style="{ width: '400px' }" show-arrow>
        <t-input v-model="localConfig.sensitive_extensions" :placeholder="t('page.host.static_site.sensitive_extensions_placeholder')" @change="updateParent" />
      </t-tooltip>
    </t-form-item>

    <t-form-item :label="t('page.host.static_site.allowed_extensions')">
      <t-tooltip :content="t('page.host.static_site.allowed_extensions_tips')" placement="top" :overlay-style="{ width: '400px' }" show-arrow>
        <t-input v-model="localConfig.allowed_extensions" :placeholder="t('page.host.static_site.allowed_extensions_placeholder')" @change="updateParent" />
      </t-tooltip>
    </t-form-item>

    <t-form-item :label="t('page.host.static_site.sensitive_patterns')">
      <t-tooltip :content="t('page.host.static_site.sensitive_patterns_tips')" placement="top" :overlay-style="{ width: '400px' }" show-arrow>
        <t-textarea
          v-model="localConfig.sensitive_patterns"
          :placeholder="t('page.host.static_site.sensitive_patterns_placeholder')"
          :autosize="{ minRows: 3, maxRows: 3 }"
          @change="updateParent"
        />
      </t-tooltip>
    </t-form-item>

    <!-- 安全响应头配置 -->
    <t-form-item>
      <template #label>
        <t-tooltip :content="t('page.host.static_site.security_headers_tips')" placement="top" :overlay-style="{ width: '420px' }" show-arrow>
          <span>{{ t('page.host.static_site.security_headers') }}</span>
        </t-tooltip>
      </template>
      <div class="security-headers-wrapper">
        <div v-if="localConfig.security_headers && localConfig.security_headers.length > 0">
          <div v-for="(header, index) in localConfig.security_headers" :key="index" class="security-header-row">
            <t-input
              v-model="header.header_name"
              :placeholder="t('page.host.static_site.security_header_name')"
              class="header-name-input"
              @change="updateParent"
            />
            <t-input
              v-model="header.header_value"
              :placeholder="t('page.host.static_site.security_header_value')"
              class="header-value-input"
              @change="updateParent"
            />
            <t-button theme="danger" variant="text" @click="removeSecurityHeader(index)">
              {{ t('page.host.static_site.security_header_delete') }}
            </t-button>
          </div>
        </div>
        <div v-else class="security-headers-empty">
          <t-tag theme="default" variant="light">{{ t('common.default_value') || '使用系统默认' }}</t-tag>
        </div>
        <div class="security-header-actions">
          <t-button theme="primary" variant="outline" size="small" @click="addSecurityHeader">
            + {{ t('page.host.static_site.security_header_add') }}
          </t-button>
          <t-button theme="default" variant="outline" size="small" @click="resetSecurityHeaders">
            {{ t('page.host.static_site.security_headers_reset') }}
          </t-button>
        </div>
      </div>
    </t-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const DEFAULT_SECURITY_HEADERS = [
  { header_name: 'X-Content-Type-Options', header_value: 'nosniff' },
  { header_name: 'X-Frame-Options', header_value: 'DENY' },
  { header_name: 'X-XSS-Protection', header_value: '1; mode=block' },
  { header_name: 'Referrer-Policy', header_value: 'strict-origin-when-cross-origin' },
  { header_name: 'Content-Security-Policy', header_value: "default-src 'self'" },
  { header_name: 'Cache-Control', header_value: 'public, max-age=3600' },
];

const props = defineProps<{ staticSiteConfig: Record<string, any> }>();
const emit = defineEmits<{ (e: 'update', config: Record<string, any>): void }>();

const { t } = useI18n();

const localConfig = ref<Record<string, any>>({});

watch(
  () => props.staticSiteConfig,
  (newVal) => {
    localConfig.value = JSON.parse(JSON.stringify(newVal));
    if (!Array.isArray(localConfig.value.security_headers)) {
      localConfig.value.security_headers = [];
    }
  },
  { immediate: true },
);

function updateParent() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}

function addSecurityHeader() {
  if (!Array.isArray(localConfig.value.security_headers)) {
    localConfig.value.security_headers = [];
  }
  localConfig.value.security_headers.push({ header_name: '', header_value: '' });
  updateParent();
}

function removeSecurityHeader(index: number) {
  localConfig.value.security_headers.splice(index, 1);
  updateParent();
}

function resetSecurityHeaders() {
  localConfig.value.security_headers = JSON.parse(JSON.stringify(DEFAULT_SECURITY_HEADERS));
  updateParent();
}
</script>

<style scoped>
.static-site-config .t-form-item {
  margin-bottom: 16px;
}

.security-headers-wrapper {
  width: 100%;
}

.security-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.security-header-row .header-name-input {
  width: 220px;
  flex-shrink: 0;
}

.security-header-row .header-value-input {
  flex: 1;
}

.security-headers-empty {
  margin-bottom: 8px;
}

.security-header-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
