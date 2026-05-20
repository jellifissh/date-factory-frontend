<template>
  <div>
    <div class="page-header">
      <h2>{{ isNewVersion ? '创建新版本' : (taskId ? '编辑任务' : '新建任务') }}</h2>
      <div style="display:flex;gap:10px">
        <Button label="返回" icon="pi pi-arrow-left" outlined @click="$router.back()" />
        <Button label="保存" icon="pi pi-check" @click="handleSave" :loading="saving" />
      </div>
    </div>

    <Message v-if="openApiLinked" severity="warn" style="margin-bottom:12px">
      ⚠️ 该任务已被开放平台关联，建议请先停用开放平台 API，再进行编辑
    </Message>

    <div style="margin-bottom:12px;display:flex;gap:12px;align-items:center">
      <InputText v-model="taskName" placeholder="任务名称" style="width:200px" :disabled="isNewVersion" />
      <Tag v-if="!taskId" severity="success" value="DEV" style="font-size:14px;padding:4px 12px" />
      <Tag v-else :severity="taskEnv==='DEV'?'success':taskEnv==='TEST'?'warn':'danger'" :value="taskEnv" style="font-size:14px;padding:4px 12px" />
      <!-- 定时调度设置 -->
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:14px;color:#606266;white-space:nowrap">定时调度：</span>
        <Select v-model="cronForm.type" :options="cronTypeOptions" optionLabel="label" optionValue="value"
                style="width:140px" @change="onCronTypeChange" />
        <template v-if="cronForm.type === 'minute'">
          <InputNumber v-model="cronForm.interval" :min="1" :max="59" style="width:120px" />
          <span style="color:#909399;font-size:13px">分钟</span>
        </template>
        <template v-if="cronForm.type === 'hour'">
          <InputNumber v-model="cronForm.interval" :min="1" :max="23" style="width:120px" />
          <span style="color:#909399;font-size:13px">小时</span>
        </template>
        <template v-if="cronForm.type === 'day'">
          <input type="time" v-model="cronForm.time" style="width:140px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px" />
        </template>
        <template v-if="cronForm.type === 'week'">
          <MultiSelect v-model="cronForm.weekdays" :options="weekdayOptions" style="width:200px"
                       placeholder="选择星期" display="chip">
            <template #option="{ option }">周{{ option }}</template>
            <template #chip="{ value }">周{{ value }}</template>
          </MultiSelect>
          <input type="time" v-model="cronForm.time" style="width:140px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px" />
        </template>
        <template v-if="cronForm.type === 'month'">
          <InputNumber v-model="cronForm.day" :min="1" :max="31" style="width:120px" />
          <span style="color:#909399;font-size:13px">号</span>
          <input type="time" v-model="cronForm.time" style="width:140px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px" />
        </template>
        <Tag v-if="cronForm.type !== 'none'" severity="success" :value="cronPreview" style="margin-left:4px" />
      </div>
      <Button :label="showDsl ? '隐藏 DSL' : '查看 DSL'" icon="pi pi-eye" outlined @click="showDsl = !showDsl" />
      <Button label="自动布局" icon="pi pi-sitemap" outlined @click="autoLayout" />
    </div>

    <div class="dag-container">
      <!-- 左侧节点栏 -->
      <div class="dag-sidebar">
        <h4>节点组件</h4>
        <p style="font-size:12px;color:#909399;margin-bottom:10px">拖拽到画布放置</p>
        <div v-for="n in nodeTypes" :key="n.type" class="node-item"
             @mousedown="startDrag(n, $event)">
          <span class="dot" :style="{ background: n.color }"></span>
          {{ n.label }}
        </div>
      </div>

      <!-- 中间画布 -->
      <div class="dag-canvas" ref="canvasRef"></div>

      <!-- 右侧属性面板 -->
      <div class="dag-right-panel">
        <h4 style="margin-bottom:12px">属性配置</h4>
        <template v-if="selectedNode">
          <div class="form-grid">
            <div class="form-row">
              <label>节点ID</label>
              <InputText v-model="selectedNode.id" disabled />
            </div>
            <div class="form-row">
              <label>类型</label>
              <Tag :value="(nodeTypes.find(n => n.type === selectedNode.type) || {}).label || selectedNode.type" />
            </div>
            <template v-if="selectedNode.type === 'MYSQL'">
              <div class="form-row">
                <label>数据源</label>
                <Select v-model="selectedNode.dbId" :options="mysqlSourceOptions" optionLabel="label" optionValue="value"
                        placeholder="选择数据源" @before-show="loadDbSources" style="width:100%">
                  <template #option="{ option }">
                    <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
                      <span>{{ option.label.split(' [')[0] }}</span>
                      <Tag :severity="option.dbType === 'MYSQL' ? 'warn' : option.dbType === 'MONGODB' ? 'success' : 'info'" style="font-size:11px">{{ option.dbType === 'MYSQL' ? 'MySql' : option.dbType === 'MONGODB' ? 'MongoDB' : option.dbType }}</Tag>
                    </div>
                  </template>
                  <template #value="{ value }">
                    <span v-if="value">{{ dbSourceLabel(value) }}</span>
                    <span v-else style="color:#94a3b8">选择数据源</span>
                  </template>
                </Select>
              </div>
              <div class="form-row">
                <label>{{ getDbType(selectedNode) === 'MONGODB' ? '查询语句' : 'SQL' }}</label>
                <div style="position:relative">
                  <Textarea v-model="selectedNode.sql" :rows="4"
                    :placeholder="getDbType(selectedNode) === 'MONGODB' ? 'db.collection.find({...})' : 'SELECT * FROM users'" />
                  <Button icon="pi pi-code" size="small" severity="secondary" outlined
                    style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                    @click="toggleVarMenu" />
                  <div v-if="showVarMenu" class="var-dropdown">
                    <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                      <span class="var-group">{{ item.group }}</span>
                      <code>{{ item.label }}</code>
                    </div>
                    <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                    <div class="var-custom" v-if="upstreamOutputFields.length">
                      <div class="var-divider"></div>
                      <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                      <select v-model="customVarBase" class="var-select">
                        <option value="" disabled>选择上游输出</option>
                        <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                      </select>
                      <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                      <div v-if="customVarPreview" class="var-preview">
                        <code>{{ customVarPreview }}</code>
                        <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-if="selectedNode.type === 'MONGODB'">
              <div class="form-row">
                <label>数据源</label>
                <Select v-model="selectedNode.dbId" :options="mongoSourceOptions" optionLabel="label" optionValue="value"
                        placeholder="选择数据源" @before-show="loadDbSources" style="width:100%">
                  <template #option="{ option }">
                    <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
                      <span>{{ option.label.split(' [')[0] }}</span>
                      <Tag :severity="option.dbType === 'MONGODB' ? 'success' : 'info'" style="font-size:11px">{{ option.dbType }}</Tag>
                    </div>
                  </template>
                  <template #value="{ value }">
                    <span v-if="value">{{ dbSourceLabel(value) }}</span>
                    <span v-else style="color:#94a3b8">选择数据源</span>
                  </template>
                </Select>
              </div>
              <div class="form-row">
                <label>集合名</label>
                <InputText v-model="selectedNode.collection" placeholder="如 orders" style="width:100%" />
              </div>
              <div class="form-row">
                <label>操作</label>
                <Select v-model="selectedNode.operation" :options="mongoOperations" optionLabel="label" optionValue="value"
                        placeholder="选择操作" style="width:100%" />
              </div>
              <!-- 动态操作参数 -->
              <template v-if="selectedNode.operation === 'find'">
                <div class="form-row">
                  <label>查询条件</label>
                  <div style="position:relative">
                    <Textarea v-model="selectedNode.filter" :rows="3" placeholder='{"status": "active"}' />
                    <Button icon="pi pi-code" size="small" severity="secondary" outlined
                      style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                      @click="toggleVarMenu" />
                    <div v-if="showVarMenu" class="var-dropdown">
                      <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                        <span class="var-group">{{ item.group }}</span>
                        <code>{{ item.label }}</code>
                      </div>
                      <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                      <div class="var-custom" v-if="upstreamOutputFields.length">
                        <div class="var-divider"></div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                        <select v-model="customVarBase" class="var-select">
                          <option value="" disabled>选择上游输出</option>
                          <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                        </select>
                        <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                        <div v-if="customVarPreview" class="var-preview">
                          <code>{{ customVarPreview }}</code>
                          <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="form-row">
                  <label>投影</label>
                  <Textarea v-model="selectedNode.projection" :rows="2" placeholder='{"name": 1, "_id": 0}' />
                </div>
              </template>
              <template v-if="selectedNode.operation === 'findOne'">
                <div class="form-row">
                  <label>查询条件</label>
                  <div style="position:relative">
                    <Textarea v-model="selectedNode.filter" :rows="3" placeholder='{"_id": "xxx"}' />
                    <Button icon="pi pi-code" size="small" severity="secondary" outlined
                      style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                      @click="toggleVarMenu" />
                    <div v-if="showVarMenu" class="var-dropdown">
                      <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                        <span class="var-group">{{ item.group }}</span>
                        <code>{{ item.label }}</code>
                      </div>
                      <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                      <div class="var-custom" v-if="upstreamOutputFields.length">
                        <div class="var-divider"></div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                        <select v-model="customVarBase" class="var-select">
                          <option value="" disabled>选择上游输出</option>
                          <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                        </select>
                        <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                        <div v-if="customVarPreview" class="var-preview">
                          <code>{{ customVarPreview }}</code>
                          <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-if="selectedNode.operation === 'countDocuments'">
                <div class="form-row">
                  <label>查询条件</label>
                  <div style="position:relative">
                    <Textarea v-model="selectedNode.filter" :rows="3" placeholder='{"status": "active"}' />
                    <Button icon="pi pi-code" size="small" severity="secondary" outlined
                      style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                      @click="toggleVarMenu" />
                    <div v-if="showVarMenu" class="var-dropdown">
                      <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                        <span class="var-group">{{ item.group }}</span>
                        <code>{{ item.label }}</code>
                      </div>
                      <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                      <div class="var-custom" v-if="upstreamOutputFields.length">
                        <div class="var-divider"></div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                        <select v-model="customVarBase" class="var-select">
                          <option value="" disabled>选择上游输出</option>
                          <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                        </select>
                        <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                        <div v-if="customVarPreview" class="var-preview">
                          <code>{{ customVarPreview }}</code>
                          <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-if="selectedNode.operation === 'aggregate'">
                <div class="form-row">
                  <label>聚合管道</label>
                  <div style="position:relative">
                    <Textarea v-model="selectedNode.pipeline" :rows="4" placeholder='[{"$match": {"status": "active"}}, {"$group": {"_id": "$dept"}}]' />
                    <Button icon="pi pi-code" size="small" severity="secondary" outlined
                      style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                      @click="toggleVarMenu" />
                    <div v-if="showVarMenu" class="var-dropdown">
                      <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                        <span class="var-group">{{ item.group }}</span>
                        <code>{{ item.label }}</code>
                      </div>
                      <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                      <div class="var-custom" v-if="upstreamOutputFields.length">
                        <div class="var-divider"></div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                        <select v-model="customVarBase" class="var-select">
                          <option value="" disabled>选择上游输出</option>
                          <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                        </select>
                        <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                        <div v-if="customVarPreview" class="var-preview">
                          <code>{{ customVarPreview }}</code>
                          <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-if="selectedNode.operation === 'insertOne'">
                <div class="form-row">
                  <label>文档</label>
                  <div style="position:relative">
                    <Textarea v-model="selectedNode.document" :rows="4" placeholder='{"name": "张三", "age": 25}' />
                    <Button icon="pi pi-code" size="small" severity="secondary" outlined
                      style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                      @click="toggleVarMenu" />
                    <div v-if="showVarMenu" class="var-dropdown">
                      <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                        <span class="var-group">{{ item.group }}</span>
                        <code>{{ item.label }}</code>
                      </div>
                      <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                      <div class="var-custom" v-if="upstreamOutputFields.length">
                        <div class="var-divider"></div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                        <select v-model="customVarBase" class="var-select">
                          <option value="" disabled>选择上游输出</option>
                          <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                        </select>
                        <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                        <div v-if="customVarPreview" class="var-preview">
                          <code>{{ customVarPreview }}</code>
                          <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-if="selectedNode.operation === 'updateOne' || selectedNode.operation === 'updateMany'">
                <div class="form-row">
                  <label>查询条件</label>
                  <div style="position:relative">
                    <Textarea v-model="selectedNode.filter" :rows="2" placeholder='{"status": "pending"}' />
                    <Button icon="pi pi-code" size="small" severity="secondary" outlined
                      style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                      @click="toggleVarMenu" />
                    <div v-if="showVarMenu" class="var-dropdown">
                      <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                        <span class="var-group">{{ item.group }}</span>
                        <code>{{ item.label }}</code>
                      </div>
                      <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                      <div class="var-custom" v-if="upstreamOutputFields.length">
                        <div class="var-divider"></div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                        <select v-model="customVarBase" class="var-select">
                          <option value="" disabled>选择上游输出</option>
                          <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                        </select>
                        <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                        <div v-if="customVarPreview" class="var-preview">
                          <code>{{ customVarPreview }}</code>
                          <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="form-row">
                  <label>更新操作</label>
                  <div style="position:relative">
                    <Textarea v-model="selectedNode.update" :rows="2" placeholder='{"$set": {"status": "done"}}' />
                    <Button icon="pi pi-code" size="small" severity="secondary" outlined
                      style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                      @click="toggleVarMenu" />
                    <div v-if="showVarMenu" class="var-dropdown">
                      <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                        <span class="var-group">{{ item.group }}</span>
                        <code>{{ item.label }}</code>
                      </div>
                      <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                      <div class="var-custom" v-if="upstreamOutputFields.length">
                        <div class="var-divider"></div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                        <select v-model="customVarBase" class="var-select">
                          <option value="" disabled>选择上游输出</option>
                          <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                        </select>
                        <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                        <div v-if="customVarPreview" class="var-preview">
                          <code>{{ customVarPreview }}</code>
                          <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-if="selectedNode.operation === 'deleteOne' || selectedNode.operation === 'deleteMany'">
                <div class="form-row">
                  <label>查询条件</label>
                  <div style="position:relative">
                    <Textarea v-model="selectedNode.filter" :rows="2" placeholder='{"status": "expired"}' />
                    <Button icon="pi pi-code" size="small" severity="secondary" outlined
                      style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                      @click="toggleVarMenu" />
                    <div v-if="showVarMenu" class="var-dropdown">
                      <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                        <span class="var-group">{{ item.group }}</span>
                        <code>{{ item.label }}</code>
                      </div>
                      <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                      <div class="var-custom" v-if="upstreamOutputFields.length">
                        <div class="var-divider"></div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                        <select v-model="customVarBase" class="var-select">
                          <option value="" disabled>选择上游输出</option>
                          <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                        </select>
                        <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                        <div v-if="customVarPreview" class="var-preview">
                          <code>{{ customVarPreview }}</code>
                          <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-if="selectedNode.operation === 'distinct'">
                <div class="form-row">
                  <label>字段名</label>
                  <InputText v-model="selectedNode.fieldName" placeholder="如 status" style="width:100%" />
                </div>
                <div class="form-row">
                  <label>查询条件</label>
                  <div style="position:relative">
                    <Textarea v-model="selectedNode.filter" :rows="2" placeholder='{"type": "A"}' />
                    <Button icon="pi pi-code" size="small" severity="secondary" outlined
                      style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                      @click="toggleVarMenu" />
                    <div v-if="showVarMenu" class="var-dropdown">
                      <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                        <span class="var-group">{{ item.group }}</span>
                        <code>{{ item.label }}</code>
                      </div>
                      <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                      <div class="var-custom" v-if="upstreamOutputFields.length">
                        <div class="var-divider"></div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                        <select v-model="customVarBase" class="var-select">
                          <option value="" disabled>选择上游输出</option>
                          <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                        </select>
                        <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                        <div v-if="customVarPreview" class="var-preview">
                          <code>{{ customVarPreview }}</code>
                          <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </template>
            <template v-if="selectedNode.type === 'IF'">
              <div class="form-row">
                <label>条件表达式</label>
                <div style="position:relative">
                  <Textarea v-model="selectedNode.condition" :rows="3"
                    placeholder="如 {{mongo_01.count}} > 0" />
                  <Button icon="pi pi-code" size="small" severity="secondary" outlined
                    style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                    @click="toggleVarMenu" />
                  <div v-if="showVarMenu" class="var-dropdown">
                    <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                      <span class="var-group">{{ item.group }}</span>
                      <code>{{ item.label }}</code>
                    </div>
                    <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                    <div class="var-custom" v-if="upstreamOutputFields.length">
                      <div class="var-divider"></div>
                      <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                      <select v-model="customVarBase" class="var-select">
                        <option value="" disabled>选择上游输出</option>
                        <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                      </select>
                      <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                      <div v-if="customVarPreview" class="var-preview">
                        <code>{{ customVarPreview }}</code>
                        <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div style="font-size:11px;color:#909399;margin-top:4px">
                  支持: > &lt; >= &lt;= == !=
                </div>
              </div>
            </template>
            <template v-if="selectedNode.type === 'API'">
              <div class="form-row">
                <label>API源</label>
                <Select v-model="selectedNode.apiId" :options="apiSourceOptions" optionLabel="label" optionValue="value"
                        placeholder="选择 API" @before-show="loadApiSources" style="width:100%" />
              </div>
              <div class="form-row">
                <label>请求体</label>
                <div style="position:relative">
                  <Textarea v-model="selectedNode.body" :rows="3" placeholder="支持 {{nodeId.result}}" />
                  <Button icon="pi pi-code" size="small" severity="secondary" outlined
                    style="position:absolute;right:4px;top:4px;min-width:auto;padding:4px 6px"
                    @click="toggleVarMenu" />
                  <div v-if="showVarMenu" class="var-dropdown">
                    <div v-for="item in varMenuItems" :key="item.label" class="var-item" @click="insertVariable(item.label)">
                      <span class="var-group">{{ item.group }}</span>
                      <code>{{ item.label }}</code>
                    </div>
                    <div v-if="!varMenuItems.length" style="padding:8px;color:#999;font-size:12px">无可用变量</div>
                    <div class="var-custom" v-if="upstreamOutputFields.length">
                      <div class="var-divider"></div>
                      <div style="font-size:11px;color:#64748b;margin-bottom:6px">选择输出字段</div>
                      <select v-model="customVarBase" class="var-select">
                        <option value="" disabled>选择上游输出</option>
                        <option v-for="f in upstreamOutputFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                      </select>
                      <input v-if="customVarBase" v-model="customVarPath" placeholder="如 [0].title" class="var-path-input" />
                      <div v-if="customVarPreview" class="var-preview">
                        <code>{{ customVarPreview }}</code>
                        <button class="var-insert-btn" @click="insertCustomVar">插入</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <!-- 入参定义（只读参考） -->
            <template v-if="activeInputDefs.length">
              <div class="param-section">
                <label class="param-title">入参</label>
                <div v-for="p in activeInputDefs" :key="p.name" class="param-row">
                  <span>{{ p.label }}</span>
                  <span class="param-meta">{{ p.name }} <Tag v-if="p.required" severity="danger" style="font-size:10px;padding:1px 4px">必填</Tag></span>
                </div>
              </div>
            </template>
            <!-- 成功条件（断言，可选） -->
            <template v-if="['MYSQL','MONGODB','API'].includes(selectedNode.type)">
              <div class="param-section">
                <label class="param-title">成功条件 <span style="font-weight:400;color:#94a3b8">(可选)</span></label>
                <input v-model="selectedNode.assertCondition" placeholder="如 count > 0 或 {{当前节点出参}} == 1"
                       style="width:100%;padding:5px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px;box-sizing:border-box" />
                <div style="font-size:11px;color:#909399;margin-top:3px">条件不满足时节点标记为失败，后续节点不执行</div>
              </div>
            </template>
            <!-- 出参配置（可编辑） -->
            <div class="param-section">
              <label class="param-title">{{ selectedNode.type === 'START' ? '参数配置' : '出参配置' }}</label>
              <div v-for="(out, idx) in selectedNode.outputs" :key="idx" class="output-mapping-row">
                <input v-model="out.name" placeholder="变量名" class="output-name-input" />
                <input v-model="out.path" :placeholder="selectedNode.type === 'START' ? '常量值，如 hello' : '如 result[0].title'" class="output-path-input" />
                <button class="output-del-btn" @click="removeOutput(idx)" title="删除">×</button>
              </div>
              <button class="output-add-btn" @click="addOutput">{{ selectedNode.type === 'START' ? '+ 添加参数' : '+ 添加出参' }}</button>
              <div v-if="selectedNode.type === 'START'" style="font-size:11px;color:#909399;margin-top:3px">定义常量或默认值，下游通过 &#123;&#123;start_01.变量名&#125;&#125; 引用</div>
            </div>
          </div>
          <Button label="删除节点" icon="pi pi-trash" severity="danger" size="small" outlined
                  @click="removeNode(selectedNode.id)" style="margin-top:10px" />
        </template>
        <template v-else>
          <p style="color:#909399;font-size:13px">点击画布中的节点查看属性</p>
        </template>

        <!-- DSL 预览 -->
        <div v-if="showDsl" style="margin-top:16px">
          <h4 style="margin-bottom:8px">DSL 预览</h4>
          <div class="dsl-preview">{{ dslJson }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Graph } from '@antv/x6'
