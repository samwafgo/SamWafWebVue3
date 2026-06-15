<template>
  <div class="cache-config">
    <t-form-item :label="t('page.host.cache.is_enable')">
      <t-radio-group v-model="localConfig.is_enable_cache" @change="updateParent">
        <t-radio value="0">{{ t('common.off') }}</t-radio>
        <t-radio value="1">{{ t('common.on') }}</t-radio>
      </t-radio-group>
    </t-form-item>
    <t-form-item v-if="localConfig.is_enable_cache == '1'" :label="t('page.host.cache.cache_location')">
      <t-radio-group v-model="localConfig.cache_location" @change="updateParent">
        <t-radio value="memory">{{ t('page.host.cache.cache_location_memory') }}</t-radio>
        <t-radio value="file">{{ t('page.host.cache.cache_location_file') }}</t-radio>
        <t-radio value="all">{{ t('page.host.cache.cache_location_all') }}</t-radio>
      </t-radio-group>
    </t-form-item>
    <t-form-item
      v-if="localConfig.is_enable_cache == '1' && (localConfig.cache_location === 'file' || localConfig.cache_location === 'all')"
      :label="t('page.host.cache.cache_dir')"
    >
      <t-input v-model="localConfig.cache_dir" :placeholder="t('page.host.cache.cache_dir_placeholder')" @change="updateParent" />
    </t-form-item>
    <t-form-item
      v-if="localConfig.is_enable_cache == '1' && (localConfig.cache_location === 'file' || localConfig.cache_location === 'all')"
      :label="t('page.host.cache.max_file_size_mb')"
    >
      <t-input v-model="localConfig.max_file_size_mb" :placeholder="t('page.host.cache.max_file_size_mb_placeholder')" @change="updateParent" />
    </t-form-item>
    <t-form-item
      v-if="localConfig.is_enable_cache == '1' && (localConfig.cache_location === 'memory' || localConfig.cache_location === 'all')"
      :label="t('page.host.cache.max_memory_size_mb')"
    >
      <t-input v-model="localConfig.max_memory_size_mb" :placeholder="t('page.host.cache.max_memory_size_mb_placeholder')" @change="updateParent" />
    </t-form-item>
    <t-form-item v-if="localConfig.is_enable_cache == '1'" class="cache-rule-container">
      <cache-rule :prop-host-code="propHostCode" />
    </t-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CacheRule from '@/pages/waf/cache_rule/index.vue';

const props = defineProps<{
  cacheConfig: Record<string, any>;
  propHostCode: string;
}>();
const emit = defineEmits<{ (e: 'update', config: Record<string, any>): void }>();

const { t } = useI18n();

const localConfig = ref<Record<string, any>>({});

watch(
  () => props.cacheConfig,
  (newVal) => {
    localConfig.value = JSON.parse(JSON.stringify(newVal));
  },
  { immediate: true },
);

function updateParent() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}
</script>

<style scoped>
.cache-rule-container {
  width: 100%;
  overflow-x: auto;
  max-width: 100%;
}

.cache-rule-container :deep(.t-form__item-content) {
  width: 100%;
  overflow-x: auto;
}
</style>
