<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type HealthStatus = 'healthy' | 'attention' | 'inactive'
type RuntimeBusinessLine = 'collection' | 'payout'
type MerchantBusiness = 'TikTok Shop' | 'TikTok LIVE'
type RuntimeStage =
  | 'acquiring'
  | 'refund'
  | 'dispute'
  | 'settlement'
  | 'withdrawal'
  | 'reconciliation'
  | 'payoutPrefunding'
  | 'payoutExecution'
  | 'payoutReturn'
  | 'payoutReconciliation'
type CapabilityCategory =
  | '支付产品'
  | '收银台场景'
  | '支付方式'
  | '支付能力'
  | '增值服务'
  | '退款能力'
  | '拒付能力'
  | '结算能力'
  | '提现产品'
  | '提现场景'
  | '提现能力'
  | '提现增值服务'
  | '账单能力'
  | '对账能力'
  | '备款能力'
  | '代发产品'
  | '代发场景'
  | '代发能力'
  | '代发增值服务'
  | '收款方式'
  | '退票能力'
  | '出款账单能力'
type AcquiringProduct = '在线支付' | '协议代扣' | '订阅'
type IntegrationMode = '独立收银台' | '嵌入式收银台' | 'API'
type PaymentEnvironment = 'TT 端内' | 'TT 端外'

interface Merchant {
  id: string
  name: string
  business: MerchantBusiness
  entity: string
  market: string
  acquiringProductCode: string
  acquiringProductName: string
  lastSynced: string
}

interface RuntimeCapability {
  id: string
  merchantId: string
  name: string
  category: CapabilityCategory
  scene: string
  orders: number
  traffic: number
  successRate: number
  change: number
  status: HealthStatus
  trend: number[]
}

interface PaymentMethodDetail {
  id: string
  parentId: string
  name: string
  orders: number
  traffic: number
  successRate: number
  change: number
  status: HealthStatus
  trend: number[]
}

const merchants: Merchant[] = [
  {
    id: 'm-10086',
    name: 'OceanMall 跨境商城',
    business: 'TikTok Shop',
    entity: 'OceanMall Pte. Ltd.',
    market: 'SG / US / GB',
    acquiringProductCode: 'AQ514788',
    acquiringProductName: 'SG自营即时到账收单产品',
    lastSynced: '今天 14:32'
  },
  {
    id: 'm-20247',
    name: 'NovaPlay 游戏平台',
    business: 'TikTok LIVE',
    entity: 'NovaPlay Technology Ltd.',
    market: 'US / BR / ID',
    acquiringProductCode: 'AQ105046',
    acquiringProductName: 'US多渠道托管担保交易收单产品',
    lastSynced: '今天 14:29'
  },
  {
    id: 'm-30918',
    name: 'StyleLoop 时尚电商',
    business: 'TikTok Shop',
    entity: 'StyleLoop Commerce Inc.',
    market: 'GB / US',
    acquiringProductCode: 'AQ433168',
    acquiringProductName: 'UK托管担保交易收单产品',
    lastSynced: '今天 14:31'
  }
]

const runtimeCapabilities: RuntimeCapability[] = [
  { id: 'online', merchantId: 'm-10086', name: '在线支付', category: '支付产品', scene: 'TT 端外 · 嵌入式收银台', orders: 128460, traffic: 142985, successRate: 89.84, change: 12.6, status: 'healthy', trend: [55, 62, 58, 68, 76, 73, 88] },
  { id: 'cashier-embedded', merchantId: 'm-10086', name: '在线支付 + 嵌入式收银台 + TT 端外', category: '收银台场景', scene: '', orders: 104820, traffic: 115670, successRate: 90.62, change: 14.1, status: 'healthy', trend: [50, 57, 61, 66, 72, 77, 86] },
  { id: 'cashier-api', merchantId: 'm-10086', name: '在线支付 + API + TT 端外', category: '收银台场景', scene: '', orders: 23640, traffic: 27315, successRate: 86.55, change: 6.7, status: 'healthy', trend: [57, 59, 55, 64, 68, 70, 76] },
  { id: 'card', merchantId: 'm-10086', name: '银行卡', category: '支付方式', scene: 'Visa / Mastercard / Amex', orders: 72482, traffic: 80120, successRate: 90.47, change: 8.4, status: 'healthy', trend: [52, 60, 57, 66, 71, 76, 82] },
  { id: 'wallet', merchantId: 'm-10086', name: '电子钱包', category: '支付方式', scene: 'Apple Pay / PayPal / GCash', orders: 38892, traffic: 42108, successRate: 92.36, change: 19.2, status: 'healthy', trend: [42, 46, 54, 57, 63, 72, 84] },
  { id: 'internet-banking', merchantId: 'm-10086', name: '网银', category: '支付方式', scene: 'FPX / BDO / BPI', orders: 17086, traffic: 20757, successRate: 82.31, change: -3.8, status: 'attention', trend: [74, 70, 68, 65, 61, 63, 58] },
  { id: 'retry', merchantId: 'm-10086', name: '支付重试', category: '支付能力', scene: '收银台挽回 · 二次拉起', orders: 9264, traffic: 11380, successRate: 31.75, change: 6.7, status: 'healthy', trend: [48, 52, 51, 62, 59, 70, 75] },
  { id: 'combined', merchantId: 'm-10086', name: '组合支付', category: '支付能力', scene: 'Tiktok Pay + 其他支付方式', orders: 3690, traffic: 4198, successRate: 87.9, change: 2.1, status: 'healthy', trend: [60, 58, 64, 66, 65, 70, 72] },
  { id: 'fx', merchantId: 'm-10086', name: '换汇', category: '增值服务', scene: '动态货币转换', orders: 23415, traffic: 25690, successRate: 98.92, change: 15.4, status: 'healthy', trend: [40, 48, 51, 60, 67, 74, 83] },
  { id: 'tax', merchantId: 'm-10086', name: '计税', category: '增值服务', scene: 'US / GB', orders: 7842, traffic: 8310, successRate: 99.41, change: -0.7, status: 'healthy', trend: [70, 71, 73, 72, 70, 69, 70] },
  { id: 'subscription', merchantId: 'm-20247', name: '订阅', category: '支付产品', scene: 'TT 端外 · API', orders: 86420, traffic: 101228, successRate: 85.37, change: 22.3, status: 'healthy', trend: [36, 43, 50, 56, 64, 76, 89] },
  { id: 'agreement', merchantId: 'm-20247', name: '协议代扣', category: '支付产品', scene: 'TT 端外 · API', orders: 54480, traffic: 68830, successRate: 79.15, change: -5.2, status: 'attention', trend: [80, 76, 73, 68, 64, 60, 56] },
  { id: 'cashier-api-2', merchantId: 'm-20247', name: '订阅 + API + TT 端外', category: '收银台场景', scene: '', orders: 86420, traffic: 101228, successRate: 85.37, change: 22.3, status: 'healthy', trend: [36, 43, 50, 56, 64, 76, 89] },
  { id: 'cashier-agreement-api-2', merchantId: 'm-20247', name: '协议代扣 + API + TT 端外', category: '收银台场景', scene: '', orders: 54480, traffic: 68830, successRate: 79.15, change: -5.2, status: 'attention', trend: [80, 76, 73, 68, 64, 60, 56] },
  { id: 'card-2', merchantId: 'm-20247', name: '银行卡', category: '支付方式', scene: 'Visa / Mastercard', orders: 112300, traffic: 139430, successRate: 80.54, change: 7.8, status: 'healthy', trend: [51, 54, 59, 63, 67, 72, 77] },
  { id: 'renewal', merchantId: 'm-20247', name: '续订扣款', category: '支付能力', scene: '主 PI 扣款 · 备用 PI', orders: 49320, traffic: 64190, successRate: 76.83, change: -6.4, status: 'attention', trend: [82, 78, 73, 70, 64, 58, 54] },
  { id: 'online-3', merchantId: 'm-30918', name: '在线支付', category: '支付产品', scene: 'TT 端内 · 独立收银台', orders: 68740, traffic: 73216, successRate: 93.89, change: 4.6, status: 'healthy', trend: [58, 60, 63, 62, 68, 71, 74] },
  { id: 'cashier-hosted-3', merchantId: 'm-30918', name: '在线支付 + 独立收银台 + TT 端内', category: '收银台场景', scene: '', orders: 68740, traffic: 73216, successRate: 93.89, change: 4.6, status: 'healthy', trend: [58, 60, 63, 62, 68, 71, 74] },
  { id: 'card-3', merchantId: 'm-30918', name: '银行卡', category: '支付方式', scene: 'Visa / Mastercard / Amex', orders: 68740, traffic: 73216, successRate: 93.89, change: 4.6, status: 'healthy', trend: [58, 60, 63, 62, 68, 71, 74] }
]

