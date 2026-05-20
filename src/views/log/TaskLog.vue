<template>
  <div>
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:8px">
        <h2>日志管理</h2>
        <Tag :severity="env==='DEV'?null:env==='TEST'?'warn':'danger'" :value="env" style="font-size:13px;padding:3px 10px" />
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <Select v-model="env" :options="envOptions" optionLabel="label" optionValue="value"
                style="width:140px" @change="loadData" />
        <template v-if="!manageMode">
          <Button label="管理日志" icon="pi pi-trash" outlined severity="danger" @click="enterManage" />
          <Button label="清理历史" icon="pi pi-clock" outlined @click="openCleanDialog" />
        </template>
        <template v-else>
          <Button label="取消" outlined @click="exitManage" />
          <Button label="删除选中" severity="danger" :disabled="!selectedLogs.length"
                  :badge="selectedLogs.length ? String(selectedLogs.length) : undefined"
                  @click="handleBatchDelete" />
        </template>
      </div>
    </div>

    <DataTable :value="logs" :loading="loading" stripedRows v-model:selection="selectedLogs" dataKey="id"
               paginator :rows="12" :rowsPerPageOptions="[12, 20, 50]"
               currentPageReportTemplate="第 {first} 到 {last} 条，共 {totalRecords} 条"
               paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport">
      <template #empty>
        <div style="text-align:center;padding:40px;color:#999">暂无数据</div>
      </template>
      <Column v-if="manageMode" selectionMode="multiple" style="width:40px" />
      <Column field="id" header="ID" style="min-width:70px" />
      <Column field="taskId" header="任务ID" style="min-width:80px" />
      <Column field="status" header="状态" style="min-width:80px">
        <template #body="{ data }">
          <Tag :severity="data.status === 1 ? 'success' : 'danger'">
            {{ data.status === 1 ? '成功' : '失败' }}
          </Tag>
        </template>
      </Column>
      <Column field="startTime" header="开始时间" style="min-width:170px" />
      <Column field="endTime" header="结束时间" style="min-width:170px" />
      <Column header="耗时" style="min-width:100px">
        <template #body="{ data }">{{ calcDuration(data.startTime, data.endTime) }}</template>
      </Column>
      <Column header="操作" style="min-width:80px">
        <template #body="{ data }">
          <Button label="详情" size="small" @click="showDetail(data)" />
        </template>
      </Column>
    </DataTable>

    <!-- 详情对话框 -->
    <Dialog v-model:visible="showDetailDialog" header="节点执行明细" :style="{ width: '750px' }" :modal="true">
      <div v-if="detailEntries.length" class="detail-list">
        <div v-for="([nodeId, info], idx) in detailEntries" :key="nodeId" class="detail-item">
          <div class="detail-label">
            <span class="step-num">第{{ idx + 1 }}步</span>
            <Tag :severity="nodeTypeColor(nodeId)" style="font-size:11px;padding:1px 6px">{{ nodeTypeLabel(nodeId) }}</Tag>
            <span style="font-weight:500">{{ nodeId }}</span>
            <Tag v-if="info.status === 'success'" severity="success" style="margin-left:auto;font-size:11px">成功</Tag>
            <Tag v-else severity="danger" style="margin-left:auto;font-size:11px">失败</Tag>
          </div>
          <div class="detail-body">
            <template v-if="nodeTypeLabel(nodeId) === 'IF'">
              <div class="detail-summary">
                <span :style="{ color: ifResult(info) ? '#22c55e' : '#ef4444', fontWeight: 600 }">
                  {{ ifResult(info) ? '条件成立 → 走"是"分支' : '条件不成立 → 走"否"分支' }}
                </span>
              </div>
            </template>
            <template v-else-if="nodeTypeLabel(nodeId) === 'START' || nodeTypeLabel(nodeId) === 'END'">
              <div class="detail-summary"><span style="color:#64748b">{{ info.status === 'success' ? '执行完成' : '执行失败' }}</span></div>
            </template>
            <template v-else>
              <div v-if="getSummary(info.info)" class="detail-summary">{{ getSummary(info.info) }}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
                <span v-if="isLongContent(info.info)" class="detail-toggle" @click="toggleExpand(nodeId)">
                  {{ expandedNodes[nodeId] ? '收起详情' : '展开详情' }}
                </span>
              </div>
              <div class="detail-info" :class="{ truncated: isLongContent(info.info) && !expandedNodes[nodeId], expanded: expandedNodes[nodeId] }">
                <template v-if="isJsonString(info.info)">
                  <pre class="json-block">{{ formatJson(info.info) }}</pre>
                </template>
                <template v-else>{{ info.info }}</template>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- 清理历史对话框 -->
    <Dialog v-model:visible="showCleanDialog" modal header="清理历史日志" :style="{ width: '420px' }">
      <div class="clean-form">
        <p class="clean-desc">
          清理 <strong>{{ env }}</strong> 环境下，指定日期<strong>之前</strong>的所有已完成日志
        </p>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label style="font-size:14px;font-weight:500;color:#374151">截止日期</label>
          <DatePicker v-model="cleanDate" dateFormat="yy-mm-dd" showIcon :showOnFocus="false"
                      placeholder="选择日期" style="width:100%" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" outlined @click="showCleanDialog = false" />
        <Button label="确认清理" severity="danger" :disabled="!cleanDate" @click="handleClean" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { logApi, requireAdmin } from '../../api'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import DatePicker from 'primevue/datepicker'

const toast = useToast()
const confirm = useConfirm()
const route = useRoute()

const envOptions = [
  { label: 'DEV', value: 'DEV' },
  { label: 'TEST', value: 'TEST' },
  { label: 'PROD', value: 'PROD' }
]

