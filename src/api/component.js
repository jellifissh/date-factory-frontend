import axios from 'axios'

const request = axios.create({ timeout: 30000 })

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  res => {
    const data = res.data
    if (data.code !== 200) return Promise.reject(new Error(data.msg || '请求失败'))
    return data
  },
  err => Promise.reject(err)
)

const COMPONENTS_KEY = 'df_mock_components'
const COMPONENT_CONFIGS_KEY = 'df_mock_component_configs'

const defaultComponents = [
  { id: 1, componentName: '开始节点', componentCode: 'START', componentType: 'START', category: '基础组件', icon: 'pi pi-play', color: '#409eff', sortNo: 10, status: 1, description: '任务开始节点，只允许作为流程入口', createTime: '2026-05-18 09:00:00' },
  { id: 2, componentName: 'MySQL组件', componentCode: 'MYSQL', componentType: 'MYSQL', category: '数据库组件', icon: 'pi pi-database', color: '#e6a23c', sortNo: 20, status: 1, description: '选择已登记的 MySQL 数据源并执行 SQL', createTime: '2026-05-18 09:05:00' },
  { id: 3, componentName: 'MongoDB组件', componentCode: 'MONGODB', componentType: 'MONGODB', category: '数据库组件', icon: 'pi pi-server', color: '#67c23a', sortNo: 30, status: 1, description: '选择 MongoDB 数据源并执行集合查询或写入操作', createTime: '2026-05-18 09:10:00' },
  { id: 4, componentName: '接口组件', componentCode: 'API', componentType: 'API', category: '接口组件', icon: 'pi pi-link', color: '#3b82f6', sortNo: 40, status: 1, description: '选择 API 管理中登记的接口并发起调用', createTime: '2026-05-18 09:15:00' },
  { id: 5, componentName: '条件分支', componentCode: 'IF', componentType: 'IF', category: '逻辑组件', icon: 'pi pi-code-branch', color: '#8b5cf6', sortNo: 50, status: 1, description: '根据表达式结果决定后续走是/否分支', createTime: '2026-05-18 09:20:00' },
  { id: 6, componentName: '结束节点', componentCode: 'END', componentType: 'END', category: '基础组件', icon: 'pi pi-stop', color: '#f56c6c', sortNo: 60, status: 1, description: '任务结束节点，用于收束流程输出', createTime: '2026-05-18 09:25:00' }
]

const defaultConfigItems = [
  { id: 1, componentId: 2, fieldName: 'dbId', label: '数据源', formType: 'select', dataSource: 'DB_SOURCE', required: 1, defaultValue: '', sortNo: 10, status: 1, description: '来自数据库管理的 MySQL 数据源' },
  { id: 2, componentId: 2, fieldName: 'sql', label: 'SQL', formType: 'textarea', dataSource: 'MANUAL', required: 1, defaultValue: '', sortNo: 20, status: 1, description: '支持 {{node.field}} 变量引用' },
  { id: 3, componentId: 4, fieldName: 'apiId', label: 'API源', formType: 'select', dataSource: 'API_SOURCE', required: 1, defaultValue: '', sortNo: 10, status: 1, description: '来自 API 管理的接口' },
  { id: 4, componentId: 4, fieldName: 'body', label: '请求体', formType: 'json', dataSource: 'MANUAL', required: 0, defaultValue: '{}', sortNo: 20, status: 1, description: '接口请求体 JSON，支持变量引用' },
  { id: 5, componentId: 4, fieldName: 'timeout', label: '超时时间', formType: 'number', dataSource: 'MANUAL', required: 0, defaultValue: '30000', sortNo: 30, status: 1, description: '单位：毫秒' },
  { id: 6, componentId: 5, fieldName: 'condition', label: '条件表达式', formType: 'textarea', dataSource: 'MANUAL', required: 1, defaultValue: '', sortNo: 10, status: 1, description: '例如 {{mysql_01.count}} > 0' },
  { id: 7, componentId: 1, fieldName: 'outputs', label: '参数配置', formType: 'outputMapping', dataSource: 'MANUAL', required: 0, defaultValue: '', sortNo: 10, status: 1, description: '定义流程入参或默认值' },
  { id: 8, componentId: 6, fieldName: 'result', label: '返回结果', formType: 'textarea', dataSource: 'MANUAL', required: 0, defaultValue: '', sortNo: 10, status: 1, description: '流程最终输出内容' }
]

function nowText() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function localMode() {
  return import.meta.env?.VITE_API_MODE === 'mock'
}

function ok(data) {
  return Promise.resolve({ code: 200, msg: 'success', data })
}

function readList(key, defaults) {
  const raw = localStorage.getItem(key)
  if (!raw) {
    const seeded = JSON.parse(JSON.stringify(defaults))
    localStorage.setItem(key, JSON.stringify(seeded))
    return seeded
  }
  try { return JSON.parse(raw) } catch {
    const seeded = JSON.parse(JSON.stringify(defaults))
    localStorage.setItem(key, JSON.stringify(seeded))
    return seeded
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list))
}

