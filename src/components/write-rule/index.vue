<template>
  <div class="in-coder-panel">
    <codemirror
      v-model="code"
      :style="{ height: '180px', width: '100%' }"
      :autofocus="false"
      :indent-with-tab="true"
      :tab-size="4"
      :extensions="extensions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { basicSetup } from 'codemirror';

const props = withDefaults(defineProps<{ valuecontent?: string }>(), { valuecontent: '' });
const emit = defineEmits<{ (e: 'edtinput', content: string): void }>();

const code = ref(props.valuecontent || '');

const extensions = [basicSetup];

// 父组件内容变化时同步到编辑器
watch(
  () => props.valuecontent,
  (newVal) => {
    if (newVal !== code.value) {
      code.value = newVal ?? '';
    }
  },
);

// 编辑器内容变化时通知父组件
watch(code, (newVal) => {
  emit('edtinput', newVal);
});
</script>

<style scoped>
.in-coder-panel {
  border-radius: 5px;
  flex-grow: 1;
  display: flex;
  position: relative;
  border: 1px solid var(--td-component-stroke);
}

.in-coder-panel :deep(.cm-editor) {
  flex-grow: 1;
  font-size: 13px;
}
</style>
