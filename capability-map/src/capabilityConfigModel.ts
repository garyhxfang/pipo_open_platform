import {
  agreementPaymentAbilityGroups,
  environmentOptions,
  integrationOptions,
  marketOptions,
  merchantTypeOptions,
  paymentAbilityGroups,
  productOptions,
  subscriptionManagementGroups,
  subscriptionPaymentAbilityGroups,
  type SupportStatus
} from './capabilityData'
import type {
  CapabilityConfigPayloadV2,
  CapabilityConfigPayloadV3,
  CapabilityConfigPayloadV4,
  CapabilityFeatureId,
  CapabilityMetadata,
  DomainId,
  DomainStatus,
  LegacyAcquiringConfigPayload,
  MarketDependency,
  ScenarioConditions,
  ScenarioDimensionDefinition,
  ScenarioDimensionId,
  ScenarioSupportRule,
  StoredCapabilityConfigPayload
} from './configTypes'

export const scenarioDimensions: ScenarioDimensionDefinition[] = [
  {
    id: 'merchantType',
    label: '商户类型',
    description: '能力适用的商户经营模式',
    values: merchantTypeOptions.map(({ value, label }) => ({ id: value, label }))
  },
  {
    id: 'product',
    label: '收单支付产品',
    description: '能力适用的支付产品',
    values: productOptions.map(({ value, label }) => ({ id: value, label }))
  },
  {
    id: 'environment',
    label: '支付环境',
    description: '能力适用的用户终端环境',
    values: environmentOptions.map(({ value, label }) => ({ id: value, label }))
  },
  {
    id: 'integrationMode',
    label: '集成模式',
    description: '能力适用的收银台或接口形态',
    values: integrationOptions.map(({ value, label }) => ({ id: value, label }))
  }
]

export const countryOptions = marketOptions.filter((market) => market !== 'All')
export const allDomains: DomainId[] = ['transaction', 'cashier', 'gn']

const dimensionFeatureMetadata: CapabilityMetadata[] = [
  dimensionFeature('merchantStandard', '普通商户', '商户类型', 'merchantType', 'standardMerchant', []),
  dimensionFeature('merchantPlatform', '平台商户', '商户类型', 'merchantType', 'platformMerchant', []),
  dimensionFeature('productOnline', '在线支付', '收单支付产品', 'product', 'online', []),
  dimensionFeature('productAgreementDeduction', '协议代扣', '收单支付产品', 'product', 'agreementDeduction', []),
  dimensionFeature('productSubscription', '订阅', '收单支付产品', 'product', 'subscription', ['merchantType']),
  dimensionFeature('environmentTtInside', 'TT端内', '支付环境', 'environment', 'app', ['product']),
  dimensionFeature('environmentTtOutside', 'TT端外', '支付环境', 'environment', 'web', ['integrationMode']),
  dimensionFeature('integrationHosted', '独立收银台', '集成模式', 'integrationMode', 'hosted', ['product', 'environment']),
  dimensionFeature('integrationEmbedded', '嵌入式收银台', '集成模式', 'integrationMode', 'embedded', ['product', 'environment']),
  dimensionFeature('integrationApi', 'API', '集成模式', 'integrationMode', 'api', ['merchantType', 'product'])
]

const paymentMetadata: CapabilityMetadata[] = [
  ...paymentAbilityGroups,
  ...subscriptionManagementGroups,
  ...subscriptionPaymentAbilityGroups,
  ...agreementPaymentAbilityGroups
].flatMap((group) =>
  group.options.map((option) =>
    businessFeature(option.value, option.label, group.id, group.title, ['merchantType', 'product', 'environment', 'integrationMode'], 'none', option.status)
  )
)

export const defaultCapabilityMetadata: CapabilityMetadata[] = [
  ...dimensionFeatureMetadata,
  ...paymentMetadata,
  businessFeature('currencyExchange', '换汇', 'valueAdded', '增值服务', ['environment', 'integrationMode'], 'both', 'unsupported'),
  businessFeature('taxCalculation', '计税', 'valueAdded', '增值服务', ['environment', 'integrationMode'], 'merchant', 'unsupported'),
  businessFeature('userFee', '用户手续费', 'valueAdded', '增值服务', ['product', 'integrationMode'], 'both', 'unsupported'),
  businessFeature('marketing', '营销', 'valueAdded', '增值服务', ['environment', 'integrationMode'], 'both', 'unsupported')
]