function createLifecycleCapabilities(merchantId: string, scale: number): RuntimeCapability[] {
  const metric = (value: number) => Math.round(value * scale)
  const item = (
    id: string,
    name: string,
    category: CapabilityCategory,
    traffic: number,
    successRate: number,
    change: number,
    status: HealthStatus = 'healthy'
  ): RuntimeCapability => ({
    id: `${id}-${merchantId}`,
    merchantId,
    name,
    category,
    scene: '',
    traffic: metric(traffic),
    orders: Math.round(metric(traffic) * successRate / 100),
    successRate,
    change,
    status,
    trend: change >= 0 ? [48, 53, 57, 62, 66, 72, 80] : [78, 74, 70, 66, 61, 57, 52]
  })

  const capabilities: RuntimeCapability[] = [
    item('refund-launch', '发起方式', '退款能力', 12060, 98.18, 7.2),
    item('refund-funding', '退款出资', '退款能力', 12060, 98.18, 5.1),
    item('refund-method', '退款方式', '退款能力', 12060, 98.18, 9.4),
    item('refund-decision', '退款方式决策', '退款能力', 4860, 96.32, 12.4),
    item('refund-integration', '收银台集成模式', '退款能力', 3280, 94.76, 4.8),
    item('refund-method-support', '支付方式原路退款能力', '退款能力', 12060, 97.25, 8.7),
    item('refund-payout-method', '转代发支付方式', '退款能力', 2380, 92.18, 16.2),
    item('refund-service', '退款增值服务', '退款能力', 5680, 99.12, 10.3),
    item('chargeback-funding', '拒付损失承担', '拒付能力', 386, 100, -3.1),
    item('chargeback-method', '支持拒付的支付方式', '拒付能力', 386, 100, -3.1),
    item('chargeback-service', '拒付增值服务', '拒付能力', 292, 84.93, -8.6, 'attention'),
    item('settlement-mode', '结算模式', '结算能力', 32610, 99.6, 9.8),
    item('settlement-destination', '结算方式', '结算能力', 32610, 99.6, 9.8),
    item('settlement-fx-timing', '换汇报价时点', '结算能力', 13120, 98.02, 15.6),
    item('settlement-refund-cycle', '退款结算账期', '结算能力', 8860, 98.87, 2.4),
    item('settlement-service', '结算增值服务', '结算能力', 2680, 96.42, 7.9),
    item('withdrawal-product', '提现产品', '提现产品', 18420, 97.86, 10.4),
    item('withdrawal-initiation', '发起方式', '提现场景', 18420, 97.86, 10.4),
    item('withdrawal-integration', '接入形态', '提现场景', 18420, 96.92, 8.7),
    item('withdrawal-core', '提现核心能力', '提现能力', 18420, 97.24, 9.3),
    item('withdrawal-service', '提现增值服务', '提现增值服务', 9680, 94.85, 13.2),
    item('prefunding-module', '备款产品分类', '备款能力', 28640, 98.72, 8.6),
    item('prefunding-trigger', '备款触发方式', '备款能力', 28640, 98.72, 8.6),
    item('prefunding-process', '请款与认款流程', '备款能力', 28640, 97.84, 6.8),
    item('disbursement-product', '代发产品', '代发产品', 24860, 96.58, 14.2),
    item('disbursement-user-type', '收款用户类型', '代发场景', 24860, 96.58, 14.2),
    item('disbursement-initiation', '发起方式', '代发场景', 24860, 96.58, 12.8),
    item('disbursement-integration', '接入形态', '代发场景', 24860, 95.92, 11.3),
    item('disbursement-asset', '支持的资产类型', '代发场景', 24860, 96.14, 9.7),
    item('disbursement-core', '代发核心能力', '代发能力', 24860, 96.58, 14.2),
    item('disbursement-service', '代发增值服务', '代发增值服务', 13720, 93.86, 16.4),
    item('disbursement-method', '收款方式', '收款方式', 24860, 96.58, 14.2),
    item('payout-return-core', '退票处理能力', '退票能力', 1680, 88.42, -4.6, 'attention'),
    item('payout-return-product', '默认接入产品', '退票能力', 1680, 88.42, -4.6, 'attention'),
    item('payout-return-difference', '退票补差模式', '退票能力', 1680, 86.72, -6.8, 'attention'),
    item('payout-recon-bill', '出款账单能力', '出款账单能力', 24860, 99.46, 7.2),
    { id: `bill-generate-${merchantId}`, merchantId, name: '账单生成', category: '账单能力', scene: '', orders: metric(68420), traffic: metric(68510), successRate: 99.87, change: 6.3, status: 'healthy', trend: [55, 58, 61, 64, 68, 72, 77] },
    { id: `recon-auto-${merchantId}`, merchantId, name: '自动对账', category: '对账能力', scene: '', orders: metric(66840), traffic: metric(68420), successRate: 97.69, change: 8.1, status: 'healthy', trend: [51, 55, 60, 63, 68, 73, 79] },
    { id: `recon-diff-${merchantId}`, merchantId, name: '差异处理', category: '对账能力', scene: '', orders: metric(1268), traffic: metric(1580), successRate: 80.25, change: -12.7, status: 'attention', trend: [82, 77, 72, 66, 61, 56, 50] }
  ]

  if (merchantId === 'm-20247') {
    capabilities.push(
      item('settlement-split-mode', '分账模式', '结算能力', 18640, 98.24, 11.2),
      item('settlement-split-function', '分账功能', '结算能力', 18640, 96.85, 13.5),
      item('settlement-transfer-launch', '平台转账发起方式', '结算能力', 7280, 99.16, 8.4)
    )
  }

  return capabilities
}

