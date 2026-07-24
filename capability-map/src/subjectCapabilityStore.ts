import { ref, watch } from 'vue'
import type { SupportStatus } from './capabilityData'
import type { CapabilityFeatureId } from './configTypes'

export type ProductMode = 'instant' | 'escrow' | 'passthrough' | 'other'
export type SubjectAssignmentMap = Record<string, Partial<Record<CapabilityFeatureId, SupportStatus>>>

export interface AcquiringProductCode {
  code: string
  productName: string
  entityName: string
  entityCode: string
  country: string
  mode: ProductMode
}

const STORAGE_KEY = 'capability-map-subject-assignments-v1'

export const productModeLabels: Record<ProductMode, string> = {
  instant: '即时到账',
  escrow: '担保交易',
  passthrough: '支付转接',
  other: '其他'
}

const entityByCountry: Record<string, { name: string; code: string }> = {
  EU: { name: 'PIPO Europe Ltd.', code: 'PIPO_EU' },
  PH: { name: 'PIPO Philippines Inc.', code: 'PIPO_PH' },
  VN: { name: 'PIPO Vietnam Technology', code: 'PIPO_VN' },
  MY: { name: 'PIPO Malaysia Sdn. Bhd.', code: 'PIPO_MY' },
  HK: { name: 'PIPO Hong Kong Limited', code: 'PIPO_HK' },
  SG: { name: 'PIPO Singapore Pte. Ltd.', code: 'PIPO_SG' },
  JP: { name: 'PIPO Japan K.K.', code: 'PIPO_JP' },
  BR: { name: 'PIPO Brasil Pagamentos Ltda.', code: 'PIPO_BR' },
  MX: { name: 'PIPO Mexico S. de R.L.', code: 'PIPO_MX' },
  ID: { name: 'PIPO Indonesia Technology', code: 'PIPO_ID' },
  UK: { name: 'PIPO UK Limited', code: 'PIPO_UK' },
  US: { name: 'PIPO US Inc.', code: 'PIPO_US' }
}

export const acquiringProductCodes: AcquiringProductCode[] = [
  productCode('AQ476571', 'EU单渠道托管担保交易收单产品'),
  productCode('AQ559589', 'PH自营担保交易收单产品'),
  productCode('AQ334046', 'VN自营担保交易收单产品'),
  productCode('AQ970273', 'MY自营担保交易收单产品码'),
  productCode('AQ958713', 'HK自营担保交易收单产品'),
  productCode('AQ070812', 'SG托管单渠道即时到账收单产品'),
  productCode('AQ522486', 'EU单渠道托管即时到账收单产品'),
  productCode('AQ323476', 'ID自营即时到账收单产品'),
  productCode('AQ121834', 'SG多渠道托管担保交易收单产品'),
  productCode('AQ771336', 'JP自营担保交易收单产品'),
  productCode('AQ198401', 'BR自营即时到账收单产品'),
  productCode('AQ659417', 'SG自营担保交易收单产品'),
  productCode('AQ051485', 'BR自营担保交易收单产品'),
  productCode('AQ908139', 'MX单渠道托管即时到账收单产品'),
  productCode('AQ188564', 'MX自营即时到账收单产品'),
  productCode('AQ610336', 'MX自营担保交易收单产品'),
  productCode('AQ787787', 'JP自营即时到账收单产品'),
  productCode('AQ669747', 'UK单渠道托管即时到账收单产品'),
  productCode('AQ598079', 'US多渠道托管即时到账收单产品'),
  productCode('AQ336007', 'VN自营即时到账收单产品'),
  productCode('AQ602632', 'SG多渠道托管即时到账收单产品'),
  productCode('AQ105046', 'US多渠道托管担保交易收单产品'),
  productCode('AQ179494', 'UK托管支付转接收单产品'),
  productCode('AQ202200', 'HK多渠道托管即时到账收单产品'),
  productCode('AQ617798', 'PH自营即时到账收单产品'),
  productCode('AQ430687', 'MY自营即时到账收单产品'),
  productCode('AQ514788', 'SG自营即时到账收单产品'),
  productCode('AQ571682', 'HK自营即时到账收单产品'),
  productCode('AQ553182', 'SG托管担保交易收单产品'),
  productCode('AQ433168', 'UK托管担保交易收单产品'),
  productCode('AQ745126', 'ID自营担保交易收单产品'),
  productCode('AQ843086', 'US托管支付转接收单产品'),
  productCode('AQ549273', 'US单渠道托管即时到账收单产品'),
  productCode('AQ239660', 'HK托管担保交易收单产品'),
  productCode('AQ348274', 'HK托管多渠道担保交易收单产品'),
  productCode('AQ264250', 'SG托管支付转接收单产品'),
  productCode('AQ867799', 'HK多渠道托管担保交易收单产品'),
  productCode('AQ679948', 'EU自营即时到账收单产品'),
  productCode('AQ833462', 'US自营即时到账收单产品')
]

