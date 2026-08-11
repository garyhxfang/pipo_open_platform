import type { MarketCode } from './capabilityData'

export const globalRecommendedPaymentMethodIds = [
  'visa',
  'mastercard',
  'apple-pay',
  'paypal',
  'google-pay',
  'alipay',
  'wechatpay',
  'amex',
  'discover'
] as const

export const recommendedPaymentMethodIdsByMarket: Record<MarketCode, readonly string[]> = {
  US: ['visa', 'mastercard', 'apple-pay', 'paypal', 'google-pay', 'amex', 'discover'],
  BR: ['pix', 'boleto', 'visa', 'mastercard', 'elo', 'hipercard', 'google-pay', 'mercadopago', 'paypal'],
  ID: ['qris', 'dana', 'gopay', 'ovo', 'banktransfer', 'alfamart', 'indomaret', 'visa', 'mastercard'],
  TH: ['promptpay', 'truemoney', 'rabbitlinepay', 'kbank', 'scb', 'bay', 'ktb', 'visa', 'mastercard'],
  MY: ['fpx', 'duitnowqr', 'touchngo', 'boost', 'grabpay', 'visa', 'mastercard', 'apple-pay', 'google-pay'],
  SG: ['visa', 'mastercard', 'apple-pay', 'google-pay', 'alipay-plus', 'paypal', 'amex'],
  PH: ['gcash', 'paymaya', 'bdo', 'bpi', 'unionbank-ph', 'convenience-stores-ph', 'seveneleven', 'otc', 'visa', 'mastercard'],
  JP: ['visa', 'mastercard', 'jcb', 'apple-pay', 'google-pay', 'seveneleven', 'familymart', 'lawson', 'linepay'],
  KR: ['kakaopay', 'naverpay', 'tosspay', 'payco', 'visa', 'mastercard', 'alipay-plus'],
  GB: ['visa', 'mastercard', 'apple-pay', 'google-pay', 'paypal', 'amex'],
  HK: ['visa', 'mastercard', 'alipayhk', 'alipay', 'wechatpay', 'paypal', 'amex'],
  CL: ['visa', 'mastercard', 'mercadopago', 'paypal', 'amex'],
  MX: ['oxxo', 'spei', 'visa', 'mastercard', 'mercadopago', 'paypal'],
  VN: ['momo', 'zalopay', 'visa', 'mastercard', 'paypal', 'wechatpay'],
  CN: ['personal-internet-banking-cn', 'corporate-internet-banking-cn', 'alipay', 'wechatpay', 'unionpay', 'visa', 'mastercard', 'payoneer'],
  CO: ['efecty', 'visa', 'mastercard', 'paypal', 'amex']
}
