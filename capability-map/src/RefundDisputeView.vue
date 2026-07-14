<script setup lang="ts">
import { computed, ref } from 'vue'
import { supportStatusLabel, type SupportStatus } from './capabilityData'

type RefundLaunchMode = 'dashboard' | 'api'
type RefundMethod = 'original' | 'wallet' | 'payout'
type RefundDecision = 'userChoice' | 'autoRoute'
type RefundIntegration = 'hosted' | 'embedded'
type RefundFunding = 'merchant' | 'platformAdvance'
type ChargebackFunding = 'merchant' | 'fraudProtection'

interface ChoiceOption<T extends string> {
  value: T
  label: string
  description?: string
  status: SupportStatus
}

interface ServiceItem {
  id: string
  name: string
  description: string
  initial: string
  accent: string
  status: SupportStatus
}

interface PayoutMethod {
  id: string
  name: string
  description: string
  initial: string
  accent: string
  status: SupportStatus
}

interface RefundPaymentMethod {
  id: string
  name: string
  description: string
  initial: string
  accent: string
  originalRefund: SupportStatus
  partialRefund: SupportStatus
}

const launchMode = ref<RefundLaunchMode>('dashboard')
const selectedRefundMethods = ref<RefundMethod[]>(['original', 'wallet', 'payout'])
const selectedRefundDecisions = ref<RefundDecision[]>(['userChoice'])
const integration = ref<RefundIntegration>('hosted')
const funding = ref<RefundFunding>('merchant')
const chargebackFunding = ref<ChargebackFunding>('merchant')

const launchModeOptions: ChoiceOption<RefundLaunchMode>[] = [
  { value: 'dashboard', label: 'Dashboard 退款', description: '由运营人员在后台发起退款', status: 'standard' },
  { value: 'api', label: 'API 退款', description: '由业务系统通过接口发起退款', status: 'standard' }
]

const refundMethodOptions: ChoiceOption<RefundMethod>[] = [
  { value: 'original', label: '原路退款', description: '退回用户原支付方式', status: 'standard' },
  { value: 'wallet', label: '退至钱包', description: '退款进入用户指定钱包', status: 'conditional' },
  { value: 'payout', label: '退款转代发', description: '通过代发通道完成退款', status: 'conditional' }
]

const refundDecisionOptions: ChoiceOption<RefundDecision>[] = [
  { value: 'userChoice', label: '用户主动选择', description: '由用户选择退款到账方式', status: 'standard' },
  { value: 'autoRoute', label: '系统自动路由', description: '有可用退款路径时，可按规则自动选择退款路径', status: 'conditional' }
]

const integrationOptions: ChoiceOption<RefundIntegration>[] = [
  { value: 'hosted', label: '独立收银台', description: '跳转到标准退款确认页', status: 'standard' },
  { value: 'embedded', label: '嵌入式收银台', description: '在商户页面完成退款确认', status: 'conditional' }
]

const fundingOptions: ChoiceOption<RefundFunding>[] = [
  { value: 'merchant', label: '商户出资', description: '由商户退款资金余额出资', status: 'standard' },
  { value: 'platformAdvance', label: '平台商户垫资退款', description: '平台先行垫付，再进行资金结算', status: 'conditional' }
]

const chargebackFundingOptions: ChoiceOption<ChargebackFunding>[] = [
  { value: 'merchant', label: '商户承担', description: '拒付损失由商户承担', status: 'standard' },
  { value: 'fraudProtection', label: '欺诈拒付包赔', description: '符合规则的欺诈拒付由平台赔付', status: 'conditional' }
]

