// Анимации исчезновения карточки лота (см. live.py на сервере):
//   burn — подарок сожгли в крафте: карточка прогорает снизу вверх (вариант A);
//   sold — продан: штамп SOLD, карточка сереет и уезжает вправо (вариант 1);
//   gone — пропал без понятной причины (снят продавцом): тихо тает.
// Потом collapse() схлопывает место, и карточки ниже подъезжают вверх.
//
// Всё делается напрямую с DOM карточки, React в это время её не трогает.
// Canvas с огнём создаётся только на время анимации — чтобы iPhone не держал
// лишних слоёв (из-за тяжёлых слоёв на iOS уже пропадал список).

const SIDE = 12   // огонь выходит за края карточки (меньше бокового отступа списка — иначе горизонтальная прокрутка)
const ABOVE = 70  // и поднимается над ней
const BELOW = 20
const LIST_GAP = 8 // gap между карточками в CollectionListings

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const rnd = (a, b) => a + Math.random() * (b - a)
const ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
const wait = ms => new Promise(r => setTimeout(r, ms))
// неровная кромка огня
const nz = (x, t, s) => Math.sin(x * 0.09 + t * 3 + s) * 3 + Math.sin(x * 0.23 - t * 5 + s * 2) * 2 + Math.sin(x * 0.051 + s * 3) * 4

// ── спрайты частиц (рисуются один раз) ──
let SPR = null
function sprites() {
  if (SPR) return SPR
  const make = stops => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    stops.forEach(([o, col]) => gr.addColorStop(o, col))
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 64)
    return c
  }
  SPR = {
    y: make([[0, 'rgba(255,245,200,1)'], [0.35, 'rgba(255,200,90,.8)'], [1, 'rgba(255,140,30,0)']]),
    o: make([[0, 'rgba(255,170,60,1)'], [0.4, 'rgba(255,100,20,.7)'], [1, 'rgba(220,50,10,0)']]),
    r: make([[0, 'rgba(230,70,20,.9)'], [0.5, 'rgba(160,30,10,.4)'], [1, 'rgba(90,10,5,0)']]),
    s: make([[0, 'rgba(120,115,130,.5)'], [1, 'rgba(90,85,100,0)']]),
    e: make([[0, 'rgba(255,255,230,1)'], [0.3, 'rgba(255,200,100,.9)'], [1, 'rgba(255,120,20,0)']]),
  }
  return SPR
}

