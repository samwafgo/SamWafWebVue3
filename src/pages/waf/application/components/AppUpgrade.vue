<template>
  <div>
    <t-form :data="formData" label-align="right" :label-width="120">
      <t-form-item :label="t('page.application.upload_file')">
        <div>
          <t-upload :action="''" :auto-upload="false" accept="*" :multiple="false" @change="onFileChange">
            <t-button variant="outline">{{ t('page.application.select_file') }}</t-button>
          </t-upload>
          <div v-if="selectedFile" style="margin-top: 6px; color: #666; font-size: 12px">
            {{ selectedFile.name }} ({{ formatSize(selectedFile.size) }})
          </div>
        </div>
      </t-form-item>
      <t-form-item :label="t('page.application.hash_sha256')">
        <t-input
          v-model="formData.hash"
          :placeholder="hashComputing ? t('page.application.hash_computing') : t('page.application.hash_placeholder')"
          :disabled="hashComputing"
          clearable
        />
      </t-form-item>
      <t-form-item :label="t('page.application.upgrade_action')">
        <t-radio-group v-model="upgradeMode">
          <t-radio value="upload">{{ t('page.application.upload_only') }}</t-radio>
          <t-radio value="upgrade">{{ t('page.application.upload_and_upgrade') }}</t-radio>
        </t-radio-group>
      </t-form-item>
    </t-form>

    <!-- 备份列表 -->
    <t-divider>{{ t('page.application.backups') }}</t-divider>
    <t-table :data="backups" :columns="backupColumns" row-key="filename" size="small" :empty="t('page.application.no_backups')">
      <template #size="{ row }">
        <span>{{ formatSize(row.size) }}</span>
      </template>
      <template #created_at="{ row }">
        <span>{{ row.created_at || '-' }}</span>
      </template>
      <template #op="slotProps">
        <a class="t-button-link" @click="doRollback(slotProps.row.filename)">
          {{ t('page.application.rollback') }}
        </a>
      </template>
    </t-table>

    <div style="text-align: right; margin-top: 16px">
      <t-button theme="primary" :loading="uploading" :disabled="!selectedFile || hashComputing" @click="doUpload">
        {{ uploadBtnLabel }}
      </t-button>
      <t-button theme="default" style="margin-left: 8px" @click="emit('close')">{{ t('common.cancel') }}</t-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { TableProps, UploadProps } from 'tdesign-vue-next';
import CryptoJS from 'crypto-js';

import request from '@/utils/request';
import { buildRollbackConfig, buildUploadConfig, getAppOpPassword, wafAppBackupsApi, wafAppStatusApi } from '@/apis/application';

const props = defineProps({
  appCode: { type: String, default: '' },
  opPassword: { type: String, default: '' },
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'done'): void;
}>();

const { t } = useI18n();

const formData = reactive({ hash: '' });
const selectedFile = ref<File | null>(null);
const upgradeMode = ref('upgrade');
const uploading = ref(false);
const uploadPhase = ref<'' | 'stopping' | 'uploading'>('');
const hashComputing = ref(false);
const backups = ref<Record<string, any>[]>([]);

const backupColumns = computed<TableProps['columns']>(() => [
  { colKey: 'filename', title: t('page.application.backup_filename'), ellipsis: true },
  { colKey: 'size', title: t('page.application.backup_size'), width: 100 },
  { colKey: 'created_at', title: t('page.application.backup_time'), width: 180 },
  { colKey: 'op', title: t('common.op'), width: 80 },
]);

const uploadBtnLabel = computed(() => {
  if (uploading.value) {
    if (uploadPhase.value === 'stopping') return t('page.application.stopping');
    return t('page.application.upgrading');
  }
  return upgradeMode.value === 'upgrade' ? t('page.application.upload_and_upgrade') : t('page.application.upload_only');
});

onMounted(() => {
  loadBackups();
});

const onFileChange: UploadProps['onChange'] = (files) => {
  if (files && files.length > 0) {
    const f: any = files[0];
    selectedFile.value = f.raw || f;
    computeHash(selectedFile.value as File);
  } else {
    selectedFile.value = null;
    formData.hash = '';
  }
};