const lifecycleCapabilities = [
  ...createLifecycleCapabilities('m-10086', 1),
  ...createLifecycleCapabilities('m-20247', 1.45),
  ...createLifecycleCapabilities('m-30918', 0.62)
]

interface LifecycleDetailSpec {
  name: string
  conditional?: boolean
}

function createLifecycleDetails(merchantId: string, scale: number): PaymentMethodDetail[] {
  const buildGroup = (
    parentPrefix: string,
    specs: LifecycleDetailSpec[],
    totalTraffic: number,
    baseRate: number
  ) => {
    const parentId = `${parentPrefix}-${merchantId}`
    const weightTotal = specs.reduce((sum, _, index) => sum + specs.length - index, 0)
    return specs.map((spec, index) => {
      const traffic = Math.round(totalTraffic * scale * (specs.length - index) / weightTotal)
      const successRate = Math.max(58, baseRate - index * 1.35 - (spec.conditional ? 5.5 : 0))
      return {
        id: `${parentId}-${index}`,
        parentId,
        name: spec.name,
        traffic,
        orders: Math.round(traffic * successRate / 100),
        successRate,
        change: spec.conditional ? -2.4 - index : 4.2 + index,
        status: spec.conditional ? 'attention' as HealthStatus : 'healthy' as HealthStatus,
        trend: spec.conditional ? [74, 71, 68, 64, 61, 58, 55] : [50, 54, 57, 62, 66, 71, 77]
      }
    })
  }

  const details = [
    ...buildGroup('refund-launch', [{ name: 'Dashboard 退款' }, { name: 'API 退款' }], 12060, 98.8),
    ...buildGroup('refund-funding', [{ name: '商户出资' }, { name: '平台商户垫资退款', conditional: true }], 12060, 98.4),
    ...buildGroup('refund-method', [{ name: '原路退款' }, { name: '退至钱包', conditional: true }, { name: '退款转代发', conditional: true }], 12060, 98.6),
    ...buildGroup('refund-decision', [{ name: '用户主动选择' }, { name: '系统自动路由', conditional: true }], 4860, 97.2),
    ...buildGroup('refund-integration', [{ name: '独立收银台' }, { name: '嵌入式收银台', conditional: true }], 3280, 96.4),
    ...buildGroup('refund-method-support', [
      { name: 'Visa' }, { name: 'Mastercard' }, { name: 'PayPal', conditional: true },
      { name: 'PIX', conditional: true }, { name: 'PromptPay', conditional: true },
      { name: 'Apple Pay' }, { name: 'Google Pay' }, { name: 'Bank Transfer', conditional: true },
      { name: 'Alipay+', conditional: true }, { name: '银联卡', conditional: true }
    ], 12060, 99.1),
    ...buildGroup('refund-payout-method', [
      { name: '银行账户' }, { name: 'PayPal' }, { name: 'GoPay' }, { name: 'OVO', conditional: true },
      { name: 'DANA', conditional: true }, { name: 'GCash' }, { name: 'GrabPay', conditional: true },
      { name: "Touch 'n Go", conditional: true }
    ], 2380, 97.6),
    ...buildGroup('refund-service', [{ name: '退款查单凭证' }, { name: '退款换汇保价', conditional: true }], 5680, 99.4),
    ...buildGroup('chargeback-funding', [{ name: '商户承担' }, { name: '欺诈拒付包赔', conditional: true }], 386, 100),
    ...buildGroup('chargeback-method', [
      { name: 'Visa' }, { name: 'Mastercard' }, { name: 'PayPal', conditional: true },
      { name: '银联卡', conditional: true }, { name: 'Apple Pay' }
    ], 386, 100),
    ...buildGroup('chargeback-service', [{ name: '拒付预警消息' }, { name: '拒付换汇保价', conditional: true }], 292, 92.4),
    ...buildGroup('settlement-mode', [{ name: '周期结算' }, { name: '实时结算', conditional: true }, { name: '指令结算' }], 32610, 99.7),
    ...buildGroup('settlement-destination', [{ name: '结算到户' }, { name: '结算到B钱包', conditional: true }, { name: '内部结转清' }], 32610, 99.7),
    ...buildGroup('settlement-fx-timing', [{ name: '交易成功时' }, { name: '发起结算时' }, { name: '交易前锁价', conditional: true }], 13120, 99.1),
    ...buildGroup('settlement-refund-cycle', [{ name: '退随收' }, { name: '收退分离', conditional: true }], 8860, 99.2),
    ...buildGroup('settlement-service', [{ name: '结算预留金', conditional: true }], 2680, 96.4),
    ...buildGroup(
      'withdrawal-product',
      merchantId === 'm-20247'
        ? [{ name: '一级商户提现' }, { name: '二级商户提现' }, { name: '用户提现' }]
        : [{ name: '一级商户提现' }, { name: '用户提现' }],
      18420,
      98.4
    ),
    ...buildGroup('withdrawal-initiation', [{ name: '系统自动发起' }, { name: '用户手动发起' }], 18420, 98.2),
    ...buildGroup('withdrawal-integration', [
      { name: 'Sky 规则配置' },
      { name: 'Dashboard' },
      { name: '独立绑卡收银台 + 接口提现' },
      { name: '独立提现收银台', conditional: true }
    ], 18420, 98.1),
    ...buildGroup('withdrawal-core', [
      { name: '出款指令创建' },
      { name: '资金与余额校验' },
      { name: '风控与限额' },
      { name: '通道路由', conditional: true },
      { name: '状态查询' },
      { name: '结果通知' }
    ], 18420, 98.5),
    ...buildGroup('withdrawal-service', [
      { name: '换汇' },
      { name: '同名校验', conditional: true },
      { name: '收款 PI 跨业务共享', conditional: true },
      { name: '金融-溢缴款提现', conditional: true }
    ], 9680, 97.4),
    ...buildGroup('prefunding-module', [
      { name: '普通来账备款' },
      { name: '计费外缴备款' },
      { name: '清算后备款' },
      { name: '在线支付备款' }
    ], 28640, 99.1),
    ...buildGroup('prefunding-trigger', [
      { name: '页面触发' },
      { name: 'Sky 规则触发' },
      { name: '上游业务 API 触发' }
    ], 28640, 98.9),
    ...buildGroup('prefunding-process', [
      { name: '付款与请款' },
      { name: '付款成功认款' },
      { name: 'CA 记账' },
      { name: '备款冲正', conditional: true }
    ], 28640, 98.4),
    ...buildGroup('disbursement-product', [{ name: '单笔代发' }, { name: '批量代发' }], 24860, 97.3),
    ...buildGroup('disbursement-user-type', [{ name: 'B 端用户' }, { name: 'C 端用户' }], 24860, 97.3),
    ...buildGroup('disbursement-initiation', [
      { name: '系统自动发起' },
      { name: '用户手动发起' },
      { name: 'Dashboard 上传文件' }
    ], 24860, 97.2),
    ...buildGroup('disbursement-integration', [
      { name: '独立绑卡收银台 + 接口代发' },
      { name: '独立代发收银台' },
      { name: 'Drop-in 代发收银台', conditional: true },
      { name: 'Dashboard' }
    ], 24860, 97.1),
    ...buildGroup('disbursement-asset', [
      { name: '现金' },
      { name: '话费', conditional: true },
      { name: '礼品卡', conditional: true }
    ], 24860, 97.2),
    ...buildGroup('disbursement-core', [
      { name: '出款指令创建' },
      { name: '资金与余额校验' },
      { name: '风控与限额' },
      { name: '通道路由', conditional: true },
      { name: '状态查询' },
      { name: '结果通知' }
    ], 24860, 97.4),
    ...buildGroup('disbursement-service', [
      { name: '批量试算', conditional: true },
      { name: '换汇' },
      { name: '同名校验', conditional: true },
      { name: '收款 PI 跨业务共享', conditional: true },
      { name: '商家备款' }
    ], 13720, 96.8),
    ...buildGroup('disbursement-method', [
      { name: 'TikTok Seller Wallet' },
      { name: '银行账户转账' },
      { name: 'PayPal' },
      { name: 'PIX' },
      { name: 'TikTok Pay' },
      { name: '达人卡' },
      { name: '礼品卡', conditional: true },
      { name: '话费充值', conditional: true }
    ], 24860, 98),
    ...buildGroup('payout-return-core', [
      { name: '退票识别' },
      { name: '原因归类' },
      { name: '资金退回' },
      { name: '重新出款', conditional: true }
    ], 1680, 94.2),
    ...buildGroup('payout-return-product', [
      { name: '二级商户提现' },
      { name: '用户提现' },
      { name: '单笔代发' },
      { name: '批量代发' }
    ], 1680, 94.2),
    ...buildGroup('payout-return-difference', [
      { name: '净额模式' },
      { name: '足额模式', conditional: true },
      { name: 'PiPO 受益模式', conditional: true }
    ], 1680, 92.8),
    ...buildGroup('payout-recon-bill', [
      { name: '出款账单' },
      { name: '退票账单' },
      { name: '资金账单' },
      { name: '差异处理', conditional: true }
    ], 24860, 99.2)
  ]

  if (merchantId === 'm-20247') {
    details.push(
      ...buildGroup('settlement-split-mode', [{ name: '指令分账' }, { name: '协议分账', conditional: true }], 18640, 98.2),
      ...buildGroup('settlement-split-function', [
        { name: '分账' }, { name: '分账退回' }, { name: '二次分账', conditional: true },
        { name: '分账补差', conditional: true }, { name: '垫资回补', conditional: true }
      ], 18640, 97.5),
      ...buildGroup('settlement-transfer-launch', [{ name: 'Dashboard 发起' }, { name: 'API 发起' }], 7280, 99.2)
    )
  }

  return details
}