const payoutMethods: PayoutMethod[] = [
  {
    id: 'bank-account',
    name: '银行账户',
    description: '本地银行账户代发',
    initial: 'B',
    accent: '#0f766e',
    status: 'standard'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: '跨境钱包退款代发',
    initial: 'P',
    accent: '#0070ba',
    status: 'standard'
  },
  {
    id: 'gopay',
    name: 'GoPay',
    description: '印尼本地电子钱包',
    initial: 'G',
    accent: '#1a8fe3',
    status: 'standard'
  },
  {
    id: 'ovo',
    name: 'OVO',
    description: '印尼本地电子钱包',
    initial: 'O',
    accent: '#6b35a5',
    status: 'conditional'
  },
  {
    id: 'dana',
    name: 'DANA',
    description: '印尼本地电子钱包',
    initial: 'D',
    accent: '#118eea',
    status: 'conditional'
  },
  {
    id: 'gcash',
    name: 'GCash',
    description: '菲律宾本地电子钱包',
    initial: 'G',
    accent: '#1677ff',
    status: 'standard'
  },
  {
    id: 'grabpay',
    name: 'GrabPay',
    description: '东南亚区域电子钱包',
    initial: 'G',
    accent: '#00b14f',
    status: 'conditional'
  },
  {
    id: 'tng',
    name: "Touch 'n Go",
    description: '马来西亚本地电子钱包',
    initial: 'T',
    accent: '#1455ad',
    status: 'conditional'
  }
]

const refundPaymentMethods: RefundPaymentMethod[] = [
  { id: 'visa', name: 'Visa', description: '国际银行卡', initial: 'V', accent: '#174ea6', originalRefund: 'standard', partialRefund: 'standard' },
  { id: 'mastercard', name: 'Mastercard', description: '国际银行卡', initial: 'M', accent: '#eb001b', originalRefund: 'standard', partialRefund: 'standard' },
  { id: 'paypal', name: 'PayPal', description: '跨境电子钱包', initial: 'P', accent: '#0070ba', originalRefund: 'standard', partialRefund: 'conditional' },
  { id: 'pix', name: 'PIX', description: '巴西本地支付', initial: 'P', accent: '#12b3a8', originalRefund: 'conditional', partialRefund: 'unsupported' },
  { id: 'promptpay', name: 'PromptPay', description: '泰国本地支付', initial: 'P', accent: '#265fcf', originalRefund: 'conditional', partialRefund: 'unsupported' },
  { id: 'gopay', name: 'GoPay', description: '印尼电子钱包', initial: 'G', accent: '#1a8fe3', originalRefund: 'unsupported', partialRefund: 'unsupported' },
  { id: 'fpx', name: 'FPX', description: '马来西亚网银', initial: 'F', accent: '#0b4ea2', originalRefund: 'conditional', partialRefund: 'unsupported' },
  { id: 'apple-pay', name: 'Apple Pay', description: '快捷支付钱包', initial: 'A', accent: '#111827', originalRefund: 'standard', partialRefund: 'standard' },
  { id: 'google-pay', name: 'Google Pay', description: '快捷支付钱包', initial: 'G', accent: '#4285f4', originalRefund: 'standard', partialRefund: 'standard' },
  { id: 'bank-transfer', name: 'Bank Transfer', description: '银行转账', initial: 'B', accent: '#0f766e', originalRefund: 'conditional', partialRefund: 'unsupported' },
  { id: 'alipay-plus', name: 'Alipay+', description: '区域钱包网络', initial: 'A', accent: '#1677ff', originalRefund: 'conditional', partialRefund: 'conditional' },
  { id: 'unionpay', name: '银联卡', description: '银行卡支付', initial: 'U', accent: '#d91f2d', originalRefund: 'standard', partialRefund: 'conditional' }
]

const chargebackPaymentMethods: PayoutMethod[] = [
  { id: 'visa', name: 'Visa', description: '国际银行卡争议处理', initial: 'V', accent: '#174ea6', status: 'standard' },
  { id: 'mastercard', name: 'Mastercard', description: '国际银行卡争议处理', initial: 'M', accent: '#eb001b', status: 'standard' },
  { id: 'paypal', name: 'PayPal', description: '钱包交易争议处理', initial: 'P', accent: '#0070ba', status: 'conditional' },
  { id: 'unionpay', name: '银联卡', description: '银联卡争议处理', initial: 'U', accent: '#d91f2d', status: 'conditional' },
  { id: 'apple-pay', name: 'Apple Pay', description: '底层银行卡争议处理', initial: 'A', accent: '#111827', status: 'standard' }
]