import { Dnd } from '@antv/x6-plugin-dnd'
import '@antv/x6-plugin-dnd/dist/index.css'
import dagre from 'dagre'
import { taskApi, dbSourceApi, apiSourceApi, versionApi, openApiApi } from '../../api'
import { useToast } from 'primevue/usetoast'
import { cronToText, parseCron, buildCron } from '../../utils/cron'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Tag from 'primevue/tag'
import Message from 'primevue/message'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const taskId = route.params.id ? Number(route.params.id) : null
const isNewVersion = route.query.mode === 'newVersion'

const taskName = ref('')
const taskEnv = ref('DEV')
const openApiLinked = ref(false)
const saving = ref(false)
const showDsl = ref(false)
const canvasRef = ref(null)
const selectedNode = ref(null)
const dbSources = ref([])
const apiSources = ref([])

let graph = null
let dnd = null
let nodeSeq = 0

// ---- 暗黑模式 ----
const isDark = ref(document.documentElement.classList.contains('p-dark'))

const darkObserver = new MutationObserver(() => {
  isDark.value = document.documentElement.classList.contains('p-dark')
})

function applyGraphTheme() {
  if (!graph) return
  if (isDark.value) {
    graph.drawBackground({ color: '#0f172a' })
    graph.setGrid({ visible: true, args: { color: '#334155', thickness: 1 } })
    // 更新所有普通边的颜色
    graph.getEdges().forEach(edge => {
      const srcData = edge.getSourceCell()?.getData()
      const tgtData = edge.getTargetCell()?.getData()
      const srcId = srcData?.id
      const tgtId = tgtData?.id
      const edgeData = edges.value.find(e => e.source === srcId && e.target === tgtId)
      if (edgeData?.label === 'true' || edgeData?.label === 'false') return
      edge.attr('line/stroke', '#64748b')
    })
  } else {
    graph.drawBackground({ color: '#fafafa' })
    graph.setGrid({ visible: true, args: { color: '#e2e8f0', thickness: 1 } })
    graph.getEdges().forEach(edge => {
      const srcData = edge.getSourceCell()?.getData()
      const tgtData = edge.getTargetCell()?.getData()
      const srcId = srcData?.id
      const tgtId = tgtData?.id
      const edgeData = edges.value.find(e => e.source === srcId && e.target === tgtId)
      if (edgeData?.label === 'true' || edgeData?.label === 'false') return
      edge.attr('line/stroke', '#a2b1c3')
    })
  }
}

