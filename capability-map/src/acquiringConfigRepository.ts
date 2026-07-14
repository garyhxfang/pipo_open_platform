import type { Session } from '@supabase/supabase-js'
import { normalizeConfigPayload } from './capabilityConfigModel'
import type { AppRole, CapabilityConfigPayloadV4, PublishedConfig, StoredCapabilityConfigPayload } from './configTypes'
import { isSupabaseConfigured, supabase } from './supabase'

const CONFIG_SCOPE = 'acquiring'
const LOCAL_DRAFT_KEY = 'capability-map-acquiring-config-draft'
const LOCAL_RELEASE_KEY = 'capability-map-acquiring-config'

export type StorageMode = 'supabase' | 'local'

export interface ConfigIdentity {
  session?: Session
  role?: AppRole
}

export function storageMode(): StorageMode {
  return isSupabaseConfigured ? 'supabase' : 'local'
}

export async function getIdentity(): Promise<ConfigIdentity> {
  if (!supabase) return {}

  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) return {}

  const { data: member, error: memberError } = await supabase
    .from('app_members')
    .select('role')
    .eq('email', data.session.user.email?.toLowerCase() ?? '')
    .maybeSingle()

  if (memberError) throw memberError
  return { session: data.session, role: member?.role as AppRole | undefined }
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Supabase 尚未配置。')

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function loadDraft(): Promise<CapabilityConfigPayloadV4 | undefined> {
  if (!supabase) {
    const payload = readLocalPayload(LOCAL_DRAFT_KEY)
    return payload ? normalizeConfigPayload(payload) : undefined
  }

  const { data, error } = await supabase
    .from('config_drafts')
    .select('payload')
    .eq('scope', CONFIG_SCOPE)
    .maybeSingle()

  if (error) throw error
  return data?.payload ? normalizeConfigPayload(data.payload as StoredCapabilityConfigPayload) : undefined
}

export async function loadPublishedConfig(): Promise<PublishedConfig | undefined> {
  if (!supabase) {
    const stored = readLocalPayload(LOCAL_RELEASE_KEY)
    const payload = stored ? normalizeConfigPayload(stored) : undefined
    return payload ? { version: 0, publishedAt: payload.exportedAt, payload } : undefined
  }

  const { data, error } = await supabase.rpc('get_published_config', { p_scope: CONFIG_SCOPE })
  if (error) throw error
  if (!data) return undefined

  const release = data as { version: number; published_at: string; payload: StoredCapabilityConfigPayload }
  return {
    version: release.version,
    publishedAt: release.published_at,
    payload: normalizeConfigPayload(release.payload)
  }
}

export async function saveDraft(payload: CapabilityConfigPayloadV4) {
  if (!supabase) {
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(payload))
    return
  }

  const { error } = await supabase.from('config_drafts').upsert(
    {
      scope: CONFIG_SCOPE,
      payload
    },
    { onConflict: 'scope,owner_id' }
  )
  if (error) throw error
}

export async function publishConfig(payload: CapabilityConfigPayloadV4): Promise<number> {
  if (!supabase) {
    localStorage.setItem(LOCAL_RELEASE_KEY, JSON.stringify(payload))
    return 0
  }

  const { data, error } = await supabase.rpc('publish_config', {
    p_scope: CONFIG_SCOPE,
    p_payload: payload
  })
  if (error) throw error
  return Number(data)
}

function readLocalPayload(key: string): StoredCapabilityConfigPayload | undefined {
  const stored = localStorage.getItem(key)
  if (!stored) return undefined

  try {
    return JSON.parse(stored) as StoredCapabilityConfigPayload
  } catch {
    return undefined
  }
}
