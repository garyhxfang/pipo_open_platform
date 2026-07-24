<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  capabilities,
  environmentOptions,
  integrationOptions,
  marketOptions,
  merchantTypeOptions,
  productOptions,
  subscriptionManagementGroups,
  subscriptionPaymentAbilityGroups,
  agreementPaymentAbilityGroups,
  supportStatusLabel,
  visiblePaymentAbilityGroups,
  type CapabilityItem,
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
  demoBusinesses,
  intakeStageOptions,
  intakeTypeOptions,
  nonAcquiringCapabilities,
  type AgileIntakeDraft,
  type IntakeStageId,
  type IntakeStep,
  type IntakeType,
  type PaymentBindingMode,
  type PaymentCardType,
  type PaymentChannelRequirement,
  type PaymentMethodRequirement,
  type SelectedCapability
} from './agileIntakeData'

const props = defineProps<{
  capabilityConfig: CapabilityConfigPayloadV4
}>()

const emit = defineEmits<{
  goMap: []
}>()

let paymentChannelSequence = 0

interface CatalogItem extends SelectedCapability {
  description: string
  accent?: string
  initial?: string
  paymentMethodType?: string
}

const storageKey = 'capability-map.agile-intake.v1'
const draft = ref<AgileIntakeDraft>(createDefaultAgileDraft())
const activeStage = ref<IntakeStageId>('acquiring')
const searchQuery = ref('')
const statusFilter = ref<'all' | SupportStatus>('all')
const selectedOnly = ref(false)
const submittedId = ref('')
const draftRestored = ref(false)
const showPaymentMethodPicker = ref(false)
const showPaymentMethodEditor = ref(false)
const paymentMethodPickerEditingId = ref('')
const editingPaymentMethodId = ref('')
const paymentMethodEditor = ref<PaymentMethodRequirement>(createPaymentMethodRequirement())
const paymentMethodPickerCountry = ref<'All' | PaymentMethodRequirement['country']>('All')
const paymentMethodPickerType = ref<'All' | 'card' | 'passThroughWallet' | 'wallet' | 'bankTransfer' | 'localPayment'>('All')

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
  GB: ['GBP', 'EUR', 'USD']
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

const paymentMethodTypeLabels: Record<string, string> = {
  card: '银行卡',
  passThroughWallet: 'Pass-through Wallet',
  wallet: '电子钱包',
  bankTransfer: '银行转账',
  localPayment: '本地支付方式'
}

const domainLabels: Record<DomainId, string> = {
  transaction: '交易',
  cashier: '收银',
  gn: 'GN'
}