const lifecycleCapabilityDetails = [
  ...createLifecycleDetails('m-10086', 1),
  ...createLifecycleDetails('m-20247', 1.45),
  ...createLifecycleDetails('m-30918', 0.62)
]

const paymentMethodDetails: PaymentMethodDetail[] = [
  { id: 'visa', parentId: 'card', name: 'Visa', orders: 33820, traffic: 36840, successRate: 91.8, change: 10.2, status: 'healthy', trend: [51, 58, 60, 67, 70, 76, 84] },
  { id: 'mastercard', parentId: 'card', name: 'Mastercard', orders: 27642, traffic: 30880, successRate: 89.51, change: 6.9, status: 'healthy', trend: [55, 59, 57, 63, 68, 72, 78] },
  { id: 'amex', parentId: 'card', name: 'American Express', orders: 11020, traffic: 12400, successRate: 88.87, change: 4.1, status: 'healthy', trend: [50, 52, 56, 58, 63, 64, 70] },
  { id: 'apple-pay', parentId: 'wallet', name: 'Apple Pay', orders: 18640, traffic: 19830, successRate: 94, change: 21.8, status: 'healthy', trend: [38, 45, 52, 58, 65, 75, 88] },
  { id: 'paypal', parentId: 'wallet', name: 'PayPal', orders: 13982, traffic: 15318, successRate: 91.28, change: 17.4, status: 'healthy', trend: [46, 50, 55, 60, 64, 71, 80] },
  { id: 'g-cash', parentId: 'wallet', name: 'GCash', orders: 6270, traffic: 6960, successRate: 90.09, change: 13.2, status: 'healthy', trend: [43, 47, 50, 55, 62, 68, 75] },
  { id: 'fpx', parentId: 'internet-banking', name: 'FPX', orders: 9046, traffic: 10570, successRate: 85.58, change: 2.6, status: 'healthy', trend: [62, 65, 64, 66, 67, 70, 72] },
  { id: 'bdo', parentId: 'internet-banking', name: 'BDO', orders: 4520, traffic: 5700, successRate: 79.3, change: -7.1, status: 'attention', trend: [75, 71, 68, 64, 59, 56, 53] },
  { id: 'bpi', parentId: 'internet-banking', name: 'BPI', orders: 3520, traffic: 4487, successRate: 78.45, change: -5.4, status: 'attention', trend: [72, 69, 66, 63, 60, 58, 55] },
  { id: 'visa-2', parentId: 'card-2', name: 'Visa', orders: 64820, traffic: 79040, successRate: 82.01, change: 9.2, status: 'healthy', trend: [48, 53, 58, 62, 68, 73, 80] },
  { id: 'mastercard-2', parentId: 'card-2', name: 'Mastercard', orders: 47480, traffic: 60390, successRate: 78.62, change: 5.9, status: 'attention', trend: [55, 58, 60, 62, 65, 67, 70] },
  { id: 'visa-3', parentId: 'card-3', name: 'Visa', orders: 39840, traffic: 42120, successRate: 94.59, change: 5.2, status: 'healthy', trend: [56, 59, 62, 64, 68, 72, 76] },
  { id: 'mastercard-3', parentId: 'card-3', name: 'Mastercard', orders: 22380, traffic: 24100, successRate: 92.86, change: 3.8, status: 'healthy', trend: [59, 61, 63, 62, 67, 69, 72] },
  { id: 'amex-3', parentId: 'card-3', name: 'American Express', orders: 6520, traffic: 6996, successRate: 93.2, change: 4.4, status: 'healthy', trend: [54, 57, 59, 61, 64, 68, 71] }
]

const paymentCapabilityDetails: PaymentMethodDetail[] = [
  { id: 'cashier-recovery', parentId: 'retry', name: '收银台支付挽回', orders: 5120, traffic: 6000, successRate: 85.33, change: 8.6, status: 'healthy', trend: [45, 51, 50, 60, 58, 69, 76] },
  { id: 'reopen-cashier', parentId: 'retry', name: '二次拉起收银台支付', orders: 2984, traffic: 3180, successRate: 93.84, change: 5.2, status: 'healthy', trend: [52, 55, 54, 63, 61, 68, 73] },
  { id: 'backup-method-retry', parentId: 'retry', name: '备用支付方式重试', orders: 1160, traffic: 2200, successRate: 52.73, change: 3.1, status: 'attention', trend: [48, 49, 52, 55, 57, 60, 64] },
  { id: 'credit-plus-x', parentId: 'combined', name: 'Tiktok Pay + 其他支付方式', orders: 3690, traffic: 4198, successRate: 87.9, change: 2.1, status: 'healthy', trend: [60, 58, 64, 66, 65, 70, 72] },
  { id: 'primary-pi-charge', parentId: 'renewal', name: '主支付方式扣款', orders: 40120, traffic: 49830, successRate: 80.51, change: -4.8, status: 'attention', trend: [80, 77, 74, 70, 66, 62, 58] },
  { id: 'backup-pi-polling', parentId: 'renewal', name: '备用支付方式轮询', orders: 9200, traffic: 14360, successRate: 64.07, change: -9.2, status: 'attention', trend: [84, 80, 75, 69, 62, 56, 50] }
]