watch(isDark, () => applyGraphTheme())

// ---- 节点类型元数据 ----
const nodeTypeDefsMap = ref({})
const sysVars = []

async function loadNodeTypeDefs() {
  try {
    const res = await taskApi.nodeTypeDefs()
    const map = {}
    for (const def of (res.data || [])) map[def.type] = def
    nodeTypeDefsMap.value = map
  } catch {}
}

// 根据选中节点和操作类型动态获取入参/出参定义
const activeInputDefs = computed(() => {
  if (!selectedNode.value) return []
  const typeDef = nodeTypeDefsMap.value[selectedNode.value.type]
  if (!typeDef) return []
  if (selectedNode.value.operation && typeDef.operationDefs?.[selectedNode.value.operation]) {
    return typeDef.operationDefs[selectedNode.value.operation].inputDefs
  }
  return typeDef.inputDefs
})

const activeOutputDefs = computed(() => {
  if (!selectedNode.value) return []
  const typeDef = nodeTypeDefsMap.value[selectedNode.value.type]
  if (!typeDef) return []
  if (selectedNode.value.operation && typeDef.operationDefs?.[selectedNode.value.operation]) {
    return typeDef.operationDefs[selectedNode.value.operation].outputDefs
  }
  return typeDef.outputDefs
})

