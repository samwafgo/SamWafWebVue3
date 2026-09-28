<template>
  <div>
    <help-block :summary="t('page.visit_log.visit_log')" doc="guide/VisitLog">
      <template #actions><ip-lookup ref="ipLookupRef" /></template>
    </help-block>

    <!-- 日志配置区域 -->
    <t-card class="log-config-card" style="margin-bottom: 16px">
      <div
        style="cursor: pointer; display: flex; justify-content: space-between; align-items: center"
        @click="toggleLogConfig"
      >
        <div style="display: flex; align-items: center">
          <chevron-down-icon v-if="logConfigVisible" style="margin-right: 8px" />
          <chevron-right-icon v-else style="margin-right: 8px" />
          <span style="font-weight: 500; font-size: 14px">日志配置</span>
        </div>
        <t-button theme="primary" size="small" :loading="logConfigSaving" @click.stop="saveLogConfig"> 保存配置 </t-button>
      </div>

      <div v-show="logConfigVisible" style="margin-top: 16px">
        <t-form :data="logConfig" :label-width="200" layout="inline">
          <t-row :gutter="16">
            <t-col :span="6">
              <t-form-item label="是否记录响应报文" name="record_resp">
                <t-select v-model="logConfig.record_resp" style="width: 100%">
                  <t-option value="1" label="是" />
                  <t-option value="0" label="否" />
                </t-select>
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="记录原始请求BODY报文" name="record_all_src_byte_info">
                <t-select v-model="logConfig.record_all_src_byte_info" style="width: 100%">
                  <t-option value="1" label="启动" />
                  <t-option value="0" label="关闭" />
                </t-select>
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="日志记录类型" name="record_log_type">
                <t-select v-model="logConfig.record_log_type" style="width: 100%">
                  <t-option value="all" label="全部" />
                  <t-option value="abnormal" label="非正常" />
                </t-select>
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="记录请求最大报文(字节)" name="record_max_req_body_length">
                <t-input-number v-model="logConfig.record_max_req_body_length" style="width: 100%" :min="0" />
              </t-form-item>
            </t-col>
          </t-row>

          <t-row :gutter="16">
            <t-col :span="6">
              <t-form-item label="记录响应最大报文(字节)" name="record_max_res_body_length">
                <t-input-number v-model="logConfig.record_max_res_body_length" style="width: 100%" :min="0" />
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="删除历史日志(天)" name="delete_history_log_day">
                <t-input-number v-model="logConfig.delete_history_log_day" style="width: 100%" :min="1" />
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="日志归档最大记录数" name="log_db_size">
                <t-input-number v-model="logConfig.log_db_size" style="width: 100%" :min="0" />
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="日志归档最大文件(MB)" name="db_file_size">
                <t-input-number v-model="logConfig.db_file_size" style="width: 100%" :min="0" />
              </t-form-item>
            </t-col>
          </t-row>

          <t-row :gutter="16">
            <t-col :span="6">
              <t-form-item label="是否开启日志持久化" name="log_persist_enable">
                <t-select v-model="logConfig.log_persist_enable" style="width: 100%">
                  <t-option value="1" label="开启" />
                  <t-option value="0" label="关闭" />
                </t-select>
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="数据库批量插入数量" name="batch_insert">
                <t-input-number v-model="logConfig.batch_insert" style="width: 100%" :min="1" />
              </t-form-item>
            </t-col>
            <t-col :span="6">
              <t-form-item label="IP Tag 存放位置" name="ip_tag_db">
                <t-select v-model="logConfig.ip_tag_db" style="width: 100%">
                  <t-option value="0" label="主库" />
                  <t-option value="1" label="读取 stat库" />
                </t-select>
              </t-form-item>
            </t-col>
          </t-row>

          <t-row :gutter="16">
            <t-col :span="6">
              <t-form-item label="访问日志档位" name="access_log_mode">
                <t-select v-model="logConfig.access_log_mode" style="width: 100%">
                  <t-option value="db" label="全部入库" />
                  <t-option value="sample" label="采样入库" />
                  <t-option value="off" label="仅安全事件" />
                </t-select>
                <div v-if="logConfig.access_log_mode !== 'db'" class="log-config-hint">
                  「仅安全事件」会失去 CC 阈值推荐、AI 训练负样本与异常 IP 的正常行为回溯
                </div>
              </t-form-item>
            </t-col>

            <t-col :span="6">
              <t-form-item label="访问日志保留天数" name="access_log_retention_days">
                <t-input-number v-model="logConfig.access_log_retention_days" style="width: 100%" :min="1" />
              </t-form-item>
            </t-col>
          </t-row>

          <t-row :gutter="16">
            <t-col :span="12">
              <t-form-item label="全局排除记录日志的IP" name="exclude_ip_log">
                <t-textarea
                  v-model="logConfig.exclude_ip_log"
                  placeholder="单IP/CIDR/通配符/区间，或 group:组短码 引用IP组；逗号或换行分隔，#开头为注释。只静音正常请求，安全事件照常记录；站点级清单在网站编辑里"
                  :autosize="{ minRows: 2, maxRows: 6 }"
                  style="width: 100%"
                />
              </t-form-item>
            </t-col>
          </t-row>
        </t-form>
      </div>
    </t-card>

    <t-card class="list-card-container">
      <t-row justify="space-between">
        <t-form ref="searchForm" :data="searchformData" :label-width="150" colon layout="inline" :style="{ marginBottom: '8px' }">
          <t-form-item :label="t('page.visit_log.website')" name="website">
            <t-select v-model="searchformData.host_code" clearable filterable :style="{ width: '150px' }">
              <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                {{ item }}
              </t-option>
            </t-select>
          </t-form-item>
          <t-form-item :label="t('page.visit_log.rule_name')" name="rule">
            <t-input
              v-model="searchformData.rule"
              class="form-item-content"
              type="search"
              :placeholder="t('common.placeholder') + t('page.visit_log.rule_name')"
              :style="{ minWidth: '134px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.req_uuid')" name="req_uuid">
            <t-input
              v-model="searchformData.req_uuid"
              class="form-item-content"
              type="search"
              :placeholder="t('common.placeholder') + t('page.visit_log.req_uuid')"
              :style="{ minWidth: '200px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.access_status')" name="action">
            <t-select
              v-model="searchformData.action"
              class="form-item-content"
              :options="action_options"
              :placeholder="t('common.select_placeholder') + t('page.visit_log.access_status')"
              :style="{ width: '100px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.status_code')" name="status_code">
            <t-input
              v-model="searchformData.status_code"
              class="form-item-content"
              :placeholder="t('common.placeholder') + t('page.visit_log.status_code')"
              :style="{ minWidth: '100px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.source_ip')" name="src_ip">
            <t-input
              v-model="searchformData.src_ip"
              class="form-item-content"
              :placeholder="t('common.placeholder') + t('page.visit_log.source_ip')"
              :style="{ minWidth: '100px' }"
            />
          </t-form-item>
          <t-form-item v-if="attack_ip === ''" :label="t('page.visit_log.access_date')" name="unix_add_time">
            <t-tooltip :content="t('page.visit_log.date_disabled_tip')" :disabled="!isUuidLookup">
              <t-date-range-picker
                v-model="dateControl.range1"
                :presets="dateControl.presets"
                enable-time-picker
                :disabled="isUuidLookup"
                value-type="YYYY-MM-DD HH:mm:ss"
              />
            </t-tooltip>
          </t-form-item>
          <!-- 内嵌在风险日志 IP 明细里时没有日期控件，给一个时间范围快选，默认近 30 天 -->
          <t-form-item v-else :label="t('page.visit_log.access_date')" name="quick_range">
            <t-select v-model="quickRange" :disabled="isUuidLookup" :style="{ width: '130px' }" @change="applyQuickRange">
              <t-option value="1" :label="t('page.visit_log.date_range_today')" />
              <t-option value="7" :label="t('page.visit_log.date_range_last_7_days')" />
              <t-option value="30" :label="t('page.visit_log.range_last_30_days')" />
              <t-option value="0" :label="t('page.visit_log.range_all')" />
            </t-select>
          </t-form-item>
          <t-form-item :label="t('page.visit_log.access_method')" name="method">
            <t-select
              v-model="searchformData.method"
              class="form-item-content"
              :options="method_options"
              :placeholder="t('common.placeholder') + t('page.visit_log.access_method')"
              :style="{ width: '100px' }"
            />
          </t-form-item>
          <t-form-item :label="t('page.visit_log.log_archive_db')" name="sharedb">
            <t-tooltip :content="t('page.visit_log.shard_disabled_tip')" :disabled="!isUuidLookup">
              <t-select v-model="searchformData.current_db_name" :disabled="isUuidLookup" :style="{ width: '190px' }">
                <t-option value="auto" :label="t('page.visit_log.shard_auto')">
                  <span :title="t('page.visit_log.shard_auto_tip')">{{ t('page.visit_log.shard_auto') }}</span>
                </t-option>
                <t-option-group v-for="g in shardGroups" :key="g.label" :label="g.label">
                  <t-option v-for="it in g.options" :key="it.value" :value="it.value" :label="it.label">
                    <span :title="it.value">{{ it.label }}</span>
                  </t-option>
                </t-option-group>
              </t-select>
            </t-tooltip>
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')"> {{ t('common.search') }} </t-button>
            <t-button v-if="attack_ip === '' && isFileBasedDb" theme="primary" :style="{ marginLeft: '8px' }" @click="exportDbVisible = true">
              {{ t('common.export') }}
            </t-button>
            <t-button type="reset" variant="base" theme="default"> {{ t('common.reset') }} </t-button>
            <t-button theme="primary" variant="outline" :style="{ marginLeft: '8px' }" @click="handleIPExtractIssue">
              {{ t('page.visit_log.detail.ip_extract_issue') }}
            </t-button>
          </t-form-item>
        </t-form>
      </t-row>

      <div class="table-container">
        <!-- 查不到老数据时，最先该看的就是保留期：直接摆在列表上方，点一下就能去改 -->
        <div style="margin-bottom: 8px; color: rgba(0, 0, 0, 0.6); font-size: 12px">
          {{
            t('page.visit_log.retention_line', {
              d: logConfig.delete_history_log_day || '-',
              a: logConfig.access_log_retention_days || '-',
            })
          }}
          <a class="t-button-link" @click="openRetentionSetting">{{ t('page.visit_log.retention_setting') }}</a>
        </div>

        <!-- 查询超出后端预算：给出「能怎么办」，而不是让人对着不完整的数字猜 -->
        <t-alert v-if="queryMeta.partial" theme="warning" style="margin-bottom: 12px">
          <template #message>
            {{ t('page.visit_log.query_partial', { ms: queryMeta.took_ms }) }}
            <a class="t-button-link" style="margin-left: 8px" @click="narrowRange">{{
              t('page.visit_log.query_partial_narrow')
            }}</a>
          </template>
        </t-alert>

        <!-- 这次查了哪些分区：自动模式下用户没选分区，界面得说明数据从哪来 -->
        <t-alert
          v-if="queryMeta.uuid_lookup && queryMeta.found_in"
          theme="success"
          style="margin-bottom: 12px"
          :message="t('page.visit_log.uuid_found', { shard: shardTitle(queryMeta.found_in), n: queryMeta.scanned })"
        />
        <t-alert v-else-if="queryMeta.uuid_lookup" theme="warning" style="margin-bottom: 12px">
          <template #message>
            <div>{{ t('page.visit_log.uuid_miss', { n: queryMeta.scanned }) }}</div>
            <ul style="margin: 6px 0 0 18px; padding: 0">
              <li>{{ t('page.visit_log.uuid_miss_r1') }}</li>
              <li>{{ t('page.visit_log.uuid_miss_r2') }}</li>
              <li>{{ t('page.visit_log.uuid_miss_r3') }}</li>
            </ul>
          </template>
        </t-alert>
        <t-alert v-else-if="queryMeta.shards && queryMeta.shards.length > 1" theme="info" style="margin-bottom: 12px">
          <template #message>
            <!-- 分区多的时候全列出来就是一大堆，默认只给一行概括，要看再展开 -->
            {{ t('page.visit_log.shard_cover', { n: queryMeta.shards.length }) }}
            <span style="color: rgba(0, 0, 0, 0.6)">{{ shardCoverSummary }}</span>
            <a class="t-button-link" @click="covExpanded = !covExpanded">
              {{ covExpanded ? t('page.visit_log.shard_cover_fold') : t('page.visit_log.shard_cover_detail') }}
            </a>
            <span v-if="queryMeta.sort_forced_time" style="color: rgba(0, 0, 0, 0.6)">
              {{ t('page.visit_log.sort_forced_time') }}
            </span>
            <div v-show="covExpanded" style="margin-top: 6px">
              <span
                v-for="sh in queryMeta.shards"
                :key="sh.name"
                :title="sh.name"
                style="
                  display: inline-block;
                  margin: 2px 6px 2px 0;
                  padding: 0 8px;
                  background: #f3f3f3;
                  border-radius: 2px;
                "
              >
                {{ shardTitle(sh.name) }} · {{ sh.count }}
              </span>
            </div>
          </template>
        </t-alert>

        <!-- 自定义工具栏，将所有按钮放在一起 -->
        <div
          class="table-toolbar"
          style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px"
        >
          <div class="left-actions">
            <!-- 视图切换：访问日志=全量窄行（事件双写在内），安全事件=命中子集。
                 内嵌在风险日志详情里时，访问日志视图就是该 IP 的「全部行为」 -->
            <t-radio-group v-model="searchformData.view_type" variant="default-filled" size="small" @change="onViewTypeChange">
              <t-radio-button value="access">{{ accessViewLabel }}</t-radio-button>
              <t-radio-button value="event">{{ t('page.visit_log.view_event') }}</t-radio-button>
            </t-radio-group>
          </div>
          <div class="right-actions">
            <t-space>
              <t-button theme="default" variant="outline" size="small" @click="toggleColumnController">
                <template #icon>
                  <setting-icon />
                </template>
                {{ t('common.column_config') }}
              </t-button>
              <t-button theme="default" variant="outline" size="small" @click="resetColumnConfig">
                {{ t('common.reset_column_config') }}
              </t-button>
              <!-- 分区管理：看每个分区还剩哪些层，并可主动删除腾空间 -->
              <t-button v-if="attack_ip === ''" theme="default" variant="outline" size="small" @click="openShardManage">
                {{ t('page.visit_log.shard_manage') }}
              </t-button>
            </t-space>
          </div>
        </div>
        <!-- 空态给线索：查不到日志最常见的原因就那么几条，别让人对着「暂无数据」猜 -->
        <template v-if="data.length === 0 && !queryMeta.uuid_lookup">
          <div class="empty-hint" style="padding: 6px 0 10px; color: rgba(0, 0, 0, 0.6); font-size: 12px">
            {{ t('page.visit_log.empty_hint') }}
            <a class="t-button-link" @click="openIpLookupForHint">{{ t('common.ip_lookup.title') }}</a>
          </div>
        </template>
        <t-table
          :columns="columns"
          :data="data"
          size="small"
          :row-key="rowKey"
          vertical-align="top"
          :display-columns="displayColumns"
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          :sort="sorts"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
          @sort-change="onSortChange"
          @filter-change="onFilterChange"
        >
          <template #action="{ row }">
            <t-tag v-if="row.action === '放行'" shape="round" theme="success">{{ row.action }}</t-tag>
            <t-tag v-if="row.action === '阻止'" shape="round" theme="danger">{{ row.action }}</t-tag>
            <t-tag v-if="row.action === '禁止'" shape="round" theme="warning">{{ row.action }}</t-tag>
          </template>
          <template #rule="{ row }">
            <t-tag v-if="row.rule !== ''" shape="round" theme="primary" variant="outline">{{ row.rule }}</t-tag>
          </template>
          <template #log_only_mode="{ row }">
            <t-tag :theme="row.log_only_mode == '1' ? 'danger' : 'success'" variant="light-outline">
              {{ row.log_only_mode == '1' ? t('page.visit_log.log_only_mode_on') : t('page.visit_log.log_only_mode_off') }}
            </t-tag>
          </template>
          <template #ai_score="{ row }">
            <t-tag
              v-if="row.ai_score > 0"
              :theme="row.ai_score >= 0.9 ? 'danger' : row.ai_score >= 0.6 ? 'warning' : 'primary'"
              variant="light"
            >
              {{ Number(row.ai_score).toFixed(2) }}
            </t-tag>
            <span v-else>-</span>
          </template>
          <template #host_nickname="{ row }">
            <span>{{ host_nickname_dic[row.host_code] || '-' }}</span>
          </template>
          <template #src_ip="{ row }">
            <!-- 点 IP 直接开归属查询：排查时最想知道的就是「这个IP现在被什么拦着」 -->
            <t-tooltip :content="t('common.ip_lookup.click_tip')">
              <a class="ipl-link" @click="openIpLookup(row.src_ip)">{{ row.src_ip }}</a>
            </t-tooltip>
          </template>
          <template #op="slotProps">
            <a v-if="attack_ip === ''" class="t-button-link" @click="handleClickIPDetail(slotProps)">{{
              t('common.search') + t('page.visit_log.source_ip')
            }}</a>
            <a class="t-button-link" @click="handleClickDetail(slotProps)">{{ t('common.details') }}</a>
            <a class="t-button-link" style="margin-left: 8px" @click="openAiMarkDialog(slotProps.row)">
              <t-tag
                v-if="aiMarkMap[slotProps.row.req_uuid] && aiMarkMap[slotProps.row.req_uuid].mark"
                :theme="
                  aiMarkMap[slotProps.row.req_uuid].mark === 'attack'
                    ? 'danger'
                    : aiMarkMap[slotProps.row.req_uuid].mark === 'normal'
                    ? 'success'
                    : 'default'
                "
                variant="light"
                size="small"
              >
                {{ aiMarkText(aiMarkMap[slotProps.row.req_uuid]) }}
              </t-tag>
              <span v-else>{{ t('page.visit_log.ai_mark') }}</span>
            </a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 分区管理 -->
    <t-dialog
      v-model:visible="shardManageVisible"
      :header="t('page.visit_log.shard_manage')"
      width="820px"
      :footer="false"
      :on-close="() => (shardManageVisible = false)"
    >
      <t-alert theme="info" :message="t('page.visit_log.shard_manage_tip')" style="margin-bottom: 12px" />
      <t-table :data="shardRows" :columns="shardManageColumns" row-key="file_name" size="small" max-height="420">
        <template #label="{ row }">
          <span :title="row.file_name">{{ shardTitle(row.file_name) }}</span>
        </template>
        <template #tiers="{ row }">
          <span v-if="row.is_current" style="color: rgba(0, 0, 0, 0.4)">—</span>
          <span v-else-if="!row.tiers || row.tiers.length === 0" style="color: rgba(0, 0, 0, 0.4)">
            {{ t('page.visit_log.shard_tier_unknown') }}
          </span>
          <template v-else>
            <t-tag
              v-for="tier in row.tiers"
              :key="tier"
              size="small"
              variant="light"
              :theme="tier === 'access_log' ? 'primary' : 'default'"
              style="margin-right: 4px"
            >
              {{ tierLabel(tier) }}
            </t-tag>
          </template>
        </template>
        <template #op="{ row }">
          <span v-if="row.is_current" style="color: rgba(0, 0, 0, 0.4)">{{ t('page.visit_log.shard_live') }}</span>
          <a v-else class="t-button-link" style="color: #d54941" @click="confirmDeleteShard(row)">
            {{ t('common.delete') }}
          </a>
        </template>
      </t-table>
    </t-dialog>

    <t-dialog
      v-model:visible="exportDbVisible"
      :header="t('page.visit_log.export_db_file_header')"
      width="520px"
      :confirm-on-enter="true"
      :on-close="() => (exportDbVisible = false)"
      @confirm="handelExport"
    >
      <t-alert theme="info" :message="t('page.visit_log.export_db_file_content')" style="margin-bottom: 12px" />
      <t-form :label-width="110">
        <t-form-item :label="t('page.visit_log.export_time_range')">
          <t-date-range-picker
            v-model="exportForm.range"
            enable-time-picker
            clearable
            value-type="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item :label="t('page.visit_log.export_tiers')">
          <t-checkbox-group v-model="exportForm.tiers">
            <t-checkbox value="access">{{ t('page.visit_log.view_access') }}</t-checkbox>
            <t-checkbox value="event">{{ t('page.visit_log.view_event') }}</t-checkbox>
            <t-checkbox value="payload">{{ t('page.visit_log.export_tier_payload') }}</t-checkbox>
            <t-checkbox value="weblog">{{ t('page.visit_log.export_tier_weblog') }}</t-checkbox>
          </t-checkbox-group>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog
      v-model:visible="visitDetailVisible"
      :header="t('page.visit_log.pop_detail_header')"
      width="80%"
      :confirm-on-enter="true"
      :on-confirm="() => (visitDetailVisible = false)"
      :on-close="() => (visitDetailVisible = false)"
    >
      <visit-detail-page :prop_current_db="searchformData.current_db_name" :prop_req_uuid="visitDetailUid"></visit-detail-page>
    </t-dialog>

    <!-- AI 训练标记弹窗 -->
    <t-dialog
      v-model:visible="aiMarkDialogVisible"
      :header="t('page.visit_log.ai_mark_dialog_title')"
      width="460px"
      :on-close="() => (aiMarkDialogVisible = false)"
    >
      <t-form label-align="top">
        <t-form-item :label="t('page.visit_log.ai_mark_verdict')">
          <t-radio-group v-model="aiMarkForm.verdict">
            <t-radio-button value="normal">{{ t('page.visit_log.ai_mark_normal') }}</t-radio-button>
            <t-radio-button value="attack">{{ t('page.visit_log.ai_mark_attack') }}</t-radio-button>
            <t-radio-button value="ignore">{{ t('page.visit_log.ai_mark_ignore') }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item v-if="aiMarkForm.verdict === 'attack'" :label="t('page.visit_log.ai_mark_category')">
          <t-select v-model="aiMarkForm.attackType" :options="aiCatSelectOptions" style="width: 240px" />
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button
          v-if="aiMarkDialogRow && aiMarkMap[aiMarkDialogRow.req_uuid]"
          theme="danger"
          variant="outline"
          @click="confirmAiUnmark"
          >{{ t('page.visit_log.ai_mark_unmark') }}</t-button
        >
        <t-button theme="default" @click="aiMarkDialogVisible = false">{{ t('common.cancel') }}</t-button>
        <t-button theme="primary" @click="confirmAiMark">{{ t('common.confirm') }}</t-button>
      </template>
    </t-dialog>

    <!-- 列配置弹窗 -->
    <t-dialog
      v-model:visible="columnControllerVisible"
      :header="t('common.column_config')"
      width="500px"
      @confirm="handleColumnControllerConfirm"
      @cancel="handleColumnControllerCancel"
    >
      <div class="column-controller-content">
        <t-checkbox-group v-model="tempDisplayColumns" style="display: flex; flex-direction: column">
          <t-checkbox v-for="field in availableFields" :key="field.value" :value="field.value" :label="field.label" />
        </t-checkbox-group>
      </div>
    </t-dialog>

    <!-- IP提取问题对话框 -->
    <t-dialog v-model:visible="ipExtractDialogVisible" :header="t('page.visit_log.detail.ip_extract_issue')" :width="800" :footer="false">
      <!-- 这里改的是全局配置，站点里的「真实IP来源」会覆盖它；不写清楚用户会以为改了全局所有站点都变 -->
      <t-alert theme="warning" style="margin-bottom: 16px">
        <div>
          <b>{{ t('page.visit_log.detail.ip_extract_scope_title') }}</b>
          <div style="margin-top: 4px">{{ t('page.visit_log.detail.ip_extract_scope_desc') }}</div>
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
            <t-select
              v-model="ipExtractHostCode"
              clearable
              filterable
              :style="{ width: '220px' }"
              :placeholder="t('page.visit_log.detail.ip_extract_select_host')"
            >
              <t-option v-for="item in realHostOptions" :key="item.value" :value="item.value" :label="item.label">{{ item.label }}</t-option>
            </t-select>
            <t-button size="small" :disabled="!ipExtractHostCode" @click="gotoHostIpSource">
              {{ t('page.visit_log.detail.ip_extract_goto_host') }}
            </t-button>
            <t-button size="small" variant="outline" :disabled="!ipExtractHostCode" @click="openHostProbe">
              {{ t('page.visit_log.detail.ip_extract_view_headers') }}
            </t-button>
          </div>
        </div>
      </t-alert>
      <p>{{ t('page.visit_log.detail.ip_extract_issue_desc') }}</p>

      <!-- 视频教程链接 -->
      <t-alert theme="success" style="margin-bottom: 16px">
        <template #icon>
          <span style="font-size: 20px">📺</span>
        </template>
        <div style="display: flex; align-items: center; justify-content: space-between">
          <span>{{ t('page.visit_log.detail.ip_extract_video_tutorial') }}</span>
          <t-button theme="primary" size="small" @click="openVideoTutorial">
            {{ t('page.visit_log.detail.ip_extract_watch_tutorial') }}
          </t-button>
        </div>
      </t-alert>

      <!-- 常用头信息提示区域 -->
      <t-card :title="t('page.visit_log.detail.ip_extract_common_headers')" style="margin-bottom: 20px">
        <p style="margin-bottom: 12px; color: #666">{{ t('page.visit_log.detail.ip_extract_common_headers_desc') }}</p>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px">
          <t-button size="small" variant="outline" @click="selectIPHeader('CF-Connecting-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.cloudflare') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('True-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.cloudflare_enterprise') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Forwarded-For')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_forwarded_for') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Real-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_real_ip') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_client_ip') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('Fastly-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.fastly') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('Incap-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.incapsula') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('CF-Connecting-IP,X-Forwarded-For,X-Real-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.multiple') }}
          </t-button>
        </div>
        <t-alert theme="info" :message="t('page.visit_log.detail.ip_extract_multiple_tips')" style="margin-top: 8px" />
        <div style="margin-top: 8px; color: #999; font-size: 12px">
          {{ t('page.visit_log.detail.ip_extract_example') }}
        </div>
      </t-card>

      <t-form ref="ipExtractForm" :data="ipExtractFormData" :rules="ipExtractRules" :label-width="150" @submit="onSubmitIPExtract">
        <t-form-item :label="t('page.systemconfig.label_configuration_item')" name="item">
          <t-input v-model="ipExtractFormData.item" :style="{ width: '600px' }" disabled></t-input>
        </t-form-item>
        <t-form-item :label="t('page.systemconfig.label_configuration_value')" name="value">
          <t-input
            v-model="ipExtractFormData.value"
            :style="{ width: '600px' }"
            :placeholder="t('page.visit_log.detail.ip_extract_issue_tips')"
          ></t-input>
          <div class="form-item-tips">{{ t('page.visit_log.detail.ip_extract_issue_tips') }}</div>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="ipExtractDialogVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>
    <!-- 某个站点单独看真实到达的请求头(与站点编辑页共用同一组件) -->
    <ip-source-probe-dialog v-model:visible="hostProbeVisible" :host-code="ipExtractHostCode" :host-name="host_dic[ipExtractHostCode] || ''" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import type { FormInstanceFunctions, FormProps, PageInfo, TableProps } from 'tdesign-vue-next';
import { ChevronDownIcon, ChevronRightIcon, SettingIcon } from 'tdesign-icons-vue-next';

import VisitDetailPage from './detail/index.vue';
import { allsharedblist, attacklogVisitListApi, delsharedb, exportlog } from '@/apis/waflog/attacklog';
import { aiLabelByUuidsApi, aiMarkLabelApi, aiUnmarkLabelApi } from '@/apis/ai';
import { allhost } from '@/apis/host';
import IpSourceProbeDialog from '@/pages/waf/host/components/IpSourceProbeDialog.vue';
import { edit_system_config_api, get_detail_by_item_api } from '@/apis/systemconfig';
import { get_ui_preference_api, save_ui_preference_api } from '@/apis/uipreference';
import { ConvertStringToUnix, ConvertUnixToDate, NowDate } from '@/utils/date';
import { getOnlineUrl } from '@/utils/usuallytool';
import { useAttackLogStore } from '@/store/modules/attacklog';

// 点列表里的 IP 直接开归属查询，省得用户复制粘贴
const ipLookupRef = ref<any>(null);
function openIpLookup(ip: string) {
  if (!ip) return;
  ipLookupRef.value?.open(ip);
}

const props = defineProps({
  attack_ip: {
    type: String,
    default: '',
  },
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const attackLogStore = useAttackLogStore();

const staticColumn = ['action', 'op'];

// 默认不显示的可选列：新增后不会被"新列自动加入"逻辑塞进已有用户的可见列，需用户主动勾选
const OPT_OUT_NEW_COLUMNS = ['host_nickname', 'ai_score', 'user_agent', 'referer'];

// 列配置持久化：服务端（按登录账号）为准，localStorage 只作首屏秒开缓存 + 接口不可用兜底。
// v2 起把"可见列"与"用户已见过的列基线"合并到同一个 key，
// 避免 401 清缓存时只保留其中一个，导致列配置被重置（issue #893）
const COLUMN_CONFIG_KEY = 'attack_table_display_columns';
const LEGACY_KNOWN_COLUMNS_KEY = 'attack_table_known_columns'; // v1 遗留，迁移后删除
const COLUMN_CONFIG_VERSION = 2;
const COLUMN_PREF_NAME = 'visit_log_columns'; // 服务端偏好名（后端白名单内）

// 可由外部路由 query 预设的筛选字段（必须是 searchformData 的合法键，防止任意 query 注入）。
// 不含 unix_add_time_begin/end（由日期控件驱动）和 current_db_name（由 loadShareDbList 异步定值）
const ROUTE_FILTER_QUERY_KEYS = ['action', 'src_ip', 'host_code', 'rule', 'req_uuid', 'status_code', 'method', 'log_only_mode', 'view_type'];
// 外部页面可用这两个 query 指定日期区间（形如 2026-07-01 00:00:00），不传则用"今天"
const ROUTE_DATE_QUERY_KEYS = ['date_begin', 'date_end'];

const searchForm = ref<FormInstanceFunctions>();

const dateControl = reactive({
  presets: {
    最近300天: [`${ConvertUnixToDate(Date.now() - 86400000 * 299).slice(0, 10)} 00:00:00`, `${NowDate} 23:59:59`],
    最近7天: [`${ConvertUnixToDate(Date.now() - 86400000 * 6).slice(0, 10)} 00:00:00`, `${NowDate} 23:59:59`],
    最近3天: [`${ConvertUnixToDate(Date.now() - 86400000 * 2).slice(0, 10)} 00:00:00`, `${NowDate} 23:59:59`],
    今天: [`${NowDate} 00:00:00`, `${NowDate} 23:59:59`],
  },
  range1: [`${NowDate} 00:00:00`, `${NowDate} 23:59:59`],
});

const action_options = computed(() => [
  { label: t('common.defense_status.all'), value: '' },
  { label: t('common.defense_status.stop'), value: '阻止' },
  { label: t('common.defense_status.pass'), value: '放行' },
  { label: t('common.defense_status.forbid'), value: '禁止' },
]);

const method_options = computed(() => [
  { label: t('common.all'), value: '' },
  { label: 'POST', value: 'POST' },
  { label: 'GET', value: 'GET' },
  { label: 'CONNECT', value: 'CONNECT' },
  { label: 'HEAD', value: 'HEAD' },
  { label: 'OPTIONS', value: 'OPTIONS' },
  { label: 'PRI', value: 'PRI' },
]);

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);

// 这次查询覆盖了哪些分区（后端给）：自动模式与识别码直查都靠它向用户解释数据来源
const queryMeta = ref<Record<string, any>>({
  shards: [],
  found_in: '',
  scanned: 0,
  uuid_lookup: false,
  sort_forced_time: false,
  partial: false,
  took_ms: 0,
});
const shardGroups = ref<Array<{ label: string; options: Array<{ value: string; label: string }> }>>([]);
const covExpanded = ref(false);
const shardManageVisible = ref(false);
const shardRows = ref<Record<string, any>[]>([]);
const quickRange = ref('30');

// AI 训练标签人工修正状态：req_uuid -> { mark, attack_type }
const aiMarkMap = ref<Record<string, { mark: string; attack_type: string }>>({});
const aiMarkDialogVisible = ref(false);
const aiMarkDialogRow = ref<Record<string, any> | null>(null);
const aiMarkForm = reactive<{ verdict: string; attackType: string }>({ verdict: 'attack', attackType: '' });

const aiCatSelectOptions = computed(() => [
  { label: t('page.visit_log.ai_cat_auto'), value: '' },
  { label: t('page.visit_log.ai_cat_sqli'), value: 'sqli' },
  { label: t('page.visit_log.ai_cat_xss'), value: 'xss' },
  { label: t('page.visit_log.ai_cat_rce'), value: 'rce' },
  { label: t('page.visit_log.ai_cat_traversal'), value: 'traversal' },
  { label: t('page.visit_log.ai_cat_inject'), value: 'inject' },
  { label: t('page.visit_log.ai_cat_scan'), value: 'scan' },
  { label: t('page.visit_log.ai_cat_other'), value: 'other' },
]);
const aiCatLabels = computed<Record<string, string>>(() => ({
  sqli: t('page.visit_log.ai_cat_sqli'),
  xss: t('page.visit_log.ai_cat_xss'),
  rce: t('page.visit_log.ai_cat_rce'),
  traversal: t('page.visit_log.ai_cat_traversal'),
  inject: t('page.visit_log.ai_cat_inject'),
  scan: t('page.visit_log.ai_cat_scan'),
  owasp: 'OWASP',
  other: t('page.visit_log.ai_cat_other'),
}));

// 加载当前页日志的 AI 训练标签修正状态
function loadAiMarks() {
  const uuids = (data.value || []).map((r) => r.req_uuid).filter((u) => !!u);
  if (uuids.length === 0) {
    aiMarkMap.value = {};
    return;
  }
  aiLabelByUuidsApi({ req_uuids: uuids })
    .then((res: any) => {
      if (res.code === 0) {
        aiMarkMap.value = res.data || {};
      }
    })
    .catch(() => {});
}

// info: { mark, attack_type }
function aiMarkText(info: { mark: string; attack_type: string }) {
  if (!info || !info.mark) return '';
  if (info.mark === 'normal') return t('page.visit_log.ai_mark_normal');
  if (info.mark === 'ignore') return t('page.visit_log.ai_mark_ignore');
  if (info.mark === 'attack') {
    const cat = info.attack_type ? aiCatLabels.value[info.attack_type] || info.attack_type : '';
    return cat ? `${t('page.visit_log.ai_mark_attack')}:${cat}` : t('page.visit_log.ai_mark_attack');
  }
  return '';
}

// 打开标记弹窗，预填已有标记
function openAiMarkDialog(row: Record<string, any>) {
  aiMarkDialogRow.value = row;
  const existing = aiMarkMap.value[row.req_uuid];
  aiMarkForm.verdict = existing && existing.mark ? existing.mark : 'attack';
  aiMarkForm.attackType = existing && existing.attack_type ? existing.attack_type : '';
  aiMarkDialogVisible.value = true;
}

function confirmAiMark() {
  if (!aiMarkDialogRow.value) return;
  const v = aiMarkForm.verdict;
  const value = v === 'attack' ? `attack|${aiMarkForm.attackType || ''}` : v;
  handleAiMark(aiMarkDialogRow.value, value);
  aiMarkDialogVisible.value = false;
}

function confirmAiUnmark() {
  if (!aiMarkDialogRow.value) return;
  handleAiMark(aiMarkDialogRow.value, 'unmark');
  aiMarkDialogVisible.value = false;
}

// 标记/取消标记某条日志的训练标签；value 形如 normal/ignore/unmark 或 attack|<type>
function handleAiMark(row: Record<string, any>, value: string) {
  if (value === 'unmark') {
    aiUnmarkLabelApi({ req_uuid: row.req_uuid })
      .then((res: any) => {
        if (res.code === 0) {
          const m = { ...aiMarkMap.value };
          delete m[row.req_uuid];
          aiMarkMap.value = m;
          MessagePlugin.success(t('page.visit_log.ai_mark_unmarked'));
        } else {
          MessagePlugin.error(res.msg);
        }
      })
      .catch(() => {});
    return;
  }
  let mark = value;
  let attackType = '';
  if (value.indexOf('attack') === 0) {
    mark = 'attack';
    attackType = value.split('|')[1] || '';
  }
  aiMarkLabelApi({
    req_uuid: row.req_uuid,
    host_code: row.host_code,
    mark,
    attack_type: attackType,
    rule: row.rule,
    src_ip: row.src_ip,
    url: row.url,
  })
    .then((res: any) => {
      if (res.code === 0) {
        aiMarkMap.value = { ...aiMarkMap.value, [row.req_uuid]: { mark, attack_type: attackType } };
        MessagePlugin.success(t('page.visit_log.ai_mark_success'));
      } else {
        MessagePlugin.error(res.msg);
      }
    })
    .catch(() => {});
}
const rowKey = 'REQ_UUID';
const columnControllerVisible = ref(false);
const tempDisplayColumns = ref<string[]>([]);
const defaultDisplayColumns = staticColumn.concat([
  'guest_identification',
  'time_spent',
  'create_time',
  'host',
  'method',
  'url',
  'src_ip',
  'country',
  'log_only_mode',
  'req_uuid',
]);
const displayColumns = ref<string[]>(
  staticColumn.concat([
    'guest_identification',
    'time_spent',
    'create_time',
    'host',
    'method',
    'url',
    'src_ip',
    'country',
    'log_only_mode',
  ]),
);

const inputFilter = {
  type: 'input' as const,
  resetValue: '',
  confirmEvents: ['onEnter'],
  props: { placeholder: '' },
  showConfirmAndReset: true,
};

// 全部列定义（访问日志视图由 computed columns 摘掉 header 列——报文已搬进报文表，窄行没有这一列）
const allColumns = computed<TableProps['columns']>(() => [
  {
    title: t('page.visit_log.guest_identity'),
    width: 100,
    ellipsis: true,
    colKey: 'guest_identification',
    filter: { ...inputFilter, props: { placeholder: t('common.placeholder') } },
  },
  { title: t('page.visit_log.time_spent'), width: 100, ellipsis: true, colKey: 'time_spent', sorter: true },
  { title: t('page.visit_log.risk_level'), width: 60, ellipsis: true, colKey: 'risk_level' },
  { title: t('common.status'), width: 60, ellipsis: true, colKey: 'action' },
  { title: t('page.visit_log.log_only_mode'), width: 120, ellipsis: true, colKey: 'log_only_mode' },
  { title: t('page.visit_log.ai_score'), width: 90, ellipsis: true, colKey: 'ai_score', sorter: true },
  { title: t('page.visit_log.trigger_rule'), align: 'left', width: 150, ellipsis: true, colKey: 'rule' },
  { title: t('page.visit_log.time'), width: 170, ellipsis: true, colKey: 'create_time', sorter: true },
  { title: t('page.visit_log.domain'), align: 'left', width: 150, ellipsis: true, colKey: 'host' },
  // 网站昵称：非 web_logs 真实列，由 host_code 在前端换取，故不支持排序/过滤
  {
    title: t('page.visit_log.host_nickname'),
    align: 'left',
    width: 130,
    ellipsis: true,
    colKey: 'host_nickname',
    cell: 'host_nickname',
  },
  { title: t('page.visit_log.request'), width: 70, ellipsis: true, colKey: 'method' },
  { title: t('page.visit_log.source_ip'), width: 200, ellipsis: true, colKey: 'src_ip', cell: 'src_ip' },
  { title: t('page.visit_log.country'), width: 100, ellipsis: true, colKey: 'country' },
  { title: t('page.visit_log.province'), width: 100, ellipsis: true, colKey: 'province' },
  { title: t('page.visit_log.city'), width: 100, ellipsis: true, colKey: 'city' },
  {
    title: t('page.visit_log.req_uuid'),
    width: 160,
    ellipsis: true,
    colKey: 'req_uuid',
    filter: { ...inputFilter, props: { placeholder: t('common.placeholder') } },
  },
  { title: t('page.visit_log.access_url'), width: 160, ellipsis: true, colKey: 'url' },
  {
    title: 'Header',
    width: 300,
    ellipsis: true,
    colKey: 'header',
    filter: { ...inputFilter, props: { placeholder: t('common.placeholder') } },
  },
  { title: 'status', width: 100, ellipsis: true, colKey: 'status' },
  {
    // UA / Referer：窄行上的列，两个视图都可筛选；访问日志视图靠它们替代「请求」全文筛选
    title: t('page.visit_log.user_agent'),
    width: 200,
    ellipsis: true,
    colKey: 'user_agent',
    filter: { ...inputFilter, props: { placeholder: t('common.placeholder') } },
  },
  {
    title: t('page.visit_log.referer'),
    width: 200,
    ellipsis: true,
    colKey: 'referer',
    filter: { ...inputFilter, props: { placeholder: t('common.placeholder') } },
  },
  { align: 'left', width: 120, colKey: 'op', title: t('common.op') },
]);

// 当前视图可见的列：访问日志视图没有 header 列（报文已搬进报文表，UA/Referer 顶替它的筛选位）
const columns = computed<TableProps['columns']>(() => {
  if (searchformData.value.view_type !== 'access') {
    return allColumns.value;
  }
  return (allColumns.value || []).filter((c: any) => c.colKey !== 'header');
});

// 内嵌在风险日志详情里时，访问日志视图展示的是该 IP 的全部行为
const accessViewLabel = computed(() =>
  props.attack_ip !== '' ? t('page.visit_log.view_access_all') : t('page.visit_log.view_access'),
);

const shardManageColumns = computed<TableProps['columns']>(() => [
  { colKey: 'label', title: t('page.visit_log.log_archive_db'), width: 230 },
  { colKey: 'cnt', title: t('page.visit_log.shard_rows'), width: 110 },
  { colKey: 'tiers', title: t('page.visit_log.shard_tiers'), width: 280 },
  { colKey: 'op', title: t('common.operation'), width: 90 },
]);

// 覆盖概括：分区一多就不该把它们全铺在提示条里，先给「跨度 + 总条数」
const shardCoverSummary = computed(() => {
  const list = queryMeta.value.shards || [];
  if (list.length < 2) return '';
  let total = 0;
  list.forEach((x: any) => {
    total += Number(x.count) || 0;
  });
  // shards 由后端按时间从新到旧给出
  const newest = shardTitle(list[0].name).split(' ·')[0];
  const oldest = shardTitle(list[list.length - 1].name).split(' ·')[0];
  return ` · ${oldest} ~ ${newest}${total ? fmtCnt(total) : ''}`;
});

// 填了访问识别码 = 点查，时间与分区都不该再要求用户选
const isUuidLookup = computed(() => !!(searchformData.value.req_uuid && searchformData.value.req_uuid.trim()));

// 可用字段列表
const availableFields = computed(() => [
  { value: 'action', label: t('common.status') },
  { value: 'rule', label: t('page.visit_log.trigger_rule') },
  { value: 'create_time', label: t('common.create_time') },
  { value: 'host', label: t('page.visit_log.domain') },
  { value: 'host_nickname', label: t('page.visit_log.host_nickname') },
  { value: 'method', label: t('page.visit_log.access_method') },
  { value: 'url', label: t('page.visit_log.access_url') },
  { value: 'header', label: t('page.visit_log.request') },
  { value: 'user_agent', label: t('page.visit_log.user_agent') },
  { value: 'referer', label: t('page.visit_log.referer') },
  { value: 'country', label: t('page.visit_log.country') },
  { value: 'province', label: t('page.visit_log.province') },
  { value: 'city', label: t('page.visit_log.city') },
  { value: 'status', label: t('page.visit_log.response_code') },
  { value: 'risk_level', label: t('page.visit_log.risk_level') },
  { value: 'guest_identification', label: t('page.visit_log.guest_identity') },
  { value: 'time_spent', label: t('page.visit_log.time_spent') },
  { value: 'log_only_mode', label: t('page.visit_log.log_only_mode') },
  { value: 'req_uuid', label: t('page.visit_log.req_uuid') },
  { value: 'ai_score', label: t('page.visit_log.ai_score') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const searchformData = ref<Record<string, any>>({
  rule: '',
  req_uuid: '',
  action: '',
  src_ip: '',
  host_code: '',
  status_code: '',
  method: '',
  unix_add_time_begin: '',
  unix_add_time_end: '',
  current_db_name: 'auto',
  log_only_mode: '',
  view_type: 'access', // access=访问日志(全量窄行) event=安全事件
});

// 排序字段
const sorts = reactive({
  sortBy: 'unix_add_time',
  descending: true,
});

// 筛选字段
const filters = reactive({
  filter_by: '',
  filter_value: '',
});

const host_dic = reactive<Record<string, string>>({});
// 「IP提取有问题?」里选站点用：只列真实站点("全局网站"不是站点，没有自己的真实IP来源配置)
const realHostOptions = ref<Array<{ value: string; label: string }>>([]);
const ipExtractHostCode = ref('');
const hostProbeVisible = ref(false);

// 跳到该站点的「真实IP来源」配置(网站防护列表页会自动打开编辑弹窗的"其他配置")
function gotoHostIpSource() {
  if (!ipExtractHostCode.value) return;
  ipExtractDialogVisible.value = false;
  router.push({ name: 'WafHost', query: { editcode: ipExtractHostCode.value, tab: 'ipsource' } });
}

// 就地查看该站点最近真实到达的请求头
function openHostProbe() {
  if (!ipExtractHostCode.value) return;
  hostProbeVisible.value = true;
}
// 主机昵称字典 host_code -> 纯昵称
const host_nickname_dic = reactive<Record<string, string>>({});
const share_db_dic = reactive<Record<string, string>>({});
const exportDbVisible = ref(false);
// 导出物=「按时间段导出选定层」的新 SQLite 文件（不再是整库备份）
const exportForm = reactive<{ range: string[]; tiers: string[] }>({
  range: [],
  tiers: ['access', 'event', 'payload', 'weblog'],
});
// 当前是否为文件型数据库(SQLite)：仅 SQLite 支持日志文件导出，MySQL 隐藏导出按钮
const isFileBasedDb = ref(true);
const visitDetailVisible = ref(false); // 访问详情弹窗
const visitDetailUid = ref(''); // 访问详情id

// 日志配置相关
const logConfigVisible = ref(false);
const logConfigSaving = ref(false);
const logConfig = ref<Record<string, any>>({
  record_log_type: 'all',
  record_max_req_body_length: '0',
  record_max_res_body_length: '0',
  record_resp: '0',
  record_all_src_byte_info: '0',
  delete_history_log_day: '7',
  log_db_size: '0',
  db_file_size: '0',
  log_persist_enable: '0',
  batch_insert: '0',
  ip_tag_db: '0',
  access_log_mode: 'db',
  access_log_retention_days: '30',
});
const logConfigItems = ref<Record<string, any>>({});

// IP提取配置相关
const ipExtractDialogVisible = ref(false);
const ipExtractFormData = ref<Record<string, any>>({
  item: 'gwaf_proxy_header',
  value: '',
  remarks: '获取访客IP头信息（按照顺序）',
});
const ipExtractRules: FormProps['rules'] = {
  item: [{ required: true, message: '', type: 'error' }],
  value: [{ required: false, message: '', type: 'error' }],
};

searchformData.value.unix_add_time_begin = ConvertStringToUnix(dateControl.range1[0]).toString();
searchformData.value.unix_add_time_end = ConvertStringToUnix(dateControl.range1[1]).toString();

onMounted(() => {
  // 先用本地缓存的列配置渲染首屏
  loadColumnConfig();
  // 加载日志配置
  loadLogConfig();

  // 作为弹窗子组件内嵌时（风险日志 / IP失败页），route 是宿主页面的路由，不参与列配置同步与 query 预设
  const isOwnRoute = route.name === 'WafvisitLog';
  if (isOwnRoute) {
    // 服务端为准，异步覆盖本地缓存结果
    loadColumnConfigFromServer();
  }

  const routeFilter = isOwnRoute ? collectRouteFilterQuery() : {};
  if (Object.keys(routeFilter).length > 0) {
    // 【issue #893 问题2】外部页面（首页卡片 / IP排行）带着筛选条件跳进来时必须以 query 为准：
    // 跳过 store 里上次离开时的搜索条件恢复，否则 searchformData 会被整体覆盖，
    // 预设筛选丢失（表现为"刷新一次才生效"）
    applyRouteFilterQuery(routeFilter);
    // 换了筛选条件，停在第 N 页没有意义；只沿用用户的每页条数偏好
    pagination.current = 1;
    if (attackLogStore.msgData && attackLogStore.msgData.pagesize) {
      pagination.pageSize = attackLogStore.msgData.pagesize;
    }
  } else if (attackLogStore.msgData) {
    // 判断 store 中是否有保存的搜索参数
    const { msgData } = attackLogStore;
    pagination.current = msgData.currentpage;
    pagination.pageSize = msgData.pagesize;
    // 用当前默认对象打底：历史缓存可能缺字段，避免 v-model 绑到 undefined
    searchformData.value = { ...searchformData.value, ...msgData.searchData };
    dateControl.range1 = [
      ConvertUnixToDate(parseInt(msgData.searchData.unix_add_time_begin, 10)),
      ConvertUnixToDate(parseInt(msgData.searchData.unix_add_time_end, 10)),
    ];
  }

  loadShareDbList();
  loadHostList().then(() => {
    getList('');
  });
});

// 同一路由内 query 变化（浏览器前进/后退等）；首次进入由 onMounted 处理，此处不触发
watch(
  () => route.query,
  (newQuery, oldQuery) => {
    if (route.name !== 'WafvisitLog') return;
    if (JSON.stringify(newQuery) === JSON.stringify(oldQuery)) return;
    const picked = collectRouteFilterQuery();
    // 未在 query 中出现的筛选字段一律清空，避免上一次的筛选残留；
    // query 全空（如从带筛选的 URL 点侧边栏菜单回来）同样按"清空重查"处理
    ROUTE_FILTER_QUERY_KEYS.forEach((key) => {
      searchformData.value[key] = Object.prototype.hasOwnProperty.call(picked, key) ? picked[key] : '';
    });
    // 日期区间与分页复位，口径与 onMounted 分支一致
    applyRouteDateQuery(picked);
    pagination.current = 1;
    getList('');
  },
  { deep: true },
);

watch(
  () => props.attack_ip,
  (newVal) => {
    if (newVal !== '') {
      updateSearchFormAttackPage();
    }
  },
);

onBeforeRouteLeave((to, from, next) => {
  // 与 Vue2 的 beforeRouteLeave 不同：Vue3 的 onBeforeRouteLeave 注册在匹配的路由记录上，
  // 弹窗内嵌实例（风险日志 / IP失败页）也会触发。必须与读取侧一样加守卫，
  // 否则内嵌实例会把弹窗里的 src_ip 和超长日期区间写进 store，污染访问日志页
  if (route.name !== 'WafvisitLog' || props.attack_ip !== '') {
    next();
    return;
  }
  // 保存搜索状态，返回时恢复（存快照，避免 store 持有活引用被后续编辑写脏）
  attackLogStore.setAttackMsgData({
    pagesize: pagination.pageSize,
    currentpage: pagination.current,
    searchData: { ...searchformData.value },
  });
  next();
});

// 切换列配置弹窗
function toggleColumnController() {
  tempDisplayColumns.value = [...displayColumns.value];
  columnControllerVisible.value = true;
}

// 确认列配置
function handleColumnControllerConfirm() {
  displayColumns.value = [...tempDisplayColumns.value];
  columnControllerVisible.value = false;
  saveColumnConfig();
}

// 取消列配置
function handleColumnControllerCancel() {
  columnControllerVisible.value = false;
  tempDisplayColumns.value = [];
}

// 全部可选列（列配置弹窗里能勾选的字段）
function allColumnFieldKeys(): string[] {
  return availableFields.value.map((f) => f.value);
}

// 读取 v1 遗留的 known 基线（仅迁移期使用）。无记录/损坏返回 null，以区别于"空数组"
function readLegacyKnownColumns(): string[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_KNOWN_COLUMNS_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0 ? arr : null;
  } catch (e) {
    return null;
  }
}

// 统一落盘本地缓存：columns 与 known 必须成对写入，杜绝两者脱节。
// 写成功后才删除 v1 遗留 key，避免写失败（配额/无痕模式）时基线丢失
function persistColumnConfigLocal(columns: string[], knownKeys: string[]) {
  const payload = {
    v: COLUMN_CONFIG_VERSION,
    account: localStorage.getItem('current_account') || '',
    columns: Array.from(new Set(columns)),
    known: knownKeys && knownKeys.length ? Array.from(new Set(knownKeys)) : allColumnFieldKeys(),
  };
  localStorage.setItem(COLUMN_CONFIG_KEY, JSON.stringify(payload)); // 异常交由调用方处理
  try {
    localStorage.removeItem(LEGACY_KNOWN_COLUMNS_KEY);
  } catch (e) {
    /* ignore */
  }
}

// 落盘本地缓存但不让写失败影响界面（无痕模式/配额满时只告警）
function persistColumnConfigLocalSafe(columns: string[], knownKeys: string[]) {
  try {
    persistColumnConfigLocal(columns, knownKeys);
  } catch (e) {
    console.warn('写入本地列配置缓存失败（不影响使用）:', e);
  }
}

// 合并列配置：known 为空则一次性按默认列补齐；否则只补"用户从未见过的新列"
function mergeColumnConfig(columns: string[], known: string[] | null): string[] {
  const allFieldKeys = allColumnFieldKeys();
  const merged = [...columns];
  if (!known || known.length === 0) {
    // 兼容旧缓存（无 known 记录）：仅此一次按默认列补齐，之后以 known 记录为准
    defaultDisplayColumns.forEach((col) => {
      if (!merged.includes(col)) merged.push(col);
    });
  } else {
    // 仅自动加入"用户从未见过的新功能列"，用户主动取消勾选的列刷新后不再被强行加回
    allFieldKeys.forEach((col) => {
      // 默认不显示的新列（需用户主动在列配置里勾选），不参与"新列自动加入"
      if (OPT_OUT_NEW_COLUMNS.includes(col)) return;
      if (!known.includes(col) && !merged.includes(col)) merged.push(col);
    });
  }
  return merged;
}

// 加载本地缓存的列配置（同步，首屏立即渲染，避免闪一下默认列）
function loadColumnConfig() {
  const allFieldKeys = allColumnFieldKeys();
  let columns: string[] | null = null;
  let known: string[] | null = null;
  try {
    const raw = localStorage.getItem(COLUMN_CONFIG_KEY);
    // 全新用户：以当前默认可见列为准并立刻写下基线，
    // 否则下次挂载会因 known 缺失而走"旧缓存兼容"分支强行补齐默认列
    if (!raw) {
      persistColumnConfigLocalSafe(displayColumns.value, allFieldKeys);
      return;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // v1 旧格式：纯数组，基线只能来自遗留 key（必须读，否则用户主动取消的默认列会被加回来）
      columns = parsed;
      known = readLegacyKnownColumns();
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.columns)) {
      // v2 格式；账号不一致时忽略缓存（多账号切换不把 A 的配置显示给 B），
      // 先落到默认配置，等服务端返回本账号的真实配置
      const currentAccount = localStorage.getItem('current_account') || '';
      if (parsed.account && currentAccount && parsed.account !== currentAccount) {
        displayColumns.value = [...defaultDisplayColumns];
        return;
      }
      columns = parsed.columns;
      known = Array.isArray(parsed.known) && parsed.known.length > 0 ? parsed.known : null;
    }
  } catch (error) {
    console.error(t('common.column_config_load_failed'), error);
    // 解析失败：内存里用默认配置，但不覆盖 localStorage，避免一次解析异常永久丢配置
    displayColumns.value = [...defaultDisplayColumns];
    return;
  }

  if (!columns || columns.length === 0) {
    // 空/损坏：回退默认并重建基线，保证下次挂载稳定
    displayColumns.value = [...defaultDisplayColumns];
    persistColumnConfigLocalSafe(displayColumns.value, allFieldKeys);
    return;
  }

  const merged = mergeColumnConfig(columns, known);
  displayColumns.value = merged;
  // 关键：合并结果 + 最新基线一起落盘，让加载幂等（旧实现只回写 known 不回写 columns，
  // 导致"本次挂载合并出 A、下次挂载读出 B"的不对称，正是 #893 的根因）
  persistColumnConfigLocalSafe(merged, allFieldKeys);
}

// 把当前列配置同步到服务端
function syncColumnConfigToServer() {
  const payload = {
    v: COLUMN_CONFIG_VERSION,
    columns: Array.from(new Set(displayColumns.value)),
    known: allColumnFieldKeys(),
  };
  return save_ui_preference_api({
    pref_name: COLUMN_PREF_NAME,
    pref_json: JSON.stringify(payload),
  }).then((res: any) => {
    if (res.code !== 0) {
      return Promise.reject(new Error(res.msg || 'save failed'));
    }
    return res;
  });
}

// 从服务端加载列配置（异步，服务端为准，覆盖本地缓存结果）
function loadColumnConfigFromServer() {
  get_ui_preference_api({ pref_name: COLUMN_PREF_NAME })
    .then((res: any) => {
      if (res.code !== 0) {
        console.warn('获取服务端列配置失败:', res.msg);
        return;
      }
      if (res.data && res.data.id && res.data.pref_json) {
        const payload = JSON.parse(res.data.pref_json);
        if (payload && Array.isArray(payload.columns) && payload.columns.length > 0) {
          const known = Array.isArray(payload.known) && payload.known.length > 0 ? payload.known : null;
          const merged = mergeColumnConfig(payload.columns, known);
          displayColumns.value = merged;
          persistColumnConfigLocalSafe(merged, allColumnFieldKeys());
          return;
        }
      }
      // 服务端还没有记录：把当前（本地缓存/默认）配置同步上去一次，
      // 让存量用户的 localStorage 配置无感迁移到服务端
      syncColumnConfigToServer().catch(() => {});
    })
    .catch((err) => {
      // 接口不可用（如后端为老版本）时保持本地缓存结果，不打扰用户
      console.warn('获取服务端列配置异常:', err);
    });
}

// 保存列配置（本地缓存 + 服务端）
function saveColumnConfig(successMsgKey?: string) {
  // known 更新为全量：用户此刻正看着列配置弹窗里的全部字段，等价于"全部已见过"，
  // 这保证他主动取消的列（含 OPT_OUT_NEW_COLUMNS 里的列）之后不会被"新列自动加入"逻辑加回
  persistColumnConfigLocalSafe(displayColumns.value, allColumnFieldKeys());
  // 成功提示等服务端返回后再弹，避免与调用方的提示重复/乱序
  const successKey = successMsgKey || 'common.column_config_saved';
  syncColumnConfigToServer()
    .then(() => {
      MessagePlugin.success(t(successKey));
    })
    .catch((error) => {
      console.warn('同步列配置到服务端失败:', error);
      MessagePlugin.warning(t('common.column_config_sync_failed'));
    });
}

// 重置列配置为默认值
function resetColumnConfig() {
  // eslint-disable-next-line no-alert
  if (window.confirm(t('common.column_config_reset_confirm'))) {
    displayColumns.value = [...defaultDisplayColumns];
    saveColumnConfig('common.column_config_reset_success');
  }
}

// 收集路由 query 中的显式筛选意图。
// 用 hasOwnProperty 判定"存在"：?action= 得到 ''、?action 得到 null，
// 这两种都属于"调用方明确要求把该字段设成空"，用 != null 判定会漏掉后者
function collectRouteFilterQuery(): Record<string, string> {
  const query = route.query || {};
  const picked: Record<string, string> = {};
  ROUTE_FILTER_QUERY_KEYS.concat(ROUTE_DATE_QUERY_KEYS).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(query, key)) return;
    const v = (query as Record<string, any>)[key];
    // vue-router 对重复 key 会给数组，取第一个；null（?key 无值）归一成空串
    picked[key] = Array.isArray(v) ? (v[0] == null ? '' : String(v[0])) : v == null ? '' : String(v);
  });
  return picked;
}