const refundServices: ServiceItem[] = [
  {
    id: 'refund-proof',
    name: '退款查单凭证',
    description: '提供退款状态查询与用户侧凭证。',
    initial: 'R',
    accent: '#2563eb',
    status: 'standard'
  },
  {
    id: 'refund-fx-lock',
    name: '退款换汇保价',
    description: '降低跨币种退款中的汇率波动影响。',
    initial: '¥',
    accent: '#0f766e',
    status: 'conditional'
  }
]

const chargebackServices: ServiceItem[] = [
  {
    id: 'chargeback-alert',
    name: '拒付预警消息',
    description: '在拒付处理节点推送预警消息。',
    initial: '!',
    accent: '#e18104',
    status: 'standard'
  },
  {
    id: 'chargeback-fx-lock',
    name: '拒付换汇保价',
    description: '降低跨币种拒付中的汇率波动影响。',
    initial: '¥',
    accent: '#7c3aed',
    status: 'conditional'
  }
]

const showRefundDecision = computed(() => selectedRefundMethods.value.length > 1)

const showRefundExperience = computed(
  () => showRefundDecision.value && selectedRefundDecisions.value.includes('userChoice')
)

const showPayoutMethods = computed(() => selectedRefundMethods.value.includes('payout'))
const showOriginalRefundNotice = computed(() => selectedRefundMethods.value.includes('original'))
const hasFallbackRefundMethod = computed(
  () => selectedRefundMethods.value.includes('wallet') || selectedRefundMethods.value.includes('payout')
)

function toggleRefundMethod(value: RefundMethod) {
  if (selectedRefundMethods.value.includes(value)) {
    selectedRefundMethods.value = selectedRefundMethods.value.filter((method) => method !== value)
    return
  }

  selectedRefundMethods.value = [...selectedRefundMethods.value, value]
}

function toggleRefundDecision(value: RefundDecision) {
  if (selectedRefundDecisions.value.includes(value)) {
    if (selectedRefundDecisions.value.length === 1) return
    selectedRefundDecisions.value = selectedRefundDecisions.value.filter((item) => item !== value)
    return
  }

  selectedRefundDecisions.value = [...selectedRefundDecisions.value, value]
}
</script>