// ---- 变量下拉 ----
const showVarMenu = ref(false)

// 点击空白区域关闭变量下拉
function closeVarMenuOnClickOutside(e) {
  if (showVarMenu.value && !e.target.closest('.var-dropdown') && !e.target.closest('.p-button')) {
    showVarMenu.value = false
  }
}
const varMenuItems = computed(() => {
  if (!selectedNode.value) return []
  const items = []
  const upstream = getUpstreamNodes(selectedNode.value.id)
  for (const upId of upstream) {
    const upNode = nodes.value.find(n => n.id === upId)
    if (!upNode) continue
    // 出参（优先用户配置，否则用后端默认）
    if (upNode.outputs && upNode.outputs.length) {
      for (const out of upNode.outputs) {
        if (out.name) {
          items.push({ label: `{{${upId}.${out.name}}}`, group: `${upNode.type}(${upId})` })
        }
      }
    } else {
      const typeDef = nodeTypeDefsMap.value[upNode.type]
      let outputs
      if (upNode.operation && typeDef?.operationDefs?.[upNode.operation]) {
        outputs = typeDef.operationDefs[upNode.operation].outputDefs
      } else {
        outputs = typeDef?.outputDefs || [{ name: 'result', label: '结果' }]
      }
      for (const out of outputs) {
        items.push({ label: `{{${upId}.${out.name}}}`, group: `${upNode.type}(${upId})` })
      }
    }
  }
  // 外部参数
  items.push({ label: '{{params.xxx}}', group: '外部参数（手动填写key）' })
  return items
})