// 应用路由带来的日期区间；未指定则复位成"今天"，与首页"今日"类入口口径一致
function applyRouteDateQuery(picked: Record<string, string>) {
  const begin = picked.date_begin;
  const end = picked.date_end;
  const newRange = begin && end ? [begin, end] : [`${NowDate} 00:00:00`, `${NowDate} 23:59:59`];
  dateControl.range1 = newRange;
  searchformData.value.unix_add_time_begin = ConvertStringToUnix(newRange[0]).toString();
  searchformData.value.unix_add_time_end = ConvertStringToUnix(newRange[1]).toString();
}

// 把 query 预设应用到当前（初始化为今天）的搜索表单上
function applyRouteFilterQuery(picked: Record<string, string>) {
  Object.keys(picked).forEach((key) => {
    if (ROUTE_DATE_QUERY_KEYS.includes(key)) return; // 日期区间单独处理
    searchformData.value[key] = picked[key];
  });
  applyRouteDateQuery(picked);
}

function updateSearchFormAttackPage() {
  if (props.attack_ip !== '') {
    searchformData.value.src_ip = props.attack_ip;
    // 风险详情默认落在安全事件视图（命中明细）；旁边的「全部行为」页签是该 IP 的访问日志视图
    searchformData.value.view_type = 'event';
    dateControl.range1 = ['2022-01-01 00:00:00', `${NowDate} 23:59:59`];
    searchformData.value.unix_add_time_begin = ConvertStringToUnix(dateControl.range1[0]).toString();
    searchformData.value.unix_add_time_end = ConvertStringToUnix(dateControl.range1[1]).toString();
    pagination.current = 1;
    getList('');
  }
}

