<template>
  <div>
    <div class="page-header">
      <h2>API 管理</h2>
      <div style="display:flex;gap:10px;align-items:center">
        <Select v-model="env" :options="envOptions" optionLabel="label" optionValue="value" class="env-select" @change="loadData" />
        <Button label="新增" icon="pi pi-plus" @click="openDialog(null)" />
      </div>
    </div>

    <DataTable :value="list" :loading="loading" stripedRows
               paginator :rows="12" :rowsPerPageOptions="[12, 20, 50]"
               currentPageReportTemplate="第 {first} 到 {last} 条，共 {totalRecords} 条"
               paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport">
      <Column field="id" header="ID" style="min-width:70px" />
      <Column field="name" header="名称" style="min-width:150px" />
      <Column field="method" header="方法" style="min-width:80px">
        <template #body="{ data }">
          <Tag :severity="data.method === 'GET' ? 'success' : 'warning'" :value="data.method || 'GET'" />
        </template>
      </Column>
      <Column field="url" header="URL" style="min-width:300px">
        <template #body="{ data }">
          <span :title="data.url">{{ data.url }}</span>
        </template>
      </Column>
      <Column header="操作" style="min-width:360px">
        <template #body="{ data }">
          <Button label="测试连接" icon="pi pi-sitemap" severity="success" outlined size="small"
                  :loading="testingId === data.id" @click="testConn(data)" style="margin-right:6px" />
          <Button label="编辑" icon="pi pi-pencil" outlined size="small" @click="openDialog(data)" style="margin-right:6px" />
          <Button icon="pi pi-trash" severity="danger" outlined size="small" @click="handleDelete(data.id)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showTestResult" header="连通性测试结果" :style="{ width: '420px' }" :modal="true">
      <div v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'fail']">
        <p style="font-weight:600;margin-bottom:6px">{{ testResult.success ? '请求成功' : '请求失败' }}</p>
        <p>{{ testResult.message }}</p>
        <template v-if="testResult.success">
          <p style="margin-top:6px">HTTP 状态码: <Tag :value="String(testResult.httpStatus)" /></p>
          <div style="margin-top:10px;display:flex;align-items:center;gap:8px">
            <ProgressBar :value="100" :showValue="false" style="flex:1" />
            <span>{{ testResult.costMs }}ms</span>
          </div>
        </template>
      </div>
    </Dialog>

    <Dialog v-model:visible="showDialog" :header="form.id ? '编辑 API' : '新增 API'" :style="{ width: '500px' }" :modal="true">
      <div class="form-layout">
        <div class="form-row">
          <label>名称</label>
          <InputText v-model="form.name" />
        </div>
        <div class="form-row">
          <label>方法</label>
          <Select v-model="form.method" :options="methodOptions" optionLabel="label" optionValue="value" />
        </div>
        <div class="form-row">
          <label>URL</label>
          <InputText v-model="form.url" />
        </div>
        <div class="form-row">
          <label>认证配置</label>
          <Textarea v-model="form.authConfig" :rows="2" placeholder='JSON, 如 {"key":"xxx"} — GET→URL参数, POST→请求头' />
        </div>
        <div class="form-row">
          <label>请求头</label>
          <Textarea v-model="form.headers" :rows="2" placeholder='JSON, 如 {"Authorization":"Bearer xxx"}' />
        </div>
        <div class="form-row">
          <label>超时（毫秒）</label>
          <InputNumber v-model="form.timeout" :min="1000" :max="300000" :step="1000" :useGrouping="false" placeholder="默认 30000" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" outlined @click="showDialog = false" />
        <Button label="保存" icon="pi pi-check" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import { apiSourceApi, requireAdmin } from '../../api'

const toast = useToast()
const confirm = useConfirm()

const envOptions = [
  { label: 'DEV', value: 'DEV' },
  { label: 'TEST', value: 'TEST' },
  { label: 'PROD', value: 'PROD' }
]
const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' }
]

const env = ref('DEV')
const list = ref([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const form = ref({})
const testingId = ref(null)
const showTestResult = ref(false)
const testResult = ref(null)

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try { list.value = (await apiSourceApi.list(env.value)).data || [] } finally { loading.value = false }
}

function openDialog(row) {
  if (!requireAdmin()) return
  form.value = row ? { ...row } : { name: '', method: 'GET', url: '', authConfig: '', headers: '', timeout: null }
  showDialog.value = true
}

async function handleSave() {
  if (!requireAdmin()) return
  saving.value = true
  try {
    const data = { ...form.value, env: env.value }
    if (data.id) await apiSourceApi.update(data); else await apiSourceApi.create(data)
    toast.add({ severity: 'success', summary: '成功', detail: '保存成功', life: 3000 })
    showDialog.value = false
    loadData()
  } finally { saving.value = false }
}

function handleDelete(id) {
  if (!requireAdmin()) return
  confirm.require({
    message: '确定删除？',
    header: '提示',
    acceptProps: { severity: 'danger', label: '确定' },
    rejectProps: { severity: 'secondary', label: '取消', outlined: true },
    accept: async () => {
      try {
        await apiSourceApi.delete(id)
        toast.add({ severity: 'success', summary: '成功', detail: '删除成功', life: 3000 })
        loadData()
      } catch {}
    }
  })
}

async function testConn(row) {
  if (!requireAdmin()) return
  testingId.value = row.id
  try {
    const res = await apiSourceApi.test(row.id)
    testResult.value = res.data
    showTestResult.value = true
  } finally { testingId.value = null }
}
</script>

<style scoped>
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-row label {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
}
.env-select {
  width: 140px;
}
</style>
