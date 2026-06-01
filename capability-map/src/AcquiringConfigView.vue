<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  environmentOptions,
  integrationOptions,
  merchantTypeOptions,
  paymentAbilityGroups,
  productOptions,
  supportStatusLabel,
  type Environment,
  type IntegrationMode,
  type MerchantType,
  type PaymentAbilityId,
  type ProductType,
  type SupportStatus
} from './capabilityData'

type ConfigFilter<T extends string> = 'all' | T
type DomainId = 'transaction' | 'cashier' | 'gn'

interface Scenario {
  id: string
  merchantType: MerchantType
  product: ProductType
  environment: Environment
  integrationMode: IntegrationMode
}

interface DomainStatus {
  transaction: SupportStatus
  cashier: SupportStatus
  gn: SupportStatus
}

interface ScenarioConfig extends Scenario {
  abilityId: PaymentAbilityId
  domains: DomainStatus
  note: string
}

interface ExportedConfig {
  schemaVersion: 1
  exportedAt: string
  records: ScenarioConfig[]
}

const emit = defineEmits<{
  back: []
}>()

const statusOptions: SupportStatus[] = ['standard', 'conditional', 'unsupported']
const domainLabels: Record<DomainId, string> = {
  transaction: '交易',
  cashier: '收银',
  gn: 'GN'
}
const statusWeight: Record<SupportStatus, number> = {
  standard: 0,
  conditional: 1,
  unsupported: 2
}

const abilityOptions = paymentAbilityGroups.flatMap((group) =>
  group.options.map((option) => ({
    ...option,
    groupId: group.id,
    groupTitle: group.title
  }))
)

const scenarioRows: Scenario[] = merchantTypeOptions.flatMap((merchantType) =>
  productOptions.flatMap((product) =>
    environmentOptions.flatMap((environment) =>
      integrationOptions.map((integrationMode) => ({
        id: [merchantType.value, product.value, environment.value, integrationMode.value].join('-'),
        merchantType: merchantType.value,
        product: product.value,
        environment: environment.value,
        integrationMode: integrationMode.value
      }))
    )
  )
)

const merchantLabel = Object.fromEntries(merchantTypeOptions.map((option) => [option.value, option.label])) as Record<
  MerchantType,
  string
>
const productLabel = Object.fromEntries(productOptions.map((option) => [option.value, option.label])) as Record<
  ProductType,
  string
>
const environmentLabel = Object.fromEntries(environmentOptions.map((option) => [option.value, option.label])) as Record<
  Environment,
  string
>
const integrationLabel = Object.fromEntries(integrationOptions.map((option) => [option.value, option.label])) as Record<
  IntegrationMode,
  string
>

const selectedAbility = ref<PaymentAbilityId>('standaloneBinding')
const merchantFilter = ref<ConfigFilter<MerchantType>>('all')
const productFilter = ref<ConfigFilter<ProductType>>('all')
const environmentFilter = ref<ConfigFilter<Environment>>('all')
const integrationFilter = ref<ConfigFilter<IntegrationMode>>('all')
const pendingOnly = ref(false)
const currentPage = ref(1)
const pageSize = ref(12)
const selectedRows = ref<string[]>([])
const editingRow = ref<string>()
const bulkPanelOpen = ref(false)
const bulkStatuses = ref<DomainStatus>({
  transaction: 'standard',
  cashier: 'standard',
  gn: 'standard'
})
const fileInput = ref<HTMLInputElement>()

function defaultDomainStatus(abilityId: PaymentAbilityId, scenario: Scenario): DomainStatus {
  const isPlatform = scenario.merchantType === 'platformMerchant'
  const isApi = scenario.integrationMode === 'api'
  const isApp = scenario.environment === 'app'
  const isOnline = scenario.product === 'online'

  return {
    transaction: !isOnline && abilityId === 'standaloneBinding' ? 'unsupported' : isPlatform ? 'conditional' : 'standard',
    cashier: isApi ? 'conditional' : !isOnline && abilityId === 'cashierRecovery' ? 'unsupported' : 'standard',
    gn: isApp && isApi ? 'conditional' : 'standard'
  }
}

