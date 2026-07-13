export type PrimaryProductCategory = 'withdrawal' | 'disbursement'

export type SecondaryProductCategory =
  | 'primaryMerchantWithdrawal'
  | 'subMerchantWithdrawal'
  | 'userWithdrawal'
  | 'singleDisbursement'
  | 'batchDisbursement'

export interface PayoutFieldOption {
  id: string
  label: string
  description: string
}

export interface PayoutField {
  id: string
  label: string
  description: string
  core: boolean
  hideWhenEmpty?: boolean
  options: PayoutFieldOption[]
}

export interface PayoutProductDefinition {
  id: SecondaryProductCategory
  primary: PrimaryProductCategory
  label: string
}

export interface PayoutConfigState {
  schemaVersion: 6
  fields: PayoutField[]
  records: PayoutCapabilityRecord[]
}

export interface PayoutCapabilityRecord {
  id: string
  product: SecondaryProductCategory
  name: string
  values: Record<string, string>
}

export const payoutPrimaryOptions: Array<{ value: PrimaryProductCategory; label: string }> = [
  { value: 'withdrawal', label: '提现' },
  { value: 'disbursement', label: '代发' }
]

export const payoutProductOptions: PayoutProductDefinition[] = [
  { id: 'primaryMerchantWithdrawal', primary: 'withdrawal', label: '一级商户提现' },
  { id: 'subMerchantWithdrawal', primary: 'withdrawal', label: '二级商户提现' },
  { id: 'userWithdrawal', primary: 'withdrawal', label: '用户提现' },
  { id: 'singleDisbursement', primary: 'disbursement', label: '单笔代发' },
  { id: 'batchDisbursement', primary: 'disbursement', label: '批量代发' }
]

export const defaultPayoutFields: PayoutField[] = [
  {
    id: 'payeeUserType',
    label: '收款用户类型',
    description: '配置当前产品适用的收款用户角色',
    core: true,
    options: [
      { id: 'bUser', label: 'B端用户', description: '商户、平台下二级商户或业务合作方' },
      { id: 'cUser', label: 'C端用户', description: '商户所属用户、创作者或个人收款方' }
    ]
  },
  {
    id: 'initiationMethod',
    label: '支持发起方式',
    description: '配置出款指令的创建方式',
    core: true,
    options: [
      { id: 'initiation-auto', label: '系统自动发起', description: '业务系统根据规则自动创建出款' },
      { id: 'initiation-manual', label: '用户手动发起', description: '用户通过业务页面手动创建出款' },
      { id: 'initiation-file', label: 'Dashboard 上传文件', description: '通过 Dashboard 上传批量出款文件' }
    ]
  },
  {
    id: 'integrationForm',
    label: '接入形态',
    description: '配置产品提供的页面或规则接入形态',
    core: true,
    options: [
      { id: 'integration-sky', label: 'Sky 规则配置', description: '维护自动提现规则，由系统按规则发起' },
      { id: 'integration-dashboard', label: 'Dashboard', description: '通过 PIPO Dashboard 页面或文件操作' },
      { id: 'integration-bind-cashier', label: '独立绑卡收银台+接口提现', description: '通过独立绑卡收银台完成收款账户绑定，并由接口发起提现' },
      { id: 'integration-withdrawal-cashier', label: '独立提现收银台', description: '通过独立提现收银台完成手动提现' },
      { id: 'integration-dropin-cashier', label: 'Drop-in 提现收银台', description: '嵌入业务页面的提现收银台' }
    ]
  },
  {
    id: 'supportedClient',
    label: '支持的端',
    description: '配置产品可以使用的终端',
    core: true,
    hideWhenEmpty: true,
    options: [
      { id: 'client-pc', label: 'PC', description: '支持桌面网页端操作' },
      { id: 'client-app', label: 'APP', description: '支持移动应用端操作' }
    ]
  },
  {
    id: 'assetType',
    label: '支持的资产类型',
    description: '配置产品可以出款的资产类型',
    core: true,
    options: [
      { id: 'asset-cash', label: '现金', description: '支持现金类资金出款' },
      { id: 'asset-airtime', label: '话费', description: '支持充值话费类资产' },
      { id: 'asset-gift-card', label: '礼品卡', description: '支持礼品卡类资产' }
    ]
  }
]

function selections(...entries: Array<[string, string[]]>) {
  return Object.fromEntries(entries)
}

