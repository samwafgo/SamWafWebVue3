<template>
  <div class="captcha-config">
    <t-form-item :label="t('page.host.captcha.is_enable')">
      <t-tooltip :content="t('page.host.captcha.is_enable_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-radio-group v-model="localCaptchaConfig.is_enable_captcha" @change="updateParent">
          <t-radio value="0">{{ t('common.off') }}</t-radio>
          <t-radio value="1">{{ t('common.on') }}</t-radio>
        </t-radio-group>
      </t-tooltip>
    </t-form-item>
    <t-form-item v-if="localCaptchaConfig.is_enable_captcha == '1'" :label="t('page.host.captcha.engine_type')">
      <t-tooltip :content="t('page.host.captcha.engine_type_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-radio-group v-model="localCaptchaConfig.engine_type" @change="updateParent">
          <t-radio value="traditional">{{ t('page.host.captcha.engine_traditional') }}</t-radio>
          <t-radio value="capJs">{{ t('page.host.captcha.engine_capjs') }}</t-radio>
        </t-radio-group>
      </t-tooltip>
    </t-form-item>

    <t-form-item v-if="localCaptchaConfig.is_enable_captcha == '1'" :label="t('page.host.captcha.path_prefix')">
      <t-tooltip :content="t('page.host.captcha.path_prefix_tips')" placement="top" :overlay-style="{ width: '300px' }" show-arrow>
        <t-input
          v-model="localCaptchaConfig.path_prefix"
          :style="{ width: '300px' }"
          :placeholder="t('page.host.captcha.path_prefix_placeholder')"
          @change="updateParent"
        >
          <template #suffix>
            <t-button size="small" theme="primary" @click="generateCaptchaPath">
              {{ t('page.host.generate_random_path') }}
            </t-button>
          </template>
        </t-input>
      </t-tooltip>
    </t-form-item>

    <t-form-item v-if="localCaptchaConfig.is_enable_captcha == '1'" :label="t('page.host.captcha.exclude_urls')">
      <t-tooltip :content="t('page.host.captcha.exclude_urls_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-textarea
          v-model="localCaptchaConfig.exclude_urls"
          :style="{ width: '480px' }"
          :placeholder="t('page.host.captcha.exclude_urls_placeholder')"
          @change="updateParent"
        />
      </t-tooltip>
    </t-form-item>

    <t-form-item v-if="localCaptchaConfig.is_enable_captcha == '1'" :label="t('page.host.captcha.expire_time')">
      <t-tooltip :content="t('page.host.captcha.expire_time_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
        <t-input-number
          v-model="localCaptchaConfig.expire_time"
          :style="{ width: '150px' }"
          :placeholder="t('page.host.captcha.expire_time_placeholder')"
          @change="updateParent"
        />
      </t-tooltip>
    </t-form-item>

    <!-- capJS配置部分 -->
    <div v-if="localCaptchaConfig.is_enable_captcha == '1' && localCaptchaConfig.engine_type == 'capJs'">
      <t-divider>{{ t('page.host.captcha.capjs_config') }}</t-divider>

      <t-form-item :label="t('page.host.captcha.challenge_count')">
        <t-tooltip :content="t('page.host.captcha.challenge_count_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-input-number v-model="localCaptchaConfig.cap_js_config.challengeCount" :style="{ width: '150px' }" :min="1" :max="100" @change="updateParent" />
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.captcha.challenge_size')">
        <t-tooltip :content="t('page.host.captcha.challenge_size_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-input-number v-model="localCaptchaConfig.cap_js_config.challengeSize" :style="{ width: '150px' }" :min="16" :max="64" @change="updateParent" />
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.captcha.challenge_difficulty')">
        <t-tooltip :content="t('page.host.captcha.challenge_difficulty_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-input-number v-model="localCaptchaConfig.cap_js_config.challengeDifficulty" :style="{ width: '150px' }" :min="1" :max="10" @change="updateParent" />
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.captcha.capjs_expires_ms')">
        <t-tooltip :content="t('page.host.captcha.capjs_expires_ms_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-input-number v-model="localCaptchaConfig.cap_js_config.expiresMs" :style="{ width: '150px' }" :min="60000" :max="3600000" @change="updateParent" />
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.captcha.capjs_info_title_zh')">
        <t-tooltip :content="t('page.host.captcha.capjs_info_title_zh_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-input
            v-model="localCaptchaConfig.cap_js_config.infoTitle.zh"
            :style="{ width: '300px' }"
            :placeholder="t('page.host.captcha.capjs_info_title_zh_placeholder')"
            @change="updateParent"
          />
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.captcha.capjs_info_text_zh')">
        <t-tooltip :content="t('page.host.captcha.capjs_info_text_zh_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-textarea
            v-model="localCaptchaConfig.cap_js_config.infoText.zh"
            :style="{ width: '400px' }"
            :placeholder="t('page.host.captcha.capjs_info_text_zh_placeholder')"
            @change="updateParent"
          />
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.captcha.capjs_info_title_en')">
        <t-tooltip :content="t('page.host.captcha.capjs_info_title_en_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-input
            v-model="localCaptchaConfig.cap_js_config.infoTitle.en"
            :style="{ width: '300px' }"
            :placeholder="t('page.host.captcha.capjs_info_title_en_placeholder')"
            @change="updateParent"
          />
        </t-tooltip>
      </t-form-item>

      <t-form-item :label="t('page.host.captcha.capjs_info_text_en')">
        <t-tooltip :content="t('page.host.captcha.capjs_info_text_en_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
          <t-textarea
            v-model="localCaptchaConfig.cap_js_config.infoText.en"
            :style="{ width: '400px' }"
            :placeholder="t('page.host.captcha.capjs_info_text_en_placeholder')"
            @change="updateParent"
          />
        </t-tooltip>
      </t-form-item>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';

const props = defineProps<{ captchaConfig: Record<string, any> }>();
const emit = defineEmits<{ (e: 'update', config: Record<string, any>): void }>();

const { t } = useI18n();

const localCaptchaConfig = ref<Record<string, any>>({ cap_js_config: { infoTitle: {}, infoText: {} } });

watch(
  () => props.captchaConfig,
  (newVal) => {
    const copy = JSON.parse(JSON.stringify(newVal));
    // 确保新字段有默认值
    if (!copy.engine_type) copy.engine_type = 'traditional';
    if (!copy.path_prefix) copy.path_prefix = '';
    if (!copy.cap_js_config) {
      copy.cap_js_config = {
        challengeCount: 50,
        challengeSize: 32,
        challengeDifficulty: 4,
        expiresMs: 600000,
        infoTitle: { zh: '验证码验证', en: 'Captcha Verification' },
        infoText: { zh: '请完成以下验证以继续访问', en: 'Please complete the following verification to continue' },
      };
    }
    localCaptchaConfig.value = copy;
  },
  { immediate: true },
);

// 从关闭切换到开启时，如果路径为空则自动生成
watch(
  () => localCaptchaConfig.value.is_enable_captcha,
  (newVal, oldVal) => {
    if (newVal === '1' && oldVal === '0' && !localCaptchaConfig.value.path_prefix) {
      generateCaptchaPath();
    }
  },
);

function updateParent() {
  emit('update', JSON.parse(JSON.stringify(localCaptchaConfig.value)));
}

// 生成随机验证码路径前缀，格式: /_waf_{8位随机字符}
function generateCaptchaPath() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomStr = '';
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  localCaptchaConfig.value.path_prefix = `/_waf_${randomStr}`;
  MessagePlugin.success(t('page.host.generate_path_success'));
  updateParent();
}
</script>