function createSeedRecords() {
  return Object.fromEntries(
    abilityOptions.flatMap((ability) =>
      scenarioRows.map((scenario) => {
        const key = configKey(ability.value, scenario.id)
        return [
          key,
          {
            ...scenario,
            abilityId: ability.value,
            domains: defaultDomainStatus(ability.value, scenario),
            note: ''
          }
        ]
      })
    )
  ) as Record<string, ScenarioConfig>
}

function configKey(abilityId: PaymentAbilityId, scenarioId: string) {
  return `${abilityId}|${scenarioId}`
}

function cloneRecords(records: Record<string, ScenarioConfig>) {
  return JSON.parse(JSON.stringify(records)) as Record<string, ScenarioConfig>
}

function loadStoredRecords() {
  const stored = localStorage.getItem('capability-map-acquiring-config')
  if (!stored) return createSeedRecords()

  try {
    const parsed = JSON.parse(stored) as ExportedConfig
    const seed = createSeedRecords()
    for (const record of parsed.records ?? []) seed[configKey(record.abilityId, record.id)] = record
    return seed
  } catch {
    return createSeedRecords()
  }
}

const records = ref<Record<string, ScenarioConfig>>(loadStoredRecords())
const savedRecords = ref<Record<string, ScenarioConfig>>(cloneRecords(records.value))

const currentAbility = computed(() => abilityOptions.find((option) => option.value === selectedAbility.value)!)

const filteredRows = computed(() =>
  scenarioRows
    .map((scenario) => records.value[configKey(selectedAbility.value, scenario.id)])
    .filter((record) => merchantFilter.value === 'all' || record.merchantType === merchantFilter.value)
    .filter((record) => productFilter.value === 'all' || record.product === productFilter.value)
    .filter((record) => environmentFilter.value === 'all' || record.environment === environmentFilter.value)
    .filter((record) => integrationFilter.value === 'all' || record.integrationMode === integrationFilter.value)
)
const visibleRows = computed(() =>
  filteredRows.value.filter((record) => !pendingOnly.value || finalStatus(record.domains) !== 'standard')
)

const totalPages = computed(() => Math.max(1, Math.ceil(visibleRows.value.length / pageSize.value)))
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return visibleRows.value.slice(start, start + pageSize.value)
})
const pendingCount = computed(() => filteredRows.value.filter((record) => finalStatus(record.domains) !== 'standard').length)
const changedCount = computed(() => {
  const current = JSON.stringify(records.value)
  const saved = JSON.stringify(savedRecords.value)
  if (current === saved) return 0

  return Object.keys(records.value).filter(
    (key) => JSON.stringify(records.value[key]) !== JSON.stringify(savedRecords.value[key])
  ).length
})
const allVisibleSelected = computed(
  () => pagedRows.value.length > 0 && pagedRows.value.every((row) => selectedRows.value.includes(row.id))
)

function finalStatus(domains: DomainStatus): SupportStatus {
  return (Object.values(domains) as SupportStatus[]).sort((a, b) => statusWeight[b] - statusWeight[a])[0]
}

function resetFilters() {
  merchantFilter.value = 'all'
  productFilter.value = 'all'
  environmentFilter.value = 'all'
  integrationFilter.value = 'all'
  pendingOnly.value = false
  currentPage.value = 1
}

function selectAllVisible() {
  const visibleIds = pagedRows.value.map((row) => row.id)
  selectedRows.value = allVisibleSelected.value
    ? selectedRows.value.filter((id) => !visibleIds.includes(id))
    : [...new Set([...selectedRows.value, ...visibleIds])]
}

