// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { LANGS, isHost, tts } from '../../lib/translate-core.server'

// Host-only (Modo Alice): turns one translated phrase into Alma's voice for the host's own headphones.
export const Route = createFileRoute('/api/speak')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const u = new URL(request.url)
        if (!(await isHost(u.searchParams.get('k')))) return new Response('forbidden', { status: 403 })
        const body: any = await request.json().catch(() => ({}))
        const text = String(body?.text ?? '').trim().slice(0, 800)
        const lang = LANGS.includes(body?.lang) ? body.lang : 'es'
        const prev = String(body?.prev ?? '').slice(-400)
        const xi = typeof body?.xi === 'string' ? body.xi.trim().slice(0, 200) : ''
        if (!text) return new Response('empty', { status: 400 })
        const buf = await tts(text, lang, xi, '', prev)
        if (!buf) return new Response('tts failed', { status: 502 })
        return new Response(buf, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
      },
    },
  },
})