// Частицы на canvas поверх карточки; координаты — относительно карточки
class Particles {
  constructor(host, W, H) {
    this.c = document.createElement('canvas')
    Object.assign(this.c.style, {
      position: 'absolute', left: `${-SIDE}px`, top: `${-ABOVE}px`,
      width: `${W + SIDE * 2}px`, height: `${H + ABOVE + BELOW}px`,
      pointerEvents: 'none', zIndex: 4,
    })
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = W + SIDE * 2
    this.h = H + ABOVE + BELOW
    this.c.width = Math.round(this.w * this.dpr)
    this.c.height = Math.round(this.h * this.dpr)
    host.appendChild(this.c)
    this.g = this.c.getContext('2d')
    this.p = []
    this.spr = sprites()
    this.running = false
    this.tick = this.tick.bind(this)
  }
  add(o) {
    o.a = 0
    o.ph = Math.random() * 6
    this.p.push(o)
    if (!this.running) { this.running = true; this.t = performance.now(); requestAnimationFrame(this.tick) }
  }
  flame(x, y, s = 1) { this.add({ k: 'f', x: x + rnd(-3, 3), y, vx: rnd(-12, 12), vy: rnd(-40, -15), ay: -60, wob: 30, L: rnd(0.35, 0.7), s: rnd(10, 20) * s }) }
  ember(x, y) { this.add({ k: 'e', x, y, vx: rnd(-30, 30), vy: rnd(-90, -30), ay: -10, wob: 80, L: rnd(0.6, 1.4), s: rnd(3, 6) }) }
  smoke(x, y, s = 1) { this.add({ k: 's', x: x + rnd(-6, 6), y, vx: rnd(-10, 10), vy: rnd(-35, -15), L: rnd(0.9, 1.6), s: rnd(18, 34) * s }) }
  tick(now) {
    const dt = Math.min(0.05, (now - this.t) / 1000)
    this.t = now
    const g = this.g
    g.setTransform(this.dpr, 0, 0, this.dpr, SIDE * this.dpr, ABOVE * this.dpr)
    g.clearRect(-SIDE, -ABOVE, this.w, this.h)
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i]
      q.a += dt
      if (q.a >= q.L) { this.p.splice(i, 1); continue }
      const k = q.a / q.L
      q.vy += (q.ay || 0) * dt
      if (q.wob) q.vx += Math.sin(now / 90 + q.ph) * q.wob * dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      if (q.k === 'f') {
        const sz = q.s * (1 - k * 0.6) * Math.min(1, k / 0.15)
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = 1 - k
        g.drawImage(this.spr[k < 0.3 ? 'y' : k < 0.65 ? 'o' : 'r'], q.x - sz / 2, q.y - sz / 2, sz, sz)
      } else if (q.k === 'e') {
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(now / 40 + q.ph))
        g.drawImage(this.spr.e, q.x - q.s / 2, q.y - q.s / 2, q.s, q.s)
      } else {
        const sz = q.s * (1 + k * 2)
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 0.9 * (1 - k) * Math.min(1, k * 5)
        g.drawImage(this.spr.s, q.x - sz / 2, q.y - sz / 2, sz, sz)
      }
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    if (this.p.length) requestAnimationFrame(this.tick)
    else this.running = false
  }
  // дождаться, пока догорят все частицы, и убрать canvas
  done() {
    return new Promise(res => {
      const check = () => (this.p.length ? setTimeout(check, 100) : (this.c.remove(), res()))
      check()
    })
  }
}

function frame(ms, fn) {
  return new Promise(res => {
    const t0 = performance.now()
    const f = now => {
      const p = Math.min(1, (now - t0) / ms)
      fn(p, now)
      if (p < 1) requestAnimationFrame(f)
      else res()
    }
    requestAnimationFrame(f)
  })
}

// слой поверх карточки со скруглёнными углами (для кромки огня и штампа)
function overlay(host) {
  const o = document.createElement('div')
  Object.assign(o.style, { position: 'absolute', inset: '0', borderRadius: '16px', overflow: 'hidden', pointerEvents: 'none', zIndex: 3 })
  host.appendChild(o)
  return o
}

// содержимое карточки (сама карточка и глазик), без наших слоёв
const contentOf = host => [...host.children].filter(el => !el.dataset.fx)

// ── сгорел: прогорает снизу вверх ──
export async function playBurn(host) {
  if (reduceMotion()) return playGone(host)
  const W = host.offsetWidth, H = host.offsetHeight
  const seed = Math.random() * 10, N = 24
  const content = contentOf(host)
  const ov = overlay(host); ov.dataset.fx = '1'
  const scorch = document.createElement('div')
  Object.assign(scorch.style, {
    position: 'absolute', left: '0', right: '0', top: '0', height: '64px',
    background: 'linear-gradient(to bottom,rgba(30,10,4,0) 0%,rgba(36,12,5,.6) 38%,rgba(110,34,8,.9) 56%,rgba(255,120,30,.95) 66%,rgba(255,215,140,1) 76%,rgba(255,240,200,1) 100%)',
  })
  ov.appendChild(scorch)
  const fx = new Particles(host, W, H); fx.c.dataset.fx = '1'

  await frame(1700, (p, now) => {
    const t = now / 1000
    const base = H + 8 - (H + 22) * ease(p)
    const pts = []
    for (let i = N; i >= 0; i--) {
      const x = W * i / N
      pts.push(`${x.toFixed(1)}px ${(base + nz(x, t, seed)).toFixed(1)}px`)
    }
    // выше кромки (и canvas с огнём над карточкой) оставляем, ниже — сгорело
    host.style.clipPath = `polygon(${-SIDE}px ${-ABOVE}px, ${W + SIDE}px ${-ABOVE}px, ${W + SIDE}px ${base + nz(W, t, seed)}px, ${pts.join(',')}, ${-SIDE}px ${base + nz(0, t, seed)}px)`
    scorch.style.transform = `translateY(${base - 46}px)`
    const f = `sepia(${p * 0.5}) brightness(${1 - p * 0.25})`
    content.forEach(el => { el.style.filter = f })
    if (base < H + 4 && base > -6) {
      for (let k = 0; k < 3; k++) { const x = Math.random() * W; fx.flame(x, base + nz(x, t, seed) - 2) }
      if (Math.random() < 0.35) fx.ember(Math.random() * W, base)
    }
  })
  content.forEach(el => { el.style.visibility = 'hidden' })
  ov.remove()
  host.style.clipPath = ''   // карточки уже не видно — дым пусть рисуется целиком
  for (let i = 0; i < 6; i++) fx.smoke(Math.random() * W, H / 2)
  // дым догорает, пока место схлопывается — не ждём его
  fx.done()
}

