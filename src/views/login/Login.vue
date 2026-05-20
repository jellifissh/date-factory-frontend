<template>
  <div id="login-page">
    <!-- Background decorative layers -->
    <div class="bg-decor">
      <!-- Large ambient glows -->
      <div class="bg-glow bg-glow-left"></div>
      <div class="bg-glow bg-glow-right"></div>
      <div class="bg-glow bg-glow-top"></div>

      <!-- Flowing horizontal wave curves -->
      <svg class="bg-waves" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(148,185,255,0)" />
            <stop offset="15%" stop-color="rgba(148,185,255,0.13)" />
            <stop offset="50%" stop-color="rgba(160,195,255,0.16)" />
            <stop offset="85%" stop-color="rgba(148,185,255,0.13)" />
            <stop offset="100%" stop-color="rgba(148,185,255,0)" />
          </linearGradient>
          <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(130,170,245,0)" />
            <stop offset="10%" stop-color="rgba(130,170,245,0.10)" />
            <stop offset="50%" stop-color="rgba(148,190,255,0.14)" />
            <stop offset="90%" stop-color="rgba(130,170,245,0.10)" />
            <stop offset="100%" stop-color="rgba(130,170,245,0)" />
          </linearGradient>
          <linearGradient id="wg3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(180,210,255,0)" />
            <stop offset="20%" stop-color="rgba(180,210,255,0.08)" />
            <stop offset="80%" stop-color="rgba(180,210,255,0.08)" />
            <stop offset="100%" stop-color="rgba(180,210,255,0)" />
          </linearGradient>
        </defs>
        <!-- Wave 1: gentle rise from left, peak around 40%, settle right -->
        <path d="M-50,320 C200,280 400,420 650,310 S1000,200 1490,350" fill="none" stroke="url(#wg1)" stroke-width="2.5" stroke-linecap="round" />
        <!-- Wave 2: lower, wider arc -->
        <path d="M-50,500 C180,440 500,580 800,470 S1150,380 1490,500" fill="none" stroke="url(#wg2)" stroke-width="2" stroke-linecap="round" />
        <!-- Wave 3: top area, very subtle -->
        <path d="M-50,180 C300,140 600,220 900,160 S1250,120 1490,190" fill="none" stroke="url(#wg3)" stroke-width="1.5" stroke-linecap="round" />
      </svg>

      <!-- Large soft arcs (partial circles at edges) -->
      <div class="bg-arc bg-arc-left"></div>
      <div class="bg-arc bg-arc-right"></div>

      <!-- Concentric ripples -->
      <div class="bg-ripple bg-ripple-bl"></div>
      <div class="bg-ripple bg-ripple-tr"></div>
    </div>

    <!-- Main content area -->
    <div class="login-layout">
      <!-- Left: Character scene -->
      <div class="scene-area">
        <div class="logo">
          <img src="/blue-whale.svg" style="width:44px;height:44px;background:#4e7ae3;backdrop-filter:blur(8px);padding:8px;border-radius:10px" />
          <span>蓝莓数据工厂</span>
        </div>
        <div class="characters-wrapper">
          <div class="characters-scene" ref="sceneRef">
            <!-- Purple character -->
            <div class="character char-purple" ref="charPurple">
              <div class="eyes" ref="purpleEyes" style="left:45px;top:40px;gap:28px">
                <div class="eyeball" ref="purpleEyeL" style="width:18px;height:18px">
                  <div class="pupil" ref="purplePupilL" style="width:7px;height:7px"></div>
                </div>
                <div class="eyeball" ref="purpleEyeR" style="width:18px;height:18px">
                  <div class="pupil" ref="purplePupilR" style="width:7px;height:7px"></div>
                </div>
              </div>
            </div>
            <!-- Black character -->
            <div class="character char-black" ref="charBlack">
              <div class="eyes" ref="blackEyes" style="left:26px;top:32px;gap:20px">
                <div class="eyeball" ref="blackEyeL" style="width:16px;height:16px">
                  <div class="pupil" ref="blackPupilL" style="width:6px;height:6px"></div>
                </div>
                <div class="eyeball" ref="blackEyeR" style="width:16px;height:16px">
                  <div class="pupil" ref="blackPupilR" style="width:6px;height:6px"></div>
                </div>
              </div>
            </div>
            <!-- Orange character -->
            <div class="character char-orange" ref="charOrange">
              <div class="eyes" ref="orangeEyes" style="left:82px;top:90px;gap:28px">
                <div class="bare-pupil" ref="orangePupilL"></div>
                <div class="bare-pupil" ref="orangePupilR"></div>
              </div>
              <div class="orange-mouth" ref="orangeMouth" style="left:90px;top:120px"></div>
            </div>
            <!-- Yellow character -->
            <div class="character char-yellow" ref="charYellow">
              <div class="eyes" ref="yellowEyes" style="left:52px;top:40px;gap:20px">
                <div class="bare-pupil" ref="yellowPupilL"></div>
                <div class="bare-pupil" ref="yellowPupilR"></div>
              </div>
              <div class="yellow-mouth" ref="yellowMouth" style="left:40px;top:88px"></div>
            </div>
          </div>
        </div>
        <div class="footer-links">
          <a href="/guide.html" target="_blank">使用文档</a>
          <a href="/dev-guide.html" target="_blank">开发指南</a>
        </div>
      </div>

      <!-- Right: Login card -->
      <div class="card-area">
        <div class="form-card">

          <form @submit.prevent="doLogin">
            <div class="form-group">
              <label ref="accountLabel">账号</label>
              <div class="input-wrapper">
                <input type="text" v-model="form.username" placeholder="请输入管理员账号" autocomplete="off"
                       @focus="onInputFocus" @blur="onInputBlur" @input="updateChars" />
              </div>
            </div>

            <div class="form-group">
              <label ref="passwordLabel">密码</label>
              <div class="input-wrapper">
                <input :type="showPassword ? 'text' : 'password'" v-model="form.password" placeholder="请输入密码"
                       @focus="onPwdFocus" @blur="onPwdBlur" @input="updateChars"
                       @keydown.enter="doLogin" />
                <button type="button" class="toggle-password" @click="togglePassword">
                  <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div class="error-msg" v-if="errorMsg">{{ errorMsg }}</div>

            <button type="submit" class="btn-login" :disabled="loading">
              <span class="btn-text">{{ loading ? '登录中...' : '登录' }}</span>
              <div class="btn-hover-content">
                <span>登录</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </button>

            <button type="button" class="btn-guest" @click="doGuest">
              <span class="btn-text">访客进入</span>
              <div class="btn-hover-content">
                <span>访客进入</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
    <div class="login-footer">v1.0.0 · © 2026 tagtax.cc</div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../../api'

