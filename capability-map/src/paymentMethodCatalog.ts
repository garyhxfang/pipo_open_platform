import type {
  Environment,
  IntegrationMode,
  MarketCode,
  PaymentMethodTagId,
  ProductType,
  SupportStatus,
  VersionTag
} from './capabilityData'

export const bankCardPaymentMethodIds = [
  'amex',
  'diners',
  'discover',
  'elo',
  'hipercard',
  'jcb',
  'maestro',
  'mastercard',
  'unionpay',
  'visa'
] as const

export type BankCardPaymentMethodId = (typeof bankCardPaymentMethodIds)[number]
export type BankCardBindingMode = Extract<PaymentMethodTagId, 'standaloneBinding' | 'payAndBind'>
export type PaymentMethodAvailability = 'global' | readonly MarketCode[]

export function normalizeElectronicWalletPaymentMethodId(sourceCode: string) {
  return sourceCode
    .trim()
    .replace(/^pm_pi_ew_/, '')
    .replace(/_(?:c_[rd]|b_r)$/, '')
}

export function normalizeRealtimePaymentNetworkId(sourceCode: string) {
  return sourceCode
    .trim()
    .replace(/^pm_pi_bap_/, '')
    .replace(/_c_[rd]$/, '')
}

export function normalizeMobileBankingPaymentMethodId(sourceCode: string) {
  return sourceCode
    .trim()
    .replace(/^pm_pi_mb_/, '')
    .replace(/_c_[rd]$/, '')
}

export function normalizeBankTransferPaymentMethodId(sourceCode: string) {
  return sourceCode
    .trim()
    .replace(/^pm_pi_bt_/, '')
    .replace(/_c_[rd]$/, '')
}

export interface BankCardPaymentMethodDefinition {
  id: BankCardPaymentMethodId
  name: string
  description: string
  initial: string
  accent: string
  availability: PaymentMethodAvailability
  products: readonly ProductType[]
  bindingModes: readonly BankCardBindingMode[]
  preAuthPay?: SupportStatus
}

const onlinePaymentOnly = ['online'] as const satisfies readonly ProductType[]
const reusablePaymentProducts = [
  'online',
  'agreementDeduction',
  'subscription'
] as const satisfies readonly ProductType[]
const reusableCardBindingModes = [
  'standaloneBinding',
  'payAndBind'
] as const satisfies readonly BankCardBindingMode[]

export const bankCardPaymentMethods: readonly BankCardPaymentMethodDefinition[] = [
  {
    id: 'amex',
    name: 'American Express',
    description: '全球可用的 American Express 银行卡支付。',
    initial: 'AX',
    accent: '#006fcf',
    availability: 'global',
    products: reusablePaymentProducts,
    bindingModes: reusableCardBindingModes
  },
  {
    id: 'diners',
    name: 'Diners Club',
    description: '全球可用的 Diners Club 银行卡支付。',
    initial: 'DC',
    accent: '#0079be',
    availability: 'global',
    products: onlinePaymentOnly,
    bindingModes: []
  },
  {
    id: 'discover',
    name: 'Discover',
    description: '全球可用的 Discover 银行卡支付。',
    initial: 'DI',
    accent: '#f58220',
    availability: 'global',
    products: onlinePaymentOnly,
    bindingModes: []
  },
  {
    id: 'elo',
    name: 'Elo',
    description: '仅在巴西可用的 Elo 银行卡支付。',
    initial: 'E',
    accent: '#111827',
    availability: ['BR'],
    products: onlinePaymentOnly,
    bindingModes: []
  },
  {
    id: 'hipercard',
    name: 'Hipercard',
    description: '仅在巴西可用的 Hipercard 银行卡支付。',
    initial: 'H',
    accent: '#b3131b',
    availability: ['BR'],
    products: onlinePaymentOnly,
    bindingModes: []
  },
  {
    id: 'jcb',
    name: 'JCB',
    description: '全球可用的 JCB 银行卡支付。',
    initial: 'J',
    accent: '#0f5fa8',
    availability: 'global',
    products: reusablePaymentProducts,
    bindingModes: reusableCardBindingModes
  },
  {
    id: 'maestro',
    name: 'Maestro',
    description: '全球可用的 Maestro 银行卡支付。',
    initial: 'MA',
    accent: '#6c2c91',
    availability: 'global',
    products: onlinePaymentOnly,
    bindingModes: []
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    description: '全球可用的 Mastercard 银行卡支付。',
    initial: 'MC',
    accent: '#eb001b',
    availability: 'global',
    products: reusablePaymentProducts,
    bindingModes: reusableCardBindingModes,
    preAuthPay: 'standard'
  },
  {
    id: 'unionpay',
    name: 'UnionPay',
    description: '全球可用的 UnionPay 银行卡支付。',
    initial: 'UP',
    accent: '#d91f2d',
    availability: 'global',
    products: onlinePaymentOnly,
    bindingModes: []
  },
  {
    id: 'visa',
    name: 'Visa',
    description: '全球可用的 Visa 银行卡支付。',
    initial: 'V',
    accent: '#174ea6',
    availability: 'global',
    products: reusablePaymentProducts,
    bindingModes: reusableCardBindingModes,
    preAuthPay: 'standard'
  }
]