<template>
  <section class="refund-dispute-view" aria-label="退款与拒付能力">
    <section class="refund-zone" aria-labelledby="refund-title">
      <div class="refund-zone-heading">
        <h2 id="refund-title">退款能力</h2>
        <p>配置退款路径、交互方式与资金来源。</p>
      </div>

      <div class="refund-panel refund-panel--rows">
        <div class="refund-row">
          <div class="refund-row-label">
            <strong>发起方式</strong>
            <span>选择退款发起入口</span>
          </div>
          <div class="refund-choice-grid refund-choice-grid--two">
            <button
              v-for="option in launchModeOptions"
              :key="option.value"
              class="refund-choice-card"
              :class="{ 'is-active': launchMode === option.value }"
              type="button"
              :aria-pressed="launchMode === option.value"
              @click="launchMode = option.value"
            >
              <span class="refund-card-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="refund-radio" aria-hidden="true"></span>
            </button>
          </div>
        </div>

        <div class="refund-row">
          <div class="refund-row-label">
            <strong>退款出资</strong>
            <span>选择退款资金来源</span>
          </div>
          <div class="refund-choice-grid refund-choice-grid--two">
            <button
              v-for="option in fundingOptions"
              :key="option.value"
              class="refund-choice-card"
              :class="{ 'is-active': funding === option.value }"
              type="button"
              :aria-pressed="funding === option.value"
              @click="funding = option.value"
            >
              <span class="refund-card-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="refund-card-meta">
                <em class="refund-status" :class="`refund-status--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="refund-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </div>

        <div class="refund-row">
          <div class="refund-row-label">
            <strong>退款方式</strong>
            <span>可选择多个退款路径</span>
          </div>
          <div class="refund-choice-grid refund-choice-grid--three">
            <button
              v-for="option in refundMethodOptions"
              :key="option.value"
              class="refund-choice-card"
              :class="{ 'is-active': selectedRefundMethods.includes(option.value) }"
              type="button"
              :aria-pressed="selectedRefundMethods.includes(option.value)"
              @click="toggleRefundMethod(option.value)"
            >
              <span class="refund-card-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="refund-check" aria-hidden="true"></span>
            </button>
          </div>
          <div
            v-if="showOriginalRefundNotice"
            class="refund-method-notice"
            :class="{ 'refund-method-notice--covered': hasFallbackRefundMethod }"
            role="status"
          >
            <span class="refund-method-notice__mark" aria-hidden="true">!</span>
            <div v-if="hasFallbackRefundMethod">
              <strong>已配置补充退款方式</strong>
              <p>可承接部分支付方式无法原路退回或原路退款失败的场景。</p>
            </div>
            <div v-else>
              <strong>部分支付方式不支持原路退款</strong>
              <p>建议同时开通“退至钱包”或“退款转代发”，用于承接无法原路退回的退款。</p>
            </div>
          </div>
        </div>

        <div v-if="showRefundDecision" class="refund-row refund-decision-row">
          <div class="refund-row-label">
            <strong>退款方式决策</strong>
            <span>多种退款方式可用时，由用户选择或系统自动路由。</span>
          </div>
          <div class="refund-choice-grid refund-choice-grid--two">
            <button
              v-for="option in refundDecisionOptions"
              :key="option.value"
              class="refund-choice-card"
              :class="{ 'is-active': selectedRefundDecisions.includes(option.value) }"
              type="button"
              :aria-pressed="selectedRefundDecisions.includes(option.value)"
              @click="toggleRefundDecision(option.value)"
            >
              <span class="refund-card-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="refund-card-meta">
                <em class="refund-status" :class="`refund-status--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="refund-check" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </div>

        <div v-if="showRefundExperience" class="refund-row">
          <div class="refund-row-label">
            <strong>收银台集成模式</strong>
            <span>选择退款确认页的收银台形态</span>
          </div>
          <div class="refund-choice-grid refund-choice-grid--two">
            <button
              v-for="option in integrationOptions"
              :key="option.value"
              class="refund-choice-card"
              :class="{ 'is-active': integration === option.value }"
              type="button"
              :aria-pressed="integration === option.value"
              @click="integration = option.value"
            >
              <span class="refund-card-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="refund-card-meta">
                <em class="refund-status" :class="`refund-status--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="refund-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <section
        v-if="showOriginalRefundNotice"
        class="refund-panel refund-panel--catalog refund-method-capability-panel"
        aria-labelledby="refund-method-capability-title"
      >
        <div class="refund-panel-heading">
          <h3 id="refund-method-capability-title">支付方式原路退款能力</h3>
          <p>查看各支付方式的原路退款和部分退款支持情况。</p>
        </div>
        <div class="refund-method-grid">
          <article v-for="method in refundPaymentMethods" :key="method.id" class="refund-method-card">
            <div class="refund-method-card__heading">
              <span class="refund-method-mark" :style="{ '--mark-color': method.accent }">{{ method.initial }}</span>
              <div>
                <h4>{{ method.name }}</h4>
                <p>{{ method.description }}</p>
              </div>
            </div>
            <div
              v-if="method.originalRefund !== 'unsupported' || method.partialRefund !== 'unsupported'"
              class="refund-method-tags"
            >
              <span v-if="method.originalRefund !== 'unsupported'" :class="`refund-method-tag refund-method-tag--${method.originalRefund}`">
                原路退款
              </span>
              <span v-if="method.partialRefund !== 'unsupported'" :class="`refund-method-tag refund-method-tag--${method.partialRefund}`">
                部分退款
              </span>
            </div>
            <span v-else class="refund-method-empty">暂不支持退款</span>
          </article>
        </div>
      </section>

      <section v-if="showPayoutMethods" class="refund-panel refund-panel--catalog" aria-labelledby="payout-method-title">
        <div class="refund-panel-heading">
          <h3 id="payout-method-title">转代发支付方式</h3>
          <p>退款转代发可用的收款方式。</p>
        </div>
        <div class="payout-grid">
          <article v-for="method in payoutMethods" :key="method.id" class="payout-card">
            <div class="payout-card-topline">
              <span class="payout-mark" :style="{ '--mark-color': method.accent }">{{ method.initial }}</span>
              <em class="refund-status" :class="`refund-status--${method.status}`">
                {{ supportStatusLabel[method.status] }}
              </em>
            </div>
            <h4>{{ method.name }}</h4>
            <p>{{ method.description }}</p>
          </article>
        </div>
      </section>

      <section class="refund-panel refund-panel--services" aria-labelledby="refund-service-title">
        <div class="refund-row-label">
          <strong id="refund-service-title">退款增值服务</strong>
          <span>补充退款查询与汇率保障能力</span>
        </div>
        <div class="refund-service-grid">
          <article v-for="service in refundServices" :key="service.id" class="refund-service-card">
            <span class="payout-mark payout-mark--outline" :style="{ '--mark-color': service.accent }">
              {{ service.initial }}
            </span>
            <div>
              <div class="refund-service-title">
                <h4>{{ service.name }}</h4>
                <em class="refund-status" :class="`refund-status--${service.status}`">
                  {{ supportStatusLabel[service.status] }}
                </em>
              </div>
              <p>{{ service.description }}</p>
            </div>
          </article>
        </div>
      </section>
    </section>

    <section class="refund-zone refund-zone--chargeback" aria-labelledby="chargeback-title">
      <div class="refund-zone-heading">
        <h2 id="chargeback-title">拒付能力</h2>
        <p>配置拒付损失承担与增值保障。</p>
      </div>

      <div class="refund-panel refund-panel--rows">
        <div class="refund-row">
          <div class="refund-row-label">
            <strong>拒付损失承担</strong>
            <span>选择拒付损失处理方式</span>
          </div>
          <div class="refund-choice-grid refund-choice-grid--two">
            <button
              v-for="option in chargebackFundingOptions"
              :key="option.value"
              class="refund-choice-card"
              :class="{ 'is-active': chargebackFunding === option.value }"
              type="button"
              :aria-pressed="chargebackFunding === option.value"
              @click="chargebackFunding = option.value"
            >
              <span class="refund-card-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="refund-card-meta">
                <em class="refund-status" :class="`refund-status--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="refund-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <section class="refund-panel refund-panel--catalog" aria-labelledby="chargeback-method-title">
        <div class="refund-panel-heading">
          <h3 id="chargeback-method-title">支持拒付的支付方式</h3>
          <p>可发起拒付或交易争议处理的支付方式。</p>
        </div>
        <div class="payout-grid">
          <article v-for="method in chargebackPaymentMethods" :key="method.id" class="payout-card">
            <div class="payout-card-topline">
              <span class="payout-mark" :style="{ '--mark-color': method.accent }">{{ method.initial }}</span>
              <em class="refund-status" :class="`refund-status--${method.status}`">
                {{ supportStatusLabel[method.status] }}
              </em>
            </div>
            <h4>{{ method.name }}</h4>
            <p>{{ method.description }}</p>
          </article>
        </div>
      </section>

      <section class="refund-panel refund-panel--services" aria-labelledby="chargeback-service-title">
        <div class="refund-row-label">
          <strong id="chargeback-service-title">拒付增值服务</strong>
          <span>配置预警与汇率保障服务</span>
        </div>
        <div class="refund-service-grid">
          <article v-for="service in chargebackServices" :key="service.id" class="refund-service-card">
            <span class="payout-mark payout-mark--outline" :style="{ '--mark-color': service.accent }">
              {{ service.initial }}
            </span>
            <div>
              <div class="refund-service-title">
                <h4>{{ service.name }}</h4>
                <em class="refund-status" :class="`refund-status--${service.status}`">
                  {{ supportStatusLabel[service.status] }}
                </em>
              </div>
              <p>{{ service.description }}</p>
            </div>
          </article>
        </div>
      </section>
    </section>

    <div class="refund-footer">
      <div class="refund-legend" aria-label="支持状态图例">
        <span><i class="refund-dot refund-dot--standard"></i>标准支持</span>
        <span><i class="refund-dot refund-dot--conditional"></i>条件支持</span>
        <span><i class="refund-dot refund-dot--unsupported"></i>不支持</span>
      </div>
      <p>说明：能力范围与可用性可能因商户资质、风控评估或当地法规要求变化，当前数据仅用于 demo 演示。</p>
    </div>
  </section>
