<template>
  <!-- 登录页独立渲染 -->
  <template v-if="route.path === '/login'">
    <Toast />
    <router-view />
  </template>

  <!-- 主布局 -->
  <div v-else class="app-layout">
    <Toast />
    <ConfirmDialog />
    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-left">
        <img src="/blue-whale.svg" alt="logo" class="topbar-logo" />
        <span class="topbar-title"><span class="title-light">Data</span><span class="title-bold">Factory</span></span>
        <div class="particles">
          <span v-for="i in 6" :key="i" class="particle" :style="particleStyle(i)"></span>
        </div>
      </div>
      <div class="topbar-right">
        <span class="topbar-env">{{ currentEnv }}</span>
        <button class="dark-toggle" @click="toggleDark" :title="isDark ? '切换浅色模式' : '切换深色模式'">
          <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'"></i>
        </button>
        <div class="user-avatar" :class="{ 'avatar-admin': isAdmin }" @click="toggleUserMenu" title="用户菜单">
          {{ isAdmin ? '管' : '访' }}
        </div>
        <Menu ref="userMenu" :model="userMenuItems" :popup="true" />
      </div>
    </header>
    <!-- Body: sidebar + content -->
    <div class="app-body">
      <aside class="sidebar">
        <nav class="nav-menu">
          <div class="nav-group">
            <div class="nav-group-title" @click="menuOpen.source = !menuOpen.source">
              <i class="pi pi-database"></i>
              <span>数据源管理</span>
              <i class="pi" :class="menuOpen.source ? 'pi-chevron-down' : 'pi-chevron-right'" style="font-size:11px;margin-left:auto"></i>
            </div>
            <div class="nav-group-items" :class="{ collapsed: !menuOpen.source }">
              <router-link to="/source/db" class="nav-item" :class="{ active: route.path === '/source/db' }">
                <i class="pi pi-server"></i>
                <span>数据库管理</span>
              </router-link>
              <router-link to="/source/api" class="nav-item" :class="{ active: route.path === '/source/api' }">
                <i class="pi pi-globe"></i>
                <span>API 管理</span>
              </router-link>
            </div>
          </div>
          <div class="nav-group">
            <div class="nav-group-title" @click="menuOpen.task = !menuOpen.task">
              <i class="pi pi-cog"></i>
              <span>任务管理</span>
              <i class="pi" :class="menuOpen.task ? 'pi-chevron-down' : 'pi-chevron-right'" style="font-size:11px;margin-left:auto"></i>
            </div>
            <div class="nav-group-items" :class="{ collapsed: !menuOpen.task }">
              <router-link to="/task" class="nav-item" :class="{ active: route.path === '/task' }">
                <i class="pi pi-list"></i>
                <span>任务列表</span>
              </router-link>
            </div>
          </div>
          <router-link to="/openapi" class="nav-item nav-item-single" :class="{ active: route.path === '/openapi' }">
            <i class="pi pi-link"></i>
            <span>开放平台</span>
          </router-link>
          <router-link to="/log" class="nav-item nav-item-single" :class="{ active: route.path === '/log' }">
            <i class="pi pi-file"></i>
            <span>日志管理</span>
          </router-link>
          <div class="nav-divider"></div>
          <a href="/guide.html" target="_blank" class="nav-item nav-item-single">
            <i class="pi pi-book"></i>
            <span>使用文档</span>
          </a>
          <a href="/dev-guide.html" target="_blank" class="nav-item nav-item-single">
            <i class="pi pi-code"></i>
            <span>开发指南</span>
          </a>
          <div class="nav-footer">
            <span class="nav-footer-copy">v1.0.0 · © 2026 tagtax.cc</span>
          </div>
        </nav>
      </aside>
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- AI 小助手 -->
    <div v-if="chatOpen" class="chat-window">
      <div class="chat-header">
        <div style="display:flex;align-items:center;gap:8px">
          <img src="/blue-whale.svg" style="width:20px;height:20px" />
          <span style="font-weight:600;font-size:14px;color:#1e293b">蓝莓数据助手</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <i class="pi pi-trash" style="font-size:16px;color:#94a3b8;cursor:pointer" title="清空历史" @click="clearChat"></i>
          <span class="chat-close" @click="chatOpen = false">&times;</span>
        </div>
      </div>
      <div class="chat-body" ref="chatBodyRef">
        <div v-for="(msg, i) in chatMessages" :key="i" class="chat-msg" :class="msg.role">
          <div v-if="msg.role === 'user'" class="chat-bubble">{{ msg.content }}</div>
          <div v-else class="chat-bubble chat-md" v-html="renderMd(msg.content)"></div>
          <span v-if="msg.streaming && msg.role === 'assistant'" class="chat-cursor">|</span>
        </div>
        <div v-if="chatMessages.length === 0" class="chat-hint">你好，我是蓝莓数据助手，可以帮你查询数据库表信息~</div>
      </div>
      <div class="chat-input-bar">
        <input v-model="chatInput" class="chat-input" placeholder="输入你的问题..."
               @keydown.enter="sendChat" :disabled="chatLoading" />
        <button class="chat-send" @click="sendChat" :disabled="chatLoading || !chatInput.trim()">
          <i class="pi pi-send" style="font-size:14px"></i>
        </button>
      </div>
    </div>
    <div v-else class="chat-fab" @click="chatOpen = true">
      <img src="/blue-whale.svg" style="width:28px;height:28px" />
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, nextTick, watch } from 'vue'
import { Marked } from 'marked'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { setGlobalToast } from './api'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Menu from 'primevue/menu'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const userRole = ref(localStorage.getItem('role') || '')
const isAdmin = computed(() => userRole.value === 'admin')