// 条数写成人能读的样子：13.5 万条 而不是 135140
function fmtCnt(n: any): string {
  if (n === undefined || n === null || n === '') return '';
  const v = Number(n);
  if (Number.isNaN(v)) return '';
  if (v >= 10000) return ` · ${(v / 10000).toFixed(1)} 万条`;
  return ` · ${v} 条`;
}

// 归档分片的显示名：实时单独标出，按月分区显示「年-月」，
// 旧分片显示起止时间——同一天切了好几个时必须带上时分，否则七条长得一模一样。
function shardLabel(item: Record<string, any>): string {
  const cnt = fmtCnt(item.cnt);
  if (item.is_current) {
    return t('page.visit_log.shard_live') + cnt;
  }
  // 按层过期之后，窄行那一层可能已经被回收，只剩安全事件与报文——
  // 下拉里得标出来，否则选中它再切到访问日志视图只会得到一句生硬的报错
  const note =
    item.tiers && item.tiers.length > 0 && item.tiers.indexOf('access_log') < 0
      ? ` · ${t('page.visit_log.shard_only_event')}`
      : '';
  if (item.period_key && item.period_key.length >= 6) {
    return `${item.period_key.substring(0, 4)}-${item.period_key.substring(4, 6)}${cnt}${note}`;
  }
  const dayOf = (v: any) => (v ? String(v).substring(0, 10) : '');
  const hm = (v: any) => (v ? String(v).substring(11, 16) : '');
  const from = dayOf(item.start_time);
  const to = dayOf(item.end_time);
  if (from && from === to) {
    // 同一天内切出来的：带时分才分得清
    const a = hm(item.start_time);
    const b = hm(item.end_time);
    return (a || b ? `${from} ${a}~${b}` : from) + cnt + note;
  }
  if (from || to) {
    return `${from} ~ ${to}${cnt}${note}`;
  }
  // 时间信息都缺（脏数据）：退回显示原始标识，至少还能对上库里的东西
  return item.file_name + cnt;
}