</template>

<style scoped>
.refund-dispute-view {
  display: grid;
  gap: 12px;
}

.refund-panel {
  border: 1px solid var(--cap-border);
  border-radius: 8px;
  background: var(--cap-surface);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.refund-panel--common,
.refund-panel--catalog {
  padding: 14px 16px 16px;
}

.refund-panel-heading {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 12px;
}

.refund-panel-heading h2,
.refund-panel-heading h3,
.refund-zone-heading h2 {
  margin: 0;
  color: var(--cap-text);
  font-size: 15px;
  line-height: 1.3;
  letter-spacing: 0;
  font-weight: 800;
}

.refund-panel-heading p,
.refund-zone-heading p {
  margin: 0;
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.45;
}

.refund-zone-heading {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 2px 4px 8px;
}

.refund-panel--rows {
  padding: 0 16px;
}

.refund-row {
  display: grid;
  grid-template-columns: 214px minmax(0, 1fr);
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--cap-border-soft);
}

.refund-panel--common .refund-row,
.refund-row:first-child {
  border-top: 0;
}

.refund-row-label {
  display: grid;
  align-content: center;
  gap: 4px;
  min-width: 0;
  padding: 0 4px;
}

.refund-row-label strong {
  color: var(--cap-text);
  font-size: 14px;
  line-height: 1.35;
  font-weight: 800;
}