const userMenu = ref()
const userMenuItems = computed(() => {
  const items = [
    { label: isAdmin.value ? '管理员' : '访客模式', disabled: true },
    { label: '退出登录', icon: 'pi pi-sign-out', command: doLogout }
  ]
  return items
})

function toggleUserMenu(event) {
  userMenu.value.toggle(event)
}

function doLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  userRole.value = ''
  router.push('/login')
}

// 路由变化时同步角色（登录/切换后）
watch(() => route.path, () => {
  userRole.value = localStorage.getItem('role') || ''
})

const currentEnv = computed(() => {
  if (route.path.startsWith('/source/')) return '数据源管理'
  if (route.path.startsWith('/task')) return '任务管理'
  if (route.path.startsWith('/openapi')) return '开放平台'
  if (route.path.startsWith('/log')) return '日志管理'
  return ''
})

const menuOpen = reactive({
  source: true,
  task: true
})

// ---- 深色模式 ----
const isDark = ref(false)

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('p-dark', isDark.value)
  localStorage.setItem('darkMode', isDark.value ? '1' : '0')
}

onMounted(() => {
  setGlobalToast(toast)
  // 恢复深色模式偏好
  const saved = localStorage.getItem('darkMode')
  if (saved === '1' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('p-dark')
  }
})

// ---- AI 小助手 ----
const chatOpen = ref(false)
const chatInput = ref('')
const chatLoading = ref(false)
const chatMessages = ref([])
const chatHistory = ref([])
const chatBodyRef = ref(null)

function scrollChatToBottom() {
  nextTick(() => {
    if (chatBodyRef.value) chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  })
}

const marked = new Marked()
function renderMd(text) {
  if (!text) return ''
  return marked.parse(text)
}

function clearChat() {
  chatMessages.value = []
  chatHistory.value = []
}

async function sendChat() {
  const text = chatInput.value.trim()
  if (!text || chatLoading.value) return
  if (!isAdmin.value) {
    chatMessages.value.push({ role: 'user', content: text })
    chatMessages.value.push({ role: 'assistant', content: '访客无权使用助手功能，请登录管理员账号。', streaming: false })
    chatInput.value = ''
    scrollChatToBottom()
    return
  }
  chatMessages.value.push({ role: 'user', content: text })
  chatHistory.value.push({ role: 'user', content: text })
  chatInput.value = ''
  chatLoading.value = true
  chatMessages.value.push({ role: 'assistant', content: '', streaming: true })
  scrollChatToBottom()
  try {
    const response = await fetch('/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory.value })
    })
    if (!response.ok) throw new Error('请求失败')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const lastMsg = chatMessages.value[chatMessages.value.length - 1]
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      lastMsg.content += decoder.decode(value, { stream: true })
      scrollChatToBottom()
    }
    lastMsg.streaming = false
    chatHistory.value.push({ role: 'assistant', content: lastMsg.content })
    // 最多保留6轮对话（12条消息）
    if (chatHistory.value.length > 12) {
      chatHistory.value = chatHistory.value.slice(-12)
    }
  } catch {
    const lastMsg = chatMessages.value[chatMessages.value.length - 1]
    lastMsg.content = '抱歉，助手暂时无法连接，请稍后再试。'
    lastMsg.streaming = false
  } finally {
    chatLoading.value = false
    scrollChatToBottom()
  }
}

