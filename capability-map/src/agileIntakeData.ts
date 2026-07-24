import type {
  Environment,
  IntegrationMode,
  MarketSelection,
  MerchantType,
  PaymentMethodTypeSelection,
  ProductType,
  SupportStatus
} from './capabilityData'
import type { DomainId } from './configTypes'

export type IntakeType = 'newBusiness' | 'newProduct' | 'newMerchantAccount' | 'capabilityExpansion'
export type IntakeStep = 1 | 2 | 3 | 4
export type IntakeStageId = 'acquiring' | 'refund' | 'chargeback' | 'settlement' | 'reconciliation'
export type PaymentBindingMode = 'none' | 'standaloneBinding' | 'payAndBind'
export type PaymentCardType = 'credit' | 'debit' | 'prepaid'

export interface PaymentChannelRequirement {
  id: string
  channelName: string
  reuseExistingAccount: boolean
  brandName: string
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

export interface AgileIntakeDraft {
  currentStep: IntakeStep
  intakeType: IntakeType
  businessName: string
  businessId: string
  product: ProductType
  merchantAccountId: string
  merchantType: MerchantType
  merchantContractingCountry: MarketSelection
  environment: Environment
  integrationMode: IntegrationMode
  consumerPaymentCountry: MarketSelection
  paymentMethodType: PaymentMethodTypeSelection
  paymentMethodRequirements: PaymentMethodRequirement[]
  selectedCapabilities: SelectedCapability[]
}

export interface DemoMerchantAccount {
  id: string
  name: string
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
    description: '首次为该业务设计完整收单方案',
    icon: 'business'
  },
  {
    value: 'newProduct',
    level: '产品级',
    title: '新产品接入',
    description: '已有业务接入新的收单支付产品',
    icon: 'product'
  },
  {
    value: 'newMerchantAccount',
    level: '商户号级',
    title: '新增商户号',
    description: '复用已有方案，为新主体或场景开户',
    icon: 'merchant'
  },
  {
    value: 'capabilityExpansion',
    level: '能力级',
    title: '存量能力扩展',
    description: '在已有商户号上扩展支付方式或功能',
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
        merchantType: 'platformMerchant',
        country: 'SG',
        products: ['online', 'agreementDeduction']
      },
      {
        id: 'SEA-STD-1038',
        name: '泰国直营商户号',
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
  { id: 'reconciliation', label: '账单与对账' }
]

export const nonAcquiringCapabilities: IntakeCapabilityTemplate[] = [
  { id: 'refund-dashboard', name: 'Dashboard 退款', description: '由运营人员在后台发起退款', stage: 'refund', group: '发起方式', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'refund-api', name: 'API 退款', description: '由业务系统通过接口发起退款', stage: 'refund', group: '发起方式', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'refund-funding-merchant', name: '商户出资', description: '由商户退款资金余额出资', stage: 'refund', group: '退款出资', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'refund-funding-platform', name: '平台商户垫资退款', description: '平台先行垫付，再进行资金结算', stage: 'refund', group: '退款出资', status: 'conditional', responsibleDomains: ['transaction', 'gn'], platformOnly: true },
  { id: 'refund-original', name: '原路退款', description: '退回用户原支付方式', stage: 'refund', group: '退款方式', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'refund-wallet', name: '退至钱包', description: '退款进入用户指定钱包', stage: 'refund', group: '退款方式', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
  { id: 'refund-payout', name: '退款转代发', description: '通过代发通道完成退款', stage: 'refund', group: '退款方式', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
  { id: 'refund-user-choice', name: '用户主动选择', description: '由用户选择退款到账方式', stage: 'refund', group: '退款方式决策', status: 'standard', responsibleDomains: ['cashier'] },
  { id: 'refund-auto-route', name: '系统自动路由', description: '按规则自动选择可用退款路径', stage: 'refund', group: '退款方式决策', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
  { id: 'refund-proof', name: '退款查单凭证', description: '提供退款状态查询与用户侧凭证', stage: 'refund', group: '增值服务', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'refund-fx-lock', name: '退款换汇保价', description: '降低跨币种退款汇率波动影响', stage: 'refund', group: '增值服务', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
  { id: 'chargeback-merchant', name: '商户承担', description: '拒付损失由商户承担', stage: 'chargeback', group: '拒付损失承担', status: 'standard', responsibleDomains: ['transaction'] },
  { id: 'chargeback-protection', name: '欺诈拒付包赔', description: '符合规则的欺诈拒付由平台赔付', stage: 'chargeback', group: '拒付损失承担', status: 'conditional', responsibleDomains: ['transaction', 'gn'] },
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
  { id: 'reconciliation-group', name: '集团财务对账', description: '由集团财务统一完成对账', stage: 'reconciliation', group: '对账模式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'reconciliation-independent', name: '自主对账', description: '由业务主体自行完成账单核对', stage: 'reconciliation', group: '对账模式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'bill-settlement', name: '结算账单', description: '结算周期和资金到账明细', stage: 'reconciliation', group: '基础账单', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'bill-transaction', name: '交易账单', description: '支付与退款交易明细', stage: 'reconciliation', group: '基础账单', status: 'standard', responsibleDomains: ['transaction', 'gn'] },
  { id: 'bill-fund', name: '资金账单', description: '账户资金变动明细', stage: 'reconciliation', group: '基础账单', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'bill-tax', name: '计税账单', description: '计税能力对应的账单', stage: 'reconciliation', group: '增值能力账单', status: 'conditional', responsibleDomains: ['gn'] },
  { id: 'bill-marketing', name: '营销账单', description: '营销活动对应的账单', stage: 'reconciliation', group: '增值能力账单', status: 'conditional', responsibleDomains: ['gn'] },
  { id: 'bill-dashboard', name: 'Dashboard', description: '在管理后台下载账单', stage: 'reconciliation', group: '账单获取方式', status: 'standard', responsibleDomains: ['gn'] },
  { id: 'bill-api', name: 'API', description: '通过接口自动获取账单', stage: 'reconciliation', group: '账单获取方式', status: 'unsupported', responsibleDomains: ['gn'] },
  { id: 'bill-sftp', name: 'SFTP', description: '通过 SFTP 定时接收账单', stage: 'reconciliation', group: '账单获取方式', status: 'unsupported', responsibleDomains: ['gn'] }
]

export function createDefaultAgileDraft(): AgileIntakeDraft {
  return {
    currentStep: 1,
    intakeType: 'newProduct',
    businessName: '',
    businessId: 'tiktok-shop-sea',
    product: 'subscription',
    merchantAccountId: '',
    merchantType: 'standardMerchant',
    merchantContractingCountry: 'SG',
    environment: 'web',
    integrationMode: 'hosted',
    consumerPaymentCountry: 'All',
    paymentMethodType: 'All',
    paymentMethodRequirements: [],
    selectedCapabilities: []
  }
}
