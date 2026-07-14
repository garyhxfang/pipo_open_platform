<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  getIdentity,
  loadDraft as loadStoredDraft,
  loadPublishedConfig,
  publishConfig as publishStoredConfig,
  saveDraft as saveStoredDraft,
  signInWithPassword,
  signOut,
  storageMode
} from './acquiringConfigRepository'
import {
  allDomains,
  countryOptions,
  createSeedPayload,
  finalDomainStatus,
  materializeScenarioRules,
  normalizeConfigPayload
} from './capabilityConfigModel'
import { supportStatusLabel, type SupportStatus } from './capabilityData'
import type {
  AppRole,
  CapabilityConfigPayloadV4,
  CapabilityConflict,
  CapabilityFeatureId,
  ConflictType,
  DomainId,
  MarketDependency,
  MarketScope,
  ScenarioConditions,
  ScenarioDimensionId,
  StoredCapabilityConfigPayload
} from './configTypes'

const emit = defineEmits<{ back: [] }>()

const statusOptions: SupportStatus[] = ['standard', 'conditional', 'unsupported']
const domainLabels: Record<DomainId, string> = { transaction: '交易', cashier: '收银', gn: 'GN' }
const marketDependencyLabels: Record<MarketDependency, string> = {
  none: '不依赖国家/地区',
  merchant: '仅商户签约国家/地区',
  consumer: '仅用户支付国家/地区',
  both: '两者均影响'
}
const marketScopeLabels: Record<MarketScope, string> = {
  merchantContractingCountry: '商户签约国家/地区',
  consumerPaymentCountry: '用户支付国家/地区'
}
const roleLabel: Record<AppRole, string> = { viewer: '查看者', editor: '编辑者', publisher: '发布者' }

const persistenceMode = storageMode()
const accountEmail = ref('')
const accountRole = ref<AppRole>()
const loginEmail = ref('')
const loginPassword = ref('')
const showPassword = ref(false)
const persistenceMessage = ref('')
const persistenceError = ref('')
const isPersisting = ref(false)
const fileInput = ref<HTMLInputElement>()

const initialConfig = createSeedPayload()
const config = ref<CapabilityConfigPayloadV4>(initialConfig)
const savedConfig = ref<CapabilityConfigPayloadV4>(clone(initialConfig))
const selectedAbility = ref<CapabilityFeatureId>('standaloneBinding')
const activeTab = ref<'metadata' | 'scenarios' | 'markets' | 'conflicts'>('metadata')

const scenarioFilters = ref<Record<ScenarioDimensionId, string>>({
  merchantType: 'all',
  product: 'all',
  environment: 'all',
  integrationMode: 'all'
})
const currentPage = ref(1)
const pageSize = ref(12)

const newMarketScope = ref<MarketScope>('merchantContractingCountry')
const newMarketCountry = ref(countryOptions[0])
const newMarketStatus = ref<SupportStatus>('standard')
const newMarketNote = ref('')

const newPairMerchantCountry = ref(countryOptions[0])
const newPairConsumerCountry = ref(countryOptions[1] ?? countryOptions[0])
const newPairStatus = ref<SupportStatus>('conditional')
const newPairNote = ref('')

const conflictTarget = ref<CapabilityFeatureId>('marketing')
const conflictType = ref<ConflictType>('mutuallyExclusive')
const conflictNote = ref('')

const abilityOptions = computed(() => config.value.capabilities)
const metadata = computed(() => config.value.capabilities.find((item) => item.id === selectedAbility.value)!)
const scenarioRules = computed(() => config.value.scenarioRules.filter((rule) => rule.capabilityId === selectedAbility.value))
const activeDimensionDefinitions = computed(() =>
  config.value.dimensions.filter((dimension) => metadata.value.scenarioDimensionIds.includes(dimension.id))
)
const filteredScenarioRules = computed(() =>
  scenarioRules.value.filter((rule) =>
    activeDimensionDefinitions.value.every(
      (dimension) => scenarioFilters.value[dimension.id] === 'all' || rule.conditions[dimension.id] === scenarioFilters.value[dimension.id]
    )
  )
)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredScenarioRules.value.length / pageSize.value)))
const pagedScenarioRules = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredScenarioRules.value.slice(start, start + pageSize.value)
})
const marketRules = computed(() => config.value.marketRules.filter((rule) => rule.capabilityId === selectedAbility.value))
const pairExceptions = computed(() =>
  config.value.marketPairExceptions.filter((item) => item.capabilityId === selectedAbility.value)
)
const relatedConflicts = computed(() =>
  config.value.conflicts.filter(
    (item) => item.sourceCapabilityId === selectedAbility.value || item.targetCapabilityId === selectedAbility.value
  )
)
const canEdit = computed(() => persistenceMode === 'local' || accountRole.value === 'editor' || accountRole.value === 'publisher')
const canPublish = computed(() => persistenceMode === 'local' || accountRole.value === 'publisher')
const hasChanges = computed(() => configFingerprint(config.value) !== configFingerprint(savedConfig.value))
const availableMarketScopes = computed<MarketScope[]>(() => {
  if (metadata.value.marketDependency === 'merchant') return ['merchantContractingCountry']
  if (metadata.value.marketDependency === 'consumer') return ['consumerPaymentCountry']
  if (metadata.value.marketDependency === 'both') return ['merchantContractingCountry', 'consumerPaymentCountry']
  return []
})

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function configFingerprint(value: CapabilityConfigPayloadV4) {
  const comparable = clone(value)
  comparable.capabilities.sort((left, right) => left.id.localeCompare(right.id))
  comparable.scenarioRules.sort((left, right) => left.id.localeCompare(right.id))
  comparable.marketRules.sort((left, right) => left.id.localeCompare(right.id))
  comparable.marketPairExceptions.sort((left, right) => left.id.localeCompare(right.id))
  comparable.conflicts.sort((left, right) => left.id.localeCompare(right.id))
  return JSON.stringify(comparable)
}