function toggleRow(rowId: string) {
  selectedRows.value = selectedRows.value.includes(rowId)
    ? selectedRows.value.filter((id) => id !== rowId)
    : [...selectedRows.value, rowId]
}

function updateDomain(row: ScenarioConfig, domain: DomainId, status: SupportStatus) {
  row.domains[domain] = status
  if (status === 'conditional' && !row.note) row.note = '需评估'
}

function applyBulkStatuses() {
  const targetIds = selectedRows.value.length ? selectedRows.value : visibleRows.value.map((row) => row.id)
  for (const rowId of targetIds) {
    const row = records.value[configKey(selectedAbility.value, rowId)]
    if (!row) continue
    row.domains = { ...bulkStatuses.value }
    if (finalStatus(row.domains) === 'conditional' && !row.note) row.note = '需评估'
  }
  bulkPanelOpen.value = false
}

function saveDraft() {
  localStorage.setItem(
    'capability-map-acquiring-config-draft',
    JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), records: Object.values(records.value) })
  )
  savedRecords.value = cloneRecords(records.value)
}

function publishConfig() {
  localStorage.setItem(
    'capability-map-acquiring-config',
    JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), records: Object.values(records.value) })
  )
  savedRecords.value = cloneRecords(records.value)
}

function undoChanges() {
  records.value = cloneRecords(savedRecords.value)
}

function exportConfig() {
  const config: ExportedConfig = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    records: Object.values(records.value)
  }
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'acquiring-capability-config.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

function openImport() {
  fileInput.value?.click()
}

