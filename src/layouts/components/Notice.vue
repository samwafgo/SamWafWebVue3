<template>
  <t-popup expand-animation placement="bottom-right" trigger="click" :visible="isNoticeVisible" @visible-change="onPopupVisibleChange">
    <template #content>
      <div class="header-msg">
        <div class="header-msg-top">
          <p>{{ t('page.notice.notice_title') }}</p>
          <t-button v-if="unreadMsg.length > 0" class="clear-btn" variant="text" theme="primary" @click="setRead('all')">{{
            t('page.notice.clear')
          }}</t-button>
        </div>
        <t-list v-if="unreadMsg.length > 0" class="narrow-scrollbar" :split="true">
          <t-list-item v-for="(item, index) in unreadMsg" :key="index">
            <div>
              <p class="msg-content">{{ item.message_data }}</p>
              <p class="msg-type">{{ item.message_type }}</p>
            </div>
            <p class="msg-time">{{ item.message_datetime }}</p>
            <template #action>
              <t-button size="small" variant="outline" @click="setRead('radio', item)"> {{ t('page.notice.set_read') }} </t-button>
            </template>
          </t-list-item>
        </t-list>

        <div v-else class="empty-list">
          <p>{{ t('page.notice.empty') }}</p>
        </div>
      </div>
    </template>
    <t-badge :count="unreadMsg.length" :offset="[15, 21]">
      <t-button theme="default" shape="square" variant="text" @click="isNoticeVisible = true">
        <notification-icon />
      </t-button>
    </t-badge>
  </t-popup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NotificationIcon } from 'tdesign-icons-vue-next';

import { useNotificationStore } from '@/store/modules/notification';
import type { NotificationMsg } from '@/store/modules/notification';

const { t } = useI18n();
const notificationStore = useNotificationStore();

const isNoticeVisible = ref(false);
const unreadMsg = computed(() => notificationStore.unreadMsg);

function onPopupVisibleChange(visible: boolean, context: any) {
  if (context?.trigger === 'trigger-element-click') {
    isNoticeVisible.value = true;
    return;
  }
  isNoticeVisible.value = visible;
}

function setRead(type: 'all' | 'radio', item?: NotificationMsg) {
  notificationStore.setRead(type, item);
}
</script>

<style scoped>
.header-msg {
  width: 400px;
  height: 500px;
}

.header-msg .empty-list {
  height: calc(100% - 104px);
  text-align: center;
  padding-top: 200px;
  font-size: 14px;
  color: var(--td-text-color-secondary);
}

.header-msg-top {
  position: relative;
  height: 56px;
  font-size: 16px;
  color: var(--td-text-color-primary);
  text-align: center;
  line-height: 56px;
  border-bottom: 1px solid var(--td-component-border);
}

.header-msg-top .clear-btn {
  position: absolute;
  top: 12px;
  right: 24px;
}

.header-msg .t-list {
  height: calc(100% - 56px);
}

.header-msg :deep(.t-list-item) {
  overflow: hidden;
  width: 100%;
  padding: 16px 24px;
  font-size: 14px;
  color: var(--td-text-color-primary);
  line-height: 22px;
  cursor: pointer;
}

.header-msg :deep(.t-list-item:hover) {
  transition: background 0.2s ease;
  background: var(--td-bg-color-container-hover);
}

.msg-content {
  margin-bottom: 16px;
}

.msg-type {
  color: var(--td-text-color-secondary);
}

.msg-time {
  position: absolute;
  right: 24px;
  bottom: 16px;
  color: var(--td-text-color-secondary);
}
</style>
