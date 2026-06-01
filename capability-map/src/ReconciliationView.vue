<script setup lang="ts">
import { ref } from 'vue'
import { supportStatusLabel, type SupportStatus } from './capabilityData'

type BasicBill = 'settlement' | 'transaction' | 'fund'
type GroupBill = 'groupSettlement' | 'groupFund'
type ReconciliationMode = 'groupFinance' | 'independent'
type ValueAddedBill = 'tax' | 'marketing'
type BillDeliveryMethod = 'dashboard' | 'api' | 'sftp'

interface ChoiceOption<T extends string> {
  value: T
  label: string
  status: SupportStatus
}

interface ReconciliationModeOption {
  value: ReconciliationMode
  label: string
  description: string
}

const selectedReconciliationMode = ref<ReconciliationMode>('independent')
const selectedBasicBills = ref<BasicBill[]>(['settlement', 'transaction', 'fund'])
const selectedGroupBills = ref<GroupBill[]>(['groupSettlement', 'groupFund'])
const selectedValueAddedBills = ref<ValueAddedBill[]>(['tax'])
const selectedDeliveryMethods = ref<BillDeliveryMethod[]>(['dashboard'])

const reconciliationModeOptions: ReconciliationModeOption[] = [
  {
    value: 'groupFinance',
    label: '集团财务对账',
    description: '集团主体默认由集团财务进行对账'
  },
  {
    value: 'independent',
    label: '自主对账',
    description: '由业务主体自行完成账单核对'
  }
]

const basicBillOptions: ChoiceOption<BasicBill>[] = [
  { value: 'settlement', label: '结算账单', status: 'standard' },
  { value: 'transaction', label: '交易账单', status: 'standard' },
  { value: 'fund', label: '资金账单', status: 'standard' }
]

const groupBillOptions: ChoiceOption<GroupBill>[] = [
  { value: 'groupSettlement', label: '集团专用结算账单', status: 'standard' },
  { value: 'groupFund', label: '集团专用资金账单', status: 'standard' }
]

const valueAddedBillOptions: ChoiceOption<ValueAddedBill>[] = [
  { value: 'tax', label: '计税账单', status: 'conditional' },
  { value: 'marketing', label: '营销账单', status: 'conditional' }
]

const deliveryMethodOptions: ChoiceOption<BillDeliveryMethod>[] = [
  { value: 'dashboard', label: 'Dashboard', status: 'standard' },
  { value: 'api', label: 'API', status: 'unsupported' },
  { value: 'sftp', label: 'SFTP', status: 'unsupported' }
]

function toggleSelection<T extends string>(selectedValues: T[], value: T) {
  if (selectedValues.includes(value)) return selectedValues.filter((selectedValue) => selectedValue !== value)
  return [...selectedValues, value]
}

function toggleBasicBill(value: BasicBill) {
  selectedBasicBills.value = toggleSelection(selectedBasicBills.value, value)
}

function toggleGroupBill(value: GroupBill) {
  selectedGroupBills.value = toggleSelection(selectedGroupBills.value, value)
}

function toggleValueAddedBill(value: ValueAddedBill) {
  selectedValueAddedBills.value = toggleSelection(selectedValueAddedBills.value, value)
}

function toggleDeliveryMethod(option: ChoiceOption<BillDeliveryMethod>) {
  if (option.status === 'unsupported') return
  selectedDeliveryMethods.value = toggleSelection(selectedDeliveryMethods.value, option.value)
}
</script>

