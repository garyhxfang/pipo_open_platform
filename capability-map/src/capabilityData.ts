import {
  bankTransferPaymentMethods,
  bankCardPaymentMethods,
  cashPinPaymentMethods,
  electronicWalletPaymentMethods,
  internetBankingPaymentMethods,
  mobileBankingPaymentMethods,
  realtimePaymentNetworks
} from './paymentMethodCatalog'

export type MerchantType = 'standardMerchant' | 'platformMerchant'
export type ProductType = 'online' | 'agreementDeduction' | 'subscription'
export type Environment = 'web' | 'app'
export type IntegrationMode = 'hosted' | 'embedded' | 'api'
export type MarketCode =
  | 'US'
  | 'BR'
  | 'ID'
  | 'TH'
  | 'MY'
  | 'SG'
  | 'PH'
  | 'JP'
  | 'KR'
  | 'GB'
  | 'HK'
  | 'CL'
  | 'MX'
  | 'VN'
  | 'CN'
  | 'CO'
export type MarketSelection = 'All' | MarketCode
export type SupportStatus = 'standard' | 'conditional' | 'onDemand' | 'unsupported'
export type VersionTag = 'standard' | 'beta'
export type CapabilityCategory = 'payment' | 'valueAdded'
export type PaymentMethodType =
  | 'card'
  | 'passThroughWallet'
  | 'wallet'
  | 'mobileBanking'
  | 'realTimePaymentNetwork'
  | 'bankTransfer'
  | 'internetBanking'
  | 'cashPin'
export type PaymentMethodTypeSelection = 'All' | PaymentMethodType
export type PaymentAbilityGroupId =
  | 'retry'
  | 'binding'
  | 'combined'
  | 'preAuth'
  | 'subscriptionPricing'
  | 'subscriptionExpiry'
  | 'subscriptionUpgrade'
  | 'subscriptionPlan'
  | 'initialRetry'
  | 'renewalCharge'
  | 'agreementMode'
  | 'agreementRetry'
  | 'deductionRetry'
export type PaymentAbilityId =
  | 'cashierRecovery'
  | 'reopenCashier'
  | 'backupMethodRetry'
  | 'standaloneBinding'
  | 'payAndBind'
  | 'creditPlusX'
  | 'ttpayPlusX'
  | 'ttplPlusX'
  | 'preAuthMultiple'
  | 'partialPreAuth'
  | 'regularPricing'
  | 'trialPeriod'
  | 'discountPeriod'
  | 'gracePeriod'
  | 'retentionPeriod'
  | 'upgradeRefundRemainingBenefits'
  | 'upgradeOffsetNewSubscription'
  | 'upgradeProratedPriceDifference'
  | 'downgradeOnRenewal'
  | 'cancelSubscription'
  | 'resumeSubscription'
  | 'terminateSubscription'
  | 'subscriptionCashierRecovery'
  | 'subscriptionReopenCashier'
  | 'subscriptionBackupMethodRetry'
  | 'primaryPiCharge'
  | 'primaryBackupPiPolling'
  | 'standaloneAgreement'
  | 'payAndAgreement'
  | 'agreementCashierRecovery'
  | 'agreementReopenCashier'
  | 'agreementBackupMethodRetry'
  | 'deductionBackupMethodRetry'
  | 'intelligentRetry'
export type PaymentMethodTagId = 'standaloneBinding' | 'payAndBind' | 'preAuthPay'

export interface Option<T extends string> {
  label: string
  value: T
  description: string
}

export interface PaymentAbilityOption {
  label: string
  value: PaymentAbilityId
  status: SupportStatus
}

export interface PaymentAbilityGroup {
  id: PaymentAbilityGroupId
  title: string
  options: PaymentAbilityOption[]
}

export interface CapabilityItem {
  id: string
  name: string
  category: CapabilityCategory
  version: VersionTag
  description: string
  initial: string
  accent: string
  products: ProductType[]
  environments: Environment[]
  integrationModes: IntegrationMode[]
  marketStatus: Record<MarketCode, SupportStatus>
  serviceStatus?: SupportStatus
  paymentMethodTags?: Record<PaymentMethodTagId, SupportStatus>
  paymentMethodType?: PaymentMethodType
}

export interface PaymentMethodOperationalDetails {
  fullRefund: SupportStatus
  partialRefund: SupportStatus
  maxRefundPeriod: string
  chargeback: SupportStatus
  chargebackDescription: string
}

