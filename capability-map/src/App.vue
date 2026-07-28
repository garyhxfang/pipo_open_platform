<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadPublishedConfig } from './acquiringConfigRepository'
import {
  createSeedPayload,
  resolveCapabilityStatus,
  resolveDimensionValueStatus,
  scenarioCombinationStatus
} from './capabilityConfigModel'
import AcquiringConfigView from './AcquiringConfigView.vue'
import AgileIntakeView from './AgileIntakeView.vue'
import CapabilityDocHint from './CapabilityDocHint.vue'
import PayoutConfigView from './PayoutConfigView.vue'
import PayoutMapView, { type PayoutStageId } from './PayoutMapView.vue'
import ReconciliationView from './ReconciliationView.vue'
import RefundDisputeView from './RefundDisputeView.vue'
import RuntimeStatusView from './RuntimeStatusView.vue'
import SettlementView from './SettlementView.vue'
import SubjectCapabilityView from './SubjectCapabilityView.vue'
import {
  agreementPaymentAbilityGroups,
  capabilities,
  defaultSelectedPaymentAbilities,
  environmentOptions,
  integrationOptions,
  marketOptions,
  merchantTypeOptions,
  paymentAbilityGroups,
  paymentMethodOperationalDetails,
  paymentMethodTypeOptions,
  subscriptionManagementGroups,
  subscriptionPaymentAbilityGroups,
  visiblePaymentAbilityGroups,
  productOptions,
  shortSupportLabel,
  supportStatusLabel,
  type CapabilityItem,
  type Environment,
  type IntegrationMode,
  type MarketSelection,
  type MerchantType,
  type PaymentAbilityId,
  type PaymentAbilityGroupId,
  type PaymentMethodTagId,
  type PaymentMethodOperationalDetails,
  type PaymentMethodTypeSelection,
  type ProductType,
  type SupportStatus
} from './capabilityData'
import type { CapabilityConfigPayloadV4, CapabilityFeatureId } from './configTypes'
import { acquiringProductCatalog } from './acquiringProductCatalog'
import { productDocumentationPath } from './documentationLinks'

const currentMerchantType = ref<MerchantType>('standardMerchant')
type WorkspacePage =
  | 'map'
  | 'runtime-status'
  | 'agile-intake'
  | 'config'
  | 'subject-capabilities'
  | 'payout-config'

const currentWorkspacePage = ref<WorkspacePage>('map')
const currentBusinessLine = ref<'collection' | 'payout'>('collection')
const currentPayoutStage = ref<PayoutStageId>('payout')
const payoutConfigVersion = ref(0)
const currentProduct = ref<ProductType>('online')
const currentEnvironment = ref<Environment>('web')
const currentIntegration = ref<IntegrationMode>('hosted')
const currentStage = ref<StageId>('acquiring')
const selectedPaymentMethod = ref<CapabilityItem>()
const merchantContractingCountry = ref<MarketSelection>('All')
const consumerPaymentCountry = ref<MarketSelection>('All')
const selectedPaymentMethodType = ref<PaymentMethodTypeSelection>('All')
const selectedPaymentAbilities = ref<PaymentAbilityId[]>([...defaultSelectedPaymentAbilities])
const publishedConfig = ref<CapabilityConfigPayloadV4>()
const fallbackCapabilityConfig = createSeedPayload()

const paymentMethodTagLabels: Record<PaymentMethodTagId, string> = {
  standaloneBinding: '独立绑定',
  payAndBind: '支付并绑定',
  preAuthPay: '预授权支付'
}

const valueAddedFeatureIds: Record<string, CapabilityFeatureId> = {
  fx: 'currencyExchange',
  tax: 'taxCalculation',
  'user-fee': 'userFee',
  marketing: 'marketing'
}

type IconName =
  | 'map'
  | 'merchant'
  | 'platform'
  | 'onlinePay'
  | 'agreementPay'
  | 'subscription'
  | 'web'
  | 'app'
  | 'hosted'
  | 'embedded'
  | 'api'
  | 'retry'
  | 'binding'
  | 'combined'
  | 'preAuth'
  | 'refund'
  | 'settlement'
  | 'reconciliation'

type StageId = 'acquiring' | 'refundDispute' | 'settlement' | 'withdrawal' | 'reconciliation'

interface StageOption {
  id: StageId
  title: string
  icon: IconName
}

