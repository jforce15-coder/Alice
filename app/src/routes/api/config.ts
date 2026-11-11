// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router'
import { bindings } from '../../lib/bindings.server'
import { storedKey } from '../../lib/translate-core.server'

// Tells the app whether a shared voice key is configured (true/false only, never the key).
export const Route = createFileRoute('/api/config')({
  server: {
    handlers: {
      GET: async () => {
        const voice = !!((await storedKey()) || (bindings() as any).ELEVENLABS_API_KEY)
        return new Response(JSON.stringify({ voice }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
      },
    },
  },
})
