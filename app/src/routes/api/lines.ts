// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { bindings } from '../../lib/bindings.server'
import { LANGS, MOODS, isHost, tts } from '../../lib/translate-core.server'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export const Route = createFileRoute('/api/lines')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const env: any = bindings()
        const db = env.DB
        if (!db) return json({ lines: [] })
        const u = new URL(request.url)
        const after = Number(u.searchParams.get('after') || '0')
        const lang = LANGS.includes(u.searchParams.get('lang') || '') ? u.searchParams.get('lang') : 'es'
        const sid = (u.searchParams.get('sid') || '').slice(0, 64)
        if (sid && u.searchParams.get('hb') === '1') {
          const audio = u.searchParams.get('audio') === '1' ? 1 : 0
          await db.prepare('INSERT INTO listeners (sid, lang, audio, seen) VALUES (?, ?, ?, ?) ON CONFLICT(sid) DO UPDATE SET lang=excluded.lang, audio=excluded.audio, seen=excluded.seen')
            .bind(sid, lang, audio, Date.now()).run()
        }
        const sm = await db.prepare("SELECT v FROM meta WHERE k = 'session'").first().catch(() => null)
        const session = Number(sm?.v ?? 0)
        const from = Math.max(after, session)
        const base = 'SELECT l.id, l.en, l.es, l.t, l.pace, x.text AS text FROM lines l LEFT JOIN line_tx x ON x.id = l.id AND x.lang = ?'
        const res = after > 0
          ? await db.prepare(base + ' WHERE l.id > ? ORDER BY l.id ASC LIMIT 50').bind(lang, from).all()
          : await db.prepare('SELECT * FROM (' + base + ' WHERE l.id > ? ORDER BY l.id DESC LIMIT 12) ORDER BY id ASC').bind(lang, session).all()
        const lines = (res.results ?? []).map(r => ({ ...r, text: lang === 'en' ? r.en : lang === 'es' ? r.es : (r.text || r.es) }))
        let listeners, want
        if (u.searchParams.get('count') === '1') {
          const c = await db.prepare('SELECT COUNT(*) AS n FROM listeners WHERE seen > ?').bind(Date.now() - 30000).first()
          listeners = c?.n ?? 0
          const w = await db.prepare('SELECT DISTINCT lang FROM listeners WHERE seen > ?').bind(Date.now() - 60000).all()
          want = (w.results ?? []).map(r => r.lang)
        }
        return json({ lines, listeners, want, session })
      },
      POST: async ({ request }) => {
        const u = new URL(request.url)
        if (!(await isHost(u.searchParams.get('k')))) return json({ error: 'forbidden' }, 403)
        const env: any = bindings()
        const db = env.DB
        if (!db) return json({ error: 'no db' }, 500)
        const body: any = await request.json().catch(() => ({}))
        const en = String(body?.en ?? '').trim().slice(0, 2000)
        const es = String(body?.es ?? '').trim().slice(0, 4000)
        if (!en || !es) return json({ error: 'empty' }, 400)
        const pace = Math.min(6, Math.max(0.5, Number(body?.pace) || 2.6))
        const mood = MOODS.includes(body?.mood) ? body.mood : null
        const xi = typeof body?.xi === 'string' ? body.xi.trim().slice(0, 200) : ''
        const t = Date.now()
        const row = await db.prepare('INSERT INTO lines (en, es, t, pace, mood) VALUES (?, ?, ?, ?, ?) RETURNING id').bind(en, es, t, pace, mood).first()
        const id = row.id
        const texts: Record<string, string> = { es, en }
        const tx = body?.tx && typeof body.tx === 'object' ? body.tx : {}
        const stmts = []
        for (const l of ['fr', 'pt', 'it', 'de']) {
          const v = String(tx[l] ?? '').trim().slice(0, 4000)
          if (v) { texts[l] = v; stmts.push(db.prepare('INSERT OR REPLACE INTO line_tx (id, lang, text) VALUES (?, ?, ?)').bind(id, l, v)) }
        }
        if (stmts.length) await db.batch(stmts)
        let voiced = 0
        if (env.STORAGE) {
          const act = await db.prepare('SELECT DISTINCT lang FROM listeners WHERE audio = 1 AND seen > ?').bind(Date.now() - 60000).all()
          const langs = (act.results ?? []).map(r => r.lang).filter(l => texts[l])
          const prevRow = await db.prepare('SELECT id, en, es FROM lines WHERE id < ? ORDER BY id DESC LIMIT 1').bind(id).first()
          const prevOf = async (l: string) => {
            if (!prevRow) return ''
            if (l === 'es') return prevRow.es || ''
            if (l === 'en') return prevRow.en || ''
            const x = await db.prepare('SELECT text FROM line_tx WHERE id = ? AND lang = ?').bind(prevRow.id, l).first()
            return x?.text || ''
          }
          await Promise.all(langs.map(async l => {
            const buf = await tts(texts[l], l, xi, mood, await prevOf(l))
            if (buf) { voiced++; await env.STORAGE.put(`a/${id}/${l}.mp3`, buf, { httpMetadata: { contentType: 'audio/mpeg' } }) }
          }))
        }
        return json({ id, voiced })
      },
    },
  },
})