// ---- 自定义变量路径输入 ----
const customVarBase = ref('')
const customVarPath = ref('')

const customVarPreview = computed(() => {
  if (!customVarBase.value) return ''
  const path = customVarPath.value.trim()
  return path ? `{{${customVarBase.value}.${path}}}` : `{{${customVarBase.value}}}`
})

const upstreamOutputFields = computed(() => {
  if (!selectedNode.value) return []
  const fields = []
  const upstream = getUpstreamNodes(selectedNode.value.id)
  for (const upId of upstream) {
    const upNode = nodes.value.find(n => n.id === upId)
    if (!upNode) continue
    const typeDef = nodeTypeDefsMap.value[upNode.type]
    let outputs
    if (upNode.operation && typeDef?.operationDefs?.[upNode.operation]) {
      outputs = typeDef.operationDefs[upNode.operation].outputDefs
    } else {
      outputs = typeDef?.outputDefs || [{ name: 'result', label: '结果' }]
    }
    for (const out of outputs) {
      fields.push({ value: `${upId}.${out.name}`, label: `${upId} → ${out.name} (${out.label})`, type: out.type })
    }
  }
  return fields
})

function getUpstreamNodes(nodeId) {
  const visited = new Set()
  const queue = [nodeId]
  while (queue.length) {
    const cur = queue.shift()
    for (const e of edges.value) {
      if (e.target === cur && !visited.has(e.source)) {
        visited.add(e.source)
        queue.push(e.source)
      }
    }
  }
  return [...visited]
}

function toggleVarMenu(e) {
  e.stopPropagation()
  showVarMenu.value = !showVarMenu.value
  if (showVarMenu.value) {
    nextTick(() => {
      const dropdown = document.querySelector('.var-dropdown')
      if (dropdown) {
        const btn = e.target.closest('[data-var-btn]') || e.target
        const rect = btn.getBoundingClientRect()
        dropdown.style.top = (rect.bottom + 4) + 'px'
        dropdown.style.left = Math.max(8, rect.left - 260) + 'px'
      }
    })
  }
}

function insertVariable(varName) {
  if (!selectedNode.value) return
  let field
  if (selectedNode.value.type === 'IF') field = 'condition'
  else if (selectedNode.value.type === 'API') field = 'body'
  else if (selectedNode.value.type === 'MONGODB') {
    const op = selectedNode.value.operation
    if (op === 'aggregate') field = 'pipeline'
    else if (op === 'insertOne') field = 'document'
    else if (op === 'updateOne' || op === 'updateMany') field = 'update'
    else field = 'filter'
  }
  if (!field) field = 'sql'
  const current = selectedNode.value[field] || ''
  selectedNode.value[field] = current + varName
  showVarMenu.value = false
}

function insertCustomVar() {
  if (!customVarPreview.value) return
  insertVariable(customVarPreview.value)
  customVarBase.value = ''
  customVarPath.value = ''
}

// ---- 出参配置 ----
function addOutput() {
  if (!selectedNode.value) return
  if (!selectedNode.value.outputs) selectedNode.value.outputs = []
  selectedNode.value.outputs.push({ name: '', path: '' })
}

function removeOutput(idx) {
  if (!selectedNode.value?.outputs) return
  selectedNode.value.outputs.splice(idx, 1)
}

/** 初始化出参：如果 outputs 为空，用后端默认出参预填 */
function initOutputs(node) {
  if (!node || (node.outputs && node.outputs.length > 0)) return
  // START 节点不自动预填出参，用户自己定义参数
  if (node.type === 'START') {
    node.outputs = []
    return
  }
  const typeDef = nodeTypeDefsMap.value[node.type]
  if (!typeDef) return
  let defs
  if (node.operation && typeDef.operationDefs?.[node.operation]) {
    defs = typeDef.operationDefs[node.operation].outputDefs
  } else {
    defs = typeDef.outputDefs
  }
  if (defs && defs.length) {
    node.outputs = defs.map(d => ({ name: d.name, path: d.name }))
  } else {
    node.outputs = []
  }
}

function nextNodeId(type) {
  nodeSeq++
  return `${type.toLowerCase()}_${String(nodeSeq).padStart(2, '0')}`
}

const cronTypeOptions = [
  { label: '不调度', value: 'none' },
  { label: '每隔N分钟', value: 'minute' },
  { label: '每隔N小时', value: 'hour' },
  { label: '每天', value: 'day' },
  { label: '每周', value: 'week' },
  { label: '每月', value: 'month' }
]

const weekdayOptions = ['一', '二', '三', '四', '五', '六', '日']
const mongoOperations = [
  { label: '查询 (find)', value: 'find' },
  { label: '查询单个 (findOne)', value: 'findOne' },
  { label: '计数 (countDocuments)', value: 'countDocuments' },
  { label: '聚合 (aggregate)', value: 'aggregate' },
  { label: '插入 (insertOne)', value: 'insertOne' },
  { label: '更新单个 (updateOne)', value: 'updateOne' },
  { label: '更新多个 (updateMany)', value: 'updateMany' },
  { label: '删除单个 (deleteOne)', value: 'deleteOne' },
  { label: '删除多个 (deleteMany)', value: 'deleteMany' },
  { label: '去重 (distinct)', value: 'distinct' }
]
const cronForm = ref({ type: 'none' })

const cronPreview = computed(() => {
  const cron = buildCron(cronForm.value)
  return cron ? cronToText(cron) : '-'
})

const dbSourceOptions = computed(() =>
  dbSources.value.map(db => ({
    label: db.name,
    value: db.id,
    dbType: db.dbType
  }))
)

const mongoSourceOptions = computed(() =>
  dbSourceOptions.value.filter(db => db.dbType === 'MONGODB')
)

const mysqlSourceOptions = computed(() =>
  dbSourceOptions.value.filter(db => db.dbType === 'MYSQL')
)

function dbSourceLabel(id) {
  const db = dbSourceOptions.value.find(o => o.value === id)
  return db ? `${db.label} [${db.dbType === 'MYSQL' ? 'MySql' : db.dbType === 'MONGODB' ? 'MongoDB' : db.dbType}]` : ''
}

function getDbDbType(node) {
  if (!node.dbId) return null
  const db = dbSourceOptions.value.find(o => o.value === node.dbId)
  return db ? db.dbType : null
}

function getDbType(node) {
  return getDbDbType(node)
}