export const bankCardPaymentMethodById = Object.fromEntries(
  bankCardPaymentMethods.map((method) => [method.id, method])
) as Record<BankCardPaymentMethodId, BankCardPaymentMethodDefinition>

export const reusableBankCardPaymentMethods = bankCardPaymentMethods.filter(
  (method) => method.bindingModes.length > 0
)

export const electronicWalletPaymentMethodIds = [
  'alipay',
  'alipayhk',
  'boost',
  'dana',
  'gcash',
  'gopay',
  'grabpay',
  'kakaopay',
  'linepay',
  'linkaja',
  'mercadopago',
  'momo',
  'mpaywallet',
  'naverpay',
  'ovo',
  'payco',
  'paymaya',
  'payoneer',
  'paypal',
  'rabbitlinepay',
  'razergold',
  'tosspay',
  'touchngo',
  'truemoney',
  'wechatpay',
  'zalopay'
] as const

export type ElectronicWalletPaymentMethodId = (typeof electronicWalletPaymentMethodIds)[number]

export const standaloneBindingElectronicWalletIds = [
  'dana',
  'gcash',
  'gopay',
  'paymaya',
  'rabbitlinepay',
  'truemoney',
  'wechatpay',
  'zalopay'
] as const satisfies readonly ElectronicWalletPaymentMethodId[]

export const payAndBindElectronicWalletIds = [
  'touchngo',
  'momo'
] as const satisfies readonly ElectronicWalletPaymentMethodId[]

export const recurringElectronicWalletIds = [
  'dana',
  'gcash',
  'gopay',
  'momo',
  'paymaya',
  'rabbitlinepay',
  'truemoney',
  'wechatpay',
  'zalopay'
] as const satisfies readonly ElectronicWalletPaymentMethodId[]

export interface ElectronicWalletPaymentMethodDefinition {
  id: ElectronicWalletPaymentMethodId
  name: string
  description: string
  initial: string
  accent: string
  availability: PaymentMethodAvailability
  sourceCodes: readonly string[]
  products: readonly ProductType[]
  environments: readonly Environment[]
  integrationModes: readonly IntegrationMode[]
  version: VersionTag
  paymentMethodTags: Readonly<Record<PaymentMethodTagId, SupportStatus>>
}

