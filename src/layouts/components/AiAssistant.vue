<template>
  <div>
    <t-drawer v-model:visible="aiChatBoxVisible" :close-btn="true" size="500px" :header="t('page.gpt.assistant')">
      <div ref="chatContainer" class="chat-container">
        <div v-for="(item, index) in questionList" :key="index" class="message-wrapper" :class="item.role">
          <div class="message-bubble">
            <div class="avatar">
              <user-icon v-if="item.role === 'user'" />
              <logo-android-icon v-else />
            </div>
            <div class="content">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="text" v-html="convertMarkdown(item.content)"></div>
              <div v-if="item.loading" class="loading">...</div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="input-area">
          <t-textarea
            v-model="inputMessage"
            :placeholder="t('page.gpt.chat.chat_placeholder')"
            name="description"
            :autosize="{ minRows: 3, maxRows: 4 }"
            :disabled="isStreaming"
            @enter="!isStreaming && sendMessage()"
          >
          </t-textarea>
          <t-button v-if="!isStreaming" theme="primary" @click="sendMessage">
            {{ t('page.gpt.chat.chat_send') }}
          </t-button>
          <t-button v-else theme="danger" variant="outline" @click="stopStreaming">
            {{ t('page.gpt.chat.chat_stop') }}
          </t-button>
        </div>
      </template>
    </t-drawer>

    <t-sticky-tool :style="{ position: 'fixed', right: '20px', overflow: 'hidden', height: '70px' }" @click="openChat">
      <t-sticky-item :label="t('page.gpt.assistant')" :icon="renderChatIcon" />
    </t-sticky-tool>
  </div>
</template>

<script setup lang="ts">
import { h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import { ChatIcon, LogoAndroidIcon, UserIcon } from 'tdesign-icons-vue-next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import bus from '@/utils/bus';
import { fetchChatStream } from '@/utils/eventSource';

interface ChatItem {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

const { t } = useI18n();

const aiChatBoxVisible = ref(false);
const questionList = ref<ChatItem[]>([]);
const inputMessage = ref('');
const isStreaming = ref(false);
const chatContainer = ref<HTMLElement>();
let currentCtrl: AbortController | null = null;
let streamAborted = false;

const renderChatIcon = () => h(ChatIcon);

function onSendAi(e: any) {
  questionList.value = [];
  aiChatBoxVisible.value = true;
  inputMessage.value = String(e || '');
  sendMessage();
}

onMounted(() => {
  bus.on('sendAi', onSendAi);
});

onBeforeUnmount(() => {
  bus.off('sendAi', onSendAi);
});

// 将 Markdown 转换为 HTML（DOMPurify 清洗防 XSS）
function convertMarkdown(content: string) {
  return DOMPurify.sanitize(marked.parse(content || '') as string);
}

function sendMessage() {
  if (!inputMessage.value.trim()) return;

  const userMessage = inputMessage.value;
  inputMessage.value = '';

  // 添加用户消息
  questionList.value.push({ role: 'user', content: userMessage });
  // 添加机器人消息占位
  questionList.value.push({ role: 'assistant', content: '', loading: true });

  askQuestion(userMessage);
}

function askQuestion(q: string) {
  const ctrl = new AbortController();
  currentCtrl = ctrl;
  isStreaming.value = true;
  streamAborted = false;
  const answerIndex = questionList.value.length - 1;

  fetchChatStream({
    history: questionList.value,
    q,
    ctrl,
    onSuccess: (assistantMessage) => {
      const answer = questionList.value[answerIndex];
      answer.content += assistantMessage.content;
      goChatBottom();
    },
    onComplete: () => {
      isStreaming.value = false;
      currentCtrl = null;
      const answer = questionList.value[answerIndex];
      if (answer) {
        answer.loading = false;
        goChatBottom();
      }
    },
    onError: (errorMsg) => {
      isStreaming.value = false;
      currentCtrl = null;
      const answer = questionList.value[answerIndex];
      if (streamAborted) {
        // 用户主动中止：保留已输出内容，标记为已停止
        if (answer) {
          answer.loading = false;
          if (!answer.content) answer.content = '_(已中止)_';
          goChatBottom();
        }
      } else {
        // 真实错误：在气泡里展示错误，不删消息，让用户看到
        MessagePlugin.error(errorMsg);
        if (answer) {
          answer.loading = false;
          answer.content = answer.content || `⚠️ ${errorMsg}`;
          goChatBottom();
        }
      }
      streamAborted = false;
    },
  });
}

function stopStreaming() {
  if (currentCtrl) {
    streamAborted = true; // 先标记，让 onError 知道这是主动中止
    currentCtrl.abort();
    currentCtrl = null;
  }
  isStreaming.value = false;
}

function goChatBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

function openChat(context: { item: { label?: string } }) {
  if (context.item?.label === t('page.gpt.assistant')) {
    aiChatBoxVisible.value = true;
  }
}
</script>

<style scoped>
.chat-container {
  height: 60vh;
  overflow-y: auto;
  padding: 20px;
  background: var(--td-bg-color-container);
}

.message-wrapper {
  display: flex;
  margin: 12px 0;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 80%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.message-wrapper.user .message-bubble {
  flex-direction: row-reverse;
}

.avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--td-bg-color-component);
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  max-width: calc(100% - 44px);
}

.text {
  padding: 12px;
  border-radius: 6px;
  background: var(--td-bg-color-component);
  color: var(--td-text-color-primary);
  word-break: break-word;
}

.message-wrapper.user .text {
  background: var(--td-brand-color);
  color: var(--td-text-color-anti);
}

.loading {
  color: var(--td-text-color-secondary);
  font-size: 24px;
  padding: 12px;
}

.input-area {
  display: flex;
  gap: 12px;
  padding: 20px;
  background: var(--td-bg-color-container);
  border-top: 1px solid var(--td-component-border);
}
</style>
