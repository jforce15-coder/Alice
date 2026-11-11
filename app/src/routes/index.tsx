import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/')({ component: Index })

type Line = { id: number; en: string; es: string; t: number; text: string; pace?: number | null }

const LANGS = [
  { code: 'es', label: 'Español', sub: 'Spanish' },
  { code: 'en', label: 'English', sub: 'Inglés' },
  { code: 'fr', label: 'Français', sub: 'French' },
  { code: 'pt', label: 'Português', sub: 'Portuguese' },
  { code: 'it', label: 'Italiano', sub: 'Italian' },
  { code: 'de', label: 'Deutsch', sub: 'German' },
]
const UI: Record<string, Record<string, string>> = {
  es: { title: 'Traducción en vivo', choose: 'Elige tu idioma', listen: 'Escuchar con audífonos', read: 'Solo leer', live: 'En vivo', connecting: 'Conectando', waiting: 'Las palabras aparecerán aquí en cuanto alguien hable.' },
  en: { title: 'Live translation', choose: 'Choose your language', listen: 'Listen with headphones', read: 'Read only', live: 'Live', connecting: 'Connecting', waiting: 'Words will appear here as soon as someone speaks.' },
  fr: { title: 'Traduction en direct', choose: 'Choisissez votre langue', listen: 'Écouter avec des écouteurs', read: 'Lire seulement', live: 'En direct', connecting: 'Connexion', waiting: 'Les mots apparaîtront ici dès que quelqu’un parlera.' },
  pt: { title: 'Tradução ao vivo', choose: 'Escolha seu idioma', listen: 'Ouvir com fones', read: 'Só ler', live: 'Ao vivo', connecting: 'Conectando', waiting: 'As palavras aparecerão aqui assim que alguém falar.' },
  it: { title: 'Traduzione dal vivo', choose: 'Scegli la tua lingua', listen: 'Ascolta con le cuffie', read: 'Solo lettura', live: 'Dal vivo', connecting: 'Connessione', waiting: 'Le parole appariranno qui appena qualcuno parla.' },
  de: { title: 'Live-Übersetzung', choose: 'Wähle deine Sprache', listen: 'Mit Kopfhörern hören', read: 'Nur lesen', live: 'Live', connecting: 'Verbinde', waiting: 'Die Worte erscheinen hier, sobald jemand spricht.' },
}
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
const CONJ = new Set(['and', 'but', 'so', 'because', 'which', 'who', 'that', 'when', 'then', 'or', 'while', 'if', 'although', 'since', 'until', 'where'])

