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
    if (data.code !== 200) return Promise.reject(new Error(data.msg || data.message || '请求失败'))
    return data
  },
  err => Promise.reject(err)
)

const COMPONENTS_KEY = 'df_mock_components'
const COMPONENT_FIELDS_KEY = 'df_mock_component_fields'

const defaultComponents = [
  { id: 1, name: 'Remote DB Check Component', code: 'remote_db_check_20260520_1525', type: 'TRANSFORM', description: 'verify component writes to 110.42.111.49:54166', icon: 'check', version: '1.0.0', env: 'DEV', category: 'Verify', status: 1, versionNo: 1, createTime: '2026-05-20T15:25:24' },
  { id: 2, name: '数据清洗组件', code: 'data_clean', type: 'TRANSFORM', description: '用于清洗输入数据', icon: 'clean', version: '1.0.0', env: 'DEV', category: '数据处理', status: 1, versionNo: 1, createTime: '2026-05-20T15:32:41' },
  { id: 3, name: '接口调用组件', code: 'api_call', type: 'API', description: '调用 API 管理中登记的接口', icon: 'api', version: '1.0.0', env: 'DEV', category: '接口组件', status: 1, versionNo: 1, createTime: '2026-05-21T09:00:00' }
]

const defaultFields = [
  { id: 1, componentId: 2, fieldName: '输入字段', fieldCode: 'inputField', fieldType: 'STRING', defaultValue: '', required: 1, description: '需要清洗的输入字段', placeholder: '请输入字段名', options: null, validationRule: null, sortOrder: 1, createTime: '2026-05-20T19:55:48' },
  { id: 2, componentId: 3, fieldName: '接口ID', fieldCode: 'apiId', fieldType: 'NUMBER', defaultValue: '', required: 1, description: '选择 API 管理中的接口 ID', placeholder: '请选择接口', options: null, validationRule: null, sortOrder: 1, createTime: '2026-05-21T09:01:00' },
  { id: 3, componentId: 3, fieldName: '请求参数', fieldCode: 'params', fieldType: 'JSON', defaultValue: '{}', required: 0, description: '接口请求参数 JSON', placeholder: '{ }', options: null, validationRule: null, sortOrder: 2, createTime: '2026-05-21T09:02:00' }
]

function localMode() {
  return import.meta.env?.VITE_API_MODE === 'mock'
}

function ok(data) {
  return Promise.resolve({ code: 200, msg: '操作成功', data })
}

function nowText() {
  return new Date().toISOString().slice(0, 19)
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
  const env = params.env || 'DEV'
  const keyword = String(params.keyword || '').trim().toLowerCase()
  const category = params.category || ''
  const type = params.type || ''
  const status = params.status === '' || params.status === undefined || params.status === null ? '' : Number(params.status)

  let list = readList(COMPONENTS_KEY, defaultComponents).filter(item => !env || item.env === env)
  if (keyword) {
    list = list.filter(item =>
      String(item.name || '').toLowerCase().includes(keyword) ||
      String(item.code || '').toLowerCase().includes(keyword) ||
      String(item.type || '').toLowerCase().includes(keyword) ||
      String(item.category || '').toLowerCase().includes(keyword)
    )
  }
  if (category) list = list.filter(item => item.category === category)
  if (type) list = list.filter(item => item.type === type)
  if (status !== '') list = list.filter(item => Number(item.status) === status)
  return list.sort((a, b) => (Number(a.versionNo) || 0) - (Number(b.versionNo) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0))
}

