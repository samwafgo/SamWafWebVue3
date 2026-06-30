<template>
  <div class="csrf-config">
    <t-alert theme="info" :message="t('page.host.csrf.intro')" style="margin-bottom: 16px" />
    <t-form-item :label="t('page.host.csrf.is_enable')">
      <t-radio-group v-model="local.is_enable" @change="updateParent">
        <t-radio value="0">{{ t('page.host.csrf.disable') }}</t-radio>
        <t-radio value="1">{{ t('page.host.csrf.enable') }}</t-radio>
      </t-radio-group>
      <t-button size="small" variant="outline" style="margin-left: 12px" @click="applyRecommended">
        {{ t('page.host.csrf.recommended') }}
      </t-button>
    </t-form-item>
    <t-form-item :label="t('page.host.csrf.protect_methods')">
      <t-tooltip :content="t('page.host.csrf.protect_methods_tips')" placement="top" :overlay-style="{ width: '320px' }" show-arrow>
        <t-checkbox-group v-model="local.protect_methods" @change="updateParent">
          <t-checkbox value="POST">POST</t-checkbox>
          <t-checkbox value="PUT">PUT</t-checkbox>
          <t-checkbox value="DELETE">DELETE</t-checkbox>
          <t-checkbox value="PATCH">PATCH</t-checkbox>
        </t-checkbox-group>
      </t-tooltip>
    </t-form-item>
    <t-form-item :label="t('page.host.csrf.allowed_origins')">
      <t-tooltip :content="t('page.host.csrf.allowed_origins_tips')" placement="top" :overlay-style="{ width: '360px' }" show-arrow>
        <t-textarea
          v-model="local.allowed_origins"
          :placeholder="t('page.host.csrf.allowed_origins_ph')"
          :autosize="{ minRows: 2, maxRows: 5 }"
          :style="{ width: '480px' }"
          @blur="updateParent"
        />
      </t-tooltip>
    </t-form-item>
    <t-form-item :label="t('page.host.csrf.allow_empty_ref')">
      <t-tooltip :content="t('page.host.csrf.allow_empty_ref_tips')" placement="top" :overlay-style="{ width: '340px' }" show-arrow>
        <t-radio-group v-model="local.allow_empty_ref" @change="updateParent">
          <t-radio value="1">{{ t('page.host.csrf.allow_empty_ref_pass') }}</t-radio>
          <t-radio value="0">{{ t('page.host.csrf.allow_empty_ref_block') }}</t-radio>
        </t-radio-group>
      </t-tooltip>
    </t-form-item>
    <t-form-item :label="t('page.host.csrf.exclude_paths')">
      <t-tooltip :content="t('page.host.csrf.exclude_paths_tips')" placement="top" :overlay-style="{ width: '360px' }" show-arrow>
        <t-textarea
          v-model="local.exclude_paths"
          :placeholder="t('page.host.csrf.exclude_paths_ph')"
          :autosize="{ minRows: 2, maxRows: 5 }"
          :style="{ width: '480px' }"
          @blur="updateParent"
        />
      </t-tooltip>
    </t-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ csrfConfig: Record<string, any> }>();
const emit = defineEmits<{ (e: 'update', config: Record<string, any>): void }>();

const { t } = useI18n();

const local = ref<Record<string, any>>(JSON.parse(JSON.stringify(props.csrfConfig)));

watch(
  () => props.csrfConfig,
  (newVal) => {
    local.value = JSON.parse(JSON.stringify(newVal));
  },
  { deep: true },
);

function updateParent() {
  emit('update', { ...local.value });
}

function applyRecommended() {
  local.value = {
    is_enable: '1',
    protect_methods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    allowed_origins: local.value.allowed_origins || '',
    allow_empty_ref: '1',
    exclude_paths: local.value.exclude_paths || '',
  };
  updateParent();
}
</script>