// 内嵌模式下没有时间控件，用快选改范围
function applyQuickRange() {
  const d = (tm: Date) => {
    const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${tm.getFullYear()}-${p(tm.getMonth() + 1)}-${p(tm.getDate())}`;
  };
  const days = parseInt(quickRange.value, 10);
  const end = `${d(new Date())} 23:59:59`;
  const start = days > 0 ? `${d(new Date(+new Date() - 86400000 * (days - 1)))} 00:00:00` : '1970-01-02 00:00:00';
  dateControl.range1 = [start, end];
}

// 分区管理：打开前刷一次，免得删完别处看到的还是旧列表
function openShardManage() {
  loadShareDbList();
  shardManageVisible.value = true;
}

function tierLabel(tier: string): string {
  const m: Record<string, string> = {
    access_log: t('page.visit_log.view_access'),
    security_event: t('page.visit_log.view_event'),
    event_payload: t('page.visit_log.export_tier_payload'),
    web_logs: t('page.visit_log.export_tier_weblog'),
  };
  return m[tier] || tier;
}

function confirmDeleteShard(row: Record<string, any>) {
  const name = shardTitle(row.file_name);
  DialogPlugin.confirm({
    header: t('page.visit_log.shard_del_title'),
    body: t('page.visit_log.shard_del_body', { name, raw: row.file_name }),
    theme: 'warning',
    confirmBtn: { content: t('common.delete'), theme: 'danger' },
    onConfirm: () => {
      delsharedb({ file_name: row.file_name })
        .then((res) => {
          if (res.code === 0) {
            MessagePlugin.success(res.msg || t('page.visit_log.shard_del_done'));
            loadShareDbList();
            // 删掉的可能正好是当前锁定的分区，回到自动模式免得查了个不存在的东西
            if (searchformData.value.current_db_name === row.file_name) {
              searchformData.value.current_db_name = 'auto';
            }
            getList('all');
          } else {
            MessagePlugin.error(res.msg || t('page.visit_log.shard_del_fail'));
          }
        })
        .catch(() => {
          MessagePlugin.error(t('page.visit_log.shard_del_fail'));
        });
    },
  });
}

// 空态里点「IP归属查询」：带上当前筛的来源IP，直接看它是不是被排除清单命中了
function openIpLookupForHint() {
  const ip = (searchformData.value.src_ip || '').trim();
  openIpLookup(ip);
}

// 展开「日志配置」卡并滚到顶：保留天数就在那里改
function openRetentionSetting() {
  logConfigVisible.value = true;
  nextTick(() => {
    const el = document.querySelector('.log-config-card');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// 超预算时的一键补救：把时间范围收到最近 7 天再查
function narrowRange() {
  quickRange.value = '7';
  applyQuickRange();
  getList('all');
}

// 分区的显示名：优先用下拉里已经算好的标签，取不到就退回原始标识
function shardTitle(name: string): string {
  if (!name) return '';
  return share_db_dic[name] || name;
}

function loadShareDbList() {
  allsharedblist()
    .then((res) => {
      if (res.code === 0) {
        const shareOptions = res.data;
        let currentName = '';
        shardRows.value = shareOptions;
        const gLive = { label: t('page.visit_log.shard_group_live'), options: [] as Array<{ value: string; label: string }> };
        const gPeriod = { label: t('page.visit_log.shard_group_period'), options: [] as Array<{ value: string; label: string }> };
        const gLegacy = { label: t('page.visit_log.shard_group_legacy'), options: [] as Array<{ value: string; label: string }> };
        for (let i = 0; i < shareOptions.length; i++) {
          const it = shareOptions[i];
          // 下拉里显示「时间段」而不是文件名/表名：归档分区按月切，用户要找的是某段时间的日志
          const label = shardLabel(it);
          share_db_dic[it.file_name] = label;
          const opt = { value: it.file_name, label };
          // 后端按驱动标记当前(实时)分片：SQLite=local_log.db，MySQL=web_logs
          if (it.is_current) {
            currentName = it.file_name;
            gLive.options.push(opt);
          } else if (it.period_key) {
            gPeriod.options.push(opt);
          } else {
            gLegacy.options.push(opt);
          }
        }
        shardGroups.value = [gLive, gPeriod, gLegacy].filter((g) => g.options.length > 0);
        // 默认停在「自动（按时间范围）」：分区由时间算出来，不再让用户自己猜
        // （旧默认是实时分片，会出现「日期选了上个月、分区停在实时 → 0 条」）
        // 文件型(SQLite)实时分片名以 .db 结尾；MySQL 为 web_logs(无后缀)。据此决定是否显示导出按钮
        isFileBasedDb.value = currentName === '' || currentName.endsWith('.db');
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          const hostOptions = res.data;
          const realHosts: Array<{ value: string; label: string }> = [];
          for (let i = 0; i < hostOptions.length; i++) {
            host_dic[hostOptions[i].value] = hostOptions[i].label;
            host_nickname_dic[hostOptions[i].value] = hostOptions[i].nickname || '';
            if (hostOptions[i].global_host !== 1) {
              realHosts.push({ value: hostOptions[i].value, label: hostOptions[i].label });
            }
          }
          realHostOptions.value = realHosts;
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        reject(e);
      });
  });
}

// 获取过滤后的搜索数据
function getFilteredSearchData() {
  const filteredData: Record<string, any> = {};
  Object.keys(searchformData.value).forEach((key) => {
    const value = searchformData.value[key];
    if (typeof value === 'string') {
      filteredData[key] = value.trim();
    } else {
      filteredData[key] = value;
    }
  });
  return filteredData;
}

function getList(keyword?: string) {
  if (keyword !== undefined && keyword === 'all') {
    pagination.current = 1;
  }
  searchformData.value.unix_add_time_begin = ConvertStringToUnix(dateControl.range1[0]).toString();
  searchformData.value.unix_add_time_end = ConvertStringToUnix(dateControl.range1[1]).toString();

  const sortDescending = sorts.descending ? 'desc' : 'asc';

  dataLoading.value = true;
  attacklogVisitListApi({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    sort_by: sorts.sortBy,
    sort_descending: sortDescending,
    filter_by: filters.filter_by,
    filter_value: filters.filter_value,
    unix_add_time_begin: ConvertStringToUnix(dateControl.range1[0]).toString(),
    unix_add_time_end: ConvertStringToUnix(dateControl.range1[1]).toString(),
    ...getFilteredSearchData(),
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        // 这次查了哪些分区 / 识别码在哪找到的：自动模式下用户没选分区，界面要能解释
        queryMeta.value = {
          shards: res.data.shards || [],
          found_in: res.data.found_in || '',
          scanned: res.data.scanned || 0,
          uuid_lookup: !!res.data.uuid_lookup,
          sort_forced_time: !!res.data.sort_forced_time,
          partial: !!res.data.partial,
          took_ms: res.data.took_ms || 0,
        };
        pagination.total = res.data.total;
        loadAiMarks();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function handelExport() {
  if (exportForm.tiers.length === 0) {
    MessagePlugin.warning(t('page.visit_log.export_tiers'));
    return;
  }
  exportlog({
    start_time: (exportForm.range && exportForm.range[0]) || '',
    end_time: (exportForm.range && exportForm.range[1]) || '',
    tiers: exportForm.tiers.join(','),
  })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(t('page.visit_log.export_started'));
      } else {
        MessagePlugin.error(res.msg || t('page.visit_log.export_db_file_header'));
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
  getList('');
}

function rehandleSelectChange(val: (string | number)[]) {
  selectedRowKeys.value = val;
}

function handleClickDetail(e: { row: Record<string, any> }) {
  const { req_uuid } = e.row;
  // 行自带来源分区（扇出时后端回填）：带上它详情就能直达，不必再逐个分区找
  const shard = e.row.shard_name || searchformData.value.current_db_name;
  if (props.attack_ip === '') {
    router.push({
      path: '/waf/wafattacklogdetail',
      query: {
        req_uuid: `${req_uuid}#${shard}`,
      },
    });
  } else {
    visitDetailUid.value = req_uuid;
    visitDetailVisible.value = true;
  }
}