const selectedMerchantId = ref('')
const selectedBusinessLine = ref<RuntimeBusinessLine>('collection')
const selectedMerchantBusiness = ref<'全部' | MerchantBusiness>('TikTok Shop')
const selectedRuntimeStage = ref<RuntimeStage>('acquiring')
const dateRange = ref('近 7 天')
const selectedCategory = ref<'全部' | CapabilityCategory>('全部')
const selectedProduct = ref<'全部' | AcquiringProduct>('全部')
const selectedIntegration = ref<'全部' | IntegrationMode>('全部')
const selectedEnvironment = ref<'全部' | PaymentEnvironment>('全部')
const selectedMarket = ref('全部')
const searchQuery = ref('')
const expandedCapabilityGroups = ref<Set<string>>(new Set(['card', 'retry']))

const capabilityDimensions: Record<string, {
  product: AcquiringProduct
  integration: IntegrationMode
  environment: PaymentEnvironment
  markets: string[]
}> = {
  online: { product: '在线支付', integration: '嵌入式收银台', environment: 'TT 端外', markets: ['SG', 'US', 'GB'] },
  'cashier-embedded': { product: '在线支付', integration: '嵌入式收银台', environment: 'TT 端外', markets: ['SG', 'US', 'GB'] },
  'cashier-api': { product: '在线支付', integration: 'API', environment: 'TT 端外', markets: ['SG', 'US', 'GB'] },
  card: { product: '在线支付', integration: '嵌入式收银台', environment: 'TT 端外', markets: ['SG', 'US', 'GB'] },
  wallet: { product: '在线支付', integration: '嵌入式收银台', environment: 'TT 端外', markets: ['SG', 'US'] },
  local: { product: '在线支付', integration: 'API', environment: 'TT 端外', markets: ['SG'] },
  retry: { product: '在线支付', integration: '嵌入式收银台', environment: 'TT 端外', markets: ['SG', 'US', 'GB'] },
  combined: { product: '在线支付', integration: 'API', environment: 'TT 端外', markets: ['US', 'GB'] },
  fx: { product: '在线支付', integration: 'API', environment: 'TT 端外', markets: ['SG', 'US', 'GB'] },
  tax: { product: '在线支付', integration: 'API', environment: 'TT 端外', markets: ['US', 'GB'] },
  subscription: { product: '订阅', integration: 'API', environment: 'TT 端外', markets: ['US', 'BR', 'ID'] },
  agreement: { product: '协议代扣', integration: 'API', environment: 'TT 端外', markets: ['US', 'BR'] },
  'cashier-api-2': { product: '订阅', integration: 'API', environment: 'TT 端外', markets: ['US', 'BR', 'ID'] },
  'cashier-agreement-api-2': { product: '协议代扣', integration: 'API', environment: 'TT 端外', markets: ['US', 'BR'] },
  'card-2': { product: '订阅', integration: 'API', environment: 'TT 端外', markets: ['US', 'BR', 'ID'] },
  renewal: { product: '订阅', integration: 'API', environment: 'TT 端外', markets: ['US', 'BR', 'ID'] },
  'online-3': { product: '在线支付', integration: '独立收银台', environment: 'TT 端内', markets: ['GB', 'US'] },
  'cashier-hosted-3': { product: '在线支付', integration: '独立收银台', environment: 'TT 端内', markets: ['GB', 'US'] },
  'card-3': { product: '在线支付', integration: '独立收银台', environment: 'TT 端内', markets: ['GB', 'US'] }
}

const collectionStageOptions: Array<{ id: RuntimeStage; label: string; short: string }> = [
  { id: 'acquiring', label: '收单支付', short: '支付' },
  { id: 'refund', label: '退款', short: '退' },
  { id: 'dispute', label: '拒付', short: '拒' },
  { id: 'settlement', label: '清结算', short: '结' },
  { id: 'withdrawal', label: '提现', short: '提' },
  { id: 'reconciliation', label: '账单与对账', short: '账' }
]

const payoutStageOptions: Array<{ id: RuntimeStage; label: string; short: string }> = [
  { id: 'payoutPrefunding', label: '备款', short: '备' },
  { id: 'payoutExecution', label: '代发', short: '发' },
  { id: 'payoutReturn', label: '退票', short: '退' },
  { id: 'payoutReconciliation', label: '账单与对账', short: '账' }
]

const runtimeStageOptions = computed(() =>
  selectedBusinessLine.value === 'collection' ? collectionStageOptions : payoutStageOptions
)

const stageMetricCopy: Record<RuntimeStage, {
  total: string
  success: string
  rate: string
  note: string
}> = {
  acquiring: { total: '支付总单量', success: '支付成功单量', rate: '整体支付成功率', note: '按支付请求创建时间聚合' },
  refund: { total: '退款申请总单量', success: '退款成功单量', rate: '整体退款成功率', note: '按退款申请创建时间聚合' },
  dispute: { total: '拒付处理总单量', success: '处理完成单量', rate: '拒付处理完成率', note: '按拒付任务创建时间聚合' },
  settlement: { total: '结算总单量', success: '结算成功单量', rate: '整体结算成功率', note: '按结算任务创建时间聚合' },
  withdrawal: { total: '提现申请总单量', success: '提现成功单量', rate: '整体提现成功率', note: '按提现申请创建时间聚合' },
  reconciliation: { total: '对账总单量', success: '对账成功单量', rate: '整体对账成功率', note: '按账单与对账任务创建时间聚合' },
  payoutPrefunding: { total: '备款任务总量', success: '备款完成量', rate: '整体备款完成率', note: '按备款任务创建时间聚合' },
  payoutExecution: { total: '代发总单量', success: '代发成功单量', rate: '整体代发成功率', note: '按代发指令创建时间聚合' },
  payoutReturn: { total: '退票处理总量', success: '处理完成量', rate: '退票处理完成率', note: '按退票回执创建时间聚合' },
  payoutReconciliation: { total: '出款对账总量', success: '对账成功单量', rate: '整体出款对账成功率', note: '按出款账单创建时间聚合' }
}

function runtimeStageFor(capability: RuntimeCapability): RuntimeStage {
  if (capability.id.startsWith('prefunding-')) return 'payoutPrefunding'
  if (capability.id.startsWith('disbursement-')) return 'payoutExecution'
  if (capability.id.startsWith('payout-return-')) return 'payoutReturn'
  if (capability.id.startsWith('payout-recon-')) return 'payoutReconciliation'
  if (capability.id.startsWith('refund-')) return 'refund'
  if (capability.id.startsWith('chargeback-')) return 'dispute'
  if (capability.id.startsWith('settlement-')) return 'settlement'
  if (capability.id.startsWith('withdrawal-')) return 'withdrawal'
  if (capability.id.startsWith('bill-') || capability.id.startsWith('recon-')) return 'reconciliation'
  return 'acquiring'
}

