import type { AgileIntakeDraft, IntakeBusinessType } from './agileIntakeData'
import { isSupabaseConfigured, supabase } from './supabase'

export type AgileIntakeRequestStatus = 'draft' | 'submitting' | 'submitted' | 'approval_failed'

export interface AgileIntakeRequestRecord {
  id: string
  requestNo: string
  status: AgileIntakeRequestStatus
  businessType: IntakeBusinessType
  businessName: string
  merchantCount: number
  capabilityCount: number
  currentStep: number
  payload: AgileIntakeDraft
  structuredRequirement: string
  larkApprovalInstanceCode?: string
  larkApprovalUrl?: string
  approvalError?: string
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

interface RequestRow {
  id: string
  request_no: string
  status: AgileIntakeRequestStatus
  business_type: IntakeBusinessType
  business_name: string
  merchant_count: number
  capability_count: number
  current_step: number
  payload: AgileIntakeDraft
  structured_requirement: string
  lark_approval_instance_code: string | null
  lark_approval_url: string | null
  approval_error: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface SaveAgileIntakeInput {
  id?: string
  draft: AgileIntakeDraft
  structuredRequirement: string
  capabilityCount: number
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('当前环境未配置需求存储服务。')
  }
  return supabase
}

async function requireSession() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('请先登录产品能力管理。')
  return client
}

function cloneDraft(draft: AgileIntakeDraft) {
  return JSON.parse(JSON.stringify(draft)) as AgileIntakeDraft
}

function rowToRecord(row: RequestRow): AgileIntakeRequestRecord {
  return {
    id: row.id,
    requestNo: row.request_no,
    status: row.status,
    businessType: row.business_type,
    businessName: row.business_name,
    merchantCount: row.merchant_count,
    capabilityCount: row.capability_count,
    currentStep: row.current_step,
    payload: row.payload,
    structuredRequirement: row.structured_requirement,
    larkApprovalInstanceCode: row.lark_approval_instance_code ?? undefined,
    larkApprovalUrl: row.lark_approval_url ?? undefined,
    approvalError: row.approval_error ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function draftSummary(input: SaveAgileIntakeInput) {
  return {
    business_type: input.draft.businessType,
    business_name: input.draft.businessName.trim(),
    merchant_count: input.draft.merchantSubjects.length,
    capability_count: input.capabilityCount,
    current_step: input.draft.currentStep,
    payload: cloneDraft(input.draft),
    structured_requirement: input.structuredRequirement,
    status: 'draft' as const,
    approval_error: null
  }
}

export async function saveAgileIntakeRequest(input: SaveAgileIntakeInput) {
  const client = await requireSession()
  const summary = draftSummary(input)
  const query = input.id
    ? client.from('agile_intake_requests').update(summary).eq('id', input.id)
    : client.from('agile_intake_requests').insert(summary)
  const { data, error } = await query.select('*').single()
  if (error) throw error
  return rowToRecord(data as unknown as RequestRow)
}

export async function listAgileIntakeRequests(limit = 30) {
  const client = await requireSession()
  const { data, error } = await client
    .from('agile_intake_requests')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as unknown as RequestRow[]).map(rowToRecord)
}
