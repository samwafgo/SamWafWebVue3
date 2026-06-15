<template>
  <t-row :gutter="[16, 16]">
    <t-col v-for="(item, index) in panelList" :key="item.title" :xs="6" :xl="3">
      <t-card
        :title="item.title"
        :style="{ height: '168px' }"
        :class="{ 'dashboard-item': true, 'dashboard-item--main-color': index === 0 }"
        @click="jumpLog(index)"
      >
        <div class="dashboard-item-top">
          <span :style="{ fontSize: `${resizeTime * 36}px` }">{{ item.number }}</span>
        </div>
        <div class="dashboard-item-left">
          <span v-if="index === 2" :style="{ marginTop: `-24px` }">
            <usergroup-icon />
          </span>
          <span v-else-if="index === 3" :style="{ marginTop: '-24px' }">
            <file-icon />
          </span>
        </div>
        <template #footer>
          <div class="dashboard-item-bottom">
            <div class="dashboard-item-block">
              较昨天
              <trend
                class="dashboard-item-trend"
                :type="item.upTrend ? 'up' : 'down'"
                :is-reverse-color="index === 0"
                :describe="item.upTrend || item.downTrend"
              />
            </div>
            <chevron-right-icon />
          </div>
        </template>
      </t-card>
    </t-col>
  </t-row>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ChevronRightIcon, FileIcon, UsergroupIcon } from 'tdesign-icons-vue-next';

import Trend from '@/components/trend/index.vue';
import { wafstatsumdayapi } from '@/apis/stats';

const { t } = useI18n();
const router = useRouter();

const resizeTime = ref(1);
const panelList = ref<{ title: string; number: number | string; upTrend?: string; downTrend?: string }[]>([]);

onMounted(() => {
  getWafStat();
  updateContainer();
  window.addEventListener('resize', updateContainer, false);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContainer, false);
});

function jumpLog(index: number) {
  switch (index) {
    case 0: // 今日攻击数量
      router.push({ path: '/waf/wafvisitlog', query: { action: '阻止' } });
      break;
    case 1: // 今天总访问量
      router.push({ path: '/waf/wafvisitlog', query: {} });
      break;
    case 2: // 今天异常IP（个）
      router.push({ path: '/waf/wafvisitlog', query: { action: '禁止' } });
      break;
    default:
      break;
  }
}

function getWafStat() {
  wafstatsumdayapi()
    .then((res) => {
      if (res.code === 0) {
        const stat = res.data;
        panelList.value.push({
          title: t('dashboard.counter.today_of_attack_count'),
          number: stat.AttackCountOfToday,
          upTrend: '0%',
        });
        panelList.value.push({
          title: t('dashboard.counter.all_visit_count'),
          number: stat.VisitCountOfToday,
          upTrend: '0%',
        });
        panelList.value.push({
          title: t('dashboard.counter.not_normal_visit_count'),
          number: stat.IllegalIpCountOfToday,
          upTrend: '0%',
        });
        panelList.value.push({
          title: t('dashboard.counter.qps'),
          number: stat.CurrentQps,
          upTrend: '0%',
        });
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function updateContainer() {
  if (document.documentElement.clientWidth >= 1400 && document.documentElement.clientWidth < 1920) {
    resizeTime.value = Number((document.documentElement.clientWidth / 2080).toFixed(2));
  } else if (document.documentElement.clientWidth < 1080) {
    resizeTime.value = Number((document.documentElement.clientWidth / 1080).toFixed(2));
  } else {
    resizeTime.value = 1;
  }
}
</script>

<style scoped>
.dashboard-item {
  padding: 8px;
}

.dashboard-item :deep(.t-card__footer) {
  padding-top: 0;
}

.dashboard-item :deep(.t-card__title) {
  font-size: 14px;
  font-weight: 500;
}

.dashboard-item :deep(.t-card__body) {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  position: relative;
}

.dashboard-item:hover {
  cursor: pointer;
}

.dashboard-item-top {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}

.dashboard-item-top > span {
  display: inline-block;
  color: var(--td-text-color-primary);
  font-size: 36px;
  line-height: 44px;
}

.dashboard-item-bottom {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.dashboard-item-bottom > .t-icon {
  cursor: pointer;
}

.dashboard-item-block {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 22px;
  color: var(--td-text-color-placeholder);
}

.dashboard-item-trend {
  margin-left: 8px;
}

.dashboard-item-left {
  position: absolute;
  top: 0;
  right: 32px;
}

.dashboard-item-left > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--td-brand-color-1);
  border-radius: 50%;
}

.dashboard-item-left > span .t-icon {
  font-size: 24px;
  color: var(--td-brand-color);
}

/* 针对第一个卡片需要反色处理 */
.dashboard-item--main-color {
  background: var(--td-brand-color);
  color: var(--td-text-color-primary);
}

.dashboard-item--main-color :deep(.t-card__title),
.dashboard-item--main-color .dashboard-item-top span,
.dashboard-item--main-color .dashboard-item-bottom {
  color: var(--td-text-color-anti);
}

.dashboard-item--main-color .dashboard-item-block {
  color: var(--td-text-color-anti);
  opacity: 0.6;
}
</style>