const iconSvg: Record<IconName, string> = {
  map:
    '<svg viewBox="0 0 24 24" role="img"><path d="m4.5 6.2 5-2.2 5 2.2 5-2.2v13.8l-5 2.2-5-2.2-5 2.2V6.2Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9.5 4v13.8M14.5 6.2V20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  merchant:
    '<svg viewBox="0 0 24 24" role="img"><path d="M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="currentColor"/><path d="M5 20.4c.7-3.6 3.1-5.5 7-5.5s6.3 1.9 7 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  platform:
    '<svg viewBox="0 0 24 24" role="img"><path d="M8.2 10.8a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6ZM16.7 11.4a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8Z" fill="currentColor"/><path d="M2.8 20.1c.6-3.6 2.6-5.3 5.8-5.3s5.2 1.7 5.8 5.3M13 18.2c.8-2.2 2.4-3.3 4.6-3.3 2.4 0 3.8 1.3 4.2 3.9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  onlinePay:
    '<svg viewBox="0 0 24 24" role="img"><rect x="4" y="4" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 20h6M12 16v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 8v4M9.8 10h4.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  agreementPay:
    '<svg viewBox="0 0 24 24" role="img"><rect x="5" y="4" width="14" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  subscription:
    '<svg viewBox="0 0 24 24" role="img"><path d="M17.7 7.1a7.5 7.5 0 0 0-12 2.7M5.2 5.9v4.2h4.2M6.3 16.9a7.5 7.5 0 0 0 12-2.7M18.8 18.1v-4.2h-4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  web:
    '<svg viewBox="0 0 24 24" role="img"><rect x="3.5" y="4.5" width="17" height="12" rx="1.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 20h7M12 16.5V20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  app:
    '<svg viewBox="0 0 24 24" role="img"><rect x="7.5" y="3.5" width="9" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 6.5h3M11.3 17.5h1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  hosted:
    '<svg viewBox="0 0 24 24" role="img"><rect x="5" y="3.5" width="14" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 8h7M8.5 11.8h7M8.5 15.6h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  embedded:
    '<svg viewBox="0 0 24 24" role="img"><path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  api:
    '<svg viewBox="0 0 24 24" role="img"><text x="3" y="15.7" fill="currentColor" font-size="9.5" font-weight="800" font-family="Inter, Arial, sans-serif">API</text></svg>',
  retry:
    '<svg viewBox="0 0 24 24" role="img"><path d="M17.8 7.1a7.5 7.5 0 0 0-12.2 2.6M5 5.8v4.4h4.4M6.2 16.9a7.5 7.5 0 0 0 12.2-2.6M19 18.2v-4.4h-4.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  binding:
    '<svg viewBox="0 0 24 24" role="img"><path d="M8.4 15.6 15.6 8.4M10.8 6.2h7v7" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  combined:
    '<svg viewBox="0 0 24 24" role="img"><path d="M6 8.2h12l-2.2 7.6H3.8L6 8.2Z" fill="currentColor"/><path d="M7 6h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  preAuth:
    '<svg viewBox="0 0 24 24" role="img"><path d="M12 3.7 20.3 12 12 20.3 3.7 12 12 3.7Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  refund:
    '<svg viewBox="0 0 24 24" role="img"><path d="M7.2 8.2h9.1a4.5 4.5 0 0 1 0 9H9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.4 4.9 4 8.3l3.4 3.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  settlement:
    '<svg viewBox="0 0 24 24" role="img"><path d="M5 7.2h14M5 12h14M5 16.8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 4.8 5 7.2 8 9.6M16 14.4l3 2.4-3 2.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  reconciliation:
    '<svg viewBox="0 0 24 24" role="img"><rect x="5" y="3.5" width="14" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 8.2h7M8.5 12h4.2M8.5 15.8h3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m14.2 15.5 1.5 1.5 3-3.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}

const stageOptions: StageOption[] = [
  {
    id: 'acquiring',
    title: '收单支付',
    icon: 'onlinePay'
  },
  {
    id: 'refundDispute',
    title: '退款与拒付',
    icon: 'refund'
  },
  {
    id: 'settlement',
    title: '清结算',
    icon: 'settlement'
  },
  {
    id: 'withdrawal',
    title: '提现',
    icon: 'settlement'
  },
  {
    id: 'reconciliation',
    title: '账单与对账',
    icon: 'reconciliation'
  }
]

const payoutStageOptions: Array<{ id: PayoutStageId; title: string; icon: IconName }> = [
  {
    id: 'prefunding',
    title: '商户备款',
    icon: 'settlement'
  },
  {
    id: 'payout',
    title: '出款',
    icon: 'settlement'
  },
  {
    id: 'return',
    title: '退票',
    icon: 'refund'
  },
  {
    id: 'reconciliation',
    title: '账单与对账',
    icon: 'reconciliation'
  }
]

const choiceIcon: Record<MerchantType | ProductType | Environment | IntegrationMode, IconName> = {
  standardMerchant: 'merchant',
  platformMerchant: 'platform',
  online: 'onlinePay',
  agreementDeduction: 'agreementPay',
  subscription: 'subscription',
  web: 'web',
  app: 'app',
  hosted: 'hosted',
  embedded: 'embedded',
  api: 'api'
}

const abilityGroupIcon: Record<PaymentAbilityGroupId, IconName> = {
  retry: 'retry',
  binding: 'binding',
  combined: 'combined',
  preAuth: 'preAuth',
  subscriptionPricing: 'subscription',
  subscriptionExpiry: 'retry',
  subscriptionUpgrade: 'combined',
  subscriptionPlan: 'subscription',
  initialRetry: 'retry',
  renewalCharge: 'agreementPay',
  agreementMode: 'agreementPay',
  agreementRetry: 'retry',
  deductionRetry: 'retry'
}

const displayedPaymentAbilityGroups = computed(() =>
  currentProduct.value === 'subscription'
    ? subscriptionPaymentAbilityGroups
    : currentProduct.value === 'agreementDeduction'
      ? agreementPaymentAbilityGroups
      : visiblePaymentAbilityGroups
)

const paymentAbilitySectionTitle = computed(() =>
  currentProduct.value === 'agreementDeduction' ? '签约及支付能力' : '支付能力'
)

const paymentAbilitySectionDescription = computed(() => {
  if (currentProduct.value === 'subscription') return '选择首订支付重试与续订扣款模式（可多选）。'
  if (currentProduct.value === 'agreementDeduction') return '选择签约模式及签约、代扣阶段的支付重试能力（可多选）。'
  return '根据您的业务需要，选择能力组合（可多选）。'
})

const allSelectableAbilityGroups = [
  ...paymentAbilityGroups,
  ...subscriptionManagementGroups,
  ...subscriptionPaymentAbilityGroups,
  ...agreementPaymentAbilityGroups
]

const filteredCapabilities = computed(() =>
  capabilities.filter((capability) => {
    const matchesSelection =
      capability.products.includes(currentProduct.value) &&
      capability.environments.includes(currentEnvironment.value) &&
      capability.integrationModes.includes(currentIntegration.value)
    const matchesMarket =
      consumerPaymentCountry.value === 'All' || capability.marketStatus[consumerPaymentCountry.value] !== 'unsupported'

    return matchesSelection && matchesMarket
  })
)

const paymentCapabilities = computed(() =>
  filteredCapabilities.value.filter(
    (capability) =>
      capability.category === 'payment' &&
      (selectedPaymentMethodType.value === 'All' || capability.paymentMethodType === selectedPaymentMethodType.value)
  )
)
const paymentMethodGridColumns = ref(5)
const paymentMethodPage = ref(1)
const paymentMethodPageSize = computed(() => paymentMethodGridColumns.value * 4)
const paymentMethodPageCount = computed(() =>
  Math.max(1, Math.ceil(paymentCapabilities.value.length / paymentMethodPageSize.value))
)
const paymentMethodVisiblePages = computed(() => {
  const visibleCount = Math.min(5, paymentMethodPageCount.value)
  const start = Math.max(
    1,
    Math.min(paymentMethodPage.value - 2, paymentMethodPageCount.value - visibleCount + 1)
  )
  return Array.from({ length: visibleCount }, (_, index) => start + index)
})
const paginatedPaymentCapabilities = computed(() => {
  const start = (paymentMethodPage.value - 1) * paymentMethodPageSize.value
  return paymentCapabilities.value.slice(start, start + paymentMethodPageSize.value)
})

function syncPaymentMethodGridColumns() {
  paymentMethodGridColumns.value = window.innerWidth <= 900 ? 1 : window.innerWidth <= 1280 ? 3 : 5
}

watch([paymentCapabilities, paymentMethodPageSize], () => {
  paymentMethodPage.value = 1
})

const unconfiguredPaymentMethodOperationalDetails: PaymentMethodOperationalDetails = {
  fullRefund: 'unsupported',
  partialRefund: 'unsupported',
  maxRefundPeriod: '未配置',
  chargeback: 'unsupported',
  chargebackDescription: '退款与拒付支持情况尚未配置。'
}

const selectedPaymentMethodHasOperationalDetails = computed(() =>
  selectedPaymentMethod.value
    ? Boolean(paymentMethodOperationalDetails[selectedPaymentMethod.value.id])
    : false
)

const selectedPaymentMethodOperationalDetails = computed(() =>
  selectedPaymentMethod.value
    ? paymentMethodOperationalDetails[selectedPaymentMethod.value.id] ?? unconfiguredPaymentMethodOperationalDetails
    : unconfiguredPaymentMethodOperationalDetails
)

const valueAddedCapabilities = computed(() =>
  capabilities.filter((capability) => capability.category === 'valueAdded')
)

const matchedAcquiringProducts = computed(() => {
  if (merchantContractingCountry.value === 'All') return []
  const matchedProducts = acquiringProductCatalog.filter(
    (product) =>
      product.merchantType === currentMerchantType.value &&
      product.country === merchantContractingCountry.value &&
      (currentMerchantType.value !== 'platformMerchant' || product.name.includes('担保交易'))
  )
  return currentMerchantType.value === 'platformMerchant' ? matchedProducts.slice(0, 1) : matchedProducts
})

function selectMerchantType(value: MerchantType) {
  currentMerchantType.value = value
  if (productStatusFor(currentProduct.value) === 'unsupported') currentProduct.value = 'online'
  normalizeDependentSelections()
}

function selectProduct(value: ProductType) {
  if (productStatusFor(value) === 'unsupported') return
  currentProduct.value = value
  normalizeDependentSelections()
}

function selectEnvironment(value: Environment) {
  if (environmentStatusFor(value) === 'unsupported') return
  currentEnvironment.value = value
  if (integrationStatusFor(currentIntegration.value) === 'unsupported') currentIntegration.value = 'hosted'
}

function selectIntegration(value: IntegrationMode) {
  if (integrationStatusFor(value) === 'unsupported') return
  currentIntegration.value = value
}

function selectStage(value: StageId) {
  selectedPaymentMethod.value = undefined
  currentStage.value = value
}

function selectPayoutStage(value: PayoutStageId) {
  selectedPaymentMethod.value = undefined
  currentPayoutStage.value = value
}

function selectBusinessLine(value: 'collection' | 'payout') {
  selectedPaymentMethod.value = undefined
  currentBusinessLine.value = value
}

function refreshPayoutConfig() {
  payoutConfigVersion.value += 1
}

function openPaymentMethodDetails(capability: CapabilityItem) {
  selectedPaymentMethod.value = capability
}

function closePaymentMethodDetails() {
  selectedPaymentMethod.value = undefined
}

let capabilityDocHoverTimer: number | undefined

function positionCapabilityDocHint(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  if (target.classList.contains('is-doc-hint-visible')) return

  const rect = target.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  const pointerY = event.clientY - rect.top
  const hintWidth = 104
  const pointerGap = 8
  const hasRoomOnRight = window.innerWidth - event.clientX >= hintWidth + pointerGap + 8
  const offsetX = hasRoomOnRight ? pointerGap : -(hintWidth + pointerGap)
  target.style.setProperty('--doc-hint-x', `${pointerX + offsetX}px`)
  target.style.setProperty('--doc-hint-y', `${pointerY + pointerGap}px`)

  if (capabilityDocHoverTimer) window.clearTimeout(capabilityDocHoverTimer)
  capabilityDocHoverTimer = window.setTimeout(() => {
    target.classList.add('is-doc-hint-visible')
  }, 120)
}

function hideCapabilityDocHint(event: PointerEvent) {
  if (capabilityDocHoverTimer) window.clearTimeout(capabilityDocHoverTimer)
  capabilityDocHoverTimer = undefined
  const target = event.currentTarget as HTMLElement
  target.classList.remove('is-doc-hint-visible')
}

function handleWorkspaceKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && selectedPaymentMethod.value) closePaymentMethodDetails()
}

function selectedOptionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find((option) => option.value === value)?.label ?? value
}

function integrationStatusFor(integration: IntegrationMode) {
  return scenarioCombinationStatus(activeCapabilityConfig(), {
    merchantType: currentMerchantType.value,
    product: currentProduct.value,
    environment: currentEnvironment.value,
    integrationMode: integration
  })
}

function productStatusFor(product: ProductType) {
  return resolveDimensionValueStatus(activeCapabilityConfig(), 'product', product, {
    merchantType: currentMerchantType.value,
    product,
    environment: currentEnvironment.value,
    integrationMode: currentIntegration.value
  })
}

function environmentStatusFor(environment: Environment) {
  return scenarioCombinationStatus(activeCapabilityConfig(), {
    merchantType: currentMerchantType.value,
    product: currentProduct.value,
    environment,
    integrationMode: currentIntegration.value
  })
}

function activeCapabilityConfig() {
  return publishedConfig.value ?? fallbackCapabilityConfig
}

function normalizeDependentSelections() {
  if (environmentStatusFor(currentEnvironment.value) === 'unsupported') {
    currentEnvironment.value = environmentOptions.find((option) => environmentStatusFor(option.value) !== 'unsupported')?.value ?? 'web'
  }
  if (integrationStatusFor(currentIntegration.value) === 'unsupported') {
    currentIntegration.value = integrationOptions.find((option) => integrationStatusFor(option.value) !== 'unsupported')?.value ?? 'hosted'
  }
}

