<template>
  <div>
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:8px">
        <h2>开放平台管理</h2>
        <Tag :severity="env==='DEV'?null:env==='TEST'?'warn':'danger'" :value="env" style="font-size:13px;padding:3px 10px" />
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <Select v-model="env" :options="envOptions" optionLabel="label" optionValue="value"
                style="width:140px" @change="loadData" />
        <Button label="注册接口" icon="pi pi-plus" @click="openDialog(null)" v-if="env === 'DEV'" />
      </div>
    </div>

    <DataTable :value="list" :loading="loading" stripedRows tableStyle="min-width:50rem"
               paginator :rows="12" :rowsPerPageOptions="[12, 20, 50]"
               currentPageReportTemplate="第 {first} 到 {last} 条，共 {totalRecords} 条"
               paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport">
      <template #empty>
        <div style="text-align:center;padding:40px;color:#999">暂无数据</div>
      </template>
      <Column field="id" header="ID" style="width:70px" />
      <Column field="path" header="路径" style="width:200px" />
      <Column header="方法" style="width:80px">
        <template #body="{ data }">
          <Tag :value="data.method" :severity="data.method === 'GET' ? 'success' : 'warning'" />
        </template>
      </Column>
      <Column header="今日配额" style="width:110px">
        <template #body="{ data }">
          <Tag v-if="data.dailyLimit > 0"
               :severity="quotaSeverity(data)"
               :value="(data.dailyCount || 0) + '/' + data.dailyLimit" />
          <Tag v-else severity="info" :value="'不限(' + (data.dailyCount || 0) + ')'" />
        </template>
      </Column>
      <Column header="启用" style="width:80px">
        <template #body="{ data }">
          <ToggleSwitch :modelValue="data.status === 1" @update:modelValue="toggleStatus(data)" :disabled="!isAdmin()" />
        </template>
      </Column>
      <Column header="调用地址" style="min-width:300px">
        <template #body="{ data }">
          <code style="font-size:12px">/open/{{ data.env }}/{{ data.path }}</code>
        </template>
      </Column>
      <Column header="版本" style="width:80px">
        <template #body="{ data }">
          <Tag severity="info">v{{ data.versionNo || 1 }}</Tag>
        </template>
      </Column>
      <Column header="操作" style="width:310px">
        <template #body="{ data }">
          <Button label="测试调用" severity="success" outlined size="small"
                  :loading="invokingId === data.id" @click="testInvoke(data)" style="margin-right:6px" />
          <Button label="编辑" outlined size="small" @click="openDialog(data)" style="margin-right:6px" />
          <Button icon="pi pi-cog" severity="warn" outlined size="small"
                  @click="openEnvManage(data)" style="margin-right:6px" />
          <Button icon="pi pi-trash" severity="danger" outlined size="small" @click="handleDelete(data.id)" />
        </template>
      </Column>
    </DataTable>

    <!-- 注册接口对话框 -->
    <Dialog v-model:visible="showDialog" modal :header="form.id ? '编辑接口' : '注册开放接口'" :style="{ width: '450px' }">
      <div class="form-grid">
        <div class="form-row">
          <label>路径</label>
          <InputText v-model="form.path" placeholder="如 query_user" style="width:100%" />
        </div>
        <div class="form-row">
          <label>请求方法</label>
          <SelectButton v-model="form.method" :options="methodOptions" optionLabel="label" optionValue="value"
                        :allowEmpty="false" />
        </div>
        <div class="form-row">
          <label>关联任务</label>
          <Select v-model="form.taskId" :options="taskSelectOptions" optionLabel="label" optionValue="value"
                  placeholder="选择任务" filter style="width:100%" />
        </div>
        <div class="form-row">
          <label>每日配额</label>
          <Select v-model="form.dailyLimit" :options="quotaOptions" optionLabel="label" optionValue="value"
                  style="width:100%" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" outlined @click="showDialog = false" />
        <Button label="保存" @click="handleSave" />
      </template>
    </Dialog>

    <!-- 测试调用参数对话框 -->
    <Dialog v-model:visible="showTestDialog" modal header="测试调用" :style="{ width: '500px' }">
      <div class="form-grid">
        <div style="display:flex;align-items:center;gap:10px">
          <label style="font-size:14px;font-weight:500;color:#374151;margin:0">请求方法</label>
          <Tag :value="testRow?.method || 'GET'" :severity="testRow?.method === 'GET' ? 'success' : 'warning'" />
        </div>
        <div class="form-row" v-if="testRow?.method === 'POST'">
          <label>请求参数 (JSON)</label>
          <Textarea v-model="testParams" rows="6" placeholder='{"key": "value"}' style="width:100%;font-family:monospace;font-size:12px" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" outlined @click="showTestDialog = false" />
        <Button label="发送请求" @click="doTestInvoke" :loading="invokingId !== null" />
      </template>
    </Dialog>

    <!-- 调用结果对话框 -->
    <Dialog v-model:visible="showResult" modal header="调用结果" :style="{ width: '650px' }">
      <div v-if="invokeResult" class="result-list">
        <div v-for="(val, key) in invokeResult" :key="key" class="result-item">
          <div class="result-label">{{ key }}</div>
          <div class="result-body">
            <div class="result-top">
              <Tag :severity="val.status === 'success' ? 'success' : 'danger'">{{ val.status }}</Tag>
              <span v-if="isLongContent(val.info)" class="result-toggle" @click="toggleExpand(key)">
                {{ expandedNodes[key] ? '收起' : '展开全部' }}
              </span>
            </div>
            <div class="result-info" :class="{ truncated: isLongContent(val.info) && !expandedNodes[key], expanded: expandedNodes[key] }">
              <template v-if="isJsonString(val.info)">
                <pre class="json-block">{{ formatJson(val.info) }}</pre>
              </template>
              <template v-else>{{ val.info }}</template>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { openApiApi, taskApi, requireAdmin, isAdmin } from '../../api'