const router = useRouter()
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

// --- Character animation state ---
let mouseX = 0, mouseY = 0
let isTyping = false, isLookingAtEachOther = false
let isPasswordFocused = false
let isLoginError = false
let isPurpleBlinking = false, isBlackBlinking = false
let isPurplePeeking = false
let typingTimer = null, purpleBlinkTimer = null, blackBlinkTimer = null, peekTimer = null, errorTimer = null

// Refs for character elements
const sceneRef = ref(null)
const charPurple = ref(null), charBlack = ref(null), charOrange = ref(null), charYellow = ref(null)
const purpleEyes = ref(null), purpleEyeL = ref(null), purpleEyeR = ref(null), purplePupilL = ref(null), purplePupilR = ref(null)
const blackEyes = ref(null), blackEyeL = ref(null), blackEyeR = ref(null), blackPupilL = ref(null), blackPupilR = ref(null)
const orangeEyes = ref(null), orangePupilL = ref(null), orangePupilR = ref(null), orangeMouth = ref(null)
const yellowEyes = ref(null), yellowPupilL = ref(null), yellowPupilR = ref(null), yellowMouth = ref(null)

function onMouseMove(e) {
  mouseX = e.clientX
  mouseY = e.clientY
  if (!isTyping && !isLoginError) updateChars()
}

