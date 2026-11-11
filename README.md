# Alice

Traducción de voz en tiempo real con la voz de Alma (ElevenLabs).

En vivo: https://alice.higgsfield.app

## Modos

- **Evento:** un teléfono (host) escucha al orador. Los invitados abren el link, eligen su idioma y leen o escuchan la traducción en sus audífonos.
- **Alice:** un solo teléfono escucha con su propio micrófono y reproduce la traducción en los audífonos de quien lo usa.

## Cómo funciona

- Oído: ElevenLabs Scribe v2 Realtime (respaldo: reconocimiento de voz del navegador).
- Traducción: cortes por frase mientras la persona habla, con varios servicios de respaldo.
- Voz: ElevenLabs Turbo v2.5 con la voz de Alma y contexto de la frase anterior.
- Stack: React 19 + TanStack Start sobre un Cloudflare Worker, con D1 y R2.

El código vive en `app/`. La API key de ElevenLabs nunca se guarda en el repo: se pega en la app y queda solo en el teléfono del host.

Nota: el sitio se despliega desde Higgsfield. Este repositorio es una copia del código; los cambios hechos aquí no se publican solos.