function handleClickIPDetail(e: { row: Record<string, any> }) {
  const { src_ip } = e.row;
  searchformData.value.src_ip = src_ip;
  getList('');
}

// Jump Url

/**
 * table 排序
 */
function onSortChange(sorter: any) {
  if (sorter !== undefined && sorter !== null) {
    sorts.sortBy = sorter.sortBy;
    sorts.descending = sorter.descending;
  } else {
    sorts.sortBy = 'unix_add_time';
    sorts.descending = true;
  }
  getList('');
}

// 切换访问日志/安全事件视图。「请求」全文筛选只在安全事件视图有，切走时摘掉，否则后端会拒
function onViewTypeChange() {
  if (searchformData.value.view_type !== 'event' && filters.filter_by.indexOf('header') >= 0) {
    filters.filter_by = '';
    filters.filter_value = '';
  }
  pagination.current = 1;
  getList('');
}

/**
 * 筛选结果
 */
function onFilterChange(e: Record<string, any>) {
  filters.filter_by = '';
  filters.filter_value = '';
  // 访客身份
  if (e.guest_identification !== undefined && e.guest_identification !== '') {
    filters.filter_by = 'guest_identification';
    filters.filter_value = e.guest_identification;
  }
  // 请求ID
  if (e.req_uuid !== undefined && e.req_uuid !== '') {
    if (filters.filter_by === '') {
      filters.filter_by = 'req_uuid';
      filters.filter_value = e.req_uuid;
    } else {
      filters.filter_by = `${filters.filter_by}|req_uuid`;
      filters.filter_value = `${filters.filter_value}|${e.req_uuid}`;
    }
  }
  // header
  if (e.header !== undefined && e.header !== '') {
    if (filters.filter_by === '') {
      filters.filter_by = 'header';
      filters.filter_value = e.header;
    } else {
      filters.filter_by = `${filters.filter_by}|header`;
      filters.filter_value = `${filters.filter_value}|${e.header}`;
    }
  }
  //User-Agent / Referer（窄行列，两个视图都可用）
  if (e.user_agent !== undefined && e.user_agent !== '') {
    if (filters.filter_by === '') {
      filters.filter_by = 'user_agent';
      filters.filter_value = e.user_agent;
    } else {
      filters.filter_by = `${filters.filter_by}|user_agent`;
      filters.filter_value = `${filters.filter_value}|${e.user_agent}`;
    }
  }
  if (e.referer !== undefined && e.referer !== '') {
    if (filters.filter_by === '') {
      filters.filter_by = 'referer';
      filters.filter_value = e.referer;
    } else {
      filters.filter_by = `${filters.filter_by}|referer`;
      filters.filter_value = `${filters.filter_value}|${e.referer}`;
    }
  }
  getList('');
}

