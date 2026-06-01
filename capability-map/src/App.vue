<script setup lang="ts">
import { computed, ref } from 'vue'
import ReconciliationView from './ReconciliationView.vue'
import RefundDisputeView from './RefundDisputeView.vue'
import SettlementView from './SettlementView.vue'
import {
  capabilities,
  defaultSelectedPaymentAbilities,
  environmentOptions,
  getIntegrationStatus,
  integrationOptions,
  marketOptions,
  merchantTypeOptions,
  paymentAbilityGroups,
  productOptions,
  shortSupportLabel,
  supportStatusLabel,
  versionLabel,
  type CapabilityItem,
  type Environment,
  type IntegrationMode,
  type MarketSelection,
  type MerchantType,
  type PaymentAbilityId,
  type PaymentAbilityGroupId,
  type PaymentMethodTagId,
  type ProductType,
  type SupportStatus
} from './capabilityData'

const currentMerchantType = ref<MerchantType>('standardMerchant')
const currentProduct = ref<ProductType>('online')
const currentEnvironment = ref<Environment>('web')
const currentIntegration = ref<IntegrationMode>('hosted')
const currentStage = ref<StageId>('acquiring')
const selectedMarket = ref<MarketSelection>('All')
const selectedPaymentAbilities = ref<PaymentAbilityId[]>([...defaultSelectedPaymentAbilities])

const paymentMethodTagLabels: Record<PaymentMethodTagId, string> = {
  standaloneBinding: '独立绑定',
  payAndBind: '支付并绑定',
  preAuthPay: '预授权支付'
}

const tagAbilityDependencies: Record<PaymentMethodTagId, PaymentAbilityId[]> = {
  standaloneBinding: ['standaloneBinding'],
  payAndBind: ['payAndBind'],
  preAuthPay: ['preAuthMultiple', 'partialPreAuth', 'incrementalPreAuth', 'overCapture']
}

type IconName =
  | 'map'
  | 'merchant'
  | 'platform'
  | 'onlinePay'
  | 'agreementPay'
  | 'subscription'
  | 'web'
  | 'app'
  | 'hosted'
  | 'embedded'
  | 'api'
  | 'retry'
  | 'binding'
  | 'combined'
  | 'preAuth'
  | 'refund'
  | 'settlement'
  | 'reconciliation'

type StageId = 'acquiring' | 'refundDispute' | 'settlement' | 'reconciliation'

interface StageOption {
  id: StageId
  title: string
  icon: IconName
}