async function tr(text: string, tl: string): Promise<{ text: string; src: string }> {
  const q = encodeURIComponent(text)
  try {
    const r = await fetch('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=' + tl + '&q=' + q)
    if (r.ok) { const j = await r.json(); const v = Array.isArray(j?.[0]) ? j[0] : [j?.[0], '']; if (typeof v[0] === 'string' && v[0].trim()) return { text: v[0].trim(), src: String(v[1] || '') } }
  } catch {}
  try {
    const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + tl + '&dt=t&q=' + q)
    if (r.ok) { const j = await r.json(); const v = (j?.[0] ?? []).map((x: any) => x?.[0] ?? '').join('').trim(); if (v) return { text: v, src: String(j?.[2] || '') } }
  } catch {}
  return { text: '', src: '' }
}
function moodOf(en: string): string {
  const s = en.toLowerCase()
  if (/\b(ha(ha)+|lol|hilarious|funny|joke|laugh)/.test(s)) return 'amused'
  if (/\b(passed away|miss (him|her|you|them)|tears|crying|in heaven|wish (he|she|they) (was|were) here)\b/.test(s)) return 'emotional'
  if (/!|\b(cheers|congratulations|congrats|raise your glass|let'?s (dance|party|celebrate|go)|woo+|amazing|incredible|best day)\b/.test(s)) return 'excited'
  if (/\b(love|heart|grateful|thankful|thank you|blessed|forever|together|beautiful|family)\b/.test(s)) return 'warm'
  return ''
}

const CSS = `
:root{--ground:#0b0b0c;--raised:#18181a;--raised-2:#232326;--ink:#f5f5f7;--muted:#8e8e93;--faint:#4a4a4f;--gold:#e2c18f;--gold-ink:#1b1408;--rec:#ff453a;
--sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,system-ui,sans-serif;--display:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,system-ui,sans-serif;color-scheme:dark}
*{box-sizing:border-box}
html,body{height:100%;margin:0;background:var(--ground);color:var(--ink);font:17px/1.47 var(--sans);letter-spacing:-.01em;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
button,select,input{font:inherit;color:inherit}
button{cursor:pointer;touch-action:manipulation}
:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.app{max-width:640px;margin:0 auto;min-height:100dvh;display:flex;flex-direction:column;
padding:max(14px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}
.bar{display:flex;align-items:center;gap:10px;min-height:44px}
.status{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--muted)}
.status i{width:8px;height:8px;border-radius:50%;background:var(--faint);transition:background .3s}
.status.on i{background:var(--gold)}
.status.rec i{background:var(--rec)}
.spacer{flex:1}
.pill{position:relative;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:999px;background:var(--raised);border:0;font-size:15px;font-weight:600;transition:transform .12s ease-out,background .2s}
.pill:active{transform:scale(.96)}
.pill select{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}
.icon-btn{width:36px;height:36px;border-radius:50%;border:0;background:var(--raised);display:grid;place-items:center;transition:transform .12s ease-out,background .2s}
.icon-btn:active{transform:scale(.92)}
.icon-btn.on{background:var(--gold);color:var(--gold-ink)}
svg{display:block}

/* onboarding */
.onb{flex:1;display:flex;flex-direction:column;justify-content:center;gap:28px;padding-block:24px}
.onb h1{font:600 clamp(2.25rem,9vw,3rem)/1.04 var(--display);letter-spacing:-.035em;margin:0;text-wrap:balance}
.onb .lead{margin:-14px 0 0;color:var(--muted);font-size:17px}
.langs{display:flex;flex-direction:column;background:var(--raised);border-radius:18px;overflow:hidden}
.lang{display:flex;align-items:center;gap:12px;padding:14px 18px;border:0;background:none;text-align:left;min-height:56px;transition:background .15s}
.lang+.lang{box-shadow:inset 0 1px 0 var(--raised-2)}
.lang:active{background:var(--raised-2)}
.lang b{font-weight:600;font-size:17px}
.lang span{color:var(--muted);font-size:15px}
.lang .chk{margin-left:auto;color:var(--gold);opacity:0;transition:opacity .15s}
.lang.sel .chk{opacity:1}
.actions{display:flex;flex-direction:column;gap:10px}
.btn{height:56px;border-radius:16px;border:0;font-weight:600;font-size:17px;display:flex;align-items:center;justify-content:center;gap:10px;transition:transform .12s ease-out,opacity .2s}
.btn:active{transform:scale(.97)}
.btn.pri{background:var(--gold);color:var(--gold-ink)}
.btn.sec{background:var(--raised);color:var(--ink)}

/* live captions */
.stage{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:22px;padding-block:24px 8px;overflow:hidden}
.history{display:flex;flex-direction:column;gap:14px;mask-image:linear-gradient(to bottom,transparent,#000 60%);-webkit-mask-image:linear-gradient(to bottom,transparent,#000 60%);max-height:42vh;overflow:hidden;justify-content:flex-end}
.history p{margin:0;color:var(--muted);font-size:19px;line-height:1.35;letter-spacing:-.015em}
.history p.speaking{color:var(--ink)}
.now{min-height:30vh;display:flex;flex-direction:column;justify-content:flex-end}
.now .t{margin:0;font:600 clamp(2rem,7.6vw,3.1rem)/1.12 var(--display);letter-spacing:-.03em;overflow-wrap:anywhere;text-wrap:pretty}
.now .t.speaking{color:var(--ink)}
.now .src{margin:12px 0 0;color:var(--muted);font-size:15px;line-height:1.4}
.w{display:inline-block;animation:rise .42s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(.28em)}to{opacity:1;transform:none}}
.waiting{color:var(--muted);font-size:21px;line-height:1.35;margin:0;max-width:22ch}
.eq{display:inline-flex;gap:2px;align-items:flex-end;height:12px}
.eq i{width:3px;background:currentColor;border-radius:2px;animation:eq 0.9s ease-in-out infinite}
.eq i:nth-child(2){animation-delay:.15s}.eq i:nth-child(3){animation-delay:.3s}
@keyframes eq{0%,100%{height:3px}50%{height:12px}}

/* host */
.host{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;text-align:center;padding-block:16px}
.orb{position:relative;width:min(58vw,224px);aspect-ratio:1;border-radius:50%;border:0;background:var(--raised);color:var(--gold);display:grid;place-items:center;transition:transform .14s ease-out,background .25s,color .25s}
.orb:active{transform:scale(.96)}
.orb::before{content:"";position:absolute;inset:-14px;border-radius:50%;background:var(--raised);opacity:calc(.35 + var(--lv,0)*.65);transform:scale(calc(.94 + var(--lv,0)*.16));z-index:-1;transition:opacity .08s linear}
.orb.live{background:var(--rec);color:#fff}
.orb.live::before{background:rgba(255,69,58,.28)}
.orb svg{width:64px;height:64px}
.host h2{margin:0;font:600 28px/1.1 var(--display);letter-spacing:-.025em}
.host .sub{margin:-22px 0 0;color:var(--muted);font-size:17px;max-width:30ch}
.feed{width:100%;display:flex;flex-direction:column;gap:6px;min-height:6.5em}
.feed .heard{color:var(--muted);font-size:17px;margin:0;min-height:1.5em}
.feed .said{font:600 22px/1.25 var(--display);letter-spacing:-.02em;margin:0}
.foot{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.chip{height:36px;padding:0 14px;border-radius:999px;border:0;background:var(--raised);font-size:15px;font-weight:600;display:inline-flex;align-items:center;gap:8px;transition:transform .12s ease-out}
.chip:active{transform:scale(.96)}
.chip.ok{color:var(--gold)}
.chip.warn{color:var(--rec)}
.seg{display:inline-flex;background:var(--raised);border-radius:999px;padding:3px;gap:2px}
.seg button{height:30px;padding:0 12px;border:0;border-radius:999px;background:none;color:var(--muted);font-size:14px;font-weight:600;transition:background .2s,color .2s}
.seg button.on{background:var(--raised-2);color:var(--ink)}
.seg button:disabled{opacity:.55}
.opts{display:flex;gap:8px;flex-wrap:wrap;padding-top:10px}
.opts .pill{max-width:100%}
.pill.mic svg:first-child{width:16px;height:16px;flex:none}
.ell{max-width:42vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.host.alice{gap:22px;justify-content:flex-start;padding-top:28px}
.host.alice .orb{width:min(40vw,150px)}
.host.alice .orb svg{width:44px;height:44px}
.host.alice .sub{margin-top:-14px}
.alog{width:100%;display:flex;flex-direction:column;gap:14px;text-align:left}
.aline .t{margin:0;font:600 22px/1.25 var(--display);letter-spacing:-.02em;color:var(--muted);transition:color .2s}
.aline:last-of-type .t,.aline.playing .t{color:var(--ink)}
.aline .s{margin:4px 0 0;font-size:14px;color:var(--faint)}
.aline.same .t{font:400 16px/1.4 var(--sans);color:var(--faint)}
.field{height:56px;border-radius:16px;border:0;background:var(--raised);padding:0 18px;font-size:17px}
.btn:disabled{opacity:.5}
.sheet{position:fixed;inset:auto 0 0 0;background:var(--raised);border-radius:22px 22px 0 0;padding:22px max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));display:flex;flex-direction:column;gap:14px;animation:up .32s cubic-bezier(.2,.8,.2,1) both;z-index:5}
.sheet h3{margin:0;font:600 20px var(--display);letter-spacing:-.02em}
.sheet p{margin:0;color:var(--muted);font-size:15px}
.sheet input{height:50px;border-radius:14px;border:0;background:var(--raised-2);padding:0 16px;font-size:17px}
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:4;animation:fade .2s both}
@keyframes up{from{transform:translateY(100%)}to{transform:none}}
@keyframes fade{from{opacity:0}}
@media (prefers-reduced-motion:reduce){.w{animation:fadeonly .3s both}@keyframes fadeonly{from{opacity:0}}.sheet{animation:fade .2s both}.eq i{animation:none;height:8px}.orb::before{transition:none}}
`

function Words({ text, k }: { text: string; k: number }) {
  return <>{text.split(' ').map((w, i) => <span key={k + '-' + i}><span className="w" style={{ animationDelay: Math.min(i * 38, 900) + 'ms' }}>{w}</span>{' '}</span>)}</>
}
const MicIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>)
const StopIcon = () => (<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2.5" /></svg>)
const PhonesIcon = ({ s = 20 }: { s?: number }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></svg>)
const MutedIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m16 9 5 6M21 9l-5 6" /></svg>)
const Check = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>)
const Chevron = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>)

