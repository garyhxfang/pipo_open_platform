<script setup lang="ts">
import { computed, ref } from 'vue'
import { supportStatusLabel, type MerchantType, type SupportStatus } from './capabilityData'

type SettlementMode = 'periodic' | 'realtime' | 'instruction'
type SettlementDestination = 'account' | 'bWallet' | 'internalTransfer'
type FxQuoteTiming = 'transactionSuccess' | 'settlementStart' | 'preTradeLock'
type RefundSettlementCycle = 'followCollection' | 'separated'
type SplitMode = 'instruction' | 'agreement'
type SplitFunction = 'split' | 'splitReturn' | 'secondarySplit' | 'splitAdjustment' | 'advanceRecovery'
type TransferLaunchMode = 'dashboard' | 'api'

interface ChoiceOption<T extends string> {
  value: T
  label: string
  status: SupportStatus
}

const props = defineProps<{
  merchantType: MerchantType
}>()

const settlementMode = ref<SettlementMode>('periodic')
const settlementDestination = ref<SettlementDestination>('account')
const fxQuoteTiming = ref<FxQuoteTiming>('transactionSuccess')
const refundSettlementCycle = ref<RefundSettlementCycle>('followCollection')
const splitMode = ref<SplitMode>('instruction')
const selectedSplitFunctions = ref<SplitFunction[]>(['split', 'splitReturn'])
const transferLaunchMode = ref<TransferLaunchMode>('dashboard')

const isPlatformMerchant = computed(() => props.merchantType === 'platformMerchant')

const settlementModeOptions: ChoiceOption<SettlementMode>[] = [
  { value: 'periodic', label: '周期结算', status: 'standard' },
  { value: 'realtime', label: '实时结算', status: 'conditional' },
  { value: 'instruction', label: '指令结算', status: 'standard' }
]

const settlementDestinationOptions: ChoiceOption<SettlementDestination>[] = [
  { value: 'account', label: '结算到户', status: 'standard' },
  { value: 'bWallet', label: '结算到B钱包', status: 'conditional' },
  { value: 'internalTransfer', label: '内部结转清', status: 'standard' }
]

const fxQuoteTimingOptions: ChoiceOption<FxQuoteTiming>[] = [
  { value: 'transactionSuccess', label: '交易成功时', status: 'standard' },
  { value: 'settlementStart', label: '发起结算时', status: 'standard' },
  { value: 'preTradeLock', label: '交易前锁价', status: 'conditional' }
]

const refundSettlementCycleOptions: ChoiceOption<RefundSettlementCycle>[] = [
  { value: 'followCollection', label: '退随收', status: 'standard' },
  { value: 'separated', label: '收退分离', status: 'conditional' }
]

const splitModeOptions: ChoiceOption<SplitMode>[] = [
  { value: 'instruction', label: '指令分账', status: 'standard' },
  { value: 'agreement', label: '协议分账', status: 'conditional' }
]

const splitFunctionOptions: ChoiceOption<SplitFunction>[] = [
  { value: 'split', label: '分账', status: 'standard' },
  { value: 'splitReturn', label: '分账退回', status: 'standard' },
  { value: 'secondarySplit', label: '二次分账', status: 'conditional' },
  { value: 'splitAdjustment', label: '分账补差', status: 'conditional' },
  { value: 'advanceRecovery', label: '垫资回补', status: 'conditional' }
]

const transferLaunchModeOptions: ChoiceOption<TransferLaunchMode>[] = [
  { value: 'dashboard', label: 'Dashboard 发起', status: 'standard' },
  { value: 'api', label: 'API 发起', status: 'standard' }
]

function toggleSplitFunction(value: SplitFunction) {
  if (selectedSplitFunctions.value.includes(value)) {
    selectedSplitFunctions.value = selectedSplitFunctions.value.filter((item) => item !== value)
    return
  }

  selectedSplitFunctions.value = [...selectedSplitFunctions.value, value]
}
</script>