function getDbSeverity(node) {
  const dbType = getDbDbType(node)
  if (dbType === 'MYSQL') return 'warn'
  if (dbType === 'MONGODB') return 'success'
  return 'info'
}

function getDbLabel(node) {
  const dbType = getDbDbType(node)
  if (dbType === 'MYSQL') return 'MySql'
  if (dbType === 'MONGODB') return 'MongoDB'
  return '数据库'
}

const apiSourceOptions = computed(() =>
  apiSources.value.map(a => ({ label: a.name, value: a.id }))
)

function onCronTypeChange(e) {
  const type = e?.value ?? e
  if (type === 'minute' || type === 'hour') {
    cronForm.value = { type, interval: type === 'minute' ? 5 : 2 }
  } else if (type === 'day') {
    cronForm.value = { type, time: '08:00' }
  } else if (type === 'week') {
    cronForm.value = { type, weekdays: ['一', '二', '三', '四', '五'], time: '09:00' }
  } else if (type === 'month') {
    cronForm.value = { type, day: 1, time: '08:00' }
  } else {
    cronForm.value = { type: 'none' }
  }
}

const nodeTypes = [
  { type: 'START', label: 'START', color: '#409eff' },
  { type: 'MYSQL', label: 'MySQL', color: '#e6a23c' },
  { type: 'MONGODB', label: 'MongoDB', color: '#67c23a' },
  { type: 'IF', label: 'IF', color: '#8b5cf6' },
  { type: 'API', label: 'API', color: '#e6a23c' },
  { type: 'END', label: 'END', color: '#f56c6c' }
]

const nodes = ref([])
const edges = ref([])

const dslJson = computed(() => {
  return JSON.stringify({ nodes: nodes.value, edges: edges.value }, null, 2)
})

function getNodeColor(type) {
  const m = { START: '#409eff', MYSQL: '#e6a23c', MONGODB: '#67c23a', IF: '#8b5cf6', API: '#e6a23c', END: '#f56c6c' }
  return m[type] || '#909399'
}

function initGraph() {
  graph = new Graph({
    container: canvasRef.value,
    grid: { visible: true, args: { color: isDark.value ? '#334155' : '#e2e8f0', thickness: 1 } },
    background: { color: isDark.value ? '#0f172a' : '#fafafa' },
    panning: true,
    mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
    connecting: {
      sourceAnchor: 'bottom',
      targetAnchor: 'top',
      connectionPoint: 'anchor',
      allowBlank: false,
      allowLoop: false,
      allowMulti: true,
      snap: { radius: 30 },
      validateConnection({ sourceCell, targetCell }) {
        const sd = sourceCell?.getData()
        const td = targetCell?.getData()
        if (!sd || !td || sd.id === td.id) return false
        if (sd.type === 'END') return false
        if (td.type === 'START') return false
        // IF 节点最多 2 条出边（true / false）
        if (sd.type === 'IF') {
          const count = edges.value.filter(e => e.source === sd.id).length
          if (count >= 2) return false
        }
        return true
      },
      router: 'normal',
      connector: { name: 'rounded', args: { radius: 8 } },
      createEdge() {
        return graph.createEdge({ shape: 'edge', attrs: { line: { stroke: isDark.value ? '#64748b' : '#a2b1c3', strokeWidth: 2, targetMarker: { name: 'block', width: 12, height: 8 } } } })
      }
    },
    highlighting: {
      magnetAdsorbed: { name: 'stroke', args: { attrs: { fill: '#5F95FF', stroke: '#5F95FF' } } }
    }
  })

  graph.on('node:click', ({ node }) => {
    const data = node.getData()
    if (data) {
      initOutputs(data)
      selectedNode.value = data
    }
  })
  graph.on('blank:click', () => { selectedNode.value = null })

  graph.on('edge:connected', ({ edge }) => {
    const source = edge.getSourceCell()?.getData()
    const target = edge.getTargetCell()?.getData()
    if (source && target) {
      edges.value = edges.value.filter(e => !(e.source === source.id && e.target === target.id))
      const edgeData = { source: source.id, target: target.id }
      // IF 节点自动标记 true / false 分支
      if (source.type === 'IF') {
        const existingCount = edges.value.filter(e => e.source === source.id).length
        edgeData.label = existingCount === 0 ? 'true' : 'false'
      }
      // 设置 IF 边颜色
      if (edgeData.label) {
        const isTrue = edgeData.label === 'true'
        edge.attr('line/stroke', isTrue ? '#22c55e' : '#ef4444')
        edge.appendLabel({ attrs: { label: { text: isTrue ? '是' : '否', fill: isTrue ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: 600 } }, position: 0.5 })
      }
      edges.value.push(edgeData)
    }
  })

  graph.on('edge:removed', ({ edge }) => {
    const source = edge.getSourceCell()?.getData()
    const target = edge.getTargetCell()?.getData()
    if (source && target) {
      edges.value = edges.value.filter(e => !(e.source === source.id && e.target === target.id))
    }
  })

  dnd = new Dnd({ target: graph })

  graph.on('node:added', ({ node }) => {
    const data = node.getData()
    if (data && !nodes.value.find(n => n.id === data.id)) {
      nodes.value.push(data)
    }
  })
}

function addNodeToGraph(type, x, y, data = {}) {
  if (!graph) return
  const id = data.id || nextNodeId(type)
  const nodeData = { id, type, outputs: [], ...data }
  if (!nodeData.id) nodeData.id = id

  if (!nodes.value.find(n => n.id === id)) {
    nodes.value.push(nodeData)
  }

  graph.addNode({
    x, y, width: 140, height: 44,
    shape: 'rect',
    attrs: {
      body: { fill: getNodeColor(type), stroke: 'transparent', rx: 6, ry: 6, magnet: true },
      label: { fill: '#fff', fontSize: 13, fontWeight: 500, text: (nodeTypes.find(n => n.type === type) || {}).label || type }
    },
    data: nodeData
  })
  return nodeData
}

function removeNode(nodeId) {
  if (!graph) return
  const cell = graph.getNodes().find(n => n.getData()?.id === nodeId)
  if (cell) graph.removeCell(cell)
  nodes.value = nodes.value.filter(n => n.id !== nodeId)
  edges.value = edges.value.filter(e => e.source !== nodeId && e.target !== nodeId)
  selectedNode.value = null
}

