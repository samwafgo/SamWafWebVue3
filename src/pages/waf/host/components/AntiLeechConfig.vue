<template>
  <div class="anti-leech-config">
    <t-form-item :label="t('page.host.anti_leech.is_enable')">
      <t-radio-group v-model="localConfig.is_enable_anti_leech" @change="updateParent">
        <t-radio value="0">{{ t('common.off') }}</t-radio>
        <t-radio value="1">{{ t('common.on') }}</t-radio>
      </t-radio-group>
    </t-form-item>
    <t-form-item v-if="localConfig.is_enable_anti_leech == '1'" :label="t('page.host.anti_leech.file_types')">
      <t-input v-model="localConfig.file_types" :placeholder="t('page.host.anti_leech.file_types_placeholder')" @change="updateParent" />
    </t-form-item>
    <t-form-item v-if="localConfig.is_enable_anti_leech == '1'" :label="t('page.host.anti_leech.valid_referers')">
      <t-textarea v-model="localConfig.valid_referers" :placeholder="t('page.host.anti_leech.valid_referers_placeholder')" @change="updateParent" />
    </t-form-item>
    <t-form-item v-if="localConfig.is_enable_anti_leech == '1'">
      <t-alert theme="info" :message="t('page.host.anti_leech.valid_referers_desc')" style="margin-top: 4px" />
    </t-form-item>
    <t-form-item v-if="localConfig.is_enable_anti_leech == '1'" :label="t('page.host.anti_leech.action')">
      <t-radio-group v-model="localConfig.action" @change="updateParent">
        <t-radio value="block">{{ t('page.host.anti_leech.action_block') }}</t-radio>
        <t-radio value="redirect">{{ t('page.host.anti_leech.action_redirect') }}</t-radio>
      </t-radio-group>
    </t-form-item>
    <t-form-item
      v-if="localConfig.is_enable_anti_leech == '1' && localConfig.action === 'redirect'"
      :label="t('page.host.anti_leech.redirect_url')"
    >
      <t-input v-model="localConfig.redirect_url" :placeholder="t('page.host.anti_leech.redirect_url_placeholder')" @change="updateParent" />
    </t-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ antiLeechConfig: Record<string, any> }>();
const emit = defineEmits<{ (e: 'update', config: Record<string, any>): void }>();

const { t } = useI18n();

const localConfig = ref<Record<string, any>>({});

watch(
  () => props.antiLeechConfig,
  (newVal) => {
    localConfig.value = JSON.parse(JSON.stringify(newVal));
  },
  { immediate: true },
);

function updateParent() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}
</script>