export const subjectAssignments = ref<SubjectAssignmentMap>(loadAssignments())

export function subjectCapabilityStatus(productCode: string, capabilityId: CapabilityFeatureId): SupportStatus {
  return subjectAssignments.value[productCode]?.[capabilityId] ?? 'unsupported'
}

export function setSubjectCapabilityStatus(
  productCode: string,
  capabilityId: CapabilityFeatureId,
  status: SupportStatus
) {
  subjectAssignments.value[productCode] = {
    ...subjectAssignments.value[productCode],
    [capabilityId]: status
  }
}

function productCode(code: string, productName: string): AcquiringProductCode {
  const country = Object.keys(entityByCountry).find((item) => productName.startsWith(item)) ?? '未关联'
  const entity = entityByCountry[country] ?? { name: '未关联收单主体', code: 'UNASSIGNED' }
  const mode: ProductMode = productName.includes('担保交易')
    ? 'escrow'
    : productName.includes('即时到账')
      ? 'instant'
      : productName.includes('支付转接')
        ? 'passthrough'
        : 'other'
  return {
    code,
    productName,
    entityName: entity.name,
    entityCode: entity.code,
    country,
    mode
  }
}

function defaultAssignments(): SubjectAssignmentMap {
  return {
    AQ070812: {
      'paymentMethod:visa': 'standard',
      'paymentMethod:mastercard': 'standard',
      'paymentMethod:apple-pay': 'standard',
      'pricingCurrency:SGD': 'standard',
      'pricingCurrency:USD': 'standard',
      currencyExchange: 'standard'
    },
    AQ121834: {
      'paymentMethod:visa': 'standard',
      'paymentMethod:mastercard': 'standard',
      'pricingCurrency:SGD': 'standard',
      'pricingCurrency:USD': 'conditional',
      currencyExchange: 'conditional'
    },
    AQ198401: {
      'paymentMethod:visa': 'standard',
      'paymentMethod:mastercard': 'standard',
      'paymentMethod:pix': 'standard',
      'pricingCurrency:BRL': 'standard',
      userFee: 'conditional'
    },
    AQ051485: {
      'paymentMethod:visa': 'conditional',
      'paymentMethod:pix': 'standard',
      'pricingCurrency:BRL': 'standard'
    },
    AQ323476: {
      'paymentMethod:visa': 'standard',
      'paymentMethod:gopay': 'standard',
      'pricingCurrency:IDR': 'standard',
      marketing: 'conditional'
    },
    AQ745126: {
      'paymentMethod:visa': 'standard',
      'pricingCurrency:IDR': 'standard'
    },
    AQ669747: {
      'paymentMethod:visa': 'standard',
      'paymentMethod:mastercard': 'standard',
      'paymentMethod:paypal': 'standard',
      'pricingCurrency:GBP': 'standard',
      currencyExchange: 'standard'
    },
    AQ433168: {
      'paymentMethod:visa': 'standard',
      'paymentMethod:mastercard': 'standard',
      'pricingCurrency:GBP': 'standard'
    }
  }
}

function loadAssignments(): SubjectAssignmentMap {
  const defaults = defaultAssignments()
  if (typeof window === 'undefined') return defaults
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return defaults
  try {
    return {
      ...defaults,
      ...JSON.parse(stored) as SubjectAssignmentMap
    }
  } catch {
    return defaults
  }
}

watch(
  subjectAssignments,
  (value) => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true }
)
