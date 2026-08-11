<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  capabilities,
  environmentOptions,
  integrationOptions,
  marketOptions,
  merchantTypeOptions,
  subscriptionManagementGroups,
  subscriptionPaymentAbilityGroups,
  agreementPaymentAbilityGroups,
  supportStatusLabel,
  visiblePaymentAbilityGroups,
  type CapabilityItem,
  type Environment,
  type IntegrationMode,
  type PaymentAbilityOption,
  type ProductType,
  type SupportStatus
} from './capabilityData'
import {
  resolveCapabilityStatus,
  scenarioCombinationStatus
} from './capabilityConfigModel'
import type { CapabilityConfigPayloadV4, CapabilityFeatureId, DomainId } from './configTypes'
import {
  createDefaultAgileDraft,
  createDefaultMerchantSubject,
  demoBusinesses,
  intakeBusinessTypeOptions,
  intakeProductOptions,
  intakeStageOptions,
  nonAcquiringCapabilities,
  type AgileIntakeDraft,
  type IntakeCapabilityPlan,
  type IntakeBusinessType,
  type IntakeMerchantSubject,
  type IntakeModuleAction,
  type IntakeProductType,
  type IntakeStageId,
  type IntakeStep,
  type PaymentBindingMode,
  type PaymentCardType,
  type PaymentChannelRequirement,
  type PaymentMethodRequirement,
  type SelectedCapability,
  type SettlementCycleBasis,
  type TaxCalculationMode,
  type TaxRule,
  type UserFeeCalculationMode,
  type UserFeeRule
} from './agileIntakeData'
import {
  listAgileIntakeRequests,
  saveAgileIntakeRequest,
  type AgileIntakeRequestRecord,
  type AgileIntakeRequestStatus
} from './agileIntakeRepository'
import { signInWithPassword } from './acquiringConfigRepository'
import {
  globalRecommendedPaymentMethodIds,
  recommendedPaymentMethodIdsByMarket
} from './paymentMethodRecommendations'
import { isSupabaseConfigured, supabase } from './supabase'

const props = defineProps<{
  capabilityConfig: CapabilityConfigPayloadV4
}>()

const emit = defineEmits<{
  goMap: []
}>()

let paymentChannelSequence = 0
let merchantSubjectSequence = 1

interface CatalogItem extends SelectedCapability {
  description: string
  accent?: string
  initial?: string
  paymentMethodType?: string
  comingSoon?: boolean
}

const storageKey = 'capability-map.agile-intake.v2'
const legacyStorageKey = 'capability-map.agile-intake.v1'
const recordStorageKey = 'capability-map.agile-intake.active-record.v1'
const defaultCardTypes: PaymentCardType[] = ['credit', 'debit', 'prepaid']
const draft = ref<AgileIntakeDraft>(createDefaultAgileDraft())
const intakeView = ref<'list' | 'editor'>('list')
const activeStage = ref<IntakeStageId>('acquiring')
const activeMerchantSubjectId = ref('')
const activeCapabilityProduct = ref<IntakeProductType | null>(null)
const submittedId = ref('')
const submittedApprovalUrl = ref('')
const currentRequestId = ref('')
const currentRequestNumber = ref('')
const requestPersistenceFeedback = ref('')
const requestPersistenceError = ref('')
const isSavingRequest = ref(false)
const isSubmittingRequest = ref(false)
const isLoadingRequestRecords = ref(false)
const requestRecords = ref<AgileIntakeRequestRecord[]>([])
const isCheckingRequestSession = ref(true)
const isRequestAuthenticated = ref(false)
const showRequestLogin = ref(false)
const requestLoginEmail = ref('')
const requestLoginPassword = ref('')
const requestLoginError = ref('')
const isRequestLoggingIn = ref(false)
const showRequestLoginPassword = ref(false)
const draftRestored = ref(false)
const showPaymentMethodPicker = ref(false)
const showPaymentMethodEditor = ref(false)
const paymentMethodPickerPurpose = ref<'paymentRequirement' | 'userFeeRule'>('paymentRequirement')
const paymentMethodPickerEditingId = ref('')
const editingPaymentMethodId = ref('')
const paymentMethodEditor = ref<PaymentMethodRequirement>(createPaymentMethodRequirement())
const paymentMethodPickerCountry = ref<'All' | PaymentMethodRequirement['country']>('All')
const paymentMethodPickerType = ref<'All' | 'card' | 'passThroughWallet' | 'wallet' | 'mobileBanking' | 'realTimePaymentNetwork' | 'bankTransfer' | 'internetBanking' | 'cashPin'>('All')
const paymentMethodPickerPage = ref(1)
const paymentMethodPickerPageSize = 16
const showUserFeeRuleEditor = ref(false)
const editingUserFeeRuleId = ref('')
const userFeeRuleEditor = ref<UserFeeRule>(createUserFeeRule())
const showTaxRuleEditor = ref(false)
const editingTaxRuleId = ref('')
const taxRuleEditor = ref<TaxRule>(createTaxRule())
const copyFeedback = ref('')
const activeReviewMerchantId = ref('')
const larkDocumentUrl = ref('')
const larkDocumentSnapshot = ref('')
const larkDocumentFeedback = ref('')
const markdownDocumentFeedback = ref('')
const isCreatingLarkDocument = ref(false)
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined
let markdownFeedbackTimer: ReturnType<typeof setTimeout> | undefined

const countryCurrencyOptions: Record<Exclude<AgileIntakeDraft['consumerPaymentCountry'], 'All'>, string[]> = {
  US: ['USD'],
  BR: ['BRL', 'USD'],
  ID: ['IDR', 'USD'],
  TH: ['THB', 'USD'],
  MY: ['MYR', 'USD'],
  SG: ['SGD', 'USD'],
  PH: ['PHP', 'USD'],
  JP: ['JPY', 'USD'],
  KR: ['KRW', 'USD'],
  GB: ['GBP', 'EUR', 'USD'],
  HK: ['HKD', 'USD'],
  CL: ['CLP', 'USD'],
  MX: ['MXN', 'USD'],
  VN: ['VND', 'USD'],
  CN: ['CNY', 'USD'],
  CO: ['COP', 'USD']
}

const bindingModeOptions: Array<{ value: PaymentBindingMode; label: string }> = [
  { value: 'none', label: '无需绑定' },
  { value: 'standaloneBinding', label: '独立绑定' },
  { value: 'payAndBind', label: '支付并绑定' }
]

const cardTypeOptions: Array<{ value: PaymentCardType; label: string }> = [
  { value: 'credit', label: '信用卡' },
  { value: 'debit', label: '借记卡' },
  { value: 'prepaid', label: '预付卡' }
]

const pricingCurrencyOptions = ['USD', 'EUR', 'GBP', 'SGD', 'BRL', 'IDR', 'THB', 'MYR', 'PHP', 'JPY']

const settlementCurrenciesByPricingCurrency: Record<string, string[]> = {
  USD: ['USD'],
  EUR: ['EUR', 'USD'],
  GBP: ['GBP', 'EUR', 'USD'],
  SGD: ['SGD', 'USD'],
  BRL: ['BRL', 'USD'],
  IDR: ['IDR', 'USD'],
  THB: ['THB', 'USD'],
  MYR: ['MYR', 'USD'],
  PHP: ['PHP', 'USD'],
  JPY: ['JPY', 'USD']
}

const settlementCycleBasisOptions: Array<{ value: SettlementCycleBasis; label: string }> = [
  { value: 'T', label: 'T' },
  { value: 'D', label: 'D' }
]

const moduleActionOptions: Array<{ value: IntakeModuleAction; label: string; description: string }> = [
  { value: 'businessFirstAccess', label: '业务首次接入', description: '该业务首次接入本模块' },
  { value: 'merchantFirstAccess', label: '商户号首次接入', description: '该商户号首次接入本模块' },
  { value: 'capabilityAdjustment', label: '调整接入能力', description: '调整已接入模块的能力配置' }
]

const userFeeCalculationModeOptions: Array<{ value: UserFeeCalculationMode; label: string }> = [
  { value: 'percentage', label: '按比例' },
  { value: 'fixed', label: '固定金额' }
]

const taxCalculationModeOptions: Array<{ value: TaxCalculationMode; label: string; description: string }> = [
  { value: 'taxInclusive', label: '含税价计税', description: '商品标价已包含税费' },
  { value: 'taxExclusive', label: '非含税价计税', description: '税费在商品标价之外计算' }
]

const standaloneValueAddedStageIds = new Set<IntakeStageId>([
  'currencyExchange',
  'taxCalculation',
  'userFee'
])

const hiddenIntakeCapabilityIds = new Set([
  'refund-funding-merchant',
  'refund-funding-platform',
  'refund-user-choice',
  'refund-auto-route',
  'refund-fx-lock',
  'chargeback-visa',
  'chargeback-mastercard',
  'chargeback-paypal',
  'chargeback-alert',
  'chargeback-fx-lock',
  'bill-settlement',
  'bill-transaction',
  'bill-fund',
  'bill-marketing',
  ...nonAcquiringCapabilities
    .filter((item) => item.stage === 'settlement' && item.id !== 'settlement-periodic')
    .map((item) => item.id)
])

const requiredSettlementCapability: SelectedCapability = {
  id: 'settlement-periodic',
  name: '周期结算',
  stage: 'settlement',
  group: '结算模式',
  status: 'standard',
  responsibleDomains: ['gn']
}

const defaultDashboardRefundCapability: SelectedCapability = {
  id: 'refund-dashboard',
  name: 'Dashboard 退款',
  stage: 'refund',
  group: '发起方式',
  status: 'standard',
  responsibleDomains: ['transaction']
}

const defaultOriginalRefundCapability: SelectedCapability = {
  id: 'refund-original',
  name: '原路退款',
  stage: 'refund',
  group: '退款方式',
  status: 'standard',
  responsibleDomains: ['transaction']
}

const defaultSubscriptionPricingCapability: SelectedCapability = {
  id: 'ability:regularPricing',
  name: '正价期',
  stage: 'acquiring',
  group: '订阅定价能力',
  status: 'standard',
  responsibleDomains: ['transaction']
}

const comingSoonIntakeCapabilityIds = new Set([
  'refund-wallet',
  'refund-payout',
  'bill-tax',
  'bill-api',
  'bill-sftp'
])

const unavailableIntakeCapabilityIds = new Set([
  ...hiddenIntakeCapabilityIds,
  ...comingSoonIntakeCapabilityIds,
  'service:marketing'
])

const paymentMethodTypeLabels: Record<string, string> = {
  card: '银行卡',
  passThroughWallet: '穿透式钱包',
  wallet: '电子钱包',
  mobileBanking: '手机银行',
  realTimePaymentNetwork: '实时支付网络',
  bankTransfer: '银行转账',
  internetBanking: '网银（Internet Banking）',
  cashPin: '线下现金支付（Cash PIN）'
}

const iconSvg = {
  acquiring: '<svg viewBox="0 0 24 24"><path d="M5 7.5h14M7 4.5h10l2 3-2 3H7l-2-3 2-3ZM6 12.5h12V20H6zM9 16h6M12 12.5V20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  payout: '<svg viewBox="0 0 24 24"><path d="M4.5 12h12M13 8.5l3.5 3.5-3.5 3.5M5.5 5h13v14h-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  business: '<svg viewBox="0 0 24 24"><path d="M4 20V7.5h10V20M14 11h6v9M7.5 11h3M7.5 15h3M17 14h1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  product: '<svg viewBox="0 0 24 24"><path d="M6 8.5h12l1 11H5l1-11ZM9 8.5V7a3 3 0 0 1 6 0v1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  merchant: '<svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.8 19c.6-3.7 2.7-5.5 6.2-5.5 2.1 0 3.7.7 4.7 2M15 13.5h5v5h-5zM16.5 16h2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  capability: '<svg viewBox="0 0 24 24"><path d="M9.5 4H5v5a2.5 2.5 0 1 1 0 5v5h5a2.5 2.5 0 1 0 5 0h4v-5a2.5 2.5 0 1 0 0-5V4h-4a2.5 2.5 0 1 1-5.5 0Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  intake: '<svg viewBox="0 0 24 24"><path d="M5 4.5h10l4 4V20H5zM15 4.5V9h4M8.5 13h7M8.5 16.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4.5v10M8.5 11l3.5 3.5 3.5-3.5M5 18.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  success: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8 12.2 2.6 2.6 5.7-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}

const isNewBusiness = computed(() => draft.value.intakeType === 'newBusiness')

const activeMerchantSubject = computed(() =>
  draft.value.merchantSubjects.find((subject) => subject.id === activeMerchantSubjectId.value)
  ?? draft.value.merchantSubjects[0]
)

const activeMerchantProducts = computed(() =>
  activeMerchantSubject.value ? subjectCapabilityProducts(activeMerchantSubject.value) : []
)

const agileAcquiringProductOptions = computed(() =>
  intakeProductOptions.filter((option) => option.value !== 'iap')
)

const activeGenericStageOptions = computed(() =>
  intakeStageOptions.filter((stage) =>
    stage.id !== 'acquiring'
    && (stage.id !== 'userFee' || activeMerchantProducts.value.includes('online'))
  )
)

interface ModuleScopeItem {
  key: string
  label: string
  product?: IntakeProductType
  stage?: Exclude<IntakeStageId, 'acquiring'>
}

const moduleScopeItems = computed<ModuleScopeItem[]>(() => [
  ...agileAcquiringProductOptions.value.map((option) => ({
    key: `product:${option.value}`,
    label: option.label,
    product: option.value
  })),
  ...activeGenericStageOptions.value.map((stage) => ({
    key: `stage:${stage.id}`,
    label: stage.label,
    stage: stage.id as Exclude<IntakeStageId, 'acquiring'>
  }))
])

const includedModuleCount = computed(() =>
  moduleScopeItems.value.filter((item) => Boolean(activeMerchantSubject.value?.moduleActions?.[item.key])).length
)
const pendingModuleScopeKey = ref('')
const openModuleScopeMenuKey = ref('')

function defaultModuleAction(subject: Pick<IntakeMerchantSubject, 'accountMode'>): IntakeModuleAction {
  if (isNewBusiness.value) return 'businessFirstAccess'
  if (subject.accountMode === 'new') return 'merchantFirstAccess'
  return 'capabilityAdjustment'
}

function normalizeModuleActions(
  rawActions: Record<string, unknown> | undefined,
  subject: Pick<IntakeMerchantSubject, 'accountMode'>
): Record<string, IntakeModuleAction> {
  const normalized: Record<string, IntakeModuleAction> = {}
  for (const [key, rawAction] of Object.entries(rawActions ?? {})) {
    if (
      rawAction === 'businessFirstAccess'
      || rawAction === 'merchantFirstAccess'
      || rawAction === 'capabilityAdjustment'
    ) {
      normalized[key] = rawAction
    } else if (rawAction === 'new') {
      normalized[key] = isNewBusiness.value || subject.accountMode === 'new'
        ? defaultModuleAction(subject)
        : 'merchantFirstAccess'
    } else if (rawAction === 'changed') {
      normalized[key] = 'capabilityAdjustment'
    }
  }
  return normalized
}

function selectModuleScopeItem(item: ModuleScopeItem) {
  if (!activeMerchantSubject.value?.moduleActions?.[item.key]) return
  if (item.product) {
    selectCapabilityProduct(item.product)
    return
  }
  if (item.stage) activeStage.value = item.stage
}

function addModuleScopeItem(item: ModuleScopeItem) {
  pendingModuleScopeKey.value = item.key
  openModuleScopeMenuKey.value = item.key
}

function toggleModuleScopeMenu(item: ModuleScopeItem) {
  openModuleScopeMenuKey.value = openModuleScopeMenuKey.value === item.key ? '' : item.key
}

function updateModuleScopeAction(item: ModuleScopeItem, action: IntakeModuleAction) {
  const subject = activeMerchantSubject.value
  if (!subject) return
  if (item.product && !subject.newProducts.includes(item.product)) {
    subject.newProducts.push(item.product)
  }
  subject.moduleActions = { ...(subject.moduleActions ?? {}), [item.key]: action }
  pendingModuleScopeKey.value = ''
  openModuleScopeMenuKey.value = ''
  if (item.product) {
    ensureCapabilityPlans()
    loadCapabilityPlan(subject.id, item.product)
    activeStage.value = 'acquiring'
    return
  }
  selectModuleScopeItem(item)
  if (item.stage && standaloneValueAddedStageIds.has(item.stage)) {
    const capability = nonAcquiringCapabilities.find((entry) => entry.stage === item.stage)
    if (capability && !isSelected(capability.id)) {
      draft.value.selectedCapabilities.push({
        id: capability.id,
        name: capability.name,
        stage: capability.stage,
        group: capability.group,
        status: capability.status,
        responsibleDomains: [...capability.responsibleDomains]
      })
    }
  }
}

function removeModuleScopeItem(item: ModuleScopeItem) {
  const subject = activeMerchantSubject.value
  if (!subject) return
  if (item.product) saveActiveCapabilityPlan()
  const moduleActions = { ...(subject.moduleActions ?? {}) }
  delete moduleActions[item.key]
  if (item.product) {
    subject.newProducts = subject.newProducts.filter((product) => product !== item.product)
    draft.value.capabilityPlans = draft.value.capabilityPlans.filter((plan) =>
      plan.merchantSubjectId !== subject.id || plan.product !== item.product
    )
    if (item.product === 'online') {
      delete moduleActions['stage:userFee']
      subject.userFeeRules = []
    }
  }
  subject.moduleActions = moduleActions
  if (pendingModuleScopeKey.value === item.key) pendingModuleScopeKey.value = ''
  if (openModuleScopeMenuKey.value === item.key) openModuleScopeMenuKey.value = ''
  if (activeModuleKey.value === item.key) {
    const next = moduleScopeItems.value.find((entry) => Boolean(moduleActions[entry.key]))
    if (next) selectModuleScopeItem(next)
    else {
      activeStage.value = 'acquiring'
      activeCapabilityProduct.value = null
    }
  }
}

const activeCapabilityPlan = computed(() =>
  draft.value.capabilityPlans.find((plan) =>
    plan.merchantSubjectId === activeMerchantSubject.value?.id
    && plan.product === activeCapabilityProduct.value
  )
)

const activeModuleKey = computed(() =>
  activeStage.value === 'acquiring'
    ? `product:${activeCapabilityProduct.value ?? 'unknown'}`
    : `stage:${activeStage.value}`
)

const activeModuleAction = computed(() =>
  activeMerchantSubject.value?.moduleActions?.[activeModuleKey.value]
)

const activeModuleContentVisible = computed(() =>
  Boolean(activeModuleAction.value)
)

const useIncrementalSelectionMarks = computed(() =>
  activeModuleAction.value === 'capabilityAdjustment'
)

const capabilityTargetCount = computed(() =>
  draft.value.merchantSubjects.reduce((total, subject) => total + subjectCapabilityProducts(subject).length, 0)
)
const totalIncludedModuleCount = computed(() =>
  draft.value.merchantSubjects.reduce((total, subject) => total + Object.keys(subject.moduleActions ?? {}).length, 0)
)

const merchantSubjectsValid = computed(() =>
  draft.value.merchantSubjects.length > 0
  && draft.value.merchantSubjects.every((subject) => subject.accountMode === 'existing'
    ? Boolean(subject.merchantAccountId.trim())
    : Boolean(
        subject.subjectName.trim()
        && subject.merchantDescriptor.trim()
        && subject.merchantType === 'standardMerchant'
        && subject.merchantContractingCountry !== 'All'
      ))
)

const stepOneValid = computed(() => {
  if (!draft.value.businessName.trim()) return false
  return merchantSubjectsValid.value
})

const stepTwoValid = computed(() =>
  merchantSubjectsValid.value
  && totalIncludedModuleCount.value > 0
  && draft.value.capabilityPlans.length === capabilityTargetCount.value
  && draft.value.capabilityPlans.every((plan) => plan.configured)
  && draft.value.merchantSubjects.every((subject) => subjectModuleActionsComplete(subject))
  && draft.value.merchantSubjects.every((subject) => subjectTaxRulesComplete(subject))
  && draft.value.merchantSubjects.every((subject) => subjectUserFeeRulesComplete(subject))
)

const currentStepValid = computed(() => {
  if (draft.value.currentStep === 1) return stepOneValid.value
  if (draft.value.currentStep === 2) return stepTwoValid.value
  return true
})

const scenarioContext = computed(() => ({
  merchantType: activeMerchantSubject.value?.merchantType ?? draft.value.merchantType,
  product: draft.value.product,
  environment: draft.value.environment,
  integrationMode: draft.value.integrationMode,
  merchantContractingCountry: activeMerchantSubject.value?.merchantContractingCountry ?? draft.value.merchantContractingCountry,
  consumerPaymentCountry: draft.value.consumerPaymentCountry
}))

function capabilityStatus(capabilityId: CapabilityFeatureId, fallback: SupportStatus) {
  return resolveCapabilityStatus(props.capabilityConfig, capabilityId, scenarioContext.value) ?? fallback
}

function abilityDomains(abilityId: CapabilityFeatureId): DomainId[] {
  return props.capabilityConfig.capabilities.find((item) => item.id === abilityId)?.responsibleDomains ?? ['transaction']
}

const activePaymentAbilityGroups = computed(() => {
  if (draft.value.product === 'subscription') {
    return [...subscriptionManagementGroups, ...subscriptionPaymentAbilityGroups]
  }
  if (draft.value.product === 'agreementDeduction') {
    return agreementPaymentAbilityGroups.map((group) => ({
      ...group,
      options: group.id === 'agreementRetry'
        ? group.options
            .filter((option) => option.value !== 'agreementBackupMethodRetry')
            .sort((left, right) => {
              const order = ['agreementReopenCashier', 'agreementCashierRecovery']
              return order.indexOf(left.value) - order.indexOf(right.value)
            })
        : group.options
    }))
  }
  if (activeCapabilityProduct.value === 'online') {
    return visiblePaymentAbilityGroups
      .filter((group) => group.id === 'retry')
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => option.value !== 'backupMethodRetry')
      }))
  }
  return visiblePaymentAbilityGroups
})

const activeIntegrationOptions = computed(() =>
  draft.value.product === 'agreementDeduction'
    || draft.value.product === 'online'
    || draft.value.product === 'subscription'
    ? integrationOptions.filter((option) => option.value !== 'api')
    : integrationOptions
)

function baseEnvironmentStatus(environment: Environment): SupportStatus {
  if (draft.value.product === 'agreementDeduction') return 'standard'
  return scenarioCombinationStatus(props.capabilityConfig, { ...scenarioContext.value, environment })
}

function environmentComingSoon(environment: Environment) {
  return draft.value.product === 'subscription' && environment === 'app'
}

function selectEnvironment(environment: Environment) {
  if (environmentComingSoon(environment)) return
  draft.value.environment = environment
}

function baseIntegrationStatus(integrationMode: IntegrationMode): SupportStatus {
  if (draft.value.product === 'agreementDeduction') {
    return integrationMode === 'embedded' ? 'unsupported' : 'standard'
  }
  if (draft.value.product === 'subscription' && integrationMode === 'embedded') return 'unsupported'
  return scenarioCombinationStatus(props.capabilityConfig, { ...scenarioContext.value, integrationMode })
}

function integrationComingSoon(integrationMode: IntegrationMode) {
  return (draft.value.product === 'agreementDeduction' || draft.value.product === 'online')
    && integrationMode === 'embedded'
}

function integrationUnsupported(integrationMode: IntegrationMode) {
  return draft.value.product === 'subscription' && integrationMode === 'embedded'
}

function selectIntegrationMode(integrationMode: IntegrationMode) {
  if (integrationComingSoon(integrationMode) || integrationUnsupported(integrationMode)) return
  draft.value.integrationMode = integrationMode
}

function normalizePricingCurrencies(currencies: string[]) {
  const validCurrencies = [...new Set(currencies.filter((currency) => pricingCurrencyOptions.includes(currency)))]
  return validCurrencies.length ? validCurrencies : ['USD']
}

function normalizeSettlementCurrencyMappings(
  pricingCurrencies: string[],
  mappings: Record<string, string>
) {
  return Object.fromEntries(pricingCurrencies.map((pricingCurrency) => {
    const availableCurrencies = settlementCurrenciesByPricingCurrency[pricingCurrency] ?? [pricingCurrency]
    const selectedCurrency = availableCurrencies.includes(mappings[pricingCurrency])
      ? mappings[pricingCurrency]
      : availableCurrencies[0]
    return [pricingCurrency, selectedCurrency]
  }))
}

function togglePricingCurrency(currency: string) {
  if (draft.value.pricingCurrencies.includes(currency) && draft.value.pricingCurrencies.length === 1) return
  const selectedCurrencies = draft.value.pricingCurrencies.includes(currency)
    ? draft.value.pricingCurrencies.filter((item) => item !== currency)
    : [...draft.value.pricingCurrencies, currency]
  draft.value.pricingCurrencies = normalizePricingCurrencies(selectedCurrencies)
  draft.value.settlementCurrencyMappings = normalizeSettlementCurrencyMappings(
    draft.value.pricingCurrencies,
    draft.value.settlementCurrencyMappings
  )
}

function selectSettlementCurrency(pricingCurrency: string, settlementCurrency: string) {
  draft.value.settlementCurrencyMappings = {
    ...draft.value.settlementCurrencyMappings,
    [pricingCurrency]: settlementCurrency
  }
}

function updateSettlementCycleDays(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  draft.value.settlementCycleDays = Number.isFinite(value)
    ? Math.min(90, Math.max(0, Math.round(value)))
    : 5
}

function paymentAbilityCatalog(option: PaymentAbilityOption, group: string): CatalogItem {
  const featureId = option.value as CapabilityFeatureId
  const isAgreementMode = draft.value.product === 'agreementDeduction'
    && (option.value === 'standaloneAgreement' || option.value === 'payAndAgreement')
  const isSupportedAgreementRetry = draft.value.product === 'agreementDeduction'
    && (
      option.value === 'agreementReopenCashier'
      || option.value === 'deductionBackupMethodRetry'
      || option.value === 'intelligentRetry'
    )
  const subscriptionComingSoon = draft.value.product === 'subscription'
    && ['retentionPeriod', 'downgradeOnRenewal', 'subscriptionCashierRecovery'].includes(option.value)
  const subscriptionSupported = draft.value.product === 'subscription' && !subscriptionComingSoon
  const forceStandard = isAgreementMode || isSupportedAgreementRetry || subscriptionSupported
  const comingSoon = (
    draft.value.product === 'agreementDeduction' && option.value === 'agreementCashierRecovery'
  ) || subscriptionComingSoon
  return {
    id: `ability:${option.value}`,
    name: option.label,
    description: comingSoon ? '能力建设中，暂不可选择' : '按当前业务场景评估该产品能力的可用性',
    stage: 'acquiring',
    group,
    status: comingSoon ? 'unsupported' : forceStandard ? 'standard' : capabilityStatus(featureId, option.status),
    responsibleDomains: abilityDomains(featureId),
    comingSoon
  }
}

function paymentMethodCategory(item: CapabilityItem) {
  return item.paymentMethodType ?? 'internetBanking'
}

function createPaymentChannelRequirement(overrides: Partial<PaymentChannelRequirement> = {}): PaymentChannelRequirement {
  paymentChannelSequence += 1
  return {
    id: `payment-channel:${Date.now()}:${paymentChannelSequence}`,
    channelName: '',
    createNewAccount: false,
    channelId: '',
    merchantDescriptor: '',
    channelPaymentMinLimit: '',
    channelPaymentMaxLimit: '',
    cardVerificationAmount: '',
    ...overrides
  }
}

type LegacyPaymentChannelRequirement = Partial<PaymentChannelRequirement> & {
  reuseExistingAccount?: boolean
  brandName?: string
  channelPaymentLimit?: string
}

function normalizePaymentChannelRequirement(
  channel: LegacyPaymentChannelRequirement,
  fallbackMerchantDescriptor = ''
): PaymentChannelRequirement {
  const createNewAccount = typeof channel.createNewAccount === 'boolean'
    ? channel.createNewAccount
    : channel.reuseExistingAccount === false
  return createPaymentChannelRequirement({
    ...(channel.id ? { id: channel.id } : {}),
    channelName: channel.channelName ?? '',
    createNewAccount,
    channelId: createNewAccount ? '' : channel.channelId ?? '',
    merchantDescriptor: createNewAccount
      ? channel.merchantDescriptor ?? channel.brandName ?? fallbackMerchantDescriptor
      : '',
    channelPaymentMinLimit: createNewAccount ? channel.channelPaymentMinLimit ?? '' : '',
    channelPaymentMaxLimit: createNewAccount
      ? channel.channelPaymentMaxLimit ?? channel.channelPaymentLimit ?? ''
      : '',
    cardVerificationAmount: createNewAccount ? channel.cardVerificationAmount ?? '' : ''
  })
}

function createPaymentMethodRequirement(): PaymentMethodRequirement {
  return {
    id: '',
    paymentMethodId: 'visa',
    country: 'US',
    currency: 'USD',
    bindingMode: 'none',
    cardTypes: [...defaultCardTypes],
    channels: [createPaymentChannelRequirement()],
    channelRoutingRequirement: ''
  }
}

function createUserFeeRule(): UserFeeRule {
  return {
    id: '',
    paymentMethodId: '',
    country: 'US',
    calculationMode: 'percentage',
    percentageRate: '',
    fixedAmount: '',
    currency: 'USD'
  }
}

function createTaxRule(): TaxRule {
  return {
    id: '',
    country: 'US',
    calculationMode: 'taxInclusive',
    invoicingEnabled: false
  }
}

const paymentMethodItems = computed(() => capabilities.filter((item) => item.category === 'payment'))

const activeTaxRules = computed(() => activeMerchantSubject.value?.taxRules ?? [])

const activeUserFeeRules = computed(() => activeMerchantSubject.value?.userFeeRules ?? [])

const userFeePaymentMethodOptions = computed(() =>
  paymentMethodItems.value.filter((item) => item.products.includes('online'))
)

const userFeeRuleCurrencyOptions = computed(() =>
  countryCurrencyOptions[userFeeRuleEditor.value.country] ?? ['USD']
)

const userFeeEditorPaymentMethod = computed(() =>
  paymentMethodItems.value.find((item) => item.id === userFeeRuleEditor.value.paymentMethodId)
)

const duplicateUserFeeRule = computed(() =>
  activeUserFeeRules.value.some((rule) =>
    rule.id !== editingUserFeeRuleId.value
    && rule.paymentMethodId === userFeeRuleEditor.value.paymentMethodId
    && rule.country === userFeeRuleEditor.value.country
  )
)

const canAddUserFeeRule = computed(() => userFeePaymentMethodOptions.value.length > 0)

const userFeeRuleEditorValid = computed(() => {
  if (!userFeeRuleEditor.value.paymentMethodId || !userFeeRuleEditor.value.country || !userFeeRuleEditor.value.currency) return false
  if (duplicateUserFeeRule.value) return false
  if (userFeeRuleEditor.value.calculationMode === 'percentage') {
    const rate = Number(userFeeRuleEditor.value.percentageRate)
    return Number.isFinite(rate) && rate > 0 && rate <= 100
  }
  const amount = Number(userFeeRuleEditor.value.fixedAmount)
  return Number.isFinite(amount) && amount > 0 && Boolean(userFeeRuleEditor.value.currency)
})

function userFeePaymentMethodName(paymentMethodId: string) {
  return paymentMethodItems.value.find((item) => item.id === paymentMethodId)?.name ?? paymentMethodId
}

function userFeePaymentMethodTypeLabel(paymentMethodId: string) {
  const method = paymentMethodItems.value.find((item) => item.id === paymentMethodId)
  return method ? paymentMethodTypeLabels[paymentMethodCategory(method)] : '支付方式'
}

function userFeeRuleSummary(rule: UserFeeRule) {
  return rule.calculationMode === 'percentage'
    ? `按交易金额 ${rule.percentageRate}% 收取`
    : `每笔收取 ${rule.fixedAmount} ${rule.currency}`
}

function taxCalculationModeLabel(mode: TaxCalculationMode) {
  return taxCalculationModeOptions.find((option) => option.value === mode)?.label ?? mode
}

function taxRuleSummary(rule: TaxRule) {
  return `${taxCalculationModeLabel(rule.calculationMode)} · 开票服务${rule.invoicingEnabled ? '开通' : '不开通'}`
}

const duplicateTaxRule = computed(() =>
  activeTaxRules.value.some((rule) =>
    rule.id !== editingTaxRuleId.value && rule.country === taxRuleEditor.value.country
  )
)

const taxRuleEditorValid = computed(() =>
  Boolean(taxRuleEditor.value.country && taxRuleEditor.value.calculationMode) && !duplicateTaxRule.value
)

function openTaxRuleEditor(rule?: TaxRule) {
  const subjectCountry = activeMerchantSubject.value?.merchantContractingCountry
  const fallbackCountry = subjectCountry && subjectCountry !== 'All' ? subjectCountry : 'US'
  editingTaxRuleId.value = rule?.id ?? ''
  taxRuleEditor.value = rule
    ? { ...rule }
    : { ...createTaxRule(), country: fallbackCountry }
  showTaxRuleEditor.value = true
}

function closeTaxRuleEditor() {
  showTaxRuleEditor.value = false
  editingTaxRuleId.value = ''
}

function ensureTaxCapabilitySelected() {
  if (isSelected('service:tax')) return
  const capability = nonAcquiringCapabilities.find((item) => item.id === 'service:tax')
  if (!capability) return
  draft.value.selectedCapabilities.push({
    id: capability.id,
    name: capability.name,
    stage: capability.stage,
    group: capability.group,
    status: capability.status,
    responsibleDomains: [...capability.responsibleDomains]
  })
}

function saveTaxRule() {
  const subject = activeMerchantSubject.value
  if (!subject || !taxRuleEditorValid.value) return
  const rule: TaxRule = {
    ...taxRuleEditor.value,
    id: editingTaxRuleId.value || `tax-rule:${taxRuleEditor.value.country}:${Date.now()}`
  }
  const index = subject.taxRules.findIndex((item) => item.id === editingTaxRuleId.value)
  if (index >= 0) subject.taxRules.splice(index, 1, rule)
  else subject.taxRules.push(rule)
  ensureTaxCapabilitySelected()
  closeTaxRuleEditor()
}

function removeTaxRule(ruleId: string) {
  const subject = activeMerchantSubject.value
  if (!subject) return
  subject.taxRules = subject.taxRules.filter((rule) => rule.id !== ruleId)
  if (!subject.taxRules.length && subject.accountMode !== 'existing') {
    draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((item) => item.id !== 'service:tax')
    draft.value.capabilityPlans
      .filter((plan) => plan.merchantSubjectId === subject.id)
      .forEach((plan) => {
        plan.selectedCapabilities = plan.selectedCapabilities.filter((item) => item.id !== 'service:tax')
      })
  }
}

function openUserFeeRuleEditor(rule?: UserFeeRule) {
  const fallbackMethod = userFeePaymentMethodOptions.value[0]?.id ?? ''
  const subjectCountry = activeMerchantSubject.value?.merchantContractingCountry
  const fallbackCountry = subjectCountry && subjectCountry !== 'All' ? subjectCountry : 'US'
  editingUserFeeRuleId.value = rule?.id ?? ''
  userFeeRuleEditor.value = rule
    ? { ...rule }
    : {
        ...createUserFeeRule(),
        paymentMethodId: fallbackMethod,
        country: fallbackCountry,
        currency: countryCurrencyOptions[fallbackCountry]?.[0] ?? 'USD'
      }
  showUserFeeRuleEditor.value = true
}

function startUserFeeRuleCreation() {
  editingUserFeeRuleId.value = ''
  userFeeRuleEditor.value = createUserFeeRule()
  openPaymentMethodPicker('userFeeRule')
}

function returnToUserFeePaymentMethodPicker() {
  paymentMethodPickerPurpose.value = 'userFeeRule'
  paymentMethodPickerEditingId.value = ''
  paymentMethodPickerCountry.value = userFeeRuleEditor.value.country
  paymentMethodPickerType.value = 'All'
  paymentMethodPickerPage.value = 1
  showUserFeeRuleEditor.value = false
  showPaymentMethodPicker.value = true
}

function updateUserFeeRuleCountry(country: UserFeeRule['country']) {
  userFeeRuleEditor.value.country = country
  userFeeRuleEditor.value.currency = countryCurrencyOptions[country]?.[0] ?? 'USD'
}

function closeUserFeeRuleEditor() {
  showUserFeeRuleEditor.value = false
  editingUserFeeRuleId.value = ''
}

function ensureUserFeeCapabilitySelected() {
  if (isSelected('service:user-fee')) return
  const capability = nonAcquiringCapabilities.find((item) => item.id === 'service:user-fee')
  if (!capability) return
  draft.value.selectedCapabilities.push({
    id: capability.id,
    name: capability.name,
    stage: capability.stage,
    group: capability.group,
    status: capability.status,
    responsibleDomains: [...capability.responsibleDomains]
  })
}

function saveUserFeeRule() {
  const subject = activeMerchantSubject.value
  if (!subject || !userFeeRuleEditorValid.value) return
  const rule: UserFeeRule = {
    ...userFeeRuleEditor.value,
    id: editingUserFeeRuleId.value || `user-fee-rule:${Date.now()}`,
    percentageRate: userFeeRuleEditor.value.calculationMode === 'percentage'
      ? userFeeRuleEditor.value.percentageRate.trim()
      : '',
    fixedAmount: userFeeRuleEditor.value.calculationMode === 'fixed'
      ? userFeeRuleEditor.value.fixedAmount.trim()
      : ''
  }
  const index = subject.userFeeRules.findIndex((item) => item.id === editingUserFeeRuleId.value)
  if (index >= 0) subject.userFeeRules.splice(index, 1, rule)
  else subject.userFeeRules.push(rule)
  ensureUserFeeCapabilitySelected()
  closeUserFeeRuleEditor()
}

function removeUserFeeRule(ruleId: string) {
  const subject = activeMerchantSubject.value
  if (!subject) return
  subject.userFeeRules = subject.userFeeRules.filter((rule) => rule.id !== ruleId)
  if (!subject.userFeeRules.length && subject.accountMode !== 'existing') {
    draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((item) => item.id !== 'service:user-fee')
    draft.value.capabilityPlans
      .filter((plan) => plan.merchantSubjectId === subject.id)
      .forEach((plan) => {
        plan.selectedCapabilities = plan.selectedCapabilities.filter((item) => item.id !== 'service:user-fee')
      })
  }
}