function calcPosition(el) {
  if (!el) return { faceX: 0, faceY: 0, bodySkew: 0 }
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 3
  const dx = mouseX - cx
  const dy = mouseY - cy
  return {
    faceX: Math.max(-15, Math.min(15, dx / 20)),
    faceY: Math.max(-10, Math.min(10, dy / 30)),
    bodySkew: Math.max(-6, Math.min(6, -dx / 120))
  }
}

function calcPupilOffset(el, maxDist) {
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = mouseX - cx
  const dy = mouseY - cy
  const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist)
  const angle = Math.atan2(dy, dx)
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
}

function updateChars() {
  const purple = charPurple.value, black = charBlack.value, orange = charOrange.value, yellow = charYellow.value
  if (!purple || !black || !orange || !yellow) return

  const pp = calcPosition(purple), bp = calcPosition(black), op = calcPosition(orange), yp = calcPosition(yellow)
  const pwdLen = form.password.length
  const isShowingPwd = pwdLen > 0 && showPassword.value
  const isLookingAway = isPasswordFocused && !showPassword.value

  // Purple body
  if (isShowingPwd) { purple.style.transform = 'skewX(0deg)'; purple.style.height = '370px' }
  else if (isLookingAway) { purple.style.transform = 'skewX(-14deg) translateX(-20px)'; purple.style.height = '410px' }
  else if (isTyping) { purple.style.transform = `skewX(${(pp.bodySkew||0)-12}deg) translateX(40px)`; purple.style.height = '410px' }
  else { purple.style.transform = `skewX(${pp.bodySkew}deg)`; purple.style.height = '370px' }

  // Purple eyes
  if (purpleEyeL.value) purpleEyeL.value.style.height = isPurpleBlinking ? '2px' : '18px'
  if (purpleEyeR.value) purpleEyeR.value.style.height = isPurpleBlinking ? '2px' : '18px'
  const pe = purpleEyes.value, ppl = purplePupilL.value, ppr = purplePupilR.value
  if (pe && ppl && ppr) {
    if (isLoginError) { pe.style.cssText = 'left:30px;top:55px;gap:28px;position:absolute;display:flex'; ppl.style.transform = 'translate(-3px,4px)'; ppr.style.transform = 'translate(-3px,4px)' }
    else if (isLookingAway) { pe.style.cssText = 'left:20px;top:25px;gap:28px;position:absolute;display:flex'; ppl.style.transform = 'translate(-5px,-5px)'; ppr.style.transform = 'translate(-5px,-5px)' }
    else if (isShowingPwd) { pe.style.cssText = `left:20px;top:35px;gap:28px;position:absolute;display:flex`; const px=isPurplePeeking?4:-4,py=isPurplePeeking?5:-4; ppl.style.transform=`translate(${px}px,${py}px)`; ppr.style.transform=`translate(${px}px,${py}px)` }
    else if (isLookingAtEachOther) { pe.style.cssText = 'left:55px;top:65px;gap:28px;position:absolute;display:flex'; ppl.style.transform = 'translate(3px,4px)'; ppr.style.transform = 'translate(3px,4px)' }
    else { pe.style.cssText = `left:${45+pp.faceX}px;top:${40+pp.faceY}px;gap:28px;position:absolute;display:flex`; const po=calcPupilOffset(purpleEyeL.value,5); ppl.style.transform=`translate(${po.x}px,${po.y}px)`; ppr.style.transform=`translate(${po.x}px,${po.y}px)` }
  }

  // Black body
  if (isShowingPwd) black.style.transform = 'skewX(0deg)'
  else if (isLookingAway) black.style.transform = 'skewX(12deg) translateX(-10px)'
  else if (isLookingAtEachOther) black.style.transform = `skewX(${(bp.bodySkew||0)*1.5+10}deg) translateX(20px)`
  else if (isTyping) black.style.transform = `skewX(${(bp.bodySkew||0)*1.5}deg)`
  else black.style.transform = `skewX(${bp.bodySkew}deg)`

  // Black eyes
  if (blackEyeL.value) blackEyeL.value.style.height = isBlackBlinking ? '2px' : '16px'
  if (blackEyeR.value) blackEyeR.value.style.height = isBlackBlinking ? '2px' : '16px'
  const be = blackEyes.value, bpl = blackPupilL.value, bpr = blackPupilR.value
  if (be && bpl && bpr) {
    if (isLoginError) { be.style.cssText = 'left:15px;top:40px;gap:20px;position:absolute;display:flex'; bpl.style.transform='translate(-3px,4px)'; bpr.style.transform='translate(-3px,4px)' }
    else if (isLookingAway) { be.style.cssText = 'left:10px;top:20px;gap:20px;position:absolute;display:flex'; bpl.style.transform='translate(-4px,-5px)'; bpr.style.transform='translate(-4px,-5px)' }
    else if (isShowingPwd) { be.style.cssText = 'left:10px;top:28px;gap:20px;position:absolute;display:flex'; bpl.style.transform='translate(-4px,-4px)'; bpr.style.transform='translate(-4px,-4px)' }
    else if (isLookingAtEachOther) { be.style.cssText = 'left:32px;top:12px;gap:20px;position:absolute;display:flex'; bpl.style.transform='translate(0px,-4px)'; bpr.style.transform='translate(0px,-4px)' }
    else { be.style.cssText = `left:${26+bp.faceX}px;top:${32+bp.faceY}px;gap:20px;position:absolute;display:flex`; const bo=calcPupilOffset(blackEyeL.value,4); bpl.style.transform=`translate(${bo.x}px,${bo.y}px)`; bpr.style.transform=`translate(${bo.x}px,${bo.y}px)` }
  }

  // Orange body
  const om = orangeMouth.value
  if (isLoginError && om) { om.style.left = `${80+op.faceX}px`; om.style.top = '130px' }
  if (isShowingPwd) orange.style.transform = 'skewX(0deg)'
  else orange.style.transform = `skewX(${op.bodySkew}deg)`

  // Orange eyes
  const oe = orangeEyes.value, opl = orangePupilL.value, opr = orangePupilR.value
  if (oe && opl && opr) {
    if (isLoginError) { oe.style.cssText='left:60px;top:95px;gap:28px;position:absolute;display:flex'; opl.style.transform='translate(-3px,4px)'; opr.style.transform='translate(-3px,4px)' }
    else if (isLookingAway) { oe.style.cssText='left:50px;top:75px;gap:28px;position:absolute;display:flex'; opl.style.transform='translate(-5px,-5px)'; opr.style.transform='translate(-5px,-5px)' }
    else if (isShowingPwd) { oe.style.cssText='left:50px;top:85px;gap:28px;position:absolute;display:flex'; opl.style.transform='translate(-5px,-4px)'; opr.style.transform='translate(-5px,-4px)' }
    else { oe.style.cssText=`left:${82+op.faceX}px;top:${90+op.faceY}px;gap:28px;position:absolute;display:flex`; const oo=calcPupilOffset(orangePupilL.value,5); opl.style.transform=`translate(${oo.x}px,${oo.y}px)`; opr.style.transform=`translate(${oo.x}px,${oo.y}px)` }
  }

  // Yellow body
  if (isShowingPwd) yellow.style.transform = 'skewX(0deg)'
  else yellow.style.transform = `skewX(${yp.bodySkew}deg)`

  // Yellow eyes & mouth
  const ye = yellowEyes.value, ypl = yellowPupilL.value, ypr = yellowPupilR.value, ym = yellowMouth.value
  if (ye && ypl && ypr && ym) {
    if (isLoginError) { ye.style.cssText='left:35px;top:45px;gap:20px;position:absolute;display:flex'; ypl.style.transform='translate(-3px,4px)'; ypr.style.transform='translate(-3px,4px)'; ym.style.left='30px'; ym.style.top='92px'; ym.style.transform='rotate(-8deg)' }
    else if (isLookingAway) { ye.style.cssText='left:20px;top:30px;gap:20px;position:absolute;display:flex'; ypl.style.transform='translate(-5px,-5px)'; ypr.style.transform='translate(-5px,-5px)'; ym.style.left='15px'; ym.style.top='78px'; ym.style.transform='rotate(0deg)' }
    else if (isShowingPwd) { ye.style.cssText='left:20px;top:35px;gap:20px;position:absolute;display:flex'; ypl.style.transform='translate(-5px,-4px)'; ypr.style.transform='translate(-5px,-4px)'; ym.style.left='10px'; ym.style.top='88px'; ym.style.transform='rotate(0deg)' }
    else { ye.style.cssText=`left:${52+yp.faceX}px;top:${40+yp.faceY}px;gap:20px;position:absolute;display:flex`; const yo=calcPupilOffset(yellowPupilL.value,5); ypl.style.transform=`translate(${yo.x}px,${yo.y}px)`; ypr.style.transform=`translate(${yo.x}px,${yo.y}px)`; ym.style.left=`${40+yp.faceX}px`; ym.style.top=`${88+yp.faceY}px`; ym.style.transform='rotate(0deg)' }
  }
}