function dimensionsFor(capability: RuntimeCapability) {
  const configured = capabilityDimensions[capability.id]
  if (configured) return configured
  if (capability.merchantId === 'm-20247') {
    return { product: '订阅' as AcquiringProduct, integration: 'API' as IntegrationMode, environment: 'TT 端外' as PaymentEnvironment, markets: ['US', 'BR', 'ID'] }
  }
  if (capability.merchantId === 'm-30918') {
    return { product: '在线支付' as AcquiringProduct, integration: '独立收银台' as IntegrationMode, environment: 'TT 端内' as PaymentEnvironment, markets: ['GB', 'US'] }
  }
  return { product: '在线支付' as AcquiringProduct, integration: '嵌入式收银台' as IntegrationMode, environment: 'TT 端外' as PaymentEnvironment, markets: ['SG', 'US', 'GB'] }
}

const selectedMerchant = computed(() => merchants.find((merchant) => merchant.id === selectedMerchantId.value))
const businessMerchants = computed(() =>
  merchants.filter(
    (merchant) => selectedMerchantBusiness.value === '全部' || merchant.business === selectedMerchantBusiness.value
  )
)
const businessMerchantIds = computed(() => new Set(businessMerchants.value.map((merchant) => merchant.id)))
const allCapabilities = computed(() => [...runtimeCapabilities, ...lifecycleCapabilities])
const merchantCapabilities = computed(() =>
  allCapabilities.value.filter(
    (capability) =>
      businessMerchantIds.value.has(capability.merchantId) &&
      (!selectedMerchantId.value || capability.merchantId === selectedMerchantId.value) &&
      runtimeStageFor(capability) === selectedRuntimeStage.value
  )
)
const availableMarkets = computed(() => Array.from(new Set(merchantCapabilities.value.flatMap((capability) => dimensionsFor(capability).markets))))
const dimensionFilteredCapabilities = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLowerCase()
  return merchantCapabilities.value.filter((capability) => {
    const dimensions = dimensionsFor(capability)
    const matchesProduct = selectedProduct.value === '全部' || dimensions.product === selectedProduct.value
    const matchesIntegration = selectedIntegration.value === '全部' || dimensions.integration === selectedIntegration.value
    const matchesEnvironment = selectedEnvironment.value === '全部' || dimensions.environment === selectedEnvironment.value
    const matchesMarket = selectedMarket.value === '全部' || dimensions.markets.includes(selectedMarket.value)
    const childMatches = [...paymentMethodDetails, ...paymentCapabilityDetails, ...lifecycleCapabilityDetails].some(
      (detail) => detail.parentId === capability.id && detail.name.toLowerCase().includes(normalizedQuery)
    )
    const matchesQuery = !normalizedQuery || capability.name.toLowerCase().includes(normalizedQuery) || childMatches
    return matchesProduct && matchesIntegration && matchesEnvironment && matchesMarket && matchesQuery
  })
})
const filteredCapabilities = computed(() =>
  dimensionFilteredCapabilities.value.filter(
    (capability) => selectedCategory.value === '全部' || capability.category === selectedCategory.value
  )
)
const filteredSuccessTotal = computed(() => filteredCapabilities.value.reduce((sum, capability) => sum + capability.orders, 0))
const summaryCapabilities = computed(() => {
  if (selectedRuntimeStage.value === 'acquiring') {
    return merchantCapabilities.value.filter((item) => item.category === '支付产品')
  }
  const anchorPrefix: Partial<Record<RuntimeStage, string>> = {
    refund: 'refund-method-',
    dispute: 'chargeback-funding-',
    settlement: 'settlement-mode-',
    withdrawal: 'withdrawal-product-',
    payoutPrefunding: 'prefunding-module-',
    payoutExecution: 'disbursement-product-',
    payoutReturn: 'payout-return-core-',
    payoutReconciliation: 'payout-recon-bill-'
  }
  const prefix = anchorPrefix[selectedRuntimeStage.value]
  return prefix ? merchantCapabilities.value.filter((item) => item.id.startsWith(prefix)) : merchantCapabilities.value
})
const totalOrders = computed(() => summaryCapabilities.value.reduce((sum, item) => sum + item.orders, 0))
const totalTraffic = computed(() => summaryCapabilities.value.reduce((sum, item) => sum + item.traffic, 0))
const stageSuccessTotal = computed(() =>
  selectedRuntimeStage.value === 'acquiring' ? filteredSuccessTotal.value : totalOrders.value
)
const weightedSuccessRate = computed(() => totalTraffic.value ? totalOrders.value / totalTraffic.value * 100 : 0)
const attentionCount = computed(() => merchantCapabilities.value.filter((item) => item.status === 'attention').length)
const activeDimensionCount = computed(() =>
  [selectedProduct.value, selectedIntegration.value, selectedEnvironment.value]
    .filter((value) => value !== '全部').length
)

const categoryOptions = computed<Array<'全部' | CapabilityCategory>>(() => [
  '全部',
  ...Array.from(new Set(merchantCapabilities.value.map((capability) => capability.category)))
])
const currentMetricCopy = computed(() => stageMetricCopy[selectedRuntimeStage.value])
const statusLabels: Record<HealthStatus, string> = { healthy: '运行正常', attention: '需要关注', inactive: '暂无流量' }

watch(selectedMerchantBusiness, () => {
  if (selectedMerchant.value && !businessMerchantIds.value.has(selectedMerchant.value.id)) {
    selectedMerchantId.value = ''
  }
  selectedCategory.value = '全部'
  selectedProduct.value = '全部'
  selectedIntegration.value = '全部'
  selectedEnvironment.value = '全部'
  selectedMarket.value = '全部'
  searchQuery.value = ''
})

watch(selectedMerchantId, () => {
  selectedCategory.value = '全部'
  selectedProduct.value = '全部'
  selectedIntegration.value = '全部'
  selectedEnvironment.value = '全部'
  selectedMarket.value = '全部'
  searchQuery.value = ''
  const firstPaymentMethod = runtimeCapabilities.find(
    (capability) =>
      (!selectedMerchantId.value || capability.merchantId === selectedMerchantId.value) &&
      capability.category === '支付方式'
  )
  const firstPaymentCapability = runtimeCapabilities.find(
    (capability) =>
      (!selectedMerchantId.value || capability.merchantId === selectedMerchantId.value) &&
      capability.category === '支付能力'
  )
  expandedCapabilityGroups.value = new Set(
    [firstPaymentMethod?.id, firstPaymentCapability?.id].filter((id): id is string => Boolean(id))
  )
})

watch(selectedBusinessLine, (businessLine) => {
  selectedRuntimeStage.value = businessLine === 'collection' ? 'acquiring' : 'payoutPrefunding'
})

watch(selectedRuntimeStage, () => {
  selectedCategory.value = '全部'
  selectedProduct.value = '全部'
  selectedIntegration.value = '全部'
  selectedEnvironment.value = '全部'
  searchQuery.value = ''
  const firstGroup = allCapabilities.value.find(
    (capability) =>
      (!selectedMerchantId.value || capability.merchantId === selectedMerchantId.value) &&
      runtimeStageFor(capability) === selectedRuntimeStage.value &&
      capabilityGroupChildren(capability.id).length
  )
  expandedCapabilityGroups.value = new Set(firstGroup ? [firstGroup.id] : [])
})

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatCompact(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return formatNumber(value)
}