export const merchantTypeOptions: Option<MerchantType>[] = [
  {
    label: '普通商户',
    value: 'standardMerchant',
    description: '单一商户主体接入收单产品'
  },
  {
    label: '平台商户',
    value: 'platformMerchant',
    description: '平台型业务，常涉及分账和多主体能力'
  }
]

export const productOptions: Option<ProductType>[] = [
  {
    label: '在线支付',
    value: 'online',
    description: '用户主动确认付款，适合单次交易'
  },
  {
    label: '协议代扣',
    value: 'agreementDeduction',
    description: '用户授权后按业务条件自动扣款'
  },
  {
    label: '订阅',
    value: 'subscription',
    description: '按周期自动续费，适合会员和 SaaS'
  }
]

export const environmentOptions: Option<Environment>[] = [
  {
    label: 'TT端内',
    value: 'app',
    description: 'TikTok App 内的支付场景'
  },
  {
    label: 'TT端外',
    value: 'web',
    description: 'TikTok App 外的网页或商户 App 场景'
  }
]

export const integrationOptions: Option<IntegrationMode>[] = [
  {
    label: '独立收银台',
    value: 'hosted',
    description: '跳转到标准收银台完成支付'
  },
  {
    label: '嵌入式收银台',
    value: 'embedded',
    description: '在商户页面内嵌支付组件'
  },
  {
    label: 'API',
    value: 'api',
    description: '通过 API 自建支付体验和流程'
  }
]

export const marketOptions: MarketSelection[] = [
  'All',
  'US',
  'BR',
  'ID',
  'TH',
  'MY',
  'SG',
  'PH',
  'JP',
  'KR',
  'GB',
  'HK',
  'CL',
  'MX',
  'VN',
  'CN',
  'CO'
]

export const paymentMethodTypeOptions: Array<{ label: string; value: PaymentMethodTypeSelection }> = [
  { label: 'All', value: 'All' },
  { label: '银行卡', value: 'card' },
  { label: '穿透式钱包', value: 'passThroughWallet' },
  { label: '电子钱包', value: 'wallet' },
  { label: '手机银行', value: 'mobileBanking' },
  { label: '实时支付网络', value: 'realTimePaymentNetwork' },
  { label: '银行转账', value: 'bankTransfer' },
  { label: '网银（Internet Banking）', value: 'internetBanking' },
  { label: '线下现金支付（Cash PIN）', value: 'cashPin' }
]

export const supportStatusLabel: Record<SupportStatus, string> = {
  standard: '标准支持',
  conditional: '条件支持',
  onDemand: '按需支持',
  unsupported: '不支持'
}

export const shortSupportLabel: Record<SupportStatus, string> = {
  standard: '支持',
  conditional: '部分支持',
  onDemand: '按需支持',
  unsupported: '不支持'
}

export const versionLabel: Record<VersionTag, string> = {
  standard: '标准版',
  beta: 'Beta版'
}

export const paymentAbilityGroups: PaymentAbilityGroup[] = [
  {
    id: 'retry',
    title: '支付重试',
    options: [
      { label: '收银台支付挽回', value: 'cashierRecovery', status: 'standard' },
      { label: '二次拉起收银台支付', value: 'reopenCashier', status: 'standard' },
      { label: '备用支付方式重试', value: 'backupMethodRetry', status: 'conditional' }
    ]
  },
  {
    id: 'binding',
    title: '绑定支付方式',
    options: [
      { label: '独立绑定', value: 'standaloneBinding', status: 'standard' },
      { label: '支付并绑定', value: 'payAndBind', status: 'standard' }
    ]
  },
  {
    id: 'combined',
    title: '组合支付',
    options: [
      { label: 'Tiktok Pay + 其他支付方式', value: 'creditPlusX', status: 'standard' },
      { label: 'Tiktok Paylater + 其他支付方式', value: 'ttpayPlusX', status: 'conditional' },
      { label: 'TTS Balance + 其他支付方式', value: 'ttplPlusX', status: 'unsupported' }
    ]
  },
  {
    id: 'preAuth',
    title: '预授权支付',
    options: [
      { label: '预授权支付', value: 'preAuthMultiple', status: 'standard' },
      { label: '部分预授权', value: 'partialPreAuth', status: 'conditional' }
    ]
  }
]

