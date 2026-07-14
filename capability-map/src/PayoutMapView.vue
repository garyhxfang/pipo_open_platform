<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { supportStatusLabel, type MerchantType, type SupportStatus } from './capabilityData'
import {
  loadPayoutConfig,
  type PayoutField,
  type PrimaryProductCategory,
  type SecondaryProductCategory
} from './payoutConfigData'

export type PayoutStageId = 'payout' | 'return' | 'reconciliation'

interface ChoiceOption<T extends string> {
  value: T
  label: string
  description: string
  status: SupportStatus
}

interface ProductCategoryRow {
  id: SecondaryProductCategory
  primary: PrimaryProductCategory
  secondaryLabel: string
  merchantTypes: MerchantType[]
  payeeUserTypes: PayeeUserType[]
  scenario: string
}

interface CapabilityCard {
  id: string
  name: string
  description: string
  initial: string
  accent: string
  status: SupportStatus
}

interface PayoutPaymentMethodCard {
  id: string
  name: string
  description: string
  initial: string
  accent: string
  tag: string
}

const props = defineProps<{
  stage: PayoutStageId
  merchantType: MerchantType
  configVersion: number
}>()

const currentPrimaryCategory = ref<PrimaryProductCategory>('withdrawal')
const currentSecondaryCategory = ref<SecondaryProductCategory>('primaryMerchantWithdrawal')
const payoutConfig = ref(loadPayoutConfig())
const selectedConfigOptions = ref<Record<string, string>>({})

const primaryCategoryOptions: ChoiceOption<PrimaryProductCategory>[] = [
  {
    value: 'withdrawal',
    label: '提现',
    description: '账户余额或收单后资金提现',
    status: 'standard'
  },
  {
    value: 'disbursement',
    label: '代发',
    description: '按业务逻辑向商户或用户付款',
    status: 'standard'
  }
]

const productCategoryRows: ProductCategoryRow[] = [
  {
    id: 'primaryMerchantWithdrawal',
    primary: 'withdrawal',
    secondaryLabel: '一级商户提现',
    merchantTypes: ['platformMerchant', 'standardMerchant'],
    payeeUserTypes: ['bUser'],
    scenario: '用于平台/传统一级商户资产提现的场景'
  },
  {
    id: 'subMerchantWithdrawal',
    primary: 'withdrawal',
    secondaryLabel: '二级商户提现',
    merchantTypes: ['platformMerchant', 'standardMerchant'],
    payeeUserTypes: ['bUser'],
    scenario: '平台商户下的二级商户收单/分账资金提现'
  },
  {
    id: 'userWithdrawal',
    primary: 'withdrawal',
    secondaryLabel: '用户提现',
    merchantTypes: ['platformMerchant', 'standardMerchant'],
    payeeUserTypes: ['cUser'],
    scenario: '商户所属用户的账户余额提现'
  },
  {
    id: 'singleDisbursement',
    primary: 'disbursement',
    secondaryLabel: '单笔代发',
    merchantTypes: ['platformMerchant', 'standardMerchant'],
    payeeUserTypes: ['bUser', 'cUser'],
    scenario: '按照业务逻辑，需要把资金从商户账户付款到其他商户/用户的某一个支付方式上'
  },
  {
    id: 'batchDisbursement',
    primary: 'disbursement',
    secondaryLabel: '批量代发',
    merchantTypes: ['platformMerchant', 'standardMerchant'],
    payeeUserTypes: ['bUser', 'cUser'],
    scenario: '基于单笔代发的业务逻辑，业务侧有批量处理的诉求'
  }
]

const payoutAbilities: CapabilityCard[] = [
  {
    id: 'instruction-create',
    name: '出款指令创建',
    description: '支持由商户或业务系统发起单笔、批量出款指令。',
    initial: 'P',
    accent: '#1267f1',
    status: 'standard'
  },
  {
    id: 'funding-check',
    name: '资金与余额校验',
    description: '校验可用余额、币种、账户状态与重复出款风险。',
    initial: 'F',
    accent: '#0f766e',
    status: 'standard'
  },
  {
    id: 'risk-control',
    name: '风控与限额',
    description: '围绕 ATO、重复出尽、异常收款方进行风险拦截。',
    initial: 'R',
    accent: '#e18104',
    status: 'standard'
  },
  {
    id: 'route',
    name: '通道路由',
    description: '按国家、币种、到账方式和可用性选择出款通道。',
    initial: 'C',
    accent: '#7c3aed',
    status: 'conditional'
  },
  {
    id: 'status-query',
    name: '状态查询',
    description: '提供出款受理、处理中、成功、失败等状态查询。',
    initial: 'S',
    accent: '#2563eb',
    status: 'standard'
  },
  {
    id: 'notification',
    name: '结果通知',
    description: '通过消息或回调同步出款状态与失败原因。',
    initial: 'N',
    accent: '#0891b2',
    status: 'standard'
  }
]

