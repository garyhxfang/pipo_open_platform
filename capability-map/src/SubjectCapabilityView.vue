<script setup lang="ts">
import { computed, ref } from 'vue'
import { supportStatusLabel, type SupportStatus } from './capabilityData'
import {
  acquiringProductCodes as productCodes,
  productModeLabels,
  setSubjectCapabilityStatus,
  subjectCapabilityStatus
} from './subjectCapabilityStore'
import type {
  CapabilityConfigPayloadV4,
  CapabilityFeatureId,
  CapabilityMetadata
} from './configTypes'

const props = defineProps<{
  capabilityConfig: CapabilityConfigPayloadV4
}>()

const view = ref<'list' | 'editor'>('list')
const selectedProductCode = ref(productCodes[0].code)
const listSearch = ref('')
const countryFilter = ref('All')
const capabilitySearch = ref('')
const capabilityTypeFilter = ref('All')
const supportFilter = ref<'All' | SupportStatus>('All')

const selectedProduct = computed(() =>
  productCodes.find((item) => item.code === selectedProductCode.value) ?? productCodes[0]
)

const subjectDependentTypes = computed(() =>
  props.capabilityConfig.capabilityTypes.filter((type) => type.marketDependency !== 'none')
)

const subjectDependentTypeIds = computed(() =>
  new Set(subjectDependentTypes.value.map((type) => type.id))
)

const subjectDependentCapabilities = computed(() => {
  const typeOrder = new Map(subjectDependentTypes.value.map((type, index) => [type.id, index]))
  return props.capabilityConfig.capabilities
    .filter((capability) => subjectDependentTypeIds.value.has(capability.groupId))
    .sort((left, right) => (typeOrder.get(left.groupId) ?? 0) - (typeOrder.get(right.groupId) ?? 0))
})

const filteredProductCodes = computed(() => {
  const keyword = listSearch.value.trim().toLowerCase()
  return productCodes.filter((item) => {
    const matchesKeyword =
      !keyword ||
      `${item.code}${item.productName}${item.entityName}${item.entityCode}${item.country}${productModeLabels[item.mode]}`
        .toLowerCase()
        .includes(keyword)
    return matchesKeyword && (countryFilter.value === 'All' || item.country === countryFilter.value)
  })
})

const filteredCapabilities = computed(() => {
  const keyword = capabilitySearch.value.trim().toLowerCase()
  return subjectDependentCapabilities.value.filter((capability) => {
    const typeName = capabilityTypeName(capability)
    const status = statusFor(selectedProductCode.value, capability.id)
    const matchesKeyword = !keyword || `${capability.name}${capability.id}${typeName}`.toLowerCase().includes(keyword)
    const matchesType = capabilityTypeFilter.value === 'All' || capability.groupId === capabilityTypeFilter.value
    const matchesStatus = supportFilter.value === 'All' || status === supportFilter.value
    return matchesKeyword && matchesType && matchesStatus
  })
})

const configuredCapabilityCount = computed(() =>
  subjectDependentCapabilities.value.filter(
    (capability) => statusFor(selectedProductCode.value, capability.id) !== 'unsupported'
  ).length
)

const countryOptions = [...new Set(productCodes.map((item) => item.country))]
const statusOptions: SupportStatus[] = ['standard', 'conditional', 'unsupported']

function configuredCount(productCode: string) {
  return subjectDependentCapabilities.value.filter(
    (capability) => statusFor(productCode, capability.id) !== 'unsupported'
  ).length
}

function typeCapabilityCount(typeId: string) {
  return typeId === 'All'
    ? subjectDependentCapabilities.value.length
    : subjectDependentCapabilities.value.filter((capability) => capability.groupId === typeId).length
}

function typeSupportedCount(typeId: string) {
  return subjectDependentCapabilities.value.filter(
    (capability) =>
      (typeId === 'All' || capability.groupId === typeId) &&
      statusFor(selectedProductCode.value, capability.id) !== 'unsupported'
  ).length
}

function statusFor(productCode: string, capabilityId: CapabilityFeatureId): SupportStatus {
  return subjectCapabilityStatus(productCode, capabilityId)
}

