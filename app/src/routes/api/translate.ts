// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { LANGS, isHost, translateServer } from '../../lib/translate-core.server'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export const Route = createFileRoute('/api/translate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const u = new URL(request.url)
        if (!(await isHost(u.searchParams.get('k')))) return json({ error: 'forbidden' }, 403)
        const body: any = await request.json().catch(() => ({}))
        const text = String(body?.text ?? '').trim().slice(0, 1500)
        const langs = (Array.isArray(body?.langs) ? body.langs : []).filter(l => LANGS.includes(l)).slice(0, 6)
        if (!text || !langs.length) return json({ out: {} })
        const out: Record<string, string> = {}
        await Promise.all(langs.map(async l => { const v = await translateServer(text, l); if (v) out[l] = v }))
        return json({ out })
      },
    },
  },
})
