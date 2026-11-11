// Mic -> 16 kHz mono PCM16 in ~100 ms chunks, plus a level for the UI.
class Pcm16 extends AudioWorkletProcessor {
  constructor() {
    super()
    this.ratio = sampleRate / 16000
    this.buf = new Int16Array(1600)
    this.n = 0; this.pos = 0; this.acc = 0; this.cnt = 0; this.sq = 0; this.sqn = 0
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (!ch) return true
    for (let i = 0; i < ch.length; i++) {
      const s = ch[i]
      this.sq += s * s; this.sqn++
      this.acc += s; this.cnt++; this.pos += 1
      if (this.pos >= this.ratio) {
        this.pos -= this.ratio
        let v = this.acc / this.cnt
        v = v > 1 ? 1 : v < -1 ? -1 : v
        this.acc = 0; this.cnt = 0
        this.buf[this.n++] = v < 0 ? v * 0x8000 : v * 0x7fff
        if (this.n === this.buf.length) {
          const lv = Math.sqrt(this.sq / Math.max(1, this.sqn))
          this.sq = 0; this.sqn = 0
          this.port.postMessage({ pcm: this.buf.buffer, lv }, [this.buf.buffer])
          this.buf = new Int16Array(1600); this.n = 0
        }
      }
    }
    return true
  }
}
registerProcessor('pcm16', Pcm16)