function autoLayout() {
  if (!graph) return
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 })

  const graphNodes = graph.getNodes()
  const graphEdges = graph.getEdges()

  graphNodes.forEach(node => {
    const data = node.getData()
    g.setNode(data.id, { width: 140, height: 44 })
  })

  graphEdges.forEach(edge => {
    const sourceData = edge.getSourceCell()?.getData()
    const targetData = edge.getTargetCell()?.getData()
    if (sourceData && targetData) {
      g.setEdge(sourceData.id, targetData.id)
    }
  })

  dagre.layout(g)

  g.nodes().forEach(id => {
    const nodeData = g.node(id)
    const cell = graphNodes.find(n => n.getData()?.id === id)
    if (cell && nodeData) {
      cell.position(nodeData.x - 70, nodeData.y - 22)
    }
  })
}

function startDrag(nodeType, e) {
  e.preventDefault()
  if (!graph || !dnd) return
  const id = nextNodeId(nodeType.type)
  const nodeData = { id, type: nodeType.type, outputs: [] }

  const node = graph.createNode({
    width: 140, height: 44,
    shape: 'rect',
    attrs: {
      body: { fill: getNodeColor(nodeType.type), stroke: 'transparent', rx: 6, ry: 6, magnet: true },
      label: { fill: '#fff', fontSize: 13, fontWeight: 500, text: nodeType.label }
    },
    data: nodeData
  })
  dnd.start(node, e)
}

async function loadDbSources() {
  if (dbSources.value.length) return
  try { dbSources.value = (await dbSourceApi.list(taskEnv.value)).data || [] } catch {}
}

async function loadApiSources() {
  if (apiSources.value.length) return
  try { apiSources.value = (await apiSourceApi.list(taskEnv.value)).data || [] } catch {}
}

function hasCycle(edges, nodeIds) {
  const adj = {}
  nodeIds.forEach(id => adj[id] = [])
  edges.forEach(e => { if (adj[e.source]) adj[e.source].push(e.target) })

  const visited = new Set()
  const onStack = new Set()

  function dfs(node) {
    visited.add(node)
    onStack.add(node)
    for (const next of adj[node]) {
      if (!visited.has(next)) {
        if (dfs(next)) return true
      } else if (onStack.has(next)) {
        return true
      }
    }
    onStack.delete(node)
    return false
  }

  for (const id of nodeIds) {
    if (!visited.has(id) && dfs(id)) return true
  }
  return false
}

async function handleSave() {
  if (!taskName.value) {
    toast.add({ severity: 'warn', summary: '提示', detail: '请输入任务名称', life: 3000 })
    return
  }
  const nodeIds = nodes.value.map(n => n.id)
  if (hasCycle(edges.value, nodeIds)) {
    toast.add({ severity: 'error', summary: '错误', detail: '连线存在环路，DAG 不允许出现环，请检查连线', life: 3000 })
    return
  }
  saving.value = true
  try {
    const env = taskId ? taskEnv.value : 'DEV'
    const nodesWithPos = nodes.value.map(n => {
      const cell = graph.getNodes().find(c => c.getData()?.id === n.id)
      const pos = cell ? cell.getPosition() : {}
      return { ...n, x: pos.x, y: pos.y }
    })
    const dsl = JSON.stringify({ nodes: nodesWithPos, edges: edges.value })
    const cron = buildCron(cronForm.value)
    if (isNewVersion) {
      await versionApi.create(taskId, dsl)
    } else if (taskId) {
      await taskApi.update({ id: taskId, name: taskName.value, env, dslContent: dsl, cron })
    } else {
      await taskApi.create({ name: taskName.value, env: 'DEV', dslContent: dsl, cron })
    }
    toast.add({ severity: 'success', summary: '成功', detail: isNewVersion ? '新版本创建成功' : '保存成功', life: 3000 })
    router.back()
  } finally { saving.value = false }
}

watch(selectedNode, (val) => {
  if (!val) return
  const idx = nodes.value.findIndex(n => n.id === val.id)
  if (idx >= 0) nodes.value[idx] = { ...val }
  // 更新画布节点标签和颜色（仅 MYSQL 类型需要根据数据源类型动态变化）
  if (val.type === 'MYSQL' && graph) {
    const cell = graph.getNodes().find(n => n.getData()?.id === val.id)
    if (cell) {
      const dbType = getDbDbType(val)
      const defaultLabel = (nodeTypes.find(n => n.type === 'MYSQL') || {}).label || 'MySQL'
      const label = dbType === 'MONGODB' ? 'MongoDB' : defaultLabel
      const color = dbType === 'MONGODB' ? '#67c23a' : '#e6a23c'
      cell.attr('label/text', label)
      cell.attr('body/fill', color)
    }
  }
}, { deep: true })