const payoutServices: CapabilityCard[] = [
  {
    id: 'bulk-estimation',
    name: '批量试算',
    description: '批量代发场景，发起代发前，提前调用试算能力。',
    initial: 'B',
    accent: '#1267f1',
    status: 'conditional'
  },
  {
    id: 'fx-exchange',
    name: '换汇',
    description: '出款环节为商户提供换汇服务，满足商户和用户的多样化币种的出款需求。',
    initial: 'F',
    accent: '#0f766e',
    status: 'standard'
  },
  {
    id: 'same-name-check',
    name: '同名校验',
    description: '提现产品下，处于合规&安全考虑，进行出款账户&用户同名验证。',
    initial: 'N',
    accent: '#e18104',
    status: 'conditional'
  },
  {
    id: 'pi-sharing',
    name: '收款PI跨业务共享',
    description: 'C端&B端不同场景下绑定收款PI互通能力。',
    initial: 'P',
    accent: '#7c3aed',
    status: 'conditional'
  },
  {
    id: 'finance-overpayment-withdrawal',
    name: '金融-溢缴款提现',
    description: '普通用户提现能力基础上，支持跨主体出款。',
    initial: 'O',
    accent: '#0891b2',
    status: 'conditional'
  },
  {
    id: 'merchant-prefunding',
    name: '商家备款',
    description: '代发场景，发起代发前需要商户向在PIPO开立的账户完成充值，在账户余额充足的前提下，才能成功发起代发。',
    initial: 'M',
    accent: '#0f766e',
    status: 'standard'
  }
]

const returnAbilities: CapabilityCard[] = [
  {
    id: 'return-identify',
    name: '退票识别',
    description: '识别银行或钱包通道返回的退票、拒付或失败回执。',
    initial: 'I',
    accent: '#1267f1',
    status: 'standard'
  },
  {
    id: 'return-reason',
    name: '原因归类',
    description: '按账户无效、姓名不符、账户关闭、通道失败等归类。',
    initial: 'R',
    accent: '#e18104',
    status: 'standard'
  },
  {
    id: 'return-fund',
    name: '资金退回',
    description: '将退票资金回补到商户或业务可用余额。',
    initial: 'F',
    accent: '#0f766e',
    status: 'standard'
  },
  {
    id: 'return-reprocess',
    name: '重新出款',
    description: '支持修正收款方信息后再次发起出款。',
    initial: 'P',
    accent: '#7c3aed',
    status: 'conditional'
  }
]

const returnDefaultProducts: CapabilityCard[] = [
  {
    id: 'return-product-sub-merchant-withdrawal',
    name: '二级商户提现',
    description: '默认接入退票处理能力。',
    initial: '二',
    accent: '#1267f1',
    status: 'standard'
  },
  {
    id: 'return-product-user-withdrawal',
    name: '用户提现',
    description: '默认接入退票处理能力。',
    initial: '用',
    accent: '#0f766e',
    status: 'standard'
  },
  {
    id: 'return-product-single-disbursement',
    name: '单笔代发',
    description: '默认接入退票处理能力。',
    initial: '单',
    accent: '#e18104',
    status: 'standard'
  },
  {
    id: 'return-product-batch-disbursement',
    name: '批量代发',
    description: '默认接入退票处理能力。',
    initial: '批',
    accent: '#7c3aed',
    status: 'standard'
  }
]

