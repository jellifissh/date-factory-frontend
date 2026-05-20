/**
 * Cron 表达式工具（Spring 格式：秒 分 时 日 月 周）
 */

const weekNames = { '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '日', 'MON': '一', 'TUE': '二', 'WED': '三', 'THU': '四', 'FRI': '五', 'SAT': '六', 'SUN': '日' }
const weekNumToCron = { '一': 'MON', '二': 'TUE', '三': 'WED', '四': 'THU', '五': 'FRI', '六': 'SAT', '日': 'SUN' }

/** 将 cron 表达式转为中文自然语言 */
export function cronToText(cron) {
  if (!cron) return '-'
  const p = cron.trim().split(/\s+/)
  if (p.length < 6) return cron

  const [sec, min, hour, day, month, week] = p
  const pad = n => String(n).padStart(2, '0')
  const timeStr = h => `${pad(h)}:${pad(min === '*' ? 0 : parseInt(min))}`

  if (min.startsWith('*/') && hour === '*' && day === '*' && month === '*' && week === '?') {
    return `每${min.slice(2)}分钟`
  }
  if (min === '0' && hour.startsWith('*/') && day === '*' && month === '*' && week === '?') {
    return `每${hour.slice(2)}小时`
  }
  if (day === '*' && month === '*' && week === '?') {
    return `每天 ${timeStr(parseInt(hour))}`
  }
  if (day === '?' && month === '*' && week !== '*' && week !== '?') {
    const h = parseInt(hour)
    if (week.includes('-')) {
      const [s, e] = week.split('-')
      return `每周${weekNames[s] || s}至${weekNames[e] || e} ${timeStr(h)}`
    }
    if (week.includes(',')) {
      const names = week.split(',').map(w => weekNames[w] || w).join('、')
      return `每周${names} ${timeStr(h)}`
    }
    return `每周${weekNames[week] || week} ${timeStr(h)}`
  }
  if (month === '*' && week === '?') {
    return `每月${day}号 ${timeStr(parseInt(hour))}`
  }
  return cron
}

/** 将 cron 表达式反向解析为表单对象 */
export function parseCron(cron) {
  if (!cron) return { type: 'none' }
  const p = cron.trim().split(/\s+/)
  if (p.length < 6) return { type: 'none' }

  const [sec, min, hour, day, month, week] = p

  // 每N分钟
  if (min.startsWith('*/') && hour === '*' && day === '*' && month === '*' && week === '?') {
    return { type: 'minute', interval: parseInt(min.slice(2)) }
  }
  // 每N小时
  if (min === '0' && hour.startsWith('*/') && day === '*' && month === '*' && week === '?') {
    return { type: 'hour', interval: parseInt(hour.slice(2)) }
  }
  // 每天
  if (day === '*' && month === '*' && week === '?') {
    return { type: 'day', time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}` }
  }
  // 每周
  if (day === '?' && month === '*' && week !== '*' && week !== '?') {
    let weekdays = []
    if (week.includes('-')) {
      const order = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
      const [s, e] = week.split('-')
      const si = order.indexOf(s), ei = order.indexOf(e)
      for (let i = si; i <= ei; i++) weekdays.push(weekNames[order[i]])
    } else if (week.includes(',')) {
      weekdays = week.split(',').map(w => weekNames[w])
    } else {
      weekdays = [weekNames[week]]
    }
    return { type: 'week', weekdays, time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}` }
  }
  // 每月
  if (month === '*' && week === '?') {
    return { type: 'month', day: parseInt(day), time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}` }
  }
  return { type: 'none' }
}

/** 将表单对象转为 cron 表达式 */
export function buildCron(form) {
  if (!form || form.type === 'none') return null
  const pad = n => String(n).padStart(2, '0')

  switch (form.type) {
    case 'minute': return `0 */${form.interval || 5} * * * ?`
    case 'hour': return `0 0 */${form.interval || 2} * * ?`
    case 'day': {
      const [h, m] = (form.time || '00:00').split(':')
      return `0 ${m} ${h} * * ?`
    }
    case 'week': {
      const [h, m] = (form.time || '00:00').split(':')
      const cronDays = (form.weekdays || []).map(d => weekNumToCron[d]).join(',')
      return `0 ${m} ${h} ? * ${cronDays}`
    }
    case 'month': {
      const [h, m] = (form.time || '00:00').split(':')
      return `0 ${m} ${h} ${form.day || 1} * ?`
    }
    default: return null
  }
}