const managedValueAddedIds = new Set<CapabilityFeatureId>([
  'currencyExchange',
  'taxCalculation',
  'userFee',
  'marketing'
])
const deprecatedCapabilityIds = new Set<string>(['incrementalPreAuth', 'overCapture'])

const statusWeight: Record<SupportStatus, number> = { standard: 0, conditional: 1, unsupported: 2 }

function dimensionFeature(
  id: CapabilityFeatureId,
  name: string,
  groupName: string,
  dimensionId: ScenarioDimensionId,
  value: string,
  scenarioDimensionIds: ScenarioDimensionId[]
): CapabilityMetadata {
  return {
    id,
    name,
    groupId: dimensionId,
    groupName,
    featureType: 'dimensionValue',
    dimensionBinding: { dimensionId, value },
    responsibleDomains: [...allDomains],
    scenarioDimensionIds,
    marketDependency: 'none',
    defaultDomains: uniformDomains('standard'),
    defaultMerchantMarketStatus: 'standard',
    defaultConsumerMarketStatus: 'standard'
  }
}

function businessFeature(
  id: CapabilityFeatureId,
  name: string,
  groupId: string,
  groupName: string,
  scenarioDimensionIds: ScenarioDimensionId[],
  marketDependency: MarketDependency,
  defaultStatus: SupportStatus
): CapabilityMetadata {
  return {
    id,
    name,
    groupId,
    groupName,
    featureType: 'businessCapability',
    responsibleDomains: [...allDomains],
    scenarioDimensionIds,
    marketDependency,
    defaultDomains: uniformDomains(defaultStatus),
    defaultMerchantMarketStatus: 'standard',
    defaultConsumerMarketStatus: 'standard'
  }
}

