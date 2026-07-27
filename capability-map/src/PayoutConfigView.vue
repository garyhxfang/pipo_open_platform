<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { merchantTypeOptions, type MerchantType } from './capabilityData'
import {
  loadPayoutConfig,
  payoutPrimaryOptions,
  payoutProductOptions,
  savePayoutConfig,
  type PayoutCapabilityRecord,
  type PayoutConfigState,
  type PayoutField,
  type PrimaryProductCategory,
  type SecondaryProductCategory
} from './payoutConfigData'

const emit = defineEmits<{
  back: []
  saved: []
  switchBusiness: [business: 'collection' | 'payout']
}>()

function cloneConfig(value: PayoutConfigState) {
  return JSON.parse(JSON.stringify(value)) as PayoutConfigState
}

const config = ref(loadPayoutConfig())
const savedConfig = ref(cloneConfig(config.value))
const currentMode = ref<'capability' | 'fields'>('capability')
const primaryFilter = ref<'all' | PrimaryProductCategory>('all')
const productFilter = ref<'all' | SecondaryProductCategory>('all')
const merchantTypeFilter = ref<'all' | MerchantType>('all')
const editingRecord = ref<PayoutCapabilityRecord>()
const editorMode = ref<'create' | 'edit' | 'copy'>('create')
const editorError = ref('')
const selectedFieldId = ref(config.value.fields[0]?.id ?? '')
const newFieldLabel = ref('')
const newFieldDescription = ref('')
const newOptionLabel = ref('')
const newOptionDescription = ref('')
const savedMessage = ref('')
const requiredFieldIds = ['merchantType', 'payeeUserType', 'initiationMethod', 'integrationForm']

function reloadConfig() {
  config.value = loadPayoutConfig()
  savedConfig.value = cloneConfig(config.value)
  selectedFieldId.value = config.value.fields[0]?.id ?? ''
}

onMounted(reloadConfig)

const selectedField = computed(() => config.value.fields.find((field) => field.id === selectedFieldId.value))
const changed = computed(() => JSON.stringify(config.value) !== JSON.stringify(savedConfig.value))
const visibleRecords = computed(() =>
  config.value.records
    .filter((record) => {
      const product = payoutProductOptions.find((item) => item.id === record.product)
      return primaryFilter.value === 'all' || product?.primary === primaryFilter.value
    })
    .filter((record) => productFilter.value === 'all' || record.product === productFilter.value)
    .filter((record) => merchantTypeFilter.value === 'all' || record.values.merchantType === merchantTypeFilter.value)
)
const filteredProducts = computed(() =>
  payoutProductOptions.filter(
    (product) => primaryFilter.value === 'all' || product.primary === primaryFilter.value
  )
)
const requiredFields = computed(() => config.value.fields.filter((field) => requiredFieldIds.includes(field.id)))
const canSaveRecord = computed(() => {
  if (!editingRecord.value?.product) return false
  return requiredFields.value.every((field) => Boolean(editingRecord.value?.values[field.id]))
})

function productLabel(productId: SecondaryProductCategory) {
  return payoutProductOptions.find((product) => product.id === productId)?.label ?? productId
}

function primaryLabel(productId: SecondaryProductCategory) {
  const primary = payoutProductOptions.find((product) => product.id === productId)?.primary
  return payoutPrimaryOptions.find((option) => option.value === primary)?.label ?? ''
}

function optionLabels(record: PayoutCapabilityRecord, field: PayoutField) {
  const selected = record.values[field.id]
  return field.options.find((option) => option.id === selected)?.label ?? '-'
}

function isRequiredField(fieldId: string) {
  return requiredFieldIds.includes(fieldId)
}

function isOptionalClearableField(fieldId: string) {
  return fieldId === 'supportedClient'
}

function generatedRecordName(record: PayoutCapabilityRecord) {
  const keyLabels = requiredFields.value
    .map((field) => optionLabels(record, field))
    .filter((label) => label && label !== '-')
    .join(' / ')
  return `${productLabel(record.product)}${keyLabels ? ` - ${keyLabels}` : ''}`
}

function recordSignature(record: PayoutCapabilityRecord) {
  return [
    record.product,
    ...config.value.fields.map((field) => record.values[field.id] || '')
  ].join('|')
}

function findDuplicateRecord(record: PayoutCapabilityRecord) {
  const signature = recordSignature(record)
  return config.value.records.find(
    (item) => item.id !== record.id && recordSignature(item) === signature
  )
}