export const visiblePaymentAbilityGroups = paymentAbilityGroups.filter(
  (group) => group.id === 'retry' || group.id === 'combined'
)

export const subscriptionManagementGroups: PaymentAbilityGroup[] = [
  {
    id: 'subscriptionPricing',
    title: '订阅定价能力',
    options: [
      { label: '正价期', value: 'regularPricing', status: 'standard' },
      { label: '试用期', value: 'trialPeriod', status: 'standard' },
      { label: '优惠期', value: 'discountPeriod', status: 'standard' }
    ]
  },
  {
    id: 'subscriptionExpiry',
    title: '订阅到期处理',
    options: [
      { label: '宽限期', value: 'gracePeriod', status: 'standard' },
      { label: '保留期', value: 'retentionPeriod', status: 'unsupported' }
    ]
  },
  {
    id: 'subscriptionUpgrade',
    title: '订阅升降级',
    options: [
      { label: '剩余权益退款（升级）', value: 'upgradeRefundRemainingBenefits', status: 'standard' },
      { label: '剩余权益抵扣新订阅款项（升级）', value: 'upgradeOffsetNewSubscription', status: 'standard' },
      { label: '剩余时间补差价（升级）', value: 'upgradeProratedPriceDifference', status: 'standard' },
      { label: '到期后降级续费（降级）', value: 'downgradeOnRenewal', status: 'unsupported' }
    ]
  },
  {
    id: 'subscriptionPlan',
    title: '订阅计划调整',
    options: [
      { label: '取消订阅', value: 'cancelSubscription', status: 'standard' },
      { label: '恢复订阅', value: 'resumeSubscription', status: 'standard' },
      { label: '终止订阅', value: 'terminateSubscription', status: 'standard' }
    ]
  }
]

export const subscriptionPaymentAbilityGroups: PaymentAbilityGroup[] = [
  {
    id: 'initialRetry',
    title: '首订支付重试',
    options: [
      { label: '二次拉起收银台支付', value: 'subscriptionReopenCashier', status: 'standard' },
      { label: '收银台支付挽回', value: 'subscriptionCashierRecovery', status: 'unsupported' }
    ]
  },
  {
    id: 'renewalCharge',
    title: '续订阶段重试',
    options: [
      { label: '备用支付方式重试', value: 'subscriptionBackupMethodRetry', status: 'standard' },
      { label: '智能重试', value: 'intelligentRetry', status: 'standard' }
    ]
  }
]

export const agreementPaymentAbilityGroups: PaymentAbilityGroup[] = [
  {
    id: 'agreementMode',
    title: '签约模式',
    options: [
      { label: '独立签约', value: 'standaloneAgreement', status: 'standard' },
      { label: '支付并签约', value: 'payAndAgreement', status: 'standard' }
    ]
  },
  {
    id: 'agreementRetry',
    title: '签约阶段支付重试',
    options: [
      { label: '收银台支付挽回', value: 'agreementCashierRecovery', status: 'standard' },
      { label: '二次拉起收银台支付', value: 'agreementReopenCashier', status: 'standard' },
      { label: '备用支付方式重试', value: 'agreementBackupMethodRetry', status: 'conditional' }
    ]
  },
  {
    id: 'deductionRetry',
    title: '代扣阶段支付重试',
    options: [
      { label: '备用支付方式重试', value: 'deductionBackupMethodRetry', status: 'standard' },
      { label: '智能重试', value: 'intelligentRetry', status: 'conditional' }
    ]
  }
]

export const defaultSelectedPaymentAbilities: PaymentAbilityId[] = [
  'cashierRecovery',
  'reopenCashier',
  'creditPlusX',
  'regularPricing',
  'trialPeriod',
  'gracePeriod',
  'upgradeOffsetNewSubscription',
  'downgradeOnRenewal',
  'cancelSubscription',
  'resumeSubscription',
  'subscriptionCashierRecovery',
  'subscriptionReopenCashier',
  'primaryPiCharge',
  'standaloneAgreement',
  'payAndAgreement',
  'agreementCashierRecovery',
  'agreementReopenCashier',
  'deductionBackupMethodRetry'
]

