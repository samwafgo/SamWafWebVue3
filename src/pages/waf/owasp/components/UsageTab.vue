<template>
  <div class="usage-doc">
    <t-alert v-if="loading" theme="info" :message="t('common.loading')" />
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="md-content" v-html="html" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import { owaspUsageDocApi } from '@/apis/owasp';

const { t } = useI18n();

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 极简 Markdown -> HTML 转换（避免为静态内容引第三方依赖）
function renderMarkdown(md: string): string {
  if (!md) return '';
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  const renderInline = (line: string) => {
    let s = escapeHtml(line);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  };

  for (const raw of lines) {
    if (raw.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }
    if (/^#{1,6} /.test(raw)) {
      closeList();
      const m = raw.match(/^(#{1,6})\s+(.*)$/);
      if (m) {
        const level = m[1].length;
        out.push(`<h${level}>${renderInline(m[2])}</h${level}>`);
      }
      continue;
    }
    if (/^\s*[-*]\s+/.test(raw)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${renderInline(raw.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (!raw.trim()) {
      closeList();
      out.push('');
      continue;
    }
    closeList();
    out.push(`<p>${renderInline(raw)}</p>`);
  }
  closeList();
  if (inCode) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
  }
  return out.join('\n');
}

const loading = ref(false);
const html = ref('');

onMounted(() => {
  load();
});

function load() {
  loading.value = true;
  owaspUsageDocApi()
    .then((res) => {
      if (res.code === 0) {
        html.value = renderMarkdown(res.data.content || '');
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>

<style scoped>
.usage-doc {
  padding: 8px;
  max-height: 72vh;
  overflow: auto;
}

.md-content {
  line-height: 1.75;
}

.md-content :deep(h1),
.md-content :deep(h2),
.md-content :deep(h3),
.md-content :deep(h4) {
  margin-top: 18px;
  margin-bottom: 8px;
}

.md-content :deep(pre) {
  background: var(--td-bg-color-container-hover);
  padding: 10px 12px;
  border-radius: 4px;
  overflow-x: auto;
}

.md-content :deep(code) {
  background: var(--td-bg-color-container-hover);
  padding: 1px 4px;
  border-radius: 3px;
}

.md-content :deep(ul) {
  padding-left: 20px;
}
</style>