const returnDifferenceModes: CapabilityCard[] = [
  {
    id: 'return-difference-net',
    name: '净额模式',
    description: '默认方式，等于渠道退回金额。',
    initial: '净',
    accent: '#1267f1',
    status: 'standard'
  },
  {
    id: 'return-difference-full',
    name: '足额模式',
    description: '退票金额等于出款金额，出现补差由损益户承担或者收取补差。',
    initial: '足',
    accent: '#e18104',
    status: 'onDemand'
  },
  {
    id: 'return-difference-pipo-benefit',
    name: 'PiPO受益模式',
    description: '1）退票 ≤ 出款（不含费）：净额退用户；2）退票 > 出款：按出款退回，差额记收益，直接核算到PiPO损益。',
    initial: 'P',
    accent: '#7c3aed',
    status: 'onDemand'
  }
]

const reconciliationAbilities: CapabilityCard[] = [
  {
    id: 'payout-bill',
    name: '出款账单',
    description: '记录出款指令、金额、币种、通道和最终状态。',
    initial: 'P',
    accent: '#1267f1',
    status: 'standard'
  },
  {
    id: 'return-bill',
    name: '退票账单',
    description: '记录退票金额、退票原因、原出款单和资金回补状态。',
    initial: 'R',
    accent: '#e18104',
    status: 'standard'
  },
  {
    id: 'fund-bill',
    name: '资金账单',
    description: '沉淀出款、退票、手续费与余额变动流水。',
    initial: 'F',
    accent: '#0f766e',
    status: 'standard'
  },
  {
    id: 'difference-handling',
    name: '差异处理',
    description: '定位出款状态、通道回执和资金流水之间的差异。',
    initial: 'D',
    accent: '#7c3aed',
    status: 'conditional'
  }
]

const bUserPaymentMethods: PayoutPaymentMethodCard[] = [
  {
    id: 'tiktok-seller-wallet',
    name: 'TikTok Seller Wallet',
    description: '电子钱包-PiPO 商户钱包品牌',
    initial: 'T',
    accent: '#0f766e',
    tag: 'PiPO自营'
  },
  {
    id: 'bank-transfer',
    name: '银行账户转账',
    description: '跨境&本本商家绑定卖家开户国家银行账户。',
    initial: 'B',
    accent: '#1267f1',
    tag: '无'
  },
  {
    id: 'lianlianpay',
    name: 'LianLianPay',
    description: '电子钱包，支持跨境卖家',
    initial: 'L',
    accent: '#7c3aed',
    tag: '无'
  },
  {
    id: 'pingpong',
    name: 'PingPong',
    description: '电子钱包，支持跨境卖家',
    initial: 'P',
    accent: '#e18104',
    tag: '无'
  },
  {
    id: 'payonner',
    name: 'Payonner',
    description: '电子钱包，支持跨境卖家',
    initial: 'P',
    accent: '#0891b2',
    tag: '无'
  },
  {
    id: 'worlsfirst',
    name: 'Worlsfirst',
    description: '电子钱包，支持跨境卖家',
    initial: 'W',
    accent: '#dc2626',
    tag: '无'
  },
  {
    id: 'airwallex',
    name: 'Airwallex',
    description: '电子钱包，支持跨境卖家',
    initial: 'A',
    accent: '#2563eb',
    tag: '无'
  },
  {
    id: 'mercado-pago',
    name: 'Mercado Pago',
    description: '电子钱包-MX本本商户',
    initial: 'M',
    accent: '#64748b',
    tag: '无'
  },
  {
    id: 'pix',
    name: 'PIX',
    description: '银行账户代理-BR本本商户',
    initial: 'P',
    accent: '#0f766e',
    tag: '无'
  }
]

