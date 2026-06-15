<template>
  <t-breadcrumb v-if="crumbs.length" max-item-width="150" class="app-breadcrumb">
    <t-breadcrumb-item v-for="(item, index) in crumbs" :key="item.path" :to="index < crumbs.length - 1 ? item.path : undefined">
      {{ t(item.title) }}
    </t-breadcrumb-item>
  </t-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const { t } = useI18n();

const crumbs = computed(() =>
  route.matched
    .filter((record) => record.meta?.title)
    .map((record) => ({
      path: record.path || '/',
      title: record.meta.title as string,
    })),
);
</script>

<style scoped>
.app-breadcrumb {
  margin-bottom: 16px;
}
</style>