<template>
  <section class="settlement-view" aria-label="清结算能力">
    <section class="settlement-zone" aria-labelledby="settlement-title">
      <div class="settlement-zone-heading">
        <h2 id="settlement-title">结算能力</h2>
        <p>配置结算模式、资金去向与账期规则。</p>
      </div>

      <div class="settlement-panel settlement-panel--rows">
        <div class="settlement-row">
          <div class="settlement-row-label">
            <strong>结算模式</strong>
            <span>选择资金结算的触发方式</span>
          </div>
          <div class="settlement-choice-grid settlement-choice-grid--three">
            <button
              v-for="option in settlementModeOptions"
              :key="option.value"
              class="settlement-choice-card"
              :class="{ 'is-active': settlementMode === option.value }"
              type="button"
              :aria-pressed="settlementMode === option.value"
              @click="settlementMode = option.value"
            >
              <strong>{{ option.label }}</strong>
              <span class="settlement-card-meta">
                <em class="settlement-status" :class="`settlement-status--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="settlement-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </div>

        <div class="settlement-row">
          <div class="settlement-row-label">
            <strong>结算方式</strong>
            <span>选择结算资金的到账路径</span>
          </div>
          <div class="settlement-choice-grid settlement-choice-grid--three">
            <button
              v-for="option in settlementDestinationOptions"
              :key="option.value"
              class="settlement-choice-card"
              :class="{ 'is-active': settlementDestination === option.value }"
              type="button"
              :aria-pressed="settlementDestination === option.value"
              @click="settlementDestination = option.value"
            >
              <strong>{{ option.label }}</strong>
              <span class="settlement-card-meta">
                <em class="settlement-status" :class="`settlement-status--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="settlement-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </div>

        <div class="settlement-row">
          <div class="settlement-row-label">
            <strong>换汇报价时点</strong>
            <span>选择跨币种结算的报价时点</span>
          </div>
          <div class="settlement-choice-grid settlement-choice-grid--three">
            <button
              v-for="option in fxQuoteTimingOptions"
              :key="option.value"
              class="settlement-choice-card"
              :class="{ 'is-active': fxQuoteTiming === option.value }"
              type="button"
              :aria-pressed="fxQuoteTiming === option.value"
              @click="fxQuoteTiming = option.value"
            >
              <strong>{{ option.label }}</strong>
              <span class="settlement-card-meta">
                <em class="settlement-status" :class="`settlement-status--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="settlement-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </div>

        <div class="settlement-row">
          <div class="settlement-row-label">
            <strong>退款结算账期</strong>
            <span>选择退款与收款的结算关系</span>
          </div>
          <div class="settlement-choice-grid settlement-choice-grid--two">
            <button
              v-for="option in refundSettlementCycleOptions"
              :key="option.value"
              class="settlement-choice-card"
              :class="{ 'is-active': refundSettlementCycle === option.value }"
              type="button"
              :aria-pressed="refundSettlementCycle === option.value"
              @click="refundSettlementCycle = option.value"
            >
              <strong>{{ option.label }}</strong>
              <span class="settlement-card-meta">
                <em class="settlement-status" :class="`settlement-status--${option.status}`">
                  {{ supportStatusLabel[option.status] }}
                </em>
                <span class="settlement-radio" aria-hidden="true"></span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <section class="settlement-panel settlement-panel--services" aria-labelledby="settlement-service-title">
        <div class="settlement-row-label">
          <strong id="settlement-service-title">结算增值服务</strong>
          <span>补充资金安全与结算管理能力</span>
        </div>
        <article class="settlement-service-card">
          <span class="settlement-service-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3.5 18.5 6v5.2c0 4.1-2.3 7.3-6.5 9.3-4.2-2-6.5-5.2-6.5-9.3V6L12 3.5Z" />
              <path d="M9.2 12.1 11 14l3.9-4.2" />
            </svg>
          </span>
          <div>
            <div class="settlement-service-title">
              <h3>结算预留金</h3>
              <em class="settlement-status settlement-status--conditional">条件支持</em>
            </div>
            <p>按规则预留部分结算资金，降低资金风险。</p>
          </div>
        </article>
      </section>
    </section>

    <template v-if="isPlatformMerchant">
      <section class="settlement-zone" aria-labelledby="split-title">
        <div class="settlement-zone-heading">
          <h2 id="split-title">分账能力</h2>
          <p>配置平台商户的资金分配与回补能力。</p>
        </div>

        <div class="settlement-panel settlement-panel--rows">
          <div class="settlement-row">
            <div class="settlement-row-label">
              <strong>分账模式</strong>
              <span>选择平台资金的分配规则</span>
            </div>
            <div class="settlement-choice-grid settlement-choice-grid--two">
              <button
                v-for="option in splitModeOptions"
                :key="option.value"
                class="settlement-choice-card"
                :class="{ 'is-active': splitMode === option.value }"
                type="button"
                :aria-pressed="splitMode === option.value"
                @click="splitMode = option.value"
              >
                <strong>{{ option.label }}</strong>
                <span class="settlement-card-meta">
                  <em class="settlement-status" :class="`settlement-status--${option.status}`">
                    {{ supportStatusLabel[option.status] }}
                  </em>
                  <span class="settlement-radio" aria-hidden="true"></span>
                </span>
              </button>
            </div>
          </div>

          <div class="settlement-row">
            <div class="settlement-row-label">
              <strong>分账功能</strong>
              <span>选择需要启用的分账能力（可多选）</span>
            </div>
            <div class="settlement-choice-grid settlement-choice-grid--split-functions">
              <button
                v-for="option in splitFunctionOptions"
                :key="option.value"
                class="settlement-choice-card"
                :class="{ 'is-active': selectedSplitFunctions.includes(option.value) }"
                type="button"
                :aria-pressed="selectedSplitFunctions.includes(option.value)"
                @click="toggleSplitFunction(option.value)"
              >
                <strong>{{ option.label }}</strong>
                <span class="settlement-card-meta">
                  <em class="settlement-status" :class="`settlement-status--${option.status}`">
                    {{ supportStatusLabel[option.status] }}
                  </em>
                  <span class="settlement-check" aria-hidden="true"></span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="settlement-zone" aria-labelledby="transfer-title">
        <div class="settlement-zone-heading">
          <h2 id="transfer-title">平台转账能力</h2>
          <p>配置平台商户的转账发起入口。</p>
        </div>

        <div class="settlement-panel settlement-panel--rows">
          <div class="settlement-row">
            <div class="settlement-row-label">
              <strong>发起方式</strong>
              <span>选择平台转账的发起入口</span>
            </div>
            <div class="settlement-choice-grid settlement-choice-grid--two">
              <button
                v-for="option in transferLaunchModeOptions"
                :key="option.value"
                class="settlement-choice-card"
                :class="{ 'is-active': transferLaunchMode === option.value }"
                type="button"
                :aria-pressed="transferLaunchMode === option.value"
                @click="transferLaunchMode = option.value"
              >
                <strong>{{ option.label }}</strong>
                <span class="settlement-card-meta">
                  <em class="settlement-status" :class="`settlement-status--${option.status}`">
                    {{ supportStatusLabel[option.status] }}
                  </em>
                  <span class="settlement-radio" aria-hidden="true"></span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </template>

    <div class="settlement-footer">
      <div class="settlement-legend" aria-label="支持状态图例">
        <span><i class="settlement-dot settlement-dot--standard"></i>标准支持</span>
        <span><i class="settlement-dot settlement-dot--conditional"></i>条件支持</span>
        <span><i class="settlement-dot settlement-dot--unsupported"></i>不支持</span>
      </div>
      <p>说明：能力范围与可用性可能因商户资质、风控评估或当地法规要求变化，当前数据仅用于 demo 演示。</p>
    </div>
  </section>
