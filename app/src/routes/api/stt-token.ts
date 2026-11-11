// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { bindings } from '../../lib/bindings.server'
import { isHost } from '../../lib/translate-core.server'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

// Host-only: exchanges the ElevenLabs key for a short-lived Scribe token, so the key never reaches the WebSocket.
export const Route = createFileRoute('/api/stt-token')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const u = new URL(request.url)
        if (!(await isHost(u.searchParams.get('k')))) return json({ error: 'forbidden' }, 403)
        const body: any = await request.json().catch(() => ({}))
        const key = (bindings() as any).ELEVENLABS_API_KEY || (typeof body?.xi === 'string' ? body.xi.trim().slice(0, 200) : '')
        if (!key) return json({ error: 'no_key' }, 400)
        const r = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', { method: 'POST', headers: { 'xi-api-key': key } })
        if (!r.ok) { const d = await r.text().catch(() => ''); return json({ error: 'token_failed', status: r.status, detail: d.slice(0, 300) }, 502) }
        const j: any = await r.json().catch(() => ({}))
        if (!j?.token) return json({ error: 'token_missing' }, 502)
        return json({ token: j.token })
      },
    },
  },
})