function createRecord() {
  const product =
    productFilter.value !== 'all'
      ? productFilter.value
      : filteredProducts.value[0]?.id ?? 'primaryMerchantWithdrawal'
  editorMode.value = 'create'
  editorError.value = ''
  editingRecord.value = {
    id: '',
    product,
    name: '',
    values: Object.fromEntries(config.value.fields.map((field) => [field.id, '']))
  }
}

function editRecord(record: PayoutCapabilityRecord) {
  editorMode.value = 'edit'
  editorError.value = ''
  editingRecord.value = JSON.parse(JSON.stringify(record)) as PayoutCapabilityRecord
}

function copyRecord(record: PayoutCapabilityRecord) {
  const duplicated = JSON.parse(JSON.stringify(record)) as PayoutCapabilityRecord
  editorMode.value = 'copy'
  editorError.value = ''
  editingRecord.value = {
    ...duplicated,
    id: '',
    name: duplicated.name ? `${duplicated.name} 副本` : ''
  }
}

function closeRecordEditor() {
  editingRecord.value = undefined
  editorError.value = ''
}

function toggleRecordOption(fieldId: string, optionId: string) {
  if (!editingRecord.value) return
  editingRecord.value.values[fieldId] = optionId
  editorError.value = ''
}

function clearRecordOption(fieldId: string) {
  if (!editingRecord.value) return
  editingRecord.value.values[fieldId] = ''
  editorError.value = ''
}

function updateRecordProduct(productId: SecondaryProductCategory) {
  if (!editingRecord.value) return
  editingRecord.value.product = productId
  editorError.value = ''
}

function saveRecord() {
  if (!editingRecord.value || !canSaveRecord.value) return
  const duplicate = findDuplicateRecord(editingRecord.value)
  if (duplicate) {
    editorError.value = `该配置已存在：${duplicate.name || generatedRecordName(duplicate)}`
    return
  }
  const record = {
    ...editingRecord.value,
    id: editingRecord.value.id || `config-${Date.now()}`,
    name: editingRecord.value.name.trim() || generatedRecordName(editingRecord.value)
  }
  const index = config.value.records.findIndex((item) => item.id === record.id)
  if (index >= 0) config.value.records[index] = record
  else config.value.records.push(record)
  closeRecordEditor()
  persistConfig('配置已保存')
}

function removeRecord(recordId: string) {
  config.value.records = config.value.records.filter((record) => record.id !== recordId)
  if (editingRecord.value?.id === recordId) editingRecord.value = undefined
  persistConfig('配置已删除')
}

function addField() {
  const label = newFieldLabel.value.trim()
  if (!label) return
  const id = `custom-${Date.now()}`
  config.value.fields.push({
    id,
    label,
    description: newFieldDescription.value.trim(),
    core: false,
    options: []
  })
  for (const record of config.value.records) record.values[id] = ''
  selectedFieldId.value = id
  newFieldLabel.value = ''
  newFieldDescription.value = ''
}

function addOption() {
  const field = selectedField.value
  const label = newOptionLabel.value.trim()
  if (!field || !label) return
  field.options.push({
    id: `${field.id}-${Date.now()}`,
    label,
    description: newOptionDescription.value.trim()
  })
  newOptionLabel.value = ''
  newOptionDescription.value = ''
}

function removeOption(field: PayoutField, optionId: string) {
  field.options = field.options.filter((option) => option.id !== optionId)
  for (const record of config.value.records) {
    if (record.values[field.id] === optionId) record.values[field.id] = ''
  }
}

function removeField(fieldId: string) {
  const field = config.value.fields.find((item) => item.id === fieldId)
  if (!field || field.core) return
  config.value.fields = config.value.fields.filter((item) => item.id !== fieldId)
  for (const record of config.value.records) delete record.values[fieldId]
  selectedFieldId.value = config.value.fields[0]?.id ?? ''
}

function undoChanges() {
  config.value = cloneConfig(savedConfig.value)
}

function persistConfig(message: string) {
  savePayoutConfig(config.value)
  savedConfig.value = cloneConfig(config.value)
  savedMessage.value = message
  emit('saved')
  window.setTimeout(() => (savedMessage.value = ''), 1800)
}

function publishConfig() {
  persistConfig('配置已发布')
}

function editorTitle() {
  if (editorMode.value === 'edit') return '编辑配置'
  if (editorMode.value === 'copy') return '复制配置'
  return '新增配置'
}
</script>

