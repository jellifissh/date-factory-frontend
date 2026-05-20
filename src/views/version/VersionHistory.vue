<template>
  <div>
    <div class="page-header">
      <h2>环境管理 - {{ entityLabel }}</h2>
      <Button label="返回" icon="pi pi-arrow-left" @click="$router.back()" outlined />
    </div>

    <!-- 环境状态卡片 -->
    <div class="env-cards">
      <Card v-for="e in envList" :key="e.key"
            class="env-card"
            :class="{ 'env-card-active': currentEnv === e.key }"
            @click="switchEnv(e.key)">
        <template #content>
          <div style="text-align:center">
            <Tag :severity="e.severity" style="font-size:14px;padding:4px 16px">{{ e.key }}</Tag>
            <p class="env-card-label">
              {{ e.key === currentEnv ? '当前环境' : envEntityInfo[e.key] ? '已发布' : '未发布' }}
            </p>
            <p v-if="envEntityInfo[e.key]" class="env-card-version">
              版本 v{{ envEntityInfo[e.key].versionNo }} · ID: {{ envEntityInfo[e.key].id }}
            </p>
          </div>
        </template>
      </Card>
    </div>

    <!-- 晋升按钮 -->
    <div class="promote-bar">
      <span class="promote-label">环境晋升：</span>
      <template v-if="currentEnv === 'DEV'">
        <Button label="创建新版本" icon="pi pi-plus" @click="doCreateVersion" />
        <Button label="晋升为 TEST" icon="pi pi-arrow-up" severity="warning" @click="doPublish('TEST')" :loading="publishing" />
      </template>
      <template v-else-if="currentEnv === 'TEST'">
        <Button label="晋升为 PROD" icon="pi pi-arrow-up" severity="danger" @click="doPublish('PROD')" :loading="publishing" />
      </template>
      <template v-else>
        <Tag severity="secondary">PROD 为最终环境，不可继续晋升</Tag>
      </template>
    </div>

    <!-- 版本历史 -->
    <h3 style="margin-bottom:12px">{{ currentEnv }} 环境版本历史</h3>

    <div v-if="versions.length" class="timeline">
      <div v-for="v in versions" :key="v.id" class="timeline-item">
        <div class="timeline-dot" :class="{ 'timeline-dot-active': v.versionNo === currentVersion }"></div>
        <div class="timeline-content">
          <span class="timeline-time">{{ v.createTime }}</span>
          <Card>
            <template #content>
              <div class="version-row">
                <div>
                  <Tag :severity="v.versionNo === currentVersion ? 'success' : 'secondary'" style="font-size:12px">v{{ v.versionNo }}</Tag>
                  <span v-if="v.versionNo === currentVersion" class="current-label">当前版本</span>
                  <span class="env-label">{{ v.env }}</span>
                </div>
                <div style="display:flex;gap:6px">
                  <Button label="查看快照" size="small" outlined @click="previewSnapshot(v)" />
                  <Button :label="v.versionNo < currentVersion ? '回滚到此版本' : '应用此版本'"
                          size="small" severity="warning"
                          :disabled="v.versionNo === currentVersion"
                          :loading="rollingBack === v.versionNo"
                          @click="handleRollback(v)" />
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>

    <div v-if="!loading && !versions.length" class="empty-state">
      <i class="pi pi-inbox" style="font-size:2.5rem;color:#909399"></i>
      <p style="margin-top:8px;color:#909399">暂无版本历史</p>
    </div>

    <Dialog v-model:visible="showPreview" header="版本快照" :style="{ width: '600px' }" modal>
      <div class="dsl-preview">{{ snapshotContent }}</div>
    </Dialog>

    <!-- 创建新版本编辑对话框 -->
    <Dialog v-model:visible="showEditDialog" header="创建新版本" :style="{ width: '560px' }" modal>
      <!-- DbSource 编辑表单 -->
      <template v-if="entityType === 'DB_SOURCE'">
        <div class="form-grid">
          <div class="form-col-2">
            <div class="form-row"><label>名称</label><InputText v-model="editForm.name" style="width:100%" disabled /></div>
            <div class="form-row"><label>类型</label><InputText :value="editForm.dbType" style="width:100%" disabled /></div>
          </div>
          <div class="form-col-2">
            <div class="form-row"><label>Host</label><InputText v-model="editForm.host" style="width:100%" /></div>
            <div class="form-row"><label>Port</label><InputNumber v-model="editForm.port" :min="1" :max="65535" :useGrouping="false" style="width:100%" /></div>
          </div>
          <div class="form-col-2">
            <div class="form-row"><label>用户名</label><InputText v-model="editForm.username" style="width:100%" /></div>
            <div class="form-row"><label>密码</label><Password v-model="editForm.password" :feedback="false" toggleMask style="width:100%" /></div>
          </div>
          <div class="form-row"><label>库名</label><InputText v-model="editForm.dbName" style="width:100%" /></div>
          <div class="form-row"><label>额外参数</label><InputText v-model="editForm.extraParams" style="width:100%" /></div>
        </div>
      </template>

      <!-- ApiSource 编辑表单 -->
      <template v-else-if="entityType === 'API_SOURCE'">
        <div class="form-grid">
          <div class="form-row"><label>名称</label><InputText v-model="editForm.name" style="width:100%" disabled /></div>
          <div class="form-col-2">
            <div class="form-row"><label>方法</label>
              <Select v-model="editForm.method" :options="[{label:'GET',value:'GET'},{label:'POST',value:'POST'},{label:'PUT',value:'PUT'},{label:'DELETE',value:'DELETE'}]" optionLabel="label" optionValue="value" style="width:100%" />
            </div>
            <div class="form-row"><label>超时(ms)</label><InputNumber v-model="editForm.timeout" :min="1000" :max="300000" :step="1000" :useGrouping="false" style="width:100%" /></div>
          </div>
          <div class="form-row"><label>URL</label><InputText v-model="editForm.url" style="width:100%" /></div>
          <div class="form-row"><label>认证配置</label><Textarea v-model="editForm.authConfig" :rows="2" style="width:100%" /></div>
          <div class="form-row"><label>请求头</label><Textarea v-model="editForm.headers" :rows="2" style="width:100%" /></div>
        </div>
      </template>

      <!-- OpenApi 编辑表单 -->
      <template v-else-if="entityType === 'OPEN_API'">
        <div class="form-grid">
          <div class="form-row"><label>路径</label><InputText v-model="editForm.path" style="width:100%" disabled /></div>
          <div class="form-row"><label>请求方法</label>
            <SelectButton v-model="editForm.method" :options="[{label:'GET',value:'GET'},{label:'POST',value:'POST'}]" optionLabel="label" optionValue="value" :allowEmpty="false" />
          </div>
          <div class="form-row"><label>关联任务</label>
            <Select v-model="editForm.taskId" :options="taskOptions" optionLabel="label" optionValue="value" filter style="width:100%" />
          </div>
          <div class="form-row"><label>每日配额</label>
            <Select v-model="editForm.dailyLimit" :options="[{label:'50 次/天',value:50},{label:'100 次/天',value:100},{label:'1000 次/天',value:1000},{label:'不限',value:0}]" optionLabel="label" optionValue="value" style="width:100%" />
          </div>
        </div>
      </template>

      <template #footer>
        <Button label="取消" outlined @click="showEditDialog = false" />
        <Button label="保存为新版本" icon="pi pi-check" :loading="savingVersion" @click="saveNewVersion" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { versionApi, taskApi, openApiApi, requireAdmin } from '../../api'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Password from 'primevue/password'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

