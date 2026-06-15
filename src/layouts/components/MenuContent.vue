<template>
  <template v-for="item in list" :key="item.path">
    <t-submenu v-if="item.children && item.children.length" :value="item.path" :title="t(item.title)">
      <template v-if="item.icon" #icon>
        <component :is="item.icon" />
      </template>
      <MenuContent :nav-data="item.children" />
    </t-submenu>
    <t-menu-item v-else :value="item.path">
      <template v-if="item.icon" #icon>
        <component :is="item.icon" />
      </template>
      {{ t(item.title) }}
    </t-menu-item>
  </template>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import type { RouteRecordRaw } from 'vue-router';

export interface MenuNode {
  path: string;
  title: string;
  icon?: Component;
  children?: MenuNode[];
}

const props = defineProps<{
  // 既支持原始路由记录，也支持已转换的菜单节点（递归时传入）
  navData: (RouteRecordRaw | MenuNode)[];
  basePath?: string;
}>();

const { t } = useI18n();

function joinPath(base: string, path: string): string {
  if (path.startsWith('/')) return path;
  return `${base.replace(/\/$/, '')}/${path}`;
}

/** 把路由记录转换为菜单节点，过滤 hidden 与无标题项 */
function toMenuNodes(items: (RouteRecordRaw | MenuNode)[], base: string): MenuNode[] {
  return items
    .map((item) => {
      if (!('meta' in item) && !('component' in item) && 'title' in item) {
        return item as MenuNode; // 已是菜单节点
      }
      const route = item as RouteRecordRaw;
      if (route.meta?.hidden || !route.meta?.title) return null;
      const fullPath = joinPath(base, route.path);
      const children = route.children?.length ? toMenuNodes(route.children, fullPath) : undefined;
      return {
        path: fullPath,
        title: route.meta.title,
        icon: route.meta.icon,
        children: children && children.length ? children : undefined,
      };
    })
    .filter((item): item is MenuNode => item !== null);
}

const list = computed(() => toMenuNodes(props.navData, props.basePath || ''));
</script>