// Blinking
function scheduleBlinkPurple() {
  purpleBlinkTimer = setTimeout(() => {
    isPurpleBlinking = true; updateChars()
    setTimeout(() => { isPurpleBlinking = false; updateChars(); scheduleBlinkPurple() }, 150)
  }, Math.random() * 4000 + 3000)
}
function scheduleBlinkBlack() {
  blackBlinkTimer = setTimeout(() => {
    isBlackBlinking = true; updateChars()
    setTimeout(() => { isBlackBlinking = false; updateChars(); scheduleBlinkBlack() }, 150)
  }, Math.random() * 4000 + 3000)
}

// Purple peeking when password visible
function schedulePeek() {
  if (form.password.length > 0 && showPassword.value) {
    peekTimer = setTimeout(() => {
      if (form.password.length > 0 && showPassword.value) {
        isPurplePeeking = true; updateChars()
        setTimeout(() => { isPurplePeeking = false; updateChars(); schedulePeek() }, 800)
      }
    }, Math.random() * 3000 + 2000)
  }
}

function togglePassword() {
  showPassword.value = !showPassword.value
  if (showPassword.value) schedulePeek()
  updateChars()
}

function onInputFocus() {
  isTyping = true; isLookingAtEachOther = true
  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => { isLookingAtEachOther = false; updateChars() }, 800)
  updateChars()
}
function onInputBlur() { isTyping = false; isLookingAtEachOther = false; updateChars() }
function onPwdFocus() { isPasswordFocused = true; updateChars() }
function onPwdBlur() { isPasswordFocused = false; updateChars() }