async function importConfig(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const imported = JSON.parse(await file.text()) as ExportedConfig
    const next = createSeedRecords()
    for (const record of imported.records ?? []) next[configKey(record.abilityId, record.id)] = record
    records.value = next
    selectedRows.value = []
  } catch {
    window.alert('配置文件无法解析，请检查 JSON 格式。')
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <main class="config-shell">
    <header class="config-header">
      <div class="config-header__title">
        <span class="config-header__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m4.5 6.2 5-2.2 5 2.2 5-2.2v13.8l-5 2.2-5-2.2-5 2.2V6.2Z" />
            <path d="M9.5 4v13.8M14.5 6.2V20" />
          </svg>
        </span>
        <strong>能力配置中心</strong>
      </div>
      <div class="config-header__actions">
        <button class="text-button" type="button" @click="emit('back')">返回能力地图</button>
        <button class="secondary-button" type="button" @click="openImport">导入配置</button>
        <button class="primary-button" type="button" @click="exportConfig">导出配置</button>
        <input ref="fileInput" class="visually-hidden" type="file" accept="application/json" @change="importConfig" />
      </div>
    </header>

    <section class="config-content">
      <div class="config-intro">
        <div>
          <h1>收单支付能力配置</h1>
          <p>按场景维护各业务域的能力支持状态，系统自动计算最终支持情况。</p>
        </div>
        <span class="scenario-count">共 36 个场景</span>
      </div>

      <section class="filter-toolbar" aria-label="配置筛选项">
        <label class="filter-field filter-field--ability">
          <span>配置能力</span>
          <select v-model="selectedAbility" @change="selectedRows = []; currentPage = 1">
            <option v-for="ability in abilityOptions" :key="ability.value" :value="ability.value">
              {{ ability.label }}
            </option>
          </select>
          <small>{{ currentAbility.groupTitle }} / {{ currentAbility.label }}</small>
        </label>
        <label class="filter-field">
          <span>商户类型</span>
          <select v-model="merchantFilter" @change="currentPage = 1">
            <option value="all">全部</option>
            <option v-for="option in merchantTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="filter-field">
          <span>收单支付产品</span>
          <select v-model="productFilter" @change="currentPage = 1">
            <option value="all">全部</option>
            <option v-for="option in productOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="filter-field">
          <span>支付环境</span>
          <select v-model="environmentFilter" @change="currentPage = 1">
            <option value="all">全部</option>
            <option v-for="option in environmentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="filter-field">
          <span>集成模式</span>
          <select v-model="integrationFilter" @change="currentPage = 1">
            <option value="all">全部</option>
            <option v-for="option in integrationOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <div class="filter-toolbar__actions">
          <button class="text-button" type="button" @click="resetFilters">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.8 11.9a7.2 7.2 0 1 0 2-5M4.8 5.5v6h6" />
            </svg>
            重置筛选
          </button>
          <button class="outline-button" type="button" @click="bulkPanelOpen = !bulkPanelOpen">批量配置</button>
        </div>
      </section>

      <section v-if="bulkPanelOpen" class="bulk-panel" aria-label="批量配置">
        <div>
          <strong>批量配置域状态</strong>
          <span>{{ selectedRows.length ? `应用到已选择的 ${selectedRows.length} 行` : `应用到当前筛选结果 ${visibleRows.length} 行` }}</span>
        </div>
        <label v-for="(label, domain) in domainLabels" :key="domain">
          <span>{{ label }}</span>
          <select v-model="bulkStatuses[domain]">
            <option v-for="status in statusOptions" :key="status" :value="status">{{ supportStatusLabel[status] }}</option>
          </select>
        </label>
        <button class="secondary-button" type="button" @click="bulkPanelOpen = false">取消</button>
        <button class="primary-button" type="button" @click="applyBulkStatuses">应用</button>
      </section>

      <section class="config-table-panel" aria-labelledby="scenario-config-title">
        <div class="table-toolbar">
          <div>
            <strong id="scenario-config-title">场景支持情况</strong>
            <span>逐行配置交易、收银、GN 三个域的支持状态</span>
          </div>
          <div class="table-toolbar__right">
            <div class="view-toggle">
              <button :class="{ 'is-active': !pendingOnly }" type="button" @click="pendingOnly = false; currentPage = 1">全部 {{ filteredRows.length }}</button>
              <button :class="{ 'is-active': pendingOnly }" type="button" @click="pendingOnly = true; currentPage = 1">待完善 {{ pendingCount }}</button>
            </div>
            <div class="status-legend" aria-label="支持状态图例">
              <span><i class="status-dot status-dot--standard"></i>标准支持</span>
              <span><i class="status-dot status-dot--conditional"></i>条件支持</span>
              <span><i class="status-dot status-dot--unsupported"></i>不支持</span>
            </div>
          </div>
        </div>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th rowspan="2"><input type="checkbox" :checked="allVisibleSelected" @change="selectAllVisible" /></th>
                <th rowspan="2">序号</th>
                <th rowspan="2">商户类型</th>
                <th rowspan="2">收单支付产品</th>
                <th rowspan="2">支付环境</th>
                <th rowspan="2">集成模式</th>
                <th colspan="3">各域支持情况</th>
                <th rowspan="2">最终支持情况</th>
                <th rowspan="2">备注</th>
                <th rowspan="2">操作</th>
              </tr>
              <tr>
                <th>交易</th>
                <th>收银</th>
                <th>GN</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in pagedRows" :key="row.id" :class="{ 'is-editing': editingRow === row.id }">
                <td><input type="checkbox" :checked="selectedRows.includes(row.id)" @change="toggleRow(row.id)" /></td>
                <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td>{{ merchantLabel[row.merchantType] }}</td>
                <td>{{ productLabel[row.product] }}</td>
                <td>{{ environmentLabel[row.environment] }}</td>
                <td>{{ integrationLabel[row.integrationMode] }}</td>
                <td v-for="(_, domain) in domainLabels" :key="domain">
                  <select
                    class="status-select"
                    :class="`status-select--${row.domains[domain]}`"
                    :value="row.domains[domain]"
                    @change="updateDomain(row, domain, ($event.target as HTMLSelectElement).value as SupportStatus)"
                  >
                    <option v-for="status in statusOptions" :key="status" :value="status">
                      {{ supportStatusLabel[status] }}
                    </option>
                  </select>
                </td>
                <td>
                  <span class="final-status" :class="`final-status--${finalStatus(row.domains)}`">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="5" y="3.5" width="14" height="17" rx="2" />
                      <path d="M8 8h8M8 12h3M8 16h3M14 12v4M12 14h4" />
                    </svg>
                    {{ supportStatusLabel[finalStatus(row.domains)] }}
                  </span>
                </td>
                <td><input v-model="row.note" class="note-input" placeholder="-" /></td>
                <td><button class="row-edit-button" type="button" @click="editingRow = row.id">编辑</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          <span>共 {{ visibleRows.length }} 条</span>
          <div class="pagination">
            <button type="button" :disabled="currentPage === 1" @click="currentPage--">&lsaquo;</button>
            <button
              v-for="page in totalPages"
              :key="page"
              :class="{ 'is-active': currentPage === page }"
              type="button"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button type="button" :disabled="currentPage === totalPages" @click="currentPage++">&rsaquo;</button>
          </div>
          <select v-model="pageSize" @change="currentPage = 1">
            <option :value="12">12 条/页</option>
            <option :value="20">20 条/页</option>
            <option :value="36">36 条/页</option>
          </select>
        </div>
      </section>
    </section>

    <footer class="config-action-bar">
      <span><i></i>当前有 {{ changedCount }} 项未保存修改</span>
      <div>
        <button class="text-button" type="button" @click="undoChanges">撤销修改</button>
        <button class="secondary-button" type="button" @click="saveDraft">保存草稿</button>
        <button class="primary-button" type="button" @click="publishConfig">发布配置</button>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.config-shell {
  --config-blue: #1267f1;
  --config-blue-soft: #eef5ff;
  --config-border: #d8e0ec;
  --config-border-soft: #e8edf5;
  --config-text: #172033;
  --config-muted: #68768d;
  --config-green: #27833e;
  --config-green-bg: #eaf7ed;
  --config-orange: #df820b;
  --config-orange-bg: #fff3df;
  --config-gray: #7b8797;
  --config-gray-bg: #eef2f6;
  min-height: 100vh;
  padding-bottom: 68px;
  background: #f5f7fb;
  color: var(--config-text);
}

button,
select,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.config-header,
.config-header__title,
.config-header__actions,
.filter-toolbar,
.filter-toolbar__actions,
.bulk-panel,
.table-toolbar,
.table-toolbar__right,
.view-toggle,
.status-legend,
.table-footer,
.pagination,
.config-action-bar,
.config-action-bar > div {
  display: flex;
  align-items: center;
}

.config-header {
  position: sticky;
  top: 0;
  z-index: 20;
  justify-content: space-between;
  min-height: 58px;
  border-bottom: 1px solid var(--config-border-soft);
  padding: 10px 32px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 5px 16px rgba(15, 23, 42, 0.05);
}

.config-header__title {
  gap: 9px;
  font-size: 17px;
}

.config-header__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  border-radius: 7px;
  background: var(--config-blue-soft);
  color: var(--config-blue);
}

