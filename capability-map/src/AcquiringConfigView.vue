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
  capabilityTypeFor,
  createSeedPayload,
  finalDomainStatus,
  materializeScenarioRules,
  normalizeConfigPayload
} from './capabilityConfigModel'
import { supportStatusLabel, type SupportStatus } from './capabilityData'
import {
  acquiringProductCodes,
  productModeLabels,
  setSubjectCapabilityStatus,
  subjectCapabilityStatus
} from './subjectCapabilityStore'
import type {
  AppRole,
  CapabilityConfigPayloadV4,
  CapabilityConflict,
  CapabilityFeatureId,
  CapabilityTypeDefinition,
  ConflictType,
  MarketDependency,
  ScenarioConditions,
  ScenarioDimensionId,
  ScenarioSupportRule,
  StoredCapabilityConfigPayload
} from './configTypes'

const emit = defineEmits<{ back: [] }>()

const statusOptions: SupportStatus[] = ['standard', 'conditional', 'unsupported']
const marketDependencyLabels: Record<MarketDependency, string> = {
  none: '无主体依赖',
  merchant: '商户签约主体',
  consumer: '用户支付主体',
  both: '双侧主体'
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
const selectedAbilityTypeId = ref(initialConfig.capabilityTypes[0]?.id ?? '')
const activeTab = ref<'metadata' | 'scenarios' | 'markets' | 'conflicts'>('scenarios')
const configScreen = ref<'list' | 'catalog' | 'type-editor' | 'editor'>('list')
const editorReturnScreen = ref<'list' | 'catalog'>('list')
const capabilitySearch = ref('')
const catalogSearch = ref('')
const catalogPage = ref(1)
const catalogPageSize = ref(12)
const expandedAbilityGroups = ref<string[]>(
  initialConfig.capabilityTypes[0] ? [initialConfig.capabilityTypes[0].id] : []
)

const scenarioFilters = ref<Record<ScenarioDimensionId, string>>({
  merchantType: 'all',
  product: 'all',
  environment: 'all',
  integrationMode: 'all'
})
const currentPage = ref(1)
const pageSize = ref(12)
const subjectProductSearch = ref('')
const subjectCountryFilter = ref('All')

const conflictTarget = ref<CapabilityFeatureId>('marketing')
const conflictType = ref<ConflictType>('mutuallyExclusive')
const conflictNote = ref('')

const abilityOptions = computed(() => config.value.capabilities)
const abilityTypes = computed(() => config.value.capabilityTypes)
const abilityGroups = computed(() => abilityTypes.value.map((item) => item.id))
const filteredAbilityOptions = computed(() => {
  const keyword = capabilitySearch.value.trim().toLowerCase()
  return abilityOptions.value.filter((ability) => {
    if (!keyword) return true
    const typeName = abilityTypes.value.find((item) => item.id === ability.groupId)?.name ?? ability.groupName
    return `${ability.name}${ability.id}${typeName}`.toLowerCase().includes(keyword)
  })
})
const groupedAbilityOptions = computed(() =>
  abilityTypes.value
    .map((type) => {
      const allAbilities = abilityOptions.value.filter((ability) => ability.groupId === type.id)
      return {
        type,
        allAbilities,
        abilities: filteredAbilityOptions.value.filter((ability) => ability.groupId === type.id)
      }
    })
    .filter((group) => group.abilities.length)
)
const metadata = computed(() => config.value.capabilities.find((item) => item.id === selectedAbility.value)!)
const metadataType = computed(() => capabilityTypeFor(config.value, metadata.value)!)
const selectedAbilityType = computed(() =>
  config.value.capabilityTypes.find((item) => item.id === selectedAbilityTypeId.value)!
)
const selectedTypeAbilities = computed(() =>
  config.value.capabilities.filter((item) => item.groupId === selectedAbilityTypeId.value)
)
const filteredCatalogAbilities = computed(() => {
  const keyword = catalogSearch.value.trim().toLowerCase()
  return selectedTypeAbilities.value.filter((ability) =>
    !keyword || `${ability.name}${ability.id}`.toLowerCase().includes(keyword)
  )
})
const catalogTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredCatalogAbilities.value.length / catalogPageSize.value))
)
const pagedCatalogAbilities = computed(() => {
  const start = (catalogPage.value - 1) * catalogPageSize.value
  return filteredCatalogAbilities.value.slice(start, start + catalogPageSize.value)
})
const scenarioRules = computed(() => config.value.scenarioRules.filter((rule) => rule.capabilityId === selectedAbility.value))
const activeDimensionDefinitions = computed(() =>
  config.value.dimensions.filter((dimension) => metadataType.value.scenarioDimensionIds.includes(dimension.id))
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
const subjectCountryOptions = [...new Set(acquiringProductCodes.map((item) => item.country))]
const filteredSubjectProducts = computed(() => {
  const keyword = subjectProductSearch.value.trim().toLowerCase()
  return acquiringProductCodes.filter((product) => {
    const matchesKeyword = !keyword || `${product.code}${product.productName}${product.entityName}${product.entityCode}`
      .toLowerCase()
      .includes(keyword)
    return matchesKeyword && (subjectCountryFilter.value === 'All' || product.country === subjectCountryFilter.value)
  })
})
const supportedSubjectProductCount = computed(() =>
  acquiringProductCodes.filter(
    (product) => subjectCapabilityStatus(product.code, selectedAbility.value) !== 'unsupported'
  ).length
)
const relatedConflicts = computed(() =>
  config.value.conflicts.filter(
    (item) => item.sourceCapabilityId === selectedAbility.value || item.targetCapabilityId === selectedAbility.value
  )
)
const canEdit = computed(() => persistenceMode === 'local' || accountRole.value === 'editor' || accountRole.value === 'publisher')
const canPublish = computed(() => persistenceMode === 'local' || accountRole.value === 'publisher')
const hasChanges = computed(() => configFingerprint(config.value) !== configFingerprint(savedConfig.value))
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function configFingerprint(value: CapabilityConfigPayloadV4) {
  const comparable = clone(value)
  comparable.capabilityTypes.sort((left, right) => left.id.localeCompare(right.id))
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

function scrollToConfigTop() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
}

function openAbilityConfig(abilityId: CapabilityFeatureId, returnScreen: 'list' | 'catalog' = 'list') {
  selectedAbility.value = abilityId
  editorReturnScreen.value = returnScreen
  activeTab.value = 'scenarios'
  configScreen.value = 'editor'
  scrollToConfigTop()
}

function openAbilityCatalog(typeId: string) {
  selectedAbilityTypeId.value = typeId
  catalogSearch.value = ''
  catalogPage.value = 1
  configScreen.value = 'catalog'
  persistenceError.value = ''
  scrollToConfigTop()
}

function openAbilityTypeConfig(typeId: string) {
  selectedAbilityTypeId.value = typeId
  configScreen.value = 'type-editor'
  persistenceError.value = ''
  scrollToConfigTop()
}

function showAbilityList() {
  if (configScreen.value === 'editor' && editorReturnScreen.value === 'catalog') {
    selectedAbilityTypeId.value = metadata.value.groupId
    configScreen.value = 'catalog'
    persistenceError.value = ''
    return
  }
  const groupId = configScreen.value === 'type-editor' || configScreen.value === 'catalog'
    ? selectedAbilityTypeId.value
    : metadata.value.groupId
  configScreen.value = 'list'
  persistenceError.value = ''
  if (!expandedAbilityGroups.value.includes(groupId)) {
    expandedAbilityGroups.value.push(groupId)
  }
}

function abilityGroupExpanded(groupId: string) {
  return Boolean(capabilitySearch.value.trim()) || expandedAbilityGroups.value.includes(groupId)
}

function toggleAbilityGroup(groupId: string) {
  if (capabilitySearch.value.trim()) return
  expandedAbilityGroups.value = expandedAbilityGroups.value.includes(groupId)
    ? expandedAbilityGroups.value.filter((item) => item !== groupId)
    : [...expandedAbilityGroups.value, groupId]
}

function expandAllAbilityGroups() {
  expandedAbilityGroups.value = [...abilityGroups.value]
}

function collapseAllAbilityGroups() {
  expandedAbilityGroups.value = []
}

function updateOverallStatus(rule: ScenarioSupportRule, status: SupportStatus) {
  rule.domains = {
    transaction: status,
    cashier: status,
    gn: status
  }
}

function capabilityScenarioRuleCount(capabilityId: CapabilityFeatureId) {
  return config.value.scenarioRules.filter((rule) => rule.capabilityId === capabilityId).length
}

function capabilitySubjectSupportCount(capabilityId: CapabilityFeatureId) {
  return acquiringProductCodes.filter(
    (product) => subjectCapabilityStatus(product.code, capabilityId) !== 'unsupported'
  ).length
}

function typeDimensionLabels(type: CapabilityTypeDefinition) {
  return type.scenarioDimensionIds.length
    ? type.scenarioDimensionIds
      .map((id) => config.value.dimensions.find((item) => item.id === id)?.label)
      .filter(Boolean)
      .join('、')
    : '无产品链路条件'
}

function dimensionLabel(dimensionId: ScenarioDimensionId) {
  return config.value.dimensions.find((item) => item.id === dimensionId)?.label ?? dimensionId
}

function toggleTypeScenarioDimension(dimensionId: ScenarioDimensionId) {
  const dimensions = selectedAbilityType.value.scenarioDimensionIds
  if (dimensions.includes(dimensionId)) {
    selectedAbilityType.value.scenarioDimensionIds = dimensions.filter((item) => item !== dimensionId)
  } else {
    selectedAbilityType.value.scenarioDimensionIds = config.value.dimensions
      .map((dimension) => dimension.id)
      .filter((item) => dimensions.includes(item) || item === dimensionId)
  }
  for (const ability of selectedTypeAbilities.value) {
    materializeScenarioRules(config.value, ability.id)
  }
  resetScenarioFilters()
}

function updateAbilityTypeName() {
  const name = selectedAbilityType.value.name.trim()
  if (!name) return
  for (const ability of selectedTypeAbilities.value) {
    ability.groupName = name
  }
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

function updateSubjectProductStatus(productCode: string, status: SupportStatus) {
  if (!canEdit.value) return
  setSubjectCapabilityStatus(productCode, selectedAbility.value, status)
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
  if (!config.value.capabilityTypes.some((item) => item.id === selectedAbilityTypeId.value)) {
    selectedAbilityTypeId.value = config.value.capabilityTypes[0]?.id ?? ''
  }
  savedConfig.value = clone(config.value)
  resetScenarioFilters()
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
      persistenceError.value = '当前账号尚未加入产品能力管理成员名单。'
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
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(currentPayload(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'capability-config-v4.json'
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
  const fallback = config.value.capabilities.find((item) => item.id !== selectedAbility.value)
  if (conflictTarget.value === selectedAbility.value && fallback) conflictTarget.value = fallback.id
})

watch(catalogSearch, () => {
  catalogPage.value = 1
})

onMounted(initializePersistence)
</script>

<template>
  <main class="config-shell">
    <header class="config-header">
      <div class="header-title">
        <span aria-hidden="true">▦</span>
        <strong>产品能力管理</strong>
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
        <div><strong>登录产品能力管理</strong><span>使用已加入成员名单的邮箱和密码登录。</span></div>
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

      <template v-if="configScreen === 'list'">
        <section class="capability-list-heading">
          <div>
            <span class="section-kicker">能力配置</span>
            <h1>能力类型与能力</h1>
            <p>先查看能力类型的共享条件，再展开维护该类型下的具体能力。</p>
          </div>
          <span class="count-chip">{{ abilityTypes.length }} 个类型 · {{ abilityOptions.length }} 项能力</span>
        </section>

        <section class="capability-list-panel">
          <div class="capability-list-toolbar">
            <label class="capability-list-search">
              <span>搜索类型或能力</span>
              <input v-model="capabilitySearch" type="search" placeholder="搜索能力名称、编码或类型" />
            </label>
            <span class="capability-list-result">{{ groupedAbilityOptions.length }} 个类型 · {{ filteredAbilityOptions.length }} 项能力</span>
            <div class="capability-list-expand-actions">
              <button class="text-button" type="button" :disabled="Boolean(capabilitySearch.trim())" @click="expandAllAbilityGroups">展开全部能力</button>
              <button class="text-button" type="button" :disabled="Boolean(capabilitySearch.trim())" @click="collapseAllAbilityGroups">收起全部能力</button>
            </div>
          </div>

          <div v-if="groupedAbilityOptions.length" class="capability-list-scroll">
            <table class="capability-type-table">
              <thead>
                <tr>
                  <th>能力类型</th>
                  <th>能力</th>
                  <th>产品链路条件维度</th>
                  <th>主体依赖</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody v-for="group in groupedAbilityOptions" :key="group.type.id" class="capability-group-body">
                <tr class="capability-type-row">
                  <td>
                    <div class="capability-type-identity">
                      <strong>{{ group.type.name }}</strong>
                      <small>{{ group.type.id }}</small>
                      <span>{{ group.allAbilities.length }} 项能力</span>
                    </div>
                  </td>
                  <td>
                    <div class="type-ability-tags">
                      <button
                        v-for="ability in group.type.displayMode === 'catalog'
                          ? group.abilities.slice(0, group.type.previewLimit)
                          : abilityGroupExpanded(group.type.id)
                            ? group.abilities
                            : group.abilities.slice(0, group.type.previewLimit)"
                        :key="ability.id"
                        type="button"
                        :title="`配置能力：${ability.name}`"
                        @click="openAbilityConfig(ability.id)"
                      >
                        {{ ability.name }}
                      </button>
                      <button
                        v-if="group.type.displayMode === 'catalog'"
                        class="type-ability-catalog-link"
                        type="button"
                        @click="openAbilityCatalog(group.type.id)"
                      >
                        查看全部 {{ group.allAbilities.length }} 项
                      </button>
                      <button
                        v-else-if="!capabilitySearch.trim() && group.abilities.length > group.type.previewLimit"
                        class="type-ability-more"
                        type="button"
                        :aria-expanded="abilityGroupExpanded(group.type.id)"
                        @click="toggleAbilityGroup(group.type.id)"
                      >
                        {{ abilityGroupExpanded(group.type.id) ? '收起' : `+${group.abilities.length - group.type.previewLimit} More` }}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div v-if="group.type.scenarioDimensionIds.length" class="type-dimension-chips">
                      <span v-for="dimensionId in group.type.scenarioDimensionIds" :key="dimensionId">{{ dimensionLabel(dimensionId) }}</span>
                    </div>
                    <span v-else class="type-empty-value">无产品链路条件</span>
                  </td>
                  <td>
                    <span class="type-dependency-pill" :class="{ 'is-none': group.type.marketDependency === 'none' }">
                      {{ marketDependencyLabels[group.type.marketDependency] }}
                    </span>
                  </td>
                  <td><button class="configure-type-button" type="button" @click="openAbilityTypeConfig(group.type.id)">配置类型</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="!filteredAbilityOptions.length" class="empty-state">没有符合当前筛选条件的能力。</div>
        </section>
      </template>

      <template v-else-if="configScreen === 'catalog'">
        <section class="ability-selector catalog-heading" aria-labelledby="ability-catalog-title">
          <div>
            <span class="section-kicker">能力目录</span>
            <h1 id="ability-catalog-title">{{ selectedAbilityType.name }}</h1>
            <p>集中查看和维护该类型下的高枚举能力，无需在能力类型列表中全部展开。</p>
          </div>
          <button class="secondary-button ability-list-back" type="button" @click="showAbilityList">返回能力列表</button>
        </section>

        <section class="capability-list-panel catalog-panel">
          <div class="capability-list-toolbar catalog-toolbar">
            <label class="capability-list-search">
              <span>搜索{{ selectedAbilityType.name }}</span>
              <input v-model="catalogSearch" type="search" :placeholder="`搜索${selectedAbilityType.name}名称或编码`" />
            </label>
            <span class="capability-list-result">{{ filteredCatalogAbilities.length }} 项结果</span>
          </div>
          <div v-if="pagedCatalogAbilities.length" class="capability-list-scroll">
            <table class="capability-catalog-table">
              <thead>
                <tr>
                  <th>能力</th>
                  <th>能力编码</th>
                  <th>产品链路规则</th>
                  <th>主体支持情况</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ability in pagedCatalogAbilities" :key="ability.id">
                  <td><strong>{{ ability.name }}</strong></td>
                  <td><code>{{ ability.id }}</code></td>
                  <td><span class="catalog-rule-count">{{ capabilityScenarioRuleCount(ability.id) }} 条</span></td>
                  <td><span class="catalog-rule-count">{{ capabilitySubjectSupportCount(ability.id) }} 个产品码支持</span></td>
                  <td>
                    <button class="configure-button" type="button" @click="openAbilityConfig(ability.id, 'catalog')">配置能力</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">没有符合当前搜索条件的能力。</div>
          <footer v-if="filteredCatalogAbilities.length" class="scenario-table-footer catalog-pagination">
            <span>共 {{ filteredCatalogAbilities.length }} 条</span>
            <div>
              <button type="button" :disabled="catalogPage === 1" @click="catalogPage--">‹</button>
              <button
                v-for="page in catalogTotalPages"
                :key="page"
                :class="{ 'is-active': catalogPage === page }"
                type="button"
                @click="catalogPage = page"
              >
                {{ page }}
              </button>
              <button type="button" :disabled="catalogPage === catalogTotalPages" @click="catalogPage++">›</button>
            </div>
            <select v-model="catalogPageSize" @change="catalogPage = 1">
              <option :value="12">12 条/页</option>
              <option :value="24">24 条/页</option>
              <option :value="36">36 条/页</option>
            </select>
          </footer>
        </section>
      </template>

      <template v-else-if="configScreen === 'type-editor'">
        <section class="ability-selector" aria-labelledby="ability-type-title">
          <div>
            <span class="section-kicker">能力类型配置</span>
            <h1 id="ability-type-title">{{ selectedAbilityType.name }}</h1>
            <p>{{ selectedTypeAbilities.length }} 项能力共享产品链路条件维度和主体依赖。</p>
          </div>
          <button class="secondary-button ability-list-back" type="button" @click="showAbilityList">返回能力列表</button>
        </section>

        <section class="panel type-metadata-panel">
          <header class="panel-header">
            <div><strong>能力类型元数据</strong><span>修改后会统一作用于该类型下的全部能力。</span></div>
          </header>
          <div class="metadata-grid">
            <div class="metadata-summary">
              <label><span>类型编码</span><input :value="selectedAbilityType.id" disabled /></label>
              <label><span>能力类型名称</span><input v-model="selectedAbilityType.name" :disabled="!canEdit" @input="updateAbilityTypeName" /></label>
              <label>
                <span>主体依赖</span>
                <select v-model="selectedAbilityType.marketDependency" :disabled="!canEdit">
                  <option v-for="(label, value) in marketDependencyLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </label>
              <label>
                <span>能力展示方式</span>
                <select v-model="selectedAbilityType.displayMode" :disabled="!canEdit">
                  <option value="inline">行内标签</option>
                  <option value="catalog">独立目录</option>
                </select>
              </label>
              <label>
                <span>列表预览数量</span>
                <input v-model.number="selectedAbilityType.previewLimit" type="number" min="1" max="8" :disabled="!canEdit" />
              </label>
            </div>
            <div class="metadata-choice-block">
              <div><strong>产品链路支持条件维度</strong><span>该类型下所有能力都会按这些条件生成支持场景组合。</span></div>
              <div class="choice-buttons">
                <button
                  v-for="dimension in config.dimensions"
                  :key="dimension.id"
                  :class="{ 'is-active': selectedAbilityType.scenarioDimensionIds.includes(dimension.id) }"
                  type="button"
                  :disabled="!canEdit"
                  @click="toggleTypeScenarioDimension(dimension.id)"
                >
                  <i>{{ selectedAbilityType.scenarioDimensionIds.includes(dimension.id) ? '✓' : '' }}</i>{{ dimension.label }}
                </button>
              </div>
            </div>
          </div>
          <div class="type-member-list">
            <strong>类型下能力</strong>
            <div>
              <span v-for="ability in selectedTypeAbilities.slice(0, selectedAbilityType.displayMode === 'catalog' ? selectedAbilityType.previewLimit : selectedTypeAbilities.length)" :key="ability.id">{{ ability.name }}</span>
              <button
                v-if="selectedAbilityType.displayMode === 'catalog' && selectedTypeAbilities.length > selectedAbilityType.previewLimit"
                class="type-member-catalog-link"
                type="button"
                @click="openAbilityCatalog(selectedAbilityType.id)"
              >
                查看全部 {{ selectedTypeAbilities.length }} 项
              </button>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
      <section class="ability-selector" aria-labelledby="ability-selector-title">
        <div>
          <span class="section-kicker">当前配置能力</span>
          <h1 id="ability-selector-title">{{ metadata.name }}</h1>
          <p>{{ metadata.groupName }} · 维护能力元数据和支持条件。</p>
        </div>
        <button class="secondary-button ability-list-back" type="button" @click="showAbilityList">
          {{ editorReturnScreen === 'catalog' ? '返回能力目录' : '返回能力列表' }}
        </button>
      </section>

      <nav class="config-tabs" aria-label="能力配置类型">
        <button :class="{ 'is-active': activeTab === 'metadata' }" type="button" @click="activeTab = 'metadata'">能力元数据</button>
        <button :class="{ 'is-active': activeTab === 'scenarios' }" type="button" @click="activeTab = 'scenarios'">产品链路支持条件 <span>{{ scenarioRules.length }}</span></button>
        <button :class="{ 'is-active': activeTab === 'markets' }" type="button" @click="activeTab = 'markets'">主体支持条件 <span>{{ supportedSubjectProductCount }}</span></button>
        <button :class="{ 'is-active': activeTab === 'conflicts' }" type="button" @click="activeTab = 'conflicts'">能力冲突 <span>{{ relatedConflicts.length }}</span></button>
      </nav>

      <section v-if="activeTab === 'metadata'" class="panel metadata-panel">
        <header class="panel-header"><div><strong>能力元数据</strong><span>能力类型统一维护产品链路条件维度和主体依赖。</span></div></header>
        <div class="metadata-grid">
          <div class="metadata-summary">
            <label><span>能力编码</span><input :value="metadata.id" disabled /></label>
            <label><span>能力名称</span><input v-model="metadata.name" :disabled="!canEdit" /></label>
            <label><span>能力类型</span><input :value="metadataType.name" disabled /></label>
            <label v-if="metadata.dimensionBinding">
              <span>对应选型项</span>
              <input :value="`${config.dimensions.find((item) => item.id === metadata.dimensionBinding?.dimensionId)?.label} / ${metadata.name}`" disabled />
            </label>
          </div>
          <div class="inherited-type-summary">
            <strong>继承的能力类型条件</strong>
            <span>产品链路：{{ typeDimensionLabels(metadataType) }}</span>
            <span>主体依赖：{{ marketDependencyLabels[metadataType.marketDependency] }}</span>
            <button class="configure-type-button" type="button" @click="openAbilityTypeConfig(metadataType.id)">配置能力类型</button>
          </div>
        </div>
      </section>

      <section v-else-if="activeTab === 'scenarios'" class="panel scenario-table-panel">
        <header class="panel-header">
          <div><strong>产品链路支持情况</strong><span>根据“{{ metadataType.name }}”能力类型配置的条件维度展开组合，逐行维护总体支持情况。</span></div>
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
                <th>总体支持情况</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rule, index) in pagedScenarioRules" :key="rule.id">
                <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td v-for="dimension in activeDimensionDefinitions" :key="dimension.id">
                  {{ conditionLabel(rule.conditions, dimension.id) }}
                </td>
                <td class="overall-status-cell">
                  <select
                    :value="finalDomainStatus(rule.domains, metadata.responsibleDomains)"
                    :class="statusClass(finalDomainStatus(rule.domains, metadata.responsibleDomains))"
                    :disabled="!canEdit"
                    @change="updateOverallStatus(rule, ($event.target as HTMLSelectElement).value as SupportStatus)"
                  >
                    <option v-for="status in statusOptions" :key="status" :value="status">{{ supportStatusLabel[status] }}</option>
                  </select>
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

      <section v-else-if="activeTab === 'markets'" class="panel subject-support-panel">
        <header class="panel-header">
          <div>
            <strong>收单产品码支持情况</strong>
            <span>数据与“主体能力管理”共用，可直接维护当前能力在各收单产品码下的支持情况。</span>
          </div>
          <span class="count-chip">{{ supportedSubjectProductCount }} / {{ acquiringProductCodes.length }} 个产品码支持</span>
        </header>

        <template v-if="metadataType.marketDependency !== 'none'">
          <div class="subject-support-toolbar">
            <label>
              <span>搜索产品码或产品名称</span>
              <input v-model="subjectProductSearch" type="search" placeholder="输入产品码、产品名称或收单主体" />
            </label>
            <label>
              <span>主体国家/地区</span>
              <select v-model="subjectCountryFilter">
                <option value="All">全部国家/地区</option>
                <option v-for="country in subjectCountryOptions" :key="country" :value="country">{{ country }}</option>
              </select>
            </label>
            <span>{{ filteredSubjectProducts.length }} 条结果</span>
          </div>

          <div v-if="filteredSubjectProducts.length" class="subject-support-table-scroll">
            <table class="subject-support-table">
              <thead>
                <tr>
                  <th>收单产品码</th>
                  <th>产品名称</th>
                  <th>收单主体</th>
                  <th>国家/地区</th>
                  <th>产品模式</th>
                  <th>支持情况</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in filteredSubjectProducts" :key="product.code">
                  <td><strong class="subject-product-code">{{ product.code }}</strong></td>
                  <td><span class="subject-product-name" :title="product.productName">{{ product.productName }}</span></td>
                  <td>
                    <div class="subject-entity">
                      <strong>{{ product.entityName }}</strong>
                      <code>{{ product.entityCode }}</code>
                    </div>
                  </td>
                  <td><span class="subject-country-pill">{{ product.country }}</span></td>
                  <td><span class="subject-mode-pill" :class="`is-${product.mode}`">{{ productModeLabels[product.mode] }}</span></td>
                  <td>
                    <select
                      :value="subjectCapabilityStatus(product.code, selectedAbility)"
                      :class="statusClass(subjectCapabilityStatus(product.code, selectedAbility))"
                      :disabled="!canEdit"
                      :aria-label="`${product.code} 支持情况`"
                      @change="updateSubjectProductStatus(product.code, ($event.target as HTMLSelectElement).value as SupportStatus)"
                    >
                      <option v-for="status in statusOptions" :key="status" :value="status">{{ supportStatusLabel[status] }}</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state empty-state--compact">没有符合当前筛选条件的收单产品码。</div>
        </template>
        <div v-else class="empty-state">
          当前能力类型未配置主体依赖，无需维护收单产品码支持情况。
        </div>
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
      </template>
    </section>

    <footer class="action-bar">
      <span><i :class="{ 'has-changes': hasChanges }"></i>{{ hasChanges ? '当前有未保存修改' : '当前配置已同步' }}</span>
      <div><button class="text-button" type="button" :disabled="!hasChanges" @click="undoChanges">撤销修改</button><button class="secondary-button" type="button" :disabled="!canEdit || isPersisting || !hasChanges" @click="saveDraft">保存草稿</button><button class="primary-button" type="button" :disabled="!canPublish || isPersisting" @click="publishConfig">发布配置</button></div>
    </footer>
  </main>
</template>

<style scoped>
.config-shell{--blue:#1267f1;--blue-soft:#eef5ff;--border:#d8e0ec;--border-soft:#e8edf5;--text:#172033;--muted:#68768d;--green:#27833e;--green-bg:#eaf7ed;--orange:#df820b;--orange-bg:#fff3df;--gray:#7b8797;--gray-bg:#eef2f6;min-height:100vh;padding-bottom:72px;background:#f5f7fb;color:var(--text)}
button,select,input{font:inherit}button{cursor:pointer}.config-header,.header-title,.header-actions,.action-bar,.action-bar>div{display:flex;align-items:center}.config-header{position:sticky;top:0;z-index:20;justify-content:space-between;min-height:58px;border-bottom:1px solid var(--border-soft);padding:10px 32px;background:rgba(255,255,255,.98);box-shadow:0 5px 16px rgba(15,23,42,.05)}.header-title{gap:9px;font-size:17px}.header-title>span{display:grid;width:27px;height:27px;place-items:center;border-radius:7px;background:var(--blue-soft);color:var(--blue)}.header-actions{gap:9px}.connection-chip,.count-chip{border:1px solid var(--border);border-radius:999px;padding:4px 9px;background:#f7f9fc;color:var(--muted);font-size:11px;font-weight:750;white-space:nowrap}.connection-chip.is-cloud{border-color:#bcd0f5;background:var(--blue-soft);color:var(--blue)}
.config-content{width:min(1480px,calc(100% - 48px));margin:0 auto;padding:18px 0}.auth-panel{display:flex;align-items:center;gap:10px;margin-bottom:12px;border:1px solid #bcd0f5;border-radius:8px;padding:12px 14px;background:#f8fbff}.auth-panel>div{display:grid;flex:1;gap:3px}.auth-panel strong{font-size:13px}.auth-panel span,.notice{color:var(--muted);font-size:12px}.auth-panel>input,.password-field{width:min(250px,38vw);height:32px;border:1px solid var(--border);border-radius:6px;padding:0 9px;background:#fff}.password-field{display:flex;align-items:center;width:min(210px,32vw);padding-right:4px}.password-field input{min-width:0;height:30px;flex:1;border:0;outline:none}.password-field button{border:0;background:transparent;color:var(--blue);font-size:11px}.notice{margin:0 0 10px;border-left:3px solid #83aef7;padding:7px 10px;background:#f8fbff}.notice--error{border-left-color:#d65a5a;background:#fff7f7;color:#a43f3f}
.capability-list-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:14px;padding:4px 2px}.capability-list-heading h1,.capability-list-heading p{margin:0}.capability-list-heading h1{margin-top:3px;font-size:22px}.capability-list-heading p{margin-top:4px;color:var(--muted);font-size:12px}.capability-list-panel{overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.035)}.capability-list-toolbar{display:flex;align-items:end;gap:12px;border-bottom:1px solid var(--border-soft);padding:12px 14px;background:#f8faff}.capability-list-toolbar label{display:grid;min-width:190px;gap:5px}.capability-list-toolbar label>span{color:var(--muted);font-size:11px;font-weight:750}.capability-list-search{width:min(420px,48vw)}.capability-list-result{margin-left:auto;padding-bottom:7px;color:var(--muted);font-size:11px;white-space:nowrap}.capability-list-expand-actions{display:flex;align-items:center;padding-bottom:1px;white-space:nowrap}.capability-list-expand-actions .text-button{padding:0 7px;font-size:11px}.capability-list-expand-actions .text-button:focus-visible{border-radius:4px;outline:2px solid var(--blue);outline-offset:1px}.capability-list-scroll{overflow-x:auto;background:#fff}.capability-list-table{width:100%;min-width:860px;border-collapse:collapse}.capability-list-table th,.capability-list-table td{height:50px;border-bottom:1px solid var(--border-soft);padding:8px 12px;font-size:12px;text-align:left;vertical-align:middle}.capability-list-table th{height:38px;background:#f7f9fc;color:#59677d;font-size:11px;font-weight:800;white-space:nowrap}.capability-list-table th:nth-child(1){width:34%}.capability-list-table th:nth-child(2){width:27%}.capability-list-table th:nth-child(3){width:27%}.capability-list-table th:nth-child(4){width:12%}.capability-group-row td{height:48px!important;padding:0!important;background:#f3f6fa}.capability-group-row-content{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(400px,1.3fr) auto;align-items:center;min-height:48px;padding-right:12px}.capability-group-trigger{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;min-height:48px;gap:8px;border:0;padding:0 12px;background:transparent;color:var(--text);text-align:left}.capability-group-trigger:hover{background:#edf3fb}.capability-group-trigger strong{font-size:12px}.capability-group-trigger>span:last-child{border-radius:999px;padding:2px 7px;background:#fff;color:var(--muted);font-size:10px;font-weight:750}.capability-type-summary{display:flex;min-width:0;gap:18px;color:var(--muted);font-size:10px}.capability-type-summary span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.capability-group-chevron{color:#768399;font-size:19px;line-height:1;transition:transform .16s ease}.capability-group-trigger[aria-expanded=true] .capability-group-chevron{transform:rotate(90deg);color:var(--blue)}.capability-item-row{background:#fff}.capability-item-row:hover{background:#fbfdff}.capability-item-row td:first-child{padding-left:40px}.capability-item-row td:first-child,.capability-item-row td:nth-child(3){align-content:center}.capability-item-row td:nth-child(3){display:grid;gap:3px}.capability-list-table td strong{font-size:12px}.capability-list-table td span,.capability-list-table td small{color:var(--muted);font-size:10px}.capability-list-table code{border-radius:4px;padding:3px 6px;background:#f3f6fa;color:#556276;font-size:10px}.dimension-summary{color:var(--text)!important}.configure-button,.configure-type-button{min-height:29px;border:1px solid #a9c4f5;border-radius:5px;padding:0 10px;background:#f8fbff;color:var(--blue);font-size:11px;font-weight:750;white-space:nowrap}.configure-button:hover,.configure-type-button:hover{border-color:var(--blue);background:var(--blue-soft)}.ability-list-back{flex:0 0 auto}
.capability-type-table{width:100%;min-width:1040px;border-collapse:collapse;table-layout:fixed}.capability-type-table>thead th{height:38px;border-bottom:1px solid var(--border-soft);padding:8px 12px;background:#f7f9fc;color:#59677d;font-size:11px;font-weight:800;text-align:left;white-space:nowrap}.capability-type-table>thead th:nth-child(1){width:22%}.capability-type-table>thead th:nth-child(2){width:31%}.capability-type-table>thead th:nth-child(3){width:23%}.capability-type-table>thead th:nth-child(4){width:12%}.capability-type-table>thead th:nth-child(5){width:12%}.capability-type-row td{height:62px;border-bottom:1px solid var(--border-soft);padding:9px 12px;background:#fff;color:var(--text);font-size:12px;vertical-align:middle}.capability-type-row:hover td{background:#fbfdff}.capability-type-row .capability-group-trigger{grid-template-columns:20px minmax(0,1fr);width:100%;min-height:42px;padding:0}.capability-type-row .capability-group-trigger:hover{background:transparent}.capability-type-row .capability-group-trigger:focus-visible{border-radius:4px;outline:2px solid var(--blue);outline-offset:1px}.capability-type-row .capability-group-trigger>span:last-child{display:grid;gap:3px;border-radius:0;padding:0;background:transparent;color:var(--text);font-weight:400}.capability-type-row .capability-group-trigger strong{font-size:12px}.capability-type-row .capability-group-trigger small{color:var(--muted);font-size:9px;font-weight:500}.type-dimension-chips{display:flex;flex-wrap:wrap;gap:5px}.type-dimension-chips span{border:1px solid #d9e4f5;border-radius:4px;padding:3px 6px;background:#f7faff;color:#516078;font-size:10px;font-weight:700;white-space:nowrap}.type-empty-value{color:var(--muted);font-size:10px}.type-dependency-pill{display:inline-flex;border-radius:999px;padding:4px 8px;background:#eef5ff;color:#3768a8;font-size:10px;font-weight:750;white-space:nowrap}.type-dependency-pill.is-none{background:var(--gray-bg);color:var(--gray)}.type-ability-count{color:#526177;font-size:11px;font-weight:750}.type-capabilities-row>td{border-bottom:1px solid var(--border-soft);padding:0 12px 12px;background:#f7f9fc}.type-capabilities-panel{overflow:hidden;border:1px solid #dce4ef;border-radius:6px;background:#fff}.type-capabilities-panel>header{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:44px;border-bottom:1px solid var(--border-soft);padding:8px 12px;background:#fbfcfe}.type-capabilities-panel>header>div{display:grid;gap:2px}.type-capabilities-panel>header strong{font-size:12px}.type-capabilities-panel>header div span,.type-capabilities-panel>header>span{color:var(--muted);font-size:10px}.capability-detail-table{width:100%;border-collapse:collapse;table-layout:fixed}.capability-detail-table th,.capability-detail-table td{height:43px;border-bottom:1px solid var(--border-soft);padding:7px 12px;font-size:11px;text-align:left;vertical-align:middle}.capability-detail-table th{height:32px;background:#fff;color:#778397;font-size:10px;font-weight:750}.capability-detail-table th:nth-child(1){width:26%}.capability-detail-table th:nth-child(2){width:28%}.capability-detail-table th:nth-child(3){width:17%}.capability-detail-table th:nth-child(4){width:19%}.capability-detail-table th:nth-child(5){width:10%}.capability-detail-table tbody tr:last-child td{border-bottom:0}.capability-detail-table tbody tr:hover{background:#fbfdff}.capability-detail-table td strong{font-size:11px}.capability-detail-table code{border-radius:4px;padding:3px 6px;background:#f3f6fa;color:#556276;font-size:9px}.configure-button,.configure-type-button{min-height:29px;border:1px solid #a9c4f5;border-radius:5px;padding:0 10px;background:#f8fbff;color:var(--blue);font-size:11px;font-weight:750;white-space:nowrap}.configure-button:hover,.configure-type-button:hover{border-color:var(--blue);background:var(--blue-soft)}.ability-list-back{flex:0 0 auto}
.capability-type-table>thead th:nth-child(1){width:19%}.capability-type-table>thead th:nth-child(2){width:31%}.capability-type-table>thead th:nth-child(3){width:25%}.capability-type-table>thead th:nth-child(4){width:16%}.capability-type-table>thead th:nth-child(5){width:9%}.capability-type-row td{height:auto;min-height:62px}.capability-type-identity{display:grid;align-content:center;gap:2px}.capability-type-identity strong{font-size:12px}.capability-type-identity small{color:var(--muted);font-size:9px}.capability-type-identity>span{justify-self:start;margin-top:3px;border-radius:999px;padding:2px 6px;background:var(--gray-bg);color:var(--muted);font-size:9px;font-weight:700}.type-ability-tags{display:flex;align-items:center;flex-wrap:wrap;gap:5px}.type-ability-tags>button{max-width:150px;min-height:27px;overflow:hidden;border:1px solid #d7e1ef;border-radius:5px;padding:0 8px;background:#fff;color:#3f5068;font-size:10px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.type-ability-tags>button:hover{border-color:#9dbcf3;background:var(--blue-soft);color:var(--blue)}.type-ability-tags>button:focus-visible{outline:2px solid var(--blue);outline-offset:1px}.type-ability-tags>button.type-ability-more{border-color:transparent;background:#eef4fd;color:#356dbd}.type-ability-tags>button.type-ability-more:hover{border-color:#a9c4f5;background:#e5efff}.type-ability-tags>button.type-ability-catalog-link{max-width:none;border-color:#a9c4f5;background:#f7faff;color:#1769e8}.type-ability-tags>button.type-ability-catalog-link:hover{border-color:#1769e8;background:#edf4ff}.configure-button,.configure-type-button{min-height:29px;border:1px solid #a9c4f5;border-radius:5px;padding:0 10px;background:#f8fbff;color:var(--blue);font-size:11px;font-weight:750;white-space:nowrap}.configure-button:hover,.configure-type-button:hover{border-color:var(--blue);background:var(--blue-soft)}.ability-list-back{flex:0 0 auto}
.catalog-panel{margin-top:14px}.catalog-toolbar{align-items:flex-end;background:#fff}.capability-catalog-table{width:100%;min-width:820px;border-collapse:collapse;table-layout:fixed}.capability-catalog-table th,.capability-catalog-table td{height:50px;border-bottom:1px solid var(--border-soft);padding:8px 14px;font-size:12px;text-align:left;vertical-align:middle}.capability-catalog-table th{height:38px;background:#f7f9fc;color:#59677d;font-size:11px;font-weight:800;white-space:nowrap}.capability-catalog-table th:nth-child(1){width:24%}.capability-catalog-table th:nth-child(2){width:30%}.capability-catalog-table th:nth-child(3){width:17%}.capability-catalog-table th:nth-child(4){width:20%}.capability-catalog-table th:nth-child(5){width:9%}.capability-catalog-table tbody tr:hover{background:#fbfdff}.capability-catalog-table td strong{font-size:12px}.capability-catalog-table code{border-radius:4px;padding:3px 6px;background:#f3f6fa;color:#556276;font-size:10px}.catalog-rule-count{color:#536177;font-size:11px;font-weight:700}.catalog-pagination{border-top:0}.type-member-catalog-link{min-height:26px;border:1px solid #a9c4f5;border-radius:999px;padding:0 10px;background:#f7faff;color:var(--blue);font-size:10px;font-weight:750}.type-member-catalog-link:hover{border-color:var(--blue);background:var(--blue-soft)}
.ability-selector{display:flex;align-items:center;justify-content:space-between;gap:28px;border:1px solid #c9d9f3;border-radius:8px;padding:16px 18px;background:linear-gradient(90deg,#fff 0,#f7faff 100%);box-shadow:0 8px 22px rgba(15,23,42,.035)}.section-kicker{color:var(--blue);font-size:11px;font-weight:800}.ability-selector h1{margin:3px 0 0;font-size:22px}.ability-selector p{margin:4px 0 0;color:var(--muted);font-size:12px}.ability-selector label{display:grid;width:min(360px,42vw);gap:5px}.ability-selector label>span,.metadata-summary label>span,.rule-builder label>span,.domain-status-grid label>span,.compact-domain-status label>span,.market-builder label>span,.pair-builder label>span,.conflict-builder label>span,.market-default-grid label>span{color:var(--muted);font-size:11px;font-weight:750}select,input{height:32px;border:1px solid var(--border);border-radius:6px;padding:0 9px;background:#fff;color:var(--text);font-size:12px}input:disabled{background:#f5f7fa;color:#8893a4}
.config-tabs{display:flex;gap:4px;margin:14px 0 12px;border-bottom:1px solid var(--border)}.config-tabs button{min-height:38px;border:0;border-bottom:2px solid transparent;padding:0 15px;background:transparent;color:var(--muted);font-size:13px;font-weight:750}.config-tabs button.is-active{border-bottom-color:var(--blue);color:var(--blue)}.config-tabs button span{margin-left:4px;border-radius:999px;padding:1px 6px;background:var(--gray-bg);font-size:10px}
.panel{overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.035)}.tab-stack{display:grid;gap:12px}.panel-header{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:54px;border-bottom:1px solid var(--border-soft);padding:10px 14px}.panel-header>div{display:grid;gap:3px}.panel-header strong{font-size:14px}.panel-header div span{color:var(--muted);font-size:11px}.metadata-grid{display:grid;grid-template-columns:minmax(360px,.85fr) minmax(420px,1.15fr);gap:0}.metadata-summary,.metadata-choice-block{padding:16px}.metadata-summary{display:grid;grid-template-columns:1fr 1fr;gap:12px;border-right:1px solid var(--border-soft)}.metadata-summary label{display:grid;gap:5px}.metadata-choice-block{border-right:1px solid var(--border-soft)}.metadata-choice-block:last-child{border-right:0}.metadata-choice-block>div:first-child{display:grid;gap:3px;margin-bottom:12px}.metadata-choice-block strong{font-size:13px}.metadata-choice-block>div:first-child span{color:var(--muted);font-size:11px}.choice-buttons{display:flex;flex-wrap:wrap;gap:7px}.choice-buttons button{display:inline-flex;align-items:center;gap:6px;min-height:32px;border:1px solid var(--border);border-radius:6px;padding:0 10px;background:#fff;color:var(--muted);font-size:12px;font-weight:700}.choice-buttons button.is-active{border-color:#9fc0fb;background:var(--blue-soft);color:var(--blue)}.choice-buttons i{display:grid;width:14px;height:14px;place-items:center;border:1px solid #b8c4d4;border-radius:3px;font-size:9px;font-style:normal}.choice-buttons button.is-active i{border-color:var(--blue);background:var(--blue);color:#fff}
.inherited-type-summary{display:grid;align-content:center;gap:7px;padding:16px}.inherited-type-summary strong{font-size:13px}.inherited-type-summary>span{color:var(--muted);font-size:11px}.inherited-type-summary .configure-type-button{justify-self:start;margin-top:3px}.type-member-list{display:grid;grid-template-columns:120px 1fr;align-items:start;gap:14px;border-top:1px solid var(--border-soft);padding:14px 16px}.type-member-list>strong{font-size:12px}.type-member-list>div{display:flex;flex-wrap:wrap;gap:7px}.type-member-list span{border-radius:999px;padding:4px 9px;background:var(--gray-bg);color:var(--muted);font-size:10px;font-weight:700}
.domain-status-grid,.market-default-grid{display:flex;flex-wrap:wrap;gap:12px;padding:14px}.domain-status-grid label,.market-default-grid label{display:grid;min-width:180px;gap:5px}.rule-builder,.market-builder,.pair-builder,.conflict-builder{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr)) minmax(220px,1.5fr) auto;align-items:end;gap:10px;padding:14px;background:#f8faff}.rule-builder label,.market-builder label,.pair-builder label,.conflict-builder label{display:grid;gap:5px}.wide-field{min-width:0}.pair-builder{grid-template-columns:minmax(160px,1fr) 26px minmax(160px,1fr) minmax(130px,.8fr) minmax(220px,1.3fr) auto}.pair-arrow{align-self:center;padding-top:16px;color:#8b97a8;text-align:center}.conflict-builder{grid-template-columns:minmax(150px,.8fr) 24px minmax(170px,1fr) minmax(150px,.9fr) minmax(220px,1.3fr) auto}.conflict-builder>span{align-self:center;padding-top:16px;color:#a15e5e;text-align:center}.current-ability-chip{align-self:end;min-height:32px;border:1px solid #bcd0f5;border-radius:6px;padding:7px 10px;background:var(--blue-soft);color:var(--blue);font-size:12px;font-weight:750}
.scenario-filter-bar{display:flex;align-items:end;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--border-soft);padding:12px 14px;background:#f8faff}.scenario-filter-bar label{display:grid;min-width:150px;gap:5px}.scenario-filter-bar label span{color:var(--muted);font-size:11px;font-weight:750}.scenario-filter-bar .text-button{margin-left:auto}.scenario-table-scroll{overflow-x:auto}.scenario-table{width:100%;min-width:1080px;border-collapse:collapse;table-layout:auto}.scenario-table th,.scenario-table td{height:48px;border-bottom:1px solid var(--border-soft);padding:8px 10px;font-size:12px;text-align:left;white-space:nowrap}.scenario-table th{height:40px;background:#f8faff;color:#59677d;font-weight:800}.scenario-table tbody tr:hover{background:#fbfdff}.domain-status-cell select{width:100px;height:28px;border-color:transparent;border-radius:999px;padding:0 8px;font-size:11px;font-weight:750;text-align:center;text-align-last:center}.domain-status-cell select.status-pill--standard{background:var(--green-bg);color:var(--green)}.domain-status-cell select.status-pill--conditional{background:var(--orange-bg);color:var(--orange)}.domain-status-cell select.status-pill--unsupported{background:var(--gray-bg);color:var(--gray)}.scenario-note{width:150px;height:28px}.scenario-table-footer{display:flex;align-items:center;justify-content:flex-end;gap:14px;min-height:50px;padding:8px 14px}.scenario-table-footer>span{margin-right:auto;color:var(--muted);font-size:11px}.scenario-table-footer>div{display:flex;gap:4px}.scenario-table-footer button{min-width:28px;height:28px;border:1px solid var(--border);border-radius:5px;background:#fff;color:var(--muted);font-size:11px}.scenario-table-footer button.is-active{border-color:var(--blue);background:var(--blue);color:#fff}.scenario-table-footer select{height:28px}
.overall-status-cell select{width:112px;height:28px;border-color:transparent;border-radius:999px;padding:0 8px;font-size:11px;font-weight:750;text-align:center;text-align-last:center}.overall-status-cell select.status-pill--standard{background:var(--green-bg);color:var(--green)}.overall-status-cell select.status-pill--conditional{background:var(--orange-bg);color:var(--orange)}.overall-status-cell select.status-pill--unsupported{background:var(--gray-bg);color:var(--gray)}
.subject-support-toolbar{display:flex;align-items:end;gap:12px;border-bottom:1px solid var(--border-soft);padding:12px 14px;background:#f8faff}.subject-support-toolbar label{display:grid;min-width:180px;gap:5px}.subject-support-toolbar label:first-child{width:min(380px,42vw)}.subject-support-toolbar label>span{color:var(--muted);font-size:11px;font-weight:750}.subject-support-toolbar>span{margin-left:auto;padding-bottom:8px;color:var(--muted);font-size:11px;white-space:nowrap}.subject-support-table-scroll{overflow-x:auto}.subject-support-table{width:100%;min-width:980px;border-collapse:collapse;table-layout:fixed}.subject-support-table th,.subject-support-table td{height:52px;border-bottom:1px solid var(--border-soft);padding:8px 12px;font-size:11px;text-align:left;vertical-align:middle}.subject-support-table th{height:38px;background:#f7f9fc;color:#59677d;font-size:10px;font-weight:800;white-space:nowrap}.subject-support-table th:nth-child(1){width:13%}.subject-support-table th:nth-child(2){width:24%}.subject-support-table th:nth-child(3){width:25%}.subject-support-table th:nth-child(4){width:9%}.subject-support-table th:nth-child(5){width:12%}.subject-support-table th:nth-child(6){width:17%}.subject-support-table tbody tr:hover{background:#fbfdff}.subject-product-code{color:var(--blue);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px}.subject-product-name{display:block;overflow:hidden;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.subject-entity{display:grid;gap:2px}.subject-entity strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.subject-entity code{color:#8290a3;font-size:9px}.subject-country-pill,.subject-mode-pill{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:9px;font-weight:750;white-space:nowrap}.subject-country-pill{background:#eef4fd;color:#3f6fae}.subject-mode-pill.is-instant{background:var(--green-bg);color:var(--green)}.subject-mode-pill.is-escrow{background:var(--orange-bg);color:var(--orange)}.subject-mode-pill.is-passthrough{background:var(--blue-soft);color:var(--blue)}.subject-mode-pill.is-other{background:var(--gray-bg);color:var(--gray)}.subject-support-table select{width:112px;height:28px;border-color:transparent;border-radius:999px;padding:0 8px;font-size:10px;font-weight:750;text-align:center;text-align-last:center}.subject-support-table select.status-pill--standard{background:var(--green-bg);color:var(--green)}.subject-support-table select.status-pill--conditional{background:var(--orange-bg);color:var(--orange)}.subject-support-table select.status-pill--unsupported{background:var(--gray-bg);color:var(--gray)}
.rule-list,.simple-list{display:grid}.rule-item,.simple-list article{display:grid;align-items:center;gap:14px;min-height:62px;margin:0;border-bottom:1px solid var(--border-soft);padding:10px 14px}.rule-item{grid-template-columns:minmax(300px,1.3fr) minmax(300px,1fr) 110px auto}.rule-condition{display:grid;gap:3px}.rule-condition strong{font-size:12px}.rule-condition span{color:var(--muted);font-size:11px}.compact-domain-status{display:flex;gap:7px}.compact-domain-status label{display:grid;min-width:88px;gap:3px}.compact-domain-status select{height:28px;padding:0 6px}.simple-list article{grid-template-columns:minmax(190px,.9fr) 90px 110px minmax(220px,1.2fr) auto}.simple-list article strong,.simple-list article b{font-size:12px}.simple-list article p{overflow:hidden;margin:0;color:var(--muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.status-pill,.conflict-pill{justify-self:start;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:750;white-space:nowrap}.status-pill--standard{background:var(--green-bg);color:var(--green)}.status-pill--conditional{background:var(--orange-bg);color:var(--orange)}.status-pill--unsupported{background:var(--gray-bg);color:var(--gray)}.conflict-pill{background:#fff0f0;color:#b04747}.empty-state{padding:52px 20px;color:var(--muted);font-size:12px;text-align:center}.empty-state--compact{padding:24px 20px}.danger-text-button{border:0;background:transparent;color:#b14e4e;font-size:11px;font-weight:700}.danger-text-button:disabled{opacity:.45}
.text-button,.secondary-button,.primary-button{min-height:32px;border-radius:6px;padding:0 12px;font-size:12px;font-weight:750}.text-button{border:0;background:transparent;color:var(--muted)}.secondary-button{border:1px solid var(--border);background:#fff;color:var(--text)}.primary-button{border:1px solid var(--blue);background:var(--blue);color:#fff}button:disabled{cursor:not-allowed;opacity:.5}.action-bar{position:fixed;right:0;bottom:0;left:0;z-index:21;justify-content:space-between;min-height:56px;border-top:1px solid var(--border-soft);padding:8px 32px;background:rgba(255,255,255,.98);box-shadow:0 -5px 18px rgba(15,23,42,.05)}.action-bar>span{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:12px}.action-bar>span i{width:8px;height:8px;border-radius:50%;background:#9aaf9e}.action-bar>span i.has-changes{background:var(--orange)}.action-bar>div{gap:9px}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)}
@media(max-width:1100px){.metadata-grid{grid-template-columns:1fr 1fr}.metadata-summary{grid-column:1/-1;border-right:0;border-bottom:1px solid var(--border-soft)}.rule-builder,.market-builder{grid-template-columns:repeat(3,1fr)}.wide-field{grid-column:1/3}.rule-item{grid-template-columns:1fr auto}.compact-domain-status{grid-row:2;grid-column:1/-1}.conflict-builder,.pair-builder{grid-template-columns:1fr 24px 1fr 1fr}.conflict-builder .wide-field,.pair-builder .wide-field{grid-column:1/4}.simple-list article{grid-template-columns:1fr 100px 110px auto}.simple-list article p{grid-row:2;grid-column:1/-1}}
@media(max-width:720px){.config-header{align-items:flex-start;flex-direction:column;gap:8px;padding:10px 14px}.header-actions{width:100%;overflow-x:auto}.config-content{width:calc(100% - 24px);padding-top:12px}.auth-panel,.ability-selector{align-items:stretch;flex-direction:column}.auth-panel>input,.password-field,.ability-selector label{width:100%}.config-tabs{overflow-x:auto}.config-tabs button{flex:0 0 auto}.metadata-grid{grid-template-columns:1fr}.metadata-summary{grid-template-columns:1fr}.metadata-choice-block{border-right:0;border-bottom:1px solid var(--border-soft)}.rule-builder,.market-builder,.pair-builder,.conflict-builder{grid-template-columns:1fr}.wide-field,.conflict-builder .wide-field,.pair-builder .wide-field{grid-column:auto}.pair-arrow,.conflict-builder>span{display:none}.rule-item,.simple-list article{align-items:flex-start;grid-template-columns:1fr auto}.compact-domain-status{overflow-x:auto}.status-pill{grid-column:2}.simple-list article p{grid-row:auto;grid-column:1/-1;white-space:normal}.subject-support-toolbar{align-items:stretch;flex-direction:column}.subject-support-toolbar label,.subject-support-toolbar label:first-child{width:100%;min-width:0}.subject-support-toolbar>span{margin-left:0;padding-bottom:0}.action-bar{align-items:flex-start;flex-direction:column;gap:5px;padding:8px 12px}}
@media(max-width:720px){.capability-list-heading{align-items:flex-start;flex-direction:column;gap:9px}.capability-list-toolbar{align-items:stretch;flex-direction:column}.capability-list-toolbar label,.capability-list-search{width:100%;min-width:0}.capability-list-result{margin-left:0;padding-bottom:0}.capability-list-expand-actions{padding-bottom:0}.capability-list-expand-actions .text-button{padding-left:0}.capability-group-trigger{grid-template-columns:18px minmax(0,1fr) auto;padding:0 11px}.capability-type-row .capability-group-trigger{grid-template-columns:18px minmax(0,1fr);padding:0}.type-member-list{grid-template-columns:1fr}.ability-list-back{width:100%}}
</style>