function paymentAbilityStatusFor(abilityId: PaymentAbilityId, fallback: SupportStatus): SupportStatus {
  if (!publishedConfig.value) return fallback

  const status = resolveCapabilityStatus(publishedConfig.value, abilityId, {
    merchantType: currentMerchantType.value,
    product: currentProduct.value,
    environment: currentEnvironment.value,
    integrationMode: currentIntegration.value,
    merchantContractingCountry: merchantContractingCountry.value,
    consumerPaymentCountry: consumerPaymentCountry.value
  })
  return status ?? fallback
}

function togglePaymentAbility(capability: PaymentAbilityId) {
  if (selectedPaymentAbilities.value.includes(capability)) {
    selectedPaymentAbilities.value = selectedPaymentAbilities.value.filter(
      (selectedCapability) => selectedCapability !== capability
    )
    return
  }

  selectedPaymentAbilities.value = allSelectableAbilityGroups
    .flatMap((group) => group.options.map((option) => option.value))
    .filter(
      (paymentAbility) => selectedPaymentAbilities.value.includes(paymentAbility) || paymentAbility === capability
    )
}

function serviceStatusFor(capability: CapabilityItem): SupportStatus {
  const featureId = valueAddedFeatureIds[capability.id]
  if (featureId) {
    return resolveCapabilityStatus(activeCapabilityConfig(), featureId, {
      merchantType: currentMerchantType.value,
      product: currentProduct.value,
      environment: currentEnvironment.value,
      integrationMode: currentIntegration.value,
      merchantContractingCountry: merchantContractingCountry.value,
      consumerPaymentCountry: consumerPaymentCountry.value
    }) ?? 'unsupported'
  }

  if (
    !capability.products.includes(currentProduct.value) ||
    !capability.environments.includes(currentEnvironment.value) ||
    !capability.integrationModes.includes(currentIntegration.value)
  ) {
    return 'unsupported'
  }

  if (consumerPaymentCountry.value !== 'All') {
    return capability.marketStatus[consumerPaymentCountry.value]
  }

  return capability.serviceStatus ?? 'standard'
}

function paymentMethodTagsFor(capability: CapabilityItem) {
  if (!capability.paymentMethodTags) return []

  return (Object.entries(capability.paymentMethodTags) as Array<[PaymentMethodTagId, SupportStatus]>).filter(
    ([, status]) => status !== 'unsupported'
  )
}

async function refreshPublishedConfig() {
  try {
    const published = await loadPublishedConfig()
    if (!published) return

    publishedConfig.value = published.payload
  } catch {
    // The static demo remains usable when the optional backend is unavailable.
  }
}

async function returnToMap() {
  await refreshPublishedConfig()
  normalizeDependentSelections()
  navigateWorkspace('map')
}

function syncWorkspacePageFromHash() {
  if (window.location.hash === '#runtime-status') {
    currentWorkspacePage.value = 'runtime-status'
    return
  }
  if (window.location.hash === '#agile-intake') {
    currentWorkspacePage.value = 'agile-intake'
    return
  }
  if (window.location.hash === '#subject-capabilities') {
    currentWorkspacePage.value = 'subject-capabilities'
    return
  }
  if (window.location.hash === '#payout-config') {
    currentWorkspacePage.value = 'payout-config'
    return
  }
  currentWorkspacePage.value = window.location.hash === '#config' ? 'config' : 'map'
}

function navigateWorkspace(page: WorkspacePage) {
  currentWorkspacePage.value = page
  const nextHash =
    page === 'runtime-status'
      ? '#runtime-status'
      : page === 'agile-intake'
        ? '#agile-intake'
      : page === 'subject-capabilities'
          ? '#subject-capabilities'
        : page === 'payout-config'
          ? '#payout-config'
        : page === 'config'
          ? '#config'
          : '#map'
  if (window.location.hash !== nextHash) window.location.hash = nextHash
}

function switchConfigBusiness(business: 'collection' | 'payout') {
  navigateWorkspace(business === 'collection' ? 'config' : 'payout-config')
}

onMounted(() => {
  syncWorkspacePageFromHash()
  syncPaymentMethodGridColumns()
  window.addEventListener('hashchange', syncWorkspacePageFromHash)
  window.addEventListener('keydown', handleWorkspaceKeydown)
  window.addEventListener('resize', syncPaymentMethodGridColumns)
  void refreshPublishedConfig()
})

onBeforeUnmount(() => {
  if (capabilityDocHoverTimer) window.clearTimeout(capabilityDocHoverTimer)
  window.removeEventListener('hashchange', syncWorkspacePageFromHash)
  window.removeEventListener('keydown', handleWorkspaceKeydown)
  window.removeEventListener('resize', syncPaymentMethodGridColumns)
})

</script>