function Index() {
  const [mode, setMode] = useState<'loading' | 'host' | 'guest' | 'admin'>('loading')
  const [key, setKey] = useState('')
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('host')
    const ad = new URLSearchParams(window.location.search).get('admin')
    if (ad) { setKey(ad); setMode('admin') } else if (k) { setKey(k); setMode('host') } else setMode('guest')
  }, [])
  return (
    <>
      <style>{CSS}</style>
      {mode === 'host' && <Host hostKey={key} />}
      {mode === 'guest' && <Guest />}
      {mode === 'admin' && <Admin adminKey={key} />}
    </>
  )
}

/* ───────────── HOST ───────────── */
function Host({ hostKey }: { hostKey: string }) {
  const [live, setLive] = useState(false)
  const [heard, setHeardState] = useState('')
  const heardRef = useRef('')
  const setHeard = (h: string) => { heardRef.current = h; setHeardState(h) }
  const [said, setSaid] = useState('')
  const [note, setNote] = useState('')
  const [xi, setXi] = useState('')
  const [sheet, setSheet] = useState(false)
  const [draft, setDraft] = useState('')
  const [count, setCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const liveRef = useRef(false)
  const recRef = useRef<any>(null)
  const xiRef = useRef('')
  const orbRef = useRef<HTMLButtonElement>(null)
  const level = useRef(0)
  const ck = useRef({ idx: -1, committed: 0, start: 0, lastEmit: 0 })
  const wsRef = useRef<WebSocket | null>(null)
  const micRef = useRef<{ ctx: AudioContext; stream: MediaStream } | null>(null)
  const [engine, setEngine] = useState<'' | 'scribe' | 'chrome'>('')
  const [warn, setWarn] = useState('')
  const wantRef = useRef<string[]>(['es'])
  const [shared, setShared] = useState(false)
  const sharedRef = useRef(false)
  const ctxRef = useRef<AudioContext | null>(null)
  // Modo Alice: this phone listens AND plays the translation in your headphones
  const [mode, setModeState] = useState<'event' | 'alice'>('event')
  const modeRef = useRef<'event' | 'alice'>('event')
  const [target, setTargetState] = useState('es')
  const targetRef = useRef('es')
  const [mics, setMics] = useState<{ id: string; label: string }[]>([])
  const [micId, setMicIdState] = useState('')
  const micIdRef = useRef('')
  const [log, setLog] = useState<{ id: number; src: string; text: string; same: boolean }[]>([])
  const [playingId, setPlayingId] = useState(0)
  const player = useRef<HTMLAudioElement | null>(null)
  const aq = useRef<{ id: number; p: Promise<string | null>; text: string }[]>([])
  const aPlaying = useRef(false)
  const lastSpoken = useRef('')
  const spokenRef = useRef<{ t: number; w: Set<string> }[]>([])
  const heardRecent = useRef<{ t: number; k: string }[]>([])
  const seq = useRef(0)
  const setMode = (m: 'event' | 'alice') => { modeRef.current = m; setModeState(m); try { localStorage.setItem('alma-mode', m) } catch {} }
  const setTarget = (t: string) => { targetRef.current = t; setTargetState(t); try { localStorage.setItem('alice-lang', t) } catch {} }
  const setMicId = (id: string) => { micIdRef.current = id; setMicIdState(id); try { localStorage.setItem('alice-mic', id) } catch {} }

  useEffect(() => {
    try { (navigator as any).wakeLock?.request('screen') } catch {}
    try { const k = localStorage.getItem('alma-xi') || ''; setXi(k); xiRef.current = k } catch {}
    try {
      // ?modo=alice or ?modo=evento in the link always wins over the last mode used
      const qm = new URLSearchParams(window.location.search).get('modo')
      const m = qm === 'alice' ? 'alice' : qm === 'evento' ? 'event' : localStorage.getItem('alma-mode')
      if (m === 'alice') { modeRef.current = 'alice'; setModeState('alice') } else if (qm === 'evento') { modeRef.current = 'event'; setModeState('event') }
      const t = localStorage.getItem('alice-lang'); if (t && LANGS.some(l => l.code === t)) { targetRef.current = t; setTargetState(t) }
      const id = localStorage.getItem('alice-mic') || ''; micIdRef.current = id; setMicIdState(id)
    } catch {}
    player.current = new Audio()
    fetch('/api/config', { cache: 'no-store' }).then(r => r.json()).then(j => { sharedRef.current = !!j.voice; setShared(!!j.voice) }).catch(() => {})
    refreshMics()
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshMics)
    let raf = 0
    const loop = () => { level.current *= 0.9; orbRef.current?.style.setProperty('--lv', level.current.toFixed(3)); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    let stop = false
    const poll = async () => {
      try { const r = await fetch('/api/lines?after=999999999&count=1', { cache: 'no-store' }); const j = await r.json(); setCount(j.listeners ?? 0); if (Array.isArray(j.want)) wantRef.current = j.want } catch {}
      if (!stop) setTimeout(poll, 5000)
    }
    poll()
    return () => { cancelAnimationFrame(raf); stop = true }
  }, [])

  // Pick the phone's own mic, never the headset's, so the headphones keep full-quality audio.
  const HEADSET = /bluetooth|airpods|buds|headset|hands-?free|wh-|jabra|beats|bose|sony|auricular|casque|kopfh/i
  async function refreshMics() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const list = all.filter(d => d.kind === 'audioinput' && d.deviceId).map((d, i) => ({ id: d.deviceId, label: d.label || 'Micrófono ' + (i + 1) }))
      setMics(list)
      if (micIdRef.current && !list.some(d => d.id === micIdRef.current)) setMicId('')
    } catch {}
  }
  function unlockPlayer() { const a = player.current; if (a) { a.src = SILENT; a.play().catch(() => {}) } }
  function words(x: string) {
    return x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1)
  }
  function isEcho(src: string) {
    const w = words(src)
    if (!w.length) return true
    const now = Date.now()
    spokenRef.current = spokenRef.current.filter(x => now - x.t < 30000)
    heardRecent.current = heardRecent.current.filter(x => now - x.t < 10000)
    // mostly the same words Alma said in the last 30 s → it is her voice coming back through the mic
    if (spokenRef.current.some(x => w.filter(v => x.w.has(v)).length / w.length >= 0.5)) return true
    const key = w.join(' ')
    if (heardRecent.current.some(x => x.k === key)) return true
    heardRecent.current.push({ t: now, k: key })
    return false
  }
  function speak(text: string, id: number) {
    spokenRef.current.push({ t: Date.now(), w: new Set(words(text)) })
    const lang = targetRef.current, prev = lastSpoken.current
    lastSpoken.current = text
    const p = (async () => {
      for (let i = 0; i < 2; i++) {
        try {
          const r = await fetch('/api/speak?k=' + encodeURIComponent(hostKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang, prev, xi: xiRef.current }) })
          if (r.ok) { const b = await r.blob(); if (b.size > 500) return URL.createObjectURL(b) }
        } catch {}
      }
      return null
    })()
    aq.current.push({ id, p, text }); playNext()
  }
  async function playNext() {
    if (aPlaying.current || !aq.current.length) return
    const item = aq.current.shift()!
    aPlaying.current = true; setPlayingId(item.id)
    const url = await item.p
    const done = () => { aPlaying.current = false; setPlayingId(0); playNext() }
    if (url && player.current) {
      const a = player.current
      a.src = url
      a.playbackRate = Math.min(1.4, 1.05 * (1 + 0.08 * Math.min(4, aq.current.length)))
      ;(a as any).preservesPitch = true
      a.onended = () => { URL.revokeObjectURL(url); done() }
      try { await a.play(); return } catch {}
    }
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(item.text); u.lang = targetRef.current; u.rate = 1.1
      u.onend = done; u.onerror = done; window.speechSynthesis.speak(u)
    } else done()
  }
  async function sendAlice(src: string) {
    if (isEcho(src)) return
    const t = targetRef.current
    let r = await tr(src, t)
    if (!r.text) {
      try {
        const x = await fetch('/api/translate?k=' + encodeURIComponent(hostKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: src, langs: [t] }) })
        const j = await x.json(); r = { text: j.out?.[t] || '', src: '' }
      } catch {}
    }
    if (!r.text) { setWarn('El traductor no respondió en este fragmento.'); return }
    setWarn('')
    // Your own words (already in your language) are shown but not read back to you.
    const same = !!r.src && r.src.slice(0, 2) === t
    if (!same && spokenRef.current.some(x => { const w = words(r.text); return w.length > 0 && w.filter(v => x.w.has(v)).length / w.length >= 0.7 })) return
    const id = ++seq.current
    setLog(prev => [...prev, { id, src, text: same ? src : r.text, same }].slice(-12))
    if (!same) speak(r.text, id)
  }

  function saveKey() {
    const k = draft.trim(); setXi(k); xiRef.current = k; setSheet(false); setDraft('')
    try { localStorage.setItem('alma-xi', k) } catch {}
  }

  async function send(src: string, pace: number) {
    if (modeRef.current === 'alice') { sendAlice(src); return }
    try {
      const want = Array.from(new Set(['es', ...wantRef.current]))
      const out: Record<string, string> = {}
      const first = await tr(src, 'es')
      if (first.text) out.es = first.text
      const isEn = (first.src || '').startsWith('en') || (!first.src && /^[\x00-\x7F]*$/.test(src))
      if (isEn) out.en = src
      const need = want.filter(l => !out[l]).concat(out.en ? [] : ['en'])
      await Promise.all(need.map(async l => { const r = await tr(src, l); if (r.text) out[l] = r.text }))
      const missing = Array.from(new Set(['es', 'en', ...want])).filter(l => !out[l])
      if (missing.length) {
        try {
          const r = await fetch('/api/translate?k=' + encodeURIComponent(hostKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: src, langs: missing }) })
          const j = await r.json(); Object.assign(out, j.out || {})
        } catch {}
      }
      if (!out.es) { setWarn('El traductor no respondió en este fragmento.'); return }
      setWarn('')
      const en = out.en || src
      setSaid(out.es)
      const r = await fetch('/api/lines?k=' + encodeURIComponent(hostKey), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ en, es: out.es, tx: { fr: out.fr, pt: out.pt, it: out.it, de: out.de }, pace, mood: moodOf(en), xi: xiRef.current }),
      })
      if (r.status === 403) setWarn('Este link de host no es válido.')
    } catch { setWarn('Sin conexión. Reintento con la siguiente frase.') }
  }

  // Cut speech into short phrases while the person is still talking.
  function emit(words: string[]) {
    const c = ck.current
    const secs = Math.max(0.6, (Date.now() - (c.start || Date.now())) / 1000)
    const pace = words.length / secs
    c.start = Date.now(); c.lastEmit = Date.now()
    const text = words.join(' ').trim()
    if (text) send(text, pace)
  }
  function cutPoint(p: string[], force: boolean): number {
    let best = 0
    for (let i = 3; i <= p.length; i++) {
      if (/[,.;:?!]$/.test(p[i - 1]) || (i < p.length && CONJ.has(p[i].toLowerCase()))) best = i
    }
    if (best >= 4) return best
    if (p.length >= 10) return best >= 3 ? best : p.length
    if (force && p.length >= 3) return p.length
    return 0
  }
  function onResult(e: any) {
    level.current = 1
    const c = ck.current
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      const words = String(res[0].transcript).trim().split(/\s+/).filter(Boolean)
      if (i !== c.idx) { c.idx = i; c.committed = 0; if (!c.start) c.start = Date.now() }
      if (!c.start) c.start = Date.now()
      if (res.isFinal) {
        const rest = words.slice(c.committed)
        if (rest.length) emit(rest)
        c.committed = 0; c.idx = i + 1; c.start = 0
      } else {
        const stable = words.slice(c.committed, Math.max(c.committed, words.length - 2))
        const force = Date.now() - Math.max(c.lastEmit, c.start) > 2400
        const cut = cutPoint(stable, force)
        if (cut > 0) { emit(stable.slice(0, cut)); c.committed += cut }
        interim += words.slice(c.committed).join(' ')
      }
    }
    setHeard(interim)
  }

  /* ElevenLabs Scribe: partial text while speaking, committed text at each pause */
  function onPartial(text: string) {
    const c = ck.current
    const words = text.trim().split(/\s+/).filter(Boolean)
    if (!c.start) c.start = Date.now()
    if (words.length < c.committed) return
    const stable = words.slice(c.committed, Math.max(c.committed, words.length - 2))
    const force = Date.now() - Math.max(c.lastEmit, c.start) > 2400
    const cut = cutPoint(stable, force)
    if (cut > 0) { emit(stable.slice(0, cut)); c.committed += cut }
    setHeard(words.slice(c.committed).join(' '))
  }
  function onCommitted(text: string) {
    const c = ck.current
    const words = text.trim().split(/\s+/).filter(Boolean)
    const rest = words.slice(c.committed)
    if (rest.length) emit(rest)
    c.committed = 0; c.start = 0
    setHeard('')
  }
  function b64(buf: ArrayBuffer) {
    const u = new Uint8Array(buf); let s = ''
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(u.subarray(i, i + 0x8000)))
    return btoa(s)
  }
  const failRef = useRef('')
  async function getToken(): Promise<string> {
    try {
      const r = await fetch('/api/stt-token?k=' + encodeURIComponent(hostKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ xi: xiRef.current }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.token) {
        const d = String(j.detail || '')
        failRef.current = /permission|speech_to_text|missing_permissions/i.test(d) ? 'Tu API key no tiene permiso de Speech to Text. Edítala en ElevenLabs y actívalo.'
          : j.status === 401 ? 'ElevenLabs rechazó la API key (401). Vuelve a pegarla.'
          : 'ElevenLabs no dio acceso al oído (' + (j.status || j.error || r.status) + ').'
        return ''
      }
      return j.token
    } catch { failRef.current = 'Sin conexión con el servidor.'; return '' }
  }
  async function openSocket(attempt = 0): Promise<boolean> {
    const token = await getToken()
    if (!token) return false
    const q = new URLSearchParams({ model_id: 'scribe_v2_realtime', token, audio_format: 'pcm_16000', commit_strategy: 'vad', vad_silence_threshold_secs: '0.7' })
    return new Promise(resolve => {
      const ws = new WebSocket('wss://api.elevenlabs.io/v1/speech-to-text/realtime?' + q.toString())
      let ok = false
      const t = setTimeout(() => { if (!ok) { try { ws.close() } catch {} resolve(false) } }, 7000)
      ws.onmessage = ev => {
        let m: any; try { m = JSON.parse(String(ev.data)) } catch { return }
        const type = String(m.message_type || '')
        if (type === 'session_started') { ok = true; clearTimeout(t); resolve(true) }
        else if (type === 'partial_transcript') onPartial(m.text || '')
        else if (type === 'committed_transcript') onCommitted(m.text || '')
        else if (/error|limit|exceeded/i.test(type)) { failRef.current = 'ElevenLabs: ' + (m.error || type); setNote(failRef.current) }
      }
      ws.onerror = () => { if (!ok) { failRef.current = failRef.current || 'No se pudo abrir la conexión de audio con ElevenLabs.'; clearTimeout(t); resolve(false) } }
      ws.onclose = () => {
        if (!ok) { clearTimeout(t); resolve(false); return }
        if (liveRef.current && wsRef.current === ws) {
          wsRef.current = null
          const h = heardRef.current; if (h) onCommitted(h)
          ck.current = { idx: -1, committed: 0, start: 0, lastEmit: Date.now() }
          setTimeout(() => { if (liveRef.current) openSocket(attempt + 1).then(r => { if (!r && liveRef.current) setNote('Se perdió la conexión con ElevenLabs. Toca detener y vuelve a empezar.') }) }, attempt ? 1000 : 0)
        }
      }
      wsRef.current = ws
    })
  }
  async function startScribe(): Promise<boolean> {
    try {
      const ctx = ctxRef.current || new AudioContext()
      ctxRef.current = null
      const alice = modeRef.current === 'alice'
      // In Alice mode echo cancellation is off: on many phones it switches Bluetooth headphones into low-quality "call" mode.
      // Echo cancellation stays on: it removes Alma's own voice from the mic so she never translates herself.
      const audioC: any = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
      if (alice && micIdRef.current) audioC.deviceId = { exact: micIdRef.current }
      let stream: MediaStream
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: audioC }) }
      catch { delete audioC.deviceId; stream = await navigator.mediaDevices.getUserMedia({ audio: audioC }) }
      refreshMics()
      micRef.current = { ctx, stream }
      await ctx.resume().catch(() => {})
      await ctx.audioWorklet.addModule('/pcm-worklet.js')
      const node = new AudioWorkletNode(ctx, 'pcm16')
      const mute = ctx.createGain(); mute.gain.value = 0
      ctx.createMediaStreamSource(stream).connect(node); node.connect(mute); mute.connect(ctx.destination)
      node.port.onmessage = (e: MessageEvent) => {
        level.current = Math.max(level.current, Math.min(1, (e.data.lv || 0) * 7))
        const ws = wsRef.current
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: b64(e.data.pcm), commit: false, sample_rate: 16000 }))
      }
      if (await openSocket()) return true
      stopMic(); return false
    } catch (e: any) { failRef.current = failRef.current || ('Micrófono: ' + (e?.message || 'sin permiso')); stopMic(); return false }
  }
  function stopMic() {
    const m = micRef.current; micRef.current = null
    if (m) { m.stream.getTracks().forEach(t => t.stop()); m.ctx.close().catch(() => {}) }
  }

  /* Fallback: Chrome's built-in recognition */
  function startChrome() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setNote('Este navegador no reconoce voz. Conecta la voz de Alma o abre el link en Chrome.'); stop(); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1
    rec.onresult = onResult
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { setNote('Permite el micrófono para este sitio y vuelve a tocar.'); stop() }
    }
    rec.onend = () => { ck.current = { idx: -1, committed: 0, start: 0, lastEmit: Date.now() }; if (liveRef.current) { try { rec.start() } catch {} } }
    recRef.current = rec
    try { rec.start() } catch {}
  }

  async function start() {
    try { ctxRef.current = new AudioContext() } catch {}
    ck.current = { idx: -1, committed: 0, start: 0, lastEmit: Date.now() }
    failRef.current = ''; setWarn(''); setSaid(''); setHeard('')
    liveRef.current = true; setLive(true); setNote('Conectando el oído de ElevenLabs…')
    if (modeRef.current === 'alice') { unlockPlayer(); setLog([]); aq.current = []; lastSpoken.current = ''; spokenRef.current = []; heardRecent.current = [] }
    else fetch('/api/session?k=' + encodeURIComponent(hostKey), { method: 'POST' }).catch(() => {})
    if ((xiRef.current || sharedRef.current) && await startScribe()) {
      if (!liveRef.current) { stopMic(); try { wsRef.current?.close() } catch {} return }
      setEngine('scribe'); setNote(''); return
    }
    if (!liveRef.current) return
    setEngine('chrome')
    setNote((xiRef.current || sharedRef.current) ? (failRef.current || 'No se pudo conectar ElevenLabs.') + ' Usando el oído del teléfono.' : 'Conecta la voz de Alma para usar el oído de ElevenLabs. Usando el oído del teléfono.')
    startChrome()
  }
  function stop() {
    liveRef.current = false; setLive(false); setHeard(''); setEngine('')
    aq.current = []; try { player.current?.pause() } catch {} ; aPlaying.current = false; setPlayingId(0)
    const ws = wsRef.current; wsRef.current = null
    if (ws) {
      try { if (ws.readyState === 1) ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: '', commit: true, sample_rate: 16000 })) } catch {}
      setTimeout(() => { try { ws.close() } catch {} }, 1500)
    }
    stopMic()
    try { recRef.current?.stop() } catch {}
    recRef.current = null
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.origin); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }

  const alice = mode === 'alice'
  const micLabel = mics.find(m => m.id === micId)?.label || 'Micrófono automático'
  const tLabel = LANGS.find(l => l.code === target)?.label
  const recent = log.slice(-4)
  return (
    <div className="app">
      <div className="bar">
        <span className={'status' + (live ? ' rec' : '')}><i />{live ? (alice ? 'Alice' : 'Traduciendo') : (alice ? 'Modo Alice' : 'Modo evento')}</span>
        <span className="spacer" />
        {!alice && <span className="status"><PhonesIcon s={16} />{count}</span>}
        <div className="seg" role="tablist" aria-label="Modo">
          <button role="tab" aria-selected={!alice} className={!alice ? 'on' : ''} disabled={live} onClick={() => setMode('event')}>Evento</button>
          <button role="tab" aria-selected={alice} className={alice ? 'on' : ''} disabled={live} onClick={() => setMode('alice')}>Alice</button>
        </div>
      </div>
      {alice && (
        <div className="opts">
          <span className="pill">Oír en {tLabel}<Chevron />
            <select value={target} onChange={e => setTarget(e.target.value)} aria-label="Idioma que quieres oír">
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </span>
          <span className="pill mic"><MicIcon /><span className="ell">{micLabel}</span><Chevron />
            <select value={micId} onChange={e => setMicId(e.target.value)} onFocus={refreshMics} disabled={live} aria-label="Micrófono">
              <option value="">Automático (recomendado)</option>
              {mics.map(m => <option key={m.id} value={m.id}>{m.label}{HEADSET.test(m.label) ? ' (audífonos)' : ' (puede sacar el sonido por la bocina)'}</option>)}
            </select>
          </span>
        </div>
      )}
      <div className={'host' + (alice ? ' alice' : '')}>
        <button ref={orbRef} className={'orb' + (live ? ' live' : '')} onClick={() => (live ? stop() : start())} aria-label={live ? 'Detener' : 'Empezar a traducir'}>
          {live ? <StopIcon /> : <MicIcon />}
        </button>
        <h2>{live ? 'Escuchando' : 'Toca para empezar'}</h2>
        <p className="sub">{note || (alice
          ? (live ? 'Deja el teléfono en la mesa. Oyes la traducción en tus audífonos.' : 'Conecta tus audífonos antes de empezar y deja el teléfono en la mesa.')
          : (live ? (engine === 'scribe' ? 'Oído de ElevenLabs activo. Apunta hacia quien habla.' : 'Apunta el teléfono hacia quien habla.') : 'Traduce a español y 4 idiomas más.'))}</p>
        {alice ? (
          <div className="alog">
            {recent.map(l => (
              <div key={l.id} className={'aline' + (l.same ? ' same' : '') + (playingId === l.id ? ' playing' : '')}>
                <p className="t">{l.text}</p>
                {!l.same && <p className="s">{l.src}</p>}
              </div>
            ))}
            {heard && <p className="heard">{heard}</p>}
            {warn && <p className="heard" style={{ color: 'var(--rec)' }}>{warn}</p>}
          </div>
        ) : (
          <div className="feed">
            <p className="heard">{heard}</p>
            <p className="said">{said}</p>
            {warn && <p className="heard" style={{ color: 'var(--rec)' }}>{warn}</p>}
          </div>
        )}
      </div>
      <div className="foot">
        {(xi || !shared) && <button className={'chip ' + (xi || shared ? 'ok' : 'warn')} onClick={() => setSheet(true)}>{xi ? 'Voz de Alma activa' : 'Conectar voz de Alma'}</button>}
        {shared && !xi && <span className="chip ok">Voz de Alma activa</span>}
        {!alice && <button className="chip" onClick={copyLink}>{copied ? 'Link copiado' : 'Copiar link de invitados'}</button>}
      </div>
      {sheet && (<>
        <div className="scrim" onClick={() => setSheet(false)} />
        <form className="sheet" onSubmit={e => { e.preventDefault(); saveKey() }}>
          <h3>Voz de Alma</h3>
          <p>Pega tu API key de ElevenLabs. Se guarda solo en este teléfono.</p>
          <input id="xi" type="password" autoComplete="off" placeholder="sk_…" value={draft} onChange={e => setDraft(e.target.value)} />
          <button className="btn pri" type="submit">Guardar</button>
        </form>
      </>)}
    </div>
  )
}