<template>
  <section class="reconciliation-view" aria-label="账单与对账">
    <div class="reconciliation-panel">
      <div class="reconciliation-row">
        <div class="reconciliation-row-label">
          <strong>对账模式</strong>
          <span>选择财务对账的负责主体（单选）</span>
        </div>
        <div class="reconciliation-choice-grid reconciliation-choice-grid--two">
          <button
            v-for="option in reconciliationModeOptions"
            :key="option.value"
            class="reconciliation-choice-card reconciliation-choice-card--mode"
            :class="{ 'is-active': selectedReconciliationMode === option.value }"
            type="button"
            :aria-pressed="selectedReconciliationMode === option.value"
            @click="selectedReconciliationMode = option.value"
          >
            <span class="reconciliation-choice-copy">
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>
            <span class="reconciliation-radio" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <div v-if="selectedReconciliationMode === 'independent'" class="reconciliation-row">
        <div class="reconciliation-row-label">
          <strong>标准基础账单</strong>
          <span>选择需要获取的核心业务账单（可多选）</span>
        </div>
        <div class="reconciliation-choice-grid reconciliation-choice-grid--three">
          <button
            v-for="option in basicBillOptions"
            :key="option.value"
            class="reconciliation-choice-card"
            :class="{ 'is-active': selectedBasicBills.includes(option.value) }"
            type="button"
            :aria-pressed="selectedBasicBills.includes(option.value)"
            @click="toggleBasicBill(option.value)"
          >
            <strong>{{ option.label }}</strong>
            <span class="reconciliation-card-meta">
              <em class="reconciliation-status" :class="`reconciliation-status--${option.status}`">
                {{ supportStatusLabel[option.status] }}
              </em>
              <span class="reconciliation-check" aria-hidden="true"></span>
            </span>
          </button>
        </div>
      </div>

      <div v-else class="reconciliation-row">
        <div class="reconciliation-row-label">
          <strong>集团专用账单</strong>
          <span>选择集团财务核对所需的专用账单（可多选）</span>
        </div>
        <div class="reconciliation-choice-grid reconciliation-choice-grid--two">
          <button
            v-for="option in groupBillOptions"
            :key="option.value"
            class="reconciliation-choice-card"
            :class="{ 'is-active': selectedGroupBills.includes(option.value) }"
            type="button"
            :aria-pressed="selectedGroupBills.includes(option.value)"
            @click="toggleGroupBill(option.value)"
          >
            <strong>{{ option.label }}</strong>
            <span class="reconciliation-card-meta">
              <em class="reconciliation-status" :class="`reconciliation-status--${option.status}`">
                {{ supportStatusLabel[option.status] }}
              </em>
              <span class="reconciliation-check" aria-hidden="true"></span>
            </span>
          </button>
        </div>
      </div>

      <div class="reconciliation-row">
        <div class="reconciliation-row-label">
          <strong>增值能力账单</strong>
          <span>选择附加业务能力对应的账单（可多选）</span>
        </div>
        <div class="reconciliation-choice-grid reconciliation-choice-grid--two">
          <button
            v-for="option in valueAddedBillOptions"
            :key="option.value"
            class="reconciliation-choice-card"
            :class="{ 'is-active': selectedValueAddedBills.includes(option.value) }"
            type="button"
            :aria-pressed="selectedValueAddedBills.includes(option.value)"
            @click="toggleValueAddedBill(option.value)"
          >
            <strong>{{ option.label }}</strong>
            <span class="reconciliation-card-meta">
              <em class="reconciliation-status" :class="`reconciliation-status--${option.status}`">
                {{ supportStatusLabel[option.status] }}
              </em>
              <span class="reconciliation-check" aria-hidden="true"></span>
            </span>
          </button>
        </div>
      </div>

      <div class="reconciliation-row">
        <div class="reconciliation-row-label">
          <strong>账单获取方式</strong>
          <span>
            {{
              selectedReconciliationMode === 'groupFinance'
                ? '集团专用账单不需业务自行获取及处理'
                : '选择账单数据的获取渠道（可多选）'
            }}
          </span>
        </div>
        <div class="reconciliation-choice-grid reconciliation-choice-grid--three">
          <button
            v-for="option in deliveryMethodOptions"
            :key="option.value"
            class="reconciliation-choice-card"
            :class="{ 'is-active': selectedDeliveryMethods.includes(option.value) }"
            type="button"
            :disabled="option.status === 'unsupported'"
            :aria-pressed="selectedDeliveryMethods.includes(option.value)"
            @click="toggleDeliveryMethod(option)"
          >
            <strong>{{ option.label }}</strong>
            <span class="reconciliation-card-meta">
              <em class="reconciliation-status" :class="`reconciliation-status--${option.status}`">
                {{ supportStatusLabel[option.status] }}
              </em>
              <span class="reconciliation-check" aria-hidden="true"></span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="reconciliation-footer">
      <div class="reconciliation-legend" aria-label="支持状态图例">
        <span><i class="reconciliation-dot reconciliation-dot--standard"></i>标准支持</span>
        <span><i class="reconciliation-dot reconciliation-dot--conditional"></i>条件支持</span>
        <span><i class="reconciliation-dot reconciliation-dot--unsupported"></i>不支持</span>
      </div>
      <p>说明：能力范围与可用性可能因商户资质、风控评估或当地法规要求变化，当前数据仅用于 demo 演示。</p>
    </div>
  </section>