</template>

<style scoped>
.settlement-view {
  display: grid;
  gap: 12px;
}

.settlement-zone-heading {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 2px 4px 8px;
}

.settlement-zone-heading h2 {
  margin: 0;
  color: var(--cap-text);
  font-size: 15px;
  line-height: 1.3;
  letter-spacing: 0;
  font-weight: 800;
}

.settlement-zone-heading p,
.settlement-footer p {
  margin: 0;
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.45;
}

.settlement-panel {
  border: 1px solid var(--cap-border);
  border-radius: 8px;
  background: var(--cap-surface);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.settlement-panel--rows {
  padding: 0 16px;
}

.settlement-row {
  display: grid;
  grid-template-columns: 214px minmax(0, 1fr);
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--cap-border-soft);
}

.settlement-row:first-child {
  border-top: 0;
}

.settlement-row-label {
  display: grid;
  align-content: center;
  gap: 4px;
  min-width: 0;
  padding: 0 4px;
}

.settlement-row-label strong {
  color: var(--cap-text);
  font-size: 14px;
  line-height: 1.35;
  font-weight: 800;
}

.settlement-row-label span {
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.45;
}

.settlement-choice-grid {
  display: grid;
  min-width: 0;
  gap: 12px;
}

.settlement-choice-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.settlement-choice-grid--three,
.settlement-choice-grid--split-functions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.settlement-choice-card {
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

.settlement-choice-card:hover {
  border-color: #a7c4f4;
  background: #fbfdff;
}

.settlement-choice-card.is-active {
  border-color: var(--cap-blue);
  background: var(--cap-blue-soft);
  box-shadow: inset 0 0 0 1px rgba(18, 103, 241, 0.25);
}

.settlement-choice-card > strong {
  overflow: hidden;
  color: var(--cap-text);
  font-size: 14px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 800;
}

.settlement-card-meta,
.settlement-status,
.settlement-radio,
.settlement-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.settlement-card-meta {
  gap: 12px;
}

.settlement-status {
  min-height: 21px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.settlement-status--standard {
  background: var(--cap-green-bg);
  color: var(--cap-green);
}

.settlement-status--conditional {
  background: var(--cap-orange-bg);
  color: var(--cap-orange);
}

.settlement-status--unsupported {
  background: var(--cap-gray-bg);
  color: #727c8a;
}

.settlement-radio,
.settlement-check {
  position: relative;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1.5px solid #b9c3d3;
  background: #fff;
}

.settlement-radio {
  border-radius: 50%;
}

.settlement-check {
  border-radius: 4px;
}

.settlement-choice-card.is-active .settlement-radio {
  border-color: var(--cap-blue);
  background: radial-gradient(circle, var(--cap-blue) 0 3.5px, #fff 4.5px);
}

.settlement-choice-card.is-active .settlement-check {
  border-color: var(--cap-blue);
  background: var(--cap-blue);
}

.settlement-choice-card.is-active .settlement-check::after {
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

.settlement-panel--services {
  display: grid;
  grid-template-columns: 214px minmax(0, 1fr);
  gap: 16px;
  margin-top: 8px;
  padding: 14px 16px;
}

.settlement-service-card {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
  min-height: 64px;
  border: 1px solid var(--cap-border);
  border-radius: 8px;
  padding: 11px 12px;
  background: #fff;
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.035);
}

.settlement-service-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #b8d0fa;
  border-radius: 8px;
  background: #fff;
  color: var(--cap-blue);
  font-size: 15px;
  font-weight: 850;
}

.settlement-service-mark svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.settlement-service-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.settlement-service-title h3 {
  margin: 0;
  color: var(--cap-text);
  font-size: 13px;
  line-height: 1.3;
  letter-spacing: 0;
  font-weight: 800;
}

.settlement-service-card p {
  margin: 3px 0 0;
  color: var(--cap-muted);
  font-size: 11px;
  line-height: 1.35;
}

.settlement-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -2px 4px 0;
}

.settlement-footer p {
  line-height: 1.6;
  text-align: right;
}

.settlement-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.settlement-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.settlement-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.settlement-dot--standard {
  background: var(--cap-green);
}

.settlement-dot--conditional {
  background: var(--cap-orange);
}

.settlement-dot--unsupported {
  background: #b7bfca;
}

@media (max-width: 900px) {
  .settlement-zone-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .settlement-row,
  .settlement-panel--services {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .settlement-choice-grid--two,
  .settlement-choice-grid--three,
  .settlement-choice-grid--split-functions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settlement-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .settlement-footer p {
    text-align: left;
  }
}

@media (max-width: 560px) {
  .settlement-panel--rows,
  .settlement-panel--services {
    padding-right: 12px;
    padding-left: 12px;
  }

  .settlement-choice-grid--two,
  .settlement-choice-grid--three,
  .settlement-choice-grid--split-functions {
    grid-template-columns: 1fr;
  }
}
</style>
