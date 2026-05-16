/**
 * FIWARE API client
 * Env vars read at call time. Hardcoded fallbacks for dev.
 */

function cfg() {
  return {
    orion:       process.env.ORION_URL          ?? 'http://localhost:1026',
    ql:          process.env.QL_URL             ?? 'http://localhost:8668',
    webhook:     process.env.WEBHOOK_URL        ?? 'http://localhost:5050',
    keyrock:     process.env.KEYROCK_URL        ?? 'http://localhost:3005',
    service:     process.env.FIWARE_SERVICE     ?? 'irfane',
    servicepath: process.env.FIWARE_SERVICEPATH ?? '/smartcity',
  }
}

function headers(includeContentType = false) {
  const c = cfg()
  const h: Record<string, string> = {
    'Fiware-Service':     c.service,
    'Fiware-ServicePath': c.servicepath,
  }
  if (includeContentType) h['Content-Type'] = 'application/json'
  return h
}

// ── Orion ────────────────────────────────────────────────────────────────────

export async function getEntities(type?: string) {
  const { orion } = cfg()
  const url = type
    ? `${orion}/v2/entities?type=${type}&options=keyValues&limit=100`
    : `${orion}/v2/entities?options=keyValues&limit=100`
  try {
    const res = await fetch(url, { headers: headers(), cache: 'no-store' })
    console.log(`[fiware] getEntities(${type}) → ${res.status} from ${url}`)
    if (!res.ok) return []
    const data = await res.json()
    console.log(`[fiware] getEntities(${type}) → ${data.length} entities`)
    return data
  } catch (e: any) {
    console.error(`[fiware] getEntities error:`, e.message)
    return []
  }
}

export async function getEntity(id: string) {
  const { orion } = cfg()
  try {
    const res = await fetch(
      `${orion}/v2/entities/${encodeURIComponent(id)}?options=keyValues`,
      { headers: headers(), cache: 'no-store' }
    )
    if (!res.ok) return null
    return res.json()
  } catch (e: any) {
    console.error(`[fiware] getEntity error:`, e.message)
    return null
  }
}

// ── QuantumLeap ──────────────────────────────────────────────────────────────

export async function getHistory(entityId: string, attr: string, lastN = 60) {
  const { ql } = cfg()
  try {
    const res = await fetch(
      `${ql}/v2/entities/${encodeURIComponent(entityId)}/attrs/${attr}?lastN=${lastN}`,
      { headers: headers(), cache: 'no-store' }
    )
    if (!res.ok) return { values: [], index: [] }
    return res.json()
  } catch (e: any) {
    console.error(`[fiware] getHistory error:`, e.message)
    return { values: [], index: [] }
  }
}

// ── Webhook ──────────────────────────────────────────────────────────────────

export async function getAlerts(params?: { type?: string; severity?: string; limit?: number }) {
  const { webhook } = cfg()
  try {
    const qs = new URLSearchParams()
    if (params?.type)     qs.set('type',     params.type)
    if (params?.severity) qs.set('severity', params.severity)
    if (params?.limit)    qs.set('limit',    String(params.limit))
    const res = await fetch(`${webhook}/alerts?${qs}`, { cache: 'no-store' })
    if (!res.ok) return { alerts: [], count: 0, total: 0 }
    return res.json()
  } catch (e: any) {
    console.error(`[fiware] getAlerts error:`, e.message)
    return { alerts: [], count: 0, total: 0 }
  }
}

export async function getAlertSummary() {
  const { webhook } = cfg()
  try {
    const res = await fetch(`${webhook}/alerts/summary`, { cache: 'no-store' })
    if (!res.ok) return { total: 0, by_type: {}, by_severity: {} }
    return res.json()
  } catch (e: any) {
    console.error(`[fiware] getAlertSummary error:`, e.message)
    return { total: 0, by_type: {}, by_severity: {} }
  }
}

// ── Keyrock ──────────────────────────────────────────────────────────────────

export async function keyrockLogin(email: string, password: string) {
  const { keyrock } = cfg()
  const res = await fetch(`${keyrock}/v1/auth/tokens`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name: email, password }),
  })
  if (!res.ok) throw new Error('Invalid credentials')
  const token = res.headers.get('x-subject-token')
  const data  = await res.json()
  return { token, user: data.token?.user }
}

export async function keyrockValidateToken(token: string) {
  const { keyrock } = cfg()
  try {
    const res = await fetch(`${keyrock}/v1/auth/tokens`, {
      method:  'GET',
      headers: { 'X-Auth-Token': token, 'X-Subject-Token': token },
    })
    return res.ok
  } catch { return false }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function congestionColor(level: string) {
  const map: Record<string, string> = {
    free: '#16a34a', light: '#16a34a',
    moderate: '#d97706', heavy: '#dc2626', congested: '#dc2626',
  }
  return map[level] ?? '#64748b'
}

export function grassColor(condition: string) {
  const map: Record<string, string> = {
    good: '#16a34a', moderate: '#d97706', poor: '#dc2626',
  }
  return map[condition] ?? '#64748b'
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-MA', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}