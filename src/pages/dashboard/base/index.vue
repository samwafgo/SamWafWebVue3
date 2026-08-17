<template>
  <div class="dashboard-page">
    <t-swiper
      v-if="tipsVisable"
      class="tips-container"
      :duration="300"
      :interval="5000"
      :navigation="navigation"
      trigger="click"
    >
      <t-swiper-item v-for="(item, index) in visibleTips" :key="index">
        <t-alert :theme="item.tipsType" :message="t(item.message)">
          <template #operation>
            <span v-if="item.name === 'emptyHost'" class="tips-link" @click="handleCreateWebOperation">{{
              t('dashboard.tip_create_website_link')
            }}</span>
            <span v-if="item.name === 'defaultAccount'" class="tips-link" @click="handleModifyDefaultPassWebOperation">{{
              t('dashboard.tip_modify_pwd_link')
            }}</span>
            <span v-if="item.name === 'emptyOtp'" class="tips-link" @click="handleModify2FaWebOperation">{{
              t('dashboard.tip_empty_otp_link')
            }}</span>
          </template>
        </t-alert>
      </t-swiper-item>
    </t-swiper>

    <!-- 系统公告 -->
    <t-card v-if="announcements.length > 0" class="announcement-card row-container">
      <template #title>
        <div class="announcement-title">
          <notification-icon class="announcement-title__icon" />
          <span>{{ t('dashboard.announcement_title') }}</span>
          <t-tag class="announcement-title__count" theme="primary" variant="light" size="small">{{
            announcements.length
          }}</t-tag>
        </div>
      </template>
      <t-list :split="false">
        <t-list-item v-for="(item, index) in announcements" :key="index" class="announcement-item">
          <div class="announcement-wrapper">
            <div class="announcement-left">
              <t-tag class="announcement-tag" theme="primary" variant="light">{{ item.type }}</t-tag>
              <span class="announcement-text">{{ item.content }}</span>
              <t-tag v-if="index === 0" class="announcement-new" theme="danger" variant="light" size="small">{{
                t('dashboard.announcement_new')
              }}</t-tag>
              <t-link
                v-if="item.link"
                theme="primary"
                hover="color"
                class="announcement-link"
                @click="handleAnnouncementLink(item)"
              >
                {{ t('dashboard.announcement_detail') }}
              </t-link>
            </div>
            <div class="announcement-right">
              <calendar-icon class="announcement-date__icon" />
              <span class="announcement-date">{{ item.date }}</span>
            </div>
          </div>
        </t-list-item>
      </t-list>
    </t-card>

    <!-- 顶部指标卡片 -->
    <top-panel class="row-container" />
    <!-- 中部图表 -->
    <middle-chart class="row-container" />
    <!-- 列表排名 -->
    <rank-list class="row-container" />
  </div>
</template>

<script setup lang="ts">
import { CalendarIcon, NotificationIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import TopPanel from './components/TopPanel.vue';
import MiddleChart from './components/MiddleChart.vue';
import RankList from './components/RankList.vue';
import { wafStatSysinfoapi } from '@/apis/stats';
import { GetAnnouncementApi } from '@/apis/sysinfo';

const { t } = useI18n();
const router = useRouter();

const navigation = {
  type: 'bars' as const,
  size: 'small' as const,
  showSlideBtn: 'never' as const,
  placement: 'inside' as const,
};

const tipsVisable = ref(false);
const tips = ref([
  {
    name: 'emptyHost',
    visable: false,
    message: 'dashboard.tip_create_website_title',
    tipsType: 'success' as const,
  },
  {
    name: 'defaultAccount',
    visable: false,
    message: 'dashboard.tip_modify_pwd_title',
    tipsType: 'error' as const,
  },
  {
    name: 'emptyOtp',
    visable: false,
    message: 'dashboard.tip_empty_otp_title',
    tipsType: 'error' as const,
  },
]);

const visibleTips = computed(() => tips.value.filter((item) => item.visable));

// 系统公告数据
const announcements = ref<Record<string, any>[]>([]);

onMounted(() => {
  loadSysInfo();
  // 异步加载公告
  Promise.resolve().then(() => {
    loadAnnouncements();
  });
});

// 引导创建网站
function handleCreateWebOperation() {
  router.push({
    path: '/waf-host/wafhost',
    query: { sourcePage: 'HomeFrist' },
  });
}

// 引导修改默认密码
function handleModifyDefaultPassWebOperation() {
  router.push({
    path: '/account/Account',
    query: { sourcePage: 'HomeFrist' },
  });
}

// 引导用户去设置2fa
function handleModify2FaWebOperation() {
  router.push({
    path: '/account/OTP',
    query: { sourcePage: 'HomeFirst' },
  });
}

function loadSysInfo() {
  wafStatSysinfoapi({})
    .then((res) => {
      tips.value[0].visable = res.data.is_empty_host;
      tips.value[1].visable = res.data.is_default_account;
      tips.value[2].visable = res.data.is_empty_otp;
      tipsVisable.value = tips.value[0].visable || tips.value[1].visable || tips.value[2].visable;
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 加载公告信息
function loadAnnouncements() {
  GetAnnouncementApi({}).then((res) => {
    if (res.code === 0 && res.data.code === 'success') {
      // 将data字符串转换成json对象
      const json = JSON.parse(res.data.data);
      announcements.value = json.announcements;
    }
  });
}

// 点击公告链接
function handleAnnouncementLink(item: Record<string, any>) {
  if (item.link) {
    if (item.link.startsWith('/')) {
      router.push(item.link);
    } else {
      window.open(item.link, '_blank');
    }
  }
}
</script>

<style scoped>
.dashboard-page :deep(.t-row) {
  row-gap: 16px;
}

.row-container {
  margin-bottom: 16px;
}

.tips-container {
  margin-bottom: 16px;
}

.tips-container .tips-link {
  color: var(--td-brand-color);
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
}

.tips-container .tips-link:hover {
  text-decoration: underline;
}

/* 系统公告 */
.announcement-card {
  padding: 8px;
  border-radius: var(--td-radius-large);
}

.announcement-card :deep(.t-card__header) {
  padding-bottom: 8px;
}

.announcement-card :deep(.t-card__title) {
  font-size: 16px;
  font-weight: 600;
}

.announcement-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.announcement-title__icon {
  color: var(--td-brand-color);
  font-size: 18px;
}

.announcement-title__count {
  min-width: 20px;
  justify-content: center;
}

.announcement-item {
  padding: 12px 4px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.announcement-item:hover {
  background: var(--td-bg-color-container-hover);
}

.announcement-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.announcement-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.announcement-tag {
  margin-right: 12px;
  min-width: 70px;
  text-align: center;
  flex: none;
}

.announcement-new {
  margin-left: 8px;
  flex: none;
}

.announcement-text {
  font-size: 14px;
  color: var(--td-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.announcement-right {
  margin-left: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.announcement-date {
  color: var(--td-text-color-placeholder);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.announcement-date__icon {
  color: var(--td-text-color-placeholder);
  font-size: 14px;
}

.announcement-link {
  margin-left: 12px;
  font-size: 14px;
  flex: none;
}
</style>