const toast = useToast()
const confirm = useConfirm()
const route = useRoute()
const router = useRouter()

const entityId = Number(route.params.entityId)
const entityType = route.query.type || 'TASK'

const entityName = ref('')
const currentEnv = ref('DEV')
const currentVersion = ref(0)
const versions = ref([])
const loading = ref(false)
const rollingBack = ref(null)
const showPreview = ref(false)
const snapshotContent = ref('')
const publishing = ref(false)

const showEditDialog = ref(false)
const editForm = ref({})
const savingVersion = ref(false)
const taskOptions = ref([])

const envEntityInfo = ref({})

const envList = [
  { key: 'DEV', severity: 'success' },
  { key: 'TEST', severity: 'warning' },
  { key: 'PROD', severity: 'danger' }
]

const api = computed(() => {
  switch (entityType) {
    case 'TASK': return {
      getById: taskApi.getById,
      listByEnv: taskApi.list,
      publish: taskApi.publish,
      listVersions: versionApi.list,
      rollback: versionApi.rollback,
      createVersion: versionApi.create,
      update: taskApi.update,
      matchField: 'name'
    }
    case 'OPEN_API': return {
      getById: (id) => openApiApi.list('DEV').then(r => { const all = r.data || []; return { data: all.find(x => x.id === id) || null } }),
      listByEnv: openApiApi.list,
      publish: openApiApi.publish,
      listVersions: openApiApi.listVersions,
      rollback: openApiApi.rollback,
      createVersion: openApiApi.createVersion,
      update: openApiApi.update,
      matchField: 'path'
    }
  }
})

