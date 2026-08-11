import {
  productOptions,
  type Environment,
  type IntegrationMode,
  type MarketSelection,
  type MerchantType,
  type PaymentMethodTypeSelection,
  type ProductType,
  type SupportStatus
} from './capabilityData'
import type { DomainId } from './configTypes'

export type IntakeType = 'newBusiness' | 'newProduct' | 'newMerchantAccount' | 'capabilityExpansion'
export type IntakeBusinessType = 'acquiring' | 'payout'
export type IntakeProductType = ProductType | 'iap'
export type IntakeStep = 1 | 2 | 3
export type IntakeStageId =
  | 'acquiring'
  | 'refund'
  | 'chargeback'
  | 'settlement'
  | 'withdrawal'
  | 'reconciliation'
  | 'currencyExchange'
  | 'taxCalculation'
  | 'userFee'
export type MerchantAccountSelectionMode = 'existing' | 'new'
export type PaymentBindingMode = 'none' | 'standaloneBinding' | 'payAndBind'
export type PaymentCardType = 'credit' | 'debit' | 'prepaid'
export type SettlementCycleBasis = 'D' | 'T'
export type IntakeModuleAction = 'businessFirstAccess' | 'merchantFirstAccess' | 'capabilityAdjustment'
export type UserFeeCalculationMode = 'percentage' | 'fixed'
export type TaxCalculationMode = 'taxInclusive' | 'taxExclusive'
export type TaxRuleCountry = 'Default' | Exclude<MarketSelection, 'All'>

export interface TaxRule {
  id: string
  country: TaxRuleCountry
  calculationMode: TaxCalculationMode
  invoicingEnabled: boolean
}

export interface UserFeeRule {
  id: string
  paymentMethodId: string
  country: Exclude<MarketSelection, 'All'>
  calculationMode: UserFeeCalculationMode
  percentageRate: string
  fixedAmount: string
  currency: string
}

export interface PaymentChannelRequirement {
  id: string
  channelName: string
  createNewAccount: boolean
  channelId: string
  merchantDescriptor: string
  channelPaymentMinLimit: string
  channelPaymentMaxLimit: string
  cardVerificationAmount: string
}

export interface PaymentMethodRequirement {
  id: string
  paymentMethodId: string
  country: Exclude<MarketSelection, 'All'>
  currency: string
  bindingMode: PaymentBindingMode
  cardTypes: PaymentCardType[]
  channels: PaymentChannelRequirement[]
  channelRoutingRequirement: string
}

export interface SelectedCapability {
  id: string
  name: string
  stage: IntakeStageId
  group: string
  status: SupportStatus
  responsibleDomains: DomainId[]
}

export interface IntakeMerchantSubject {
  id: string
  accountMode: MerchantAccountSelectionMode
  merchantAccountId: string
  subjectName: string
  merchantDescriptor: string
  merchantType: MerchantType
  merchantContractingCountry: MarketSelection
  newProducts: IntakeProductType[]
  moduleActions: Record<string, IntakeModuleAction>
  taxRules: TaxRule[]
  userFeeRules: UserFeeRule[]
}

export interface IntakeCapabilityPlan {
  id: string
  merchantSubjectId: string
  product: IntakeProductType
  environment: Environment
  integrationMode: IntegrationMode
  consumerPaymentCountry: MarketSelection
  paymentMethodType: PaymentMethodTypeSelection
  paymentMethodRequirements: PaymentMethodRequirement[]
  pricingCurrencies: string[]
  settlementCurrencyMappings: Record<string, string>
  settlementCycleBasis: SettlementCycleBasis
  settlementCycleDays: number
  selectedCapabilities: SelectedCapability[]
  configured: boolean
}

export interface AgileIntakeDraft {
  currentStep: IntakeStep
  businessType: IntakeBusinessType
  intakeType: IntakeType
  businessName: string
  businessId: string
  product: ProductType
  merchantSubjects: IntakeMerchantSubject[]
  capabilityPlans: IntakeCapabilityPlan[]
  merchantAccountId: string
  merchantType: MerchantType
  merchantContractingCountry: MarketSelection
  environment: Environment
  integrationMode: IntegrationMode
  consumerPaymentCountry: MarketSelection
  paymentMethodType: PaymentMethodTypeSelection
  paymentMethodRequirements: PaymentMethodRequirement[]
  pricingCurrencies: string[]
  settlementCurrencyMappings: Record<string, string>
  settlementCycleBasis: SettlementCycleBasis
  settlementCycleDays: number
  selectedCapabilities: SelectedCapability[]
}

export interface DemoMerchantAccount {
  id: string
  name: string
  subjectName: string
  merchantDescriptor: string
  merchantType: MerchantType
  country: MarketSelection
  products: ProductType[]
}

