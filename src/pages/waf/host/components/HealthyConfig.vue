<template>
  <div class="healthy-config">
    <t-form-item :label="t('page.host.health_check.is_enable_healthy')">
      <t-tooltip :content="t('page.host.health_check.is_enable_healthy_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-radio-group v-model="localHealthyConfig.is_enable_healthy" @change="updateParent">
          <t-radio value="0">{{ t('common.off') }}</t-radio>
          <t-radio value="1">{{ t('common.on') }}</t-radio>
        </t-radio-group>
      </t-tooltip>
    </t-form-item>

    <template v-if="localHealthyConfig.is_enable_healthy == '1'">
      <t-form-item :label="t('page.host.health_check.fail_count')">
        <t-tooltip :content="t('page.host.health_check.fail_count_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-input-number v-model="localHealthyConfig.fail_count" :style="{ width: '150px' }" :min="1" :max="10" @change="updateParent" />
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.health_check.success_count')">
        <t-tooltip :content="t('page.host.health_check.success_count_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-input-number v-model="localHealthyConfig.success_count" :style="{ width: '150px' }" :min="1" :max="10" @change="updateParent" />
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.health_check.response_time')">
        <t-tooltip :content="t('page.host.health_check.response_time_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-input-number v-model="localHealthyConfig.response_time" :style="{ width: '150px' }" :min="1" @change="updateParent" />
          <span style="margin-left: 8px">{{ t('page.host.health_check.seconds') }}</span>
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.health_check.check_method')">
        <t-select v-model="localHealthyConfig.check_method" :style="{ width: '150px' }" @change="updateParent">
          <t-option value="GET">GET</t-option>
          <t-option value="HEAD">HEAD</t-option>
        </t-select>
      </t-form-item>

      <t-form-item :label="t('page.host.health_check.check_path')">
        <t-input
          v-model="localHealthyConfig.check_path"
          :style="{ width: '480px' }"
          :placeholder="t('page.host.health_check.check_path_placeholder')"
          @change="updateParent"
        />
      </t-form-item>

      <t-form-item :label="t('page.host.health_check.expected_codes')">
        <t-input
          v-model="localHealthyConfig.expected_codes"
          :style="{ width: '480px' }"
          :placeholder="t('page.host.health_check.expected_codes_placeholder')"
          @change="updateParent"
        />
      </t-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ healthyConfig: Record<string, any> }>();
const emit = defineEmits<{ (e: 'update', config: Record<string, any>): void }>();

const { t } = useI18n();

// 本地副本，避免直接修改 props
const localHealthyConfig = ref<Record<string, any>>({});

watch(
  () => props.healthyConfig,
  (newVal) => {
    localHealthyConfig.value = JSON.parse(JSON.stringify(newVal));
  },
  { immediate: true },
);

function updateParent() {
  emit('update', JSON.parse(JSON.stringify(localHealthyConfig.value)));
}
</script>