const iconSvg = {
  business: '<svg viewBox="0 0 24 24"><path d="M4 20V7.5h10V20M14 11h6v9M7.5 11h3M7.5 15h3M17 14h1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  product: '<svg viewBox="0 0 24 24"><path d="M6 8.5h12l1 11H5l1-11ZM9 8.5V7a3 3 0 0 1 6 0v1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  merchant: '<svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.8 19c.6-3.7 2.7-5.5 6.2-5.5 2.1 0 3.7.7 4.7 2M15 13.5h5v5h-5zM16.5 16h2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  capability: '<svg viewBox="0 0 24 24"><path d="M9.5 4H5v5a2.5 2.5 0 1 1 0 5v5h5a2.5 2.5 0 1 0 5 0h4v-5a2.5 2.5 0 1 0 0-5V4h-4a2.5 2.5 0 1 1-5.5 0Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  intake: '<svg viewBox="0 0 24 24"><path d="M5 4.5h10l4 4V20H5zM15 4.5V9h4M8.5 13h7M8.5 16.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15 15 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  success: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8 12.2 2.6 2.6 5.7-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}

const selectedBusiness = computed(() => demoBusinesses.find((item) => item.id === draft.value.businessId))

const availableProducts = computed(() => {
  if (draft.value.intakeType === 'newProduct') {
    const existing = selectedBusiness.value?.products ?? []
    return productOptions.filter((option) => !existing.includes(option.value))
  }
  if (draft.value.intakeType === 'newMerchantAccount' || draft.value.intakeType === 'capabilityExpansion') {
    const existing = selectedBusiness.value?.products ?? []
    return productOptions.filter((option) => existing.includes(option.value))
  }
  return productOptions
})

const availableAccounts = computed(() =>
  (selectedBusiness.value?.accounts ?? []).filter((account) => account.products.includes(draft.value.product))
)

const selectedAccount = computed(() =>
  selectedBusiness.value?.accounts.find((account) => account.id === draft.value.merchantAccountId)
)

const stepOneValid = computed(() => {
  if (!draft.value.product) return false
  if (draft.value.intakeType === 'newBusiness') return Boolean(draft.value.businessName.trim())
  if (!draft.value.businessId) return false
  if (draft.value.intakeType === 'capabilityExpansion') return Boolean(draft.value.merchantAccountId)
  return true
})

const stepTwoValid = computed(() =>
  Boolean(draft.value.merchantType && draft.value.merchantContractingCountry !== 'All')
)

const stepThreeValid = computed(() => Boolean(draft.value.environment && draft.value.integrationMode))

const currentStepValid = computed(() => {
  if (draft.value.currentStep === 1) return stepOneValid.value
  if (draft.value.currentStep === 2) return stepTwoValid.value
  if (draft.value.currentStep === 3) return stepThreeValid.value
  return true
})

const scenarioContext = computed(() => ({
  merchantType: draft.value.merchantType,
  product: draft.value.product,
  environment: draft.value.environment,
  integrationMode: draft.value.integrationMode,
  merchantContractingCountry: draft.value.merchantContractingCountry,
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
  if (draft.value.product === 'agreementDeduction') return agreementPaymentAbilityGroups
  return visiblePaymentAbilityGroups
})

function paymentAbilityCatalog(option: PaymentAbilityOption, group: string): CatalogItem {
  const featureId = option.value as CapabilityFeatureId
  return {
    id: `ability:${option.value}`,
    name: option.label,
    description: '按当前业务场景评估该产品能力的可用性',
    stage: 'acquiring',
    group,
    status: capabilityStatus(featureId, option.status),
    responsibleDomains: abilityDomains(featureId)
  }
}

function paymentMethodCategory(item: CapabilityItem) {
  if (item.id === 'apple-pay' || item.id === 'google-pay') return 'passThroughWallet'
  return item.paymentMethodType ?? 'localPayment'
}

function createPaymentChannelRequirement(overrides: Partial<PaymentChannelRequirement> = {}): PaymentChannelRequirement {
  paymentChannelSequence += 1
  return {
    id: `payment-channel:${Date.now()}:${paymentChannelSequence}`,
    channelName: '',
    reuseExistingAccount: true,
    brandName: '',
    ...overrides
  }
}

function createPaymentMethodRequirement(): PaymentMethodRequirement {
  return {
    id: '',
    paymentMethodId: 'visa',
    country: 'US',
    currency: 'USD',
    bindingMode: 'none',
    cardTypes: ['credit', 'debit'],
    channels: [createPaymentChannelRequirement()],
    channelRoutingRequirement: ''
  }
}

const paymentMethodItems = computed(() => capabilities.filter((item) => item.category === 'payment'))

const paymentMethodPickerTypeOptions = [
  { value: 'All', label: '全部类型' },
  { value: 'card', label: '银行卡' },
  { value: 'passThroughWallet', label: 'Pass-through Wallet' },
  { value: 'wallet', label: '电子钱包' },
  { value: 'bankTransfer', label: '银行转账' },
  { value: 'localPayment', label: '本地支付方式' }
] as const

const filteredPaymentMethodItems = computed(() =>
  paymentMethodItems.value.filter((item) => {
    if (paymentMethodPickerType.value !== 'All' && paymentMethodCategory(item) !== paymentMethodPickerType.value) return false
    if (paymentMethodPickerCountry.value !== 'All' && item.marketStatus[paymentMethodPickerCountry.value] === 'unsupported') return false
    return true
  })
)

const editorPaymentMethod = computed(() =>
  paymentMethodItems.value.find((item) => item.id === paymentMethodEditor.value.paymentMethodId)
)

const editorRequiresCardType = computed(() => {
  const method = editorPaymentMethod.value
  if (!method) return false
  return paymentMethodCategory(method) === 'card' || paymentMethodCategory(method) === 'passThroughWallet'
})

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
  if (paymentMethodEditor.value.channels.some((channel) => !channel.reuseExistingAccount && !channel.brandName.trim())) {
    return '新开渠道账号时，请填写 Brand name。'
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

function openPaymentMethodPicker() {
  paymentMethodPickerEditingId.value = ''
  paymentMethodPickerCountry.value = draft.value.consumerPaymentCountry
  paymentMethodPickerType.value = 'All'
  showPaymentMethodPicker.value = true
}

function closePaymentMethodPicker() {
  showPaymentMethodPicker.value = false
  paymentMethodPickerEditingId.value = ''
}

function selectPaymentMethodFromPicker(method: CapabilityItem) {
  const selectedCountry = paymentMethodPickerCountry.value !== 'All'
    ? paymentMethodPickerCountry.value
    : draft.value.consumerPaymentCountry !== 'All'
      ? draft.value.consumerPaymentCountry
      : (marketOptions.find((market) => market !== 'All' && method.marketStatus[market] !== 'unsupported') as PaymentMethodRequirement['country'] | undefined) ?? 'US'

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
  return draft.value.paymentMethodRequirements.some(
    (item) =>
      item.id !== paymentMethodPickerEditingId.value &&
      item.paymentMethodId === method.id &&
      item.country === paymentMethodPickerCountry.value
  )
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
  paymentMethodEditor.value.cardTypes = requiresCardType ? ['credit', 'debit'] : []
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

function updateChannelAccountReuse(channel: PaymentChannelRequirement, reuseExistingAccount: boolean) {
  channel.reuseExistingAccount = reuseExistingAccount
  if (reuseExistingAccount) channel.brandName = ''
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
      brandName: channel.reuseExistingAccount ? '' : channel.brandName.trim()
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

const valueAddedFeatureIds: Record<string, CapabilityFeatureId> = {
  fx: 'currencyExchange',
  tax: 'taxCalculation',
  'user-fee': 'userFee',
  marketing: 'marketing'
}

function acquiringCatalog(): CatalogItem[] {
  const abilities = activePaymentAbilityGroups.value.flatMap((group) =>
    group.options.map((option) => paymentAbilityCatalog(option, group.title))
  )
  const services = capabilities
    .filter((item) => item.category === 'valueAdded')
    .map<CatalogItem>((item) => {
      const featureId = valueAddedFeatureIds[item.id]
      return {
        id: `service:${item.id}`,
        name: item.name,
        description: item.description,
        stage: 'acquiring',
        group: '增值服务',
        status: featureId ? capabilityStatus(featureId, item.serviceStatus ?? 'standard') : item.serviceStatus ?? 'standard',
        responsibleDomains: featureId ? abilityDomains(featureId) : ['transaction'],
        accent: item.accent,
        initial: item.initial
      }
    })
  return [...abilities, ...services]
}

const currentCatalog = computed<CatalogItem[]>(() => {
  if (activeStage.value === 'acquiring') return acquiringCatalog()
  return nonAcquiringCapabilities
    .filter((item) => item.stage === activeStage.value)
    .filter((item) => !item.platformOnly || draft.value.merchantType === 'platformMerchant')
    .map((item) => ({ ...item }))
})

const filteredCatalog = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  return currentCatalog.value.filter((item) => {
    if (keyword && !`${item.name}${item.group}${item.description}`.toLowerCase().includes(keyword)) return false
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) return false
    if (selectedOnly.value && !isSelected(item.id)) return false
    return true
  })
})

const groupedCatalog = computed(() => {
  const groups = new Map<string, CatalogItem[]>()
  for (const item of filteredCatalog.value) {
    const entries = groups.get(item.group) ?? []
    entries.push(item)
    groups.set(item.group, entries)
  }
  return [...groups.entries()].map(([name, items]) => ({ name, items }))
})

const allLiveCatalog = computed(() => {
  const acquiring = acquiringCatalog()
  const others = nonAcquiringCapabilities
    .filter((item) => !item.platformOnly || draft.value.merchantType === 'platformMerchant')
    .map<CatalogItem>((item) => ({ ...item }))
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

const statusSummary = computed(() => ({
  standard: hydratedSelected.value.filter((item) => item.status === 'standard').length,
  conditional: hydratedSelected.value.filter((item) => item.status === 'conditional').length,
  unsupported: hydratedSelected.value.filter((item) => item.status === 'unsupported').length
}))

const businessDisplayName = computed(() =>
  draft.value.intakeType === 'newBusiness' ? draft.value.businessName : selectedBusiness.value?.name ?? '-'
)

const productDisplayName = computed(() =>
  productOptions.find((item) => item.value === draft.value.product)?.label ?? '-'
)

const merchantTypeDisplayName = computed(() =>
  merchantTypeOptions.find((item) => item.value === draft.value.merchantType)?.label ?? '-'
)

function isSelected(id: string) {
  return draft.value.selectedCapabilities.some((item) => item.id === id)
}

function toggleCapability(item: CatalogItem) {
  if (isSelected(item.id)) {
    draft.value.selectedCapabilities = draft.value.selectedCapabilities.filter((selected) => selected.id !== item.id)
    return
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

function selectIntakeType(type: IntakeType) {
  draft.value.intakeType = type
  draft.value.businessName = ''
  draft.value.businessId = type === 'newBusiness' ? '' : demoBusinesses[0].id
  draft.value.merchantAccountId = ''
  syncAvailableProduct()
}

function selectBusiness(businessId: string) {
  draft.value.businessId = businessId
  draft.value.merchantAccountId = ''
  syncAvailableProduct()
}

function selectProduct(product: ProductType) {
  draft.value.product = product
  if (!availableAccounts.value.some((item) => item.id === draft.value.merchantAccountId)) {
    draft.value.merchantAccountId = ''
  }
}

function selectMerchantAccount(accountId: string) {
  draft.value.merchantAccountId = accountId
  const account = selectedBusiness.value?.accounts.find((item) => item.id === accountId)
  if (draft.value.intakeType === 'capabilityExpansion' && account) {
    draft.value.merchantType = account.merchantType
    draft.value.merchantContractingCountry = account.country
  }
}

function syncAvailableProduct() {
  const first = availableProducts.value[0]
  if (first && !availableProducts.value.some((item) => item.value === draft.value.product)) {
    draft.value.product = first.value
  }
}

function goToStep(step: IntakeStep) {
  if (step < draft.value.currentStep) draft.value.currentStep = step
}

function nextStep() {
  if (!currentStepValid.value || draft.value.currentStep >= 4) return
  draft.value.currentStep = (draft.value.currentStep + 1) as IntakeStep
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function previousStep() {
  if (draft.value.currentStep <= 1) return
  draft.value.currentStep = (draft.value.currentStep - 1) as IntakeStep
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function submitRequest() {
  submittedId.value = `AR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`
  localStorage.removeItem(storageKey)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function createAnother() {
  draft.value = createDefaultAgileDraft()
  activeStage.value = 'acquiring'
  submittedId.value = ''
}

function restoreDraft() {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return
    const parsed = JSON.parse(stored) as Partial<AgileIntakeDraft>
    draft.value = { ...createDefaultAgileDraft(), ...parsed }
    draft.value.paymentMethodRequirements = (draft.value.paymentMethodRequirements ?? []).map((item) => {
      const legacy = item as PaymentMethodRequirement & {
        openNewChannelAccount?: boolean
        brandName?: string
      }
      const channels = Array.isArray(legacy.channels) && legacy.channels.length
        ? legacy.channels.map((channel) => createPaymentChannelRequirement(channel))
        : [
            createPaymentChannelRequirement({
              channelName: legacy.openNewChannelAccount ? '待开通渠道' : '默认渠道',
              reuseExistingAccount: !legacy.openNewChannelAccount,
              brandName: legacy.openNewChannelAccount ? legacy.brandName ?? '' : ''
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
    draft.value.selectedCapabilities = (draft.value.selectedCapabilities ?? []).filter((item) => !item.id.startsWith('method:'))
    draftRestored.value = true
  } catch {
    localStorage.removeItem(storageKey)
  }
}

watch(
  draft,
  (value) => {
    if (!submittedId.value) localStorage.setItem(storageKey, JSON.stringify(value))
  },
  { deep: true }
)

watch([showPaymentMethodEditor, showPaymentMethodPicker], ([editorOpen, pickerOpen]) => {
  document.body.style.overflow = editorOpen || pickerOpen ? 'hidden' : ''
})

onMounted(restoreDraft)
onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <main class="intake-shell">
    <section v-if="submittedId" class="intake-success" aria-live="polite">
      <span class="intake-success__icon" aria-hidden="true" v-html="iconSvg.success"></span>
      <span class="intake-success__eyebrow">模拟提交成功</span>
      <h1>敏捷接入需求已创建</h1>
      <p>需求编号 <strong>{{ submittedId }}</strong>，已进入交易、收银与 GN 并行评估流程。</p>
      <div class="intake-success__actions">
        <button class="intake-button intake-button--secondary" type="button" @click="emit('goMap')">返回能力地图</button>
        <button class="intake-button intake-button--primary" type="button" @click="createAnother">创建新需求</button>
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
        <span class="draft-state"><i></i>{{ draftRestored ? '已恢复本地草稿' : '草稿自动保存' }}</span>
      </header>

      <nav class="intake-steps" aria-label="提需步骤">
        <template v-for="step in 4" :key="step">
          <button
            class="intake-step"
            :class="{ 'is-active': draft.currentStep === step, 'is-complete': draft.currentStep > step }"
            type="button"
            :disabled="step > draft.currentStep"
            @click="goToStep(step as IntakeStep)"
          >
            <span>{{ draft.currentStep > step ? '✓' : step }}</span>
            <strong>{{ ['接入范围', '业务信息', '能力方案', '确认提交'][step - 1] }}</strong>
          </button>
          <i v-if="step < 4" class="intake-step-line" :class="{ 'is-complete': draft.currentStep > step }"></i>
        </template>
      </nav>

      <section v-if="draft.currentStep === 1" class="intake-step-content">
        <div class="intake-section-heading">
          <div>
            <span>STEP 1</span>
            <h2>选择本次需求发生变化的最高层级</h2>
          </div>
          <p>四种接入范围决定后续需要补充的业务信息。</p>
        </div>

        <div class="intake-type-grid">
          <button
            v-for="option in intakeTypeOptions"
            :key="option.value"
            class="intake-type-card"
            :class="{ 'is-active': draft.intakeType === option.value }"
            type="button"
            :aria-pressed="draft.intakeType === option.value"
            @click="selectIntakeType(option.value)"
          >
            <span class="intake-level">{{ option.level }}</span>
            <span class="intake-type-radio" aria-hidden="true"></span>
            <span class="intake-type-icon" aria-hidden="true" v-html="iconSvg[option.icon]"></span>
            <strong>{{ option.title }}</strong>
            <p>{{ option.description }}</p>
          </button>
        </div>

        <section class="intake-form-panel" aria-labelledby="access-info-title">
          <div class="intake-form-heading">
            <h3 id="access-info-title">接入信息</h3>
            <span>根据所选范围填写</span>
          </div>
          <div class="intake-form-grid">
            <label v-if="draft.intakeType === 'newBusiness'" class="intake-field">
              <span>业务名称 <i>*</i></span>
              <input v-model="draft.businessName" type="text" placeholder="请输入新业务名称" />
            </label>
            <label v-else class="intake-field">
              <span>已有业务 <i>*</i></span>
              <select :value="draft.businessId" @change="selectBusiness(($event.target as HTMLSelectElement).value)">
                <option v-for="business in demoBusinesses" :key="business.id" :value="business.id">{{ business.name }}</option>
              </select>
            </label>
            <label class="intake-field">
              <span>收单支付产品 <i>*</i></span>
              <select :value="draft.product" @change="selectProduct(($event.target as HTMLSelectElement).value as ProductType)">
                <option v-for="product in availableProducts" :key="product.value" :value="product.value">{{ product.label }}</option>
              </select>
              <small v-if="draft.intakeType === 'newProduct'">仅展示当前业务尚未接入的产品</small>
            </label>
            <label v-if="draft.intakeType === 'capabilityExpansion'" class="intake-field">
              <span>目标商户号 <i>*</i></span>
              <select :value="draft.merchantAccountId" @change="selectMerchantAccount(($event.target as HTMLSelectElement).value)">
                <option value="">请选择商户号</option>
                <option v-for="account in availableAccounts" :key="account.id" :value="account.id">
                  {{ account.name }}（{{ account.id }}）
                </option>
              </select>
            </label>
          </div>
          <p v-if="!stepOneValid" class="intake-validation">请完成带 * 的接入信息后继续。</p>
        </section>
      </section>

      <section v-else-if="draft.currentStep === 2" class="intake-step-content intake-step-content--narrow">
        <div class="intake-section-heading">
          <div>
            <span>STEP 2</span>
            <h2>补充业务主体信息</h2>
          </div>
          <p>支付环境和集成模式将在能力方案中选择。</p>
        </div>

        <section class="business-context-card">
          <div class="business-context-summary">
            <span>本次接入</span>
            <strong>{{ businessDisplayName }}</strong>
            <p>{{ productDisplayName }} · {{ intakeTypeOptions.find((item) => item.value === draft.intakeType)?.title }}</p>
          </div>
          <div class="business-context-fields">
            <div class="intake-field">
              <span>商户类型 <i>*</i></span>
              <div v-if="draft.intakeType === 'capabilityExpansion'" class="read-only-field">
                {{ merchantTypeDisplayName }}
                <small>已根据目标商户号带入</small>
              </div>
              <div v-else class="intake-segmented">
                <button
                  v-for="option in merchantTypeOptions"
                  :key="option.value"
                  type="button"
                  :class="{ 'is-active': draft.merchantType === option.value }"
                  @click="draft.merchantType = option.value"
                >{{ option.label }}</button>
              </div>
            </div>
            <label class="intake-field">
              <span>商户签约国家/地区 <i>*</i></span>
              <div v-if="draft.intakeType === 'capabilityExpansion'" class="read-only-field">
                {{ selectedAccount?.country ?? draft.merchantContractingCountry }}
                <small>已根据目标商户号带入</small>
              </div>
              <select v-else v-model="draft.merchantContractingCountry">
                <option value="All" disabled>请选择国家/地区</option>
                <option v-for="market in marketOptions.filter((item) => item !== 'All')" :key="market" :value="market">{{ market }}</option>
              </select>
            </label>
          </div>
          <p v-if="!stepTwoValid" class="intake-validation">请选择商户类型和商户签约国家/地区。</p>
        </section>
      </section>

      <section v-else-if="draft.currentStep === 3" class="intake-step-content">
        <div class="intake-section-heading">
          <div>
            <span>STEP 3</span>
            <h2>选择能力方案</h2>
          </div>
          <p>不支持项仍可选择，并会自动标记为能力建设需求。</p>
        </div>

        <nav class="capability-stage-tabs" aria-label="能力环节">
          <button
            v-for="stage in intakeStageOptions"
            :key="stage.id"
            type="button"
            :class="{ 'is-active': activeStage === stage.id }"
            @click="activeStage = stage.id"
          >
            {{ stage.label }}
            <span>{{ selectedByStage.get(stage.id)?.length ?? 0 }}</span>
          </button>
        </nav>

        <section v-if="activeStage === 'acquiring'" class="base-integration-panel">
          <div class="base-integration-heading">
            <div>
              <h3>基础接入</h3>
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
                :class="{ 'is-active': draft.environment === option.value }"
                @click="draft.environment = option.value"
              >
                <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
                <em :class="`intake-status intake-status--${scenarioCombinationStatus(capabilityConfig, { ...scenarioContext, environment: option.value })}`">
                  {{ supportStatusLabel[scenarioCombinationStatus(capabilityConfig, { ...scenarioContext, environment: option.value })] }}
                </em>
              </button>
            </div>
          </div>
          <div class="base-integration-row">
            <div class="base-integration-label"><strong>集成模式</strong><span>单选</span></div>
            <div class="base-integration-options base-integration-options--three">
              <button
                v-for="option in integrationOptions"
                :key="option.value"
                type="button"
                :class="{ 'is-active': draft.integrationMode === option.value }"
                @click="draft.integrationMode = option.value"
              >
                <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
                <em :class="`intake-status intake-status--${scenarioCombinationStatus(capabilityConfig, { ...scenarioContext, integrationMode: option.value })}`">
                  {{ supportStatusLabel[scenarioCombinationStatus(capabilityConfig, { ...scenarioContext, integrationMode: option.value })] }}
                </em>
              </button>
            </div>
          </div>
        </section>

        <section v-if="activeStage === 'acquiring'" class="payment-requirement-panel" aria-labelledby="payment-requirement-title">
          <div class="payment-requirement-heading">
            <div>
              <h3 id="payment-requirement-title">支付方式</h3>
              <p>按国家维护支付方式、币种与接入要求。同一支付方式在同一国家仅保留一条记录。</p>
            </div>
            <button class="add-payment-method-button" type="button" @click="openPaymentMethodPicker">
              <span aria-hidden="true">+</span>添加支付方式
            </button>
          </div>

          <div v-if="draft.paymentMethodRequirements.length" class="payment-requirement-list">
            <div class="payment-requirement-list__header" aria-hidden="true">
              <span>支付方式</span><span>国家/币种</span><span>接入要求</span><span>支持情况</span><span>操作</span>
            </div>
            <article v-for="requirement in draft.paymentMethodRequirements" :key="requirement.id" class="payment-requirement-row">
              <div class="payment-requirement-method">
                <strong>{{ paymentRequirementName(requirement) }}</strong>
                <span>/</span>
                <small>{{ paymentMethodTypeLabels[paymentMethodCategory(paymentMethodItems.find((item) => item.id === requirement.paymentMethodId)!)] }}</small>
              </div>
              <div class="payment-requirement-country"><strong>{{ requirement.country }}</strong><span>·</span><small>{{ requirement.currency }}</small></div>
              <div class="payment-requirement-tags payment-requirement-tags--requirements">
                <span class="payment-requirement-binding">{{ bindingModeLabel(requirement.bindingMode) }}</span>
                <span v-for="cardType in requirement.cardTypes" :key="cardType">{{ cardTypeLabel(cardType) }}</span>
                <span>{{ requirement.channels.length }} 个支付渠道</span>
                <span v-if="requirement.channels.some((channel) => !channel.reuseExistingAccount)">含新开渠道账号</span>
              </div>
              <em :class="`intake-status intake-status--${paymentRequirementStatus(requirement)}`">{{ supportStatusLabel[paymentRequirementStatus(requirement)] }}</em>
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
          v-if="showPaymentMethodPicker"
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
                <p>先选择支付方式，再配置币种和接入要求。</p>
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
              <div v-if="filteredPaymentMethodItems.length" class="payment-method-picker__grid">
                <button
                  v-for="method in filteredPaymentMethodItems"
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
                  <em v-if="paymentMethodAlreadyAdded(method)" class="payment-method-picker-card__added">已添加</em>
                  <em v-else :class="`intake-status intake-status--${paymentMethodStatus(method, paymentMethodPickerCountry)}`">
                    {{ supportStatusLabel[paymentMethodStatus(method, paymentMethodPickerCountry)] }}
                  </em>
                </button>
              </div>
              <div v-else class="payment-method-picker__empty">当前筛选条件下暂无支付方式。</div>
            </div>
          </section>
        </div>

        <div
          v-if="showPaymentMethodEditor"
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
              <em :class="`intake-status intake-status--${paymentRequirementStatus(paymentMethodEditor)}`">
                {{ supportStatusLabel[paymentRequirementStatus(paymentMethodEditor)] }}
              </em>
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
                    <span role="columnheader">渠道账号</span>
                    <span role="columnheader">Brand name</span>
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
                    <label class="payment-channel-reuse" role="cell">
                      <input
                        type="checkbox"
                        :checked="channel.reuseExistingAccount"
                        @change="updateChannelAccountReuse(channel, ($event.target as HTMLInputElement).checked)"
                      />
                      <span aria-hidden="true"></span>
                      <strong>复用已有渠道账号</strong>
                    </label>
                    <label v-if="!channel.reuseExistingAccount" class="payment-channel-table__field payment-channel-brand" role="cell">
                      <span>Brand name <i>*</i></span>
                      <input v-model="channel.brandName" type="text" maxlength="80" placeholder="请输入 Brand name" />
                    </label>
                    <span v-else class="payment-channel-table__empty" role="cell">—</span>
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

        <div class="capability-picker-toolbar">
          <label class="capability-search">
            <span aria-hidden="true" v-html="iconSvg.search"></span>
            <input v-model="searchQuery" type="search" placeholder="搜索能力名称或分组" />
          </label>
          <label>
            <span>状态</span>
            <select v-model="statusFilter">
              <option value="all">全部状态</option>
              <option value="standard">标准支持</option>
              <option value="conditional">条件支持</option>
              <option value="unsupported">不支持</option>
            </select>
          </label>
          <button class="selected-only-toggle" :class="{ 'is-active': selectedOnly }" type="button" @click="selectedOnly = !selectedOnly">
            <span aria-hidden="true"></span>仅看已选
          </button>
        </div>

        <div v-if="groupedCatalog.length" class="capability-picker-groups">
          <section v-for="group in groupedCatalog" :key="group.name" class="capability-picker-group">
            <div class="capability-picker-group__heading">
              <h3>{{ group.name }}</h3>
              <span>{{ group.items.length }} 项</span>
            </div>
            <div class="capability-picker-grid" :class="{ 'capability-picker-grid--methods': group.name === '支付方式' }">
              <button
                v-for="item in group.items"
                :key="item.id"
                class="capability-picker-card"
                :class="[{ 'is-active': isSelected(item.id) }, `is-${item.status}`]"
                type="button"
                :aria-pressed="isSelected(item.id)"
                @click="toggleCapability(item)"
              >
                <span v-if="item.initial" class="capability-picker-mark" :style="{ '--picker-accent': item.accent }">{{ item.initial }}</span>
                <span class="capability-picker-copy">
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.description }}</small>
                  <span class="capability-domains">{{ item.responsibleDomains.map((domain) => domainLabels[domain]).join(' · ') }}</span>
                </span>
                <span class="capability-picker-meta">
                  <em :class="`intake-status intake-status--${item.status}`">{{ supportStatusLabel[item.status] }}</em>
                  <i class="capability-check" aria-hidden="true"></i>
                </span>
              </button>
            </div>
          </section>
        </div>
        <div v-else class="capability-picker-empty">没有符合当前筛选条件的能力。</div>
      </section>

      <section v-else class="intake-step-content">
        <div class="intake-section-heading">
          <div>
            <span>STEP 4</span>
            <h2>确认并提交结构化需求</h2>
          </div>
          <p>提交后将按责任域进入并行评估，本页面仅模拟审批流程。</p>
        </div>

        <div class="intake-review-layout">
          <div class="intake-review-main">
            <section class="review-card review-overview">
              <div class="review-card-heading"><h3>接入概览</h3><button type="button" @click="draft.currentStep = 1">修改</button></div>
              <dl>
                <div><dt>接入类型</dt><dd>{{ intakeTypeOptions.find((item) => item.value === draft.intakeType)?.title }}</dd></div>
                <div><dt>业务</dt><dd>{{ businessDisplayName }}</dd></div>
                <div><dt>收单支付产品</dt><dd>{{ productDisplayName }}</dd></div>
                <div><dt>商户类型</dt><dd>{{ merchantTypeDisplayName }}</dd></div>
                <div><dt>签约国家/地区</dt><dd>{{ draft.merchantContractingCountry }}</dd></div>
                <div><dt>基础接入</dt><dd>{{ environmentOptions.find((item) => item.value === draft.environment)?.label }} · {{ integrationOptions.find((item) => item.value === draft.integrationMode)?.label }}</dd></div>
              </dl>
            </section>

            <section class="review-card">
              <div class="review-card-heading"><h3>能力清单</h3><button type="button" @click="draft.currentStep = 3">修改</button></div>
              <div v-if="hydratedSelected.length" class="review-stage-list">
                <section v-for="stage in intakeStageOptions.filter((item) => (selectedByStage.get(item.id)?.length ?? 0) > 0)" :key="stage.id">
                  <div><strong>{{ stage.label }}</strong><span>{{ selectedByStage.get(stage.id)?.length }} 项</span></div>
                  <ul>
                    <li v-for="item in selectedByStage.get(stage.id)" :key="item.id">
                      <span>{{ item.group }} · {{ item.name }}</span>
                      <em :class="`intake-status intake-status--${item.status}`">{{ supportStatusLabel[item.status] }}</em>
                    </li>
                  </ul>
                </section>
              </div>
              <div v-else class="review-empty">未选择扩展能力，将仅提交基础接入场景。</div>
            </section>
          </div>

          <aside class="intake-review-side">
            <section class="review-card support-summary">
              <h3>支持情况</h3>
              <div><span><i class="is-standard"></i>标准支持</span><strong>{{ statusSummary.standard }}</strong></div>
              <div><span><i class="is-conditional"></i>条件支持</span><strong>{{ statusSummary.conditional }}</strong></div>
              <div><span><i class="is-unsupported"></i>能力建设需求</span><strong>{{ statusSummary.unsupported }}</strong></div>
            </section>
            <section class="review-card approval-route">
              <h3>模拟审批路径</h3>
              <p>提交后由三个责任域并行评估。</p>
              <div class="approval-domains">
                <span><i>交</i><strong>交易</strong><small>产品评估</small></span>
                <span><i>收</i><strong>收银</strong><small>体验评估</small></span>
                <span><i>GN</i><strong>GN</strong><small>资金评估</small></span>
              </div>
            </section>
          </aside>
        </div>
      </section>

      <footer class="intake-action-bar">
        <span>步骤 {{ draft.currentStep }} / 4</span>
        <div>
          <button v-if="draft.currentStep > 1" class="intake-button intake-button--secondary" type="button" @click="previousStep">上一步</button>
          <button
            v-if="draft.currentStep < 4"
            class="intake-button intake-button--primary"
            type="button"
            :disabled="!currentStepValid"
            @click="nextStep"
          >下一步</button>
          <button v-else class="intake-button intake-button--primary" type="button" @click="submitRequest">提交模拟审批</button>
        </div>
      </footer>
    </template>
  </main>
</template>

<style scoped>
.intake-shell{--blue:#1267f1;--blue-soft:#eef5ff;--text:#172033;--muted:#68768d;--border:#d8e0ec;--border-soft:#e8edf5;--surface:#fff;--soft:#f8faff;--green:#27833e;--green-bg:#eaf7ed;--orange:#df820b;--orange-bg:#fff3df;--gray:#7b8797;--gray-bg:#eef2f6;min-height:100vh;padding:0 32px 32px;color:var(--text)}
button,select,input{font:inherit}.intake-header{display:flex;align-items:center;justify-content:space-between;min-height:70px;margin:0 -32px;border-bottom:1px solid var(--border-soft);padding:10px 32px;background:rgba(255,255,255,.98)}.intake-title{display:flex;align-items:center;gap:11px}.intake-title__icon{display:grid;width:32px;height:32px;place-items:center;border-radius:8px;background:var(--blue-soft);color:var(--blue)}.intake-title__icon :deep(svg){width:20px;height:20px}.intake-title h1,.intake-title p{margin:0}.intake-title h1{font-size:18px;line-height:1.35}.intake-title p{margin-top:2px;color:var(--muted);font-size:12px}.draft-state{display:flex;align-items:center;gap:7px;border:1px solid var(--border);border-radius:999px;padding:5px 10px;color:var(--muted);font-size:11px;font-weight:700}.draft-state i{width:7px;height:7px;border-radius:50%;background:#53a36a}
.intake-steps{display:flex;align-items:center;width:min(820px,100%);margin:22px auto 20px}.intake-step{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#8793a5}.intake-step>span{display:grid;width:27px;height:27px;place-items:center;border:1px solid #cdd5e2;border-radius:50%;background:#fff;font-size:12px;font-weight:800}.intake-step strong{font-size:13px;white-space:nowrap}.intake-step.is-active{color:var(--blue)}.intake-step.is-active>span{border-color:var(--blue);background:var(--blue);color:#fff}.intake-step.is-complete{color:#4774bd}.intake-step.is-complete>span{border-color:#8bb1ef;background:var(--blue-soft);color:var(--blue)}.intake-step-line{height:1px;flex:1;margin:0 8px;background:#dbe2ec}.intake-step-line.is-complete{background:#8bb1ef}
.intake-step-content{width:min(1440px,100%);margin:0 auto}.intake-step-content--narrow{width:min(1040px,100%)}.intake-section-heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:14px}.intake-section-heading>div>span{color:var(--blue);font-size:10px;font-weight:850}.intake-section-heading h2{margin:3px 0 0;font-size:18px;letter-spacing:0}.intake-section-heading>p{margin:0;color:var(--muted);font-size:12px}
.intake-type-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.intake-type-card{position:relative;display:grid;justify-items:center;min-width:0;min-height:205px;border:1px solid var(--border);border-radius:8px;padding:18px 16px;background:#fff;color:var(--text);text-align:center;transition:.16s}.intake-type-card:hover{border-color:#a7c4f4}.intake-type-card.is-active{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.22)}.intake-level{position:absolute;top:14px;left:14px;border:1px solid var(--border);border-radius:4px;padding:2px 7px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:750}.intake-type-card.is-active .intake-level{border-color:#bfd5fa;background:#fff;color:var(--blue)}.intake-type-radio{position:absolute;top:15px;right:15px;width:18px;height:18px;border:2px solid #aeb9c9;border-radius:50%;background:#fff}.intake-type-card.is-active .intake-type-radio{border:5px solid var(--blue)}.intake-type-icon{display:grid;width:66px;height:66px;margin-top:20px;place-items:center;color:var(--blue)}.intake-type-icon :deep(svg){width:56px;height:56px}.intake-type-card>strong{font-size:17px}.intake-type-card>p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
.intake-form-panel,.business-context-card,.base-integration-panel,.review-card{border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04)}.intake-form-panel{margin-top:14px;padding:16px}.intake-form-heading,.review-card-heading,.base-integration-heading{display:flex;align-items:center;justify-content:space-between}.intake-form-heading{margin-bottom:13px}.intake-form-heading h3,.review-card h3,.base-integration-heading h3{margin:0;font-size:14px}.intake-form-heading>span{color:var(--muted);font-size:11px}.intake-form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.intake-field{display:grid;align-content:start;gap:6px;min-width:0;color:var(--text);font-size:12px;font-weight:750}.intake-field>span i{color:#d84c4c;font-style:normal}.intake-field input,.intake-field select,.capability-picker-toolbar select{width:100%;height:38px;border:1px solid var(--border);border-radius:6px;padding:0 11px;background:#fff;color:var(--text);outline:none}.intake-field input:focus,.intake-field select:focus,.capability-picker-toolbar select:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(18,103,241,.1)}.intake-field small{color:var(--muted);font-size:10px;font-weight:600}.intake-validation{margin:11px 0 0;color:#b45309;font-size:11px}
.business-context-card{display:grid;grid-template-columns:250px minmax(0,1fr);overflow:hidden}.business-context-summary{padding:24px;background:#f7faff}.business-context-summary>span{color:var(--blue);font-size:10px;font-weight:850}.business-context-summary>strong{display:block;margin-top:9px;font-size:18px}.business-context-summary>p{margin:6px 0 0;color:var(--muted);font-size:12px}.business-context-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:24px}.business-context-card>.intake-validation{grid-column:1/-1;margin:0;border-top:1px solid var(--border-soft);padding:10px 24px}.intake-segmented{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));height:38px;border:1px solid var(--border);border-radius:6px;overflow:hidden}.intake-segmented button{border:0;border-left:1px solid var(--border);background:#fff;color:var(--muted);font-size:12px;font-weight:750}.intake-segmented button:first-child{border-left:0}.intake-segmented button.is-active{background:var(--blue-soft);color:var(--blue)}.read-only-field{display:flex;align-items:center;justify-content:space-between;min-height:38px;border:1px solid var(--border-soft);border-radius:6px;padding:0 11px;background:#f7f9fc}.read-only-field small{font-size:10px}
.capability-stage-tabs{display:flex;gap:4px;margin-bottom:12px;border-bottom:1px solid var(--border)}.capability-stage-tabs button{display:flex;align-items:center;gap:7px;min-height:40px;border:0;border-bottom:2px solid transparent;padding:0 14px;background:transparent;color:var(--muted);font-size:13px;font-weight:800}.capability-stage-tabs button.is-active{border-bottom-color:var(--blue);color:var(--blue)}.capability-stage-tabs button span{min-width:20px;border-radius:999px;padding:1px 6px;background:var(--gray-bg);font-size:10px;text-align:center}.capability-stage-tabs button.is-active span{background:var(--blue-soft)}
.base-integration-panel{margin-bottom:12px;overflow:hidden}.base-integration-heading{padding:13px 16px;background:#fbfcff}.base-integration-heading p{margin:3px 0 0;color:var(--muted);font-size:11px}.base-integration-heading>span{border-radius:999px;padding:3px 8px;background:var(--blue-soft);color:var(--blue);font-size:10px;font-weight:800}.base-integration-row{display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;border-top:1px solid var(--border-soft);padding:12px 16px}.base-integration-label{display:grid;align-content:center;gap:3px}.base-integration-label strong{font-size:13px}.base-integration-label span{color:var(--muted);font-size:10px}.base-integration-options{display:grid;gap:10px}.base-integration-options--two{grid-template-columns:repeat(2,minmax(0,1fr))}.base-integration-options--three{grid-template-columns:repeat(3,minmax(0,1fr))}.base-integration-options button{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px;border:1px solid var(--border);border-radius:7px;padding:7px 10px;background:var(--soft);color:var(--text);text-align:left}.base-integration-options button.is-active{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.2)}.base-integration-options button>span{display:grid;gap:2px}.base-integration-options strong{font-size:12px}.base-integration-options small{color:var(--muted);font-size:10px;line-height:1.35}
.payment-requirement-panel{margin-bottom:12px;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04);overflow:hidden}.payment-requirement-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px}.payment-requirement-heading h3,.payment-requirement-heading p{margin:0}.payment-requirement-heading h3{font-size:14px}.payment-requirement-heading p{margin-top:3px;color:var(--muted);font-size:11px;line-height:1.45}.add-payment-method-button{display:flex;align-items:center;flex:0 0 auto;gap:6px;min-height:34px;border:1px solid var(--blue);border-radius:6px;padding:0 12px;background:var(--blue);color:#fff;font-size:11px;font-weight:800}.add-payment-method-button>span{font-size:17px;font-weight:500;line-height:1}.payment-method-editor{border-top:1px solid #cfe0fa;border-bottom:1px solid #cfe0fa;padding:14px 16px;background:#f7faff}.payment-method-editor__heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.payment-method-editor__heading>div{display:flex;align-items:center;gap:8px}.payment-method-editor__heading strong{font-size:13px}.payment-method-editor__heading span{border-radius:999px;padding:2px 7px;background:var(--blue-soft);color:var(--blue);font-size:9px;font-weight:800}.payment-method-editor__heading>button{display:grid;width:26px;height:26px;place-items:center;border:0;border-radius:5px;background:transparent;color:var(--muted);font-size:20px}.payment-method-editor__heading>button:hover{background:#e8eef8;color:var(--text)}.payment-method-editor__grid{display:grid;grid-template-columns:1.35fr 1fr .8fr 1fr;gap:10px}.payment-card-type-field{display:grid;grid-template-columns:220px minmax(0,1fr);align-items:center;gap:12px;margin-top:12px;border-top:1px solid #e1eaf7;padding-top:12px}.payment-card-type-field>div:first-child{display:grid;gap:3px}.payment-card-type-field strong{font-size:11px}.payment-card-type-field strong i{color:#d84c4c;font-style:normal}.payment-card-type-field>div:first-child span{color:var(--muted);font-size:9px}.payment-card-type-options{display:flex;flex-wrap:wrap;gap:8px}.payment-card-type-options button{display:flex;align-items:center;gap:6px;min-height:31px;border:1px solid var(--border);border-radius:6px;padding:0 10px;background:#fff;color:var(--muted);font-size:10px;font-weight:750}.payment-card-type-options button>span{position:relative;width:14px;height:14px;border:1.5px solid #aeb9c9;border-radius:3px}.payment-card-type-options button.is-active{border-color:#a9c5f3;background:var(--blue-soft);color:var(--blue)}.payment-card-type-options button.is-active>span{border-color:var(--blue);background:var(--blue)}.payment-card-type-options button.is-active>span::after{content:'';position:absolute;left:3px;top:1px;width:5px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.payment-method-editor__error{margin:10px 0 0;color:#b45309;font-size:10px}.payment-method-editor__actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.payment-requirement-list{border-top:1px solid var(--border-soft)}.payment-requirement-list__header,.payment-requirement-row{display:grid;grid-template-columns:minmax(150px,1.35fr) minmax(120px,.9fr) minmax(100px,.8fr) minmax(135px,1fr) minmax(85px,.7fr) 82px;align-items:center;gap:12px}.payment-requirement-list__header{min-height:34px;padding:0 16px;background:#f8faff;color:var(--muted);font-size:9px;font-weight:800}.payment-requirement-row{min-height:66px;border-top:1px solid var(--border-soft);padding:9px 16px}.payment-requirement-method{display:flex;align-items:center;min-width:0;gap:9px}.payment-requirement-method>span{display:grid;flex:0 0 auto;width:30px;height:30px;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--payment-accent) 10%,white);color:var(--payment-accent);font-size:11px;font-weight:850}.payment-requirement-method>div,.payment-requirement-value{display:grid;min-width:0;gap:2px}.payment-requirement-method strong,.payment-requirement-value strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.payment-requirement-method small,.payment-requirement-value small,.payment-requirement-tags small{color:var(--muted);font-size:9px}.payment-requirement-tags{display:flex;flex-wrap:wrap;gap:4px}.payment-requirement-tags>span{border-radius:999px;padding:2px 6px;background:#eef2f7;color:#59677b;font-size:9px;font-weight:700}.payment-requirement-actions{display:flex;gap:4px}.payment-requirement-actions button{border:0;padding:3px;background:transparent;color:var(--blue);font-size:10px;font-weight:750}.payment-requirement-actions button:last-child{color:#a64a4a}.payment-requirement-empty{display:grid;justify-items:center;gap:4px;border-top:1px solid var(--border-soft);padding:22px;background:#fbfcfe}.payment-requirement-empty strong{font-size:11px}.payment-requirement-empty span{color:var(--muted);font-size:10px}
.capability-picker-toolbar{display:flex;align-items:end;flex-wrap:wrap;gap:10px;border:1px solid var(--border);border-radius:8px;padding:10px;background:#fff}.capability-search{display:flex;align-items:center;width:min(300px,100%);height:36px;border:1px solid var(--border);border-radius:6px;padding:0 9px}.capability-search>span{display:flex;width:17px;height:17px;color:#8090a5}.capability-search>span :deep(svg){width:17px;height:17px}.capability-search input{min-width:0;flex:1;border:0;padding:0 7px;outline:none}.capability-picker-toolbar>label:not(.capability-search){display:grid;gap:4px;min-width:120px}.capability-picker-toolbar>label>span{color:var(--muted);font-size:10px;font-weight:750}.capability-picker-toolbar select{height:36px;font-size:11px}.capability-compact-filter{min-width:170px!important}.selected-only-toggle{display:flex;align-items:center;gap:6px;height:36px;margin-left:auto;border:1px solid var(--border);border-radius:6px;padding:0 10px;background:#fff;color:var(--muted);font-size:11px;font-weight:750}.selected-only-toggle>span{width:14px;height:14px;border:1.5px solid #aab7c9;border-radius:3px}.selected-only-toggle.is-active{border-color:#b9d0f7;background:var(--blue-soft);color:var(--blue)}.selected-only-toggle.is-active>span{position:relative;border-color:var(--blue);background:var(--blue)}.selected-only-toggle.is-active>span::after{content:'';position:absolute;left:3px;top:1px;width:5px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.capability-picker-groups{display:grid;gap:12px;margin-top:12px}.capability-picker-group{border:1px solid var(--border);border-radius:8px;padding:14px;background:#fff}.capability-picker-group__heading{display:flex;align-items:center;gap:8px;margin-bottom:10px}.capability-picker-group__heading h3{margin:0;font-size:14px}.capability-picker-group__heading span{border-radius:999px;padding:2px 7px;background:var(--gray-bg);color:var(--muted);font-size:10px}.capability-picker-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.capability-picker-grid--methods{grid-template-columns:repeat(4,minmax(0,1fr))}.capability-picker-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;min-width:0;min-height:76px;gap:9px;border:1px solid var(--border);border-radius:7px;padding:10px;background:var(--soft);color:var(--text);text-align:left}.capability-picker-card:has(.capability-picker-mark){grid-template-columns:30px minmax(0,1fr) auto}.capability-picker-card:hover{border-color:#a9c5f3}.capability-picker-card.is-active{border-color:var(--blue);background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgba(18,103,241,.2)}.capability-picker-mark{display:grid;width:28px;height:28px;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--picker-accent) 10%,white);color:var(--picker-accent);font-size:12px;font-weight:850}.capability-picker-copy{display:grid;min-width:0;gap:3px}.capability-picker-copy strong{font-size:12px;line-height:1.35}.capability-picker-copy small{overflow:hidden;color:var(--muted);font-size:10px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.capability-domains{color:#8793a5;font-size:9px;font-weight:700}.capability-picker-meta{display:grid;justify-items:end;gap:9px}.capability-check{position:relative;width:15px;height:15px;border:1.5px solid #afbbcb;border-radius:3px;background:#fff}.capability-picker-card.is-active .capability-check{border-color:var(--blue);background:var(--blue)}.capability-picker-card.is-active .capability-check::after{content:'';position:absolute;left:3px;top:1px;width:5px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.capability-picker-empty{margin-top:12px;border:1px dashed var(--border);border-radius:8px;padding:36px;color:var(--muted);font-size:12px;text-align:center}
.intake-status{display:inline-flex;align-items:center;justify-content:center;width:max-content;border-radius:999px;padding:3px 8px;font-size:10px;font-style:normal;font-weight:800;white-space:nowrap}.intake-status--standard{background:var(--green-bg);color:var(--green)}.intake-status--conditional{background:var(--orange-bg);color:var(--orange)}.intake-status--unsupported{background:var(--gray-bg);color:var(--gray)}
.intake-review-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;align-items:start;gap:14px}.intake-review-main,.intake-review-side{display:grid;gap:12px}.review-card{padding:16px}.review-card-heading{margin-bottom:13px}.review-card-heading button{border:0;background:transparent;color:var(--blue);font-size:11px;font-weight:750}.review-overview dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:0;background:var(--border-soft)}.review-overview dl>div{min-width:0;padding:11px;background:#fff}.review-overview dt{color:var(--muted);font-size:10px}.review-overview dd{overflow:hidden;margin:5px 0 0;font-size:12px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.review-stage-list{display:grid;gap:12px}.review-stage-list>section>div{display:flex;align-items:center;gap:7px;margin-bottom:6px}.review-stage-list>section>div strong{font-size:12px}.review-stage-list>section>div span{border-radius:999px;padding:1px 6px;background:var(--gray-bg);color:var(--muted);font-size:9px}.review-stage-list ul{display:grid;gap:1px;margin:0;padding:0;list-style:none;background:var(--border-soft)}.review-stage-list li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:#fff;font-size:11px}.review-empty{border:1px dashed var(--border);border-radius:6px;padding:22px;color:var(--muted);font-size:11px;text-align:center}.support-summary{display:grid;gap:10px}.support-summary>div{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-soft);padding-top:9px}.support-summary>div span{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:11px}.support-summary>div i{width:7px;height:7px;border-radius:50%}.support-summary .is-standard{background:var(--green)}.support-summary .is-conditional{background:var(--orange)}.support-summary .is-unsupported{background:var(--gray)}.approval-route>p{margin:5px 0 12px;color:var(--muted);font-size:11px}.approval-domains{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.approval-domains>span{display:grid;justify-items:center;gap:3px;border:1px solid var(--border-soft);border-radius:7px;padding:9px 4px;background:var(--soft)}.approval-domains i{display:grid;width:26px;height:26px;place-items:center;border-radius:7px;background:var(--blue-soft);color:var(--blue);font-size:9px;font-style:normal;font-weight:850}.approval-domains strong{font-size:11px}.approval-domains small{color:var(--muted);font-size:9px}
.intake-action-bar{display:flex;align-items:center;justify-content:space-between;width:min(1440px,100%);margin:16px auto 0;border-top:1px solid var(--border);padding-top:12px}.intake-action-bar>span{color:var(--muted);font-size:11px}.intake-action-bar>div,.intake-success__actions{display:flex;gap:9px}.intake-button{min-height:36px;border-radius:6px;padding:0 16px;font-size:12px;font-weight:800}.intake-button--secondary{border:1px solid var(--border);background:#fff;color:var(--text)}.intake-button--primary{border:1px solid var(--blue);background:var(--blue);color:#fff}.intake-button:disabled{cursor:not-allowed;opacity:.45}.intake-success{display:grid;justify-items:center;width:min(620px,calc(100% - 32px));margin:90px auto;border:1px solid var(--border);border-radius:8px;padding:48px;background:#fff;text-align:center;box-shadow:0 16px 42px rgba(15,23,42,.08)}.intake-success__icon{display:grid;width:58px;height:58px;place-items:center;border-radius:50%;background:var(--green-bg);color:var(--green)}.intake-success__icon :deep(svg){width:34px;height:34px}.intake-success__eyebrow{margin-top:17px;color:var(--green);font-size:11px;font-weight:850}.intake-success h1{margin:6px 0 0;font-size:22px}.intake-success p{margin:8px 0 22px;color:var(--muted);font-size:12px}.intake-success p strong{color:var(--text)}
@media(max-width:1180px){.intake-type-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.intake-type-card{min-height:180px}.capability-picker-grid,.capability-picker-grid--methods{grid-template-columns:repeat(2,minmax(0,1fr))}.intake-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.intake-shell{padding:0 14px 22px}.intake-header{align-items:flex-start;flex-direction:column;gap:9px;margin:0 -14px;padding:10px 14px}.draft-state{align-self:flex-start;margin-left:43px}.intake-title p{max-width:290px}.intake-steps{overflow-x:auto;margin:14px 0}.intake-step{flex:0 0 auto}.intake-step-line{flex:0 0 24px}.intake-section-heading{align-items:flex-start;flex-direction:column;gap:5px}.intake-section-heading>p{line-height:1.45}.intake-type-grid,.intake-form-grid,.business-context-fields,.capability-picker-grid,.capability-picker-grid--methods,.intake-review-layout{grid-template-columns:1fr}.intake-type-card{min-height:164px}.business-context-card{grid-template-columns:1fr}.base-integration-row{grid-template-columns:1fr}.base-integration-options--two,.base-integration-options--three{grid-template-columns:1fr}.capability-stage-tabs{overflow-x:auto}.capability-stage-tabs button{flex:0 0 auto}.capability-picker-toolbar{align-items:stretch;flex-direction:column}.capability-search,.capability-picker-toolbar>label:not(.capability-search){width:100%;max-width:none}.selected-only-toggle{justify-content:center;margin-left:0}.review-overview dl{grid-template-columns:1fr}.intake-action-bar{position:sticky;bottom:0;z-index:8;margin-right:-14px;margin-left:-14px;width:auto;padding:10px 14px;background:rgba(245,247,251,.97)}.capability-picker-card:has(.capability-picker-mark){grid-template-columns:30px minmax(0,1fr) auto}}
@media(max-width:760px){.payment-requirement-heading{align-items:flex-start;flex-direction:column}.add-payment-method-button{width:100%;justify-content:center}.payment-method-editor__grid{grid-template-columns:1fr}.payment-card-type-field{grid-template-columns:1fr}.payment-requirement-list__header{display:none}.payment-requirement-list{display:grid;gap:9px;border-top:1px solid var(--border-soft);padding:10px}.payment-requirement-row{grid-template-columns:minmax(0,1fr) auto;gap:9px;border:1px solid var(--border);border-radius:7px;padding:10px;background:var(--soft)}.payment-requirement-method{grid-column:1/-1}.payment-requirement-value,.payment-requirement-tags{min-height:30px;border-top:1px solid var(--border-soft);padding-top:7px}.payment-requirement-row>.intake-status{align-self:center}.payment-requirement-actions{justify-self:end}.payment-requirement-actions button{padding:5px}.payment-method-editor__actions .intake-button{flex:1}}

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
  grid-template-columns: minmax(180px, 1.15fr) minmax(110px, .7fr) minmax(230px, 1.6fr) minmax(90px, .65fr) 58px;
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
  gap: 4px;
  white-space: nowrap;
}

.payment-requirement-method > strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
}

.payment-requirement-method > span,
.payment-requirement-method > small {
  color: var(--muted);
  font-size: 9px;
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

.payment-requirement-tags--requirements {
  align-items: center;
  flex-wrap: nowrap;
  overflow: hidden;
}

.payment-requirement-tags--requirements > span {
  flex: 0 0 auto;
  padding: 2px 6px;
  font-size: 9px;
}

.payment-requirement-tags > .payment-requirement-binding {
  border: 1px solid #d9e1ec;
  background: #ffffff;
  color: #405069;
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

.payment-method-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.payment-method-picker-card {
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
  transition: border-color .15s, background .15s, box-shadow .15s;
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

.payment-method-picker-card > .intake-status,
.payment-method-picker-card__added {
  grid-column: 2;
  padding: 2px 7px;
  font-size: 9px;
}

.payment-method-picker-card__added {
  width: max-content;
  border-radius: 999px;
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
  grid-template-columns: 34px minmax(0, max-content) max-content minmax(90px, 1fr);
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
  grid-template-columns: 42px minmax(150px, 1.15fr) 190px minmax(170px, 1fr) 36px;
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

.payment-channel-reuse {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 7px;
  cursor: pointer;
}

.payment-channel-reuse input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.payment-channel-reuse > span {
  position: relative;
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  border: 1.5px solid #aeb9c9;
  border-radius: 3px;
  background: #fff;
}

.payment-channel-reuse input:checked + span {
  border-color: var(--blue);
  background: var(--blue);
}

.payment-channel-reuse input:checked + span::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.payment-channel-reuse input:focus-visible + span {
  outline: 2px solid rgba(31, 111, 235, .28);
  outline-offset: 2px;
}

.payment-channel-reuse strong {
  overflow: hidden;
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-channel-table__empty {
  color: var(--muted);
  font-size: 11px;
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
  .payment-requirement-tags--requirements {
    grid-column: 1 / -1;
  }

  .payment-requirement-country,
  .payment-requirement-tags--requirements {
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

  .payment-method-config__summary > .intake-status {
    display: none;
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

  .payment-channel-reuse,
  .payment-channel-brand {
    grid-column: 2 / -1;
  }

  .payment-channel-table__empty {
    display: none;
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
</style>