<template>
  <main class="config-shell payout-config-shell">
    <header class="config-header payout-config-header">
      <div class="product-config-header-main">
        <div class="config-header__title">
          <strong>产品能力配置</strong>
        </div>
        <div class="product-config-business-tabs" role="tablist" aria-label="业务类型">
          <button type="button" role="tab" aria-selected="false" @click="emit('switchBusiness', 'collection')">
            收单
          </button>
          <button class="is-active" type="button" role="tab" aria-selected="true">代发</button>
        </div>
      </div>
      <div class="config-header__actions">
        <span v-if="savedMessage" class="config-save-message" role="status">{{ savedMessage }}</span>
        <button class="text-button" type="button" @click="emit('back')">返回能力地图</button>
        <button class="secondary-button" type="button" :disabled="!changed" @click="undoChanges">撤销修改</button>
        <button class="primary-button" type="button" :disabled="!changed" @click="publishConfig">发布配置</button>
      </div>
    </header>

    <section class="config-content">
      <div class="config-intro">
        <div>
          <span class="payout-config-kicker">能力配置</span>
          <h1>代发产品能力配置</h1>
          <p>按产品场景维护各字段的可用枚举，发布后自动生成代发能力地图。</p>
        </div>
        <span class="payout-config-summary">
          {{ currentMode === 'capability' ? `${visibleRecords.length} 条配置` : `${config.fields.length} 个字段` }}
        </span>
      </div>

      <div class="payout-config-tabs" role="tablist" aria-label="配置模式">
        <button
          type="button"
          role="tab"
          :aria-selected="currentMode === 'capability'"
          :class="{ 'is-active': currentMode === 'capability' }"
          @click="currentMode = 'capability'"
        >
          <strong>能力配置</strong>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="currentMode === 'fields'"
          :class="{ 'is-active': currentMode === 'fields' }"
          @click="currentMode = 'fields'"
        >
          <strong>字段管理</strong>
        </button>
      </div>

      <template v-if="currentMode === 'capability'">
        <section class="payout-config-module" aria-label="能力配置模块">
          <section class="filter-toolbar payout-list-toolbar" aria-label="代发配置筛选">
            <label class="filter-field">
              <span>一级产品分类</span>
              <select v-model="primaryFilter" @change="productFilter = 'all'">
                <option value="all">全部</option>
                <option v-for="option in payoutPrimaryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <label class="filter-field">
              <span>二级产品分类</span>
              <select v-model="productFilter">
                <option value="all">全部</option>
                <option v-for="product in filteredProducts" :key="product.id" :value="product.id">{{ product.label }}</option>
              </select>
            </label>
            <label class="filter-field">
              <span>商户类型</span>
              <select v-model="merchantTypeFilter">
                <option value="all">全部</option>
                <option v-for="option in merchantTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
          </section>

          <section class="config-table-panel" aria-labelledby="payout-record-title">
            <div class="table-toolbar">
              <div>
                <strong id="payout-record-title">代发能力配置列表</strong>
                <span>每条配置只包含一个枚举值组合，能力地图按这些记录动态生成。</span>
              </div>
              <div class="table-toolbar__right">
                <span class="scenario-count">当前 {{ visibleRecords.length }} 条</span>
                <button class="primary-button" type="button" @click="createRecord">新增配置</button>
              </div>
            </div>

            <div class="payout-record-table-wrap">
              <table class="payout-record-table">
                <thead>
                  <tr>
                    <th>配置名称</th>
                    <th>一级产品</th>
                    <th>二级产品</th>
                    <th v-for="field in config.fields" :key="field.id">{{ field.label }}</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in visibleRecords" :key="record.id">
                    <td><strong>{{ record.name }}</strong></td>
                    <td>{{ primaryLabel(record.product) }}</td>
                    <td>{{ productLabel(record.product) }}</td>
                    <td v-for="field in config.fields" :key="field.id">
                      <span class="payout-record-values">{{ optionLabels(record, field) }}</span>
                    </td>
                    <td>
                      <span class="payout-config-actions">
                        <button type="button" @click="editRecord(record)">编辑</button>
                        <button type="button" @click="copyRecord(record)">复制</button>
                        <button class="is-danger" type="button" @click="removeRecord(record.id)">删除</button>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="visibleRecords.length === 0" class="empty-state">暂无符合条件的配置。</div>
            </div>
          </section>
        </section>
      </template>

      <section v-else class="payout-config-module" aria-label="字段管理模块">
        <div class="payout-field-manager">
          <aside class="payout-field-sidebar">
            <div class="payout-field-sidebar__heading">
              <strong>字段列表</strong>
            </div>
            <button
              v-for="field in config.fields"
              :key="field.id"
              type="button"
              :class="{ 'is-active': selectedFieldId === field.id }"
              @click="selectedFieldId = field.id"
            >
              <span>{{ field.label }}</span>
              <em>{{ field.options.length }}</em>
            </button>
            <form class="payout-add-field" @submit.prevent="addField">
              <strong>新增字段</strong>
              <input v-model="newFieldLabel" required placeholder="字段名称" />
              <input v-model="newFieldDescription" placeholder="字段说明（可选）" />
              <button class="secondary-button" type="submit">添加字段</button>
            </form>
          </aside>

          <section v-if="selectedField" class="payout-field-detail">
            <div class="payout-config-heading">
              <div>
                <h2>{{ selectedField.label }}</h2>
                <p>{{ selectedField.description || '维护该字段下可用于能力配置的枚举值。' }}</p>
              </div>
              <button
                v-if="!selectedField.core"
                class="payout-danger-button"
                type="button"
                @click="removeField(selectedField.id)"
              >
                删除字段
              </button>
            </div>

            <div class="payout-enum-list">
              <div v-for="option in selectedField.options" :key="option.id" class="payout-enum-row">
                <div>
                  <strong>{{ option.label }}</strong>
                  <span>{{ option.description || '暂无说明' }}</span>
                </div>
                <button type="button" title="删除枚举值" @click="removeOption(selectedField, option.id)">删除</button>
              </div>
            </div>

            <form class="payout-add-enum" @submit.prevent="addOption">
              <h3>新增枚举值</h3>
              <div>
                <input v-model="newOptionLabel" required placeholder="枚举名称" />
                <input v-model="newOptionDescription" placeholder="枚举说明（可选）" />
                <button class="primary-button" type="submit">添加枚举值</button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </section>

    <div v-if="editingRecord" class="payout-modal-backdrop" role="presentation" @click.self="closeRecordEditor">
      <section class="payout-record-modal" role="dialog" aria-modal="true" aria-labelledby="payout-record-editor-title">
        <header class="payout-record-modal__header">
          <div class="payout-config-heading">
            <div>
              <h2 id="payout-record-editor-title">{{ editorTitle() }}</h2>
              <p>从当前所有字段和枚举中选择，保存后生成一条新的能力配置。</p>
            </div>
            <button class="text-button" type="button" @click="closeRecordEditor">取消</button>
          </div>
        </header>

        <div class="payout-record-modal__body">
          <div class="payout-record-editor__base">
            <label>
              <span>配置名称（可选）</span>
              <input v-model="editingRecord.name" placeholder="留空时按已选字段自动生成" />
            </label>
            <label>
              <span>二级产品分类 <em>必选</em></span>
              <select
                :value="editingRecord.product"
                @change="updateRecordProduct(($event.target as HTMLSelectElement).value as SecondaryProductCategory)"
              >
                <option v-for="product in payoutProductOptions" :key="product.id" :value="product.id">
                  {{ primaryLabel(product.id) }} / {{ product.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="payout-config-dimension-grid payout-config-dimension-grid--modal">
            <fieldset v-for="field in config.fields" :key="field.id" class="payout-dimension-card">
              <legend>
                <strong>{{ field.label }} <em v-if="isRequiredField(field.id)">必选</em></strong>
                <small>{{ field.description || '选择此配置包含的枚举值' }}</small>
              </legend>
              <div v-if="field.options.length" class="payout-dimension-options">
                <button
                  v-if="isOptionalClearableField(field.id)"
                  type="button"
                  :class="{ 'is-active': !editingRecord.values[field.id] }"
                  :aria-pressed="!editingRecord.values[field.id]"
                  @click="clearRecordOption(field.id)"
                >
                  <span class="ability-check payout-radio-check" aria-hidden="true"></span>
                  <span>
                    <strong>暂不配置</strong>
                    <small>该配置不限制支持的端</small>
                  </span>
                </button>
                <button
                  v-for="option in field.options"
                  :key="option.id"
                  type="button"
                  :class="{ 'is-active': editingRecord.values[field.id] === option.id }"
                  :aria-pressed="editingRecord.values[field.id] === option.id"
                  @click="toggleRecordOption(field.id, option.id)"
                >
                  <span class="ability-check payout-radio-check" aria-hidden="true"></span>
                  <span>
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.description }}</small>
                  </span>
                </button>
              </div>
              <div v-else class="empty-state">暂无枚举值，请先到字段管理中添加。</div>
            </fieldset>
          </div>
          <p v-if="editorError" class="payout-record-error" role="alert">{{ editorError }}</p>
        </div>

        <footer class="payout-record-modal__actions">
          <button class="text-button" type="button" @click="closeRecordEditor">取消</button>
          <button class="primary-button" type="button" :disabled="!canSaveRecord" @click="saveRecord">
            保存配置
          </button>
        </footer>
      </section>
    </div>
  </main>
</template>
