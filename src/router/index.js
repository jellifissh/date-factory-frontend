import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue'),
    meta: { title: '登录', public: true }
  },
  { path: '/', redirect: '/source/db' },
  {
    path: '/source/db',
    name: 'DbSource',
    component: () => import('../views/source/DbSource.vue'),
    meta: { title: '数据库管理' }
  },
  {
    path: '/source/api',
    name: 'ApiSource',
    component: () => import('../views/source/ApiSource.vue'),
    meta: { title: 'API 管理' }
  },
  {
    path: '/task',
    name: 'TaskList',
    component: () => import('../views/task/TaskList.vue'),
    meta: { title: '任务管理' }
  },
  {
    path: '/task/edit/:id?',
    name: 'TaskEditor',
    component: () => import('../views/task/TaskEditor.vue'),
    meta: { title: '任务编辑' }
  },
  {
    path: '/openapi',
    name: 'OpenApi',
    component: () => import('../views/openapi/OpenApi.vue'),
    meta: { title: '开放平台' }
  },
  {
    path: '/log',
    name: 'TaskLog',
    component: () => import('../views/log/TaskLog.vue'),
    meta: { title: '日志管理' }
  },
  {
    path: '/version/:entityId',
    name: 'VersionHistory',
    component: () => import('../views/version/VersionHistory.vue'),
    meta: { title: '版本管理' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：未登录（没有 role）跳登录页
router.beforeEach((to, from, next) => {
  const role = localStorage.getItem('role')
  if (!role && !to.meta.public) {
    next('/login')
  } else {
    next()
  }
})

export default router