// Login error animation
function triggerLoginError() {
  if (errorTimer) clearTimeout(errorTimer)
  isLoginError = true; isPasswordFocused = false
  updateChars()
  if (orangeMouth.value) orangeMouth.value.classList.add('visible')
  const shakeEls = [purpleEyes.value, blackEyes.value, orangeEyes.value, yellowEyes.value, yellowMouth.value, orangeMouth.value]
  shakeEls.forEach(el => { if (el) el.classList.remove('shake-head') })
  void document.body.offsetHeight
  setTimeout(() => shakeEls.forEach(el => { if (el) el.classList.add('shake-head') }), 350)
  errorTimer = setTimeout(() => {
    isLoginError = false
    if (orangeMouth.value) orangeMouth.value.classList.remove('visible')
    shakeEls.forEach(el => { if (el) el.classList.remove('shake-head') })
    updateChars()
  }, 2500)
}

// --- Login logic ---
async function doLogin() {
  if (!form.username || !form.password) {
    errorMsg.value = '请输入账号和密码'
    triggerLoginError()
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await authApi.login(form)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('role', 'admin')
    router.replace('/')
  } catch (e) {
    errorMsg.value = '账号或密码错误'
    triggerLoginError()
  } finally {
    loading.value = false
  }
}

function doGuest() {
  localStorage.removeItem('token')
  localStorage.setItem('role', 'guest')
  router.replace('/')
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  scheduleBlinkPurple()
  scheduleBlinkBlack()
  updateChars()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  clearTimeout(purpleBlinkTimer)
  clearTimeout(blackBlinkTimer)
  clearTimeout(peekTimer)
  clearTimeout(errorTimer)
  clearTimeout(typingTimer)
})
</script>

<style scoped>
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

#login-page {
  position: relative;
  height: 100vh;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
  background: linear-gradient(135deg, #88aad8 0%, #a0bce5 45%, #c0d5ef 100%);
}