const walletEnvironments = ['web', 'app'] as const satisfies readonly Environment[]
const walletIntegrationModes = ['hosted', 'embedded', 'api'] as const satisfies readonly IntegrationMode[]
const standaloneBindingElectronicWalletIdSet = new Set<ElectronicWalletPaymentMethodId>(
  standaloneBindingElectronicWalletIds
)
const payAndBindElectronicWalletIdSet = new Set<ElectronicWalletPaymentMethodId>(
  payAndBindElectronicWalletIds
)
const recurringElectronicWalletIdSet = new Set<ElectronicWalletPaymentMethodId>(
  recurringElectronicWalletIds
)

function wallet(
  definition: Omit<
    ElectronicWalletPaymentMethodDefinition,
    'products' | 'environments' | 'integrationModes' | 'version' | 'paymentMethodTags'
  > & Partial<
    Pick<
      ElectronicWalletPaymentMethodDefinition,
      'products' | 'environments' | 'integrationModes' | 'version' | 'paymentMethodTags'
    >
  >
): ElectronicWalletPaymentMethodDefinition {
  const supportsRecurringPayment = recurringElectronicWalletIdSet.has(definition.id)
  return {
    products: supportsRecurringPayment ? reusablePaymentProducts : onlinePaymentOnly,
    environments: walletEnvironments,
    integrationModes: walletIntegrationModes,
    version: 'standard',
    paymentMethodTags: {
      standaloneBinding: standaloneBindingElectronicWalletIdSet.has(definition.id) ? 'standard' : 'unsupported',
      payAndBind: payAndBindElectronicWalletIdSet.has(definition.id) ? 'standard' : 'unsupported',
      preAuthPay: 'unsupported'
    },
    ...definition
  }
}