/* ───────────── GUEST ───────────── */
function Guest() {
  const [lines, setLines] = useState<Line[]>([])
  const [chosen, setChosen] = useState(false)
  const [voice, setVoice] = useState(false)
  const [lang, setLang] = useState('es')
  const [online, setOnline] = useState(false)
  const [speaking, setSpeaking] = useState(0)
  const voiceRef = useRef(false)
  const langRef = useRef('es')
  const lastId = useRef(0)
  const first = useRef(true)
  const sid = useRef('')
  const lastHb = useRef(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const queue = useRef<{ l: Line; p: Promise<string | null> }[]>([])
  const playing = useRef(false)
  const sessionRef = useRef<number | null>(null)

  useEffect(() => {
    let init = 'es'
    try { const s = localStorage.getItem('boda-lang'); if (s && LANGS.some(l => l.code === s)) init = s; else { const n = (navigator.language || 'es').slice(0, 2); if (LANGS.some(l => l.code === n)) init = n } } catch {}
    setLang(init); langRef.current = init
    sid.current = crypto.randomUUID()
    try { (navigator as any).wakeLock?.request('screen') } catch {}
    audio.current = new Audio()
    let stop = false
    const tick = async () => {
      try {
        const hb = Date.now() - lastHb.current > 10000
        if (hb) lastHb.current = Date.now()
        const q = '/api/lines?after=' + lastId.current + '&lang=' + langRef.current + '&sid=' + sid.current + (hb ? '&hb=1&audio=' + (voiceRef.current ? '1' : '0') : '')
        const r = await fetch(q, { cache: 'no-store' })
        const j = await r.json()
        setOnline(true)
        if (j.session != null && sessionRef.current !== null && j.session !== sessionRef.current) {
          // host started a new session: clear the screen and the audio queue
          setLines([]); queue.current = []; lastId.current = 0
        }
        if (j.session != null) sessionRef.current = j.session
        const fresh: Line[] = j.lines ?? []
        if (fresh.length) {
          lastId.current = fresh[fresh.length - 1].id
          setLines(prev => [...prev, ...fresh].slice(-14))
          if (!first.current && voiceRef.current) { const code = langRef.current; fresh.forEach(l => queue.current.push({ l, p: load(l, code) })); next() }
        }
        first.current = false
      } catch { setOnline(false) }
      if (!stop) setTimeout(tick, 450)
    }
    tick()
    return () => { stop = true }
  }, [])

  // Start fetching each phrase's audio the moment it arrives, so playback never waits in line.
  function load(l: Line, code: string): Promise<string | null> {
    const src = '/api/audio?id=' + l.id + '&lang=' + code
    return (async () => {
      for (let i = 0; i < 80; i++) {
        if (!voiceRef.current) return null
        try {
          const r = await fetch(src, { cache: 'no-store' })
          if (r.ok) { const b = await r.blob(); if (b.size > 500) return URL.createObjectURL(b) }
        } catch {}
        await new Promise(res => setTimeout(res, 250))
      }
      return null
    })()
  }
  async function next() {
    if (playing.current || !queue.current.length) return
    const item = queue.current.shift()!
    playing.current = true
    setSpeaking(item.l.id)
    const url = await item.p
    if (!voiceRef.current) { playing.current = false; setSpeaking(0); return }
    if (url) {
      const a = audio.current!
      a.src = url
      // keep up with the speaker instead of skipping: play a little faster when phrases pile up
      const base = Math.min(1.15, Math.max(1.0, (item.l.pace || 2.6) / 2.6))
      a.playbackRate = Math.min(1.4, base * (1 + 0.08 * Math.min(4, queue.current.length)))
      ;(a as any).preservesPitch = true
      a.onended = () => { URL.revokeObjectURL(url); playing.current = false; setSpeaking(0); next() }
      try { await a.play(); return } catch {}
    }
    fallbackSpeak(item.l.text)
  }
  function fallbackSpeak(text: string) {
    if (!('speechSynthesis' in window) || !text) { playing.current = false; setSpeaking(0); next(); return }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = langRef.current; u.rate = 1.1
    const done = () => { playing.current = false; setSpeaking(0); next() }
    u.onend = done; u.onerror = done
    window.speechSynthesis.speak(u)
  }

  function pickLang(code: string) {
    setLang(code); langRef.current = code
    try { localStorage.setItem('boda-lang', code) } catch {}
    queue.current = []; lastId.current = 0; first.current = true; setLines([]); lastHb.current = 0
    if (audio.current && !audio.current.paused) { audio.current.pause(); playing.current = false; setSpeaking(0) }
  }
  function unlock() { if (audio.current) { audio.current.src = SILENT; audio.current.play().catch(() => {}) } }
  function choose(on: boolean) { voiceRef.current = on; setVoice(on); setChosen(true); lastHb.current = 0; if (on) unlock() }
  function toggle() {
    const on = !voice; voiceRef.current = on; setVoice(on); lastHb.current = 0
    if (on) unlock(); else { queue.current = []; audio.current?.pause(); playing.current = false; setSpeaking(0) }
  }

  const t = UI[lang] || UI.es
  if (!chosen) {
    return (
      <div className="app">
        <div className="onb">
          <h1>{t.title}</h1>
          <p className="lead">{t.choose}</p>
          <div className="langs" role="radiogroup">
            {LANGS.map(l => (
              <button key={l.code} role="radio" aria-checked={lang === l.code} className={'lang' + (lang === l.code ? ' sel' : '')} onClick={() => pickLang(l.code)}>
                <b>{l.label}</b><span>{l.sub}</span><span className="chk"><Check /></span>
              </button>
            ))}
          </div>
          <div className="actions">
            <button className="btn pri" onClick={() => choose(true)}><PhonesIcon />{t.listen}</button>
            <button className="btn sec" onClick={() => choose(false)}>{t.read}</button>
          </div>
        </div>
      </div>
    )
  }

  const cur = lines[lines.length - 1]
  const past = lines.slice(-6, -1)
  const label = LANGS.find(l => l.code === lang)?.label
  return (
    <div className="app">
      <div className="bar">
        <span className={'status' + (online ? ' on' : '')}><i />{online ? t.live : t.connecting}</span>
        <span className="spacer" />
        <span className="pill">{label}<Chevron />
          <select value={lang} onChange={e => pickLang(e.target.value)} aria-label={t.choose}>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </span>
        <button className={'icon-btn' + (voice ? ' on' : '')} onClick={toggle} aria-label={voice ? 'Audio on' : 'Audio off'}>
          {voice ? (speaking ? <span className="eq"><i /><i /><i /></span> : <PhonesIcon s={18} />) : <MutedIcon />}
        </button>
      </div>
      <div className="stage" aria-live="polite">
        <div className="history">{past.map(l => <p key={l.id} className={speaking === l.id ? 'speaking' : ''}>{l.text}</p>)}</div>
        <div className="now">
          {cur ? (<>
            <p key={cur.id} className="t"><Words text={cur.text} k={cur.id} /></p>
            {lang !== 'en' && <p className="src">{cur.en}</p>}
          </>) : <p className="waiting">{t.waiting}</p>}
        </div>
      </div>
    </div>
  )
}

/* ───────────── ADMIN ───────────── */
function Admin({ adminKey }: { adminKey: string }) {
  const [st, setSt] = useState<{ configured: boolean; hint?: string; siteSecret?: boolean } | null>(null)
  const [denied, setDenied] = useState(false)
  const [draft, setDraft] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const url = '/api/admin?k=' + encodeURIComponent(adminKey)
  async function load() {
    try { const r = await fetch(url, { cache: 'no-store' }); if (r.status === 403) { setDenied(true); return } setSt(await r.json()) } catch { setMsg('Sin conexión.') }
  }
  useEffect(() => { load() }, [])
  async function save(e: { preventDefault(): void }) {
    e.preventDefault(); if (!draft.trim()) return
    setBusy(true); setMsg('Verificando la key con ElevenLabs…')
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: draft.trim() }) })
      const j = await r.json()
      if (!r.ok) setMsg(j.error === 'invalid' ? 'ElevenLabs rechazó esta key. Revísala y vuelve a pegarla.' : 'No se pudo guardar.')
      else {
        setDraft(''); setSt(j)
        setMsg(j.stt && j.tts ? 'Guardada. Oído y voz funcionan.' : !j.stt ? 'Guardada, pero le falta el permiso Speech to Text: la app usará el oído del teléfono.' : 'Guardada, pero le falta el permiso Text to Speech: Alma no podrá hablar.')
      }
    } catch { setMsg('Sin conexión.') }
    setBusy(false)
  }
  async function clear() {
    setBusy(true)
    try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) }); setSt({ configured: false }); setMsg('Key eliminada.') } catch { setMsg('Sin conexión.') }
    setBusy(false)
  }
  return (
    <div className="app">
      <div className="bar"><span className={'status' + (st?.configured ? ' on' : '')}><i />Administrador</span></div>
      <div className="onb">
        <h1>Voz de Alma</h1>
        {denied ? <p className="lead">Este link de administrador no es válido.</p> : (<>
          <p className="lead">La key que guardes aquí la usan todos los teléfonos con link de host, en modo Alice y en modo Evento. Nadie más puede verla.</p>
          <div className="langs">
            <div className="lang"><b>Estado</b><span>{st == null ? 'Cargando…' : st.configured ? 'Configurada ' + (st.hint || '') : 'Sin key'}</span><span className="chk" style={{ opacity: st?.configured ? 1 : 0 }}><Check /></span></div>
          </div>
          <form className="actions" onSubmit={save}>
            <input id="admin-xi" className="field" type="password" autoComplete="off" placeholder={st?.configured ? 'Pegar una key nueva para reemplazarla' : 'Pega la API key de ElevenLabs (sk_…)'} value={draft} onChange={e => setDraft(e.target.value)} />
            <button className="btn pri" type="submit" disabled={busy || !draft.trim()}>{st?.configured ? 'Reemplazar key' : 'Guardar key'}</button>
            {st?.configured && <button className="btn sec" type="button" disabled={busy} onClick={clear}>Eliminar key</button>}
          </form>
          {msg && <p className="lead" style={{ marginTop: 0 }}>{msg}</p>}
          <p className="lead" style={{ marginTop: 0, fontSize: 15 }}>La key necesita los permisos Text to Speech y Speech to Text.</p>
        </>)}
      </div>
    </div>
  )
}