const entityLabel = computed(() => {
  const prefix = { TASK: '任务', DB_SOURCE: '数据源', API_SOURCE: 'API', OPEN_API: '开放接口' }
  return `${prefix[entityType] || ''} ${entityName.value || ('#' + entityId)}`
})

onMounted(async () => {
  const res = await api.value.getById(entityId)
  const entity = res.data
  if (!entity) {
    toast.add({ severity: 'error', summary: '错误', detail: '实体不存在', life: 3000 })
    return
  }
  entityName.value = entity[api.value.matchField] || entity.name || entity.path || ''
  currentEnv.value = entity.env

  await loadAllEnvEntities(entityName.value)
  await loadVersions()
})

async function loadAllEnvEntities(name) {
  for (const e of ['DEV', 'TEST', 'PROD']) {
    try {
      const res = await api.value.listByEnv(e)
      const found = (res.data || []).find(t => t[api.value.matchField] === name)
      if (found) envEntityInfo.value[e] = { id: found.id, versionNo: found.versionNo }
    } catch {}
  }
}

async function loadVersions() {
  loading.value = true
  try {
    const info = envEntityInfo.value[currentEnv.value]
    const targetId = info ? info.id : entityId
    const [vRes, eRes] = await Promise.all([
      api.value.listVersions(targetId),
      api.value.getById(targetId)
    ])
    versions.value = vRes.data || []
    currentVersion.value = eRes.data?.versionNo || 0
  } finally { loading.value = false }
}

async function switchEnv(env) {
  if (env === currentEnv.value) return
  const info = envEntityInfo.value[env]
  if (!info) {
    toast.add({ severity: 'warn', summary: '提示', detail: `${env} 环境尚未发布，请先晋升`, life: 3000 })
    return
  }
  currentEnv.value = env
  await loadVersions()
}

async function doCreateVersion() {
  if (!requireAdmin()) return
  const info = envEntityInfo.value[currentEnv.value]
  if (!info) return

  if (entityType === 'TASK') {
    router.push(`/task/edit/${info.id}?mode=newVersion`)
    return
  }

  // 加载当前实体数据，弹出编辑框
  const res = await api.value.getById(info.id)
  editForm.value = { ...res.data }

  // OpenApi 需要加载任务列表
  if (entityType === 'OPEN_API') {
    try {
      const tRes = await taskApi.list(currentEnv.value)
      taskOptions.value = (tRes.data || []).map(t => ({ label: `${t.name} (ID:${t.id})`, value: t.id }))
    } catch {}
  }

  showEditDialog.value = true
}