const iconSvg: Record<IconName, string> = {
  map:
    '<svg viewBox="0 0 24 24" role="img"><path d="m4.5 6.2 5-2.2 5 2.2 5-2.2v13.8l-5 2.2-5-2.2-5 2.2V6.2Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9.5 4v13.8M14.5 6.2V20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  merchant:
    '<svg viewBox="0 0 24 24" role="img"><path d="M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="currentColor"/><path d="M5 20.4c.7-3.6 3.1-5.5 7-5.5s6.3 1.9 7 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  platform:
    '<svg viewBox="0 0 24 24" role="img"><path d="M8.2 10.8a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6ZM16.7 11.4a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8Z" fill="currentColor"/><path d="M2.8 20.1c.6-3.6 2.6-5.3 5.8-5.3s5.2 1.7 5.8 5.3M13 18.2c.8-2.2 2.4-3.3 4.6-3.3 2.4 0 3.8 1.3 4.2 3.9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  onlinePay:
    '<svg viewBox="0 0 24 24" role="img"><rect x="4" y="4" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 20h6M12 16v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 8v4M9.8 10h4.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  agreementPay:
    '<svg viewBox="0 0 24 24" role="img"><rect x="5" y="4" width="14" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  subscription:
    '<svg viewBox="0 0 24 24" role="img"><path d="M17.7 7.1a7.5 7.5 0 0 0-12 2.7M5.2 5.9v4.2h4.2M6.3 16.9a7.5 7.5 0 0 0 12-2.7M18.8 18.1v-4.2h-4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  web:
    '<svg viewBox="0 0 24 24" role="img"><rect x="3.5" y="4.5" width="17" height="12" rx="1.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 20h7M12 16.5V20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  app:
    '<svg viewBox="0 0 24 24" role="img"><rect x="7.5" y="3.5" width="9" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 6.5h3M11.3 17.5h1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  hosted:
    '<svg viewBox="0 0 24 24" role="img"><rect x="5" y="3.5" width="14" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 8h7M8.5 11.8h7M8.5 15.6h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  embedded:
    '<svg viewBox="0 0 24 24" role="img"><path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  api:
    '<svg viewBox="0 0 24 24" role="img"><text x="3" y="15.7" fill="currentColor" font-size="9.5" font-weight="800" font-family="Inter, Arial, sans-serif">API</text></svg>',
  retry:
    '<svg viewBox="0 0 24 24" role="img"><path d="M17.8 7.1a7.5 7.5 0 0 0-12.2 2.6M5 5.8v4.4h4.4M6.2 16.9a7.5 7.5 0 0 0 12.2-2.6M19 18.2v-4.4h-4.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  binding:
    '<svg viewBox="0 0 24 24" role="img"><path d="M8.4 15.6 15.6 8.4M10.8 6.2h7v7" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  combined:
    '<svg viewBox="0 0 24 24" role="img"><path d="M6 8.2h12l-2.2 7.6H3.8L6 8.2Z" fill="currentColor"/><path d="M7 6h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  preAuth:
    '<svg viewBox="0 0 24 24" role="img"><path d="M12 3.7 20.3 12 12 20.3 3.7 12 12 3.7Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  refund:
    '<svg viewBox="0 0 24 24" role="img"><path d="M7.2 8.2h9.1a4.5 4.5 0 0 1 0 9H9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.4 4.9 4 8.3l3.4 3.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  settlement:
    '<svg viewBox="0 0 24 24" role="img"><path d="M5 7.2h14M5 12h14M5 16.8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 4.8 5 7.2 8 9.6M16 14.4l3 2.4-3 2.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  reconciliation:
    '<svg viewBox="0 0 24 24" role="img"><rect x="5" y="3.5" width="14" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 8.2h7M8.5 12h4.2M8.5 15.8h3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m14.2 15.5 1.5 1.5 3-3.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}

const stageOptions: StageOption[] = [
  {
    id: 'acquiring',
    title: '收单支付',
    icon: 'onlinePay'
  },
  {
    id: 'refundDispute',
    title: '退款与拒付',
    icon: 'refund'
  },
  {
    id: 'settlement',
    title: '清结算',
    icon: 'settlement'
  },
  {
    id: 'reconciliation',
    title: '账单与对账',
    icon: 'reconciliation'
  }
]

const choiceIcon: Record<MerchantType | ProductType | Environment | IntegrationMode, IconName> = {
  standardMerchant: 'merchant',
  platformMerchant: 'platform',
  online: 'onlinePay',
  agreementDeduction: 'agreementPay',
  subscription: 'subscription',
  web: 'web',
  app: 'app',
  hosted: 'hosted',
  embedded: 'embedded',
  api: 'api'
}

const abilityGroupIcon: Record<PaymentAbilityGroupId, IconName> = {
  retry: 'retry',
  binding: 'binding',
  combined: 'combined',
  preAuth: 'preAuth'
}

const filteredCapabilities = computed(() =>
  capabilities.filter((capability) => {
    const matchesSelection =
      capability.products.includes(currentProduct.value) &&
      capability.environments.includes(currentEnvironment.value) &&
      capability.integrationModes.includes(currentIntegration.value)
    const matchesMarket =
      selectedMarket.value === 'All' || capability.marketStatus[selectedMarket.value] !== 'unsupported'

    return matchesSelection && matchesMarket
  })
)

const paymentCapabilities = computed(() =>
  filteredCapabilities.value.filter((capability) => capability.category === 'payment')
)

const valueAddedCapabilities = computed(() =>
  capabilities.filter((capability) => capability.category === 'valueAdded')
)

function selectMerchantType(value: MerchantType) {
  currentMerchantType.value = value
}

function selectProduct(value: ProductType) {
  currentProduct.value = value
}

function selectEnvironment(value: Environment) {
  currentEnvironment.value = value
}

function selectIntegration(value: IntegrationMode) {
  currentIntegration.value = value
}

function selectStage(value: StageId) {
  currentStage.value = value
}

function integrationStatusFor(integration: IntegrationMode) {
  return getIntegrationStatus(currentMerchantType.value, currentProduct.value, currentEnvironment.value, integration)
}

function togglePaymentAbility(capability: PaymentAbilityId) {
  if (selectedPaymentAbilities.value.includes(capability)) {
    selectedPaymentAbilities.value = selectedPaymentAbilities.value.filter(
      (selectedCapability) => selectedCapability !== capability
    )
    return
  }

  selectedPaymentAbilities.value = paymentAbilityGroups
    .flatMap((group) => group.options.map((option) => option.value))
    .filter(
      (paymentAbility) => selectedPaymentAbilities.value.includes(paymentAbility) || paymentAbility === capability
    )
}

function serviceStatusFor(capability: CapabilityItem): SupportStatus {
  if (
    !capability.products.includes(currentProduct.value) ||
    !capability.environments.includes(currentEnvironment.value) ||
    !capability.integrationModes.includes(currentIntegration.value)
  ) {
    return 'unsupported'
  }

  if (selectedMarket.value !== 'All') {
    return capability.marketStatus[selectedMarket.value]
  }

  return capability.serviceStatus ?? 'standard'
}

function paymentMethodTagsFor(capability: CapabilityItem) {
  if (!capability.paymentMethodTags) return []

  return (Object.entries(capability.paymentMethodTags) as Array<[PaymentMethodTagId, SupportStatus]>).filter(
    ([tagId, status]) =>
      status !== 'unsupported' &&
      tagAbilityDependencies[tagId].some((ability) => selectedPaymentAbilities.value.includes(ability))
  )
}

</script>

<template>
  <main class="app-shell">
    <section class="capability-map" aria-labelledby="capability-map-title">
      <div class="sticky-header">
        <header class="capability-map__heading">
          <div class="toolbar-title">
            <span class="toolbar-title__icon" aria-hidden="true" v-html="iconSvg.map"></span>
            <h1 id="capability-map-title">能力地图</h1>
          </div>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <div class="toolbar-filter">
            <span class="toolbar-filter__label">商户类型</span>
            <div class="toolbar-segmented" role="group" aria-label="商户类型">
              <button
                v-for="option in merchantTypeOptions"
                :key="option.value"
                class="toolbar-segmented__item"
                :class="{ 'is-active': currentMerchantType === option.value }"
                type="button"
                :aria-pressed="currentMerchantType === option.value"
                @click="selectMerchantType(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <label class="toolbar-filter market-select">
            <span class="toolbar-filter__label">市场</span>
            <select v-model="selectedMarket" aria-label="市场">
              <option v-for="market in marketOptions" :key="market" :value="market">
                {{ market }}
              </option>
            </select>
          </label>
        </header>

        <section class="stage-flow" aria-label="业务阶段">
          <template v-for="(stage, index) in stageOptions" :key="stage.id">
            <button
              class="stage-card"
              :class="{ 'is-active': currentStage === stage.id }"
              type="button"
              :aria-pressed="currentStage === stage.id"
              @click="selectStage(stage.id)"
            >
              <span class="stage-icon" aria-hidden="true" v-html="iconSvg[stage.icon]"></span>
              <strong>{{ stage.title }}</strong>
            </button>
            <span v-if="index < stageOptions.length - 1" class="stage-arrow" aria-hidden="true">&gt;</span>
          </template>
        </section>
      </div>

      <template v-if="currentStage === 'acquiring'">
      <section class="filter-panel" aria-label="能力地图筛选项">
        <fieldset class="choice-group">
          <legend>
            <span>收单支付产品</span>
            <small>选择使用的收单支付产品</small>
          </legend>
          <div class="choice-grid choice-grid--three">
            <button
              v-for="option in productOptions"
              :key="option.value"
              class="choice-card"
              :class="{ 'is-active': currentProduct === option.value }"
              type="button"
              :aria-pressed="currentProduct === option.value"
              @click="selectProduct(option.value)"
            >
              <span class="choice-icon" aria-hidden="true" v-html="iconSvg[choiceIcon[option.value]]"></span>
              <span class="choice-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="choice-radio" aria-hidden="true"></span>
            </button>
          </div>
        </fieldset>

        <fieldset class="choice-group choice-group--two">
          <legend>
            <span>支付环境</span>
            <small>选择业务所处的终端环境</small>
          </legend>
          <div class="choice-grid choice-grid--two">
            <button
              v-for="option in environmentOptions"
              :key="option.value"
              class="choice-card"
              :class="{ 'is-active': currentEnvironment === option.value }"
              type="button"
              :aria-pressed="currentEnvironment === option.value"
              @click="selectEnvironment(option.value)"
            >
              <span class="choice-icon" aria-hidden="true" v-html="iconSvg[choiceIcon[option.value]]"></span>
              <span class="choice-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="choice-radio" aria-hidden="true"></span>
            </button>
          </div>
        </fieldset>

        <fieldset class="choice-group">
          <legend>
            <span>集成模式</span>
            <small>选择接入与集成的方式</small>
          </legend>
          <div class="choice-grid choice-grid--three">
            <button
              v-for="option in integrationOptions"
              :key="option.value"
              class="choice-card choice-card--with-status"
              :class="[
                { 'is-active': currentIntegration === option.value },
                `choice-card--${integrationStatusFor(option.value)}`
              ]"
              type="button"
              :aria-pressed="currentIntegration === option.value"
              @click="selectIntegration(option.value)"
            >
              <span class="choice-icon" aria-hidden="true" v-html="iconSvg[choiceIcon[option.value]]"></span>
              <span class="choice-copy">
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </span>
              <span class="choice-meta">
                <em class="status-chip" :class="`status-chip--${integrationStatusFor(option.value)}`">
                  {{ supportStatusLabel[integrationStatusFor(option.value)] }}
                </em>
                <span class="choice-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </fieldset>
      </section>

      <section class="payment-ability-panel" aria-labelledby="payment-ability-title">
        <div class="section-heading section-heading--panel">
          <div>
            <h2 id="payment-ability-title">支付能力</h2>
            <p>根据您的业务需要，选择能力组合（可多选）。</p>
          </div>
        </div>

        <div class="ability-group-grid">
          <fieldset v-for="group in paymentAbilityGroups" :key="group.id" class="ability-group">
            <legend>
              <span class="ability-group-icon" aria-hidden="true" v-html="iconSvg[abilityGroupIcon[group.id]]"></span>
              {{ group.title }}
            </legend>
            <div class="ability-options">
              <button
                v-for="option in group.options"
                :key="option.value"
                class="ability-option"
                :class="[
                  { 'is-active': selectedPaymentAbilities.includes(option.value) },
                  `ability-option--${option.status}`
                ]"
                type="button"
                :aria-pressed="selectedPaymentAbilities.includes(option.value)"
                @click="togglePaymentAbility(option.value)"
              >
                <span class="ability-check" aria-hidden="true"></span>
                <strong>{{ option.label }}</strong>
                <em class="status-chip" :class="`status-chip--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
              </button>
            </div>
          </fieldset>
        </div>
      </section>

      <section class="capability-section" aria-labelledby="value-added-title">
        <div class="section-heading">
          <h2 id="value-added-title">增值服务 <span>{{ valueAddedCapabilities.length }}</span></h2>
          <div class="legend" aria-label="支持状态图例">
            <span><i class="dot dot--standard"></i>标准支持</span>
            <span><i class="dot dot--conditional"></i>条件支持</span>
            <span><i class="dot dot--unsupported"></i>不支持</span>
          </div>
        </div>

        <div class="capability-grid capability-grid--value-added">
          <article v-for="capability in valueAddedCapabilities" :key="capability.id" class="capability-card">
            <div class="card-topline">
              <div class="capability-identity">
                <span class="brand-mark brand-mark--outline" :style="{ '--mark-color': capability.accent }">
                  {{ capability.initial }}
                </span>
                <div>
                  <h3>{{ capability.name }}</h3>
                  <p>{{ capability.description }}</p>
                </div>
              </div>
              <em class="service-status" :class="`service-status--${serviceStatusFor(capability)}`">
                {{ supportStatusLabel[serviceStatusFor(capability)] }}
              </em>
            </div>
          </article>
        </div>
      </section>

      <section class="capability-section capability-section--payment-methods" aria-labelledby="payment-method-title">
        <div class="section-heading">
          <h2 id="payment-method-title">支付方式 <span>{{ paymentCapabilities.length }}</span></h2>
          <div class="legend" aria-label="支持状态图例">
            <span><i class="dot dot--standard"></i>支持</span>
            <span><i class="dot dot--conditional"></i>部分支持</span>
          </div>
        </div>

        <div v-if="paymentCapabilities.length" class="capability-grid">
          <article v-for="capability in paymentCapabilities" :key="capability.id" class="capability-card">
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
              <span class="version-tag" :class="`version-tag--${capability.version}`">
                {{ versionLabel[capability.version] }}
              </span>
            </div>

            <div v-if="paymentMethodTagsFor(capability).length" class="method-tags" aria-label="支持的支付能力">
              <span
                v-for="[tagId, status] in paymentMethodTagsFor(capability)"
                :key="tagId"
                class="method-tag"
                :class="`method-tag--${status}`"
                :title="`${paymentMethodTagLabels[tagId]}：${shortSupportLabel[status]}`"
              >
                {{ paymentMethodTagLabels[tagId] }}
              </span>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">暂无可展示的支付方式，请调整产品、环境、集成模式或市场。</div>
      </section>

      <p class="capability-note">
        说明：能力范围与可用性可能因商户资质、风控评估或当地法规要求变化，当前数据仅用于 demo 演示。
      </p>
      </template>

      <RefundDisputeView v-else-if="currentStage === 'refundDispute'" />

      <SettlementView v-else-if="currentStage === 'settlement'" :merchant-type="currentMerchantType" />

      <ReconciliationView v-else-if="currentStage === 'reconciliation'" />

      <section v-else class="empty-state stage-empty-state">
        当前阶段能力地图正在完善中。
      </section>
    </section>
  </main>
</template>