function resetState() {
  searchForm.value?.reset();
  dateControl.range1 = [`${NowDate} 00:00:00`, `${NowDate} 23:59:59`];
  searchformData.value.unix_add_time_begin = ConvertStringToUnix(dateControl.range1[0]).toString();
  searchformData.value.unix_add_time_end = ConvertStringToUnix(dateControl.range1[1]).toString();
}

// 切换日志配置区域显示/隐藏
function toggleLogConfig() {
  logConfigVisible.value = !logConfigVisible.value;
}

const LOG_CONFIG_KEYS = [
  'record_log_type',
  'record_max_req_body_length',
  'record_max_res_body_length',
  'record_resp',
  'record_all_src_byte_info',
  'delete_history_log_day',
  'log_db_size',
  'db_file_size',
  'log_persist_enable',
  'batch_insert',
  'ip_tag_db',
  'access_log_mode',
  'access_log_retention_days',
  'exclude_ip_log',
];

// 加载日志配置
function loadLogConfig() {
  const promises = LOG_CONFIG_KEYS.map((key) => {
    return get_detail_by_item_api({ item: key })
      .then((res) => {
        if (res.code === 0 && res.data) {
          logConfigItems.value[key] = res.data;
          // 直接使用原始值，不做类型转换
          logConfig.value[key] = res.data.value;
        }
        return { key, success: true };
      })
      .catch((err) => {
        console.error(`加载配置项 ${key} 失败:`, err);
        return { key, success: false };
      });
  });

  Promise.all(promises).then((results) => {
    const failedItems = results.filter((r) => !r.success);
    if (failedItems.length > 0) {
      console.warn('部分配置项加载失败:', failedItems);
    }
  });
}