/* ── Background decorations ── */
.bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

/* Ambient light glows */
.bg-glow { position: absolute; border-radius: 50%; }
.bg-glow-left {
  width: 900px; height: 900px;
  top: 30%; left: -150px;
  background: radial-gradient(circle, rgba(150,190,255,0.30) 0%, rgba(150,190,255,0.10) 40%, transparent 70%);
  filter: blur(80px);
}
.bg-glow-right {
  width: 700px; height: 700px;
  bottom: 5%; right: -100px;
  background: radial-gradient(circle, rgba(170,200,255,0.22) 0%, rgba(255,255,255,0.08) 45%, transparent 70%);
  filter: blur(70px);
}
.bg-glow-top {
  width: 500px; height: 500px;
  top: -100px; right: 20%;
  background: radial-gradient(circle, rgba(160,195,255,0.18) 0%, transparent 60%);
  filter: blur(60px);
}

/* Flowing horizontal wave curves */
.bg-waves {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: blur(0.8px);
}

/* Large soft arcs at edges */
.bg-arc { position: absolute; border-radius: 50%; }
.bg-arc-left {
  width: 1200px; height: 1200px;
  top: -400px; left: -300px;
  border: 2px solid rgba(150,190,255,0.12);
}
.bg-arc-right {
  width: 1000px; height: 1000px;
  bottom: -350px; right: -200px;
  border: 1.5px solid rgba(170,200,255,0.10);
}

/* Concentric ripples */
.bg-ripple {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid rgba(150,190,255,0.08);
}
.bg-ripple::before, .bg-ripple::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(150,190,255,0.06);
}
.bg-ripple::before { inset: 20px; }
.bg-ripple::after { inset: 44px; }
.bg-ripple-bl {
  width: 350px; height: 350px;
  bottom: -60px; left: 30%;
}
.bg-ripple-tr {
  width: 280px; height: 280px;
  top: -40px; right: 15%;
}

/* ── Main layout ── */
.login-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100vh;
  align-items: center;
}

/* ── Left: Character scene ── */
.scene-area {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 40px 20px 40px 48px;
}

.logo {
  position: absolute;
  top: 40px;
  left: 48px;
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 24px;
  font-weight: 700;
  color: #3a4f6e;
  z-index: 10;
}

.characters-wrapper {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 420px;
}

.characters-scene {
  position: relative;
  width: 480px;
  height: 360px;
}