const env = ref('DEV')
const logs = ref([])
const loading = ref(false)
const manageMode = ref(false)
const selectedLogs = ref([])
const showDetailDialog = ref(false)
const detailData = ref(null)
const expandedNodes = reactive({})
const showCleanDialog = ref(false)
const cleanDate = ref(null)

const detailEntries = computed(() => {
  if (!detailData.value) return []
  return Object.entries(detailData.value)
})

const nodeTypeMap = {
  start: { label: 'START', color: null },
  mysql: { label: 'MySQL', color: 'warn' },
  mongodb: { label: 'MongoDB', color: 'success' },
  if: { label: 'IF', color: null },
  api: { label: 'API', color: 'warn' },
  end: { label: 'END', color: 'danger' }
}

function nodeTypeLabel(nodeId) {
  const prefix = nodeId.split('_')[0]
  return nodeTypeMap[prefix]?.label || prefix.toUpperCase()
}

function nodeTypeColor(nodeId) {
  const prefix = nodeId.split('_')[0]
  return nodeTypeMap[prefix]?.color || null
}

function ifResult(info) {
  try {
    const parsed = JSON.parse(info.info)
    return parsed?.result === true
  } catch { return false }
}

function getSummary(info) {
  if (!info || !isJsonString(info)) return null
  try {
    const obj = JSON.parse(info)
    if (obj.count !== undefined) return `返回 ${obj.count} 条记录`
    if (obj.statusCode !== undefined) return `HTTP ${obj.statusCode}`
    return null
  } catch { return null }
}

onMounted(async () => {
  await loadData()
  const targetLogId = route.query.logId
  if (targetLogId) {
    const logId = Number(targetLogId)
    const log = logs.value.find(l => l.id === logId)
    if (log) showDetail(log)
  }
})

async function loadData() {
  loading.value = true
  try {
    const res = await logApi.list(env.value)
    logs.value = res.data || []
  } catch {
    toast.add({ severity: 'error', summary: '错误', detail: '加载失败', life: 3000 })
  } finally {
    loading.value = false
  }
}

function enterManage() {
  if (!requireAdmin()) return
  manageMode.value = true
  selectedLogs.value = []
}

function openCleanDialog() {
  if (!requireAdmin()) return
  showCleanDialog.value = true
}

function exitManage() {
  manageMode.value = false
  selectedLogs.value = []
}

function handleBatchDelete() {
  if (!requireAdmin()) return
  const ids = selectedLogs.value.map(log => log.id)
  confirm.require({
    message: `确定删除选中的 ${ids.length} 条日志？`,
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', outlined: true },
    acceptProps: { label: '删除', severity: 'danger' },
    accept: async () => {
      await logApi.batchDelete(ids)
      toast.add({ severity: 'success', summary: '成功', detail: `已删除 ${ids.length} 条日志`, life: 3000 })
      exitManage()
      loadData()
    }
  })
}

async function handleClean() {
  if (!requireAdmin()) return
  const dateStr = cleanDate.value.toISOString().slice(0, 19)
  confirm.require({
    message: `确定清理 ${env.value} 环境下 ${cleanDate.value.toLocaleDateString()} 之前的所有已完成日志？`,
    header: '确认清理',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', outlined: true },
    acceptProps: { label: '清理', severity: 'danger' },
    accept: async () => {
      const res = await logApi.clean(env.value, dateStr)
      toast.add({ severity: 'success', summary: '成功', detail: `已清理 ${res.data} 条日志`, life: 3000 })
      showCleanDialog.value = false
      cleanDate.value = null
      loadData()
    }
  })
}

function calcDuration(start, end) {
  if (!start || !end) return '-'
  return (new Date(end) - new Date(start)) + 'ms'
}

function showDetail(row) {
  if (!requireAdmin()) return
  try {
    detailData.value = JSON.parse(row.msg)
  } catch {
    detailData.value = { error: row.msg }
  }
  Object.keys(expandedNodes).forEach(k => delete expandedNodes[k])
  if (detailData.value) {
    Object.entries(detailData.value).forEach(([nodeId, info]) => {
      if (info?.info && isLongContent(info.info)) expandedNodes[nodeId] = true
    })
  }
  showDetailDialog.value = true
}

function isJsonString(str) {
  if (typeof str !== 'string') return false
  try { JSON.parse(str); return true } catch { return false }
}

function formatJson(str) {
  try { return JSON.stringify(JSON.parse(str), null, 2) } catch { return str }
}

function isLongContent(info) {
  if (!info) return false
  if (isJsonString(info)) return info.length > 80
  return String(info).length > 100
}

function toggleExpand(nodeId) {
  expandedNodes[nodeId] = !expandedNodes[nodeId]
}
</script>

<style scoped>
.clean-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.clean-desc {
  font-size: 13.5px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
  padding: 10px 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}
.clean-desc strong { color: #374151; }
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}
.detail-label {
  background: #f9fafb;
  padding: 8px 12px;
  font-size: 13px;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
}
.step-num {
  background: #3b82f6;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 10px;
  white-space: nowrap;
}
.detail-body {
  padding: 10px 12px;
}
.detail-summary {
  font-size: 13px;
  color: #374151;
  margin-bottom: 4px;
}
.detail-info {
  font-size: 12.5px;
  color: #475569;
  transition: max-height 0.25s ease;
}
.detail-info.truncated {
  max-height: 54px;
  overflow: hidden;
}
.detail-info.expanded {
  max-height: 2000px;
}
.json-block {
  background: #1e293b;
  color: #94a3b8;
  padding: 10px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
.detail-toggle {
  font-size: 12px;
  color: #3b82f6;
  cursor: pointer;
  user-select: none;
  background: #eff6ff;
  padding: 2px 10px;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
}
.detail-toggle:hover {
  background: #dbeafe;
}
</style>