function categoryCount(category: '全部' | CapabilityCategory) {
  if (category === '全部') return dimensionFilteredCapabilities.value.length
  return dimensionFilteredCapabilities.value.filter((capability) => capability.category === category).length
}

function stageCapabilityCount(stage: RuntimeStage) {
  return allCapabilities.value.filter(
    (capability) =>
      businessMerchantIds.value.has(capability.merchantId) &&
      (!selectedMerchantId.value || capability.merchantId === selectedMerchantId.value) &&
      runtimeStageFor(capability) === stage
  ).length
}

function capabilityGroupChildren(capabilityId: string) {
  return [...paymentMethodDetails, ...paymentCapabilityDetails, ...lifecycleCapabilityDetails].filter(
    (detail) => detail.parentId === capabilityId
  )
}

function toggleCapabilityGroup(capabilityId: string) {
  const next = new Set(expandedCapabilityGroups.value)
  if (next.has(capabilityId)) next.delete(capabilityId)
  else next.add(capabilityId)
  expandedCapabilityGroups.value = next
}
</script>

<template>
  <main class="runtime-page">
    <header class="runtime-topbar">
      <div>
        <div class="runtime-title-row">
          <span class="runtime-title-icon" aria-hidden="true">▥</span>
          <h1>能力运行现状</h1>
          <span class="runtime-live"><i></i>线上数据</span>
        </div>
        <p>查看商户在支付全生命周期中的能力接入与线上运行质量</p>
      </div>
      <div class="runtime-sync">
        <span>数据更新于 {{ selectedMerchant?.lastSynced ?? '今天 14:32' }}</span>
        <button type="button" aria-label="刷新数据">↻ 刷新</button>
      </div>
    </header>

    <div class="runtime-business-switcher" role="group" aria-label="资金业务类型">
      <button
        type="button"
        :class="{ 'is-active': selectedBusinessLine === 'collection' }"
        :aria-pressed="selectedBusinessLine === 'collection'"
        @click="selectedBusinessLine = 'collection'"
      >
        <span aria-hidden="true">收</span>
        <div><strong>收单</strong><small>支付、退款、结算及提现</small></div>
      </button>
      <button
        type="button"
        :class="{ 'is-active': selectedBusinessLine === 'payout' }"
        :aria-pressed="selectedBusinessLine === 'payout'"
        @click="selectedBusinessLine = 'payout'"
      >
        <span aria-hidden="true">发</span>
        <div><strong>代发</strong><small>备款、代发、退票及对账</small></div>
      </button>
    </div>

    <section class="runtime-filter-card" aria-label="业务、商户和时间筛选">
      <div class="runtime-filter-row runtime-filter-row--primary">
        <label class="runtime-context-select runtime-context-select--business">
          <span>业务</span>
          <select v-model="selectedMerchantBusiness">
            <option value="全部">全部业务</option>
            <option value="TikTok Shop">TikTok Shop</option>
            <option value="TikTok LIVE">TikTok LIVE</option>
          </select>
        </label>
        <label class="runtime-context-select runtime-context-select--merchant">
          <span>商户号</span>
          <select v-model="selectedMerchantId">
            <option value="">全部商户</option>
            <option v-for="merchant in businessMerchants" :key="merchant.id" :value="merchant.id">
              {{ merchant.name }}（{{ merchant.id }}）
            </option>
          </select>
        </label>
        <label class="runtime-context-select runtime-context-select--country">
          <span>用户支付国家</span>
          <select v-model="selectedMarket">
            <option value="全部">全部国家</option>
            <option v-for="market in availableMarkets" :key="market" :value="market">{{ market }}</option>
          </select>
        </label>
      </div>
      <div class="runtime-filter-row runtime-filter-row--secondary">
        <div v-if="selectedMerchant" class="runtime-merchant-meta">
          <span>签约主体 <strong>{{ selectedMerchant.entity }}</strong></span>
          <span v-if="selectedBusinessLine === 'collection'" class="runtime-product-meta">
            收单产品码
            <strong>{{ selectedMerchant.acquiringProductName }} <code>{{ selectedMerchant.acquiringProductCode }}</code></strong>
          </span>
        </div>
        <p v-else class="runtime-aggregate-note">
          当前汇总 {{ selectedMerchantBusiness === '全部' ? '全部业务' : selectedMerchantBusiness }}
          下 {{ businessMerchants.length }} 个商户号的数据
        </p>
        <div class="runtime-range" role="group" aria-label="时间范围">
          <button v-for="range in ['今日', '近 7 天', '近 30 天']" :key="range" type="button" :class="{ 'is-active': dateRange === range }" @click="dateRange = range">
            {{ range }}
          </button>
        </div>
      </div>
    </section>

    <nav class="runtime-stage-switcher" :class="`runtime-stage-switcher--${selectedBusinessLine}`" aria-label="业务阶段">
      <button
        v-for="stage in runtimeStageOptions"
        :key="stage.id"
        type="button"
        :class="{ 'is-active': selectedRuntimeStage === stage.id }"
        :aria-current="selectedRuntimeStage === stage.id ? 'page' : undefined"
        @click="selectedRuntimeStage = stage.id"
      >
        <span>{{ stage.short }}</span>
        <strong>{{ stage.label }}</strong>
        <em>{{ stageCapabilityCount(stage.id) }}</em>
      </button>
    </nav>

    <section class="runtime-kpis" aria-label="运行概览">
      <article>
        <span class="runtime-kpi-icon runtime-kpi-icon--blue">✓</span>
        <div><p>已接入能力</p><strong>{{ merchantCapabilities.length }}</strong><small>项</small></div>
        <em>覆盖 {{ new Set(merchantCapabilities.map(item => item.category)).size }} 类能力</em>
      </article>
      <article>
        <span class="runtime-kpi-icon runtime-kpi-icon--violet">单</span>
        <div><p>{{ currentMetricCopy.success }}</p><strong>{{ formatCompact(totalOrders) }}</strong></div>
        <em class="is-up">↑ 12.6% 较前周期</em>
      </article>
      <article>
        <span class="runtime-kpi-icon runtime-kpi-icon--cyan">总</span>
        <div><p>{{ currentMetricCopy.total }}</p><strong>{{ formatCompact(totalTraffic) }}</strong></div>
        <em class="is-up">↑ 10.8% 较前周期</em>
      </article>
      <article>
        <span class="runtime-kpi-icon runtime-kpi-icon--green">%</span>
        <div><p>{{ currentMetricCopy.rate }}</p><strong>{{ weightedSuccessRate.toFixed(2) }}%</strong></div>
        <em :class="{ 'is-warning': attentionCount }">{{ attentionCount ? `${attentionCount} 项能力需关注` : '全部运行正常' }}</em>
      </article>
    </section>

    <section class="runtime-content-card">
      <div class="runtime-section-head">
        <div>
          <h2>已接入能力明细</h2>
          <p>统计口径：{{ currentMetricCopy.note }}，数据存在约 5 分钟延迟</p>
        </div>
        <div class="runtime-result-overview">
          <span>当前结果</span>
          <strong>{{ filteredCapabilities.length }}</strong>
          <span>项能力</span>
          <i></i>
          <span>{{ currentMetricCopy.success }}</span>
          <b>{{ formatCompact(stageSuccessTotal) }}</b>
        </div>
      </div>

      <div class="runtime-filter-panel">
        <div class="runtime-dimension-filters" aria-label="运行范围筛选">
        <div class="runtime-filter-label">
          <strong>运行范围</strong>
          <span>{{ activeDimensionCount ? `已选 ${activeDimensionCount} 个条件` : '全部场景' }}</span>
        </div>
        <label v-if="selectedBusinessLine === 'collection'" :class="{ 'is-selected': selectedProduct !== '全部' }">
          <span>收单支付产品</span>
          <select v-model="selectedProduct">
            <option value="全部">全部产品</option>
            <option value="在线支付">在线支付</option>
            <option value="协议代扣">协议代扣</option>
            <option value="订阅">订阅</option>
          </select>
        </label>
        <label v-if="selectedBusinessLine === 'collection'" :class="{ 'is-selected': selectedIntegration !== '全部' }">
          <span>集成模式</span>
          <select v-model="selectedIntegration">
            <option value="全部">全部模式</option>
            <option value="独立收银台">独立收银台</option>
            <option value="嵌入式收银台">嵌入式收银台</option>
            <option value="API">API</option>
          </select>
        </label>
        <label v-if="selectedBusinessLine === 'collection'" :class="{ 'is-selected': selectedEnvironment !== '全部' }">
          <span>支付环境</span>
          <select v-model="selectedEnvironment">
            <option value="全部">全部环境</option>
            <option value="TT 端内">TT 端内</option>
            <option value="TT 端外">TT 端外</option>
          </select>
        </label>
        <button
          v-if="selectedProduct !== '全部' || selectedIntegration !== '全部' || selectedEnvironment !== '全部'"
          type="button"
          class="runtime-clear-filters"
          @click="selectedProduct = '全部'; selectedIntegration = '全部'; selectedEnvironment = '全部'"
        >
          清除筛选
        </button>
        </div>

        <div class="runtime-table-tools">
          <div class="runtime-category-group">
            <span>能力分类</span>
            <div class="runtime-category-tabs" role="tablist" aria-label="能力分类">
              <button v-for="category in categoryOptions" :key="category" type="button" :class="{ 'is-active': selectedCategory === category }" @click="selectedCategory = category">
                {{ category }} <em>{{ categoryCount(category) }}</em>
              </button>
            </div>
          </div>
          <label class="runtime-search">
            <span aria-hidden="true">⌕</span>
            <input v-model="searchQuery" type="search" placeholder="搜索能力" aria-label="搜索能力" />
          </label>
        </div>
      </div>

      <div class="runtime-table-wrap">
        <table class="runtime-table">
          <thead>
            <tr><th>能力名称</th><th>{{ currentMetricCopy.total }}</th><th>{{ currentMetricCopy.success }}</th><th>成功单量占比</th><th>成功率</th><th>较前周期</th><th>7 日趋势</th><th>运行状态</th></tr>
          </thead>
          <tbody>
            <template v-for="capability in filteredCapabilities" :key="capability.id">
              <tr :class="{ 'runtime-parent-row': capabilityGroupChildren(capability.id).length }">
                <td>
                  <div class="runtime-capability-name">
                    <button
                      v-if="capabilityGroupChildren(capability.id).length"
                      type="button"
                      class="runtime-tree-toggle"
                      :class="{ 'is-expanded': expandedCapabilityGroups.has(capability.id) }"
                      :aria-expanded="expandedCapabilityGroups.has(capability.id)"
                      :aria-label="`${expandedCapabilityGroups.has(capability.id) ? '收起' : '展开'}${capability.name}`"
                      @click="toggleCapabilityGroup(capability.id)"
                    >
                      ›
                    </button>
                    <span v-else class="runtime-tree-placeholder"></span>
                    <span>
                      <strong>{{ capability.name }}</strong>
                      <small>{{ capability.category }}</small>
                    </span>
                    <em v-if="capabilityGroupChildren(capability.id).length">
                      {{ capabilityGroupChildren(capability.id).length }} {{ capability.category === '支付方式' ? '种' : '项' }}
                    </em>
                  </div>
                </td>
                <td><strong>{{ formatNumber(capability.traffic) }}</strong></td>
                <td><strong>{{ formatNumber(capability.orders) }}</strong></td>
                <td>
                  <div class="runtime-share-value">
                    <strong>{{ stageSuccessTotal ? (capability.orders / stageSuccessTotal * 100).toFixed(1) : '0.0' }}%</strong>
                    <span class="runtime-share"><i :style="{ width: `${stageSuccessTotal ? capability.orders / stageSuccessTotal * 100 : 0}%` }"></i></span>
                  </div>
                </td>
                <td><strong>{{ capability.successRate.toFixed(2) }}%</strong></td>
                <td><span :class="capability.change >= 0 ? 'runtime-change--up' : 'runtime-change--down'">{{ capability.change >= 0 ? '↑' : '↓' }} {{ Math.abs(capability.change) }}%</span></td>
                <td>
                  <div class="runtime-spark" aria-label="7日趋势">
                    <i v-for="(point, index) in capability.trend" :key="index" :style="{ height: `${point}%` }"></i>
                  </div>
                </td>
                <td><span class="runtime-health" :class="`runtime-health--${capability.status}`"><i></i>{{ statusLabels[capability.status] }}</span></td>
              </tr>
              <tr
                v-for="detail in capabilityGroupChildren(capability.id)"
                v-show="expandedCapabilityGroups.has(capability.id)"
                :key="detail.id"
                class="runtime-child-row"
              >
                <td>
                  <div class="runtime-child-name"><i></i><strong>{{ detail.name }}</strong></div>
                </td>
                <td>{{ formatNumber(detail.traffic) }}</td>
                <td>{{ formatNumber(detail.orders) }}</td>
                <td>
                  <div class="runtime-share-value">
                    <strong>{{ stageSuccessTotal ? (detail.orders / stageSuccessTotal * 100).toFixed(1) : '0.0' }}%</strong>
                    <span class="runtime-share runtime-share--child"><i :style="{ width: `${stageSuccessTotal ? detail.orders / stageSuccessTotal * 100 : 0}%` }"></i></span>
                  </div>
                </td>
                <td>{{ detail.successRate.toFixed(2) }}%</td>
                <td><span :class="detail.change >= 0 ? 'runtime-change--up' : 'runtime-change--down'">{{ detail.change >= 0 ? '↑' : '↓' }} {{ Math.abs(detail.change) }}%</span></td>
                <td>
                  <div class="runtime-spark runtime-spark--child" aria-label="7日趋势">
                    <i v-for="(point, index) in detail.trend" :key="index" :style="{ height: `${point}%` }"></i>
                  </div>
                </td>
                <td><span class="runtime-health" :class="`runtime-health--${detail.status}`"><i></i>{{ statusLabels[detail.status] }}</span></td>
              </tr>
            </template>
          </tbody>
        </table>
        <div v-if="!filteredCapabilities.length" class="runtime-empty">没有匹配的已接入能力</div>
      </div>
    </section>
  </main>
</template>