.footer-links {
  position: absolute;
  bottom: 16px;
  left: 20px;
  display: flex;
  gap: 28px;
  font-size: 13px;
  color: rgba(95,110,138,0.5);
  z-index: 10;
}
.footer-links a {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s;
}
.footer-links a:hover { color: #5F6E8A; }

/* ── Characters ── */
.character {
  position: absolute;
  bottom: 0;
  transition: all 0.7s ease-in-out;
  transform-origin: bottom center;
  opacity: 0.92;
}
.char-purple { left: 60px; width: 170px; height: 370px; background: #7c5fe8; border-radius: 10px 10px 0 0; z-index: 1; }
.char-black { left: 220px; width: 115px; height: 290px; background: #3a3a4a; border-radius: 8px 8px 0 0; z-index: 2; }
.char-orange { left: 0; width: 230px; height: 190px; background: #f0a87a; border-radius: 115px 115px 0 0; z-index: 3; }
.char-yellow { left: 290px; width: 135px; height: 215px; background: #e8d754; border-radius: 68px 68px 0 0; z-index: 4; }

.eyes {
  position: absolute;
  display: flex;
  transition: all 0.7s ease-in-out;
}
.eyeball {
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: height 0.15s ease;
  overflow: hidden;
}
.pupil { border-radius: 50%; background: #2d2d2d; transition: transform 0.1s ease-out; }
.bare-pupil { width: 12px; height: 12px; border-radius: 50%; background: #2d2d2d; transition: transform 0.7s ease-in-out; }
.yellow-mouth {
  position: absolute;
  width: 50px; height: 4px;
  background: #2d2d2d;
  border-radius: 2px;
  transition: all 0.7s ease-in-out;
}
.orange-mouth {
  position: absolute;
  width: 28px; height: 14px;
  border: 3px solid #2d2d2d;
  border-top: none;
  border-radius: 0 0 14px 14px;
  opacity: 0;
  transition: all 0.7s ease-in-out;
}
.orange-mouth.visible { opacity: 1; }

@keyframes shakeHead {
  0%, 100% { translate: 0 0; }
  10% { translate: -9px 0; }
  20% { translate: 7px 0; }
  30% { translate: -6px 0; }
  40% { translate: 5px 0; }
  50% { translate: -4px 0; }
  60% { translate: 3px 0; }
  70% { translate: -2px 0; }
  80% { translate: 1px 0; }
  90% { translate: -0.5px 0; }
}
.eyes.shake-head, .yellow-mouth.shake-head, .orange-mouth.shake-head {
  animation: shakeHead 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

/* ── Right: Login card ── */
.card-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.form-card {
  width: 100%;
  max-width: 420px;
  padding: 44px 40px 40px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(230, 236, 245, 0.6);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(76, 108, 168, 0.06);
}

.sparkle-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}
.form-header {
  text-align: center;
  margin-bottom: 32px;
}
.form-header h1 {
  font-size: 26px;
  font-weight: 700;
  color: #233252;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
}
.form-header p {
  font-size: 14px;
  color: #8a9bb5;
}

/* ── Form ── */
.form-group { margin-bottom: 20px; }
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #5F6E8A;
  margin-bottom: 8px;
}
.input-wrapper { position: relative; }
.form-group input {
  width: 100%;
  height: 46px;
  border: 1.5px solid #E6ECF5;
  border-radius: 10px;
  padding: 0 40px 0 16px;
  font-size: 15px;
  font-family: inherit;
  color: #233252;
  background: rgba(255, 255, 255, 0.6);
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.form-group input:focus {
  border-color: #5D7FCA;
  box-shadow: 0 0 0 3px rgba(93, 127, 202, 0.12);
}
.form-group input::placeholder { color: #AAB4C5; }
.form-group input[type="password"]:not(:placeholder-shown) { letter-spacing: 2px; }

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #AAB4C5;
  padding: 4px;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}
.toggle-password:hover { color: #5F6E8A; }

.error-msg {
  padding: 10px 14px;
  font-size: 13px;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.05);
  border: 1px solid rgba(192, 57, 43, 0.12);
  border-radius: 10px;
  margin-bottom: 16px;
}

/* ── Buttons ── */
.btn-login, .btn-guest {
  position: relative;
  width: 100%;
  height: 48px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s;
}
.btn-login {
  border: none;
  background: linear-gradient(135deg, #5a87e0 0%, #4f7be7 100%);
  color: #fff;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(79, 123, 231, 0.2);
}
.btn-login:hover:not(:disabled) {
  box-shadow: 0 4px 16px rgba(79, 123, 231, 0.3);
  transform: translateY(-1px);
}
.btn-login:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-guest {
  border: 1.5px solid #E6ECF5;
  background: rgba(255, 255, 255, 0.5);
  color: #5F6E8A;
}
.btn-guest:hover {
  border-color: #D0DAEA;
  background: rgba(255, 255, 255, 0.8);
}

.btn-text { display: inline-flex; align-items: center; gap: 10px; transition: all 0.3s; }
.btn-hover-content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #5a87e0 0%, #4f7be7 100%);
  color: #fff;
  opacity: 0;
  transition: all 0.3s;
  border-radius: 24px;
}
.btn-login:hover:not(:disabled) .btn-text { transform: translateX(40px); opacity: 0; }
.btn-login:hover:not(:disabled) .btn-hover-content { opacity: 1; }
.btn-guest:hover .btn-text { transform: translateX(40px); opacity: 0; }
.btn-guest:hover .btn-hover-content { opacity: 1; background: rgba(255, 255, 255, 0.9); color: #5F6E8A; }

.login-footer {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 11px;
  color: #8a9bb5;
  z-index: 10;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .login-layout { grid-template-columns: 1fr; }
  .scene-area { display: none; }
  .card-area { padding: 24px; }
  .form-card { padding: 32px 28px 28px; }
}
</style>