export const electronicWalletPaymentMethods: readonly ElectronicWalletPaymentMethodDefinition[] = [
  wallet({
    id: 'alipay',
    name: 'Alipay',
    description: '全球可用的 Alipay 电子钱包。',
    initial: 'A',
    accent: '#1677ff',
    availability: 'global',
    sourceCodes: ['pm_pi_ew_alipay_c_r']
  }),
  wallet({
    id: 'alipayhk',
    name: 'AlipayHK',
    description: '仅在香港可用的 AlipayHK 电子钱包。',
    initial: 'AH',
    accent: '#1677ff',
    availability: ['HK'],
    sourceCodes: ['pm_pi_ew_alipayhk_c_d', 'pm_pi_ew_alipayhk_c_r']
  }),
  wallet({
    id: 'boost',
    name: 'Boost',
    description: '仅在马来西亚可用的 Boost 电子钱包。',
    initial: 'B',
    accent: '#ee2e24',
    availability: ['MY'],
    sourceCodes: ['pm_pi_ew_boost_c_r']
  }),
  wallet({
    id: 'dana',
    name: 'DANA',
    description: '仅在印度尼西亚可用的 DANA 电子钱包。',
    initial: 'D',
    accent: '#118eea',
    availability: ['ID'],
    sourceCodes: ['pm_pi_ew_dana_c_d', 'pm_pi_ew_dana_c_r']
  }),
  wallet({
    id: 'gcash',
    name: 'GCash',
    description: '仅在菲律宾可用的 GCash 电子钱包。',
    initial: 'G',
    accent: '#007dfe',
    availability: ['PH'],
    sourceCodes: ['pm_pi_ew_gcash_c_r']
  }),
  wallet({
    id: 'gopay',
    name: 'GoPay',
    description: '仅在印度尼西亚可用的 GoPay 电子钱包。',
    initial: 'G',
    accent: '#00aed6',
    availability: ['ID'],
    sourceCodes: ['pm_pi_ew_gopay_c_d', 'pm_pi_ew_gopay_c_r'],
    environments: ['app'],
    integrationModes: ['hosted', 'api'],
    version: 'beta'
  }),
  wallet({
    id: 'grabpay',
    name: 'GrabPay',
    description: '仅在马来西亚可用的 GrabPay 电子钱包。',
    initial: 'G',
    accent: '#00b14f',
    availability: ['MY'],
    sourceCodes: ['pm_pi_ew_grabpay_c_r']
  }),
  wallet({
    id: 'kakaopay',
    name: 'KakaoPay',
    description: '仅在韩国可用的 KakaoPay 电子钱包。',
    initial: 'K',
    accent: '#ffeb00',
    availability: ['KR'],
    sourceCodes: ['pm_pi_ew_kakaopay_c_r']
  }),
  wallet({
    id: 'linepay',
    name: 'LINE Pay',
    description: '仅在日本可用的 LINE Pay 电子钱包。',
    initial: 'L',
    accent: '#06c755',
    availability: ['JP'],
    sourceCodes: ['pm_pi_ew_linepay_c_r']
  }),
  wallet({
    id: 'linkaja',
    name: 'LinkAja',
    description: '仅在印度尼西亚可用的 LinkAja 电子钱包。',
    initial: 'L',
    accent: '#e31e2d',
    availability: ['ID'],
    sourceCodes: ['pm_pi_ew_linkaja_c_r']
  }),
  wallet({
    id: 'mercadopago',
    name: 'Mercado Pago',
    description: '在巴西、智利和墨西哥可用的 Mercado Pago 电子钱包。',
    initial: 'MP',
    accent: '#009ee3',
    availability: ['BR', 'CL', 'MX'],
    sourceCodes: ['pm_pi_ew_mercadopago_c_r']
  }),
  wallet({
    id: 'momo',
    name: 'MoMo',
    description: '仅在越南可用的 MoMo 电子钱包。',
    initial: 'M',
    accent: '#a50064',
    availability: ['VN'],
    sourceCodes: ['pm_pi_ew_momo_c_r']
  }),
  wallet({
    id: 'mpaywallet',
    name: 'mPay Wallet',
    description: '仅在泰国可用的 mPay Wallet 电子钱包。',
    initial: 'MW',
    accent: '#ef4b23',
    availability: ['TH'],
    sourceCodes: ['pm_pi_ew_mpaywallet_c_r']
  }),
  wallet({
    id: 'naverpay',
    name: 'Naver Pay',
    description: '仅在韩国可用的 Naver Pay 电子钱包。',
    initial: 'N',
    accent: '#03c75a',
    availability: ['KR'],
    sourceCodes: ['pm_pi_ew_naverpay_c_r']
  }),
  wallet({
    id: 'ovo',
    name: 'OVO',
    description: '仅在印度尼西亚可用的 OVO 电子钱包。',
    initial: 'O',
    accent: '#4c2a86',
    availability: ['ID'],
    sourceCodes: ['pm_pi_ew_ovo_c_r']
  }),
  wallet({
    id: 'payco',
    name: 'PAYCO',
    description: '仅在韩国可用的 PAYCO 电子钱包。',
    initial: 'P',
    accent: '#fa2828',
    availability: ['KR'],
    sourceCodes: ['pm_pi_ew_payco_c_r']
  }),
  wallet({
    id: 'paymaya',
    name: 'PayMaya',
    description: '仅在菲律宾可用的 PayMaya 电子钱包。',
    initial: 'PM',
    accent: '#00bfa5',
    availability: ['PH'],
    sourceCodes: ['pm_pi_ew_paymaya_c_r']
  }),
  wallet({
    id: 'payoneer',
    name: 'Payoneer',
    description: '仅在中国大陆可用的 Payoneer 电子钱包。',
    initial: 'P',
    accent: '#ff4800',
    availability: ['CN'],
    sourceCodes: ['pm_pi_ew_payoneer_b_r']
  }),
  wallet({
    id: 'paypal',
    name: 'PayPal',
    description: '全球可用的 PayPal 电子钱包。',
    initial: 'P',
    accent: '#0070ba',
    availability: 'global',
    sourceCodes: ['pm_pi_ew_paypal_c_d', 'pm_pi_ew_paypal_c_r'],
    integrationModes: ['hosted', 'embedded']
  }),
  wallet({
    id: 'rabbitlinepay',
    name: 'Rabbit LINE Pay',
    description: '仅在泰国可用的 Rabbit LINE Pay 电子钱包。',
    initial: 'RL',
    accent: '#06c755',
    availability: ['TH'],
    sourceCodes: ['pm_pi_ew_rabbitlinepay_c_d', 'pm_pi_ew_rabbitlinepay_c_r']
  }),
  wallet({
    id: 'razergold',
    name: 'Razer Gold',
    description: '仅在马来西亚可用的 Razer Gold 电子钱包。',
    initial: 'R',
    accent: '#44d62c',
    availability: ['MY'],
    sourceCodes: ['pm_pi_ew_razergold_c_r']
  }),
  wallet({
    id: 'tosspay',
    name: 'Toss Pay',
    description: '仅在韩国可用的 Toss Pay 电子钱包。',
    initial: 'T',
    accent: '#0064ff',
    availability: ['KR'],
    sourceCodes: ['pm_pi_ew_tosspay_c_r']
  }),
  wallet({
    id: 'touchngo',
    name: "Touch 'n Go",
    description: "仅在马来西亚可用的 Touch 'n Go 电子钱包。",
    initial: 'T',
    accent: '#1455ad',
    availability: ['MY'],
    sourceCodes: ['pm_pi_ew_touchngo_c_r']
  }),
  wallet({
    id: 'truemoney',
    name: 'TrueMoney',
    description: '仅在泰国可用的 TrueMoney 电子钱包。',
    initial: 'T',
    accent: '#f58220',
    availability: ['TH'],
    sourceCodes: ['pm_pi_ew_truemoney_c_d', 'pm_pi_ew_truemoney_c_r']
  }),
  wallet({
    id: 'wechatpay',
    name: 'WeChat Pay',
    description: '全球可用的 WeChat Pay 电子钱包。',
    initial: 'W',
    accent: '#07c160',
    availability: 'global',
    sourceCodes: ['pm_pi_ew_wechatpay_c_r']
  }),
  wallet({
    id: 'zalopay',
    name: 'ZaloPay',
    description: '仅在越南可用的 ZaloPay 电子钱包。',
    initial: 'Z',
    accent: '#008fe5',
    availability: ['VN'],
    sourceCodes: ['pm_pi_ew_zalopay_c_r']
  })
]