function setStatus(capabilityId: CapabilityFeatureId, status: SupportStatus) {
  setSubjectCapabilityStatus(selectedProductCode.value, capabilityId, status)
}

function capabilityTypeName(capability: CapabilityMetadata) {
  return props.capabilityConfig.capabilityTypes.find((type) => type.id === capability.groupId)?.name ?? capability.groupName
}

function openProduct(productCode: string) {
  selectedProductCode.value = productCode
  capabilitySearch.value = ''
  capabilityTypeFilter.value = 'All'
  supportFilter.value = 'All'
  view.value = 'editor'
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
}

function returnToList() {
  view.value = 'list'
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
}

</script>

<template>
  <main class="subject-page">
    <header class="subject-topbar">
      <div class="subject-title">
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 20V7l7-3 7 3v13M9 10h2M13 10h2M9 14h2M13 14h2M9 18h6"/></svg>
        </span>
        <div>
          <h1>主体能力管理</h1>
          <p>维护收单主体下各产品码可支持的产品能力。</p>
        </div>
      </div>
      <span class="subject-count">{{ productCodes.length }} 个收单产品码</span>
    </header>

    <template v-if="view === 'list'">
      <section class="subject-list-heading">
        <div>
          <span>收单主体与产品码</span>
          <h2>产品码列表</h2>
        </div>
      </section>

      <section class="subject-panel">
        <div class="subject-toolbar">
          <label class="subject-search">
            <span>搜索</span>
            <input v-model="listSearch" type="search" placeholder="搜索产品码或收单主体" />
          </label>
          <label>
            <span>主体国家/地区</span>
            <select v-model="countryFilter">
              <option value="All">全部国家/地区</option>
              <option v-for="country in countryOptions" :key="country" :value="country">{{ country }}</option>
            </select>
          </label>
          <span class="subject-result">{{ filteredProductCodes.length }} 条结果</span>
        </div>

        <div v-if="filteredProductCodes.length" class="subject-table-scroll">
          <table class="subject-table">
            <thead>
              <tr>
                <th>收单产品码</th>
                <th>产品名称</th>
                <th>收单主体</th>
                <th>主体国家/地区</th>
                <th>产品模式</th>
                <th>已支持能力</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in filteredProductCodes" :key="product.code">
                <td>
                  <div class="product-code-cell">
                    <strong>{{ product.code }}</strong>
                    <small>{{ productModeLabels[product.mode] }}产品码</small>
                  </div>
                </td>
                <td>
                  <div class="product-name-cell">
                    <strong :title="product.productName">{{ product.productName }}</strong>
                  </div>
                </td>
                <td>
                  <div class="entity-cell">
                    <strong>{{ product.entityName }}</strong>
                    <code>{{ product.entityCode }}</code>
                  </div>
                </td>
                <td><span class="country-pill">{{ product.country }}</span></td>
                <td><span class="mode-pill" :class="`is-${product.mode}`">{{ productModeLabels[product.mode] }}</span></td>
                <td><strong class="configured-count">{{ configuredCount(product.code) }}</strong><span class="total-count"> / {{ subjectDependentCapabilities.length }}</span></td>
                <td><button class="configure-subject-button" type="button" @click="openProduct(product.code)">配置能力</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer v-if="filteredProductCodes.length" class="product-list-footer">共 {{ filteredProductCodes.length }} 条</footer>
        <div v-else class="subject-empty">没有符合当前筛选条件的产品码。</div>
      </section>
    </template>

    <template v-else>
      <section class="subject-editor-heading">
        <button type="button" @click="returnToList">返回产品码列表</button>
        <div>
          <span>{{ selectedProduct.entityName }} · {{ selectedProduct.country }}</span>
          <h2>{{ selectedProduct.code }}</h2>
          <p>{{ productModeLabels[selectedProduct.mode] }}产品码</p>
        </div>
        <div class="editor-summary">
          <strong>{{ configuredCapabilityCount }}</strong>
          <span>项能力已支持</span>
        </div>
      </section>

      <section class="subject-type-options" aria-label="能力类型">
        <button
          type="button"
          :class="{ 'is-active': capabilityTypeFilter === 'All' }"
          :aria-pressed="capabilityTypeFilter === 'All'"
          @click="capabilityTypeFilter = 'All'"
        >
          <span>
            <strong>全部能力</strong>
            <small>{{ typeCapabilityCount('All') }} 项能力</small>
          </span>
          <em>{{ typeSupportedCount('All') }} 项已支持</em>
        </button>
        <button
          v-for="type in subjectDependentTypes"
          :key="type.id"
          type="button"
          :class="{ 'is-active': capabilityTypeFilter === type.id }"
          :aria-pressed="capabilityTypeFilter === type.id"
          @click="capabilityTypeFilter = type.id"
        >
          <span>
            <strong>{{ type.name }}</strong>
            <small>{{ typeCapabilityCount(type.id) }} 项能力</small>
          </span>
          <em>{{ typeSupportedCount(type.id) }} 项已支持</em>
        </button>
      </section>

      <section class="subject-panel">
        <div class="subject-toolbar capability-toolbar">
          <label class="subject-search">
            <span>搜索能力</span>
            <input v-model="capabilitySearch" type="search" placeholder="搜索能力名称或编码" />
          </label>
          <label>
            <span>支持情况</span>
            <select v-model="supportFilter">
              <option value="All">全部状态</option>
              <option v-for="status in statusOptions" :key="status" :value="status">{{ supportStatusLabel[status] }}</option>
            </select>
          </label>
          <span class="subject-result">{{ filteredCapabilities.length }} 项能力</span>
        </div>

        <div v-if="filteredCapabilities.length" class="subject-table-scroll">
          <table class="subject-table subject-capability-table">
            <thead>
              <tr>
                <th>能力类型</th>
                <th>能力</th>
                <th>能力编码</th>
                <th>产品码支持情况</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="capability in filteredCapabilities" :key="capability.id">
                <td><span class="ability-type-pill">{{ capabilityTypeName(capability) }}</span></td>
                <td><strong>{{ capability.name }}</strong></td>
                <td><code>{{ capability.id }}</code></td>
                <td>
                  <div class="support-options" role="group" :aria-label="`${capability.name}支持情况`">
                    <button
                      v-for="status in statusOptions"
                      :key="status"
                      type="button"
                      :class="[`is-${status}`, { 'is-active': statusFor(selectedProduct.code, capability.id) === status }]"
                      :aria-pressed="statusFor(selectedProduct.code, capability.id) === status"
                      @click="setStatus(capability.id, status)"
                    >
                      {{ supportStatusLabel[status] }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="subject-empty">没有符合当前筛选条件的收单主体依赖能力。</div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.subject-page{min-height:100vh;padding:0 32px 48px;background:#f5f7fb;color:#172033}.subject-topbar{display:flex;align-items:center;justify-content:space-between;min-height:72px;margin:0 -32px 22px;border-bottom:1px solid #e5eaf1;padding:12px 32px;background:#fff}.subject-title{display:flex;align-items:center;gap:11px}.subject-title>span{display:grid;width:32px;height:32px;place-items:center;border-radius:7px;background:#eef5ff;color:#1769e8}.subject-title svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.subject-title h1,.subject-title p,.subject-list-heading h2,.subject-editor-heading h2,.subject-editor-heading p{margin:0}.subject-title h1{font-size:18px}.subject-title p{margin-top:2px;color:#7a8799;font-size:10px}.subject-count{border:1px solid #dce5f2;border-radius:999px;padding:5px 10px;background:#f8faff;color:#5e6e85;font-size:10px;font-weight:750}.subject-list-heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:12px;padding:0 2px}.subject-list-heading span{color:#1769e8;font-size:10px;font-weight:800}.subject-list-heading h2{margin-top:3px;font-size:20px}.subject-panel{overflow:hidden;border:1px solid #dce3ed;border-radius:8px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.035)}.subject-toolbar{display:flex;align-items:end;gap:12px;border-bottom:1px solid #e8edf4;padding:12px 14px;background:#f8faff}.subject-toolbar label{display:grid;min-width:180px;gap:5px}.subject-toolbar label>span{color:#69788f;font-size:10px;font-weight:750}.subject-toolbar input,.subject-toolbar select{height:32px;border:1px solid #d4ddea;border-radius:6px;padding:0 9px;background:#fff;color:#172033;font-size:11px}.subject-toolbar .subject-search{width:min(380px,42vw)}.subject-result{margin-left:auto;padding-bottom:8px;color:#718096;font-size:10px;white-space:nowrap}.subject-table-scroll{overflow-x:auto}.subject-table{width:100%;min-width:1040px;border-collapse:collapse;table-layout:fixed}.subject-table th,.subject-table td{height:58px;border-bottom:1px solid #e8edf4;padding:9px 12px;font-size:11px;text-align:left;vertical-align:middle}.subject-table th{height:38px;background:#f7f9fc;color:#5d6b80;font-size:10px;font-weight:800;white-space:nowrap}.subject-table th:nth-child(1){width:25%}.subject-table th:nth-child(2){width:10%}.subject-table th:nth-child(3){width:18%}.subject-table th:nth-child(4){width:12%}.subject-table th:nth-child(5){width:12%}.subject-table th:nth-child(6){width:12%}.subject-table th:nth-child(7){width:11%}.subject-table tbody tr:hover{background:#fbfdff}.entity-cell{display:grid;gap:3px}.entity-cell strong{font-size:11px}.entity-cell code,.subject-table code{color:#6a778b;font-size:9px}.country-pill,.mode-pill,.ability-type-pill{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:9px;font-weight:750;white-space:nowrap}.country-pill{background:#eef4fd;color:#3f6fae}.mode-pill.is-instant{background:#eaf7ed;color:#238442}.mode-pill.is-escrow{background:#fff4df;color:#c57200}.configured-count{color:#1769e8;font-size:12px}.total-count{color:#8a96a6;font-size:10px}.configure-subject-button{min-height:29px;border:1px solid #a9c4f5;border-radius:5px;padding:0 10px;background:#f8fbff;color:#1769e8;font-size:10px;font-weight:750;white-space:nowrap}.configure-subject-button:hover{border-color:#1769e8;background:#eef5ff}.subject-empty{padding:52px 20px;color:#7d8999;font-size:11px;text-align:center}.subject-editor-heading{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:16px;margin-bottom:14px;border:1px solid #cedcf0;border-radius:8px;padding:14px 16px;background:linear-gradient(90deg,#fff,#f7faff)}.subject-editor-heading>button{min-height:31px;border:1px solid #d5deea;border-radius:6px;padding:0 11px;background:#fff;color:#4f5e73;font-size:10px;font-weight:750}.subject-editor-heading>div:nth-child(2){display:grid;gap:2px}.subject-editor-heading>div:nth-child(2)>span{color:#63738a;font-size:10px}.subject-editor-heading h2{font-size:18px}.subject-editor-heading p{color:#7c899b;font-size:10px}.editor-summary{display:grid;min-width:100px;text-align:right}.editor-summary strong{color:#1769e8;font-size:20px}.editor-summary span{color:#7a8799;font-size:9px}.capability-toolbar .subject-search{width:min(340px,36vw)}.subject-capability-table{min-width:900px}.subject-capability-table th:nth-child(1){width:19%}.subject-capability-table th:nth-child(2){width:24%}.subject-capability-table th:nth-child(3){width:27%}.subject-capability-table th:nth-child(4){width:30%}.ability-type-pill{background:#eef4fd;color:#456fa8}.support-options{display:flex;gap:5px}.support-options button{min-height:27px;border:1px solid transparent;border-radius:999px;padding:0 9px;background:#f1f4f7;color:#7a8797;font-size:9px;font-weight:750;white-space:nowrap}.support-options button.is-active.is-standard{border-color:#a9dcb4;background:#eaf7ed;color:#238442}.support-options button.is-active.is-conditional{border-color:#f5cd8e;background:#fff4df;color:#c57200}.support-options button.is-active.is-unsupported{border-color:#cad2dc;background:#edf1f5;color:#667386}
.subject-table:not(.subject-capability-table){min-width:1000px}.subject-table:not(.subject-capability-table) th:nth-child(1){width:11%}.subject-table:not(.subject-capability-table) th:nth-child(2){width:23%}.subject-table:not(.subject-capability-table) th:nth-child(3){width:8%}.subject-table:not(.subject-capability-table) th:nth-child(4){width:6%}.subject-table:not(.subject-capability-table) th:nth-child(5){width:7%}.subject-table:not(.subject-capability-table) th:nth-child(6){width:8%}.subject-table:not(.subject-capability-table) th:nth-child(7){width:14%}.subject-table:not(.subject-capability-table) th:nth-child(8){width:12%}.subject-table:not(.subject-capability-table) th:nth-child(9){width:11%}.product-code-cell,.product-name-cell{display:grid;gap:3px}.product-code-cell strong{color:#155fcb;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:0}.product-code-cell small,.product-name-cell small{color:#8a96a6;font-size:9px}.product-name-cell strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.listing-pill,.review-pill{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:9px;font-weight:750;white-space:nowrap}.listing-pill.is-online{background:#eaf7ed;color:#238442}.listing-pill.is-offline{background:#edf1f5;color:#687587}.listing-pill.is-pending{background:#fff4df;color:#c57200}.review-pill.is-enable{background:#eef5ff;color:#2e6fca}.review-pill.is-rejected{background:#fff0f0;color:#b44f4f}.review-pill.is-draft{background:#f1f3f6;color:#6d7888}.operator-name{color:#55657b;font-size:10px;white-space:nowrap}.product-list-footer{min-height:44px;border-top:1px solid #e8edf4;padding:14px;color:#718096;font-size:10px}
.subject-table:not(.subject-capability-table) th:nth-child(1){width:14%}.subject-table:not(.subject-capability-table) th:nth-child(2){width:27%}.subject-table:not(.subject-capability-table) th:nth-child(3){width:24%}.subject-table:not(.subject-capability-table) th:nth-child(4){width:9%}.subject-table:not(.subject-capability-table) th:nth-child(5){width:10%}.subject-table:not(.subject-capability-table) th:nth-child(6){width:8%}.subject-table:not(.subject-capability-table) th:nth-child(7){width:8%}.mode-pill.is-passthrough{background:#eef5ff;color:#2f6fc9}.mode-pill.is-other{background:#edf1f5;color:#687587}
.subject-type-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.subject-type-options button{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;min-height:62px;gap:10px;border:1px solid #d8e0eb;border-radius:7px;padding:10px 12px;background:#fff;color:#172033;text-align:left;box-shadow:0 4px 14px rgba(15,23,42,.025)}.subject-type-options button:hover{border-color:#a9c4f5;background:#fbfdff}.subject-type-options button:focus-visible{outline:2px solid #1769e8;outline-offset:2px}.subject-type-options button.is-active{border-color:#1769e8;background:#f3f7ff;box-shadow:inset 0 0 0 1px #1769e8}.subject-type-options button>span{display:grid;min-width:0;gap:4px}.subject-type-options strong{overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.subject-type-options small{color:#7b889a;font-size:9px}.subject-type-options em{border-radius:999px;padding:4px 7px;background:#f0f3f7;color:#68768a;font-size:9px;font-style:normal;font-weight:750;white-space:nowrap}.subject-type-options button.is-active em{background:#e2edff;color:#1769e8}
@media(max-width:900px){.subject-page{padding:0 20px 36px}.subject-topbar{margin:0 -20px 18px;padding:10px 20px}.subject-toolbar{align-items:stretch;flex-direction:column}.subject-toolbar label,.subject-toolbar .subject-search,.capability-toolbar .subject-search{width:100%;min-width:0}.subject-result{margin-left:0;padding-bottom:0}.subject-editor-heading{grid-template-columns:1fr}.editor-summary{text-align:left}.subject-type-options{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.subject-page{padding-right:12px;padding-left:12px}.subject-topbar{align-items:flex-start;margin-right:-12px;margin-left:-12px;padding-right:12px;padding-left:12px}.subject-count{display:none}.subject-title h1{font-size:16px}.subject-title p{max-width:220px}.subject-editor-heading{padding:12px}.subject-editor-heading>button{justify-self:start}.subject-type-options{grid-template-columns:1fr}.subject-type-options button{min-height:56px}}
</style>