.refund-row-label span {
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.45;
}

.refund-method-notice {
  grid-column: 2;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: -4px;
  border: 1px solid #f5d7a1;
  border-radius: 7px;
  padding: 10px 12px;
  background: #fff8eb;
  color: #8a5300;
}

.refund-method-notice--covered {
  border-color: #cde8d5;
  background: #f1faf4;
  color: #247a3d;
}

.refund-method-notice__mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 50%;
  border: 1px solid currentColor;
  background: #fff;
  color: #b76b00;
  font-size: 11px;
  line-height: 1;
  font-weight: 900;
}

.refund-method-notice--covered .refund-method-notice__mark {
  color: #247a3d;
}

.refund-method-notice strong {
  display: block;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 800;
}

.refund-method-notice p {
  margin: 2px 0 0;
  color: inherit;
  font-size: 11px;
  line-height: 1.5;
}


.refund-method-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px 14px;
}

.refund-method-card {
  display: flex;
  min-width: 0;
  min-height: 86px;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--cap-border);
  border-radius: 8px;
  padding: 11px 12px;
  background: #fff;
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.035);
}

.refund-method-card__heading {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  gap: 9px;
}

.refund-method-mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--mark-color) 10%, white);
  color: var(--mark-color);
  font-size: 12px;
  font-weight: 900;
}

