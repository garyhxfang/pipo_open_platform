const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface CreateDocumentRequest {
  title?: string
  markdown?: string
}

interface LarkApiResponse<T> {
  code: number
  msg: string
  data?: T
}

interface LarkDocumentData {
  document: {
    document_id: string
  }
}

type LarkBlock = Record<string, unknown>

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}

function textElements(content: string) {
  return {
    elements: [
      {
        text_run: {
          content,
          text_element_style: {}
        }
      }
    ]
  }
}

function markdownToBlocks(markdown: string): LarkBlock[] {
  const blocks: LarkBlock[] = []

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (!line.trim() || /^#\s+/.test(line)) continue

    const heading2 = line.match(/^##\s+(.+)/)
    if (heading2) {
      blocks.push({ block_type: 4, heading2: textElements(heading2[1]) })
      continue
    }

    const heading3 = line.match(/^###\s+(.+)/)
    if (heading3) {
      blocks.push({ block_type: 5, heading3: textElements(heading3[1]) })
      continue
    }

    const bullet = line.match(/^(\s*)-\s+(.+)/)
    if (bullet) {
      blocks.push({
        block_type: 12,
        bullet: textElements(bullet[2])
      })
      continue
    }

    blocks.push({ block_type: 2, text: textElements(line.trim()) })
  }

  return blocks
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
  const payload = await response.json() as LarkApiResponse<T>

  if (!response.ok || payload.code !== 0) {
    const message = payload.msg || `飞书接口调用失败（HTTP ${response.status}）`
    throw new Error(`${stage}失败：${message}（code: ${payload.code ?? 'unknown'}）`)
  }

  if (!payload.data) throw new Error(`${stage}失败：飞书接口未返回数据`)
  return payload.data
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const appId = Deno.env.get('LARK_APP_ID')?.trim()
  const appSecret = Deno.env.get('LARK_APP_SECRET')?.trim()
  const folderToken = Deno.env.get('LARK_FOLDER_TOKEN')?.trim()
  const documentDomain = (Deno.env.get('LARK_DOC_DOMAIN')?.trim() || 'https://bytedance.feishu.cn').replace(/\/$/, '')

  if (!appId || !appSecret) {
    return jsonResponse({ error: '飞书文档服务尚未配置应用凭证' }, 503)
  }

  let body: CreateDocumentRequest
  try {
    body = await request.json() as CreateDocumentRequest
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, 400)
  }

  const title = body.title?.trim()
  const markdown = body.markdown?.trim()
  if (!title || !markdown) return jsonResponse({ error: '文档标题和内容不能为空' }, 400)
  if (title.length > 800) return jsonResponse({ error: '文档标题不能超过 800 个字符' }, 400)
  if (markdown.length > 200_000) return jsonResponse({ error: '文档内容过长' }, 413)

  try {
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    })
    const tokenPayload = await tokenResponse.json() as LarkApiResponse<never> & { tenant_access_token?: string }
    if (!tokenResponse.ok || tokenPayload.code !== 0 || !tokenPayload.tenant_access_token) {
      throw new Error(tokenPayload.msg || '无法获取飞书应用访问凭证')
    }

    const documentBody: Record<string, string> = { title }
    if (folderToken) documentBody.folder_token = folderToken

    const documentData = await callLark<LarkDocumentData>(
      '创建文档',
      'https://open.feishu.cn/open-apis/docx/v1/documents',
      tokenPayload.tenant_access_token,
      { method: 'POST', body: JSON.stringify(documentBody) }
    )
    const documentId = documentData.document.document_id
    const blocks = markdownToBlocks(markdown)

    for (let index = 0; index < blocks.length; index += 50) {
      await callLark(
        `写入文档内容（第 ${Math.floor(index / 50) + 1} 批）`,
        `https://open.feishu.cn/open-apis/docx/v1/documents/${documentId}/blocks/${documentId}/children?document_revision_id=-1`,
        tokenPayload.tenant_access_token,
        {
          method: 'POST',
          body: JSON.stringify({ index, children: blocks.slice(index, index + 50) })
        }
      )
    }

    return jsonResponse({
      documentId,
      documentUrl: `${documentDomain}/docx/${documentId}`
    })
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : '飞书文档生成失败'
    }, 502)
  }
})