const allMarketsStandard: Record<MarketCode, SupportStatus> = {
  US: 'standard',
  BR: 'standard',
  ID: 'standard',
  TH: 'standard',
  MY: 'standard',
  SG: 'standard',
  PH: 'standard',
  JP: 'standard',
  KR: 'standard',
  GB: 'standard',
  HK: 'standard',
  CL: 'standard',
  MX: 'standard',
  VN: 'standard',
  CN: 'standard',
  CO: 'standard'
}

const allMarketsUnsupported: Record<MarketCode, SupportStatus> = {
  US: 'unsupported',
  BR: 'unsupported',
  ID: 'unsupported',
  TH: 'unsupported',
  MY: 'unsupported',
  SG: 'unsupported',
  PH: 'unsupported',
  JP: 'unsupported',
  KR: 'unsupported',
  GB: 'unsupported',
  HK: 'unsupported',
  CL: 'unsupported',
  MX: 'unsupported',
  VN: 'unsupported',
  CN: 'unsupported',
  CO: 'unsupported'
}

export const capabilities: CapabilityItem[] = [
  ...bankCardPaymentMethods.map<CapabilityItem>((method) => ({
    id: method.id,
    name: method.name,
    category: 'payment',
    paymentMethodType: 'card',
    version: 'standard',
    description: method.description,
    initial: method.initial,
    accent: method.accent,
    products: [...method.products],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded', 'api'],
    marketStatus: method.availability === 'global'
      ? { ...allMarketsStandard }
      : {
          ...allMarketsUnsupported,
          ...Object.fromEntries(method.availability.map((market) => [market, 'standard' as const]))
        },
    paymentMethodTags: {
      standaloneBinding: method.bindingModes.includes('standaloneBinding') ? 'standard' : 'unsupported',
      payAndBind: method.bindingModes.includes('payAndBind') ? 'standard' : 'unsupported',
      preAuthPay: method.preAuthPay ?? 'unsupported'
    }
  })),
  ...electronicWalletPaymentMethods.map<CapabilityItem>((method) => ({
    id: method.id,
    name: method.name,
    category: 'payment',
    paymentMethodType: 'wallet',
    version: method.version,
    description: method.description,
    initial: method.initial,
    accent: method.accent,
    products: [...method.products],
    environments: [...method.environments],
    integrationModes: [...method.integrationModes],
    marketStatus: method.availability === 'global'
      ? { ...allMarketsStandard }
      : {
          ...allMarketsUnsupported,
          ...Object.fromEntries(method.availability.map((market) => [market, 'standard' as const]))
        },
    paymentMethodTags: { ...method.paymentMethodTags }
  })),
  ...mobileBankingPaymentMethods.map<CapabilityItem>((method) => ({
    id: method.id,
    name: method.name,
    category: 'payment',
    paymentMethodType: 'mobileBanking',
    version: method.version,
    description: method.description,
    initial: method.initial,
    accent: method.accent,
    products: [...method.products],
    environments: [...method.environments],
    integrationModes: [...method.integrationModes],
    marketStatus: {
      ...allMarketsUnsupported,
      ...Object.fromEntries(method.availability.map((market) => [market, 'standard' as const]))
    },
    paymentMethodTags: { ...method.paymentMethodTags }
  })),
  ...bankTransferPaymentMethods.map<CapabilityItem>((method) => ({
    id: method.id,
    name: method.name,
    category: 'payment',
    paymentMethodType: 'bankTransfer',
    version: method.version,
    description: method.description,
    initial: method.initial,
    accent: method.accent,
    products: [...method.products],
    environments: [...method.environments],
    integrationModes: [...method.integrationModes],
    marketStatus: {
      ...allMarketsUnsupported,
      ...Object.fromEntries(method.availability.map((market) => [market, 'standard' as const]))
    },
    paymentMethodTags: { ...method.paymentMethodTags }
  })),
  ...realtimePaymentNetworks.map<CapabilityItem>((method) => ({
    id: method.id,
    name: method.name,
    category: 'payment',
    paymentMethodType: 'realTimePaymentNetwork',
    version: method.version,
    description: method.description,
    initial: method.initial,
    accent: method.accent,
    products: [...method.products],
    environments: [...method.environments],
    integrationModes: [...method.integrationModes],
    marketStatus: {
      ...allMarketsUnsupported,
      ...Object.fromEntries(method.availability.map((market) => [market, 'standard' as const]))
    },
    paymentMethodTags: { ...method.paymentMethodTags }
  })),
  ...internetBankingPaymentMethods.map<CapabilityItem>((method) => ({
    id: method.id,
    name: method.name,
    category: 'payment',
    paymentMethodType: 'internetBanking',
    version: method.version,
    description: method.description,
    initial: method.initial,
    accent: method.accent,
    products: [...method.products],
    environments: [...method.environments],
    integrationModes: [...method.integrationModes],
    marketStatus: {
      ...allMarketsUnsupported,
      ...Object.fromEntries(method.availability.map((market) => [market, 'standard' as const]))
    },
    paymentMethodTags: { ...method.paymentMethodTags }
  })),
  ...cashPinPaymentMethods.map<CapabilityItem>((method) => ({
    id: method.id,
    name: method.name,
    category: 'payment',
    paymentMethodType: 'cashPin',
    version: method.version,
    description: method.description,
    initial: method.initial,
    accent: method.accent,
    products: [...method.products],
    environments: [...method.environments],
    integrationModes: [...method.integrationModes],
    marketStatus: {
      ...allMarketsUnsupported,
      ...Object.fromEntries(method.availability.map((market) => [market, 'standard' as const]))
    },
    paymentMethodTags: { ...method.paymentMethodTags }
  })),
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    category: 'payment',
    paymentMethodType: 'passThroughWallet',
    version: 'standard',
    description: '支持 Apple 设备上的快捷支付。',
    initial: 'A',
    accent: '#111827',
    products: ['online', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded'],
    marketStatus: {
      ...allMarketsUnsupported,
      US: 'standard',
      MY: 'conditional',
      SG: 'standard',
      JP: 'standard',
      GB: 'standard'
    },
    paymentMethodTags: {
      standaloneBinding: 'conditional',
      payAndBind: 'standard',
      preAuthPay: 'standard'
    }
  },
  {
    id: 'google-pay',
    name: 'Google Pay',
    category: 'payment',
    paymentMethodType: 'passThroughWallet',
    version: 'standard',
    description: '支持 Android 与浏览器快捷支付。',
    initial: 'G',
    accent: '#4285f4',
    products: ['online', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded'],
    marketStatus: {
      ...allMarketsUnsupported,
      US: 'standard',
      BR: 'conditional',
      ID: 'conditional',
      MY: 'conditional',
      SG: 'standard',
      JP: 'standard',
      GB: 'standard'
    },
    paymentMethodTags: {
      standaloneBinding: 'conditional',
      payAndBind: 'standard',
      preAuthPay: 'standard'
    }
  },
  {
    id: 'alipay-plus',
    name: 'Alipay+',
    category: 'payment',
    paymentMethodType: 'wallet',
    version: 'beta',
    description: '连接区域钱包和跨境钱包网络。',
    initial: 'A',
    accent: '#1677ff',
    products: ['online'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded'],
    marketStatus: {
      ...allMarketsUnsupported,
      ID: 'conditional',
      TH: 'conditional',
      MY: 'standard',
      SG: 'standard',
      PH: 'standard',
      JP: 'standard',
      KR: 'standard'
    },
    paymentMethodTags: {
      standaloneBinding: 'standard',
      payAndBind: 'standard',
      preAuthPay: 'conditional'
    }
  },
  {
    id: 'fx',
    name: '换汇',
    category: 'valueAdded',
    version: 'standard',
    description: '支持多币种结算与自动换汇。',
    initial: '¥',
    accent: '#2563eb',
    products: ['online', 'agreementDeduction', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded', 'api'],
    marketStatus: allMarketsStandard,
    serviceStatus: 'standard'
  },
  {
    id: 'tax',
    name: '计税',
    category: 'valueAdded',
    version: 'standard',
    description: '支持税费计算与发票数据输出。',
    initial: 'T',
    accent: '#0f766e',
    products: ['online', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded', 'api'],
    marketStatus: { ...allMarketsStandard, BR: 'conditional', PH: 'conditional', KR: 'conditional' },
    serviceStatus: 'standard'
  },
  {
    id: 'user-fee',
    name: '用户手续费',
    category: 'valueAdded',
    version: 'beta',
    description: '支持向用户收取交易手续费。',
    initial: '%',
    accent: '#7c3aed',
    products: ['online', 'agreementDeduction', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'api'],
    marketStatus: {
      ...allMarketsStandard,
      TH: 'conditional',
      PH: 'conditional',
      JP: 'conditional',
      KR: 'unsupported'
    },
    serviceStatus: 'conditional'
  },
  {
    id: 'marketing',
    name: '营销',
    category: 'valueAdded',
    version: 'beta',
    description: '支持优惠券、折扣与营销活动。',
    initial: 'M',
    accent: '#ea580c',
    products: ['online', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded'],
    marketStatus: {
      ...allMarketsStandard,
      MY: 'conditional',
      JP: 'conditional',
      KR: 'conditional'
    },
    serviceStatus: 'conditional'
  }
]

export const paymentMethodOperationalDetails: Record<string, PaymentMethodOperationalDetails> = {
  visa: {
    fullRefund: 'standard',
    partialRefund: 'standard',
    maxRefundPeriod: '365 天',
    chargeback: 'standard',
    chargebackDescription: '支持拒付通知、举证与结果查询。'
  },
  mastercard: {
    fullRefund: 'standard',
    partialRefund: 'standard',
    maxRefundPeriod: '365 天',
    chargeback: 'standard',
    chargebackDescription: '支持拒付通知、举证与结果查询。'
  },
  paypal: {
    fullRefund: 'standard',
    partialRefund: 'standard',
    maxRefundPeriod: '180 天',
    chargeback: 'standard',
    chargebackDescription: '支持争议通知与 PayPal 争议处理流程。'
  },
  pix: {
    fullRefund: 'standard',
    partialRefund: 'standard',
    maxRefundPeriod: '90 天',
    chargeback: 'unsupported',
    chargebackDescription: '不适用银行卡拒付流程。'
  },
  promptpay: {
    fullRefund: 'conditional',
    partialRefund: 'unsupported',
    maxRefundPeriod: '180 天',
    chargeback: 'unsupported',
    chargebackDescription: '不适用银行卡拒付流程。'
  },
  gopay: {
    fullRefund: 'standard',
    partialRefund: 'conditional',
    maxRefundPeriod: '90 天',
    chargeback: 'unsupported',
    chargebackDescription: '不适用银行卡拒付流程。'
  },
  fpx: {
    fullRefund: 'standard',
    partialRefund: 'unsupported',
    maxRefundPeriod: '180 天',
    chargeback: 'unsupported',
    chargebackDescription: '不适用银行卡拒付流程。'
  },
  'apple-pay': {
    fullRefund: 'standard',
    partialRefund: 'standard',
    maxRefundPeriod: '365 天',
    chargeback: 'standard',
    chargebackDescription: '按底层银行卡网络处理拒付。'
  },
  'google-pay': {
    fullRefund: 'standard',
    partialRefund: 'standard',
    maxRefundPeriod: '365 天',
    chargeback: 'standard',
    chargebackDescription: '按底层银行卡网络处理拒付。'
  },
  banktransfer: {
    fullRefund: 'conditional',
    partialRefund: 'unsupported',
    maxRefundPeriod: '30 天',
    chargeback: 'unsupported',
    chargebackDescription: '不适用银行卡拒付流程。'
  },
  'alipay-plus': {
    fullRefund: 'standard',
    partialRefund: 'conditional',
    maxRefundPeriod: '90 天',
    chargeback: 'conditional',
    chargebackDescription: '争议处理能力取决于具体钱包渠道。'
  },
  unionpay: {
    fullRefund: 'standard',
    partialRefund: 'standard',
    maxRefundPeriod: '180 天',
    chargeback: 'standard',
    chargebackDescription: '支持拒付通知与结果查询。'
  }
}

export function getIntegrationStatus(
  merchantType: MerchantType,
  product: ProductType,
  environment: Environment,
  integration: IntegrationMode
): SupportStatus {
  if (product === 'agreementDeduction') {
    if (integration === 'embedded') return 'unsupported'
    if (integration === 'hosted') return environment === 'web' ? 'conditional' : 'unsupported'
    return merchantType === 'platformMerchant' ? 'conditional' : 'standard'
  }

  if (product === 'subscription') {
    if (merchantType === 'platformMerchant' || environment === 'app') return 'unsupported'
    return integration === 'hosted' ? 'standard' : 'unsupported'
  }

  if (integration === 'api') {
    return merchantType === 'platformMerchant' ? 'conditional' : 'standard'
  }

  if (integration === 'embedded') {
    return environment === 'web' ? 'standard' : 'conditional'
  }

  return 'standard'
}