const paymentMethodPickerTypeOptions = [
  { value: 'All', label: '全部类型' },
  { value: 'card', label: '银行卡' },
  { value: 'passThroughWallet', label: '穿透式钱包' },
  { value: 'wallet', label: '电子钱包' },
  { value: 'mobileBanking', label: '手机银行' },
  { value: 'realTimePaymentNetwork', label: '实时支付网络' },
  { value: 'bankTransfer', label: '银行转账' },
  { value: 'internetBanking', label: '网银（Internet Banking）' },
  { value: 'cashPin', label: '线下现金支付（Cash PIN）' }
] as const

const paymentMethodPickerItems = computed(() =>
  paymentMethodPickerPurpose.value === 'userFeeRule'
    ? userFeePaymentMethodOptions.value
    : paymentMethodItems.value
)

const filteredPaymentMethodItems = computed(() =>
  paymentMethodPickerItems.value.filter((item) => {
    if (paymentMethodPickerType.value !== 'All' && paymentMethodCategory(item) !== paymentMethodPickerType.value) return false
    if (paymentMethodPickerCountry.value !== 'All' && item.marketStatus[paymentMethodPickerCountry.value] === 'unsupported') return false
    return true
  })
)

const recommendedPaymentMethodItems = computed(() => {
  const filteredById = new Map(filteredPaymentMethodItems.value.map((item) => [item.id, item]))
  const recommendedIds = paymentMethodPickerCountry.value === 'All'
    ? globalRecommendedPaymentMethodIds
    : recommendedPaymentMethodIdsByMarket[paymentMethodPickerCountry.value]
  return recommendedIds
    .map((id) => filteredById.get(id))
    .filter((item): item is CapabilityItem => Boolean(item))
})

const otherPaymentMethodItems = computed(() => {
  const recommendedIds = new Set(recommendedPaymentMethodItems.value.map((item) => item.id))
  return filteredPaymentMethodItems.value.filter((item) => !recommendedIds.has(item.id))
})

const paymentMethodPickerPageCount = computed(() =>
  Math.max(1, Math.ceil(otherPaymentMethodItems.value.length / paymentMethodPickerPageSize))
)

const paginatedPaymentMethodItems = computed(() => {
  const start = (paymentMethodPickerPage.value - 1) * paymentMethodPickerPageSize
  return otherPaymentMethodItems.value.slice(start, start + paymentMethodPickerPageSize)
})

const editorPaymentMethod = computed(() =>
  paymentMethodItems.value.find((item) => item.id === paymentMethodEditor.value.paymentMethodId)
)

const editorRequiresCardType = computed(() => {
  const method = editorPaymentMethod.value
  if (!method) return false
  return paymentMethodCategory(method) === 'card' || paymentMethodCategory(method) === 'passThroughWallet'
})

const editorIsCardPayment = computed(() =>
  editorPaymentMethod.value ? paymentMethodCategory(editorPaymentMethod.value) === 'card' : false
)

const duplicatePaymentMethodRequirement = computed(() =>
  draft.value.paymentMethodRequirements.some(
    (item) =>
      item.id !== editingPaymentMethodId.value &&
      item.paymentMethodId === paymentMethodEditor.value.paymentMethodId &&
      item.country === paymentMethodEditor.value.country
  )
)

const paymentChannelValidationError = computed(() => {
  if (!paymentMethodEditor.value.channels.length) return '请至少添加一个支付渠道。'
  if (paymentMethodEditor.value.channels.some((channel) => !channel.channelName.trim())) return '请填写渠道名称。'
  if (paymentMethodEditor.value.channels.some((channel) => !channel.createNewAccount && !channel.channelId.trim())) {
    return '不新建渠道账号时，请填写 channel_id。'
  }
  if (paymentMethodEditor.value.channels.some((channel) => channel.createNewAccount && !channel.merchantDescriptor.trim())) {
    return '新建渠道账号时，请填写 Merchant Descriptor。'
  }
  if (paymentMethodEditor.value.channels.some((channel) => (
    channel.createNewAccount
    && (
      !channel.channelPaymentMinLimit.trim()
      || !Number.isFinite(Number(channel.channelPaymentMinLimit))
      || Number(channel.channelPaymentMinLimit) < 0
    )
  ))) {
    return '新建渠道账号时，请填写大于等于 0 的渠道支付最小限额。'
  }
  if (paymentMethodEditor.value.channels.some((channel) => (
    channel.createNewAccount
    && (
      !channel.channelPaymentMaxLimit.trim()
      || !Number.isFinite(Number(channel.channelPaymentMaxLimit))
      || Number(channel.channelPaymentMaxLimit) <= 0
    )
  ))) {
    return '新建渠道账号时，请填写大于 0 的渠道支付最大限额。'
  }
  if (paymentMethodEditor.value.channels.some((channel) => (
    channel.createNewAccount
    && Number(channel.channelPaymentMinLimit) > Number(channel.channelPaymentMaxLimit)
  ))) {
    return '渠道支付最小限额不能高于最大限额。'
  }
  if (editorIsCardPayment.value && paymentMethodEditor.value.channels.some((channel) => (
    channel.createNewAccount
    && (
      !channel.cardVerificationAmount.trim()
      || !Number.isFinite(Number(channel.cardVerificationAmount))
      || Number(channel.cardVerificationAmount) < 0
    )
  ))) {
    return '卡支付新建渠道账号时，请填写小额绑卡验证金额。'
  }
  const normalizedNames = paymentMethodEditor.value.channels.map((channel) => channel.channelName.trim().toLowerCase())
  if (new Set(normalizedNames).size !== normalizedNames.length) return '同一支付方式下的渠道名称不能重复。'
  if (
    paymentMethodEditor.value.channels.length > 1 &&
    !paymentMethodEditor.value.channelRoutingRequirement.trim()
  ) return '配置多个支付渠道时，请填写路由要求。'
  return ''
})

const paymentMethodEditorValid = computed(() =>
  Boolean(
    paymentMethodEditor.value.paymentMethodId &&
    paymentMethodEditor.value.country &&
    paymentMethodEditor.value.currency &&
    (!editorRequiresCardType.value || paymentMethodEditor.value.cardTypes.length > 0) &&
    !paymentChannelValidationError.value &&
    !duplicatePaymentMethodRequirement.value
  )
)

function weakerStatus(statuses: SupportStatus[]): SupportStatus {
  if (statuses.includes('unsupported')) return 'unsupported'
  if (statuses.includes('conditional')) return 'conditional'
  return 'standard'
}

function paymentMethodStatus(item: CapabilityItem, country = draft.value.consumerPaymentCountry): SupportStatus {
  if (
    !item.products.includes(draft.value.product) ||
    !item.environments.includes(draft.value.environment) ||
    !item.integrationModes.includes(draft.value.integrationMode)
  ) return 'unsupported'

  if (country !== 'All') {
    return item.marketStatus[country]
  }
  const statuses = Object.values(item.marketStatus)
  if (statuses.includes('standard')) return 'standard'
  if (statuses.includes('conditional')) return 'conditional'
  return 'unsupported'
}

function paymentMethodBindingTags(item: CapabilityItem) {
  return [
    { id: 'standaloneBinding' as const, label: '独立绑定' },
    { id: 'payAndBind' as const, label: '支付并绑定' }
  ]
    .map((tag) => ({ ...tag, status: item.paymentMethodTags?.[tag.id] ?? 'unsupported' }))
    .filter((tag) => tag.status !== 'unsupported')
}

function paymentRequirementStatus(requirement: PaymentMethodRequirement): SupportStatus {
  const method = paymentMethodItems.value.find((item) => item.id === requirement.paymentMethodId)
  if (!method) return 'unsupported'
  const statuses = [paymentMethodStatus(method, requirement.country)]
  if (requirement.bindingMode !== 'none') {
    statuses.push(method.paymentMethodTags?.[requirement.bindingMode] ?? 'unsupported')
  }
  return weakerStatus(statuses)
}

function paymentRequirementName(requirement: PaymentMethodRequirement) {
  return paymentMethodItems.value.find((item) => item.id === requirement.paymentMethodId)?.name ?? requirement.paymentMethodId
}

function bindingModeLabel(value: PaymentBindingMode) {
  return bindingModeOptions.find((item) => item.value === value)?.label ?? value
}

function cardTypeLabel(value: PaymentCardType) {
  return cardTypeOptions.find((item) => item.value === value)?.label ?? value
}

function openPaymentMethodPicker(purpose: 'paymentRequirement' | 'userFeeRule' = 'paymentRequirement') {
  paymentMethodPickerPurpose.value = purpose
  paymentMethodPickerEditingId.value = ''
  paymentMethodPickerCountry.value = draft.value.consumerPaymentCountry
  paymentMethodPickerType.value = 'All'
  paymentMethodPickerPage.value = 1
  showPaymentMethodPicker.value = true
}

function closePaymentMethodPicker() {
  showPaymentMethodPicker.value = false
  paymentMethodPickerEditingId.value = ''
}

function selectPaymentMethodPickerPage(page: number) {
  paymentMethodPickerPage.value = Math.min(Math.max(page, 1), paymentMethodPickerPageCount.value)
}

function selectPaymentMethodFromPicker(method: CapabilityItem) {
  const selectedCountry = paymentMethodPickerCountry.value !== 'All'
    ? paymentMethodPickerCountry.value
    : draft.value.consumerPaymentCountry !== 'All'
      ? draft.value.consumerPaymentCountry
      : (marketOptions.find((market) => market !== 'All' && method.marketStatus[market] !== 'unsupported') as PaymentMethodRequirement['country'] | undefined) ?? 'US'

  if (paymentMethodPickerPurpose.value === 'userFeeRule') {
    userFeeRuleEditor.value.paymentMethodId = method.id
    updateUserFeeRuleCountry(selectedCountry)
    showPaymentMethodPicker.value = false
    showUserFeeRuleEditor.value = true
    return
  }

  editingPaymentMethodId.value = paymentMethodPickerEditingId.value
  paymentMethodEditor.value = createPaymentMethodRequirement()
  updateEditorPaymentMethod(method.id)
  updateEditorCountry(selectedCountry)
  paymentMethodPickerEditingId.value = ''
  showPaymentMethodPicker.value = false
  showPaymentMethodEditor.value = true
}

function paymentMethodAlreadyAdded(method: CapabilityItem) {
  if (paymentMethodPickerCountry.value === 'All') return false
  if (paymentMethodPickerPurpose.value === 'userFeeRule') {
    return activeUserFeeRules.value.some(
      (rule) =>
        rule.id !== editingUserFeeRuleId.value &&
        rule.paymentMethodId === method.id &&
        rule.country === paymentMethodPickerCountry.value
    )
  }
  return draft.value.paymentMethodRequirements.some(
    (item) =>
      item.id !== paymentMethodPickerEditingId.value &&
      item.paymentMethodId === method.id &&
      item.country === paymentMethodPickerCountry.value
  )
}

function paymentMethodPickerAddedLabel() {
  return paymentMethodPickerPurpose.value === 'userFeeRule' ? '已配置' : '已添加'
}

function openPaymentMethodEditor(requirement?: PaymentMethodRequirement) {
  editingPaymentMethodId.value = requirement?.id ?? ''
  paymentMethodEditor.value = requirement
    ? {
        ...requirement,
        cardTypes: [...requirement.cardTypes],
        channels: requirement.channels.map((channel) => ({ ...channel }))
      }
    : createPaymentMethodRequirement()
  showPaymentMethodEditor.value = true
}

function closePaymentMethodEditor() {
  showPaymentMethodEditor.value = false
  editingPaymentMethodId.value = ''
}

function returnToPaymentMethodPicker() {
  paymentMethodPickerEditingId.value = editingPaymentMethodId.value
  paymentMethodPickerCountry.value = paymentMethodEditor.value.country
  paymentMethodPickerType.value = 'All'
  showPaymentMethodEditor.value = false
  showPaymentMethodPicker.value = true
}

function updateEditorPaymentMethod(paymentMethodId: string) {
  paymentMethodEditor.value.paymentMethodId = paymentMethodId
  const method = paymentMethodItems.value.find((item) => item.id === paymentMethodId)
  const requiresCardType = method && ['card', 'passThroughWallet'].includes(paymentMethodCategory(method))
  paymentMethodEditor.value.cardTypes = requiresCardType ? [...defaultCardTypes] : []
  paymentMethodEditor.value.bindingMode = 'none'
}

function updateEditorCountry(country: PaymentMethodRequirement['country']) {
  paymentMethodEditor.value.country = country
  paymentMethodEditor.value.currency = countryCurrencyOptions[country][0]
}

function toggleEditorCardType(cardType: PaymentCardType) {
  const selected = paymentMethodEditor.value.cardTypes
  paymentMethodEditor.value.cardTypes = selected.includes(cardType)
    ? selected.filter((item) => item !== cardType)
    : [...selected, cardType]
}

function addPaymentChannel() {
  paymentMethodEditor.value.channels.push(createPaymentChannelRequirement())
}

function removePaymentChannel(channelId: string) {
  if (paymentMethodEditor.value.channels.length <= 1) return
  paymentMethodEditor.value.channels = paymentMethodEditor.value.channels.filter((channel) => channel.id !== channelId)
  if (paymentMethodEditor.value.channels.length <= 1) {
    paymentMethodEditor.value.channelRoutingRequirement = ''
  }
}

function updateChannelAccountCreation(channel: PaymentChannelRequirement, createNewAccount: boolean) {
  channel.createNewAccount = createNewAccount
  if (createNewAccount) {
    channel.channelId = ''
    if (!channel.merchantDescriptor.trim()) {
      channel.merchantDescriptor = activeMerchantSubject.value?.merchantDescriptor ?? ''
    }
  } else {
    channel.merchantDescriptor = ''
    channel.channelPaymentMinLimit = ''
    channel.channelPaymentMaxLimit = ''
    channel.cardVerificationAmount = ''
  }
}

function savePaymentMethodRequirement() {
  if (!paymentMethodEditorValid.value) return
  const next: PaymentMethodRequirement = {
    ...paymentMethodEditor.value,
    id: editingPaymentMethodId.value || `payment-method:${paymentMethodEditor.value.paymentMethodId}:${paymentMethodEditor.value.country}`,
    cardTypes: editorRequiresCardType.value ? [...paymentMethodEditor.value.cardTypes] : [],
    channels: paymentMethodEditor.value.channels.map((channel) => ({
      ...channel,
      channelName: channel.channelName.trim(),
      channelId: channel.createNewAccount ? '' : channel.channelId.trim(),
      merchantDescriptor: channel.createNewAccount ? channel.merchantDescriptor.trim() : '',
      channelPaymentMinLimit: channel.createNewAccount ? channel.channelPaymentMinLimit.trim() : '',
      channelPaymentMaxLimit: channel.createNewAccount ? channel.channelPaymentMaxLimit.trim() : '',
      cardVerificationAmount: channel.createNewAccount && editorIsCardPayment.value
        ? channel.cardVerificationAmount.trim()
        : ''
    })),
    channelRoutingRequirement: paymentMethodEditor.value.channels.length > 1
      ? paymentMethodEditor.value.channelRoutingRequirement.trim()
      : ''
  }
  const index = draft.value.paymentMethodRequirements.findIndex((item) => item.id === editingPaymentMethodId.value)
  if (index >= 0) draft.value.paymentMethodRequirements.splice(index, 1, next)
  else draft.value.paymentMethodRequirements.push(next)
  closePaymentMethodEditor()
}

function removePaymentMethodRequirement(id: string) {
  draft.value.paymentMethodRequirements = draft.value.paymentMethodRequirements.filter((item) => item.id !== id)
}

function acquiringCatalog(): CatalogItem[] {
  return activePaymentAbilityGroups.value.flatMap((group) =>
    group.options.map((option) => paymentAbilityCatalog(option, group.title))
  )
}

const currentCatalog = computed<CatalogItem[]>(() => {
  if (activeStage.value === 'acquiring') return acquiringCatalog()
  return nonAcquiringCapabilities
    .filter((item) => item.stage === activeStage.value)
    .filter((item) => !hiddenIntakeCapabilityIds.has(item.id))
    .filter((item) => activeStage.value !== 'refund'
      || item.group !== '增值服务'
      || isSelected('refund-api'))
    .filter((item) => activeStage.value !== 'reconciliation'
      || item.group === '对账模式'
      || isSelected('reconciliation-independent'))
    .filter((item) => !item.platformOnly || scenarioContext.value.merchantType === 'platformMerchant')
    .map((item) => {
      const comingSoon = comingSoonIntakeCapabilityIds.has(item.id)
      return {
        ...item,
        description: comingSoon ? '能力建设中，暂不可选择' : item.description,
        status: comingSoon ? 'unsupported' : item.status,
        comingSoon
      }
    })
})

const groupedCatalog = computed(() => {
  const groups = new Map<string, CatalogItem[]>()
  for (const item of currentCatalog.value) {
    const entries = groups.get(item.group) ?? []
    entries.push(item)
    groups.set(item.group, entries)
  }
  return [...groups.entries()].map(([name, items]) => ({ name, items }))
})

const allLiveCatalog = computed(() => {
  const acquiring = acquiringCatalog()
  const others = nonAcquiringCapabilities
    .filter((item) => !hiddenIntakeCapabilityIds.has(item.id))
    .filter((item) => !item.platformOnly || scenarioContext.value.merchantType === 'platformMerchant')
    .map<CatalogItem>((item) => {
      const comingSoon = comingSoonIntakeCapabilityIds.has(item.id)
      return {
        ...item,
        description: comingSoon ? '能力建设中，暂不可选择' : item.description,
        status: comingSoon ? 'unsupported' : item.status,
        comingSoon
      }
    })
  return [...acquiring, ...others]
})

const paymentRequirementSelections = computed<SelectedCapability[]>(() =>
  draft.value.paymentMethodRequirements.map((requirement) => {
    const cardTypes = requirement.cardTypes.map(cardTypeLabel).join('/')
    const channelNames = requirement.channels.map((channel) => channel.channelName).filter(Boolean).join('/')
    return {
      id: requirement.id,
      name: [
        paymentRequirementName(requirement),
        requirement.country,
        requirement.currency,
        bindingModeLabel(requirement.bindingMode),
        cardTypes || undefined,
        channelNames ? `支付渠道：${channelNames}` : undefined,
        requirement.channelRoutingRequirement ? `路由：${requirement.channelRoutingRequirement}` : undefined
      ].filter(Boolean).join(' · '),
      stage: 'acquiring',
      group: '支付方式',
      status: paymentRequirementStatus(requirement),
      responsibleDomains: ['transaction', 'cashier']
    }
  })
)

const hydratedSelected = computed(() => {
  const live = new Map(allLiveCatalog.value.map((item) => [item.id, item]))
  const selectedCapabilities = draft.value.selectedCapabilities
    .filter((item) => !item.id.startsWith('method:'))
    .map((item) => live.get(item.id) ?? item)
  return [...paymentRequirementSelections.value, ...selectedCapabilities]
})

const selectedByStage = computed(() => {
  const result = new Map<IntakeStageId, CatalogItem[]>()
  for (const stage of intakeStageOptions) result.set(stage.id, [])
  for (const item of hydratedSelected.value) result.get(item.stage)?.push(item as CatalogItem)
  return result
})

interface ReviewCapabilityItem extends SelectedCapability {
  detail?: string
}

interface ReviewPlanSummary {
  plan: IntakeCapabilityPlan
  subject?: IntakeMerchantSubject
  paymentMethods: ReviewCapabilityItem[]
  capabilities: ReviewCapabilityItem[]
  stages: Array<{
    id: IntakeStageId
    label: string
    groups: Array<{ name: string; items: ReviewCapabilityItem[] }>
  }>
  status: Record<SupportStatus, number>
}

const reviewDomainMeta: Record<DomainId, { label: string; short: string; description: string }> = {
  transaction: { label: '交易 PM', short: '交', description: '交易流程、支付与退款能力评估' },
  cashier: { label: '收银 PM', short: '收', description: '收银台交互与用户体验评估' },
  gn: { label: 'GN PM', short: 'GN', description: '资金、结算与账务链路评估' }
}

function paymentRequirementStatusForPlan(requirement: PaymentMethodRequirement, plan: IntakeCapabilityPlan): SupportStatus {
  const method = paymentMethodItems.value.find((item) => item.id === requirement.paymentMethodId)
  if (!method) return 'unsupported'
  const product = productScenarioValue(plan.product)
  if (
    !method.products.includes(product)
    || !method.environments.includes(plan.environment)
    || !method.integrationModes.includes(plan.integrationMode)
  ) return 'unsupported'

  const statuses: SupportStatus[] = [method.marketStatus[requirement.country]]
  if (requirement.bindingMode !== 'none') {
    statuses.push(method.paymentMethodTags?.[requirement.bindingMode] ?? 'unsupported')
  }
  return weakerStatus(statuses)
}

function reviewPaymentMethodItem(requirement: PaymentMethodRequirement, plan: IntakeCapabilityPlan): ReviewCapabilityItem {
  const cardTypes = requirement.cardTypes.map(cardTypeLabel).join(' / ')
  const channels = requirement.channels.map((channel) => channel.channelName).filter(Boolean).join(' / ')
  return {
    id: requirement.id,
    name: paymentRequirementName(requirement),
    stage: 'acquiring',
    group: '支付方式',
    status: paymentRequirementStatusForPlan(requirement, plan),
    responsibleDomains: ['transaction', 'cashier'],
    detail: [
      `${requirement.country} · ${requirement.currency}`,
      bindingModeLabel(requirement.bindingMode),
      cardTypes || undefined,
      channels ? `渠道：${channels}` : undefined
    ].filter(Boolean).join(' · ')
  }
}

const reviewPlans = computed<ReviewPlanSummary[]>(() => draft.value.capabilityPlans.map((plan) => {
  const capabilities = plan.selectedCapabilities.map<ReviewCapabilityItem>((item) => ({
    ...item,
    responsibleDomains: [...item.responsibleDomains]
  }))
  const paymentMethods = plan.paymentMethodRequirements.map((requirement) => reviewPaymentMethodItem(requirement, plan))
  const stages = intakeStageOptions.map((stage) => {
    const stageItems = capabilities.filter((item) => item.stage === stage.id)
    const groups = new Map<string, ReviewCapabilityItem[]>()
    for (const item of stageItems) {
      const group = groups.get(item.group) ?? []
      group.push(item)
      groups.set(item.group, group)
    }
    return {
      id: stage.id,
      label: stage.label,
      groups: [...groups.entries()].map(([name, items]) => ({ name, items }))
    }
  }).filter((stage) => stage.groups.length > 0)
  const allItems = [...paymentMethods, ...capabilities]
  return {
    plan,
    subject: draft.value.merchantSubjects.find((subject) => subject.id === plan.merchantSubjectId),
    paymentMethods,
    capabilities,
    stages,
    status: {
      standard: allItems.filter((item) => item.status === 'standard').length,
      conditional: allItems.filter((item) => item.status === 'conditional').length,
      onDemand: allItems.filter((item) => item.status === 'onDemand').length,
      unsupported: allItems.filter((item) => item.status === 'unsupported').length
    }
  }
}))

interface ReviewDimensionItem {
  id: string
  name: string
  detail?: string
  kind?: 'capability' | 'paymentMethod'
  metadata?: Array<{ label: string; value: string }>
  channels?: Array<{
    id: string
    name: string
    accountMode: string
    channelAccount: string
    merchantDescriptor: string
    paymentLimit: string
    verificationAmount: string
  }>
  routingRequirement?: string
}

interface ReviewDimensionCard {
  id: string
  title: string
  description: string
  action?: IntakeModuleAction
  groups: Array<{ name: string; items: ReviewDimensionItem[] }>
}

const reviewMerchants = computed(() => draft.value.merchantSubjects
  .map((subject) => ({
    subject,
    plans: reviewPlans.value.filter((summary) => summary.plan.merchantSubjectId === subject.id)
  }))
  .filter((item) => item.plans.length > 0))

const activeReviewMerchant = computed(() =>
  reviewMerchants.value.find((item) => item.subject.id === activeReviewMerchantId.value)
  ?? reviewMerchants.value[0]
)

function reviewProductDimensionCard(summary: ReviewPlanSummary): ReviewDimensionCard | null {
  const { plan } = summary
  const action = summary.subject?.moduleActions?.[`product:${plan.product}`]
  if (!action) return null
  const acquiringGroups = summary.stages.find((stage) => stage.id === 'acquiring')?.groups ?? []
  return {
    id: `product:${plan.id}`,
    title: productLabel(plan.product),
    description: `${environmentLabel(plan)} · ${integrationModeLabel(plan)}`,
    action,
    groups: [
      {
        name: '接入场景',
        items: [
          { id: `${plan.id}:environment`, name: '支付环境', detail: environmentLabel(plan) },
          { id: `${plan.id}:integration`, name: '集成模式', detail: integrationModeLabel(plan) },
          { id: `${plan.id}:pricing`, name: '标价币种', detail: plan.pricingCurrencies.join(' / ') || '-' }
        ]
      },
      ...acquiringGroups.map((group) => ({
        name: group.name,
        items: group.items.map((item) => ({ id: item.id, name: item.name }))
      })),
      ...(plan.paymentMethodRequirements.length ? [{
        name: '支付方式',
        items: plan.paymentMethodRequirements.map((requirement) => {
          const method = paymentMethodItems.value.find((item) => item.id === requirement.paymentMethodId)
          const methodType = method ? paymentMethodTypeLabels[paymentMethodCategory(method)] : ''
          return {
            id: requirement.id,
            name: [paymentRequirementName(requirement), methodType].filter(Boolean).join(' / '),
            detail: `${requirement.country} · ${requirement.currency}`,
            kind: 'paymentMethod' as const,
            metadata: [
              { label: '国家/地区', value: requirement.country },
              { label: '支付币种', value: requirement.currency },
              { label: '绑定模式', value: bindingModeLabel(requirement.bindingMode) },
              {
                label: '卡类型',
                value: requirement.cardTypes.length ? requirement.cardTypes.map(cardTypeLabel).join(' / ') : '不适用'
              }
            ],
            channels: requirement.channels.map((channel) => ({
              id: channel.id,
              name: channel.channelName || '未命名渠道',
              accountMode: channel.createNewAccount ? '新开渠道账号' : '复用已有渠道账号',
              channelAccount: channel.createNewAccount ? '待创建' : channel.channelId || '待补充',
              merchantDescriptor: channel.merchantDescriptor || '-',
              paymentLimit: channel.channelPaymentMinLimit || channel.channelPaymentMaxLimit
                ? `${channel.channelPaymentMinLimit || '不限'} - ${channel.channelPaymentMaxLimit || '不限'}`
                : '-',
              verificationAmount: channel.cardVerificationAmount || '-'
            })),
            routingRequirement: requirement.channels.length > 1
              ? requirement.channelRoutingRequirement || '未填写路由要求'
              : undefined
          }
        })
      }] : [])
    ]
  }
}

function reviewStageDimensionCard(stage: Exclude<IntakeStageId, 'acquiring'>, summaries: ReviewPlanSummary[]): ReviewDimensionCard | null {
  const stageOption = intakeStageOptions.find((item) => item.id === stage)
  if (stage === 'userFee' && summaries[0]?.subject && !subjectSupportsUserFee(summaries[0].subject)) return null
  const action = summaries[0]?.subject?.moduleActions?.[`stage:${stage}`]
  if (!action) return null
  const groups = new Map<string, Map<string, { item: ReviewDimensionItem; products: Set<string> }>>()

  for (const summary of summaries) {
    const stageGroups = summary.stages.find((item) => item.id === stage)?.groups ?? []
    const currentProduct = productLabel(summary.plan.product)
    for (const group of stageGroups) {
      const groupItems = groups.get(group.name) ?? new Map()
      for (const item of group.items) {
        const key = `${group.name}:${item.name}`
        const existing = groupItems.get(key) ?? {
          item: { id: key, name: item.name },
          products: new Set<string>()
        }
        existing.products.add(currentProduct)
        groupItems.set(key, existing)
      }
      groups.set(group.name, groupItems)
    }
  }

  if (stage === 'userFee') {
    groups.clear()
    const rules = summaries[0]?.subject?.userFeeRules ?? []
    if (rules.length) {
      groups.set('手续费规则', new Map(rules.map((rule) => [rule.id, {
        item: {
          id: rule.id,
          name: userFeePaymentMethodName(rule.paymentMethodId),
          detail: `${rule.country} · ${rule.currency} · ${userFeeRuleSummary(rule)}`
        },
        products: new Set<string>()
      }])))
    }
  }

  if (stage === 'taxCalculation') {
    groups.clear()
    const rules = summaries[0]?.subject?.taxRules ?? []
    if (rules.length) {
      groups.set('计税规则', new Map(rules.map((rule) => [rule.id, {
        item: {
          id: rule.id,
          name: rule.country,
          detail: taxRuleSummary(rule)
        },
        products: new Set<string>()
      }])))
    }
  }

  if (stage !== 'userFee' && stage !== 'taxCalculation' && standaloneValueAddedStageIds.has(stage) && !groups.size) {
    const capability = nonAcquiringCapabilities.find((item) => item.stage === stage)
    if (capability) {
      groups.set(capability.group, new Map([[capability.id, {
        item: { id: capability.id, name: capability.name },
        products: new Set()
      }]]))
    }
  }

  if (stage === 'settlement') {
    const currencyPairs = new Set<string>()
    const settlementCycles = new Set<string>()
    for (const summary of summaries) {
      const mapping = Object.entries(summary.plan.settlementCurrencyMappings)
        .map(([pricing, settlement]) => `${pricing}→${settlement}`)
        .join('，') || '-'
      currencyPairs.add(mapping)
      settlementCycles.add(`${summary.plan.settlementCycleBasis}+${summary.plan.settlementCycleDays}`)
    }
    const orderedGroups = new Map<string, Map<string, { item: ReviewDimensionItem; products: Set<string> }>>()
    orderedGroups.set('结算币种对', new Map([['settlement:currency-pairs', {
      item: {
        id: 'settlement:currency-pairs',
        name: '结算币种对',
        detail: [...currencyPairs].join('；')
      },
      products: new Set()
    }]]))
    const settlementMode = groups.get('结算模式')
    if (settlementMode) orderedGroups.set('结算模式', settlementMode)
    orderedGroups.set('结算周期', new Map([['settlement:cycle', {
      item: {
        id: 'settlement:cycle',
        name: '结算周期',
        detail: [...settlementCycles].join(' / ')
      },
      products: new Set()
    }]]))
    for (const [name, items] of groups) {
      if (name !== '结算模式') orderedGroups.set(name, items)
    }
    groups.clear()
    for (const [name, items] of orderedGroups) groups.set(name, items)
  }

  if (!groups.size && !action) return null
  return {
    id: `stage:${stage}`,
    title: stageOption?.label ?? stage,
    description: '通用能力',
    action,
    groups: [...groups.entries()].map(([name, items]) => ({
      name,
      items: [...items.values()].map(({ item }) => item)
    }))
  }
}

const reviewDimensionCards = computed<ReviewDimensionCard[]>(() => {
  const summaries = activeReviewMerchant.value?.plans ?? []
  const productCards = summaries
    .map(reviewProductDimensionCard)
    .filter((card): card is ReviewDimensionCard => Boolean(card))
  const stageCards = (['refund', 'chargeback', 'settlement', 'withdrawal', 'reconciliation', 'currencyExchange', 'taxCalculation', 'userFee'] as const)
    .map((stage) => reviewStageDimensionCard(stage, summaries))
    .filter((card): card is ReviewDimensionCard => Boolean(card))
  return [...productCards, ...stageCards]
})

function reviewDimensionRows(group: ReviewDimensionCard['groups'][number]) {
  const detailedRows = group.items
    .filter((item) => item.detail)
    .map((item) => ({ id: item.id, label: item.name, value: item.detail ?? '' }))
  const plainItems = group.items.filter((item) => !item.detail)
  if (plainItems.length) {
    detailedRows.push({
      id: `${group.name}:selected`,
      label: group.name,
      value: plainItems.map((item) => item.name).join('、')
    })
  }
  return detailedRows
}

function reviewDimensionCardRows(card: ReviewDimensionCard) {
  return card.groups
    .filter((group) => group.name !== '支付方式')
    .flatMap((group) => reviewDimensionRows(group))
    .map((row) => ({
      ...row,
      fullWidth: row.label === '标价币种' || row.label === '结算币种对'
    }))
}

const reviewAllItems = computed(() => reviewPlans.value.flatMap((summary) => [
  ...summary.paymentMethods.map((item) => ({ ...item, summary })),
  ...summary.capabilities.map((item) => ({ ...item, summary }))
]))

const statusSummary = computed(() => ({
  standard: reviewAllItems.value.filter((item) => item.status === 'standard').length,
  conditional: reviewAllItems.value.filter((item) => item.status === 'conditional').length,
  unsupported: reviewAllItems.value.filter((item) => item.status === 'unsupported').length
}))

const reviewGapItems = computed(() => reviewAllItems.value.filter((item) => item.status !== 'standard'))

const reviewStageCount = computed(() => new Set(reviewAllItems.value.map((item) => item.stage)).size)

const reviewDomainSummary = computed(() => (Object.keys(reviewDomainMeta) as DomainId[]).map((id) => {
  const items = reviewAllItems.value.filter((item) => item.responsibleDomains.includes(id))
  return {
    id,
    ...reviewDomainMeta[id],
    total: items.length,
    gaps: items.filter((item) => item.status !== 'standard').length
  }
}).filter((domain) => domain.total > 0))

const businessDisplayName = computed(() => draft.value.businessName.trim() || '-')
const businessModeDisplayName = computed(() => isNewBusiness.value ? '新业务' : '已有业务')

const businessTypeDisplayName = computed(() =>
  intakeBusinessTypeOptions.find((item) => item.value === draft.value.businessType)?.title ?? '-'
)

const requestProductsDisplayName = computed(() => {
  const products = new Set(
    draft.value.merchantSubjects.flatMap((subject) => subjectCapabilityProducts(subject))
  )
  return [...products].map(productLabel).join('、') || '-'
})

const merchantTypeDisplayName = computed(() =>
  merchantTypeOptions.find((item) => item.value === scenarioContext.value.merchantType)?.label ?? '-'
)

function merchantTypeLabel(subject: IntakeMerchantSubject) {
  if (subject.accountMode === 'existing') return '-'
  return merchantTypeOptions.find((item) => item.value === subject.merchantType)?.label ?? '-'
}

function merchantSubjectNameLabel(subject: IntakeMerchantSubject) {
  return subject.accountMode === 'existing' ? '-' : subject.subjectName.trim() || '-'
}

function merchantContractingCountryLabel(subject: IntakeMerchantSubject) {
  return subject.accountMode === 'existing' ? '-' : subject.merchantContractingCountry
}

function merchantAccountLabel(subject: IntakeMerchantSubject) {
  if (subject.accountMode === 'new') return subject.merchantAccountId.trim() || '新增商户号'
  return subject.merchantAccountId.trim() || '已有商户号'
}

function productLabel(product: IntakeProductType) {
  return intakeProductOptions.find((option) => option.value === product)?.label ?? product
}

function subjectCapabilityProducts(subject: IntakeMerchantSubject): IntakeProductType[] {
  return subject.newProducts
}

function syncMerchantSubjectProducts(subject: IntakeMerchantSubject) {
  const available = new Set(agileAcquiringProductOptions.value.map((option) => option.value))
  subject.newProducts = subject.newProducts.filter((product) => available.has(product))
}

function merchantProductsLabel(subject: IntakeMerchantSubject) {
  const products = subjectCapabilityProducts(subject)
  if (!products.length) return '无'
  return products
    .map(productLabel)
    .join('、')
}

function capabilityPlanId(merchantSubjectId: string, product: IntakeProductType) {
  return `capability-plan:${merchantSubjectId}:${product}`
}

function productScenarioValue(product: IntakeProductType): ProductType {
  return product === 'iap' ? 'online' : product
}

function clonePaymentRequirements(requirements: PaymentMethodRequirement[]) {
  return requirements.map((requirement) => ({
    ...requirement,
    cardTypes: [...requirement.cardTypes],
    channels: (requirement.channels ?? []).map((channel) => normalizePaymentChannelRequirement(channel))
  }))
}

function removeUnavailableSelections(items: SelectedCapability[]) {
  let availableItems = items
    .filter((item) => !unavailableIntakeCapabilityIds.has(item.id))
    .map((item) => {
      if (item.id === 'service:fx') {
        return { ...item, name: '不保价', stage: 'currencyExchange' as const, group: '退款保价', status: 'standard' as const }
      }
      if (item.id === 'service:tax') {
        return { ...item, name: '计税', stage: 'taxCalculation' as const, group: '能力选择', status: 'standard' as const }
      }
      if (item.id === 'service:user-fee') {
        return { ...item, name: '用户手续费', stage: 'userFee' as const, group: '能力选择', status: 'standard' as const }
      }
      if (item.id === 'chargeback-merchant') {
        return { ...item, name: '全部由商户承担' }
      }
      if (item.id === 'chargeback-protection') {
        return { ...item, name: '欺诈拒付PIPO报赔', status: 'standard' as const }
      }
      return item
    })
  const selectedWithdrawalModes = availableItems.filter((item) => item.stage === 'withdrawal')
  if (selectedWithdrawalModes.length > 1) {
    const retainedWithdrawalMode = selectedWithdrawalModes[0]
    availableItems = availableItems.filter((item) => item.stage !== 'withdrawal' || item.id === retainedWithdrawalMode.id)
  }
  const selectedChargebackFundingModes = availableItems.filter((item) =>
    item.stage === 'chargeback' && item.group === '拒付损失承担'
  )
  if (selectedChargebackFundingModes.length > 1) {
    const retainedChargebackFundingMode = selectedChargebackFundingModes[selectedChargebackFundingModes.length - 1]
    availableItems = availableItems.filter((item) =>
      item.stage !== 'chargeback'
      || item.group !== '拒付损失承担'
      || item.id === retainedChargebackFundingMode.id
    )
  }
  const selectedReconciliationModes = availableItems.filter((item) => item.stage === 'reconciliation' && item.group === '对账模式')
  if (selectedReconciliationModes.length > 1) {
    const retainedReconciliationMode = selectedReconciliationModes[selectedReconciliationModes.length - 1]
    availableItems = availableItems.filter((item) =>
      item.stage !== 'reconciliation'
      || item.group !== '对账模式'
      || item.id === retainedReconciliationMode.id
    )
  }
  if (availableItems.some((item) => item.id === 'reconciliation-group')) {
    availableItems = availableItems.filter((item) => item.stage !== 'reconciliation' || item.group === '对账模式')
  }
  if (!availableItems.some((item) => item.id === 'refund-api')) {
    availableItems = availableItems.filter((item) => item.stage !== 'refund' || item.group !== '增值服务')
  }
  if (!availableItems.some((item) => item.id === requiredSettlementCapability.id)) {
    availableItems.push({
      ...requiredSettlementCapability,
      responsibleDomains: [...requiredSettlementCapability.responsibleDomains]
    })
  }
  if (!availableItems.some((item) => item.id === defaultDashboardRefundCapability.id)) {
    availableItems.push({
      ...defaultDashboardRefundCapability,
      responsibleDomains: [...defaultDashboardRefundCapability.responsibleDomains]
    })
  }
  if (!availableItems.some((item) => item.id === defaultOriginalRefundCapability.id)) {
    availableItems.push({
      ...defaultOriginalRefundCapability,
      responsibleDomains: [...defaultOriginalRefundCapability.responsibleDomains]
    })
  }
  return availableItems
}