export const defaultPayoutSelections: Record<SecondaryProductCategory, Record<string, string[]>> = {
  primaryMerchantWithdrawal: selections(
    ['payeeUserType', ['bUser']],
    ['initiationMethod', ['initiation-auto', 'initiation-manual']],
    ['integrationForm', ['integration-sky', 'integration-dashboard']],
    ['supportedClient', []],
    ['assetType', ['asset-cash']]
  ),
  subMerchantWithdrawal: selections(
    ['payeeUserType', ['bUser']],
    ['initiationMethod', ['initiation-auto', 'initiation-manual']],
    ['integrationForm', ['integration-bind-cashier', 'integration-withdrawal-cashier']],
    ['supportedClient', ['client-pc', 'client-app']],
    ['assetType', ['asset-cash']]
  ),
  userWithdrawal: selections(
    ['payeeUserType', ['cUser']],
    ['initiationMethod', ['initiation-auto', 'initiation-manual']],
    ['integrationForm', ['integration-bind-cashier', 'integration-withdrawal-cashier']],
    ['supportedClient', ['client-app']],
    ['assetType', ['asset-cash']]
  ),
  singleDisbursement: selections(
    ['payeeUserType', ['bUser', 'cUser']],
    ['initiationMethod', ['initiation-auto', 'initiation-manual']],
    [
      'integrationForm',
      ['integration-bind-cashier', 'integration-withdrawal-cashier', 'integration-dropin-cashier']
    ],
    ['supportedClient', ['client-app']],
    ['assetType', ['asset-cash', 'asset-airtime', 'asset-gift-card']]
  ),
  batchDisbursement: selections(
    ['payeeUserType', ['bUser', 'cUser']],
    ['initiationMethod', ['initiation-auto', 'initiation-file']],
    ['integrationForm', ['integration-bind-cashier', 'integration-dashboard']],
    ['supportedClient', ['client-app']],
    ['assetType', ['asset-cash']]
  )
}

const storageKey = 'capability-map-payout-config'

export function createDefaultPayoutConfig(): PayoutConfigState {
  return {
    schemaVersion: 6,
    fields: structuredClone(defaultPayoutFields),
    records: createDefaultRecords()
  }
}

function createRecord(
  product: SecondaryProductCategory,
  index: number,
  payeeUserType: string,
  initiationMethod: string,
  integrationForm: string,
  supportedClient: string,
  assetType: string
): PayoutCapabilityRecord {
  return {
    id: `default-${product}-${index}`,
    product,
    name: `${payoutProductOptions.find((item) => item.id === product)?.label ?? product}默认配置 ${index}`,
    values: { payeeUserType, initiationMethod, integrationForm, supportedClient, assetType }
  }
}

function createDefaultRecords(): PayoutCapabilityRecord[] {
  return [
    createRecord('primaryMerchantWithdrawal', 1, 'bUser', 'initiation-auto', 'integration-sky', '', 'asset-cash'),
    createRecord('primaryMerchantWithdrawal', 2, 'bUser', 'initiation-manual', 'integration-dashboard', '', 'asset-cash'),
    createRecord('subMerchantWithdrawal', 1, 'bUser', 'initiation-auto', 'integration-bind-cashier', 'client-pc', 'asset-cash'),
    createRecord('subMerchantWithdrawal', 2, 'bUser', 'initiation-auto', 'integration-bind-cashier', 'client-app', 'asset-cash'),
    createRecord('subMerchantWithdrawal', 3, 'bUser', 'initiation-manual', 'integration-withdrawal-cashier', 'client-app', 'asset-cash'),
    createRecord('userWithdrawal', 1, 'cUser', 'initiation-auto', 'integration-bind-cashier', 'client-app', 'asset-cash'),
    createRecord('userWithdrawal', 2, 'cUser', 'initiation-manual', 'integration-withdrawal-cashier', 'client-app', 'asset-cash'),
    ...(['bUser', 'cUser'] as const).flatMap((userType, userIndex) => [
      createRecord('singleDisbursement', userIndex * 4 + 1, userType, 'initiation-auto', 'integration-bind-cashier', 'client-app', 'asset-cash'),
      createRecord('singleDisbursement', userIndex * 4 + 2, userType, 'initiation-manual', 'integration-withdrawal-cashier', 'client-app', 'asset-cash'),
      createRecord('singleDisbursement', userIndex * 4 + 3, userType, 'initiation-manual', 'integration-dropin-cashier', 'client-app', 'asset-airtime'),
      createRecord('singleDisbursement', userIndex * 4 + 4, userType, 'initiation-manual', 'integration-dropin-cashier', 'client-app', 'asset-gift-card')
    ]),
    ...(['bUser', 'cUser'] as const).flatMap((userType, userIndex) => [
      createRecord('batchDisbursement', userIndex * 2 + 1, userType, 'initiation-auto', 'integration-bind-cashier', 'client-app', 'asset-cash'),
      createRecord('batchDisbursement', userIndex * 2 + 2, userType, 'initiation-file', 'integration-dashboard', '', 'asset-cash')
    ])
  ]
}