async function saveNewVersion() {
  if (!requireAdmin()) return
  const info = envEntityInfo.value[currentEnv.value]
  if (!info) return

  savingVersion.value = true
  try {
    // 1. 更新实体
    await api.value.update(editForm.value)
    // 2. 创建版本快照
    await api.value.createVersion(info.id, JSON.stringify(editForm.value))
    toast.add({ severity: 'success', summary: '成功', detail: '新版本已创建', life: 3000 })
    showEditDialog.value = false
    await loadAllEnvEntities(entityName.value)
    await loadVersions()
  } finally { savingVersion.value = false }
}

async function doPublish(targetEnv) {
  if (!requireAdmin()) return
  const sourceInfo = envEntityInfo.value[currentEnv.value]
  if (!sourceInfo) return

  confirm.require({
    message: `确定将「${entityName.value}」从 ${currentEnv.value} 晋升到 ${targetEnv}？`,
    header: '环境晋升',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      publishing.value = true
      try {
        await api.value.publish(sourceInfo.id, targetEnv)
        toast.add({ severity: 'success', summary: '成功', detail: `晋升到 ${targetEnv} 成功`, life: 3000 })
        await loadAllEnvEntities(entityName.value)
        await loadVersions()
      } finally { publishing.value = false }
    }
  })
}

function previewSnapshot(v) {
  try {
    snapshotContent.value = JSON.stringify(JSON.parse(v.contentSnapshot), null, 2)
  } catch { snapshotContent.value = v.contentSnapshot }
  showPreview.value = true
}

async function handleRollback(v) {
  if (!requireAdmin()) return
  const info = envEntityInfo.value[currentEnv.value]
  confirm.require({
    message: `确定回滚到 v${v.versionNo}？`,
    header: '版本回滚',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      rollingBack.value = v.versionNo
      try {
        await api.value.rollback(info.id, v.versionNo)
        toast.add({ severity: 'success', summary: '成功', detail: '回滚成功', life: 3000 })
        await loadVersions()
        await loadAllEnvEntities(entityName.value)
      } finally { rollingBack.value = null }
    }
  })
}
</script>

<style scoped>
.env-cards { display: flex; gap: 16px; margin-bottom: 24px; }
.env-card { flex: 1; cursor: pointer; transition: box-shadow 0.2s; }
.env-card:hover { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12); }
.env-card-active { border: 2px solid var(--p-primary-color); }
.env-card-label { margin-top: 10px; font-size: 12px; color: #909399; }
.env-card-version { margin-top: 4px; font-size: 12px; color: #606266; }
.promote-bar { margin-bottom: 20px; display: flex; gap: 12px; align-items: center; }
.promote-label { font-size: 14px; color: #606266; font-weight: 500; }
.timeline { position: relative; padding-left: 28px; }
.timeline::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: #dcdfe6; }
.timeline-item { position: relative; margin-bottom: 20px; }
.timeline-dot { position: absolute; left: -24px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: #909399; border: 2px solid #fff; z-index: 1; }
.timeline-dot-active { background: #67c23a; }
.timeline-time { display: block; margin-bottom: 4px; font-size: 12px; color: #909399; }
.timeline-content { min-width: 0; }
.version-row { display: flex; justify-content: space-between; align-items: center; }
.current-label { margin-left: 8px; color: #67c23a; font-size: 12px; }
.env-label { margin-left: 8px; color: #909399; font-size: 12px; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px 0; }
.dsl-preview { white-space: pre-wrap; word-break: break-all; font-family: monospace; font-size: 13px; max-height: 400px; overflow-y: auto; }
.form-grid { display: flex; flex-direction: column; gap: 16px; }
.form-col-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-row label { font-size: 12px; font-weight: 500; color: #475569; }
</style>