function statusClass(status: SupportStatus) {
  return `status-pill--${status}`
}

function toggleDomain(domain: DomainId) {
  const domains = metadata.value.responsibleDomains
  if (domains.includes(domain)) {
    if (domains.length === 1) return
    metadata.value.responsibleDomains = domains.filter((item) => item !== domain)
  } else {
    metadata.value.responsibleDomains = allDomains.filter((item) => domains.includes(item) || item === domain)
  }
}

function toggleScenarioDimension(dimensionId: ScenarioDimensionId) {
  const dimensions = metadata.value.scenarioDimensionIds
  if (dimensions.includes(dimensionId)) {
    metadata.value.scenarioDimensionIds = dimensions.filter((item) => item !== dimensionId)
  } else {
    metadata.value.scenarioDimensionIds = config.value.dimensions
      .map((dimension) => dimension.id)
      .filter((item) => dimensions.includes(item) || item === dimensionId)
  }
  materializeScenarioRules(config.value, selectedAbility.value)
  resetScenarioFilters()
}

function resetScenarioFilters() {
  scenarioFilters.value = {
    merchantType: 'all',
    product: 'all',
    environment: 'all',
    integrationMode: 'all'
  }
  currentPage.value = 1
}

function conditionLabel(conditions: ScenarioConditions, dimensionId: ScenarioDimensionId) {
  const dimension = config.value.dimensions.find((item) => item.id === dimensionId)
  return dimension?.values.find((item) => item.id === conditions[dimensionId])?.label ?? conditions[dimensionId] ?? '不适用'
}

function updateMarketDependency() {
  if (!availableMarketScopes.value.includes(newMarketScope.value)) {
    newMarketScope.value = availableMarketScopes.value[0] ?? 'merchantContractingCountry'
  }
}

function addMarketRule() {
  persistenceError.value = ''
  if (!availableMarketScopes.value.length) {
    persistenceError.value = '请先在能力元数据中配置国家/地区依赖。'
    return
  }
  const duplicate = marketRules.value.some(
    (rule) => rule.scope === newMarketScope.value && rule.country === newMarketCountry.value
  )
  if (duplicate) {
    persistenceError.value = '该国家/地区的市场规则已存在。'
    return
  }
  config.value.marketRules.push({
    id: crypto.randomUUID(),
    capabilityId: selectedAbility.value,
    scope: newMarketScope.value,
    country: newMarketCountry.value,
    status: newMarketStatus.value,
    note: newMarketNote.value.trim()
  })
  newMarketNote.value = ''
}

function removeMarketRule(ruleId: string) {
  config.value.marketRules = config.value.marketRules.filter((rule) => rule.id !== ruleId)
}

function addPairException() {
  persistenceError.value = ''
  const duplicate = pairExceptions.value.some(
    (item) =>
      item.merchantContractingCountry === newPairMerchantCountry.value &&
      item.consumerPaymentCountry === newPairConsumerCountry.value
  )
  if (duplicate) {
    persistenceError.value = '该国家/地区组合例外已存在。'
    return
  }
  config.value.marketPairExceptions.push({
    id: crypto.randomUUID(),
    capabilityId: selectedAbility.value,
    merchantContractingCountry: newPairMerchantCountry.value,
    consumerPaymentCountry: newPairConsumerCountry.value,
    status: newPairStatus.value,
    note: newPairNote.value.trim()
  })
  newPairNote.value = ''
}

function removePairException(exceptionId: string) {
  config.value.marketPairExceptions = config.value.marketPairExceptions.filter((item) => item.id !== exceptionId)
}

function addConflict() {
  persistenceError.value = ''
  if (conflictTarget.value === selectedAbility.value) {
    persistenceError.value = '冲突能力不能选择当前能力本身。'
    return
  }
  const duplicate = config.value.conflicts.some(
    (item) =>
      (item.sourceCapabilityId === selectedAbility.value && item.targetCapabilityId === conflictTarget.value) ||
      (item.sourceCapabilityId === conflictTarget.value && item.targetCapabilityId === selectedAbility.value)
  )
  if (duplicate) {
    persistenceError.value = '该能力组合已经配置冲突。'
    return
  }
  const conflict: CapabilityConflict = {
    id: crypto.randomUUID(),
    sourceCapabilityId: selectedAbility.value,
    targetCapabilityId: conflictTarget.value,
    type: conflictType.value,
    conditions: {},
    note: conflictNote.value.trim()
  }
  config.value.conflicts.push(conflict)
  conflictNote.value = ''
}

function removeConflict(conflictId: string) {
  config.value.conflicts = config.value.conflicts.filter((item) => item.id !== conflictId)
}

function abilityLabel(abilityId: CapabilityFeatureId) {
  return config.value.capabilities.find((item) => item.id === abilityId)?.name ?? abilityId
}

function currentPayload(): CapabilityConfigPayloadV4 {
  return { ...clone(config.value), exportedAt: new Date().toISOString() }
}