// ── продан: штамп SOLD ──
export async function playSold(host) {
  if (reduceMotion()) return playGone(host)
  const W = host.offsetWidth, H = host.offsetHeight
  const content = contentOf(host)
  const ov = overlay(host); ov.dataset.fx = '1'
  const st = document.createElement('div')
  st.textContent = 'SOLD'
  Object.assign(st.style, {
    position: 'absolute', left: '50%', top: '50%', opacity: '0',
    border: '2.5px solid #ff5d6a', color: '#ff5d6a',
    font: "800 20px/1 system-ui,-apple-system,'Segoe UI',sans-serif", letterSpacing: '4px',
    padding: '5px 8px 4px 12px', borderRadius: '6px', background: 'rgba(30,4,8,.6)',
    textShadow: '0 0 8px rgba(255,93,106,.5)',
    boxShadow: '0 0 14px rgba(255,93,106,.35), inset 0 0 8px rgba(255,93,106,.25)',
  })
  ov.appendChild(st)
  st.animate([
    { transform: 'translate(-50%,-50%) rotate(-12deg) scale(2.6)', opacity: 0 },
    { transform: 'translate(-50%,-50%) rotate(-12deg) scale(.92)', opacity: 1, offset: 0.75 },
    { transform: 'translate(-50%,-50%) rotate(-12deg) scale(1)', opacity: 1 },
  ], { duration: 340, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' })
  await wait(250)
  content.forEach(el => { el.style.transition = 'filter .25s'; el.style.filter = 'grayscale(.85) brightness(.6)' })
  host.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(2px) scale(.995)' }, { transform: 'translateY(0)' }], { duration: 180 })
  const fx = new Particles(host, W, H); fx.c.dataset.fx = '1'
  for (let i = 0; i < 6; i++) fx.smoke(W / 2 + rnd(-40, 40), H / 2 + rnd(-6, 10), 0.6)
  await wait(1100)
  await host.animate(
    [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(105%)', opacity: 0 }],
    { duration: 420, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' },
  ).finished
  fx.done()
}

// ── пропал без понятной причины: тихо тает ──
export async function playGone(host) {
  await host.animate(
    [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.97)' }],
    { duration: 280, easing: 'ease-out', fill: 'forwards' },
  ).finished
}

// схлопнуть место карточки: остальные плавно подъезжают
export async function collapse(host) {
  const H = host.offsetHeight
  host.style.overflow = 'visible'
  await host.animate(
    // minHeight: 0 — иначе flex-список не даст карточке стать ниже своего содержимого
    [{ height: `${H}px`, minHeight: '0px', marginTop: '0px' }, { height: '0px', minHeight: '0px', marginTop: `${-LIST_GAP}px` }],
    { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' },
  ).finished
}

// новая карточка снизу: раскрывается и проявляется
export function enter(host) {
  if (reduceMotion()) return
  const H = host.offsetHeight
  host.animate([{ height: '0px', minHeight: '0px', marginTop: `${-LIST_GAP}px` }, { height: `${H}px`, minHeight: '0px', marginTop: '0px' }], { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)' })
  host.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 120, easing: 'ease-out', fill: 'backwards' })
}

export const FATE_ANIM = { burned: playBurn, sold: playSold, gone: playGone }