function ensureProductDefaultSelections(items: SelectedCapability[], product: IntakeProductType) {
  const availableItems = removeUnavailableSelections(items)
  if (product === 'subscription' && !availableItems.some((item) => item.id === defaultSubscriptionPricingCapability.id)) {
    availableItems.push({
      ...defaultSubscriptionPricingCapability,
      responsibleDomains: [...defaultSubscriptionPricingCapability.responsibleDomains]
    })
  }
  return availableItems
}

function isDefaultCapability(id: string) {
  return id === requiredSettlementCapability.id
    || id === defaultDashboardRefundCapability.id
    || id === defaultOriginalRefundCapability.id
    || (activeCapabilityProduct.value === 'subscription' && id === defaultSubscriptionPricingCapability.id)
}

function isExclusiveCapability(item: Pick<SelectedCapability, 'stage' | 'group'>) {
  return item.stage === 'withdrawal'
    || item.stage === 'currencyExchange'
    || (item.stage === 'chargeback' && item.group === '拒付损失承担')
    || (item.stage === 'reconciliation' && item.group === '对账模式')
}

function createCapabilityPlan(
  merchantSubjectId: string,
  product: IntakeProductType
): IntakeCapabilityPlan {
  return {
    id: capabilityPlanId(merchantSubjectId, product),
    merchantSubjectId,
    product,
    environment: 'web',
    integrationMode: 'hosted',
    consumerPaymentCountry: 'All',
    paymentMethodType: 'All',
    paymentMethodRequirements: [],
    pricingCurrencies: ['USD'],
    settlementCurrencyMappings: { USD: 'USD' },
    settlementCycleBasis: 'T',
    settlementCycleDays: 5,
    selectedCapabilities: ensureProductDefaultSelections([], product),
    configured: false
  }
}

function ensureCapabilityPlans() {
  const targets = draft.value.merchantSubjects.flatMap((subject) =>
    subjectCapabilityProducts(subject).map((product) => ({
      merchantSubjectId: subject.id,
      product
    }))
  )
  const existing = new Map(
    draft.value.capabilityPlans.map((plan) => [
      capabilityPlanId(plan.merchantSubjectId, plan.product),
      plan
    ])
  )
  draft.value.capabilityPlans = targets.map(({ merchantSubjectId, product }) => {
    const fallback = createCapabilityPlan(merchantSubjectId, product)
    const current = existing.get(capabilityPlanId(merchantSubjectId, product))
    if (!current) return fallback
    const legacyPlan = current as IntakeCapabilityPlan & {
      pricingCurrency?: string
      settlementCurrency?: string
    }
    const pricingCurrencies = normalizePricingCurrencies(
      Array.isArray(current.pricingCurrencies)
        ? current.pricingCurrencies
        : [legacyPlan.pricingCurrency ?? 'USD']
    )
    const settlementCurrencyMappings = normalizeSettlementCurrencyMappings(
      pricingCurrencies,
      current.settlementCurrencyMappings ?? {
        [pricingCurrencies[0]]: legacyPlan.settlementCurrency ?? pricingCurrencies[0]
      }
    )
    return {
      ...fallback,
      ...current,
      paymentMethodRequirements: clonePaymentRequirements(current.paymentMethodRequirements ?? []),
      pricingCurrencies,
      settlementCurrencyMappings
    }
  })
}

let syncingCapabilityPlan = false

function saveActiveCapabilityPlan() {
  if (syncingCapabilityPlan || !activeCapabilityPlan.value) return
  const plan = activeCapabilityPlan.value
  plan.environment = draft.value.environment
  plan.integrationMode = draft.value.integrationMode
  plan.consumerPaymentCountry = draft.value.consumerPaymentCountry
  plan.paymentMethodType = draft.value.paymentMethodType
  plan.paymentMethodRequirements = clonePaymentRequirements(draft.value.paymentMethodRequirements)
  plan.pricingCurrencies = [...draft.value.pricingCurrencies]
  plan.settlementCurrencyMappings = { ...draft.value.settlementCurrencyMappings }
  plan.settlementCycleBasis = draft.value.settlementCycleBasis
  plan.settlementCycleDays = draft.value.settlementCycleDays
  plan.selectedCapabilities = ensureProductDefaultSelections(
    draft.value.selectedCapabilities.map((item) => ({
      ...item,
      responsibleDomains: [...item.responsibleDomains]
    })),
    plan.product
  )
}

function loadCapabilityPlan(
  merchantSubjectId: string,
  product: IntakeProductType,
  configured = true
) {
  saveActiveCapabilityPlan()
  ensureCapabilityPlans()
  const plan = draft.value.capabilityPlans.find((item) =>
    item.merchantSubjectId === merchantSubjectId && item.product === product
  )
  if (!plan) return
  syncingCapabilityPlan = true
  activeMerchantSubjectId.value = merchantSubjectId
  activeCapabilityProduct.value = product
  if (configured) plan.configured = true
  draft.value.product = productScenarioValue(product)
  const restoredEnvironment = draft.value.product === 'subscription' && plan.environment === 'app'
    ? 'web'
    : plan.environment
  draft.value.environment = restoredEnvironment
  plan.environment = restoredEnvironment
  const restoredIntegrationMode = (
    draft.value.product === 'agreementDeduction'
    || draft.value.product === 'online'
    || draft.value.product === 'subscription'
  )
    && (plan.integrationMode === 'embedded' || plan.integrationMode === 'api')
      ? 'hosted'
      : plan.integrationMode
  draft.value.integrationMode = restoredIntegrationMode
  plan.integrationMode = restoredIntegrationMode
  draft.value.consumerPaymentCountry = plan.consumerPaymentCountry
  draft.value.paymentMethodType = plan.paymentMethodType
  draft.value.paymentMethodRequirements = clonePaymentRequirements(plan.paymentMethodRequirements)
  draft.value.pricingCurrencies = normalizePricingCurrencies(plan.pricingCurrencies)
  draft.value.settlementCurrencyMappings = normalizeSettlementCurrencyMappings(
    draft.value.pricingCurrencies,
    plan.settlementCurrencyMappings
  )
  plan.pricingCurrencies = [...draft.value.pricingCurrencies]
  plan.settlementCurrencyMappings = { ...draft.value.settlementCurrencyMappings }
  draft.value.settlementCycleBasis = plan.settlementCycleBasis
  draft.value.settlementCycleDays = plan.settlementCycleDays
  draft.value.selectedCapabilities = plan.selectedCapabilities.map((item) => ({
    ...item,
    responsibleDomains: [...item.responsibleDomains]
  })).filter((item) =>
    (
      draft.value.product !== 'agreementDeduction'
      || (
        item.id !== 'ability:agreementCashierRecovery'
        && item.id !== 'ability:agreementBackupMethodRetry'
        && item.id !== 'service:marketing'
      )
    )
    && (
      product !== 'online'
      || ![
        'ability:backupMethodRetry',
        'ability:creditPlusX',
        'ability:ttpayPlusX',
        'ability:ttplPlusX',
        'service:marketing'
      ].includes(item.id)
    )
    && (
      product !== 'subscription'
      || ![
        'ability:retentionPeriod',
        'ability:downgradeOnRenewal',
        'ability:subscriptionCashierRecovery',
        'ability:primaryPiCharge',
        'ability:primaryBackupPiPolling',
        'service:marketing'
      ].includes(item.id)
    )
  )
  draft.value.selectedCapabilities = ensureProductDefaultSelections(draft.value.selectedCapabilities, product)
  plan.selectedCapabilities = draft.value.selectedCapabilities.map((item) => ({
    ...item,
    responsibleDomains: [...item.responsibleDomains]
  }))
  syncingCapabilityPlan = false
}

function selectCapabilityMerchant(merchantSubjectId: string) {
  const subject = draft.value.merchantSubjects.find((item) => item.id === merchantSubjectId)
  if (!subject) return
  pendingModuleScopeKey.value = ''
  openModuleScopeMenuKey.value = ''
  activeMerchantSubjectId.value = subject.id
  const product = subjectCapabilityProducts(subject).find((item) => subject.moduleActions[`product:${item}`])
  if (product) {
    loadCapabilityPlan(subject.id, product)
    activeStage.value = 'acquiring'
    return
  }
  activeCapabilityProduct.value = null
  const firstStage = activeGenericStageOptions.value.find((stage) => subject.moduleActions[`stage:${stage.id}`])
  activeStage.value = firstStage?.id ?? 'acquiring'
}

function capabilityPlanMerchantLabel(plan: IntakeCapabilityPlan) {
  const subject = draft.value.merchantSubjects.find((item) => item.id === plan.merchantSubjectId)
  return subject ? merchantAccountLabel(subject) : '-'
}

function environmentLabel(plan: IntakeCapabilityPlan) {
  return environmentOptions.find((option) => option.value === plan.environment)?.label ?? plan.environment
}

function integrationModeLabel(plan: IntakeCapabilityPlan) {
  return integrationOptions.find((option) => option.value === plan.integrationMode)?.label ?? plan.integrationMode
}

function reviewStageLabel(stage: IntakeStageId) {
  return intakeStageOptions.find((item) => item.id === stage)?.label ?? stage
}

function reviewDomainLabel(domains: DomainId[]) {
  return domains.map((domain) => reviewDomainMeta[domain].label.replace(' PM', '')).join(' / ')
}

const reviewRequestTitle = computed(() => {
  const scope = requestProductsDisplayName.value === '-'
    ? businessTypeDisplayName.value
    : requestProductsDisplayName.value
  return `${businessDisplayName.value} · ${scope}接入需求`
})

function markdownTableCell(value: unknown) {
  return String(value ?? '-')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>')
}

function structuredRequirementText() {
  const lines = [
    `# ${reviewRequestTitle.value}`,
    '',
    '## 业务与商户',
    '',
    '| 项目 | 内容 |',
    '| --- | --- |',
    `| 产品类型 | ${markdownTableCell(businessTypeDisplayName.value)} |`,
    `| 业务选择 | ${markdownTableCell(businessModeDisplayName.value)} |`,
    `| 业务 | ${markdownTableCell(businessDisplayName.value)} |`,
    `| 本次接入产品 | ${markdownTableCell(requestProductsDisplayName.value)} |`,
    `| 商户信息 | ${draft.value.merchantSubjects.length} 组 |`,
    '',
    '## 能力方案'
  ]

  for (const summary of reviewPlans.value) {
    const { plan, subject } = summary
    const productAction = subject?.moduleActions?.[`product:${plan.product}`]
    if (!productAction) continue
    lines.push(
      '',
      `### ${capabilityPlanMerchantLabel(plan)} / ${productLabel(plan.product)}`
    )
    if (productAction) lines.push('', `> **本次动作：** ${moduleActionLabel(productAction)}`)

    if (productAction) {
      lines.push(
        '',
        '#### 商户与接入信息',
        '',
        '| 商户主体 | 商户类型 | 签约国家/地区 | 支付环境 | 集成模式 | 标价币种 |',
        '| --- | --- | --- | --- | --- | --- |',
        `| ${markdownTableCell(subject ? merchantSubjectNameLabel(subject) : '-')} | ${markdownTableCell(subject ? merchantTypeLabel(subject) : '-')} | ${markdownTableCell(subject ? merchantContractingCountryLabel(subject) : '-')} | ${markdownTableCell(environmentLabel(plan))} | ${markdownTableCell(integrationModeLabel(plan))} | ${markdownTableCell(plan.pricingCurrencies.join('、') || '-')} |`
      )
    }

    if (productAction && plan.paymentMethodRequirements.length) {
      lines.push('', '#### 支付方式与渠道要求')
      for (const requirement of plan.paymentMethodRequirements) {
        const cardTypes = requirement.cardTypes.map(cardTypeLabel).join(' / ')
        lines.push(
          '',
          `##### ${paymentRequirementName(requirement)}`,
          '',
          '| 国家/地区 | 支付币种 | 绑定模式 | 卡类型 |',
          '| --- | --- | --- | --- |',
          `| ${markdownTableCell(requirement.country)} | ${markdownTableCell(requirement.currency)} | ${markdownTableCell(bindingModeLabel(requirement.bindingMode))} | ${markdownTableCell(cardTypes || '不适用')} |`
        )
        if (requirement.channels.length) {
          lines.push(
            '',
            '| 渠道名称 | 账号模式 | 渠道账号 | Merchant Descriptor | 单笔限额 | 验证金额 |',
            '| --- | --- | --- | --- | --- | --- |'
          )
          requirement.channels.forEach((channel) => {
            const paymentLimit = channel.channelPaymentMinLimit || channel.channelPaymentMaxLimit
              ? `${channel.channelPaymentMinLimit || '不限'} - ${channel.channelPaymentMaxLimit || '不限'}`
              : '-'
            lines.push(
              `| ${markdownTableCell(channel.channelName || '未命名渠道')} | ${markdownTableCell(channel.createNewAccount ? '新开渠道账号' : '复用已有渠道账号')} | ${markdownTableCell(channel.createNewAccount ? '待创建' : channel.channelId || '待补充')} | ${markdownTableCell(channel.merchantDescriptor || '-')} | ${markdownTableCell(paymentLimit)} | ${markdownTableCell(channel.cardVerificationAmount || '-')} |`
            )
          })
        }
        if (requirement.channels.length > 1) {
          lines.push('', `> **路由要求：** ${requirement.channelRoutingRequirement || '未填写'}`)
        }
      }
    }

    const acquiringStage = summary.stages.find((stage) => stage.id === 'acquiring')
    if (productAction && acquiringStage?.groups.length) {
      lines.push(
        '',
        `#### ${acquiringStage.label}`,
        '',
        '| 能力分组 | 已选能力 |',
        '| --- | --- |'
      )
      for (const group of acquiringStage.groups) {
        lines.push(`| ${markdownTableCell(group.name)} | ${markdownTableCell(group.items.map((item) => item.name).join('、') || '-')} |`)
      }
    }

  }

  for (const subject of draft.value.merchantSubjects) {
    const subjectSummaries = reviewPlans.value.filter((item) => item.plan.merchantSubjectId === subject.id)
    const firstPlan = subjectSummaries[0]?.plan
    if (!firstPlan) continue
    for (const stageOption of intakeStageOptions.filter((stage) => stage.id !== 'acquiring')) {
      if (stageOption.id === 'userFee' && !subjectSupportsUserFee(subject)) continue
      const stageAction = subject.accountMode === 'existing'
        ? subject.moduleActions?.[`stage:${stageOption.id}`]
        : undefined
      const groupedItems = new Map<string, Set<string>>()
      for (const subjectSummary of subjectSummaries) {
        const stage = subjectSummary.stages.find((item) => item.id === stageOption.id)
        for (const group of stage?.groups ?? []) {
          const items = groupedItems.get(group.name) ?? new Set<string>()
          group.items.forEach((item) => items.add(item.name))
          groupedItems.set(group.name, items)
        }
      }
      if (stageOption.id === 'userFee' && stageAction) {
        groupedItems.clear()
        if (subject.userFeeRules.length) {
          groupedItems.set('手续费规则', new Set(subject.userFeeRules.map((rule) =>
            `${userFeePaymentMethodName(rule.paymentMethodId)} / ${rule.country} / ${rule.currency}：${userFeeRuleSummary(rule)}`
          )))
        }
      }
      if (stageOption.id === 'taxCalculation' && stageAction) {
        groupedItems.clear()
        if (subject.taxRules.length) {
          groupedItems.set('计税规则', new Set(subject.taxRules.map((rule) =>
            `${rule.country}：${taxRuleSummary(rule)}`
          )))
        }
      }
      if (
        standaloneValueAddedStageIds.has(stageOption.id)
        && stageOption.id !== 'userFee'
        && stageOption.id !== 'taxCalculation'
        && stageAction
        && !groupedItems.size
      ) {
        const capability = nonAcquiringCapabilities.find((item) => item.stage === stageOption.id)
        if (capability) groupedItems.set(capability.group, new Set([capability.name]))
      }
      if (stageOption.id === 'settlement' && stageAction) {
        const currencyPairs = new Set<string>()
        const cycles = new Set<string>()
        for (const subjectSummary of subjectSummaries) {
          const mapping = Object.entries(subjectSummary.plan.settlementCurrencyMappings)
            .map(([pricing, settlement]) => `${pricing} → ${settlement}`)
            .join('、') || '-'
          currencyPairs.add(mapping)
          cycles.add(`${subjectSummary.plan.settlementCycleBasis}+${subjectSummary.plan.settlementCycleDays}`)
        }
        groupedItems.set('结算币种对', currencyPairs)
        groupedItems.set('结算周期', cycles)
      }
      if (!stageAction) continue
      lines.push('', `### ${capabilityPlanMerchantLabel(firstPlan)} / ${stageOption.label}`)
      if (stageAction) lines.push('', `> **本次动作：** ${moduleActionLabel(stageAction)}`)
      lines.push('', '| 能力分组 | 已选能力或目标配置 |', '| --- | --- |')
      if (!groupedItems.size) {
        lines.push('| - | 暂未填写 |')
      } else {
        for (const [groupName, items] of groupedItems) {
          lines.push(`| ${markdownTableCell(groupName)} | ${markdownTableCell([...items].join('、') || '-')} |`)
        }
      }
    }
  }
  return lines.join('\n')
}

async function copyStructuredRequirement() {
  try {
    await navigator.clipboard.writeText(structuredRequirementText())
    copyFeedback.value = '已复制'
  } catch {
    copyFeedback.value = '复制失败'
  }
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
  copyFeedbackTimer = setTimeout(() => {
    copyFeedback.value = ''
  }, 1800)
}

