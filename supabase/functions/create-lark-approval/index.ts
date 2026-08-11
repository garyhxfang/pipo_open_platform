import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface CreateApprovalRequest {
  businessName?: string
  dryRun?: boolean
  requestId?: string
}

interface LarkApiResponse<T> {
  code: number
  msg: string
  data?: T
}

interface BotInfoResponse {
  code: number
  msg: string
  bot?: {
    app_name?: string
    open_id?: string
  }
}

interface ApprovalControl {
  id: string
  name: string
  type: string
}

interface ApprovalDefinitionData {
  approval_name?: string
  form?: string
}

interface ApprovalInstanceData {
  instance_code?: string
}

interface AgileIntakeRequestRow {
  id: string
  owner_id: string
  request_no: string
  business_name: string
  status: 'draft' | 'submitting' | 'submitted' | 'approval_failed'
  lark_approval_instance_code: string | null
  lark_approval_url: string | null
}

class LarkApiError extends Error {
  constructor(
    readonly stage: string,
    readonly code: number | string,
    message: string,
    readonly httpStatus: number
  ) {
    super(`${stage}失败：${message}（code: ${code}）`)
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}

async function readLarkResponse<T>(stage: string, response: Response) {
  let payload: LarkApiResponse<T>
  try {
    payload = await response.json() as LarkApiResponse<T>
  } catch {
    throw new LarkApiError(stage, 'invalid_response', '飞书接口未返回有效 JSON', response.status)
  }

  if (!response.ok || payload.code !== 0) {
    throw new LarkApiError(
      stage,
      payload.code ?? 'unknown',
      payload.msg || `飞书接口调用失败（HTTP ${response.status}）`,
      response.status
    )
  }

  return payload
}

async function callLark<T>(stage: string, url: string, accessToken: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...init.headers
    }
  })
  const payload = await readLarkResponse<T>(stage, response)
  if (!payload.data) {
    throw new LarkApiError(stage, 'missing_data', '飞书接口未返回 data', response.status)
  }
  return payload.data
}

function parseControls(form: string | undefined) {
  if (!form) return []

  try {
    const controls = JSON.parse(form) as ApprovalControl[]
    return Array.isArray(controls) ? controls : []
  } catch {
    throw new LarkApiError('读取审批表单', 'invalid_form', '审批定义中的 form 不是有效 JSON', 200)
  }
}

function approvalInstanceUrl(instanceCode: string) {
  const path = encodeURIComponent(`pc/pages/in-process/index?instanceId=${instanceCode}`)
  return `https://applink.larkoffice.com/client/mini_program/open?mode=appCenter&appId=cli_9cb844403dbb9108&path=${path}`
}

