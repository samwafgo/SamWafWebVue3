<template>
  <div>
    <t-swiper v-if="tipsVisable" :duration="300" :interval="5000" :navigation="navigation" trigger="click">
      <template v-for="(item, index) in tips" :key="index">
        <t-swiper-item v-if="item.visable">
          <t-alert :theme="item.tipsType" :message="t(item.message)">
            <template #operation>
              <span v-if="item.name === 'emptyHost'" @click="handleCreateWebOperation">{{ t('dashboard.tip_create_website_link') }}</span>
              <span v-if="item.name === 'defaultAccount'" @click="handleModifyDefaultPassWebOperation">{{
                t('dashboard.tip_modify_pwd_link')
              }}</span>
              <span v-if="item.name === 'emptyOtp'" @click="handleModify2FaWebOperation">{{ t('dashboard.tip_empty_otp_link') }}</span>
            </template>
          </t-alert>
        </t-swiper-item>
      </template>
    </t-swiper>
    <br />
    <!-- 系统公告 -->
    <t-card v-if="announcements.length > 0" title="系统公告" class="row-container">
      <t-list :split="true">
        <t-list-item v-for="(item, index) in announcements" :key="index" class="announcement-item">
          <div class="announcement-wrapper">
            <div class="announcement-left">
              <t-tag class="announcement-tag" theme="primary" variant="light">{{ item.type }}</t-tag>
              <span class="announcement-text">{{ item.content }}</span>
              <t-link v-if="item.link" theme="primary" hover="color" class="announcement-link" @click="handleAnnouncementLink(item)">
                查看详情
              </t-link>
            </div>
            <div class="announcement-right">
              <span class="announcement-date">{{ item.date }}</span>
            </div>
          </div>
        </t-list-item>
      </t-list>
    </t-card>
    <!-- 顶部 card  -->
    <top-panel class="row-container" />
    <!-- 中部图表  -->
    <middle-chart class="row-container" />
    <!-- 列表排名 -->
    <rank-list class="row-container" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
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
.row-container {
  margin-bottom: 16px;
}

/* 公告样式 */
.announcement-item {
  padding: 12px 0;
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
}

.announcement-tag {
  margin-right: 12px;
  min-width: 70px;
  text-align: center;
}

.announcement-text {
  font-size: 14px;
  color: var(--td-text-color-primary);
}

.announcement-right {
  margin-left: 16px;
}

.announcement-date {
  color: var(--td-text-color-placeholder);
  font-size: 14px;
}

.announcement-link {
  margin-left: 12px;
  font-size: 14px;
}
</style>
