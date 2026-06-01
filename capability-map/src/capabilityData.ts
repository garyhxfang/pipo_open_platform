export type MerchantType = 'standardMerchant' | 'platformMerchant'
export type ProductType = 'online' | 'agreementDeduction' | 'subscription'
export type Environment = 'web' | 'app'
export type IntegrationMode = 'hosted' | 'embedded' | 'api'
export type MarketCode = 'US' | 'BR' | 'ID' | 'TH' | 'MY' | 'SG' | 'PH' | 'JP' | 'KR' | 'GB'
export type MarketSelection = 'All' | MarketCode
export type SupportStatus = 'standard' | 'conditional' | 'unsupported'
export type VersionTag = 'standard' | 'beta'
export type CapabilityCategory = 'payment' | 'valueAdded'
export type PaymentAbilityGroupId = 'retry' | 'binding' | 'combined' | 'preAuth'
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
  | 'incrementalPreAuth'
  | 'overCapture'
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
    label: '网页端',
    value: 'web',
    description: 'PC Web、H5 或移动浏览器场景'
  },
  {
    label: 'App',
    value: 'app',
    description: 'iOS/Android 原生应用内支付体验'
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

export const marketOptions: MarketSelection[] = ['All', 'US', 'BR', 'ID', 'TH', 'MY', 'SG', 'PH', 'JP', 'KR', 'GB']

export const supportStatusLabel: Record<SupportStatus, string> = {
  standard: '标准支持',
  conditional: '条件支持',
  unsupported: '不支持'
}

export const shortSupportLabel: Record<SupportStatus, string> = {
  standard: '支持',
  conditional: '部分支持',
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
      { label: 'Credit + X', value: 'creditPlusX', status: 'standard' },
      { label: 'TTPay + X', value: 'ttpayPlusX', status: 'conditional' },
      { label: 'TTPL + X', value: 'ttplPlusX', status: 'unsupported' }
    ]
  },
  {
    id: 'preAuth',
    title: '预授权支付',
    options: [
      { label: '预授权+多次请款', value: 'preAuthMultiple', status: 'standard' },
      { label: '部分预授权', value: 'partialPreAuth', status: 'conditional' },
      { label: '增量预授权', value: 'incrementalPreAuth', status: 'conditional' },
      { label: '超额请款', value: 'overCapture', status: 'unsupported' }
    ]
  }
]

export const defaultSelectedPaymentAbilities: PaymentAbilityId[] = [
  'cashierRecovery',
  'reopenCashier',
  'standaloneBinding',
  'payAndBind',
  'creditPlusX',
  'preAuthMultiple'
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
  GB: 'standard'
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
  GB: 'unsupported'
}