function particleStyle(i) {
  const top = 6 + Math.random() * 12
  const dx = 30 + Math.random() * 50
  const dy = -12 + Math.random() * 24
  const delay = i * 0.45
  const size = 3.5 + Math.random() * 3
  return {
    top: top + 'px',
    width: size + 'px',
    height: size + 'px',
    '--dx': dx + 'px',
    '--dy': dy + 'px',
    animationDelay: delay + 's',
    animationDuration: (2.5 + Math.random() * 1.5) + 's'
  }
}
</script>

<style scoped>
.nav-divider {
  flex: 1;
}

.nav-footer {
  padding: 10px 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.nav-footer-name {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
}
.nav-footer-copy {
  font-size: 10px;
  color: #c0c4cc;
}

.dark-toggle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #64748b;
  font-size: 14px;
}
.dark-toggle:hover {
  background: #f3f4f6;
  color: #334155;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.user-avatar:hover {
  background: #cbd5e1;
}
.user-avatar.avatar-admin {
  background: #3b82f6;
  color: #fff;
}
.user-avatar.avatar-admin:hover {
  background: #2563eb;
}

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* ---- Top bar ---- */
.topbar {
  height: 52px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  border-bottom: 1px solid #e5e7eb;
  z-index: 10;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1e293b;
}
.topbar-left i {
  font-size: 17px;
  color: #3b82f6;
}
.topbar-logo {
  height: 28px;
  width: auto;
}
.topbar-title {
  font-size: 16px;
  letter-spacing: 0.3px;
  font-family: -apple-system, 'SF Pro Display', 'Segoe UI', sans-serif;
}
.topbar-title .title-light {
  font-weight: 300;
  color: #64748b;
}
.topbar-title .title-bold {
  font-weight: 700;
  color: #2665c1;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.topbar-env {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
}

/* ---- Particle animation ---- */
.particles {
  position: relative;
  width: 80px;
  height: 24px;
  margin-left: -2px;
  overflow: visible;
}
.particle {
  position: absolute;
  left: 0;
  border-radius: 50%;
  background: #60a5fa;
  opacity: 0;
  animation: particleEmit 3s ease-out infinite;
}
@keyframes particleEmit {
  0% { transform: translate(0, 0) scale(1); opacity: 0; }
  10% { opacity: 0.8; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.5); opacity: 0; }
}

/* ---- Body ---- */
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ---- Sidebar ---- */
.sidebar {
  width: 208px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid #e5e7eb;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 8px;
  flex: 1;
}

.nav-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
  user-select: none;
}
.nav-group-title:hover {
  background: #f3f4f6;
  color: #374151;
}
.nav-group-title i:first-child {
  font-size: 14px;
  color: #9ca3af;
}

.nav-group-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 14px;
  overflow: hidden;
  max-height: 120px;
  opacity: 1;
  transition: max-height 0.25s ease, opacity 0.2s ease, padding 0.25s ease;
}
.nav-group-items.collapsed {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  color: #6b7280;
  font-size: 13px;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s;
  cursor: pointer;
  position: relative;
}
.nav-item i {
  font-size: 13px;
}
.nav-item:hover {
  background: #f3f4f6;
  color: #374151;
}
.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  background: #3b82f6;
  border-radius: 0 3px 3px 0;
}
.nav-item.active i {
  color: #2563eb;
}
.nav-item-single {
  margin: 0 2px;
}

/* ---- Main content ---- */
.main-content {
  flex: 1;
  background: #f9fafb;
  padding: 24px 28px;
  overflow-y: auto;
}

/* ---- Route transition ---- */
.fade-enter-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.fade-leave-to {
  opacity: 0;
}

