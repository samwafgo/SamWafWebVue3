<template>
  <div class="doc-container">
    <iframe :src="docUrl" class="doc-iframe" frameborder="0" />
  </div>
</template>

<script setup lang="ts">
const docUrl = 'https://doc.samwaf.com/api/';
</script>

<style scoped>
.doc-container {
  width: 100%;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.doc-iframe {
  width: 100%;
  flex: 1;
  border: none;
}
</style>