onMounted(async () => {
  initGraph()
  loadNodeTypeDefs()
  loadTask()
  document.addEventListener('click', closeVarMenuOnClickOutside)
  darkObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

async function loadTask() {
  if (!taskId) return
  try {
    // 检查是否被开放平台关联
    const linkRes = await openApiApi.isLinked(taskId)
    openApiLinked.value = linkRes.data === true

    const res = await taskApi.getById(taskId)
    const task = res.data
    taskName.value = task.name
    taskEnv.value = task.env
    if (isNewVersion) return
    cronForm.value = task.cron ? parseCron(task.cron) : { type: 'none' }
    const dsl = JSON.parse(task.dslContent || '{}')
    const dslNodes = dsl.nodes || []
    const dslEdges = dsl.edges || []
    dslNodes.forEach((n, i) => {
      const x = (n.x !== undefined && n.x !== null) ? n.x : 80 + (i % 4) * 200
      const y = (n.y !== undefined && n.y !== null) ? n.y : 60 + Math.floor(i / 4) * 100
      // 从已有节点 id 中提取最大序号，防止新增节点 id 冲突
      const match = n.id?.match(/_(\d+)$/)
      if (match) nodeSeq = Math.max(nodeSeq, parseInt(match[1]))
      const clean = { id: n.id, type: n.type }
      if (n.x !== undefined) clean.x = n.x
      if (n.y !== undefined) clean.y = n.y
      if (n.dbId !== undefined) clean.dbId = n.dbId
      if (n.sql !== undefined) clean.sql = n.sql
      if (n.apiId !== undefined) clean.apiId = n.apiId
      if (n.body !== undefined) clean.body = n.body
      // MongoDB fields
      if (n.collection !== undefined) clean.collection = n.collection
      if (n.operation !== undefined) clean.operation = n.operation
      if (n.filter !== undefined) clean.filter = n.filter
      if (n.projection !== undefined) clean.projection = n.projection
      if (n.pipeline !== undefined) clean.pipeline = n.pipeline
      if (n.document !== undefined) clean.document = n.document
      if (n.update !== undefined) clean.update = n.update
      if (n.fieldName !== undefined) clean.fieldName = n.fieldName
      // IF 节点条件
      if (n.condition !== undefined) clean.condition = n.condition
      // 断言条件
      if (n.assertCondition !== undefined) clean.assertCondition = n.assertCondition
      // 用户自定义出参
      if (n.outputs !== undefined) clean.outputs = n.outputs
      addNodeToGraph(n.type, x, y, clean)
    })
    edges.value = dslEdges.map(e => {
      const edge = { source: e.source, target: e.target }
      if (e.label) edge.label = e.label
      return edge
    })
    // 预加载数据源列表，确保点击节点时 Select 能正确回显
    if (dslNodes.some(n => n.type === 'MYSQL' || n.type === 'MONGODB')) loadDbSources()
    if (dslNodes.some(n => n.type === 'API')) loadApiSources()
    await nextTick()
    dslEdges.forEach(e => {
      const srcCell = graph.getNodes().find(n => n.getData()?.id === e.source)
      const tgtCell = graph.getNodes().find(n => n.getData()?.id === e.target)
      if (srcCell && tgtCell) {
        const isIfEdge = e.label === 'true' || e.label === 'false'
        const stroke = isIfEdge ? (e.label === 'true' ? '#22c55e' : '#ef4444') : (isDark.value ? '#64748b' : '#a2b1c3')
        const edgeConfig = {
          source: srcCell, target: tgtCell,
          attrs: { line: { stroke, strokeWidth: 2, targetMarker: { name: 'block', width: 12, height: 8 } } }
        }
        const addedEdge = graph.addEdge(edgeConfig)
        if (isIfEdge) {
          addedEdge.appendLabel({ attrs: { label: { text: e.label === 'true' ? '是' : '否', fill: e.label === 'true' ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: 600 } }, position: 0.5 })
        }
      }
    })
  } catch (e) { console.error(e) }
}
</script>

<style scoped>
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
.form-row > div { width: 100%; }
.form-row :deep(textarea),
.form-row :deep(input) {
  width: 100%;
  box-sizing: border-box;
}
.form-row label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}
/* ---- 变量下拉 ---- */
.var-dropdown {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-height: 320px;
  overflow-y: auto;
  width: 320px;
}
.var-item {
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  border-bottom: 1px solid #f1f5f9;
}
.var-item:hover { background: #eff6ff; }
.var-item:last-child { border-bottom: none; }
.var-group { color: #64748b; font-size: 11px; }
.var-item code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 11px; color: #3b82f6; }
.var-divider { height: 1px; background: #e2e8f0; margin: 8px 0; }
.var-custom { padding: 0 10px 10px; }
.var-select {
  width: 100%; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px;
  font-size: 12px; background: #fff; color: #374151; margin-bottom: 6px; box-sizing: border-box;
}
.var-path-input {
  width: 100%; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px;
  font-size: 12px; margin-bottom: 6px; box-sizing: border-box;
}
.var-preview {
  display: flex; align-items: center; gap: 6px; margin-top: 4px;
}
.var-preview code {
  flex: 1; background: #eff6ff; padding: 4px 8px; border-radius: 4px;
  font-size: 11px; color: #3b82f6; word-break: break-all;
}
.var-insert-btn {
  padding: 4px 10px; background: #3b82f6; color: #fff; border: none;
  border-radius: 4px; font-size: 12px; cursor: pointer; white-space: nowrap;
}
.var-insert-btn:hover { background: #2563eb; }
/* ---- 入参/出参定义 ---- */
.param-section { margin-top: 10px; }
.param-title { font-size: 12px; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px; }
.param-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 12px; }
.param-meta { color: #94a3b8; display: flex; align-items: center; gap: 4px; }
.param-code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 11px; color: #3b82f6; }
.param-empty { font-size: 12px; color: #94a3b8; }
/* ---- 自定义出参编辑 ---- */
.output-mapping-row {
  display: flex; gap: 4px; align-items: center; margin-bottom: 6px;
}
.output-name-input {
  width: 80px; padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;
}
.output-path-input {
  flex: 1; padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px;
}
.output-del-btn {
  width: 24px; height: 24px; border: none; background: none; cursor: pointer;
  font-size: 16px; color: #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center;
}
.output-del-btn:hover { color: #ef4444; background: #fef2f2; }
.output-add-btn {
  width: 100%; padding: 6px; border: 1px dashed #cbd5e1; background: none;
  border-radius: 4px; cursor: pointer; font-size: 12px; color: #64748b;
}
.output-add-btn:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
/* ---- 组件内暗黑模式 ---- */
:global(html.p-dark) .form-row label {
  color: #e2e8f0;
}
:global(html.p-dark) .param-title {
  color: #94a3b8;
}
:global(html.p-dark) .param-row {
  color: #cbd5e1;
}
:global(html.p-dark) .var-dropdown {
  background: #1e293b;
  border-color: #334155;
}
:global(html.p-dark) .var-item {
  color: #e2e8f0;
  border-bottom-color: #3b3b5c;
}
:global(html.p-dark) .var-item:hover {
  background: #283548;
}
:global(html.p-dark) .var-item code {
  background: #3b3b5c;
  color: #93c5fd;
}
:global(html.p-dark) .var-group {
  color: #94a3b8;
}
:global(html.p-dark) .var-select,
:global(html.p-dark) .var-path-input {
  background: #283548;
  border-color: #334155;
  color: #e2e8f0;
}
:global(html.p-dark) .var-preview code {
  background: #283548;
  color: #93c5fd;
}
:global(html.p-dark) .output-name-input,
:global(html.p-dark) .output-path-input {
  background: #283548;
  border-color: #334155;
  color: #e2e8f0;
}
:global(html.p-dark) .output-add-btn {
  border-color: #475569;
  color: #94a3b8;
}
:global(html.p-dark) .output-add-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #0f172a;
}
:global(html.p-dark) .output-del-btn {
  color: #64748b;
}
:global(html.p-dark) .output-del-btn:hover {
  color: #ef4444;
  background: #283548;
}
:global(html.p-dark) .dsl-preview {
  background: #0f172a;
  border-color: #334155;
  color: #94a3b8;
}
</style>

<style>
/* ---- DAG 画布暗黑模式（覆盖 global.css）---- */
html.p-dark .dag-container {
  background: #0f172a;
  border-color: #334155;
}
html.p-dark .dag-sidebar {
  background: #1e293b;
  border-color: #334155;
}
html.p-dark .dag-sidebar h4 {
  color: #e2e8f0;
}
html.p-dark .dag-sidebar p {
  color: #94a3b8;
}
html.p-dark .node-item {
  color: #e2e8f0;
  background: #283548;
  border-color: #334155;
}
html.p-dark .node-item:hover {
  background: #334155;
}
html.p-dark .dag-canvas {
  border-color: #334155;
  background: #0f172a;
}
html.p-dark .dag-right-panel {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}
html.p-dark .dag-right-panel h4 {
  color: #e2e8f0;
}
</style>
