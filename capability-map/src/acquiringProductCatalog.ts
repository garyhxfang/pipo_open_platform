import type { MarketCode, MerchantType } from './capabilityData'

export interface AcquiringProductCatalogItem {
  code: string
  name: string
  country: MarketCode
  merchantType: MerchantType
}

export const acquiringProductCatalog: AcquiringProductCatalogItem[] = [
  { code: 'AQ833462', name: 'US自营即时到账收单产品', country: 'US', merchantType: 'standardMerchant' },
  { code: 'AQ598079', name: 'US多渠道托管即时到账收单产品', country: 'US', merchantType: 'platformMerchant' },
  { code: 'AQ105046', name: 'US多渠道托管担保交易收单产品', country: 'US', merchantType: 'platformMerchant' },
  { code: 'AQ843086', name: 'US托管支付转接收单产品', country: 'US', merchantType: 'platformMerchant' },
  { code: 'AQ198401', name: 'BR自营即时到账收单产品', country: 'BR', merchantType: 'standardMerchant' },
  { code: 'AQ051485', name: 'BR自营担保交易收单产品', country: 'BR', merchantType: 'standardMerchant' },
  { code: 'AQ323476', name: 'ID自营即时到账收单产品', country: 'ID', merchantType: 'standardMerchant' },
  { code: 'AQ970273', name: 'MY自营担保交易收单产品', country: 'MY', merchantType: 'standardMerchant' },
  { code: 'AQ430687', name: 'MY自营即时到账收单产品', country: 'MY', merchantType: 'standardMerchant' },
  { code: 'AQ659417', name: 'SG自营担保交易收单产品', country: 'SG', merchantType: 'standardMerchant' },
  { code: 'AQ514788', name: 'SG自营即时到账收单产品', country: 'SG', merchantType: 'standardMerchant' },
  { code: 'AQ070812', name: 'SG托管单渠道即时到账收单产品', country: 'SG', merchantType: 'platformMerchant' },
  { code: 'AQ121834', name: 'SG多渠道托管担保交易收单产品', country: 'SG', merchantType: 'platformMerchant' },
  { code: 'AQ602632', name: 'SG多渠道托管即时到账收单产品', country: 'SG', merchantType: 'platformMerchant' },
  { code: 'AQ553182', name: 'SG托管担保交易收单产品', country: 'SG', merchantType: 'platformMerchant' },
  { code: 'AQ264250', name: 'SG托管支付转接收单产品', country: 'SG', merchantType: 'platformMerchant' },
  { code: 'AQ559589', name: 'PH自营担保交易收单产品', country: 'PH', merchantType: 'standardMerchant' },
  { code: 'AQ617798', name: 'PH自营即时到账收单产品', country: 'PH', merchantType: 'standardMerchant' },
  { code: 'AQ771336', name: 'JP自营担保交易收单产品', country: 'JP', merchantType: 'standardMerchant' },
  { code: 'AQ787787', name: 'JP自营即时到账收单产品', country: 'JP', merchantType: 'standardMerchant' },
  { code: 'AQ669747', name: 'UK单渠道托管即时到账收单产品', country: 'GB', merchantType: 'platformMerchant' },
  { code: 'AQ179494', name: 'UK托管支付转接收单产品', country: 'GB', merchantType: 'platformMerchant' },
  { code: 'AQ433168', name: 'UK托管担保交易收单产品', country: 'GB', merchantType: 'platformMerchant' }
]