</template>

<style scoped>
.reconciliation-view {
  display: grid;
  gap: 12px;
}

.reconciliation-panel {
  border: 1px solid var(--cap-border);
  border-radius: 8px;
  padding: 0 16px;
  background: var(--cap-surface);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.reconciliation-row {
  display: grid;
  grid-template-columns: 214px minmax(0, 1fr);
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--cap-border-soft);
}

.reconciliation-row:first-child {
  border-top: 0;
}

.reconciliation-row-label {
  display: grid;
  align-content: center;
  gap: 4px;
  min-width: 0;
  padding: 0 4px;
}

.reconciliation-row-label strong {
  color: var(--cap-text);
  font-size: 14px;
  line-height: 1.35;
  font-weight: 800;
}

.reconciliation-row-label span {
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.45;
}

.reconciliation-choice-grid {
  display: grid;
  min-width: 0;
  gap: 12px;
}

.reconciliation-choice-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.reconciliation-choice-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.reconciliation-choice-grid--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.reconciliation-choice-card {
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

.reconciliation-choice-card:hover {
  border-color: #a7c4f4;
  background: #fbfdff;
}

.reconciliation-choice-card:disabled {
  cursor: not-allowed;
}

.reconciliation-choice-card.is-active {
  border-color: var(--cap-blue);
  background: var(--cap-blue-soft);
  box-shadow: inset 0 0 0 1px rgba(18, 103, 241, 0.25);
}

.reconciliation-choice-card > strong {
  overflow: hidden;
  color: var(--cap-text);
  font-size: 14px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 800;
}

.reconciliation-choice-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.reconciliation-choice-copy strong {
  overflow: hidden;
  color: var(--cap-text);
  font-size: 14px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 800;
}

.reconciliation-choice-copy small {
  overflow: hidden;
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reconciliation-card-meta,
.reconciliation-status,
.reconciliation-check,
.reconciliation-radio {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.reconciliation-card-meta {
  gap: 12px;
}

.reconciliation-status {
  min-height: 21px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.reconciliation-status--standard {
  background: var(--cap-green-bg);
  color: var(--cap-green);
}

.reconciliation-status--conditional {
  background: var(--cap-orange-bg);
  color: var(--cap-orange);
}

.reconciliation-status--unsupported {
  background: var(--cap-gray-bg);
  color: #727c8a;
}

.reconciliation-check {
  position: relative;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1.5px solid #b9c3d3;
  border-radius: 4px;
  background: #fff;
}

.reconciliation-choice-card.is-active .reconciliation-check {
  border-color: var(--cap-blue);
  background: var(--cap-blue);
}

.reconciliation-choice-card.is-active .reconciliation-check::after {
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

.reconciliation-radio {
  position: relative;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1.5px solid #b9c3d3;
  border-radius: 50%;
  background: #fff;
}

.reconciliation-choice-card.is-active .reconciliation-radio {
  border-color: var(--cap-blue);
}

.reconciliation-choice-card.is-active .reconciliation-radio::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cap-blue);
}

.reconciliation-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -2px 4px 0;
}

.reconciliation-footer p {
  margin: 0;
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.6;
  text-align: right;
}

.reconciliation-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  color: var(--cap-muted);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.reconciliation-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reconciliation-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.reconciliation-dot--standard {
  background: var(--cap-green);
}

.reconciliation-dot--conditional {
  background: var(--cap-orange);
}

.reconciliation-dot--unsupported {
  background: #b7bfca;
}

@media (max-width: 1120px) {
  .reconciliation-choice-grid--four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .reconciliation-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .reconciliation-choice-grid--two,
  .reconciliation-choice-grid--three,
  .reconciliation-choice-grid--four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .reconciliation-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .reconciliation-footer p {
    text-align: left;
  }
}

@media (max-width: 560px) {
  .reconciliation-panel {
    padding-right: 12px;
    padding-left: 12px;
  }

  .reconciliation-choice-grid--two,
  .reconciliation-choice-grid--three,
  .reconciliation-choice-grid--four {
    grid-template-columns: 1fr;
  }
}
</style>
