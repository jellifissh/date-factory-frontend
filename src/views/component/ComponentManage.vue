<template>
  <div>
    <div class="page-header">
      <h2>组件管理</h2>
      <div style="display:flex;gap:10px;align-items:center">
        <InputText v-model="query.keyword" placeholder="搜索名称/编码/类型" class="search-input" @keyup.enter="loadData" />
        <Select v-model="query.category" :options="categoryFilterOptions" optionLabel="label" optionValue="value" placeholder="组件分类" class="filter-select" @change="loadData" />
        <Select v-model="query.status" :options="statusFilterOptions" optionLabel="label" optionValue="value" placeholder="状态" class="filter-select" @change="loadData" />
        <Button label="查询" icon="pi pi-search" outlined @click="loadData" />
        <Button label="新增组件" icon="pi pi-plus" @click="openComponentDialog(null)" />
      </div>
    </div>

    <DataTable :value="list" :loading="loading" stripedRows tableStyle="min-width:68rem"
               paginator :rows="12" :rowsPerPageOptions="[12, 20, 50]"
               currentPageReportTemplate="第 {first} 到 {last} 条，共 {totalRecords} 条"
               paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport">
      <template #empty>
        <div style="text-align:center;padding:40px;color:#999">暂无组件</div>
      </template>
      <Column field="id" header="ID" style="width:70px" />
      <Column header="组件" style="min-width:220px">
        <template #body="{ data }">
          <div class="component-cell">
            <span class="component-icon" :style="{ background: data.color || '#409eff' }">
              <i :class="data.icon || 'pi pi-box'"></i>
            </span>
            <div>
              <div class="component-name">{{ data.componentName }}</div>
              <div class="component-code">{{ data.componentCode }}</div>
            </div>
          </div>
        </template>
      </Column>
      <Column header="类型" style="width:120px">
        <template #body="{ data }">
          <Tag :value="data.componentType" :severity="typeSeverity(data.componentType)" />
        </template>
      </Column>
      <Column field="category" header="分类" style="width:130px">
        <template #body="{ data }">
          <Tag :value="data.category" severity="info" />
        </template>
      </Column>
      <Column field="sortNo" header="排序" style="width:80px" />
      <Column header="状态" style="width:90px">
        <template #body="{ data }">
          <Tag :severity="Number(data.status) === 1 ? 'success' : 'secondary'" :value="Number(data.status) === 1 ? '启用' : '禁用'" />
        </template>
      </Column>
      <Column field="description" header="描述" style="min-width:240px">
        <template #body="{ data }">
          <span class="desc-text" :title="data.description">{{ data.description || '-' }}</span>
        </template>
      </Column>
      <Column header="操作" style="width:360px">
        <template #body="{ data }">
          <Button label="配置项" icon="pi pi-sliders-h" severity="info" outlined size="small" @click="openConfigDialog(data)" style="margin-right:6px" />
          <Button label="编辑" icon="pi pi-pencil" outlined size="small" @click="openComponentDialog(data)" style="margin-right:6px" />
          <Button :label="Number(data.status) === 1 ? '禁用' : '启用'" :icon="Number(data.status) === 1 ? 'pi pi-ban' : 'pi pi-check'" outlined size="small" @click="toggleComponentStatus(data)" style="margin-right:6px" />
          <Button icon="pi pi-trash" severity="danger" outlined size="small" @click="deleteComponent(data.id)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showComponentDialog" modal :header="componentForm.id ? '编辑组件' : '新增组件'" :style="{ width: '620px' }">
      <div class="form-layout">
        <div class="form-col-2">
          <div class="form-row">
            <label>组件名称</label>
            <InputText v-model="componentForm.componentName" placeholder="如 API组件" />
          </div>
          <div class="form-row">
            <label>组件编码</label>
            <InputText v-model="componentForm.componentCode" placeholder="如 API / MYSQL" :disabled="!!componentForm.id" />
          </div>
        </div>
        <div class="form-col-2">
          <div class="form-row">
            <label>组件类型</label>
            <Select v-model="componentForm.componentType" :options="componentTypeOptions" optionLabel="label" optionValue="value" placeholder="选择类型" />
          </div>
          <div class="form-row">
            <label>组件分类</label>
            <Select v-model="componentForm.category" :options="categoryOptions" optionLabel="label" optionValue="value" placeholder="选择分类" />
          </div>
        </div>
        <div class="form-col-3">
          <div class="form-row">
            <label>图标</label>
            <InputText v-model="componentForm.icon" placeholder="pi pi-link" />
          </div>
          <div class="form-row">
            <label>颜色</label>
            <InputText v-model="componentForm.color" placeholder="#3b82f6" />
          </div>
          <div class="form-row">
            <label>排序</label>
            <InputNumber v-model="componentForm.sortNo" :min="0" :useGrouping="false" style="width:100%" />
          </div>
        </div>
        <div class="form-row">
          <label>状态</label>
          <Select v-model="componentForm.status" :options="statusOptions" optionLabel="label" optionValue="value" />
        </div>
        <div class="form-row">
          <label>描述</label>
          <Textarea v-model="componentForm.description" :rows="3" placeholder="说明这个组件在任务编排中负责什么能力" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" outlined @click="showComponentDialog = false" />
        <Button label="保存" icon="pi pi-check" :loading="savingComponent" @click="saveComponent" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showConfigDialog" modal :header="configDialogTitle" :style="{ width: '960px' }">
      <div class="config-toolbar">
        <div class="config-hint">配置项用于描述该组件拖到任务画布后，右侧属性面板需要填写哪些字段。</div>
        <Button label="新增配置项" icon="pi pi-plus" size="small" @click="openConfigItemDialog(null)" />
      </div>
      <DataTable :value="configList" :loading="loadingConfigs" stripedRows tableStyle="min-width:56rem" class="config-table">
        <template #empty>
          <div style="text-align:center;padding:30px;color:#999">暂无配置项</div>
        </template>
        <Column field="fieldName" header="字段名" style="width:130px" />
        <Column field="label" header="显示名" style="width:130px" />
        <Column header="表单类型" style="width:120px">
          <template #body="{ data }">
            <Tag :value="data.formType" />
          </template>
        </Column>
        <Column field="dataSource" header="数据来源" style="width:130px" />
        <Column header="必填" style="width:80px">
          <template #body="{ data }">
            <Tag :severity="Number(data.required) === 1 ? 'danger' : 'secondary'" :value="Number(data.required) === 1 ? '是' : '否'" />
          </template>
        </Column>
        <Column field="defaultValue" header="默认值" style="width:120px" />
        <Column field="sortNo" header="排序" style="width:80px" />
        <Column header="状态" style="width:90px">
          <template #body="{ data }">
            <Tag :severity="Number(data.status) === 1 ? 'success' : 'secondary'" :value="Number(data.status) === 1 ? '启用' : '禁用'" />
          </template>
        </Column>
        <Column header="操作" style="width:230px">
          <template #body="{ data }">
            <Button label="编辑" icon="pi pi-pencil" outlined size="small" @click="openConfigItemDialog(data)" style="margin-right:6px" />
            <Button :label="Number(data.status) === 1 ? '禁用' : '启用'" outlined size="small" @click="toggleConfigStatus(data)" style="margin-right:6px" />
            <Button icon="pi pi-trash" severity="danger" outlined size="small" @click="deleteConfig(data.id)" />
          </template>
        </Column>
      </DataTable>
    </Dialog>

    <Dialog v-model:visible="showConfigItemDialog" modal :header="configForm.id ? '编辑配置项' : '新增配置项'" :style="{ width: '620px' }">
      <div class="form-layout">
        <div class="form-col-2">
          <div class="form-row">
            <label>字段名</label>
            <InputText v-model="configForm.fieldName" placeholder="如 apiId" />
          </div>
          <div class="form-row">
            <label>显示名称</label>
            <InputText v-model="configForm.label" placeholder="如 选择接口" />
          </div>
        </div>
        <div class="form-col-2">
          <div class="form-row">
            <label>表单类型</label>
            <Select v-model="configForm.formType" :options="formTypeOptions" optionLabel="label" optionValue="value" placeholder="选择表单类型" />
          </div>
          <div class="form-row">
            <label>数据来源</label>
            <Select v-model="configForm.dataSource" :options="dataSourceOptions" optionLabel="label" optionValue="value" placeholder="选择数据来源" />
          </div>
        </div>
        <div class="form-col-3">
          <div class="form-row">
            <label>是否必填</label>
            <Select v-model="configForm.required" :options="yesNoOptions" optionLabel="label" optionValue="value" />
          </div>
          <div class="form-row">
            <label>状态</label>
            <Select v-model="configForm.status" :options="statusOptions" optionLabel="label" optionValue="value" />
          </div>
          <div class="form-row">
            <label>排序</label>
            <InputNumber v-model="configForm.sortNo" :min="0" :useGrouping="false" style="width:100%" />
          </div>
        </div>
        <div class="form-row">
          <label>默认值</label>
          <InputText v-model="configForm.defaultValue" placeholder="如 {} / 30000" />
        </div>
        <div class="form-row">
          <label>说明</label>
          <Textarea v-model="configForm.description" :rows="3" placeholder="说明这个字段的用途" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" outlined @click="showConfigItemDialog = false" />
        <Button label="保存" icon="pi pi-check" :loading="savingConfig" @click="saveConfig" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
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
import { requireAdmin } from '../../api'
import { componentApi } from '../../api/component'