function computeHash(file: File) {
  hashComputing.value = true;
  formData.hash = '';
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wordArray = CryptoJS.lib.WordArray.create(e.target!.result as ArrayBuffer);
      formData.hash = CryptoJS.SHA256(wordArray).toString();
    } catch (_) {
      formData.hash = '';
    } finally {
      hashComputing.value = false;
    }
  };
  reader.onerror = () => {
    formData.hash = '';
    hashComputing.value = false;
  };
  reader.readAsArrayBuffer(file);
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

// 根据文件大小动态计算超时：假设最慢 100 KB/s，再加 90s 处理余量
function calcTimeout(fileSize: number): number {
  return Math.max(300000, Math.ceil(fileSize / 102400) * 1000 + 90000);
}

// 停止应用并轮询直到确认已停止（最多等 60s）
// stop 本身不在高危组，但升级/回滚流程需要携带密码头以备路由规则变动
function stopAndWait(): Promise<void> {
  return new Promise((resolve, reject) => {
    const pwd = props.opPassword || getAppOpPassword();
    const headers: Record<string, string> = pwd ? { 'X-App-Op-Password': pwd } : {};
    request({ url: '/application/app/stop', method: 'get', params: { code: props.appCode }, timeout: 15000, headers })
      .then(() => {
        const deadline = Date.now() + 60000;
        const poll = () => {
          if (Date.now() >= deadline) {
            reject(new Error(t('page.application.stop_wait_timeout')));
            return;
          }
          wafAppStatusApi({ code: props.appCode })
            .then((res) => {
              if (res && res.code === 0 && res.data.run_status === 0) {
                resolve();
              } else {
                setTimeout(poll, 1000);
              }
            })
            .catch(() => setTimeout(poll, 1000));
        };
        setTimeout(poll, 800);
      })
      .catch(reject);
  });
}

async function doUpload() {
  if (!selectedFile.value) return;
  uploading.value = true;
  try {
    if (upgradeMode.value === 'upgrade') {
      // 步骤 1：先停止，确认进程退出后再发送文件
      uploadPhase.value = 'stopping';
      await stopAndWait();
    }

    // 步骤 2：上传（此时后端 StopApp 因进程已退出会即时返回，超时仅受网速影响）
    uploadPhase.value = 'uploading';
    const fd = new FormData();
    fd.append('code', props.appCode);
    fd.append('hash', formData.hash);
    fd.append('file', selectedFile.value);
    const url = upgradeMode.value === 'upgrade' ? '/application/app/upgrade' : '/application/app/upload';
    const timeout = calcTimeout(selectedFile.value.size);

    const res = await request(buildUploadConfig(url, fd, timeout, props.opPassword) as any);
    if (res && res.code === 0) {
      MessagePlugin.success(t('common.success'));
      loadBackups();
      emit('done');
    } else {
      MessagePlugin.error(res ? res.msg : t('common.failed'));
    }
  } catch (err: any) {
    MessagePlugin.error(err.message || t('common.failed'));
  } finally {
    uploading.value = false;
    uploadPhase.value = '';
  }
}

function loadBackups() {
  wafAppBackupsApi({ code: props.appCode }).then((res) => {
    if (res && res.code === 0) {
      backups.value = res.data.list || [];
    }
  });
}

function doRollback(filename: string) {
  uploading.value = true;
  uploadPhase.value = 'stopping';
  stopAndWait()
    .then(() => {
      uploadPhase.value = 'uploading';
      return request(buildRollbackConfig({ code: props.appCode, filename }, props.opPassword) as any);
    })
    .then((res) => {
      if (res && res.code === 0) {
        MessagePlugin.success(t('page.application.rollback_success'));
        emit('done');
      } else {
        MessagePlugin.error(res ? res.msg : t('common.failed'));
      }
    })
    .catch((err) => {
      MessagePlugin.error(err.message || t('common.failed'));
    })
    .finally(() => {
      uploading.value = false;
      uploadPhase.value = '';
    });
}
</script>

<style scoped>
.t-button-link {
  color: var(--td-brand-color);
  cursor: pointer;
}
</style>