export const electronicWalletPaymentMethodById = Object.fromEntries(
  electronicWalletPaymentMethods.map((method) => [method.id, method])
) as Record<ElectronicWalletPaymentMethodId, ElectronicWalletPaymentMethodDefinition>

export const realtimePaymentNetworkIds = [
  'duitnowqr',
  'pix',
  'promptpay',
  'qris'
] as const

export type RealtimePaymentNetworkId = (typeof realtimePaymentNetworkIds)[number]

export interface RealtimePaymentNetworkDefinition {
  id: RealtimePaymentNetworkId
  name: string
  description: string
  initial: string
  accent: string
  availability: readonly MarketCode[]
  sourceCodes: readonly string[]
  products: readonly ProductType[]
  environments: readonly Environment[]
  integrationModes: readonly IntegrationMode[]
  version: VersionTag
  paymentMethodTags: Readonly<Record<PaymentMethodTagId, SupportStatus>>
}

function realtimePaymentNetwork(
  definition: Omit<
    RealtimePaymentNetworkDefinition,
    'products' | 'environments' | 'integrationModes' | 'version' | 'paymentMethodTags'
  > & Partial<
    Pick<
      RealtimePaymentNetworkDefinition,
      'products' | 'environments' | 'integrationModes' | 'version' | 'paymentMethodTags'
    >
  >
): RealtimePaymentNetworkDefinition {
  return {
    products: onlinePaymentOnly,
    environments: walletEnvironments,
    integrationModes: walletIntegrationModes,
    version: 'standard',
    paymentMethodTags: {
      standaloneBinding: 'unsupported',
      payAndBind: 'unsupported',
      preAuthPay: 'unsupported'
    },
    ...definition
  }
}