const cUserPaymentMethods: PayoutPaymentMethodCard[] = [
  {
    id: 'tiktok-pay',
    name: 'TikTok Pay',
    description: '电子钱包-PiPO C wallet',
    initial: 'T',
    accent: '#0f766e',
    tag: 'PiPO自营'
  },
  {
    id: 'tiktok-credit-balance',
    name: 'TikTok Credit Balance',
    description: '电子钱包-商户用户余额',
    initial: 'C',
    accent: '#7c3aed',
    tag: 'PiPO自营'
  },
  {
    id: 'creator-card',
    name: '达人卡',
    description: 'PiPO与当地银行合作发行的银行账户',
    initial: 'D',
    accent: '#e18104',
    tag: 'PiPO自营'
  },
  {
    id: 'c-bank-transfer',
    name: '银行账户转账',
    description: '跨境&本本商家绑定卖家开户国家银行账户。',
    initial: 'B',
    accent: '#1267f1',
    tag: '无'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: '电子钱包-全球',
    initial: 'P',
    accent: '#2563eb',
    tag: '无'
  },
  {
    id: 'c-payonner',
    name: 'Payonner',
    description: '电子钱包-全球',
    initial: 'P',
    accent: '#0891b2',
    tag: '无'
  },
  {
    id: 'gift-card',
    name: '礼品卡',
    description: '接入亚马逊/Apple等礼品卡体系',
    initial: 'G',
    accent: '#0891b2',
    tag: '无'
  },
  {
    id: 'airtime-topup',
    name: '话费充值',
    description: '接入当地运营商，提现作为手机话费充值',
    initial: 'A',
    accent: '#dc2626',
    tag: '无'
  },
  {
    id: 'zalopay',
    name: 'ZaloPay',
    description: '电子钱包-VN',
    initial: 'Z',
    accent: '#2563eb',
    tag: '无'
  },
  {
    id: 'webmoney-wallet',
    name: 'WebMoney Wallet',
    description: '电子钱包',
    initial: 'W',
    accent: '#64748b',
    tag: '无'
  },
  {
    id: 'venmo',
    name: 'Venmo',
    description: '电子钱包-US',
    initial: 'V',
    accent: '#2563eb',
    tag: '无'
  },
  {
    id: 'zelle',
    name: 'Zelle',
    description: '电子钱包-US',
    initial: 'Z',
    accent: '#7c3aed',
    tag: '无'
  },
  {
    id: 'truemoney',
    name: 'TrueMoney',
    description: '电子钱包-TH',
    initial: 'T',
    accent: '#e18104',
    tag: '无'
  },
  {
    id: 'promptpay',
    name: 'PromptPay',
    description: '电子钱包-TH',
    initial: 'P',
    accent: '#1267f1',
    tag: '无'
  },
  {
    id: 'touch-n-go',
    name: "Touch 'n Go",
    description: '电子钱包-MY',
    initial: 'T',
    accent: '#0891b2',
    tag: '无'
  },
  {
    id: 'ovo',
    name: 'OVO',
    description: '电子钱包-ID',
    initial: 'O',
    accent: '#7c3aed',
    tag: '无'
  },
  {
    id: 'tokocredit',
    name: 'TOKOCREDIT',
    description: '电子钱包-ID',
    initial: 'T',
    accent: '#7c3aed',
    tag: '无'
  },
  {
    id: 'gopay',
    name: 'GoPay',
    description: '电子钱包-ID',
    initial: 'G',
    accent: '#0891b2',
    tag: '无'
  },
  {
    id: 'dana',
    name: 'DANA',
    description: '电子钱包-ID',
    initial: 'D',
    accent: '#2563eb',
    tag: '无'
  },
  {
    id: 'naver-pay',
    name: 'Naver Pay',
    description: '电子钱包-KR',
    initial: 'N',
    accent: '#0f766e',
    tag: '无'
  },
  {
    id: 'payco',
    name: 'PAYCO',
    description: '电子钱包-KR',
    initial: 'P',
    accent: '#e18104',
    tag: '无'
  },
  {
    id: 'todito-cash',
    name: 'Todito Cash',
    description: '电子钱包-MX',
    initial: 'T',
    accent: '#64748b',
    tag: '无'
  },
  {
    id: 'maya',
    name: 'Maya',
    description: '电子钱包-PH',
    initial: 'M',
    accent: '#0f766e',
    tag: '无'
  },
  {
    id: 'gcash',
    name: 'GCash',
    description: '电子钱包-PH',
    initial: 'G',
    accent: '#2563eb',
    tag: '无'
  },
  {
    id: 'pagbank',
    name: 'PagBank',
    description: '电子钱包-BR',
    initial: 'P',
    accent: '#1267f1',
    tag: '无'
  },
  {
    id: 'meeza',
    name: 'Meeza',
    description: '电子钱包-EG',
    initial: 'M',
    accent: '#dc2626',
    tag: '无'
  },
  {
    id: 'c-pix',
    name: 'PIX',
    description: '银行账户代理-BR',
    initial: 'P',
    accent: '#0f766e',
    tag: '无'
  },
  {
    id: 'moneygram',
    name: 'MoneyGram',
    description: '电子钱包- MM&LB',
    initial: 'M',
    accent: '#64748b',
    tag: '无'
  },
  {
    id: 'cashplus',
    name: 'CASHPLUS',
    description: '电子钱包- MA',
    initial: 'C',
    accent: '#e18104',
    tag: '无'
  }
]