async function loadOwnedRequest(request: Request, requestId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim()
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new LarkApiError('读取需求记录', 'supabase_not_configured', '需求存储服务未完成配置', 500)
  }
  if (!authorization) {
    throw new LarkApiError('验证用户身份', 'missing_authorization', '请先登录后再提交审批', 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData.user) {
    throw new LarkApiError('验证用户身份', 'invalid_session', '登录状态已失效，请重新登录', 401)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const { data, error } = await adminClient
    .from('agile_intake_requests')
    .select('id,owner_id,request_no,business_name,status,lark_approval_instance_code,lark_approval_url')
    .eq('id', requestId)
    .maybeSingle()

  if (error) throw new LarkApiError('读取需求记录', error.code, error.message, 500)
  if (!data || data.owner_id !== userData.user.id) {
    throw new LarkApiError('读取需求记录', 'request_not_found', '需求记录不存在或无权访问', 404)
  }

  return {
    record: data as AgileIntakeRequestRow,
    adminClient
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const appId = Deno.env.get('LARK_APP_ID')?.trim()
  const appSecret = Deno.env.get('LARK_APP_SECRET')?.trim()
  const approvalCode = Deno.env.get('LARK_APPROVAL_CODE')?.trim()

  if (!appId || !appSecret || !approvalCode) {
    return jsonResponse({ error: '飞书审批服务尚未完成应用凭证或审批编码配置' }, 503)
  }

  let body: CreateApprovalRequest
  let appName: string | undefined
  let requestContext: Awaited<ReturnType<typeof loadOwnedRequest>> | undefined

  try {
    body = await request.json() as CreateApprovalRequest
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, 400)
  }

  if (body.requestId) {
    try {
      requestContext = await loadOwnedRequest(request, body.requestId)
    } catch (error) {
      if (error instanceof LarkApiError) {
        return jsonResponse({ error: error.message, stage: error.stage, larkCode: error.code }, error.httpStatus)
      }
      return jsonResponse({ error: error instanceof Error ? error.message : '读取需求记录失败' }, 500)
    }

    if (
      requestContext.record.status === 'submitted'
      && requestContext.record.lark_approval_instance_code
    ) {
      return jsonResponse({
        instanceCode: requestContext.record.lark_approval_instance_code,
        approvalUrl: requestContext.record.lark_approval_url,
        requestNo: requestContext.record.request_no,
        message: '该需求已提交飞书审批'
      })
    }

    if (!body.dryRun) {
      const { error } = await requestContext.adminClient
        .from('agile_intake_requests')
        .update({ status: 'submitting', approval_error: null })
        .eq('id', requestContext.record.id)
      if (error) return jsonResponse({ error: `更新需求提交状态失败：${error.message}` }, 500)
    }
  }

  const businessName = requestContext?.record.business_name.trim()
    || body.businessName?.trim()
    || '能力地图审批链路测试'
  if (businessName.length > 200) {
    return jsonResponse({ error: '业务名称不能超过 200 个字符' }, 400)
  }

  try {
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    })
    const tokenPayload = await tokenResponse.json() as LarkApiResponse<never> & { tenant_access_token?: string }
    if (!tokenResponse.ok || tokenPayload.code !== 0 || !tokenPayload.tenant_access_token) {
      throw new LarkApiError(
        '获取应用访问凭证',
        tokenPayload.code ?? 'unknown',
        tokenPayload.msg || '无法获取飞书应用访问凭证',
        tokenResponse.status
      )
    }

    const accessToken = tokenPayload.tenant_access_token
    const botResponse = await fetch('https://open.feishu.cn/open-apis/bot/v3/info', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const botPayload = await botResponse.json() as BotInfoResponse
    if (!botResponse.ok || botPayload.code !== 0 || !botPayload.bot?.open_id) {
      throw new LarkApiError(
        '获取应用机器人信息',
        botPayload.code ?? 'unknown',
        botPayload.msg || '应用未启用机器人能力或尚未发布',
        botResponse.status
      )
    }
    appName = botPayload.bot.app_name

    const approvalDefinition = await callLark<ApprovalDefinitionData>(
      '读取审批定义',
      `https://open.feishu.cn/open-apis/approval/v4/approvals/${encodeURIComponent(approvalCode)}?locale=zh-CN&user_id_type=open_id`,
      accessToken,
      { method: 'GET' }
    )
    const controls = parseControls(approvalDefinition.form)
    const businessNameControl = controls.find((control) => control.name.trim() === '业务名称')

    if (!businessNameControl) {
      throw new LarkApiError('匹配审批表单', 'control_not_found', '未找到名为“业务名称”的控件', 200)
    }

    if (body.dryRun) {
      return jsonResponse({
        ready: true,
        approvalName: approvalDefinition.approval_name,
        appName: botPayload.bot.app_name,
        control: {
          name: businessNameControl.name,
          type: businessNameControl.type
        }
      })
    }

    const form = JSON.stringify([
      {
        id: businessNameControl.id,
        type: businessNameControl.type,
        value: businessName
      }
    ])
    const instance = await callLark<ApprovalInstanceData>(
      '创建审批实例',
      'https://open.feishu.cn/open-apis/approval/v4/instances',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          approval_code: approvalCode,
          open_id: botPayload.bot.open_id,
          form,
          uuid: requestContext?.record.id ?? crypto.randomUUID()
        })
      }
    )

    if (!instance.instance_code) {
      throw new LarkApiError('创建审批实例', 'missing_instance_code', '飞书接口未返回审批实例编码', 200)
    }

    const approvalUrl = approvalInstanceUrl(instance.instance_code)
    if (requestContext) {
      const { error } = await requestContext.adminClient
        .from('agile_intake_requests')
        .update({
          status: 'submitted',
          lark_approval_instance_code: instance.instance_code,
          lark_approval_url: approvalUrl,
          approval_error: null,
          submitted_at: new Date().toISOString()
        })
        .eq('id', requestContext.record.id)
      if (error) {
        throw new LarkApiError('保存审批结果', error.code, error.message, 500)
      }
    }

    return jsonResponse({
      instanceCode: instance.instance_code,
      approvalUrl,
      requestNo: requestContext?.record.request_no,
      approvalName: approvalDefinition.approval_name,
      message: '飞书审批已创建'
    })
  } catch (error) {
    if (requestContext) {
      const message = error instanceof Error ? error.message : '飞书审批创建失败'
      await requestContext.adminClient
        .from('agile_intake_requests')
        .update({ status: 'approval_failed', approval_error: message })
        .eq('id', requestContext.record.id)
    }
    if (error instanceof LarkApiError) {
      return jsonResponse({
        error: error.message,
        stage: error.stage,
        larkCode: error.code,
        appName
      }, 502)
    }

    return jsonResponse({
      error: error instanceof Error ? error.message : '飞书审批创建失败'
    }, 502)
  }
})
