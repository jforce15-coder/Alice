// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { bindings } from '../../lib/bindings.server'
import { isHost } from '../../lib/translate-core.server'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

// Host-only: start a fresh session so guests stop seeing earlier text.
export const Route = createFileRoute('/api/session')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const u = new URL(request.url)
        if (!(await isHost(u.searchParams.get('k')))) return json({ error: 'forbidden' }, 403)
        const db = (bindings() as any).DB
        if (!db) return json({ error: 'no db' }, 500)
        const m = await db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM lines').first()
        const start = String(m?.m ?? 0)
        await db.prepare("INSERT INTO meta (k, v) VALUES ('session', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(start).run()
        return json({ session: start })
      },
    },
  },
})