/* ---- Chat FAB & Window ---- */
.chat-fab {
  position: fixed;
  right: 28px;
  bottom: 28px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa, #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(96,165,250,0.35);
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 1000;
  animation: fabFloat 3s ease-in-out infinite, fabBreath 2.5s ease-in-out infinite;
}
.chat-fab:hover {
  animation: none;
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(96,165,250,0.5);
}
@keyframes fabFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes fabBreath {
  0%, 100% { box-shadow: 0 4px 16px rgba(96,165,250,0.3); }
  50% { box-shadow: 0 6px 28px rgba(96,165,250,0.55); }
}
.chat-window {
  position: fixed;
  right: 28px;
  bottom: 28px;
  width: 380px;
  height: 520px;
  background: #fff;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18);
  z-index: 1000;
  overflow: hidden;
}
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.chat-close {
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}
.chat-close:hover { color: #64748b; }
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chat-hint {
  text-align: center;
  color: #94a3b8;
  font-size: 15px;
  margin-top: 40px;
}
.chat-msg { display: flex; }
.chat-msg.user { justify-content: flex-end; }
.chat-msg.assistant { justify-content: flex-start; }
.chat-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.chat-msg.user .chat-bubble {
  background: #3b82f6;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.chat-msg.assistant .chat-bubble {
  background: #f1f5f9;
  color: #334155;
  border-bottom-left-radius: 4px;
}
.chat-md :deep(h1), .chat-md :deep(h2), .chat-md :deep(h3) { margin: 6px 0 4px; font-size: 14px; font-weight: 600; }
.chat-md :deep(p) { margin: 4px 0; }
.chat-md :deep(ul), .chat-md :deep(ol) { padding-left: 18px; margin: 4px 0; }
.chat-md :deep(li) { margin: 2px 0; }
.chat-md :deep(code) { background: #e2e8f0; padding: 1px 5px; border-radius: 3px; font-size: 12px; font-family: 'SF Mono', 'Fira Code', monospace; }
.chat-md :deep(pre) { background: #1e293b; color: #94a3b8; padding: 10px 12px; border-radius: 6px; overflow-x: auto; margin: 6px 0; }
.chat-md :deep(pre code) { background: none; padding: 0; color: inherit; }
.chat-md :deep(table) { border-collapse: collapse; margin: 6px 0; font-size: 12px; width: 100%; }
.chat-md :deep(th), .chat-md :deep(td) { border: 1px solid #cbd5e1; padding: 4px 8px; text-align: left; }
.chat-md :deep(th) { background: #e2e8f0; font-weight: 600; }
.chat-md :deep(blockquote) { border-left: 3px solid #3b82f6; padding-left: 10px; margin: 6px 0; color: #64748b; }
.chat-md :deep(strong) { font-weight: 600; }
.chat-cursor {
  animation: blink 0.8s step-end infinite;
  color: #3b82f6;
}
@keyframes blink { 50% { opacity: 0; } }
.chat-input-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
  flex-shrink: 0;
}
.chat-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.chat-input:focus { border-color: #3b82f6; }
.chat-input:disabled { background: #f1f5f9; }
.chat-send {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}
.chat-send:hover:not(:disabled) { background: #2563eb; }
.chat-send:disabled { background: #93c5fd; cursor: not-allowed; }
</style>

<style>
/* ===== 全局深色模式覆盖 ===== */
html.p-dark .dark-toggle {
  border-color: #475569;
  color: #e2e8f0;
}
html.p-dark .dark-toggle:hover {
  background: #334155;
  color: #f1f5f9;
}

/* Top bar */
html.p-dark .topbar {
  background: #1e293b;
  border-bottom-color: #334155;
}
html.p-dark .topbar-left,
html.p-dark .topbar-right {
  color: #f1f5f9;
}
html.p-dark .topbar-title .title-light { color: #cbd5e1; }
html.p-dark .topbar-title .title-bold { color: #60a5fa; }
html.p-dark .topbar-env { color: #cbd5e1; }

/* Sidebar */
html.p-dark .sidebar {
  background: #1e293b;
  border-right-color: #334155;
}
html.p-dark .nav-group-title {
  color: #e2e8f0;
}
html.p-dark .nav-group-title:hover {
  background: #334155;
  color: #f1f5f9;
}
html.p-dark .nav-group-title i:first-child {
  color: #94a3b8;
}
html.p-dark .nav-item {
  color: #cbd5e1;
}
html.p-dark .nav-item:hover {
  background: #334155;
  color: #f1f5f9;
}
html.p-dark .nav-item.active {
  background: rgba(59, 130, 246, 0.2);
  color: #93bbfd;
}
html.p-dark .nav-item.active::before {
  background: #60a5fa;
}
html.p-dark .nav-item.active i {
  color: #93bbfd;
}

html.p-dark .nav-footer-name { color: #64748b; }
html.p-dark .nav-footer-copy { color: #475569; }

/* Main content */
html.p-dark .main-content {
  background: #111827;
}

/* Chat window */
html.p-dark .chat-window {
  background: #1e293b;
  box-shadow: 0 8px 40px rgba(0,0,0,0.4);
}
html.p-dark .chat-header {
  background: #1e293b;
  border-bottom-color: #334155;
}
html.p-dark .chat-header span { color: #f1f5f9 !important; }
html.p-dark .chat-hint { color: #94a3b8; }
html.p-dark .chat-msg.assistant .chat-bubble {
  background: #334155;
  color: #f1f5f9;
}
html.p-dark .chat-input-bar {
  background: #1e293b;
  border-top-color: #334155;
}
html.p-dark .chat-input {
  border-color: #475569;
  background: #0f172a;
  color: #f1f5f9;
}
html.p-dark .chat-input:focus { border-color: #60a5fa; }
html.p-dark .chat-input:disabled { background: #1e293b; }
html.p-dark .chat-md code { background: #334155; color: #e2e8f0; }
html.p-dark .chat-md pre { background: #0f172a; color: #94a3b8; }
html.p-dark .chat-md pre code { background: none; color: inherit; }
html.p-dark .chat-md table { border-collapse: collapse; margin: 6px 0; font-size: 12px; width: 100%; }
html.p-dark .chat-md th { background: #334155; color: #f1f5f9; border: 1px solid #475569; padding: 4px 8px; text-align: left; font-weight: 600; }
html.p-dark .chat-md td { border: 1px solid #475569; padding: 4px 8px; text-align: left; color: #e2e8f0; }
html.p-dark .chat-md blockquote { border-left: 3px solid #60a5fa; padding-left: 10px; margin: 6px 0; color: #cbd5e1; }
html.p-dark .chat-md h1,
html.p-dark .chat-md h2,
html.p-dark .chat-md h3 { color: #f1f5f9; }
html.p-dark .chat-md p { color: #e2e8f0; }
html.p-dark .chat-md li { color: #e2e8f0; }
html.p-dark .chat-md strong { color: #f1f5f9; }
html.p-dark .chat-md a { color: #60a5fa; }

/* Page header (shared by all pages) */
html.p-dark .page-header h2 { color: #f1f5f9; }

/* PrimeVue DataTable dark mode override */
html.p-dark .p-datatable-header-cell {
  background: #334155 !important;
  color: #f1f5f9 !important;
  border-color: #475569 !important;
}
html.p-dark .p-datatable-tbody > tr {
  background: #1e293b !important;
  color: #e2e8f0 !important;
}
html.p-dark .p-datatable-tbody > tr > td {
  border-color: #334155 !important;
}
html.p-dark .p-datatable.p-datatable-striped .p-datatable-tbody > tr.p-row-odd {
  background: #172033 !important;
}
html.p-dark .p-datatable-hoverable .p-datatable-tbody > tr:not(.p-datatable-row-selected):hover {
  background: #283a50 !important;
}
html.p-dark .p-datatable-header {
  background: #334155 !important;
  color: #f1f5f9 !important;
  border-color: #475569 !important;
}
html.p-dark .p-datatable {
  border-color: #475569 !important;
}
html.p-dark .p-datatable-paginator-bottom {
  border-color: #475569 !important;
}

/* Form labels */
html.p-dark .form-row label { color: #e2e8f0; }

/* OpenApi / TaskLog result blocks */
html.p-dark .result-item,
html.p-dark .detail-item {
  border-color: #334155;
}
html.p-dark .result-label,
html.p-dark .detail-label {
  background: #1e293b;
  color: #f1f5f9;
  border-bottom-color: #334155;
}
html.p-dark .result-info,
html.p-dark .detail-info {
  color: #cbd5e1;
}
html.p-dark .result-toggle,
html.p-dark .detail-toggle {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  color: #93bbfd;
}
html.p-dark .result-toggle:hover,
html.p-dark .detail-toggle:hover {
  background: rgba(59, 130, 246, 0.3);
}

/* TaskLog clean form */
html.p-dark .clean-desc {
  background: #1e293b;
  border-color: #334155;
  color: #cbd5e1;
}
html.p-dark .clean-desc strong { color: #f1f5f9; }

/* VersionHistory */
html.p-dark .env-card-label,
html.p-dark .env-card-version { color: #cbd5e1; }
html.p-dark .promote-label { color: #e2e8f0; }
html.p-dark .timeline::before { background: #475569; }
html.p-dark .timeline-dot { background: #94a3b8; border-color: #1e293b; }
html.p-dark .timeline-time { color: #94a3b8; }
html.p-dark .env-label { color: #94a3b8; }
html.p-dark .dsl-preview { color: #cbd5e1; }

/* Inline styles with colors - page-header env tags etc */
html.p-dark .page-header > div { color: #f1f5f9; }

/* Inline color overrides */
html.p-dark [style*="color:#999"],
html.p-dark [style*="color:#909399"],
html.p-dark [style*="color:#606266"],
html.p-dark [style*="color:#666"] { color: #cbd5e1 !important; }
html.p-dark [style*="color:#374151"] { color: #f1f5f9 !important; }
html.p-dark [style*="color:#1e293b"] { color: #f1f5f9 !important; }

/* TaskEditor left palette hint */
html.p-dark .node-palette p { color: #cbd5e1 !important; }
</style>