import axios from 'axios'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import Textarea from 'primevue/textarea'

const toast = useToast()
const confirm = useConfirm()
const router = useRouter()

const envOptions = [
  { label: 'DEV', value: 'DEV' },
  { label: 'TEST', value: 'TEST' },
  { label: 'PROD', value: 'PROD' }
]

const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' }
]

const quotaOptions = [
  { label: '50 次/天', value: 50 },
  { label: '100 次/天', value: 100 },
  { label: '1000 次/天', value: 1000 },
  { label: '不限', value: 0 }
]

const env = ref('DEV')
const list = ref([])
const taskList = ref([])
const loading = ref(false)
const showDialog = ref(false)
const form = ref({})
const invokingId = ref(null)
const showTestDialog = ref(false)
const testRow = ref(null)
const testParams = ref('')
const showResult = ref(false)
const invokeResult = ref(null)
const expandedNodes = reactive({})

const taskSelectOptions = computed(() =>
  taskList.value.map(t => ({ label: `${t.name} (ID:${t.id})`, value: t.id }))
)

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try { list.value = (await openApiApi.list(env.value)).data || [] } finally { loading.value = false }
}

function openDialog(row) {
  if (!requireAdmin()) return
  if (row) {
    form.value = { id: row.id, path: row.path, method: row.method || 'GET', taskId: row.taskId, dailyLimit: row.dailyLimit || 0 }
  } else {
    form.value = { path: '', method: 'GET', taskId: null, dailyLimit: 0 }
  }
  loadTasks()
  showDialog.value = true
}

async function loadTasks() {
  try { taskList.value = (await taskApi.list(env.value)).data || [] } catch {}
}