function applyPayload(payload: StoredCapabilityConfigPayload) {
  config.value = normalizeConfigPayload(payload)
  if (!config.value.capabilities.some((item) => item.id === selectedAbility.value)) {
    selectedAbility.value = config.value.capabilities[0].id
  }
  savedConfig.value = clone(config.value)
  resetScenarioFilters()
  updateMarketDependency()
}

async function initializePersistence() {
  persistenceError.value = ''
  try {
    if (persistenceMode === 'local') {
      const payload = (await loadStoredDraft()) ?? (await loadPublishedConfig())?.payload
      if (payload) applyPayload(payload)
      persistenceMessage.value = '未配置 Supabase，当前使用浏览器本地存储。'
      return
    }
    const identity = await getIdentity()
    accountEmail.value = identity.session?.user.email ?? ''
    accountRole.value = identity.role
    if (!identity.session) return
    if (!identity.role) {
      persistenceError.value = '当前账号尚未加入配置中心成员名单。'
      return
    }
    const payload = (await loadStoredDraft()) ?? (await loadPublishedConfig())?.payload
    if (payload) applyPayload(payload)
    persistenceMessage.value = payload ? '已加载云端配置。' : '云端暂无配置，已使用演示数据初始化。'
  } catch (error) {
    persistenceError.value = error instanceof Error ? error.message : '加载云端配置失败。'
  }
}

async function login() {
  if (!loginEmail.value.trim() || !loginPassword.value) return
  isPersisting.value = true
  persistenceError.value = ''
  try {
    await signInWithPassword(loginEmail.value.trim(), loginPassword.value)
    loginPassword.value = ''
    await initializePersistence()
    persistenceMessage.value = '已登录并加载云端配置。'
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    persistenceError.value = message === 'Invalid login credentials' ? '邮箱或密码错误。' : message || '登录失败。'
  } finally {
    isPersisting.value = false
  }
}

async function logout() {
  await signOut()
  accountEmail.value = ''
  accountRole.value = undefined
  persistenceMessage.value = ''
}

async function saveDraft() {
  if (!canEdit.value) return
  isPersisting.value = true
  persistenceError.value = ''
  try {
    await saveStoredDraft(currentPayload())
    savedConfig.value = clone(config.value)
    persistenceMessage.value = persistenceMode === 'local' ? '草稿已保存到本地。' : '草稿已保存到 Supabase。'
  } catch (error) {
    persistenceError.value = error instanceof Error ? error.message : '保存草稿失败。'
  } finally {
    isPersisting.value = false
  }
}

async function publishConfig() {
  if (!canPublish.value) return
  isPersisting.value = true
  persistenceError.value = ''
  try {
    const version = await publishStoredConfig(currentPayload())
    savedConfig.value = clone(config.value)
    persistenceMessage.value = version ? `配置 v${version} 已发布。` : '配置已发布到本地。'
  } catch (error) {
    persistenceError.value = error instanceof Error ? error.message : '发布配置失败。'
  } finally {
    isPersisting.value = false
  }
}