function downloadStructuredRequirementMarkdown() {
  const markdown = structuredRequirementText()
  const safeTitle = reviewRequestTitle.value
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    || '结构化需求评估单'
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeTitle}.md`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  markdownDocumentFeedback.value = 'Markdown 文件已下载'
  if (markdownFeedbackTimer) clearTimeout(markdownFeedbackTimer)
  markdownFeedbackTimer = setTimeout(() => {
    markdownDocumentFeedback.value = ''
  }, 2200)
}

const larkDocumentIsCurrent = computed(() =>
  Boolean(larkDocumentUrl.value && larkDocumentSnapshot.value === structuredRequirementText())
)

async function createOrOpenLarkDocument() {
  if (larkDocumentIsCurrent.value) {
    window.open(larkDocumentUrl.value, '_blank', 'noopener,noreferrer')
    return
  }

  larkDocumentFeedback.value = ''
  if (!isSupabaseConfigured || !supabase) {
    larkDocumentFeedback.value = '当前环境未配置文档服务'
    return
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    larkDocumentFeedback.value = '请先登录产品能力管理'
    return
  }

  isCreatingLarkDocument.value = true
  const markdown = structuredRequirementText()

  try {
    const { data, error } = await supabase.functions.invoke<{
      documentId: string
      documentUrl: string
    }>('create-lark-document', {
      body: {
        title: reviewRequestTitle.value,
        markdown
      }
    })

    if (error) throw error
    if (!data?.documentUrl) throw new Error('文档服务未返回访问地址')

    larkDocumentUrl.value = data.documentUrl
    larkDocumentSnapshot.value = markdown
    larkDocumentFeedback.value = '飞书文档已生成，可点击打开'
  } catch (error) {
    let message = error instanceof Error ? error.message : '飞书文档生成失败'
    if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
      try {
        const payload = await error.context.clone().json() as { error?: string }
        if (payload.error) message = payload.error
      } catch {
        // Keep the client error when the function did not return JSON.
      }
    }
    if (/failed to send a request to the edge function/i.test(message)) {
      message = '无法连接飞书文档服务，请确认服务已部署后重试'
    } else if (/edge function returned a non-2xx status code/i.test(message)) {
      message = '飞书文档服务调用失败，请检查服务配置'
    }
    larkDocumentFeedback.value = message
  } finally {
    isCreatingLarkDocument.value = false
  }
}

function merchantCapabilityProgress(subject: IntakeMerchantSubject) {
  const count = Object.keys(subject.moduleActions ?? {}).length
  return count ? `${count} 个模块` : '未配置'
}

function subjectSupportsUserFee(subject: IntakeMerchantSubject) {
  return subjectCapabilityProducts(subject).includes('online')
}

function subjectModuleActionsComplete(subject: IntakeMerchantSubject) {
  return Object.keys(subject.moduleActions ?? {}).length > 0
    && subjectCapabilityProducts(subject).every((product) => Boolean(subject.moduleActions?.[`product:${product}`]))
}

function subjectUserFeeRulesComplete(subject: IntakeMerchantSubject) {
  if (!subjectSupportsUserFee(subject)) return true
  const action = subject.moduleActions?.['stage:userFee']
  return !action || subject.userFeeRules.length > 0
}

function subjectTaxRulesComplete(subject: IntakeMerchantSubject) {
  const action = subject.moduleActions?.['stage:taxCalculation']
  return !action || subject.taxRules.length > 0
}

function moduleActionLabel(action?: IntakeModuleAction) {
  return moduleActionOptions.find((option) => option.value === action)?.label ?? '未添加'
}

function merchantCapabilitiesConfigured(subject: IntakeMerchantSubject) {
  const plans = draft.value.capabilityPlans.filter((plan) => plan.merchantSubjectId === subject.id)
  return plans.length === subjectCapabilityProducts(subject).length
    && plans.every((plan) => plan.configured)
    && subjectModuleActionsComplete(subject)
    && subjectTaxRulesComplete(subject)
    && subjectUserFeeRulesComplete(subject)
}

function capabilityProductSelectedCount(product: IntakeProductType) {
  if (activeCapabilityProduct.value === product) {
    return selectedByStage.value.get('acquiring')?.length ?? 0
  }
  const plan = draft.value.capabilityPlans.find((item) =>
    item.merchantSubjectId === activeMerchantSubject.value?.id && item.product === product
  )
  if (!plan) return 0
  return plan.paymentMethodRequirements.length
    + plan.selectedCapabilities.filter((item) => item.stage === 'acquiring').length
}

function selectCapabilityProduct(product: IntakeProductType) {
  if (!activeMerchantSubject.value) return
  loadCapabilityPlan(activeMerchantSubject.value.id, product)
  activeStage.value = 'acquiring'
}

function isSelected(id: string) {
  return draft.value.selectedCapabilities.some((item) => item.id === id)
}

function toggleCapability(item: CatalogItem) {
  if (item.comingSoon || isDefaultCapability(item.id)) return
  if (isSelected(item.id)) {
    if (item.stage === 'currencyExchange') return
    if (item.stage === 'chargeback' && item.group === '拒付损失承担') return
    if (item.stage === 'reconciliation' && item.group === '对账模式') {
      draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((selected) => selected.stage !== 'reconciliation')
    } else if (item.id === 'refund-api') {
      draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((selected) =>
        selected.id !== item.id && (selected.stage !== 'refund' || selected.group !== '增值服务')
      )
    } else {
      draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((selected) => selected.id !== item.id)
    }
    return
  }
  if (item.stage === 'withdrawal') {
    draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((selected) => selected.stage !== 'withdrawal')
  } else if (item.stage === 'currencyExchange') {
    draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((selected) => selected.stage !== 'currencyExchange')
  } else if (item.stage === 'chargeback' && item.group === '拒付损失承担') {
    draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((selected) =>
      selected.stage !== 'chargeback' || selected.group !== '拒付损失承担'
    )
  } else if (item.stage === 'reconciliation' && item.group === '对账模式') {
    draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((selected) =>
      selected.stage !== 'reconciliation'
      || (item.id !== 'reconciliation-group' && selected.group !== '对账模式')
    )
  }
  draft.value.selectedCapabilities.push({
    id: item.id,
    name: item.name,
    stage: item.stage,
    group: item.group,
    status: item.status,
    responsibleDomains: item.responsibleDomains
  })
}

function selectBusinessMode(mode: 'new' | 'existing') {
  if (isNewBusiness.value === (mode === 'new')) return
  saveActiveCapabilityPlan()
  draft.value.intakeType = mode === 'new' ? 'newBusiness' : 'capabilityExpansion'
  draft.value.businessId = ''
}

function selectBusinessType(type: IntakeBusinessType) {
  if (type === 'payout') return
  if (draft.value.businessType === type) return
  draft.value.businessType = type
  draft.value.selectedCapabilities = []
  draft.value.paymentMethodRequirements = []
  draft.value.capabilityPlans = []
  activeStage.value = 'acquiring'
  resetMerchantSubjects()
}

function addMerchantSubject() {
  merchantSubjectSequence += 1
  const subject = createDefaultMerchantSubject(`merchant-subject:${Date.now()}:${merchantSubjectSequence}`, [])
  syncMerchantSubjectProducts(subject)
  draft.value.merchantSubjects.push(subject)
}

function removeMerchantSubject(id: string) {
  if (draft.value.merchantSubjects.length <= 1) return
  draft.value.merchantSubjects = draft.value.merchantSubjects.filter((subject) => subject.id !== id)
  draft.value.capabilityPlans = draft.value.capabilityPlans.filter((plan) => plan.merchantSubjectId !== id)
}

function resetMerchantSubjects() {
  merchantSubjectSequence += 1
  const subject = createDefaultMerchantSubject(`merchant-subject:${Date.now()}:${merchantSubjectSequence}`, [])
  syncMerchantSubjectProducts(subject)
  draft.value.merchantSubjects = [subject]
  activeMerchantSubjectId.value = subject.id
  activeCapabilityProduct.value = subjectCapabilityProducts(subject)[0] ?? null
}

function selectMerchantAccountMode(subject: IntakeMerchantSubject, mode: IntakeMerchantSubject['accountMode']) {
  if (subject.accountMode === mode) return
  saveActiveCapabilityPlan()
  const nextSubject = createDefaultMerchantSubject(subject.id, [])
  nextSubject.accountMode = mode
  if (mode === 'existing') nextSubject.merchantContractingCountry = 'All'
  Object.assign(subject, nextSubject)
  draft.value.capabilityPlans = draft.value.capabilityPlans.filter((plan) => plan.merchantSubjectId !== subject.id)
  if (activeMerchantSubjectId.value === subject.id) {
    activeCapabilityProduct.value = null
    activeStage.value = 'acquiring'
  }
}

function syncPrimaryMerchantContext() {
  const primary = draft.value.merchantSubjects[0]
  if (!primary) return
  draft.value.merchantAccountId = primary.accountMode === 'existing' ? primary.merchantAccountId : ''
  draft.value.merchantType = primary.merchantType
  draft.value.merchantContractingCountry = primary.merchantContractingCountry
}

function goToStep(step: IntakeStep) {
  if (step >= draft.value.currentStep) return
  saveActiveCapabilityPlan()
  draft.value.currentStep = step
}

function nextStep() {
  if (!currentStepValid.value || draft.value.currentStep >= 3) return
  if (draft.value.currentStep === 1) {
    ensureCapabilityPlans()
    const firstSubject = draft.value.merchantSubjects.find((subject) => subjectCapabilityProducts(subject).length > 0)
    const firstProduct = firstSubject ? subjectCapabilityProducts(firstSubject)[0] : undefined
    if (firstSubject && firstProduct) {
      loadCapabilityPlan(firstSubject.id, firstProduct)
    } else {
      activeMerchantSubjectId.value = draft.value.merchantSubjects[0]?.id ?? ''
      activeCapabilityProduct.value = null
      activeStage.value = 'acquiring'
    }
  } else {
    saveActiveCapabilityPlan()
  }
  draft.value.currentStep = (draft.value.currentStep + 1) as IntakeStep
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function previousStep() {
  if (draft.value.currentStep <= 1) return
  saveActiveCapabilityPlan()
  draft.value.currentStep = (draft.value.currentStep - 1) as IntakeStep
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function persistActiveRecordReference() {
  if (!currentRequestId.value) {
    localStorage.removeItem(recordStorageKey)
    return
  }
  localStorage.setItem(recordStorageKey, JSON.stringify({
    id: currentRequestId.value,
    requestNo: currentRequestNumber.value
  }))
}

function restoreActiveRecordReference() {
  try {
    const stored = localStorage.getItem(recordStorageKey)
    if (!stored) return
    const parsed = JSON.parse(stored) as { id?: string; requestNo?: string }
    currentRequestId.value = parsed.id ?? ''
    currentRequestNumber.value = parsed.requestNo ?? ''
  } catch {
    localStorage.removeItem(recordStorageKey)
  }
}

async function persistRequestDraft() {
  saveActiveCapabilityPlan()
  const record = await saveAgileIntakeRequest({
    id: currentRequestId.value || undefined,
    draft: draft.value,
    structuredRequirement: structuredRequirementText(),
    capabilityCount: reviewAllItems.value.length
  })
  currentRequestId.value = record.id
  currentRequestNumber.value = record.requestNo
  persistActiveRecordReference()
  return record
}

async function saveRequestDraft() {
  if (isSavingRequest.value || isSubmittingRequest.value) return
  requestPersistenceFeedback.value = ''
  requestPersistenceError.value = ''
  isSavingRequest.value = true
  try {
    const record = await persistRequestDraft()
    requestPersistenceFeedback.value = `草稿已保存 · ${record.requestNo}`
  } catch (error) {
    requestPersistenceError.value = error instanceof Error ? error.message : '保存草稿失败。'
  } finally {
    isSavingRequest.value = false
  }
}

function requestStatusLabel(status: AgileIntakeRequestStatus) {
  return {
    draft: '草稿',
    submitting: '提交中',
    submitted: '已提交',
    approval_failed: '审批创建失败'
  }[status]
}

function formatRequestUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value))
}

async function refreshRequestRecords() {
  requestPersistenceError.value = ''
  isLoadingRequestRecords.value = true
  try {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('当前环境未配置需求存储服务。')
    }
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    isRequestAuthenticated.value = Boolean(data.session)
    if (!data.session) {
      requestRecords.value = []
      return
    }
    requestRecords.value = await listAgileIntakeRequests()
  } catch (error) {
    requestPersistenceError.value = error instanceof Error ? error.message : '读取需求记录失败。'
  } finally {
    isLoadingRequestRecords.value = false
    isCheckingRequestSession.value = false
  }
}

function openRequestLogin() {
  requestLoginError.value = ''
  showRequestLogin.value = true
}

function closeRequestLogin() {
  if (isRequestLoggingIn.value) return
  showRequestLogin.value = false
  requestLoginPassword.value = ''
  requestLoginError.value = ''
}

async function loginRequestAccount() {
  if (!requestLoginEmail.value.trim() || !requestLoginPassword.value || isRequestLoggingIn.value) return
  requestLoginError.value = ''
  isRequestLoggingIn.value = true
  try {
    await signInWithPassword(requestLoginEmail.value.trim(), requestLoginPassword.value)
    isRequestAuthenticated.value = true
    showRequestLogin.value = false
    requestLoginPassword.value = ''
    requestPersistenceError.value = ''
    await refreshRequestRecords()
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    requestLoginError.value = message === 'Invalid login credentials' ? '邮箱或密码错误。' : message || '登录失败，请重试。'
  } finally {
    isRequestLoggingIn.value = false
  }
}

function startRequestFromList() {
  if (!isRequestAuthenticated.value) {
    openRequestLogin()
    return
  }
  startNewRequest()
}

async function showRequestList() {
  intakeView.value = 'list'
  submittedId.value = ''
  await refreshRequestRecords()
}

function continueLocalDraft() {
  intakeView.value = 'editor'
  submittedId.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function continueRequest(record: AgileIntakeRequestRecord) {
  draft.value = createDefaultAgileDraft()
  localStorage.setItem(storageKey, JSON.stringify(record.payload))
  localStorage.removeItem(legacyStorageKey)
  restoreDraft()
  currentRequestId.value = record.id
  currentRequestNumber.value = record.requestNo
  submittedId.value = ''
  submittedApprovalUrl.value = ''
  requestPersistenceFeedback.value = `已载入 ${record.requestNo}`
  requestPersistenceError.value = ''
  persistActiveRecordReference()
  intakeView.value = 'editor'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openSubmittedRequest(record: AgileIntakeRequestRecord) {
  if (!record.larkApprovalUrl) return
  window.open(record.larkApprovalUrl, '_blank', 'noopener,noreferrer')
}

async function edgeFunctionErrorMessage(error: unknown, fallback: string) {
  let message = error instanceof Error ? error.message : fallback
  if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
    try {
      const payload = await error.context.clone().json() as { error?: string }
      if (payload.error) message = payload.error
    } catch {
      // Preserve the client message when the function did not return JSON.
    }
  }
  return message
}

async function submitRequest() {
  if (isSubmittingRequest.value || isSavingRequest.value || !currentStepValid.value) return
  requestPersistenceFeedback.value = ''
  requestPersistenceError.value = ''
  isSubmittingRequest.value = true

  try {
    const record = await persistRequestDraft()
    if (!isSupabaseConfigured || !supabase) throw new Error('当前环境未配置审批服务。')

    const { data, error } = await supabase.functions.invoke<{
      instanceCode: string
      approvalUrl: string
      requestNo?: string
    }>('create-lark-approval', {
      body: {
        requestId: record.id,
        businessName: draft.value.businessName
      }
    })
    if (error) throw error
    if (!data?.instanceCode) throw new Error('审批服务未返回实例编号。')

    submittedId.value = data.requestNo || record.requestNo
    submittedApprovalUrl.value = data.approvalUrl || ''
    requestPersistenceFeedback.value = '需求已提交并创建飞书审批。'
    localStorage.removeItem(storageKey)
    localStorage.removeItem(legacyStorageKey)
    localStorage.removeItem(recordStorageKey)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    requestPersistenceError.value = await edgeFunctionErrorMessage(error, '提交审批失败。')
    await refreshRequestRecords().catch(() => undefined)
  } finally {
    isSubmittingRequest.value = false
  }
}

function startNewRequest() {
  draft.value = createDefaultAgileDraft()
  activeStage.value = 'acquiring'
  activeMerchantSubjectId.value = draft.value.merchantSubjects[0]?.id ?? ''
  activeCapabilityProduct.value = draft.value.merchantSubjects[0]?.newProducts[0] ?? null
  submittedId.value = ''
  submittedApprovalUrl.value = ''
  currentRequestId.value = ''
  currentRequestNumber.value = ''
  requestPersistenceFeedback.value = ''
  requestPersistenceError.value = ''
  draftRestored.value = false
  intakeView.value = 'editor'
  localStorage.removeItem(storageKey)
  localStorage.removeItem(legacyStorageKey)
  localStorage.removeItem(recordStorageKey)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function restoreDraft() {
  try {
    const currentStored = localStorage.getItem(storageKey)
    const legacyStored = localStorage.getItem(legacyStorageKey)
    const stored = currentStored ?? legacyStored
    if (!stored) return
    const parsed = JSON.parse(stored) as Partial<AgileIntakeDraft>
    const restoredStep = Number(parsed.currentStep ?? 1)
    const migratedStep: IntakeStep = legacyStored && !currentStored
      ? restoredStep >= 4
        ? 3
        : restoredStep >= 3
          ? 2
          : 1
      : restoredStep >= 3
        ? 3
        : restoredStep >= 2
          ? 2
          : 1
    draft.value = { ...createDefaultAgileDraft(), ...parsed }
    const legacyBusinessName = demoBusinesses.find((business) => business.id === parsed.businessId)?.name
    draft.value.businessName = parsed.businessName?.trim()
      || legacyBusinessName
      || parsed.businessId?.trim()
      || ''
    draft.value.businessId = ''
    const legacyParsed = parsed as Partial<AgileIntakeDraft> & {
      pricingCurrency?: string
      settlementCurrency?: string
    }
    draft.value.pricingCurrencies = normalizePricingCurrencies(
      Array.isArray(parsed.pricingCurrencies)
        ? parsed.pricingCurrencies
        : [legacyParsed.pricingCurrency ?? 'USD']
    )
    draft.value.settlementCurrencyMappings = normalizeSettlementCurrencyMappings(
      draft.value.pricingCurrencies,
      parsed.settlementCurrencyMappings ?? {
        [draft.value.pricingCurrencies[0]]: legacyParsed.settlementCurrency ?? draft.value.pricingCurrencies[0]
      }
    )
    if (draft.value.businessType === 'payout') draft.value.businessType = 'acquiring'
    draft.value.currentStep = migratedStep
    const restoredSubjects = Array.isArray(parsed.merchantSubjects)
      ? parsed.merchantSubjects.filter((subject): subject is IntakeMerchantSubject => Boolean(subject?.id))
      : []
    if (restoredSubjects.length) {
      draft.value.merchantSubjects = restoredSubjects.map((subject) => {
        const restoredSubject = {
          ...createDefaultMerchantSubject(subject.id, []),
          ...subject,
          newProducts: Array.isArray(subject.newProducts) && subject.newProducts.length
            ? [...subject.newProducts]
            : [],
          moduleActions: normalizeModuleActions(
            subject.moduleActions && typeof subject.moduleActions === 'object'
              ? subject.moduleActions as unknown as Record<string, unknown>
              : {},
            subject
          ),
          taxRules: Array.isArray(subject.taxRules)
            ? subject.taxRules.map((rule) => ({
                ...rule,
                country: rule.country ?? (subject.merchantContractingCountry !== 'All' ? subject.merchantContractingCountry : 'US'),
                calculationMode: rule.calculationMode ?? 'taxInclusive',
                invoicingEnabled: Boolean(rule.invoicingEnabled)
              }))
            : [],
          userFeeRules: Array.isArray(subject.userFeeRules)
            ? subject.userFeeRules.map((rule) => ({
                ...rule,
                country: rule.country ?? (subject.merchantContractingCountry !== 'All' ? subject.merchantContractingCountry : 'US'),
                currency: rule.currency || 'USD'
              }))
            : []
        }
        if (restoredSubject.accountMode === 'existing') {
          restoredSubject.subjectName = ''
          restoredSubject.merchantDescriptor = ''
          restoredSubject.merchantType = 'standardMerchant'
          restoredSubject.merchantContractingCountry = 'All'
        }
        return restoredSubject
      })
    } else {
      const hasLegacyAccount = Boolean(draft.value.merchantAccountId?.trim())
      draft.value.merchantSubjects = [{
        ...createDefaultMerchantSubject('merchant-subject:migrated', []),
        accountMode: hasLegacyAccount ? 'existing' : 'new',
        merchantAccountId: draft.value.merchantAccountId ?? '',
        subjectName: '',
        merchantDescriptor: '',
        merchantType: 'standardMerchant',
        merchantContractingCountry: hasLegacyAccount ? 'All' : draft.value.merchantContractingCountry,
        newProducts: []
      }]
    }
    draft.value.paymentMethodRequirements = (draft.value.paymentMethodRequirements ?? []).map((item) => {
      const legacy = item as PaymentMethodRequirement & {
        openNewChannelAccount?: boolean
        brandName?: string
      }
      const channels = Array.isArray(legacy.channels) && legacy.channels.length
        ? legacy.channels.map((channel) => normalizePaymentChannelRequirement(channel))
        : [
            normalizePaymentChannelRequirement({
              channelName: legacy.openNewChannelAccount ? '待开通渠道' : '默认渠道',
              createNewAccount: Boolean(legacy.openNewChannelAccount),
              merchantDescriptor: legacy.openNewChannelAccount ? legacy.brandName ?? '' : ''
            })
          ]
      return {
        id: legacy.id,
        paymentMethodId: legacy.paymentMethodId,
        country: legacy.country,
        currency: legacy.currency,
        bindingMode: legacy.bindingMode,
        cardTypes: [...(legacy.cardTypes ?? [])],
        channels,
        channelRoutingRequirement: legacy.channelRoutingRequirement ?? ''
      }
    })
    draft.value.selectedCapabilities = removeUnavailableSelections(
      (draft.value.selectedCapabilities ?? []).filter((item) => !item.id.startsWith('method:'))
    )
    if (legacyStored && !currentStored) localStorage.removeItem(legacyStorageKey)
    draft.value.merchantSubjects.forEach(syncMerchantSubjectProducts)
    ensureCapabilityPlans()
    draft.value.capabilityPlans.forEach((plan) => {
      plan.selectedCapabilities = ensureProductDefaultSelections(plan.selectedCapabilities ?? [], plan.product)
    })
    const firstSubject = draft.value.merchantSubjects.find((subject) => subjectCapabilityProducts(subject).length > 0)
    const firstProduct = firstSubject ? subjectCapabilityProducts(firstSubject)[0] : undefined
    if ((!Array.isArray(parsed.capabilityPlans) || !parsed.capabilityPlans.length) && firstSubject && firstProduct) {
      const migratedPlan = draft.value.capabilityPlans.find((plan) =>
        plan.merchantSubjectId === firstSubject.id && plan.product === firstProduct
      )
      if (migratedPlan) {
        migratedPlan.environment = draft.value.environment
        migratedPlan.integrationMode = draft.value.integrationMode
        migratedPlan.consumerPaymentCountry = draft.value.consumerPaymentCountry
        migratedPlan.paymentMethodType = draft.value.paymentMethodType
        migratedPlan.paymentMethodRequirements = clonePaymentRequirements(draft.value.paymentMethodRequirements)
        migratedPlan.pricingCurrencies = [...draft.value.pricingCurrencies]
        migratedPlan.settlementCurrencyMappings = { ...draft.value.settlementCurrencyMappings }
        migratedPlan.settlementCycleBasis = draft.value.settlementCycleBasis
        migratedPlan.settlementCycleDays = draft.value.settlementCycleDays
        migratedPlan.selectedCapabilities = ensureProductDefaultSelections(
          draft.value.selectedCapabilities.map((item) => ({
            ...item,
            responsibleDomains: [...item.responsibleDomains]
          })),
          firstProduct
        )
        migratedPlan.configured = draft.value.currentStep >= 2
      }
    }
    if (draft.value.currentStep >= 2 && firstSubject && firstProduct) {
      loadCapabilityPlan(firstSubject.id, firstProduct, false)
    } else {
      activeMerchantSubjectId.value = firstSubject?.id ?? draft.value.merchantSubjects[0]?.id ?? ''
      activeCapabilityProduct.value = firstProduct ?? null
    }
    syncPrimaryMerchantContext()
    draftRestored.value = true
  } catch {
    localStorage.removeItem(storageKey)
    localStorage.removeItem(legacyStorageKey)
  }
}

watch(
  () => draft.value.merchantSubjects,
  syncPrimaryMerchantContext,
  { deep: true }
)

watch(
  [paymentMethodPickerCountry, paymentMethodPickerType],
  () => {
    paymentMethodPickerPage.value = 1
  }
)

watch(
  () => [
    draft.value.environment,
    draft.value.integrationMode,
    draft.value.consumerPaymentCountry,
    draft.value.paymentMethodType,
    draft.value.paymentMethodRequirements,
    draft.value.pricingCurrencies,
    draft.value.settlementCurrencyMappings,
    draft.value.settlementCycleBasis,
    draft.value.settlementCycleDays,
    draft.value.selectedCapabilities
  ],
  saveActiveCapabilityPlan,
  { deep: true }
)

watch(
  draft,
  (value) => {
    if (!submittedId.value) localStorage.setItem(storageKey, JSON.stringify(value))
  },
  { deep: true }
)

watch([showPaymentMethodEditor, showPaymentMethodPicker, showUserFeeRuleEditor, showTaxRuleEditor, showRequestLogin], ([editorOpen, pickerOpen, userFeeEditorOpen, taxEditorOpen, loginOpen]) => {
  document.body.style.overflow = editorOpen || pickerOpen || userFeeEditorOpen || taxEditorOpen || loginOpen ? 'hidden' : ''
})

onMounted(() => {
  restoreActiveRecordReference()
  restoreDraft()
  void refreshRequestRecords()
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
  if (markdownFeedbackTimer) clearTimeout(markdownFeedbackTimer)
})
</script>

<template>
  <main
    class="intake-shell"
    :class="{
      'is-review-step': draft.currentStep === 3,
      'is-existing-merchant-plan': useIncrementalSelectionMarks
    }"
  >
    <section v-if="intakeView === 'list'" class="intake-request-list-page">
      <header class="intake-request-list-header">
        <div class="intake-title">
          <span class="intake-title__icon" aria-hidden="true" v-html="iconSvg.intake"></span>
          <div>
            <h1>敏捷接入提需</h1>
            <p>查看历史需求、继续编辑草稿或发起新的接入需求。</p>
          </div>
        </div>
        <button class="intake-button intake-button--primary" type="button" @click="startRequestFromList">＋ 发起需求</button>
      </header>

      <div class="intake-request-list-content">
        <section v-if="isRequestAuthenticated && draftRestored && !currentRequestId && draft.businessName.trim()" class="local-draft-callout">
          <div>
            <span>本地草稿</span>
            <strong>{{ draft.businessName }}</strong>
            <small>尚未保存到需求记录，继续编辑后可点击“保存草稿”。</small>
          </div>
          <button type="button" @click="continueLocalDraft">继续编辑</button>
        </section>

        <section class="intake-request-list-card">
          <div class="intake-request-list-card__heading">
            <div>
              <h2>需求列表</h2>
              <p>草稿和已提交需求均会保留，审批创建失败的记录可继续编辑并重新提交。</p>
            </div>
            <button v-if="isRequestAuthenticated" type="button" :disabled="isLoadingRequestRecords" @click="refreshRequestRecords">
              {{ isLoadingRequestRecords ? '刷新中...' : '刷新' }}
            </button>
          </div>

          <div class="intake-request-table">
            <div v-if="isRequestAuthenticated" class="intake-request-table__header">
              <span>需求编号</span><span>业务名称</span><span>需求内容</span><span>状态</span><span>更新时间</span><span>操作</span>
            </div>
            <p v-if="isCheckingRequestSession || isLoadingRequestRecords" class="request-record-empty">正在读取需求记录...</p>
            <section v-else-if="!isRequestAuthenticated && !requestPersistenceError" class="request-auth-empty">
              <span class="request-auth-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </span>
              <div>
                <strong>登录后查看和管理需求</strong>
                <p>使用敏捷接入提需账号登录，可保存草稿、查看历史需求并提交审批。</p>
              </div>
              <button class="intake-button intake-button--primary" type="button" @click="openRequestLogin">登录</button>
            </section>
            <p v-else-if="requestPersistenceError" class="request-record-empty is-error">{{ requestPersistenceError }}</p>
            <p v-else-if="!requestRecords.length" class="request-record-empty">暂无需求记录，点击右上角“发起需求”开始。</p>
            <div v-for="record in requestRecords" v-else :key="record.id" class="intake-request-table__row">
              <strong>{{ record.requestNo }}</strong>
              <div>
                <b>{{ record.businessName || '未命名需求' }}</b>
                <small v-if="record.approvalError">{{ record.approvalError }}</small>
              </div>
              <span>{{ record.merchantCount }} 个商户号 · {{ record.capabilityCount }} 项能力</span>
              <span><i class="request-record-status" :class="`is-${record.status}`">{{ requestStatusLabel(record.status) }}</i></span>
              <span>{{ formatRequestUpdatedAt(record.updatedAt) }}</span>
              <div class="intake-request-table__actions">
                <button
                  v-if="record.status === 'draft' || record.status === 'approval_failed'"
                  type="button"
                  @click="continueRequest(record)"
                >继续编辑</button>
                <button
                  v-else-if="record.status === 'submitted' && record.larkApprovalUrl"
                  type="button"
                  @click="openSubmittedRequest(record)"
                >打开审批</button>
                <span v-else>处理中</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section v-else-if="submittedId" class="intake-success" aria-live="polite">
      <span class="intake-success__icon" aria-hidden="true" v-html="iconSvg.success"></span>
      <span class="intake-success__eyebrow">提交成功</span>
      <h1>敏捷接入需求已创建</h1>
      <p>需求编号 <strong>{{ submittedId }}</strong>，飞书审批已创建并开始流转。</p>
      <div class="intake-success__actions">
        <a
          v-if="submittedApprovalUrl"
          class="intake-button intake-button--lark intake-success__approval-link"
          :href="submittedApprovalUrl"
          target="_blank"
          rel="noreferrer"
        >打开飞书审批</a>
        <button class="intake-button intake-button--secondary" type="button" @click="showRequestList">返回需求列表</button>
        <button class="intake-button intake-button--primary" type="button" @click="startNewRequest">创建新需求</button>
      </div>
    </section>

    <template v-else>
      <header class="intake-header">
        <div class="intake-title">
          <span class="intake-title__icon" aria-hidden="true" v-html="iconSvg.intake"></span>
          <div>
            <h1>敏捷接入提需</h1>
            <p>选择业务范围和能力，生成可评审的结构化需求。</p>
          </div>
        </div>
        <div class="intake-header-actions">
          <button class="intake-header-button" type="button" @click="showRequestList">返回需求列表</button>
          <button
            class="intake-header-button intake-header-button--primary"
            type="button"
            :disabled="isSavingRequest || isSubmittingRequest"
            @click="saveRequestDraft"
          >{{ isSavingRequest ? '保存中...' : '保存草稿' }}</button>
          <span class="draft-state"><i></i>{{ currentRequestNumber || (draftRestored ? '已恢复本地草稿' : '草稿自动保存') }}</span>
        </div>
      </header>

      <p
        v-if="requestPersistenceFeedback || requestPersistenceError"
        class="request-persistence-notice"
        :class="{ 'is-error': requestPersistenceError }"
        role="status"
      >{{ requestPersistenceError || requestPersistenceFeedback }}</p>

      <nav class="intake-steps" aria-label="提需步骤">
        <template v-for="step in 3" :key="step">
          <button
            class="intake-step"
            :class="{ 'is-active': draft.currentStep === step, 'is-complete': draft.currentStep > step }"
            type="button"
            :disabled="step > draft.currentStep"
            @click="goToStep(step as IntakeStep)"
          >
            <span>{{ draft.currentStep > step ? '✓' : step }}</span>
            <strong>{{ ['业务与商户', '能力方案', '确认提交'][step - 1] }}</strong>
          </button>
          <i v-if="step < 3" class="intake-step-line" :class="{ 'is-complete': draft.currentStep > step }"></i>
        </template>
      </nav>

      <section v-if="draft.currentStep === 1" class="intake-step-content">
        <div class="intake-section-heading">
          <div>
            <span>STEP 1</span>
            <h2>填写业务与商户信息</h2>
          </div>
          <p>先确认产品类型，再选择业务并填写本次涉及的商户信息。</p>
        </div>

        <section class="intake-choice-section" aria-labelledby="business-type-title">
          <div class="intake-choice-heading">
            <span>1</span>
            <div>
              <h3 id="business-type-title">产品类型</h3>
              <p>选择本次需要接入的产品类型</p>
            </div>
          </div>
          <div class="business-type-grid" role="group" aria-label="产品类型">
            <button
              v-for="option in intakeBusinessTypeOptions"
              :key="option.value"
              class="business-type-card"
              :class="{ 'is-active': draft.businessType === option.value, 'is-coming-soon': option.comingSoon }"
              type="button"
              :disabled="option.comingSoon"
              :aria-pressed="draft.businessType === option.value"
              :aria-label="option.comingSoon ? `${option.title}，即将上线` : option.title"
              @click="selectBusinessType(option.value)"
            >
              <span class="business-type-icon" aria-hidden="true" v-html="iconSvg[option.icon]"></span>
              <span class="business-type-copy">
                <strong>{{ option.title }}</strong>
                <em>{{ option.englishTitle }}</em>
                <small>{{ option.description }}</small>
              </span>
              <span v-if="option.comingSoon" class="business-type-coming-soon">Coming soon</span>
              <span v-else class="business-type-radio" aria-hidden="true"></span>
            </button>
          </div>
        </section>

        <section class="intake-form-panel" aria-labelledby="access-info-title">
          <div class="intake-form-heading">
            <h3 id="access-info-title">业务信息</h3>
            <span>选择新业务或已有业务</span>
          </div>
          <div class="intake-form-grid">
            <div class="intake-field">
              <span>业务选择 <i>*</i></span>
              <div class="business-mode-options" role="radiogroup" aria-label="业务选择">
                <button
                  type="button"
                  role="radio"
                  :aria-checked="isNewBusiness"
                  :class="{ 'is-active': isNewBusiness }"
                  @click="selectBusinessMode('new')"
                >新业务</button>
                <button
                  type="button"
                  role="radio"
                  :aria-checked="!isNewBusiness"
                  :class="{ 'is-active': !isNewBusiness }"
                  @click="selectBusinessMode('existing')"
                >已有业务</button>
              </div>
            </div>
            <label class="intake-field">
              <span>业务名称 <i>*</i></span>
              <input
                v-model="draft.businessName"
                type="text"
                :placeholder="isNewBusiness ? '请输入新业务名称' : '请输入已有业务名称'"
              />
              <small>当前暂不支持自动查询，请手工填写</small>
            </label>
          </div>
        </section>

        <section class="merchant-subject-panel" aria-labelledby="merchant-subject-title">
          <div class="merchant-subject-heading">
            <div>
              <h3 id="merchant-subject-title">商户信息</h3>
              <p>选择已有商户号或新商户号，并填写当前可提供的信息。</p>
            </div>
            <button class="add-merchant-subject-button" type="button" @click="addMerchantSubject">
              <span aria-hidden="true">＋</span>添加商户
            </button>
          </div>

          <div class="merchant-subject-list">
            <article v-for="(subject, index) in draft.merchantSubjects" :key="subject.id" class="merchant-subject-card">
              <header>
                <div>
                  <span>{{ index + 1 }}</span>
                  <div>
                    <strong>商户信息 {{ index + 1 }}</strong>
                    <small>{{ subject.accountMode === 'existing' ? '已有商户号，请手工输入商户号' : '新商户号，编号可后续补充' }}</small>
                  </div>
                </div>
                <button
                  v-if="draft.merchantSubjects.length > 1"
                  type="button"
                  :aria-label="`删除商户信息 ${index + 1}`"
                  @click="removeMerchantSubject(subject.id)"
                >删除</button>
              </header>

              <div class="merchant-subject-fields">
                <div class="intake-field">
                  <span>商户号类型 <i>*</i></span>
                  <div class="business-mode-options" role="radiogroup" aria-label="商户号类型">
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="subject.accountMode === 'existing'"
                      :class="{ 'is-active': subject.accountMode === 'existing' }"
                      @click="selectMerchantAccountMode(subject, 'existing')"
                    >已有商户号</button>
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="subject.accountMode === 'new'"
                      :class="{ 'is-active': subject.accountMode === 'new' }"
                      @click="selectMerchantAccountMode(subject, 'new')"
                    >新商户号</button>
                  </div>
                </div>

                <label class="intake-field">
                  <span>商户号 <i v-if="subject.accountMode === 'existing'">*</i></span>
                  <input
                    v-model="subject.merchantAccountId"
                    type="text"
                    :placeholder="subject.accountMode === 'existing' ? '请输入已有商户号' : '选填，如已预分配可填写'"
                  />
                  <small>{{ subject.accountMode === 'existing' ? '当前暂不支持自动查询，请手工填写' : '尚未生成商户号时可暂不填写' }}</small>
                </label>

                <label v-if="subject.accountMode === 'new'" class="intake-field">
                  <span>主体名称 <i>*</i></span>
                  <input
                    v-model="subject.subjectName"
                    type="text"
                    placeholder="请输入签约主体名称"
                  />
                </label>

                <label v-if="subject.accountMode === 'new'" class="intake-field">
                  <span>Merchant Descriptor <i>*</i></span>
                  <input
                    v-model="subject.merchantDescriptor"
                    type="text"
                  maxlength="80"
                  placeholder="请输入 Merchant Descriptor"
                  />
                </label>

                <label v-if="subject.accountMode === 'new'" class="intake-field">
                  <span>商户类型 <i>*</i></span>
                  <select v-model="subject.merchantType">
                    <option
                      v-for="option in merchantTypeOptions"
                      :key="option.value"
                      :value="option.value"
                      :disabled="option.value === 'platformMerchant'"
                    >{{ option.label }}{{ option.value === 'platformMerchant' ? '（暂不支持）' : '' }}</option>
                  </select>
                  <small v-if="subject.merchantType === 'platformMerchant'" class="intake-field-warning">当前流程暂不支持平台商户，请选择普通商户。</small>
                </label>

                <label v-if="subject.accountMode === 'new'" class="intake-field">
                  <span>签约国家/地区 <i>*</i></span>
                  <select v-model="subject.merchantContractingCountry">
                    <option value="All" disabled>请选择国家/地区</option>
                    <option v-for="market in marketOptions.filter((item) => item !== 'All')" :key="market" :value="market">{{ market }}</option>
                  </select>
                </label>
              </div>

            </article>
          </div>

          <p v-if="!stepOneValid" class="intake-validation">请完成每个商户号对应的必填信息后继续。</p>
        </section>
      </section>

      <section v-else-if="draft.currentStep === 2" class="intake-step-content">
        <div class="intake-section-heading review-page-heading">
          <div>
            <span>STEP 2</span>
            <h2>选择能力方案</h2>
          </div>
          <p>不支持项仍可选择，并会自动标记为能力建设需求。</p>
        </div>

        <section class="capability-target-panel" aria-labelledby="capability-target-title">
          <div class="capability-target-heading">
            <div>
              <h3 id="capability-target-title">配置对象</h3>
              <p>先选择商户号，再添加本次需要接入或调整的产品与能力模块。</p>
            </div>
            <span>已添加 {{ totalIncludedModuleCount }} 个模块</span>
          </div>
          <div class="capability-target-grid">
            <div class="capability-merchant-selector">
              <div>
                <span>商户号 <i>*</i></span>
                <small v-if="draft.merchantSubjects.length > 1">多个商户号需要分别完成能力方案</small>
              </div>
              <div class="capability-merchant-tags" role="radiogroup" aria-label="选择要配置的商户号">
                <button
                  v-for="(subject, index) in draft.merchantSubjects"
                  :key="subject.id"
                  type="button"
                  role="radio"
                  :aria-checked="activeMerchantSubject?.id === subject.id"
                  :class="{ 'is-active': activeMerchantSubject?.id === subject.id }"
                  @click="selectCapabilityMerchant(subject.id)"
                >
                  <span>{{ index + 1 }}</span>
                  <strong>{{ merchantAccountLabel(subject) }}</strong>
                  <small>{{ subject.accountMode === 'existing' ? '已有商户号' : subject.subjectName }}</small>
                  <em :class="{ 'is-complete': merchantCapabilitiesConfigured(subject) }">
                    {{ merchantCapabilityProgress(subject) }}
                  </em>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="module-scope-panel" aria-labelledby="module-scope-title">
          <header class="module-scope-heading">
            <div>
              <h3 id="module-scope-title">本次涉及模块</h3>
              <p>仅添加本次需要首次接入或调整能力的模块。</p>
            </div>
            <span>已添加 {{ includedModuleCount }} 个模块</span>
          </header>
          <div class="module-scope-grid">
            <article
              v-for="item in moduleScopeItems"
              :key="item.key"
              class="module-scope-card"
              :class="{
                'is-included': activeMerchantSubject?.moduleActions?.[item.key],
                'is-active': activeModuleKey === item.key && activeMerchantSubject?.moduleActions?.[item.key],
                'is-muted': !activeMerchantSubject?.moduleActions?.[item.key],
                'is-editing': pendingModuleScopeKey === item.key
              }"
              @click="selectModuleScopeItem(item)"
            >
              <div class="module-scope-card__title">
                <strong>{{ item.label }}</strong>
                <button
                  v-if="activeMerchantSubject?.moduleActions?.[item.key] || pendingModuleScopeKey === item.key"
                  type="button"
                  aria-label="取消本次模块选择"
                  title="取消本次模块选择"
                  @click.stop="removeModuleScopeItem(item)"
                >×</button>
              </div>
              <div
                v-if="activeMerchantSubject?.moduleActions?.[item.key] || pendingModuleScopeKey === item.key"
                class="module-scope-action"
                :class="activeMerchantSubject?.moduleActions?.[item.key]
                  ? `is-${activeMerchantSubject.moduleActions[item.key]}`
                  : 'is-pending'"
                @click.stop
              >
                <button
                  class="module-scope-action-trigger"
                  type="button"
                  :aria-label="`${item.label}接入类型`"
                  :aria-expanded="openModuleScopeMenuKey === item.key"
                  aria-haspopup="listbox"
                  @click="toggleModuleScopeMenu(item)"
                >
                  <span>{{ activeMerchantSubject?.moduleActions?.[item.key]
                    ? moduleActionLabel(activeMerchantSubject.moduleActions[item.key])
                    : '请选择接入类型' }}</span>
                  <i aria-hidden="true"></i>
                </button>
                <div
                  v-if="openModuleScopeMenuKey === item.key"
                  class="module-scope-menu"
                  role="listbox"
                  :aria-label="`${item.label}接入类型选项`"
                >
                  <button
                    v-for="option in moduleActionOptions"
                    :key="option.value"
                    type="button"
                    role="option"
                    :aria-selected="activeMerchantSubject?.moduleActions?.[item.key] === option.value"
                    :class="{ 'is-selected': activeMerchantSubject?.moduleActions?.[item.key] === option.value }"
                    @click="updateModuleScopeAction(item, option.value)"
                  >{{ option.label }}</button>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    class="is-not-involved"
                    @click="removeModuleScopeItem(item)"
                  >本需求不涉及</button>
                </div>
              </div>
              <button
                v-else
                class="module-scope-add"
                type="button"
                @click.stop="addModuleScopeItem(item)"
              ><span aria-hidden="true">+</span> 添加</button>
            </article>
          </div>
        </section>

        <section v-if="activeModuleContentVisible && activeStage === 'acquiring'" class="base-integration-panel">
          <div class="base-integration-heading">
            <div>
              <h3>支付接入</h3>
              <p>先明确支付发生的环境和收银台接入方式。</p>
            </div>
            <span>必选</span>
          </div>
          <div class="base-integration-row">
            <div class="base-integration-label"><strong>支付环境</strong><span>单选</span></div>
            <div class="base-integration-options base-integration-options--two">
              <button
                v-for="option in environmentOptions"
                :key="option.value"
                type="button"
                :class="{
                  'is-active': draft.environment === option.value,
                  'is-coming-soon': environmentComingSoon(option.value)
                }"
                :disabled="environmentComingSoon(option.value)"
                @click="selectEnvironment(option.value)"
              >
                <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
                <em v-if="environmentComingSoon(option.value)" class="base-integration-coming-soon">Coming soon</em>
                <em
                  v-else-if="baseEnvironmentStatus(option.value) !== 'standard'"
                  :class="`intake-status intake-status--${baseEnvironmentStatus(option.value)}`"
                >
                  {{ supportStatusLabel[baseEnvironmentStatus(option.value)] }}
                </em>
              </button>
            </div>
          </div>
          <div class="base-integration-row">
            <div class="base-integration-label"><strong>集成模式</strong><span>单选</span></div>
            <div
              class="base-integration-options"
              :class="activeIntegrationOptions.length === 2 ? 'base-integration-options--two' : 'base-integration-options--three'"
            >
              <button
                v-for="option in activeIntegrationOptions"
                :key="option.value"
                type="button"
                :class="{
                  'is-active': draft.integrationMode === option.value,
                  'is-coming-soon': integrationComingSoon(option.value) || integrationUnsupported(option.value)
                }"
                :disabled="integrationComingSoon(option.value) || integrationUnsupported(option.value)"
                @click="selectIntegrationMode(option.value)"
              >
                <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
                <em v-if="integrationComingSoon(option.value)" class="base-integration-coming-soon">Coming soon</em>
                <em v-else-if="integrationUnsupported(option.value)" class="base-integration-coming-soon">不支持</em>
                <em
                  v-else-if="baseIntegrationStatus(option.value) !== 'standard'"
                  :class="`intake-status intake-status--${baseIntegrationStatus(option.value)}`"
                >
                  {{ supportStatusLabel[baseIntegrationStatus(option.value)] }}
                </em>
              </button>
            </div>
          </div>
        </section>

        <section v-if="activeModuleContentVisible && activeStage === 'acquiring'" class="currency-selection-panel" aria-labelledby="pricing-currency-title">
          <header class="currency-selection-heading">
            <div>
              <h3 id="pricing-currency-title">标价币种</h3>
              <p>选择交易可使用的标价币种，清结算环节将按币种分别配置结算币种。</p>
            </div>
            <span>{{ draft.pricingCurrencies.length }} 项已选</span>
          </header>
          <div class="currency-selection-body">
            <div class="base-integration-options base-integration-options--currencies" aria-label="标价币种">
              <button
                v-for="currency in pricingCurrencyOptions"
                :key="currency"
                type="button"
                :aria-pressed="draft.pricingCurrencies.includes(currency)"
                :class="{ 'is-active': draft.pricingCurrencies.includes(currency) }"
                @click="togglePricingCurrency(currency)"
              >
                <strong>{{ currency }}</strong>
                <i class="pricing-currency-check" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </section>

        <section v-if="activeModuleContentVisible && activeStage === 'acquiring'" class="payment-requirement-panel" aria-labelledby="payment-requirement-title">
          <div class="payment-requirement-heading">
            <div>
              <h3 id="payment-requirement-title">支付方式</h3>
              <p>按国家维护支付方式、币种与接入要求。同一支付方式在同一国家仅保留一条记录。</p>
            </div>
            <button class="add-payment-method-button" type="button" @click="openPaymentMethodPicker('paymentRequirement')">
              <span aria-hidden="true">+</span>添加支付方式
            </button>
          </div>

          <div v-if="draft.paymentMethodRequirements.length" class="payment-requirement-list">
            <div class="payment-requirement-list__header" aria-hidden="true">
              <span>支付方式</span><span>国家/币种</span><span>绑定支付方式</span><span>卡类型</span><span>渠道要求</span><span>操作</span>
            </div>
            <article v-for="requirement in draft.paymentMethodRequirements" :key="requirement.id" class="payment-requirement-row">
              <div class="payment-requirement-method">
                <strong>{{ paymentRequirementName(requirement) }}</strong>
                <small>{{ paymentMethodTypeLabels[paymentMethodCategory(paymentMethodItems.find((item) => item.id === requirement.paymentMethodId)!)] }}</small>
              </div>
              <div class="payment-requirement-country"><strong>{{ requirement.country }}</strong><span>·</span><small>{{ requirement.currency }}</small></div>
              <div class="payment-requirement-tags payment-requirement-binding-field">
                <span class="payment-requirement-binding">{{ bindingModeLabel(requirement.bindingMode) }}</span>
              </div>
              <div class="payment-requirement-tags payment-requirement-card-types">
                <span v-for="cardType in requirement.cardTypes" :key="cardType">{{ cardTypeLabel(cardType) }}</span>
                <small v-if="!requirement.cardTypes.length">—</small>
              </div>
              <div class="payment-requirement-channel-summary">
                <strong>{{ requirement.channels.map((channel) => channel.channelName).join('、') }}</strong>
                <small>
                  {{ requirement.channels.length }} 个渠道
                  <template v-if="requirement.channels.some((channel) => channel.createNewAccount)"> · 含新建账号</template>
                  <template v-if="requirement.channelRoutingRequirement"> · 已配置路由</template>
                </small>
              </div>
              <div class="payment-requirement-actions">
                <button type="button" aria-label="编辑支付方式" title="编辑" @click="openPaymentMethodEditor(requirement)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10-10a2 2 0 0 0-2.8-2.8l-10 10L4 20Z"/><path d="m13.9 7.7 2.8 2.8"/></svg>
                </button>
                <button type="button" aria-label="删除支付方式" title="删除" @click="removePaymentMethodRequirement(requirement.id)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></svg>
                </button>
              </div>
            </article>
          </div>
          <div v-else class="payment-requirement-empty">
            <strong>暂未添加支付方式</strong>
            <span>点击“添加支付方式”补充国家、币种和使用要求。</span>
          </div>
        </section>

        <div
          v-if="activeModuleContentVisible && showPaymentMethodPicker"
          class="payment-method-picker-layer"
          role="presentation"
          @click.self="closePaymentMethodPicker"
        >
          <section
            class="payment-method-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-method-picker-title"
          >
            <header class="payment-method-picker__header">
              <div>
                <h3 id="payment-method-picker-title">选择支付方式</h3>
                <p v-if="paymentMethodPickerPurpose === 'userFeeRule'">选择需要配置手续费规则的支付方式，再设置国家、币种和计费规则。</p>
                <p v-else>选择国家后优先查看当地推荐方式，再配置币种和接入要求。</p>
              </div>
              <button type="button" aria-label="关闭支付方式选择" title="关闭" @click="closePaymentMethodPicker">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
              </button>
            </header>

            <div class="payment-method-picker__filters">
              <label>
                <span>国家/地区</span>
                <select v-model="paymentMethodPickerCountry">
                  <option v-for="market in marketOptions" :key="market" :value="market">{{ market === 'All' ? '全部国家/地区' : market }}</option>
                </select>
              </label>
              <label>
                <span>支付方式类型</span>
                <select v-model="paymentMethodPickerType">
                  <option v-for="option in paymentMethodPickerTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </label>
              <span class="payment-method-picker__count">{{ filteredPaymentMethodItems.length }} 个结果</span>
            </div>

            <div class="payment-method-picker__body">
              <template v-if="filteredPaymentMethodItems.length">
                <section v-if="recommendedPaymentMethodItems.length" class="payment-method-picker__section payment-method-picker__section--recommended">
                  <header class="payment-method-picker__section-header">
                    <div>
                      <span class="payment-method-picker__section-icon" aria-hidden="true">★</span>
                      <p>
                        <strong>推荐支付方式</strong>
                        <small>{{ paymentMethodPickerCountry === 'All' ? '按全球通用重要性排序' : `按 ${paymentMethodPickerCountry} 市场重要性排序` }}</small>
                      </p>
                    </div>
                    <em>{{ recommendedPaymentMethodItems.length }} 项</em>
                  </header>
                  <div class="payment-method-picker__grid">
                    <button
                      v-for="method in recommendedPaymentMethodItems"
                      :key="method.id"
                      type="button"
                      class="payment-method-picker-card payment-method-picker-card--recommended"
                      :disabled="paymentMethodAlreadyAdded(method)"
                      :aria-label="`推荐支付方式：${method.name}`"
                      @click="selectPaymentMethodFromPicker(method)"
                    >
                      <span
                        class="payment-method-picker-card__mark"
                        :style="{ '--payment-accent': method.accent }"
                      >{{ method.initial }}</span>
                      <span class="payment-method-picker-card__copy">
                        <strong>{{ method.name }}</strong>
                        <small>{{ paymentMethodTypeLabels[paymentMethodCategory(method)] }}</small>
                      </span>
                      <em v-if="paymentMethodAlreadyAdded(method)" class="payment-method-picker-card__added">{{ paymentMethodPickerAddedLabel() }}</em>
                      <span
                        v-else
                        class="payment-method-picker-card__tags"
                        :aria-label="paymentMethodBindingTags(method).length ? '支持的绑定能力' : undefined"
                        :aria-hidden="paymentMethodBindingTags(method).length ? undefined : true"
                      >
                        <em
                          v-for="tag in paymentMethodBindingTags(method)"
                          :key="tag.id"
                          :class="{ 'is-conditional': tag.status === 'conditional' }"
                          :title="tag.status === 'conditional' ? '条件支持' : undefined"
                        >{{ tag.label }}</em>
                      </span>
                    </button>
                  </div>
                </section>

                <section v-if="otherPaymentMethodItems.length" class="payment-method-picker__section">
                  <header class="payment-method-picker__section-header">
                    <div>
                      <p>
                        <strong>其他支付方式</strong>
                        <small>{{ paymentMethodPickerCountry === 'All' ? '除推荐项外，按支付方式目录顺序展示' : `同样支持 ${paymentMethodPickerCountry} 市场` }}</small>
                      </p>
                    </div>
                    <em>{{ otherPaymentMethodItems.length }} 项</em>
                  </header>
                  <div class="payment-method-picker__grid">
                    <button
                      v-for="method in paginatedPaymentMethodItems"
                      :key="method.id"
                      type="button"
                      class="payment-method-picker-card"
                      :disabled="paymentMethodAlreadyAdded(method)"
                      @click="selectPaymentMethodFromPicker(method)"
                    >
                      <span class="payment-method-picker-card__mark" :style="{ '--payment-accent': method.accent }">{{ method.initial }}</span>
                      <span class="payment-method-picker-card__copy">
                        <strong>{{ method.name }}</strong>
                        <small>{{ paymentMethodTypeLabels[paymentMethodCategory(method)] }}</small>
                      </span>
                      <em v-if="paymentMethodAlreadyAdded(method)" class="payment-method-picker-card__added">{{ paymentMethodPickerAddedLabel() }}</em>
                      <span
                        v-else
                        class="payment-method-picker-card__tags"
                        :aria-label="paymentMethodBindingTags(method).length ? '支持的绑定能力' : undefined"
                        :aria-hidden="paymentMethodBindingTags(method).length ? undefined : true"
                      >
                        <em
                          v-for="tag in paymentMethodBindingTags(method)"
                          :key="tag.id"
                          :class="{ 'is-conditional': tag.status === 'conditional' }"
                          :title="tag.status === 'conditional' ? '条件支持' : undefined"
                        >{{ tag.label }}</em>
                      </span>
                    </button>
                  </div>
                  <footer v-if="paymentMethodPickerPageCount > 1" class="payment-method-picker__pagination" aria-label="其他支付方式分页">
                    <span>第 {{ paymentMethodPickerPage }} / {{ paymentMethodPickerPageCount }} 页</span>
                    <div>
                      <button
                        type="button"
                        :disabled="paymentMethodPickerPage === 1"
                        aria-label="上一页"
                        @click="selectPaymentMethodPickerPage(paymentMethodPickerPage - 1)"
                      >‹</button>
                      <button
                        v-for="page in paymentMethodPickerPageCount"
                        :key="page"
                        type="button"
                        :class="{ 'is-active': paymentMethodPickerPage === page }"
                        :aria-current="paymentMethodPickerPage === page ? 'page' : undefined"
                        @click="selectPaymentMethodPickerPage(page)"
                      >{{ page }}</button>
                      <button
                        type="button"
                        :disabled="paymentMethodPickerPage === paymentMethodPickerPageCount"
                        aria-label="下一页"
                        @click="selectPaymentMethodPickerPage(paymentMethodPickerPage + 1)"
                      >›</button>
                    </div>
                  </footer>
                </section>
              </template>
              <div v-else class="payment-method-picker__empty">当前筛选条件下暂无支付方式。</div>
            </div>
          </section>
        </div>

        <div
          v-if="activeModuleContentVisible && showPaymentMethodEditor"
          class="payment-method-config-layer"
          role="presentation"
          @click.self="closePaymentMethodEditor"
        >
          <section
            class="payment-method-config"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-method-config-title"
          >
            <header class="payment-method-config__header">
              <div>
                <h3 id="payment-method-config-title">配置支付方式</h3>
                <p>完善币种、绑定模式和渠道账号信息。</p>
              </div>
              <button type="button" aria-label="关闭支付方式编辑" title="关闭" @click="closePaymentMethodEditor">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
              </button>
            </header>

            <div v-if="editorPaymentMethod" class="payment-method-config__summary">
              <span class="payment-method-config__mark" :style="{ '--payment-accent': editorPaymentMethod.accent }">{{ editorPaymentMethod.initial }}</span>
              <div>
                <strong>{{ editorPaymentMethod.name }}</strong>
                <small>{{ paymentMethodTypeLabels[paymentMethodCategory(editorPaymentMethod)] }}</small>
              </div>
              <button type="button" @click="returnToPaymentMethodPicker">重新选择</button>
            </div>

            <div class="payment-method-config__body">
              <div class="payment-method-config__grid">
                <label class="intake-field">
                  <span>支付方式所在国家/地区 <i>*</i></span>
                  <select :value="paymentMethodEditor.country" @change="updateEditorCountry(($event.target as HTMLSelectElement).value as PaymentMethodRequirement['country'])">
                    <option v-for="market in marketOptions.filter((item) => item !== 'All')" :key="market" :value="market">{{ market }}</option>
                  </select>
                </label>
                <label class="intake-field">
                  <span>支付币种 <i>*</i></span>
                  <select v-model="paymentMethodEditor.currency">
                    <option v-for="currency in countryCurrencyOptions[paymentMethodEditor.country]" :key="currency" :value="currency">{{ currency }}</option>
                  </select>
                </label>
                <label class="intake-field">
                  <span>绑定模式 <i>*</i></span>
                  <select v-model="paymentMethodEditor.bindingMode">
                    <option v-for="option in bindingModeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <div v-if="editorRequiresCardType" class="payment-card-type-field payment-card-type-field--inline">
                  <div>
                    <strong>卡类型 <i>*</i></strong>
                  </div>
                  <div class="payment-card-type-options">
                    <button
                      v-for="option in cardTypeOptions"
                      :key="option.value"
                      type="button"
                      :class="{ 'is-active': paymentMethodEditor.cardTypes.includes(option.value) }"
                      @click="toggleEditorCardType(option.value)"
                    >
                      <span aria-hidden="true"></span>{{ option.label }}
                    </button>
                  </div>
                </div>
              </div>

              <section class="payment-channel-requirements" aria-labelledby="payment-channel-requirements-title">
                <div class="payment-channel-requirements__heading">
                  <div>
                    <h4 id="payment-channel-requirements-title">支付渠道需求</h4>
                    <p>添加本支付方式使用的渠道，并配置渠道账号要求。</p>
                  </div>
                  <button type="button" @click="addPaymentChannel">
                    <span aria-hidden="true">+</span>添加支付渠道
                  </button>
                </div>

                <div class="payment-channel-table" role="table" aria-label="支付渠道配置">
                  <div class="payment-channel-table__header" role="row">
                    <span role="columnheader">渠道</span>
                    <span role="columnheader">渠道名称</span>
                    <span role="columnheader">新建渠道账号</span>
                    <span role="columnheader">channel_id</span>
                    <span role="columnheader">Merchant Descriptor</span>
                    <span role="columnheader">操作</span>
                  </div>
                  <div
                    v-for="(channel, index) in paymentMethodEditor.channels"
                    :key="channel.id"
                    class="payment-channel-table__row"
                    role="row"
                  >
                    <span class="payment-channel-table__index" role="cell">{{ String(index + 1).padStart(2, '0') }}</span>
                    <label class="payment-channel-table__field" role="cell">
                      <span>渠道名称</span>
                      <input v-model="channel.channelName" type="text" maxlength="80" placeholder="请输入渠道名称" />
                    </label>
                    <div class="payment-channel-account-choice" role="cell">
                      <span>新建渠道账号</span>
                      <div role="radiogroup" :aria-label="`渠道 ${index + 1} 是否新建渠道账号`">
                        <button
                          type="button"
                          :class="{ 'is-active': channel.createNewAccount }"
                          :aria-pressed="channel.createNewAccount"
                          @click="updateChannelAccountCreation(channel, true)"
                        >是</button>
                        <button
                          type="button"
                          :class="{ 'is-active': !channel.createNewAccount }"
                          :aria-pressed="!channel.createNewAccount"
                          @click="updateChannelAccountCreation(channel, false)"
                        >否</button>
                      </div>
                    </div>
                    <div v-if="channel.createNewAccount" class="payment-channel-generated" role="cell">
                      <span>channel_id</span>
                      <strong>新建</strong>
                    </div>
                    <label v-else class="payment-channel-table__field payment-channel-channel-id" role="cell">
                      <span>channel_id <i>*</i></span>
                      <input v-model="channel.channelId" type="text" maxlength="120" placeholder="请输入 channel_id" />
                    </label>
                    <label v-if="channel.createNewAccount" class="payment-channel-table__field payment-channel-merchant-descriptor" role="cell">
                      <span>Merchant Descriptor <i>*</i></span>
                      <input v-model="channel.merchantDescriptor" type="text" maxlength="80" placeholder="请输入 Merchant Descriptor" />
                    </label>
                    <div v-else class="payment-channel-not-applicable" role="cell" aria-label="Merchant Descriptor 不适用">
                      <span>Merchant Descriptor</span>
                      <strong>—</strong>
                    </div>
                    <button
                      class="payment-channel-remove"
                      type="button"
                      :disabled="paymentMethodEditor.channels.length === 1"
                      aria-label="删除支付渠道"
                      title="删除支付渠道"
                      @click="removePaymentChannel(channel.id)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13"/>
                      </svg>
                    </button>
                    <div
                      v-if="channel.createNewAccount"
                      class="payment-channel-extra-fields"
                      :class="{ 'payment-channel-extra-fields--without-card': !editorIsCardPayment }"
                    >
                      <label class="payment-channel-extra-field">
                        <span>渠道支付最小限额 <i>*</i></span>
                        <div>
                          <input
                            v-model="channel.channelPaymentMinLimit"
                            type="text"
                            inputmode="decimal"
                            placeholder="请输入最小限额"
                          />
                          <em>{{ paymentMethodEditor.currency }}</em>
                        </div>
                        <small>允许填写 0</small>
                      </label>
                      <label class="payment-channel-extra-field">
                        <span>渠道支付最大限额 <i>*</i></span>
                        <div>
                          <input
                            v-model="channel.channelPaymentMaxLimit"
                            type="text"
                            inputmode="decimal"
                            placeholder="请输入最大限额"
                          />
                          <em>{{ paymentMethodEditor.currency }}</em>
                        </div>
                        <small>必须大于或等于最小限额</small>
                      </label>
                      <label v-if="editorIsCardPayment" class="payment-channel-extra-field">
                        <span>小额绑卡验证金额 <i>*</i></span>
                        <div>
                          <input
                            v-model="channel.cardVerificationAmount"
                            type="text"
                            inputmode="decimal"
                            placeholder="请输入绑卡验证金额"
                          />
                          <em>{{ paymentMethodEditor.currency }}</em>
                        </div>
                        <small>支持填写 0 金额验证</small>
                      </label>
                    </div>
                  </div>
                </div>

                <div v-if="paymentMethodEditor.channels.length > 1" class="payment-channel-routing">
                  <label for="payment-channel-routing-requirement">
                    <strong>路由要求 <i>*</i></strong>
                    <span>存在多个支付渠道时，请填写渠道优先级及切换规则。</span>
                  </label>
                  <textarea
                    id="payment-channel-routing-requirement"
                    v-model="paymentMethodEditor.channelRoutingRequirement"
                    maxlength="500"
                    placeholder="例如：优先使用 Adyen；渠道不可用或交易失败时切换至 Checkout.com。"
                  ></textarea>
                </div>

                <span class="payment-channel-count">已添加 {{ paymentMethodEditor.channels.length }} 个支付渠道</span>
              </section>

              <p v-if="duplicatePaymentMethodRequirement" class="payment-method-editor__error">
                该支付方式在 {{ paymentMethodEditor.country }} 已存在，请编辑原记录或选择其他国家/地区。
              </p>
              <p v-else-if="editorRequiresCardType && !paymentMethodEditor.cardTypes.length" class="payment-method-editor__error">
                请至少选择一种卡类型。
              </p>
              <p v-else-if="paymentChannelValidationError" class="payment-method-editor__error">
                {{ paymentChannelValidationError }}
              </p>
            </div>

            <footer class="payment-method-config__footer">
              <button class="payment-method-config__back" type="button" @click="returnToPaymentMethodPicker">
                <span aria-hidden="true">←</span>返回选择
              </button>
              <div>
                <button class="intake-button intake-button--secondary" type="button" @click="closePaymentMethodEditor">取消</button>
                <button class="intake-button intake-button--primary" type="button" :disabled="!paymentMethodEditorValid" @click="savePaymentMethodRequirement">保存</button>
              </div>
            </footer>
          </section>
        </div>

        <section v-if="activeModuleContentVisible && activeStage === 'settlement'" class="settlement-config-panel" aria-labelledby="settlement-config-title">
          <header class="settlement-config-heading">
            <div>
              <h3 id="settlement-config-title">标价与结算币种</h3>
              <p>为每个标价币种分别选择对应的结算币种。</p>
            </div>
            <span>{{ draft.pricingCurrencies.length }} 组映射</span>
          </header>
          <div class="settlement-mapping-table">
            <div class="settlement-mapping-head" aria-hidden="true">
              <span>标价币种</span>
              <span>结算币种</span>
            </div>
            <div v-for="pricingCurrency in draft.pricingCurrencies" :key="pricingCurrency" class="settlement-mapping-row">
              <div class="settlement-pricing-currency">
                <strong>{{ pricingCurrency }}</strong>
              </div>
              <div class="settlement-currency-options" role="radiogroup" :aria-label="`${pricingCurrency} 对应的结算币种`">
                <button
                  v-for="currency in settlementCurrenciesByPricingCurrency[pricingCurrency] ?? [pricingCurrency]"
                  :key="currency"
                  type="button"
                  role="radio"
                  :aria-checked="draft.settlementCurrencyMappings[pricingCurrency] === currency"
                  :class="{ 'is-active': draft.settlementCurrencyMappings[pricingCurrency] === currency }"
                  @click="selectSettlementCurrency(pricingCurrency, currency)"
                >
                  {{ currency }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section v-if="activeModuleContentVisible && activeStage === 'taxCalculation'" class="user-fee-rule-panel tax-rule-panel" aria-labelledby="tax-rule-title">
          <header class="user-fee-rule-heading">
            <div>
              <h3 id="tax-rule-title">国家计税规则</h3>
              <p>按国家/地区配置计税模式和开票服务，同一国家仅保留一条规则。</p>
            </div>
            <button type="button" @click="openTaxRuleEditor()">
              <span aria-hidden="true">+</span>添加计税规则
            </button>
          </header>
          <div v-if="activeTaxRules.length" class="user-fee-rule-list tax-rule-list">
            <div class="user-fee-rule-list__header tax-rule-list__header" aria-hidden="true">
              <span>国家/地区</span><span>计税模式</span><span>开票服务</span><span>操作</span>
            </div>
            <article v-for="rule in activeTaxRules" :key="rule.id" class="user-fee-rule-row tax-rule-row">
              <div class="user-fee-rule-market">
                <strong>{{ rule.country }}</strong>
                <small>计税国家/地区</small>
              </div>
              <strong>{{ taxCalculationModeLabel(rule.calculationMode) }}</strong>
              <span>{{ rule.invoicingEnabled ? '开通' : '不开通' }}</span>
              <div class="user-fee-rule-actions">
                <button type="button" aria-label="编辑计税规则" title="编辑" @click="openTaxRuleEditor(rule)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10-10a2 2 0 0 0-2.8-2.8l-10 10L4 20Z"/><path d="m13.9 7.7 2.8 2.8"/></svg>
                </button>
                <button type="button" aria-label="删除计税规则" title="删除" @click="removeTaxRule(rule.id)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13"/></svg>
                </button>
              </div>
            </article>
          </div>
          <div v-else class="user-fee-rule-empty">
            <strong>暂未配置计税规则</strong>
            <span>点击“添加计税规则”，按国家设置计税模式和开票服务。</span>
          </div>
        </section>

        <div v-if="activeModuleContentVisible && activeStage === 'taxCalculation' && showTaxRuleEditor" class="user-fee-rule-layer" role="presentation" @click.self="closeTaxRuleEditor">
          <section class="user-fee-rule-dialog tax-rule-dialog" role="dialog" aria-modal="true" aria-labelledby="tax-rule-dialog-title">
            <header>
              <div>
                <h3 id="tax-rule-dialog-title">{{ editingTaxRuleId ? '编辑计税规则' : '添加计税规则' }}</h3>
                <p>配置该国家/地区对应的计税和开票要求。</p>
              </div>
              <button type="button" aria-label="关闭计税规则编辑" title="关闭" @click="closeTaxRuleEditor">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
              </button>
            </header>
            <div class="user-fee-rule-dialog__body">
              <label class="intake-field">
                <span>计税国家/地区 <i>*</i></span>
                <select v-model="taxRuleEditor.country">
                  <option value="Default">Default</option>
                  <option v-for="market in marketOptions.filter((item) => item !== 'All')" :key="market" :value="market">{{ market }}</option>
                </select>
              </label>
              <div class="user-fee-mode-field tax-rule-option-field">
                <span>计税模式 <i>*</i></span>
                <div role="radiogroup" aria-label="选择计税模式">
                  <button
                    v-for="option in taxCalculationModeOptions"
                    :key="option.value"
                    type="button"
                    role="radio"
                    :aria-checked="taxRuleEditor.calculationMode === option.value"
                    :class="{ 'is-active': taxRuleEditor.calculationMode === option.value }"
                    @click="taxRuleEditor.calculationMode = option.value"
                  >
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.description }}</small>
                  </button>
                </div>
              </div>
              <div class="user-fee-mode-field tax-rule-option-field">
                <span>开票服务 <i>*</i></span>
                <div role="radiogroup" aria-label="选择是否开通开票服务">
                  <button type="button" role="radio" :aria-checked="taxRuleEditor.invoicingEnabled" :class="{ 'is-active': taxRuleEditor.invoicingEnabled }" @click="taxRuleEditor.invoicingEnabled = true">
                    <strong>开通</strong><small>需要提供开票服务</small>
                  </button>
                  <button type="button" role="radio" :aria-checked="!taxRuleEditor.invoicingEnabled" :class="{ 'is-active': !taxRuleEditor.invoicingEnabled }" @click="taxRuleEditor.invoicingEnabled = false">
                    <strong>不开通</strong><small>本次不接入开票服务</small>
                  </button>
                </div>
              </div>
              <p v-if="duplicateTaxRule" class="payment-method-editor__error">
                {{ taxRuleEditor.country }} 已存在计税规则，请编辑原记录或选择其他国家/地区。
              </p>
            </div>
            <footer>
              <button class="intake-button intake-button--secondary" type="button" @click="closeTaxRuleEditor">取消</button>
              <button class="intake-button intake-button--primary" type="button" :disabled="!taxRuleEditorValid" @click="saveTaxRule">保存规则</button>
            </footer>
          </section>
        </div>

        <section v-if="activeModuleContentVisible && activeStage === 'userFee'" class="user-fee-rule-panel" aria-labelledby="user-fee-rule-title">
          <header class="user-fee-rule-heading">
            <div>
              <h3 id="user-fee-rule-title">支付方式手续费规则</h3>
              <p>按支付方式和国家配置向用户收取的手续费，同一支付方式在同一国家仅保留一条规则。</p>
            </div>
            <button type="button" :disabled="!canAddUserFeeRule" @click="startUserFeeRuleCreation">
              <span aria-hidden="true">+</span>添加手续费规则
            </button>
          </header>
          <div v-if="activeUserFeeRules.length" class="user-fee-rule-list">
            <div class="user-fee-rule-list__header" aria-hidden="true">
              <span>支付方式</span><span>国家/币种</span><span>计费方式</span><span>手续费规则</span><span>操作</span>
            </div>
            <article v-for="rule in activeUserFeeRules" :key="rule.id" class="user-fee-rule-row">
              <div>
                <strong>{{ userFeePaymentMethodName(rule.paymentMethodId) }}</strong>
                <small>{{ userFeePaymentMethodTypeLabel(rule.paymentMethodId) }}</small>
              </div>
              <div class="user-fee-rule-market">
                <strong>{{ rule.country }}</strong>
                <small>{{ rule.currency }}</small>
              </div>
              <span>{{ rule.calculationMode === 'percentage' ? '按比例' : '固定金额' }}</span>
              <strong>{{ userFeeRuleSummary(rule) }}</strong>
              <div class="user-fee-rule-actions">
                <button type="button" aria-label="编辑手续费规则" title="编辑" @click="openUserFeeRuleEditor(rule)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10-10a2 2 0 0 0-2.8-2.8l-10 10L4 20Z"/><path d="m13.9 7.7 2.8 2.8"/></svg>
                </button>
                <button type="button" aria-label="删除手续费规则" title="删除" @click="removeUserFeeRule(rule.id)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13"/></svg>
                </button>
              </div>
            </article>
          </div>
          <div v-else class="user-fee-rule-empty">
            <strong>暂未配置手续费规则</strong>
            <span>直接选择支付方式、国家和币种，再设置对应的计费规则。</span>
          </div>
        </section>

        <div v-if="activeModuleContentVisible && activeStage === 'userFee' && showUserFeeRuleEditor" class="user-fee-rule-layer" role="presentation" @click.self="closeUserFeeRuleEditor">
          <section class="user-fee-rule-dialog" role="dialog" aria-modal="true" aria-labelledby="user-fee-rule-dialog-title">
            <header>
              <div>
                <h3 id="user-fee-rule-dialog-title">{{ editingUserFeeRuleId ? '编辑手续费规则' : '添加手续费规则' }}</h3>
                <p>设置所选支付方式对应的国家、币种和用户手续费。</p>
              </div>
              <button type="button" aria-label="关闭手续费规则编辑" title="关闭" @click="closeUserFeeRuleEditor">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
              </button>
            </header>
            <div v-if="userFeeEditorPaymentMethod" class="payment-method-config__summary user-fee-rule-method-summary">
              <span class="payment-method-config__mark" :style="{ '--payment-accent': userFeeEditorPaymentMethod.accent }">{{ userFeeEditorPaymentMethod.initial }}</span>
              <div>
                <strong>{{ userFeeEditorPaymentMethod.name }}</strong>
                <small>{{ paymentMethodTypeLabels[paymentMethodCategory(userFeeEditorPaymentMethod)] }}</small>
              </div>
              <button type="button" @click="returnToUserFeePaymentMethodPicker">重新选择</button>
            </div>
            <div class="user-fee-rule-dialog__body">
              <div class="user-fee-rule-scope">
                <label class="intake-field">
                  <span>国家/地区 <i>*</i></span>
                  <select :value="userFeeRuleEditor.country" @change="updateUserFeeRuleCountry(($event.target as HTMLSelectElement).value as UserFeeRule['country'])">
                    <option v-for="market in marketOptions.filter((item) => item !== 'All')" :key="market" :value="market">{{ market }}</option>
                  </select>
                </label>
                <label class="intake-field">
                  <span>币种 <i>*</i></span>
                  <select v-model="userFeeRuleEditor.currency">
                    <option v-for="currency in userFeeRuleCurrencyOptions" :key="currency" :value="currency">{{ currency }}</option>
                  </select>
                </label>
              </div>
              <div class="user-fee-mode-field">
                <span>计费方式 <i>*</i></span>
                <div role="radiogroup" aria-label="选择手续费计费方式">
                  <button
                    v-for="option in userFeeCalculationModeOptions"
                    :key="option.value"
                    type="button"
                    role="radio"
                    :aria-checked="userFeeRuleEditor.calculationMode === option.value"
                    :class="{ 'is-active': userFeeRuleEditor.calculationMode === option.value }"
                    @click="userFeeRuleEditor.calculationMode = option.value"
                  >{{ option.label }}</button>
                </div>
              </div>
              <label v-if="userFeeRuleEditor.calculationMode === 'percentage'" class="intake-field">
                <span>手续费比例 <i>*</i></span>
                <div class="user-fee-input-with-unit">
                  <input v-model="userFeeRuleEditor.percentageRate" type="text" inputmode="decimal" placeholder="例如 1.5" />
                  <em>%</em>
                </div>
                <small>请输入大于 0 且不超过 100 的比例</small>
              </label>
              <label v-else class="intake-field">
                <span>固定金额 <i>*</i></span>
                <div class="user-fee-input-with-unit">
                  <input v-model="userFeeRuleEditor.fixedAmount" type="text" inputmode="decimal" placeholder="请输入金额" />
                  <em>{{ userFeeRuleEditor.currency }}</em>
                </div>
              </label>
              <p v-if="duplicateUserFeeRule" class="payment-method-editor__error">
                该支付方式在 {{ userFeeRuleEditor.country }} 已存在手续费规则，请编辑原记录或选择其他国家/地区。
              </p>
            </div>
            <footer>
              <button class="intake-button intake-button--secondary" type="button" @click="closeUserFeeRuleEditor">取消</button>
              <button class="intake-button intake-button--primary" type="button" :disabled="!userFeeRuleEditorValid" @click="saveUserFeeRule">保存规则</button>
            </footer>
          </section>
        </div>

        <div v-if="activeModuleContentVisible && activeStage !== 'userFee' && activeStage !== 'taxCalculation' && groupedCatalog.length" class="capability-picker-groups">
          <section v-for="group in groupedCatalog" :key="group.name" class="capability-picker-group">
            <div class="capability-picker-group__heading">
              <h3>{{ group.name }}</h3>
              <span>{{ group.items.length }} 项</span>
            </div>
            <div
              class="capability-picker-grid"
              :class="{ 'capability-picker-grid--methods': group.name === '支付方式' }"
              :role="group.items.some((item) => isExclusiveCapability(item)) ? 'radiogroup' : undefined"
              :aria-label="group.items.some((item) => isExclusiveCapability(item)) ? group.name : undefined"
            >
              <button
                v-for="item in group.items"
                :key="item.id"
                class="capability-picker-card"
                :class="[
                  {
                    'is-active': isSelected(item.id),
                    'is-coming-soon': item.comingSoon,
                    'is-required': isDefaultCapability(item.id)
                  },
                  `is-${item.status}`
                ]"
                type="button"
                :role="isExclusiveCapability(item) ? 'radio' : undefined"
                :disabled="item.comingSoon || isDefaultCapability(item.id)"
                :aria-pressed="isExclusiveCapability(item) ? undefined : isSelected(item.id)"
                :aria-checked="isExclusiveCapability(item) ? isSelected(item.id) : undefined"
                @click="toggleCapability(item)"
              >
                <span v-if="item.initial" class="capability-picker-mark" :style="{ '--picker-accent': item.accent }">{{ item.initial }}</span>
                <span class="capability-picker-copy">
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.description }}</small>
                </span>
                <span class="capability-picker-meta">
                  <em v-if="item.comingSoon" class="capability-coming-soon">Coming soon</em>
                  <em v-else-if="isDefaultCapability(item.id)" class="capability-required-badge">默认</em>
                  <em v-else-if="item.status !== 'standard'" :class="`intake-status intake-status--${item.status}`">{{ supportStatusLabel[item.status] }}</em>
                  <i
                    v-if="!item.comingSoon && !isDefaultCapability(item.id)"
                    :class="isExclusiveCapability(item) ? 'capability-radio' : 'capability-check'"
                    aria-hidden="true"
                  ></i>
                </span>
              </button>
            </div>
            <div v-if="activeStage === 'settlement' && group.name === '结算模式'" class="settlement-cycle-block">
              <div class="settlement-config-label">
                <strong>结算周期</strong>
                <span>D 为自然日，T 为交易日</span>
              </div>
              <div class="settlement-cycle-editor">
                <div class="settlement-cycle-basis" role="radiogroup" aria-label="结算周期基准">
                  <button
                    v-for="option in settlementCycleBasisOptions"
                    :key="option.value"
                    type="button"
                    role="radio"
                    :aria-checked="draft.settlementCycleBasis === option.value"
                    :class="{ 'is-active': draft.settlementCycleBasis === option.value }"
                    @click="draft.settlementCycleBasis = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
                <span class="settlement-cycle-plus">+</span>
                <label class="settlement-cycle-days">
                  <input
                    :value="draft.settlementCycleDays"
                    type="number"
                    min="0"
                    max="90"
                    step="1"
                    aria-label="结算天数"
                    @input="updateSettlementCycleDays"
                  />
                  <span>天</span>
                </label>
              </div>
            </div>
          </section>
        </div>
        <div v-else-if="activeModuleContentVisible && activeStage !== 'userFee' && activeStage !== 'taxCalculation'" class="capability-picker-empty">没有符合当前筛选条件的能力。</div>
        <p
          v-if="activeStage === 'userFee' && activeModuleAction && !activeUserFeeRules.length"
          class="intake-validation capability-plan-validation"
        >请至少添加一条支付方式手续费规则。</p>
        <p
          v-else-if="activeStage === 'taxCalculation' && activeModuleAction && !activeTaxRules.length"
          class="intake-validation capability-plan-validation"
        >请至少添加一条国家计税规则。</p>
        <p v-else-if="!stepTwoValid" class="intake-validation capability-plan-validation">
          还有 {{ draft.capabilityPlans.filter((plan) => !plan.configured).length }} 套“商户号 × 产品”能力方案待配置，请逐一打开产品标签后继续。
        </p>
      </section>

      <section v-else class="intake-step-content">
        <div class="intake-section-heading review-page-heading">
          <div>
            <span>STEP 3</span>
            <h2>结构化需求评估单</h2>
          </div>
          <div class="review-heading-actions">
            <span v-if="copyFeedback" class="review-copy-feedback">{{ copyFeedback }}</span>
            <button class="intake-button intake-button--secondary" type="button" @click="copyStructuredRequirement">
              复制需求清单
            </button>
          </div>
        </div>

        <section class="review-scope-bar">
          <div class="review-scope-summary">
            <span>业务与商户摘要</span>
            <strong>{{ requestProductsDisplayName }}</strong>
            <small>{{ businessModeDisplayName }} · {{ businessDisplayName }}</small>
          </div>
          <div class="review-scope-merchants">
            <span>商户号</span>
            <div class="review-merchant-switcher" role="radiogroup" aria-label="选择商户号能力方案">
              <button
                v-for="(merchant, merchantIndex) in reviewMerchants"
                :key="merchant.subject.id"
                type="button"
                role="radio"
                :aria-label="`商户号 ${merchantIndex + 1}：${merchantAccountLabel(merchant.subject)}`"
                :aria-checked="activeReviewMerchant?.subject.id === merchant.subject.id"
                :class="{ 'is-active': activeReviewMerchant?.subject.id === merchant.subject.id }"
                @click="activeReviewMerchantId = merchant.subject.id"
              >
                <strong>{{ merchantAccountLabel(merchant.subject) }}</strong>
                <small>{{ merchant.subject.accountMode === 'existing' ? '已有商户号' : merchant.subject.subjectName }}</small>
              </button>
            </div>
          </div>
        </section>

        <section class="review-merchant-plans">
          <div v-if="reviewDimensionCards.length" class="review-dimension-grid">
            <details
              v-for="card in reviewDimensionCards"
              :key="card.id"
              class="review-dimension-card"
              open
            >
              <summary>
                <div>
                  <strong>{{ card.title }}</strong>
                  <span v-if="card.action" :class="`review-module-action is-${card.action}`">
                    {{ moduleActionLabel(card.action) }}
                  </span>
                </div>
                <i aria-hidden="true"></i>
              </summary>
              <div class="review-dimension-body">
                <section class="review-dimension-overview">
                  <div
                    v-for="row in reviewDimensionCardRows(card)"
                    :key="row.id"
                    :class="{ 'is-full-width': row.fullWidth }"
                  >
                    <strong>{{ row.label }}</strong>
                    <span>{{ row.value }}</span>
                  </div>
                </section>
                <section
                  v-for="group in card.groups.filter((item) => item.name === '支付方式')"
                  :key="group.name"
                  class="is-payment-group"
                >
                  <template v-if="group.name === '支付方式'">
                    <div class="review-dimension-group-heading">
                      <h4>支付方式与渠道要求</h4>
                      <span>{{ group.items.length }} 种支付方式</span>
                    </div>
                    <div class="review-payment-requirements">
                      <article v-for="item in group.items" :key="item.id">
                        <header>
                          <div class="review-payment-name">
                            <span aria-hidden="true"></span>
                            <strong>{{ item.name }}</strong>
                          </div>
                          <em>{{ item.channels?.length || 0 }} 个渠道</em>
                        </header>
                        <dl class="review-payment-metadata">
                          <div v-for="meta in item.metadata" :key="meta.label">
                            <dt>{{ meta.label }}</dt><dd>{{ meta.value }}</dd>
                          </div>
                        </dl>
                        <section class="review-channel-requirements">
                          <div class="review-channel-requirements__head">
                            <span>渠道名称</span>
                            <span>账号模式</span>
                            <span>渠道账号</span>
                            <span>Merchant Descriptor</span>
                            <span>单笔限额</span>
                            <span>验证金额</span>
                          </div>
                          <div v-for="channel in item.channels" :key="channel.id" class="review-channel-requirements__row">
                            <strong data-label="渠道名称">{{ channel.name }}</strong>
                            <span data-label="账号模式">{{ channel.accountMode }}</span>
                            <span data-label="渠道账号">{{ channel.channelAccount }}</span>
                            <span data-label="Merchant Descriptor">{{ channel.merchantDescriptor }}</span>
                            <span data-label="单笔限额">{{ channel.paymentLimit }}</span>
                            <span data-label="验证金额">{{ channel.verificationAmount }}</span>
                          </div>
                        </section>
                        <div v-if="item.routingRequirement" class="review-channel-routing">
                          <strong>路由要求</strong><span>{{ item.routingRequirement }}</span>
                        </div>
                      </article>
                    </div>
                  </template>
                  <div v-else class="review-dimension-text-rows">
                    <div v-for="row in reviewDimensionRows(group)" :key="row.id">
                      <strong>{{ row.label }}</strong>
                      <span>{{ row.value }}</span>
                    </div>
                  </div>
                </section>
              </div>
            </details>
          </div>
          <div v-else class="review-empty">该商户号暂无已配置的能力方案。</div>
        </section>
      </section>

      <footer class="intake-action-bar" :class="{ 'is-review-action-bar': draft.currentStep === 3 }">
        <div class="intake-action-bar__status">
          <span>步骤 {{ draft.currentStep }} / 3</span>
          <em v-if="draft.currentStep === 3 && (markdownDocumentFeedback || larkDocumentFeedback || requestPersistenceError)" role="status">
            {{ requestPersistenceError || markdownDocumentFeedback || larkDocumentFeedback }}
          </em>
        </div>
        <div>
          <button
            v-if="draft.currentStep === 3"
            class="intake-button intake-button--markdown"
            type="button"
            @click="downloadStructuredRequirementMarkdown"
          >
            <span aria-hidden="true" v-html="iconSvg.download"></span>
            下载 Markdown
          </button>
          <button
            v-if="draft.currentStep === 3"
            class="intake-button intake-button--lark"
            type="button"
            :disabled="isCreatingLarkDocument"
            @click="createOrOpenLarkDocument"
          >
            <span aria-hidden="true" v-html="iconSvg.intake"></span>
            {{ isCreatingLarkDocument ? '正在生成...' : larkDocumentIsCurrent ? '打开飞书文档' : '生成飞书文档' }}
          </button>
          <button v-if="draft.currentStep > 1" class="intake-button intake-button--secondary" type="button" @click="previousStep">
            {{ draft.currentStep === 3 ? '返回修改' : '上一步' }}
          </button>
          <button
            v-if="draft.currentStep < 3"
            class="intake-button intake-button--primary"
            type="button"
            :disabled="!currentStepValid"
            @click="nextStep"
          >下一步</button>
          <button
            v-else
            class="intake-button intake-button--primary"
            type="button"
            :disabled="isSubmittingRequest || isSavingRequest"
            @click="submitRequest"
          >{{ isSubmittingRequest ? '正在提交...' : '提交审批' }}</button>
        </div>
      </footer>
    </template>

    <div v-if="showRequestLogin" class="request-login-layer" role="presentation" @click.self="closeRequestLogin">
      <section class="request-login-dialog" role="dialog" aria-modal="true" aria-labelledby="request-login-title">
        <header>
          <div>
            <span class="request-login-dialog__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </span>
            <div>
              <h2 id="request-login-title">登录敏捷接入提需</h2>
              <p>登录后可保存草稿、查看需求记录并发起审批。</p>
            </div>
          </div>
          <button type="button" aria-label="关闭登录弹窗" @click="closeRequestLogin">×</button>
        </header>
        <div class="request-login-dialog__body">
          <label>
            <span>邮箱</span>
            <input v-model="requestLoginEmail" type="email" autocomplete="username" placeholder="name@example.com" @keyup.enter="loginRequestAccount" />
          </label>
          <label>
            <span>密码</span>
            <span class="request-login-password">
              <input v-model="requestLoginPassword" :type="showRequestLoginPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="请输入密码" @keyup.enter="loginRequestAccount" />
              <button type="button" @click="showRequestLoginPassword = !showRequestLoginPassword">{{ showRequestLoginPassword ? '隐藏' : '显示' }}</button>
            </span>
          </label>
          <p v-if="requestLoginError" class="request-login-error" role="alert">{{ requestLoginError }}</p>
        </div>
        <footer>
          <button class="intake-button intake-button--secondary" type="button" @click="closeRequestLogin">取消</button>
          <button
            class="intake-button intake-button--primary"
            type="button"
            :disabled="isRequestLoggingIn || !requestLoginEmail.trim() || !requestLoginPassword"
            @click="loginRequestAccount"
          >{{ isRequestLoggingIn ? '登录中...' : '登录' }}</button>
        </footer>
      </section>
    </div>

  </main>
</template>

<style scoped>
.intake-shell{--blue:#1267f1;--blue-soft:#eef5ff;--text:#172033;--muted:#68768d;--border:#d8e0ec;--border-soft:#e8edf5;--surface:#fff;--soft:#f8faff;--green:#27833e;--green-bg:#eaf7ed;--orange:#df820b;--orange-bg:#fff3df;--gray:#7b8797;--gray-bg:#eef2f6;min-height:100vh;padding:0 32px 32px;color:var(--text)}
button,select,input{font:inherit}.intake-header{display:flex;align-items:center;justify-content:space-between;min-height:70px;margin:0 -32px;border-bottom:1px solid var(--border-soft);padding:10px 32px;background:rgba(255,255,255,.98)}.intake-title{display:flex;align-items:center;gap:11px}.intake-title__icon{display:grid;width:32px;height:32px;place-items:center;border-radius:8px;background:var(--blue-soft);color:var(--blue)}.intake-title__icon :deep(svg){width:20px;height:20px}.intake-title h1,.intake-title p{margin:0}.intake-title h1{font-size:18px;line-height:1.35}.intake-title p{margin-top:2px;color:var(--muted);font-size:12px}.intake-header-actions{display:flex;align-items:center;gap:8px}.intake-header-button{height:32px;border:1px solid var(--border);border-radius:6px;padding:0 12px;background:#fff;color:#42516a;font-size:11px;font-weight:800}.intake-header-button:hover{border-color:#aac4ec;color:var(--blue)}.intake-header-button--primary{border-color:var(--blue);background:var(--blue);color:#fff}.intake-header-button--primary:hover{border-color:#0c58d6;background:#0c58d6;color:#fff}.intake-header-button:disabled{cursor:not-allowed;opacity:.5}.draft-state{display:flex;align-items:center;max-width:180px;gap:7px;border:1px solid var(--border);border-radius:999px;padding:5px 10px;color:var(--muted);font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.draft-state i{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#53a36a}.request-persistence-notice{width:min(1440px,100%);margin:10px auto -6px;border:1px solid #cfe5d4;border-radius:6px;padding:8px 11px;background:#f2fbf4;color:#28713c;font-size:11px;font-weight:700}.request-persistence-notice.is-error{border-color:#f2cccc;background:#fff6f6;color:#a54141}
.intake-request-list-page{min-height:calc(100vh - 32px)}.intake-request-list-header{display:flex;align-items:center;justify-content:space-between;min-height:78px;margin:0 -32px;border-bottom:1px solid var(--border-soft);padding:12px 32px;background:#fff}.intake-request-list-content{width:min(1440px,100%);margin:22px auto}.local-draft-callout{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:12px;border:1px solid #c7daf8;border-radius:8px;padding:12px 14px;background:#f3f7fe}.local-draft-callout>div{display:grid;gap:2px}.local-draft-callout span{color:var(--blue);font-size:9px;font-weight:850}.local-draft-callout strong{font-size:13px}.local-draft-callout small{color:var(--muted);font-size:10px}.local-draft-callout button,.intake-request-list-card__heading button{height:30px;border:1px solid #b9cff1;border-radius:6px;padding:0 11px;background:#fff;color:var(--blue);font-size:10px;font-weight:800}.intake-request-list-card{overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04)}.intake-request-list-card__heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px}.intake-request-list-card__heading h2,.intake-request-list-card__heading p{margin:0}.intake-request-list-card__heading h2{font-size:15px}.intake-request-list-card__heading p{margin-top:3px;color:var(--muted);font-size:10px}.intake-request-table{border-top:1px solid var(--border-soft)}.intake-request-table__header,.intake-request-table__row{display:grid;grid-template-columns:minmax(165px,1fr) minmax(180px,1.2fr) minmax(170px,1fr) 110px 120px 88px;align-items:center;gap:14px;padding:0 18px}.intake-request-table__header{min-height:38px;background:#f7f9fc;color:#66758b;font-size:10px;font-weight:800}.intake-request-table__row{min-height:68px;border-top:1px solid var(--border-soft);font-size:11px}.intake-request-table__header+.intake-request-table__row{border-top:0}.intake-request-table__row>strong{color:#305f9f;font-size:10px}.intake-request-table__row>div:nth-child(2){display:grid;min-width:0;gap:3px}.intake-request-table__row b{overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.intake-request-table__row small{display:-webkit-box;overflow:hidden;color:#a54141;font-size:9px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:1}.intake-request-table__row>span{color:#59677b}.intake-request-table__actions button{height:28px;border:1px solid #bed3f5;border-radius:6px;padding:0 9px;background:#fff;color:var(--blue);font-size:10px;font-weight:800}.intake-request-table__actions>span{color:var(--muted);font-size:10px}.intake-request-table .request-record-empty{margin:14px}
.request-auth-empty{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:14px;min-height:126px;padding:24px 28px}.request-auth-empty__icon,.request-login-dialog__icon{display:grid;width:40px;height:40px;place-items:center;border-radius:8px;background:var(--blue-soft);color:var(--blue)}.request-auth-empty__icon svg,.request-login-dialog__icon svg{width:22px;height:22px}.request-auth-empty>div{display:grid;gap:4px}.request-auth-empty strong{font-size:14px}.request-auth-empty p{margin:0;color:var(--muted);font-size:11px;line-height:1.55}.request-auth-empty>.intake-button{min-width:82px}
.request-login-layer{position:fixed;z-index:110;inset:0;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.38);backdrop-filter:blur(3px)}.request-login-dialog{overflow:hidden;width:min(440px,100%);border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 24px 70px rgba(15,23,42,.22)}.request-login-dialog>header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid var(--border-soft);padding:20px 22px}.request-login-dialog>header>div{display:flex;align-items:center;gap:12px}.request-login-dialog h2,.request-login-dialog p{margin:0}.request-login-dialog h2{font-size:17px}.request-login-dialog header p{margin-top:3px;color:var(--muted);font-size:10px;line-height:1.5}.request-login-dialog>header>button{display:grid;width:28px;height:28px;flex:0 0 auto;place-items:center;border:0;border-radius:5px;background:transparent;color:#778499;font-size:22px;line-height:1}.request-login-dialog>header>button:hover{background:var(--gray-bg);color:var(--text)}.request-login-dialog__body{display:grid;gap:14px;padding:20px 22px}.request-login-dialog__body>label{display:grid;gap:6px}.request-login-dialog__body>label>span:first-child{color:#526178;font-size:10px;font-weight:800}.request-login-dialog input{width:100%;height:38px;border:1px solid var(--border);border-radius:6px;padding:0 11px;background:#fff;color:var(--text);font-size:12px;outline:none}.request-login-dialog input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(18,103,241,.1)}.request-login-password{position:relative;display:block}.request-login-password input{padding-right:54px}.request-login-password button{position:absolute;top:50%;right:8px;border:0;background:transparent;color:var(--blue);font-size:10px;font-weight:800;transform:translateY(-50%)}.request-login-error{margin:0;border-radius:5px;padding:8px 10px;background:#fff1f1;color:#a54141;font-size:10px;line-height:1.45}.request-login-dialog>footer{display:flex;justify-content:flex-end;gap:9px;border-top:1px solid var(--border-soft);padding:13px 22px;background:#fafbfd}
.intake-steps{display:flex;align-items:center;width:min(820px,100%);margin:22px auto 20px}.intake-step{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#8793a5}.intake-step>span{display:grid;width:27px;height:27px;place-items:center;border:1px solid #cdd5e2;border-radius:50%;background:#fff;font-size:12px;font-weight:800}.intake-step strong{font-size:13px;white-space:nowrap}.intake-step.is-active{color:var(--blue)}.intake-step.is-active>span{border-color:var(--blue);background:var(--blue);color:#fff}.intake-step.is-complete{color:#4774bd}.intake-step.is-complete>span{border-color:#8bb1ef;background:var(--blue-soft);color:var(--blue)}.intake-step-line{height:1px;flex:1;margin:0 8px;background:#dbe2ec}.intake-step-line.is-complete{background:#8bb1ef}
.intake-step-content{width:min(1440px,100%);margin:0 auto}.intake-step-content--narrow{width:min(1040px,100%)}.intake-section-heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:14px}.intake-section-heading>div>span{color:var(--blue);font-size:10px;font-weight:850}.intake-section-heading h2{margin:3px 0 0;font-size:18px;letter-spacing:0}.intake-section-heading>p{margin:0;color:var(--muted);font-size:12px}
.intake-choice-section{border:1px solid var(--border);border-radius:8px;padding:16px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04)}.intake-choice-section--types{margin-top:14px}.intake-choice-heading{display:flex;align-items:center;gap:10px;margin-bottom:13px}.intake-choice-heading>span{display:grid;width:24px;height:24px;flex:0 0 auto;place-items:center;border-radius:7px;background:var(--blue-soft);color:var(--blue);font-size:11px;font-weight:850}.intake-choice-heading h3,.intake-choice-heading p{margin:0}.intake-choice-heading h3{font-size:14px}.intake-choice-heading p{margin-top:2px;color:var(--muted);font-size:10px}.business-type-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.business-type-card{display:grid;grid-template-columns:44px minmax(0,1fr) max-content;align-items:center;gap:12px;min-height:88px;border:1px solid var(--border);border-radius:8px;padding:14px 16px;background:var(--soft);color:var(--text);text-align:left;transition:border-color 140ms cubic-bezier(.23,1,.32,1),background-color 140ms cubic-bezier(.23,1,.32,1),transform 120ms cubic-bezier(.23,1,.32,1)}.business-type-card:active{transform:scale(.985)}.business-type-card.is-active{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.18)}.business-type-card.is-coming-soon{border-color:#e1e6ee;background:#f3f5f8;color:#8994a5;cursor:not-allowed;opacity:1}.business-type-card.is-coming-soon:active{transform:none}.business-type-icon{display:grid;width:44px;height:44px;place-items:center;border-radius:10px;background:#fff;color:#718096;box-shadow:0 1px 4px rgba(15,23,42,.08)}.business-type-icon :deep(svg){width:24px;height:24px}.business-type-card.is-active .business-type-icon{color:var(--blue)}.business-type-card.is-coming-soon .business-type-icon{background:#e8ecf2;color:#9aa4b3;box-shadow:none}.business-type-copy{display:grid;grid-template-columns:max-content max-content;align-items:baseline;gap:2px 7px;min-width:0}.business-type-copy strong{font-size:16px}.business-type-copy em{color:#8a97aa;font-size:10px;font-style:normal;font-weight:750}.business-type-copy small{grid-column:1/-1;color:var(--muted);font-size:11px;line-height:1.45}.business-type-card.is-coming-soon .business-type-copy em,.business-type-card.is-coming-soon .business-type-copy small{color:#98a2b1}.business-type-radio{width:18px;height:18px;border:2px solid #aeb9c9;border-radius:50%;background:#fff}.business-type-card.is-active .business-type-radio{border:5px solid var(--blue)}.business-type-coming-soon{border:1px solid #d8dee8;border-radius:999px;padding:4px 9px;background:#fff;color:#7e8999;font-size:9px;font-weight:800;line-height:1;white-space:nowrap}
.intake-type-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.intake-type-card{position:relative;display:grid;justify-items:center;min-width:0;min-height:205px;border:1px solid var(--border);border-radius:8px;padding:18px 16px;background:#fff;color:var(--text);text-align:center;transition:.16s}.intake-type-card:hover{border-color:#a7c4f4}.intake-type-card.is-active{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.22)}.intake-level{position:absolute;top:14px;left:14px;border:1px solid var(--border);border-radius:4px;padding:2px 7px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:750}.intake-type-card.is-active .intake-level{border-color:#bfd5fa;background:#fff;color:var(--blue)}.intake-type-radio{position:absolute;top:15px;right:15px;width:18px;height:18px;border:2px solid #aeb9c9;border-radius:50%;background:#fff}.intake-type-card.is-active .intake-type-radio{border:5px solid var(--blue)}.intake-type-icon{display:grid;width:66px;height:66px;margin-top:20px;place-items:center;color:var(--blue)}.intake-type-icon :deep(svg){width:56px;height:56px}.intake-type-card>strong{font-size:17px}.intake-type-card>p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
.intake-form-panel,.merchant-subject-panel,.business-context-card,.base-integration-panel,.review-card{border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04)}.intake-form-panel{margin-top:14px;padding:16px}.intake-form-heading,.review-card-heading,.base-integration-heading{display:flex;align-items:center;justify-content:space-between}.intake-form-heading{margin-bottom:13px}.intake-form-heading h3,.review-card h3,.base-integration-heading h3{margin:0;font-size:14px}.intake-form-heading>span{color:var(--muted);font-size:11px}.intake-form-grid{display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:14px}.intake-field{display:grid;align-content:start;gap:6px;min-width:0;color:var(--text);font-size:12px;font-weight:750}.intake-field>span i{color:#d84c4c;font-style:normal}.intake-field input,.intake-field select{width:100%;height:38px;border:1px solid var(--border);border-radius:6px;padding:0 11px;background:#fff;color:var(--text);outline:none}.intake-field input:focus,.intake-field select:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(18,103,241,.1)}.intake-field input:read-only,.intake-field select:disabled{border-color:var(--border-soft);background:#f4f7fb;color:#59677b;opacity:1}.intake-field small{color:var(--muted);font-size:10px;font-weight:600}.intake-validation{margin:11px 0 0;color:#b45309;font-size:11px}
.business-mode-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));height:38px;border:1px solid var(--border);border-radius:6px;padding:3px;background:#f3f6fa}.business-mode-options button{min-width:0;border:0;border-radius:4px;background:transparent;color:#67758a;font-size:11px;font-weight:800;cursor:pointer}.business-mode-options button:hover{color:#2f5f9f}.business-mode-options button.is-active{background:#fff;color:var(--blue);box-shadow:0 1px 4px rgba(15,23,42,.12)}
.intake-field .intake-field-warning{color:#b45309;font-weight:700}
.intake-field--products{grid-column:auto}.existing-product-tags{display:flex;align-items:center;flex-wrap:wrap;min-height:38px;gap:7px;border:1px solid var(--border-soft);border-radius:6px;padding:6px 8px;background:#f7f9fc}.existing-product-tags>span{border:1px solid #cfe0fa;border-radius:999px;padding:3px 9px;background:#fff;color:var(--blue);font-size:10px;font-weight:800}
.merchant-subject-panel{margin-top:14px;padding:16px}.merchant-subject-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.merchant-subject-heading h3,.merchant-subject-heading p{margin:0}.merchant-subject-heading h3{font-size:14px}.merchant-subject-heading p{margin-top:3px;color:var(--muted);font-size:11px}.add-merchant-subject-button{display:flex;align-items:center;flex:0 0 auto;gap:5px;min-height:34px;border:1px solid var(--blue);border-radius:6px;padding:0 12px;background:#fff;color:var(--blue);font-size:11px;font-weight:800;transition:background-color 140ms cubic-bezier(.23,1,.32,1),transform 120ms cubic-bezier(.23,1,.32,1)}.add-merchant-subject-button:active{transform:scale(.97)}.add-merchant-subject-button span{font-size:16px}.merchant-subject-list{display:grid;gap:10px;margin-top:13px}.merchant-subject-card{overflow:hidden;border:1px solid var(--border);border-radius:8px;background:var(--soft)}.merchant-subject-card>header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border-soft);padding:10px 12px;background:#fff}.merchant-subject-card>header>div{display:flex;align-items:center;gap:9px;min-width:0}.merchant-subject-card>header>div>span{display:grid;width:24px;height:24px;flex:0 0 auto;place-items:center;border-radius:7px;background:var(--blue-soft);color:var(--blue);font-size:10px;font-weight:850}.merchant-subject-card>header>div>div{display:grid;min-width:0;gap:2px}.merchant-subject-card>header strong{font-size:12px}.merchant-subject-card>header small{overflow:hidden;color:var(--muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.merchant-subject-card>header>button{border:0;background:transparent;color:#a64a4a;font-size:10px;font-weight:750}.merchant-subject-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:12px}.merchant-subject-products{display:grid;gap:9px;border-top:1px solid var(--border-soft);padding:12px;background:#fff}.merchant-subject-products>div:first-child{display:flex;align-items:center;justify-content:space-between}.merchant-subject-products>div:first-child>span{font-size:12px;font-weight:750}.merchant-subject-products>div:first-child i{color:#d84c4c;font-style:normal}.merchant-subject-products>div:first-child small{color:var(--muted);font-size:9px;font-weight:750}.merchant-subject-products>p{margin:0;border:1px dashed var(--border);border-radius:6px;padding:12px;color:var(--muted);font-size:10px;text-align:center}.merchant-subject-product-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.merchant-subject-product-options button{display:grid;grid-template-columns:16px minmax(0,1fr);align-items:start;gap:2px 8px;min-height:54px;border:1px solid var(--border);border-radius:7px;padding:9px;background:var(--soft);color:var(--text);text-align:left;transition:border-color 140ms cubic-bezier(.23,1,.32,1),background-color 140ms cubic-bezier(.23,1,.32,1),transform 120ms cubic-bezier(.23,1,.32,1)}.merchant-subject-product-options button:active{transform:scale(.985)}.merchant-subject-product-options button.is-active{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.15)}.merchant-subject-product-options button>span{position:relative;grid-row:1/3;width:16px;height:16px;border:1.5px solid #aeb9c9;border-radius:4px;background:#fff}.merchant-subject-product-options button.is-active>span{border-color:var(--blue);background:var(--blue)}.merchant-subject-product-options button.is-active>span::after{content:'';position:absolute;left:4px;top:1px;width:5px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.merchant-subject-product-options strong{font-size:11px}.merchant-subject-product-options small{overflow:hidden;color:var(--muted);font-size:9px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.review-merchant-subjects{display:grid;gap:9px}.review-merchant-subjects>article{overflow:hidden;border:1px solid var(--border-soft);border-radius:7px}.review-merchant-subjects header{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--soft)}.review-merchant-subjects header span{display:grid;width:20px;height:20px;place-items:center;border-radius:6px;background:var(--blue-soft);color:var(--blue);font-size:9px;font-weight:850}.review-merchant-subjects header strong{font-size:11px}.review-merchant-subjects dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:0;background:var(--border-soft)}.review-merchant-subjects dl>div{min-width:0;padding:8px 10px;background:#fff}.review-merchant-subjects dt{color:var(--muted);font-size:9px}.review-merchant-subjects dd{overflow:hidden;margin:3px 0 0;font-size:11px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}
.business-context-card{display:grid;grid-template-columns:250px minmax(0,1fr);overflow:hidden}.business-context-summary{padding:24px;background:#f7faff}.business-context-summary>span{color:var(--blue);font-size:10px;font-weight:850}.business-context-summary>strong{display:block;margin-top:9px;font-size:18px}.business-context-summary>p{margin:6px 0 0;color:var(--muted);font-size:12px}.business-context-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:24px}.business-context-card>.intake-validation{grid-column:1/-1;margin:0;border-top:1px solid var(--border-soft);padding:10px 24px}.intake-segmented{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));height:38px;border:1px solid var(--border);border-radius:6px;overflow:hidden}.intake-segmented button{border:0;border-left:1px solid var(--border);background:#fff;color:var(--muted);font-size:12px;font-weight:750}.intake-segmented button:first-child{border-left:0}.intake-segmented button.is-active{background:var(--blue-soft);color:var(--blue)}.read-only-field{display:flex;align-items:center;justify-content:space-between;min-height:38px;border:1px solid var(--border-soft);border-radius:6px;padding:0 11px;background:#f7f9fc}.read-only-field small{font-size:10px}
.capability-stage-tabs{display:flex;gap:4px;margin-bottom:12px;border-bottom:1px solid var(--border)}.capability-stage-tabs button{display:flex;align-items:center;gap:7px;min-height:40px;border:0;border-bottom:2px solid transparent;padding:0 14px;background:transparent;color:var(--muted);font-size:13px;font-weight:800}.capability-stage-tabs button.is-active{border-bottom-color:var(--blue);color:var(--blue)}.capability-stage-tabs button span{min-width:20px;border-radius:999px;padding:1px 6px;background:var(--gray-bg);font-size:10px;text-align:center}.capability-stage-tabs button.is-active span{background:var(--blue-soft)}
.capability-stage-tabs button span.is-module-action{min-width:auto;padding:2px 7px;font-size:9px;white-space:nowrap}.capability-stage-tabs button span.is-new{background:#e9f2ff;color:#1769e8}.capability-stage-tabs button span.is-unchanged{background:#eef2f6;color:#748095}.capability-stage-tabs button span.is-changed{background:#fff1dc;color:#b86805}.capability-stage-tabs button span.is-pending{background:#fff7e8;color:#a86810}
.module-action-panel{overflow:hidden;margin-bottom:12px;border:1px solid #d5deeb;border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.035)}.module-action-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid var(--border-soft);padding:11px 14px;background:#fbfcff}.module-action-heading h3,.module-action-heading p{margin:0}.module-action-heading h3{font-size:13px}.module-action-heading p{margin-top:2px;color:var(--muted);font-size:10px}.module-action-heading>button{flex:0 0 auto;border:0;background:transparent;color:var(--blue);font-size:10px;font-weight:800}.module-action-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px 14px}.module-action-options>button{display:grid;grid-template-columns:16px minmax(0,1fr);align-items:center;gap:2px 8px;min-height:48px;border:1px solid var(--border);border-radius:7px;padding:8px 10px;background:#fff;color:var(--text);text-align:left}.module-action-options>button>span{position:relative;grid-row:1/3;width:16px;height:16px;border:1.5px solid #aeb9c9;border-radius:50%;background:#fff}.module-action-options>button strong{font-size:11px}.module-action-options>button small{color:var(--muted);font-size:9px;line-height:1.35}.module-action-options>button.is-active{border-color:#8db5f2;background:#f4f8ff;box-shadow:inset 0 0 0 1px rgba(18,103,241,.12)}.module-action-options>button.is-active>span{border:5px solid var(--blue)}.module-action-options>button.is-active.is-unchanged{border-color:#cbd4e1;background:#f7f9fc;box-shadow:none}.module-action-options>button.is-active.is-unchanged>span{border-color:#7e8a9b}.module-action-options>button.is-active.is-changed{border-color:#edbc74;background:#fffaf1;box-shadow:inset 0 0 0 1px rgba(220,128,10,.1)}.module-action-options>button.is-active.is-changed>span{border-color:#d77b08}.module-action-empty{display:grid;justify-items:center;gap:4px;margin-bottom:12px;border:1px dashed #cfd8e6;border-radius:8px;padding:24px;background:#fbfcfe;color:var(--muted)}.module-action-empty strong{color:#45536a;font-size:12px}.module-action-empty span{font-size:10px}.module-action-empty.is-unchanged{border-style:solid;background:#f8fafc}
.module-scope-panel{overflow:visible;margin-bottom:12px;border:1px solid #d5deeb;border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.035)}
.module-scope-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--border-soft);padding:11px 14px;background:#fbfcff}
.module-scope-heading h3,.module-scope-heading p{margin:0}.module-scope-heading h3{font-size:13px}.module-scope-heading p{margin-top:2px;color:var(--muted);font-size:10px}.module-scope-heading>span{color:#728097;font-size:10px;font-weight:750;white-space:nowrap}
.module-scope-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:12px 14px}
.module-scope-card{position:relative;display:grid;align-content:space-between;gap:10px;min-width:0;min-height:76px;border:1px solid #d9e1ec;border-radius:7px;padding:10px;background:#fff;color:var(--text);cursor:pointer;transition:border-color 140ms ease,background-color 140ms ease,box-shadow 140ms ease}
.module-scope-card:hover{border-color:#b8c8dd}.module-scope-card.is-active{border-color:var(--blue);background:#f7faff;box-shadow:inset 0 0 0 1px rgba(18,103,241,.14)}.module-scope-card.is-muted{border-style:dashed;background:#f8fafc;color:#7b8798}.module-scope-card.is-muted:hover{border-color:#9fb3cf;background:#f5f8fc}.module-scope-card.is-muted.is-editing{border-style:solid;border-color:#b8c8d9;background:#fff;color:var(--text);box-shadow:0 2px 8px rgba(15,23,42,.04)}
.module-scope-card__title{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}.module-scope-card__title strong{overflow:hidden;font-size:11px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.module-scope-card__title>button{display:grid;width:20px;height:20px;flex:0 0 auto;place-items:center;border:0;border-radius:4px;background:transparent;color:#9aa5b4;font-size:16px;line-height:1}.module-scope-card__title>button:hover{background:#eef2f7;color:#56657a}
.module-scope-action{display:block;min-width:0}.module-scope-action-trigger{display:flex;align-items:center;justify-content:space-between;width:100%;height:28px;border:1px solid #cad5e3;border-radius:5px;padding:0 8px;background:#f7f9fc;color:#526176;font-size:10px;font-weight:800;outline:none}.module-scope-action-trigger:focus{border-color:var(--blue);box-shadow:0 0 0 2px rgba(18,103,241,.1)}.module-scope-action-trigger i{width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-2px) rotate(45deg)}.module-scope-action.is-pending .module-scope-action-trigger{background:#fff;color:#68768d}.module-scope-action.is-businessFirstAccess .module-scope-action-trigger{border-color:#badfc5;background:#eef9f1;color:#24763a}.module-scope-action.is-merchantFirstAccess .module-scope-action-trigger{border-color:#b9ddd9;background:#eff9f8;color:#24776e}.module-scope-action.is-capabilityAdjustment .module-scope-action-trigger{border-color:#ebcf9e;background:#fff8eb;color:#a65f05}
.module-scope-menu{position:absolute;z-index:20;top:calc(100% - 4px);right:9px;left:9px;display:grid;gap:2px;border:1px solid #cfd8e5;border-radius:6px;padding:4px;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.16)}.module-scope-menu>button{min-height:30px;border:0;border-radius:4px;padding:0 8px;background:#fff;color:#344256;font-size:10px;font-weight:750;text-align:left}.module-scope-menu>button:hover,.module-scope-menu>button.is-selected{background:#eef5ff;color:var(--blue)}.module-scope-menu>button.is-not-involved{border-top:1px solid #edf1f6;border-radius:0;padding-top:2px;color:#78869a}.module-scope-menu>button.is-not-involved:hover{background:#f5f7fa;color:#4f5d70}
.module-scope-add{display:flex;align-items:center;justify-content:center;gap:4px;width:100%;height:28px;border:1px dashed #c8d2df;border-radius:5px;background:#fff;color:#66758a;font-size:10px;font-weight:800}.module-scope-add:hover{border-color:#8eadd7;color:var(--blue)}.module-scope-add span{font-size:14px;font-weight:500;line-height:1}
@media(max-width:1180px){.module-scope-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:760px){.module-scope-heading{align-items:flex-start}.module-scope-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px}.module-scope-card{min-height:72px}}
@media(max-width:440px){.module-scope-heading{flex-direction:column;gap:4px}.module-scope-grid{grid-template-columns:1fr}}
.capability-target-panel{margin-bottom:14px;border:1px solid #cfe0fa;border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04);overflow:hidden}.capability-target-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;background:#f7faff}.capability-target-heading h3,.capability-target-heading p{margin:0}.capability-target-heading h3{font-size:14px}.capability-target-heading p{margin-top:3px;color:var(--muted);font-size:11px}.capability-target-heading>span{flex:0 0 auto;border-radius:999px;padding:4px 9px;background:#fff;color:var(--blue);font-size:10px;font-weight:850}.capability-target-grid{padding:14px 16px}.capability-merchant-selector{display:grid;gap:8px}.capability-merchant-selector>div:first-child{display:flex;align-items:center;justify-content:space-between;gap:12px}.capability-merchant-selector>div:first-child>span{font-size:12px;font-weight:750}.capability-merchant-selector i{color:#d84c4c;font-style:normal}.capability-merchant-selector>div:first-child small{color:var(--muted);font-size:9px;font-weight:700}.capability-merchant-tags{display:flex;flex-wrap:wrap;gap:8px}.capability-merchant-tags button{display:grid;grid-template-columns:24px minmax(150px,max-content) auto;align-items:center;gap:2px 8px;min-height:50px;border:1px solid var(--border);border-radius:7px;padding:7px 9px;background:var(--soft);color:var(--text);text-align:left}.capability-merchant-tags button.is-active{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.16)}.capability-merchant-tags button>span{display:grid;grid-row:1/3;width:24px;height:24px;place-items:center;border-radius:6px;background:#fff;color:var(--blue);font-size:9px;font-weight:850}.capability-merchant-tags strong{overflow:hidden;max-width:250px;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.capability-merchant-tags small{overflow:hidden;max-width:250px;color:var(--muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.capability-merchant-tags em{grid-column:3;grid-row:1/3;border-radius:999px;padding:2px 7px;background:#fff3df;color:#a86207;font-size:9px;font-style:normal;font-weight:800}.capability-merchant-tags em.is-complete{background:var(--green-bg);color:var(--green)}.capability-plan-validation{margin-bottom:0;border:1px solid #f4d49f;border-radius:6px;padding:9px 11px;background:#fffaf0}
.base-integration-panel{margin-bottom:12px;overflow:hidden}.base-integration-heading{padding:13px 16px;background:#fbfcff}.base-integration-heading p{margin:3px 0 0;color:var(--muted);font-size:11px}.base-integration-heading>span{border-radius:999px;padding:3px 8px;background:var(--blue-soft);color:var(--blue);font-size:10px;font-weight:800}.base-integration-row{display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;border-top:1px solid var(--border-soft);padding:12px 16px}.base-integration-label{display:grid;align-content:center;gap:3px}.base-integration-label strong{font-size:13px}.base-integration-label span{color:var(--muted);font-size:10px}.base-integration-options{display:grid;gap:10px}.base-integration-options--two{grid-template-columns:repeat(2,minmax(0,1fr))}.base-integration-options--three{grid-template-columns:repeat(3,minmax(0,1fr))}.base-integration-options--currencies{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.base-integration-options button{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px;border:1px solid var(--border);border-radius:7px;padding:7px 10px;background:var(--soft);color:var(--text);text-align:left}.base-integration-options--currencies button{justify-content:center;min-height:36px;padding:6px 8px;text-align:center}.base-integration-options button.is-active{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.2)}.base-integration-options button.is-coming-soon{border-color:#e1e6ee;background:#f3f5f8;color:#8c97a7;cursor:not-allowed;opacity:1}.base-integration-options button.is-coming-soon>span small{color:#98a2b1}.base-integration-options button>span{display:grid;gap:2px}.base-integration-options strong{font-size:12px}.base-integration-options small{color:var(--muted);font-size:10px;line-height:1.35}.base-integration-coming-soon{border:1px solid #d8dee8;border-radius:999px;padding:4px 8px;background:#fff;color:#7e8999;font-size:9px;font-style:normal;font-weight:800;line-height:1;white-space:nowrap}
.base-integration-options--currencies button{position:relative}.pricing-currency-check{position:absolute;right:8px;width:13px;height:13px;border:1.5px solid #b3bfce;border-radius:3px;background:#fff}.base-integration-options--currencies button.is-active .pricing-currency-check{border-color:var(--blue);background:var(--blue)}.base-integration-options--currencies button.is-active .pricing-currency-check::after{content:'';position:absolute;left:3px;top:1px;width:4px;height:7px;border:solid #fff;border-width:0 1.5px 1.5px 0;transform:rotate(45deg)}
.currency-selection-panel{overflow:hidden;margin-bottom:12px;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04)}.currency-selection-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;background:#fbfcff}.currency-selection-heading h3,.currency-selection-heading p{margin:0}.currency-selection-heading h3{font-size:14px}.currency-selection-heading p{margin-top:3px;color:var(--muted);font-size:10px}.currency-selection-heading>span{border-radius:999px;padding:4px 9px;background:var(--blue-soft);color:var(--blue);font-size:10px;font-weight:850;white-space:nowrap}.currency-selection-body{border-top:1px solid var(--border-soft);padding:12px 16px}
.payment-requirement-panel{margin-bottom:12px;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04);overflow:hidden}.payment-requirement-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px}.payment-requirement-heading h3,.payment-requirement-heading p{margin:0}.payment-requirement-heading h3{font-size:14px}.payment-requirement-heading p{margin-top:3px;color:var(--muted);font-size:11px;line-height:1.45}.add-payment-method-button{display:flex;align-items:center;flex:0 0 auto;gap:6px;min-height:34px;border:1px solid var(--blue);border-radius:6px;padding:0 12px;background:var(--blue);color:#fff;font-size:11px;font-weight:800}.add-payment-method-button>span{font-size:17px;font-weight:500;line-height:1}.payment-method-editor{border-top:1px solid #cfe0fa;border-bottom:1px solid #cfe0fa;padding:14px 16px;background:#f7faff}.payment-method-editor__heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.payment-method-editor__heading>div{display:flex;align-items:center;gap:8px}.payment-method-editor__heading strong{font-size:13px}.payment-method-editor__heading span{border-radius:999px;padding:2px 7px;background:var(--blue-soft);color:var(--blue);font-size:9px;font-weight:800}.payment-method-editor__heading>button{display:grid;width:26px;height:26px;place-items:center;border:0;border-radius:5px;background:transparent;color:var(--muted);font-size:20px}.payment-method-editor__heading>button:hover{background:#e8eef8;color:var(--text)}.payment-method-editor__grid{display:grid;grid-template-columns:1.35fr 1fr .8fr 1fr;gap:10px}.payment-card-type-field{display:grid;grid-template-columns:220px minmax(0,1fr);align-items:center;gap:12px;margin-top:12px;border-top:1px solid #e1eaf7;padding-top:12px}.payment-card-type-field>div:first-child{display:grid;gap:3px}.payment-card-type-field strong{font-size:11px}.payment-card-type-field strong i{color:#d84c4c;font-style:normal}.payment-card-type-field>div:first-child span{color:var(--muted);font-size:9px}.payment-card-type-options{display:flex;flex-wrap:wrap;gap:8px}.payment-card-type-options button{display:flex;align-items:center;gap:6px;min-height:31px;border:1px solid var(--border);border-radius:6px;padding:0 10px;background:#fff;color:var(--muted);font-size:10px;font-weight:750}.payment-card-type-options button>span{position:relative;width:14px;height:14px;border:1.5px solid #aeb9c9;border-radius:3px}.payment-card-type-options button.is-active{border-color:#a9c5f3;background:var(--blue-soft);color:var(--blue)}.payment-card-type-options button.is-active>span{border-color:var(--blue);background:var(--blue)}.payment-card-type-options button.is-active>span::after{content:'';position:absolute;left:3px;top:1px;width:5px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.payment-method-editor__error{margin:10px 0 0;color:#b45309;font-size:10px}.payment-method-editor__actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.payment-requirement-list{border-top:1px solid var(--border-soft)}.payment-requirement-list__header,.payment-requirement-row{display:grid;grid-template-columns:minmax(150px,1.35fr) minmax(120px,.9fr) minmax(100px,.8fr) minmax(135px,1fr) minmax(85px,.7fr) 82px;align-items:center;gap:12px}.payment-requirement-list__header{min-height:34px;padding:0 16px;background:#f8faff;color:var(--muted);font-size:9px;font-weight:800}.payment-requirement-row{min-height:66px;border-top:1px solid var(--border-soft);padding:9px 16px}.payment-requirement-method{display:flex;align-items:center;min-width:0;gap:9px}.payment-requirement-method>span{display:grid;flex:0 0 auto;width:30px;height:30px;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--payment-accent) 10%,white);color:var(--payment-accent);font-size:11px;font-weight:850}.payment-requirement-method>div,.payment-requirement-value{display:grid;min-width:0;gap:2px}.payment-requirement-method strong,.payment-requirement-value strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.payment-requirement-method small,.payment-requirement-value small,.payment-requirement-tags small{color:var(--muted);font-size:9px}.payment-requirement-tags{display:flex;flex-wrap:wrap;gap:4px}.payment-requirement-tags>span{border-radius:999px;padding:2px 6px;background:#eef2f7;color:#59677b;font-size:9px;font-weight:700}.payment-requirement-actions{display:flex;gap:4px}.payment-requirement-actions button{border:0;padding:3px;background:transparent;color:var(--blue);font-size:10px;font-weight:750}.payment-requirement-actions button:last-child{color:#a64a4a}.payment-requirement-empty{display:grid;justify-items:center;gap:4px;border-top:1px solid var(--border-soft);padding:22px;background:#fbfcfe}.payment-requirement-empty strong{font-size:11px}.payment-requirement-empty span{color:var(--muted);font-size:10px}
.settlement-config-panel{overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04)}.settlement-config-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;background:#fbfcff}.settlement-config-heading h3,.settlement-config-heading p{margin:0}.settlement-config-heading h3{font-size:14px}.settlement-config-heading p{margin-top:3px;color:var(--muted);font-size:10px}.settlement-config-heading>span{border-radius:999px;padding:4px 9px;background:var(--blue-soft);color:var(--blue);font-size:10px;font-weight:850}.settlement-config-row{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;gap:14px;border-top:1px solid var(--border-soft);padding:12px 16px}.settlement-config-label{display:grid;align-content:center;gap:3px}.settlement-config-label strong{font-size:13px}.settlement-config-label span{color:var(--muted);font-size:10px}.settlement-currency-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,112px));gap:8px}.settlement-currency-options button{height:34px;border:1px solid var(--border);border-radius:6px;background:var(--soft);color:#58667a;font-size:11px;font-weight:800}.settlement-currency-options button.is-active{border-color:var(--blue);background:var(--blue-soft);color:var(--blue);box-shadow:inset 0 0 0 1px rgba(18,103,241,.14)}.settlement-cycle-block{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;gap:14px;margin-top:12px;border-top:1px solid var(--border-soft);padding-top:12px}.settlement-cycle-editor{display:flex;align-items:center;gap:9px}.settlement-cycle-basis{display:grid;grid-template-columns:repeat(2,46px);height:34px;overflow:hidden;border:1px solid var(--border);border-radius:6px}.settlement-cycle-basis button{border:0;border-left:1px solid var(--border);background:#fff;color:var(--muted);font-size:11px;font-weight:850}.settlement-cycle-basis button:first-child{border-left:0}.settlement-cycle-basis button.is-active{background:var(--blue-soft);color:var(--blue)}.settlement-cycle-plus{color:#8090a5;font-size:14px;font-weight:800}.settlement-cycle-days{display:flex;align-items:center;height:34px;overflow:hidden;border:1px solid var(--border);border-radius:6px;background:#fff}.settlement-cycle-days:focus-within{border-color:var(--blue);box-shadow:0 0 0 3px rgba(18,103,241,.1)}.settlement-cycle-days input{width:64px;height:100%;border:0;padding:0 9px;color:var(--text);font-size:12px;font-weight:800;outline:none}.settlement-cycle-days span{display:grid;height:100%;place-items:center;border-left:1px solid var(--border-soft);padding:0 9px;background:var(--soft);color:var(--muted);font-size:10px}.capability-picker-groups{display:grid;gap:12px;margin-top:12px}.capability-picker-group{border:1px solid var(--border);border-radius:8px;padding:14px;background:#fff}.capability-picker-group__heading{display:flex;align-items:center;gap:8px;margin-bottom:10px}.capability-picker-group__heading h3{margin:0;font-size:14px}.capability-picker-group__heading span{border-radius:999px;padding:2px 7px;background:var(--gray-bg);color:var(--muted);font-size:10px}.capability-picker-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.capability-picker-grid--methods{grid-template-columns:repeat(4,minmax(0,1fr))}.capability-picker-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;min-width:0;min-height:62px;gap:9px;border:1px solid var(--border);border-radius:7px;padding:9px 10px;background:var(--soft);color:var(--text);text-align:left}.capability-picker-card:has(.capability-picker-mark){grid-template-columns:30px minmax(0,1fr) auto}.capability-picker-card:hover{border-color:#a9c5f3}.capability-picker-card.is-active{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.2)}.capability-picker-mark{display:grid;width:28px;height:28px;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--picker-accent) 10%,white);color:var(--picker-accent);font-size:12px;font-weight:850}.capability-picker-copy{display:grid;align-content:center;min-width:0;gap:3px}.capability-picker-copy strong{font-size:12px;line-height:1.35}.capability-picker-copy small{overflow:hidden;color:var(--muted);font-size:10px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.capability-picker-meta{display:grid;align-content:center;justify-items:end;gap:7px}.capability-check{position:relative;width:15px;height:15px;border:1.5px solid #afbbcb;border-radius:3px;background:#fff}.capability-picker-card.is-active .capability-check{border-color:var(--blue);background:var(--blue)}.capability-picker-card.is-active .capability-check::after{content:'';position:absolute;left:3px;top:1px;width:5px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.capability-picker-empty{margin-top:12px;border:1px dashed var(--border);border-radius:8px;padding:36px;color:var(--muted);font-size:12px;text-align:center}
.settlement-mapping-table{border-top:1px solid var(--border-soft)}.settlement-mapping-head,.settlement-mapping-row{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;gap:14px;padding:10px 16px}.settlement-mapping-head{background:#f7f9fc;color:var(--muted);font-size:10px;font-weight:800}.settlement-mapping-row{min-height:58px;border-top:1px solid var(--border-soft)}.settlement-mapping-head+.settlement-mapping-row{border-top:0}.settlement-pricing-currency{display:flex;align-items:center}.settlement-pricing-currency strong{display:grid;width:112px;height:34px;place-items:center;border:1px solid #cfd7e3;border-radius:6px;background:#f5f7fa;color:#344256;font-size:11px;font-weight:800}
.capability-picker-card.is-required,.capability-picker-card.is-active.is-required{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.2);cursor:default;opacity:1}.capability-picker-card.is-required:hover{border-color:var(--blue)}.capability-required-badge{border:1px solid #b9cef1;border-radius:999px;padding:3px 8px;background:#fff;color:var(--blue);font-size:9px;font-style:normal;font-weight:800;line-height:1;white-space:nowrap}
.capability-radio{position:relative;width:16px;height:16px;border:1.5px solid #afbbcb;border-radius:50%;background:#fff}.capability-picker-card.is-active .capability-radio{border-color:var(--blue)}.capability-picker-card.is-active .capability-radio::after{content:'';position:absolute;inset:3px;border-radius:50%;background:var(--blue)}

.is-existing-merchant-plan .capability-picker-card.is-active .capability-check::after,
.is-existing-merchant-plan .base-integration-options--currencies button.is-active .pricing-currency-check::after,
.is-existing-merchant-plan .payment-card-type-options button.is-active > span::after {
  content: '';
  position: absolute;
  display: block;
  width: auto;
  height: auto;
  inset: 2px;
  border: 0;
  background:
    linear-gradient(#fff, #fff) center / 2px 9px no-repeat,
    linear-gradient(#fff, #fff) center / 9px 2px no-repeat;
  transform: none;
}
.capability-picker-card.is-coming-soon{border-color:#e1e6ee;background:#f3f5f8;color:#8c97a7;cursor:not-allowed;opacity:1}.capability-picker-card.is-coming-soon:hover{border-color:#e1e6ee}.capability-picker-card.is-coming-soon .capability-picker-copy small,.capability-picker-card.is-coming-soon .capability-domains{color:#98a2b1}.capability-coming-soon{border:1px solid #d8dee8;border-radius:999px;padding:4px 8px;background:#fff;color:#7e8999;font-size:9px;font-style:normal;font-weight:800;line-height:1;white-space:nowrap}
.intake-status{display:inline-flex;align-items:center;justify-content:center;width:max-content;border-radius:999px;padding:3px 8px;font-size:10px;font-style:normal;font-weight:800;white-space:nowrap}.intake-status--standard{background:var(--green-bg);color:var(--green)}.intake-status--conditional{background:var(--orange-bg);color:var(--orange)}.intake-status--unsupported{background:var(--gray-bg);color:var(--gray)}
.intake-review-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;align-items:start;gap:14px}.intake-review-main,.intake-review-side{display:grid;gap:12px}.review-card{padding:16px}.review-card-heading{margin-bottom:13px}.review-card-heading button{border:0;background:transparent;color:var(--blue);font-size:11px;font-weight:750}.review-overview dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;margin:0;background:var(--border-soft)}.review-overview dl>div{min-width:0;padding:11px;background:#fff}.review-overview dt{color:var(--muted);font-size:10px}.review-overview dd{overflow:hidden;margin:5px 0 0;font-size:12px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.review-stage-list{display:grid;gap:12px}.review-stage-list>section>div{display:flex;align-items:center;gap:7px;margin-bottom:6px}.review-stage-list>section>div strong{font-size:12px}.review-stage-list>section>div span{border-radius:999px;padding:1px 6px;background:var(--gray-bg);color:var(--muted);font-size:9px}.review-stage-list ul{display:grid;gap:1px;margin:0;padding:0;list-style:none;background:var(--border-soft)}.review-stage-list li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:#fff;font-size:11px}.review-empty{border:1px dashed var(--border);border-radius:6px;padding:22px;color:var(--muted);font-size:11px;text-align:center}.support-summary{display:grid;gap:10px}.support-summary>div{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-soft);padding-top:9px}.support-summary>div span{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:11px}.support-summary>div i{width:7px;height:7px;border-radius:50%}.support-summary .is-standard{background:var(--green)}.support-summary .is-conditional{background:var(--orange)}.support-summary .is-unsupported{background:var(--gray)}.approval-route>p{margin:5px 0 12px;color:var(--muted);font-size:11px}.approval-domains{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.approval-domains>span{display:grid;justify-items:center;gap:3px;border:1px solid var(--border-soft);border-radius:7px;padding:9px 4px;background:var(--soft)}.approval-domains i{display:grid;width:26px;height:26px;place-items:center;border-radius:7px;background:var(--blue-soft);color:var(--blue);font-size:9px;font-style:normal;font-weight:850}.approval-domains strong{font-size:11px}.approval-domains small{color:var(--muted);font-size:9px}
.review-plan-list{display:grid;gap:10px}.review-plan-card{overflow:hidden;border:1px solid var(--border-soft);border-radius:8px}.review-plan-card>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;background:var(--soft)}.review-plan-card>header>div{display:flex;align-items:center;gap:8px}.review-plan-card>header strong{font-size:11px}.review-plan-card>header span{border-radius:999px;padding:2px 7px;background:var(--blue-soft);color:var(--blue);font-size:9px;font-weight:800}.review-plan-card>header>em{border-radius:999px;padding:2px 7px;background:#fff3df;color:#a86207;font-size:9px;font-style:normal;font-weight:800}.review-plan-card>header>em.is-complete{background:var(--green-bg);color:var(--green)}.review-plan-card dl{display:grid;grid-template-columns:1.25fr .65fr .9fr .65fr;gap:1px;margin:0;background:var(--border-soft)}.review-plan-card dl>div{padding:8px 10px;background:#fff}.review-plan-card dt{color:var(--muted);font-size:9px}.review-plan-card dd{margin:3px 0 0;font-size:10px;font-weight:750}.review-plan-card ul{display:grid;gap:1px;margin:0;padding:0;list-style:none;background:var(--border-soft)}.review-plan-card li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 10px;background:#fff;font-size:10px}
.intake-action-bar{display:flex;align-items:center;justify-content:space-between;width:min(1440px,100%);margin:16px auto 0;border-top:1px solid var(--border);padding-top:12px}.intake-action-bar>span{color:var(--muted);font-size:11px}.intake-action-bar>div,.intake-success__actions{display:flex;align-items:center;gap:9px}.intake-button{display:inline-flex;align-items:center;justify-content:center;min-height:36px;border-radius:6px;padding:0 16px;font-size:12px;font-weight:800;text-decoration:none}.intake-button--secondary{border:1px solid var(--border);background:#fff;color:var(--text)}.intake-button--primary{border:1px solid var(--blue);background:var(--blue);color:#fff}.intake-button:disabled{cursor:not-allowed;opacity:.45}.intake-success{display:grid;justify-items:center;width:min(620px,calc(100% - 32px));margin:90px auto;border:1px solid var(--border);border-radius:8px;padding:48px;background:#fff;text-align:center;box-shadow:0 16px 42px rgba(15,23,42,.08)}.intake-success__icon{display:grid;width:58px;height:58px;place-items:center;border-radius:50%;background:var(--green-bg);color:var(--green)}.intake-success__icon :deep(svg){width:34px;height:34px}.intake-success__eyebrow{margin-top:17px;color:var(--green);font-size:11px;font-weight:850}.intake-success h1{margin:6px 0 0;font-size:22px}.intake-success p{margin:8px 0 22px;color:var(--muted);font-size:12px}.intake-success p strong{color:var(--text)}.intake-success__approval-link{border:1px solid #3b8a59}
.request-record-layer{position:fixed;z-index:80;inset:0;display:flex;justify-content:flex-end;background:rgba(15,23,42,.34);backdrop-filter:blur(2px)}.request-record-panel{display:grid;grid-template-rows:auto minmax(0,1fr);width:min(520px,100%);height:100%;background:#f7f9fc;box-shadow:-18px 0 48px rgba(15,23,42,.16)}.request-record-panel>header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid var(--border);padding:20px 22px;background:#fff}.request-record-panel h2,.request-record-panel p{margin:0}.request-record-panel h2{font-size:18px}.request-record-panel header p{margin-top:4px;color:var(--muted);font-size:11px;line-height:1.5}.request-record-panel header>button{display:grid;width:30px;height:30px;flex:0 0 auto;place-items:center;border:1px solid var(--border);border-radius:6px;background:#fff;color:#6c788b;font-size:20px;line-height:1}.request-record-panel__body{overflow:auto;padding:14px}.request-record-empty{border:1px dashed var(--border);border-radius:8px;padding:34px;background:#fff;color:var(--muted);font-size:12px;text-align:center}.request-record-empty.is-error{border-color:#f0caca;color:#a54141}.request-record-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:14px;margin-bottom:10px;border:1px solid var(--border);border-radius:8px;padding:14px;background:#fff;box-shadow:0 5px 16px rgba(15,23,42,.04)}.request-record-card__main{display:grid;min-width:0;gap:4px}.request-record-card__number{color:var(--blue);font-size:10px;font-weight:850}.request-record-card__main strong{overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.request-record-card__main small{color:var(--muted);font-size:10px;line-height:1.5}.request-record-card__main p{display:-webkit-box;overflow:hidden;margin-top:2px;color:#a54141;font-size:10px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.request-record-card__actions{display:grid;justify-items:end;gap:10px}.request-record-card__actions button{height:28px;border:1px solid #bed3f5;border-radius:6px;padding:0 9px;background:#fff;color:var(--blue);font-size:10px;font-weight:800}.request-record-status{border-radius:999px;padding:3px 8px;background:var(--gray-bg);color:var(--gray);font-size:9px;font-weight:850;white-space:nowrap}.request-record-status.is-draft{background:var(--blue-soft);color:var(--blue)}.request-record-status.is-submitting{background:var(--orange-bg);color:var(--orange)}.request-record-status.is-submitted{background:var(--green-bg);color:var(--green)}.request-record-status.is-approval_failed{background:#fff0f0;color:#a54141}
@media(max-width:1180px){.intake-type-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.intake-type-card{min-height:180px}.capability-picker-grid,.capability-picker-grid--methods,.merchant-subject-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.intake-form-grid,.review-overview dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.intake-shell{padding:0 14px 22px}.intake-header{align-items:flex-start;flex-direction:column;gap:9px;margin:0 -14px;padding:10px 14px}.intake-header-actions{width:100%;flex-wrap:wrap}.intake-header-button{flex:1}.draft-state{order:3;max-width:none;width:100%}.intake-title p{max-width:290px}.intake-steps{overflow-x:auto;margin:14px 0}.intake-step{flex:0 0 auto}.intake-step-line{flex:0 0 24px}.intake-section-heading{align-items:flex-start;flex-direction:column;gap:5px}.intake-section-heading>p{line-height:1.45}.business-type-grid,.intake-type-grid,.intake-form-grid,.merchant-subject-fields,.merchant-subject-product-options,.business-context-fields,.capability-target-grid,.capability-picker-grid,.capability-picker-grid--methods,.intake-review-layout,.review-merchant-subjects dl,.review-plan-card dl{grid-template-columns:1fr}.merchant-subject-heading,.capability-target-heading{align-items:flex-start;flex-direction:column}.add-merchant-subject-button{justify-content:center;width:100%}.business-type-card{grid-template-columns:40px minmax(0,1fr) 18px;min-height:78px;padding:12px}.business-type-icon{width:40px;height:40px}.intake-type-card{min-height:164px}.business-context-card{grid-template-columns:1fr}.base-integration-row{grid-template-columns:1fr}.base-integration-options--two,.base-integration-options--three{grid-template-columns:1fr}.base-integration-options--currencies{grid-template-columns:repeat(2,minmax(0,1fr))}.capability-stage-tabs{overflow-x:auto}.capability-stage-tabs button{flex:0 0 auto}.review-overview dl{grid-template-columns:1fr}.intake-action-bar{position:sticky;bottom:0;z-index:8;margin-right:-14px;margin-left:-14px;width:auto;padding:10px 14px;background:rgba(245,247,251,.97)}.intake-action-bar,.intake-action-bar>div{align-items:stretch;flex-direction:column}.intake-success__actions{flex-direction:column;width:100%}.intake-success__actions .intake-button{width:100%}.request-record-card{grid-template-columns:1fr}.request-record-card__actions{display:flex;align-items:center;justify-content:space-between}.capability-picker-card:has(.capability-picker-mark){grid-template-columns:30px minmax(0,1fr) auto}}
@media(max-width:760px){.intake-request-list-header{align-items:flex-start;flex-direction:column;gap:12px;margin:0 -14px;padding:12px 14px}.intake-request-list-header>.intake-button{width:100%}.intake-request-list-content{margin:14px auto}.local-draft-callout{align-items:flex-start;flex-direction:column}.local-draft-callout button{width:100%}.intake-request-list-card__heading{align-items:flex-start}.intake-request-table__header{display:none}.intake-request-table{display:grid;gap:9px;border-top:1px solid var(--border-soft);padding:10px}.intake-request-table__row{grid-template-columns:minmax(0,1fr) auto;gap:7px 10px;min-height:0;border:1px solid var(--border);border-radius:7px;padding:11px;background:#fff}.intake-request-table__row>strong,.intake-request-table__row>div:nth-child(2),.intake-request-table__row>span:nth-child(3),.intake-request-table__row>span:nth-child(5){grid-column:1}.intake-request-table__row>span:nth-child(4){grid-column:2;grid-row:1}.intake-request-table__actions{grid-column:2;grid-row:2/5;align-self:center}.intake-request-table .request-record-empty{margin:0}.intake-request-list-card__heading p{max-width:240px;line-height:1.45}}
@media(max-width:760px){.request-auth-empty{grid-template-columns:36px minmax(0,1fr);gap:10px;padding:20px 14px}.request-auth-empty__icon{width:36px;height:36px}.request-auth-empty>.intake-button{grid-column:1/-1;width:100%;margin-top:4px}.request-login-layer{padding:14px}.request-login-dialog>header,.request-login-dialog__body{padding:16px}.request-login-dialog>footer{padding:12px 16px}.request-login-dialog>footer .intake-button{flex:1}}
@media(max-width:760px){.module-action-heading{align-items:flex-start;flex-direction:column}.module-action-options{grid-template-columns:1fr}.module-action-heading>button{padding:0}}
@media(max-width:760px){.payment-requirement-heading{align-items:flex-start;flex-direction:column}.add-payment-method-button{width:100%;justify-content:center}.payment-method-editor__grid{grid-template-columns:1fr}.payment-card-type-field{grid-template-columns:1fr}.payment-requirement-list__header{display:none}.payment-requirement-list{display:grid;gap:9px;border-top:1px solid var(--border-soft);padding:10px}.payment-requirement-row{grid-template-columns:minmax(0,1fr) auto;gap:9px;border:1px solid var(--border);border-radius:7px;padding:10px;background:var(--soft)}.payment-requirement-method{grid-column:1/-1}.payment-requirement-value,.payment-requirement-tags{min-height:30px;border-top:1px solid var(--border-soft);padding-top:7px}.payment-requirement-row>.intake-status{align-self:center}.payment-requirement-actions{justify-self:end}.payment-requirement-actions button{padding:5px}.payment-method-editor__actions .intake-button{flex:1}}
@media(max-width:760px){.settlement-config-row,.settlement-cycle-block{grid-template-columns:1fr}.settlement-mapping-head{display:none}.settlement-mapping-row{grid-template-columns:1fr;padding:12px 16px}.settlement-currency-options{grid-template-columns:repeat(2,minmax(0,1fr))}.settlement-cycle-editor{justify-content:flex-start}}

.payment-requirement-heading {
  min-height: 56px;
  padding: 10px 14px;
}

.payment-requirement-heading p {
  margin-top: 2px;
  font-size: 9px;
}

.add-payment-method-button {
  min-height: 30px;
  padding: 0 10px;
  font-size: 10px;
}

.payment-requirement-list__header,
.payment-requirement-row {
  grid-template-columns: minmax(115px, .7fr) minmax(92px, .55fr) minmax(110px, .7fr) minmax(130px, .8fr) minmax(190px, 1.35fr) 58px;
  gap: 12px;
}

.payment-requirement-list {
  margin: 0 14px 14px;
  overflow: hidden;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
}

.payment-requirement-list__header {
  min-height: 32px;
  padding: 0 14px;
  font-size: 9px;
}

.payment-requirement-row {
  min-height: 50px;
  padding: 7px 14px;
}

.payment-requirement-method {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.payment-requirement-method > strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
}

.payment-requirement-method > small {
  color: var(--muted);
  font-size: 9px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-requirement-country {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
}

.payment-requirement-country strong {
  font-size: 11px;
}

.payment-requirement-country span,
.payment-requirement-country small {
  color: var(--muted);
  font-size: 10px;
}

.payment-requirement-binding-field,
.payment-requirement-card-types {
  align-items: center;
  flex-wrap: nowrap;
  overflow: hidden;
}

.payment-requirement-binding-field > span,
.payment-requirement-card-types > span {
  flex: 0 0 auto;
  padding: 2px 6px;
  font-size: 9px;
}

.payment-requirement-card-types > small {
  color: #9aa5b5;
  font-size: 11px;
}

.payment-requirement-tags > .payment-requirement-binding {
  border: 1px solid #d9e1ec;
  background: #ffffff;
  color: #405069;
}

.payment-requirement-channel-summary {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.payment-requirement-channel-summary strong,
.payment-requirement-channel-summary small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-requirement-channel-summary strong {
  font-size: 10px;
}

.payment-requirement-channel-summary small {
  color: var(--muted);
  font-size: 9px;
}

.payment-requirement-actions {
  justify-content: flex-end;
  gap: 2px;
}

.payment-requirement-actions button {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 0;
  background: transparent;
  color: #526278;
}

.payment-requirement-actions button:first-child {
  border-color: var(--border);
  background: #ffffff;
}

.payment-requirement-actions button:hover {
  border-color: #a9c5f3;
  background: var(--blue-soft);
  color: var(--blue);
}

.payment-requirement-actions button:last-child:hover {
  border-color: var(--border);
  background: #f1f4f8;
  color: var(--text);
}

.payment-requirement-actions svg,
.payment-method-picker__header svg,
.payment-method-config__header svg,
.payment-method-drawer__header svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.payment-method-picker-layer {
  position: fixed;
  inset: 0 0 0 var(--workspace-nav-width, 208px);
  z-index: 45;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(20, 31, 50, .22);
  backdrop-filter: blur(1px);
}

.payment-method-picker {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  width: min(900px, 100%);
  max-height: min(680px, calc(100vh - 48px));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 20px 56px rgba(15, 23, 42, .2);
}

.payment-method-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  border-bottom: 1px solid var(--border-soft);
  padding: 13px 18px;
}

.payment-method-picker__header h3,
.payment-method-picker__header p {
  margin: 0;
}

.payment-method-picker__header h3 {
  font-size: 16px;
}

.payment-method-picker__header p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

.payment-method-picker__header > button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
}

.payment-method-picker__header > button:hover {
  background: #f1f4f8;
  color: var(--text);
}

.payment-method-picker__filters {
  display: grid;
  grid-template-columns: 320px 320px minmax(90px, 1fr);
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid var(--border-soft);
  padding: 10px 18px;
  background: #ffffff;
}

.payment-method-picker__filters label {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.payment-method-picker__filters label > span {
  color: #66758c;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.payment-method-picker__filters select {
  width: 100%;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0 10px;
  background: #ffffff;
  color: #27364b;
  font-size: 11px;
  font-weight: 650;
  outline: none;
}

.payment-method-picker__filters select:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(18, 103, 241, .1);
}

.payment-method-picker__count {
  min-width: 90px;
  padding: 0;
  color: var(--muted);
  font-size: 10px;
  text-align: right;
}

.payment-method-picker__body {
  overflow-y: auto;
  padding: 16px 18px 18px;
}

.payment-method-picker__section-header p {
  display: grid;
  gap: 2px;
  margin: 0;
}

.payment-method-picker__section-header strong {
  font-size: 11px;
}

.payment-method-picker__section-header small {
  color: var(--muted);
  font-size: 9px;
}

.payment-method-picker__section + .payment-method-picker__section {
  margin-top: 18px;
}

.payment-method-picker__section--recommended {
  border-bottom: 1px solid var(--border-soft);
  padding-bottom: 18px;
}

.payment-method-picker__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.payment-method-picker__section-header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.payment-method-picker__section-header > em {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 9px;
  font-style: normal;
  font-weight: 750;
}

.payment-method-picker__section-icon {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 6px;
  background: #e7f0ff;
  color: #1267f1;
  font-size: 10px;
}

.payment-method-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.payment-method-picker__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  border-top: 1px solid var(--border-soft);
  padding-top: 12px;
}

.payment-method-picker__pagination > span {
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
}

.payment-method-picker__pagination > div {
  display: flex;
  align-items: center;
  gap: 4px;
}

.payment-method-picker__pagination button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: #fff;
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
}

.payment-method-picker__pagination button.is-active {
  border-color: var(--blue);
  background: var(--blue);
  color: #fff;
}

.payment-method-picker__pagination button:disabled {
  cursor: not-allowed;
  opacity: .4;
}

.payment-method-picker-card {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  min-height: 72px;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 10px;
  background: #ffffff;
  color: var(--text);
  text-align: left;
  transition: border-color .15s, background .15s, box-shadow .15s, transform .12s cubic-bezier(.23, 1, .32, 1);
}

.payment-method-picker-card:active:not(:disabled) {
  transform: scale(.98);
}

.payment-method-picker-card--recommended {
  border-color: #c7daf8;
  background: #ffffff;
}

.payment-method-picker-card:hover:not(:disabled) {
  border-color: #8eb6f5;
  background: #f8fbff;
  box-shadow: 0 4px 14px rgba(18, 103, 241, .08);
}

.payment-method-picker-card:focus-visible {
  border-color: var(--blue);
  outline: 0;
  background: var(--blue-soft);
  box-shadow: inset 0 0 0 1px rgba(18, 103, 241, .2);
}

.payment-method-picker-card:disabled {
  cursor: not-allowed;
  opacity: .58;
}

.payment-method-picker-card__mark {
  position: relative;
  display: grid;
  width: 34px;
  height: 34px;
  grid-row: 1 / span 2;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--payment-accent) 10%, white);
  color: var(--payment-accent);
  font-size: 12px;
  font-weight: 850;
}

.payment-method-picker-card__copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.payment-method-picker-card__copy strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-method-picker-card__copy small {
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-method-picker-card__tags,
.payment-method-picker-card__added {
  grid-column: 2;
  font-size: 9px;
}

.payment-method-picker-card__tags {
  display: flex;
  min-height: 17px;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.payment-method-picker-card__tags em {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 2px 7px;
  background: #eaf2ff;
  color: #315f9f;
  font-style: normal;
  font-weight: 750;
  white-space: nowrap;
}

.payment-method-picker-card__tags em.is-conditional {
  background: #fff5dc;
  color: #956400;
}

.payment-method-picker-card__added {
  width: max-content;
  border-radius: 999px;
  padding: 2px 7px;
  background: var(--gray-bg);
  color: var(--gray);
  font-style: normal;
  font-weight: 800;
}

.payment-method-picker__empty {
  border: 1px dashed var(--border);
  border-radius: 7px;
  padding: 44px 20px;
  color: var(--muted);
  font-size: 11px;
  text-align: center;
}

.payment-method-config-layer {
  position: fixed;
  inset: 0 0 0 var(--workspace-nav-width, 208px);
  z-index: 45;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(20, 31, 50, .22);
  backdrop-filter: blur(1px);
}

.payment-method-config {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  width: min(900px, 100%);
  max-height: min(680px, calc(100vh - 48px));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 20px 56px rgba(15, 23, 42, .2);
}

.payment-method-config__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  border-bottom: 1px solid var(--border-soft);
  padding: 12px 18px;
}

.payment-method-config__header h3,
.payment-method-config__header p {
  margin: 0;
}

.payment-method-config__header h3 {
  font-size: 16px;
}

.payment-method-config__header p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

.payment-method-config__header > button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
}

.payment-method-config__header > button:hover {
  background: #f1f4f8;
  color: var(--text);
}

.payment-method-config__summary {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) max-content;
  align-items: center;
  min-height: 64px;
  gap: 10px;
  margin: 14px 18px 0;
  border: 1px solid var(--border-soft);
  border-radius: 7px;
  padding: 9px 12px;
}

.payment-method-config__mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--payment-accent) 10%, white);
  color: var(--payment-accent);
  font-size: 12px;
  font-weight: 850;
}

.payment-method-config__summary > div {
  display: grid;
  gap: 2px;
}

.payment-method-config__summary strong {
  font-size: 12px;
}

.payment-method-config__summary small {
  color: var(--muted);
  font-size: 9px;
}

.payment-method-config__summary > button {
  justify-self: end;
  border: 0;
  padding: 5px;
  background: transparent;
  color: var(--blue);
  font-size: 10px;
  font-weight: 750;
}

.payment-method-config__body {
  overflow-y: auto;
  padding: 16px 18px 18px;
}

.payment-method-config__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

.payment-method-config__grid .intake-field input,
.payment-method-config__grid .intake-field select {
  height: 36px;
  font-size: 11px;
}

.payment-method-config .payment-card-type-field--inline {
  display: grid;
  grid-template-columns: 1fr;
  align-content: start;
  gap: 8px;
  margin: 0;
  border: 0;
  padding: 0;
}

.payment-channel-requirements {
  margin-top: 18px;
  border-top: 1px solid var(--border-soft);
  padding-top: 16px;
}

.payment-channel-requirements__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.payment-channel-requirements__heading h4,
.payment-channel-requirements__heading p {
  margin: 0;
}

.payment-channel-requirements__heading h4 {
  font-size: 14px;
}

.payment-channel-requirements__heading p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

.payment-channel-requirements__heading > button {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 5px;
  min-height: 32px;
  border: 1px solid var(--blue);
  border-radius: 6px;
  padding: 0 11px;
  background: #fff;
  color: var(--blue);
  font-size: 10px;
  font-weight: 800;
}

.payment-channel-requirements__heading > button > span {
  font-size: 16px;
  font-weight: 500;
  line-height: 1;
}

.payment-channel-requirements__heading > button:hover {
  background: var(--blue-soft);
}

.payment-channel-table {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
}

.payment-channel-table__header,
.payment-channel-table__row {
  display: grid;
  grid-template-columns: 38px minmax(140px, 1fr) 138px minmax(145px, .9fr) minmax(180px, 1.15fr) 32px;
  align-items: center;
  column-gap: 12px;
}

.payment-channel-table__header {
  min-height: 34px;
  padding: 0 12px;
  background: #f7f9fc;
  color: var(--muted);
  font-size: 9px;
  font-weight: 800;
}

.payment-channel-table__row {
  min-height: 64px;
  row-gap: 10px;
  border-top: 1px solid var(--border-soft);
  padding: 9px 12px;
}

.payment-channel-table__index {
  color: var(--muted);
  font-size: 10px;
  font-weight: 750;
}

.payment-channel-table__field {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.payment-channel-table__field > span {
  display: none;
  color: var(--muted);
  font-size: 9px;
  font-weight: 750;
}

.payment-channel-table__field > span i,
.payment-channel-routing i {
  color: #d84c4c;
  font-style: normal;
}

.payment-channel-table__field input {
  width: 100%;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0 10px;
  background: #fff;
  color: var(--text);
  font-size: 11px;
  outline: none;
}

.payment-channel-table__field input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 2px rgba(31, 111, 235, .1);
}

.payment-channel-account-choice {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.payment-channel-account-choice > span {
  display: none;
  color: var(--muted);
  font-size: 9px;
  font-weight: 750;
}

.payment-channel-account-choice > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  height: 36px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 5px;
}

.payment-channel-account-choice button {
  border: 0;
  border-left: 1px solid var(--border-soft);
  background: #fff;
  color: var(--muted);
  font-size: 10px;
  font-weight: 750;
}

.payment-channel-account-choice button:first-child {
  border-left: 0;
}

.payment-channel-account-choice button.is-active {
  background: var(--blue-soft);
  color: var(--blue);
}

.payment-channel-account-choice button:focus-visible {
  position: relative;
  outline: 2px solid rgba(31, 111, 235, .28);
  outline-offset: -2px;
}

.payment-channel-generated,
.payment-channel-not-applicable {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.payment-channel-generated > span,
.payment-channel-not-applicable > span {
  display: none;
  color: var(--muted);
  font-size: 9px;
  font-weight: 750;
}

.payment-channel-generated > strong {
  justify-self: start;
  border: 1px solid #cfe0fa;
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--blue-soft);
  color: var(--blue);
  font-size: 10px;
  font-weight: 800;
}

.payment-channel-not-applicable > strong {
  color: #9aa5b5;
  font-size: 12px;
  font-weight: 600;
}

.payment-channel-extra-fields {
  display: grid;
  grid-column: 2 / -2;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  border-top: 1px dashed var(--border-soft);
  padding-top: 10px;
}

.payment-channel-extra-fields--without-card {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.payment-channel-extra-field {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.payment-channel-extra-field > span {
  color: var(--text);
  font-size: 9px;
  font-weight: 750;
}

.payment-channel-extra-field > span i {
  color: #d84c4c;
  font-style: normal;
}

.payment-channel-extra-field > div {
  position: relative;
}

.payment-channel-extra-field input {
  width: 100%;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0 48px 0 10px;
  background: #fff;
  color: var(--text);
  font-size: 11px;
  outline: none;
}

.payment-channel-extra-field input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 2px rgba(31, 111, 235, .1);
}

.payment-channel-extra-field > div > em {
  position: absolute;
  top: 50%;
  right: 10px;
  color: var(--muted);
  font-size: 9px;
  font-style: normal;
  font-weight: 750;
  transform: translateY(-50%);
}

.payment-channel-extra-field > small {
  color: var(--muted);
  font-size: 9px;
}

.payment-channel-remove {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #8a96a8;
}

.payment-channel-remove:hover:not(:disabled) {
  background: #fff1f1;
  color: #b64a4a;
}

.payment-channel-remove:disabled {
  opacity: .3;
  cursor: not-allowed;
}

.payment-channel-remove svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.payment-channel-routing {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  border-top: 1px solid var(--border-soft);
  padding-top: 13px;
}

.payment-channel-routing label {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.payment-channel-routing label strong {
  font-size: 11px;
}

.payment-channel-routing label span {
  color: var(--muted);
  font-size: 9px;
}

.payment-channel-routing textarea {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 9px 10px;
  background: #fff;
  color: var(--text);
  font: inherit;
  font-size: 10px;
  line-height: 1.5;
  outline: none;
}

.payment-channel-routing textarea:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 2px rgba(31, 111, 235, .1);
}

.payment-channel-count {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 9px;
}

.payment-method-config__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 62px;
  border-top: 1px solid var(--border-soft);
  padding: 11px 18px;
  background: #ffffff;
}

.payment-method-config__footer > div {
  display: flex;
  gap: 9px;
}

.payment-method-config__footer .intake-button {
  min-width: 82px;
}

.payment-method-config__back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  padding: 6px 0;
  background: transparent;
  color: var(--blue);
  font-size: 10px;
  font-weight: 750;
}

.payment-method-drawer-layer {
  position: fixed;
  inset: 0 0 0 var(--workspace-nav-width, 208px);
  z-index: 45;
  background: rgba(20, 31, 50, .18);
  backdrop-filter: blur(1px);
}

.payment-method-drawer {
  position: absolute;
  inset: 0 0 0 auto;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(440px, 100%);
  border-left: 1px solid var(--border);
  background: #ffffff;
  box-shadow: -14px 0 34px rgba(15, 23, 42, .12);
}

.payment-method-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  border-bottom: 1px solid var(--border-soft);
  padding: 12px 18px;
}

.payment-method-drawer__header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.payment-method-drawer__header h3 {
  margin: 0;
  font-size: 16px;
}

.payment-method-drawer__header span {
  border-radius: 999px;
  padding: 2px 7px;
  background: var(--blue-soft);
  color: var(--blue);
  font-size: 9px;
  font-weight: 800;
}

.payment-method-drawer__header > button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
}

.payment-method-drawer__header > button:hover {
  background: #f1f4f8;
  color: var(--text);
}

.payment-method-drawer__body {
  display: grid;
  align-content: start;
  gap: 17px;
  overflow-y: auto;
  padding: 20px 18px;
}

.payment-method-drawer__body .intake-field {
  gap: 7px;
}

.payment-method-drawer__body .intake-field input,
.payment-method-drawer__body .intake-field select {
  height: 40px;
}

.payment-method-drawer .payment-card-type-field {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-top: 2px;
  border-top: 1px solid var(--border-soft);
  padding-top: 17px;
}

.payment-method-drawer__footer {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  min-height: 64px;
  border-top: 1px solid var(--border-soft);
  padding: 13px 18px;
  background: #ffffff;
}

.payment-method-drawer__footer .intake-button {
  min-width: 92px;
}

@media(max-width:760px) {
  .payment-requirement-heading {
    align-items: flex-start;
  }

  .payment-requirement-list {
    margin: 0 10px 10px;
    padding: 9px;
  }

  .payment-requirement-row {
    grid-template-columns: minmax(0, 1fr) auto;
    min-height: 0;
  }

  .payment-requirement-method,
  .payment-requirement-binding-field,
  .payment-requirement-card-types,
  .payment-requirement-channel-summary {
    grid-column: 1 / -1;
  }

  .payment-requirement-country,
  .payment-requirement-binding-field,
  .payment-requirement-card-types,
  .payment-requirement-channel-summary {
    min-height: 30px;
    border-top: 1px solid var(--border-soft);
    padding-top: 7px;
  }

  .payment-requirement-actions {
    justify-self: end;
  }

  .payment-method-drawer-layer {
    top: 54px;
    left: 0;
  }

  .payment-method-picker-layer {
    top: 54px;
    left: 0;
    align-items: stretch;
    padding: 10px;
  }

  .payment-method-picker {
    max-height: calc(100vh - 74px);
  }

  .payment-method-picker__filters {
    grid-template-columns: 1fr 1fr;
    gap: 9px;
    padding: 11px 14px;
  }

  .payment-method-picker__filters label {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .payment-method-picker__count {
    grid-column: 1 / -1;
    padding: 0;
    text-align: left;
  }

  .payment-method-picker__body {
    padding: 12px 14px 14px;
  }

  .payment-method-picker__grid {
    grid-template-columns: 1fr;
  }

  .payment-method-config-layer {
    top: 54px;
    left: 0;
    align-items: stretch;
    padding: 10px;
  }

  .payment-method-config {
    max-height: calc(100vh - 74px);
  }

  .payment-method-config__header {
    min-height: 58px;
    padding: 10px 14px;
  }

  .payment-method-config__summary {
    grid-template-columns: 34px minmax(0, 1fr) max-content;
    margin: 10px 14px 0;
  }

  .payment-method-config__summary > button {
    grid-column: 3;
  }

  .payment-method-config__body {
    padding: 14px;
  }

  .payment-method-config__grid {
    grid-template-columns: 1fr;
  }

  .payment-channel-requirements__heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .payment-channel-requirements__heading > button {
    width: 100%;
    justify-content: center;
  }

  .payment-channel-table__header {
    display: none;
  }

  .payment-channel-table__row {
    grid-template-columns: 28px minmax(0, 1fr) 28px;
    gap: 9px;
    padding: 11px;
  }

  .payment-channel-table__index {
    align-self: center;
    grid-column: 1;
    grid-row: 1;
  }

  .payment-channel-table__field {
    grid-column: 2;
  }

  .payment-channel-table__field > span {
    display: block;
  }

  .payment-channel-account-choice,
  .payment-channel-channel-id,
  .payment-channel-merchant-descriptor,
  .payment-channel-generated,
  .payment-channel-not-applicable,
  .payment-channel-extra-fields {
    grid-column: 2 / -1;
  }

  .payment-channel-extra-fields {
    grid-template-columns: 1fr;
  }

  .payment-channel-account-choice > span,
  .payment-channel-generated > span,
  .payment-channel-not-applicable > span {
    display: block;
  }

  .payment-channel-remove {
    align-self: center;
    grid-column: 3;
    grid-row: 1;
  }

  .payment-method-config__footer {
    min-height: 60px;
    padding: 10px 14px;
  }

  .payment-method-config__footer .intake-button {
    min-width: 70px;
  }

  .payment-method-drawer {
    width: 100%;
    border-left: 0;
  }

  .payment-method-drawer__header {
    min-height: 58px;
    padding: 10px 14px;
  }

  .payment-method-drawer__body {
    padding: 17px 14px;
  }

  .payment-method-drawer__footer {
    min-height: 60px;
    padding: 11px 14px;
  }

  .payment-method-drawer__footer .intake-button {
    flex: 1;
  }
}

/* Structured requirement review */
.review-heading-actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.review-copy-feedback {
  color: var(--green);
  font-size: 10px;
  font-weight: 800;
}

.review-document-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, .8fr);
  align-items: stretch;
  overflow: hidden;
  margin-bottom: 14px;
  border: 1px solid var(--border);
  border-top: 3px solid var(--blue);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .04);
}

.review-document-title {
  min-width: 0;
  padding: 20px 22px;
}

.review-document-title > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-document-title > div span {
  color: var(--blue);
  font-size: 10px;
  font-weight: 850;
}

.review-document-title > div em {
  border: 1px solid #d7dee9;
  border-radius: 999px;
  padding: 2px 7px;
  background: #f7f9fc;
  color: #69778c;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}

.review-document-title h2 {
  overflow: hidden;
  margin: 8px 0 0;
  font-size: 20px;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-document-title p {
  max-width: 680px;
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}

.review-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-left: 1px solid var(--border-soft);
  background: #f8faff;
}

.review-metrics > div {
  display: grid;
  align-content: center;
  justify-items: center;
  min-width: 0;
  border-left: 1px solid var(--border-soft);
  padding: 14px 8px;
}

.review-metrics > div:first-child {
  border-left: 0;
}

.review-metrics strong {
  color: #25334a;
  font-size: 22px;
  line-height: 1;
}

.review-metrics .has-gap strong {
  color: var(--orange);
}

.review-metrics span {
  margin-top: 6px;
  color: var(--muted);
  font-size: 9px;
  text-align: center;
}

.intake-review-layout {
  grid-template-columns: minmax(0, 1fr) 292px;
  gap: 14px;
}

.review-card-heading {
  min-height: 28px;
  margin-bottom: 12px;
}

.review-card-heading > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-card-heading > div > span {
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  border-radius: 6px;
  background: var(--blue-soft);
  color: var(--blue);
  font-size: 9px;
  font-weight: 850;
}

.review-card-heading > em {
  border-radius: 999px;
  padding: 3px 8px;
  background: var(--orange-bg);
  color: #a86207;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}

.review-overview dl {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
}

.review-plan-list {
  gap: 14px;
}

.review-plan-card {
  overflow: hidden;
  border: 1px solid #d5deeb;
  border-radius: 7px;
  background: #ffffff;
}

.review-plan-card > .review-plan-header {
  min-height: 58px;
  padding: 10px 13px;
  background: #f7faff;
}

.review-plan-identity {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
}

.review-plan-identity > span {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 7px;
  background: #ffffff;
  color: var(--blue);
  font-size: 9px;
  font-weight: 850;
  box-shadow: 0 1px 4px rgba(15, 23, 42, .08);
}

.review-plan-identity > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.review-plan-identity > div strong,
.review-plan-identity > div small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-plan-identity > div strong {
  font-size: 12px;
}

.review-plan-identity > div small {
  color: var(--muted);
  font-size: 9px;
}

.review-plan-identity > em {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 3px 8px;
  background: #e7f0ff;
  color: #2364bd;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}

.review-plan-statuses {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 5px;
}

.review-plan-statuses span {
  border-radius: 999px;
  padding: 3px 7px;
  background: var(--green-bg);
  color: var(--green);
  font-size: 9px;
  font-weight: 800;
}

.review-plan-statuses .is-conditional {
  background: var(--orange-bg);
  color: var(--orange);
}

.review-plan-statuses .is-unsupported {
  background: var(--gray-bg);
  color: var(--gray);
}

.review-scenario-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid var(--border-soft);
  background: #ffffff;
}

.review-scenario-grid > div {
  display: grid;
  min-width: 0;
  gap: 4px;
  border-top: 1px solid var(--border-soft);
  border-left: 1px solid var(--border-soft);
  padding: 9px 11px;
}

.review-scenario-grid > div:nth-child(-n + 4) {
  border-top: 0;
}

.review-scenario-grid > div:nth-child(4n + 1) {
  border-left: 0;
}

.review-scenario-grid span,
.review-capability-group > span {
  color: var(--muted);
  font-size: 9px;
}

.review-scenario-grid strong {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-plan-section {
  border-top: 1px solid var(--border-soft);
}

.review-scenario-grid + .review-plan-section {
  border-top: 0;
}

.review-plan-section__heading {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
  background: #fbfcfe;
}

.review-plan-section__heading strong {
  font-size: 11px;
}

.review-plan-section__heading span {
  border-radius: 999px;
  padding: 2px 6px;
  background: var(--gray-bg);
  color: var(--muted);
  font-size: 8px;
  font-weight: 800;
}

.review-payment-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: var(--border-soft);
}

.review-payment-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  min-width: 0;
  gap: 9px;
  padding: 9px 11px;
  background: #ffffff;
}

.review-payment-row > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.review-payment-row > div strong,
.review-payment-row > div span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-payment-row > div strong {
  font-size: 10px;
}

.review-payment-row > div span,
.review-payment-row > small {
  color: var(--muted);
  font-size: 8px;
}

.review-capability-groups {
  display: grid;
  gap: 0;
}

.review-capability-group {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  align-items: start;
  border-top: 1px solid var(--border-soft);
}

.review-capability-group:first-child {
  border-top: 0;
}

.review-capability-group > span {
  padding: 10px 12px;
  font-weight: 750;
}

.review-capability-group > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  border-left: 1px solid var(--border-soft);
  background: var(--border-soft);
}

.review-capability-group article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  min-width: 0;
  gap: 8px;
  min-height: 40px;
  padding: 7px 9px;
  background: #ffffff;
}

.review-capability-group article strong {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-capability-group article small {
  color: var(--muted);
  font-size: 8px;
  white-space: nowrap;
}

.review-gap-card .review-card-description {
  margin: -4px 0 12px;
  color: var(--muted);
  font-size: 10px;
}

.review-gap-list {
  overflow: hidden;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
}

.review-gap-list article {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) 86px;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border-top: 1px solid var(--border-soft);
  padding: 8px 10px;
}

.review-gap-list article:first-child {
  border-top: 0;
}

.review-gap-list article > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.review-gap-list article > div strong {
  font-size: 10px;
}

.review-gap-list article > div span,
.review-gap-list article > small {
  overflow: hidden;
  color: var(--muted);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-gap-list article > small {
  text-align: right;
}

.review-ready-state {
  display: flex;
  align-items: center;
  gap: 11px;
  border: 1px solid #cfe7d4;
  border-radius: 7px;
  padding: 13px;
  background: #f6fbf7;
}

.review-ready-state > span {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--green-bg);
  color: var(--green);
  font-size: 12px;
  font-weight: 850;
}

.review-ready-state strong {
  font-size: 11px;
}

.review-ready-state p {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 9px;
}

.review-readiness > span {
  color: var(--blue);
  font-size: 9px;
  font-weight: 850;
}

.review-readiness > strong {
  display: block;
  margin-top: 5px;
  font-size: 15px;
}

.review-readiness > p,
.review-domain-route > p {
  margin: 5px 0 12px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.5;
}

.review-readiness-bar {
  display: flex;
  height: 6px;
  overflow: hidden;
  margin: 12px 0;
  border-radius: 999px;
  background: var(--gray-bg);
}

.review-readiness-bar i {
  min-width: 3px;
}

.review-readiness .is-standard {
  background: var(--green);
}

.review-readiness .is-conditional {
  background: var(--orange);
}

.review-readiness .is-unsupported {
  background: var(--gray);
}

.review-readiness ul,
.review-output-card ul {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.review-readiness li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-soft);
  padding: 8px 0;
  font-size: 10px;
}

.review-readiness li span {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
}

.review-readiness li i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.review-domain-list {
  display: grid;
  gap: 8px;
}

.review-domain-list article {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-soft);
  border-radius: 7px;
  padding: 9px;
  background: #fbfcfe;
}

.review-domain-list article > i {
  display: grid;
  width: 30px;
  height: 30px;
  grid-row: 1 / span 2;
  place-items: center;
  border-radius: 7px;
  background: var(--blue-soft);
  color: var(--blue);
  font-size: 9px;
  font-style: normal;
  font-weight: 850;
}

.review-domain-list article > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.review-domain-list article > div strong {
  font-size: 10px;
}

.review-domain-list article > div span {
  overflow: hidden;
  color: var(--muted);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-domain-list article > em {
  grid-column: 2;
  color: #4f5d72;
  font-size: 8px;
  font-style: normal;
  font-weight: 750;
}

.review-domain-list article > em small {
  color: var(--orange);
  font-size: inherit;
}

.review-output-card li {
  display: flex;
  align-items: center;
  gap: 7px;
  border-top: 1px solid var(--border-soft);
  padding: 8px 0;
  color: #536177;
  font-size: 9px;
}

.review-output-card li:first-child {
  margin-top: 9px;
}

.review-output-card li span {
  color: var(--green);
  font-weight: 850;
}

.review-output-card > button {
  width: 100%;
  min-height: 33px;
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #ffffff;
  color: var(--blue);
  font-size: 10px;
  font-weight: 800;
}

.review-output-card > button:hover {
  border-color: #a9c5f3;
  background: var(--blue-soft);
}

@media(max-width:1180px) {
  .review-document-hero {
    grid-template-columns: 1fr;
  }

  .review-metrics {
    border-top: 1px solid var(--border-soft);
    border-left: 0;
  }

  .review-scenario-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .review-scenario-grid > div:nth-child(-n + 4) {
    border-top: 1px solid var(--border-soft);
  }

  .review-scenario-grid > div:nth-child(-n + 2) {
    border-top: 0;
  }

  .review-scenario-grid > div:nth-child(4n + 1) {
    border-left: 1px solid var(--border-soft);
  }

  .review-scenario-grid > div:nth-child(2n + 1) {
    border-left: 0;
  }

  .review-payment-list,
  .review-capability-group > div {
    grid-template-columns: 1fr;
  }
}

@media(max-width:760px) {
  .intake-review-layout {
    grid-template-columns: 1fr;
  }

  .review-heading-actions {
    width: 100%;
    justify-content: space-between;
  }

  .review-document-title {
    padding: 16px;
  }

  .review-document-title h2 {
    font-size: 17px;
    white-space: normal;
  }

  .review-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .review-metrics > div:nth-child(3) {
    border-top: 1px solid var(--border-soft);
    border-left: 0;
  }

  .review-metrics > div:nth-child(4) {
    border-top: 1px solid var(--border-soft);
  }

  .review-overview dl,
  .review-scenario-grid {
    grid-template-columns: 1fr;
  }

  .review-scenario-grid > div,
  .review-scenario-grid > div:nth-child(-n + 2),
  .review-scenario-grid > div:nth-child(4n + 1) {
    border-top: 1px solid var(--border-soft);
    border-left: 0;
  }

  .review-scenario-grid > div:first-child {
    border-top: 0;
  }

  .review-plan-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .review-plan-statuses {
    justify-content: flex-start;
  }

  .review-capability-group {
    grid-template-columns: 1fr;
  }

  .review-capability-group > span {
    padding-bottom: 7px;
  }

  .review-capability-group > div {
    border-top: 1px solid var(--border-soft);
    border-left: 0;
  }

  .review-payment-row,
  .review-capability-group article {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .review-payment-row > small,
  .review-capability-group article small {
    display: none;
  }

  .review-gap-list article {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .review-gap-list article > small {
    display: none;
  }
}

.review-overview {
  margin-bottom: 14px;
}

.review-merchant-plans {
  margin-top: 16px;
}

.review-merchant-plans > .review-card-heading {
  margin-bottom: 5px;
}

.review-merchant-plans > .review-card-description {
  margin: 0 0 13px 31px;
  color: var(--muted);
  font-size: 10px;
}

.review-merchant-switcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 12px;
}

.review-merchant-switcher > button {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  min-width: 0;
  min-height: 58px;
  gap: 9px;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 9px 11px;
  background: #fbfcfe;
  color: var(--text);
  text-align: left;
}

.review-merchant-switcher > button:hover {
  border-color: #a9c5f3;
}

.review-merchant-switcher > button.is-active {
  border-color: var(--blue);
  background: var(--blue-soft);
  box-shadow: inset 0 0 0 1px rgba(18, 103, 241, .14);
}

.review-merchant-switcher > button > span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  background: #ffffff;
  color: #65738a;
  font-size: 9px;
  font-weight: 850;
  box-shadow: 0 1px 4px rgba(15, 23, 42, .07);
}

.review-merchant-switcher > button.is-active > span {
  color: var(--blue);
}

.review-merchant-switcher > button > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.review-merchant-switcher strong,
.review-merchant-switcher small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-merchant-switcher strong {
  font-size: 11px;
}

.review-merchant-switcher small {
  color: var(--muted);
  font-size: 9px;
}

.review-merchant-switcher em {
  border-radius: 999px;
  padding: 3px 7px;
  background: #eef2f7;
  color: #65738a;
  font-size: 8px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.review-merchant-switcher > button.is-active em {
  background: #ffffff;
  color: var(--blue);
}

.review-merchant-context {
  display: grid;
  grid-template-columns: 1.4fr .7fr .7fr 1fr;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  background: var(--border-soft);
  gap: 1px;
}

.review-merchant-context > div {
  display: grid;
  min-width: 0;
  gap: 4px;
  padding: 9px 11px;
  background: #f8faff;
}

.review-merchant-context span {
  color: var(--muted);
  font-size: 9px;
}

.review-merchant-context strong {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-dimension-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 12px;
}

.review-dimension-card {
  overflow: hidden;
  border: 1px solid #d5deeb;
  border-radius: 7px;
  background: #ffffff;
}

.review-dimension-card > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  gap: 12px;
  border-bottom: 1px solid var(--border-soft);
  padding: 9px 12px;
  background: #f7faff;
}

.review-dimension-card > header > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.review-dimension-card > header strong {
  font-size: 13px;
}

.review-dimension-card > header span {
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-dimension-card > header em {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 3px 7px;
  background: #e8eef8;
  color: #5d6c82;
  font-size: 8px;
  font-style: normal;
  font-weight: 800;
}

.review-dimension-card > section {
  display: block;
  border-top: 1px solid var(--border-soft);
  padding: 0;
}

.review-dimension-card > header + section {
  border-top: 0;
}

.review-dimension-card > section.is-payment-group {
  padding: 12px;
}

.review-dimension-group-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
}

.review-dimension-card h4 {
  margin: 0;
  color: #344256;
  font-size: 10px;
  font-weight: 800;
}

.review-dimension-group-heading > span {
  border-radius: 999px;
  padding: 2px 6px;
  background: var(--gray-bg);
  color: var(--muted);
  font-size: 8px;
  font-weight: 800;
}

.review-dimension-text-rows {
  display: grid;
}

.review-dimension-text-rows > div {
  display: grid;
  grid-template-columns: minmax(150px, .28fr) minmax(0, 1fr);
  align-items: start;
  min-height: 43px;
  gap: 18px;
  border-top: 1px solid var(--border-soft);
  padding: 11px 12px;
}

.review-dimension-text-rows > div:first-child {
  border-top: 0;
}

.review-dimension-text-rows strong {
  color: #66758b;
  font-size: 9px;
  font-weight: 750;
}

.review-dimension-text-rows span {
  color: #202b3e;
  font-size: 10px;
  font-weight: 750;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.review-dimension-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.review-dimension-items > div {
  display: grid;
  align-content: center;
  min-width: 0;
  min-height: 50px;
  gap: 3px;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  padding: 8px 10px;
  background: #f8faff;
}

.review-dimension-items > div > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.review-dimension-items strong {
  font-size: 10px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.review-dimension-items small {
  color: var(--muted);
  font-size: 8px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.review-payment-requirements {
  display: grid;
  gap: 10px;
}

.review-payment-requirements > article {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #ffffff;
}

.review-payment-requirements > article > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 45px;
  gap: 12px;
  padding: 8px 11px;
  background: #f8faff;
}

.review-payment-requirements > article > header > div {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
}

.review-payment-requirements > article > header strong {
  font-size: 11px;
}

.review-payment-requirements > article > header span {
  color: var(--muted);
  font-size: 9px;
}

.review-payment-requirements > article > header em {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 3px 7px;
  background: #e8eef8;
  color: #5d6c82;
  font-size: 8px;
  font-style: normal;
  font-weight: 800;
}

.review-payment-requirements dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  border-top: 1px solid var(--border-soft);
  background: var(--border-soft);
}

.review-payment-requirements dl > div {
  display: grid;
  min-width: 0;
  gap: 3px;
  padding: 8px 10px;
  background: #ffffff;
}

.review-payment-requirements dt {
  color: var(--muted);
  font-size: 8px;
}

.review-payment-requirements dd {
  margin: 0;
  font-size: 9px;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.review-channel-requirements {
  border-top: 1px solid var(--border-soft);
}

.review-channel-requirements__head,
.review-channel-requirements__row {
  display: grid;
  grid-template-columns: minmax(130px, .8fr) minmax(180px, 1.15fr) minmax(200px, 1.35fr);
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
}

.review-channel-requirements__head {
  background: #f7f9fc;
  color: var(--muted);
  font-size: 8px;
  font-weight: 800;
}

.review-channel-requirements__row {
  min-height: 43px;
  border-top: 1px solid var(--border-soft);
  font-size: 9px;
}

.review-channel-requirements__row > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.review-channel-requirements__row strong {
  font-size: 9px;
}

.review-channel-requirements__row > div span,
.review-channel-requirements__row > span {
  color: var(--muted);
  font-size: 8px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.review-channel-routing {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 10px;
  border-top: 1px solid #f0dfbf;
  padding: 9px 10px;
  background: #fffaf1;
}

.review-channel-routing strong {
  color: #915d18;
  font-size: 8px;
}

.review-channel-routing span {
  color: #6f5a3d;
  font-size: 8px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

@media(max-width:1100px) {
  .review-merchant-switcher {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media(max-width:760px) {
  .review-merchant-switcher,
  .review-merchant-context {
    grid-template-columns: 1fr;
  }

  .review-dimension-items {
    grid-template-columns: 1fr;
  }

  .review-dimension-text-rows > div {
    grid-template-columns: 105px minmax(0, 1fr);
    gap: 10px;
  }

  .review-payment-requirements dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .review-channel-requirements__head {
    display: none;
  }

  .review-channel-requirements__row {
    grid-template-columns: 1fr;
    gap: 5px;
    padding: 10px;
  }

  .review-channel-routing {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}

/* Structured requirement confirmation */
.review-scope-bar {
  display: grid;
  grid-template-columns: minmax(240px, .8fr) minmax(420px, 1.8fr) auto;
  align-items: center;
  gap: 22px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 11px 14px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(24, 39, 75, .035);
}

.review-scope-summary {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: baseline;
  min-width: 0;
  gap: 3px 14px;
}

.review-scope-summary > span,
.review-scope-merchants > span {
  color: #65738a;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.review-scope-summary > strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-scope-summary > small {
  grid-column: 2;
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-scope-merchants {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.review-merchant-switcher {
  display: flex;
  min-width: 0;
  gap: 7px;
  margin: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.review-merchant-switcher > button {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  flex: 0 1 260px;
  min-width: 190px;
  min-height: 37px;
  gap: 2px;
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 6px 10px;
  background: #fff;
}

.review-merchant-switcher > button.is-active {
  border-color: #80aefa;
  background: #f4f8ff;
  box-shadow: inset 0 0 0 1px rgba(18, 103, 241, .08);
}

.review-merchant-switcher > button strong,
.review-merchant-switcher > button small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-merchant-switcher > button strong {
  color: #344256;
  font-size: 9px;
}

.review-merchant-switcher > button.is-active strong {
  color: var(--blue);
}

.review-merchant-switcher > button small {
  color: var(--muted);
  font-size: 8px;
}

.review-scope-edit {
  border: 0;
  padding: 7px 4px;
  background: transparent;
  color: var(--blue);
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
}

.review-scope-edit:hover {
  text-decoration: underline;
}

.review-merchant-plans {
  margin-top: 0;
}

.review-merchant-context {
  grid-template-columns: 1.45fr .7fr .75fr 1fr;
  margin-bottom: 10px;
  border-radius: 7px;
  background: #e5ebf4;
}

.review-merchant-context > div {
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
  padding: 8px 11px;
  background: #f8faff;
}

.review-merchant-context span {
  font-size: 8px;
  white-space: nowrap;
}

.review-merchant-context strong {
  font-size: 9px;
}

.review-dimension-grid {
  gap: 9px;
}

.review-dimension-card {
  overflow: hidden;
  border: 1px solid #d5deeb;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(27, 45, 78, .025);
}

.review-dimension-card > summary {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto 18px;
  align-items: center;
  min-height: 43px;
  gap: 8px;
  padding: 7px 12px;
  background: #f3f7fc;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.review-dimension-card > summary::-webkit-details-marker {
  display: none;
}

.review-dimension-card[open] > summary {
  border-bottom: 1px solid #dce4ef;
  background: #f1f6fd;
}

.review-dimension-index {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 1px solid #c9daf4;
  border-radius: 6px;
  background: #fff;
  color: var(--blue);
  font-size: 9px;
  font-weight: 850;
}

.review-dimension-card > summary > div {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 9px;
}

.review-dimension-card > summary strong {
  color: #243047;
  font-size: 11px;
}

.review-dimension-card > summary span:not(.review-dimension-index) {
  overflow: hidden;
  color: var(--muted);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-dimension-card > summary em {
  color: #768399;
  font-size: 8px;
  font-style: normal;
  font-weight: 750;
}

.review-dimension-card > summary > i {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid #75839a;
  border-bottom: 1.5px solid #75839a;
  transform: rotate(45deg) translateY(-2px);
  transition: transform 140ms ease;
}

.review-dimension-card[open] > summary > i {
  transform: rotate(225deg) translate(-1px, -1px);
}

.review-dimension-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 40px;
  padding: 9px 18px 14px;
}

.review-dimension-body > section {
  min-width: 0;
}

.review-dimension-body > section.is-payment-group {
  grid-column: 1 / -1;
  margin-top: 8px;
  border-top: 1px solid var(--border-soft);
  padding: 12px 0 0;
}

.review-dimension-group-heading {
  margin-bottom: 8px;
}

.review-dimension-card h4 {
  color: #2d3a50;
  font-size: 10px;
}

.review-dimension-group-heading > span {
  background: #edf2f8;
  font-size: 8px;
}

.review-dimension-text-rows > div {
  grid-template-columns: minmax(112px, .34fr) minmax(0, 1fr);
  min-height: 35px;
  gap: 12px;
  border-top: 0;
  border-bottom: 1px solid #edf1f6;
  padding: 8px 0;
}

.review-dimension-text-rows strong {
  color: #67758a;
  font-size: 9px;
}

.review-dimension-text-rows span {
  color: #243047;
  font-size: 9px;
  font-weight: 750;
}

.review-payment-requirements {
  gap: 11px;
}

.review-payment-requirements > article {
  border-color: #dce4ef;
  border-radius: 6px;
}

.review-payment-requirements > article > header {
  display: grid;
  grid-template-columns: minmax(150px, .72fr) minmax(520px, 2.5fr) auto;
  min-height: 54px;
  gap: 18px;
  padding: 8px 11px;
  background: #fbfcfe;
}

.review-payment-name {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.review-payment-name > span {
  width: 3px;
  height: 22px;
  flex: 0 0 auto;
  border-radius: 2px;
  background: var(--blue);
}

.review-payment-name > strong {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-payment-requirements > article > header > dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  min-width: 0;
  gap: 18px;
  margin: 0;
  border: 0;
  background: transparent;
}

.review-payment-requirements > article > header > dl > div {
  gap: 2px;
  padding: 0;
  background: transparent;
}

.review-payment-requirements > article > header dt {
  color: #748197;
  font-size: 8px;
}

.review-payment-requirements > article > header dd {
  overflow: hidden;
  color: #263248;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-payment-requirements > article > header > em {
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  color: var(--blue);
  font-size: 8px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.review-channel-requirements {
  border-top: 1px solid #e3e9f2;
}

.review-channel-requirements__head,
.review-channel-requirements__row {
  display: grid;
  grid-template-columns: minmax(135px, 1.1fr) minmax(145px, 1.05fr) minmax(170px, 1.25fr) minmax(85px, .65fr) minmax(85px, .65fr) minmax(90px, .7fr);
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
}

.review-channel-requirements__head {
  background: #f5f8fc;
  color: #66758b;
  font-size: 8px;
  font-weight: 800;
}

.review-channel-requirements__row {
  min-height: 42px;
  border-top: 1px solid #edf1f6;
}

.review-channel-requirements__row > strong,
.review-channel-requirements__row > span {
  min-width: 0;
  color: #344256;
  font-size: 9px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.review-channel-requirements__row > strong {
  font-weight: 800;
}

.review-channel-requirements__row > span > small {
  display: block;
  margin-bottom: 1px;
  color: #8692a4;
  font-size: 7px;
}

.review-channel-routing {
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 9px;
  border-top: 1px solid #dbe6f6;
  padding: 8px 12px;
  background: #f4f8fe;
}

.review-channel-routing strong {
  color: #3e659f;
  font-size: 8px;
}

.review-channel-routing span {
  color: #53647c;
  font-size: 8px;
}

@media(max-width:1100px) {
  .review-scope-bar {
    grid-template-columns: minmax(200px, .75fr) minmax(360px, 1.5fr) auto;
  }

  .review-payment-requirements > article > header {
    grid-template-columns: minmax(130px, .6fr) minmax(420px, 2fr) auto;
  }

  .review-channel-requirements__head,
  .review-channel-requirements__row {
    grid-template-columns: minmax(105px, .9fr) minmax(115px, .95fr) minmax(135px, 1.1fr) minmax(72px, .6fr) minmax(72px, .6fr) minmax(76px, .65fr);
    gap: 10px;
  }
}

@media(max-width:760px) {
  .review-scope-bar {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .review-scope-merchants {
    grid-template-columns: 1fr;
  }

  .review-merchant-switcher > button {
    flex-basis: 210px;
  }

  .review-scope-edit {
    justify-self: start;
  }

  .review-merchant-context,
  .review-dimension-body {
    grid-template-columns: 1fr;
  }

  .review-merchant-context > div {
    grid-template-columns: 112px minmax(0, 1fr);
  }

  .review-dimension-card > summary {
    grid-template-columns: 30px minmax(0, 1fr) 16px;
  }

  .review-dimension-card > summary em {
    display: none;
  }

  .review-dimension-card > summary > div {
    display: grid;
    gap: 2px;
  }

  .review-dimension-body {
    padding: 7px 12px 12px;
  }

  .review-dimension-text-rows > div {
    grid-template-columns: 104px minmax(0, 1fr);
  }

  .review-payment-requirements > article > header {
    grid-template-columns: 1fr auto;
    gap: 9px;
  }

  .review-payment-requirements > article > header > dl {
    grid-column: 1 / -1;
    grid-row: 2;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 14px;
  }

  .review-channel-requirements__head {
    display: none;
  }

  .review-channel-requirements__row {
    grid-template-columns: 1fr;
    gap: 7px;
    padding: 10px 12px;
  }

  .review-channel-requirements__row > strong::before,
  .review-channel-requirements__row > span::before {
    content: attr(data-label);
    display: inline-block;
    width: 112px;
    color: #8490a2;
    font-size: 8px;
    font-weight: 700;
  }

  .review-channel-requirements__row > span > small {
    display: none;
  }

  .review-channel-routing {
    grid-template-columns: 1fr;
  }
}

/* Confirmation page: compact enterprise review document */
.is-review-step {
  padding-bottom: 76px;
  background: #f7f9fc;
}

.is-review-step .intake-header {
  min-height: 54px;
  padding-top: 7px;
  padding-bottom: 7px;
}

.is-review-step .intake-title__icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
}

.is-review-step .intake-title__icon :deep(svg) {
  width: 17px;
  height: 17px;
}

.is-review-step .intake-title h1 {
  font-size: 16px;
}

.is-review-step .intake-title p,
.is-review-step .draft-state {
  display: none;
}

.review-page-heading {
  display: none;
}

.review-scope-bar {
  grid-template-columns: minmax(280px, .95fr) minmax(460px, 1.7fr);
  gap: 20px;
  margin-bottom: 12px;
  border-color: #dce3ee;
  border-radius: 6px;
  padding: 13px 18px;
  box-shadow: none;
}

.review-scope-summary {
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 5px 18px;
}

.review-scope-summary > span,
.review-scope-merchants > span {
  color: #38465b;
  font-size: 12px;
  font-weight: 750;
}

.review-scope-summary > strong {
  color: #1d2b42;
  font-size: 12px;
  font-weight: 800;
}

.review-scope-summary > small {
  color: #53647c;
  font-size: 10px;
  line-height: 1.4;
}

.review-scope-merchants {
  gap: 12px;
}

.review-merchant-switcher {
  gap: 8px;
}

.review-merchant-switcher > button {
  flex-basis: 236px;
  min-width: 190px;
  min-height: 34px;
  border-radius: 5px;
  padding: 5px 10px;
  background: #fbfcfe;
  text-align: left;
}

.review-merchant-switcher > button.is-active {
  border-color: var(--blue);
  background: #f6f9ff;
  box-shadow: inset 0 0 0 1px rgba(18, 103, 241, .08);
}

.review-merchant-switcher > button strong {
  font-size: 10px;
}

.review-merchant-switcher > button small {
  font-size: 9px;
}

.review-scope-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.review-scope-actions > button {
  border: 0;
  padding: 4px 0;
  background: transparent;
  color: var(--blue);
  font-size: 10px;
  font-weight: 750;
}

.review-scope-actions > button:hover {
  text-decoration: underline;
}

.review-dimension-grid {
  gap: 6px;
}

.review-dimension-card {
  border-color: #dbe3ef;
  border-radius: 6px;
  box-shadow: none;
}

.review-dimension-card > summary {
  grid-template-columns: minmax(0, 1fr) 18px;
  min-height: 34px;
  gap: 6px;
  padding: 5px 14px;
  background: #eef3fa;
}

.review-dimension-card[open] > summary {
  border-bottom-color: #d8e1ee;
  background: #edf3fb;
}

.review-dimension-index {
  display: block;
  width: auto;
  height: auto;
  border: 0;
  border-radius: 0;
  background: transparent;
  font-size: 11px;
  line-height: 1;
}

.review-dimension-card > summary > div {
  gap: 10px;
}

.review-dimension-card > summary > div::before {
  width: 3px;
  height: 14px;
  flex: 0 0 auto;
  align-self: center;
  border-radius: 2px;
  background: var(--blue);
  content: '';
}

.review-dimension-card > summary strong {
  color: #1f2d43;
  font-size: 12px;
}

.review-dimension-card > summary span:not(.review-dimension-index) {
  color: #708096;
  font-size: 9px;
}

.review-dimension-card > summary .review-module-action {
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.25;
}

.review-dimension-card > summary .review-module-action.is-businessFirstAccess {
  background: #eaf7ed;
  color: #24763a;
}

.review-dimension-card > summary .review-module-action.is-merchantFirstAccess {
  background: #e9f6f4;
  color: #24776e;
}

.review-dimension-card > summary .review-module-action.is-capabilityAdjustment {
  background: #fff0d8;
  color: #b56605;
}

.review-dimension-card > summary em {
  display: none;
}

.review-dimension-body {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 46px;
  padding: 8px 20px 13px;
}

.review-dimension-overview {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 54px;
  padding: 2px 4px 5px;
}

.review-dimension-overview > div {
  display: grid;
  grid-template-columns: 142px minmax(0, 1fr);
  align-items: baseline;
  min-height: 34px;
  gap: 14px;
  padding: 6px 0;
}

.review-dimension-overview > .is-full-width {
  grid-column: 1 / -1;
}

.review-dimension-overview strong {
  color: #56657b;
  font-size: 12px;
  font-weight: 650;
}

.review-dimension-overview span {
  min-width: 0;
  color: #243147;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.review-dimension-body > section.is-payment-group {
  margin-top: 5px;
  padding-top: 10px;
}

.review-dimension-text-rows > div {
  grid-template-columns: 130px minmax(0, 1fr);
  min-height: 30px;
  gap: 14px;
  padding: 6px 4px;
}

.review-dimension-text-rows strong {
  color: #56657b;
  font-size: 10px;
  font-weight: 650;
}

.review-dimension-text-rows span {
  color: #243147;
  font-size: 10px;
  font-weight: 650;
}

.review-dimension-group-heading {
  margin-bottom: 8px;
}

.review-dimension-card h4 {
  color: #233147;
  font-size: 13px;
}

.review-dimension-group-heading > span {
  padding: 2px 7px;
  font-size: 9px;
}

.review-payment-requirements {
  gap: 10px;
}

.review-payment-requirements > article {
  overflow: hidden;
  border-color: #dce4ef;
  border-radius: 5px;
  background: #fff;
}

.review-payment-requirements > article > header {
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 40px;
  gap: 16px;
  padding: 8px 12px;
  background: #fff;
}

.review-payment-name > span {
  width: 3px;
  height: 18px;
  flex: 0 0 auto;
  align-self: center;
  border-radius: 2px;
  background: var(--blue);
}

.review-payment-name > strong {
  color: #202e44;
  font-size: 12px;
  line-height: 18px;
}

.review-payment-requirements > article > .review-payment-metadata {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: 0 12px 8px;
  border: 1px solid #dfe6f0;
  border-radius: 4px;
  padding: 0;
  background: #fff;
}

.review-payment-requirements > article > .review-payment-metadata > div {
  display: grid;
  min-width: 0;
  gap: 2px;
  padding: 8px 12px;
  background: transparent;
}

.review-payment-requirements > article > .review-payment-metadata dt {
  color: #748197;
  font-size: 10px;
}

.review-payment-requirements > article > .review-payment-metadata dd {
  overflow: hidden;
  margin: 0;
  color: #263248;
  font-size: 11px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-payment-requirements > article > header > em {
  font-size: 10px;
}

.review-channel-requirements {
  margin: 0 12px;
  border: 1px solid #e0e7f1;
  border-radius: 4px;
}

.review-payment-requirements > article > .review-channel-requirements:last-child {
  margin-bottom: 12px;
}

.review-channel-requirements__head,
.review-channel-requirements__row {
  grid-template-columns: minmax(135px, 1.05fr) minmax(135px, 1fr) minmax(145px, 1.05fr) minmax(150px, 1.1fr) minmax(105px, .75fr) minmax(95px, .7fr);
  gap: 16px;
  padding: 7px 10px;
}

.review-channel-requirements__head {
  background: #f0f4fa;
  color: #4c5b71;
  font-size: 10px;
}

.review-channel-requirements__row {
  min-height: 36px;
  border-top-color: #e8edf4;
}

.review-channel-requirements__row > strong,
.review-channel-requirements__row > span {
  font-size: 11px;
  line-height: 1.35;
}

.review-channel-requirements__row > span > small {
  margin-bottom: 0;
  font-size: 9px;
}

.review-channel-routing {
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 8px;
  margin: 8px 12px 10px;
  border: 0;
  border-radius: 4px;
  padding: 7px 9px;
  background: #f1f5fb;
}

.review-channel-routing strong,
.review-channel-routing span {
  font-size: 10px;
}

.is-review-action-bar {
  position: sticky;
  bottom: 0;
  z-index: 9;
  margin-top: 10px;
  border: 1px solid #e0e6ef;
  border-radius: 6px;
  padding: 9px 12px;
  background: rgba(255, 255, 255, .97);
  box-shadow: 0 -5px 18px rgba(35, 53, 84, .05);
}

.is-review-action-bar .intake-button {
  min-height: 34px;
}

.intake-action-bar__status {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.intake-action-bar__status > span {
  color: var(--muted);
  font-size: 11px;
}

.intake-action-bar__status > em {
  overflow: hidden;
  max-width: 360px;
  color: var(--green);
  font-size: 10px;
  font-style: normal;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.intake-button--lark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #8fb7f4;
  background: #f4f8ff;
  color: #1769e8;
}

.intake-button--markdown {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--border);
  background: #fff;
  color: #334155;
}

.intake-button--markdown:hover {
  border-color: #aebbd0;
  background: #f8fafc;
}

.intake-button--lark:hover:not(:disabled) {
  border-color: var(--blue);
  background: var(--blue-soft);
}

.intake-button--lark > span,
.intake-button--markdown > span {
  display: grid;
  width: 15px;
  height: 15px;
  place-items: center;
}

.intake-button--lark > span :deep(svg),
.intake-button--markdown > span :deep(svg) {
  width: 15px;
  height: 15px;
}

@media(max-width:1100px) {
  .review-scope-bar {
    grid-template-columns: minmax(230px, .8fr) minmax(360px, 1.4fr);
  }

  .review-payment-requirements > article > header {
    grid-template-columns: minmax(155px, .7fr) minmax(390px, 2fr) auto;
  }

  .review-channel-requirements__head,
  .review-channel-requirements__row {
    grid-template-columns: minmax(105px, 1fr) minmax(105px, .95fr) minmax(112px, 1fr) minmax(118px, 1.05fr) minmax(82px, .7fr) minmax(78px, .65fr);
    gap: 10px;
  }
}

@media(max-width:760px) {
  .is-review-step {
    padding-bottom: 66px;
  }

  .review-scope-bar {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 12px;
  }

  .review-scope-summary {
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .review-scope-summary > small {
    grid-column: 1;
  }

  .review-scope-merchants {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .review-scope-actions {
    justify-content: flex-end;
  }

  .review-dimension-card > summary {
    grid-template-columns: minmax(0, 1fr) 16px;
  }

  .review-dimension-body {
    grid-template-columns: 1fr;
    padding: 8px 12px 12px;
  }

  .review-dimension-body > section:nth-child(even):not(.is-payment-group) {
    border-left: 0;
    padding-left: 0;
  }

  .review-dimension-overview {
    grid-template-columns: 1fr;
    gap: 0;
    padding-right: 0;
    padding-left: 0;
  }

  .review-dimension-overview > div {
    grid-template-columns: 108px minmax(0, 1fr);
  }

  .review-dimension-text-rows > div {
    grid-template-columns: 108px minmax(0, 1fr);
  }

  .review-payment-requirements > article > header {
    grid-template-columns: 1fr auto;
    min-height: auto;
  }

  .review-payment-requirements > article > .review-payment-metadata {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
    margin-right: 7px;
    margin-left: 7px;
    padding: 0;
  }

  .review-payment-requirements > article > .review-payment-metadata > div {
    padding: 8px 9px;
  }

  .review-channel-requirements {
    margin: 0 7px;
  }

  .review-channel-routing {
    margin-right: 7px;
    margin-left: 7px;
  }

  .review-channel-requirements__row {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 9px;
  }

  .review-channel-requirements__row > strong::before,
  .review-channel-requirements__row > span::before {
    width: 104px;
    font-size: 8px;
  }

  .review-channel-routing {
    grid-template-columns: 1fr;
  }

  .is-review-action-bar {
    margin-right: -14px;
    margin-left: -14px;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 0;
  }

  .is-review-action-bar > div:last-child {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .intake-action-bar__status > em {
    display: none;
  }
}

.user-fee-rule-panel {
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .04);
}

.user-fee-rule-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
}

.user-fee-rule-heading h3,
.user-fee-rule-heading p {
  margin: 0;
}

.user-fee-rule-heading h3 {
  font-size: 14px;
}

.user-fee-rule-heading p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

.user-fee-rule-heading > button {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  border: 1px solid var(--blue);
  border-radius: 6px;
  padding: 0 12px;
  background: var(--blue);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.user-fee-rule-heading > button:disabled {
  border-color: #d7dee9;
  background: #e9edf3;
  color: #929dab;
  cursor: not-allowed;
}

.user-fee-rule-heading > button span {
  font-size: 17px;
  font-weight: 500;
}

.user-fee-rule-list {
  border-top: 1px solid var(--border-soft);
}

.user-fee-rule-list__header,
.user-fee-rule-row {
  display: grid;
  grid-template-columns: minmax(140px, 1.05fr) minmax(90px, .65fr) minmax(90px, .65fr) minmax(190px, 1.4fr) 78px;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
}

.tax-rule-list__header,
.tax-rule-row {
  grid-template-columns: minmax(120px, .8fr) minmax(180px, 1.2fr) minmax(120px, .8fr) 78px;
}

.user-fee-rule-list__header {
  min-height: 34px;
  background: #f8faff;
  color: var(--muted);
  font-size: 9px;
  font-weight: 800;
}

.user-fee-rule-row {
  min-height: 62px;
  border-top: 1px solid var(--border-soft);
}

.user-fee-rule-row > div:first-child,
.user-fee-rule-market {
  display: grid;
  gap: 2px;
}

.user-fee-rule-row strong {
  color: var(--text);
  font-size: 11px;
}

.user-fee-rule-row small,
.user-fee-rule-row > span {
  color: var(--muted);
  font-size: 9px;
}

.user-fee-rule-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.user-fee-rule-actions button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  color: #61718a;
}

.user-fee-rule-actions button:last-child {
  color: #b25252;
}

.user-fee-rule-actions svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.user-fee-rule-empty {
  display: grid;
  justify-items: center;
  gap: 4px;
  border-top: 1px solid var(--border-soft);
  padding: 26px 16px;
  background: #fbfcfe;
}

.user-fee-rule-empty strong {
  font-size: 11px;
}

.user-fee-rule-empty span {
  color: var(--muted);
  font-size: 10px;
}

.user-fee-rule-layer {
  position: fixed;
  inset: 0 0 0 var(--workspace-nav-width, 208px);
  z-index: 46;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(20, 31, 50, .22);
  backdrop-filter: blur(1px);
}

.user-fee-rule-dialog {
  width: min(560px, 100%);
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 20px 56px rgba(15, 23, 42, .2);
}

.user-fee-rule-dialog > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  border-bottom: 1px solid var(--border-soft);
  padding: 12px 18px;
}

.user-fee-rule-dialog > header h3,
.user-fee-rule-dialog > header p {
  margin: 0;
}

.user-fee-rule-dialog > header h3 {
  font-size: 15px;
}

.user-fee-rule-dialog > header p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

.user-fee-rule-dialog > header > button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
}

.user-fee-rule-dialog > header svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.user-fee-rule-dialog__body {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.user-fee-rule-method-summary {
  background: #fbfcfe;
}

.tax-rule-dialog {
  width: min(520px, 100%);
}

.tax-rule-option-field > div {
  gap: 10px;
}

.tax-rule-option-field button {
  display: grid;
  align-content: center;
  justify-items: start;
  min-height: 56px;
  gap: 3px;
  padding: 8px 12px;
  text-align: left;
}

.tax-rule-option-field button strong {
  font-size: 11px;
}

.tax-rule-option-field button small {
  color: var(--muted);
  font-size: 9px;
  font-weight: 500;
}

.tax-rule-option-field button.is-active small {
  color: #5276ad;
}

.user-fee-rule-scope {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.user-fee-mode-field {
  display: grid;
  gap: 7px;
}

.user-fee-mode-field > span {
  color: #536078;
  font-size: 10px;
  font-weight: 750;
}

.user-fee-mode-field i {
  color: #d84c4c;
  font-style: normal;
}

.user-fee-mode-field > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.user-fee-mode-field button {
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--soft);
  color: #59677b;
  font-size: 11px;
  font-weight: 750;
}

.user-fee-mode-field button.is-active {
  border-color: var(--blue);
  background: var(--blue-soft);
  color: var(--blue);
  box-shadow: inset 0 0 0 1px rgba(18, 103, 241, .14);
}

.user-fee-input-with-unit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
}

.user-fee-input-with-unit:focus-within {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(18, 103, 241, .1);
}

.user-fee-input-with-unit input {
  height: 38px;
  border: 0;
  padding: 0 11px;
  outline: 0;
}

.user-fee-input-with-unit em {
  display: grid;
  place-items: center;
  border-left: 1px solid var(--border-soft);
  background: var(--soft);
  color: #536078;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}

.user-fee-fixed-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 10px;
}

.user-fee-rule-dialog > footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--border-soft);
  padding: 12px 18px;
  background: #fbfcfe;
}

@media(max-width: 900px) {
  .user-fee-rule-layer {
    left: 0;
  }
}

@media(max-width: 760px) {
  .user-fee-rule-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .user-fee-rule-heading > button {
    justify-content: center;
    width: 100%;
  }

  .user-fee-rule-list__header {
    display: none;
  }

  .user-fee-rule-list {
    display: grid;
    gap: 8px;
    padding: 10px;
  }

  .user-fee-rule-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 10px;
    background: var(--soft);
  }

  .user-fee-rule-row > div:first-child,
  .user-fee-rule-row > .user-fee-rule-market,
  .user-fee-rule-row > strong {
    grid-column: 1;
  }

  .user-fee-rule-row > span {
    grid-column: 1;
  }

  .user-fee-rule-actions {
    grid-column: 2;
    grid-row: 1 / 4;
    align-self: center;
  }

  .user-fee-rule-layer {
    inset: 0;
    align-items: end;
    padding: 0;
  }

  .user-fee-rule-dialog {
    width: 100%;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 8px 8px 0 0;
  }

  .user-fee-fixed-fields {
    grid-template-columns: 1fr;
  }

  .user-fee-rule-scope {
    grid-template-columns: 1fr;
  }
}
</style>