.config-header__icon svg,
.final-status svg,
.text-button svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.config-header__icon svg {
  width: 17px;
  height: 17px;
}

.config-header__actions {
  gap: 10px;
}

.config-content {
  width: min(1512px, calc(100% - 48px));
  margin: 0 auto;
  padding: 18px 0;
}

.config-intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 2px 0 14px;
}

h1 {
  margin: 0;
  font-size: 21px;
  line-height: 1.35;
}

.config-intro p {
  margin: 5px 0 0;
  color: var(--config-muted);
  font-size: 13px;
}

.scenario-count {
  border: 1px solid #bcd0f5;
  border-radius: 999px;
  padding: 5px 11px;
  background: #f8fbff;
  color: var(--config-blue);
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}

.filter-toolbar {
  gap: 12px;
  min-width: 0;
  border: 1px solid var(--config-border);
  border-radius: 8px;
  padding: 13px 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.035);
}

.filter-field {
  display: grid;
  flex: 0 1 150px;
  gap: 5px;
  min-width: 0;
}

.filter-field--ability {
  flex-basis: 220px;
}

.filter-field span,
.bulk-panel label span {
  color: var(--config-muted);
  font-size: 12px;
  font-weight: 750;
}

.filter-field small {
  overflow: hidden;
  color: var(--config-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

select,
.note-input {
  height: 32px;
  border: 1px solid var(--config-border);
  border-radius: 6px;
  padding: 0 9px;
  background: #fff;
  color: var(--config-text);
  font-size: 12px;
}

.filter-toolbar__actions {
  gap: 8px;
  margin-left: auto;
  padding-top: 16px;
}

.text-button,
.secondary-button,
.outline-button,
.primary-button {
  min-height: 32px;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 750;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.text-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--config-muted);
}

.text-button:hover {
  color: var(--config-blue);
}

.text-button svg {
  width: 15px;
  height: 15px;
}

.secondary-button {
  border: 1px solid var(--config-border);
  background: #fff;
  color: var(--config-text);
}

.outline-button {
  border: 1px solid #b8cef7;
  background: #f8fbff;
  color: var(--config-blue);
}

.primary-button {
  border: 1px solid var(--config-blue);
  background: var(--config-blue);
  color: #fff;
}

.bulk-panel {
  gap: 12px;
  margin-top: 12px;
  border: 1px solid #bcd0f5;
  border-radius: 8px;
  padding: 10px 14px;
  background: #f8fbff;
}

.bulk-panel > div:first-child {
  display: grid;
  gap: 3px;
  margin-right: auto;
}

.bulk-panel strong {
  font-size: 13px;
}

.bulk-panel > div:first-child span {
  color: var(--config-muted);
  font-size: 11px;
}

.bulk-panel label {
  display: grid;
  gap: 4px;
}

.config-table-panel {
  overflow: hidden;
  margin-top: 12px;
  border: 1px solid var(--config-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.045);
}

.table-toolbar {
  justify-content: space-between;
  gap: 16px;
  min-height: 54px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--config-border-soft);
}