const currentStageTitle = computed(() => {
  if (props.stage === 'return') return '退票'
  if (props.stage === 'reconciliation') return '账单与对账'
  return '出款'
})

const stageCards = computed(() => {
  if (props.stage === 'return') return returnAbilities
  if (props.stage === 'reconciliation') return reconciliationAbilities
  return payoutAbilities
})

const visibleProductRows = computed(() =>
  productCategoryRows.filter(
    (row) =>
      row.primary === currentPrimaryCategory.value &&
      row.merchantTypes.includes(props.merchantType) &&
      payoutConfig.value.records.some(
        (record) => record.product === row.id && record.values.merchantType === props.merchantType
      )
  )
)

const secondaryCategoryOptions = computed(() =>
  visibleProductRows.value.map((row) => ({
    value: row.id,
    label: row.secondaryLabel,
    description: row.scenario,
    status: 'standard' as SupportStatus
  }))
)

const currentProductRecords = computed(() =>
  payoutConfig.value.records.filter(
    (record) => record.product === currentSecondaryCategory.value && record.values.merchantType === props.merchantType
  )
)
const configurableFields = computed(() =>
  payoutConfig.value.fields.filter((field) => field.id !== 'merchantType' && availableOptionsFor(field).length > 0)
)

function recordsAvailableAt(field: PayoutField) {
  const fieldIndex = payoutConfig.value.fields.findIndex((item) => item.id === field.id)
  const upstreamFields = payoutConfig.value.fields.slice(0, fieldIndex)

  return currentProductRecords.value.filter((record) =>
    upstreamFields.every((upstreamField) => {
      const selected = selectedConfigOptions.value[upstreamField.id]
      return !selected || record.values[upstreamField.id] === selected
    })
  )
}

function availableOptionsFor(field: PayoutField) {
  const optionIds = new Set(recordsAvailableAt(field).map((record) => record.values[field.id]).filter(Boolean))
  return field.options.filter((option) => optionIds.has(option.id))
}

function resetFieldSelections() {
  selectedConfigOptions.value = {}
}

watch(
  () => props.merchantType,
  () => {
    if (!visibleProductRows.value.some((row) => row.id === currentSecondaryCategory.value)) {
      const firstVisibleRow = visibleProductRows.value[0]
      if (firstVisibleRow) currentSecondaryCategory.value = firstVisibleRow.id
    }
    resetFieldSelections()
  }
)

watch(
  () => props.configVersion,
  () => {
    payoutConfig.value = loadPayoutConfig()
    if (!visibleProductRows.value.some((row) => row.id === currentSecondaryCategory.value)) {
      const firstVisibleRow = visibleProductRows.value[0]
      if (firstVisibleRow) currentSecondaryCategory.value = firstVisibleRow.id
    }
    resetFieldSelections()
  }
)

function selectPrimaryCategory(value: PrimaryProductCategory) {
  currentPrimaryCategory.value = value
  const firstVisibleRow = visibleProductRows.value.find((row) => row.primary === value)
  if (firstVisibleRow) currentSecondaryCategory.value = firstVisibleRow.id
  resetFieldSelections()
}

function selectSecondaryCategory(value: SecondaryProductCategory) {
  currentSecondaryCategory.value = value
  resetFieldSelections()
}

function toggleConfigOption(fieldId: string, optionId: string) {
  const fieldIndex = payoutConfig.value.fields.findIndex((field) => field.id === fieldId)
  selectedConfigOptions.value[fieldId] = optionId
  for (const downstreamField of payoutConfig.value.fields.slice(fieldIndex + 1)) {
    delete selectedConfigOptions.value[downstreamField.id]
  }
}
</script>