function uniformDomains(status: SupportStatus): DomainStatus {
  return { transaction: status, cashier: status, gn: status }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function weakestStatus(statuses: SupportStatus[]) {
  return [...statuses].sort((left, right) => statusWeight[right] - statusWeight[left])[0] ?? 'standard'
}

export function finalDomainStatus(domains: DomainStatus, responsibleDomains: DomainId[] = allDomains): SupportStatus {
  return weakestStatus(responsibleDomains.map((domain) => domains[domain]))
}

export function scenarioRuleId(capabilityId: CapabilityFeatureId, conditions: ScenarioConditions) {
  const key = scenarioDimensions
    .filter((dimension) => conditions[dimension.id])
    .map((dimension) => `${dimension.id}=${conditions[dimension.id]}`)
    .join('&')
  return `${capabilityId}|${key || 'all'}`
}

export function createSeedPayload(): CapabilityConfigPayloadV4 {
  const payload: CapabilityConfigPayloadV4 = {
    schemaVersion: 4,
    catalogRevision: 2,
    exportedAt: new Date().toISOString(),
    dimensions: cloneValue(scenarioDimensions),
    capabilities: cloneValue(defaultCapabilityMetadata),
    scenarioRules: [],
    marketRules: [],
    marketPairExceptions: [],
    conflicts: []
  }
  materializeDimensionFeatureRules(payload)
  applyDefaultDimensionFeatureStatuses(payload)
  materializeBusinessCapabilityRules(payload)
  applyDefaultBusinessCapabilityStatuses(payload)
  return payload
}

function materializeDimensionFeatureRules(payload: CapabilityConfigPayloadV4) {
  for (const capability of payload.capabilities.filter((item) => item.featureType === 'dimensionValue')) {
    materializeScenarioRules(payload, capability.id)
  }
}

function materializeBusinessCapabilityRules(payload: CapabilityConfigPayloadV4) {
  for (const capability of payload.capabilities.filter((item) => item.featureType === 'businessCapability')) {
    materializeScenarioRules(payload, capability.id)
  }
}

function applyDefaultDimensionFeatureStatuses(payload: CapabilityConfigPayloadV4) {
  setRuleStatus(payload, 'productSubscription', { merchantType: 'platformMerchant' }, 'unsupported', '订阅仅支持普通商户')
  setRuleStatus(payload, 'environmentTtInside', { product: 'subscription' }, 'unsupported', '订阅场景不支持 TT 端内')
  setRuleStatus(payload, 'environmentTtOutside', { integrationMode: 'embedded' }, 'unsupported', 'TT 端外不支持嵌入式收银台')

  setRuleStatus(payload, 'integrationHosted', { product: 'agreementDeduction', environment: 'app' }, 'unsupported', '协议代扣在 TT 端内不支持独立收银台')
  setRuleStatus(payload, 'integrationHosted', { product: 'agreementDeduction', environment: 'web' }, 'conditional', '协议代扣在 TT 端外条件支持独立收银台')

  setRuleStatus(payload, 'integrationEmbedded', { product: 'online', environment: 'app' }, 'conditional', '在线支付在 TT 端内条件支持嵌入式收银台')
  setRuleStatus(payload, 'integrationEmbedded', { product: 'agreementDeduction', environment: 'app' }, 'unsupported', '协议代扣不支持嵌入式收银台')
  setRuleStatus(payload, 'integrationEmbedded', { product: 'agreementDeduction', environment: 'web' }, 'unsupported', '协议代扣不支持嵌入式收银台')
  setRuleStatus(payload, 'integrationEmbedded', { product: 'subscription', environment: 'app' }, 'unsupported', '订阅不支持嵌入式收银台')
  setRuleStatus(payload, 'integrationEmbedded', { product: 'subscription', environment: 'web' }, 'unsupported', '订阅不支持嵌入式收银台')

  setRuleStatus(payload, 'integrationApi', { merchantType: 'standardMerchant', product: 'subscription' }, 'unsupported', '订阅不支持 API')
  setRuleStatus(payload, 'integrationApi', { merchantType: 'platformMerchant', product: 'subscription' }, 'unsupported', '订阅不支持 API')
  setRuleStatus(payload, 'integrationApi', { merchantType: 'platformMerchant', product: 'online' }, 'conditional', '平台商户在线支付条件支持 API')
  setRuleStatus(payload, 'integrationApi', { merchantType: 'platformMerchant', product: 'agreementDeduction' }, 'conditional', '平台商户协议代扣条件支持 API')
}

function applyDefaultBusinessCapabilityStatuses(payload: CapabilityConfigPayloadV4) {
  setRuleStatus(payload, 'currencyExchange', { environment: 'web', integrationMode: 'hosted' }, 'standard', 'TT 端外独立收银台支持换汇，适用于全部支付产品')
  setRuleStatus(payload, 'taxCalculation', { environment: 'web', integrationMode: 'hosted' }, 'standard', 'TT 端外独立收银台支持计税，适用于全部支付产品')
  setRuleStatus(payload, 'marketing', { environment: 'app', integrationMode: 'embedded' }, 'conditional', 'TT 端内嵌入式收银台条件支持营销')
  setRuleStatus(payload, 'userFee', { product: 'online', integrationMode: 'hosted' }, 'standard', '在线支付独立收银台支持用户手续费')
  setRuleStatus(payload, 'userFee', { product: 'online', integrationMode: 'embedded' }, 'standard', '在线支付嵌入式收银台支持用户手续费')
}

function setRuleStatus(
  payload: CapabilityConfigPayloadV4,
  capabilityId: CapabilityFeatureId,
  conditions: ScenarioConditions,
  status: SupportStatus,
  note: string
) {
  const rule = payload.scenarioRules.find(
    (item) => item.capabilityId === capabilityId && scenarioConditionKey(item.conditions) === scenarioConditionKey(conditions)
  )
  if (!rule) return
  rule.domains = uniformDomains(status)
  rule.note = note
}

function scenarioConditionKey(conditions: ScenarioConditions) {
  return scenarioDimensions.map((dimension) => conditions[dimension.id] ?? '*').join('|')
}

export function normalizeConfigPayload(payload?: StoredCapabilityConfigPayload): CapabilityConfigPayloadV4 {
  if (!payload) return createSeedPayload()
  if (payload.schemaVersion === 4) return normalizeV4(payload)
  if (payload.schemaVersion === 3) return migrateV3(payload)
  return payload.schemaVersion === 2 ? migrateV2(payload) : migrateV1(payload)
}

function normalizeV4(payload: CapabilityConfigPayloadV4): CapabilityConfigPayloadV4 {
  const seed = createSeedPayload()
  const needsCatalogUpgrade = (payload.catalogRevision ?? 0) < seed.catalogRevision
  const suppliedCapabilityIds = new Set(payload.capabilities.map((item) => item.id))
  const suppliedRuleCapabilities = new Set(payload.scenarioRules.map((item) => item.capabilityId))
  const normalized: CapabilityConfigPayloadV4 = {
    ...seed,
    ...cloneValue(payload),
    dimensions: payload.dimensions?.length ? cloneValue(payload.dimensions) : seed.dimensions,
    capabilities: [
      ...cloneValue(payload.capabilities),
      ...seed.capabilities.filter((item) => !suppliedCapabilityIds.has(item.id))
    ],
    scenarioRules: [
      ...cloneValue(payload.scenarioRules ?? []),
      ...seed.scenarioRules.filter((item) => !suppliedRuleCapabilities.has(item.capabilityId))
    ],
    marketRules: cloneValue(payload.marketRules ?? []),
    marketPairExceptions: cloneValue(payload.marketPairExceptions ?? []),
    conflicts: cloneValue(payload.conflicts ?? [])
  }
  normalized.catalogRevision = seed.catalogRevision
  if (needsCatalogUpgrade) {
    normalized.capabilities = [
      ...normalized.capabilities.filter((item) => !managedValueAddedIds.has(item.id)),
      ...seed.capabilities.filter((item) => managedValueAddedIds.has(item.id))
    ]
    normalized.scenarioRules = [
      ...normalized.scenarioRules.filter((item) => !managedValueAddedIds.has(item.capabilityId)),
      ...seed.scenarioRules.filter((item) => managedValueAddedIds.has(item.capabilityId))
    ]
  }
  normalized.capabilities = normalized.capabilities.filter((item) => !deprecatedCapabilityIds.has(item.id))
  normalized.scenarioRules = normalized.scenarioRules.filter((item) => !deprecatedCapabilityIds.has(item.capabilityId))
  const preAuth = normalized.capabilities.find((item) => item.id === 'preAuthMultiple')
  if (preAuth) preAuth.name = '预授权支付'
  materializeDimensionFeatureRules(normalized)
  materializeBusinessCapabilityRules(normalized)
  return normalized
}

function migrateV3(payload: CapabilityConfigPayloadV3): CapabilityConfigPayloadV4 {
  const next = createSeedPayload()
  next.exportedAt = payload.exportedAt
  mergeLegacyBusinessMetadata(next, payload.capabilities)
  replaceLegacyRules(next, payload.scenarioRules)
  next.marketRules = cloneValue(payload.marketRules ?? [])
  next.marketPairExceptions = cloneValue(payload.marketPairExceptions ?? [])
  next.conflicts = cloneValue(payload.conflicts ?? [])
  materializeDimensionFeatureRules(next)
  materializeBusinessCapabilityRules(next)
  return next
}

function migrateV1(payload: LegacyAcquiringConfigPayload): CapabilityConfigPayloadV4 {
  const v2: CapabilityConfigPayloadV2 = {
    schemaVersion: 2,
    exportedAt: payload.exportedAt,
    dimensions: [],
    capabilities: [],
    supportRules: payload.records.map((record) => ({
      id: record.id,
      capabilityId: record.abilityId,
      conditions: {
        merchantType: record.merchantType,
        product: record.product,
        environment: record.environment,
        integrationMode: record.integrationMode
      },
      domains: record.domains,
      note: record.note
    })),
    conflicts: []
  }
  return migrateV2(v2)
}

function migrateV2(payload: CapabilityConfigPayloadV2): CapabilityConfigPayloadV4 {
  const next = createSeedPayload()
  next.exportedAt = payload.exportedAt
  mergeLegacyBusinessMetadata(next, payload.capabilities)
  replaceLegacyRules(
    next,
    payload.supportRules.map((rule) => ({
      ...rule,
      conditions: Object.fromEntries(
        Object.entries(rule.conditions).filter(([dimensionId]) => dimensionId !== 'market')
      ) as ScenarioConditions
    }))
  )
  next.conflicts = cloneValue(payload.conflicts ?? [])
  materializeDimensionFeatureRules(next)
  materializeBusinessCapabilityRules(next)
  return next
}

function mergeLegacyBusinessMetadata(
  target: CapabilityConfigPayloadV4,
  legacyCapabilities: Array<{
    id: CapabilityFeatureId
    name: string
    groupId: string
    groupName: string
    applicableDimensionIds?: Array<ScenarioDimensionId | 'market'>
    scenarioDimensionIds?: ScenarioDimensionId[]
    responsibleDomains?: DomainId[]
    marketDependency?: MarketDependency
    defaultDomains?: DomainStatus
  }>
) {
  for (const legacy of legacyCapabilities) {
    if (managedValueAddedIds.has(legacy.id)) continue
    const metadata = target.capabilities.find((item) => item.id === legacy.id && item.featureType === 'businessCapability')
    if (!metadata) continue
    metadata.name = legacy.name
    metadata.groupId = legacy.groupId
    metadata.groupName = legacy.groupName
    metadata.scenarioDimensionIds = legacy.scenarioDimensionIds ?? legacy.applicableDimensionIds?.filter(
      (id): id is ScenarioDimensionId => id !== 'market'
    ) ?? metadata.scenarioDimensionIds
    metadata.responsibleDomains = legacy.responsibleDomains ?? metadata.responsibleDomains
    metadata.marketDependency = legacy.marketDependency ?? (
      legacy.applicableDimensionIds?.includes('market') ? 'consumer' : metadata.marketDependency
    )
    metadata.defaultDomains = cloneValue(legacy.defaultDomains ?? metadata.defaultDomains)
  }
}

function replaceLegacyRules(target: CapabilityConfigPayloadV4, rules: ScenarioSupportRule[]) {
  const businessIds = new Set(
    target.capabilities.filter((item) => item.featureType === 'businessCapability').map((item) => item.id)
  )
  const suppliedIds = new Set(rules.filter((rule) => businessIds.has(rule.capabilityId)).map((rule) => rule.capabilityId))
  target.scenarioRules = [
    ...target.scenarioRules.filter((rule) => !suppliedIds.has(rule.capabilityId)),
    ...cloneValue(rules.filter((rule) => businessIds.has(rule.capabilityId)))
  ]
}

export function buildScenarioCombinations(
  dimensionIds: ScenarioDimensionId[],
  dimensions: ScenarioDimensionDefinition[] = scenarioDimensions
): ScenarioConditions[] {
  return dimensionIds.reduce<ScenarioConditions[]>((combinations, dimensionId) => {
    const dimension = dimensions.find((item) => item.id === dimensionId)
    if (!dimension) return combinations
    return combinations.flatMap((combination) =>
      dimension.values.map((value) => ({ ...combination, [dimensionId]: value.id }))
    )
  }, [{}])
}

export function materializeScenarioRules(payload: CapabilityConfigPayloadV4, capabilityId: CapabilityFeatureId) {
  const metadata = payload.capabilities.find((item) => item.id === capabilityId)
  if (!metadata) return
  const existing = payload.scenarioRules.filter((rule) => rule.capabilityId === capabilityId)
  const combinations = buildScenarioCombinations(metadata.scenarioDimensionIds, payload.dimensions)
    .filter((conditions) => metadata.featureType === 'dimensionValue' || scenarioCombinationStatus(payload, conditions) !== 'unsupported')

  const materialized = combinations.map((conditions) => {
    const candidates = existing.filter((rule) =>
      metadata.scenarioDimensionIds.every(
        (dimensionId) => !rule.conditions[dimensionId] || rule.conditions[dimensionId] === conditions[dimensionId]
      )
    )
    const maxSpecificity = Math.max(
      0,
      ...candidates.map((rule) =>
        metadata.scenarioDimensionIds.filter((dimensionId) => Boolean(rule.conditions[dimensionId])).length
      )
    )
    const strongest = candidates.filter(
      (rule) => metadata.scenarioDimensionIds.filter((dimensionId) => Boolean(rule.conditions[dimensionId])).length === maxSpecificity
    )
    return {
      id: scenarioRuleId(capabilityId, conditions),
      capabilityId,
      conditions,
      domains: strongest.length
        ? cloneValue(strongest.map((rule) => rule.domains).reduce(mergeWeakestDomains))
        : cloneValue(metadata.defaultDomains),
      note: strongest.find((rule) => rule.note)?.note ?? ''
    }
  })

  payload.scenarioRules = [
    ...payload.scenarioRules.filter((rule) => rule.capabilityId !== capabilityId),
    ...materialized
  ]
}

export function materializeAllScenarioRules(payload: CapabilityConfigPayloadV4) {
  materializeDimensionFeatureRules(payload)
  materializeBusinessCapabilityRules(payload)
}

function mergeWeakestDomains(left: DomainStatus, right: DomainStatus): DomainStatus {
  return {
    transaction: weakestStatus([left.transaction, right.transaction]),
    cashier: weakestStatus([left.cashier, right.cashier]),
    gn: weakestStatus([left.gn, right.gn])
  }
}

function ruleMatches(rule: ScenarioSupportRule, context: ScenarioConditions) {
  return Object.entries(rule.conditions).every(
    ([dimensionId, value]) => !value || context[dimensionId as ScenarioDimensionId] === value
  )
}

function directCapabilityStatus(
  payload: CapabilityConfigPayloadV4,
  capabilityId: CapabilityFeatureId,
  context: ScenarioConditions
): SupportStatus | undefined {
  const metadata = payload.capabilities.find((item) => item.id === capabilityId)
  if (!metadata) return undefined
  const matchingRule = payload.scenarioRules
    .filter((rule) => rule.capabilityId === capabilityId && ruleMatches(rule, context))
    .sort((left, right) => Object.keys(right.conditions).length - Object.keys(left.conditions).length)[0]
  return finalDomainStatus(matchingRule?.domains ?? metadata.defaultDomains, metadata.responsibleDomains)
}

export function resolveDimensionValueStatus(
  payload: CapabilityConfigPayloadV4,
  dimensionId: ScenarioDimensionId,
  value: string,
  context: ScenarioConditions
): SupportStatus {
  const feature = payload.capabilities.find(
    (item) => item.featureType === 'dimensionValue' && item.dimensionBinding?.dimensionId === dimensionId && item.dimensionBinding.value === value
  )
  return feature ? directCapabilityStatus(payload, feature.id, { ...context, [dimensionId]: value }) ?? 'standard' : 'standard'
}

export function scenarioCombinationStatus(payload: CapabilityConfigPayloadV4, context: ScenarioConditions): SupportStatus {
  const statuses = payload.capabilities
    .filter(
      (item) =>
        item.featureType === 'dimensionValue' &&
        item.dimensionBinding &&
        context[item.dimensionBinding.dimensionId] === item.dimensionBinding.value
    )
    .map((item) => directCapabilityStatus(payload, item.id, context) ?? 'standard')
  return weakestStatus(statuses)
}

export function resolveCapabilityStatus(
  payload: CapabilityConfigPayloadV4,
  capabilityId: CapabilityFeatureId,
  context: ScenarioConditions & {
    merchantContractingCountry?: string
    consumerPaymentCountry?: string
  }
): SupportStatus | undefined {
  const metadata = payload.capabilities.find((item) => item.id === capabilityId)
  if (!metadata) return undefined
  const statuses: SupportStatus[] = [directCapabilityStatus(payload, capabilityId, context) ?? 'standard']
  if (metadata.featureType === 'businessCapability') statuses.push(scenarioCombinationStatus(payload, context))

  if (metadata.marketDependency === 'merchant' || metadata.marketDependency === 'both') {
    statuses.push(resolveMarketStatus(payload, capabilityId, 'merchantContractingCountry', context.merchantContractingCountry, metadata.defaultMerchantMarketStatus))
  }
  if (metadata.marketDependency === 'consumer' || metadata.marketDependency === 'both') {
    statuses.push(resolveMarketStatus(payload, capabilityId, 'consumerPaymentCountry', context.consumerPaymentCountry, metadata.defaultConsumerMarketStatus))
  }
  if (metadata.marketDependency === 'both' && context.merchantContractingCountry && context.consumerPaymentCountry) {
    const pair = payload.marketPairExceptions.find(
      (item) =>
        item.capabilityId === capabilityId &&
        item.merchantContractingCountry === context.merchantContractingCountry &&
        item.consumerPaymentCountry === context.consumerPaymentCountry
    )
    if (pair) statuses.push(pair.status)
  }
  return weakestStatus(statuses)
}

function resolveMarketStatus(
  payload: CapabilityConfigPayloadV4,
  capabilityId: CapabilityFeatureId,
  scope: 'merchantContractingCountry' | 'consumerPaymentCountry',
  country: string | undefined,
  fallback: SupportStatus
) {
  if (!country || country === 'All') return fallback
  return payload.marketRules.find(
    (rule) => rule.capabilityId === capabilityId && rule.scope === scope && rule.country === country
  )?.status ?? fallback
}
