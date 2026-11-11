// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { bindings } from '../../lib/bindings.server'
import { LANGS } from '../../lib/translate-core.server'

export const Route = createFileRoute('/api/audio')({
  server: {
    handlers: {
      HEAD: async ({ request }) => {
        const u = new URL(request.url)
        const id = Number(u.searchParams.get('id') || '0')
        const lang = u.searchParams.get('lang') || ''
        const env: any = bindings()
        if (!id || !LANGS.includes(lang) || !env.STORAGE) return new Response(null, { status: 404 })
        const obj = await env.STORAGE.head(`a/${id}/${lang}.mp3`)
        return new Response(null, { status: obj ? 200 : 404, headers: { 'Cache-Control': 'no-store' } })
      },
      GET: async ({ request }) => {
        const u = new URL(request.url)
        const id = Number(u.searchParams.get('id') || '0')
        const lang = u.searchParams.get('lang') || ''
        const env: any = bindings()
        if (!id || !LANGS.includes(lang) || !env.STORAGE) return new Response('not found', { status: 404 })
        const obj = await env.STORAGE.get(`a/${id}/${lang}.mp3`)
        if (!obj) return new Response('not found', { status: 404 })
        return new Response(obj.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=3600' } })
      },
    },
  },
})
