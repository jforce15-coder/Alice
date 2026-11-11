// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { bindings } from '../../lib/bindings.server'
import { isAdmin, storedKey } from '../../lib/translate-core.server'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
const mask = (k: string) => (k ? '••••' + k.slice(-4) : '')

// Admin-only: set, check or remove the shared ElevenLabs key. The full key is never returned.
export const Route = createFileRoute('/api/admin')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await isAdmin(new URL(request.url).searchParams.get('k')))) return json({ error: 'forbidden' }, 403)
        const k = await storedKey()
        return json({ configured: !!k, hint: mask(k), siteSecret: !!(bindings() as any).ELEVENLABS_API_KEY })
      },
      POST: async ({ request }) => {
        if (!(await isAdmin(new URL(request.url).searchParams.get('k')))) return json({ error: 'forbidden' }, 403)
        const db = (bindings() as any).DB
        if (!db) return json({ error: 'no db' }, 500)
        const body: any = await request.json().catch(() => ({}))
        if (body?.action === 'clear') {
          await db.prepare("DELETE FROM meta WHERE k = 'xi_key'").run()
          return json({ configured: false })
        }
        const key = String(body?.key ?? '').trim().slice(0, 200)
        if (!key) return json({ error: 'empty' }, 400)
        // Check the key really works for both listening (Speech to Text) and speaking (Text to Speech)
        const stt = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', { method: 'POST', headers: { 'xi-api-key': key } })
        const ttsR = await fetch('https://api.elevenlabs.io/v1/text-to-speech/qpGRZJK2msOprnlnBj0M?output_format=mp3_22050_32', {
          method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Hola', model_id: 'eleven_flash_v2_5' }),
        })
        if (ttsR.status === 401 && stt.status === 401) return json({ error: 'invalid', stt: stt.status, tts: ttsR.status }, 400)
        await db.prepare("INSERT INTO meta (k, v) VALUES ('xi_key', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(key).run()
        return json({ configured: true, hint: mask(key), stt: stt.ok, tts: ttsR.ok })
      },
    },
  },
})
