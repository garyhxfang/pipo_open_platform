import type {
  PaymentAbilityId,
  PaymentMethodType,
  ProductType
} from './capabilityData'

const localOpenPlatformOrigin = 'http://localhost:5175/'

function normalizedBaseUrl(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

export function documentationUrl(path: string) {
  const normalizedPath = path.replace(/^\/+/, '')
  const configuredBase = import.meta.env.VITE_DOCS_BASE_URL as string | undefined

  if (configuredBase) {
    return new URL(normalizedPath, normalizedBaseUrl(configuredBase)).toString()
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return new URL(normalizedPath, localOpenPlatformOrigin).toString()
  }

  const applicationBase = normalizedBaseUrl(import.meta.env.BASE_URL)
  const repositoryBase = applicationBase.replace(/capability-map\/?$/, '')
  return new URL(normalizedPath, `${window.location.origin}${repositoryBase}open-platform/`).toString()
}

function wikiDocument(nodeToken: string) {
  return `docs/?node=${encodeURIComponent(nodeToken)}`
}

const subscriptionPricingAbilityIds = new Set<PaymentAbilityId>([
  'regularPricing',
  'trialPeriod',
  'discountPeriod'
])

const subscriptionRenewalAbilityIds = new Set<PaymentAbilityId>([
  'gracePeriod',
  'retentionPeriod',
  'primaryPiCharge',
  'primaryBackupPiPolling'
])

const subscriptionUpgradeAbilityIds = new Set<PaymentAbilityId>([
  'upgradeRefundRemainingBenefits',
  'upgradeOffsetNewSubscription',
  'upgradeProratedPriceDifference',
  'downgradeOnRenewal'
])

const subscriptionPlanAbilityIds = new Set<PaymentAbilityId>([
  'cancelSubscription',
  'resumeSubscription',
  'terminateSubscription'
])

const subscriptionInitialPaymentAbilityIds = new Set<PaymentAbilityId>([
  'subscriptionCashierRecovery',
  'subscriptionReopenCashier',
  'subscriptionBackupMethodRetry'
])

const agreementAbilityIds = new Set<PaymentAbilityId>([
  'standaloneAgreement',
  'payAndAgreement',
  'agreementCashierRecovery',
  'agreementReopenCashier',
  'agreementBackupMethodRetry',
  'deductionBackupMethodRetry',
  'intelligentRetry'
])

const combinedPaymentAbilityIds = new Set<PaymentAbilityId>([
  'creditPlusX',
  'ttpayPlusX',
  'ttplPlusX'
])

export function productDocumentationPath(product: ProductType) {
  if (product === 'subscription') return wikiDocument('ENJXwOtiMifyFkkBD0gcxwMBnVb')
  if (product === 'agreementDeduction') return wikiDocument('YEOkwDQ6Si9qKEkGwPAcS5hmnGf')
  return wikiDocument('KjxsweJwZiwaj6kgg4pcXR19nee')
}

export function paymentAbilityDocumentationPath(abilityId: PaymentAbilityId) {
  if (subscriptionPricingAbilityIds.has(abilityId)) return wikiDocument('ArGuw6tP5ikBkbkezYWcdCTfnIh')
  if (subscriptionRenewalAbilityIds.has(abilityId)) return wikiDocument('OX7UwxQnriczViklSoncz15ynLf')
  if (subscriptionUpgradeAbilityIds.has(abilityId)) return wikiDocument('XKWxwl8zai2c3UkIUoScxZNGneu')
  if (subscriptionPlanAbilityIds.has(abilityId)) return wikiDocument('VUbnwy5cSiVK3zkMzAscIM7mnGh')
  if (subscriptionInitialPaymentAbilityIds.has(abilityId)) return wikiDocument('EdCIww6QViCgcbkAFtFclzRSngb')
  if (agreementAbilityIds.has(abilityId)) {
    return wikiDocument(
      abilityId === 'standaloneAgreement' || abilityId === 'payAndAgreement'
        ? 'NNEywEV5WiuuJ6kgg4pcXR19nee'
        : 'MV77wWWImiTtUwkdzn5cUwHunzh'
    )
  }
  if (combinedPaymentAbilityIds.has(abilityId)) return wikiDocument('E2VkwDpz8icLIokn3gFcJ15znJf')
  if (abilityId === 'standaloneBinding' || abilityId === 'payAndBind') {
    return wikiDocument('IE75wpXjliqzA8kGVfIcDI6onbc')
  }
  if (abilityId === 'preAuthMultiple' || abilityId === 'partialPreAuth') {
    return wikiDocument('ULwjw5oKAiD75hkykzRcN3V0nZd')
  }
  return wikiDocument('JUufwIhYhihRxHk50JCcHhnunUe')
}

export function paymentMethodDocumentationPath(_type?: PaymentMethodType) {
  return wikiDocument('Tv1RwYPPoitP6Tk4Vhfcch8ynrd')
}

export function valueAddedDocumentationPath(capabilityId: string) {
  if (capabilityId === 'fx') return wikiDocument('QPMTwoop8inRjIkuTWFclZ4Nnic')
  return wikiDocument('KjxsweJwZiwaj6kgg4pcXR19nee')
}