const toast = useToast()
const confirm = useConfirm()

const categoryOptions = [
  { label: '基础组件', value: '基础组件' },
  { label: '数据库组件', value: '数据库组件' },
  { label: '接口组件', value: '接口组件' },
  { label: '逻辑组件', value: '逻辑组件' },
  { label: '脚本组件', value: '脚本组件' },
  { label: '任务组件', value: '任务组件' }
]
const categoryFilterOptions = [{ label: '全部分类', value: '' }, ...categoryOptions]
const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
]
const statusFilterOptions = [{ label: '全部状态', value: '' }, ...statusOptions]
const componentTypeOptions = [
  { label: 'START', value: 'START' },
  { label: 'END', value: 'END' },
  { label: 'MYSQL', value: 'MYSQL' },
  { label: 'MONGODB', value: 'MONGODB' },
  { label: 'API', value: 'API' },
  { label: 'IF', value: 'IF' },
  { label: 'PYTHON', value: 'PYTHON' },
  { label: 'FILTER', value: 'FILTER' },
  { label: 'TASK', value: 'TASK' }
]
const formTypeOptions = [
  { label: 'input', value: 'input' },
  { label: 'textarea', value: 'textarea' },
  { label: 'number', value: 'number' },
  { label: 'select', value: 'select' },
  { label: 'json', value: 'json' },
  { label: 'code', value: 'code' },
  { label: 'outputMapping', value: 'outputMapping' }
]
const dataSourceOptions = [
  { label: '手动输入', value: 'MANUAL' },
  { label: '数据库列表', value: 'DB_SOURCE' },
  { label: 'API列表', value: 'API_SOURCE' },
  { label: '节点列表', value: 'NODE_LIST' },
  { label: '固定选项', value: 'STATIC_OPTIONS' }
]
const yesNoOptions = [
  { label: '是', value: 1 },
  { label: '否', value: 0 }
]