function undoChanges() {
  config.value = clone(savedConfig.value)
  resetScenarioFilters()
  updateMarketDependency()
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(currentPayload(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'capability-config-v3.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

function openImport() {
  fileInput.value?.click()
}

async function importConfig(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    applyPayload(JSON.parse(await file.text()) as StoredCapabilityConfigPayload)
  } catch {
    window.alert('配置文件无法解析，请检查 JSON 格式。')
  } finally {
    input.value = ''
  }
}

watch(selectedAbility, () => {
  persistenceError.value = ''
  materializeScenarioRules(config.value, selectedAbility.value)
  resetScenarioFilters()
  updateMarketDependency()
  const fallback = config.value.capabilities.find((item) => item.id !== selectedAbility.value)
  if (conflictTarget.value === selectedAbility.value && fallback) conflictTarget.value = fallback.id
})

onMounted(initializePersistence)
</script>

<template>
  <main class="config-shell">
    <header class="config-header">
      <div class="header-title">
        <span aria-hidden="true">▦</span>
        <strong>能力配置中心</strong>
      </div>
      <div class="header-actions">
        <span class="connection-chip" :class="{ 'is-cloud': persistenceMode === 'supabase' }">
          {{ persistenceMode === 'local' ? '本地模式' : accountRole ? roleLabel[accountRole] : 'Supabase' }}
        </span>
        <button v-if="accountEmail" class="text-button" type="button" @click="logout">退出</button>
        <button class="text-button" type="button" @click="emit('back')">返回能力地图</button>
        <button class="secondary-button" type="button" @click="openImport">导入配置</button>
        <button class="primary-button" type="button" @click="exportConfig">导出配置</button>
        <input ref="fileInput" class="visually-hidden" type="file" accept="application/json" @change="importConfig" />
      </div>
    </header>

    <section class="config-content">
      <section v-if="persistenceMode === 'supabase' && !accountEmail" class="auth-panel">
        <div><strong>登录配置中心</strong><span>使用已加入成员名单的邮箱和密码登录。</span></div>
        <input v-model="loginEmail" type="email" autocomplete="username" placeholder="name@example.com" @keyup.enter="login" />
        <label class="password-field">
          <input v-model="loginPassword" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="请输入密码" @keyup.enter="login" />
          <button type="button" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</button>
        </label>
        <button class="primary-button" type="button" :disabled="isPersisting || !loginEmail.trim() || !loginPassword" @click="login">
          {{ isPersisting ? '登录中...' : '登录' }}
        </button>
      </section>
      <p v-if="persistenceMessage" class="notice">{{ persistenceMessage }}</p>
      <p v-if="persistenceError" class="notice notice--error">{{ persistenceError }}</p>

      <section class="ability-selector" aria-labelledby="ability-selector-title">
        <div>
          <span class="section-kicker">当前配置能力</span>
          <h1 id="ability-selector-title">{{ metadata.name }}</h1>
          <p>{{ metadata.groupName }} · 先选择能力，再维护它自己的元数据和支持规则。</p>
        </div>
        <label>
          <span>能力选择</span>
          <select v-model="selectedAbility">
            <optgroup v-for="group in [...new Set(abilityOptions.map((item) => item.groupName))]" :key="group" :label="group">
              <option v-for="ability in abilityOptions.filter((item) => item.groupName === group)" :key="ability.id" :value="ability.id">
                {{ ability.name }}
              </option>
            </optgroup>
          </select>
        </label>
      </section>

      <nav class="config-tabs" aria-label="能力配置类型">
        <button :class="{ 'is-active': activeTab === 'metadata' }" type="button" @click="activeTab = 'metadata'">能力元数据</button>
        <button :class="{ 'is-active': activeTab === 'scenarios' }" type="button" @click="activeTab = 'scenarios'">产品链路支持条件 <span>{{ scenarioRules.length }}</span></button>
        <button :class="{ 'is-active': activeTab === 'markets' }" type="button" @click="activeTab = 'markets'">主体与国家/地区支持条件 <span>{{ marketRules.length + pairExceptions.length }}</span></button>
        <button :class="{ 'is-active': activeTab === 'conflicts' }" type="button" @click="activeTab = 'conflicts'">能力冲突 <span>{{ relatedConflicts.length }}</span></button>
      </nav>

      <section v-if="activeTab === 'metadata'" class="panel metadata-panel">
        <header class="panel-header"><div><strong>能力元数据</strong><span>定义能力由哪些责任域提供，以及哪些业务条件会影响支持情况。</span></div></header>
        <div class="metadata-grid">
          <div class="metadata-summary">
            <label><span>能力编码</span><input :value="metadata.id" disabled /></label>
            <label><span>能力名称</span><input v-model="metadata.name" :disabled="!canEdit" /></label>
            <label><span>所属分组</span><input v-model="metadata.groupName" :disabled="!canEdit" /></label>
            <label><span>能力类型</span><input :value="metadata.featureType === 'dimensionValue' ? '选型能力特性' : '业务能力特性'" disabled /></label>
            <label v-if="metadata.dimensionBinding">
              <span>对应选型项</span>
              <input :value="`${config.dimensions.find((item) => item.id === metadata.dimensionBinding?.dimensionId)?.label} / ${metadata.name}`" disabled />
            </label>
            <label>
              <span>国家/地区依赖</span>
              <select v-model="metadata.marketDependency" :disabled="!canEdit || metadata.featureType === 'dimensionValue'" @change="updateMarketDependency">
                <option v-for="(label, value) in marketDependencyLabels" :key="value" :value="value">{{ label }}</option>
              </select>
            </label>
          </div>
          <div class="metadata-choice-block">
            <div><strong>责任域</strong><span>只有选中的责任域参与最终支持状态汇总。</span></div>
            <div class="choice-buttons">
              <button v-for="domain in allDomains" :key="domain" :class="{ 'is-active': metadata.responsibleDomains.includes(domain) }" type="button" :disabled="!canEdit" @click="toggleDomain(domain)">
                <i>{{ metadata.responsibleDomains.includes(domain) ? '✓' : '' }}</i>{{ domainLabels[domain] }}
              </button>
            </div>
          </div>
          <div class="metadata-choice-block">
            <div><strong>产品链路支持条件维度</strong><span>选择会影响产品链路支持结果的条件；主体与国家/地区条件单独维护。</span></div>
            <div class="choice-buttons">
              <button v-for="dimension in config.dimensions" :key="dimension.id" :class="{ 'is-active': metadata.scenarioDimensionIds.includes(dimension.id) }" type="button" :disabled="!canEdit" @click="toggleScenarioDimension(dimension.id)">
                <i>{{ metadata.scenarioDimensionIds.includes(dimension.id) ? '✓' : '' }}</i>{{ dimension.label }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="activeTab === 'scenarios'" class="panel scenario-table-panel">
        <header class="panel-header">
          <div><strong>产品链路支持情况</strong><span>根据能力元数据中选择的产品链路支持条件展开组合，逐行维护各责任域状态。</span></div>
          <span class="count-chip">{{ scenarioRules.length }} 个条件组合</span>
        </header>
        <div class="scenario-filter-bar">
          <label v-for="dimension in activeDimensionDefinitions" :key="dimension.id">
            <span>{{ dimension.label }}</span>
            <select v-model="scenarioFilters[dimension.id]" @change="currentPage = 1">
              <option value="all">全部</option>
              <option v-for="value in dimension.values" :key="value.id" :value="value.id">{{ value.label }}</option>
            </select>
          </label>
          <button class="text-button" type="button" @click="resetScenarioFilters">重置筛选</button>
        </div>
        <div class="scenario-table-scroll">
          <table class="scenario-table">
            <thead>
              <tr>
                <th>序号</th>
                <th v-for="dimension in activeDimensionDefinitions" :key="dimension.id">{{ dimension.label }}</th>
                <th v-for="domain in metadata.responsibleDomains" :key="domain">{{ domainLabels[domain] }}</th>
                <th>最终支持情况</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rule, index) in pagedScenarioRules" :key="rule.id">
                <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td v-for="dimension in activeDimensionDefinitions" :key="dimension.id">
                  {{ conditionLabel(rule.conditions, dimension.id) }}
                </td>
                <td v-for="domain in metadata.responsibleDomains" :key="domain" class="domain-status-cell">
                  <select v-model="rule.domains[domain]" :class="statusClass(rule.domains[domain])" :disabled="!canEdit">
                    <option v-for="status in statusOptions" :key="status" :value="status">{{ supportStatusLabel[status] }}</option>
                  </select>
                </td>
                <td>
                  <span class="status-pill" :class="statusClass(finalDomainStatus(rule.domains, metadata.responsibleDomains))">
                    {{ supportStatusLabel[finalDomainStatus(rule.domains, metadata.responsibleDomains)] }}
                  </span>
                </td>
                <td><input v-model="rule.note" class="scenario-note" :disabled="!canEdit" placeholder="-" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="scenario-table-footer">
          <span>共 {{ filteredScenarioRules.length }} 条</span>
          <div>
            <button type="button" :disabled="currentPage === 1" @click="currentPage--">‹</button>
            <button v-for="page in totalPages" :key="page" :class="{ 'is-active': currentPage === page }" type="button" @click="currentPage = page">{{ page }}</button>
            <button type="button" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
          </div>
          <select v-model="pageSize" @change="currentPage = 1"><option :value="12">12 条/页</option><option :value="24">24 条/页</option><option :value="36">36 条/页</option></select>
        </footer>
      </section>

      <section v-else-if="activeTab === 'markets'" class="tab-stack">
        <section class="panel">
          <header class="panel-header"><div><strong>主体与国家/地区默认支持情况</strong><span>商户签约国家/地区和用户支付国家/地区分别计算，不参与产品链路条件组合。</span></div></header>
          <div v-if="metadata.marketDependency !== 'none'" class="market-default-grid">
            <label v-if="metadata.marketDependency === 'merchant' || metadata.marketDependency === 'both'"><span>商户签约国家/地区默认状态</span><select v-model="metadata.defaultMerchantMarketStatus" :disabled="!canEdit"><option v-for="status in statusOptions" :key="status" :value="status">{{ supportStatusLabel[status] }}</option></select></label>
            <label v-if="metadata.marketDependency === 'consumer' || metadata.marketDependency === 'both'"><span>用户支付国家/地区默认状态</span><select v-model="metadata.defaultConsumerMarketStatus" :disabled="!canEdit"><option v-for="status in statusOptions" :key="status" :value="status">{{ supportStatusLabel[status] }}</option></select></label>
          </div>
          <div v-else class="empty-state empty-state--compact">当前能力在元数据中配置为“不依赖国家/地区”。</div>
        </section>

        <section class="panel">
          <header class="panel-header"><div><strong>国家/地区例外</strong><span>只维护与默认状态不同的主体签约地或用户支付地。</span></div></header>
          <div class="market-builder">
            <label><span>市场类型</span><select v-model="newMarketScope" :disabled="!availableMarketScopes.length"><option v-for="scope in availableMarketScopes" :key="scope" :value="scope">{{ marketScopeLabels[scope] }}</option></select></label>
            <label><span>国家/地区</span><select v-model="newMarketCountry"><option v-for="country in countryOptions" :key="country" :value="country">{{ country }}</option></select></label>
            <label><span>支持状态</span><select v-model="newMarketStatus"><option v-for="status in statusOptions" :key="status" :value="status">{{ supportStatusLabel[status] }}</option></select></label>
            <label class="wide-field"><span>说明</span><input v-model="newMarketNote" placeholder="例如：需当地牌照或风控评估" /></label>
            <button class="primary-button" type="button" :disabled="!canEdit || !availableMarketScopes.length" @click="addMarketRule">添加市场规则</button>
          </div>
          <div v-if="marketRules.length" class="simple-list">
            <article v-for="rule in marketRules" :key="rule.id"><strong>{{ marketScopeLabels[rule.scope] }}</strong><b>{{ rule.country }}</b><span class="status-pill" :class="statusClass(rule.status)">{{ supportStatusLabel[rule.status] }}</span><p>{{ rule.note || '暂无补充说明' }}</p><button class="danger-text-button" type="button" :disabled="!canEdit" @click="removeMarketRule(rule.id)">删除</button></article>
          </div>
          <div v-else class="empty-state empty-state--compact">暂无国家/地区例外，当前使用默认支持状态。</div>
        </section>

        <section v-if="metadata.marketDependency === 'both'" class="panel">
          <header class="panel-header"><div><strong>国家/地区组合例外</strong><span>仅维护确实存在特殊限制的商户签约地与用户支付地组合。</span></div></header>
          <div class="pair-builder">
            <label><span>商户签约国家/地区</span><select v-model="newPairMerchantCountry"><option v-for="country in countryOptions" :key="country" :value="country">{{ country }}</option></select></label><span class="pair-arrow">→</span>
            <label><span>用户支付国家/地区</span><select v-model="newPairConsumerCountry"><option v-for="country in countryOptions" :key="country" :value="country">{{ country }}</option></select></label>
            <label><span>支持状态</span><select v-model="newPairStatus"><option v-for="status in statusOptions" :key="status" :value="status">{{ supportStatusLabel[status] }}</option></select></label>
            <label class="wide-field"><span>说明</span><input v-model="newPairNote" placeholder="填写该国家/地区组合的限制原因" /></label>
            <button class="primary-button" type="button" :disabled="!canEdit" @click="addPairException">添加组合例外</button>
          </div>
          <div v-if="pairExceptions.length" class="simple-list pair-list"><article v-for="item in pairExceptions" :key="item.id"><strong>{{ item.merchantContractingCountry }} 商户</strong><b>→ {{ item.consumerPaymentCountry }} 用户</b><span class="status-pill" :class="statusClass(item.status)">{{ supportStatusLabel[item.status] }}</span><p>{{ item.note || '暂无补充说明' }}</p><button class="danger-text-button" type="button" :disabled="!canEdit" @click="removePairException(item.id)">删除</button></article></div>
          <div v-else class="empty-state empty-state--compact">暂无国家/地区组合例外。</div>
        </section>
      </section>

      <section v-else class="panel">
        <header class="panel-header"><div><strong>能力冲突</strong><span>配置当前能力与其他能力之间的互斥或条件组合关系。</span></div></header>
        <div class="conflict-builder">
          <div class="current-ability-chip">{{ metadata.name }}</div><span>×</span>
          <label><span>冲突能力</span><select v-model="conflictTarget"><option v-for="ability in abilityOptions.filter((item) => item.id !== selectedAbility)" :key="ability.id" :value="ability.id">{{ ability.name }}</option></select></label>
          <label><span>冲突类型</span><select v-model="conflictType"><option value="mutuallyExclusive">不可同时支持</option><option value="conditional">可组合但需评估</option></select></label>
          <label class="wide-field"><span>说明</span><input v-model="conflictNote" placeholder="例如：营销与换汇暂不可同时开启" /></label>
          <button class="primary-button" type="button" :disabled="!canEdit" @click="addConflict">添加冲突</button>
        </div>
        <div v-if="relatedConflicts.length" class="simple-list conflict-list"><article v-for="conflict in relatedConflicts" :key="conflict.id"><strong>{{ abilityLabel(conflict.sourceCapabilityId) }}</strong><b>× {{ abilityLabel(conflict.targetCapabilityId) }}</b><span class="conflict-pill">{{ conflict.type === 'mutuallyExclusive' ? '不可同时支持' : '可组合但需评估' }}</span><p>{{ conflict.note || '暂无补充说明' }}</p><button class="danger-text-button" type="button" :disabled="!canEdit" @click="removeConflict(conflict.id)">删除</button></article></div>
        <div v-else class="empty-state">当前能力暂无冲突配置。</div>
      </section>
    </section>

    <footer class="action-bar">
      <span><i :class="{ 'has-changes': hasChanges }"></i>{{ hasChanges ? '当前有未保存修改' : '当前配置已同步' }}</span>
      <div><button class="text-button" type="button" :disabled="!hasChanges" @click="undoChanges">撤销修改</button><button class="secondary-button" type="button" :disabled="!canEdit || isPersisting || !hasChanges" @click="saveDraft">保存草稿</button><button class="primary-button" type="button" :disabled="!canPublish || isPersisting" @click="publishConfig">发布配置</button></div>
    </footer>
  </main>
</template>

<style scoped>
.config-shell{--blue:#1267f1;--blue-soft:#eef5ff;--border:#d8e0ec;--border-soft:#e8edf5;--text:#172033;--muted:#68768d;--green:#27833e;--green-bg:#eaf7ed;--orange:#df820b;--orange-bg:#fff3df;--gray:#7b8797;--gray-bg:#eef2f6;min-height:100vh;padding-bottom:72px;background:#f5f7fb;color:var(--text)}
button,select,input{font:inherit}button{cursor:pointer}.config-header,.header-title,.header-actions,.action-bar,.action-bar>div{display:flex;align-items:center}.config-header{position:sticky;top:0;z-index:20;justify-content:space-between;min-height:58px;border-bottom:1px solid var(--border-soft);padding:10px 32px;background:rgba(255,255,255,.98);box-shadow:0 5px 16px rgba(15,23,42,.05)}.header-title{gap:9px;font-size:17px}.header-title>span{display:grid;width:27px;height:27px;place-items:center;border-radius:7px;background:var(--blue-soft);color:var(--blue)}.header-actions{gap:9px}.connection-chip,.count-chip{border:1px solid var(--border);border-radius:999px;padding:4px 9px;background:#f7f9fc;color:var(--muted);font-size:11px;font-weight:750}.connection-chip.is-cloud{border-color:#bcd0f5;background:var(--blue-soft);color:var(--blue)}
.config-content{width:min(1480px,calc(100% - 48px));margin:0 auto;padding:18px 0}.auth-panel{display:flex;align-items:center;gap:10px;margin-bottom:12px;border:1px solid #bcd0f5;border-radius:8px;padding:12px 14px;background:#f8fbff}.auth-panel>div{display:grid;flex:1;gap:3px}.auth-panel strong{font-size:13px}.auth-panel span,.notice{color:var(--muted);font-size:12px}.auth-panel>input,.password-field{width:min(250px,38vw);height:32px;border:1px solid var(--border);border-radius:6px;padding:0 9px;background:#fff}.password-field{display:flex;align-items:center;width:min(210px,32vw);padding-right:4px}.password-field input{min-width:0;height:30px;flex:1;border:0;outline:none}.password-field button{border:0;background:transparent;color:var(--blue);font-size:11px}.notice{margin:0 0 10px;border-left:3px solid #83aef7;padding:7px 10px;background:#f8fbff}.notice--error{border-left-color:#d65a5a;background:#fff7f7;color:#a43f3f}
.ability-selector{display:flex;align-items:center;justify-content:space-between;gap:28px;border:1px solid #c9d9f3;border-radius:8px;padding:16px 18px;background:linear-gradient(90deg,#fff 0,#f7faff 100%);box-shadow:0 8px 22px rgba(15,23,42,.035)}.section-kicker{color:var(--blue);font-size:11px;font-weight:800}.ability-selector h1{margin:3px 0 0;font-size:22px}.ability-selector p{margin:4px 0 0;color:var(--muted);font-size:12px}.ability-selector label{display:grid;width:min(360px,42vw);gap:5px}.ability-selector label>span,.metadata-summary label>span,.rule-builder label>span,.domain-status-grid label>span,.compact-domain-status label>span,.market-builder label>span,.pair-builder label>span,.conflict-builder label>span,.market-default-grid label>span{color:var(--muted);font-size:11px;font-weight:750}select,input{height:32px;border:1px solid var(--border);border-radius:6px;padding:0 9px;background:#fff;color:var(--text);font-size:12px}input:disabled{background:#f5f7fa;color:#8893a4}
.config-tabs{display:flex;gap:4px;margin:14px 0 12px;border-bottom:1px solid var(--border)}.config-tabs button{min-height:38px;border:0;border-bottom:2px solid transparent;padding:0 15px;background:transparent;color:var(--muted);font-size:13px;font-weight:750}.config-tabs button.is-active{border-bottom-color:var(--blue);color:var(--blue)}.config-tabs button span{margin-left:4px;border-radius:999px;padding:1px 6px;background:var(--gray-bg);font-size:10px}
.panel{overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.035)}.tab-stack{display:grid;gap:12px}.panel-header{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:54px;border-bottom:1px solid var(--border-soft);padding:10px 14px}.panel-header>div{display:grid;gap:3px}.panel-header strong{font-size:14px}.panel-header div span{color:var(--muted);font-size:11px}.metadata-grid{display:grid;grid-template-columns:minmax(300px,.8fr) 1fr 1fr;gap:0}.metadata-summary,.metadata-choice-block{padding:16px}.metadata-summary{display:grid;grid-template-columns:1fr 1fr;gap:12px;border-right:1px solid var(--border-soft)}.metadata-summary label{display:grid;gap:5px}.metadata-choice-block{border-right:1px solid var(--border-soft)}.metadata-choice-block:last-child{border-right:0}.metadata-choice-block>div:first-child{display:grid;gap:3px;margin-bottom:12px}.metadata-choice-block strong{font-size:13px}.metadata-choice-block>div:first-child span{color:var(--muted);font-size:11px}.choice-buttons{display:flex;flex-wrap:wrap;gap:7px}.choice-buttons button{display:inline-flex;align-items:center;gap:6px;min-height:32px;border:1px solid var(--border);border-radius:6px;padding:0 10px;background:#fff;color:var(--muted);font-size:12px;font-weight:700}.choice-buttons button.is-active{border-color:#9fc0fb;background:var(--blue-soft);color:var(--blue)}.choice-buttons i{display:grid;width:14px;height:14px;place-items:center;border:1px solid #b8c4d4;border-radius:3px;font-size:9px;font-style:normal}.choice-buttons button.is-active i{border-color:var(--blue);background:var(--blue);color:#fff}
.domain-status-grid,.market-default-grid{display:flex;flex-wrap:wrap;gap:12px;padding:14px}.domain-status-grid label,.market-default-grid label{display:grid;min-width:180px;gap:5px}.rule-builder,.market-builder,.pair-builder,.conflict-builder{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr)) minmax(220px,1.5fr) auto;align-items:end;gap:10px;padding:14px;background:#f8faff}.rule-builder label,.market-builder label,.pair-builder label,.conflict-builder label{display:grid;gap:5px}.wide-field{min-width:0}.pair-builder{grid-template-columns:minmax(160px,1fr) 26px minmax(160px,1fr) minmax(130px,.8fr) minmax(220px,1.3fr) auto}.pair-arrow{align-self:center;padding-top:16px;color:#8b97a8;text-align:center}.conflict-builder{grid-template-columns:minmax(150px,.8fr) 24px minmax(170px,1fr) minmax(150px,.9fr) minmax(220px,1.3fr) auto}.conflict-builder>span{align-self:center;padding-top:16px;color:#a15e5e;text-align:center}.current-ability-chip{align-self:end;min-height:32px;border:1px solid #bcd0f5;border-radius:6px;padding:7px 10px;background:var(--blue-soft);color:var(--blue);font-size:12px;font-weight:750}
.scenario-filter-bar{display:flex;align-items:end;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--border-soft);padding:12px 14px;background:#f8faff}.scenario-filter-bar label{display:grid;min-width:150px;gap:5px}.scenario-filter-bar label span{color:var(--muted);font-size:11px;font-weight:750}.scenario-filter-bar .text-button{margin-left:auto}.scenario-table-scroll{overflow-x:auto}.scenario-table{width:100%;min-width:1080px;border-collapse:collapse;table-layout:auto}.scenario-table th,.scenario-table td{height:48px;border-bottom:1px solid var(--border-soft);padding:8px 10px;font-size:12px;text-align:left;white-space:nowrap}.scenario-table th{height:40px;background:#f8faff;color:#59677d;font-weight:800}.scenario-table tbody tr:hover{background:#fbfdff}.domain-status-cell select{width:100px;height:28px;border-color:transparent;border-radius:999px;padding:0 8px;font-size:11px;font-weight:750;text-align:center;text-align-last:center}.domain-status-cell select.status-pill--standard{background:var(--green-bg);color:var(--green)}.domain-status-cell select.status-pill--conditional{background:var(--orange-bg);color:var(--orange)}.domain-status-cell select.status-pill--unsupported{background:var(--gray-bg);color:var(--gray)}.scenario-note{width:150px;height:28px}.scenario-table-footer{display:flex;align-items:center;justify-content:flex-end;gap:14px;min-height:50px;padding:8px 14px}.scenario-table-footer>span{margin-right:auto;color:var(--muted);font-size:11px}.scenario-table-footer>div{display:flex;gap:4px}.scenario-table-footer button{min-width:28px;height:28px;border:1px solid var(--border);border-radius:5px;background:#fff;color:var(--muted);font-size:11px}.scenario-table-footer button.is-active{border-color:var(--blue);background:var(--blue);color:#fff}.scenario-table-footer select{height:28px}
.rule-list,.simple-list{display:grid}.rule-item,.simple-list article{display:grid;align-items:center;gap:14px;min-height:62px;margin:0;border-bottom:1px solid var(--border-soft);padding:10px 14px}.rule-item{grid-template-columns:minmax(300px,1.3fr) minmax(300px,1fr) 110px auto}.rule-condition{display:grid;gap:3px}.rule-condition strong{font-size:12px}.rule-condition span{color:var(--muted);font-size:11px}.compact-domain-status{display:flex;gap:7px}.compact-domain-status label{display:grid;min-width:88px;gap:3px}.compact-domain-status select{height:28px;padding:0 6px}.simple-list article{grid-template-columns:minmax(190px,.9fr) 90px 110px minmax(220px,1.2fr) auto}.simple-list article strong,.simple-list article b{font-size:12px}.simple-list article p{overflow:hidden;margin:0;color:var(--muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.status-pill,.conflict-pill{justify-self:start;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:750;white-space:nowrap}.status-pill--standard{background:var(--green-bg);color:var(--green)}.status-pill--conditional{background:var(--orange-bg);color:var(--orange)}.status-pill--unsupported{background:var(--gray-bg);color:var(--gray)}.conflict-pill{background:#fff0f0;color:#b04747}.empty-state{padding:52px 20px;color:var(--muted);font-size:12px;text-align:center}.empty-state--compact{padding:24px 20px}.danger-text-button{border:0;background:transparent;color:#b14e4e;font-size:11px;font-weight:700}.danger-text-button:disabled{opacity:.45}
.text-button,.secondary-button,.primary-button{min-height:32px;border-radius:6px;padding:0 12px;font-size:12px;font-weight:750}.text-button{border:0;background:transparent;color:var(--muted)}.secondary-button{border:1px solid var(--border);background:#fff;color:var(--text)}.primary-button{border:1px solid var(--blue);background:var(--blue);color:#fff}button:disabled{cursor:not-allowed;opacity:.5}.action-bar{position:fixed;right:0;bottom:0;left:0;z-index:21;justify-content:space-between;min-height:56px;border-top:1px solid var(--border-soft);padding:8px 32px;background:rgba(255,255,255,.98);box-shadow:0 -5px 18px rgba(15,23,42,.05)}.action-bar>span{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:12px}.action-bar>span i{width:8px;height:8px;border-radius:50%;background:#9aaf9e}.action-bar>span i.has-changes{background:var(--orange)}.action-bar>div{gap:9px}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)}
@media(max-width:1100px){.metadata-grid{grid-template-columns:1fr 1fr}.metadata-summary{grid-column:1/-1;border-right:0;border-bottom:1px solid var(--border-soft)}.rule-builder,.market-builder{grid-template-columns:repeat(3,1fr)}.wide-field{grid-column:1/3}.rule-item{grid-template-columns:1fr auto}.compact-domain-status{grid-row:2;grid-column:1/-1}.conflict-builder,.pair-builder{grid-template-columns:1fr 24px 1fr 1fr}.conflict-builder .wide-field,.pair-builder .wide-field{grid-column:1/4}.simple-list article{grid-template-columns:1fr 100px 110px auto}.simple-list article p{grid-row:2;grid-column:1/-1}}
@media(max-width:720px){.config-header{align-items:flex-start;flex-direction:column;gap:8px;padding:10px 14px}.header-actions{width:100%;overflow-x:auto}.config-content{width:calc(100% - 24px);padding-top:12px}.auth-panel,.ability-selector{align-items:stretch;flex-direction:column}.auth-panel>input,.password-field,.ability-selector label{width:100%}.config-tabs{overflow-x:auto}.config-tabs button{flex:0 0 auto}.metadata-grid{grid-template-columns:1fr}.metadata-summary{grid-template-columns:1fr}.metadata-choice-block{border-right:0;border-bottom:1px solid var(--border-soft)}.rule-builder,.market-builder,.pair-builder,.conflict-builder{grid-template-columns:1fr}.wide-field,.conflict-builder .wide-field,.pair-builder .wide-field{grid-column:auto}.pair-arrow,.conflict-builder>span{display:none}.rule-item,.simple-list article{align-items:flex-start;grid-template-columns:1fr auto}.compact-domain-status{overflow-x:auto}.status-pill{grid-column:2}.simple-list article p{grid-row:auto;grid-column:1/-1;white-space:normal}.action-bar{align-items:flex-start;flex-direction:column;gap:5px;padding:8px 12px}}
</style>
