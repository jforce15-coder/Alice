// @ts-nocheck
import { bindings } from './bindings.server'

export const LANGS = ['es', 'en', 'fr', 'pt', 'it', 'de']
export const MOODS = ['amused', 'emotional', 'excited', 'warm']
const HOST_HASH = 'c407ff3e4ae85e9ac9814645093abea7bc84e7a9de6da86de732d749206508ac'
const VOICE_ID = 'qpGRZJK2msOprnlnBj0M' // Alma
const TAGS = { amused: '[amused]', emotional: '[emotional]', excited: '[excited]', warm: '[warmly]' }

export async function isHost(k: string | null): Promise<boolean> {
  if (!k) return false
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k))
  const hex = [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === HOST_HASH
}

async function call(key: string, model: string, text: string, lang: string, prev: string, ms: number): Promise<ArrayBuffer | null> {
  const ac = new AbortController()
  const to = setTimeout(() => ac.abort(), ms)
  try {
    const body: any = { text, model_id: model, language_code: lang,
      voice_settings: { stability: 0.4, similarity_boost: 0.8, style: model === 'eleven_flash_v2_5' ? 0 : 0.3, speed: 1.08 } }
    if (prev) body.previous_text = prev.slice(-400) // keeps rhythm and intonation continuous across phrases
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64&optimize_streaming_latency=2`, {
      method: 'POST', signal: ac.signal,
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    })
    if (!r.ok) return null
    const buf = await r.arrayBuffer()
    return buf.byteLength > 500 ? buf : null
  } catch { return null } finally { clearTimeout(to) }
}

// Fast and reliable first: Turbo v2.5 with continuity; Flash as a backup. Never drops a phrase silently.
export async function tts(text: string, lang: string, hostKey?: string, _mood?: string, prev = ''): Promise<ArrayBuffer | null> {
  const key = (bindings() as any).ELEVENLABS_API_KEY || hostKey
  if (!key || !text) return null
  const t = text.slice(0, 800)
  return (await call(key, 'eleven_turbo_v2_5', t, lang, prev, 6000))
    || (await call(key, 'eleven_flash_v2_5', t, lang, prev, 6000))
    || (await call(key, 'eleven_flash_v2_5', t, lang, '', 8000))
}

// Server-side translation chain (different network than the host phone, so a block on one side does not stop the other).
export async function translateServer(text: string, tl: string): Promise<string> {
  const q = encodeURIComponent(text)
  try {
    const r = await fetch(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${tl}&q=${q}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (r.ok) { const j: any = await r.json(); const v = Array.isArray(j?.[0]) ? j[0][0] : j?.[0]; if (v && typeof v === 'string') return v.trim() }
  } catch {}
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${q}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (r.ok) { const j: any = await r.json(); const v = (j?.[0] ?? []).map((x: any) => x?.[0] ?? '').join('').trim(); if (v) return v }
  } catch {}
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?langpair=en|${tl}&q=${q}`)
    const j: any = await r.json(); const v = String(j?.responseData?.translatedText ?? '').trim()
    if (v && !/MYMEMORY WARNING/i.test(v)) return v
  } catch {}
  return ''
}