export interface DemoBusiness {
  id: string
  name: string
  products: ProductType[]
  accounts: DemoMerchantAccount[]
}

export interface IntakeCapabilityTemplate {
  id: string
  name: string
  description: string
  stage: Exclude<IntakeStageId, 'acquiring'>
  group: string
  status: SupportStatus
  responsibleDomains: DomainId[]
  platformOnly?: boolean
}

export const intakeBusinessTypeOptions: Array<{
  value: IntakeBusinessType
  title: string
  englishTitle: string
  description: string
  icon: 'acquiring' | 'payout'
  comingSoon?: boolean
}> = [
  {
    value: 'acquiring',
    title: '收单',
    englishTitle: 'Pay-in',
    description: '面向用户付款、退款、拒付和清结算场景',
    icon: 'acquiring'
  },
  {
    value: 'payout',
    title: '代发',
    englishTitle: 'Pay-out',
    description: '面向用户或合作方的资金出款场景',
    icon: 'payout',
    comingSoon: true
  }
]

export const intakeProductOptions: Array<{
  label: string
  value: IntakeProductType
  description: string
}> = [
  ...productOptions,
  {
    label: 'IAP',
    value: 'iap',
    description: '应用商店内购支付，适合数字内容和虚拟权益'
  }
]

export const intakeTypeOptions: Array<{
  value: IntakeType
  level: string
  title: string
  description: string
  icon: 'business' | 'product' | 'merchant' | 'capability'
}> = [
  {
    value: 'newBusiness',
    level: '业务级',
    title: '新业务接入',
    description: '业务首次接入收单或代发产品',
    icon: 'business'
  },
  {
    value: 'newProduct',
    level: '产品级',
    title: '新产品接入',
    description: '已有业务接入新的产品；即使同时新增商户号，也选择此项',
    icon: 'product'
  },
  {
    value: 'newMerchantAccount',
    level: '商户号级',
    title: '产品应用至其他商户号',
    description: '将业务已接入的产品应用至其他商户号；商户号可为已有或新增',
    icon: 'merchant'
  },
  {
    value: 'capabilityExpansion',
    level: '能力级',
    title: '能力扩展',
    description: '产品和商户号不变，仅新增支付方式或其他能力',
    icon: 'capability'
  }
]

export const demoBusinesses: DemoBusiness[] = [
  {
    id: 'tiktok-shop-sea',
    name: 'TikTok Shop SEA',
    products: ['online', 'agreementDeduction'],
    accounts: [
      {
        id: 'SEA-PLAT-1001',
        name: 'SEA 平台主商户号',
        subjectName: 'TikTok Shop SEA Pte. Ltd.',
        merchantDescriptor: 'TIKTOK SHOP SEA',
        merchantType: 'platformMerchant',
        country: 'SG',
        products: ['online', 'agreementDeduction']
      },
      {
        id: 'SEA-STD-1038',
        name: '泰国直营商户号',
        subjectName: 'TikTok Shop Thailand Ltd.',
        merchantDescriptor: 'TIKTOK SHOP TH',
        merchantType: 'standardMerchant',
        country: 'TH',
        products: ['online']
      }
    ]
  },
  {
    id: 'capcut-commerce',
    name: 'CapCut Commerce',
    products: ['online', 'subscription'],
    accounts: [
      {
        id: 'US-STD-2086',
        name: '美国订阅商户号',
        subjectName: 'CapCut Commerce Inc.',
        merchantDescriptor: 'CAPCUT COMMERCE',
        merchantType: 'standardMerchant',
        country: 'US',
        products: ['online', 'subscription']
      }
    ]
  },
  {
    id: 'lemon8-membership',
    name: 'Lemon8 Membership',
    products: ['subscription'],
    accounts: [
      {
        id: 'JP-STD-3012',
        name: '日本会员业务商户号',
        subjectName: 'Lemon8 Japan G.K.',
        merchantDescriptor: 'LEMON8 MEMBERSHIP',
        merchantType: 'standardMerchant',
        country: 'JP',
        products: ['subscription']
      }
    ]
  }
]

export const intakeStageOptions: Array<{ id: IntakeStageId; label: string }> = [
  { id: 'acquiring', label: '收单支付' },
  { id: 'refund', label: '退款' },
  { id: 'chargeback', label: '拒付' },
  { id: 'settlement', label: '清结算' },
  { id: 'withdrawal', label: '提现' },
  { id: 'reconciliation', label: '账单与对账' },
  { id: 'currencyExchange', label: '换汇' },
  { id: 'taxCalculation', label: '计税' },
  { id: 'userFee', label: '用户手续费' }
]