<template>
  <section class="payout-map-view" aria-label="出款产品能力地图">
    <template v-if="stage === 'payout'">
      <section class="filter-panel" aria-label="出款能力筛选项">
        <div class="section-heading section-heading--panel">
          <div>
            <h2>出款对客产品</h2>
          </div>
        </div>

        <fieldset class="choice-group choice-group--two">
          <legend>
            <span><i class="payout-level-badge">1级</i>一级产品分类</span>
            <small>选择出款产品的大类</small>
          </legend>
          <div class="choice-grid choice-grid--two">
            <button
              v-for="option in primaryCategoryOptions"
              :key="option.value"
              class="choice-card choice-card--with-status"
              :class="{ 'is-active': currentPrimaryCategory === option.value }"
              type="button"
              :aria-pressed="currentPrimaryCategory === option.value"
              @click="selectPrimaryCategory(option.value)"
            >
              <span class="choice-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="choice-meta">
                <em class="status-chip" :class="`status-chip--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="choice-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </fieldset>

        <fieldset class="choice-group">
          <legend>
            <span><i class="payout-level-badge">2级</i>二级产品分类</span>
            <small>根据商户类型联动可选产品</small>
          </legend>
          <div class="choice-grid choice-grid--three">
            <button
              v-for="option in secondaryCategoryOptions"
              :key="option.value"
              class="choice-card choice-card--with-status"
              :class="{ 'is-active': currentSecondaryCategory === option.value }"
              type="button"
              :aria-pressed="currentSecondaryCategory === option.value"
              @click="selectSecondaryCategory(option.value)"
            >
              <span class="choice-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="choice-meta">
                <em class="status-chip" :class="`status-chip--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="choice-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </fieldset>

        <fieldset v-for="(field, fieldIndex) in configurableFields" :key="field.id" class="choice-group">
          <legend>
            <span><i class="payout-level-badge">{{ fieldIndex + 3 }}级</i>{{ field.label }}</span>
            <small>{{ field.description || '根据上一级选择动态筛选' }}</small>
          </legend>
          <div v-if="availableOptionsFor(field).length" class="choice-grid choice-grid--three">
            <button
              v-for="option in availableOptionsFor(field)"
              :key="option.id"
              class="choice-card payout-config-option"
              :class="{ 'is-active': selectedConfigOptions[field.id] === option.id }"
              type="button"
              :aria-pressed="selectedConfigOptions[field.id] === option.id"
              @click="toggleConfigOption(field.id, option.id)"
            >
              <span class="choice-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="choice-radio" aria-hidden="true"></span>
            </button>
          </div>
        </fieldset>
      </section>

      <section class="payment-ability-panel" aria-labelledby="payout-service-title">
        <div class="section-heading section-heading--panel">
          <div>
            <h2 id="payout-service-title">出款增值服务</h2>
          </div>
        </div>

        <div class="capability-grid capability-grid--value-added">
          <article v-for="service in payoutServices" :key="service.id" class="capability-card">
            <div class="card-topline">
              <div class="capability-identity">
                <span class="brand-mark brand-mark--outline" :style="{ '--mark-color': service.accent }">
                  {{ service.initial }}
                </span>
                <div>
                  <h3>{{ service.name }}</h3>
                  <p>{{ service.description }}</p>
                </div>
              </div>
              <em class="service-status" :class="`service-status--${service.status}`">
                {{ supportStatusLabel[service.status] }}
              </em>
            </div>
          </article>
        </div>
      </section>
    </template>

    <section v-if="stage === 'payout'" class="capability-section" aria-labelledby="payout-payment-methods-title">
      <div class="section-heading">
        <h2 id="payout-payment-methods-title">出款支持的支付方式</h2>
      </div>

      <section class="payout-payment-method-group" aria-labelledby="b-user-payment-methods-title">
        <div class="payout-payment-method-group__heading">
          <h3 id="b-user-payment-methods-title">收款用户类型-B端用户</h3>
        </div>
        <div class="capability-grid capability-grid--value-added">
          <article v-for="method in bUserPaymentMethods" :key="method.id" class="capability-card">
            <div class="card-topline">
              <div class="capability-identity">
                <span class="brand-mark" :style="{ '--mark-color': method.accent }">
                  {{ method.initial }}
                </span>
                <div>
                  <h3>{{ method.name }}</h3>
                  <p>{{ method.description }}</p>
                </div>
              </div>
              <em v-if="method.tag !== '无'" class="service-status service-status--custom">{{ method.tag }}</em>
            </div>
          </article>
        </div>
      </section>

      <section class="payout-payment-method-group" aria-labelledby="c-user-payment-methods-title">
        <div class="payout-payment-method-group__heading">
          <h3 id="c-user-payment-methods-title">收款用户类型-C端用户</h3>
        </div>
        <div v-if="cUserPaymentMethods.length" class="capability-grid capability-grid--value-added">
          <article v-for="method in cUserPaymentMethods" :key="method.id" class="capability-card">
            <div class="card-topline">
              <div class="capability-identity">
                <span class="brand-mark" :style="{ '--mark-color': method.accent }">
                  {{ method.initial }}
                </span>
                <div>
                  <h3>{{ method.name }}</h3>
                  <p>{{ method.description }}</p>
                </div>
              </div>
              <em v-if="method.tag !== '无'" class="service-status service-status--custom">{{ method.tag }}</em>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">暂无可展示的支付方式。</div>
      </section>
    </section>

    <template v-else>
      <section v-if="stage === 'return'" class="capability-section" aria-labelledby="return-default-products-title">
        <div class="section-heading">
          <h2 id="return-default-products-title">支持产品（默认接入） <span>{{ returnDefaultProducts.length }}</span></h2>
        </div>

        <div class="capability-grid capability-grid--value-added">
          <article v-for="product in returnDefaultProducts" :key="product.id" class="capability-card">
            <div class="card-topline">
              <div class="capability-identity">
                <span class="brand-mark" :style="{ '--mark-color': product.accent }">
                  {{ product.initial }}
                </span>
                <div>
                  <h3>{{ product.name }}</h3>
                  <p>{{ product.description }}</p>
                </div>
              </div>
              <em class="service-status" :class="`service-status--${product.status}`">
                {{ supportStatusLabel[product.status] }}
              </em>
            </div>
          </article>
        </div>
      </section>

      <section v-if="stage === 'return'" class="capability-section" aria-labelledby="return-difference-modes-title">
        <div class="section-heading">
          <div>
            <h2 id="return-difference-modes-title">退票补差模式 <span>{{ returnDifferenceModes.length }}</span></h2>
            <p>
              Payout退票场景，如涉及换汇，可能由于汇率波动产生损益，出款产品接入时，需确认退票补差损益承担方。
            </p>
          </div>
          <div class="legend" aria-label="支持状态图例">
            <span><i class="dot dot--standard"></i>标准支持</span>
            <span><i class="dot dot--conditional"></i>按需支持</span>
          </div>
        </div>

        <div class="capability-grid capability-grid--value-added">
          <article v-for="mode in returnDifferenceModes" :key="mode.id" class="capability-card">
            <div class="card-topline">
              <div class="capability-identity">
                <span class="brand-mark" :style="{ '--mark-color': mode.accent }">
                  {{ mode.initial }}
                </span>
                <div>
                  <h3>{{ mode.name }}</h3>
                  <p>{{ mode.description }}</p>
                </div>
              </div>
              <em class="service-status" :class="`service-status--${mode.status}`">
                {{ supportStatusLabel[mode.status] }}
              </em>
            </div>
          </article>
        </div>
      </section>

      <section v-if="stage !== 'return'" class="capability-section" :aria-labelledby="`payout-stage-${stage}`">
        <div class="section-heading">
          <h2 :id="`payout-stage-${stage}`">{{ currentStageTitle }}能力 <span>{{ stageCards.length }}</span></h2>
          <div class="legend" aria-label="支持状态图例">
            <span><i class="dot dot--standard"></i>标准支持</span>
            <span><i class="dot dot--conditional"></i>条件支持</span>
          </div>
        </div>

        <div class="capability-grid capability-grid--value-added">
          <article v-for="capability in stageCards" :key="capability.id" class="capability-card">
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
              <em class="service-status" :class="`service-status--${capability.status}`">
                {{ supportStatusLabel[capability.status] }}
              </em>
            </div>
          </article>
        </div>
      </section>
    </template>

    <p class="capability-note">
      说明：当前出款能力地图基于出款白皮书主文档的产品定位做第一版抽象，后续可继续按专项白皮书补齐市场、通道和接入规则。
    </p>
  </section>
</template>
