<template>
  <div>
    <div class="page-header">
      <h2>数据库管理</h2>
      <div style="display:flex;gap:10px;align-items:center">
        <Select v-model="env" :options="envOptions" optionLabel="label" optionValue="value"
                style="width:140px" @change="loadData" />
        <Button label="新增" icon="pi pi-plus" @click="openDialog(null)" />
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
      <Column field="name" header="名称" style="width:150px" />
      <Column header="类型" style="width:90px">
        <template #body="{ data }">
          <Tag :severity="dbTypeSeverity(data.dbType)">{{ dbTypeLabel(data.dbType) }}</Tag>
        </template>
      </Column>
      <Column header="连接信息" style="min-width:240px">
        <template #body="{ data }">{{ data.host }}:{{ data.port }}/{{ data.dbName }}</template>
      </Column>
      <Column field="username" header="用户名" style="width:100px" />
      <Column header="操作" style="width:360px">
        <template #body="{ data }">
          <Button label="测试连接" icon="pi pi-sitemap" severity="success" outlined
                  size="small" :loading="testingId === data.id" @click="testConn(data)" style="margin-right:6px" />
          <Button label="编辑" icon="pi pi-pencil" outlined size="small"
                  @click="openDialog(data)" style="margin-right:6px" />
          <Button icon="pi pi-trash" severity="danger" outlined size="small"
                  @click="handleDelete(data.id)" />
        </template>
      </Column>
    </DataTable>

    <!-- 测试连接结果 -->
    <Dialog v-model:visible="showTestResult" modal header="连接测试结果" :style="{ width: '420px' }">
      <div v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'fail']">
        <p style="font-weight:600;margin-bottom:6px">{{ testResult.success ? '连接成功' : '连接失败' }}</p>
        <p>{{ testResult.message }}</p>
        <ProgressBar v-if="testResult.success" :value="100" :showValue="false" style="margin-top:10px;height:14px" />
        <p style="font-size:12px;color:#999;margin-top:4px">耗时: {{ testResult.costMs }}ms</p>
      </div>
    </Dialog>

    <!-- 新增/编辑对话框 -->
    <Dialog v-model:visible="showDialog" modal :header="form.id ? '编辑数据源' : '新增数据源'" :style="{ width: '560px' }">
      <div class="form-grid">
        <div class="form-col-2">
          <FloatLabel>
            <InputText id="db_name" v-model="form.name" style="width:100%" />
            <label for="db_name">名称</label>
          </FloatLabel>
          <FloatLabel>
            <Select id="db_type" v-model="form.dbType" :options="dbTypeOptions"
                    optionLabel="label" optionValue="value" style="width:100%"
                    :disabled="!!form.id" />
            <label for="db_type">类型</label>
          </FloatLabel>
        </div>
        <div class="form-col-2">
          <FloatLabel>
            <InputText id="db_host" v-model="form.host" style="width:100%" />
            <label for="db_host">Host</label>
          </FloatLabel>
          <FloatLabel>
            <InputNumber id="db_port" v-model="form.port" :min="1" :max="65535" :useGrouping="false" style="width:100%" />
            <label for="db_port">Port</label>
          </FloatLabel>
        </div>
        <div class="form-col-2">
          <FloatLabel>
            <InputText id="db_user" v-model="form.username" style="width:100%" />
            <label for="db_user">用户名</label>
          </FloatLabel>
          <FloatLabel>
            <Password id="db_pass" v-model="form.password" :feedback="false" toggleMask style="width:100%" />
            <label for="db_pass">密码</label>
          </FloatLabel>
        </div>
        <FloatLabel>
          <InputText id="db_dbname" v-model="form.dbName" style="width:100%" />
          <label for="db_dbname">库名</label>
        </FloatLabel>
        <FloatLabel>
          <InputText id="db_extra" v-model="form.extraParams" style="width:100%" />
          <label for="db_extra">额外参数</label>
        </FloatLabel>
      </div>
      <template #footer>
        <Button label="取消" outlined @click="showDialog = false" />
        <Button label="保存" @click="handleSave" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { dbSourceApi, requireAdmin } from '../../api'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Password from 'primevue/password'
import ProgressBar from 'primevue/progressbar'
import FloatLabel from 'primevue/floatlabel'
import Tag from 'primevue/tag'

const toast = useToast()
const confirm = useConfirm()

const envOptions = [
  { label: 'DEV', value: 'DEV' },
  { label: 'TEST', value: 'TEST' },
  { label: 'PROD', value: 'PROD' }
]

const dbTypeOptions = [
  { label: 'MySql', value: 'MYSQL' },
  { label: 'MongoDB', value: 'MONGODB' }
]

function dbTypeSeverity(type) {
  switch (type) {
    case 'MYSQL': return 'warn'
    case 'MONGODB': return 'success'
    default: return null
  }
}

function dbTypeLabel(type) {
  const item = dbTypeOptions.find(o => o.value === type)
  return item ? item.label : type
}

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
  try {
    list.value = (await dbSourceApi.list(env.value)).data || []
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  if (!requireAdmin()) return
  form.value = row
    ? { ...row }
    : { name: '', dbType: 'MYSQL', host: '', port: 3306, username: '', password: '', dbName: '', extraParams: '' }
  showDialog.value = true
}

async function handleSave() {
  if (!requireAdmin()) return
  saving.value = true
  try {
    const data = { ...form.value, env: env.value }
    if (data.id) await dbSourceApi.update(data)
    else await dbSourceApi.create(data)
    toast.add({ severity: 'success', summary: '成功', detail: '保存成功', life: 3000 })
    showDialog.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

function handleDelete(id) {
  if (!requireAdmin()) return
  confirm.require({
    message: '确定删除此数据源？',
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', outlined: true },
    acceptProps: { label: '删除', severity: 'danger' },
    accept: async () => {
      await dbSourceApi.delete(id)
      toast.add({ severity: 'success', summary: '成功', detail: '删除成功', life: 3000 })
      loadData()
    }
  })
}

async function testConn(row) {
  if (!requireAdmin()) return
  testingId.value = row.id
  try {
    const res = await dbSourceApi.test(row.id)
    testResult.value = res.data
    showTestResult.value = true
  } finally {
    testingId.value = null
  }
}
</script>

<style scoped>
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-top: 10px;
}
.form-col-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
</style>
