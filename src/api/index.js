import axios from 'axios'
import { useToast } from 'primevue/usetoast'

const request = axios.create({ timeout: 30000 })

// Global toast instance - set by App.vue on mount
let toastInstance = null
export function setGlobalToast(toast) {
  toastInstance = toast
}

function showError(msg) {
  if (toastInstance) {
    toastInstance.add({ severity: 'error', summary: '错误', detail: msg, life: 3000 })
  }
}

// 请求拦截器：自动带 token
request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  res => {
    const data = res.data
    if (data.code !== 200) {
      showError(data.msg || '请求失败')
      return Promise.reject(new Error(data.msg))
    }
    return data
  },
  err => {
    if (err.response?.status === 401) {
      showError('访客无权执行此操作，请登录管理员账号')
    } else {
      const msg = err.response?.data?.msg || err.response?.data?.message
      showError(msg || err.message || '网络错误')
    }
    return Promise.reject(err)
  }
)

// ==================== Auth ====================

export const authApi = {
  login: (data) => request.post('/auth/login', data)
}

// ==================== 角色工具 ====================

export function isAdmin() {
  return localStorage.getItem('role') === 'admin'
}

export function requireAdmin() {
  if (!isAdmin()) {
    showError('访客无权执行此操作，请登录管理员账号')
    return false
  }
  return true
}

// ==================== Source Service ====================

export const dbSourceApi = {
  list: (env) => request.get('/api/source/db/list', { params: { env } }),
  getById: (id) => request.get(`/api/source/db/${id}`),
  create: (data) => request.post('/api/source/db', data),
  update: (data) => request.put('/api/source/db', data),
  delete: (id) => request.delete(`/api/source/db/${id}`),
  test: (id) => request.post(`/api/source/db/test/${id}`)
}

export const apiSourceApi = {
  list: (env) => request.get('/api/source/api/list', { params: { env } }),
  getById: (id) => request.get(`/api/source/api/${id}`),
  create: (data) => request.post('/api/source/api', data),
  update: (data) => request.put('/api/source/api', data),
  delete: (id) => request.delete(`/api/source/api/${id}`),
  test: (id) => request.post(`/api/source/api/test/${id}`)
}

// ==================== Task Service ====================

export const taskApi = {
  list: (env) => request.get('/api/task/list', { params: { env } }),
  getById: (id) => request.get(`/api/task/${id}`),
  create: (data) => request.post('/api/task', data),
  update: (data) => request.put('/api/task', data),
  delete: (id) => request.delete(`/api/task/${id}`),
  execute: (id) => request.post(`/api/task/execute/${id}`),
  publish: (taskId, targetEnv) => request.post('/api/task/publish', { taskId, targetEnv }),
  scheduleStart: (id) => request.post(`/api/task/schedule/${id}/start`),
  scheduleStop: (id) => request.post(`/api/task/schedule/${id}/stop`),
  scheduleStatus: (id) => request.get(`/api/task/schedule/${id}/status`),
  toggleStatus: (id) => request.put(`/api/task/${id}/status`),
  nodeTypeDefs: () => request.get('/api/task/node-types')
}

export const openApiApi = {
  list: (env) => request.get('/api/task/openapi/list', { params: { env } }),
  create: (data) => request.post('/api/task/openapi', data),
  update: (data) => request.put('/api/task/openapi', data),
  delete: (id) => request.delete(`/api/task/openapi/${id}`),
  toggleStatus: (id) => request.put(`/api/task/openapi/${id}/status`),
  isLinked: (taskId) => request.get(`/api/task/openapi/linked/${taskId}`),
  publish: (id, targetEnv) => request.post('/api/task/openapi/publish', { id, targetEnv }),
  listVersions: (id) => request.get(`/api/task/openapi/version/${id}`),
  rollback: (id, versionNo) => request.post('/api/task/openapi/version/rollback', { id, versionNo }),
  createVersion: (id, contentSnapshot) => request.post(`/api/task/openapi/version/create/${id}`, { contentSnapshot })
}

export const versionApi = {
  list: (taskId) => request.get(`/api/task/version/${taskId}`),
  rollback: (taskId, versionNo) => request.post('/api/task/version/rollback', { taskId, versionNo }),
  create: (taskId, dslContent) => request.post(`/api/task/version/create/${taskId}`, { dslContent })
}

export const logApi = {
  list: (env) => request.get('/api/task/log/list', { params: { env } }),
  batchDelete: (ids) => request.delete('/api/task/log/batch', { data: ids }),
  clean: (env, beforeDate) => request.delete('/api/task/log/clean', { params: { env, beforeDate } })
}