export const capabilities: CapabilityItem[] = [
  {
    id: 'visa',
    name: 'Visa',
    category: 'payment',
    version: 'standard',
    description: '覆盖主流国际卡组织收单。',
    initial: 'V',
    accent: '#174ea6',
    products: ['online', 'agreementDeduction', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded', 'api'],
    marketStatus: { ...allMarketsStandard, KR: 'conditional' },
    paymentMethodTags: {
      standaloneBinding: 'standard',
      payAndBind: 'standard',
      preAuthPay: 'standard'
    }
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    category: 'payment',
    version: 'standard',
    description: '支持银行卡支付、授权与交易查询。',
    initial: 'M',
    accent: '#eb001b',
    products: ['online', 'agreementDeduction', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded', 'api'],
    marketStatus: { ...allMarketsStandard, KR: 'conditional' },
    paymentMethodTags: {
      standaloneBinding: 'standard',
      payAndBind: 'standard',
      preAuthPay: 'standard'
    }
  },
  {
    id: 'paypal',
    name: 'PayPal',
    category: 'payment',
    version: 'standard',
    description: '适合跨境电商和钱包支付场景。',
    initial: 'P',
    accent: '#0070ba',
    products: ['online', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded'],
    marketStatus: {
      ...allMarketsUnsupported,
      US: 'standard',
      BR: 'conditional',
      MY: 'conditional',
      SG: 'standard',
      PH: 'standard',
      JP: 'standard',
      GB: 'standard'
    },
    paymentMethodTags: {
      standaloneBinding: 'unsupported',
      payAndBind: 'standard',
      preAuthPay: 'unsupported'
    }
  },
  {
    id: 'pix',
    name: 'PIX',
    category: 'payment',
    version: 'standard',
    description: '巴西本地实时付款网络。',
    initial: 'P',
    accent: '#12b3a8',
    products: ['online', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded', 'api'],
    marketStatus: { ...allMarketsUnsupported, BR: 'standard' },
    paymentMethodTags: {
      standaloneBinding: 'unsupported',
      payAndBind: 'standard',
      preAuthPay: 'unsupported'
    }
  },
  {
    id: 'promptpay',
    name: 'PromptPay',
    category: 'payment',
    version: 'standard',
    description: '泰国本地转账和二维码支付。',
    initial: 'P',
    accent: '#265fcf',
    products: ['online'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded', 'api'],
    marketStatus: { ...allMarketsUnsupported, TH: 'standard' },
    paymentMethodTags: {
      standaloneBinding: 'unsupported',
      payAndBind: 'standard',
      preAuthPay: 'unsupported'
    }
  },
  {
    id: 'gopay',
    name: 'GoPay',
    category: 'payment',
    version: 'beta',
    description: '印尼本地电子钱包。',
    initial: 'G',
    accent: '#1a8fe3',
    products: ['online', 'subscription'],
    environments: ['app'],
    integrationModes: ['hosted', 'api'],
    marketStatus: { ...allMarketsUnsupported, ID: 'standard' },
    paymentMethodTags: {
      standaloneBinding: 'conditional',
      payAndBind: 'standard',
      preAuthPay: 'unsupported'
    }
  },
  {
    id: 'fpx',
    name: 'FPX',
    category: 'payment',
    version: 'standard',
    description: '马来西亚本地网银支付。',
    initial: 'F',
    accent: '#0b4ea2',
    products: ['online'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'embedded', 'api'],
    marketStatus: { ...allMarketsUnsupported, MY: 'standard' },
    paymentMethodTags: {
      standaloneBinding: 'unsupported',
      payAndBind: 'standard',
      preAuthPay: 'unsupported'
    }
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    category: 'payment',
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
    id: 'bank-transfer',
    name: 'Bank Transfer',
    category: 'payment',
    version: 'standard',
    description: '面向本地银行转账与虚拟账户场景。',
    initial: 'B',
    accent: '#0f766e',
    products: ['online', 'agreementDeduction'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'api'],
    marketStatus: {
      ...allMarketsStandard,
      PH: 'conditional',
      JP: 'conditional',
      KR: 'conditional'
    },
    paymentMethodTags: {
      standaloneBinding: 'standard',
      payAndBind: 'standard',
      preAuthPay: 'conditional'
    }
  },
  {
    id: 'alipay-plus',
    name: 'Alipay+',
    category: 'payment',
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
    id: 'unionpay',
    name: '银联卡',
    category: 'payment',
    version: 'standard',
    description: '支持银联卡线上收单。',
    initial: 'U',
    accent: '#d91f2d',
    products: ['online', 'subscription'],
    environments: ['web', 'app'],
    integrationModes: ['hosted', 'api'],
    marketStatus: {
      ...allMarketsUnsupported,
      US: 'conditional',
      ID: 'conditional',
      TH: 'standard',
      MY: 'standard',
      SG: 'standard',
      PH: 'conditional',
      JP: 'standard',
      KR: 'conditional',
      GB: 'conditional'
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
    if (integration === 'api') return 'standard'
    if (integration === 'hosted') return 'standard'
    return environment === 'web' ? 'conditional' : 'unsupported'
  }

  if (integration === 'api') {
    return merchantType === 'platformMerchant' ? 'conditional' : 'standard'
  }

  if (integration === 'embedded') {
    return environment === 'web' ? 'standard' : 'conditional'
  }

  return 'standard'
}