.refund-method-card h4 {
  overflow: hidden;
  margin: 0;
  color: var(--cap-text);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refund-method-card p {
  overflow: hidden;
  margin: 2px 0 0;
  color: var(--cap-muted);
  font-size: 10px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refund-method-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.refund-method-tag,
.refund-method-empty {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 20px;
  border-radius: 999px;
  padding: 0 7px;
  font-size: 10px;
  line-height: 1;
  font-weight: 800;
  white-space: nowrap;
}

.refund-method-tag--standard {
  background: var(--cap-green-bg);
  color: var(--cap-green);
}

.refund-method-tag--conditional {
  background: var(--cap-orange-bg);
  color: var(--cap-orange);
}

.refund-method-empty {
  background: var(--cap-gray-bg);
  color: #727c8a;
}

.refund-choice-grid,
.refund-service-grid {
  display: grid;
  min-width: 0;
  gap: 12px;
}

.refund-choice-grid--two,
.refund-service-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.refund-choice-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.refund-choice-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 54px;
  border: 1px solid var(--cap-border);
  border-radius: 8px;
  padding: 9px 12px;
  background: var(--cap-surface-soft);
  color: var(--cap-text);
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.refund-choice-card:hover {
  border-color: #a7c4f4;
  background: #fbfdff;
}

.refund-choice-card.is-active {
  border-color: var(--cap-blue);
  background: var(--cap-blue-soft);
  box-shadow: inset 0 0 0 1px rgba(18, 103, 241, 0.25);
}

.refund-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #eaf3ff;
  color: var(--cap-blue);
  font-size: 13px;
  font-weight: 850;
}

.refund-panel--common .refund-choice-card {
  grid-template-columns: 28px minmax(0, 1fr) auto;
}

.refund-card-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.refund-card-copy strong {
  color: var(--cap-text);
  font-size: 14px;
  line-height: 1.3;
  font-weight: 800;
}

.refund-card-copy span {
  overflow: hidden;
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refund-radio,
.refund-check {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1.5px solid #b9c3d3;
  background: #fff;
}

.refund-radio {
  border-radius: 50%;
}

.refund-check {
  border-radius: 4px;
}

.refund-choice-card.is-active .refund-radio {
  border-color: var(--cap-blue);
  background: radial-gradient(circle, var(--cap-blue) 0 3.5px, #fff 4.5px);
}

.refund-choice-card.is-active .refund-check {
  border-color: var(--cap-blue);
  background: var(--cap-blue);
}

.refund-choice-card.is-active .refund-check::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.refund-card-meta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.refund-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.refund-status {
  min-height: 21px;
  padding: 0 8px;
  font-size: 11px;
}

.refund-status--standard {
  background: var(--cap-green-bg);
  color: var(--cap-green);
}

.refund-status--conditional {
  background: var(--cap-orange-bg);
  color: var(--cap-orange);
}

.refund-status--unsupported {
  background: var(--cap-gray-bg);
  color: #727c8a;
}

.payout-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px 14px;
}

.payout-card,
.refund-service-card {
  min-width: 0;
  border: 1px solid var(--cap-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.035);
}

.payout-card {
  min-height: 88px;
  padding: 11px 12px;
}

.payout-card-topline,
.refund-service-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.payout-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--mark-color) 12%, #ffffff);
  color: var(--mark-color);
  font-size: 15px;
  font-weight: 850;
}

.payout-mark--outline {
  border: 1px solid color-mix(in srgb, var(--mark-color) 36%, #ffffff);
  background: #fff;
}

.payout-card h4,
.refund-service-card h4 {
  margin: 8px 0 0;
  color: var(--cap-text);
  font-size: 13px;
  line-height: 1.3;
  letter-spacing: 0;
  font-weight: 800;
}

.payout-card p,
.refund-service-card p {
  margin: 3px 0 0;
  color: var(--cap-muted);
  font-size: 11px;
  line-height: 1.35;
}

.refund-panel--services {
  display: grid;
  grid-template-columns: 214px minmax(0, 1fr);
  gap: 16px;
  margin-top: 8px;
  padding: 14px 16px;
}

.refund-panel--catalog {
  margin-top: 8px;
}

.refund-service-card {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  min-height: 64px;
  padding: 11px 12px;
}

.refund-service-card h4 {
  margin: 0;
}

.refund-service-card p {
  margin-bottom: 7px;
}

.refund-zone--chargeback {
  margin-top: 2px;
}

.refund-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -2px 4px 0;
}

.refund-footer p {
  margin: 0;
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.6;
  text-align: right;
}

.refund-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.refund-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.refund-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.refund-dot--standard {
  background: var(--cap-green);
}

.refund-dot--conditional {
  background: var(--cap-orange);
}

.refund-dot--unsupported {
  background: #b7bfca;
}

@media (max-width: 1080px) {
  .payout-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .refund-panel-heading,
  .refund-zone-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .refund-row,
  .refund-panel--services {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .refund-method-notice {
    grid-column: auto;
  }

  .refund-choice-grid--two,
  .refund-choice-grid--three,
  .refund-service-grid,
  .refund-method-grid,
  .payout-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .refund-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .refund-footer p {
    text-align: left;
  }
}

@media (max-width: 560px) {
  .refund-panel--common,
  .refund-panel--catalog {
    padding-right: 12px;
    padding-left: 12px;
  }

  .refund-panel--rows {
    padding-right: 12px;
    padding-left: 12px;
  }

  .refund-choice-grid--two,
  .refund-choice-grid--three,
  .refund-service-grid,
  .refund-method-grid,
  .payout-grid {
    grid-template-columns: 1fr;
  }

  .refund-card-copy span {
    white-space: normal;
  }
}
</style>