function nextId(list) {
  return list.length ? Math.max(...list.map(item => Number(item.id) || 0)) + 1 : 1
}

function filterComponents(params = {}) {
  const keyword = String(params.keyword || '').trim().toLowerCase()
  const category = params.category || ''
  const status = params.status === '' || params.status === undefined || params.status === null ? '' : Number(params.status)
  let list = readList(COMPONENTS_KEY, defaultComponents)
  if (keyword) {
    list = list.filter(item =>
      String(item.componentName || '').toLowerCase().includes(keyword) ||
      String(item.componentCode || '').toLowerCase().includes(keyword) ||
      String(item.componentType || '').toLowerCase().includes(keyword)
    )
  }
  if (category) list = list.filter(item => item.category === category)
  if (status !== '') list = list.filter(item => Number(item.status) === status)
  return list.sort((a, b) => (Number(a.sortNo) || 0) - (Number(b.sortNo) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0))
}

export const componentApi = {
  list: (params = {}) => localMode() ? ok(filterComponents(params)) : request.get('/api/component/list', { params }),
  enabled: () => localMode() ? ok(filterComponents({ status: 1 })) : request.get('/api/component/enabled'),
  getById: (id) => {
    if (!localMode()) return request.get(`/api/component/${id}`)
    const row = readList(COMPONENTS_KEY, defaultComponents).find(item => Number(item.id) === Number(id))
    return ok(row || null)
  },
  create: (data) => {
    if (!localMode()) return request.post('/api/component', data)
    const list = readList(COMPONENTS_KEY, defaultComponents)
    const row = { ...data, id: nextId(list), createTime: nowText() }
    list.push(row)
    writeList(COMPONENTS_KEY, list)
    return ok(row)
  },
  update: (data) => {
    if (!localMode()) return request.put('/api/component', data)
    const list = readList(COMPONENTS_KEY, defaultComponents)
    const idx = list.findIndex(item => Number(item.id) === Number(data.id))
    if (idx >= 0) list[idx] = { ...list[idx], ...data }
    writeList(COMPONENTS_KEY, list)
    return ok(idx >= 0 ? list[idx] : data)
  },
  delete: (id) => {
    if (!localMode()) return request.delete(`/api/component/${id}`)
    writeList(COMPONENTS_KEY, readList(COMPONENTS_KEY, defaultComponents).filter(item => Number(item.id) !== Number(id)))
    writeList(COMPONENT_CONFIGS_KEY, readList(COMPONENT_CONFIGS_KEY, defaultConfigItems).filter(item => Number(item.componentId) !== Number(id)))
    return ok(true)
  },
  toggleStatus: (id) => {
    if (!localMode()) return request.put(`/api/component/${id}/status`)
    const list = readList(COMPONENTS_KEY, defaultComponents)
    const row = list.find(item => Number(item.id) === Number(id))
    if (row) row.status = Number(row.status) === 1 ? 0 : 1
    writeList(COMPONENTS_KEY, list)
    return ok(true)
  },
  configList: (componentId) => {
    if (!localMode()) return request.get('/api/component/config/list', { params: { componentId } })
    const list = readList(COMPONENT_CONFIGS_KEY, defaultConfigItems)
      .filter(item => Number(item.componentId) === Number(componentId))
      .sort((a, b) => (Number(a.sortNo) || 0) - (Number(b.sortNo) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0))
    return ok(list)
  },
  createConfig: (data) => {
    if (!localMode()) return request.post('/api/component/config', data)
    const list = readList(COMPONENT_CONFIGS_KEY, defaultConfigItems)
    const row = { ...data, id: nextId(list) }
    list.push(row)
    writeList(COMPONENT_CONFIGS_KEY, list)
    return ok(row)
  },
  updateConfig: (data) => {
    if (!localMode()) return request.put('/api/component/config', data)
    const list = readList(COMPONENT_CONFIGS_KEY, defaultConfigItems)
    const idx = list.findIndex(item => Number(item.id) === Number(data.id))
    if (idx >= 0) list[idx] = { ...list[idx], ...data }
    writeList(COMPONENT_CONFIGS_KEY, list)
    return ok(idx >= 0 ? list[idx] : data)
  },
  deleteConfig: (id) => {
    if (!localMode()) return request.delete(`/api/component/config/${id}`)
    writeList(COMPONENT_CONFIGS_KEY, readList(COMPONENT_CONFIGS_KEY, defaultConfigItems).filter(item => Number(item.id) !== Number(id)))
    return ok(true)
  },
  toggleConfigStatus: (id) => {
    if (!localMode()) return request.put(`/api/component/config/${id}/status`)
    const list = readList(COMPONENT_CONFIGS_KEY, defaultConfigItems)
    const row = list.find(item => Number(item.id) === Number(id))
    if (row) row.status = Number(row.status) === 1 ? 0 : 1
    writeList(COMPONENT_CONFIGS_KEY, list)
    return ok(true)
  }
}

export default componentApi
