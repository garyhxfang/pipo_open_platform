import type { PaymentAbilityId, SupportStatus } from './capabilityData'

export type AppRole = 'viewer' | 'editor' | 'publisher'
export type DomainId = 'transaction' | 'cashier' | 'gn'
export type ScenarioDimensionId = 'merchantType' | 'product' | 'environment' | 'integrationMode'
export type LegacyConditionDimensionId = ScenarioDimensionId | 'market'
export type ConflictType = 'mutuallyExclusive' | 'conditional'
export type MarketScope = 'merchantContractingCountry' | 'consumerPaymentCountry'
export type MarketDependency = 'none' | 'merchant' | 'consumer' | 'both'
export type CapabilityTypeDisplayMode = 'inline' | 'catalog'
export type CatalogCapabilityId =
  | `paymentMethod:${string}`
  | `pricingCurrency:${string}`
export type CapabilityFeatureId =
  | PaymentAbilityId
  | CatalogCapabilityId
  | 'merchantStandard'
  | 'merchantPlatform'
  | 'productOnline'
  | 'productAgreementDeduction'
  | 'productSubscription'
  | 'environmentTtInside'
  | 'environmentTtOutside'
  | 'integrationHosted'
  | 'integrationEmbedded'
  | 'integrationApi'
  | 'capture'
  | 'currencyExchange'
  | 'taxCalculation'
  | 'userFee'
  | 'marketing'

export interface DomainStatus {
  transaction: SupportStatus
  cashier: SupportStatus
  gn: SupportStatus
}

export interface ConditionValueDefinition {
  id: string
  label: string
}

export interface ScenarioDimensionDefinition {
  id: ScenarioDimensionId
  label: string
  description: string
  values: ConditionValueDefinition[]
}

export interface CapabilityTypeDefinition {
  id: string
  name: string
  scenarioDimensionIds: ScenarioDimensionId[]
  marketDependency: MarketDependency
  displayMode: CapabilityTypeDisplayMode
  previewLimit: number
}

export interface CapabilityMetadata {
  id: CapabilityFeatureId
  name: string
  groupId: string
  groupName: string
  featureType: 'dimensionValue' | 'businessCapability'
  dimensionBinding?: {
    dimensionId: ScenarioDimensionId
    value: string
  }
  responsibleDomains: DomainId[]
  defaultDomains: DomainStatus
  defaultMerchantMarketStatus: SupportStatus
  defaultConsumerMarketStatus: SupportStatus
}

export type ScenarioConditions = Partial<Record<ScenarioDimensionId, string>>

export interface ScenarioAvailabilityRule {
  id: string
  targetDimensionId: ScenarioDimensionId
  targetValue: string
  conditions: ScenarioConditions
  status: SupportStatus
  note: string
}

export interface ScenarioSupportRule {
  id: string
  capabilityId: CapabilityFeatureId
  conditions: ScenarioConditions
  domains: DomainStatus
  note: string
}

export interface MarketSupportRule {
  id: string
  capabilityId: CapabilityFeatureId
  scope: MarketScope
  country: string
  status: SupportStatus
  note: string
}

export interface MarketPairException {
  id: string
  capabilityId: CapabilityFeatureId
  merchantContractingCountry: string
  consumerPaymentCountry: string
  status: SupportStatus
  note: string
}

export interface CapabilityConflict {
  id: string
  sourceCapabilityId: CapabilityFeatureId
  targetCapabilityId: CapabilityFeatureId
  type: ConflictType
  conditions: ScenarioConditions
  note: string
}

export interface CapabilityConfigPayloadV4 {
  schemaVersion: 4
  catalogRevision: number
  exportedAt: string
  dimensions: ScenarioDimensionDefinition[]
  capabilityTypes: CapabilityTypeDefinition[]
  capabilities: CapabilityMetadata[]
  scenarioRules: ScenarioSupportRule[]
  marketRules: MarketSupportRule[]
  marketPairExceptions: MarketPairException[]
  conflicts: CapabilityConflict[]
}

export interface CapabilityConfigPayloadV3 {
  schemaVersion: 3
  exportedAt: string
  dimensions: ScenarioDimensionDefinition[]
  scenarioConstraints?: ScenarioAvailabilityRule[]
  capabilities: Array<Omit<CapabilityMetadata, 'featureType' | 'dimensionBinding'>>
  scenarioRules: ScenarioSupportRule[]
  marketRules: MarketSupportRule[]
  marketPairExceptions: MarketPairException[]
  conflicts: CapabilityConflict[]
}

export interface LegacyCapabilityFeatureDefinition {
  id: CapabilityFeatureId
  name: string
  groupId: string
  groupName: string
  applicableDimensionIds: LegacyConditionDimensionId[]
}

export type LegacyApplicabilityConditions = Partial<Record<LegacyConditionDimensionId, string>>

export interface LegacyCapabilitySupportRule {
  id: string
  capabilityId: CapabilityFeatureId
  conditions: LegacyApplicabilityConditions
  domains: DomainStatus
  note: string
}

export interface CapabilityConfigPayloadV2 {
  schemaVersion: 2
  exportedAt: string
  dimensions: Array<{
    id: LegacyConditionDimensionId
    label: string
    description: string
    values: ConditionValueDefinition[]
  }>
  capabilities: LegacyCapabilityFeatureDefinition[]
  supportRules: LegacyCapabilitySupportRule[]
  conflicts: CapabilityConflict[]
}

export interface LegacyAcquiringScenarioConfig {
  id: string
  merchantType: string
  product: string
  environment: string
  integrationMode: string
  abilityId: PaymentAbilityId
  domains: DomainStatus
  note: string
}

export interface LegacyAcquiringConfigPayload {
  schemaVersion: 1
  exportedAt: string
  records: LegacyAcquiringScenarioConfig[]
}

export type StoredCapabilityConfigPayload =
  | CapabilityConfigPayloadV4
  | CapabilityConfigPayloadV3
  | CapabilityConfigPayloadV2
  | LegacyAcquiringConfigPayload

export interface PublishedConfig {
  version: number
  publishedAt: string
  payload: CapabilityConfigPayloadV4
}
