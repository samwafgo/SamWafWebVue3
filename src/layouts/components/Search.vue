<template>
  <div class="header-menu-search-left">
    <t-select
      v-model="searchData"
      class="header-search"
      filterable
      clearable
      :filter="filterSearch"
      :options="searchOptions"
      :placeholder="t('common.search')"
      @change="handleNavigate"
    >
      <template #prefix-icon>
        <search-icon size="16" />
      </template>
    </t-select>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { SearchIcon } from 'tdesign-icons-vue-next';

interface SearchOption {
  value: string;
  label: string;
}

const { t } = useI18n();
const router = useRouter();

const searchData = ref<string | null>(null);

const searchOptions = computed<SearchOption[]>(() => {
  const options: SearchOption[] = [];
  const allRoutes = (router.options.routes || []) as any[];

  const flatten = (routes: any[], parentPath: string, parentLabel: string) => {
    for (const route of routes) {
      // 根布局没有 meta，但需要继续展开 children
      if (route.meta?.hidden) continue;
      const path = route.path.startsWith('/') ? route.path : parentPath ? `${parentPath}/${route.path}` : route.path;
      const label = route.meta?.title ? t(route.meta.title) : '';
      if (route.children?.length) {
        flatten(route.children, path, label || parentLabel);
      } else if (route.meta?.title) {
        const display = parentLabel && parentLabel !== label ? `${parentLabel} / ${label}` : label;
        options.push({ value: path, label: display });
      }
    }
  };
  flatten(allRoutes, '', '');
  return options;
});

function filterSearch(filterWords: string, option: any): boolean {
  if (!filterWords) return true;
  return String(option.label).toLowerCase().includes(filterWords.toLowerCase());
}

function handleNavigate(path: any) {
  if (!path) return;
  router.push(String(path)).catch(() => {});
  searchData.value = null;
}
</script>

<style scoped>
.header-menu-search-left {
  display: flex;
  align-items: center;
}

.header-search {
  width: 200px;
}

.header-search :deep(.t-input) {
  border: 0;
}

.header-search :deep(.t-input:focus) {
  box-shadow: none;
}
</style>