// 保存日志配置
function saveLogConfig() {
  logConfigSaving.value = true;

  const savePromises = LOG_CONFIG_KEYS.map((key) => {
    const item = logConfigItems.value[key];
    if (item) {
      return edit_system_config_api({
        id: item.id,
        category: item.category,
        item: item.item,
        value: String(logConfig.value[key]),
        type: item.type,
        title: item.title,
        options: item.options || '',
      }).catch((err) => {
        console.error(`保存配置项 ${key} 失败:`, err);
        throw err;
      });
    }
    return Promise.resolve();
  });

  Promise.all(savePromises)
    .then(() => {
      MessagePlugin.success(t('common.tips.save_success'));
      getList('');
    })
    .catch((e) => {
      console.error('保存日志配置失败', e);
      MessagePlugin.error(t('common.tips.save_failed'));
    })
    .finally(() => {
      logConfigSaving.value = false;
    });
}

// 处理IP提取问题
function handleIPExtractIssue() {
  ipExtractDialogVisible.value = true;
  get_detail_by_item_api({ item: 'gwaf_proxy_header' })
    .then((res) => {
      if (res.code === 0 && res.data) {
        ipExtractFormData.value = res.data;
      }
    })
    .catch((err) => {
      console.error('获取IP提取配置失败:', err);
    });
}

// 快捷选择IP头信息
function selectIPHeader(headerValue: string) {
  ipExtractFormData.value.value = headerValue;
  MessagePlugin.success(`已选择: ${headerValue}`);
}

// 打开视频教程
function openVideoTutorial() {
  window.open('https://www.bilibili.com/video/BV1pn8Ez2ELQ/', '_blank');
}

// 提交IP提取配置
const onSubmitIPExtract: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult === true) {
    edit_system_config_api(ipExtractFormData.value)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          ipExtractDialogVisible.value = false;
        } else {
          MessagePlugin.error(res.msg);
        }
      })
      .catch((err: Error) => {
        MessagePlugin.error(err.message);
      });
  }
};

defineExpose({ resetState });
</script>

<style scoped>
.t-button + .t-button {
  margin-left: 8px;
}

.form-item-tips {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}

.log-config-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-warning-color);
  line-height: 1.4;
}
</style>
