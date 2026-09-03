<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddHost">{{ t('page.host.new_protection') }}</t-button>
          <t-button variant="base" theme="default" @click="HandleExportExcel()">{{ t('page.host.export_data') }}</t-button>
          <t-button variant="base" theme="default" @click="HandleImportExcel()">{{ t('page.host.import_data') }}</t-button>
          <t-button variant="base" theme="warning" @click="handleModifyAllGuardStatus()">{{ t('page.host.modify_all_guard_status') }}</t-button>
          <t-button variant="base" theme="primary" @click="handleBatchCopyConfig()">{{ t('page.host.batch_copy_config') }}</t-button>
          <t-button variant="base" theme="success" @click="handleImportNginx()">{{ t('page.host.import_nginx') }}</t-button>
          <t-button variant="base" theme="default" @click="handlePortOverview()">{{ t('page.host.port_listen.overview_title') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form :data="searchformData" :label-width="80" colon layout="inline" :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.host.website')" name="code">
              <t-select v-model="searchformData.code" clearable filterable :style="{ width: '200px' }">
                <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                  {{ item }}
                </t-option>
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

      <!-- 分组导航（轻量文本条）：放顶部而不是左栏——横向宽度已经卡死在「操作列点不到」的边缘，
           纵向多一行几乎无感。刻意去掉边框/底色、选中态只用主色文字+下划线，
           好让它明显低于上面那排动作按钮：分组是筛选维度，不是主操作 -->
      <div class="host-group-bar">
        <span class="hg-bar-label">{{ t('page.host.group.title') }}</span>
        <span class="hg-gl" :class="{ on: currentGroup === 'all' }" @click="pickGroup('all')">
          <span class="hg-nm">{{ t('page.host.group.all_hosts') }}</span><em>{{ groupAllCount }}</em>
        </span>
        <span class="hg-gl" :class="{ on: currentGroup === '__none__' }" @click="pickGroup('__none__')">
          <span class="hg-nm">{{ t('page.host.group.ungrouped') }}</span><em>{{ groupNoneCount }}</em>
        </span>
        <span v-if="hostGroups.length" class="hg-gsep"></span>
        <span
          v-for="(g, gi) in hostGroups"
          :key="g.group_code"
          class="hg-gl"
          :class="{ on: currentGroup === g.group_code }"
          :title="g.group_name"
          @click="pickGroup(g.group_code)"
        >
          <span class="hg-nm">{{ g.group_name }}</span><em>{{ g.host_count }}</em>
          <!-- click.stop 加在组件根元素上：阻止冒泡到「切换分组」，
               同时不影响 dropdown 自己挂在同一元素上的展开逻辑 -->
          <t-dropdown :options="groupMenuOptions(gi)" trigger="click" @click="onGroupMenuClick($event, g, gi)" @click.stop>
            <span class="hg-more">⋮</span>
          </t-dropdown>
        </span>
        <span class="hg-gsep"></span>
        <!-- 「新建分组」「移动到分组」都是分组域内的动作，和分组标签放一起；
             主工具栏只留网站维度的动作，主次才不会又混在一起 -->
        <span class="hg-gl add" @click="openGroupForm(null)">＋ {{ t('page.host.group.new_group') }}</span>
        <span
          class="hg-gl add"
          :class="{ disabled: selectedRowKeys.length === 0 }"
          :title="selectedRowKeys.length === 0 ? t('page.host.group.move_need_select') : ''"
          @click="selectedRowKeys.length && openAssignGroup()"
        >
          ⇄ {{ selectedRowKeys.length ? t('page.host.group.move_to_group_n', { n: selectedRowKeys.length }) : t('page.host.group.move_to_group') }}
        </span>
      </div>

      <div class="table-container">
        <help-block :summary="t('page.host.core_features')" doc="guide/Host" />
        <t-table
          :columns="columns"
          size="small"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
          @sort-change="onSortChange"
          @filter-change="onFilterChange"
        >
          <template #group_code="{ row }">
            <!-- 全局网站不参与分组；组名/颜色由 hostgroup/all 的字典映射，映射不到即「未知分组」（跨实例导入的常见情形） -->
            <span v-if="row.global_host === 1" style="color: var(--td-text-color-placeholder)">—</span>
            <span v-else-if="!row.group_code" class="hg-tag none">{{ t('page.host.group.ungrouped') }}</span>
            <span v-else-if="!groupDict[row.group_code]" class="hg-tag unknown" :title="t('page.host.group.unknown_group_tip')">
              {{ t('page.host.group.unknown_group') }}
            </span>
            <span
              v-else
              class="hg-tag"
              :style="{ background: hexToSoft(groupDict[row.group_code].color), color: groupDict[row.group_code].color }"
              @click="pickGroup(row.group_code)"
            >
              <i class="hg-dot" :style="{ background: groupDict[row.group_code].color }"></i>{{ groupDict[row.group_code].group_name }}
            </span>
          </template>
          <template #host="{ row }">
            <div>
              <div v-if="row.nickname" style="color: #888; font-size: 12px; margin-bottom: 2px">{{ row.nickname }}</div>
              <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px">
                <span :title="row.host" style="font-weight: 500">{{ row.host }}</span>
                <t-tag v-if="row.ssl === SSL_STATUS.SSL" theme="success" variant="light" size="small" :title="t('page.host.ssl_yes')">SSL</t-tag>
              </div>
              <div v-if="row.bind_more_host && row.bind_more_host.trim()" style="display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px">
                <t-tag
                  v-for="(domain, i) in splitDomains(row.bind_more_host)"
                  :key="i"
                  theme="default"
                  variant="light"
                  size="small"
                  :title="domain"
                  style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                >
                  {{ domain }}
                </t-tag>
              </div>
            </div>
          </template>
          <template #port="{ row }">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 3px">
              <!-- 有 resolved_listens 时按「端口·协议」展示（含冲突红标，issue #955），否则退回老展示 -->
              <template v-if="Array.isArray(row.resolved_listens) && row.resolved_listens.length > 0">
                <t-tag
                  v-for="(l, i) in row.resolved_listens.filter((x: any) => !x.implied)"
                  :key="'rl' + i"
                  :theme="row.port_conflict ? 'danger' : l.proto === 'https' ? 'success' : 'primary'"
                  variant="light"
                  size="small"
                  :title="`${l.port} · ${l.proto.toUpperCase()}${l.ipv && l.ipv !== 'both' ? ` · ${l.ipv}` : ''}`"
                >
                  {{ l.port }}·{{ l.proto === 'https' ? 'HTTPS' : 'HTTP' }}
                </t-tag>
                <t-tooltip v-if="row.port_conflict" :content="t('page.host.port_listen.conflict_tip')" placement="top">
                  <t-tag theme="danger" size="small">{{ t('page.host.port_listen.conflict') }}</t-tag>
                </t-tooltip>
              </template>
              <template v-else>
                <span style="font-weight: 500; min-width: 36px">{{ row.port }}</span>
                <template v-if="row.bind_more_port && row.bind_more_port.trim()">
                  <t-tag v-for="(p, i) in splitPorts(row.bind_more_port)" :key="i" theme="primary" variant="light" size="small" :title="p">
                    {{ p }}
                  </t-tag>
                </template>
              </template>
            </div>
          </template>
          <template #data_stats="{ row }">
            <div style="line-height: 1.8">
              <div>
                <span>{{ t('page.host.today_pv_short') }}: {{ row.today_pv_count || 0 }}</span>
                <span style="margin-left: 8px">{{ t('page.host.today_uv_short') }}: {{ row.today_uv_count || 0 }}</span>
                <span style="margin-left: 8px">{{ t('page.host.today_attack_short') }}: {{ row.today_attack_count || 0 }}</span>
              </div>
              <div>
                <span>{{ t('page.host.today_traffic_in_short') }}: {{ formatTrafficBytes(row.today_traffic_in || 0) }}</span>
                <span style="margin-left: 8px">{{ t('page.host.today_traffic_out_short') }}: {{ formatTrafficBytes(row.today_traffic_out || 0) }}</span>
              </div>
              <div>
                <span :title="t('page.host.real_qps')">{{ t('page.host.real_qps_short') }}: {{ row.real_time_qps }}</span>
                <span :title="t('page.host.real_active')" style="margin-left: 8px">{{ t('page.host.real_active_short') }}: {{ row.real_time_connect_cnt }}</span>
              </div>
            </div>
          </template>
          <template #status_switches="{ row }">
            <div style="display: flex; flex-direction: column; gap: 8px; justify-content: center">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">{{ t('page.host.healthy_status') }}:</span>
                <health-status
                  v-if="row.global_host !== 1"
                  :healthy-status="row.healthy_status"
                  :is-load-balance="row.is_enable_load_balance === '1' || row.is_enable_load_balance === 1"
                />
                <span v-else style="font-size: 12px; color: var(--td-text-color-secondary)">-</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">{{ t('page.host.guard_status') }}:</span>
                <t-switch
                  size="small"
                  :value="row.guard_status === 1"
                  :label="[t('page.host.guard_status_on'), t('page.host.guard_status_off')]"
                  @change="changeGuardStatusHandle(row)"
                />
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">{{ t('page.host.start_status') }}:</span>
                <t-switch
                  size="small"
                  :value="row.start_status === 0"
                  :label="[t('page.host.auto_start_on'), t('page.host.auto_start_off')]"
                  @change="changeStartStatusHandle(row)"
                />
              </div>
              <div v-if="row.global_host !== 1 && isStaticSiteEnabled(row)" style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">{{ t('page.host.static_service_label') }}:</span>
                <t-tag theme="success" variant="light" size="small">{{ t('page.host.static_service_label_on') }}</t-tag>
              </div>
              <div
                v-if="row.global_host !== 1 && (row.unrestricted_port === 0 || row.unrestricted_port === '0')"
                style="display: flex; justify-content: space-between; align-items: center; width: 100%"
              >
                <span style="font-size: 12px; color: var(--td-text-color-secondary); margin-right: 8px">
                  {{ t('page.host.unrestricted_port.label_unrestricted_port_is_enable') }}:
                </span>
                <t-tag theme="success" variant="light" size="small">{{ t('page.host.unrestricted_port.label_unrestricted_port_is_enable_on') }}</t-tag>
              </div>
            </div>
          </template>
          <template #op="slotProps">
            <!-- 高频的「编辑」「证书申请」保持文字直出，低频的「复制」「删除」收进「更多」：
                 4 个链接平铺会折成两行且长度参差，收敛后一行、整齐，以后再加操作项也只是往「更多」里塞 -->
            <div v-if="slotProps.row.global_host !== 1" class="op-cell">
              <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
              <!-- 表格里用短标签，全称走 title：全称 8 个字，直出会把这一列重新撑破 -->
              <a class="t-button-link" :title="t('page.host.ssl_auto_apply')" @click="handleClickSSLApply(slotProps)">
                {{ t('page.host.ssl_auto_apply_short') }}
              </a>
              <span class="op-vline"></span>
              <t-dropdown :options="rowMoreOptions()" trigger="click" @click="onRowMoreClick($event, slotProps)">
                <span class="op-more">{{ t('page.host.group.more') }} ▾</span>
              </t-dropdown>
            </div>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新建 / 编辑分组 -->
    <t-dialog
      v-model:visible="groupFormVisible"
      :header="groupForm.id ? t('page.host.group.edit_group') : t('page.host.group.new_group')"
      :width="480"
      :confirm-btn="t('common.confirm')"
      :cancel-btn="t('common.cancel')"
      @confirm="saveGroup"
    >
      <t-form :label-width="90" colon>
        <t-form-item :label="t('page.host.group.name')">
          <t-input v-model="groupForm.group_name" :maxlength="50" :placeholder="t('page.host.group.name_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.host.group.color')">
          <div class="hg-color-picker">
            <i v-for="c in groupColors" :key="c" :class="{ on: groupForm.color === c }" :style="{ background: c }" @click="groupForm.color = c"></i>
          </div>
        </t-form-item>
        <t-form-item :label="t('common.remarks')">
          <t-input v-model="groupForm.remarks" :maxlength="200" :placeholder="t('common.placeholder')" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 删除分组确认：必须写清楚有几个网站会回落到未分组 -->
    <t-dialog
      v-model:visible="groupDelVisible"
      :header="t('page.host.group.del_confirm_title', { name: groupDelTarget.group_name })"
      :width="460"
      theme="warning"
      :confirm-btn="{ content: t('common.confirm'), theme: 'danger' }"
      :cancel-btn="t('common.cancel')"
      @confirm="doDelGroup"
    >
      <p v-if="groupDelTarget.host_count > 0">{{ t('page.host.group.del_confirm_body', { n: groupDelTarget.host_count }) }}</p>
      <p v-else>{{ t('page.host.group.del_confirm_empty') }}</p>
      <p style="color: var(--td-text-color-secondary); font-size: 12px">{{ t('page.host.group.del_confirm_keep') }}</p>
    </t-dialog>

    <!-- 批量移动网站到分组 -->
    <t-dialog
      v-model:visible="assignVisible"
      :header="t('page.host.group.move_to_group')"
      :width="480"
      :confirm-btn="t('common.confirm')"
      :cancel-btn="t('common.cancel')"
      @confirm="doAssignGroup"
    >
      <p style="color: var(--td-text-color-secondary); font-size: 13px">
        {{ t('page.host.group.move_tip', { n: selectedRowKeys.length }) }}
        <span v-if="assignGlobalCount > 0">{{ t('page.host.group.move_tip_global', { n: assignGlobalCount }) }}</span>
      </p>
      <!-- 分组之间是并列关系，不是层级关系：TDesign 的 radio 自带横向间距，
           竖排时会表现成逐条往右递进的缩进，这里统一清零把它拉平 -->
      <t-radio-group v-model="assignGroupCode" class="assign-group-list">
        <t-radio value="">{{ t('page.host.group.move_out') }}</t-radio>
        <t-radio v-for="g in hostGroups" :key="g.group_code" :value="g.group_code">
          <i class="hg-dot" :style="{ background: g.color, marginRight: '6px' }"></i>{{ g.group_name }}
        </t-radio>
      </t-radio-group>
    </t-dialog>

    <!-- 端口占用总览（issue #955）：端口是全机共享资源，一个端口只能有一种协议 -->
    <t-dialog
      v-model:visible="portOverviewVisible"
      :header="t('page.host.port_listen.overview_title')"
      :width="900"
      :footer="false"
      attach="body"
    >
      <div style="margin-bottom: 12px; color: var(--td-text-color-secondary); font-size: 13px">
        {{ t('page.host.port_listen.overview_desc') }}
      </div>
      <t-loading :loading="portOverviewLoading" show-overlay>
        <t-table
          row-key="port"
          :data="portOverviewRows"
          :columns="portOverviewColumns"
          size="small"
          max-height="480"
          :row-class-name="portOverviewRowClass"
        >
          <template #port="{ row }">
            <b>{{ row.port }}</b>
          </template>
          <template #active="{ row }">
            <t-tag v-if="!row.online" theme="warning" variant="light" size="small">
              {{ t('page.host.port_listen.status_offline') }}
            </t-tag>
            <t-tag v-else :theme="row.conflict ? 'danger' : row.active_proto === 'https' ? 'success' : 'primary'" variant="light" size="small">
              {{ (row.active_proto || '').toUpperCase()
              }}<template v-if="row.active_ipv && row.active_ipv !== 'both'"> · {{ row.active_ipv }}</template>
            </t-tag>
          </template>
          <template #sites="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px">
              <t-tag
                v-for="(s, si) in row.sites"
                :key="si"
                variant="light"
                size="small"
                :theme="row.conflict ? 'danger' : 'default'"
                :title="s.host + (s.nickname ? `（${s.nickname}）` : '')"
              >
                {{ s.host }} · {{ s.proto.toUpperCase()
                }}<template v-if="s.is_main"> · {{ t('page.host.port_listen.main_suffix') }}</template
                ><template v-if="s.implied"> · {{ t('page.host.port_listen.implied_suffix') }}</template>
              </t-tag>
            </div>
          </template>
          <template #status="{ row }">
            <t-tag v-if="row.conflict" theme="danger" size="small">{{ t('page.host.port_listen.status_conflict') }}</t-tag>
            <t-tag v-else theme="success" variant="light" size="small">{{ t('page.host.port_listen.status_ok') }}</t-tag>
          </template>
        </t-table>
      </t-loading>
    </t-dialog>

    <!-- New WebSite Dialog -->
    <t-dialog
      v-model:visible="addFormVisible"
      :width="hostFormEffectiveWidth"
      :footer="false"
      :class="{ 'host-form-dialog-fullscreen': hostFormFullscreen }"
    >
      <template #header>
        {{ t('common.new') }}
        <t-link theme="primary" :href="hostAddUrl" target="_blank">
          <template #prefix-icon><link-icon /></template>
          {{ t('common.online_document') }}
        </t-link>
      </template>
      <host-form
        :value="formData"
        :dialog-visible="addFormVisible"
        :select-can-filter="selectCanFilter"
        :host-groups="hostGroups"
        @group-changed="loadHostGroups"
        @close="onClickCloseBtn"
        @submit="onSubmit"
        @tab-placement-change="onHostTabPlacementChange"
        @fullscreen-change="onHostFullscreenChange"
      />
    </t-dialog>

    <!-- Edit WebSite Dialog -->
    <t-dialog
      v-model:visible="editFormVisible"
      :width="hostFormEffectiveWidth"
      :footer="false"
      :class="{ 'host-form-dialog-fullscreen': hostFormFullscreen }"
    >
      <template #header>
        {{ t('common.edit') }}
        <span v-if="editHostLabel" class="dialog-header-host">{{ editHostLabel }}</span>
      </template>
      <host-form
        :value="formEditData"
        :dialog-visible="editFormVisible"
        :select-can-filter="selectCanFilter"
        :host-groups="hostGroups"
        @group-changed="loadHostGroups"
        :is-edit="true"
        :init-tab="editInitTab"
        @close="onClickCloseEditBtn"
        @submit="onSubmitEdit"
        @tab-placement-change="onHostTabPlacementChange"
        @fullscreen-change="onHostFullscreenChange"
      />
    </t-dialog>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />

    <t-dialog v-model:visible="ImportXlsxVisible" @confirm="ImportXlsxVisible = false">
      <t-radio-group v-model="uploadParams.import_code_strategy">
        <t-radio value="0">{{ t('page.host.upload.import_auto_create_code') }}</t-radio>
        <t-radio value="1">{{ t('page.host.upload.import_remain_code') }}</t-radio>
      </t-radio-group>
      <t-upload
        v-model="files"
        :action="fileUploadUrl"
        :tips="tips"
        :headers="fileHeader"
        :data="uploadParams"
        :before-upload="beforeUpload"
        theme="file-input"
        :placeholder="t('page.host.upload_tips')"
        @fail="handleFail"
        @success="onUploadSuccess"
      />
    </t-dialog>

    <t-dialog
      v-model:visible="guardConfirmVisible"
      :header="t('page.host.guard_status_confirm')"
      :on-cancel="onGuardStatusCancel"
      @confirm="onGuardStatusConfirm"
    >
      <div>{{ t('page.host.guard_status_confirm_content') }}</div>
    </t-dialog>

    <t-dialog
      v-model:visible="startConfirmVisible"
      :header="t('page.host.start_status_confirm')"
      :on-cancel="onStartStatusCancel"
      @confirm="onStartStatusConfirm"
    >
      <div>{{ t('page.host.start_status_confirm_content') }}</div>
    </t-dialog>

    <t-dialog v-model:visible="sslAutoApplyVisible" :header="t('page.host.ssl_auto_apply')" :width="900" :footer="false">
      <ssl-order-list :src-host-code="currentHostCode" />
    </t-dialog>

    <t-dialog
      v-model:visible="guardAllConfirmVisible"
      :header="t('page.host.modify_all_guard_status')"
      :on-cancel="onGuardAllStatusCancel"
      @confirm="onGuardAllStatusConfirm"
    >
      <div>{{ t('page.host.confirm_modify_all_guard_status') }}</div>
      <t-radio-group v-model="guardAllStatus" style="margin-top: 16px">
        <t-radio value="1">{{ t('page.host.guard_status_on') }}</t-radio>
        <t-radio value="0">{{ t('page.host.guard_status_off') }}</t-radio>
      </t-radio-group>
    </t-dialog>

    <!-- 批量复制配置弹窗 -->
    <t-dialog
      v-model:visible="batchCopyVisible"
      :header="t('page.host.batch_copy.title')"
      :confirm-btn="{ content: t('page.host.batch_copy.execute_copy'), loading: batchCopyLoading }"
      :cancel-btn="{ content: t('common.cancel') }"
      width="600px"
      @confirm="executeBatchCopy"
      @cancel="cancelBatchCopy"
    >
      <!-- 源站点选择 -->
      <div class="batch-copy-section">
        <label class="batch-copy-label">{{ t('page.host.batch_copy.source_host') }}：</label>
        <t-select v-model="batchCopyForm.sourceHost" :placeholder="t('page.host.batch_copy.select_source_host')" style="width: 100%">
          <t-option v-for="item in sourceHostOptions" :key="item.code" :value="item.code" :label="item.host">
            {{ item.host }}
          </t-option>
        </t-select>
      </div>

      <!-- 功能模块选择 -->
      <div class="batch-copy-section">
        <label class="batch-copy-label">{{ t('page.host.batch_copy.copy_modules') }}：</label>
        <div class="module-checkboxes">
          <t-checkbox
            v-for="module in availableModules"
            :key="module.value"
            :checked="batchCopyForm.modules.includes(module.value)"
            class="module-checkbox"
            @change="(checked: boolean) => handleModuleChange(module.value, checked)"
          >
            {{ module.label }}
          </t-checkbox>
        </div>
      </div>

      <!-- 目标站点选择 -->
      <div class="batch-copy-section">
        <label class="batch-copy-label">{{ t('page.host.batch_copy.target_hosts') }}：</label>
        <div class="target-hosts-container">
          <div class="select-all-container">
            <t-checkbox
              :checked="isAllTargetsSelected"
              :indeterminate="batchCopyForm.targetHosts.length > 0 && !isAllTargetsSelected"
              @change="toggleSelectAllTargets"
            >
              {{ t('page.host.batch_copy.select_all') }}
            </t-checkbox>
          </div>
          <div class="target-hosts-list">
            <t-checkbox
              v-for="host in availableTargetHosts"
              :key="host.code"
              :checked="batchCopyForm.targetHosts.includes(host.code)"
              class="target-host-checkbox"
              @change="(checked: boolean) => handleTargetHostChange(host.code, checked)"
            >
              {{ host.host }}
            </t-checkbox>
          </div>
        </div>
      </div>

      <!-- 选择统计 -->
      <div class="batch-copy-summary">
        <t-tag theme="primary" variant="light">
          {{ t('page.host.batch_copy.selected_modules', { count: batchCopyForm.modules.length }) }}
        </t-tag>
        <t-tag theme="success" variant="light" style="margin-left: 8px">
          {{ t('page.host.batch_copy.selected_targets', { count: batchCopyForm.targetHosts.length }) }}
        </t-tag>
      </div>
    </t-dialog>

    <!-- 批量复制进度弹窗 -->
    <t-dialog
      v-model:visible="batchCopyProgress.visible"
      :header="t('page.host.batch_copy.progress_title')"
      :close-on-overlay-click="false"
      :close-btn="false"
      :footer="false"
      width="500px"
    >
      <div class="progress-container">
        <t-progress
          :percentage="batchCopyProgress.total > 0 ? Math.round((batchCopyProgress.current / batchCopyProgress.total) * 100) : 0"
          :status="batchCopyProgress.status === 'error' ? 'warning' : 'active'"
          style="margin-bottom: 16px"
        />

        <div class="progress-info">
          <div class="progress-text">
            <span v-if="batchCopyProgress.status === 'processing'">
              {{ t('page.host.batch_copy.copying_to') }} {{ batchCopyProgress.currentHost }}
            </span>
            <span v-else-if="batchCopyProgress.status === 'success'" class="success-text">
              {{ t('page.host.batch_copy.copy_completed') }}
            </span>
            <span v-else-if="batchCopyProgress.status === 'error'" class="error-text">
              {{ t('page.host.batch_copy.copy_error') }}
            </span>
          </div>
          <div class="progress-count">{{ batchCopyProgress.current }} / {{ batchCopyProgress.total }}</div>
        </div>

        <div v-if="batchCopyProgress.status !== 'processing'" class="progress-actions">
          <t-button theme="primary" @click="closeBatchCopyProgress">
            {{ t('common.close') }}
          </t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, LoadingPlugin, type TableProps, type PageInfo } from 'tdesign-vue-next';
import { LinkIcon } from 'tdesign-icons-vue-next';
import { v4 as uuidv4 } from 'uuid';

import { decryptIncoming } from '@/utils/seccrypto';
import { getOnlineUrl } from '@/utils/usuallytool';
import { API_HOST } from '@/config/host';
import { SSL_STATUS } from '@/constants';
import { export_api } from '@/apis/common';
import {
  allhost,
  changeGuardStatus,
  changeStartStatus,
  hostlist,
  getHostDetail,
  delHost,
  addHost,
  editHost,
  modifyAllGuardStatus,
  batchCopyConfig,
  getPortOverview,
} from '@/apis/host';

import SslOrderList from '@/pages/waf/sslorder/index.vue';
import HealthStatus from './components/health-status/HealthStatus.vue';
import { allHostGroup, addHostGroup, editHostGroup, delHostGroup, sortHostGroup, assignHostGroup } from '@/apis/hostgroup';
import HostForm from './components/HostForm.vue';
import { INITIAL_DATA } from './constants';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// 批量复制配置相关数据
const batchCopyVisible = ref(false);
const batchCopyLoading = ref(false);
const batchCopyProgress = reactive({
  visible: false,
  current: 0,
  total: 0,
  currentHost: '',
  status: 'processing' as 'processing' | 'success' | 'error',
});
const batchCopyForm = reactive({
  sourceHost: '',
  modules: ['cache'] as string[], // 默认选中缓存模块
  targetHosts: [] as string[],
});
const availableModules = computed(() => [
  { value: 'cache', label: t('page.host.batch_copy.module_cache') },
  { value: 'response_compress', label: t('page.host.batch_copy.module_response_compress') },
]);

const uploadParams = reactive({
  import_code_strategy: '0', // 编码导入策略 0 新增自动生成 1 保留原有
  import_table: 'hosts',
});
const files = ref<any[]>([]);
const tips = ref<string>(t('page.host.upload_file_limit_size'));
const fileUploadUrl = `${API_HOST}/import`;
const fileHeader = reactive<Record<string, string>>({
  'X-Token': localStorage.getItem('access_token') || '',
});

const addFormVisible = ref(false);
const editFormVisible = ref(false);
// 编辑弹窗打开时定位的 Tab(从访问日志"IP提取有问题?"跳来时定位到"其他配置")
const editInitTab = ref(1);
// 网站表单弹窗宽度：Tab 竖向布局(left)需要更宽，横向(top)保持 750
const hostFormDialogWidth = ref(localStorage.getItem('samwaf_host_tab_placement') === 'top' ? 750 : 920);
// HostForm 内切换 Tab 布局时联动调整弹窗宽度
const onHostTabPlacementChange = (placement: string) => {
  hostFormDialogWidth.value = placement === 'top' ? 750 : 920;
};
// HostForm 内的全屏开关：全屏时弹窗放宽到 96%
const hostFormFullscreen = ref(localStorage.getItem('samwaf_host_form_fullscreen') === '1');
const hostFormEffectiveWidth = computed<number | string>(() => (hostFormFullscreen.value ? '96%' : hostFormDialogWidth.value));
const onHostFullscreenChange = (full: boolean) => {
  hostFormFullscreen.value = full;
};

/* ===== 端口占用总览（issue #955） ===== */
const portOverviewVisible = ref(false);
const portOverviewLoading = ref(false);
const portOverviewRows = ref<Record<string, any>[]>([]);
const portOverviewColumns = computed(() => [
  { colKey: 'port', title: t('page.host.port_listen.col_port'), width: 90, cell: 'port' },
  { colKey: 'active', title: t('page.host.port_listen.col_active'), width: 130, cell: 'active' },
  { colKey: 'sites', title: t('page.host.port_listen.col_sites'), cell: 'sites' },
  { colKey: 'status', title: t('page.host.port_listen.col_status'), width: 110, cell: 'status' },
]);
const handlePortOverview = () => {
  portOverviewVisible.value = true;
  portOverviewLoading.value = true;
  // 响应拦截器返回的是整个报文 {code,msg,data}，列表在 data 里
  getPortOverview({})
    .then((res: any) => {
      if (res && res.code === 0) {
        portOverviewRows.value = Array.isArray(res.data) ? res.data : [];
      } else {
        portOverviewRows.value = [];
        if (res && res.msg) MessagePlugin.error(res.msg);
      }
    })
    .catch((e: any) => {
      MessagePlugin.error(e && e.message ? e.message : String(e));
    })
    .finally(() => {
      portOverviewLoading.value = false;
    });
};
const portOverviewRowClass = ({ row }: { row: Record<string, any> }) => (row && row.conflict ? 'port-overview-conflict-row' : '');
const confirmVisible = ref(false);
const sslAutoApplyVisible = ref(false);
const ImportXlsxVisible = ref(false);
const guardConfirmVisible = ref(false);
const startConfirmVisible = ref(false);
const guardAllConfirmVisible = ref(false);
const guardAllStatus = ref('1');

const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const selectCanFilter = ref(true);
const currentHostCode = ref('');

const columns = computed<TableProps['columns']>(() => [
  // 多选列：目前唯一的使用方是「移动到分组」。
  // 全局网站不参与分组（它不是真实站点），直接禁选，省得用户勾了却没生效。
  { colKey: 'row-select', type: 'multiple', width: 46, fixed: 'left', disabled: ({ row }) => row.global_host === 1 },
  {
    title: t('page.host.host'),
    align: 'left',
    width: 180,
    ellipsis: true,
    colKey: 'host',
    cell: 'host',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('page.host.host_filter_placeholder') },
      showConfirmAndReset: true,
    },
  },
  {
    title: t('page.host.port'),
    width: 140,
    colKey: 'port',
    cell: 'port',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  { title: t('page.host.group.column'), width: 100, ellipsis: true, colKey: 'group_code', cell: 'group_code' },
  { title: t('page.host.stats_info'), colKey: 'data_stats', width: 260, cell: 'data_stats' },
  { title: t('common.status'), colKey: 'status_switches', width: 150, cell: 'status_switches' },
  {
    title: t('page.host.remote_ip'),
    width: 100,
    ellipsis: true,
    colKey: 'remote_ip',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  {
    title: t('page.host.remote_port'),
    width: 100,
    ellipsis: true,
    colKey: 'remote_port',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  {
    title: t('common.remarks'),
    width: 100,
    ellipsis: true,
    colKey: 'remarks',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  { title: t('common.create_time'), width: 200, ellipsis: true, colKey: 'create_time', sorter: true },
  // 操作列吸附右侧：表格总列宽 ~1600px，窄屏必然横向滚动，
  // 不固定的话操作列会被推出可视区，得先把表格拖到底才点得到
  { align: 'left', width: 180, colKey: 'op', title: t('common.op'), fixed: 'right' },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

// 顶部搜索
// group_code 一并随请求发出：走后端精确匹配，不进 filter_by 的 like 通道
const searchformData = reactive({ remarks: '', code: '', group_code: '' });

// ---------- 网站分组 ----------
const hostGroups = ref<Record<string, any>[]>([]);
const groupAllCount = ref(0);
const groupNoneCount = ref(0);
const currentGroup = ref('all');
const groupColors = ['#0052D9', '#2BA471', '#E37318', '#D54941', '#834EC2', '#0594FA', '#8B8B8B', '#D4A017'];
const groupFormVisible = ref(false);
const groupForm = ref<Record<string, any>>({ id: '', group_name: '', color: '#0052D9', remarks: '' });
const groupDelVisible = ref(false);
const groupDelTarget = ref<Record<string, any>>({ id: '', group_name: '', host_count: 0 });
const assignVisible = ref(false);
const assignGroupCode = ref('');
const assignGlobalCount = ref(0);

/**
 * group_code -> 分组对象 的字典，供表格「分组」列渲染。
 * 后端不做 join，组名与颜色都在前端映射；映射不到就是「未知分组」（跨实例导入没带 host_group 表的情形）。
 */
const groupDict = computed<Record<string, any>>(() => {
  const dict: Record<string, any> = {};
  (hostGroups.value || []).forEach((g) => {
    dict[g.group_code] = g;
  });
  return dict;
});
// 排序字段
const sorts = reactive({ sortBy: 'create_time', descending: true });
// 筛选字段
const filters = reactive({ filter_by: '', filter_value: '' });

// 索引区域
const deleteIdx = ref(-1);
const guardStatusIdx = ref(-1);
const startStatusIdx = ref(-1);

const hostAddUrl = `${getOnlineUrl()}/guide/Host.html#_2-新增可被防火墙保护的网站`;

// 主机字典
const host_dic = ref<Record<string, string>>({});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('page.host.delete_confirm_clear_relation');
  }
  return '';
});

/** 编辑弹窗标题上显示的站点信息，格式与顶部站点下拉一致：域名:端口(昵称,SSL,备注) */
const editHostLabel = computed(() => {
  const data = formEditData.value || {};
  if (!data.host) {
    return '';
  }
  const bracketContent: string[] = [];
  if (data.nickname) {
    bracketContent.push(data.nickname);
  }
  if (Number(data.ssl) === 1) {
    bracketContent.push('SSL');
  }
  if (data.remarks) {
    bracketContent.push(data.remarks);
  }
  const baseLabel = `${data.host}:${data.port}`;
  return bracketContent.length > 0 ? `${baseLabel}(${bracketContent.join(',')})` : baseLabel;
});

/** 批量复制源站点选项（排除全局网站） */
const sourceHostOptions = computed(() =>
  Object.keys(host_dic.value)
    .map((code) => ({ code, host: host_dic.value[code] }))
    .filter((item) => item.host !== '全局网站:0'),
);

/** 可用的目标主机列表（排除源主机与全局网站） */
const availableTargetHosts = computed(() => {
  const nonGlobalHosts = sourceHostOptions.value;
  if (batchCopyForm.sourceHost) {
    return nonGlobalHosts.filter((host) => host.code !== batchCopyForm.sourceHost);
  }
  return nonGlobalHosts;
});

/** 是否全选了所有目标站点 */
const isAllTargetsSelected = computed(
  () => batchCopyForm.targetHosts.length === availableTargetHosts.value.length && availableTargetHosts.value.length > 0,
);

function splitDomains(bindMoreHost: string): string[] {
  return bindMoreHost
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitPorts(bindMorePort: string): string[] {
  return bindMorePort
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatTrafficBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

// 一键修改所有主机防护状态
function handleModifyAllGuardStatus() {
  guardAllConfirmVisible.value = true;
}

function onGuardAllStatusConfirm() {
  doModifyAllGuardStatus(guardAllStatus.value);
  guardAllConfirmVisible.value = false;
}

function onGuardAllStatusCancel() {
  guardAllConfirmVisible.value = false;
}

function doModifyAllGuardStatus(status: string) {
  const loading = LoadingPlugin({ fullscreen: true, text: t('common.loading') });
  modifyAllGuardStatus({ guard_status: parseInt(status) })
    .then((response) => {
      if (response.code === 0) {
        MessagePlugin.success(t('common.success'));
        getList();
      } else {
        MessagePlugin.error(response.msg || t('common.failed'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.failed'));
    })
    .finally(() => {
      loading.hide();
    });
}

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          const host_options = res.data as { value: string; label: string }[];
          for (let i = 0; i < host_options.length; i++) {
            host_dic.value[host_options[i].value] = host_options[i].label;
          }
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        reject(e);
      });
  });
}

// ==================== 网站分组 ====================
/** 拉取全部分组 + 未分组/全部计数（分组条与表格「分组」列共用一份数据） */
function loadHostGroups() {
  return allHostGroup({})
    .then((res: any) => {
      if (res.code === 0 && res.data) {
        hostGroups.value = res.data.list || [];
        groupNoneCount.value = res.data.none_count || 0;
        groupAllCount.value = res.data.all_count || 0;
        // 当前选中的分组被别处删掉了，退回「全部网站」，免得一直查一个不存在的组
        if (
          currentGroup.value !== 'all' &&
          currentGroup.value !== '__none__' &&
          !hostGroups.value.some((g) => g.group_code === currentGroup.value)
        ) {
          currentGroup.value = 'all';
          searchformData.group_code = '';
        }
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/**
 * 切换分组：分页必须重置到第 1 页，
 * 否则停在第 3 页切到只有 1 页的组会显示空列表，看着像数据丢了。
 */
function pickGroup(code: string) {
  currentGroup.value = code;
  searchformData.group_code = code === 'all' ? '' : code;
  pagination.current = 1;
  selectedRowKeys.value = [];
  getList();
}

/** 预设色 -> 浅色底，用于分组标签背景（颜色本身来自后端白名单，不是任意字符串） */
function hexToSoft(hex: string) {
  if (!hex || hex.length !== 7) {
    return '#f3f3f3';
  }
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
}

function groupMenuOptions(idx: number) {
  return [
    { content: t('page.host.group.rename'), value: 'edit' },
    { content: t('page.host.group.move_left'), value: 'up', disabled: idx === 0 },
    { content: t('page.host.group.move_right'), value: 'down', disabled: idx === hostGroups.value.length - 1 },
    { content: t('common.delete'), value: 'del', theme: 'error' },
  ];
}

function onGroupMenuClick(data: any, group: Record<string, any>, idx: number) {
  const act = data && data.value ? data.value : data;
  if (act === 'edit') {
    openGroupForm(group);
  } else if (act === 'up') {
    moveGroup(idx, -1);
  } else if (act === 'down') {
    moveGroup(idx, 1);
  } else if (act === 'del') {
    askDelGroup(group);
  }
}

function openGroupForm(group: Record<string, any> | null) {
  if (group) {
    groupForm.value = {
      id: group.id,
      group_name: group.group_name,
      color: group.color || groupColors[0],
      remarks: group.remarks || '',
    };
  } else {
    groupForm.value = { id: '', group_name: '', color: groupColors[0], remarks: '' };
  }
  groupFormVisible.value = true;
}

function saveGroup() {
  const name = (groupForm.value.group_name || '').trim();
  if (!name) {
    MessagePlugin.warning(t('page.host.group.name_required'));
    return;
  }
  const body = { group_name: name, color: groupForm.value.color, remarks: groupForm.value.remarks };
  const req = groupForm.value.id ? editHostGroup({ ...body, id: groupForm.value.id }) : addHostGroup(body);
  req
    .then((res: any) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.success'));
        groupFormVisible.value = false;
        loadHostGroups();
        getList();
      } else {
        MessagePlugin.error(res.msg || t('common.failed'));
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function askDelGroup(group: Record<string, any>) {
  groupDelTarget.value = { id: group.id, group_name: group.group_name, host_count: group.host_count || 0 };
  groupDelVisible.value = true;
}

function doDelGroup() {
  delHostGroup({ id: groupDelTarget.value.id })
    .then((res: any) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.success'));
        groupDelVisible.value = false;
        // 被删的组正好是当前筛选条件时退回「全部网站」
        loadHostGroups().then(() => {
          pickGroup(currentGroup.value);
        });
      } else {
        MessagePlugin.error(res.msg || t('common.failed'));
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function moveGroup(idx: number, delta: number) {
  const target = idx + delta;
  if (target < 0 || target >= hostGroups.value.length) {
    return;
  }
  const arr = hostGroups.value.slice();
  const tmp = arr[idx];
  arr[idx] = arr[target];
  arr[target] = tmp;
  sortHostGroup({ ids: arr.map((g) => g.id) })
    .then((res: any) => {
      if (res.code === 0) {
        hostGroups.value = arr;
      } else {
        MessagePlugin.error(res.msg || t('common.failed'));
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function openAssignGroup() {
  if (selectedRowKeys.value.length === 0) {
    return;
  }
  // 全局网站不参与分组，后端也会剔除；这里只是先把数量告诉用户
  assignGlobalCount.value = (data.value || []).filter(
    (row) => selectedRowKeys.value.indexOf(row.code) > -1 && row.global_host === 1,
  ).length;
  assignGroupCode.value = '';
  assignVisible.value = true;
}

function doAssignGroup() {
  assignHostGroup({ host_codes: selectedRowKeys.value, group_code: assignGroupCode.value })
    .then((res: any) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.success'));
        assignVisible.value = false;
        selectedRowKeys.value = [];
        loadHostGroups();
        getList();
      } else {
        MessagePlugin.error(res.msg || t('common.failed'));
        // 目标组可能刚被别处删掉，刷新分组条让用户看到最新的组
        loadHostGroups();
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/** 行内「更多」里的低频操作。高频的「编辑」「证书申请」在单元格里直出，不进这里。 */
function rowMoreOptions() {
  return [
    { content: t('common.copy'), value: 'copy' },
    { content: t('common.delete'), value: 'del', theme: 'error' },
  ];
}

function onRowMoreClick(data: any, slotProps: { row: Record<string, any>; rowIndex: number }) {
  const act = data && data.value ? data.value : data;
  if (act === 'copy') {
    handleClickCopy(slotProps);
  } else if (act === 'del') {
    handleClickDelete(slotProps);
  }
}
function getList() {
  dataLoading.value = true;
  const sort_descending = sorts.descending ? 'desc' : 'asc';
  hostlist({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    sort_by: sorts.sortBy,
    sort_descending,
    filter_by: filters.filter_by,
    filter_value: filters.filter_value,
    ...searchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function rehandleSelectChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys;
}

function handleClickCopy(e: { row: Record<string, any> }) {
  const { code, global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site'));
    return;
  }
  addFormVisible.value = true;
  getHostDetail({ CODE: code })
    .then((res) => {
      if (res.code === 0) {
        formData.value = {
          ...res.data,
          code: uuidv4(),
          // 清空SSL证书相关信息和绑定关系
          bind_ssl_id: '',
          auto_jump_https: 0,
          certfile: '',
          keyfile: '',
        };
      }
    })
    .catch((e2: Error) => {
      console.log(e2);
    });
}

function handleClickEdit(e: { row: Record<string, any> }) {
  editInitTab.value = 1;
  const { code, global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site_only_change_guard_status'));
    return;
  }
  // 先清空，避免详情返回前弹窗标题上还显示上一个站点信息
  formEditData.value = { code: '' };
  editFormVisible.value = true;
  getDetail(code);
}

function handleAddHost() {
  formData.value = { ...formData.value, code: uuidv4() };
  addFormVisible.value = true;
}

// 跳转到一键修改页的“批量导入网址”标签
function handleImportNginx() {
  router.push({ name: 'OneKeyMod', query: { tab: 'import' } });
}

function onSubmit(payload: { result: Record<string, any> }) {
  addHost({ ...payload.result })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        if (payload.result.ssl_config_mode === 'auto_apply') {
          loadHostList().then(() => {
            sslAutoApplyVisible.value = true;
            currentHostCode.value = res.data;
          });
        }
        addFormVisible.value = false;
        pagination.current = 1;
        formData.value = { ...INITIAL_DATA };
        loadHostGroups();
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onSubmitEdit(payload: { result: Record<string, any> }) {
  editHost({ ...payload.result })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        editFormVisible.value = false;
        loadHostGroups();
        getList();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_DATA };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function handleClickDelete(e: { row: Record<string, any>; rowIndex: number }) {
  const { global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site_only_change_guard_status'));
  }
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

// SSL申请
function handleClickSSLApply(e: { row: Record<string, any> }) {
  const { code, global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site'));
  }
  loadHostList().then(() => {
    sslAutoApplyVisible.value = true;
    currentHostCode.value = code;
  });
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { code } = data.value[deleteIdx.value];
  delHost({ CODE: code })
    .then((res) => {
      if (res.code === 0) {
        loadHostGroups();
        getList();
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
  resetIdx();
}

function onCancel() {
  resetIdx();
}

function resetIdx() {
  deleteIdx.value = -1;
}

function getDetail(id: string) {
  getHostDetail({ CODE: id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/** 导出Excel数据 */
function HandleExportExcel() {
  export_api({ table_name: 'hosts' })
    .then((res) => {
      const blob = new Blob([res as any], { type: 'application/force-download' });
      const fileReader = new FileReader();
      fileReader.readAsDataURL(blob);
      fileReader.onload = (e) => {
        const a = document.createElement('a');
        a.download = 'hosts.xlsx';
        a.href = (e.target as FileReader).result as string;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/** 导入Excel数据 */
function HandleImportExcel() {
  ImportXlsxVisible.value = true;
  tips.value = '';
  files.value = [];
}

function changeGuardStatusHandle(row: Record<string, any>) {
  const { code } = row;
  guardStatusIdx.value = data.value.findIndex((value) => value.code === code);
  guardConfirmVisible.value = true;
}

function changeStartStatusHandle(row: Record<string, any>) {
  const { code } = row;
  startStatusIdx.value = data.value.findIndex((value) => value.code === code);
  startConfirmVisible.value = true;
}

function isStaticSiteEnabled(row: Record<string, any>) {
  if (!row || !row.static_site_json) return false;
  try {
    const cfg = typeof row.static_site_json === 'string' ? JSON.parse(row.static_site_json) : row.static_site_json;
    return cfg.is_enable_static_site === 1 || cfg.is_enable_static_site === '1';
  } catch {
    return false;
  }
}

function handleFail({ file }: { file: any }) {
  MessagePlugin.error(`文件 ${file.name} 上传失败`);
}

function beforeUpload() {
  // 防重放校验所需头信息
  fileHeader['X-Request-Time'] = Math.floor(Date.now() / 1000).toString();
  fileHeader['X-Request-Id'] = uuidv4();
  return true;
}

function onUploadSuccess(context: any) {
  const respData = JSON.parse(decryptIncoming(context.response.data));
  let lastMsg = `成功数量 :${respData.SuccessInt}`;
  if (respData.FailInt > 0) {
    lastMsg += `失败数量 :${respData.FailInt} 错误原因:${respData.Msg}`;
  }
  tips.value = lastMsg;
  getList();
}

// 跳转在线文档

// 防护状态弹窗确认
function onGuardStatusConfirm() {
  if (guardStatusIdx.value === -1) {
    return;
  }
  const { code, guard_status } = data.value[guardStatusIdx.value];
  changeGuardStatus({
    CODE: code,
    GUARD_STATUS: guard_status === 1 ? 0 : 1,
  })
    .then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
      guardStatusIdx.value = -1;
      guardConfirmVisible.value = false;
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onGuardStatusCancel() {
  guardConfirmVisible.value = false;
  guardStatusIdx.value = -1;
}

function onStartStatusConfirm() {
  startConfirmVisible.value = false;
  const { code, start_status } = data.value[startStatusIdx.value];
  changeStartStatus({
    CODE: code,
    START_STATUS: start_status === 1 ? 0 : 1,
  })
    .then((res) => {
      if (res.code === 0) {
        getList();
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
      startStatusIdx.value = -1;
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onStartStatusCancel() {
  startConfirmVisible.value = false;
  startStatusIdx.value = -1;
}

/** 表头筛选 */
const onFilterChange: TableProps['onFilterChange'] = (e: Record<string, any>) => {
  const filterList: { by: string; value: string }[] = [];
  if (e.host) filterList.push({ by: 'host', value: e.host });
  if (e.port) filterList.push({ by: 'port', value: e.port });
  if (e.remote_ip) filterList.push({ by: 'remote_ip', value: e.remote_ip });
  if (e.remote_port) filterList.push({ by: 'remote_port', value: e.remote_port });
  if (e.remarks) filterList.push({ by: 'remarks', value: e.remarks });

  filters.filter_by = filterList.map((f) => f.by).join('|');
  filters.filter_value = filterList.map((f) => f.value).join('|');
  getList();
};

const onSortChange: TableProps['onSortChange'] = (sorter: any) => {
  if (sorter != undefined) {
    sorts.sortBy = sorter.sortBy;
    sorts.descending = sorter.descending;
  } else {
    sorts.sortBy = 'create_time';
    sorts.descending = true;
  }
  getList();
};

/** 处理目标站点选择变化 */
function handleTargetHostChange(hostCode: string, checked: boolean) {
  if (checked) {
    if (!batchCopyForm.targetHosts.includes(hostCode)) {
      batchCopyForm.targetHosts.push(hostCode);
    }
  } else {
    const index = batchCopyForm.targetHosts.indexOf(hostCode);
    if (index > -1) {
      batchCopyForm.targetHosts.splice(index, 1);
    }
  }
}

/** 处理模块选择变化 */
function handleModuleChange(moduleValue: string, checked: boolean) {
  if (checked) {
    if (!batchCopyForm.modules.includes(moduleValue)) {
      batchCopyForm.modules.push(moduleValue);
    }
  } else {
    const index = batchCopyForm.modules.indexOf(moduleValue);
    if (index > -1) {
      batchCopyForm.modules.splice(index, 1);
    }
  }
}

/** 批量复制配置 */
function handleBatchCopyConfig() {
  batchCopyVisible.value = true;
}

/** 执行批量复制配置 */
function executeBatchCopy() {
  if (!batchCopyForm.sourceHost) {
    MessagePlugin.warning(t('page.host.batch_copy.select_source_host'));
    return;
  }
  if (batchCopyForm.modules.length === 0) {
    MessagePlugin.warning(t('page.host.batch_copy.select_modules'));
    return;
  }
  if (batchCopyForm.targetHosts.length === 0) {
    MessagePlugin.warning(t('page.host.batch_copy.select_target_hosts'));
    return;
  }

  batchCopyLoading.value = true;
  batchCopyProgress.visible = true;
  batchCopyProgress.current = 0;
  batchCopyProgress.total = batchCopyForm.targetHosts.length;
  batchCopyProgress.status = 'processing';

  performBatchCopy();
}

async function performBatchCopy() {
  const copyData = {
    sourceHost: batchCopyForm.sourceHost,
    modules: batchCopyForm.modules,
    targetHosts: batchCopyForm.targetHosts,
  };

  try {
    for (let i = 0; i < copyData.targetHosts.length; i++) {
      const targetHost = copyData.targetHosts[i];
      batchCopyProgress.currentHost = getHostDisplayName(targetHost);
      await copyConfigToHost(copyData.sourceHost, targetHost, copyData.modules);
      batchCopyProgress.current = i + 1;
      // 添加短暂延迟以显示进度效果
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    batchCopyProgress.status = 'success';
    MessagePlugin.success(t('page.host.batch_copy.copy_success'));
    setTimeout(() => {
      closeBatchCopyProgress();
    }, 2000);
  } catch (error) {
    batchCopyProgress.status = 'error';
    MessagePlugin.error(t('page.host.batch_copy.copy_failed'));
    console.error('批量复制失败:', error);
  } finally {
    batchCopyLoading.value = false;
  }
}

/** 复制配置到指定主机 */
async function copyConfigToHost(sourceHost: string, targetHost: string, modules: string[]) {
  const response = await batchCopyConfig({
    source_host_code: sourceHost,
    target_host_code: targetHost,
    modules,
  });
  if (response.code !== 0) {
    throw new Error(response.msg || '复制失败');
  }
}

function getHostDisplayName(hostCode: string) {
  return host_dic.value[hostCode] || '无';
}

function closeBatchCopyProgress() {
  batchCopyProgress.visible = false;
  batchCopyVisible.value = false;
  resetBatchCopyForm();
}

function resetBatchCopyForm() {
  batchCopyForm.sourceHost = '';
  batchCopyForm.modules = ['cache'];
  batchCopyForm.targetHosts = [];
}

function cancelBatchCopy() {
  batchCopyVisible.value = false;
  resetBatchCopyForm();
}

/** 全选/取消全选目标站点 */
function toggleSelectAllTargets() {
  if (batchCopyForm.targetHosts.length === availableTargetHosts.value.length) {
    batchCopyForm.targetHosts = [];
  } else {
    batchCopyForm.targetHosts = availableTargetHosts.value.map((host) => host.code);
  }
}

onMounted(() => {
  loadHostGroups();
  loadHostList().then(() => {
    getList();
  });
  // 从首页引导跳入时直接打开新增弹窗
  if (route.query && route.query.sourcePage === 'HomeFrist') {
    addFormVisible.value = true;
  }
  // 别处（访问日志「IP提取有问题?」、CC 规则「去设置」）跳过来：直接打开该站点编辑弹窗并定位到对应页签
  if (route.query && route.query.editcode) {
    // tab 用名字传，避免调用方去记面板编号
    const tabMap: Record<string, number> = { ipsource: 4, captcha: 7 };
    editInitTab.value = tabMap[String(route.query.tab || '')] || 1;
    formEditData.value = { code: '' };
    editFormVisible.value = true;
    getDetail(String(route.query.editcode));
  }
});
</script>

<style scoped>
/* ==================== 网站分组：顶部轻量文本条 ==================== */
/* 刻意不给边框和底色：上面那排动作按钮才是主，分组只是筛选维度。
   选中态用「主色文字 + 2px 下划线」而不是实心块，避免比主按钮还抢眼。 */
.host-group-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  margin: 2px 0 6px;
}

.hg-bar-label {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-right: 8px;
}

/* 组名最长 50 字，不限宽会把「＋新建分组」「移动到分组」整个顶出可视区。
   flex: none 保证它只换行不被压缩，超出部分交给 .hg-nm 省略号，全称走 title */
.hg-gl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  max-width: 220px;
  min-width: 0;
  padding: 5px 10px 6px;
  font-size: 13px;
  color: var(--td-text-color-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.hg-gl:hover {
  color: var(--td-brand-color);
}

.hg-gl.on {
  color: var(--td-brand-color);
  font-weight: 600;
  border-bottom-color: var(--td-brand-color);
}

.hg-gl .hg-nm {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.hg-gl em {
  font-style: normal;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  flex: none;
}

.hg-gl.on em {
  color: var(--td-brand-color);
}

.hg-gl.add {
  color: var(--td-brand-color);
}

.hg-gl.disabled {
  color: var(--td-text-color-disabled);
  cursor: not-allowed;
}

.hg-gl:hover .hg-more {
  opacity: 0.5;
}

.hg-gsep {
  width: 1px;
  height: 12px;
  background: var(--td-component-stroke);
  margin: 0 6px;
}

.hg-more {
  font-weight: 700;
  opacity: 0;
  padding: 0 2px;
  flex: none;
}

.hg-more:hover {
  opacity: 1 !important;
}

.hg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  display: inline-block;
}

.hg-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border-radius: 11px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hg-tag:hover {
  border-color: currentColor;
}

.hg-tag.none {
  background: var(--td-bg-color-component);
  color: var(--td-text-color-placeholder);
  cursor: default;
}

.hg-tag.none:hover {
  border-color: transparent;
}

.hg-tag.unknown {
  background: var(--td-bg-color-component);
  color: var(--td-text-color-placeholder);
  border: 1px dashed var(--td-component-stroke);
  cursor: default;
}

.hg-color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  height: 32px;
}

.hg-color-picker i {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  display: inline-block;
}

.hg-color-picker i.on {
  border-color: var(--td-text-color-primary);
}

/* 「移动到分组」列表：分组之间是并列关系，逐条左对齐；
   TDesign 的 radio 自带横向间距，竖排时会表现成逐条往右递进的缩进，这里清零拉平 */
.assign-group-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin-top: 8px;
}

.assign-group-list :deep(.t-radio) {
  margin: 0 !important;
}

/* ==================== 操作列：编辑 / 证书申请 + 更多 ==================== */
.op-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

/* 全局样式给 a / .t-button-link 加了 margin-right，叠在 flex gap 上会把「更多」挤出列宽 */
.op-cell .t-button-link {
  margin-right: 0;
}

.op-vline {
  width: 1px;
  height: 11px;
  background: var(--td-component-stroke);
  flex: none;
}

.op-more {
  color: var(--td-brand-color);
  cursor: pointer;
  white-space: nowrap;
}

.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.table-container {
  margin-top: 8px;
}

/* 批量复制配置弹窗样式 */
.batch-copy-section {
  margin-bottom: 20px;
}

.batch-copy-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.module-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.module-checkbox {
  margin: 0;
}

.dialog-header-host {
  margin-left: 8px;
  font-size: 14px;
  font-weight: normal;
  color: var(--td-text-color-secondary);
  word-break: break-all;
}

.target-hosts-container {
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 6px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.select-all-container {
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.target-hosts-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.target-host-checkbox {
  margin: 0;
}

.batch-copy-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--td-border-level-1-color);
}

/* 批量复制进度弹窗样式 */
.progress-container {
  text-align: center;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-text {
  font-size: 14px;
  color: var(--td-text-color-primary);
}

.success-text {
  color: var(--td-success-color);
}

.error-text {
  color: var(--td-error-color);
}

.progress-count {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.progress-actions {
  margin-top: 16px;
}
</style>

<style>
/* 网站表单全屏 + 端口占用总览行标红：t-dialog/表格挂到 body 上，
   scoped 选择器够不着，必须写在非 scoped 块里。选择器都由专属类名限定，不影响其它弹窗。 */
.host-form-dialog-fullscreen .t-dialog {
  top: 2vh !important;
  margin-bottom: 2vh;
}
.host-form-dialog-fullscreen .t-dialog__body {
  max-height: calc(96vh - 92px) !important;
}
.port-overview-conflict-row td {
  background: var(--td-error-color-1) !important;
}
</style>