async function handleSave() {
  if (!requireAdmin()) return
  if (!form.value.path) {
    toast.add({ severity: 'warn', summary: '提示', detail: '请输入路径', life: 3000 })
    return
  }
  if (!form.value.taskId) {
    toast.add({ severity: 'warn', summary: '提示', detail: '请选择关联任务', life: 3000 })
    return
  }
  try {
    if (form.value.id) {
      await openApiApi.update({ ...form.value, env: env.value })
      toast.add({ severity: 'success', summary: '成功', detail: '更新成功', life: 3000 })
    } else {
      await openApiApi.create({ ...form.value, env: env.value })
      toast.add({ severity: 'success', summary: '成功', detail: '注册成功', life: 3000 })
    }
    showDialog.value = false
    loadData()
  } catch {
    // 全局拦截器已弹出错误提示
  }
}

function handleDelete(id) {
  if (!requireAdmin()) return
  confirm.require({
    message: '确定删除？',
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', outlined: true },
    acceptProps: { label: '删除', severity: 'danger' },
    accept: async () => {
      await openApiApi.delete(id)
      toast.add({ severity: 'success', summary: '成功', detail: '删除成功', life: 3000 })
      loadData()
    }
  })
}

function testInvoke(row) {
  if (!requireAdmin()) return
  testRow.value = row
  testParams.value = ''
  showTestDialog.value = true
}

async function doTestInvoke() {
  const row = testRow.value
  invokingId.value = row.id
  showTestDialog.value = false
  try {
    let res
    if (row.method === 'POST' && testParams.value.trim()) {
      let body
      try { body = JSON.parse(testParams.value) } catch {
        toast.add({ severity: 'error', summary: '错误', detail: 'JSON 格式不正确', life: 3000 })
        return
      }
      res = await axios.post(`/api/open/${row.env}/${row.path}/test`, body, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    } else {
      res = await axios.get(`/api/open/${row.env}/${row.path}/test`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    }
    if (res.data.code !== 200) {
      toast.add({ severity: 'error', summary: '错误', detail: res.data.msg || '调用失败', life: 3000 })
      return
    }
    invokeResult.value = res.data.data
    // 内容长的节点默认展开
    Object.keys(expandedNodes).forEach(k => delete expandedNodes[k])
    if (invokeResult.value) {
      Object.entries(invokeResult.value).forEach(([key, val]) => {
        if (val?.info && isLongContent(val.info)) expandedNodes[key] = true
      })
    }
    showResult.value = true
  } catch (e) {
    const msg = e.response?.data?.msg || '调用失败'
    toast.add({ severity: 'error', summary: '错误', detail: msg, life: 3000 })
  } finally { invokingId.value = null }
}

async function toggleStatus(row) {
  if (!requireAdmin()) return
  try {
    await openApiApi.toggleStatus(row.id)
    row.status = row.status === 1 ? 0 : 1
    toast.add({ severity: 'success', summary: '成功', detail: row.status === 1 ? '已启用' : '已禁用', life: 3000 })
  } catch {}
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

function toggleExpand(key) {
  expandedNodes[key] = !expandedNodes[key]
}

function quotaSeverity(data) {
  if (!data.dailyLimit || data.dailyLimit <= 0) return 'success'
  const ratio = (data.dailyCount || 0) / data.dailyLimit
  if (ratio >= 0.8) return 'danger'
  if (ratio >= 0.5) return 'warning'
  return 'success'
}

function openEnvManage(row) {
  if (!requireAdmin()) return
  router.push(`/version/${row.id}?type=OPEN_API`)
}
</script>

<style scoped>
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}
.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.result-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}
.result-label {
  background: #f9fafb;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}
.result-body {
  padding: 10px 12px;
}
.result-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.result-info {
  font-size: 12.5px;
  color: #475569;
  transition: max-height 0.25s ease;
}
.result-info.truncated {
  max-height: 54px;
  overflow: hidden;
}
.result-info.expanded {
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
  max-height: 400px;
  overflow-y: auto;
}
.result-toggle {
  font-size: 12px;
  color: #3b82f6;
  cursor: pointer;
  user-select: none;
  background: #eff6ff;
  padding: 2px 10px;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
}
.result-toggle:hover {
  background: #dbeafe;
}
</style>