export const nonAcquiringCapabilities: IntakeCapabilityTemplate[] = [
  { id: 'refund-dashboard', name: 'Dashboard 退款', description: '仅支持全额退款', stage: 'refund', group: '发起方式', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'refund-api', name: 'API 退款', description: '由业务系统通过接口发起退款', stage: 'refund', group: '发起方式', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'refund-funding-merchant', name: '商户出资', description: '由商户退款资金余额出资', stage: 'refund', group: '退款出资', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'refund-funding-platform', name: '平台商户垫资退款', description: '平台先行垫付，再进行资金结算', stage: 'refund', group: '退款出资', status: 'conditional', responsibleDomains: ['transaction', 'gn'], platformOnly: true },
  { id: 'refund-original', name: '原路退款', description: '退回用户原支付方式', stage: 'refund', group: '退款方式', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'refund-wallet', name: '退至钱包', description: '退款进入用户指定钱包', stage: 'refund', group: '退款方式', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
  { id: 'refund-payout', name: '退款转代发', description: '通过代发通道完成退款', stage: 'refund', group: '退款方式', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
  { id: 'refund-user-choice', name: '用户主动选择', description: '由用户选择退款到账方式', stage: 'refund', group: '退款方式决策', status: 'standard', responsibleDomains: ['cashier'] },
  { id: 'refund-auto-route', name: '系统自动路由', description: '按规则自动选择可用退款路径', stage: 'refund', group: '退款方式决策', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
  { id: 'refund-proof', name: '退款查单凭证', description: '提供退款状态查询与用户侧凭证', stage: 'refund', group: '增值服务', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'chargeback-merchant', name: '全部由商户承担', description: '全部拒付损失由商户承担', stage: 'chargeback', group: '拒付损失承担', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'chargeback-protection', name: '欺诈拒付PIPO报赔', description: '符合规则的欺诈拒付由 PIPO 赔付', stage: 'chargeback', group: '拒付损失承担', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'chargeback-visa', name: 'Visa', description: '支持银行卡交易争议处理', stage: 'chargeback', group: '支持拒付的支付方式', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'chargeback-mastercard', name: 'Mastercard', description: '支持银行卡交易争议处理', stage: 'chargeback', group: '支持拒付的支付方式', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'chargeback-paypal', name: 'PayPal', description: '钱包交易争议处理', stage: 'chargeback', group: '支持拒付的支付方式', status: 'conditional', responsibleDomains: ['transaction'] },
  { id: 'chargeback-alert', name: '拒付预警消息', description: '在拒付处理节点推送预警', stage: 'chargeback', group: '增值服务', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'chargeback-fx-lock', name: '拒付换汇保价', description: '降低跨币种拒付汇率波动影响', stage: 'chargeback', group: '增值服务', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
  { id: 'settlement-periodic', name: '周期结算', description: '按固定周期发起资金结算', stage: 'settlement', group: '结算模式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'settlement-realtime', name: '实时结算', description: '满足条件后实时发起结算', stage: 'settlement', group: '结算模式', status: 'conditional', responsibleDomains: ['gn'] },
  { id: 'settlement-instruction', name: '指令结算', description: '由业务指令触发资金结算', stage: 'settlement', group: '结算模式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'settlement-account', name: '结算到户', description: '结算至商户银行账户', stage: 'settlement', group: '结算方式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'settlement-wallet', name: '结算到B钱包', description: '结算至商户 B 钱包', stage: 'settlement', group: '结算方式', status: 'conditional', responsibleDomains: ['gn'] },
  { id: 'settlement-internal', name: '内部结转清', description: '通过内部账户完成资金结转', stage: 'settlement', group: '结算方式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'settlement-fx-trade', name: '交易成功时', description: '交易成功时确定换汇报价', stage: 'settlement', group: '换汇报价时点', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'settlement-fx-start', name: '发起结算时', description: '发起结算时确定换汇报价', stage: 'settlement', group: '换汇报价时点', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'settlement-fx-lock', name: '交易前锁价', description: '交易前锁定换汇报价', stage: 'settlement', group: '换汇报价时点', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
  { id: 'settlement-refund-follow', name: '退随收', description: '退款与收款使用同一结算账期', stage: 'settlement', group: '退款结算账期', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'settlement-refund-separated', name: '收退分离', description: '收款与退款采用独立结算账期', stage: 'settlement', group: '退款结算账期', status: 'conditional', responsibleDomains: ['gn'] },
  { id: 'settlement-reserve', name: '结算预留金', description: '按规则预留部分结算资金', stage: 'settlement', group: '增值服务', status: 'conditional', responsibleDomains: ['gn'] },
  { id: 'split-instruction', name: '指令分账', description: '通过指令指定分账结果', stage: 'settlement', group: '分账能力', status: 'standard', responsibleDomains: ['transaction', 'gn'], platformOnly: true },
  { id: 'split-agreement', name: '协议分账', description: '按预设协议执行分账', stage: 'settlement', group: '分账能力', status: 'conditional', responsibleDomains: ['transaction', 'gn'], platformOnly: true },
  { id: 'split-basic', name: '分账', description: '将交易资金分配给多个主体', stage: 'settlement', group: '分账功能', status: 'standard', responsibleDomains: ['transaction', 'gn'], platformOnly: true },
  { id: 'split-return', name: '分账退回', description: '退回已完成的分账资金', stage: 'settlement', group: '分账功能', status: 'standard', responsibleDomains: ['transaction', 'gn'], platformOnly: true },
  { id: 'platform-transfer-api', name: 'API 发起平台转账', description: '通过接口发起平台资金转账', stage: 'settlement', group: '平台转账能力', status: 'standard', responsibleDomains: ['gn'], platformOnly: true },
  { id: 'withdrawal-auto', name: '系统自动提现', description: '业务系统根据提现规则自动执行', stage: 'withdrawal', group: '提现发起模式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'withdrawal-dashboard-manual', name: 'Dashboard 手动提现', description: '由运营人员在 Dashboard 手动发起', stage: 'withdrawal', group: '提现发起模式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'reconciliation-group', name: '集团财务对账', description: '由集团财务统一完成对账', stage: 'reconciliation', group: '对账模式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'reconciliation-independent', name: '自主对账', description: '由业务主体自行完成账单核对', stage: 'reconciliation', group: '对账模式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'bill-settlement', name: '结算账单', description: '结算周期和资金到账明细', stage: 'reconciliation', group: '基础账单', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'bill-transaction', name: '交易账单', description: '支付与退款交易明细', stage: 'reconciliation', group: '基础账单', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'bill-fund', name: '资金账单', description: '账户资金变动明细', stage: 'reconciliation', group: '基础账单', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'bill-tax', name: '计税账单', description: '计税能力对应的账单', stage: 'reconciliation', group: '增值能力账单', status: 'conditional', responsibleDomains: ['gn'] },
  { id: 'bill-marketing', name: '营销账单', description: '营销活动对应的账单', stage: 'reconciliation', group: '增值能力账单', status: 'conditional', responsibleDomains: ['gn'] },
  { id: 'bill-dashboard', name: 'Dashboard', description: '在管理后台下载账单', stage: 'reconciliation', group: '账单获取方式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'bill-api', name: 'API', description: '通过接口自动获取账单', stage: 'reconciliation', group: '账单获取方式', status: 'unsupported', responsibleDomains: ['gn'] },
  { id: 'bill-sftp', name: 'SFTP', description: '通过 SFTP 定时接收账单', stage: 'reconciliation', group: '账单获取方式', status: 'unsupported', responsibleDomains: ['gn'] },
  { id: 'service:fx', name: '不保价', description: '退款时按实时汇率换汇', stage: 'currencyExchange', group: '退款保价', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'service:fx-protected', name: '保价', description: '按照支付时原汇率换汇', stage: 'currencyExchange', group: '退款保价', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'service:tax', name: '计税', description: '支持税费计算与账单数据输出', stage: 'taxCalculation', group: '能力选择', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'service:user-fee', name: '用户手续费', description: '支持向用户收取交易手续费', stage: 'userFee', group: '能力选择', status: 'standard', responsibleDomains: ['transaction', 'cashier'] }
]

export function createDefaultMerchantSubject(
  id = 'merchant-subject:1',
  newProducts: IntakeProductType[] = []
): IntakeMerchantSubject {
  return {
    id,
    accountMode: 'new',
    merchantAccountId: '',
    subjectName: '',
    merchantDescriptor: '',
    merchantType: 'standardMerchant',
    merchantContractingCountry: 'SG',
    newProducts,
    moduleActions: {},
    taxRules: [],
    userFeeRules: []
  }
}

export function createDefaultAgileDraft(): AgileIntakeDraft {
  return {
    currentStep: 1,
    businessType: 'acquiring',
    intakeType: 'capabilityExpansion',
    businessName: '',
    businessId: '',
    product: 'online',
    merchantSubjects: [createDefaultMerchantSubject()],
    capabilityPlans: [],
    merchantAccountId: '',
    merchantType: 'standardMerchant',
    merchantContractingCountry: 'SG',
    environment: 'web',
    integrationMode: 'hosted',
    consumerPaymentCountry: 'All',
    paymentMethodType: 'All',
    paymentMethodRequirements: [],
    pricingCurrencies: ['USD'],
    settlementCurrencyMappings: { USD: 'USD' },
    settlementCycleBasis: 'T',
    settlementCycleDays: 5,
    selectedCapabilities: []
  }
}
