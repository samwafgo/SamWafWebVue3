<template>
  <div class="path-rule-config">
    <path-rule :prop-host-code="propHostCode" />
  </div>
</template>

<script setup lang="ts">
import PathRule from '@/pages/waf/path_rule/index.vue';

defineProps<{ propHostCode: string }>();
</script>

<style scoped>
.path-rule-config {
  width: 100%;
  overflow-x: auto;
}
</style>
