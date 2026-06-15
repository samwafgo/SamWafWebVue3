<template>
  <div>
    <t-card class="list-card-container">
      <t-list :split="true">
        <t-list-item v-for="(runtime, index) in runtimes" :key="index">
          <t-list-item-meta :title="runtime.name">
            <template #description>
              <pre>{{ runtime.value }}</pre>
            </template>
          </t-list-item-meta>
        </t-list-item>
      </t-list>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { wafStatRuntimeSysinfoapi } from '@/apis/stats';

const runtimes = ref<{ name: string; value: string }[]>([]);

onMounted(() => {
  loadRunTimeSysinfo();
});

function loadRunTimeSysinfo() {
  wafStatRuntimeSysinfoapi()
    .then((res) => {
      runtimes.value = res.data;
    })
    .catch((e: Error) => {
      console.log(e);
    });
}
</script>

<style scoped>
.list-card-container {
  padding: 16px;
}
</style>