const query = ref({ keyword: '', category: '', status: '' })
const list = ref([])
const loading = ref(false)
const showComponentDialog = ref(false)
const savingComponent = ref(false)
const componentForm = ref({})
const currentComponent = ref(null)
const showConfigDialog = ref(false)
const configList = ref([])
const loadingConfigs = ref(false)
const showConfigItemDialog = ref(false)
const savingConfig = ref(false)
const configForm = ref({})

const configDialogTitle = computed(() => currentComponent.value ? `${currentComponent.value.componentName} - 配置项管理` : '配置项管理')

onMounted(() => loadData())

function typeSeverity(type) {
  switch (type) {
    case 'START': return 'success'
    case 'END': return 'danger'
    case 'MYSQL': return 'warn'
    case 'MONGODB': return 'success'
    case 'API': return 'info'
    case 'IF': return 'contrast'
    default: return 'secondary'
  }
}

async function loadData() {
  loading.value = true
  try {
    list.value = (await componentApi.list(query.value)).data || []
  } finally {
    loading.value = false
  }
}

function openComponentDialog(row) {
  if (!requireAdmin()) return
  componentForm.value = row
    ? { ...row }
    : {
        componentName: '',
        componentCode: '',
        componentType: 'API',
        category: '接口组件',
        icon: 'pi pi-link',
        color: '#3b82f6',
        sortNo: 10,
        status: 1,
        description: ''
      }
  showComponentDialog.value = true
}

