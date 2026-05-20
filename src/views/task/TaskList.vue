<template>
  <div>
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:8px">
        <h2>任务管理</h2>
        <Tag :severity="env==='DEV'?null:env==='TEST'?'warn':'danger'" :value="env" style="font-size:13px;padding:3px 10px" />
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <Select v-model="env" :options="envOptions" optionLabel="label" optionValue="value"
                style="width:140px" @change="loadData" />
        <Button label="新建任务" icon="pi pi-plus" @click="goCreate" />
      </div>
    </div>

    <DataTable :value="list" :loading="loading" stripedRows
               paginator :rows="12" :rowsPerPageOptions="[12, 20, 50]"
               currentPageReportTemplate="第 {first} 到 {last} 条，共 {totalRecords} 条"
               paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport">
      <template #empty>
        <div style="text-align:center;padding:40px;color:#999">暂无数据</div>
      </template>
      <Column field="id" header="ID" style="width:70px" />
      <Column field="name" header="任务名称" style="width:180px" />
      <Column header="启用" style="width:100px">
        <template #body="{ data }">
          <ToggleSwitch :modelValue="data.status === 1" @update:modelValue="toggleTaskStatus(data)" :disabled="!isAdmin()" />
        </template>
      </Column>
      <Column header="版本" style="width:80px">
        <template #body="{ data }">
          <Tag severity="info">v{{ data.versionNo }}</Tag>
        </template>
      </Column>
      <Column header="定时调度" style="width:220px">
        <template #body="{ data }">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <Tag v-if="data.cron" severity="info" :value="cronToText(data.cron)" />
            <Tag v-else severity="secondary" value="未设置" />
            <Tag v-if="scheduleMap[data.id]" severity="success" value="运行中" />
            <Tag v-else severity="secondary" value="未启动" />
          </div>
        </template>
      </Column>
      <Column header="操作" style="width:230px">
        <template #body="{ data }">
          <Button label="编辑" icon="pi pi-pencil" outlined size="small"
                  @click="goEdit(data)" style="margin-right:4px" />
          <Button label="环境管理" icon="pi pi-cog" severity="warn" outlined size="small"
                  @click="openEnvManage(data)" style="margin-right:4px" />
          <Button icon="pi pi-caret-right" outlined size="small" severity="secondary"
                  @click="toggleMenu($event, data)" style="margin-right:4px" />
          <Button icon="pi pi-trash" severity="danger" outlined size="small"
                  @click="handleDelete(data.id)" />
        </template>
      </Column>
    </DataTable>

    <!-- 操作下拉菜单 -->
    <Menu ref="menuRef" :model="menuItems" :popup="true" />

    <!-- 执行结果 -->
    <Dialog v-model:visible="showExecResult" modal header="执行结果" :style="{ width: '500px' }">
      <div v-if="execResult" style="text-align:center;padding:20px">
        <i :class="execResult.success ? 'pi pi-check-circle' : 'pi pi-times-circle'"
           :style="{ fontSize: '48px', color: execResult.success ? '#22c55e' : '#ef4444' }"></i>
        <h3 style="margin:12px 0 8px">{{ execResult.success ? '执行成功' : '执行失败' }}</h3>
        <p v-if="execResult.logId" style="color:#666">日志ID: {{ execResult.logId }}</p>
      </div>
      <template #footer>
        <Button label="关闭" outlined @click="showExecResult = false" />
        <Button v-if="execResult?.logId" label="查看日志" icon="pi pi-external-link" @click="goToLog" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { taskApi, requireAdmin, isAdmin } from '../../api'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useRouter } from 'vue-router'
import { cronToText } from '../../utils/cron'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Menu from 'primevue/menu'
import ToggleSwitch from 'primevue/toggleswitch'

const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const menuRef = ref(null)
const menuRow = ref(null)

const menuItems = computed(() => {
  const row = menuRow.value
  if (!row) return []
  const isRunning = scheduleMap[row.id]
  return [
    { label: '执行', icon: 'pi pi-play', command: () => handleExecute(row) },
    {
      label: isRunning ? '停止调度' : '启动调度',
      icon: isRunning ? 'pi pi-stop' : 'pi pi-play',
      command: () => {
        if (!isRunning && !row.cron) {
          toast.add({ severity: 'warn', summary: '提示', detail: '请先设置调度频率', life: 3000 })
          return
        }
        isRunning ? stopSchedule(row) : startSchedule(row)
      }
    }
  ]
})

function goCreate() {
  if (!requireAdmin()) return
  router.push('/task/edit')
}

function goEdit(data) {
  if (!requireAdmin()) return
  router.push(`/task/edit/${data.id}`)
}

function toggleMenu(event, data) {
  if (!requireAdmin()) return
  menuRow.value = data
  menuRef.value.toggle(event)
}

const envOptions = [
  { label: 'DEV', value: 'DEV' },
  { label: 'TEST', value: 'TEST' },
  { label: 'PROD', value: 'PROD' }
]

const env = ref('DEV')
const list = ref([])
const loading = ref(false)
const executingId = ref(null)
const showExecResult = ref(false)
const execResult = ref(null)
const scheduleMap = reactive({})

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    list.value = (await taskApi.list(env.value)).data || []
    for (const row of list.value) {
      try { scheduleMap[row.id] = (await taskApi.scheduleStatus(row.id)).data } catch { scheduleMap[row.id] = false }
    }
  } finally { loading.value = false }
}

async function handleExecute(row) {
  if (!requireAdmin()) return
  executingId.value = row.id
  toast.add({ severity: 'info', summary: '执行中', detail: `正在执行任务「${row.name}」...`, life: 300000 })
  try {
    const res = await taskApi.execute(row.id)
    toast.removeAllGroups()
    const success = res.data.success
    execResult.value = { success, logId: res.data.logId }
    showExecResult.value = true
    toast.add({ severity: success ? 'success' : 'error', summary: success ? '成功' : '失败', detail: success ? '任务执行完成' : '任务执行失败', life: 3000 })
  } catch {
    toast.removeAllGroups()
    execResult.value = { success: false }
    showExecResult.value = true
  } finally { executingId.value = null }
}

function goToLog() {
  showExecResult.value = false
  router.push({ path: '/log', query: { logId: execResult.value.logId } })
}

function openEnvManage(row) {
  if (!requireAdmin()) return
  router.push(`/version/${row.id}?type=TASK`)
}

async function startSchedule(row) {
  if (!requireAdmin()) return
  await taskApi.scheduleStart(row.id)
  scheduleMap[row.id] = true
  toast.add({ severity: 'success', summary: '成功', detail: '调度已启动', life: 3000 })
}

async function stopSchedule(row) {
  if (!requireAdmin()) return
  await taskApi.scheduleStop(row.id)
  scheduleMap[row.id] = false
  toast.add({ severity: 'success', summary: '成功', detail: '调度已停止', life: 3000 })
}

async function toggleTaskStatus(row) {
  if (!requireAdmin()) return
  try {
    await taskApi.toggleStatus(row.id)
    row.status = row.status === 1 ? 0 : 1
    toast.add({ severity: 'success', summary: '成功', detail: row.status === 1 ? '已启用' : '已禁用', life: 3000 })
  } catch {}
}

function handleDelete(id) {
  if (!requireAdmin()) return
  confirm.require({
    message: '确定删除此任务？',
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', outlined: true },
    acceptProps: { label: '删除', severity: 'danger' },
    accept: async () => {
      await taskApi.delete(id)
      toast.add({ severity: 'success', summary: '成功', detail: '删除成功', life: 3000 })
      loadData()
    }
  })
}
</script>