.table-toolbar > div:first-child {
  display: grid;
  gap: 3px;
}

.table-toolbar strong {
  font-size: 14px;
}

.table-toolbar span {
  color: var(--config-muted);
  font-size: 12px;
}

.table-toolbar__right {
  gap: 18px;
}

.view-toggle {
  overflow: hidden;
  border: 1px solid var(--config-border);
  border-radius: 6px;
}

.view-toggle button {
  min-height: 28px;
  border: 0;
  border-left: 1px solid var(--config-border);
  padding: 0 10px;
  background: #fff;
  color: var(--config-muted);
  font-size: 12px;
}

.view-toggle button:first-child {
  border-left: 0;
}

.view-toggle button.is-active {
  background: var(--config-blue-soft);
  color: var(--config-blue);
  font-weight: 750;
}

.status-legend {
  flex-wrap: wrap;
  gap: 11px;
}

.status-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-dot--standard {
  background: var(--config-green);
}

.status-dot--conditional {
  background: var(--config-orange);
}

.status-dot--unsupported {
  background: #aeb7c4;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
  table-layout: fixed;
}

th,
td {
  border-bottom: 1px solid var(--config-border-soft);
  padding: 8px 9px;
  color: var(--config-text);
  font-size: 12px;
  line-height: 1.35;
  text-align: left;
  white-space: nowrap;
}

th {
  background: #f8faff;
  color: #59677d;
  font-weight: 800;
}

th[colspan] {
  text-align: center;
}

th:nth-child(1),
td:nth-child(1) {
  width: 36px;
  text-align: center;
}

th:nth-child(2),
td:nth-child(2) {
  width: 46px;
  color: var(--config-muted);
}