export const componentApi = {
  list: (params = {}) => {
    if (localMode()) return ok(filterComponents(params))
    return request.get('/api/source/component/list', { params: { env: params.env || 'DEV' } })
  },
  listByType: (env, type) => {
    if (localMode()) return ok(filterComponents({ env, type }))
    return request.get('/api/source/component/listByType', { params: { env, type } })
  },
  listByCategory: (env, category) => {
    if (localMode()) return ok(filterComponents({ env, category }))
    return request.get('/api/source/component/listByCategory', { params: { env, category } })
  },
  enabled: (env = 'DEV') => {
    if (localMode()) return ok(filterComponents({ env, status: 1 }))
    return request.get('/api/source/component/list', { params: { env } })
  },
  getById: (id) => {
    if (localMode()) {
      const row = readList(COMPONENTS_KEY, defaultComponents).find(item => Number(item.id) === Number(id))
      return ok(row || null)
    }
    return request.get(`/api/source/component/${id}`)
  },
  create: (data) => {
    if (localMode()) {
      const list = readList(COMPONENTS_KEY, defaultComponents)
      const row = { ...data, id: nextId(list), createTime: nowText(), versionNo: data.versionNo || 1 }
      list.push(row)
      writeList(COMPONENTS_KEY, list)
      return ok(row.id)
    }
    return request.post('/api/source/component', data)
  },
  update: (data) => {
    if (localMode()) {
      const list = readList(COMPONENTS_KEY, defaultComponents)
      const idx = list.findIndex(item => Number(item.id) === Number(data.id))
      if (idx >= 0) list[idx] = { ...list[idx], ...data }
      writeList(COMPONENTS_KEY, list)
      return ok(null)
    }
    return request.put('/api/source/component', data)
  },
  delete: (id) => {
    if (localMode()) {
      writeList(COMPONENTS_KEY, readList(COMPONENTS_KEY, defaultComponents).filter(item => Number(item.id) !== Number(id)))
      writeList(COMPONENT_FIELDS_KEY, readList(COMPONENT_FIELDS_KEY, defaultFields).filter(item => Number(item.componentId) !== Number(id)))
      return ok(null)
    }
    return request.delete(`/api/source/component/${id}`)
  },
  toggleStatus: (id) => {
    if (localMode()) {
      const list = readList(COMPONENTS_KEY, defaultComponents)
      const row = list.find(item => Number(item.id) === Number(id))
      if (row) row.status = Number(row.status) === 1 ? 0 : 1
      writeList(COMPONENTS_KEY, list)
      return ok(null)
    }
    return request.post(`/api/source/component/toggleStatus/${id}`)
  },
  fieldList: (componentId) => {
    if (localMode()) {
      const list = readList(COMPONENT_FIELDS_KEY, defaultFields)
        .filter(item => Number(item.componentId) === Number(componentId))
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0))
      return ok(list)
    }
    return request.get(`/api/source/component/${componentId}/fields`)
  },
  getFieldById: (fieldId) => {
    if (localMode()) {
      const row = readList(COMPONENT_FIELDS_KEY, defaultFields).find(item => Number(item.id) === Number(fieldId))
      return ok(row || null)
    }
    return request.get(`/api/source/component/field/${fieldId}`)
  },
  createField: (data) => {
    if (localMode()) {
      const list = readList(COMPONENT_FIELDS_KEY, defaultFields)
      const row = { ...data, id: nextId(list), createTime: nowText() }
      list.push(row)
      writeList(COMPONENT_FIELDS_KEY, list)
      return ok(row.id)
    }
    return request.post('/api/source/component/field', data)
  },
  updateField: (data) => {
    if (localMode()) {
      const list = readList(COMPONENT_FIELDS_KEY, defaultFields)
      const idx = list.findIndex(item => Number(item.id) === Number(data.id))
      if (idx >= 0) list[idx] = { ...list[idx], ...data }
      writeList(COMPONENT_FIELDS_KEY, list)
      return ok(null)
    }
    return request.put('/api/source/component/field', data)
  },
  deleteField: (fieldId) => {
    if (localMode()) {
      writeList(COMPONENT_FIELDS_KEY, readList(COMPONENT_FIELDS_KEY, defaultFields).filter(item => Number(item.id) !== Number(fieldId)))
      return ok(null)
    }
    return request.delete(`/api/source/component/field/${fieldId}`)
  },
  batchCreateFields: (componentId, fields) => {
    if (localMode()) {
      const list = readList(COMPONENT_FIELDS_KEY, defaultFields)
      fields.forEach(field => list.push({ ...field, id: nextId(list), componentId, createTime: nowText() }))
      writeList(COMPONENT_FIELDS_KEY, list)
      return ok(null)
    }
    return request.post(`/api/source/component/${componentId}/fields/batch`, fields)
  },

  // 兼容旧页面命名，避免其它页面引用时爆炸。人类命名迁移的保护垫。
  configList: (componentId) => componentApi.fieldList(componentId),
  createConfig: (data) => componentApi.createField(data),
  updateConfig: (data) => componentApi.updateField(data),
  deleteConfig: (id) => componentApi.deleteField(id),
  toggleConfigStatus: () => ok(null)
}

export default componentApi