<template>
  <div class="workspace-shell">
    <aside class="workspace-sidebar" aria-label="工作台导航">
      <div class="workspace-brand">
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m4.5 6.2 5-2.2 5 2.2 5-2.2v13.8l-5 2.2-5-2.2-5 2.2V6.2Z"/><path d="M9.5 4v13.8M14.5 6.2V20"/></svg>
        </span>
        <div><strong>标准能力接入工作台</strong><small>收单产品能力中心</small></div>
      </div>
      <nav class="workspace-nav">
        <button
          type="button"
          :class="{ 'is-active': currentWorkspacePage === 'map' }"
          @click="navigateWorkspace('map')"
        >
          <span aria-hidden="true" v-html="iconSvg.map"></span>
          <strong>能力地图</strong>
        </button>
        <button
          type="button"
          :class="{ 'is-active': currentWorkspacePage === 'runtime-status' }"
          @click="navigateWorkspace('runtime-status')"
        >
          <span aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 19V11M10 19V5M15 19v-7M20 19V8"/><path d="M3.5 19.5h18"/></svg>
          </span>
          <strong>能力运行现状</strong>
        </button>
        <div
          class="workspace-config-nav"
          :class="{
            'is-active':
              currentWorkspacePage === 'config' ||
              currentWorkspacePage === 'subject-capabilities' ||
              currentWorkspacePage === 'payout-config'
          }"
        >
          <button
            class="workspace-config-parent"
            type="button"
            :class="{
              'is-active':
                currentWorkspacePage === 'config' ||
                currentWorkspacePage === 'subject-capabilities' ||
                currentWorkspacePage === 'payout-config'
            }"
            @click="navigateWorkspace('config')"
          >
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/>
                <circle cx="14" cy="7" r="2"/><circle cx="6" cy="17" r="2"/>
              </svg>
            </span>
            <strong>产品能力管理</strong>
          </button>
          <div class="workspace-subnav" aria-label="产品能力管理子菜单">
            <button
              type="button"
              :class="{
                'is-active':
                  currentWorkspacePage === 'config' || currentWorkspacePage === 'payout-config'
              }"
              @click="navigateWorkspace('config')"
            >
              <strong>产品能力配置</strong>
            </button>
            <button
              type="button"
              :class="{ 'is-active': currentWorkspacePage === 'subject-capabilities' }"
              @click="navigateWorkspace('subject-capabilities')"
            >
              <strong>主体能力管理</strong>
            </button>
          </div>
        </div>
        <button
          type="button"
          :class="{ 'is-active': currentWorkspacePage === 'agile-intake' }"
          @click="navigateWorkspace('agile-intake')"
        >
          <span aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 4.5h10l4 4V20H5zM15 4.5V9h4M8.5 13h7M8.5 16.5h4"/></svg>
          </span>
          <strong>敏捷接入提需</strong>
        </button>
      </nav>
      <p class="workspace-sidebar__note">能力查询与结构化提需 Demo</p>
    </aside>

    <div class="workspace-content">
      <AgileIntakeView
        v-if="currentWorkspacePage === 'agile-intake'"
        :capability-config="activeCapabilityConfig()"
        @go-map="navigateWorkspace('map')"
      />

      <RuntimeStatusView v-else-if="currentWorkspacePage === 'runtime-status'" />

      <SubjectCapabilityView
        v-else-if="currentWorkspacePage === 'subject-capabilities'"
        :capability-config="activeCapabilityConfig()"
      />

      <AcquiringConfigView
        v-else-if="currentWorkspacePage === 'config'"
        @back="returnToMap"
        @switch-business="switchConfigBusiness"
      />

      <PayoutConfigView
        v-else-if="currentWorkspacePage === 'payout-config'"
        @back="navigateWorkspace('map')"
        @saved="refreshPayoutConfig"
        @switch-business="switchConfigBusiness"
      />

      <main v-else class="app-shell">
    <section class="capability-map" aria-labelledby="capability-map-title">
      <div class="sticky-header">
        <header class="capability-map__heading">
          <div class="toolbar-title">
            <span class="toolbar-title__icon" aria-hidden="true" v-html="iconSvg.map"></span>
            <h1 id="capability-map-title">能力地图</h1>
          </div>

          <div class="business-tabs" role="group" aria-label="业务类型">
            <button
              class="business-tabs__item"
              :class="{ 'is-active': currentBusinessLine === 'collection' }"
              type="button"
              :aria-pressed="currentBusinessLine === 'collection'"
              @click="selectBusinessLine('collection')"
            >
              收单
            </button>
            <button
              class="business-tabs__item"
              :class="{ 'is-active': currentBusinessLine === 'payout' }"
              type="button"
              :aria-pressed="currentBusinessLine === 'payout'"
              @click="selectBusinessLine('payout')"
            >
              代发
            </button>
          </div>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <div v-if="currentBusinessLine === 'collection'" class="toolbar-filter">
            <span class="toolbar-filter__label">商户类型</span>
            <div class="toolbar-segmented" role="group" aria-label="商户类型">
              <button
                v-for="option in merchantTypeOptions"
                :key="option.value"
                class="toolbar-segmented__item"
                :class="{ 'is-active': currentMerchantType === option.value }"
                type="button"
                :aria-pressed="currentMerchantType === option.value"
                @click="selectMerchantType(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div v-if="currentBusinessLine === 'collection'" class="toolbar-divider" aria-hidden="true"></div>

          <label v-if="currentBusinessLine === 'collection'" class="toolbar-filter market-select">
            <span class="toolbar-filter__label">商户签约国家/地区</span>
            <select v-model="merchantContractingCountry" aria-label="商户签约国家/地区">
              <option v-for="market in marketOptions" :key="market" :value="market">
                {{ market }}
              </option>
            </select>
          </label>

        </header>

        <section v-if="currentBusinessLine === 'collection'" class="stage-flow" aria-label="业务阶段">
          <template v-for="(stage, index) in stageOptions" :key="stage.id">
            <button
              class="stage-card"
              :class="{ 'is-active': currentStage === stage.id }"
              type="button"
              :aria-pressed="currentStage === stage.id"
              @click="selectStage(stage.id)"
            >
              <span class="stage-icon" aria-hidden="true" v-html="iconSvg[stage.icon]"></span>
              <strong>{{ stage.title }}</strong>
            </button>
            <span v-if="index < stageOptions.length - 1" class="stage-arrow" aria-hidden="true">&gt;</span>
          </template>
        </section>

        <section v-else class="stage-flow" aria-label="出款业务阶段">
          <template v-for="(stage, index) in payoutStageOptions" :key="stage.id">
            <button
              class="stage-card"
              :class="{ 'is-active': currentPayoutStage === stage.id }"
              type="button"
              :aria-pressed="currentPayoutStage === stage.id"
              @click="selectPayoutStage(stage.id)"
            >
              <span class="stage-icon" aria-hidden="true" v-html="iconSvg[stage.icon]"></span>
              <strong>{{ stage.title }}</strong>
            </button>
            <span v-if="index < payoutStageOptions.length - 1" class="stage-arrow" aria-hidden="true">&gt;</span>
          </template>
        </section>
      </div>

      <template v-if="currentBusinessLine === 'collection' && currentStage === 'acquiring'">
      <section
        v-if="merchantContractingCountry !== 'All'"
        class="product-match-panel"
        aria-labelledby="matched-product-title"
      >
        <div class="product-match-panel__heading">
          <div>
            <h2 id="matched-product-title">匹配收单产品</h2>
            <p>根据商户类型和商户签约国家/地区匹配可用产品码</p>
          </div>
          <span class="product-match-context">
            {{ merchantTypeOptions.find(option => option.value === currentMerchantType)?.label }}
            · {{ merchantContractingCountry }}
          </span>
        </div>

        <div v-if="matchedAcquiringProducts.length" class="product-match-grid">
          <article v-for="product in matchedAcquiringProducts" :key="product.code" class="product-match-card">
            <span class="product-match-card__mark" aria-hidden="true">AQ</span>
            <div>
              <h3>{{ product.name }}</h3>
              <p>收单产品码 <code>{{ product.code }}</code></p>
            </div>
            <span class="product-match-card__status"><i></i>可用</span>
          </article>
        </div>

        <div v-else class="product-match-empty">
          当前商户类型与签约国家/地区暂无匹配的已上架收单产品。
        </div>
      </section>

      <section class="filter-panel" aria-label="能力地图筛选项">
        <fieldset class="choice-group">
          <legend>
            <span>收单支付产品</span>
            <small>选择使用的收单支付产品</small>
          </legend>
          <div class="choice-grid choice-grid--three">
            <div
              v-for="option in productOptions"
              :key="option.value"
              class="choice-card-shell"
              :class="{ 'capability-doc-target': option.value === 'online' }"
              @pointerenter="option.value === 'online' && positionCapabilityDocHint($event)"
              @pointermove="option.value === 'online' && positionCapabilityDocHint($event)"
              @pointerleave="option.value === 'online' && hideCapabilityDocHint($event)"
            >
              <button
                class="choice-card choice-card--with-status"
                :class="[
                  { 'is-active': currentProduct === option.value },
                  `choice-card--${productStatusFor(option.value)}`
                ]"
                type="button"
                :aria-pressed="currentProduct === option.value"
                @click="selectProduct(option.value)"
              >
                <span class="choice-icon" aria-hidden="true" v-html="iconSvg[choiceIcon[option.value]]"></span>
                <span class="choice-copy">
                  <strong>{{ option.label }}</strong>
                  <span>{{ option.description }}</span>
                </span>
                <span class="choice-meta">
                  <em class="status-chip" :class="`status-chip--${productStatusFor(option.value)}`">
                    {{ supportStatusLabel[productStatusFor(option.value)] }}
                  </em>
                  <span class="choice-radio" aria-hidden="true"></span>
                </span>
              </button>
              <CapabilityDocHint
                v-if="option.value === 'online'"
                :path="productDocumentationPath(option.value)"
                :label="option.label"
              />
            </div>
          </div>
        </fieldset>

        <fieldset class="choice-group choice-group--two">
          <legend>
            <span>支付环境</span>
            <small>选择业务所处的终端环境</small>
          </legend>
          <div class="choice-grid choice-grid--two">
            <button
              v-for="option in environmentOptions"
              :key="option.value"
              class="choice-card choice-card--with-status"
              :class="[
                { 'is-active': currentEnvironment === option.value },
                `choice-card--${environmentStatusFor(option.value)}`
              ]"
              type="button"
              :aria-pressed="currentEnvironment === option.value"
              @click="selectEnvironment(option.value)"
            >
              <span class="choice-icon" aria-hidden="true" v-html="iconSvg[choiceIcon[option.value]]"></span>
              <span class="choice-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="choice-meta">
                <em class="status-chip" :class="`status-chip--${environmentStatusFor(option.value)}`">
                  {{ supportStatusLabel[environmentStatusFor(option.value)] }}
                </em>
                <span class="choice-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </fieldset>

        <fieldset class="choice-group">
          <legend>
            <span>集成模式</span>
            <small>选择接入与集成的方式</small>
          </legend>
          <div class="choice-grid choice-grid--three">
            <button
              v-for="option in integrationOptions"
              :key="option.value"
              class="choice-card choice-card--with-status"
              :class="[
                { 'is-active': currentIntegration === option.value },
                `choice-card--${integrationStatusFor(option.value)}`
              ]"
              type="button"
              :aria-pressed="currentIntegration === option.value"
              @click="selectIntegration(option.value)"
            >
              <span class="choice-icon" aria-hidden="true" v-html="iconSvg[choiceIcon[option.value]]"></span>
              <span class="choice-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="choice-meta">
                <em class="status-chip" :class="`status-chip--${integrationStatusFor(option.value)}`">
                  {{ supportStatusLabel[integrationStatusFor(option.value)] }}
                </em>
                <span class="choice-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </fieldset>
      </section>

      <section
        v-if="currentProduct === 'subscription'"
        class="payment-ability-panel subscription-management-panel"
        aria-labelledby="subscription-management-title"
      >
        <div class="section-heading section-heading--panel">
          <div>
            <h2 id="subscription-management-title">订阅管理</h2>
            <p>配置订阅定价、到期处理、升降级和计划调整能力（可多选）。</p>
          </div>
        </div>

        <div class="ability-group-grid ability-group-grid--subscription-management">
          <fieldset v-for="group in subscriptionManagementGroups" :key="group.id" class="ability-group">
            <legend>
              <span class="ability-group-icon" aria-hidden="true" v-html="iconSvg[abilityGroupIcon[group.id]]"></span>
              {{ group.title }}
            </legend>
            <div class="ability-options">
              <button
                v-for="option in group.options"
                :key="option.value"
                class="ability-option"
                :class="[
                  { 'is-active': selectedPaymentAbilities.includes(option.value) },
                  `ability-option--${paymentAbilityStatusFor(option.value, option.status)}`
                ]"
                type="button"
                :aria-pressed="selectedPaymentAbilities.includes(option.value)"
                @click="togglePaymentAbility(option.value)"
              >
                <span class="ability-check" aria-hidden="true"></span>
                <strong>{{ option.label }}</strong>
                <em class="status-chip" :class="`status-chip--${paymentAbilityStatusFor(option.value, option.status)}`">
                  {{ supportStatusLabel[paymentAbilityStatusFor(option.value, option.status)] }}
                </em>
              </button>
            </div>
          </fieldset>
        </div>
      </section>

      <section class="capability-section capability-section--payment-methods" aria-labelledby="payment-method-title">
        <div class="section-heading">
          <h2 id="payment-method-title">支付方式 <span>{{ paymentCapabilities.length }}</span></h2>
          <div class="payment-method-controls">
            <label class="section-select">
              <span>用户支付国家/地区</span>
              <select v-model="consumerPaymentCountry" aria-label="用户支付国家/地区">
                <option v-for="market in marketOptions" :key="market" :value="market">{{ market }}</option>
              </select>
            </label>
            <label class="section-select">
              <span>支付方式类型</span>
              <select v-model="selectedPaymentMethodType" aria-label="支付方式类型">
                <option v-for="option in paymentMethodTypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <div class="legend" aria-label="支持状态图例">
              <span><i class="dot dot--standard"></i>支持</span>
              <span><i class="dot dot--conditional"></i>部分支持</span>
            </div>
          </div>
        </div>

        <div v-if="paymentCapabilities.length" class="capability-grid">
          <article
            v-for="capability in paginatedPaymentCapabilities"
            :key="capability.id"
            class="capability-card capability-card--interactive"
            role="button"
            tabindex="0"
            aria-haspopup="dialog"
            :aria-label="`查看 ${capability.name} 详情能力`"
            @click="openPaymentMethodDetails(capability)"
            @keydown.enter="openPaymentMethodDetails(capability)"
            @keydown.space.prevent="openPaymentMethodDetails(capability)"
          >
            <div class="card-topline">
              <div class="capability-identity">
                <span class="brand-mark" :style="{ '--mark-color': capability.accent }">
                  {{ capability.initial }}
                </span>
                <div>
                  <h3>{{ capability.name }}</h3>
                  <p>{{ capability.description }}</p>
                </div>
              </div>
              <span class="capability-card__arrow" aria-hidden="true">›</span>
            </div>

            <div v-if="paymentMethodTagsFor(capability).length" class="method-tags" aria-label="支持的支付能力">
              <span
                v-for="[tagId, status] in paymentMethodTagsFor(capability)"
                :key="tagId"
                class="method-tag"
                :class="`method-tag--${status}`"
                :title="`${paymentMethodTagLabels[tagId]}：${shortSupportLabel[status]}`"
              >
                {{ paymentMethodTagLabels[tagId] }}
              </span>
            </div>
          </article>
        </div>
        <nav
          v-if="paymentMethodPageCount > 1"
          class="card-pagination"
          aria-label="支付方式分页"
        >
          <span>第 {{ paymentMethodPage }} / {{ paymentMethodPageCount }} 页 · 共 {{ paymentCapabilities.length }} 项</span>
          <div>
            <button
              type="button"
              aria-label="上一页"
              :disabled="paymentMethodPage === 1"
              @click="paymentMethodPage -= 1"
            >
              ‹
            </button>
            <button
              v-for="page in paymentMethodVisiblePages"
              :key="page"
              type="button"
              :class="{ 'is-active': paymentMethodPage === page }"
              :aria-current="paymentMethodPage === page ? 'page' : undefined"
              @click="paymentMethodPage = page"
            >
              {{ page }}
            </button>
            <button
              type="button"
              aria-label="下一页"
              :disabled="paymentMethodPage === paymentMethodPageCount"
              @click="paymentMethodPage += 1"
            >
              ›
            </button>
          </div>
        </nav>
      </section>

      <section class="payment-ability-panel" aria-labelledby="payment-ability-title">
        <div class="section-heading section-heading--panel">
          <div>
            <h2 id="payment-ability-title">{{ paymentAbilitySectionTitle }}</h2>
            <p>{{ paymentAbilitySectionDescription }}</p>
          </div>
        </div>

        <div class="ability-group-grid" :class="{ 'ability-group-grid--agreement': currentProduct === 'agreementDeduction' }">
          <fieldset v-for="group in displayedPaymentAbilityGroups" :key="group.id" class="ability-group">
            <legend>
              <span class="ability-group-icon" aria-hidden="true" v-html="iconSvg[abilityGroupIcon[group.id]]"></span>
              {{ group.title }}
            </legend>
            <div class="ability-options">
              <button
                v-for="option in group.options"
                :key="option.value"
                class="ability-option"
                :class="[
                  { 'is-active': selectedPaymentAbilities.includes(option.value) },
                  `ability-option--${paymentAbilityStatusFor(option.value, option.status)}`
                ]"
                type="button"
                :aria-pressed="selectedPaymentAbilities.includes(option.value)"
                @click="togglePaymentAbility(option.value)"
              >
                <span class="ability-check" aria-hidden="true"></span>
                <strong>{{ option.label }}</strong>
                <em class="status-chip" :class="`status-chip--${paymentAbilityStatusFor(option.value, option.status)}`">
                  {{ supportStatusLabel[paymentAbilityStatusFor(option.value, option.status)] }}
                </em>
              </button>
            </div>
          </fieldset>
        </div>
      </section>

      <section class="capability-section" aria-labelledby="value-added-title">
        <div class="section-heading">
          <h2 id="value-added-title">增值服务 <span>{{ valueAddedCapabilities.length }}</span></h2>
          <div class="legend" aria-label="支持状态图例">
            <span>未标记表示标准支持</span>
            <span><i class="dot dot--conditional"></i>条件支持</span>
            <span><i class="dot dot--unsupported"></i>不支持</span>
          </div>
        </div>

        <div class="capability-grid capability-grid--value-added">
          <article v-for="capability in valueAddedCapabilities" :key="capability.id" class="capability-card">
            <div class="card-topline">
              <div class="capability-identity">
                <span class="brand-mark brand-mark--outline" :style="{ '--mark-color': capability.accent }">
                  {{ capability.initial }}
                </span>
                <div>
                  <h3>{{ capability.name }}</h3>
                  <p>{{ capability.description }}</p>
                </div>
              </div>
              <em class="service-status" :class="`service-status--${serviceStatusFor(capability)}`">
                {{ supportStatusLabel[serviceStatusFor(capability)] }}
              </em>
            </div>
          </article>
        </div>
      </section>

      <p class="capability-note">
        说明：能力范围与可用性可能因商户资质、风控评估或当地法规要求变化，当前数据仅用于 demo 演示。
      </p>
      </template>

      <RefundDisputeView v-else-if="currentBusinessLine === 'collection' && currentStage === 'refundDispute'" />

      <SettlementView
        v-else-if="currentBusinessLine === 'collection' && currentStage === 'settlement'"
        :merchant-type="currentMerchantType"
      />

      <PayoutMapView
        v-else-if="currentBusinessLine === 'collection' && currentStage === 'withdrawal'"
        stage="payout"
        primary-category="withdrawal"
        hide-primary-category
        :merchant-type="currentMerchantType"
        :config-version="payoutConfigVersion"
      />

      <ReconciliationView v-else-if="currentBusinessLine === 'collection' && currentStage === 'reconciliation'" />

      <ReconciliationView v-else-if="currentBusinessLine === 'payout' && currentPayoutStage === 'reconciliation'" />

      <PayoutMapView
        v-else-if="currentBusinessLine === 'payout'"
        :stage="currentPayoutStage"
        primary-category="disbursement"
        hide-primary-category
        :merchant-type="currentMerchantType"
        :config-version="payoutConfigVersion"
      />

      <section v-else class="empty-state stage-empty-state">
        当前阶段能力地图正在完善中。
      </section>
    </section>
      </main>

      <div
        v-if="selectedPaymentMethod"
        class="payment-detail-backdrop"
        @click.self="closePaymentMethodDetails"
      >
        <aside
          class="payment-detail-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-detail-title"
        >
          <header class="payment-detail-header">
            <div class="payment-detail-identity">
              <span class="brand-mark" :style="{ '--mark-color': selectedPaymentMethod.accent }">
                {{ selectedPaymentMethod.initial }}
              </span>
              <div>
                <span>{{ selectedOptionLabel(paymentMethodTypeOptions, selectedPaymentMethod.paymentMethodType ?? 'card') }}</span>
                <h2 id="payment-detail-title">{{ selectedPaymentMethod.name }}</h2>
                <p>{{ selectedPaymentMethod.description }}</p>
              </div>
            </div>
            <button type="button" aria-label="关闭支付方式详情" @click="closePaymentMethodDetails">×</button>
          </header>

          <div class="payment-detail-context" aria-label="当前筛选场景">
            <span>{{ selectedOptionLabel(merchantTypeOptions, currentMerchantType) }}</span>
            <span>{{ selectedOptionLabel(productOptions, currentProduct) }}</span>
            <span>{{ selectedOptionLabel(environmentOptions, currentEnvironment) }}</span>
            <span>{{ selectedOptionLabel(integrationOptions, currentIntegration) }}</span>
            <span>{{ consumerPaymentCountry === 'All' ? '全部用户支付地区' : consumerPaymentCountry }}</span>
          </div>

          <div class="payment-detail-body">
            <section class="payment-detail-section">
              <div class="payment-detail-section__heading">
                <span aria-hidden="true">01</span>
                <div><h3>绑定支付方式</h3><p>支付方式在当前产品场景下可使用的绑定模式。</p></div>
              </div>
              <dl class="payment-detail-list">
                <div>
                  <dt>独立绑定</dt>
                  <dd
                    class="payment-detail-status"
                    :class="`payment-detail-status--${selectedPaymentMethod.paymentMethodTags?.standaloneBinding ?? 'unsupported'}`"
                  >
                    {{ supportStatusLabel[selectedPaymentMethod.paymentMethodTags?.standaloneBinding ?? 'unsupported'] }}
                  </dd>
                </div>
                <div>
                  <dt>支付并绑定</dt>
                  <dd
                    class="payment-detail-status"
                    :class="`payment-detail-status--${selectedPaymentMethod.paymentMethodTags?.payAndBind ?? 'unsupported'}`"
                  >
                    {{ supportStatusLabel[selectedPaymentMethod.paymentMethodTags?.payAndBind ?? 'unsupported'] }}
                  </dd>
                </div>
              </dl>
            </section>

            <section class="payment-detail-section">
              <div class="payment-detail-section__heading">
                <span aria-hidden="true">02</span>
                <div><h3>预授权支付</h3><p>支付方式是否支持先冻结额度、再按实际金额请款。</p></div>
              </div>
              <dl class="payment-detail-list">
                <div>
                  <dt>预授权支付</dt>
                  <dd
                    class="payment-detail-status"
                    :class="`payment-detail-status--${selectedPaymentMethod.paymentMethodTags?.preAuthPay ?? 'unsupported'}`"
                  >
                    {{ supportStatusLabel[selectedPaymentMethod.paymentMethodTags?.preAuthPay ?? 'unsupported'] }}
                  </dd>
                </div>
              </dl>
            </section>

            <template v-if="selectedPaymentMethodHasOperationalDetails">
              <section class="payment-detail-section">
                <div class="payment-detail-section__heading">
                  <span aria-hidden="true">03</span>
                  <div><h3>退款能力</h3><p>原路退款能力及渠道允许发起退款的最长周期。</p></div>
                </div>
                <dl class="payment-detail-list">
                  <div>
                    <dt>全额退款</dt>
                    <dd
                      class="payment-detail-status"
                      :class="`payment-detail-status--${selectedPaymentMethodOperationalDetails.fullRefund}`"
                    >
                      {{ supportStatusLabel[selectedPaymentMethodOperationalDetails.fullRefund] }}
                    </dd>
                  </div>
                  <div>
                    <dt>部分退款</dt>
                    <dd
                      class="payment-detail-status"
                      :class="`payment-detail-status--${selectedPaymentMethodOperationalDetails.partialRefund}`"
                    >
                      {{ supportStatusLabel[selectedPaymentMethodOperationalDetails.partialRefund] }}
                    </dd>
                  </div>
                  <div>
                    <dt>最长退款周期</dt>
                    <dd class="payment-detail-value">{{ selectedPaymentMethodOperationalDetails.maxRefundPeriod }}</dd>
                  </div>
                </dl>
              </section>

              <section class="payment-detail-section">
                <div class="payment-detail-section__heading">
                  <span aria-hidden="true">04</span>
                  <div><h3>拒付能力</h3><p>支付完成后是否适用拒付或渠道争议处理流程。</p></div>
                </div>
                <dl class="payment-detail-list">
                  <div>
                    <dt>拒付处理</dt>
                    <dd
                      class="payment-detail-status"
                      :class="`payment-detail-status--${selectedPaymentMethodOperationalDetails.chargeback}`"
                    >
                      {{ supportStatusLabel[selectedPaymentMethodOperationalDetails.chargeback] }}
                    </dd>
                  </div>
                </dl>
                <p class="payment-detail-description">{{ selectedPaymentMethodOperationalDetails.chargebackDescription }}</p>
              </section>
            </template>

            <section v-else class="payment-detail-section">
              <div class="payment-detail-section__heading">
                <span aria-hidden="true">03</span>
                <div><h3>交易后能力</h3><p>退款与拒付支持情况尚未配置，不影响查看当前支付和绑定能力。</p></div>
              </div>
            </section>
          </div>

          <footer class="payment-detail-footer">
            能力范围可能因支付渠道、商户资质及当地规则变化，当前数据仅用于 Demo。
          </footer>
        </aside>
      </div>
    </div>
  </div>
</template>