th:nth-child(3),
td:nth-child(3) {
  width: 84px;
}

th:nth-child(4),
td:nth-child(4) {
  width: 106px;
}

th:nth-child(5),
td:nth-child(5) {
  width: 70px;
}

th:nth-child(6),
td:nth-child(6) {
  width: 106px;
}

th:nth-child(7),
td:nth-child(7),
th:nth-child(8),
td:nth-child(8),
th:nth-child(9),
td:nth-child(9) {
  width: 118px;
}

th:nth-child(10),
td:nth-child(10) {
  width: 132px;
}

th:nth-child(11),
td:nth-child(11) {
  width: 128px;
}

th:nth-child(12),
td:nth-child(12) {
  width: 58px;
  text-align: center;
}

tbody tr:hover {
  background: #fbfdff;
}

tbody tr.is-editing {
  background: #f7fbff;
}

input[type='checkbox'] {
  accent-color: var(--config-blue);
}

.status-select {
  width: 100%;
  min-width: 96px;
  height: 28px;
  border: 0;
  font-size: 11px;
  font-weight: 750;
}

.status-select--standard,
.final-status--standard {
  background: var(--config-green-bg);
  color: var(--config-green);
}

.status-select--conditional,
.final-status--conditional {
  background: var(--config-orange-bg);
  color: var(--config-orange);
}

.status-select--unsupported,
.final-status--unsupported {
  background: var(--config-gray-bg);
  color: var(--config-gray);
}

.final-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  padding: 4px 7px;
  font-size: 11px;
  font-weight: 800;
}

.final-status svg {
  width: 13px;
  height: 13px;
}

.note-input {
  width: 100%;
  height: 28px;
  background: transparent;
}

.row-edit-button {
  border: 0;
  background: transparent;
  color: var(--config-blue);
  font-size: 12px;
  font-weight: 750;
}

.table-footer {
  justify-content: flex-end;
  gap: 12px;
  min-height: 48px;
  padding: 8px 14px;
  color: var(--config-muted);
  font-size: 12px;
}

.pagination {
  gap: 4px;
}

.pagination button {
  min-width: 28px;
  height: 28px;
  border: 1px solid var(--config-border);
  border-radius: 5px;
  background: #fff;
  color: var(--config-muted);
  font-size: 12px;
}

.pagination button.is-active {
  border-color: var(--config-blue);
  background: var(--config-blue);
  color: #fff;
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.table-footer select {
  width: 92px;
  height: 28px;
}

.config-action-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  justify-content: space-between;
  min-height: 58px;
  border-top: 1px solid var(--config-border-soft);
  padding: 10px 32px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -8px 20px rgba(15, 23, 42, 0.07);
}

.config-action-bar > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--config-muted);
  font-size: 12px;
}

.config-action-bar > span i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--config-orange);
}

.config-action-bar > div {
  gap: 9px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 1080px) {
  .filter-toolbar {
    flex-wrap: wrap;
  }

  .filter-toolbar__actions {
    width: 100%;
    justify-content: flex-end;
    padding-top: 0;
  }
}

@media (max-width: 720px) {
  .config-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 9px;
    padding: 10px 16px;
  }

  .config-header__actions {
    width: 100%;
    overflow-x: auto;
  }

  .config-content {
    width: calc(100% - 24px);
    padding-top: 12px;
  }

  .config-intro {
    gap: 8px;
  }

  h1 {
    font-size: 18px;
  }

  .filter-field,
  .filter-field--ability {
    flex: 1 1 140px;
  }

  .bulk-panel,
  .table-toolbar,
  .table-toolbar__right {
    align-items: flex-start;
    flex-direction: column;
  }

  .bulk-panel {
    gap: 8px;
  }

  .table-toolbar {
    gap: 9px;
  }

  .table-toolbar__right {
    gap: 8px;
  }

  .config-action-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
  }
}
</style>