export const realtimePaymentNetworks: readonly RealtimePaymentNetworkDefinition[] = [
  realtimePaymentNetwork({
    id: 'duitnowqr',
    name: 'DuitNow QR',
    description: '仅在马来西亚可用的实时支付网络。',
    initial: 'DQ',
    accent: '#e31837',
    availability: ['MY'],
    sourceCodes: ['pm_pi_bap_duitnowqr_c_d']
  }),
  realtimePaymentNetwork({
    id: 'pix',
    name: 'PIX',
    description: '仅在巴西可用的实时支付网络。',
    initial: 'P',
    accent: '#12b3a8',
    availability: ['BR'],
    sourceCodes: ['pm_pi_bap_pix_c_d'],
    products: ['online', 'subscription'],
    paymentMethodTags: {
      standaloneBinding: 'unsupported',
      payAndBind: 'standard',
      preAuthPay: 'unsupported'
    }
  }),
  realtimePaymentNetwork({
    id: 'promptpay',
    name: 'PromptPay',
    description: '仅在泰国可用的实时支付网络。',
    initial: 'P',
    accent: '#265fcf',
    availability: ['TH'],
    sourceCodes: ['pm_pi_bap_promptpay_c_r'],
    paymentMethodTags: {
      standaloneBinding: 'unsupported',
      payAndBind: 'standard',
      preAuthPay: 'unsupported'
    }
  }),
  realtimePaymentNetwork({
    id: 'qris',
    name: 'QRIS',
    description: '仅在印度尼西亚可用的实时支付网络。',
    initial: 'Q',
    accent: '#b51f2e',
    availability: ['ID'],
    sourceCodes: ['pm_pi_bap_qris_c_r']
  })
]

export const realtimePaymentNetworkById = Object.fromEntries(
  realtimePaymentNetworks.map((method) => [method.id, method])
) as Record<RealtimePaymentNetworkId, RealtimePaymentNetworkDefinition>

export const mobileBankingPaymentMethodIds = [
  'bay',
  'coda',
  'kbank',
  'ktb',
  'scb'
] as const

export type MobileBankingPaymentMethodId = (typeof mobileBankingPaymentMethodIds)[number]

export interface MobileBankingPaymentMethodDefinition {
  id: MobileBankingPaymentMethodId
  name: string
  description: string
  initial: string
  accent: string
  availability: readonly MarketCode[]
  sourceCodes: readonly string[]
  products: readonly ProductType[]
  environments: readonly Environment[]
  integrationModes: readonly IntegrationMode[]
  version: VersionTag
  paymentMethodTags: Readonly<Record<PaymentMethodTagId, SupportStatus>>
}

function mobileBankingPaymentMethod(
  definition: Omit<
    MobileBankingPaymentMethodDefinition,
    'products' | 'environments' | 'integrationModes' | 'version' | 'paymentMethodTags'
  >
): MobileBankingPaymentMethodDefinition {
  return {
    products: onlinePaymentOnly,
    environments: walletEnvironments,
    integrationModes: walletIntegrationModes,
    version: 'standard',
    paymentMethodTags: {
      standaloneBinding: 'unsupported',
      payAndBind: 'unsupported',
      preAuthPay: 'unsupported'
    },
    ...definition
  }
}