function validateComponent() {
  const f = componentForm.value
  if (!f.componentName || !f.componentCode || !f.componentType || !f.category) {
    toast.add({ severity: 'warn', summary: '提示', detail: '请填写组件名称、编码、类型和分类', life: 2500 })
    return false
  }
  return true
}

async function saveComponent() {
  if (!requireAdmin() || !validateComponent()) return
  savingComponent.value = true
  try {
    const data = { ...componentForm.value }
    if (data.id) await componentApi.update(data)
    else await componentApi.create(data)
    toast.add({ severity: 'success', summary: '成功', detail: '组件保存成功', life: 3000 })
    showComponentDialog.value = false
    loadData()
  } finally {
    savingComponent.value = false
  }
}

function deleteComponent(id) {
  if (!requireAdmin()) return
  confirm.require({
    message: '确定删除该组件？删除后会同时删除它的配置项。',
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: '删除', severity: 'danger' },
    rejectProps: { label: '取消', outlined: true },
    accept: async () => {
      await componentApi.delete(id)
      toast.add({ severity: 'success', summary: '成功', detail: '删除成功', life: 3000 })
      loadData()
    }
  })
}

async function toggleComponentStatus(row) {
  if (!requireAdmin()) return
  await componentApi.toggleStatus(row.id)
  toast.add({ severity: 'success', summary: '成功', detail: '状态已更新', life: 2500 })
  loadData()
}

async function openConfigDialog(row) {
  if (!requireAdmin()) return
  currentComponent.value = row
  showConfigDialog.value = true
  await loadConfigs()
}

async function loadConfigs() {
  if (!currentComponent.value) return
  loadingConfigs.value = true
  try {
    configList.value = (await componentApi.configList(currentComponent.value.id)).data || []
  } finally {
    loadingConfigs.value = false
  }
}

function openConfigItemDialog(row) {
  if (!requireAdmin()) return
  configForm.value = row
    ? { ...row }
    : {
        componentId: currentComponent.value?.id,
        fieldName: '',
        label: '',
        formType: 'input',
        dataSource: 'MANUAL',
        required: 0,
        defaultValue: '',
        sortNo: 10,
        status: 1,
        description: ''
      }
  showConfigItemDialog.value = true
}

function validateConfig() {
  const f = configForm.value
  if (!f.fieldName || !f.label || !f.formType || !f.dataSource) {
    toast.add({ severity: 'warn', summary: '提示', detail: '请填写字段名、显示名、表单类型和数据来源', life: 2500 })
    return false
  }
  return true
}

async function saveConfig() {
  if (!requireAdmin() || !validateConfig()) return
  savingConfig.value = true
  try {
    const data = { ...configForm.value, componentId: currentComponent.value.id }
    if (data.id) await componentApi.updateConfig(data)
    else await componentApi.createConfig(data)
    toast.add({ severity: 'success', summary: '成功', detail: '配置项保存成功', life: 3000 })
    showConfigItemDialog.value = false
    loadConfigs()
  } finally {
    savingConfig.value = false
  }
}

function deleteConfig(id) {
  if (!requireAdmin()) return
  confirm.require({
    message: '确定删除该配置项？',
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: '删除', severity: 'danger' },
    rejectProps: { label: '取消', outlined: true },
    accept: async () => {
      await componentApi.deleteConfig(id)
      toast.add({ severity: 'success', summary: '成功', detail: '删除成功', life: 3000 })
      loadConfigs()
    }
  })
}

async function toggleConfigStatus(row) {
  if (!requireAdmin()) return
  await componentApi.toggleConfigStatus(row.id)
  toast.add({ severity: 'success', summary: '成功', detail: '状态已更新', life: 2500 })
  loadConfigs()
}
</script>

<style scoped>
.search-input {
  width: 220px;
}
.filter-select {
  width: 140px;
}
.component-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.component-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.component-name {
  font-weight: 600;
  color: #1f2937;
}
.component-code {
  color: #94a3b8;
  font-size: 12px;
  margin-top: 2px;
}
.desc-text {
  display: inline-block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-col-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.form-col-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.form-row label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}
.config-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}
.config-hint {
  color: #64748b;
  font-size: 13px;
}
.config-table {
  margin-top: 6px;
}
html.p-dark .component-name {
  color: #f1f5f9;
}
html.p-dark .component-code,
html.p-dark .config-hint {
  color: #cbd5e1;
}
</style>
