<template>
  <t-alert theme="warning" :message="`${moduleName}（Vue3 版本迁移中，请暂时使用旧版页面操作）`" />
</template>

<script setup lang="ts">
// 跨里程碑页面的临时占位组件：对应模块迁移完成后替换回真实组件
withDefaults(defineProps<{ moduleName?: string }>(), { moduleName: '该功能模块' });
</script>