export const mobileBankingPaymentMethods: readonly MobileBankingPaymentMethodDefinition[] = [
  mobileBankingPaymentMethod({
    id: 'bay',
    name: 'BAY',
    description: '仅在泰国可用的手机银行支付。',
    initial: 'B',
    accent: '#f5b800',
    availability: ['TH'],
    sourceCodes: ['pm_pi_mb_bay_c_r']
  }),
  mobileBankingPaymentMethod({
    id: 'coda',
    name: 'Coda',
    description: '仅在印度尼西亚可用的手机银行支付。',
    initial: 'C',
    accent: '#f15a24',
    availability: ['ID'],
    sourceCodes: ['pm_pi_mb_coda_c_r']
  }),
  mobileBankingPaymentMethod({
    id: 'kbank',
    name: 'KBank',
    description: '仅在泰国可用的手机银行支付。',
    initial: 'K',
    accent: '#138f52',
    availability: ['TH'],
    sourceCodes: ['pm_pi_mb_kbank_c_r']
  }),
  mobileBankingPaymentMethod({
    id: 'ktb',
    name: 'KTB',
    description: '仅在泰国可用的手机银行支付。',
    initial: 'K',
    accent: '#00a6e2',
    availability: ['TH'],
    sourceCodes: ['pm_pi_mb_ktb_c_r']
  }),
  mobileBankingPaymentMethod({
    id: 'scb',
    name: 'SCB',
    description: '仅在泰国可用的手机银行支付。',
    initial: 'S',
    accent: '#4e2a84',
    availability: ['TH'],
    sourceCodes: ['pm_pi_mb_scb_c_r']
  })
]

export const mobileBankingPaymentMethodById = Object.fromEntries(
  mobileBankingPaymentMethods.map((method) => [method.id, method])
) as Record<MobileBankingPaymentMethodId, MobileBankingPaymentMethodDefinition>

export const bankTransferPaymentMethodIds = [
  'banktransfer',
  'btcoda',
  'spei'
] as const

export type BankTransferPaymentMethodId = (typeof bankTransferPaymentMethodIds)[number]

export interface BankTransferPaymentMethodDefinition {
  id: BankTransferPaymentMethodId
  name: string
  description: string
  initial: string
  accent: string
  availability: readonly MarketCode[]
  sourceCodes: readonly string[]
  products: readonly ProductType[]
  environments: readonly Environment[]
  integrationModes: readonly IntegrationMode[]
  version: VersionTag
  paymentMethodTags: Readonly<Record<PaymentMethodTagId, SupportStatus>>
}

function bankTransferPaymentMethod(
  definition: Omit<
    BankTransferPaymentMethodDefinition,
    'products' | 'environments' | 'integrationModes' | 'version' | 'paymentMethodTags'
  >
): BankTransferPaymentMethodDefinition {
  return {
    products: onlinePaymentOnly,
    environments: walletEnvironments,
    integrationModes: walletIntegrationModes,
    version: 'standard',
    paymentMethodTags: {
      standaloneBinding: 'unsupported',
      payAndBind: 'unsupported',
      preAuthPay: 'unsupported'
    },
    ...definition
  }
}

export const bankTransferPaymentMethods: readonly BankTransferPaymentMethodDefinition[] = [
  bankTransferPaymentMethod({
    id: 'banktransfer',
    name: 'Bank Transfer',
    description: '仅在印度尼西亚可用的银行转账。',
    initial: 'B',
    accent: '#0f766e',
    availability: ['ID'],
    sourceCodes: ['pm_pi_bt_banktransfer_c_r']
  }),
  bankTransferPaymentMethod({
    id: 'btcoda',
    name: 'BT Coda',
    description: '仅在菲律宾可用的银行转账。',
    initial: 'BC',
    accent: '#f15a24',
    availability: ['PH'],
    sourceCodes: ['pm_pi_bt_btcoda_c_r']
  }),
  bankTransferPaymentMethod({
    id: 'spei',
    name: 'SPEI',
    description: '仅在墨西哥可用的银行转账。',
    initial: 'S',
    accent: '#1f5a94',
    availability: ['MX'],
    sourceCodes: ['pm_pi_bt_spei_c_d']
  })
]

export const bankTransferPaymentMethodById = Object.fromEntries(
  bankTransferPaymentMethods.map((method) => [method.id, method])
) as Record<BankTransferPaymentMethodId, BankTransferPaymentMethodDefinition>
