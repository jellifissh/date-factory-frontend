function nowText() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function ok(data, msg = 'success') {
  return { code: 200, msg, data }
}

function fail(msg = 'request failed') {
  return { code: 500, msg, data: null }
}

function json(res, payload, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function text(res, payload, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(payload)
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return null
  const raw = Buffer.concat(chunks).toString('utf-8')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function makeNodeLog(status, info) {
  return { status, info }
}

function mockExecutionTrace(taskName) {
  return {
    start_1: makeNodeLog('success', 'workflow started'),
    mysql_2: makeNodeLog('success', JSON.stringify({ count: 12, taskName })),
    if_3: makeNodeLog('success', JSON.stringify({ result: true })),
    api_4: makeNodeLog('success', JSON.stringify({ statusCode: 200, message: 'downstream ok' })),
    end_5: makeNodeLog('success', 'workflow finished')
  }
}

function buildNodeTypeDefs() {
  return [
    {
      type: 'START',
      inputDefs: [],
      outputDefs: [{ name: 'startedAt', label: '开始时间', type: 'string' }]
    },
    {
      type: 'END',
      inputDefs: [{ name: 'result', label: '结果', type: 'any' }],
      outputDefs: []
    },
    {
      type: 'MYSQL',
      inputDefs: [{ name: 'dbId', label: '数据源ID', type: 'number' }, { name: 'sql', label: 'SQL', type: 'string' }],
      outputDefs: [{ name: 'rows', label: '结果集', type: 'array' }, { name: 'count', label: '条数', type: 'number' }]
    },
    {
      type: 'MONGODB',
      inputDefs: [{ name: 'dbId', label: '数据源ID', type: 'number' }, { name: 'operation', label: '操作', type: 'string' }],
      outputDefs: [{ name: 'result', label: '结果', type: 'any' }],
      operationDefs: {
        find: {
          inputDefs: [{ name: 'filter', label: '过滤条件', type: 'json' }, { name: 'projection', label: '投影', type: 'json' }],
          outputDefs: [{ name: 'rows', label: '文档数组', type: 'array' }]
        },
        findOne: {
          inputDefs: [{ name: 'filter', label: '过滤条件', type: 'json' }],
          outputDefs: [{ name: 'row', label: '文档', type: 'object' }]
        },
        countDocuments: {
          inputDefs: [{ name: 'filter', label: '过滤条件', type: 'json' }],
          outputDefs: [{ name: 'count', label: '数量', type: 'number' }]
        },
        aggregate: {
          inputDefs: [{ name: 'pipeline', label: '聚合管道', type: 'json' }],
          outputDefs: [{ name: 'rows', label: '聚合结果', type: 'array' }]
        },
        insertOne: {
          inputDefs: [{ name: 'document', label: '文档', type: 'json' }],
          outputDefs: [{ name: 'insertedId', label: '插入ID', type: 'string' }]
        },
        updateOne: {
          inputDefs: [{ name: 'filter', label: '过滤条件', type: 'json' }, { name: 'update', label: '更新语句', type: 'json' }],
          outputDefs: [{ name: 'modifiedCount', label: '更新条数', type: 'number' }]
        },
        updateMany: {
          inputDefs: [{ name: 'filter', label: '过滤条件', type: 'json' }, { name: 'update', label: '更新语句', type: 'json' }],
          outputDefs: [{ name: 'modifiedCount', label: '更新条数', type: 'number' }]
        },
        deleteOne: {
          inputDefs: [{ name: 'filter', label: '过滤条件', type: 'json' }],
          outputDefs: [{ name: 'deletedCount', label: '删除条数', type: 'number' }]
        },
        deleteMany: {
          inputDefs: [{ name: 'filter', label: '过滤条件', type: 'json' }],
          outputDefs: [{ name: 'deletedCount', label: '删除条数', type: 'number' }]
        }
      }
    },
    {
      type: 'IF',
      inputDefs: [{ name: 'condition', label: '条件表达式', type: 'string' }],
      outputDefs: [{ name: 'result', label: '布尔结果', type: 'boolean' }]
    },
    {
      type: 'API',
      inputDefs: [{ name: 'apiId', label: 'API源ID', type: 'number' }, { name: 'body', label: '请求体', type: 'json' }],
      outputDefs: [{ name: 'statusCode', label: 'HTTP状态码', type: 'number' }, { name: 'body', label: '响应内容', type: 'any' }]
    }
  ]
}

function createInitialState() {
  const envs = ['DEV', 'TEST', 'PROD']
  const state = {
    seq: {
      db: 3,
      apiSource: 3,
      task: 3,
      openApi: 2,
      log: 2,
      version: 100
    },
    dbSources: Object.fromEntries(envs.map((e) => [e, []])),
    apiSources: Object.fromEntries(envs.map((e) => [e, []])),
    tasks: Object.fromEntries(envs.map((e) => [e, []])),
    openApis: Object.fromEntries(envs.map((e) => [e, []])),
    logs: Object.fromEntries(envs.map((e) => [e, []])),
    schedules: {},
    taskVersions: {},
    openApiVersions: {}
  }

  state.dbSources.DEV = [
    { id: 1, name: '主MySQL', dbType: 'MYSQL', host: '127.0.0.1', port: 3306, username: 'root', password: '', dbName: 'data_factory', extraParams: '', env: 'DEV' },
    { id: 2, name: '埋点Mongo', dbType: 'MONGODB', host: '127.0.0.1', port: 27017, username: 'mongo', password: '', dbName: 'events', extraParams: '', env: 'DEV' }
  ]
  state.dbSources.TEST = clone(state.dbSources.DEV).map((x) => ({ ...x, env: 'TEST' }))
  state.dbSources.PROD = clone(state.dbSources.DEV).map((x) => ({ ...x, env: 'PROD' }))

  state.apiSources.DEV = [
    { id: 1, name: '用户中心API', method: 'GET', url: 'https://example.com/user/query', authConfig: '', headers: '', timeout: 30000, env: 'DEV' },
    { id: 2, name: '订单同步API', method: 'POST', url: 'https://example.com/order/sync', authConfig: '', headers: '', timeout: 30000, env: 'DEV' }
  ]
  state.apiSources.TEST = clone(state.apiSources.DEV).map((x) => ({ ...x, env: 'TEST' }))
  state.apiSources.PROD = clone(state.apiSources.DEV).map((x) => ({ ...x, env: 'PROD' }))

  const sampleDsl = JSON.stringify({
    nodes: [
      { id: 'start_1', type: 'START', x: 140, y: 100 },
      { id: 'mysql_2', type: 'MYSQL', dbId: 1, sql: 'SELECT * FROM users LIMIT 10', x: 140, y: 210 },
      { id: 'end_3', type: 'END', x: 140, y: 320 }
    ],
    edges: [
      { source: 'start_1', target: 'mysql_2' },
      { source: 'mysql_2', target: 'end_3' }
    ]
  })

  state.tasks.DEV = [
    { id: 1, name: '用户数据同步', env: 'DEV', status: 1, versionNo: 1, cron: '0 */30 * * * ?', dslContent: sampleDsl }
  ]
  state.tasks.TEST = [{ ...clone(state.tasks.DEV[0]), env: 'TEST', status: 1 }]
  state.tasks.PROD = [{ ...clone(state.tasks.DEV[0]), env: 'PROD', status: 1 }]

  for (const env of envs) {
    const task = state.tasks[env][0]
    state.taskVersions[task.id] = state.taskVersions[task.id] || []
    state.taskVersions[task.id].push({
      id: ++state.seq.version,
      versionNo: task.versionNo,
      env,
      createTime: nowText(),
      contentSnapshot: task.dslContent
    })
  }

  state.openApis.DEV = [
    { id: 1, path: 'query_user', method: 'GET', taskId: 1, dailyLimit: 1000, dailyCount: 36, status: 1, env: 'DEV', versionNo: 1 }
  ]
  state.openApis.TEST = [{ ...clone(state.openApis.DEV[0]), env: 'TEST' }]
  state.openApis.PROD = [{ ...clone(state.openApis.DEV[0]), env: 'PROD' }]

  for (const env of envs) {
    const item = state.openApis[env][0]
    state.openApiVersions[item.id] = state.openApiVersions[item.id] || []
    state.openApiVersions[item.id].push({
      id: ++state.seq.version,
      versionNo: item.versionNo,
      env,
      createTime: nowText(),
      contentSnapshot: JSON.stringify(item)
    })
  }

  state.logs.DEV = [
    {
      id: 1,
      taskId: 1,
      status: 1,
      startTime: nowText(),
      endTime: nowText(),
      msg: JSON.stringify(mockExecutionTrace('用户数据同步')),
      env: 'DEV'
    }
  ]

  return state
}

function findByIdAllEnv(state, bucket, id) {
  for (const env of ['DEV', 'TEST', 'PROD']) {
    const row = state[bucket][env].find((x) => x.id === id)
    if (row) return { env, row }
  }
  return null
}

function byEnv(state, bucket, env) {
  return state[bucket][env] || []
}

function getQuery(urlObj, name, fallback = '') {
  return urlObj.searchParams.get(name) || fallback
}

function upsertById(list, row) {
  const idx = list.findIndex((x) => x.id === row.id)
  if (idx >= 0) list[idx] = row
  else list.push(row)
}

function appendTaskVersion(state, task, env, snapshot) {
  state.taskVersions[task.id] = state.taskVersions[task.id] || []
  state.taskVersions[task.id].push({
    id: ++state.seq.version,
    versionNo: task.versionNo,
    env,
    createTime: nowText(),
    contentSnapshot: snapshot
  })
}

function appendOpenApiVersion(state, item, env, snapshot) {
  state.openApiVersions[item.id] = state.openApiVersions[item.id] || []
  state.openApiVersions[item.id].push({
    id: ++state.seq.version,
    versionNo: item.versionNo,
    env,
    createTime: nowText(),
    contentSnapshot: snapshot
  })
}

export function dataFactoryMockPlugin() {
  const state = createInitialState()

  return {
    name: 'data-factory-mock',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next()
        const urlObj = new URL(req.url, 'http://mock.local')
        const path = urlObj.pathname
        const method = (req.method || 'GET').toUpperCase()

        const isMockPath = path.startsWith('/api') || path.startsWith('/auth') || path.startsWith('/assistant')
        if (!isMockPath) return next()

        // ===== assistant =====
        if (path === '/assistant/chat' && method === 'POST') {
          const body = await readJsonBody(req)
          const latest = body?.messages?.[body.messages.length - 1]?.content || ''
          text(res, `模拟助手已收到你的问题：${latest}\n\n当前为前端 Mock 模式。`)
          return
        }

        // ===== auth =====
        if (path === '/auth/login' && method === 'POST') {
          json(res, ok({ token: 'mock-token-admin' }))
          return
        }

        // ===== shared list helpers =====
        if (path === '/api/source/db/list' && method === 'GET') {
          const env = getQuery(urlObj, 'env', 'DEV')
          json(res, ok(clone(byEnv(state, 'dbSources', env))))
          return
        }

        if (path === '/api/source/api/list' && method === 'GET') {
          const env = getQuery(urlObj, 'env', 'DEV')
          json(res, ok(clone(byEnv(state, 'apiSources', env))))
          return
        }

        if (path === '/api/task/list' && method === 'GET') {
          const env = getQuery(urlObj, 'env', 'DEV')
          json(res, ok(clone(byEnv(state, 'tasks', env))))
          return
        }

        if (path === '/api/task/openapi/list' && method === 'GET') {
          const env = getQuery(urlObj, 'env', 'DEV')
          json(res, ok(clone(byEnv(state, 'openApis', env))))
          return
        }

        if (path === '/api/task/log/list' && method === 'GET') {
          const env = getQuery(urlObj, 'env', 'DEV')
          json(res, ok(clone(byEnv(state, 'logs', env))))
          return
        }

        // ===== db source =====
        const dbIdPath = path.match(/^\/api\/source\/db\/(\d+)$/)
        if (dbIdPath && method === 'GET') {
          const id = Number(dbIdPath[1])
          const found = findByIdAllEnv(state, 'dbSources', id)
          json(res, found ? ok(clone(found.row)) : fail('数据源不存在'))
          return
        }
        if (path === '/api/source/db' && method === 'POST') {
          const body = (await readJsonBody(req)) || {}
          const env = body.env || 'DEV'
          const row = { ...body, id: ++state.seq.db, env }
          byEnv(state, 'dbSources', env).push(row)
          json(res, ok(row))
          return
        }
        if (path === '/api/source/db' && method === 'PUT') {
          const body = (await readJsonBody(req)) || {}
          const found = findByIdAllEnv(state, 'dbSources', Number(body.id))
          if (!found) return json(res, fail('数据源不存在'))
          const row = { ...found.row, ...body, env: found.env }
          upsertById(state.dbSources[found.env], row)
          json(res, ok(row))
          return
        }
        if (dbIdPath && method === 'DELETE') {
          const id = Number(dbIdPath[1])
          for (const env of ['DEV', 'TEST', 'PROD']) {
            state.dbSources[env] = state.dbSources[env].filter((x) => x.id !== id)
          }
          json(res, ok(true))
          return
        }
        const dbTestPath = path.match(/^\/api\/source\/db\/test\/(\d+)$/)
        if (dbTestPath && method === 'POST') {
          json(res, ok({ success: true, message: '连接成功', costMs: 48 }))
          return
        }

        // ===== api source =====
        const apiSourceIdPath = path.match(/^\/api\/source\/api\/(\d+)$/)
        if (apiSourceIdPath && method === 'GET') {
          const id = Number(apiSourceIdPath[1])
          const found = findByIdAllEnv(state, 'apiSources', id)
          json(res, found ? ok(clone(found.row)) : fail('API源不存在'))
          return
        }
        if (path === '/api/source/api' && method === 'POST') {
          const body = (await readJsonBody(req)) || {}
          const env = body.env || 'DEV'
          const row = { ...body, id: ++state.seq.apiSource, env }
          byEnv(state, 'apiSources', env).push(row)
          json(res, ok(row))
          return
        }
        if (path === '/api/source/api' && method === 'PUT') {
          const body = (await readJsonBody(req)) || {}
          const found = findByIdAllEnv(state, 'apiSources', Number(body.id))
          if (!found) return json(res, fail('API源不存在'))
          const row = { ...found.row, ...body, env: found.env }
          upsertById(state.apiSources[found.env], row)
          json(res, ok(row))
          return
        }
        if (apiSourceIdPath && method === 'DELETE') {
          const id = Number(apiSourceIdPath[1])
          for (const env of ['DEV', 'TEST', 'PROD']) {
            state.apiSources[env] = state.apiSources[env].filter((x) => x.id !== id)
          }
          json(res, ok(true))
          return
        }
        const apiSourceTestPath = path.match(/^\/api\/source\/api\/test\/(\d+)$/)
        if (apiSourceTestPath && method === 'POST') {
          json(res, ok({ success: true, message: '请求成功', httpStatus: 200, costMs: 32 }))
          return
        }

        // ===== task =====
        if (path === '/api/task' && method === 'POST') {
          const body = (await readJsonBody(req)) || {}
          const env = body.env || 'DEV'
          const row = {
            id: ++state.seq.task,
            name: body.name || `新任务-${state.seq.task}`,
            env,
            status: 1,
            versionNo: 1,
            cron: body.cron || '',
            dslContent: body.dslContent || JSON.stringify({ nodes: [], edges: [] })
          }
          byEnv(state, 'tasks', env).push(row)
          appendTaskVersion(state, row, env, row.dslContent)
          json(res, ok(row))
          return
        }
        if (path === '/api/task' && method === 'PUT') {
          const body = (await readJsonBody(req)) || {}
          const found = findByIdAllEnv(state, 'tasks', Number(body.id))
          if (!found) return json(res, fail('任务不存在'))
          const nextVersion = (found.row.versionNo || 1) + 1
          const row = {
            ...found.row,
            ...body,
            env: found.env,
            versionNo: nextVersion
          }
          upsertById(state.tasks[found.env], row)
          appendTaskVersion(state, row, found.env, row.dslContent || found.row.dslContent || '')
          json(res, ok(row))
          return
        }
        if (path === '/api/task/node-types' && method === 'GET') {
          json(res, ok(buildNodeTypeDefs()))
          return
        }
        if (path === '/api/task/publish' && method === 'POST') {
          const body = (await readJsonBody(req)) || {}
          const targetEnv = body.targetEnv || 'TEST'
          const found = findByIdAllEnv(state, 'tasks', Number(body.taskId))
          if (!found) return json(res, fail('任务不存在'))
          const targetList = byEnv(state, 'tasks', targetEnv)
          const exists = targetList.find((x) => x.name === found.row.name)
          const nextVersion = (exists?.versionNo || 0) + 1
          const row = exists
            ? { ...exists, dslContent: found.row.dslContent, cron: found.row.cron, status: found.row.status, versionNo: nextVersion }
            : { ...clone(found.row), id: ++state.seq.task, env: targetEnv, versionNo: 1 }
          upsertById(targetList, row)
          appendTaskVersion(state, row, targetEnv, row.dslContent || '')
          json(res, ok(true))
          return
        }
        if (path === '/api/task/version/rollback' && method === 'POST') {
          const body = (await readJsonBody(req)) || {}
          const taskId = Number(body.taskId)
          const versions = state.taskVersions[taskId] || []
          const target = versions.find((v) => Number(v.versionNo) === Number(body.versionNo))
          const found = findByIdAllEnv(state, 'tasks', taskId)
          if (!target || !found) return json(res, fail('版本不存在'))
          const row = { ...found.row, versionNo: target.versionNo, dslContent: target.contentSnapshot }
          upsertById(state.tasks[found.env], row)
          json(res, ok(true))
          return
        }
        const taskVersionCreatePath = path.match(/^\/api\/task\/version\/create\/(\d+)$/)
        if (taskVersionCreatePath && method === 'POST') {
          const taskId = Number(taskVersionCreatePath[1])
          const body = (await readJsonBody(req)) || {}
          const found = findByIdAllEnv(state, 'tasks', taskId)
          if (!found) return json(res, fail('任务不存在'))
          found.row.versionNo = (found.row.versionNo || 1) + 1
          if (body.dslContent) found.row.dslContent = body.dslContent
          appendTaskVersion(state, found.row, found.env, found.row.dslContent || '')
          json(res, ok(true))
          return
        }
        const taskVersionListPath = path.match(/^\/api\/task\/version\/(\d+)$/)
        if (taskVersionListPath && method === 'GET') {
          const taskId = Number(taskVersionListPath[1])
          const list = clone(state.taskVersions[taskId] || []).sort((a, b) => b.versionNo - a.versionNo)
          json(res, ok(list))
          return
        }
        const taskIdPath = path.match(/^\/api\/task\/(\d+)$/)
        if (taskIdPath && method === 'GET') {
          const id = Number(taskIdPath[1])
          const found = findByIdAllEnv(state, 'tasks', id)
          json(res, found ? ok(clone(found.row)) : fail('任务不存在'))
          return
        }
        if (taskIdPath && method === 'DELETE') {
          const id = Number(taskIdPath[1])
          for (const env of ['DEV', 'TEST', 'PROD']) {
            state.tasks[env] = state.tasks[env].filter((x) => x.id !== id)
          }
          json(res, ok(true))
          return
        }
        const taskToggleStatusPath = path.match(/^\/api\/task\/(\d+)\/status$/)
        if (taskToggleStatusPath && method === 'PUT') {
          const id = Number(taskToggleStatusPath[1])
          const found = findByIdAllEnv(state, 'tasks', id)
          if (!found) return json(res, fail('任务不存在'))
          found.row.status = found.row.status === 1 ? 0 : 1
          upsertById(state.tasks[found.env], found.row)
          json(res, ok(true))
          return
        }
        const taskExecPath = path.match(/^\/api\/task\/execute\/(\d+)$/)
        if (taskExecPath && method === 'POST') {
          const id = Number(taskExecPath[1])
          const found = findByIdAllEnv(state, 'tasks', id)
          if (!found) return json(res, fail('任务不存在'))
          const logId = ++state.seq.log
          const started = nowText()
          const ended = nowText()
          const log = {
            id: logId,
            taskId: id,
            status: 1,
            startTime: started,
            endTime: ended,
            msg: JSON.stringify(mockExecutionTrace(found.row.name)),
            env: found.env
          }
          byEnv(state, 'logs', found.env).unshift(log)
          json(res, ok({ success: true, logId }))
          return
        }
        const taskScheduleStartPath = path.match(/^\/api\/task\/schedule\/(\d+)\/start$/)
        if (taskScheduleStartPath && method === 'POST') {
          const id = Number(taskScheduleStartPath[1])
          const found = findByIdAllEnv(state, 'tasks', id)
          if (!found) return json(res, fail('任务不存在'))
          state.schedules[`${found.env}:${id}`] = true
          json(res, ok(true))
          return
        }
        const taskScheduleStopPath = path.match(/^\/api\/task\/schedule\/(\d+)\/stop$/)
        if (taskScheduleStopPath && method === 'POST') {
          const id = Number(taskScheduleStopPath[1])
          const found = findByIdAllEnv(state, 'tasks', id)
          if (!found) return json(res, fail('任务不存在'))
          state.schedules[`${found.env}:${id}`] = false
          json(res, ok(true))
          return
        }
        const taskScheduleStatusPath = path.match(/^\/api\/task\/schedule\/(\d+)\/status$/)
        if (taskScheduleStatusPath && method === 'GET') {
          const id = Number(taskScheduleStatusPath[1])
          const found = findByIdAllEnv(state, 'tasks', id)
          if (!found) return json(res, fail('任务不存在'))
          json(res, ok(Boolean(state.schedules[`${found.env}:${id}`])))
          return
        }

        // ===== open api =====
        if (path === '/api/task/openapi' && method === 'POST') {
          const body = (await readJsonBody(req)) || {}
          const env = body.env || 'DEV'
          const row = {
            id: ++state.seq.openApi,
            path: body.path,
            method: body.method || 'GET',
            taskId: Number(body.taskId),
            dailyLimit: Number(body.dailyLimit || 0),
            dailyCount: 0,
            status: 1,
            env,
            versionNo: 1
          }
          byEnv(state, 'openApis', env).push(row)
          appendOpenApiVersion(state, row, env, JSON.stringify(row))
          json(res, ok(row))
          return
        }
        if (path === '/api/task/openapi' && method === 'PUT') {
          const body = (await readJsonBody(req)) || {}
          const found = findByIdAllEnv(state, 'openApis', Number(body.id))
          if (!found) return json(res, fail('开放接口不存在'))
          const row = { ...found.row, ...body, env: found.env, versionNo: (found.row.versionNo || 1) + 1 }
          upsertById(state.openApis[found.env], row)
          appendOpenApiVersion(state, row, found.env, JSON.stringify(row))
          json(res, ok(row))
          return
        }
        const openApiIdPath = path.match(/^\/api\/task\/openapi\/(\d+)$/)
        if (openApiIdPath && method === 'DELETE') {
          const id = Number(openApiIdPath[1])
          for (const env of ['DEV', 'TEST', 'PROD']) {
            state.openApis[env] = state.openApis[env].filter((x) => x.id !== id)
          }
          json(res, ok(true))
          return
        }
        const openApiTogglePath = path.match(/^\/api\/task\/openapi\/(\d+)\/status$/)
        if (openApiTogglePath && method === 'PUT') {
          const id = Number(openApiTogglePath[1])
          const found = findByIdAllEnv(state, 'openApis', id)
          if (!found) return json(res, fail('开放接口不存在'))
          found.row.status = found.row.status === 1 ? 0 : 1
          upsertById(state.openApis[found.env], found.row)
          json(res, ok(true))
          return
        }
        const openApiLinkedPath = path.match(/^\/api\/task\/openapi\/linked\/(\d+)$/)
        if (openApiLinkedPath && method === 'GET') {
          const taskId = Number(openApiLinkedPath[1])
          let linked = false
          for (const env of ['DEV', 'TEST', 'PROD']) {
            if (state.openApis[env].some((x) => Number(x.taskId) === taskId && x.status === 1)) {
              linked = true
              break
            }
          }
          json(res, ok(linked))
          return
        }
        if (path === '/api/task/openapi/publish' && method === 'POST') {
          const body = (await readJsonBody(req)) || {}
          const targetEnv = body.targetEnv || 'TEST'
          const found = findByIdAllEnv(state, 'openApis', Number(body.id))
          if (!found) return json(res, fail('开放接口不存在'))
          const targetList = byEnv(state, 'openApis', targetEnv)
          const exists = targetList.find((x) => x.path === found.row.path && x.method === found.row.method)
          const nextVersion = (exists?.versionNo || 0) + 1
          const row = exists
            ? { ...exists, taskId: found.row.taskId, dailyLimit: found.row.dailyLimit, status: found.row.status, versionNo: nextVersion }
            : { ...clone(found.row), id: ++state.seq.openApi, env: targetEnv, versionNo: 1 }
          upsertById(targetList, row)
          appendOpenApiVersion(state, row, targetEnv, JSON.stringify(row))
          json(res, ok(true))
          return
        }
        const openApiVersionListPath = path.match(/^\/api\/task\/openapi\/version\/(\d+)$/)
        if (openApiVersionListPath && method === 'GET') {
          const id = Number(openApiVersionListPath[1])
          const list = clone(state.openApiVersions[id] || []).sort((a, b) => b.versionNo - a.versionNo)
          json(res, ok(list))
          return
        }
        if (path === '/api/task/openapi/version/rollback' && method === 'POST') {
          const body = (await readJsonBody(req)) || {}
          const id = Number(body.id)
          const versionNo = Number(body.versionNo)
          const versions = state.openApiVersions[id] || []
          const target = versions.find((v) => Number(v.versionNo) === versionNo)
          const found = findByIdAllEnv(state, 'openApis', id)
          if (!target || !found) return json(res, fail('版本不存在'))
          try {
            const snapshot = JSON.parse(target.contentSnapshot)
            const row = { ...found.row, ...snapshot, id: found.row.id, env: found.env, versionNo }
            upsertById(state.openApis[found.env], row)
          } catch {}
          json(res, ok(true))
          return
        }
        const openApiVersionCreatePath = path.match(/^\/api\/task\/openapi\/version\/create\/(\d+)$/)
        if (openApiVersionCreatePath && method === 'POST') {
          const id = Number(openApiVersionCreatePath[1])
          const body = (await readJsonBody(req)) || {}
          const found = findByIdAllEnv(state, 'openApis', id)
          if (!found) return json(res, fail('开放接口不存在'))
          found.row.versionNo = (found.row.versionNo || 1) + 1
          appendOpenApiVersion(state, found.row, found.env, body.contentSnapshot || JSON.stringify(found.row))
          json(res, ok(true))
          return
        }

        // ===== open api invoke =====
        const openInvokePath = path.match(/^\/api\/open\/(DEV|TEST|PROD)\/([^/]+)\/test$/)
        if (openInvokePath && (method === 'GET' || method === 'POST')) {
          const env = openInvokePath[1]
          const endpointPath = openInvokePath[2]
          const row = state.openApis[env].find((x) => x.path === endpointPath)
          if (!row) return json(res, fail('接口不存在'))
          row.dailyCount = (row.dailyCount || 0) + 1
          const payload = {
            start_1: makeNodeLog('success', 'request accepted'),
            task_2: makeNodeLog('success', JSON.stringify({ taskId: row.taskId, env, traceId: `mock-${Date.now()}` })),
            end_3: makeNodeLog('success', 'request completed')
          }
          json(res, ok(payload))
          return
        }

        // ===== logs =====
        if (path === '/api/task/log/batch' && method === 'DELETE') {
          const body = await readJsonBody(req)
          const ids = Array.isArray(body) ? body.map(Number) : []
          let count = 0
          for (const env of ['DEV', 'TEST', 'PROD']) {
            const before = state.logs[env].length
            state.logs[env] = state.logs[env].filter((x) => !ids.includes(Number(x.id)))
            count += before - state.logs[env].length
          }
          json(res, ok(count))
          return
        }
        if (path === '/api/task/log/clean' && method === 'DELETE') {
          const env = getQuery(urlObj, 'env', 'DEV')
          const beforeDate = getQuery(urlObj, 'beforeDate')
          const threshold = beforeDate ? new Date(beforeDate).getTime() : Date.now()
          const before = state.logs[env].length
          state.logs[env] = state.logs[env].filter((x) => new Date(x.endTime).getTime() >= threshold)
          json(res, ok(before - state.logs[env].length))
          return
        }

        // no match
        json(res, fail(`mock route not found: ${method} ${path}`))
      })
    }
  }
}