function recordSignature(record: PayoutCapabilityRecord) {
  return [
    record.product,
    record.values.payeeUserType,
    record.values.initiationMethod,
    record.values.integrationForm,
    record.values.supportedClient,
    record.values.assetType
  ].join('|')
}

function keepValidDefaultRecords(records: PayoutCapabilityRecord[]) {
  const validDefaultSignatures = new Set(createDefaultRecords().map(recordSignature))
  return records.filter(
    (record) => !record.name.includes('默认配置') || validDefaultSignatures.has(recordSignature(record))
  )
}

function syncCoreFieldLabels(fields: PayoutField[]) {
  const defaultFieldMap = new Map(defaultPayoutFields.map((field) => [field.id, field]))

  return fields.map((field) => {
    const defaultField = defaultFieldMap.get(field.id)
    if (!defaultField) return field

    const defaultOptionMap = new Map(defaultField.options.map((option) => [option.id, option]))
    return {
      ...field,
      label: defaultField.label,
      description: defaultField.description,
      core: defaultField.core,
      hideWhenEmpty: defaultField.hideWhenEmpty,
      options: field.options.map((option) => {
        const defaultOption = defaultOptionMap.get(option.id)
        return defaultOption ? { ...option, ...defaultOption } : option
      })
    }
  })
}

function expandSelections(
  product: SecondaryProductCategory,
  name: string,
  selections: Record<string, string[]>
): PayoutCapabilityRecord[] {
  const fields = Object.entries(selections)
  const combinations = fields.reduce<Array<Record<string, string>>>(
    (rows, [fieldId, optionIds]) =>
      rows.flatMap((row) =>
        (optionIds.length ? optionIds : ['']).map((optionId) => ({ ...row, [fieldId]: optionId }))
      ),
    [{}]
  )

  return combinations.map((values, index) => ({
    id: `${product}-${Date.now()}-${index}`,
    product,
    name: combinations.length > 1 ? `${name} ${index + 1}` : name,
    values
  }))
}

export function loadPayoutConfig(): PayoutConfigState {
  const stored = localStorage.getItem(storageKey)
  if (!stored) return createDefaultPayoutConfig()

  try {
    const parsed = JSON.parse(stored) as PayoutConfigState & {
      schemaVersion?: number
      selections?: Record<SecondaryProductCategory, Record<string, string[]>>
    }
    if (parsed.schemaVersion === 6 && Array.isArray(parsed.fields) && Array.isArray(parsed.records)) {
      return {
        ...parsed,
        schemaVersion: 6,
        fields: syncCoreFieldLabels(parsed.fields)
      }
    }
    if (parsed.schemaVersion === 5 && Array.isArray(parsed.fields) && Array.isArray(parsed.records)) {
      return {
        schemaVersion: 6,
        fields: syncCoreFieldLabels(parsed.fields),
        records: keepValidDefaultRecords(parsed.records)
      }
    }
    if (parsed.schemaVersion === 4 && Array.isArray(parsed.fields) && Array.isArray(parsed.records)) {
      return {
        schemaVersion: 6,
        fields: syncCoreFieldLabels(parsed.fields),
        records: keepValidDefaultRecords(
          parsed.records.flatMap((record) =>
            expandSelections(record.product, record.name, record.values as unknown as Record<string, string[]>)
          )
        )
      }
    }
    if (parsed.schemaVersion === 3 && Array.isArray(parsed.fields) && parsed.selections) {
      return {
        schemaVersion: 6,
        fields: syncCoreFieldLabels(parsed.fields),
        records: keepValidDefaultRecords(
          payoutProductOptions.flatMap((product) =>
            expandSelections(
              product.id,
              `${product.label}默认配置`,
              parsed.selections?.[product.id] ?? {}
            )
          )
        )
      }
    }
    return createDefaultPayoutConfig()
  } catch {
    return createDefaultPayoutConfig()
  }
}

export function savePayoutConfig(config: PayoutConfigState) {
  localStorage.setItem(storageKey, JSON.stringify({ ...config, updatedAt: new Date().toISOString() }))
}
